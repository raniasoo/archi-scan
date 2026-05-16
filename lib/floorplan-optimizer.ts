/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Phase 2: Intelligent Floor Plan Optimizer
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * 한국 공동주택 단위세대 평면 자동 매칭 & 최적 배치 엔진
 *
 * 핵심 기능:
 *   1. 조건 기반 세대 타입 자동 매칭 (면적 + 세대수 + 향)
 *   2. 코어 배치 최적화 (양면 통풍, 남향 극대화)
 *   3. 세대 믹스 최적화 (소형:중형:대형 비율)
 *   4. 일조사선 반영 실 배치 (안방→남향, 침실→동향)
 *   5. 복도/계단 효율 최적화 (편복도 vs 중복도)
 *
 * 한국 공동주택 설계 표준:
 *   - 전용 59㎡ = 소형 (국민주택 기준)
 *   - 전용 74㎡ = 중소형
 *   - 전용 84㎡ = 국민 표준형
 *   - 전용 115㎡ = 중대형
 *   - 전용 135㎡+ = 대형
 *   - 베이수: 2베이 ~ 4베이 (전면 폭에 따라)
 *   - 층고: 2.9m (주거), 층높이: 3.3m (슬래브 포함)
 */

import {
  getCatalog,
  getTemplate,
  getVariants,
  getSizeSpec,
  applyPatternModifiers,
  type UnitTemplate,
  type RoomDef,
} from './floorplan-templates'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** 건축 조건 입력 */
export interface FloorPlanConstraints {
  buildingType: 'tower' | 'linear' | 'lshape' | 'courtyard' | 'cluster'
  totalUnits: number              // 총 세대수
  floors: number                  // 층수
  buildingArea: number            // 건축면적 (㎡)
  buildingWidth: number           // 건물 폭 (m) — 전면 방향
  buildingDepth: number           // 건물 깊이 (m) — 측면 방향
  
  // 시장/사업성 조건
  targetUnitSize: 'small' | 'medium' | 'large' | 'mixed'
  targetAudience?: 'singles' | 'couples' | 'families' | 'investors'
  
  // 환경 조건
  primaryOrientation: 'south' | 'southeast' | 'southwest' | 'east' | 'west'
  southOpen: boolean              // 남측 개방 여부
  
  // Phase 1 일조 데이터
  solarData?: {
    winterSunlightHours: number
    shadowLength: number
    northSolarMaxHeight: number
    effectiveMaxFloors: number
  }
  
  // 사용자 선호 패턴
  selectedPatterns?: string[]
  
  // 용도지역 정보
  zoneType?: string
  buildingUse?: string            // apartment, multi-family, officetel 등
}

/** 단위세대 배치 결과 */
export interface UnitPlacement {
  unitId: string                  // 세대 식별자 (e.g., "101호", "A타입")
  templateId: string              // 매칭된 템플릿 ID
  templateName: string            // 템플릿 이름
  type: string                    // 원룸/투룸/쓰리룸 등
  size: 'S' | 'M' | 'L'
  variant: string                 // A/B/C/D
  area: number                    // 전용면적 (㎡)
  
  // 배치 위치
  x: number                      // 좌측 기준 위치 (m)
  y: number                      // 상단 기준 위치 (m)
  width: number                  // 폭 (m)
  height: number                 // 깊이 (m)
  mirrored: boolean              // 좌우 반전 여부
  
  // 향 분석
  orientation: string             // 남향/남동향/남서향/동향/서향
  bayCount: number                // 베이수
  sunlightScore: number           // 채광 점수 (0~100)
  ventilationScore: number        // 통풍 점수 (0~100)
  
  // 실 데이터
  rooms: RoomDef[]
}

/** 코어 배치 결과 */
export interface CorePlacement {
  x: number
  y: number
  width: number
  height: number
  elevatorCount: number
  stairCount: number
  type: 'center' | 'side' | 'corner' | 'dual'
}

