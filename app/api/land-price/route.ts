import { NextRequest, NextResponse } from 'next/server'

const LAND_PRICE_API_KEY = process.env.LAND_PRICE_API_KEY || ''
const VWORLD_API_KEY = process.env.VWORLD_API_KEY || 'FFEC486D-E635-345C-9BA6-5404A5AA191B'

const VWORLD_BASE = 'https://api.vworld.kr/req/data'
const NSDI_BASE = 'https://apis.data.go.kr/1611000/nsdi/IndvdLandPriceService/attr/IndvdLandPrice'

const DISTRICT_FALLBACK: Record<string, number> = {
  '강남구': 24000000, '서초구': 20000000, '송파구': 14000000, '강동구': 9000000,
  '용산구': 16000000, '중구': 14000000, '종로구': 12000000,
  '마포구': 9000000, '서대문구': 6500000, '은평구': 5500000,
  '성동구': 8000000, '광진구': 7500000, '동대문구': 6000000, '중랑구': 5000000,
  '성북구': 5500000, '강북구': 4500000, '도봉구': 4500000, '노원구': 5000000,
  '영등포구': 8000000, '양천구': 7000000, '강서구': 6000000,
  '구로구': 5500000, '금천구': 5000000, '관악구': 5000000, '동작구': 7000000,
  '과천시': 12000000, '하남시': 8000000, '광명시': 7000000,
  '성남시': 9000000, '분당구': 11000000, '수정구': 6000000, '중원구': 7000000,
  '안양시': 6000000, '수원시': 5000000, '용인시': 5500000, '고양시': 5000000,
  '화성시': 4000000, '평택시': 3500000, '김포시': 5000000, '파주시': 3000000,
}

function extractDistrictPrice(address: string): number {
  for (const [district, price] of Object.entries(DISTRICT_FALLBACK)) {
    if (address.includes(district)) return price
  }
  if (address.includes('서울')) return 7000000
  if (address.includes('경기')) return 3000000
  if (address.includes('인천')) return 3500000
  if (address.includes('부산')) return 3000000
  if (address.includes('대구')) return 2500000
  return 2000000
}

function buildPNU(sigunguCd: string, bjdongCd: string, bun: string, ji: string): string {
  const platGb = (bun.startsWith('산') || ji.startsWith('산')) ? '2' : '1'
  const cleanBun = bun.replace('산', '').replace(/\D/g, '').padStart(4, '0')
  const cleanJi = ji.replace('산', '').replace(/\D/g, '').padStart(4, '0')
  return `${sigunguCd.slice(0,5).padEnd(5,'0')}${bjdongCd.slice(0,5).padEnd(5,'0')}${platGb}${cleanBun}${cleanJi}`
}

async function fetchFromVworld(pnu: string): Promise<number | null> {
  const params = new URLSearchParams({
    service: 'data', request: 'GetFeature', data: 'LT_C_LHPCLND',
    key: VWORLD_API_KEY, attrFilter: `pnu:=:${pnu}`,
    geometry: 'false', attribute: 'true', format: 'json', size: '10',
  })
  const res = await fetch(`${VWORLD_BASE}?${params}`, { signal: AbortSignal.timeout(8000) })
  const data = await res.json()
  const features = data?.response?.result?.featureCollection?.features || data?.features || []
  if (!features.length) return null
  const sorted = features
    .map((f: any) => f?.properties ?? f)
    .filter((p: any) => p?.pblntfPclnd || p?.indvdLandPc)
    .sort((a: any, b: any) => Number(b?.stdrYear ?? 0) - Number(a?.stdrYear ?? 0))
  if (!sorted.length) return null
  const raw = sorted[0]?.pblntfPclnd ?? sorted[0]?.indvdLandPc ?? '0'
  const price = parseInt(raw.toString().replace(/,/g, ''))
  return price > 0 ? price : null
}

