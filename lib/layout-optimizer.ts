/**
 * AI Layout Optimizer
 * ROI 최대화를 위한 배치안 파라미터 자동 탐색
 * 
 * Phase 1 업그레이드: 
 *   - GA(유전 알고리즘) 제약조건 솔버 통합
 *   - 일조사선 제약 반영 최적화
 *   - 기존 grid search도 fallback으로 유지
 */

import { calculateFeasibility } from './project-analysis-state'
import { 
  solveOptimalLayout, 
  toSiteGeometry, 
  toLegalConstraints, 
  gaResultToLayoutData,
  type SiteGeometry,
  type LegalConstraints,
  type OptimizationResult,
  type BuildingGene,
  type SolverConfig,
} from './constraint-solver'
import { analyzeSolarEnvelope, type SolarEnvelopeResult } from './sun-analysis'

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
  // Phase 1 확장
  solarScore?: number
  winterSunlightHours?: number
  northSolarMaxHeight?: number
  shadowLength?: number
  viewScore?: number
  isLegallyCompliant?: boolean
  violations?: string[]
  buildingType?: string
}

export interface OptimizationReport {
  best: OptimizedResult
  alternatives: OptimizedResult[]
  searchSpace: number
  improvement: string
  // Phase 1 확장
  solarEnvelope?: SolarEnvelopeResult
  gaResults?: Map<string, OptimizationResult>
  solverUsed: 'grid' | 'ga' | 'hybrid'
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Phase 1: GA 기반 최적화 (권장)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 제약조건 기반 GA 최적화 (Phase 1 메인 엔트리포인트)
 * 
 * 일조사선, 이격거리, 인동간격 등 모든 한국 건축법 제약을 반영하여
 * 5개 배치 유형 각각의 최적 배치를 찾습니다.
 */
export function optimizeLayoutGA(
  constraints: OptimizationConstraints,
  options?: {
    roadWidth?: number
    zoneType?: string
    latitude?: number
    isDistrictPlan?: boolean
    gaConfig?: Partial<SolverConfig>
    /** 최적화 목표 가중치 (합계 1.0) */
    objectiveWeights?: {
      roi?: number     // 기본 0.35
      solar?: number   // 기본 0.25
      view?: number    // 기본 0.15
      legal?: number   // 기본 0.25
    }
  }
): OptimizationReport {
  const {
    siteArea, maxCoverage, maxFAR, maxFloors, maxHeight,
    parkingRatio, landCostPerM2, constructionCostPerM2, salesPricePerM2
  } = constraints
  
  const roadWidth = options?.roadWidth || 8
  const zoneType = options?.zoneType || 'residential-2'
  const latitude = options?.latitude || 37.55
  
  // 대지 형상
  const site = toSiteGeometry(siteArea, roadWidth, latitude)
  
  // 법규 제약
  const legal = toLegalConstraints(
    { maxCoverageRatio: maxCoverage, maxFloorAreaRatio: maxFAR, maxHeight, maxFloors, roadWidth, parkingRatio, zoneType },
    5,
    options?.isDistrictPlan || false
  )
  
  // 일조사선 건축가능 볼륨 분석
  const solarEnvelope = analyzeSolarEnvelope({
    siteArea,
    heightLimit: maxHeight,
    roadWidth,
    isResidential: zoneType.includes('residential') && !zoneType.includes('semi'),
    latitude,
  })
  
  // GA 설정
  const gaConfig: Partial<SolverConfig> = {
    ...options?.gaConfig,
    objectiveWeights: {
      roi: options?.objectiveWeights?.roi ?? 0.35,
      solar: options?.objectiveWeights?.solar ?? 0.25,
      view: options?.objectiveWeights?.view ?? 0.15,
      legal: options?.objectiveWeights?.legal ?? 0.25,
    },
  }
  
  // GA 솔버 실행
  const gaResults = solveOptimalLayout(site, legal, gaConfig, {
    landCostPerM2, constructionCostPerM2, salesPricePerM2,
  })
  
  // 모든 타입의 최적 결과를 수집
  const allResults: (OptimizedResult & { fitness: number })[] = []
  
  for (const [buildingType, result] of gaResults.entries()) {
    const data = gaResultToLayoutData(result, buildingType)
    
    // ROI/비용 재계산 (calculateFeasibility로 정확성 보장)
    let totalCost = 0, totalRevenue = 0, profit = 0, roi = data.roi
    try {
      const feas = calculateFeasibility({
        siteArea,
        grossFloorArea: data.gfa,
        unitCount: data.units,
        floorCount: data.floors,
        parkingCount: data.parking,
        landPricePerM2: landCostPerM2,
        constructionCostPerM2,
        salesPricePerM2,
      })
      totalCost = feas.totalCost
      totalRevenue = feas.totalRevenue
      profit = feas.profit
      roi = Math.round(feas.roi * 10) / 10
    } catch { /* fallback: GA 계산값 사용 */ }
    
    allResults.push({
      coverage: data.coverage,
      floors: data.floors,
      units: data.units,
      gfa: data.gfa,
      parking: data.parking,
      totalCost,
      totalRevenue,
      profit,
      roi,
      unitSize: 84,
      solarScore: data.solarScore,
      winterSunlightHours: data.winterSunlightHours,
      northSolarMaxHeight: data.northSolarMaxHeight,
      shadowLength: data.shadowLength,
      viewScore: data.viewScore,
      isLegallyCompliant: data.isLegallyCompliant,
      violations: data.violations,
      buildingType,
      fitness: data.fitness,
    })
  }
  
  // 법규 준수안 우선 + ROI 정렬
  allResults.sort((a, b) => {
    if (a.isLegallyCompliant && !b.isLegallyCompliant) return -1
    if (!a.isLegallyCompliant && b.isLegallyCompliant) return 1
    return b.fitness - a.fitness
  })
  
  const best = allResults[0] || createFallbackResult(constraints)
  const alternatives = allResults.slice(1, 6)
  
  const totalEvals = Array.from(gaResults.values())
    .reduce((sum, r) => sum + r.solverStats.totalEvaluations, 0)
  
  const worst = allResults[allResults.length - 1]
  const improvement = worst && best.roi > worst.roi
    ? `GA 최적화로 ROI ${(best.roi - worst.roi).toFixed(1)}%p 개선 (일조 ${best.winterSunlightHours || '-'}시간 확보)`
    : `GA 최적 조합 탐색 완료 (${totalEvals}회 평가)`
  
  return {
    best,
    alternatives,
    searchSpace: totalEvals,
    improvement,
    solarEnvelope,
    gaResults,
    solverUsed: 'ga',
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 기존 Grid Search (하위 호환)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function optimizeLayout(constraints: OptimizationConstraints): OptimizationReport {
  const {
    siteArea, maxCoverage, maxFAR, maxFloors, maxHeight,
    parkingRatio, landCostPerM2, constructionCostPerM2, salesPricePerM2
  } = constraints

  const maxFloorsByHeight = Math.floor(maxHeight / 3.3)
  const effectiveMaxFloors = Math.min(maxFloors, maxFloorsByHeight)

  // 일조사선 분석 추가 (Phase 1)
  const solarEnvelope = analyzeSolarEnvelope({
    siteArea,
    heightLimit: maxHeight,
    roadWidth: 8,
    isResidential: true,
  })
  
  // 사선제한 반영 실효 최대 층수
  const solarMaxFloors = solarEnvelope.effectiveMaxFloors
  const finalMaxFloors = Math.min(effectiveMaxFloors, solarMaxFloors)

  const results: OptimizedResult[] = []

  // 파라미터 탐색 범위
  const coverageRange = Array.from({ length: 8 }, (_, i) => Math.min(maxCoverage, 30 + i * 5))
  const floorRange = Array.from({ length: finalMaxFloors }, (_, i) => i + 3).filter(f => f <= finalMaxFloors)
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
        if (units < 3) continue

        // 주차
        const parking = Math.ceil(units * parkingRatio)

        // calculateFeasibility와 동일한 공식 사용 (ROI 일치 보장)
        try {
          const feas = calculateFeasibility({
            siteArea,
            grossFloorArea: Math.round(gfa),
            unitCount: units,
            floorCount: floors,
            parkingCount: parking,
            landPricePerM2: landCostPerM2,
            constructionCostPerM2,
            salesPricePerM2,
          })

          results.push({
            coverage, floors, units, gfa: Math.round(gfa),
            parking, totalCost: feas.totalCost, totalRevenue: feas.totalRevenue,
            profit: feas.profit, roi: Math.round(feas.roi * 10) / 10, unitSize,
            // Phase 1: 일조 정보 추가
            winterSunlightHours: solarEnvelope.winterSunlightHours,
            northSolarMaxHeight: solarEnvelope.northSolarMaxHeight,
            shadowLength: solarEnvelope.shadowLengthM,
            isLegallyCompliant: floors <= solarMaxFloors,
          })
        } catch {
          // 계산 실패 시 건너뜀
        }
      }
    }
  }

