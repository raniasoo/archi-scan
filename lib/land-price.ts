// 공시지가 조회 유틸리티

export interface LandPriceResult {
  landPricePerM2: number   // 공시지가 원/㎡
  totalLandCost: number    // 총 토지비 (원)
  source: 'api' | 'district-average'
  isDemo: boolean
  stdrYear: number
  message?: string
}

// 시군구코드 → 공시지가 매핑 (더 정확)
const SIGUNGU_PRICE: Record<string, number> = {
  '11110': 12000000, // 종로구
  '11140': 14000000, // 중구
  '11170': 16000000, // 용산구
  '11200': 8000000,  // 성동구
  '11215': 7500000,  // 광진구
  '11230': 6000000,  // 동대문구
  '11260': 5000000,  // 중랑구
  '11290': 5500000,  // 성북구
  '11305': 4500000,  // 강북구
  '11320': 4500000,  // 도봉구
  '11350': 5000000,  // 노원구
  '11380': 6000000,  // 은평구
  '11410': 6500000,  // 서대문구
  '11440': 9000000,  // 마포구
  '11470': 6000000,  // 양천구
  '11500': 8000000,  // 강서구
  '11530': 5500000,  // 구로구
  '11545': 5000000,  // 금천구
  '11560': 8000000,  // 영등포구
  '11590': 7000000,  // 동작구
  '11620': 5000000,  // 관악구
  '11650': 14000000, // 서초구
  '11680': 24000000, // 강남구 ★
  '11710': 14000000, // 송파구
  '11740': 9000000,  // 강동구
}

const DISTRICT_FALLBACK: Record<string, number> = {
  '강남구': 24000000, '서초구': 20000000, '송파구': 14000000,
  '용산구': 16000000, '중구': 14000000, '종로구': 12000000,
  '마포구': 9000000, '성동구': 8000000, '광진구': 7500000,
  '영등포구': 8000000, '동작구': 7000000, '양천구': 7000000,
  '강서구': 6000000, '은평구': 5500000, '구로구': 5500000,
  '성북구': 5500000, '서대문구': 6500000, '강북구': 4500000,
  '도봉구': 4500000, '노원구': 5000000, '중랑구': 5000000,
  '관악구': 5000000, '금천구': 5000000, '강동구': 9000000,
  '분당구': 11000000, '과천시': 12000000, '성남시': 9000000,
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
      }),
    })

    const data = await res.json()
    // 서버 반환값이 너무 낮거나(≤300만) 실패 메시지면 클라이언트 district 값 사용
    const serverPrice = data.landPricePerM2 || 0
    const districtPrice = getDistrictPrice(params.address, params.sigunguCd)
    const price = (serverPrice > 3000000 && !data.message?.includes('실패'))
      ? serverPrice
      : Math.max(serverPrice, districtPrice)
    return {
      landPricePerM2: price,
      totalLandCost: price * params.siteArea,
      source: data.source || 'district-average',
      isDemo: data.isDemo ?? true,
      stdrYear: data.stdrYear || new Date().getFullYear() - 1,
      message: data.message,
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
