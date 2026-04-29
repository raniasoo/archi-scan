/**
 * @version v1.0.0
 * @description 전역 프로젝트 분석 상태 관리
 * 
 * 이 모듈은 Archi-Scan의 모든 단계에서 동일한 데이터를 사용하도록
 * 단일 소스의 진실(Single Source of Truth)을 제공합니다.
 */

import { ZoningRegulation, ZoneType, RoadCondition, ZONE_DEFAULTS, analyzeRegulations, RegulationAnalysis } from "./regulation-types"

// ============================================================
// 타입 정의
// ============================================================

/** 대상지 입력 데이터 */
export interface SiteInput {
  address: string
  siteArea: number // ㎡
  zoneType: ZoneType
  roadCondition: RoadConditionType
  roadWidth: number // m
  heightLimit: number // m
  floorLimit: number
  hasDistrictPlan: boolean
  districtPlanDetail: string
}

export type RoadConditionType = 
  | 'under-4m' 
  | '4m-plus' 
  | '6m-plus' 
  | '8m-plus' 
  | '12m-plus'

/** 법규 검토 요약 */
export interface LegalSummary {
  // 기본 정보
  zoningLabel: string
  zoneType: ZoneType
  
  // 법정 한도
  bcrLimit: number // 건폐율 한도 (%)
  farLimit: number // 용적률 한도 (%)
  heightLimitM: number // 높이 제한 (m)
  floorLimit: number // 층수 제한
  
  // 계산된 최대값
  maxBuildingAreaM2: number // 최대 건축면적
  maxGrossFloorAreaM2: number // 최대 연면적
  
  // 권장값
  recommendedFloorCount: number
  requiredParkingCount: number
  estimatedUnits: number
  
  // 사선 및 이격
  setbackRule: string
  
  // 지구단위
  districtPlanApplied: boolean
  districtPlanLabel: string
  
  // 출처 정보
  sources: {
    zoning: 'auto' | 'manual' | 'default'
    road: 'auto' | 'manual' | 'default'
    height: 'auto' | 'manual' | 'default'
    districtPlan: 'auto' | 'manual' | 'default'
  }
}

/** 배치안 결과 */
export interface PlanResult {
  id: number
  planType: 'tower' | 'courtyard' | 'lshape' | 'linear' | 'cluster'
  planName: string
  
  // 규모 정보
  buildingCoverage: number // 건폐율 (%)
  floorAreaRatio: number // 용적률 (%)
  floorCount: number // 층수
  unitCount: number // 세대수
  parkingCount: number // 주차대수
  grossFloorArea: number // 연면적 (㎡)
  buildingArea: number // 건축면적 (㎡)
  
  // 평가 점수
  layoutScore: number
  legalScore: number
  feasibilityScore: number
  productScore: number
  totalScore: number
  
  // 설명
  description: string
  features: string[]
  notes: string
  
  // 추천 여부
  isRecommended: boolean
}

/** 사업성 분석 결과 */
export interface FeasibilityResult {
  // 비용
  landCost: number // 토지 매입비
  constructionCost: number // 공사비
  softCost: number // 간접비
  totalCost: number // 총 투자비
  
  // 수익
  salesPricePerM2: number // ㎡당 분양가
  constructionCostPerM2: number // ㎡당 공사비
  totalRevenue: number // 예상 매출
  
  // 손익
  profit: number // 예상 손익
  roi: number // ROI (%)
  
  // 추가 분석
  breakevenSalePrice: number // 손익분기 분양가
  premiumRate: number // 프리미엄율 (%)
  projectDuration: number // 예상 사업기간 (개월)
  
  // 판단
  feasibilityGrade: 'excellent' | 'good' | 'normal' | 'poor' | 'critical'
  feasibilityLabel: string
  mainIssues: string[]
  improvements: string[]
}

/** 전체 프로젝트 분석 상태 */
export interface ProjectAnalysisState {
  // Step 1: 대상지 정보
  siteInput: SiteInput
  
