// 공시지가 조회 유틸리티

export interface LandPriceResult {
  landPricePerM2: number   // 공시지가 원/㎡
  totalLandCost: number    // 총 토지비 (원)
  source: 'api' | 'district-average'
  isDemo: boolean
  stdrYear: number
  message?: string
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

function getDistrictPrice(address: string): number {
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
    const price = data.landPricePerM2 || getDistrictPrice(params.address)
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
    const price = getDistrictPrice(params.address)
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
