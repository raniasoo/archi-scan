import { NextRequest, NextResponse } from 'next/server'

// 토지이용규제서비스 (LURIS) - 국토부
const LURIS_BASE = 'https://apis.data.go.kr/1611000/nsdi/LandUseService/attr/getLandUsePlan'
const LURIS_KEY = process.env.MOLIT_API_KEY || ''

// sigunguCd 기반 기본 용도지역 추론 (강남구=11680 등)
function inferZoneFromAddress(address: string): string {
  if (address.includes('강남대로') || address.includes('테헤란로') || address.includes('영동대로')) return '일반상업지역'
  if (address.includes('대로')) return '일반상업지역'
  if (address.includes('강남구') || address.includes('서초구') || address.includes('송파구')) return '제2종일반주거지역'
  if (address.includes('중구') || address.includes('종로구') || address.includes('용산구')) return '일반상업지역'
  if (address.includes('로') && !address.includes('대로')) return '제2종일반주거지역'
  return '제2종일반주거지역'
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { sigunguCd, bjdongCd, bun, ji, address } = body

  // LURIS API 시도
  if (LURIS_KEY && sigunguCd && bjdongCd) {
    try {
      const pnu = `${sigunguCd.slice(0,5).padEnd(5,'0')}${bjdongCd.slice(0,5).padEnd(5,'0')}1${(bun||'0000').padStart(4,'0')}${(ji||'0000').padStart(4,'0')}`
      const url = `${LURIS_BASE}?serviceKey=${encodeURIComponent(LURIS_KEY)}&pnu=${pnu}&returnType=json`
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) })
      const text = await res.text()
      
      // XML 파싱
      const zoneMatch = text.match(/<prposArea1>(.*?)<\/prposArea1>/)
      if (zoneMatch?.[1]) {
        return NextResponse.json({ success: true, zoneType: zoneMatch[1], source: 'luris' })
      }
      // JSON 파싱
      if (!text.startsWith('<')) {
        const data = JSON.parse(text)
        const zone = data?.features?.[0]?.properties?.prposArea1 
          || data?.result?.featureCollection?.features?.[0]?.properties?.prposArea1
        if (zone) return NextResponse.json({ success: true, zoneType: zone, source: 'luris' })
      }
    } catch (e) {
      console.warn('[zone-lookup] LURIS 실패:', e)
    }
  }

  // 주소 기반 추론 fallback
  const inferred = inferZoneFromAddress(address || '')
  return NextResponse.json({ success: true, zoneType: inferred, source: 'address-infer', isInferred: true })
}