  // ROI 기준 정렬 (법규 준수안 우선)
  results.sort((a, b) => {
    if (a.isLegallyCompliant && !b.isLegallyCompliant) return -1
    if (!a.isLegallyCompliant && b.isLegallyCompliant) return 1
    return b.roi - a.roi
  })

  const best = results[0] || createFallbackResult(constraints)

  // 상위 5개 대안
  const alternatives = results.slice(1, 6)

  // 최저 ROI 대비 개선율
  const worst = results[results.length - 1]
  const improvement = worst && best.roi > worst.roi
    ? `최적화로 ROI ${(best.roi - worst.roi).toFixed(1)}%p 개선`
    : '최적 조합 탐색 완료'

  return { 
    best, alternatives, searchSpace: searchCount, improvement, 
    solarEnvelope, solverUsed: 'grid' 
  }
}

/** Fallback result when no valid combinations found */
function createFallbackResult(constraints: OptimizationConstraints): OptimizedResult {
  return {
    coverage: constraints.maxCoverage, 
    floors: Math.min(constraints.maxFloors, Math.floor(constraints.maxHeight / 3.3)),
    units: 0, gfa: 0, parking: 0, totalCost: 0, totalRevenue: 0,
    profit: 0, roi: 0, unitSize: 84,
  }
}
