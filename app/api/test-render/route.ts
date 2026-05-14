import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY

// ━━━ GET 기반 AI 렌더링 일치율 테스트 ━━━
// 용도: POST 차단 환경에서 AI 렌더링 파이프라인 테스트
// 흐름: 파라미터 → Gemini 렌더링 → Gemini Vision 역분석 → 일치율 산출
export async function GET(req: NextRequest) {
  const s = req.nextUrl.searchParams
  const type = s.get('type') || 'tower'
  const floors = parseInt(s.get('floors') || '5')
  const units = parseInt(s.get('units') || '10')
  const siteArea = parseInt(s.get('siteArea') || '660')
  const coverage = parseInt(s.get('coverage') || '50')
  const buildingCount = parseInt(s.get('buildingCount') || '1')
  const addr = s.get('addr') || '서울 강남구'
  const mode = s.get('mode') || 'full' // 'full' = 렌더+분석, 'prompt' = 프롬프트만, 'analyze' = 기존 이미지 분석

  if (!GOOGLE_AI_API_KEY) {
    return NextResponse.json({ error: 'API key missing' }, { status: 500 })
  }

  const startTime = Date.now()

  try {
    // ━━━ 1. 렌더링 프롬프트 구성 ━━━
    const footprint = Math.round(siteArea * coverage / 100)
    const eachFP = Math.round(footprint / buildingCount)
    const linRatio = type === 'linear' ? 3.5 : 1.4
    const eachW = Math.round(Math.sqrt(eachFP * linRatio))
    const eachD = Math.round(eachFP / eachW)
    const heightM = Math.round(floors * 3.3)

    const typePrompts: Record<string, string> = {
      tower: `A compact ${floors}-story residential tower. Square footprint ~${eachW}m × ${eachD}m. ${units} units around a central elevator core.`,
      courtyard: `A ${floors}-story U-shaped courtyard building. ${buildingCount} building(s) each forming a U-shape around a central garden. Each wing ~${eachW}m × ${eachD}m.`,
      lshape: `A ${floors}-story L-shaped (ㄱ자형) building. ${buildingCount} building(s), each with TWO WINGS meeting at a 90-degree angle like the letter "L".`,
      linear: `A ${floors}-story linear slab building. ${buildingCount} LONG HORIZONTAL building(s), each ~${eachW}m wide × ${eachD}m deep. Very elongated, NOT square.`,
      cluster: `A cluster of ${buildingCount} varied ${floors}-story buildings arranged organically on a ${siteArea}㎡ site. Total ${units} units.`,
    }

    const prompt = `Photorealistic Korean residential building rendering.
${typePrompts[type] || typePrompts.tower}
EXACTLY ${floors} stories, ${heightM}m tall. ${units} units total.
${buildingCount > 1 ? `${buildingCount} separate buildings on the site.` : 'Single building.'}
Modern Korean architectural style. Warm afternoon lighting.
Eye-level perspective from the street.
DO NOT make the building taller than ${floors} stories.
${type === 'lshape' ? 'CRITICAL: Building MUST be L-shaped, NOT rectangular.' : ''}
${type === 'linear' ? 'CRITICAL: Building MUST be a long horizontal bar, NOT a square tower.' : ''}
${type === 'courtyard' ? 'CRITICAL: Building MUST form a U-shape around a visible central garden.' : ''}`

    if (mode === 'prompt') {
      return NextResponse.json({
        input: { type, floors, units, siteArea, coverage, buildingCount, addr },
        prompt,
        footprintCalc: { total: footprint, each: eachFP, width: eachW, depth: eachD, height: heightM },
      })
    }

    // ━━━ 2. Gemini 이미지 생성 ━━━
    console.log(`[TEST-RENDER] Generating: ${type} ${floors}F ${units}units ${buildingCount}bldg...`)

    const genUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_AI_API_KEY}`
    
    const genBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
        temperature: 0.4,
      },
    }

    const genRes = await fetch(genUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(genBody),
      signal: AbortSignal.timeout(90000),
    })

    if (!genRes.ok) {
      const errText = await genRes.text()
      console.error(`[TEST-RENDER] Gemini generation failed: ${genRes.status}`, errText.slice(0, 200))
      return NextResponse.json({ error: 'Gemini generation failed', status: genRes.status, detail: errText.slice(0, 200) }, { status: 502 })
    }

    const genData = await genRes.json()
    
    // 이미지 추출
    let imageBase64 = ''
    let geminiText = ''
    for (const part of genData.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        imageBase64 = part.inlineData.data
      }
      if (part.text) {
        geminiText += part.text
      }
    }

    if (!imageBase64) {
      return NextResponse.json({
        error: 'No image generated',
        geminiText: geminiText.slice(0, 500),
        input: { type, floors, units, siteArea, coverage, buildingCount },
      }, { status: 500 })
    }

    const renderTime = Date.now() - startTime

    // ━━━ 3. Gemini Vision 역분석 (생성된 이미지 분석) ━━━
    console.log(`[TEST-RENDER] Analyzing generated image...`)

    const analysisPrompt = `You are an architectural image analyzer. Analyze this building rendering and respond ONLY in JSON format.

Extract these properties from the image:
1. floor_count: How many floors/stories does the building have? Count carefully.
2. building_shape: What is the building's footprint shape? Options: "tower" (square/compact), "lshape" (L-shaped), "linear" (long horizontal bar), "courtyard" (U-shaped around garden), "cluster" (multiple varied buildings), "rectangular" (simple rectangle)
3. building_count: How many separate buildings are visible?
4. has_garden: Is there a visible garden or courtyard? true/false
5. height_impression: "low-rise" (1-3 floors), "mid-rise" (4-7 floors), "high-rise" (8+ floors)
6. material: Main facade material visible
7. confidence: Your confidence level 0-100

Respond ONLY with valid JSON, no markdown, no explanation:
{"floor_count":5,"building_shape":"tower","building_count":1,"has_garden":false,"height_impression":"mid-rise","material":"concrete","confidence":80}`

    const analysisUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_AI_API_KEY}`
    
    const analysisBody = {
      contents: [{
        parts: [
          { text: analysisPrompt },
          { inlineData: { mimeType: 'image/png', data: imageBase64 } },
        ],
      }],
      generationConfig: { temperature: 0.1 },
    }

    const analysisRes = await fetch(analysisUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(analysisBody),
      signal: AbortSignal.timeout(30000),
    })

    let analysis: any = null
    if (analysisRes.ok) {
      const analysisData = await analysisRes.json()
      const rawText = analysisData.candidates?.[0]?.content?.parts?.[0]?.text || ''
      try {
        const cleaned = rawText.replace(/```json|```/g, '').trim()
        analysis = JSON.parse(cleaned)
      } catch {
        analysis = { raw: rawText.slice(0, 500), parseError: true }
      }
    }

    const totalTime = Date.now() - startTime

    // ━━━ 4. 일치율 계산 ━━━
    const match: Record<string, { input: any; output: any; match: boolean; score: number }> = {}

    if (analysis && !analysis.parseError) {
      // 층수 일치
      const floorDiff = Math.abs((analysis.floor_count || 0) - floors)
      match.floors = {
        input: floors,
        output: analysis.floor_count,
        match: floorDiff === 0,
        score: floorDiff === 0 ? 100 : floorDiff === 1 ? 70 : floorDiff <= 2 ? 40 : 10,
      }

      // 건물 형태 일치
      const shapeMap: Record<string, string[]> = {
        tower: ['tower', 'rectangular'],
        courtyard: ['courtyard'],
        lshape: ['lshape'],
        linear: ['linear', 'rectangular'],
        cluster: ['cluster'],
      }
      const expectedShapes = shapeMap[type] || [type]
      const shapeMatch = expectedShapes.includes(analysis.building_shape)
      match.shape = {
        input: type,
        output: analysis.building_shape,
        match: shapeMatch,
        score: shapeMatch ? 100 : (analysis.building_shape === 'rectangular' && type !== 'tower') ? 30 : 0,
      }

      // 동수 일치
      const bldgDiff = Math.abs((analysis.building_count || 1) - buildingCount)
      match.buildingCount = {
        input: buildingCount,
        output: analysis.building_count,
        match: bldgDiff === 0,
        score: bldgDiff === 0 ? 100 : bldgDiff === 1 ? 60 : 20,
      }

      // 높이 인상 일치
      const expectedHeight = floors <= 3 ? 'low-rise' : floors <= 7 ? 'mid-rise' : 'high-rise'
      match.heightImpression = {
        input: expectedHeight,
        output: analysis.height_impression,
        match: analysis.height_impression === expectedHeight,
        score: analysis.height_impression === expectedHeight ? 100 : 30,
      }
    }

    const scores = Object.values(match).map(m => m.score)
    const overallScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0

    return NextResponse.json({
      input: { type, floors, units, siteArea, coverage, buildingCount, addr },
      analysis,
      match,
      overallScore,
      timing: { renderMs: renderTime, totalMs: totalTime },
      imageSize: imageBase64 ? Math.round(imageBase64.length / 1024) + 'KB' : 'none',
    })

  } catch (err: any) {
    console.error('[TEST-RENDER] Error:', err)
    return NextResponse.json({ error: err.message || 'Unknown error', elapsed: Date.now() - startTime }, { status: 500 })
  }
}
