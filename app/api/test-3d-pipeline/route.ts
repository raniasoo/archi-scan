import { NextRequest, NextResponse } from 'next/server'
import { getBuildingGeometry } from '@/lib/building-geometry'

// GET /api/test-3d-pipeline?idx=0 — 서버 내부에서 전체 파이프라인 테스트
// idx: 0~9 (10개 샘플 중 하나)

const SAMPLES = [
  { addr:"평창동",  t:'courtyard', sa:593,  cv:50, fl:2, u:1,  bc:1 },
  { addr:"역삼동",  t:'tower',     sa:3200, cv:50, fl:12,u:120,bc:1 },
  { addr:"상수동",  t:'lshape',    sa:450,  cv:55, fl:3, u:8,  bc:1 },
  { addr:"반포동",  t:'courtyard', sa:1200, cv:50, fl:5, u:20, bc:1 },
  { addr:"성수동",  t:'tower',     sa:2500, cv:55, fl:5, u:72, bc:3 },
  { addr:"한남동",  t:'tower',     sa:350,  cv:50, fl:3, u:4,  bc:1 },
  { addr:"판교동",  t:'linear',    sa:800,  cv:55, fl:4, u:12, bc:1 },
  { addr:"잠실동",  t:'tower',     sa:5000, cv:55, fl:10,u:200,bc:1 },
  { addr:"삼청동",  t:'tower',     sa:280,  cv:50, fl:2, u:1,  bc:1 },
  { addr:"여의도",  t:'tower',     sa:1800, cv:55, fl:7, u:52, bc:2 },
]

export async function GET(req: NextRequest) {
  const idx = parseInt(req.nextUrl.searchParams.get('idx') || '0')
  const s = SAMPLES[Math.min(idx, 9)]
  const start = Date.now()
  
  try {
    // ① 건물 치수 검증
    const geo = getBuildingGeometry({
      type: s.t, coverage: s.cv, siteArea: s.sa,
      floors: s.fl, buildingCount: s.bc,
    })
    const layoutFP = s.sa * s.cv / 100
    const geoMatch = Math.round(Math.min(geo.totalFootprint/layoutFP, layoutFP/geo.totalFootprint) * 100)
    
    // ② 3d-to-photo API 내부 호출
    const KEY = process.env.GOOGLE_AI_API_KEY
    if (!KEY) return NextResponse.json({ error: 'API key not set', addr: s.addr })
    
    const fl = `${s.fl}`
    const typeText = s.t === 'lshape' ? 'L-shaped' : s.t === 'courtyard' ? 'U-shaped' : s.t === 'tower' ? 'tower' : s.t === 'linear' ? 'slab' : 'cluster'
    
    const prompt = `Generate a photorealistic architectural rendering of a ${fl}-story ${typeText} Korean residential building with ${s.u} units.
CRITICAL: EXACTLY ${fl} floors. NOT ${parseInt(fl)+1}. The building has EXACTLY ${fl} floor slabs.
DO NOT add rooftop structures. Flat roof only.
${s.u <= 2 ? 'This is a SINGLE-FAMILY house, NOT an apartment.' : `Small villa with ${s.u} units.`}
Style: modern Korean villa, warm stone, glass balconies, cherry blossoms, golden hour.
Output: ONE photorealistic image.`

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
        }),
        signal: AbortSignal.timeout(90000),
      }
    )
    
    if (!geminiRes.ok) {
      return NextResponse.json({ addr: s.addr, error: `Gemini ${geminiRes.status}`, geoMatch })
    }
    
    const data = await geminiRes.json()
    const parts = data?.candidates?.[0]?.content?.parts || []
    let imageB64 = '', textRes = ''
    for (const p of parts) {
      if (p.inlineData?.data) imageB64 = p.inlineData.data
      if (p.text) textRes = p.text
    }
    
    // ③ 이미지가 있으면 Gemini Vision으로 점수 매기기
    let score = 'N/A', floorsDetected = '?', shapeMatch = '?'
    if (imageB64) {
      try {
        const scoreRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [
                { inlineData: { mimeType: 'image/png', data: imageB64 } },
                { text: `This should be a ${fl}-story ${typeText} building with ${s.u} units. Score 0-100. Respond ONLY: {"score":N,"floors_detected":N,"shape_match":"yes"|"partial"|"no"}` }
              ]}],
            }),
            signal: AbortSignal.timeout(30000),
          }
        )
        const sData = await scoreRes.json()
        const sText = sData?.candidates?.[0]?.content?.parts?.[0]?.text || ''
        const m = sText.match(/\{[^}]+\}/)
        if (m) {
          const p = JSON.parse(m[0])
          score = p.score; floorsDetected = p.floors_detected; shapeMatch = p.shape_match
        }
      } catch {}
    }
    
    return NextResponse.json({
      addr: s.addr, type: s.t, floors: s.fl, units: s.u,
      geoMatch,
      hasImage: !!imageB64,
      score, floorsDetected, shapeMatch,
      duration: Math.round((Date.now() - start) / 1000),
      buildingHeight: geo.buildingHeight,
      totalFootprint: Math.round(geo.totalFootprint),
    })
  } catch (e: any) {
    return NextResponse.json({ addr: s.addr, error: e.message, duration: Math.round((Date.now() - start) / 1000) })
  }
}