  // Step 2: 법규 검토
  regulation: ZoningRegulation
  legalSummary: LegalSummary | null
  
  // Step 3: 전략 선택
  selectedStrategy: string | null
  
  // Step 4: 배치안 결과
  planResults: PlanResult[]
  selectedPlanId: number | null
  
  // Step 5: 사업성 분석
  feasibilityResult: FeasibilityResult | null
  
  // 메타 정보
  lastUpdated: string
  version: string
}

// ============================================================
// 기본값 생성 함수
// ============================================================

export function getDefaultSiteInput(): SiteInput {
  return {
    address: '',
    siteArea: 0,
    zoneType: 'residential-2',
    roadCondition: '8m-plus',
    roadWidth: 8,
    heightLimit: 30,
    floorLimit: 12,
    hasDistrictPlan: false,
    districtPlanDetail: '',
  }
}

export function getDefaultProjectState(): ProjectAnalysisState {
  return {
    siteInput: getDefaultSiteInput(),
    regulation: {
      zoneType: 'residential-2',
      maxCoverageRatio: 60,
      maxFloorAreaRatio: 200,
      maxHeight: 30,
      maxFloors: 12,
      roadWidth: 8,
      roadCondition: '8m',
      parkingRatio: 1.0,
      setbackType: 'north',
      setbackAngle: 45,
      setbackFront: 3,
      setbackSide: 1.5,
      setbackRear: 2,
      additionalNotes: '',
    },
    legalSummary: null,
    selectedStrategy: null,
    planResults: [],
    selectedPlanId: null,
    feasibilityResult: null,
    lastUpdated: new Date().toISOString(),
    version: '1.0.0',
  }
}

// ============================================================
// 법규 계산 공통 함수
// ============================================================

// ============================================================
// 공통 포맷 함수 (모든 컴포넌트에서 import하여 사용)
// ============================================================

/** 용도지역 라벨 매핑 */
export const ZONE_TYPE_LABELS: Record<string, string> = {
  'residential-1': '제1종 일반주거지역',
  'residential-2': '제2종 일반주거지역',
  'residential-3': '제3종 일반주거지역',
  'residential-exclusive-1': '제1종 전용주거지역',
  'residential-exclusive-2': '제2종 전용주거지역',
  'semi-residential': '준주거지역',
  'commercial-general': '일반상업지역',
  'commercial-neighborhood': '근린상업지역',
  'commercial-central': '중심상업지역',
  'industrial': '준공업지역',
  'industrial-general': '일반공업지역',
  'green-natural': '자연녹지지역',
  'custom': '직접 입력',
}

/** 접도 라벨 매핑 */
export const ROAD_CONDITION_LABELS: Record<string, string> = {
  'under-4m': '4m 미만 도로 접함',
  '4m-plus': '4m 이상 도로 접함',
  '6m-plus': '6m 이상 도로 접함',
  '8m-plus': '8m 이상 도로 접함',
  '12m-plus': '12m 이상 도로 접함',
  'corner': '코너 (2면 접도)',
  'three-side': '3면 접도',
}

/** 지구단위 라벨 포맷 (boolean -> string) */
export function formatDistrictPlan(value: boolean | null | undefined): string {
  if (value === true) return '있음'
  if (value === false) return '없음'
  return '미입력'
}

/** 용도지역 라벨 포맷 */
export function formatZoneType(value: string | null | undefined): string {
  if (!value) return '미입력'
  return ZONE_TYPE_LABELS[value] || value
}

/** 접도 라벨 포맷 */
export function formatRoadCondition(value: string | null | undefined): string {
  if (!value) return '미입력'
  return ROAD_CONDITION_LABELS[value] || value
}

/** 높이제한 라벨 포맷 */
export function formatHeightLimit(value: number | null | undefined): string {
  if (value == null || value <= 0) return '미입력'
  return `${value}m`
}

/** 층수 라벨 포맷 */
export function formatFloorLimit(heightM: number): string {
  const floors = Math.floor(heightM / 3.3)
  return `${floors}층 이하`
}

