/**
 * 민감도 분석 + Monte Carlo 시뮬레이션
 * 사업성 분석 10점 달성용
 */

export interface SensitivityItem {
  variable: string      // 변수명
  baseValue: number     // 기준값
  minROI: number        // 하한 ROI (%)
  maxROI: number        // 상한 ROI (%)
  impact: number        // 영향도 (ROI 변동폭)
  unit: string
}

export interface MonteCarloResult {
  simulations: number
  roiDistribution: { bucket: string; count: number }[]
  p5: number            // 5% 확률 ROI
  p25: number
  p50: number           // 중간값
  p75: number
  p95: number
  mean: number
  failureProb: number   // ROI < 0 확률 (%)
  successProb: number   // ROI > 10% 확률 (%)
}

export interface SensitivityReport {
  tornado: SensitivityItem[]
  monteCarlo: MonteCarloResult
  breakeven: {
    salePriceMin: number   // 손익분기 최소 분양가 (원/㎡)
    constructionMax: number // 손익분기 최대 공사비 (원/㎡)
    landPriceMax: number    // 손익분기 최대 토지가 (원/㎡)
  }
}

// ━━━ Tornado 민감도 분석 ━━━
export function analyzeSensitivity(params: {
  totalCost: number      // 총사업비 (원)
  revenue: number        // 예상수익 (원)
  landCost: number       // 토지비 (원)
  constructionCost: number // 공사비 (원)
  salePrice: number      // 분양가 (원/㎡)
  constructionUnit: number // 공사비 단가 (원/㎡)
  landPriceUnit: number  // 토지가 (원/㎡)
  gfa: number            // 연면적 (㎡)
  siteArea: number
  roi: number            // 기준 ROI (%)
}): SensitivityReport {
  const { totalCost, revenue, landCost, constructionCost, salePrice, constructionUnit, landPriceUnit, gfa, siteArea, roi } = params

  // 변수별 ±10% 변동 시 ROI 변화 계산
  const calcROI = (tc: number, rev: number) => tc > 0 ? ((rev - tc) / tc) * 100 : 0

  const variables = [
    {
      name: '분양가', base: salePrice, unit: '원/㎡',
      calc: (pct: number) => calcROI(totalCost, revenue * (1 + pct / 100)),
    },
    {
      name: '토지가', base: landPriceUnit, unit: '원/㎡',
      calc: (pct: number) => calcROI(totalCost + landCost * pct / 100, revenue),
    },
    {
      name: '공사비', base: constructionUnit, unit: '원/㎡',
      calc: (pct: number) => calcROI(totalCost + constructionCost * pct / 100, revenue),
    },
    {
      name: '연면적', base: gfa, unit: '㎡',
      calc: (pct: number) => calcROI(totalCost * (1 + pct / 200), revenue * (1 + pct / 100)),
    },
    {
      name: '금융비용', base: totalCost * 0.05, unit: '원',
      calc: (pct: number) => calcROI(totalCost * (1 + 0.05 * (1 + pct / 100)), revenue),
    },
    {
      name: '공사기간', base: 24, unit: '개월',
      calc: (pct: number) => calcROI(totalCost * (1 + 0.03 * pct / 100), revenue),
    },
  ]

  const tornado: SensitivityItem[] = variables.map(v => {
    const minROI = Math.round(v.calc(-10) * 10) / 10
    const maxROI = Math.round(v.calc(10) * 10) / 10
    return {
      variable: v.name,
      baseValue: v.base,
      minROI, maxROI,
      impact: Math.round(Math.abs(maxROI - minROI) * 10) / 10,
      unit: v.unit,
    }
  }).sort((a, b) => b.impact - a.impact)

  // ━━━ Monte Carlo 시뮬레이션 ━━━
  const N = 5000
  const roiResults: number[] = []

  for (let i = 0; i < N; i++) {
    const salePriceVar = 1 + (Math.random() - 0.5) * 0.2  // ±10%
    const landVar = 1 + (Math.random() - 0.5) * 0.3       // ±15%
    const constVar = 1 + (Math.random() - 0.5) * 0.2      // ±10%
    const financeVar = 0.03 + Math.random() * 0.06         // 3~9%

    const simRevenue = revenue * salePriceVar
    const simLand = landCost * landVar
    const simConst = constructionCost * constVar
    const simFinance = (simLand + simConst) * financeVar
    const simTotal = simLand + simConst + simFinance + (totalCost - landCost - constructionCost)
    const simROI = simTotal > 0 ? ((simRevenue - simTotal) / simTotal) * 100 : -100

    roiResults.push(Math.round(simROI * 10) / 10)
  }

  roiResults.sort((a, b) => a - b)

  // 분포 히스토그램
  const buckets: Record<string, number> = {}
  const bucketSize = 5
  for (const r of roiResults) {
    const bucket = Math.floor(r / bucketSize) * bucketSize
    const label = `${bucket}~${bucket + bucketSize}%`
    buckets[label] = (buckets[label] || 0) + 1
  }

  const monteCarlo: MonteCarloResult = {
    simulations: N,
    roiDistribution: Object.entries(buckets).map(([bucket, count]) => ({ bucket, count })).sort((a, b) => {
      const aNum = parseInt(a.bucket)
      const bNum = parseInt(b.bucket)
      return aNum - bNum
    }),
    p5: roiResults[Math.floor(N * 0.05)],
    p25: roiResults[Math.floor(N * 0.25)],
    p50: roiResults[Math.floor(N * 0.50)],
    p75: roiResults[Math.floor(N * 0.75)],
    p95: roiResults[Math.floor(N * 0.95)],
    mean: Math.round(roiResults.reduce((s, r) => s + r, 0) / N * 10) / 10,
    failureProb: Math.round(roiResults.filter(r => r < 0).length / N * 1000) / 10,
    successProb: Math.round(roiResults.filter(r => r > 10).length / N * 1000) / 10,
  }

  // 손익분기 분석
  const profit = revenue - totalCost
  const breakeven = {
    salePriceMin: revenue > 0 ? Math.round(salePrice * totalCost / revenue) : 0,
    constructionMax: constructionCost > 0 ? Math.round(constructionUnit * (1 + profit / constructionCost)) : 0,
    landPriceMax: landCost > 0 ? Math.round(landPriceUnit * (1 + profit / landCost)) : 0,
  }

  return { tornado, monteCarlo, breakeven }
}
