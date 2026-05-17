import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
export const maxDuration = 60
const TOKEN = process.env.REPLICATE_API_TOKEN
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

export async function GET(req: NextRequest) {
  if (!TOKEN) return NextResponse.json({ error: 'no token' })
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')
  const zipUrl = `${SUPABASE_URL}/storage/v1/object/public/captures/lora-training/lora-korean-arch.zip`

  if (action === 'start') {
    console.log('[lora] Starting training:', zipUrl)
    const r = await fetch('https://api.replicate.com/v1/models/ostris/flux-dev-lora-trainer/versions', {
      headers: { 'Authorization': `Bearer ${TOKEN}` },
    })
    const versions = await r.json()
    const latestVersion = versions.results?.[0]?.id
    if (!latestVersion) return NextResponse.json({ error: 'version not found', versions })

    const tr = await fetch(`https://api.replicate.com/v1/models/ostris/flux-dev-lora-trainer/versions/${latestVersion}/trainings`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destination: 'raniasoo/korean-architecture-lora',
        input: {
          input_images: zipUrl, trigger_word: 'korarch', autocaption: false,
          steps: 1000, lora_rank: 16, optimizer: 'adamw8bit', batch_size: 1,
          resolution: '512', lr_scheduler: 'constant', learning_rate: 0.0004,
        },
      }),
    })
    const td = await tr.json()
    console.log('[lora] Training:', JSON.stringify(td).slice(0, 300))
    return NextResponse.json({ success: tr.ok, status: tr.status, training: { id: td.id, status: td.status, error: td.error, detail: td.detail }, zipUrl })
  }

  if (action === 'check') {
    const id = searchParams.get('id')!
    const r = await fetch(`https://api.replicate.com/v1/trainings/${id}`, {
      headers: { 'Authorization': `Bearer ${TOKEN}` },
    })
    const d = await r.json()
    return NextResponse.json({ id: d.id, status: d.status, output: d.output, error: d.error, logs: d.logs?.split('\n').slice(-5).join('\n') })
  }

  const r = await fetch('https://api.replicate.com/v1/trainings', {
    headers: { 'Authorization': `Bearer ${TOKEN}` },
  })
  const d = await r.json()
  return NextResponse.json({ trainings: (d.results || []).slice(0, 5).map((t: any) => ({ id: t.id, status: t.status, created: t.created_at })), zipUrl })
}