/**
 * 법규 검토 요약 계산 (공통 함수)
 * 모든 화면에서 이 함수를 사용하여 동일한 결과를 보장합니다.
 */
export function calculateLegalSummary(
  siteInput: SiteInput,
  regulation: ZoningRegulation,
  sources?: Partial<LegalSummary['sources']>
): LegalSummary {
  const siteArea = siteInput.siteArea || 660 // fallback
  
  // 용도지역별 기본값 적용
  const zoneDefaults = ZONE_DEFAULTS[regulation.zoneType] || ZONE_DEFAULTS['residential-2']
  
  const bcrLimit = regulation.maxCoverageRatio || zoneDefaults.maxCoverageRatio || 60
  const farLimit = regulation.maxFloorAreaRatio || zoneDefaults.maxFloorAreaRatio || 200
  const heightLimitM = regulation.maxHeight || zoneDefaults.maxHeight || 30
  const floorLimit = regulation.maxFloors || zoneDefaults.maxFloors || 12
  
  // 최대 면적 계산
  const maxBuildingAreaM2 = (siteArea * bcrLimit) / 100
  const maxGFAByFARM2 = (siteArea * farLimit) / 100
  const maxGFAByFloors2 = maxBuildingAreaM2 * floorLimit  // 층수 제한 기준
  const maxGrossFloorAreaM2 = Math.min(maxGFAByFARM2, maxGFAByFloors2)
  
  // 권장 층수 계산 (높이제한 / 층고 3.3m)
  const floorsByHeight = Math.floor(heightLimitM / 3.3)
  const floorsByFAR = Math.ceil(maxGrossFloorAreaM2 / maxBuildingAreaM2)
  const recommendedFloorCount = Math.min(floorLimit, floorsByHeight, Math.max(floorsByFAR, 3))
  
  // 예상 세대수 (세대당 평균 85㎡ 기준)
  const avgUnitSize = 85
  const estimatedUnits = Math.floor(maxGrossFloorAreaM2 / avgUnitSize)
  
  // 법정 주차대수 (서울시 조례: 전용 85m² 이하 소형주택은 0.7대/세대)
  const parkingPerUnitRate = avgUnitSize <= 60 ? 0.5 : avgUnitSize <= 85 ? 0.7 : 1.0
  const requiredParkingCount = Math.ceil(estimatedUnits * parkingPerUnitRate)
  
  // 사선 제한 규칙
  const setbackRule = regulation.setbackType === 'none' 
    ? '적용 없음'
    : regulation.setbackType === 'north'
    ? `북측사선제한 (${regulation.setbackAngle}°)`
    : regulation.setbackType === 'road'
    ? `도로사선제한 (${regulation.setbackAngle}°)`
    : `복합적용 (${regulation.setbackAngle}°)`
  
  return {
    zoningLabel: ZONE_TYPE_LABELS[regulation.zoneType] || '제2종 일반주거지역',
    zoneType: regulation.zoneType,
    bcrLimit,
    farLimit,
    heightLimitM,
    floorLimit,
    maxBuildingAreaM2,
    maxGrossFloorAreaM2,
    recommendedFloorCount,
    requiredParkingCount,
    estimatedUnits,
    setbackRule,
    districtPlanApplied: siteInput.hasDistrictPlan,
    districtPlanLabel: siteInput.hasDistrictPlan 
      ? (siteInput.districtPlanDetail || '지구단위계획 적용')
      : '해당 없음',
    sources: {
      zoning: sources?.zoning || 'default',
      road: sources?.road || 'default',
      height: sources?.height || 'default',
      districtPlan: sources?.districtPlan || 'default',
    },
  }
}

// ============================================================
// 사업성 계산 공통 함수
// ============================================================

export interface FeasibilityInput {
  siteArea: number // 대지면적 (㎡)
  grossFloorArea: number // 연면적 (㎡)
  unitCount: number // 세대수
  floorCount: number // 층수
  parkingCount: number // 주차대수
  landPricePerM2?: number // 토지 단가 (원/㎡)
  constructionCostPerM2?: number // 공사비 단가 (원/㎡)
  salesPricePerM2?: number // 분양가 단가 (원/㎡)
}

