/**
 * LoRA 학습 API
 * 
 * GET ?mode=status        → 학습 상태 확인
 * POST { action: 'start' } → Replicate에서 LoRA 학습 시작
 * POST { action: 'test' }  → 학습된 LoRA로 테스트 이미지 생성
 */
import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN

// LoRA 모델 정보 (학습 후 설정)
const LORA_CONFIG = {
  // 학습 완료 후 이 값들을 업데이트
  trainedModelUrl: process.env.LORA_KOREAN_ARCH_URL || '',  // e.g. "https://replicate.delivery/xxx/trained_model.tar"
  triggerWord: 'korarch',
  version: process.env.LORA_KOREAN_ARCH_VERSION || '',
  lastTrained: process.env.LORA_LAST_TRAINED || '',
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('mode')

  if (mode === 'status') {
    return NextResponse.json({
      loraAvailable: !!LORA_CONFIG.trainedModelUrl,
      triggerWord: LORA_CONFIG.triggerWord,
      lastTrained: LORA_CONFIG.lastTrained || 'never',
      replicateTokenSet: !!REPLICATE_API_TOKEN,
      config: {
        modelUrl: LORA_CONFIG.trainedModelUrl ? '설정됨' : '미설정 — 학습 필요',
        version: LORA_CONFIG.version || '미설정',
      },
      usage: {
        prompt: `${LORA_CONFIG.triggerWord} style, Korean 4-story residential villa...`,
        endpoint: '/api/controlnet-render (POST, lora: true)',
      },
    })
  }

  return NextResponse.json({
    endpoints: {
      'GET ?mode=status': 'LoRA 학습 상태 확인',
      'POST { action: "start", dataUrl: "..." }': 'Replicate에서 LoRA 학습 시작',
      'POST { action: "test", prompt: "..." }': '학습된 LoRA로 테스트 이미지 생성',
    },
  })
}

export async function POST(req: NextRequest) {
  if (!REPLICATE_API_TOKEN) {
    return NextResponse.json({ error: 'REPLICATE_API_TOKEN 미설정' }, { status: 503 })
  }

  const body = await req.json()
  const { action } = body

  // ━━━ 학습 시작 ━━━
  if (action === 'start') {
    const { dataUrl } = body  // Supabase Storage URL (ZIP)
    if (!dataUrl) {
      return NextResponse.json({ error: 'dataUrl 필요 (학습 데이터 ZIP의 공개 URL)' }, { status: 400 })
    }

    try {
      const res = await fetch('https://api.replicate.com/v1/models/ostris/flux-dev-lora-trainer/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: {
            input_images: dataUrl,
            trigger_word: LORA_CONFIG.triggerWord,
            autocaption: false,
            steps: 1500,
            lora_rank: 16,
            optimizer: 'adamw8bit',
            batch_size: 1,
            resolution: '1024',
            lr_scheduler: 'constant',
            learning_rate: 0.0004,
            caption_dropout_rate: 0.05,
          },
        }),
      })

      if (!res.ok) {
        const err = await res.text()
        return NextResponse.json({ error: `Replicate Training 시작 실패: ${res.status}`, details: err.slice(0, 300) }, { status: 500 })
      }

      const prediction = await res.json()
      return NextResponse.json({
        success: true,
        trainingId: prediction.id,
        status: prediction.status,
        message: '학습이 시작되었습니다. 1~2시간 소요됩니다.',
        checkUrl: `https://api.replicate.com/v1/predictions/${prediction.id}`,
        nextStep: `학습 완료 후 output URL을 Vercel 환경변수 LORA_KOREAN_ARCH_URL에 설정하세요.`,
      })
    } catch (e) {
      return NextResponse.json({ error: String(e) }, { status: 500 })
    }
  }

  // ━━━ 학습된 LoRA로 테스트 ━━━
  if (action === 'test') {
    if (!LORA_CONFIG.trainedModelUrl) {
      return NextResponse.json({ error: 'LoRA 모델 미설정. LORA_KOREAN_ARCH_URL 환경변수를 설정하세요.' }, { status: 400 })
    }

    const prompt = body.prompt || `${LORA_CONFIG.triggerWord} style, Korean 4-story multi-family villa, pilotis parking, balcony with laundry, external staircase, beige tile facade, narrow residential street, afternoon sunlight`

    try {
      const res = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
          'Content-Type': 'application/json',
          'Prefer': 'wait=120',
        },
        body: JSON.stringify({
          version: LORA_CONFIG.version,
          input: {
            prompt,
            num_outputs: 1,
            guidance_scale: 7.5,
            num_inference_steps: 28,
            output_format: 'webp',
            output_quality: 85,
          },
        }),
      })

      const prediction = await res.json()

      if (prediction.status === 'succeeded') {
        const imageUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output
        return NextResponse.json({ success: true, imageUrl, prompt, model: 'flux-dev + korean_architecture LoRA' })
      }

      // 폴링 필요
      return NextResponse.json({
        success: true,
        predictionId: prediction.id,
        status: prediction.status,
        message: '이미지 생성 중...',
        checkUrl: `https://api.replicate.com/v1/predictions/${prediction.id}`,
      })
    } catch (e) {
      return NextResponse.json({ error: String(e) }, { status: 500 })
    }
  }

  // ━━━ 학습 상태 확인 ━━━
  if (action === 'check') {
    const { trainingId } = body
    if (!trainingId) return NextResponse.json({ error: 'trainingId 필요' }, { status: 400 })

    try {
      const res = await fetch(`https://api.replicate.com/v1/predictions/${trainingId}`, {
        headers: { 'Authorization': `Bearer ${REPLICATE_API_TOKEN}` },
      })
      const data = await res.json()
      return NextResponse.json({
        id: data.id,
        status: data.status,
        progress: data.logs?.split('\n').slice(-5).join('\n'),
        output: data.output,
        metrics: data.metrics,
        error: data.error,
      })
    } catch (e) {
      return NextResponse.json({ error: String(e) }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'action 필요: start | test | check' }, { status: 400 })
}
