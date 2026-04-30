/**
 * AI Layout Optimizer
 * ROI 최대화를 위한 배치안 파라미터 자동 탐색
 */

export interface OptimizationConstraints {
  siteArea: number
  maxCoverage: number       // 최대 건폐율 %
  maxFAR: number            // 최대 용적률 %
  maxFloors: number         // 최대 층수
  maxHeight: number         // 최대 높이 m
  parkingRatio: number      // 주차 비율 (세대당)
  landCostPerM2: number     // 토지 단가 원/㎡
  constructionCostPerM2: number // 공사비 원/㎡
  salesPricePerM2: number   // 분양가 원/㎡
}

export interface OptimizedResult {
  coverage: number
  floors: number
  units: number
  gfa: number
  parking: number
  totalCost: number
  totalRevenue: number
  profit: number
  roi: number
  unitSize: number
}

export interface OptimizationReport {
  best: OptimizedResult
  alternatives: OptimizedResult[]
  searchSpace: number
  improvement: string
}

export function optimizeLayout(constraints: OptimizationConstraints): OptimizationReport {
  const {
    siteArea, maxCoverage, maxFAR, maxFloors, maxHeight,
    parkingRatio, landCostPerM2, constructionCostPerM2, salesPricePerM2
  } = constraints

  const maxFloorsByHeight = Math.floor(maxHeight / 3.3)
  const effectiveMaxFloors = Math.min(maxFloors, maxFloorsByHeight)

  const results: OptimizedResult[] = []

  // 파라미터 탐색 범위
  const coverageRange = Array.from({ length: 8 }, (_, i) => Math.min(maxCoverage, 30 + i * 5))
  const floorRange = Array.from({ length: effectiveMaxFloors }, (_, i) => i + 3).filter(f => f <= effectiveMaxFloors)
  const unitSizeRange = [59, 74, 84, 109] // 소형~대형

  let searchCount = 0

  for (const coverage of coverageRange) {
    for (const floors of floorRange) {
      for (const unitSize of unitSizeRange) {
        searchCount++

        const buildingArea = (siteArea * coverage) / 100
        const rawGFA = buildingArea * floors
        const maxGFA = siteArea * maxFAR / 100
        const gfa = Math.min(rawGFA, maxGFA)

        // 실제 용적률 체크
        const actualFAR = (gfa / siteArea) * 100
        if (actualFAR > maxFAR) continue

        // 세대수
        const netArea = gfa * 0.72 // 코어 효율 72%
        const units = Math.max(Math.floor(netArea / unitSize), floors)
        if (units < 5) continue

        // 주차
        const parking = Math.ceil(units * parkingRatio)

        // 사업비
        const landCost = siteArea * landCostPerM2
        const constructionCost = gfa * constructionCostPerM2
        const indirectCost = (landCost + constructionCost) * 0.15
        const totalCost = landCost + constructionCost + indirectCost

        // 수익
        const totalRevenue = gfa * 0.72 * salesPricePerM2 // 분양면적 = 연면적 × 72%

        const profit = totalRevenue - totalCost
        const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0

        results.push({
          coverage, floors, units, gfa: Math.round(gfa),
          parking, totalCost, totalRevenue,
          profit, roi: Math.round(roi * 10) / 10, unitSize
        })
      }
    }
  }

  // ROI 기준 정렬
  results.sort((a, b) => b.roi - a.roi)

  const best = results[0] || {
    coverage: maxCoverage, floors: effectiveMaxFloors, units: 0,
    gfa: 0, parking: 0, totalCost: 0, totalRevenue: 0,
    profit: 0, roi: 0, unitSize: 84
  }

  // 상위 5개 대안
  const alternatives = results.slice(1, 6)

  // 최저 ROI 대비 개선율
  const worst = results[results.length - 1]
  const improvement = worst && best.roi > worst.roi
    ? `최적화로 ROI ${(best.roi - worst.roi).toFixed(1)}%p 개선`
    : '최적 조합 탐색 완료'

  return { best, alternatives, searchSpace: searchCount, improvement }
}
