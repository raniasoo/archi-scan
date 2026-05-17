/**
 * ControlNet 정밀 렌더링 API
 * Replicate Flux Canny Pro / Depth Pro → 3D 모델 형태를 정확히 유지하는 건축 렌더링
 * 
 * Three.js 3D 캡처 → canny edge 자동 추출 → 건물 윤곽 정확 유지 + 포토리얼리스틱 텍스처
 */
import { NextRequest, NextResponse } from 'next/server'
import { matchPatterns, buildPatternPrompt } from '@/lib/pattern-matcher'
import { buildContextualPatternPrompt, angleToContext } from '@/lib/pattern-prompt-builder'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN

// 모델 버전 (Replicate)
const MODELS = {
  'canny-pro': 'black-forest-labs/flux-canny-pro',
  'canny-dev': 'black-forest-labs/flux-canny-dev',
  'depth-pro': 'black-forest-labs/flux-depth-pro',
  'depth-dev': 'black-forest-labs/flux-depth-dev',
} as const

type ControlMode = keyof typeof MODELS

// 건축 프롬프트 빌더
function buildArchitecturePrompt(params: {
  address?: string
  layoutName?: string
  floors?: number
  units?: number
  siteArea?: number
  buildingType?: string
  coverage?: number
  cameraAngle?: string
  sceneMode?: string
  material?: { type?: string }
  surroundingContext?: string
  style?: string
  userPrompt?: string
  supabasePatternPrompt?: string
}): string {
  const { address, layoutName, floors = 3, units = 6, siteArea = 300, buildingType = 'tower', coverage = 50, cameraAngle = 'eye-level', sceneMode = 'afternoon', material, surroundingContext, style, userPrompt, supabasePatternPrompt } = params

  // 건물 유형 설명
  const typeDesc: Record<string, string> = {
    tower: `${floors}-story modern residential tower with clean vertical lines and glass balconies`,
    'L-shape': `${floors}-story L-shaped apartment building with two wings meeting at a corner`,
    lshape: `${floors}-story L-shaped mixed-use building with commercial ground floor`,
    'U-shape': `${floors}-story U-shaped apartment complex enclosing a central courtyard`,
    ushape: `${floors}-story U-shaped residential complex with landscaped inner garden`,
    courtyard: `${floors}-story courtyard-type housing complex with open central garden`,
    cluster: `cluster of ${Math.ceil(units / 4)} separate ${Math.min(floors, 5)}-story residential buildings`,
    'piloti-tower': `${floors}-story piloti tower with open ground-floor parking and residential above`,
    stepped: `${floors}-story stepped/terraced building following the terrain slope`,
    'row-house': `row of ${Math.ceil(units / 2)} connected ${floors}-story townhouses`,
  }

  const buildingDesc = typeDesc[buildingType] || typeDesc.tower

  // 카메라 앵글
  const angleDesc: Record<string, string> = {
    'eye-level': 'eye-level perspective from the street, showing the building entrance and facade at human height',
    'birds-eye': 'birds-eye aerial view from 45 degrees above, showing the roof layout and surrounding context',
    'entrance': 'close-up view of the main entrance area with landscaping and pedestrian approach',
    'interior': 'interior view of a bright modern living room with large windows overlooking the city',
  }

  // 재질
  const materialDesc = material?.type === 'brick' ? 'exposed brick and warm wood accents'
    : material?.type === 'stone' ? 'natural stone cladding with copper details'
    : material?.type === 'glass' ? 'floor-to-ceiling glass curtain wall with minimal metal framing'
    : 'white painted concrete facade with warm wood louvers and glass balcony railings'

  // 씬 모드
  const sceneDesc: Record<string, string> = {
    afternoon: 'warm golden afternoon sunlight, clear blue sky',
    evening: 'dramatic sunset with warm orange and purple sky',
    night: 'nighttime with interior lights glowing warmly through windows, subtle landscape lighting',
    overcast: 'soft overcast daylight, clean and even illumination',
  }

  const parts = [
    `Photorealistic architectural exterior rendering of a ${buildingDesc}.`,
    `${angleDesc[cameraAngle] || angleDesc['eye-level']}.`,
    `Building materials: ${materialDesc}.`,
    `${sceneDesc[sceneMode] || sceneDesc.afternoon}.`,
    address ? `Located in ${address}, South Korea. Korean urban residential neighborhood context.` : 'Korean urban residential setting.',
    surroundingContext ? `Surrounding: ${surroundingContext}.` : '',
    'Well-maintained streetscape with mature trees, clean sidewalks, parked cars.',
    'Professional architectural photography quality, realistic proportions and scale.',
    'Natural materials, human-scale elements (people walking, bicycles), warm atmosphere.',
    supabasePatternPrompt ? `Design patterns: ${supabasePatternPrompt}` : '',
    userPrompt || '',
  ]

  return parts.filter(Boolean).join(' ').slice(0, 2000) // Flux prompt limit
}