/** 층 평면 결과 */
export interface FloorPlanResult {
  units: UnitPlacement[]
  core: CorePlacement
  corridor: {
    type: 'single' | 'double' | 'skip' // 편복도/중복도/스킵
    width: number                       // 복도 폭 (m)
    length: number                      // 복도 길이 (m)
  }
  buildingWidth: number
  buildingDepth: number
  unitsPerFloor: number
  grossAreaPerFloor: number        // 층당 연면적 (㎡)
  netAreaPerFloor: number          // 층당 전용면적 합계 (㎡)
  coreEfficiency: number           // 코어 효율 (전용률 %)
}

/** 세대 믹스 */
export interface UnitMix {
  type: string
  size: 'S' | 'M' | 'L'
  variant: string
  count: number
  area: number
  percentage: number               // 전체 대비 비율 (%)
}

/** 전체 최적화 결과 */
export interface FloorPlanOptimizationResult {
  floorPlan: FloorPlanResult
  unitMix: UnitMix[]
  totalNetArea: number             // 총 전용면적 (㎡)
  averageUnitArea: number          // 평균 전용면적 (㎡)
  coreEfficiency: number           // 전체 전용률 (%)
  solarScore: number               // 일조 점수 (0~100)
  ventilationScore: number         // 통풍 점수 (0~100)
  marketabilityScore: number       // 분양성 점수 (0~100)
  summary: string                  // 평면 설명
  recommendations: string[]        // 개선 제안
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Constants
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** 한국 표준 세대 타입별 면적 범위 */
const UNIT_TYPE_RANGES: Record<string, { minArea: number; maxArea: number; targetFor: string[] }> = {
  '원룸':     { minArea: 14, maxArea: 24, targetFor: ['singles', 'investors'] },
  '1.5룸':   { minArea: 24, maxArea: 33, targetFor: ['singles', 'couples'] },
  '투룸':     { minArea: 33, maxArea: 49, targetFor: ['singles', 'couples', 'investors'] },
  '투룸+':   { minArea: 49, maxArea: 62, targetFor: ['couples', 'investors'] },
  '쓰리룸':   { minArea: 62, maxArea: 85, targetFor: ['couples', 'families'] },
  '쓰리룸+': { minArea: 85, maxArea: 115, targetFor: ['families'] },
  '포룸':     { minArea: 115, maxArea: 145, targetFor: ['families'] },
  '복층':     { minArea: 100, maxArea: 180, targetFor: ['families'] },
}

/** 타겟 세대 사이즈별 기본 믹스 비율 */
const DEFAULT_UNIT_MIX: Record<string, { type: string; size: 'S' | 'M' | 'L'; ratio: number }[]> = {
  small: [
    { type: '원룸', size: 'M', ratio: 0.3 },
    { type: '1.5룸', size: 'M', ratio: 0.3 },
    { type: '투룸', size: 'M', ratio: 0.4 },
  ],
  medium: [
    { type: '투룸', size: 'L', ratio: 0.2 },
    { type: '투룸+', size: 'M', ratio: 0.3 },
    { type: '쓰리룸', size: 'M', ratio: 0.5 },
  ],
  large: [
    { type: '쓰리룸', size: 'L', ratio: 0.3 },
    { type: '쓰리룸+', size: 'M', ratio: 0.4 },
    { type: '포룸', size: 'M', ratio: 0.3 },
  ],
  mixed: [
    { type: '투룸', size: 'M', ratio: 0.15 },
    { type: '투룸+', size: 'M', ratio: 0.25 },
    { type: '쓰리룸', size: 'S', ratio: 0.35 },
    { type: '쓰리룸', size: 'L', ratio: 0.25 },
  ],
}

/** 용도별 세대 타입 제약 */
const USE_TYPE_CONSTRAINTS: Record<string, string[]> = {
  'apartment': ['투룸+', '쓰리룸', '쓰리룸+', '포룸'],
  'multi-family': ['원룸', '1.5룸', '투룸', '투룸+', '쓰리룸'],
  'officetel': ['원룸', '1.5룸', '투룸'],
  'single-family': ['쓰리룸+', '포룸', '복층'],
}

/** 코어 크기 기준 (세대수별) */
const CORE_SPECS = {
  small:  { width: 5.0, height: 6.0, elevators: 1, stairs: 1 },  // ≤ 6세대/층
  medium: { width: 6.5, height: 7.0, elevators: 2, stairs: 1 },  // 7~12세대/층
  large:  { width: 8.0, height: 8.0, elevators: 2, stairs: 2 },  // 13세대+/층
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 세대 믹스 최적화
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 건축 조건에 맞는 최적 세대 믹스를 결정합니다.
 * 
 * 고려 요소:
 *   - 건축면적 대비 세대수 (층당)
 *   - 타겟 수요층 (1인/신혼/가족/투자)
 *   - 용도지역 허용 건물용도
 *   - 사업성 (소형 세대 비율 높을수록 분양가 총액↑)
 */
export function optimizeUnitMix(constraints: FloorPlanConstraints): UnitMix[] {
  const {
    totalUnits, floors, buildingArea,
    targetUnitSize, targetAudience, buildingUse, zoneType,
  } = constraints
  
  const unitsPerFloor = Math.max(1, Math.ceil(totalUnits / Math.max(1, floors - 1))) // 1층 제외
  
  // 층당 전용면적 (코어 효율 72% 기준)
  const netAreaPerFloor = buildingArea * 0.72
  // 세대당 목표 면적
  const targetUnitArea = netAreaPerFloor / unitsPerFloor
  
  // 용도별 허용 타입 필터
  const allowedTypes = USE_TYPE_CONSTRAINTS[buildingUse || 'multi-family'] || 
                       Object.keys(UNIT_TYPE_RANGES)
  
  // 기본 믹스 비율 가져오기
  let baseMix = DEFAULT_UNIT_MIX[targetUnitSize] || DEFAULT_UNIT_MIX.mixed
  
  // 허용 타입으로 필터링
  baseMix = baseMix.filter(m => allowedTypes.includes(m.type))
  
  // ━━━ 핵심 수정: 믹스 타입 수를 층당 세대수에 맞게 축소 ━━━
  // unitsPerFloor=2인데 타입이 4개면 각 타입 최소 1세대 → 4세대로 불일치 발생
  // 따라서 타입 수를 층당 세대수 이하로 제한
  if (baseMix.length > unitsPerFloor) {
    // 비율이 높은 순으로 정렬 후 상위 N개만 유지
    baseMix = [...baseMix]
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, unitsPerFloor)
  }
  
  // 필터 후 비율 없으면 허용 타입에서 자동 생성
  if (baseMix.length === 0) {
    // 목표 면적에 가장 가까운 허용 타입 찾기
    const bestType = allowedTypes.reduce((best, type) => {
      const range = UNIT_TYPE_RANGES[type]
      if (!range) return best
      const mid = (range.minArea + range.maxArea) / 2
      const diff = Math.abs(mid - targetUnitArea)
      return diff < (best.diff || Infinity) ? { type, diff } : best
    }, { type: allowedTypes[0], diff: Infinity })
    
    baseMix = [{ type: bestType.type, size: 'M' as const, ratio: 1.0 }]
  }
  
  // 비율 정규화
  const totalRatio = baseMix.reduce((sum, m) => sum + m.ratio, 0)
  
  // 세대수 배분 — 타입 수 ≤ unitsPerFloor 보장됨
  const unitMix: UnitMix[] = baseMix.map(m => {
    const normalizedRatio = m.ratio / totalRatio
    // 최소 1세대 보장하되, 총합이 unitsPerFloor를 넘지 않도록
    const count = Math.max(1, Math.round(unitsPerFloor * normalizedRatio))
    const template = getTemplate(m.type, m.size)
    const area = template?.area || targetUnitArea
    
    return {
      type: m.type,
      size: m.size,
      variant: 'A', // 기본 A타입
      count,
      area,
      percentage: Math.round(normalizedRatio * 100),
    }
  })
  
  // 세대수 합계 조정 (반올림 차이 보정)
  const currentTotal = unitMix.reduce((sum, m) => sum + m.count, 0)
  if (currentTotal !== unitsPerFloor && unitMix.length > 0) {
    const diff = unitsPerFloor - currentTotal
    // 가장 큰 비율의 타입에서 조정
    const largest = unitMix.reduce((a, b) => a.count > b.count ? a : b)
    largest.count = Math.max(1, largest.count + diff)
  }
  
  // 변형 다양성 추가 (같은 타입이 3개 이상이면 B타입도 포함)
  const diversified: UnitMix[] = []
  for (const mix of unitMix) {
    if (mix.count >= 3) {
      const aCount = Math.ceil(mix.count * 0.6)
      const bCount = mix.count - aCount
      diversified.push({ ...mix, variant: 'A', count: aCount })
      if (bCount > 0) {
        diversified.push({ ...mix, variant: 'B', count: bCount })
      }
    } else {
      diversified.push(mix)
    }
  }
  
  return diversified
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 코어 배치 최적화
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 건물 유형에 따른 최적 코어 위치를 결정합니다.
 * 
 * 설계 원칙:
 *   - 타워형: 중앙 코어 (조망 극대화)
 *   - 판상형: 중앙 or 양단 코어 (동선 효율)
 *   - ㄱ자형: 교차점 코어 (동선 최단)
 *   - 중정형: 중앙 코어 (순환 동선)
 */
function optimizeCorePosition(
  buildingType: string,
  buildingWidth: number,
  buildingDepth: number,
  unitsPerFloor: number
): CorePlacement {
  const spec = unitsPerFloor <= 6 ? CORE_SPECS.small :
               unitsPerFloor <= 12 ? CORE_SPECS.medium : CORE_SPECS.large
  
  let x: number, y: number, type: CorePlacement['type']
  
  switch (buildingType) {
    case 'tower':
      // 중앙 코어
      x = (buildingWidth - spec.width) / 2
      y = (buildingDepth - spec.height) / 2
      type = 'center'
      break
    case 'linear':
      // 중앙 코어 (판상형)
      x = (buildingWidth - spec.width) / 2
      y = buildingDepth * 0.4 // 약간 남측으로
      type = 'center'
      break
    case 'lshape':
      // 교차점 코어 (ㄱ자 꺾이는 지점)
      x = buildingWidth * 0.6 - spec.width / 2
      y = buildingDepth * 0.4
      type = 'corner'
      break
    case 'courtyard':
      // 북측 중앙 (중정형은 남측 개방)
      x = (buildingWidth - spec.width) / 2
      y = spec.height * 0.2
      type = 'center'
      break
    default:
      x = (buildingWidth - spec.width) / 2
      y = (buildingDepth - spec.height) / 2
      type = 'center'
  }
  
  return {
    x, y,
    width: spec.width,
    height: spec.height,
    elevatorCount: spec.elevators,
    stairCount: spec.stairs,
    type,
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 세대 배치 최적화
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 세대 믹스와 코어 위치를 기반으로 최적의 세대 배치를 생성합니다.
 * 
 * 배치 원칙 (한국 공동주택 설계 표준):
 *   1. 남향 세대를 우선 배치 (채광 점수 최대화)
 *   2. 큰 세대일수록 남향에 배치 (분양가 극대화)
 *   3. 양면 통풍 가능한 세대 구성
 *   4. 안방은 남향/남동향, 침실2는 동향 배치
 *   5. 주방/거실은 남향 전면에 배치
 *   6. 좌우 대칭 배치로 구조 효율 확보
 */
function placeUnits(
  unitMix: UnitMix[],
  core: CorePlacement,
  constraints: FloorPlanConstraints
): UnitPlacement[] {
  const { buildingType, buildingWidth, buildingDepth, primaryOrientation, selectedPatterns } = constraints
  const placements: UnitPlacement[] = []
  
  // 코어 양쪽으로 세대 배치 (편복도 기준)
  const corridorWidth = 1.8 // 편복도 폭
  
  // 남측 = 메인 전면 (채광 우선)
  const southUnits: UnitMix[] = []
  const northUnits: UnitMix[] = []
  
  // 큰 세대를 남쪽에 배치 (분양가 극대화)
  const sortedMix = [...unitMix].sort((a, b) => b.area - a.area)
  let southCount = 0
  const totalCount = unitMix.reduce((sum, m) => sum + m.count, 0)
  const southTarget = Math.ceil(totalCount * 0.55) // 남측 55%
  
  for (const mix of sortedMix) {
    if (southCount < southTarget) {
      const toSouth = Math.min(mix.count, southTarget - southCount)
      southUnits.push({ ...mix, count: toSouth })
      southCount += toSouth
      if (toSouth < mix.count) {
        northUnits.push({ ...mix, count: mix.count - toSouth })
      }
    } else {
      northUnits.push(mix)
    }
  }
  
  // 남측 세대 배치
  let cursor = 0
  let unitIndex = 0
  
  const placeSide = (
    units: UnitMix[],
    startY: number,
    facing: string,
    mirrored: boolean
  ) => {
    let x = 0
    for (const mix of units) {
      for (let i = 0; i < mix.count; i++) {
        const template = getTemplate(mix.type, mix.size, mix.variant)
        if (!template) continue
        
        const spec = getSizeSpec(mix.type, mix.size)
        const unitW = spec.w / 10 // 100분의 1 스케일 → 미터
        const unitH = spec.h / 10
        
        // 실 데이터 생성
        let rooms = template.generate(spec.w, spec.h, mirrored && i % 2 === 1)
        
        // 패턴 수정자 적용
        if (selectedPatterns?.length) {
          rooms = applyPatternModifiers(rooms, selectedPatterns)
        }
        
        // 향 분석
        const sunScore = facing.includes('남') ? 90 : 
                         facing.includes('동') ? 70 : 
                         facing.includes('서') ? 60 : 40
        
        // 베이수 계산 (전면 폭 / 3.6m 기준)
        const bayCount = Math.max(2, Math.round(unitW / 3.6))
        
        const floorNum = Math.floor(unitIndex / (units.reduce((s, m) => s + m.count, 0))) + 2
        const unitNum = (unitIndex % 100) + 1
        
        placements.push({
          unitId: `${floorNum}${String(unitNum).padStart(2, '0')}호`,
          templateId: template.id,
          templateName: template.name,
          type: mix.type,
          size: mix.size,
          variant: mix.variant,
          area: template.area,
          x,
          y: startY,
          width: unitW,
          height: unitH,
          mirrored: mirrored && i % 2 === 1,
          orientation: facing,
          bayCount,
          sunlightScore: sunScore + (constraints.solarData?.winterSunlightHours || 0) * 2,
          ventilationScore: bayCount >= 3 ? 85 : bayCount >= 2 ? 70 : 50,
          rooms,
        })
        
        x += unitW + 0.2 // 세대 간 벽체
        unitIndex++
      }
    }
  }
  
  // 남측 배치
  placeSide(southUnits, core.y + core.height + corridorWidth, '남향', false)
  // 북측 배치
  placeSide(northUnits, 0, '북향', true)
  
  return placements
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 메인 최적화 엔진
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Phase 2 메인 엔트리포인트: 최적 평면 생성
 * 
 * @param constraints 건축 조건
 * @returns 최적화된 평면 결과
 */
export function optimizeFloorPlan(
  constraints: FloorPlanConstraints
): FloorPlanOptimizationResult {
  const {
    buildingType, totalUnits, floors, buildingArea,
    buildingWidth, buildingDepth, solarData,
  } = constraints
  
  // 1. 세대 믹스 최적화
  const unitMix = optimizeUnitMix(constraints)
  
  // 2. 층당 세대수
  const residentialFloors = Math.max(1, floors - 1)
  const unitsPerFloor = Math.ceil(totalUnits / residentialFloors)
  
  // 3. 코어 배치
  const core = optimizeCorePosition(buildingType, buildingWidth, buildingDepth, unitsPerFloor)
  
  // 4. 세대 배치
  const units = placeUnits(unitMix, core, constraints)
  
  // 5. 복도 결정
  const corridorType = buildingType === 'linear' && unitsPerFloor > 6 ? 'double' as const :
                       buildingType === 'tower' ? 'single' as const : 'single' as const
  const corridorWidth = corridorType === 'double' ? 2.4 : 1.8
  
  // 6. 면적 계산
  const grossAreaPerFloor = buildingArea
  const rawNetAreaPerFloor = units.reduce((sum, u) => sum + u.area, 0) / Math.max(1, Math.ceil(units.length / unitsPerFloor))
  // ━━━ 핵심: 전용면적은 연면적의 72%(코어 효율)를 절대 초과할 수 없음 ━━━
  const maxNetPerFloor = grossAreaPerFloor * 0.72
  const netAreaPerFloor = Math.min(rawNetAreaPerFloor, maxNetPerFloor)
  const totalNetArea = Math.min(netAreaPerFloor * residentialFloors, buildingArea * floors * 0.72)
  const coreEfficiency = grossAreaPerFloor > 0 ? Math.round((netAreaPerFloor / grossAreaPerFloor) * 100) : 72
  
  // 7. 점수 계산
  const avgSunScore = units.length > 0 
    ? Math.round(units.reduce((sum, u) => sum + u.sunlightScore, 0) / units.length)
    : 70
  const avgVentScore = units.length > 0
    ? Math.round(units.reduce((sum, u) => sum + u.ventilationScore, 0) / units.length)
    : 65
  
  // 분양성 점수
  const hasSmall = unitMix.some(m => m.area <= 60)
  const hasMedium = unitMix.some(m => m.area > 60 && m.area <= 85)
  const hasLarge = unitMix.some(m => m.area > 85)
  const mixDiversity = (hasSmall ? 25 : 0) + (hasMedium ? 35 : 0) + (hasLarge ? 25 : 0)
  const marketabilityScore = Math.min(100, mixDiversity + avgSunScore * 0.15)
  
  // 8. 요약 생성
  const avgArea = units.length > 0
    ? Math.round(units.reduce((sum, u) => sum + u.area, 0) / units.length)
    : 84
  
  const typeDesc = unitMix.map(m => `${m.type} ${m.count}세대`).join(', ')
  const summary = `${buildingType === 'tower' ? '타워형' : buildingType === 'linear' ? '판상형' : 
    buildingType === 'lshape' ? 'ㄱ자형' : buildingType === 'courtyard' ? '중정형' : '클러스터형'} ` +
    `${floors}층, 층당 ${unitsPerFloor}세대 (${typeDesc}). ` +
    `평균 전용 ${avgArea}㎡, 전용률 ${coreEfficiency}%.` +
    (solarData ? ` 동지 일조 ${solarData.winterSunlightHours}시간.` : '')
  
  // 9. 개선 제안
  const recommendations: string[] = []
  if (coreEfficiency < 68) {
    recommendations.push('코어 면적이 크므로 기계식 주차 등으로 지하 코어 분리 검토')
  }
  if (avgSunScore < 60) {
    recommendations.push('남향 세대 비율이 낮으므로 건물 방향 조정 검토')
  }
  if (unitsPerFloor > 8 && corridorType === 'single') {
    recommendations.push('세대수가 많으므로 중복도 구조 검토 (편복도 동선 길이 과다)')
  }
  if (solarData?.isConstraining) {
    recommendations.push(`정북사선으로 ${solarData.effectiveMaxFloors}층 제한 — 상층부 세트백 또는 계단형 설계 검토`)
  }
  if (unitMix.length === 1) {
    recommendations.push('단일 세대타입보다 2~3가지 타입 혼합이 분양성에 유리')
  }
  
  return {
    floorPlan: {
      units,
      core,
      corridor: {
        type: corridorType,
        width: corridorWidth,
        length: buildingType === 'linear' ? buildingWidth : buildingWidth * 0.6,
      },
      buildingWidth,
      buildingDepth,
      unitsPerFloor,
      grossAreaPerFloor,
      netAreaPerFloor,
      coreEfficiency,
    },
    unitMix,
    totalNetArea,
    averageUnitArea: avgArea,
    coreEfficiency,
    solarScore: avgSunScore,
    ventilationScore: avgVentScore,
    marketabilityScore: Math.round(marketabilityScore),
    summary,
    recommendations,
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 편의 함수
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * LayoutOption → FloorPlanConstraints 변환
 * page.tsx의 LayoutOption에서 바로 평면 최적화를 실행할 수 있게 합니다.
 */
export function layoutToFloorPlanConstraints(
  layout: {
    type: string
    coverage: number
    floors: number
    units: number
    gfa: number
    solarData?: {
      winterSunlightHours: number
      shadowLength: number
      northSolarMaxHeight: number
      effectiveMaxFloors: number
    }
  },
  siteArea: number,
  options?: {
    targetUnitSize?: 'small' | 'medium' | 'large' | 'mixed'
    targetAudience?: 'singles' | 'couples' | 'families' | 'investors'
    zoneType?: string
    buildingUse?: string
    selectedPatterns?: string[]
  }
): FloorPlanConstraints {
  const S = Math.sqrt(siteArea)
  const buildingArea = siteArea * layout.coverage / 100
  const buildingWidth = Math.sqrt(buildingArea * (layout.type === 'linear' ? 3.5 : 1.3))
  const buildingDepth = buildingArea / buildingWidth
  
  return {
    buildingType: layout.type as FloorPlanConstraints['buildingType'],
    totalUnits: layout.units,
    floors: layout.floors,
    buildingArea,
    buildingWidth,
    buildingDepth,
    targetUnitSize: options?.targetUnitSize || 'mixed',
    targetAudience: options?.targetAudience,
    primaryOrientation: 'south',
    southOpen: true,
    solarData: layout.solarData,
    selectedPatterns: options?.selectedPatterns,
    zoneType: options?.zoneType,
    buildingUse: options?.buildingUse,
  }
}

/**
 * 세대 믹스를 사람이 읽을 수 있는 요약 문자열로 변환
 */
export function formatUnitMixSummary(unitMix: UnitMix[]): string {
  const parts = unitMix.map(m => {
    const sizeLabel = m.size === 'S' ? '소' : m.size === 'M' ? '중' : '대'
    return `${m.type}(${m.area}㎡/${sizeLabel}) ${m.count}세대`
  })
  return parts.join(' + ')
}

/**
 * 세대타입 추천 — 대지면적/용도지역/시장상황에 맞는 최적 세대타입
 */
export function recommendUnitTypes(
  siteArea: number,
  zoneType: string,
  floors: number,
  buildingUse?: string
): { type: string; size: 'S' | 'M' | 'L'; reason: string }[] {
  const recommendations: { type: string; size: 'S' | 'M' | 'L'; reason: string }[] = []
  
  const isSmallSite = siteArea < 500
  const isMediumSite = siteArea >= 500 && siteArea < 1500
  const isResidential = zoneType.includes('residential')
  const isCommercial = zoneType.includes('commercial')
  
  if (isSmallSite) {
    recommendations.push(
      { type: '원룸', size: 'M', reason: '소규모 대지에서 세대수 확보에 유리' },
      { type: '투룸', size: 'S', reason: '1~2인 가구 수요 대응' },
    )
    if (floors >= 5) {
      recommendations.push(
        { type: '1.5룸', size: 'L', reason: '고층 소형 주택 수요' }
      )
    }
  } else if (isMediumSite) {
    recommendations.push(
      { type: '투룸+', size: 'M', reason: '신혼·2인 가구 핵심 수요' },
      { type: '쓰리룸', size: 'M', reason: '소가족 실거주 수요' },
    )
    if (buildingUse === 'officetel') {
      recommendations.push(
        { type: '원룸', size: 'L', reason: '오피스텔 투자/실거주 수요' }
      )
    }
  } else {
    // 대규모
    recommendations.push(
      { type: '쓰리룸', size: 'M', reason: '84㎡ 국민 표준형 (가장 높은 수요)' },
      { type: '쓰리룸+', size: 'M', reason: '중대형 가족 실거주 수요' },
      { type: '투룸+', size: 'M', reason: '소형 세대 비율 확보 (분양률 안정)' },
    )
  }
  
  if (isCommercial) {
    recommendations.push(
      { type: '원룸', size: 'M', reason: '상업지역 오피스텔/도시형생활주택' }
    )
  }
  
  return recommendations
}
