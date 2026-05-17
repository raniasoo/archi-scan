import { NextRequest, NextResponse } from 'next/server'
export const maxDuration = 120
export const dynamic = 'force-dynamic'
const TOKEN = process.env.REPLICATE_API_TOKEN
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ZIP_URL = `${SUPABASE_URL}/storage/v1/object/public/captures/lora-training/lora-korean-arch.zip`

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'start'
  if (!TOKEN) return NextResponse.json({ error: 'REPLICATE_API_TOKEN missing' })

  if (action === 'check') {
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' })
    for (const ep of ['trainings', 'predictions']) {
      const r = await fetch(`https://api.replicate.com/v1/${ep}/${id}`, { headers: { Authorization: `Bearer ${TOKEN}` } })
      if (r.ok) { const d = await r.json(); return NextResponse.json({ id: d.id, status: d.status, output: d.output, metrics: d.metrics, error: d.error, logs: d.logs?.split('\n').slice(-10).join('\n') }) }
    }
    return NextResponse.json({ error: 'not found' })
  }

  if (action === 'debug') {
    // 계정+모델 정보 확인
    const accR = await fetch('https://api.replicate.com/v1/account', { headers: { Authorization: `Bearer ${TOKEN}` } })
    const acc = await accR.json()
    
    // 모델 생성 시도
    const crR = await fetch('https://api.replicate.com/v1/models', {
      method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner: acc.username, name: 'korean-arch-lora', description: 'Korean architecture LoRA', visibility: 'private', hardware: 'gpu-t4' }),
    })
    const crD = await crR.json()
    
    return NextResponse.json({ account: acc, modelCreate: { status: crR.status, data: crD }, zipUrl: ZIP_URL })
  }

  try {
    // 계정 정보
    const accR = await fetch('https://api.replicate.com/v1/account', { headers: { Authorization: `Bearer ${TOKEN}` } })
    const acc = await accR.json()
    const owner = acc.username
    const modelName = 'korean-arch-lora'
    const dest = `${owner}/${modelName}`

    // 모델 생성 (이미 있으면 409 → 무시)
    await fetch('https://api.replicate.com/v1/models', {
      method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner, name: modelName, description: 'Korean architecture LoRA', visibility: 'private', hardware: 'gpu-t4' }),
    })

    // 트레이너 버전
    const mR = await fetch('https://api.replicate.com/v1/models/ostris/flux-dev-lora-trainer', { headers: { Authorization: `Bearer ${TOKEN}` } })
    const m = await mR.json()
    const ver = m.latest_version?.id
    if (!ver) return NextResponse.json({ error: 'no trainer version' })

    // Training API
    const tR = await fetch(`https://api.replicate.com/v1/models/ostris/flux-dev-lora-trainer/versions/${ver}/trainings`, {
      method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination: dest, input: { input_images: ZIP_URL, trigger_word: 'korarch', autocaption: false, steps: 1000, lora_rank: 16, optimizer: 'adamw8bit', batch_size: 1, resolution: '512,768,1024', lr_scheduler: 'constant', learning_rate: 0.0004, caption_dropout_rate: 0.05 } }),
    })
    const tD = await tR.json()

    if (tR.ok) {
      return NextResponse.json({ success: true, trainingId: tD.id, status: tD.status, destination: dest, checkUrl: `?action=check&id=${tD.id}`, zipUrl: ZIP_URL })
    }

    // Training 실패 시 → Predictions API 폴백
    console.log(`[lora] Training failed (${tR.status}), trying predictions...`)
    const pR = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: ver, input: { input_images: ZIP_URL, trigger_word: 'korarch', autocaption: false, steps: 1000, lora_rank: 16, optimizer: 'adamw8bit', batch_size: 1, resolution: '512,768,1024', lr_scheduler: 'constant', learning_rate: 0.0004, caption_dropout_rate: 0.05 } }),
    })
    const pD = await pR.json()
    if (pR.ok) return NextResponse.json({ success: true, method: 'prediction', id: pD.id, status: pD.status, checkUrl: `?action=check&id=${pD.id}`, zipUrl: ZIP_URL })

    return NextResponse.json({ error: 'both failed', training: { status: tR.status, detail: JSON.stringify(tD).slice(0,300) }, prediction: { status: pR.status, detail: JSON.stringify(pD).slice(0,300) }, account: owner, dest })
  } catch (e) { return NextResponse.json({ error: String(e) }) }
}
