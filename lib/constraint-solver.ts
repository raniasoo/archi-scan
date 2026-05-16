/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Constraint-Driven Layout Generation Engine (Phase 1)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * 한국 건축법 제약조건 기반 유전 알고리즘(GA) 최적 배치 솔버
 * 
 * 주요 제약조건:
 *   1. 일조권 사선제한 (건축법 제61조) — 정북방향 높이제한
 *   2. 도로사선 제한 (건축법 제61조 2항) — 도로 폭 기반
 *   3. 건폐율/용적률 한도 (국계법 시행령)
 *   4. 이격거리 (건축법 제58조)
 *   5. 인동간격 (건축법 시행령 제86조) — 다동 배치 시
 *   6. 조경면적 (건축법 시행령 제27조의2)
 * 
 * 최적화 목표 (Multi-Objective):
 *   - ROI 최대화
 *   - 일조시간 확보 (동지 기준 4시간 이상)
 *   - 조망률 극대화
 *   - 법규 100% 준수
 */

import { calculateFeasibility, type FeasibilityResult } from './project-analysis-state'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** 대지 형상 (필지 polygon 또는 정방형 근사) */
export interface SiteGeometry {
  area: number            // 대지면적 (㎡)
  width: number           // 대지 폭 (m) — 동서 방향
  depth: number           // 대지 깊이 (m) — 남북 방향
  northBoundaryLength: number  // 북측 경계선 길이 (m)
  roadSide: 'south' | 'north' | 'east' | 'west'  // 접도 방향
  roadWidth: number       // 접도 폭 (m)
  latitude: number        // 위도 (기본 37.55 서울)
  slopePercent: number    // 경사도 (%)
}

/** 법규 제약조건 */
export interface LegalConstraints {
  maxCoverageRatio: number     // 최대 건폐율 (%)
  maxFloorAreaRatio: number    // 최대 용적률 (%)
  maxHeight: number            // 절대높이 제한 (m)
  maxFloors: number            // 최대 층수
  setbackFront: number         // 전면 이격 (m)
  setbackSide: number          // 측면 이격 (m)
  setbackRear: number          // 후면(북측) 이격 (m)
  northSolarApplied: boolean   // 정북방향 일조사선 적용 여부
  roadSlopeApplied: boolean    // 도로사선 적용 여부
  roadSlopeRatio: number       // 도로사선 비율 (1.5 = 1:1.5)
  parkingRatio: number         // 세대당 주차대수
  landscapeRatio: number       // 최소 조경 비율 (%)
  zoneType: string             // 용도지역
  isDistrictPlan: boolean      // 지구단위계획 여부
}

/** 건물 배치 유전자 (GA 개체) */
export interface BuildingGene {
  // 위치 (대지 중심 기준, 미터)
  offsetX: number       // 동서 오프셋 (m)
  offsetZ: number       // 남북 오프셋 (m, +는 북쪽)
  
  // 형태
  width: number         // 건물 폭 (m) — 동서
  depth: number         // 건물 깊이 (m) — 남북
  floors: number        // 층수
  rotation: number      // 회전각 (도, 0/90/180/270)
  
  // 유형
  buildingType: 'tower' | 'linear' | 'lshape' | 'courtyard' | 'cluster'
}

/** 단일 건물 블록 (GA 평가용) */
export interface BuildingPlacement {
  centerX: number       // 중심 X (m)
  centerZ: number       // 중심 Z (m, +는 북쪽)
  width: number         // 폭 (m)
  depth: number         // 깊이 (m)
  floors: number        // 층수
  height: number        // 높이 (m)
}

/** GA 평가 결과 */
export interface FitnessResult {
  // 종합 점수
  fitness: number                // 종합 적합도 (0~100)
  
  // 법규 준수
  coverageRatio: number          // 실제 건폐율 (%)
  floorAreaRatio: number         // 실제 용적률 (%)
  isLegallyCompliant: boolean    // 전체 법규 준수 여부
  violations: string[]           // 위반 사항 목록
  
  // 일조 분석
  solarScore: number             // 일조 점수 (0~100)
  winterSunlightHours: number    // 동지 일조시간 (시간)
  northSolarMaxHeight: number    // 정북사선 최대 허용 높이 (m)
  northSolarViolation: boolean   // 정북사선 위반 여부
  shadowLength: number           // 동지 그림자 길이 (m)
  
  // 인동간격 (다동 배치 시)
  buildingSpacing: number        // 최소 인동간격 (m)
  spacingCompliant: boolean      // 인동간격 준수 여부
  
  // 경제성
  roi: number                    // 투자수익률 (%)
  estimatedProfit: number        // 예상 수익 (원)
  units: number                  // 세대수
  gfa: number                    // 연면적 (㎡)
  
  // 거주 품질
  viewScore: number              // 조망 점수 (0~100)
  ventilationScore: number       // 통풍 점수 (0~100)
  privacyScore: number           // 프라이버시 점수 (0~100)
}

