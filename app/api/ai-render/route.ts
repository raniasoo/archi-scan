import { NextRequest, NextResponse } from 'next/server'

const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY

export async function POST(req: NextRequest) {
  try {
    if (!GOOGLE_AI_API_KEY) {
      return NextResponse.json({ error: 'GOOGLE_AI_API_KEY not configured' }, { status: 500 })
    }

    const { prompt, style, address, layoutName, floors, units, siteArea, buildingType, coverage } = await req.json()

    if (!prompt) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
    }

    // 건축 렌더링 최적화 프롬프트 생성
    const architecturePrompt = buildArchitecturePrompt({
      prompt, style, address, layoutName, floors, units, siteArea, buildingType, coverage
    })

    // Gemini API 호출 — 모델 fallback 체인
    // 나노바나나 모델 — API 모델 목록 직접 확인 (2026.05.06)
    const models = [
      'gemini-2.5-flash-image',         // Nano Banana (1순위)
      'gemini-3.1-flash-image-preview',  // Nano Banana 2
      'gemini-3-pro-image-preview',      // Nano Banana Pro
    ]
    
    let data: any = null
    let lastError = ''
    
    for (const model of models) {
      try {
        console.log(`[GEMINI] Trying model: ${model}`)
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_AI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: architecturePrompt }] }],
              generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
            }),
          }
        )
        
        if (response.ok) {
          data = await response.json()
          console.log(`[GEMINI] Success with model: ${model}`)
          break
        } else {
          lastError = `${model}: ${response.status}`
          console.warn(`[GEMINI] ${model} failed: ${response.status}`)
          // 429 rate limit → 2초 대기 후 다음 모델
          if (response.status === 429) await new Promise(r => setTimeout(r, 2000))
        }
      } catch (e) {
        lastError = `${model}: ${e instanceof Error ? e.message : 'error'}`
        console.warn(`[GEMINI] ${model} error:`, e)
      }
    }
    
    if (!data) {
      const is429 = lastError.includes('429')
      return NextResponse.json({ 
        error: is429 
          ? '⏳ AI 이미지 생성 일일 한도에 도달했습니다. 잠시 후 다시 시도해주세요.'
          : `Gemini 모델 오류: ${lastError}`,
      }, { status: is429 ? 429 : 500 })
    }
    
    // 응답에서 이미지와 텍스트 추출
    const parts = data?.candidates?.[0]?.content?.parts || []
    
    let imageData: string | null = null
    let description = ''

    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        imageData = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
      }
      if (part.text) {
        description += part.text
      }
    }

    return NextResponse.json({
      success: true,
      image: imageData,
      description,
      model: 'gemini-2.5-flash-image (Nano Banana)',
      prompt: architecturePrompt,
    })

  } catch (error) {
    console.error('[GEMINI] Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

function buildArchitecturePrompt(params: {
  prompt: string
  style?: string
  address?: string
  layoutName?: string
  floors?: number
  units?: number
  siteArea?: number
  buildingType?: string
  coverage?: number
}): string {
  const { prompt, style, address, layoutName, floors, units, siteArea, buildingType, coverage } = params

  const styleMap: Record<string, string> = {
    'modern-luxury': '모던 럭셔리 스타일, 유리 커튼월, 알루미늄 패널, 고급 석재 마감',
    'eco-green': '친환경 녹색 건축, 수직 정원, 옥상 녹화, 태양광 패널, 자연 소재',
    'korean-modern': '한국 모던 건축, 전통 처마선, 한옥 디테일, 현대적 재해석',
    'minimalism': '미니멀리즘, 깔끔한 라인, 화이트 콘크리트, 단순한 형태',
    'urban-complex': '도시 복합 개발, 저층 상가+고층 주거, 보행 데크, 커뮤니티 공간',
    'premium-resi': '프리미엄 주거, 테라스 발코니, 조경 중정, 커뮤니티 시설',
  }

  const styleDesc = style ? (styleMap[style] || style) : '현대적 고급 주거'

  // 건물 형태 설명 (도면과 일치)
  const f = floors || 3
  const u = units || 6
  const footprint = siteArea && coverage ? Math.round(siteArea * coverage / 100) : 200
  const bW = Math.round(Math.sqrt(footprint * 1.5))
  const bD = Math.round(footprint / bW)

  let buildingForm = ''
  if (f <= 2 && u <= 4) {
    buildingForm = `A low-rise detached house, ${f} stories, compact and elegant. Building footprint approximately ${bW}m × ${bD}m. Residential entrance with small garden. No commercial space on ground floor.`
  } else if (f <= 5 && u <= 20) {
    buildingForm = `A low-rise multi-family residential building (다세대/빌라), ${f} stories, ${u} units. Building footprint approximately ${bW}m × ${bD}m. Ground floor has entrance hall and parking. Upper floors are residential units. Simple, clean facade with balconies.`
  } else if (f <= 10) {
    buildingForm = `A mid-rise apartment building, ${f} stories, ${u} units. Building footprint approximately ${bW}m × ${bD}m. Ground floor has lobby, small retail, and parking entrance. Rectangular massing with regular window pattern.`
  } else {
    buildingForm = `A high-rise residential tower, ${f} stories, ${u} units. Slender tower form with podium. Ground level retail and grand lobby entrance.`
  }

  // 배치 타입별 형태 조정
  const typeHints: Record<string, string> = {
    'tower': 'Single tower form, vertical emphasis',
    'courtyard': 'U-shaped or courtyard layout, central garden visible',
    'lshape': 'L-shaped building form, asymmetric massing',
    'linear': 'Linear/slab building, elongated horizontal form',
    'cluster': 'Multiple small buildings clustered together',
  }
  const typeHint = buildingType ? (typeHints[buildingType] || '') : ''

  return `Generate a photorealistic architectural exterior rendering.

BUILDING FORM (MUST match exactly):
${buildingForm}
${typeHint ? `Layout: ${typeHint}` : ''}

CONTEXT:
- Location: ${address || 'Seoul, South Korea'}
- Project: ${layoutName || '주거 건물'}
- Design style: ${styleDesc}

RENDERING REQUIREMENTS:
- Photorealistic 3D architectural rendering
- Eye-level perspective showing main facade and entrance
- Beautiful landscaping with trees
- Warm afternoon lighting
- High-end materials
- Korean residential neighborhood
- 16:9 aspect ratio
- The building MUST appear as ${f}-story structure (count the floors!)

${prompt}

Generate ONE high-quality image.`
}

// GET: API 상태 확인
export async function GET() {
  return NextResponse.json({
    configured: !!GOOGLE_AI_API_KEY,
    model: 'nano-banana (gemini fallback chain)',
    capabilities: ['image-generation', 'text'],
    service: 'Nano Banana (Gemini)',
  })
}
