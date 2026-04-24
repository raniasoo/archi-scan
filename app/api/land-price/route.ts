import { NextRequest, NextResponse } from 'next/server'

const LAND_PRICE_API_KEY = process.env.LAND_PRICE_API_KEY || ''
const LAND_PRICE_BASE = 'https://apis.data.go.kr/1611000/nsdi/IndvdLandPriceService/attr/IndvdLandPrice'

// 구별 평균 공시지가 fallback 테이블 (원/㎡, 2024년 기준 추정)
const DISTRICT_FALLBACK: Record<string, number> = {
  '강남구': 24000000, '서초구': 20000000, '송파구': 14000000, '강동구': 9000000,
  '용산구': 16000000, '중구': 14000000, '종로구': 12000000, '마포구': 9000000,
  '영등포구': 8000000, '양천구': 7000000, '강서구': 6000000, '구로구': 5500000,
  '금천구': 5000000, '관악구': 5000000, '동작구': 7000000, '서대문구': 6500000,
  '은평구': 5500000, '노원구': 5000000, '도봉구': 4500000, '강북구': 4500000,
  '성북구': 5500000, '성동구': 8000000, '광진구': 7500000, '동대문구': 6000000,
  '중랑구': 5000000,
  // 경기도 주요 시
  '과천시': 12000000, '성남시': 9000000, '분당구': 11000000, '수정구': 6000000,
  '중원구': 7000000, '하남시': 8000000, '광명시': 7000000, '안양시': 6000000,
  '수원시': 5000000, '용인시': 5500000, '고양시': 5000000,
}

function extractDistrictPrice(address: string): number | null {
  for (const [district, price] of Object.entries(DISTRICT_FALLBACK)) {
    if (address.includes(district)) return price
  }
  // 서울 기본값
  if (address.includes('서울')) return 7000000
  // 경기 기본값
  if (address.includes('경기')) return 3000000
  // 전국 기본값
  return 2000000
}

// PNU 구성: 시군구(5) + 법정동(5) + 대지구분(1) + 번(4) + 지(4)
function buildPNU(sigunguCd: string, bjdongCd: string, bun: string, ji: string): string {
  const platGb = '1' // 1=대지(일반), 2=산
  return `${sigunguCd.padEnd(5,'0').slice(0,5)}${bjdongCd.padEnd(5,'0').slice(0,5)}${platGb}${bun.padStart(4,'0')}${ji.padStart(4,'0')}`
}

export async function GET(req: NextRequest) {
  return NextResponse.json({ status: 'ok', configured: !!LAND_PRICE_API_KEY })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { sigunguCd, bjdongCd, bun, ji, address, stdrYear } = body

  const year = stdrYear || new Date().getFullYear() - 1 // 전년도 기준

  // API 키 없으면 주소 기반 fallback
  if (!LAND_PRICE_API_KEY) {
    const fallbackPrice = extractDistrictPrice(address || '')
    return NextResponse.json({
      success: true,
      isDemo: true,
      landPricePerM2: fallbackPrice,
      source: 'district-average',
      message: `LAND_PRICE_API_KEY 미설정 — ${address} 지역 평균 공시지가 적용`,
      stdrYear: year,
    })
  }

  if (!sigunguCd || !bjdongCd) {
    // 주소만 있으면 fallback
    const fallbackPrice = extractDistrictPrice(address || '')
    return NextResponse.json({
      success: true,
      isDemo: true,
      landPricePerM2: fallbackPrice,
      source: 'district-average',
      message: '필지 코드 없음 — 지역 평균 공시지가 적용',
      stdrYear: year,
    })
  }

  const pnu = buildPNU(sigunguCd, bjdongCd, bun || '0000', ji || '0000')
  console.log(`[LandPrice] PNU: ${pnu}, year: ${year}`)

  try {
    const url = `${LAND_PRICE_BASE}?serviceKey=${encodeURIComponent(LAND_PRICE_API_KEY)}&pnu=${pnu}&stdrYear=${year}&returnType=json`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    const text = await res.text()

    let data: any
    try { data = JSON.parse(text) } catch {
      // XML 응답 처리
      const priceMatch = text.match(/<indvdLandPc>([\d.]+)<\/indvdLandPc>/)
      if (priceMatch) {
        const price = Math.round(parseFloat(priceMatch[1]))
        return NextResponse.json({ success: true, landPricePerM2: price, pnu, source: 'api', stdrYear: year })
      }
      throw new Error('응답 파싱 실패')
    }

    // JSON 응답 파싱
    const features = data?.features || data?.result?.featureCollection?.features || []
    if (features.length > 0) {
      const props = features[0]?.properties || features[0]
      const price = parseInt(props?.indvdLandPc || props?.land_price || '0')
      if (price > 0) {
        return NextResponse.json({
          success: true,
          landPricePerM2: price,
          pnu,
          source: 'api',
          stdrYear: year,
          address: props?.ldCode || address,
        })
      }
    }

    // API 성공했지만 데이터 없음 → fallback
    const fallbackPrice = extractDistrictPrice(address || '')
    return NextResponse.json({
      success: true,
      isDemo: true,
      landPricePerM2: fallbackPrice,
      pnu,
      source: 'district-average',
      message: `공시지가 데이터 없음 (${year}년) — 지역 평균 적용`,
      stdrYear: year,
    })

  } catch (err: any) {
    const fallbackPrice = extractDistrictPrice(address || '')
    return NextResponse.json({
      success: true,
      isDemo: true,
      landPricePerM2: fallbackPrice,
      source: 'district-average',
      message: `API 오류 — 지역 평균 공시지가 적용: ${err.message}`,
      stdrYear: year,
    })
  }
}
