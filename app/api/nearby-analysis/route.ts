import { NextRequest, NextResponse } from 'next/server'

const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY

// ━━━ Overpass API로 주변 건물 조회 ━━━
async function fetchNearbyBuildings(lat: number, lng: number, radius: number = 250) {
  try {
    // 건물은 250m, 도로/편의시설은 150m로 범위 축소 → 응답 속도 개선
    const query = `[out:json][timeout:10];
(
  way(around:${radius},${lat},${lng})[building];
  way(around:150,${lat},${lng})[highway~"^(primary|secondary|tertiary|residential)$"];
  way(around:150,${lat},${lng})[amenity];
  node(around:150,${lat},${lng})[amenity];
  node(around:150,${lat},${lng})[shop];
);out center tags;`

    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST', body: query,
      headers: { 'Content-Type': 'text/plain', 'User-Agent': 'ArchiScan/2.0' },
      signal: AbortSignal.timeout(12000),
    })
    const data = await res.json()
    return data?.elements || []
  } catch (e) {
    console.error('[NEARBY] Overpass error:', e)
    return []
  }
}

// ━━━ 주변 요소 분류 ━━━
function classifyElements(elements: any[], lat: number, lng: number) {
  const LM = Math.cos(lat * Math.PI / 180) * 111319
  const buildings: any[] = []
  const amenities: any[] = []
  const roads: any[] = []
  const shops: any[] = []

  for (const el of elements) {
    const cLat = el.center?.lat || el.lat
    const cLng = el.center?.lon || el.lon
    if (!cLat || !cLng) continue
    const dx = (cLng - lng) * LM
    const dy = (cLat - lat) * 111319
    const dist = Math.round(Math.sqrt(dx * dx + dy * dy))
    const bearing = Math.round((Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360)
    const dirs = ['북', '북동', '동', '남동', '남', '남서', '서', '북서']
    const dir = dirs[Math.round(bearing / 45) % 8]

    if (el.tags?.building) {
      const floors = parseInt(el.tags['building:levels'] || '0') || 0
      const height = parseFloat(el.tags['height'] || '0') || (floors > 0 ? floors * 3.3 : 0)
      const use = el.tags['building'] || ''
      const name = el.tags['name'] || ''
      const addr = el.tags['addr:full'] || el.tags['addr:street'] || ''
      buildings.push({ name, use, floors, height: Math.round(height), dist, dir, addr })
    } else if (el.tags?.amenity) {
      amenities.push({ name: el.tags.name || el.tags.amenity, type: el.tags.amenity, dist, dir })
    } else if (el.tags?.shop) {
      shops.push({ name: el.tags.name || el.tags.shop, type: el.tags.shop, dist, dir })
    } else if (el.tags?.highway) {
      roads.push({ name: el.tags.name || el.tags.highway, type: el.tags.highway, dist, dir })
    }
  }

  buildings.sort((a, b) => a.dist - b.dist)
  amenities.sort((a, b) => a.dist - b.dist)
  return { buildings: buildings.slice(0, 30), amenities: amenities.slice(0, 15), roads: roads.slice(0, 10), shops: shops.slice(0, 10) }
}

// ━━━ 건물 용도 한국어 변환 ━━━
function translateBuildingUse(use: string): string {
  const map: Record<string, string> = {
    'apartments': '공동주택', 'residential': '주거', 'commercial': '상업',
    'retail': '판매시설', 'office': '업무시설', 'industrial': '공장',
    'house': '단독주택', 'detached': '단독주택', 'yes': '건물',
    'church': '교회', 'school': '학교', 'hospital': '병원',
    'hotel': '호텔', 'warehouse': '창고', 'garage': '차고',
    'public': '공공시설', 'civic': '공공시설', 'university': '대학',
  }
  return map[use] || use
}

// ━━━ 주변 통계 요약 ━━━
function summarizeContext(classified: ReturnType<typeof classifyElements>) {
  const { buildings, amenities, roads, shops } = classified
  const residential = buildings.filter(b => ['apartments', 'residential', 'house', 'detached'].includes(b.use))
  const commercial = buildings.filter(b => ['commercial', 'retail', 'office'].includes(b.use))
  const maxFloors = buildings.reduce((m, b) => Math.max(m, b.floors), 0)
  const avgFloors = buildings.filter(b => b.floors > 0).length > 0
    ? Math.round(buildings.filter(b => b.floors > 0).reduce((s, b) => s + b.floors, 0) / buildings.filter(b => b.floors > 0).length * 10) / 10
    : 0
  const maxHeight = buildings.reduce((m, b) => Math.max(m, b.height), 0)

  return {
    totalBuildings: buildings.length,
    residentialCount: residential.length,
    commercialCount: commercial.length,
    maxFloors, avgFloors, maxHeight,
    amenityTypes: [...new Set(amenities.map(a => a.type))],
    mainRoads: roads.filter(r => ['primary', 'secondary', 'tertiary'].includes(r.type)).map(r => r.name).filter(Boolean),
    shopTypes: [...new Set(shops.map(s => s.type))],
    nearestBuilding: buildings[0] || null,
    highRiseCount: buildings.filter(b => b.floors >= 10).length,
    lowRiseCount: buildings.filter(b => b.floors > 0 && b.floors < 5).length,
    midRiseCount: buildings.filter(b => b.floors >= 5 && b.floors < 10).length,
  }
}

// ━━━ Gemini 분석 호출 ━━━
async function callGeminiAnalysis(prompt: string): Promise<string> {
  if (!GOOGLE_AI_API_KEY) return '(AI 분석 키가 설정되지 않았습니다)'

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { 
            temperature: 0.4, 
            maxOutputTokens: 1500,
          },
        }),
        signal: AbortSignal.timeout(25000),
      }
    )
    const data = await res.json()
    
    if (data?.error) {
      console.error('[NEARBY] Gemini API error:', JSON.stringify(data.error).slice(0, 200))
      return '(Gemini API 에러: ' + (data.error.message || 'unknown') + ')'
    }
    
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      console.error('[NEARBY] Gemini empty response:', JSON.stringify(data).slice(0, 300))
      return '(빈 응답)'
    }
    
    console.log('[NEARBY] Gemini response length:', text.length)
    return text
  } catch (e: any) {
    console.error('[NEARBY] Gemini error:', e.message)
    return '(AI 분석 호출 실패: ' + e.message + ')'
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { lat, lng, address, buildingType, floors, units, siteArea, gfa, strategy } = body

    if (!lat || !lng) {
      return NextResponse.json({ error: '좌표가 필요합니다' }, { status: 400 })
    }

    console.log(`[NEARBY] 분석 시작: ${address} (${lat},${lng})`)

    // 1. 주변 데이터 수집
    const elements = await fetchNearbyBuildings(lat, lng, 300)
    const classified = classifyElements(elements, lat, lng)
    const summary = summarizeContext(classified)

    console.log(`[NEARBY] 주변 건물 ${summary.totalBuildings}개, 편의시설 ${classified.amenities.length}개`)

    // 2. 주변 건물 목록 텍스트
    const buildingList = classified.buildings.slice(0, 15).map(b =>
      `- ${b.dir}쪽 ${b.dist}m: ${translateBuildingUse(b.use)}${b.name ? ` (${b.name})` : ''} ${b.floors > 0 ? `${b.floors}층` : ''} ${b.height > 0 ? `높이${b.height}m` : ''}`
    ).join('\n')

    const amenityList = classified.amenities.slice(0, 10).map(a =>
      `- ${a.dir}쪽 ${a.dist}m: ${a.name || a.type}`
    ).join('\n')

    const roadList = classified.roads.slice(0, 5).map(r =>
      `- ${r.dir}쪽: ${r.name || r.type}`
    ).join('\n')

    // 3. Gemini 분석 프롬프트
    const analysisPrompt = `당신은 한국 부동산 개발 전문 컨설턴트입니다.
아래 대상지 정보와 주변 현황을 분석하여 개발사업 사전검토에 필요한 주변 프로젝트 분석을 JSON 형식으로 작성하세요.

[대상지 정보]
- 주소: ${address}
- 좌표: ${lat}, ${lng}
- 대지면적: ${siteArea || '미정'}㎡
- 계획 배치: ${buildingType || '미정'}
- 계획 층수: ${floors || '미정'}층
- 계획 세대수: ${units || '미정'}세대
- 연면적: ${gfa || '미정'}㎡
- 전략: ${strategy === 'profitability' ? '수익 극대화' : strategy === 'quality' ? '설계 품질' : '균형'}

[주변 건물 현황 (반경 300m)]
건물 총 ${summary.totalBuildings}개 (주거 ${summary.residentialCount}, 상업 ${summary.commercialCount})
평균 층수: ${summary.avgFloors}층, 최고 층수: ${summary.maxFloors}층
고층(10F+): ${summary.highRiseCount}개, 중층(5-9F): ${summary.midRiseCount}개, 저층(1-4F): ${summary.lowRiseCount}개

${buildingList}

[주변 편의시설]
${amenityList || '정보 없음'}

[도로]
${roadList || '정보 없음'}

다음 JSON 형식으로만 응답하세요. 마크다운 코드블록을 사용하지 마세요. 문자열 값 안에 줄바꿈이나 이스케이프 문자를 넣지 마세요. 순수 JSON만 출력하세요:
{
  "marketPosition": "이 지역의 부동산 시장 포지셔닝 분석 (2-3문장)",
  "competitiveAdvantage": "본 프로젝트의 주변 대비 경쟁 우위 요소 (2-3문장)",
  "risks": ["리스크 1", "리스크 2", "리스크 3"],
  "opportunities": ["기회 1", "기회 2", "기회 3"],
  "comparableProjects": [
    {"name": "주변 비교 대상 1", "type": "유형", "floors": 층수, "distance": 거리m, "relevance": "관련성 설명"},
    {"name": "주변 비교 대상 2", "type": "유형", "floors": 층수, "distance": 거리m, "relevance": "관련성 설명"},
    {"name": "주변 비교 대상 3", "type": "유형", "floors": 층수, "distance": 거리m, "relevance": "관련성 설명"}
  ],
  "recommendation": "종합 제안 (3-4문장, 구체적인 개발 전략 포함)",
  "priceEstimate": "주변 시세 및 분양가 추정 (있으면 구체적 금액, 없으면 추정 근거)",
  "neighborhoodScore": {
    "transportation": 1-10점,
    "education": 1-10점,
    "commercial": 1-10점,
    "greenSpace": 1-10점,
    "development": 1-10점
  }
}`

    const rawAnalysis = await callGeminiAnalysis(analysisPrompt)

    // 4. JSON 파싱 (다중 시도)
    let analysis: any = null
    const parseAttempts = [
      // 시도 1: 코드블록 제거
      () => JSON.parse(rawAnalysis.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()),
      // 시도 2: 첫 { ~ 마지막 } 추출
      () => {
        const start = rawAnalysis.indexOf('{')
        const end = rawAnalysis.lastIndexOf('}')
        if (start >= 0 && end > start) return JSON.parse(rawAnalysis.slice(start, end + 1))
        throw new Error('no braces')
      },
      // 시도 3: 이중 이스케이프 제거 후 재시도
      () => {
        let cleaned = rawAnalysis.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
        // 이중 이스케이프된 JSON 문자열 복구
        cleaned = cleaned.replace(/\\n/g, ' ').replace(/\\"/g, '"')
        const start = cleaned.indexOf('{')
        const end = cleaned.lastIndexOf('}')
        if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1))
        throw new Error('no braces after clean')
      },
    ]

    for (const attempt of parseAttempts) {
      try {
        analysis = attempt()
        if (analysis && analysis.marketPosition) break
      } catch { /* try next */ }
    }

    if (!analysis || !analysis.marketPosition) {
      console.error('[NEARBY] All parse attempts failed, using fallback')
      // 원문에서 핵심 정보 추출 시도
      const rawText = rawAnalysis.replace(/```json\s*/g, '').replace(/```\s*/g, '').replace(/\\n/g, ' ').replace(/\\"/g, '"').trim()
      analysis = {
        marketPosition: rawText.slice(0, 300),
        competitiveAdvantage: '',
        risks: ['AI 분석 결과를 구조화하지 못했습니다'],
        opportunities: ['원문 분석은 성공적으로 수행되었습니다'],
        comparableProjects: [],
        recommendation: rawText.slice(0, 400),
        priceEstimate: '',
        neighborhoodScore: { transportation: 5, education: 5, commercial: 5, greenSpace: 5, development: 5 },
      }
    }

    return NextResponse.json({
      success: true,
      address,
      summary,
      buildings: classified.buildings.slice(0, 15),
      amenities: classified.amenities.slice(0, 10),
      roads: classified.roads.slice(0, 5),
      analysis,
    })
  } catch (err: any) {
    console.error('[NEARBY] Error:', err)
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 })
  }
}

// ━━━ GET 테스트 핸들러 (디버그용) ━━━
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const lat = parseFloat(url.searchParams.get('lat') || '0')
  const lng = parseFloat(url.searchParams.get('lng') || '0')
  const address = url.searchParams.get('address') || '테스트 주소'
  const buildingType = url.searchParams.get('type') || 'tower'
  const floors = parseInt(url.searchParams.get('floors') || '5')
  const units = parseInt(url.searchParams.get('units') || '20')
  const siteArea = parseInt(url.searchParams.get('siteArea') || '500')
  const gfa = parseInt(url.searchParams.get('gfa') || '2500')
  const strategy = url.searchParams.get('strategy') || 'balanced'

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat, lng 필수' }, { status: 400 })
  }

  // POST 핸들러 재사용
  const fakeReq = { json: async () => ({ lat, lng, address, buildingType, floors, units, siteArea, gfa, strategy }) } as NextRequest
  return POST(fakeReq)
}