/** GA 솔버 설정 */
export interface SolverConfig {
  populationSize: number         // 개체 수 (기본 60)
  generations: number            // 세대 수 (기본 40)
  mutationRate: number           // 돌연변이 확률 (기본 0.15)
  crossoverRate: number          // 교차 확률 (기본 0.7)
  eliteRatio: number             // 엘리트 보존 비율 (기본 0.1)
  objectiveWeights: {
    roi: number                  // ROI 가중치 (기본 0.35)
    solar: number                // 일조 가중치 (기본 0.25)
    view: number                 // 조망 가중치 (기본 0.15)
    legal: number                // 법규 가중치 (기본 0.25)
  }
}

/** 최적화 결과 */
export interface OptimizationResult {
  best: {
    gene: BuildingGene
    placements: BuildingPlacement[]
    fitness: FitnessResult
  }
  alternatives: {
    gene: BuildingGene
    placements: BuildingPlacement[]
    fitness: FitnessResult
  }[]
  convergenceHistory: number[]   // 세대별 최고 적합도
  searchSpace: number            // 탐색 공간 크기
  solverStats: {
    totalEvaluations: number
    bestGeneration: number
    convergenceRate: number
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Constants
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const FLOOR_HEIGHT = 3.3         // 기본 층고 (m)
const CORE_EFFICIENCY = 0.72     // 코어 효율 (전용률)
const UNIT_SIZE_DEFAULT = 84     // 기본 전용면적 (㎡)

const DEFAULT_CONFIG: SolverConfig = {
  populationSize: 60,
  generations: 40,
  mutationRate: 0.15,
  crossoverRate: 0.7,
  eliteRatio: 0.1,
  objectiveWeights: {
    roi: 0.35,
    solar: 0.25,
    view: 0.15,
    legal: 0.25,
  },
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 일조권 사선제한 엔진 (건축법 제61조)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 정북방향 일조사선 제한에 의한 최대 건물 높이 계산
 * 
 * 건축법 제61조 제1항:
 *   - 높이 9m 이하: 인접대지경계선에서 1.5m 이상 이격
 *   - 높이 9m 초과: 인접대지경계선에서 해당 건축물 높이의 1/2 이상 이격
 * 
 * @param northSetback 북측 경계선까지의 거리 (m)
 * @param heightLimit 절대높이 제한 (m)
 * @returns 허용 최대 높이 (m)
 */
export function calcNorthSolarMaxHeight(
  northSetback: number,
  heightLimit: number
): number {
  if (northSetback < 1.5) {
    // 1.5m 미만 이격 시 9m도 불가
    return Math.min(9 * (northSetback / 1.5), heightLimit)
  }
  // 9m까지는 1.5m만 확보하면 됨
  // 9m 초과 시: 높이 = northSetback × 2 (높이의 1/2 = northSetback)
  const maxBySlope = 9 + (northSetback - 1.5) * 2
  return Math.min(maxBySlope, heightLimit)
}

/**
 * 도로사선 제한에 의한 최대 건물 높이 계산
 * 
 * 건축법 제61조 제2항:
 *   전면도로 반대편 경계선에서 건물까지의 수평거리 × 사선비율(1:1.5)
 */
export function calcRoadSlopeMaxHeight(
  roadWidth: number,
  frontSetback: number,
  slopeRatio: number,
  heightLimit: number
): number {
  if (slopeRatio <= 0) return heightLimit
  const horizontalDist = roadWidth + frontSetback
  return Math.min(horizontalDist * slopeRatio, heightLimit)
}

/**
 * 동지(12월 22일) 기준 그림자 길이 계산
 * 
 * @param buildingHeight 건물 높이 (m)
 * @param latitude 위도 (기본 서울 37.55°)
 * @returns 그림자 길이 (m) — 정남 방향
 */
export function calcWinterShadowLength(
  buildingHeight: number,
  latitude: number = 37.55
): number {
  // 동지 남중 태양 고도 = 90 - 위도 - 23.44
  const winterSunAngle = 90 - latitude - 23.44
  const tanAngle = Math.tan(winterSunAngle * Math.PI / 180)
  if (tanAngle <= 0) return buildingHeight * 5 // 극단 케이스
  return buildingHeight / tanAngle
}

/**
 * 동지 기준 예상 일조시간 계산
 * 남쪽 건물의 그림자가 북쪽 건물에 미치는 영향 분석
 * 
 * @param southBuildingHeight 남측 건물 높이 (m)
 * @param spacing 인동간격 (m)
 * @param latitude 위도
 * @returns 동지 일조시간 (시간)
 */
export function calcWinterSunlightHours(
  southBuildingHeight: number,
  spacing: number,
  latitude: number = 37.55
): number {
  const shadowLen = calcWinterShadowLength(southBuildingHeight, latitude)
  
  // 그림자가 건물까지 도달하지 않으면 일조 양호
  if (spacing >= shadowLen) return 6.0
  
  // 그림자 도달 비율에 따른 일조 감소
  const shadowRatio = spacing / shadowLen
  // 최소 2시간(법적 기준) ~ 최대 6시간
  return Math.max(2.0, 6.0 * shadowRatio)
}

/**
 * 인동간격 기준 검증 (건축법 시행령 제86조)
 * 
 * 공동주택 인동간격:
 *   - 채광방향 인동간격 ≥ 건물높이 × 0.8 (남북 방향)
 *   - 측벽 인동간격 ≥ 건물높이 × 0.25 (동서 방향, 최소 4m)
 *   - 동지 기준 4시간 이상 연속 일조 확보
 */
export function checkBuildingSpacing(
  placements: BuildingPlacement[],
  latitude: number = 37.55
): { compliant: boolean; minSpacing: number; violations: string[] } {
  if (placements.length < 2) {
    return { compliant: true, minSpacing: 0, violations: [] }
  }
  
  const violations: string[] = []
  let minSpacing = Infinity
  
  for (let i = 0; i < placements.length; i++) {
    for (let j = i + 1; j < placements.length; j++) {
      const a = placements[i]
      const b = placements[j]
      
      // 남북 간격 (채광방향)
      const nsGap = Math.abs(a.centerZ - b.centerZ) - (a.depth + b.depth) / 2
      // 동서 간격 (측벽)
      const ewGap = Math.abs(a.centerX - b.centerX) - (a.width + b.width) / 2
      
      const tallHeight = Math.max(a.height, b.height)
      
      // 채광방향 기준: 높이 × 0.8
      const requiredNS = tallHeight * 0.8
      if (nsGap < requiredNS && nsGap < ewGap) {
        // 남북 배치인 경우
        violations.push(
          `${i + 1}동↔${j + 1}동 채광 인동간격 ${nsGap.toFixed(1)}m < 필요 ${requiredNS.toFixed(1)}m`
        )
      }
      
      // 측벽 기준: 높이 × 0.25 (최소 4m)
      const requiredEW = Math.max(tallHeight * 0.25, 4)
      if (ewGap < requiredEW && ewGap < nsGap) {
        violations.push(
          `${i + 1}동↔${j + 1}동 측벽 간격 ${ewGap.toFixed(1)}m < 필요 ${requiredEW.toFixed(1)}m`
        )
      }
      
      const actualSpacing = Math.min(
        nsGap > 0 ? nsGap : Infinity,
        ewGap > 0 ? ewGap : Infinity
      )
      minSpacing = Math.min(minSpacing, actualSpacing)
      
      // 동지 일조 검증 (남쪽 건물이 그림자를 만드는 경우)
      const southBuilding = a.centerZ < b.centerZ ? a : b
      const northBuilding = a.centerZ < b.centerZ ? b : a
      const sunHours = calcWinterSunlightHours(
        southBuilding.height,
        Math.abs(northBuilding.centerZ - southBuilding.centerZ) - (northBuilding.depth + southBuilding.depth) / 2,
        latitude
      )
      if (sunHours < 4) {
        violations.push(
          `${i + 1}동↔${j + 1}동 동지 일조 ${sunHours.toFixed(1)}시간 < 법정 4시간`
        )
      }
    }
  }
  
  return {
    compliant: violations.length === 0,
    minSpacing: minSpacing === Infinity ? 0 : minSpacing,
    violations,
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 유전 알고리즘 엔진
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** 유전자 → 건물 배치로 변환 */
function geneToPlacement(gene: BuildingGene, site: SiteGeometry): BuildingPlacement[] {
  const height = gene.floors * FLOOR_HEIGHT
  const placements: BuildingPlacement[] = []
  
  switch (gene.buildingType) {
    case 'tower': {
      placements.push({
        centerX: gene.offsetX,
        centerZ: gene.offsetZ,
        width: gene.width,
        depth: gene.depth,
        floors: gene.floors,
        height,
      })
      break
    }
    case 'linear': {
      // 판상형: 동서 방향으로 넓은 단일 동
      placements.push({
        centerX: gene.offsetX,
        centerZ: gene.offsetZ,
        width: gene.width,
        depth: gene.depth,
        floors: gene.floors,
        height,
      })
      break
    }
    case 'lshape': {
      // ㄱ자형: 수직동 + 수평동
      const wingW = Math.min(gene.depth, gene.width * 0.4)
      // 수직 날개
      placements.push({
        centerX: gene.offsetX + gene.width / 2 - wingW / 2,
        centerZ: gene.offsetZ,
        width: wingW,
        depth: gene.depth,
        floors: gene.floors,
        height,
      })
      // 수평 날개
      placements.push({
        centerX: gene.offsetX,
        centerZ: gene.offsetZ - gene.depth / 2 + wingW / 2,
        width: gene.width,
        depth: wingW,
        floors: gene.floors,
        height,
      })
      break
    }
    case 'courtyard': {
      // 중정형: 3면 개방 (남측 개방)
      const wingW = Math.min(gene.depth * 0.25, gene.width * 0.2)
      // 북동
      placements.push({
        centerX: gene.offsetX,
        centerZ: gene.offsetZ - gene.depth / 2 + wingW / 2,
        width: gene.width,
        depth: wingW,
        floors: gene.floors,
        height,
      })
      // 서동
      placements.push({
        centerX: gene.offsetX - gene.width / 2 + wingW / 2,
        centerZ: gene.offsetZ + wingW / 2,
        width: wingW,
        depth: gene.depth - wingW,
        floors: gene.floors,
        height,
      })
      // 동동
      placements.push({
        centerX: gene.offsetX + gene.width / 2 - wingW / 2,
        centerZ: gene.offsetZ + wingW / 2,
        width: wingW,
        depth: gene.depth - wingW,
        floors: gene.floors,
        height,
      })
      break
    }
    case 'cluster': {
      // 클러스터: 여러 동 배치
      const footprint = gene.width * gene.depth
      const numBuildings = Math.max(2, Math.ceil(footprint / 200)) // 동당 ~200㎡
      const eachW = gene.width / Math.ceil(Math.sqrt(numBuildings))
      const eachD = gene.depth / Math.ceil(numBuildings / Math.ceil(Math.sqrt(numBuildings)))
      const cols = Math.ceil(Math.sqrt(numBuildings))
      const rows = Math.ceil(numBuildings / cols)
      const gapX = Math.max(4, eachW * 0.3)
      const gapZ = Math.max(gene.floors * FLOOR_HEIGHT * 0.8, 8) // 인동간격 자동 확보
      
      let cnt = 0
      for (let r = 0; r < rows && cnt < numBuildings; r++) {
        for (let c = 0; c < cols && cnt < numBuildings; c++) {
          const totalW = cols * eachW + (cols - 1) * gapX
          const totalD = rows * eachD + (rows - 1) * gapZ
          placements.push({
            centerX: gene.offsetX - totalW / 2 + eachW / 2 + c * (eachW + gapX),
            centerZ: gene.offsetZ - totalD / 2 + eachD / 2 + r * (eachD + gapZ),
            width: eachW,
            depth: eachD,
            floors: gene.floors,
            height,
          })
          cnt++
        }
      }
      break
    }
  }
  
  return placements
}

/** 건물이 대지 경계 내에 있는지 확인 */
function isWithinSiteBounds(
  placements: BuildingPlacement[],
  site: SiteGeometry,
  constraints: LegalConstraints
): boolean {
  const halfW = site.width / 2
  const halfD = site.depth / 2
  
  for (const p of placements) {
    const left = p.centerX - p.width / 2
    const right = p.centerX + p.width / 2
    const south = p.centerZ + p.depth / 2
    const north = p.centerZ - p.depth / 2
    
    // 이격거리 검증
    if (left < -halfW + constraints.setbackSide) return false
    if (right > halfW - constraints.setbackSide) return false
    if (south > halfD - constraints.setbackFront) return false  // 남(전면)
    if (north < -halfD + constraints.setbackRear) return false  // 북(후면)
  }
  
  return true
}

/** 적합도 함수: 유전자 → 종합 점수 */
function evaluateFitness(
  gene: BuildingGene,
  site: SiteGeometry,
  constraints: LegalConstraints,
  weights: SolverConfig['objectiveWeights'],
  economicParams?: { landCostPerM2?: number; constructionCostPerM2?: number; salesPricePerM2?: number }
): FitnessResult {
  const placements = geneToPlacement(gene, site)
  const violations: string[] = []
  
  // ── 건축면적 / 연면적 계산 ──
  const totalFootprint = placements.reduce((sum, p) => sum + p.width * p.depth, 0)
  const coverageRatio = (totalFootprint / site.area) * 100
  const gfa = placements.reduce((sum, p) => sum + p.width * p.depth * p.floors, 0)
  const floorAreaRatio = (gfa / site.area) * 100
  
  // ── 건폐율 검증 ──
  let legalScore = 100
  if (coverageRatio > constraints.maxCoverageRatio) {
    violations.push(`건폐율 ${coverageRatio.toFixed(1)}% > 법정 ${constraints.maxCoverageRatio}%`)
    legalScore -= 40
  }
  
  // ── 용적률 검증 ──
  if (floorAreaRatio > constraints.maxFloorAreaRatio) {
    violations.push(`용적률 ${floorAreaRatio.toFixed(1)}% > 법정 ${constraints.maxFloorAreaRatio}%`)
    legalScore -= 40
  }
  
  // ── 대지 경계 검증 ──
  if (!isWithinSiteBounds(placements, site, constraints)) {
    violations.push('건물이 이격거리를 초과하여 대지 경계를 벗어남')
    legalScore -= 30
  }
  
  // ── 정북방향 일조사선 검증 ──
  let northSolarMaxHeight = constraints.maxHeight
  let northSolarViolation = false
  if (constraints.northSolarApplied) {
    for (const p of placements) {
      // 건물 북측면에서 북측 경계까지의 거리
      const northEdge = p.centerZ - p.depth / 2
      const northSetback = (site.depth / 2) + northEdge // 경계선까지 거리
      const maxH = calcNorthSolarMaxHeight(northSetback, constraints.maxHeight)
      northSolarMaxHeight = Math.min(northSolarMaxHeight, maxH)
      
      if (p.height > maxH) {
        northSolarViolation = true
        violations.push(
          `정북사선 위반: 건물높이 ${p.height.toFixed(1)}m > 허용 ${maxH.toFixed(1)}m (이격 ${northSetback.toFixed(1)}m)`
        )
        legalScore -= 25
      }
    }
  }
  
  // ── 도로사선 검증 ──
  if (constraints.roadSlopeApplied && constraints.roadSlopeRatio > 0) {
    const maxHByRoad = calcRoadSlopeMaxHeight(
      site.roadWidth, constraints.setbackFront, constraints.roadSlopeRatio, constraints.maxHeight
    )
    for (const p of placements) {
      if (p.height > maxHByRoad) {
        violations.push(
          `도로사선 위반: 건물높이 ${p.height.toFixed(1)}m > 허용 ${maxHByRoad.toFixed(1)}m`
        )
        legalScore -= 15
      }
    }
  }
  
  // ── 층수/높이 검증 ──
  for (const p of placements) {
    if (p.floors > constraints.maxFloors) {
      violations.push(`층수 ${p.floors} > 법정 최대 ${constraints.maxFloors}층`)
      legalScore -= 20
    }
    if (p.height > constraints.maxHeight) {
      violations.push(`높이 ${p.height.toFixed(1)}m > 법정 ${constraints.maxHeight}m`)
      legalScore -= 20
    }
  }
  
  legalScore = Math.max(0, legalScore)
  
  // ── 인동간격 검증 ──
  const spacingResult = checkBuildingSpacing(placements, site.latitude)
  if (!spacingResult.compliant) {
    violations.push(...spacingResult.violations)
    legalScore = Math.max(0, legalScore - 15)
  }
  
  // ── 일조 분석 ──
  const tallestHeight = Math.max(...placements.map(p => p.height))
  const shadowLen = calcWinterShadowLength(tallestHeight, site.latitude)
  
  // 남측 건물이 없으면 일조 양호, 다동 배치 시 인동간격 기준
  let winterSunlightHours = 6.0
  if (placements.length >= 2) {
    // 남→북 정렬 후 인접 동 간 일조 계산
    const sorted = [...placements].sort((a, b) => a.centerZ - b.centerZ)
    let minSunHours = 8
    for (let i = 0; i < sorted.length - 1; i++) {
      const spacing = (sorted[i + 1].centerZ - sorted[i + 1].depth / 2) - 
                       (sorted[i].centerZ + sorted[i].depth / 2)
      const hours = calcWinterSunlightHours(sorted[i].height, Math.max(0, spacing), site.latitude)
      minSunHours = Math.min(minSunHours, hours)
    }
    winterSunlightHours = minSunHours
  }
  
  // 일조 점수 (법적 기준 4시간 이상)
  const solarScore = winterSunlightHours >= 6 ? 100 :
                     winterSunlightHours >= 4 ? 60 + (winterSunlightHours - 4) * 20 :
                     winterSunlightHours >= 2 ? 20 + (winterSunlightHours - 2) * 20 : 0
  
  // ── 세대수 / ROI 계산 ──
  const netArea = gfa * CORE_EFFICIENCY
  const units = Math.max(Math.floor(netArea / UNIT_SIZE_DEFAULT), 1)
  const parking = Math.ceil(units * constraints.parkingRatio)
  
  let roi = 0
  let estimatedProfit = 0
  try {
    const feasibility = calculateFeasibility({
      siteArea: site.area,
      grossFloorArea: Math.round(gfa),
      unitCount: units,
      floorCount: gene.floors,
      parkingCount: parking,
      landPricePerM2: economicParams?.landCostPerM2 || 5000000,
      constructionCostPerM2: economicParams?.constructionCostPerM2 || 4500000,
      salesPricePerM2: economicParams?.salesPricePerM2 || 8000000,
    })
    roi = feasibility.roi
    estimatedProfit = feasibility.profit
  } catch {
    // 계산 실패 시 근사값 사용
    const landCost = site.area * (economicParams?.landCostPerM2 || 5000000)
    const constCost = gfa * (economicParams?.constructionCostPerM2 || 4500000)
    const revenue = netArea * (economicParams?.salesPricePerM2 || 8000000)
    const totalCost = landCost + constCost
    estimatedProfit = revenue - totalCost
    roi = totalCost > 0 ? (estimatedProfit / totalCost) * 100 : 0
  }
  
  // ── 조망/통풍/프라이버시 점수 ──
  const openRatio = Math.max(0, 100 - coverageRatio)
  const viewScore = Math.min(100, openRatio * 1.2 + (gene.floors >= 5 ? 15 : 0))
  
  const ventilationScore = gene.buildingType === 'linear' ? 60 :
                           gene.buildingType === 'courtyard' ? 75 :
                           gene.buildingType === 'tower' ? 85 :
                           gene.buildingType === 'cluster' ? 90 : 70
  
  const privacyScore = gene.buildingType === 'cluster' ? 90 :
                       gene.buildingType === 'courtyard' ? 75 :
                       gene.buildingType === 'tower' ? 70 :
                       gene.buildingType === 'lshape' ? 80 : 65
  
  // ── 종합 적합도 계산 ──
  const roiScore = roi > 0 ? Math.min(100, roi * 3) : Math.max(0, 50 + roi)
  const isLegallyCompliant = violations.length === 0
  
  // 법규 위반 시 대폭 감점 (GA가 위반 개체를 자연도태시킴)
  const legalPenalty = isLegallyCompliant ? 1.0 : 0.3
  
  const fitness = Math.round(
    (roiScore * weights.roi +
     solarScore * weights.solar +
     viewScore * weights.view +
     legalScore * weights.legal) * legalPenalty
  )
  
  return {
    fitness,
    coverageRatio: Math.round(coverageRatio * 10) / 10,
    floorAreaRatio: Math.round(floorAreaRatio * 10) / 10,
    isLegallyCompliant,
    violations,
    solarScore,
    winterSunlightHours: Math.round(winterSunlightHours * 10) / 10,
    northSolarMaxHeight: Math.round(northSolarMaxHeight * 10) / 10,
    northSolarViolation,
    shadowLength: Math.round(shadowLen * 10) / 10,
    buildingSpacing: spacingResult.minSpacing,
    spacingCompliant: spacingResult.compliant,
    roi: Math.round(roi * 10) / 10,
    estimatedProfit,
    units,
    gfa: Math.round(gfa),
    viewScore: Math.round(viewScore),
    ventilationScore,
    privacyScore,
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 초기 집단 생성
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** 제약조건 범위 내 랜덤 유전자 생성 */
function createRandomGene(
  site: SiteGeometry,
  constraints: LegalConstraints,
  buildingType: BuildingGene['buildingType']
): BuildingGene {
  const maxBuildingArea = site.area * constraints.maxCoverageRatio / 100
  const usableW = site.width - constraints.setbackSide * 2
  const usableD = site.depth - constraints.setbackFront - constraints.setbackRear
  
  // 건물 치수 (제약 범위 내 랜덤)
  const coverageVariant = 0.5 + Math.random() * 0.5 // 50~100% of max coverage
  const targetArea = maxBuildingArea * coverageVariant
  
  let width: number, depth: number
  
  switch (buildingType) {
    case 'tower':
      // 타워: 1:1 ~ 1:1.5 비율
      width = Math.min(usableW * 0.6, Math.sqrt(targetArea * 1.3))
      depth = targetArea / width
      break
    case 'linear':
      // 판상형: 3:1 ~ 4:1 비율 (동서 방향 긴 형태)
      width = Math.min(usableW * 0.9, Math.sqrt(targetArea * 3.5))
      depth = targetArea / width
      break
    case 'lshape':
      // L자형: 총 면적의 1.3배 범위 (두 날개 합산)
      width = Math.min(usableW * 0.7, Math.sqrt(targetArea * 1.5))
      depth = Math.min(usableD * 0.8, targetArea * 0.7 / (width * 0.3))
      break
    case 'courtyard':
      // 중정형: 넓은 범위
      width = Math.min(usableW * 0.8, Math.sqrt(targetArea * 2))
      depth = Math.min(usableD * 0.8, Math.sqrt(targetArea * 2))
      break
    case 'cluster':
      // 클러스터: 전체 배치 영역
      width = usableW * (0.6 + Math.random() * 0.3)
      depth = usableD * (0.6 + Math.random() * 0.3)
      break
    default:
      width = Math.sqrt(targetArea)
      depth = width
  }
  
  // 층수 (사선제한 고려)
  const maxFloorsByHeight = Math.floor(constraints.maxHeight / FLOOR_HEIGHT)
  const maxFloors = Math.min(constraints.maxFloors, maxFloorsByHeight)
  const floors = Math.max(3, Math.ceil(maxFloors * (0.5 + Math.random() * 0.5)))
  
  // 위치 (대지 중심 기준 오프셋 — 남측 배치 선호)
  const maxOffsetX = (usableW - width) / 2
  const maxOffsetZ = (usableD - depth) / 2
  const offsetX = (Math.random() * 2 - 1) * maxOffsetX * 0.5
  // 남측 배치 선호 (일조 유리): 오프셋을 양수(남쪽) 방향으로 편향
  const offsetZ = -maxOffsetZ * 0.3 + Math.random() * maxOffsetZ * 0.6
  
  return {
    offsetX,
    offsetZ,
    width: Math.max(8, width),  // 최소 8m
    depth: Math.max(8, depth),  // 최소 8m
    floors,
    rotation: 0,
    buildingType,
  }
}

/** 교차 (Crossover) */
function crossover(parent1: BuildingGene, parent2: BuildingGene): BuildingGene {
  return {
    offsetX: Math.random() > 0.5 ? parent1.offsetX : parent2.offsetX,
    offsetZ: Math.random() > 0.5 ? parent1.offsetZ : parent2.offsetZ,
    width: parent1.width * 0.5 + parent2.width * 0.5,
    depth: parent1.depth * 0.5 + parent2.depth * 0.5,
    floors: Math.random() > 0.5 ? parent1.floors : parent2.floors,
    rotation: Math.random() > 0.5 ? parent1.rotation : parent2.rotation,
    buildingType: parent1.buildingType, // 같은 타입끼리만 교차
  }
}

/** 돌연변이 (Mutation) */
function mutate(gene: BuildingGene, site: SiteGeometry, constraints: LegalConstraints): BuildingGene {
  const mutated = { ...gene }
  const r = Math.random()
  
  if (r < 0.2) {
    // 위치 변이
    mutated.offsetX += (Math.random() * 2 - 1) * site.width * 0.1
    mutated.offsetZ += (Math.random() * 2 - 1) * site.depth * 0.1
  } else if (r < 0.4) {
    // 크기 변이
    mutated.width *= 0.85 + Math.random() * 0.3
    mutated.depth *= 0.85 + Math.random() * 0.3
  } else if (r < 0.6) {
    // 층수 변이
    mutated.floors += Math.random() > 0.5 ? 1 : -1
    mutated.floors = Math.max(3, Math.min(constraints.maxFloors, mutated.floors))
  } else if (r < 0.8) {
    // 남측 배치 최적화 (일조 개선 방향)
    mutated.offsetZ = Math.max(mutated.offsetZ, mutated.offsetZ + site.depth * 0.05)
  } else {
    // 건폐율 최적화 (법규 한도에 가까이)
    const targetFP = site.area * constraints.maxCoverageRatio / 100 * 0.9
    const currentFP = mutated.width * mutated.depth
    const scale = Math.sqrt(targetFP / currentFP)
    mutated.width *= scale
    mutated.depth *= scale
  }
  
  // 범위 제한
  mutated.width = Math.max(8, mutated.width)
  mutated.depth = Math.max(8, mutated.depth)
  
  return mutated
}

/** 토너먼트 선택 */
function tournamentSelect(
  population: { gene: BuildingGene; fitness: FitnessResult }[],
  tournamentSize: number = 3
): BuildingGene {
  let best = population[Math.floor(Math.random() * population.length)]
  for (let i = 1; i < tournamentSize; i++) {
    const candidate = population[Math.floor(Math.random() * population.length)]
    if (candidate.fitness.fitness > best.fitness.fitness) {
      best = candidate
    }
  }
  return { ...best.gene }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 메인 솔버
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 제약조건 기반 GA 최적 배치 솔버
 * 
 * 5개 배치 유형(tower, linear, lshape, courtyard, cluster) 각각에 대해
 * GA를 실행하여 최적 배치를 찾고, 타입 간 비교하여 최종 추천안을 도출
 * 
 * @param site 대지 형상
 * @param constraints 법규 제약조건
 * @param config GA 설정 (선택)
 * @param economicParams 경제성 파라미터 (선택)
 * @returns 타입별 최적 결과
 */
export function solveOptimalLayout(
  site: SiteGeometry,
  constraints: LegalConstraints,
  config: Partial<SolverConfig> = {},
  economicParams?: { landCostPerM2?: number; constructionCostPerM2?: number; salesPricePerM2?: number }
): Map<BuildingGene['buildingType'], OptimizationResult> {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  const results = new Map<BuildingGene['buildingType'], OptimizationResult>()
  
  const buildingTypes: BuildingGene['buildingType'][] = ['tower', 'linear', 'lshape', 'courtyard', 'cluster']
  
  for (const buildingType of buildingTypes) {
    const result = runGA(site, constraints, cfg, buildingType, economicParams)
    results.set(buildingType, result)
  }
  
  return results
}

/** 단일 배치 타입에 대한 GA 실행 */
function runGA(
  site: SiteGeometry,
  constraints: LegalConstraints,
  config: SolverConfig,
  buildingType: BuildingGene['buildingType'],
  economicParams?: { landCostPerM2?: number; constructionCostPerM2?: number; salesPricePerM2?: number }
): OptimizationResult {
  const { populationSize, generations, mutationRate, crossoverRate, eliteRatio, objectiveWeights } = config
  const eliteCount = Math.max(1, Math.floor(populationSize * eliteRatio))
  
  // 초기 집단 생성
  let population = Array.from({ length: populationSize }, () => {
    const gene = createRandomGene(site, constraints, buildingType)
    const placements = geneToPlacement(gene, site)
    const fitness = evaluateFitness(gene, site, constraints, objectiveWeights, economicParams)
    return { gene, placements, fitness }
  })
  
  const convergenceHistory: number[] = []
  let bestEver = population[0]
  let bestGeneration = 0
  let totalEvaluations = populationSize
  
  // 세대 반복
  for (let gen = 0; gen < generations; gen++) {
    // 적합도 기준 정렬
    population.sort((a, b) => b.fitness.fitness - a.fitness.fitness)
    
    // 최고 기록 갱신
    if (population[0].fitness.fitness > bestEver.fitness.fitness) {
      bestEver = { ...population[0], gene: { ...population[0].gene } }
      bestGeneration = gen
    }
    convergenceHistory.push(population[0].fitness.fitness)
    
    // 엘리트 보존
    const nextGen = population.slice(0, eliteCount).map(p => ({
      gene: { ...p.gene },
      placements: [...p.placements],
      fitness: { ...p.fitness },
    }))
    
    // 나머지 개체 생성
    while (nextGen.length < populationSize) {
      let child: BuildingGene
      
      if (Math.random() < crossoverRate) {
        // 교차
        const p1 = tournamentSelect(population)
        const p2 = tournamentSelect(population)
        child = crossover(p1, p2)
      } else {
        // 복제
        child = { ...tournamentSelect(population) }
      }
      
      // 돌연변이
      if (Math.random() < mutationRate) {
        child = mutate(child, site, constraints)
      }
      
      const placements = geneToPlacement(child, site)
      const fitness = evaluateFitness(child, site, constraints, objectiveWeights, economicParams)
      totalEvaluations++
      
      nextGen.push({ gene: child, placements, fitness })
    }
    
    population = nextGen
  }
  
  // 최종 정렬
  population.sort((a, b) => b.fitness.fitness - a.fitness.fitness)
  
  // 법규 준수안 중 최적 선택
  const compliant = population.filter(p => p.fitness.isLegallyCompliant)
  const best = compliant.length > 0 ? compliant[0] : population[0]
  
  // 상위 5개 대안 (중복 제거)
  const alternatives = population
    .filter(p => p !== best)
    .slice(0, 5)
  
  const convergenceRate = convergenceHistory.length > 5
    ? (convergenceHistory[convergenceHistory.length - 1] - convergenceHistory[0]) / convergenceHistory.length
    : 0
  
  return {
    best: {
      gene: best.gene,
      placements: best.placements,
      fitness: best.fitness,
    },
    alternatives: alternatives.map(a => ({
      gene: a.gene,
      placements: a.placements,
      fitness: a.fitness,
    })),
    convergenceHistory,
    searchSpace: totalEvaluations,
    solverStats: {
      totalEvaluations,
      bestGeneration,
      convergenceRate,
    },
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 편의 함수: 기존 시스템과의 브릿지
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 기존 regulation/site 데이터 → SiteGeometry 변환
 */
export function toSiteGeometry(
  siteArea: number,
  roadWidth: number = 8,
  latitude: number = 37.55,
  slopePercent: number = 0,
  siteWidthOverride?: number,
  siteDepthOverride?: number,
  roadSide: SiteGeometry['roadSide'] = 'south'
): SiteGeometry {
  const side = Math.sqrt(siteArea)
  return {
    area: siteArea,
    width: siteWidthOverride || side,
    depth: siteDepthOverride || side,
    northBoundaryLength: siteWidthOverride || side,
    roadSide,
    roadWidth,
    latitude,
    slopePercent,
  }
}

/**
 * 기존 ZoningRegulation → LegalConstraints 변환
 */
export function toLegalConstraints(
  regulation: {
    maxCoverageRatio: number
    maxFloorAreaRatio: number
    maxHeight: number
    maxFloors: number
    roadWidth: number
    parkingRatio: number
    setbackFront?: number
    setbackSide?: number
    setbackRear?: number
    zoneType?: string
  },
  landscapeRatio: number = 5,
  isDistrictPlan: boolean = false
): LegalConstraints {
  const zoneType = regulation.zoneType || 'residential-2'
  const isResidential = zoneType.includes('residential') && !zoneType.includes('semi')
  
  return {
    maxCoverageRatio: regulation.maxCoverageRatio,
    maxFloorAreaRatio: regulation.maxFloorAreaRatio,
    maxHeight: regulation.maxHeight,
    maxFloors: regulation.maxFloors,
    setbackFront: regulation.setbackFront || (isDistrictPlan ? 2 : 1),
    setbackSide: regulation.setbackSide || (isResidential ? 1 : 0.5),
    setbackRear: regulation.setbackRear || (isResidential ? 1.5 : 1),
    northSolarApplied: isResidential,
    roadSlopeApplied: isResidential,
    roadSlopeRatio: isResidential ? 1.5 : 0,
    parkingRatio: regulation.parkingRatio,
    landscapeRatio,
    zoneType,
    isDistrictPlan,
  }
}

/**
 * GA 결과를 기존 LayoutOption 형식에 가까운 데이터로 변환
 * page.tsx의 generateLayouts에서 사용
 */
export function gaResultToLayoutData(
  result: OptimizationResult,
  buildingType: BuildingGene['buildingType']
): {
  coverage: number
  floors: number
  units: number
  gfa: number
  parking: number
  roi: number
  solarScore: number
  winterSunlightHours: number
  northSolarMaxHeight: number
  shadowLength: number
  viewScore: number
  isLegallyCompliant: boolean
  violations: string[]
  fitness: number
  solverStats: OptimizationResult['solverStats']
} {
  const { fitness } = result.best
  return {
    coverage: fitness.coverageRatio,
    floors: result.best.gene.floors,
    units: fitness.units,
    gfa: fitness.gfa,
    parking: Math.ceil(fitness.units * 0.7), // 간이 계산
    roi: fitness.roi,
    solarScore: fitness.solarScore,
    winterSunlightHours: fitness.winterSunlightHours,
    northSolarMaxHeight: fitness.northSolarMaxHeight,
    shadowLength: fitness.shadowLength,
    viewScore: fitness.viewScore,
    isLegallyCompliant: fitness.isLegallyCompliant,
    violations: fitness.violations,
    fitness: fitness.fitness,
    solverStats: result.solverStats,
  }
}
