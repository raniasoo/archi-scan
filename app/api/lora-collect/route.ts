/**
 * LoRA 학습 데이터 자동 수집 API
 * 한국 주요 도시 400개 지점 → Google Street View 자동 촬영 → 캡션 생성
 * 
 * GET ?mode=status     → 수집 진행 상황
 * GET ?mode=collect&batch=0  → 배치 수집 (batch당 20개)
 * GET ?mode=list       → 수집된 데이터 목록
 * GET ?mode=package    → Replicate 학습용 ZIP URL 생성
 */
import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

import { TRAINING_POINTS, EXTRA_POINTS, type TrainingPoint } from '@/lib/lora-training-data'

const ALL_TRAINING_POINTS = [...TRAINING_POINTS, ...EXTRA_POINTS]


// 각 지점에서 3-4 방향으로 촬영하여 총 ~400장 확보
// heading: 0=북, 90=동, 180=남, 270=서
function expandToMultiAngle(points: TrainingPoint[]): Array<TrainingPoint & { heading: number; imageId: string }> {
  const expanded: Array<TrainingPoint & { heading: number; imageId: string }> = []
  points.forEach((p, idx) => {
    const headings = [0, 90, 180, 270]  // 4방향
    // 주요 2방향만 선택 (데이터 품질 > 수량)
    const selected = headings.slice(0, 2).map(h => (h + (p.heading || 0)) % 360)
    selected.forEach((h, hi) => {
      expanded.push({
        ...p,
        heading: h,
        imageId: `${p.category}_${idx.toString().padStart(3, '0')}_h${h}`,
      })
    })
  })
  return expanded
}

// Street View 이미지 URL 생성
function getStreetViewUrl(lat: number, lng: number, heading: number, size = '640x640'): string {
  return `https://maps.googleapis.com/maps/api/streetview?size=${size}&location=${lat},${lng}&heading=${heading}&pitch=5&fov=80&key=${GOOGLE_MAPS_KEY}`
}

// Street View 메타데이터 확인 (이미지 존재 여부)
async function checkStreetViewAvailable(lat: number, lng: number): Promise<boolean> {
  try {
    const res = await fetch(`https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&key=${GOOGLE_MAPS_KEY}`)
    const data = await res.json()
    return data.status === 'OK'
  } catch { return false }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('mode')

  if (mode === 'status') {
    return NextResponse.json({
      totalPoints: ALL_TRAINING_POINTS.length,
      totalImages: expandToMultiAngle(ALL_TRAINING_POINTS).length,
      categories: {
        villa: ALL_TRAINING_POINTS.filter(p => p.category === 'villa').length,
        apartment: ALL_TRAINING_POINTS.filter(p => p.category === 'apartment').length,
        commercial: ALL_TRAINING_POINTS.filter(p => p.category === 'commercial').length,
        luxury: ALL_TRAINING_POINTS.filter(p => p.category === 'luxury').length,
        officetel: ALL_TRAINING_POINTS.filter(p => p.category === 'officetel').length,
        mixed: ALL_TRAINING_POINTS.filter(p => p.category === 'mixed').length,
      },
      apiKeySet: !!GOOGLE_MAPS_KEY,
      supabaseSet: !!SUPABASE_URL,
    })
  }

  if (mode === 'collect') {
    if (!GOOGLE_MAPS_KEY) {
      return NextResponse.json({ error: 'GOOGLE_MAPS_KEY 미설정' }, { status: 503 })
    }

    const batch = parseInt(searchParams.get('batch') || '0')
    const batchSize = 20
    const allImages = expandToMultiAngle(ALL_TRAINING_POINTS)
    const start = batch * batchSize
    const end = Math.min(start + batchSize, allImages.length)
    const batchImages = allImages.slice(start, end)

    if (batchImages.length === 0) {
      return NextResponse.json({ done: true, total: allImages.length, message: '모든 배치 수집 완료' })
    }

    const results: Array<{ imageId: string; available: boolean; url?: string; caption: string; category: string }> = []

    for (const img of batchImages) {
      const available = await checkStreetViewAvailable(img.lat, img.lng)
      const url = available ? getStreetViewUrl(img.lat, img.lng, img.heading) : undefined

      results.push({
        imageId: img.imageId,
        available,
        url,
        caption: img.caption,
        category: img.category,
      })
    }

    const availableCount = results.filter(r => r.available).length

    return NextResponse.json({
      batch,
      batchSize,
      start, end,
      totalImages: allImages.length,
      totalBatches: Math.ceil(allImages.length / batchSize),
      results,
      summary: {
        requested: batchImages.length,
        available: availableCount,
        unavailable: batchImages.length - availableCount,
      },
      nextBatch: end < allImages.length ? batch + 1 : null,
    })
  }

  if (mode === 'captions') {
    // 전체 캡션 목록 (Replicate 학습용 metadata.jsonl 형식)
    const allImages = expandToMultiAngle(ALL_TRAINING_POINTS)
    const captions = allImages.map(img => ({
      file_name: `${img.imageId}.jpg`,
      text: img.caption,
    }))
    return NextResponse.json({ count: captions.length, captions: captions.slice(0, 20), format: 'metadata.jsonl (Replicate flux-dev-lora-trainer 호환)' })
  }

  if (mode === 'train-config') {
    // Replicate 학습 설정
    return NextResponse.json({
      model: 'ostris/flux-dev-lora-trainer',
      version: 'latest',
      input: {
        input_images: 'https://[supabase-storage]/lora-training-data.zip',
        trigger_word: 'korarch',
        autocaption: false,  // 수동 캡션 사용
        steps: 1500,
        lora_rank: 16,
        optimizer: 'adamw8bit',
        batch_size: 1,
        resolution: '1024',
        lr_scheduler: 'constant',
        learning_rate: 0.0004,
        caption_dropout_rate: 0.05,
      },
      estimated_cost: '$10-30',
      estimated_time: '1-2 hours',
      output: 'korean_architecture.safetensors',
      usage_after_training: {
        endpoint: '/api/controlnet-render',
        extra_param: 'lora=korean_architecture',
        prompt_prefix: 'korarch style,',
      },
    })
  }

  return NextResponse.json({
    endpoints: {
      status: '?mode=status — 수집 가능한 데이터 통계',
      collect: '?mode=collect&batch=0 — 배치별 이미지 수집 (20개씩)',
      captions: '?mode=captions — 전체 캡션 목록 (학습용)',
      'train-config': '?mode=train-config — Replicate 학습 설정',
    },
    총_지점: ALL_TRAINING_POINTS.length,
    총_이미지: expandToMultiAngle(ALL_TRAINING_POINTS).length,
  })
}
