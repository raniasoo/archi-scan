import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
export const maxDuration = 60
const TOKEN = process.env.REPLICATE_API_TOKEN
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

export async function GET(req: NextRequest) {
  if (!TOKEN) return NextResponse.json({ error: 'no token' })
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  // 학습 시작
  if (action === 'start-training') {
    const zipUrl = `${SUPABASE_URL}/storage/v1/object/public/captures/lora-training/lora-korean-arch.zip`
    console.log(`[lora-check] Starting training with ZIP: ${zipUrl}`)
    try {
      const r = await fetch('https://api.replicate.com/v1/models/ostris/flux-dev-lora-trainer/predictions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: {
          input_images: zipUrl, trigger_word: 'korarch', autocaption: false,
          steps: 1000, lora_rank: 16, optimizer: 'adamw8bit', batch_size: 1,
          resolution: '512', lr_scheduler: 'constant', learning_rate: 0.0004,
        }}),
      })
      const d = await r.json()
      console.log(`[lora-check] Training response: ${JSON.stringify(d).slice(0,300)}`)
      return NextResponse.json({ success: r.ok, status: r.status, prediction: { id: d.id, status: d.status, error: d.error, detail: d.detail } })
    } catch (e) { return NextResponse.json({ error: String(e) }) }
  }

  // 상태 확인
  if (action === 'check' && searchParams.get('id')) {
    const id = searchParams.get('id')
    const r = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { 'Authorization': `Bearer ${TOKEN}` },
    })
    const d = await r.json()
    return NextResponse.json({ id: d.id, status: d.status, output: d.output, error: d.error, logs: d.logs?.split('\n').slice(-5).join('\n') })
  }

  // 최근 predictions
  const r = await fetch('https://api.replicate.com/v1/predictions', {
    headers: { 'Authorization': `Bearer ${TOKEN}` },
  })
  const d = await r.json()
  const recent = (d.results || []).slice(0, 5).map((p: any) => ({
    id: p.id, status: p.status, model: p.model, created: p.created_at, error: p.error,
  }))
  return NextResponse.json({ count: d.results?.length, recent, zipUrl: `${SUPABASE_URL}/storage/v1/object/public/captures/lora-training/lora-korean-arch.zip` })
}
