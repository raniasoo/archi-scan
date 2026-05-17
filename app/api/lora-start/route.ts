import { NextRequest, NextResponse } from 'next/server'
export const maxDuration = 120
export const dynamic = 'force-dynamic'
const TOKEN = process.env.REPLICATE_API_TOKEN
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ZIP_URL = `${SUPABASE_URL}/storage/v1/object/public/captures/lora-training/lora-korean-arch.zip`
const DEST_OWNER = 'raniasoo'
const DEST_MODEL = 'korean-architecture'

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
    // Step 1: Create destination model if not exists
    console.log('[lora] Creating destination model...')
    const createRes = await fetch('https://api.replicate.com/v1/models', {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        owner: DEST_OWNER,
        name: DEST_MODEL,
        description: 'Korean architecture LoRA - trained on 379 Korean building photos',
        visibility: 'private',
        hardware: 'gpu-a40-small',
      }),
    })
    const createData = await createRes.json()
    if (createRes.ok) {
      console.log(`[lora] Model created: ${DEST_OWNER}/${DEST_MODEL}`)
    } else if (createRes.status === 409) {
      console.log('[lora] Model already exists, continuing...')
    } else {
      console.log(`[lora] Model create: ${createRes.status} ${JSON.stringify(createData).slice(0,200)}`)
    }

    // Step 2: Get trainer model version
    const mR = await fetch('https://api.replicate.com/v1/models/ostris/flux-dev-lora-trainer', { headers: { Authorization: `Bearer ${TOKEN}` } })
    const m = await mR.json()
    const ver = m.latest_version?.id
    if (!ver) return NextResponse.json({ error: 'trainer model version not found' })
    console.log(`[lora] Trainer version: ${ver.slice(0,16)}...`)

    // Step 3: Start training
    console.log(`[lora] Starting training with ZIP: ${ZIP_URL}`)
    const tR = await fetch(`https://api.replicate.com/v1/models/ostris/flux-dev-lora-trainer/versions/${ver}/trainings`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destination: `${DEST_OWNER}/${DEST_MODEL}`,
        input: {
          input_images: ZIP_URL,
          trigger_word: 'korarch',
          autocaption: false,
          steps: 1000,
          lora_rank: 16,
          optimizer: 'adamw8bit',
          batch_size: 1,
          resolution: '512,768,1024',
          lr_scheduler: 'constant',
          learning_rate: 0.0004,
          caption_dropout_rate: 0.05,
        },
      }),
    })
    const tD = await tR.json()
    if (!tR.ok) {
      return NextResponse.json({ error: `training ${tR.status}`, detail: JSON.stringify(tD).slice(0,500), zipUrl: ZIP_URL, version: ver.slice(0,16) })
    }

    console.log(`[lora] Training started: ${tD.id}`)
    return NextResponse.json({
      success: true,
      trainingId: tD.id,
      status: tD.status,
      model: `${DEST_OWNER}/${DEST_MODEL}`,
      checkUrl: `?action=check&id=${tD.id}`,
      zipUrl: ZIP_URL,
      estimatedTime: '1-2 hours',
      estimatedCost: '$10-30',
    })
  } catch (e) { return NextResponse.json({ error: String(e) }) }
}
