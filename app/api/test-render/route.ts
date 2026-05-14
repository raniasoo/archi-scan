import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export async function GET(req: NextRequest) {
  const s = req.nextUrl.searchParams
  const mode = s.get('mode') || 'full'

  // ━━━ mode=results: 저장된 결과 조회 ━━━
  if (mode === 'results') {
    try {
      const sb = createClient(SB_URL, SB_KEY)
      const { data } = await sb.from('render_tests').select('*').order('created_at', { ascending: false }).limit(20)
      return NextResponse.json({ results: data || [] })
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 })
    }
  }

  // ━━━ mode=batch: 5개 테스트 동시 실행 + Supabase 저장 ━━━
  if (mode === 'batch') {
    if (!GOOGLE_AI_API_KEY) return NextResponse.json({ error: 'API key missing' }, { status: 500 })

    const tests = [
      { type: 'tower', floors: 5, units: 16, siteArea: 660, coverage: 50, buildingCount: 1, addr: '강남구 대치동' },
      { type: 'lshape', floors: 3, units: 8, siteArea: 450, coverage: 55, buildingCount: 1, addr: '마포구 상수동' },
      { type: 'linear', floors: 4, units: 12, siteArea: 800, coverage: 60, buildingCount: 1, addr: '성남시 판교동' },
      { type: 'courtyard', floors: 5, units: 20, siteArea: 1200, coverage: 50, buildingCount: 1, addr: '서초구 반포동' },
      { type: 'tower', floors: 3, units: 4, siteArea: 350, coverage: 60, buildingCount: 1, addr: '용산구 한남동' },
    ]

    const results = []
    for (const t of tests) {
      try {
        const r = await runSingleTest(t)
        results.push(r)
        // Supabase 저장
        try {
          const sb = createClient(SB_URL, SB_KEY)
          await sb.from('render_tests').insert({
            test_input: t,
            analysis: r.analysis,
            match_scores: r.match,
            overall_score: r.overallScore,
            timing_ms: r.timing?.totalMs,
          })
        } catch {}
      } catch (e: any) {
        results.push({ input: t, error: e.message })
      }
    }

    return NextResponse.json({ results, count: results.length })
  }

  // ━━━ mode=full (단건) / mode=prompt ━━━
  const type = s.get('type') || 'tower'
  const floors = parseInt(s.get('floors') || '5')
  const units = parseInt(s.get('units') || '10')
  const siteArea = parseInt(s.get('siteArea') || '660')
  const coverage = parseInt(s.get('coverage') || '50')
  const buildingCount = parseInt(s.get('buildingCount') || '1')
  const addr = s.get('addr') || '서울 강남구'
  const input = { type, floors, units, siteArea, coverage, buildingCount, addr }

  if (mode === 'prompt') {
    const prompt = buildPrompt(input)
    return NextResponse.json({ input, prompt })
  }

  if (!GOOGLE_AI_API_KEY) return NextResponse.json({ error: 'API key missing' }, { status: 500 })

  try {
    const result = await runSingleTest(input)
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

function buildPrompt(input: any) {
  const { type, floors, units, siteArea, coverage, buildingCount } = input
  const footprint = Math.round(siteArea * coverage / 100)
  const eachFP = Math.round(footprint / buildingCount)
  const linRatio = type === 'linear' ? 3.5 : 1.4
  const eachW = Math.round(Math.sqrt(eachFP * linRatio))
  const eachD = Math.round(eachFP / eachW)
  const heightM = Math.round(floors * 3.3)

  const typePrompts: Record<string, string> = {
    tower: `A compact ${floors}-story residential tower. Square footprint ~${eachW}m × ${eachD}m. ${units} units around a central elevator core.`,
    courtyard: `A ${floors}-story U-shaped courtyard building. ${buildingCount} building(s) forming U-shape around a central garden. Each wing ~${eachW}m × ${eachD}m.`,
    lshape: `A ${floors}-story L-shaped (ㄱ자형) building. ${buildingCount} building(s), each with TWO WINGS at 90-degree angle like letter "L".`,
    linear: `A ${floors}-story linear slab building. ${buildingCount} LONG HORIZONTAL building(s), each ~${eachW}m wide × ${eachD}m deep.`,
    cluster: `A cluster of ${buildingCount} varied ${floors}-story buildings on a ${siteArea}㎡ site. ${units} units total.`,
  }

  return `Photorealistic Korean residential building rendering.
${typePrompts[type] || typePrompts.tower}
EXACTLY ${floors} stories, ${heightM}m tall. ${units} units total.
${buildingCount > 1 ? `${buildingCount} separate buildings.` : 'Single building.'}
Modern Korean architectural style. Warm afternoon lighting. Eye-level perspective.
DO NOT make the building taller than ${floors} stories.
${type === 'lshape' ? 'CRITICAL: Building MUST be L-shaped, NOT rectangular.' : ''}
${type === 'linear' ? 'CRITICAL: Building MUST be a long horizontal bar, NOT a tower.' : ''}
${type === 'courtyard' ? 'CRITICAL: Building MUST form U-shape around visible garden.' : ''}`
}

async function runSingleTest(input: any) {
  const startTime = Date.now()
  const prompt = buildPrompt(input)
  const { type, floors, buildingCount } = input

  // 1. Gemini 이미지 생성
  console.log(`[TEST] Generating: ${type} ${floors}F...`)
  const genRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GOOGLE_AI_API_KEY}`,
    {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
      }),
      signal: AbortSignal.timeout(90000),
    }
  )

  if (!genRes.ok) {
    const errText = await genRes.text()
    throw new Error(`Gemini gen failed: ${genRes.status} ${errText.slice(0, 200)}`)
  }

  const genData = await genRes.json()
  let imageBase64 = ''
  for (const part of genData.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData?.mimeType?.startsWith('image/')) imageBase64 = part.inlineData.data
  }
  if (!imageBase64) throw new Error('No image generated')

  const renderTime = Date.now() - startTime
  console.log(`[TEST] Image generated in ${renderTime}ms, analyzing...`)

  // 2. Gemini Vision 역분석
  const analysisPrompt = `Analyze this building rendering. Respond ONLY in JSON:
{"floor_count":5,"building_shape":"tower","building_count":1,"has_garden":false,"height_impression":"mid-rise","confidence":80}
Options for building_shape: "tower","lshape","linear","courtyard","cluster","rectangular"
Options for height_impression: "low-rise"(1-3F), "mid-rise"(4-7F), "high-rise"(8+F)
Count floors CAREFULLY. Look at the actual number of floor lines/windows.`

  const analysisRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_AI_API_KEY}`,
    {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [
          { text: analysisPrompt },
          { inlineData: { mimeType: 'image/png', data: imageBase64 } },
        ] }],
        generationConfig: { temperature: 0.1 },
      }),
      signal: AbortSignal.timeout(30000),
    }
  )

  let analysis: any = null
  if (analysisRes.ok) {
    const d = await analysisRes.json()
    const rawText = d.candidates?.[0]?.content?.parts?.[0]?.text || ''
    try { analysis = JSON.parse(rawText.replace(/```json|```/g, '').trim()) } catch { analysis = { raw: rawText.slice(0, 300), parseError: true } }
  }

  const totalTime = Date.now() - startTime

  // 3. 일치율 계산
  const match: Record<string, any> = {}
  if (analysis && !analysis.parseError) {
    const floorDiff = Math.abs((analysis.floor_count || 0) - floors)
    match.floors = { input: floors, output: analysis.floor_count, match: floorDiff === 0, score: floorDiff === 0 ? 100 : floorDiff === 1 ? 70 : floorDiff <= 2 ? 40 : 10 }

    const shapeMap: Record<string, string[]> = { tower: ['tower', 'rectangular'], courtyard: ['courtyard'], lshape: ['lshape'], linear: ['linear', 'rectangular'], cluster: ['cluster'] }
    const expected = shapeMap[type] || [type]
    const ok = expected.includes(analysis.building_shape)
    match.shape = { input: type, output: analysis.building_shape, match: ok, score: ok ? 100 : 30 }

    const bDiff = Math.abs((analysis.building_count || 1) - buildingCount)
    match.buildingCount = { input: buildingCount, output: analysis.building_count, match: bDiff === 0, score: bDiff === 0 ? 100 : bDiff === 1 ? 60 : 20 }

    const expH = floors <= 3 ? 'low-rise' : floors <= 7 ? 'mid-rise' : 'high-rise'
    match.height = { input: expH, output: analysis.height_impression, match: analysis.height_impression === expH, score: analysis.height_impression === expH ? 100 : 30 }
  }

  const scores = Object.values(match).map((m: any) => m.score).filter((s: any) => typeof s === 'number')
  const overallScore = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0

  return { input, analysis, match, overallScore, timing: { renderMs: renderTime, totalMs: totalTime }, imageKB: Math.round(imageBase64.length / 1024) }
}
