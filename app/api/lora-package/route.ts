/**
 * LoRA 학습 데이터 패키징 API
 * Street View 이미지 다운로드 → ZIP + metadata.jsonl → Supabase Storage 업로드
 * 
 * GET ?mode=status   → 패키징 진행 상황
 * GET ?mode=start    → 패키징 시작 (배치별 처리)
 * GET ?mode=batch&n=0 → 배치 N번 이미지 다운로드+저장
 * GET ?mode=finalize → ZIP 생성 + Supabase 업로드
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { TRAINING_POINTS, EXTRA_POINTS, LUXURY_EXTRA, FINAL_EXTRA, type TrainingPoint } from '@/lib/lora-training-data'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const BUCKET = 'captures'
const LORA_FOLDER = 'lora-training'

const ALL_POINTS = [...TRAINING_POINTS, ...EXTRA_POINTS, ...LUXURY_EXTRA, ...FINAL_EXTRA]

function expandPoints(points: TrainingPoint[]) {
  const expanded: Array<TrainingPoint & { heading: number; imageId: string }> = []
  points.forEach((p, idx) => {
    ;[0, 90].forEach(h => {
      expanded.push({ ...p, heading: (h + (p.heading || 0)) % 360, imageId: `${p.category}_${idx.toString().padStart(3, '0')}_h${(h + (p.heading || 0)) % 360}` })
    })
  })
  return expanded
}

// Street View 메타데이터 확인
async function checkAvailable(lat: number, lng: number): Promise<boolean> {
  try {
    const r = await fetch(`https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&key=${GOOGLE_MAPS_KEY}`)
    const d = await r.json()
    return d.status === 'OK'
  } catch { return false }
}

// Street View 이미지 다운로드 → Buffer
async function downloadImage(lat: number, lng: number, heading: number): Promise<Buffer | null> {
  try {
    const url = `https://maps.googleapis.com/maps/api/streetview?size=640x640&location=${lat},${lng}&heading=${heading}&pitch=5&fov=80&key=${GOOGLE_MAPS_KEY}`
    const r = await fetch(url)
    if (!r.ok) return null
    const ab = await r.arrayBuffer()
    return Buffer.from(ab)
  } catch { return null }
}

// 병렬 다운로드 (동시 10개)
async function downloadBatch(images: Array<{ lat: number; lng: number; heading: number; imageId: string; caption: string }>) {
  const CONCURRENCY = 10
  const results: Array<{ imageId: string; caption: string; buffer: Buffer | null }> = []
  
  for (let i = 0; i < images.length; i += CONCURRENCY) {
    const batch = images.slice(i, i + CONCURRENCY)
    const promises = batch.map(async img => {
      const buffer = await downloadImage(img.lat, img.lng, img.heading)
      return { imageId: img.imageId, caption: img.caption, buffer }
    })
    const batchResults = await Promise.all(promises)
    results.push(...batchResults)
  }
  
  return results
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('mode')

  if (!GOOGLE_MAPS_KEY) return NextResponse.json({ error: 'GOOGLE_MAPS_KEY 미설정' }, { status: 503 })

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const allImages = expandPoints(ALL_POINTS)

  // ━━━ 상태 확인 ━━━
  if (mode === 'status') {
    // Supabase에 저장된 이미지 수 확인
    const { data: files } = await supabase.storage.from(BUCKET).list(LORA_FOLDER, { limit: 1000 })
    const imageCount = files?.filter(f => f.name.endsWith('.jpg')).length || 0
    const hasMetadata = files?.some(f => f.name === 'metadata.jsonl') || false
    const hasZip = files?.some(f => f.name.endsWith('.zip')) || false
    
    return NextResponse.json({
      totalPoints: ALL_POINTS.length,
      totalImages: allImages.length,
      uploaded: imageCount,
      hasMetadata,
      hasZip,
      progress: `${imageCount}/${allImages.length}`,
      nextStep: hasZip ? 'ZIP 준비됨 → /api/lora-train POST { action: "start" }' 
        : imageCount > 0 ? '이미지 업로드 완료 → ?mode=finalize 호출'
        : '?mode=batch&n=0 부터 시작',
    })
  }

  // ━━━ 배치별 다운로드 + Supabase 업로드 ━━━
  if (mode === 'batch') {
    const batchNum = parseInt(searchParams.get('n') || '0')
    const batchSize = 40  // 배치당 40장 (20지점 × 2방향)
    const start = batchNum * batchSize
    const end = Math.min(start + batchSize, allImages.length)
    const batchImages = allImages.slice(start, end)

    if (batchImages.length === 0) {
      return NextResponse.json({ done: true, message: '모든 배치 처리 완료', nextStep: '?mode=finalize' })
    }

    console.log(`[lora-package] Batch ${batchNum}: downloading ${batchImages.length} images (${start}~${end})`)
    const startTime = Date.now()

    // 1. 가용성 체크 + 다운로드
    const toDownload = []
    for (const img of batchImages) {
      const available = await checkAvailable(img.lat, img.lng)
      if (available) {
        toDownload.push(img)
      }
    }

    // 2. 병렬 다운로드
    const results = await downloadBatch(toDownload)
    
    // 3. Supabase Storage에 업로드
    let uploaded = 0, failed = 0
    const metadata: Array<{ file_name: string; text: string }> = []

    for (const r of results) {
      if (!r.buffer || r.buffer.length < 1000) { failed++; continue }
      
      const fileName = `${r.imageId}.jpg`
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(`${LORA_FOLDER}/${fileName}`, r.buffer, {
          contentType: 'image/jpeg',
          upsert: true,
        })
      
      if (!error) {
        uploaded++
        metadata.push({ file_name: fileName, text: r.caption })
      } else {
        failed++
        console.warn(`[lora-package] Upload failed: ${fileName}`, error.message)
      }
    }

    // 4. 이 배치의 메타데이터를 별도 파일로 저장
    const metaContent = metadata.map(m => JSON.stringify(m)).join('\n')
    await supabase.storage.from(BUCKET).upload(
      `${LORA_FOLDER}/meta_batch_${batchNum}.jsonl`,
      Buffer.from(metaContent),
      { contentType: 'application/jsonl', upsert: true }
    )

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

    return NextResponse.json({
      batch: batchNum,
      requested: batchImages.length,
      available: toDownload.length,
      uploaded,
      failed,
      elapsed: `${elapsed}s`,
      totalBatches: Math.ceil(allImages.length / batchSize),
      nextBatch: end < allImages.length ? batchNum + 1 : null,
      nextStep: end < allImages.length ? `?mode=batch&n=${batchNum + 1}` : '?mode=finalize',
    })
  }

  // ━━━ 최종 패키징: 메타데이터 병합 + ZIP URL 생성 ━━━
  if (mode === 'finalize') {
    console.log('[lora-package] Finalizing...')

    // 1. 모든 배치 메타데이터 병합
    const { data: files } = await supabase.storage.from(BUCKET).list(LORA_FOLDER, { limit: 1000 })
    if (!files) return NextResponse.json({ error: 'Storage 조회 실패' }, { status: 500 })

    const metaBatches = files.filter(f => f.name.startsWith('meta_batch_'))
    let allMetadata = ''
    
    for (const mb of metaBatches) {
      const { data } = await supabase.storage.from(BUCKET).download(`${LORA_FOLDER}/${mb.name}`)
      if (data) {
        const text = await data.text()
        allMetadata += text + '\n'
      }
    }

    // 2. 통합 metadata.jsonl 업로드
    await supabase.storage.from(BUCKET).upload(
      `${LORA_FOLDER}/metadata.jsonl`,
      Buffer.from(allMetadata.trim()),
      { contentType: 'application/jsonl', upsert: true }
    )

    // 3. 이미지 파일 수 확인
    const imageFiles = files.filter(f => f.name.endsWith('.jpg'))
    const metaLines = allMetadata.trim().split('\n').filter(l => l.trim()).length

    // 4. 공개 URL 생성 (Replicate에서 접근 가능)
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(`${LORA_FOLDER}/metadata.jsonl`)

    return NextResponse.json({
      success: true,
      imageCount: imageFiles.length,
      metadataLines: metaLines,
      metadataUrl: urlData.publicUrl,
      storageFolder: `${BUCKET}/${LORA_FOLDER}`,
      note: 'Replicate 학습에는 이미지+메타데이터가 포함된 ZIP이 필요합니다. 아래 URL로 학습 시작:',
      nextStep: {
        option1: 'Supabase Storage에서 폴더를 ZIP으로 다운로드 후 재업로드',
        option2: '/api/lora-train POST { action: "start", dataUrl: "[ZIP_URL]" }',
      },
    })
  }

  return NextResponse.json({
    endpoints: {
      '?mode=status': '패키징 진행 상황',
      '?mode=batch&n=0': '배치 0번 다운로드+업로드 (40장씩)',
      '?mode=finalize': '메타데이터 병합 + URL 생성',
    },
    totalPoints: ALL_POINTS.length,
    totalImages: allImages.length,
  })
}
