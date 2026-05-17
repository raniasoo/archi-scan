/**
 * ZIP 패키징 + LoRA 학습 시작
 * Supabase Storage 이미지 → ZIP → 재업로드 → Replicate Training
 * 
 * GET ?mode=zip     → ZIP만 생성
 * GET ?mode=train   → ZIP + 학습 시작
 * GET ?mode=status&id=xxx → 학습 상태
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const archiver = require('archiver')
import { Writable } from 'stream'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN
const BUCKET = 'captures'
const FOLDER = 'lora-training'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('mode') || 'zip'
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  // ━━━ 학습 상태 ━━━
  if (mode === 'status') {
    const id = searchParams.get('id')
    if (!id || !REPLICATE_API_TOKEN) return NextResponse.json({ error: 'id + REPLICATE_API_TOKEN 필요' })
    try {
      const r = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
        headers: { 'Authorization': `Bearer ${REPLICATE_API_TOKEN}` },
      })
      const d = await r.json()
      return NextResponse.json({ id: d.id, status: d.status, output: d.output, metrics: d.metrics, error: d.error, logs: d.logs?.split('\n').slice(-8).join('\n') })
    } catch (e) { return NextResponse.json({ error: String(e) }) }
  }

  const startTime = Date.now()
  console.log(`[lora-zip] ZIP 생성 시작...`)

  try {
    // 1. 파일 목록
    const { data: files } = await supabase.storage.from(BUCKET).list(FOLDER, { limit: 1000 })
    if (!files) return NextResponse.json({ error: 'Storage 조회 실패' }, { status: 500 })

    const images = files.filter(f => f.name.endsWith('.jpg'))
    const metas = files.filter(f => f.name.startsWith('meta_batch_'))
    console.log(`[lora-zip] ${images.length} images, ${metas.length} meta files`)

    if (images.length === 0) return NextResponse.json({ error: '이미지 없음' }, { status: 400 })

    // 2. 캡션 병합
    let captions = ''
    for (const m of metas) {
      const { data } = await supabase.storage.from(BUCKET).download(`${FOLDER}/${m.name}`)
      if (data) captions += (await data.text()) + '\n'
    }
    const lines = captions.trim().split('\n').filter(l => l.trim())

    // 3. ZIP 생성
    const chunks: Buffer[] = []
    const ws = new Writable({ write(c, _, cb) { chunks.push(Buffer.from(c)); cb() } })
    const arc = archiver('zip', { zlib: { level: 3 } })
    arc.pipe(ws)
    arc.append(lines.join('\n'), { name: 'metadata.jsonl' })

    let added = 0
    for (let i = 0; i < images.length; i += 30) {
      const batch = images.slice(i, i + 30)
      const dl = await Promise.all(batch.map(async f => {
        try {
          const { data } = await supabase.storage.from(BUCKET).download(`${FOLDER}/${f.name}`)
          if (!data) return null
          return { name: f.name, buf: Buffer.from(await data.arrayBuffer()) }
        } catch { return null }
      }))
      for (const d of dl) {
        if (d && d.buf.length > 500) { arc.append(d.buf, { name: d.name }); added++ }
      }
      console.log(`[lora-zip] ${added}/${images.length}`)
    }

    await arc.finalize()
    await new Promise<void>(r => ws.on('finish', r))
    const zip = Buffer.concat(chunks)
    const mb = (zip.length / 1048576).toFixed(1)
    console.log(`[lora-zip] ZIP: ${mb}MB, ${added} images`)

    // 4. 업로드
    const zipName = `lora-korean-arch.zip`
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(`${FOLDER}/${zipName}`, zip, { contentType: 'application/zip', upsert: true })
    if (upErr) return NextResponse.json({ error: 'ZIP 업로드 실패', detail: upErr.message }, { status: 500 })

    const { data: urlD } = supabase.storage.from(BUCKET).getPublicUrl(`${FOLDER}/${zipName}`)
    const zipUrl = urlD.publicUrl
    console.log(`[lora-zip] URL: ${zipUrl}`)

    // 5. 학습 시작
    if (mode === 'train' && REPLICATE_API_TOKEN) {
      const tr = await fetch('https://api.replicate.com/v1/models/ostris/flux-dev-lora-trainer/predictions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${REPLICATE_API_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: {
          input_images: zipUrl, trigger_word: 'korarch', autocaption: false,
          steps: 1500, lora_rank: 16, optimizer: 'adamw8bit', batch_size: 1,
          resolution: '1024', lr_scheduler: 'constant', learning_rate: 0.0004,
          caption_dropout_rate: 0.05,
        }}),
      })
      if (!tr.ok) {
        const e = await tr.text()
        return NextResponse.json({ zipUrl, mb, added, lines: lines.length, trainError: `${tr.status}: ${e.slice(0,300)}` })
      }
      const t = await tr.json()
      return NextResponse.json({
        success: true,
        zip: { url: zipUrl, sizeMB: mb, images: added, captions: lines.length },
        training: { id: t.id, status: t.status, triggerWord: 'korarch', checkUrl: `?mode=status&id=${t.id}` },
        elapsed: `${((Date.now()-startTime)/1000).toFixed(0)}s`,
      })
    }

    return NextResponse.json({
      success: true,
      zip: { url: zipUrl, sizeMB: mb, images: added, captions: lines.length },
      elapsed: `${((Date.now()-startTime)/1000).toFixed(0)}s`,
      nextStep: mode !== 'train' ? '?mode=train 으로 학습 시작' : 'REPLICATE_API_TOKEN 미설정',
    })
  } catch (e) {
    return NextResponse.json({ error: String(e), elapsed: `${((Date.now()-startTime)/1000).toFixed(0)}s` }, { status: 500 })
  }
}