// Replicate 폴링
async function pollPrediction(id: string, timeout = 120_000): Promise<any> {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const res = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { 'Authorization': `Bearer ${REPLICATE_API_TOKEN}` },
    })
    const data = await res.json()
    if (data.status === 'succeeded') return data
    if (data.status === 'failed' || data.status === 'canceled') {
      throw new Error(`Replicate prediction ${data.status}: ${data.error || 'unknown'}`)
    }
    await new Promise(r => setTimeout(r, 2000))
  }
  throw new Error('Replicate prediction timeout')
}

export async function POST(req: NextRequest) {
  try {
    if (!REPLICATE_API_TOKEN) {
      return NextResponse.json({ 
        error: 'REPLICATE_API_TOKEN 미설정',
        hint: 'Vercel 환경변수에 REPLICATE_API_TOKEN을 추가하세요. https://replicate.com/account/api-tokens',
        fallback: 'gemini',
      }, { status: 503 })
    }

    const body = await req.json()
    const { 
      controlImage,        // base64 data URL (Three.js 3D 캡처) — 없으면 서버에서 생성
      controlMode = 'canny-pro' as ControlMode,
      prompt: userPrompt,
      address, layoutName, floors, units, siteArea, buildingType, 
      coverage, cameraAngle, sceneMode, material, surroundingContext,
      style, patterns, strategy, guidance = 30, steps = 50,
      megapixels = '1', outputFormat = 'png',
      originalType, buildingCount, regulation,
    } = body

    // ★ 클라이언트 3D 캡처가 없으면 서버에서 building-geometry 기반 제어 이미지 생성
    let finalControlImage = controlImage
    if (!finalControlImage && siteArea && floors) {
      try {
        const { generateControlImage: genCtrl, svgToPngBase64: svg2png } = await import('@/lib/controlnet-pipeline')
        const angleMap: Record<string, 'eye-level' | 'birds-eye' | 'entrance' | 'side'> = {
          'eye-level': 'eye-level', 'birds-eye': 'birds-eye', 'entrance': 'entrance', 'side': 'side',
        }
        const ctrlMode = controlMode.includes('depth') ? 'depth' : 'canny'
        const svg = genCtrl({
          type: buildingType || 'tower', coverage: coverage || 50, siteArea, floors,
          units, buildingCount, originalType,
          angle: angleMap[cameraAngle] || 'eye-level', style, address, regulation,
        }, ctrlMode as any)
        const png = svg2png(svg, 1024)
        if (png) {
          finalControlImage = png
          console.log(`[ControlNet] 서버 생성 제어 이미지 사용 (building-geometry ${ctrlMode})`)
        }
      } catch (e) {
        console.warn('[ControlNet] 서버 제어 이미지 생성 실패:', e)
      }
    }

    if (!finalControlImage) {
      return NextResponse.json({ error: '3D 캡처 이미지(controlImage)가 필요합니다. 또는 siteArea, floors를 전달하면 서버에서 자동 생성합니다.' }, { status: 400 })
    }

    // 모델 결정
    const model = MODELS[controlMode as ControlMode] || MODELS['canny-pro']
    console.log(`[ControlNet] Mode: ${controlMode}, Model: ${model}, Angle: ${cameraAngle}`)

    // Alexander 패턴 매칭
    let patternPrompt = ''
    try {
      const result = await matchPatterns({
        type: buildingType || 'tower',
        floors: parseInt(floors) || 3,
        units: parseInt(units) || 1,
        siteArea: parseFloat(siteArea) || 500,
        coverage: parseFloat(coverage) || 50,
        strategy, userPatterns: patterns,
      })
      const context = angleToContext(cameraAngle)
      patternPrompt = buildContextualPatternPrompt(result, context, 8)
    } catch { /* skip */ }

    // 프롬프트 생성
    const fullPrompt = buildArchitecturePrompt({
      address, layoutName, floors: parseInt(floors) || 3,
      units: parseInt(units) || 6, siteArea: parseFloat(siteArea) || 300,
      buildingType, coverage: parseFloat(coverage) || 50,
      cameraAngle, sceneMode, material, surroundingContext,
      style, userPrompt, supabasePatternPrompt: patternPrompt,
    })

    // control_image 처리 — data URL → raw URL 업로드
    // Replicate는 base64 data URL을 직접 받거나 URL을 받음
    let controlImageUrl = finalControlImage
    if (finalControlImage.startsWith('data:')) {
      // Replicate API는 data URI를 직접 지원
      controlImageUrl = finalControlImage
    }

    console.log(`[ControlNet] Prompt: ${fullPrompt.slice(0, 200)}...`)
    console.log(`[ControlNet] Control image size: ${Math.round(finalControlImage.length / 1024)}KB`)

    // Replicate prediction 생성 (models endpoint)
    const modelPath = model.replace('/', '/')  // e.g. black-forest-labs/flux-canny-pro
    const predictionRes = await fetch(`https://api.replicate.com/v1/models/${modelPath}/predictions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait=120',
      },
      body: JSON.stringify({
        input: {
          prompt: fullPrompt,
          control_image: controlImageUrl,
          guidance: guidance,
          num_inference_steps: steps,
          num_outputs: 1,
          megapixels: megapixels,
          output_format: outputFormat,
          output_quality: 90,
        },
      }),
    })

    if (!predictionRes.ok) {
      const errBody = await predictionRes.text()
      console.error(`[ControlNet] Replicate create error: ${predictionRes.status} ${errBody.slice(0, 500)}`)
      return NextResponse.json({ 
        error: `Replicate API 오류 (${predictionRes.status})`,
        details: errBody.slice(0, 200),
        fallback: 'gemini',
      }, { status: 502 })
    }

    const prediction = await predictionRes.json()
    console.log(`[ControlNet] Prediction created: ${prediction.id}, status: ${prediction.status}`)

    // 즉시 완료된 경우 (sync mode)
    if (prediction.status === 'succeeded' && prediction.output) {
      const imageUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output
      // 이미지 다운로드 → base64 변환
      const imgRes = await fetch(imageUrl)
      const imgBuf = await imgRes.arrayBuffer()
      const base64 = Buffer.from(imgBuf).toString('base64')
      const mimeType = imgRes.headers.get('content-type') || 'image/png'

      return NextResponse.json({
        success: true,
        image: `data:${mimeType};base64,${base64}`,
        model,
        controlMode,
        engine: 'controlnet',
        predictionId: prediction.id,
        metrics: { predictionTime: 0 },
      })
    }

    // 비동기 → 폴링
    const result = await pollPrediction(prediction.id, 180_000) // 3분 타임아웃
    const imageUrl = Array.isArray(result.output) ? result.output[0] : result.output

    if (!imageUrl) {
      return NextResponse.json({ 
        error: '이미지 생성 실패',
        fallback: 'gemini',
      }, { status: 500 })
    }

    // 이미지 다운로드 → base64
    const imgRes = await fetch(imageUrl)
    const imgBuf = await imgRes.arrayBuffer()
    const base64 = Buffer.from(imgBuf).toString('base64')
    const mimeType = imgRes.headers.get('content-type') || 'image/png'

    const predictionTime = result.metrics?.predict_time || 0
    console.log(`[ControlNet] ✅ Success: ${model}, ${predictionTime.toFixed(1)}s`)

    return NextResponse.json({
      success: true,
      image: `data:${mimeType};base64,${base64}`,
      model,
      controlMode,
      engine: 'controlnet',
      predictionId: prediction.id,
      metrics: { predictionTime },
    })

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(`[ControlNet] Error: ${msg}`)
    return NextResponse.json({ 
      error: msg,
      fallback: 'gemini',
    }, { status: 500 })
  }
}

// GET — 상태 확인 및 지원 모드 안내
export async function GET() {
  return NextResponse.json({
    available: !!REPLICATE_API_TOKEN,
    models: Object.entries(MODELS).map(([mode, model]) => ({
      mode, model,
      type: mode.startsWith('canny') ? 'edge' : 'depth',
      tier: mode.endsWith('pro') ? 'pro' : 'dev',
    })),
    usage: 'POST with { controlImage: "data:image/png;base64,...", controlMode: "canny-pro", prompt: "...", ...buildingParams }',
  })
}
