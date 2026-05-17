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

  try {
    // Step 1: Get authenticated user info
    const accRes = await fetch('https://api.replicate.com/v1/account', { headers: { Authorization: `Bearer ${TOKEN}` } })
    const acc = await accRes.json()
    const owner = acc.username
    if (!owner) return NextResponse.json({ error: 'Cannot get Replicate username', account: acc })
    console.log(`[lora] Replicate owner: ${owner}`)

    // Step 2: Create destination model
    const modelName = 'korean-architecture'
    const dest = `${owner}/${modelName}`
    console.log(`[lora] Creating model: ${dest}`)
    const createRes = await fetch('https://api.replicate.com/v1/models', {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner, name: modelName, description: 'Korean architecture LoRA', visibility: 'private', hardware: 'gpu-a40-small' }),
    })
    if (createRes.ok) console.log('[lora] Model created')
    else if (createRes.status === 409) console.log('[lora] Model exists')
    else { const e = await createRes.json(); console.log(`[lora] Model create ${createRes.status}: ${JSON.stringify(e).slice(0,200)}`) }

    // Step 3: Get trainer version
    const mR = await fetch('https://api.replicate.com/v1/models/ostris/flux-dev-lora-trainer', { headers: { Authorization: `Bearer ${TOKEN}` } })
    const m = await mR.json()
    const ver = m.latest_version?.id
    if (!ver) return NextResponse.json({ error: 'trainer version not found' })

    // Step 4: Start training
    console.log(`[lora] Starting training → ${dest}`)
    const tR = await fetch(`https://api.replicate.com/v1/models/ostris/flux-dev-lora-trainer/versions/${ver}/trainings`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destination: dest,
        input: { input_images: ZIP_URL, trigger_word: 'korarch', autocaption: false, steps: 1000, lora_rank: 16, optimizer: 'adamw8bit', batch_size: 1, resolution: '512,768,1024', lr_scheduler: 'constant', learning_rate: 0.0004, caption_dropout_rate: 0.05 },
      }),
    })
    const tD = await tR.json()
    if (!tR.ok) return NextResponse.json({ error: `training ${tR.status}`, detail: JSON.stringify(tD).slice(0,500), dest, zipUrl: ZIP_URL })

    console.log(`[lora] Training started: ${tD.id}`)
    return NextResponse.json({ success: true, trainingId: tD.id, status: tD.status, destination: dest, checkUrl: `?action=check&id=${tD.id}`, zipUrl: ZIP_URL })
  } catch (e) { return NextResponse.json({ error: String(e) }) }
}
