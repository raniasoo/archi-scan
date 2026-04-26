// 공시지가 조회 유틸리티

export interface LandPriceResult {
  landPricePerM2: number   // 공시지가 원/㎡
  totalLandCost: number    // 총 토지비 (원)
  source: 'api' | 'district-average'
  isDemo: boolean
  stdrYear: number
  message?: string
  siteArea?: number        // 필지 면적 (㎡) - API에서 반환 시
}

// 시군구코드 → 공시지가 추정값 (Vworld NED API 실패 시 fallback)
const SIGUNGU_PRICE: Record<string, number> = {
  '11110': 28000000, // 종로구
  '11140': 35000000, // 중구
  '11170': 35000000, // 용산구
  '11200': 16000000, // 성동구
  '11215': 15000000, // 광진구
  '11230': 12000000, // 동대문구
  '11260': 10000000, // 중랑구
  '11290': 11000000, // 성북구
  '11305': 9000000,  // 강북구
  '11320': 9000000,  // 도봉구
  '11350': 10000000, // 노원구
  '11380': 11000000, // 은평구
  '11410': 13000000, // 서대문구
  '11440': 18000000, // 마포구
  '11470': 14000000, // 양천구
  '11500': 12000000, // 강서구
  '11530': 11000000, // 구로구
  '11545': 10000000, // 금천구
  '11560': 16000000, // 영등포구
  '11590': 14000000, // 동작구
  '11620': 10000000, // 관악구
  '11650': 45000000, // 서초구
  '11680': 55000000, // 강남구
  '11710': 30000000, // 송파구
  '11740': 18000000, // 강동구
}

const DISTRICT_FALLBACK: Record<string, number> = {
  '강남구': 55000000, '서초구': 45000000, '송파구': 30000000,
  '용산구': 35000000, '중구': 35000000, '종로구': 28000000,
  '마포구': 18000000, '성동구': 16000000, '광진구': 15000000,
  '영등포구': 16000000, '동작구': 14000000, '양천구': 14000000,
  '강서구': 12000000, '은평구': 11000000, '구로구': 11000000,
  '성북구': 11000000, '서대문구': 13000000, '강북구': 9000000,
  '도봉구': 9000000, '노원구': 10000000, '중랑구': 10000000,
  '관악구': 10000000, '금천구': 10000000, '강동구': 18000000,
  '분당구': 22000000, '과천시': 25000000, '성남시': 18000000,
}

function getDistrictPrice(address: string, sigunguCd?: string): number {
  // 1순위: sigunguCd 코드로 정확 매핑
  if (sigunguCd) {
    const code5 = sigunguCd.slice(0, 5)
    if (SIGUNGU_PRICE[code5]) return SIGUNGU_PRICE[code5]
  }
  // 2순위: 주소 텍스트 매칭
  for (const [district, price] of Object.entries(DISTRICT_FALLBACK)) {
    if (address.includes(district)) return price
  }
  if (address.includes('서울')) return 7000000
  if (address.includes('경기')) return 3000000
  return 5000000
}

export async function fetchLandPrice(params: {
  sigunguCd?: string
  bjdongCd?: string
  bun?: string
  ji?: string
  address: string
  siteArea: number
  entX?: number
  entY?: number
  bdMgtSn?: string
}): Promise<LandPriceResult> {
  try {
    const res = await fetch('/api/land-price', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sigunguCd: params.sigunguCd,
        bjdongCd: params.bjdongCd,
        bun: params.bun,
        ji: params.ji,
        address: params.address,
        entX: params.entX,
        entY: params.entY,
        bdMgtSn: params.bdMgtSn,
      }),
    })

    const data = await res.json()
    const serverPrice = data.landPricePerM2 || 0
    const districtPrice = getDistrictPrice(params.address, params.sigunguCd)
    // 서버값이 합리적(500만원 이상)이면 우선, 아니면 클라이언트 추정값과 최댓값 사용
    const price = serverPrice >= 5000000 ? serverPrice : Math.max(serverPrice, districtPrice)
    return {
      landPricePerM2: price,
      totalLandCost: price * params.siteArea,
      source: data.source || 'district-average',
      isDemo: data.isDemo ?? true,
      stdrYear: data.stdrYear || new Date().getFullYear() - 1,
      message: data.message,
      siteArea: data.siteArea,
    }
  } catch {
    // API 실패 시 클라이언트 district-average 적용
    const price = getDistrictPrice(params.address, params.sigunguCd)
    return {
      landPricePerM2: price,
      totalLandCost: price * params.siteArea,
      source: 'district-average',
      isDemo: true,
      stdrYear: new Date().getFullYear() - 1,
      message: '지역 평균 공시지가 적용',
    }
  }
}

// 토지비를 억원 단위로 포맷
export function formatLandCost(won: number): string {
  const eok = won / 1e8
  return eok >= 100
    ? `${Math.round(eok).toLocaleString()}억원`
    : `${eok.toFixed(1)}억원`
}

// 공시지가를 만원/㎡ 단위로 포맷
export function formatLandPricePerM2(wonPerM2: number): string {
  const man = wonPerM2 / 10000
  return man >= 10000
    ? `${Math.round(man / 10000)}억/㎡`
    : `${Math.round(man).toLocaleString()}만원/㎡`
}
