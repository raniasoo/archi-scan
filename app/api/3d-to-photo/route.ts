import { NextRequest, NextResponse } from 'next/server'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3D-First Pipeline v2 — Depth Map + 극강 프롬프트 + Auto-Select
// Three.js 스크린샷 + 깊이맵 → Gemini → 100% 형태 보존 포토리얼
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const GEMINI_URL = (key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${key}`

async function callGemini(key: string, parts: any[]) {
  const res = await fetch(GEMINI_URL(key), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
    }),
    signal: AbortSignal.timeout(120000),
  })
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = await res.json()
  const resParts = data?.candidates?.[0]?.content?.parts || []
  let image = '', text = ''
  for (const p of resParts) {
    if (p.inlineData?.data) image = `data:${p.inlineData.mimeType || 'image/png'};base64,${p.inlineData.data}`
    if (p.text) text = p.text
  }
  return { image, text }
}

export async function POST(req: NextRequest) {
  try {
    const { screenshot, depthMap, layoutName, floors, units, type, buildingCount, address, angle } = await req.json()
    if (!screenshot) return NextResponse.json({ error: 'screenshot required' }, { status: 400 })
    
    const KEY = process.env.GOOGLE_AI_API_KEY
    if (!KEY) return NextResponse.json({ error: 'API key not set' }, { status: 500 })
    
    const base64 = screenshot.replace(/^data:image\/\w+;base64,/, '')
    const depthBase64 = depthMap?.replace(/^data:image\/\w+;base64,/, '')

    // ━━━ 극강 프롬프트 (층수 5회 반복, 네거티브 지시) ━━━
    const floorText = `${floors || 2}`
    const typeText = type === 'lshape' ? 'L-shaped (ㄱ자형)' : type === 'courtyard' ? 'U-shaped (ㄷ자형)' : type === 'tower' ? 'tower (타워형)' : type === 'linear' ? 'linear slab (판상형)' : type === 'cluster' ? `${buildingCount || 3} separate buildings (클러스터)` : type
    
    const prompt = `You are a world-class architectural visualization artist. Transform this 3D building model into a photorealistic rendering.

═══ ABSOLUTE RULES (VIOLATION = FAILURE) ═══

RULE 1 — FLOOR COUNT: This building has EXACTLY ${floorText} floors. NOT ${parseInt(floorText)+1}. NOT ${parseInt(floorText)+2}. EXACTLY ${floorText} FLOORS.
Count the horizontal slab lines in the 3D model — there are EXACTLY ${floorText} floor slabs. Reproduce EXACTLY ${floorText} floor slabs.
DO NOT add extra floors. DO NOT add rooftop structures. DO NOT add penthouses. DO NOT add mechanical rooms on the roof.
The rooftop must be FLAT with only a simple railing. No structures above the ${floorText}th floor.

RULE 2 — BUILDING SHAPE: The building is ${typeText}. PRESERVE THIS EXACT SHAPE.
Do not change the footprint. Do not add wings. Do not merge wings. Do not make it rectangular if it's L-shaped.
${depthBase64 ? 'The second image is the DEPTH MAP showing the exact building silhouette. Match it PRECISELY.' : ''}

RULE 3 — SCALE: This is a SMALL ${floorText}-story ${units || 5}-unit residential villa, NOT a large apartment complex.
It should look modest and intimate, like a Korean 빌라/다세대주택.

RULE 4 — PRESERVE CAMERA ANGLE AND POSITION exactly as shown.

═══ WHAT TO ADD (enhancement only) ═══
- Warm natural stone facade (베이지/크림 Korean villa style)
- Windows with frames + AC outdoor units on each floor
- Glass balcony railings with potted plants
- Cherry blossom trees (벚꽃) and green landscaping
- Children's playground in the garden area
- Realistic road with lane markings
- Golden hour sky with soft clouds
- Walking paths with stepping stones
- A few people walking (small scale)
- Neighboring buildings in far background (blurred)

═══ FINAL CHECK ═══
Before generating: count the floors in your output. Is it EXACTLY ${floorText}? If not, regenerate.
Building info: ${layoutName || type} · ${floorText}층 ${units || 5}세대 · ${address || '서울'}

Output: ONE photorealistic image only.`

    // ━━━ 이미지 파트 구성 ━━━
    const imgParts: any[] = [
      { inlineData: { mimeType: 'image/png', data: base64 } },
    ]
    if (depthBase64) {
      imgParts.push({ inlineData: { mimeType: 'image/png', data: depthBase64 } })
    }
    imgParts.push({ text: prompt })

    // ━━━ Multi-shot: 2장 동시 생성 ━━━
    console.log('[3D-PHOTO-V2] Generating 2 variants...')
    const [r1, r2] = await Promise.allSettled([
      callGemini(KEY, imgParts),
      callGemini(KEY, imgParts),
    ])
    
    const results = [
      r1.status === 'fulfilled' ? r1.value : null,
      r2.status === 'fulfilled' ? r2.value : null,
    ].filter(r => r?.image)

    if (results.length === 0) {
      return NextResponse.json({ success: false, error: 'Both generations failed' })
    }
    
    if (results.length === 1) {
      console.log('[3D-PHOTO-V2] 1/2 succeeded')
      return NextResponse.json({ success: true, image: results[0]!.image, score: 'N/A (single result)' })
    }

    // ━━━ Auto-Select: Gemini Vision으로 일치도 점수 매기기 ━━━
    console.log('[3D-PHOTO-V2] Scoring 2 variants...')
    const scorePrompt = `You are judging architectural rendering consistency.

The REFERENCE is a 3D model of a ${floorText}-story ${typeText} building with ${units || 5} units.

Score this photorealistic rendering on a scale of 0-100:
- Floor count accuracy (0-40): Does it show EXACTLY ${floorText} floors? (Not ${parseInt(floorText)+1}, not ${parseInt(floorText)+2})
- Shape accuracy (0-30): Does the building footprint match ${typeText}?
- Scale accuracy (0-20): Does it look like a small ${units || 5}-unit villa?
- Overall quality (0-10): Photorealistic quality

Respond with ONLY a JSON object: {"score": NUMBER, "floors_detected": NUMBER, "shape_match": "yes"|"partial"|"no"}
No other text.`

    const scoreResults = await Promise.allSettled(
      results.map(async (r, i) => {
        try {
          const sRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{
                  parts: [
                    { inlineData: { mimeType: 'image/png', data: base64 } },
                    { inlineData: { mimeType: 'image/png', data: r!.image!.replace(/^data:image\/\w+;base64,/, '') } },
                    { text: scorePrompt },
                  ]
                }],
              }),
              signal: AbortSignal.timeout(30000),
            }
          )
          const sData = await sRes.json()
          const sText = sData?.candidates?.[0]?.content?.parts?.[0]?.text || ''
          const jsonMatch = sText.match(/\{[^}]+\}/)
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0])
            console.log(`[3D-PHOTO-V2] Variant ${i+1} score: ${parsed.score}, floors: ${parsed.floors_detected}, shape: ${parsed.shape_match}`)
            return { index: i, ...parsed }
          }
          return { index: i, score: 50 }
        } catch { return { index: i, score: 50 } }
      })
    )

    const scores = scoreResults
      .filter(r => r.status === 'fulfilled')
      .map(r => (r as PromiseFulfilledResult<any>).value)
    
    scores.sort((a, b) => (b.score || 0) - (a.score || 0))
    const bestIdx = scores[0]?.index ?? 0
    const bestScore = scores[0]?.score ?? 'N/A'
    const bestFloors = scores[0]?.floors_detected ?? '?'
    const bestShape = scores[0]?.shape_match ?? '?'
    
    console.log(`[3D-PHOTO-V2] Selected variant ${bestIdx+1} (score: ${bestScore}, floors: ${bestFloors}, shape: ${bestShape})`)

    return NextResponse.json({
      success: true,
      image: results[bestIdx]!.image,
      score: bestScore,
      floorsDetected: bestFloors,
      shapeMatch: bestShape,
      totalVariants: results.length,
    })
  } catch (e: any) {
    console.error('[3D-PHOTO-V2] Error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
