// ============================================================
// Replicate Flux + LoRA 렌더링 API
// 한국 건축 스타일 특화 이미지 생성
// ============================================================
import { NextRequest, NextResponse } from 'next/server'

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN

// 한국 건축 LoRA 모델 매핑 (학습 후 URL 교체)
const KOREAN_LORAS: Record<string, { url: string; trigger: string; label: string }> = {
  'khanok-modern': {
    url: '', // 학습 후 Replicate LoRA URL 입력
    trigger: 'khanok_modern style',
    label: '한옥 현대화',
  },
  'kvilla': {
    url: '',
    trigger: 'kvilla_exterior style',
    label: '한국 빌라',
  },
  'kapartment': {
    url: '',
    trigger: 'kapart_complex style',
    label: '한국 아파트',
  },
  'kcommercial': {
    url: '',
    trigger: 'kcommercial_resi style',
    label: '상가주택',
  },
  'kluxury': {
    url: '',
    trigger: 'kluxury_house style',
    label: '고급 단독주택',
  },
}

// Flux 프롬프트 생성 (LoRA trigger word 포함)
function buildFluxPrompt(params: {
  loraStyle?: string
  address?: string
  layoutName?: string
  floors?: number
  units?: number
  siteArea?: number
  surroundingContext?: string
  cameraAngle?: string
  sceneMode?: string
  material?: { type?: string }
}): string {
  const { loraStyle, address, layoutName, floors = 2, units = 4, siteArea = 300, surroundingContext, cameraAngle, sceneMode, material } = params

  const lora = loraStyle ? KOREAN_LORAS[loraStyle] : null
  const trigger = lora?.trigger || ''

  // 건물 규모
  const footW = Math.round(Math.sqrt((siteArea || 300) * 0.5))
  const footD = Math.round((siteArea || 300) * 0.5 / footW)

  // 카메라
  const angleMap: Record<string, string> = {
    'eye-level': 'eye-level perspective photograph, 3/4 angle view showing main facade',
    'birds-eye': 'aerial drone photograph from 45 degrees above, showing roof and surrounding landscape',
    'entrance': 'close-up photograph of the main entrance, showing door details and landscaping',
  }
  const cameraDesc = angleMap[cameraAngle || 'eye-level'] || angleMap['eye-level']

  // 장면
  const sceneMap: Record<string, string> = {
    'afternoon': 'warm afternoon sunlight, clear sky',
    'golden': 'golden hour sunset, dramatic orange sky',
    'night': 'nighttime, architectural lighting, warm interior glow',
    'spring': 'spring season, cherry blossoms blooming',
    'summer': 'lush summer greenery',
    'winter': 'winter, light snow, bare trees',
  }
  const sceneDesc = sceneMap[sceneMode || 'afternoon'] || sceneMap['afternoon']

  // 재질
  const materialMap: Record<string, string> = {
    'glass-curtain': 'glass curtain wall facade',
    'exposed-concrete': 'exposed concrete',
    'brick': 'warm clay brick facade',
    'stone': 'natural stone cladding',
    'metal-panel': 'metal panel cladding',
    'wood-louver': 'wood louver screen',
    'stucco': 'white stucco finish',
    'composite': 'mixed materials stone base glass upper',
  }
  const materialDesc = material?.type ? materialMap[material.type] || '' : ''

  const parts = [
    trigger,
    `Photorealistic architectural photograph of a ${floors}-story Korean residential building`,
    `${units} units, approximately ${footW}m wide and ${footD}m deep`,
    layoutName ? `${layoutName} layout` : '',
    materialDesc,
    cameraDesc,
    sceneDesc,
    'professional architectural photography, 8K resolution, sharp details',
    'beautiful landscaping with mature trees, Korean urban context',
    surroundingContext ? `Context: ${surroundingContext.substring(0, 200)}` : '',
    address ? `Location: ${address}` : 'Seoul, South Korea',
  ].filter(Boolean)

  return parts.join(', ')
}

export async function POST(req: NextRequest) {
  try {
    if (!REPLICATE_API_TOKEN) {
      return NextResponse.json({
        error: 'REPLICATE_API_TOKEN not configured',
        hint: 'Replicate API 토큰을 Vercel 환경변수에 추가해주세요. https://replicate.com/account/api-tokens',
        configured: false,
      }, { status: 200 }) // 200으로 반환 (UI에서 fallback 처리)
    }

    const body = await req.json()
    const { loraStyle, ...promptParams } = body

    const lora = loraStyle ? KOREAN_LORAS[loraStyle] : null

    // LoRA URL이 없으면 기본 Flux 모델 사용
    const prompt = buildFluxPrompt({ loraStyle, ...promptParams })
    const negativePrompt = 'blurry, low quality, distorted, extra floors, text, watermark, unrealistic proportions'

    console.log(`[FLUX] Style: ${loraStyle || 'default'}, LoRA: ${lora?.url ? 'custom' : 'base'}`)

    // Replicate API 호출
    const modelVersion = 'black-forest-labs/flux-dev' // 기본 Flux Dev
    const input: any = {
      prompt,
      negative_prompt: negativePrompt,
      width: 1024,
      height: 576, // 16:9
      num_inference_steps: 28,
      guidance_scale: 3.5,
      output_format: 'png',
    }

    // LoRA URL이 있으면 적용
    if (lora?.url) {
      input.lora_urls = lora.url
      input.lora_scales = '1.0'
    }

    // Replicate predictions API
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelVersion,
        input,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('[FLUX] Replicate error:', err)
      return NextResponse.json({ error: 'Replicate API error', details: err }, { status: 500 })
    }

    const prediction = await response.json()

    // 폴링으로 결과 대기 (최대 120초)
    let result = prediction
    const startTime = Date.now()
    while (result.status !== 'succeeded' && result.status !== 'failed') {
      if (Date.now() - startTime > 120000) {
        return NextResponse.json({ error: 'Timeout waiting for Flux rendering', predictionId: result.id })
      }
      await new Promise(r => setTimeout(r, 2000))
      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
        headers: { 'Authorization': `Bearer ${REPLICATE_API_TOKEN}` },
      })
      result = await pollRes.json()
    }

    if (result.status === 'failed') {
      return NextResponse.json({ error: 'Flux rendering failed', details: result.error })
    }

    // 결과 이미지 URL → base64 변환
    const imageUrl = Array.isArray(result.output) ? result.output[0] : result.output
    if (!imageUrl) {
      return NextResponse.json({ error: 'No image generated' })
    }

    // 이미지 다운로드 → base64
    const imgRes = await fetch(imageUrl)
    const imgBuf = await imgRes.arrayBuffer()
    const base64 = Buffer.from(imgBuf).toString('base64')
    const dataUrl = `data:image/png;base64,${base64}`

    return NextResponse.json({
      success: true,
      image: dataUrl,
      model: lora?.url ? `flux-dev + ${lora.label} LoRA` : 'flux-dev (base)',
      style: loraStyle || 'default',
      prompt: prompt.substring(0, 200) + '...',
    })

  } catch (error) {
    console.error('[FLUX] Error:', error)
    return NextResponse.json({ error: 'Flux rendering error' }, { status: 500 })
  }
}

// LoRA 모델 목록 반환
export async function GET() {
  const configured = !!REPLICATE_API_TOKEN
  const styles = Object.entries(KOREAN_LORAS).map(([id, lora]) => ({
    id,
    label: lora.label,
    hasLora: !!lora.url,
    trigger: lora.trigger,
  }))

  return NextResponse.json({ configured, styles, availableCount: styles.filter(s => s.hasLora).length })
}