/**
 * 사업성 분석 계산 (공통 함수)
 * 모든 화면에서 이 함수를 사용하여 동일한 결과를 보장합니다.
 */
export function calculateFeasibility(input: FeasibilityInput): FeasibilityResult {
  const {
    siteArea,
    grossFloorArea,
    unitCount,
    floorCount,
    parkingCount,
    landPricePerM2 = 5000000, // 기본값: 500만원/㎡
    constructionCostPerM2 = 2500000, // 기본값: 250만원/㎡
    salesPricePerM2 = 8000000, // 기본값: 800만원/㎡
  } = input
  
  // 안전한 숫자 처리
  const safeSiteArea = Math.max(siteArea, 1)
  const safeGFA = Math.max(grossFloorArea, 1)
  const safeUnitCount = Math.max(unitCount, 1)
  
  // 비용 계산
  const landCost = safeSiteArea * landPricePerM2
  
  // 공사비 (층수에 따른 프리미엄 적용)
  const heightPremium = floorCount > 15 ? 1.15 : floorCount > 10 ? 1.08 : 1.0
  const constructionCost = safeGFA * constructionCostPerM2 * heightPremium
  
  // 간접비 (공사비의 15%)
  const softCost = constructionCost * 0.15
  
  // 지하주차장 비용 (주차 대수 × 3,000만원)
  const parkingCost = parkingCount * 30000000
  
  // 총 투자비
  const totalCost = landCost + constructionCost + softCost + parkingCost
  
  // 수익 계산
  const totalRevenue = safeGFA * salesPricePerM2
  
  // 손익 계산
  const profit = totalRevenue - totalCost
  
  // ROI 계산
  const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0
  
  // 손익분기 분양가
  const breakevenSalePrice = totalCost / safeGFA
  
  // 프리미엄율
  const premiumRate = breakevenSalePrice > 0 
    ? ((salesPricePerM2 - breakevenSalePrice) / breakevenSalePrice) * 100 
    : 0
  
  // 예상 사업기간 (층수 기반)
  const projectDuration = 18 + Math.ceil(floorCount * 1.5)
  
  // 사업성 등급 판정
  let feasibilityGrade: FeasibilityResult['feasibilityGrade']
  let feasibilityLabel: string
  
  if (roi >= 15) {
    feasibilityGrade = 'excellent'
    feasibilityLabel = '사업성 우수'
  } else if (roi >= 10) {
    feasibilityGrade = 'good'
    feasibilityLabel = '사업 추진 가능'
  } else if (roi >= 5) {
    feasibilityGrade = 'normal'
    feasibilityLabel = '조건부 가능'
  } else if (roi >= 0) {
    feasibilityGrade = 'poor'
    feasibilityLabel = '사업성 부족'
  } else {
    feasibilityGrade = 'critical'
    feasibilityLabel = '수익성 부족'
  }
  
  // 주요 이슈 파악
  const mainIssues: string[] = []
  const improvements: string[] = []
  
  if (landCost / totalCost > 0.5) {
    mainIssues.push('토지 매입비 비중 과다')
    improvements.push('토지 매입가 협상 또는 대안 부지 검토')
  }
  
  if (unitCount < 20) {
    mainIssues.push('세대수 부족으로 규모의 경제 미달')
    improvements.push('세대 구성 최적화 또는 소형 평형 비율 확대')
  }
  
  if (parkingCount > unitCount * 1.3) {
    mainIssues.push('주차 부담 과다')
    improvements.push('주차 방식 재설계 또는 기계식 주차 검토')
  }
  
  if (roi < 10) {
    mainIssues.push(`ROI ${roi.toFixed(1)}%로 투자 대비 수익률 부족`)
    improvements.push('분양가 상향 조정 또는 공사비 절감 방안 검토')
  }
  
  return {
    landCost,
    constructionCost,
    softCost,
    totalCost,
    salesPricePerM2,
    constructionCostPerM2,
    totalRevenue,
    profit,
    roi,
    breakevenSalePrice,
    premiumRate,
    projectDuration,
    feasibilityGrade,
    feasibilityLabel,
    mainIssues,
    improvements,
  }
}

