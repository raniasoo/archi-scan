import { NextRequest, NextResponse } from 'next/server'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3D-First Pipeline v4 — 5방향 캡처 + Depth Map + Multi-shot Auto-Select
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const GEMINI_IMG = (key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${key}`
const GEMINI_TXT = (key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`

async function callGemini(url: string, parts: any[]) {
  const isImg = url.includes('flash-image')
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      ...(isImg ? { generationConfig: { responseModalities: ["TEXT", "IMAGE"] } } : {}),
    }),
    signal: AbortSignal.timeout(120000),
  })
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = await res.json()
  const rParts = data?.candidates?.[0]?.content?.parts || []
  let image = '', text = ''
  for (const p of rParts) {
    if (p.inlineData?.data) image = `data:${p.inlineData.mimeType || 'image/png'};base64,${p.inlineData.data}`
    if (p.text) text = p.text
  }
  return { image, text }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { multiAngle, layoutName, floors, units, type, buildingCount, address } = body
    
    const KEY = process.env.GOOGLE_AI_API_KEY
    if (!KEY) return NextResponse.json({ error: 'API key not set' }, { status: 500 })

    // 5방향 이미지 추출
    const angles: { angle: string; image: string }[] = multiAngle || []
    if (angles.length === 0 && body.screenshot) {
      angles.push({ angle: 'bird-eye', image: body.screenshot })
      if (body.depthMap) angles.push({ angle: 'depth-map', image: body.depthMap })
    }
    
    if (angles.length === 0) return NextResponse.json({ error: 'No images' }, { status: 400 })
    
    const fl = `${floors || 2}`
    const typeText = type === 'lshape' ? 'L-shaped (ㄱ자형)' : type === 'courtyard' ? 'U-shaped (ㄷ자형)' : type === 'tower' ? 'tower' : type === 'linear' ? 'linear slab' : `${buildingCount || 1} buildings (cluster)`

    // ━━━ 5방향 설명 + 극강 프롬프트 ━━━
    const angleDesc = angles.map(a => {
      if (a.angle === 'bird-eye') return 'Image: BIRD-EYE VIEW (45° aerial) — shows overall building shape and site context'
      if (a.angle === 'front') return 'Image: FRONT VIEW — shows EXACT floor count. Count the horizontal slabs carefully.'
      if (a.angle === 'side') return 'Image: SIDE VIEW — shows building depth and height profile'
      if (a.angle === 'top-down') return 'Image: TOP-DOWN VIEW — shows EXACT building footprint shape (L/U/rectangle). This is the ground truth for the shape.'
      if (a.angle === 'depth-map') return 'Image: DEPTH MAP (white=building, black=background) — the EXACT building silhouette. Match this PRECISELY.'
      return `Image: ${a.angle}`
    }).join('\n')

    const prompt = `You are a world-class architectural visualization artist.

I am providing ${angles.length} REFERENCE IMAGES of the SAME building from different angles:

${angleDesc}

═══ ABSOLUTE RULES ═══

FLOOR COUNT: EXACTLY ${fl} floors. The FRONT VIEW shows exactly ${fl} horizontal floor slabs.
- NOT ${parseInt(fl)+1} floors. NOT ${parseInt(fl)+2} floors.
- NO rooftop structures. NO penthouses. NO mechanical rooms above the roof.
- The roof is FLAT with only a simple railing.

BUILDING SHAPE: ${typeText}. Look at the TOP-DOWN VIEW — it shows the EXACT footprint.
- Reproduce this EXACT footprint shape. Do not simplify. Do not add wings.

SCALE: This is a SMALL ${fl}-story ${units || 5}-unit Korean residential villa (빌라/다세대).
- It must look intimate and modest, NOT like a large apartment complex.

CAMERA: Generate from the BIRD-EYE VIEW angle (45° aerial, same as the first image).

═══ ENHANCEMENTS (add photorealism only) ═══
- Warm natural stone facade (베이지/크림 톤)
- Windows with frames, AC outdoor units per floor
- Glass balcony railings with plants
- Cherry blossom trees (벚꽃) + landscaped garden
- Children's playground in open areas
- Realistic road, sidewalk, street lights
- Golden hour sky with soft clouds
- Neighboring buildings in blurred background
- A few people walking

═══ FINAL SELF-CHECK ═══
Count floors in your output: is it EXACTLY ${fl}? 
Check footprint shape: does it match the TOP-DOWN VIEW?
If not, regenerate.

Building: ${layoutName || type} · ${fl}층 ${units || 5}세대
Output: ONE photorealistic image.`

    // ━━━ 이미지 파트 구성 (최대 5장) ━━━
    const imgParts: any[] = []
    for (const a of angles) {
      const b64 = a.image.replace(/^data:image\/\w+;base64,/, '')
      imgParts.push({ inlineData: { mimeType: 'image/png', data: b64 } })
    }
    imgParts.push({ text: prompt })

    // ━━━ Multi-shot: 2장 동시 생성 ━━━
    console.log(`[3D-PHOTO-V4] ${angles.length} angles, generating 2 variants...`)
    const [r1, r2] = await Promise.allSettled([
      callGemini(GEMINI_IMG(KEY), imgParts),
      callGemini(GEMINI_IMG(KEY), imgParts),
    ])
    
    const results = [
      r1.status === 'fulfilled' ? r1.value : null,
      r2.status === 'fulfilled' ? r2.value : null,
    ].filter(r => r?.image)

    if (results.length === 0) {
      const err1 = r1.status === 'rejected' ? r1.reason?.message : ''
      const err2 = r2.status === 'rejected' ? r2.reason?.message : ''
      return NextResponse.json({ success: false, error: `Both failed: ${err1} / ${err2}` })
    }
    
    if (results.length === 1) {
      return NextResponse.json({ success: true, image: results[0]!.image, score: 'N/A', angles: angles.length })
    }

    // ━━━ Auto-Select: Gemini Vision 점수 매기기 ━━━
    const birdEye = angles.find(a => a.angle === 'bird-eye')
    const topDown = angles.find(a => a.angle === 'top-down')
    const refB64 = (birdEye || angles[0]).image.replace(/^data:image\/\w+;base64,/, '')
    
    const scorePrompt = `Score this architectural rendering's consistency with the reference 3D model.

Reference: ${fl}-story ${typeText} building with ${units || 5} units.
${topDown ? 'The top-down view shows the EXACT footprint shape.' : ''}

Score 0-100:
- Floor count (0-40): EXACTLY ${fl} floors?
- Shape (0-30): Matches ${typeText}?
- Scale (0-20): Small ${units || 5}-unit villa?
- Quality (0-10): Photorealistic?

Respond ONLY: {"score":N,"floors_detected":N,"shape_match":"yes"|"partial"|"no"}`

    const scoreResults = await Promise.allSettled(
      results.map(async (r, i) => {
        try {
          const scoreParts: any[] = [
            { inlineData: { mimeType: 'image/png', data: refB64 } },
          ]
          if (topDown) {
            scoreParts.push({ inlineData: { mimeType: 'image/png', data: topDown.image.replace(/^data:image\/\w+;base64,/, '') } })
          }
          scoreParts.push({ inlineData: { mimeType: 'image/png', data: r!.image!.replace(/^data:image\/\w+;base64,/, '') } })
          scoreParts.push({ text: scorePrompt })
          
          const sr = await callGemini(GEMINI_TXT(KEY), scoreParts)
          const m = sr.text.match(/\{[^}]+\}/)
          if (m) {
            const p = JSON.parse(m[0])
            console.log(`[V4] Variant ${i+1}: score=${p.score}, floors=${p.floors_detected}, shape=${p.shape_match}`)
            return { index: i, ...p }
          }
          return { index: i, score: 50 }
        } catch { return { index: i, score: 50 } }
      })
    )

    const scores = scoreResults
      .filter(r => r.status === 'fulfilled')
      .map(r => (r as PromiseFulfilledResult<any>).value)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
    
    const best = scores[0] || { index: 0, score: 'N/A' }
    console.log(`[V4] Selected variant ${best.index+1} (score: ${best.score})`)

    return NextResponse.json({
      success: true,
      image: results[best.index]!.image,
      score: best.score,
      floorsDetected: best.floors_detected,
      shapeMatch: best.shape_match,
      totalVariants: results.length,
      anglesUsed: angles.length,
    })
  } catch (e: any) {
    console.error('[3D-PHOTO-V4] Error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
