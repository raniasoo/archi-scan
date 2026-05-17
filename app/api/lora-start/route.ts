import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ZIP_URL = `${SUPABASE_URL}/storage/v1/object/public/captures/lora-training/lora-korean-arch.zip`

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'start'
  if (!REPLICATE_API_TOKEN) return NextResponse.json({ error: 'REPLICATE_API_TOKEN 미설정' })

  if (action === 'check') {
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id 필요' })
    const r = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { 'Authorization': `Bearer ${REPLICATE_API_TOKEN}` },
    })
    const d = await r.json()
    return NextResponse.json({ id: d.id, status: d.status, output: d.output, metrics: d.metrics, error: d.error, logs: d.logs?.split('\n').slice(-5).join('\n') })
  }

  console.log(`[lora-start] ZIP: ${ZIP_URL}`)
  const r = await fetch('https://api.replicate.com/v1/models/ostris/flux-dev-lora-trainer/predictions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${REPLICATE_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: {
      input_images: ZIP_URL, trigger_word: 'korarch', autocaption: false,
      steps: 1500, lora_rank: 16, optimizer: 'adamw8bit', batch_size: 1,
      resolution: '1024', lr_scheduler: 'constant', learning_rate: 0.0004, caption_dropout_rate: 0.05,
    }}),
  })
  if (!r.ok) { const e = await r.text(); return NextResponse.json({ error: `Replicate ${r.status}`, detail: e.slice(0,500) }) }
  const t = await r.json()
  return NextResponse.json({ success: true, id: t.id, status: t.status, checkUrl: `?action=check&id=${t.id}`, zipUrl: ZIP_URL })
}