// ============================================================
// 전략 기반 배치안 생성
// ============================================================

export interface StrategyBasedLayoutInput {
  siteArea: number
  legalSummary: LegalSummary
  strategy: string
}

/**
 * 전략 기반 배치안 예상치 계산 (mock 값 제거)
 * 실제 법규 검토 결과를 기반으로 예상치를 계산합니다.
 */
export function calculateStrategyEstimates(input: StrategyBasedLayoutInput) {
  const { siteArea, legalSummary, strategy } = input
  
  // 전략별 계수 (용적률 활용도)
  const strategyFactors: Record<string, { farUsage: number; densityLabel: string }> = {
    'view-priority': { farUsage: 0.75, densityLabel: '중밀도' },
    'privacy-priority': { farUsage: 0.70, densityLabel: '중저밀도' },
    'area-maximize': { farUsage: 0.95, densityLabel: '고밀도' },
    'parking-efficient': { farUsage: 0.80, densityLabel: '중밀도' },
    'profitability': { farUsage: 0.90, densityLabel: '고밀도' },
    'livability': { farUsage: 0.65, densityLabel: '저밀도' },
  }
  
  const factor = strategyFactors[strategy] || strategyFactors['area-maximize']
  
  // 실제 법규 기반 계산
  const effectiveFAR = legalSummary.farLimit * factor.farUsage
  const estimatedGFA = (siteArea * effectiveFAR) / 100
  const avgUnitSize = 85
  const estimatedUnits = Math.floor(estimatedGFA / avgUnitSize)
  
  // 층수 계산 (건폐율과 연면적 기반)
  const buildingArea = (siteArea * legalSummary.bcrLimit) / 100
  const estimatedFloors = Math.min(
    legalSummary.floorLimit,
    Math.ceil(estimatedGFA / buildingArea)
  )
  
  return {
    estimatedFloors: `${Math.max(estimatedFloors - 1, 3)}~${estimatedFloors}층`,
    estimatedUnits: `${Math.max(estimatedUnits - 5, 6)}~${estimatedUnits}세대`,
    estimatedCoverage: `${Math.round(legalSummary.bcrLimit * 0.85)}~${legalSummary.bcrLimit}%`,
    densityLabel: factor.densityLabel,
    farUsage: factor.farUsage,
  }
}

// ============================================================
// 유틸리티 함수
// ============================================================

/** 안전한 숫자 변환 */
export function safeNumber(value: unknown, fallback: number = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(/[^0-9.-]/g, ''))
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

/** 억원 포맷 */
export function formatBillion(value: number): string {
  return `${(value / 100000000).toFixed(1)}억원`
}

/** 퍼센트 포맷 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`
}

/** 면적 포맷 (㎡) */
export function formatArea(value: number): string {
  return `${value.toLocaleString()}㎡`
}

/** 면적 포맷 (평) */
export function formatPyeong(valueM2: number): string {
  return `${Math.round(valueM2 * 0.3025).toLocaleString()}평`
}

/** 로컬스토리지 저장 */
export function saveProjectState(state: ProjectAnalysisState): void {
  try {
    localStorage.setItem('archi-scan-project-state', JSON.stringify({
      ...state,
      lastUpdated: new Date().toISOString(),
    }))
  } catch (e) {
    console.warn('[v0] Failed to save project state to localStorage:', e)
  }
}

/** 로컬스토리지에서 불러오기 */
export function loadProjectState(): ProjectAnalysisState | null {
  try {
    const saved = localStorage.getItem('archi-scan-project-state')
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (e) {
    console.warn('[v0] Failed to load project state from localStorage:', e)
  }
  return null
}
