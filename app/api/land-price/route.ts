import { NextRequest, NextResponse } from 'next/server'

const LAND_PRICE_API_KEY = process.env.LAND_PRICE_API_KEY || ''

// 엔드포인트 (data.go.kr 국토교통부 개별공시지가정보)
const ENDPOINTS = {
  // REST 속성 조회 (기본)
  attr: 'https://apis.data.go.kr/1611000/nsdi/IndvdLandPriceService/attr/IndvdLandPrice',
  // WFS 방식 (WMS/WFS/속성정보 API)
  wfs: 'https://apis.data.go.kr/1611000/nsdi/IndvdLandPriceService/wfs/IndvdLandPrice',
}

// 구별 평균 공시지가 fallback (원/㎡, 2024년 기준)
const DISTRICT_FALLBACK: Record<string, number> = {
  // 서울 강남권
  '강남구': 24000000, '서초구': 20000000, '송파구': 14000000, '강동구': 9000000,
  // 서울 도심
  '용산구': 16000000, '중구': 14000000, '종로구': 12000000,
  // 서울 서부/마포
  '마포구': 9000000, '서대문구': 6500000, '은평구': 5500000,
  // 서울 동부
  '성동구': 8000000, '광진구': 7500000, '동대문구': 6000000, '중랑구': 5000000,
  // 서울 북부
  '성북구': 5500000, '강북구': 4500000, '도봉구': 4500000, '노원구': 5000000,
  // 서울 서남
  '영등포구': 8000000, '양천구': 7000000, '강서구': 6000000,
  '구로구': 5500000, '금천구': 5000000,
  // 서울 남부
  '관악구': 5000000, '동작구': 7000000,
  // 경기 주요
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

// PNU: 시군구(5) + 법정동(5) + 대지구분(1) + 번(4) + 지(4) = 19자리
function buildPNU(sigunguCd: string, bjdongCd: string, bun: string, ji: string): string {
  const platGb = (bun.startsWith('산') || ji.startsWith('산')) ? '2' : '1'
  const cleanBun = bun.replace('산', '').replace(/\D/g, '').padStart(4, '0')
  const cleanJi = ji.replace('산', '').replace(/\D/g, '').padStart(4, '0')
  return `${sigunguCd.slice(0,5).padEnd(5,'0')}${bjdongCd.slice(0,5).padEnd(5,'0')}${platGb}${cleanBun}${cleanJi}`
}

function parseLandPrice(data: any): number | null {
  // REST 응답 파싱
  const features = data?.features
    || data?.result?.featureCollection?.features
    || data?.IndvdLandPrice?.field
    || []

  if (Array.isArray(features) && features.length > 0) {
    const props = features[0]?.properties ?? features[0]
    const raw = props?.indvdLandPc ?? props?.land_price ?? props?.pblntfPclnd ?? null
    if (raw != null) {
      const price = typeof raw === 'string' ? parseInt(raw.replace(/,/g, '')) : Number(raw)
      if (!isNaN(price) && price > 0) return price
    }
  }

  // 단순 객체 형태 파싱
  const flat = data?.IndvdLandPrice ?? data?.response?.body?.items?.item
  if (flat) {
    const item = Array.isArray(flat) ? flat[0] : flat
    const price = parseInt(item?.pblntfPclnd ?? item?.indvdLandPc ?? '0')
    if (price > 0) return price
  }

  return null
}

export async function GET(req: NextRequest) {
  return NextResponse.json({ status: 'ok', configured: !!LAND_PRICE_API_KEY })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { sigunguCd, bjdongCd, bun, ji, address, stdrYear } = body
  const year = stdrYear || (new Date().getFullYear() - 1)

  // API 키 없으면 fallback
  if (!LAND_PRICE_API_KEY) {
    const price = extractDistrictPrice(address || '')
    return NextResponse.json({
      success: true, isDemo: true, landPricePerM2: price,
      source: 'district-average', stdrYear: year,
      message: `LAND_PRICE_API_KEY 미설정 — 지역 평균 공시지가 적용`,
    })
  }

  // PNU 코드 없으면 fallback
  if (!sigunguCd || !bjdongCd) {
    const price = extractDistrictPrice(address || '')
    return NextResponse.json({
      success: true, isDemo: true, landPricePerM2: price,
      source: 'district-average', stdrYear: year,
      message: '필지 코드 없음 — 지역 평균 공시지가 적용',
    })
  }

  const pnu = buildPNU(sigunguCd, bjdongCd, bun || '0000', ji || '0000')
  console.log(`[LandPrice] PNU=${pnu}, year=${year}`)

  // REST 속성조회 시도
  try {
    const url = `${ENDPOINTS.attr}?serviceKey=${encodeURIComponent(LAND_PRICE_API_KEY)}&pnu=${pnu}&stdrYear=${year}&returnType=json`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    const text = await res.text()

    // XML 응답 처리
    if (text.trim().startsWith('<')) {
      const priceMatch = text.match(/<(?:indvdLandPc|pblntfPclnd)>([\d,]+)<\//)
      if (priceMatch) {
        const price = parseInt(priceMatch[1].replace(/,/g, ''))
        if (price > 0) return NextResponse.json({ success: true, landPricePerM2: price, pnu, source: 'api', stdrYear: year })
      }
      // 에러 코드 확인
      const errMatch = text.match(/<returnReasonCode>(.*?)<\/returnReasonCode>/)
      console.warn('[LandPrice] API 오류:', errMatch?.[1] ?? '알 수 없음')
    } else {
      const data = JSON.parse(text)
      const price = parseLandPrice(data)
      if (price) return NextResponse.json({ success: true, landPricePerM2: price, pnu, source: 'api', stdrYear: year })
    }
  } catch (e: any) {
    console.error('[LandPrice] 조회 실패:', e.message)
  }

  // 전년도 재시도
  try {
    const prevYear = year - 1
    const url = `${ENDPOINTS.attr}?serviceKey=${encodeURIComponent(LAND_PRICE_API_KEY)}&pnu=${pnu}&stdrYear=${prevYear}&returnType=json`
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) })
    const text = await res.text()
    const priceMatch = text.match(/<(?:indvdLandPc|pblntfPclnd)>([\d,]+)<\//)
    if (priceMatch) {
      const price = parseInt(priceMatch[1].replace(/,/g, ''))
      if (price > 0) return NextResponse.json({ success: true, landPricePerM2: price, pnu, source: 'api', stdrYear: prevYear, message: `${prevYear}년 공시지가 적용` })
    }
  } catch {}

  // 최종 fallback
  const fallback = extractDistrictPrice(address || '')
  return NextResponse.json({
    success: true, isDemo: true, landPricePerM2: fallback,
    source: 'district-average', stdrYear: year, pnu,
    message: '실제 공시지가 조회 실패 — 지역 평균 적용',
  })
}

