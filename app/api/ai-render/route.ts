import { NextRequest, NextResponse } from 'next/server'

const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY

export async function POST(req: NextRequest) {
  try {
    if (!GOOGLE_AI_API_KEY) {
      return NextResponse.json({ error: 'GOOGLE_AI_API_KEY not configured' }, { status: 500 })
    }

    const { prompt, style, address, layoutName, floors, units, siteArea } = await req.json()

    if (!prompt) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
    }

    // 건축 렌더링 최적화 프롬프트 생성
    const architecturePrompt = buildArchitecturePrompt({
      prompt, style, address, layoutName, floors, units, siteArea
    })

    // Gemini API 호출 — 모델 fallback 체인
    const models = [
      'gemini-2.5-flash-image',
      'gemini-3.1-flash-image-preview',
      'gemini-3-pro-image-preview',
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
        }
      } catch (e) {
        lastError = `${model}: ${e instanceof Error ? e.message : 'error'}`
        console.warn(`[GEMINI] ${model} error:`, e)
      }
    }
    
    if (!data) {
      return NextResponse.json({ 
        error: `모든 Gemini 모델 실패: ${lastError}`,
      }, { status: 500 })
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
      model: 'gemini-2.0-flash-exp-image-generation',
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
}): string {
  const { prompt, style, address, layoutName, floors, units, siteArea } = params

  const styleMap: Record<string, string> = {
    'modern-luxury': '모던 럭셔리 스타일, 유리 커튼월, 알루미늄 패널, 고급 석재 마감',
    'eco-green': '친환경 녹색 건축, 수직 정원, 옥상 녹화, 태양광 패널, 자연 소재',
    'korean-modern': '한국 모던 건축, 전통 처마선, 한옥 디테일, 현대적 재해석',
    'minimalism': '미니멀리즘, 깔끔한 라인, 화이트 콘크리트, 단순한 형태',
    'urban-complex': '도시 복합 개발, 저층 상가+고층 주거, 보행 데크, 커뮤니티 공간',
    'premium-resi': '프리미엄 주거, 테라스 발코니, 조경 중정, 커뮤니티 시설',
  }

  const styleDesc = style ? (styleMap[style] || style) : '현대적 고급 주거'

  return `Generate a photorealistic architectural exterior rendering of a residential building in South Korea.

Building specifications:
- Location: ${address || 'Seoul, South Korea'}
- Building name: ${layoutName || '주거 건물'}
- Number of floors: ${floors || 3}
- Total units: ${units || 30}
- Site area: ${siteArea ? `${siteArea}㎡` : 'medium-scale'}
- Design style: ${styleDesc}

Requirements:
- Photorealistic 3D architectural rendering
- Eye-level perspective view showing the main facade
- Beautiful landscaping with trees and pedestrian walkways
- Warm golden hour lighting
- High-end materials and finishes
- Korean residential neighborhood context
- Professional architectural photography quality
- 16:9 aspect ratio

Additional style notes: ${prompt}

Generate ONE high-quality architectural rendering image.`
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
