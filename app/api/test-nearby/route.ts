import { NextRequest, NextResponse } from 'next/server'

// 10개 샘플 좌표
const SAMPLES = [
  { lat: 37.5012, lng: 127.0396, address: '서울 강남구 역삼동 737', type: 'tower', floors: 15, units: 80, siteArea: 1000, gfa: 8250 },
  { lat: 37.4837, lng: 127.0074, address: '서울 서초구 서초동 1303-22', type: 'courtyard', floors: 5, units: 30, siteArea: 500, gfa: 2250 },
  { lat: 37.5477, lng: 126.9227, address: '서울 마포구 상수동 72-1', type: 'l-shape', floors: 7, units: 42, siteArea: 700, gfa: 3500 },
  { lat: 37.5348, lng: 127.0042, address: '서울 용산구 한남동 657', type: 'bar', floors: 4, units: 12, siteArea: 400, gfa: 1600 },
  { lat: 37.6128, lng: 126.9750, address: '서울 종로구 평창동 123', type: 'tower', floors: 20, units: 100, siteArea: 2000, gfa: 14000 },
  { lat: 37.5445, lng: 127.0560, address: '서울 성동구 성수동 668-11', type: 'courtyard', floors: 3, units: 9, siteArea: 300, gfa: 825 },
  { lat: 37.5665, lng: 126.8278, address: '서울 강서구 마곡동 757', type: 'cluster', floors: 5, units: 50, siteArea: 2500, gfa: 4750 },
  { lat: 35.1631, lng: 129.1636, address: '부산 해운대구 우동 1478', type: 'tower', floors: 25, units: 150, siteArea: 3000, gfa: 22500 },
  { lat: 37.3947, lng: 127.1112, address: '경기 성남시 판교동 681', type: 'l-shape', floors: 10, units: 60, siteArea: 600, gfa: 3600 },
  { lat: 33.4890, lng: 126.4983, address: '제주 제주시 노형동 2540', type: 'bar', floors: 2, units: 6, siteArea: 1000, gfa: 500 },
]

export async function GET(req: NextRequest) {
  const idx = parseInt(req.nextUrl.searchParams.get('idx') || '0')
  if (idx < 0 || idx > 9) return NextResponse.json({ error: 'idx must be 0-9' })

  const sample = SAMPLES[idx]
  const baseUrl = req.nextUrl.origin

  try {
    console.log(`[TEST-NEARBY] Test ${idx + 1}/10: ${sample.address}`)
    
    const res = await fetch(`${baseUrl}/api/nearby-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat: sample.lat, lng: sample.lng, address: sample.address,
        buildingType: sample.type, floors: sample.floors, units: sample.units,
        siteArea: sample.siteArea, gfa: sample.gfa, strategy: 'balanced',
      }),
    })

    const data = await res.json()

    if (data.success) {
      const s = data.summary
      const a = data.analysis
      const ns = a.neighborhoodScore
      return NextResponse.json({
        test: `${idx + 1}/10`,
        address: sample.address,
        status: '✅ 성공',
        buildings: s.totalBuildings,
        avgFloors: s.avgFloors,
        maxFloors: s.maxFloors,
        residential: s.residentialCount,
        commercial: s.commercialCount,
        scores: ns,
        avgScore: Math.round((ns.transportation + ns.education + ns.commercial + ns.greenSpace + ns.development) / 5 * 10) / 10,
        risks: a.risks?.length || 0,
        opportunities: a.opportunities?.length || 0,
        comparables: a.comparableProjects?.length || 0,
        marketPosition: a.marketPosition?.slice(0, 100) + '...',
        recommendation: a.recommendation?.slice(0, 100) + '...',
        priceEstimate: a.priceEstimate?.slice(0, 80) + '...',
      })
    } else {
      return NextResponse.json({ test: `${idx + 1}/10`, address: sample.address, status: '❌ 실패', error: data.error })
    }
  } catch (err: any) {
    return NextResponse.json({ test: `${idx + 1}/10`, address: sample.address, status: '❌ 에러', error: err.message })
  }
}
