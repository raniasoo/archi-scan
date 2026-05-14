import { NextRequest, NextResponse } from 'next/server'

// Three.js 스크린샷 → Gemini 포토리얼 변환 API
// 3D 형태를 100% 보존하면서 재질/조경/하늘만 사실적으로 변환

export async function POST(req: NextRequest) {
  try {
    const { screenshot, layoutName, floors, units, type, address, angle } = await req.json()
    
    if (!screenshot) {
      return NextResponse.json({ error: 'screenshot required' }, { status: 400 })
    }
    
    const GOOGLE_API_KEY = process.env.GOOGLE_AI_API_KEY
    if (!GOOGLE_API_KEY) {
      return NextResponse.json({ error: 'GOOGLE_AI_API_KEY not set' }, { status: 500 })
    }
    
    // 3D 스크린샷에서 base64 데이터 추출
    const base64Data = screenshot.replace(/^data:image\/(png|jpeg|webp);base64,/, '')
    
    const prompt = `You are an expert architectural visualization artist. Convert this 3D building model into a photorealistic architectural rendering.

CRITICAL RULES — DO NOT VIOLATE:
1. PRESERVE THE EXACT BUILDING SHAPE — same footprint, same L/U/rectangular form
2. PRESERVE THE EXACT FLOOR COUNT — this building has EXACTLY ${floors || 3} floors. Do NOT add or remove floors.
3. PRESERVE THE EXACT BUILDING POSITION on the site
4. PRESERVE THE EXACT NUMBER OF BUILDINGS shown

WHAT TO ADD (photorealism enhancements only):
- Replace flat grey walls with warm natural stone (Korean apartment style, 베이지/크림 톤)
- Add realistic windows with frames, curtains, AC units on every floor
- Add balconies with glass railings and potted plants
- Replace sphere trees with realistic cherry blossoms (벚꽃) and green trees
- Add realistic grass, flower beds, walking paths with stepping stones
- Replace flat ground with realistic terrain
- Add realistic sky with soft clouds (golden hour lighting)
- Add realistic shadows and ambient occlusion
- Add a children's playground in open areas
- Add realistic road with lane markings, sidewalk, street lights
- Add neighboring buildings in the background (lower opacity)
- Add people (small scale, walking)

Building info: ${layoutName || type} · ${floors}층 ${units}세대
Location: ${address || '서울특별시'}
Camera angle: ${angle || 'bird-eye 45° aerial view'}

The output must look like a professional architectural competition rendering (현상설계 투시도 수준).
Output: ONE high-quality photorealistic image only.`

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inlineData: { mimeType: 'image/png', data: base64Data } },
              { text: prompt },
            ]
          }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
          },
        }),
        signal: AbortSignal.timeout(120000),
      }
    )
    
    if (!geminiRes.ok) {
      const errText = await geminiRes.text()
      console.error('[3D-TO-PHOTO] Gemini error:', geminiRes.status, errText.slice(0, 300))
      return NextResponse.json({ error: `Gemini ${geminiRes.status}`, detail: errText.slice(0, 300) }, { status: 500 })
    }
    
    const data = await geminiRes.json()
    const parts = data?.candidates?.[0]?.content?.parts || []
    
    let imageBase64 = ''
    let imageMimeType = 'image/png'
    let textResponse = ''
    
    for (const part of parts) {
      if (part.inlineData?.data) {
        imageBase64 = part.inlineData.data
        imageMimeType = part.inlineData.mimeType || 'image/png'
      }
      if (part.text) textResponse = part.text
    }
    
    if (!imageBase64) {
      return NextResponse.json({ 
        success: false, 
        error: 'Gemini did not return an image', 
        textResponse: textResponse.slice(0, 500) 
      })
    }
    
    return NextResponse.json({
      success: true,
      image: `data:${imageMimeType};base64,${imageBase64}`,
      textResponse: textResponse.slice(0, 200),
    })
  } catch (e: any) {
    console.error('[3D-TO-PHOTO] Error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