async function fetchFromNsdi(pnu: string, year: number, apiKey: string): Promise<number | null> {
  const url = `${NSDI_BASE}?serviceKey=${encodeURIComponent(apiKey)}&pnu=${pnu}&stdrYear=${year}&returnType=json`
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  const text = await res.text()
  if (text.trim().startsWith('<')) {
    const m = text.match(/<(?:indvdLandPc|pblntfPclnd)>([\d,]+)<\//)
    if (m) { const p = parseInt(m[1].replace(/,/g,'')); return p > 0 ? p : null }
    return null
  }
  const data = JSON.parse(text)
  const features = data?.features || data?.result?.featureCollection?.features || []
  if (!features.length) return null
  const props = features[0]?.properties ?? features[0]
  const price = parseInt((props?.indvdLandPc ?? props?.pblntfPclnd ?? '0').toString().replace(/,/g,''))
  return price > 0 ? price : null
}

export async function GET() {
  return NextResponse.json({ status: 'ok', vworld: !!VWORLD_API_KEY, nsdi: !!LAND_PRICE_API_KEY })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { sigunguCd, bjdongCd, bun, ji, address, stdrYear } = body
  const year = stdrYear || (new Date().getFullYear() - 1)

  if (!sigunguCd || !bjdongCd) {
    return NextResponse.json({
      success: true, isDemo: true, source: 'district-average', stdrYear: year,
      landPricePerM2: extractDistrictPrice(address || ''),
      message: '필지 코드 없음 — 지역 평균 공시지가 적용',
    })
  }

  const pnu = buildPNU(sigunguCd, bjdongCd, bun || '0000', ji || '0000')
  console.log(`[LandPrice] PNU=${pnu}, year=${year}`)

  // 0순위: Lambda 서울 프록시 (Vworld 차단 우회)
  const LAMBDA_URL = process.env.LAMBDA_ZONE_URL || 'https://m4wofqr3gdz5xkk4puw3gluzja0upsve.lambda-url.ap-northeast-2.on.aws/'
  try {
    const res = await fetch(`${LAMBDA_URL}?landprice=1&pnu=${pnu}`, { signal: AbortSignal.timeout(9000) })
    const data = await res.json()
    if (data.success && data.landPricePerM2 > 0) {
      console.log(`[LandPrice/Lambda] price=${data.landPricePerM2}`)
      return NextResponse.json({ success: true, landPricePerM2: data.landPricePerM2, pnu, source: 'api', stdrYear: data.stdrYear || year, via: 'lambda-vworld' })
    }
  } catch (e: any) { console.warn('[LandPrice/Lambda]', e.message) }

  // 1순위: Vworld 직접 (Lambda 실패 시)
  try {
    const price = await fetchFromVworld(pnu)
    if (price) return NextResponse.json({ success: true, landPricePerM2: price, pnu, source: 'api', stdrYear: year, via: 'vworld' })
  } catch (e: any) { console.warn('[LandPrice/Vworld]', e.message) }

  // 2순위: NSDI
  if (LAND_PRICE_API_KEY) {
    try {
      const price = await fetchFromNsdi(pnu, year, LAND_PRICE_API_KEY)
      if (price) return NextResponse.json({ success: true, landPricePerM2: price, pnu, source: 'api', stdrYear: year, via: 'nsdi' })
      const price2 = await fetchFromNsdi(pnu, year - 1, LAND_PRICE_API_KEY)
      if (price2) return NextResponse.json({ success: true, landPricePerM2: price2, pnu, source: 'api', stdrYear: year-1, via: 'nsdi' })
    } catch (e: any) { console.warn('[LandPrice/NSDI]', e.message) }
  }

  return NextResponse.json({
    success: true, isDemo: true, pnu, source: 'district-average', stdrYear: year,
    landPricePerM2: extractDistrictPrice(address || ''),
    message: '공시지가 조회 실패 — 지역 평균 적용',
  })
}
