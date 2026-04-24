// 공시지가 조회 유틸리티

export interface LandPriceResult {
  landPricePerM2: number   // 공시지가 원/㎡
  totalLandCost: number    // 총 토지비 (원)
  source: 'api' | 'district-average'
  isDemo: boolean
  stdrYear: number
  message?: string
}

export async function fetchLandPrice(params: {
  sigunguCd?: string
  bjdongCd?: string
  bun?: string
  ji?: string
  address: string
  siteArea: number
}): Promise<LandPriceResult> {
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

  return {
    landPricePerM2: data.landPricePerM2 || 5000000,
    totalLandCost: (data.landPricePerM2 || 5000000) * params.siteArea,
    source: data.source || 'district-average',
    isDemo: data.isDemo ?? true,
    stdrYear: data.stdrYear || new Date().getFullYear() - 1,
    message: data.message,
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
