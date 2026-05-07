import { NextRequest, NextResponse } from 'next/server'

const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY

export async function POST(req: NextRequest) {
  try {
    if (!GOOGLE_AI_API_KEY) {
      return NextResponse.json({ error: 'GOOGLE_AI_API_KEY not configured' }, { status: 500 })
    }

    const { prompt, style, address, layoutName, floors, units, siteArea, buildingType, coverage, strategy, values, patterns, surroundingContext, cameraAngle, sceneMode, satelliteUrl, material, multiAngle } = await req.json()

    if (!prompt) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
    }

    // #7: 위성사진 → base64 변환 (Gemini 멀티모달 입력)
    let satelliteBase64: string | null = null
    if (satelliteUrl) {
      try {
        const imgRes = await fetch(satelliteUrl, { signal: AbortSignal.timeout(8000) })
        if (imgRes.ok) {
          const buf = await imgRes.arrayBuffer()
          satelliteBase64 = Buffer.from(buf).toString('base64')
          console.log(`[GEMINI] Satellite image loaded: ${Math.round(buf.byteLength / 1024)}KB`)
        }
      } catch (e) {
        console.warn('[GEMINI] Satellite image fetch failed:', e)
      }
    }

    // #9: 멀티앵글 — 3장 일괄 생성
    if (multiAngle) {
      const angles = [
        { angle: 'eye-level', scene: sceneMode || 'afternoon' },
        { angle: 'birds-eye', scene: sceneMode || 'afternoon' },
        { angle: 'entrance', scene: sceneMode || 'afternoon' },
      ]
      const images: { angle: string; image: string | null; error?: string }[] = []
      
      for (const a of angles) {
        const aPrompt = buildArchitecturePrompt({
          prompt, style, address, layoutName, floors, units, siteArea, buildingType, coverage, strategy, values, patterns, surroundingContext, cameraAngle: a.angle, sceneMode: a.scene, material
        })
        
        const parts: any[] = [{ text: aPrompt }]
        if (satelliteBase64) {
          parts.push({ inlineData: { mimeType: 'image/png', data: satelliteBase64 } })
          parts.push({ text: 'The image above shows the actual satellite view of the site. Match the surrounding buildings, roads, vegetation, and terrain visible in this photo.' })
        }

        try {
          const r = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GOOGLE_AI_API_KEY}`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ["TEXT", "IMAGE"] } }) }
          )
          if (r.ok) {
            const d = await r.json()
            const imgPart = d?.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'))
            images.push({ angle: a.angle, image: imgPart ? `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}` : null })
          } else {
            images.push({ angle: a.angle, image: null, error: `${r.status}` })
          }
        } catch (e) {
          images.push({ angle: a.angle, image: null, error: 'timeout' })
        }
        // rate limit 대응
        await new Promise(r => setTimeout(r, 1000))
      }
      
      return NextResponse.json({ success: true, multiAngle: true, images, model: 'gemini-2.5-flash-image' })
    }

    const architecturePrompt = buildArchitecturePrompt({
      prompt, style, address, layoutName, floors, units, siteArea, buildingType, coverage, strategy, values, patterns, surroundingContext, cameraAngle, sceneMode, material
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
        
        // #7: 위성사진을 멀티모달로 전달
        const parts: any[] = [{ text: architecturePrompt }]
        if (satelliteBase64) {
          parts.push({ inlineData: { mimeType: 'image/png', data: satelliteBase64 } })
          parts.push({ text: 'The image above shows the actual satellite/aerial view of the site and surrounding neighborhood. The rendering should match the real buildings, roads, vegetation, and terrain visible in this photo. Place the new building on the empty lot shown.' })
        }
        
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_AI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts }],
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
  cameraAngle?: string
  sceneMode?: string
  material?: { type?: string; color?: string; accent?: string }
}): string {
  const { prompt, style, address, layoutName, floors, units, siteArea, buildingType, coverage, strategy, values, patterns, surroundingContext, cameraAngle, sceneMode, material } = params

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

  // ━━━ 재질/색상 ━━━
  const materialDescs: Record<string, string> = {
    'glass-curtain': 'Glass curtain wall facade, reflective blue-tinted glass panels with slim aluminum mullions',
    'exposed-concrete': 'Exposed concrete (béton brut), raw concrete texture with formwork patterns visible',
    'brick': 'Brick facade, warm-toned clay bricks in running bond pattern',
    'stone': 'Natural stone cladding, honed granite or limestone panels',
    'metal-panel': 'Metal panel cladding, brushed aluminum or zinc panels with clean joints',
    'wood-louver': 'Wood louver screen facade, natural timber slats creating rhythm and shadow',
    'stucco': 'White stucco finish, smooth rendered walls with clean edges',
    'composite': 'Mixed materials — stone base, glass middle floors, metal panel top',
  }
  let materialHint = ''
  if (material?.type) {
    materialHint = materialDescs[material.type] || material.type
    if (material.color) materialHint += `. Primary color: ${material.color}`
    if (material.accent) materialHint += `. Accent material/color: ${material.accent}`
  }

  // ━━━ 카메라 앵글 ━━━
  const angleDesc: Record<string, string> = {
    'eye-level': 'Eye-level perspective (1.6m height), showing main facade and entrance. Slight 3/4 angle to show depth.',
    'birds-eye': 'Aerial bird\'s-eye view from 45-degree angle above, showing the building roof, landscaping layout, parking, and surrounding context. Like a drone photo from 50m height.',
    'entrance': 'Close-up of the main entrance at eye level. Focus on entrance canopy, door details, landscaping, and ground-floor facade materials. Welcoming perspective.',
  }
  const cameraDesc = angleDesc[cameraAngle || 'eye-level'] || angleDesc['eye-level']

  // ━━━ 계절/시간대 ━━━
  const sceneDesc: Record<string, string> = {
    'afternoon': 'Warm afternoon sunlight (3-4 PM), clear sky, long gentle shadows. Golden warm tone.',
    'golden': 'Golden hour / twilight (6-7 PM), dramatic warm orange sky, building silhouette with warm interior lights beginning to glow. Romantic atmosphere.',
    'night': 'Nighttime scene, building exterior illuminated by architectural lighting. Warm interior lights visible through windows. Cool blue sky, street lights.',
    'spring': 'Spring season, cherry blossoms or magnolia blooming near the building. Fresh green leaves. Bright, cheerful atmosphere.',
    'summer': 'Lush summer greenery, deep green mature trees providing shade. Vibrant landscaping. Bright daylight.',
    'winter': 'Winter scene, bare tree branches, possible light snow on the ground and roof edges. Warm interior lights contrast with cool exterior. Cozy atmosphere.',
  }
  const sceneText = sceneDesc[sceneMode || 'afternoon'] || sceneDesc['afternoon']
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
${materialHint ? `\nMATERIALS AND FINISH:\n${materialHint}` : ''}
${atmosphereHints.length > 0 ? `\nATMOSPHERE:\n${atmosphereHints.map(h => `- ${h}`).join('\n')}` : ''}
${patternHints.length > 0 ? `\nMUST INCLUDE THESE ELEMENTS:\n${patternHints.map(h => `- ${h}`).join('\n')}` : ''}

CONTEXT:
- Location: ${address || 'Seoul, South Korea'}
- Project: ${layoutName || '주거 건물'}
- Style: ${styleDesc}
${surroundingContext ? `\nSITE-SPECIFIC CONTEXT (IMPORTANT — render must reflect this):\n${surroundingContext}\n\nThe rendering MUST show the building responding to its actual site conditions described above.` : ''}

CRITICAL REQUIREMENTS:
- The building MUST have EXACTLY ${f} floors. Count them: ${Array.from({length: f}, (_, i) => `floor ${i+1}`).join(', ')}. This is non-negotiable.
- ${f <= 2 ? 'This is a LOW-RISE building, maximum 2 stories tall. Do NOT make it taller.' : f <= 5 ? `This is a LOW to MID-RISE building with exactly ${f} visible floor levels.` : `This is a ${f}-story building. Each floor must be clearly visible and countable.`}
- Photorealistic 3D architectural rendering
- CAMERA: ${cameraDesc}
- SCENE: ${sceneText}
- 16:9 aspect ratio

AVOID (do NOT include):
- Extra floors beyond ${f} stories
- Distorted or unrealistic proportions
- Text, watermarks, or labels on the image
- Floating elements or physically impossible structures
- Cars or people that look artificial

${prompt}

Generate ONE high-quality photorealistic image.`
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
