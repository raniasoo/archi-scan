import { NextRequest, NextResponse } from 'next/server'

const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY

export async function POST(req: NextRequest) {
  try {
    if (!GOOGLE_AI_API_KEY) {
      return NextResponse.json({ error: 'GOOGLE_AI_API_KEY not configured' }, { status: 500 })
    }

    const { prompt, style, address, layoutName, floors, units, siteArea, buildingType, coverage, strategy, values, patterns, surroundingContext } = await req.json()

    if (!prompt) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
    }

    const architecturePrompt = buildArchitecturePrompt({
      prompt, style, address, layoutName, floors, units, siteArea, buildingType, coverage, strategy, values, patterns, surroundingContext
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
  strategy?: string
  values?: { profitVsQuality?: number; privacyVsCommunity?: number; efficiencyVsSpace?: number }
  patterns?: string[]
  surroundingContext?: string
}): string {
  const { prompt, style, address, layoutName, floors, units, siteArea, buildingType, coverage, strategy, values, patterns, surroundingContext } = params

  const styleMap: Record<string, string> = {
    'modern-luxury': '모던 럭셔리 스타일, 유리 커튼월, 알루미늄 패널, 고급 석재 마감',
    'eco-green': '친환경 녹색 건축, 수직 정원, 옥상 녹화, 태양광 패널, 자연 소재',
    'korean-modern': '한국 모던 건축, 전통 처마선, 한옥 디테일, 현대적 재해석',
    'minimalism': '미니멀리즘, 깔끔한 라인, 화이트 콘크리트, 단순한 형태',
    'urban-complex': '도시 복합 개발, 저층 상가+고층 주거, 보행 데크, 커뮤니티 공간',
    'premium-resi': '프리미엄 주거, 테라스 발코니, 조경 중정, 커뮤니티 시설',
  }

  const styleDesc = style ? (styleMap[style] || style) : '현대적 고급 주거'

  const f = floors || 3
  const u = units || 6
  const footprint = siteArea && coverage ? Math.round(siteArea * coverage / 100) : 200
  const bW = Math.round(Math.sqrt(footprint * 1.5))
  const bD = Math.round(footprint / bW)

  // 건물 규모별 형태
  let buildingForm = ''
  if (f <= 2 && u <= 4) {
    buildingForm = `A low-rise detached house, ${f} stories, compact and elegant. Footprint ~${bW}m × ${bD}m. Residential entrance with garden.`
  } else if (f <= 5 && u <= 20) {
    buildingForm = `A low-rise multi-family villa, ${f} stories, ${u} units. Footprint ~${bW}m × ${bD}m. Ground floor: entrance hall + parking. Upper: residential.`
  } else if (f <= 10) {
    buildingForm = `A mid-rise apartment, ${f} stories, ${u} units. Footprint ~${bW}m × ${bD}m. Ground floor: lobby + retail + parking.`
  } else {
    buildingForm = `A high-rise tower, ${f} stories, ${u} units. Slender tower with podium.`
  }

  const typeHints: Record<string, string> = {
    'tower': 'Single tower, vertical emphasis',
    'courtyard': 'U-shaped, central garden visible',
    'lshape': 'L-shaped building',
    'linear': 'Elongated horizontal slab',
    'cluster': 'Multiple small buildings clustered',
  }
  const typeHint = buildingType ? (typeHints[buildingType] || '') : ''

  // ━━━ 설계 전략 → 렌더링 스타일 ━━━
  const strategyStyles: Record<string, string> = {
    'profitability': 'Efficient, dense, maximized floor area. Clean modern facade with regular grid windows.',
    'livability': 'Warm, inviting, with generous balconies, community gardens, and playground visible. Family-friendly atmosphere.',
    'view-priority': 'Open views emphasized, large windows, stepped terraces, panoramic balconies. Premium glass facade.',
    'privacy-priority': 'Screened balconies, staggered units, vegetation buffers between units. Private feel.',
    'area-maximize': 'Maximum building volume, flush facade, minimal setbacks. Dense but modern.',
    'parking-efficient': 'Ground level parking visible, efficient layout, practical design.',
  }
  const strategyStyle = strategy ? (strategyStyles[strategy] || '') : ''

  // ━━━ 가치관 슬라이더 → 분위기 ━━━
  let atmosphereHints: string[] = []
  if (values) {
    if (values.profitVsQuality !== undefined) {
      if (values.profitVsQuality > 70) atmosphereHints.push('Emphasis on quality of life: lush landscaping, wide walkways, playground, rooftop garden')
      else if (values.profitVsQuality < 30) atmosphereHints.push('Efficient and modern: clean lines, maximized usable space')
    }
    if (values.privacyVsCommunity !== undefined) {
      if (values.privacyVsCommunity > 70) atmosphereHints.push('Strong community feel: shared courtyard, outdoor seating areas, gathering spaces')
      else if (values.privacyVsCommunity < 30) atmosphereHints.push('Privacy-focused: screened balconies, hedges between units, minimal shared space')
    }
    if (values.efficiencyVsSpace !== undefined) {
      if (values.efficiencyVsSpace > 70) atmosphereHints.push('Spacious feeling: generous setbacks, open green areas, wide corridors')
      else if (values.efficiencyVsSpace < 30) atmosphereHints.push('Compact and efficient: tight footprint, vertical emphasis')
    }
  }

  // ━━━ 선택 패턴 → 구체적 요소 ━━━
  const patternElements: Record<string, string> = {
    // 단지·외부
    'courtyard': 'Include a visible courtyard/playground where children can play',
    'neighbors': 'Show semi-public gathering area where neighbors naturally meet',
    'accessible-green': 'Show green park or garden directly accessible from the building',
    'walk-safe': 'Show safe pedestrian paths clearly separated from vehicles',
    'shop-street': 'Ground floor has inviting cafe/retail storefronts with outdoor seating',
    'tree-view': 'Show mature trees near windows, visible greenery from units',
    'small-parking': 'Parking is hidden underground or behind landscaping, not visible from front',
    'connected-play': 'Include adventure playground with natural materials for children',
    'garden-wall': 'Replace walls with hedges, small gardens, or planting beds',
    'outdoor-room': 'Show outdoor seating area with shade structure',
    'main-entrance': 'Prominent, welcoming building entrance with architectural detail',
    'local-sports': 'Include visible outdoor exercise area or sports court',
    'fruit-trees': 'Show fruit-bearing trees in the landscaping',
    // 건물·동선
    'south-light': 'South-facing windows with warm sunlight streaming in',
    'quiet-entry': 'Gradual transition from public street to private entrance',
    'rooftop': 'Show rooftop garden or terrace with sky views',
    'balcony': 'Generous 2m deep balconies with plants on each unit',
    'building-edge': 'Active ground floor with display windows and awnings',
    'ceiling-height': 'Emphasize tall ceiling heights, especially on ground floor',
    'visible-roof': 'Show a distinctive roof form (pitched, green roof, or terrace)',
    'cascade-roof': 'Building steps down to match neighboring building heights',
    // 실·생활
    'two-light': 'Corner units with windows on two sides, bright interiors visible',
    'window-place': 'Window seats or reading nooks visible from outside',
    'private-terrace': 'Each unit has a small private terrace or garden',
    'earth-connect': 'Ground floor units connect directly to garden/earth',
  }
  const patternHints = (patterns || []).map(p => patternElements[p]).filter(Boolean)

  return `Generate a photorealistic architectural exterior rendering.

BUILDING FORM:
${buildingForm}
${typeHint ? `Layout: ${typeHint}` : ''}

DESIGN DIRECTION:
${strategyStyle || 'Modern residential design'}
${atmosphereHints.length > 0 ? `\nATMOSPHERE:\n${atmosphereHints.map(h => `- ${h}`).join('\n')}` : ''}
${patternHints.length > 0 ? `\nMUST INCLUDE THESE ELEMENTS:\n${patternHints.map(h => `- ${h}`).join('\n')}` : ''}

CONTEXT:
- Location: ${address || 'Seoul, South Korea'}
- Project: ${layoutName || '주거 건물'}
- Style: ${styleDesc}
${surroundingContext ? `\nSURROUNDING ENVIRONMENT:\n${surroundingContext}\nThe rendering should show the building in context with its actual neighborhood.` : ''}

RENDERING:
- Photorealistic 3D architectural rendering
- Eye-level perspective, main facade + entrance
- Beautiful landscaping
- Warm afternoon lighting
- 16:9 aspect ratio
- MUST be ${f}-story structure

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
