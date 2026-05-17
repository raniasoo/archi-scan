import { NextRequest, NextResponse } from 'next/server'
export const maxDuration = 120
export const dynamic = 'force-dynamic'
const TOKEN = process.env.REPLICATE_API_TOKEN
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ZIP_URL = `${SUPABASE_URL}/storage/v1/object/public/captures/lora-training/lora-korean-arch.zip`

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'start'
  if (!TOKEN) return NextResponse.json({ error: 'REPLICATE_API_TOKEN 미설정' })

  if (action === 'check') {
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id 필요' })
    for (const ep of [`trainings/${id}`, `predictions/${id}`]) {
      const r = await fetch(`https://api.replicate.com/v1/${ep}`, { headers: { 'Authorization': `Bearer ${TOKEN}` } })
      if (r.ok) { const d = await r.json(); return NextResponse.json({ id: d.id, status: d.status, output: d.output, metrics: d.metrics, error: d.error, logs: d.logs?.split('\n').slice(-8).join('\n') }) }
    }
    return NextResponse.json({ error: 'not found' })
  }

  try {
    // 1. 모델 버전 조회
    const mR = await fetch('https://api.replicate.com/v1/models/ostris/flux-dev-lora-trainer', { headers: { 'Authorization': `Bearer ${TOKEN}` } })
    const m = await mR.json()
    const ver = m.latest_version?.id
    if (!ver) return NextResponse.json({ error: '모델 버전 없음' })

    // 2. Training API 호출
    const tR = await fetch(`https://api.replicate.com/v1/models/ostris/flux-dev-lora-trainer/versions/${ver}/trainings`, {
      method: 'POST', headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination: 'raniasoo/korean-architecture', input: { input_images: ZIP_URL, trigger_word: 'korarch', autocaption: false, steps: 1000, lora_rank: 16, optimizer: 'adamw8bit', batch_size: 1, resolution: '512,768,1024', lr_scheduler: 'constant', learning_rate: 0.0004, caption_dropout_rate: 0.05 } }),
    })
    const tD = await tR.json()
    if (!tR.ok) {
      // 폴백: predictions API
      const pR = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST', headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: ver, input: { input_images: ZIP_URL, trigger_word: 'korarch', autocaption: false, steps: 1000, lora_rank: 16, optimizer: 'adamw8bit', batch_size: 1, resolution: '512,768,1024', lr_scheduler: 'constant', learning_rate: 0.0004, caption_dropout_rate: 0.05 } }),
      })
      const pD = await pR.json()
      if (!pR.ok) return NextResponse.json({ error: `train:${tR.status} pred:${pR.status}`, trainDetail: JSON.stringify(tD).slice(0,300), predDetail: JSON.stringify(pD).slice(0,300), zipUrl: ZIP_URL })
      return NextResponse.json({ success: true, method: 'prediction', id: pD.id, status: pD.status, checkUrl: `?action=check&id=${pD.id}`, zipUrl: ZIP_URL })
    }
    return NextResponse.json({ success: true, method: 'training', id: tD.id, status: tD.status, checkUrl: `?action=check&id=${tD.id}`, zipUrl: ZIP_URL })
  } catch (e) { return NextResponse.json({ error: String(e) }) }
}
