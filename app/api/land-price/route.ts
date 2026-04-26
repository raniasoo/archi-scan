import { NextRequest, NextResponse } from 'next/server'

const LAND_PRICE_API_KEY = process.env.LAND_PRICE_API_KEY || ''
const VWORLD_API_KEY = process.env.VWORLD_API_KEY || 'FFEC486D-E635-345C-9BA6-5404A5AA191B'

const VWORLD_BASE = 'https://api.vworld.kr/req/data'
const NSDI_BASE = 'https://apis.data.go.kr/1611000/nsdi/IndvdLandPriceService/attr/IndvdLandPrice'

// 법정동 단위 정밀 추정 (공시지가 수준)
const DONG_FALLBACK: Record<string, number> = {
  // 강남구 주요 동
  '역삼동': 67000000, '삼성동': 65000000, '논현동': 55000000, '청담동': 70000000,
  '압구정동': 80000000, '신사동': 60000000, '도곡동': 50000000, '대치동': 55000000,
  '개포동': 45000000, '일원동': 35000000, '수서동': 30000000,
  // 서초구
  '서초동': 55000000, '반포동': 60000000, '잠원동': 55000000, '방배동': 40000000,
  '양재동': 35000000, '우면동': 25000000,
  // 송파구
  '잠실동': 40000000, '신천동': 38000000, '가락동': 28000000, '문정동': 25000000,
  // 용산구
  '한남동': 50000000, '이태원동': 35000000, '이촌동': 40000000,
  // 중구
  '명동': 90000000, '을지로': 45000000, '충무로': 40000000, '소공동': 80000000,
  // 종로구
  '종로': 45000000, '광화문': 50000000, '인사동': 35000000,
}

const DISTRICT_FALLBACK: Record<string, number> = {
  '강남구': 55000000, '서초구': 45000000, '송파구': 30000000, '강동구': 18000000,
  '용산구': 35000000, '중구': 35000000, '종로구': 28000000,
  '마포구': 18000000, '서대문구': 13000000, '은평구': 11000000,
  '성동구': 16000000, '광진구': 15000000, '동대문구': 12000000, '중랑구': 10000000,
  '성북구': 11000000, '강북구': 9000000, '도봉구': 9000000, '노원구': 10000000,
  '영등포구': 16000000, '양천구': 14000000, '강서구': 12000000,
  '구로구': 11000000, '금천구': 10000000, '관악구': 10000000, '동작구': 14000000,
  '과천시': 25000000, '하남시': 16000000, '광명시': 14000000,
  '성남시': 18000000, '분당구': 22000000, '수정구': 12000000, '중원구': 14000000,
  '안양시': 12000000, '수원시': 10000000, '용인시': 11000000, '고양시': 10000000,
  '화성시': 8000000, '평택시': 7000000, '김포시': 10000000, '파주시': 6000000,
}

function extractDistrictPrice(address: string): number {
  // 법정동 단위 먼저 체크 (더 정확)
  for (const [dong, price] of Object.entries(DONG_FALLBACK)) {
    if (address.includes(dong)) return price
  }
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

async function fetchFromVworld(pnu: string, entX?: number, entY?: number): Promise<number | null> {
  // Lambda v11 경유 → 좌표로 정확한 PNU → getLandCharacter → 공시지가
  const LAMBDA_URL = process.env.LAMBDA_ZONE_URL || 'https://m4wofqr3gdz5xkk4puw3gluzja0upsve.lambda-url.ap-northeast-2.on.aws/'
  try {
    const coordParam = (entX && entY) ? `&lng=${entX}&lat=${entY}` : ''
    const res = await fetch(`${LAMBDA_URL}?landprice=1&pnu=${pnu}${coordParam}`, { signal: AbortSignal.timeout(10000) })
    const data = await res.json()
    console.log(`[LandPrice/Lambda] success=${data.success} price=${data.landPricePerM2} source=${data.source}`)
    if (data.success && data.landPricePerM2 > 0) return data.landPricePerM2
  } catch (e: any) { console.warn('[LandPrice/Lambda]', e.message) }
  return null
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
  const { sigunguCd, bjdongCd, bun, ji, address, stdrYear, entX, entY } = body
  const year = stdrYear || (new Date().getFullYear() - 1)

  if (!sigunguCd || !bjdongCd) {
    return NextResponse.json({
      success: true, isDemo: true, source: 'district-average', stdrYear: year,
      landPricePerM2: extractDistrictPrice(address || ''),
      message: '필지 코드 없음 — 지역 추정값 적용',
    })
  }

  const pnu = buildPNU(sigunguCd, bjdongCd, bun || '0000', ji || '0000')
  console.log(`[LandPrice] PNU=${pnu}, year=${year}`)

  // 0순위: Vworld 직접 호출 (Seoul 리전 - 한국 IP)
  try {
    const price = await fetchFromVworld(pnu, entX, entY)
    if (price) {
      console.log(`[LandPrice/Vworld] price=${price}`)
      return NextResponse.json({ success: true, landPricePerM2: price, pnu, source: 'api', stdrYear: year, via: 'vworld' })
    }
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
    message: '공시지가 API 조회 실패 — 지역 추정값 적용',
  })
}
