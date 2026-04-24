import { NextRequest, NextResponse } from 'next/server'

const MOLIT_API_KEY = process.env.MOLIT_API_KEY || ''
const VWORLD_API_KEY = process.env.VWORLD_API_KEY || 'FFEC486D-E635-345C-9BA6-5404A5AA191B'
const VWORLD_BASE = 'https://api.vworld.kr/req/data'

function inferZoneFromAddress(address: string): string {
  if (address.includes('강남대로') || address.includes('테헤란로') || address.includes('영동대로')) return '일반상업지역'
  if (address.includes('대로')) return '일반상업지역'
  if (address.includes('강남구') || address.includes('서초구') || address.includes('송파구')) return '제2종일반주거지역'
  if (address.includes('중구') || address.includes('종로구') || address.includes('용산구')) return '일반상업지역'
  if (address.includes('로') && !address.includes('대로')) return '제2종일반주거지역'
  return '제2종일반주거지역'
}

function buildPNU(sigunguCd: string, bjdongCd: string, bun: string, ji: string): string {
  const platGb = (bun.startsWith('산') || ji.startsWith('산')) ? '2' : '1'
  const cleanBun = bun.replace('산','').replace(/\D/g,'').padStart(4,'0')
  const cleanJi = ji.replace('산','').replace(/\D/g,'').padStart(4,'0')
  return `${sigunguCd.slice(0,5).padEnd(5,'0')}${bjdongCd.slice(0,5).padEnd(5,'0')}${platGb}${cleanBun}${cleanJi}`
}

// Vworld 필지정보로 면적 조회 (LT_C_LHPCLND: 개별공시지가 레이어 - 면적 포함)
async function fetchParcelArea(pnu: string): Promise<number | null> {
  try {
    // 개별공시지가 레이어에서 면적 조회
    const params = new URLSearchParams({
      service: 'data', request: 'GetFeature', data: 'LT_C_LHPCLND',
      key: VWORLD_API_KEY, attrFilter: `pnu:=:${pnu}`,
      geometry: 'false', attribute: 'true', format: 'json', size: '5',
    })
    const res = await fetch(`${VWORLD_BASE}?${params}`, { signal: AbortSignal.timeout(6000) })
    const data = await res.json()
    const features = data?.response?.result?.featureCollection?.features || data?.features || []
    if (features.length > 0) {
      const props = features[0]?.properties ?? features[0]
      // 면적 필드 탐색 (pblntfArea, lndpclAr, ldCode 등)
      const area = parseFloat(props?.pblntfArea ?? props?.lndpclAr ?? props?.area ?? '0')
      if (area > 0) return area
    }

    // 토지(임야)대장 레이어 시도
    const params2 = new URLSearchParams({
      service: 'data', request: 'GetFeature', data: 'LT_C_LANDINFOENS',
      key: VWORLD_API_KEY, attrFilter: `pnu:=:${pnu}`,
      geometry: 'false', attribute: 'true', format: 'json', size: '3',
    })
    const res2 = await fetch(`${VWORLD_BASE}?${params2}`, { signal: AbortSignal.timeout(5000) })
    const data2 = await res2.json()
    const features2 = data2?.response?.result?.featureCollection?.features || data2?.features || []
    if (features2.length > 0) {
      const props2 = features2[0]?.properties ?? features2[0]
      const area2 = parseFloat(props2?.lndpclAr ?? props2?.area ?? props2?.pblntfArea ?? '0')
      if (area2 > 0) return area2
    }
  } catch (e) {
    console.warn('[zone-lookup] 면적 조회 실패:', e)
  }
  return null
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { sigunguCd, bjdongCd, bun, ji, address } = body

  let zoneType = inferZoneFromAddress(address || '')
  let siteArea: number | null = null

  if (sigunguCd && bjdongCd) {
    const pnu = buildPNU(sigunguCd, bjdongCd, bun || '0000', ji || '0000')

    // 면적 조회 (Vworld)
    siteArea = await fetchParcelArea(pnu)

    // LURIS 용도지역 조회 시도 (MOLIT_API_KEY 있을 때)
    if (MOLIT_API_KEY) {
      try {
        const url = `https://apis.data.go.kr/1611000/nsdi/LandUseService/attr/getLandUsePlan?serviceKey=${encodeURIComponent(MOLIT_API_KEY)}&pnu=${pnu}&returnType=json`
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
        const text = await res.text()
        const m = text.match(/<prposArea1>(.*?)<\/prposArea1>/)
        if (m?.[1]) zoneType = m[1]
        else if (!text.startsWith('<')) {
          const d = JSON.parse(text)
          const z = d?.features?.[0]?.properties?.prposArea1
          if (z) zoneType = z
        }
      } catch {}
    }
  }

  return NextResponse.json({
    success: true,
    zoneType,
    siteArea,   // ← 면적 추가
    source: sigunguCd ? 'vworld-infer' : 'address-infer',
    isInferred: true,
  })
}
