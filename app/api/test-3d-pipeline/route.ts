import { NextRequest, NextResponse } from 'next/server'
import { getBuildingGeometry } from '@/lib/building-geometry'

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
  const mode = req.nextUrl.searchParams.get('mode') || 'all'
  const idx = parseInt(req.nextUrl.searchParams.get('idx') || '-1')
  
  // mode=geo: 10개 전체 치수 검증 (즉시 응답)
  if (mode === 'geo' || idx < 0) {
    const results = SAMPLES.map((s, i) => {
      const geo = getBuildingGeometry({ type: s.t, coverage: s.cv, siteArea: s.sa, floors: s.fl, buildingCount: s.bc })
      const layoutFP = s.sa * s.cv / 100
      const match = Math.round(Math.min(geo.totalFootprint/layoutFP, layoutFP/geo.totalFootprint) * 100)
      const typeKR: Record<string,string> = { tower:'타워', linear:'판상', lshape:'ㄱ자', courtyard:'중정', cluster:'클러스터' }
      return {
        idx: i, addr: s.addr, type: typeKR[s.t] || s.t, floors: s.fl, units: s.u,
        targetFP: Math.round(layoutFP), actualFP: Math.round(geo.totalFootprint),
        match, height: geo.buildingHeight.toFixed(1) + 'm',
        blocks: geo.blocks.length, wingThickness: geo.wingThickness ? (geo.wingThickness * geo.siteWidth).toFixed(1) + 'm' : null,
      }
    })
    const avgMatch = Math.round(results.reduce((s,r) => s+r.match, 0) / results.length)
    return NextResponse.json({ mode: 'geometry', count: 10, avgMatch, results })
  }
  
  // mode=render: 단일 AI 렌더링 테스트 (60~90초)
  const s = SAMPLES[Math.min(idx, 9)]
  const KEY = process.env.GOOGLE_AI_API_KEY
  if (!KEY) return NextResponse.json({ error: 'No API key' })
  
  const geo = getBuildingGeometry({ type: s.t, coverage: s.cv, siteArea: s.sa, floors: s.fl, buildingCount: s.bc })
  const layoutFP = s.sa * s.cv / 100
  const geoMatch = Math.round(Math.min(geo.totalFootprint/layoutFP, layoutFP/geo.totalFootprint) * 100)
  const typeText = s.t === 'lshape' ? 'L-shaped' : s.t === 'courtyard' ? 'U-shaped' : s.t
  
  try {
    const prompt = `Generate a photorealistic ${s.fl}-story ${typeText} Korean building, ${s.u} units. EXACTLY ${s.fl} floors, NO rooftop structures. ${s.u<=2?'Single-family house.':'Small villa.'} Modern style, cherry blossoms, golden hour.`
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ["TEXT","IMAGE"] } }),
      signal: AbortSignal.timeout(90000),
    })
    const data = await res.json()
    const parts = data?.candidates?.[0]?.content?.parts || []
    const hasImage = parts.some((p: any) => p.inlineData?.data)
    
    let score = 'N/A', floorsDetected = '?', shapeMatch = '?'
    if (hasImage) {
      const imgData = parts.find((p: any) => p.inlineData?.data)?.inlineData?.data
      const sr = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${KEY}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [
          { inlineData: { mimeType: 'image/png', data: imgData } },
          { text: `${s.fl}-story ${typeText}, ${s.u} units. Score 0-100. ONLY: {"score":N,"floors_detected":N,"shape_match":"yes"|"partial"|"no"}` }
        ]}] }),
        signal: AbortSignal.timeout(30000),
      })
      const sd = await sr.json()
      const st = sd?.candidates?.[0]?.content?.parts?.[0]?.text || ''
      const m = st.match(/\{[^}]+\}/)
      if (m) { const p = JSON.parse(m[0]); score = p.score; floorsDetected = p.floors_detected; shapeMatch = p.shape_match }
    }
    
    console.log(`[TEST] ${s.addr}: geo=${geoMatch}% img=${hasImage} score=${score} floors=${floorsDetected} shape=${shapeMatch}`)
    return NextResponse.json({ addr: s.addr, type: s.t, floors: s.fl, units: s.u, geoMatch, hasImage, score, floorsDetected, shapeMatch })
  } catch (e: any) {
    return NextResponse.json({ addr: s.addr, error: e.message, geoMatch })
  }
}
