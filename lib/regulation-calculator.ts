/**
 * 한국 건축법 기반 법규검토 자동 계산 엔진
 * 
 * 근거 법령:
 * - 국토의 계획 및 이용에 관한 법률 시행령 [별표 1~22]
 * - 건축법 시행령 제27조의2 (조경기준)
 * - 주차장법 시행령 [별표 1] (부설주차장 설치기준)
 * - 건축법 제61조 (일조 등의 확보를 위한 건축물의 높이 제한)
 */

export type ZoneCode =
  | 'residential-exclusive-1'   // 제1종 전용주거지역
  | 'residential-exclusive-2'   // 제2종 전용주거지역
  | 'residential-1'             // 제1종 일반주거지역
  | 'residential-2'             // 제2종 일반주거지역
  | 'residential-3'             // 제3종 일반주거지역
  | 'semi-residential'          // 준주거지역
  | 'commercial-neighborhood'   // 근린상업지역
  | 'commercial-general'        // 일반상업지역
  | 'commercial-central'        // 중심상업지역
  | 'industrial-general'        // 일반공업지역
  | 'green-natural'             // 자연녹지지역
  | 'green-production'          // 생산녹지지역
  | 'management-planned'        // 계획관리지역

export interface RegulationInput {
  zoneCode: ZoneCode
  siteArea: number           // 대지면적 (㎡)
  roadWidth: number          // 접도 폭 (m)
  heightLimit: number        // 높이 제한 (m)
  hasDistrictPlan: boolean   // 지구단위계획 여부
  buildingUse?: string       // 건물 용도 (주거/상업/업무)
  isCornerLot?: boolean      // 코너 대지 여부
}

export interface LegalStandard {
  maxCoverageRatio: number       // 법정 최대 건폐율 (%)
  maxFloorAreaRatio: number      // 법정 최대 용적률 (%)
  legalHeightLimit: number | null // 법정 절대높이 제한 (m, null=없음)
  source: string                 // 법령 근거
}

export interface ParkingRequirement {
  standard: string               // 적용 기준
  requiredPerArea: number        // 면적당 필요 대수 (m²/대)
  estimatedRequired: number      // 예상 필요 주차대수 (대)
  undergroundFloorsNeeded: number // 필요 지하주차장 층수
}

export interface LandscapingRequirement {
  required: boolean              // 조경 필요 여부
  minRatio: number               // 최소 조경 면적 비율 (%)
  minArea: number                // 최소 조경 면적 (㎡)
  basis: string                  // 적용 기준
}

export interface BuildingEnvelope {
  effectiveSiteArea: number      // 유효 대지면적 (이격거리 제외)
  maxBuildingFootprint: number   // 최대 건축면적 (㎡)
  maxGrossFloorArea: number      // 최대 연면적 (㎡)
  maxFloors: number              // 법정 최대 층수
  recommendedFloors: number      // 권장 층수
  buildableVolume: number        // 건축가능 볼륨 (㎥ 근사)
}

export interface SetbackRequirement {
  front: number      // 전면 이격 (m)
  side: number       // 측면 이격 (m)
  rear: number       // 후면 이격 (m)
  roadSetback: number // 건축선 후퇴 (m)
  northSetbackApplied: boolean  // 북측사선 적용 여부
  roadSetbackApplied: boolean   // 도로사선 적용 여부
  basis: string
  // 일조권 사선제한 상세 (건축법 제61조)
  sunlight?: SunlightSetbackAnalysis
}

/** 일조권 사선제한 분석 결과 (건축법 제61조) */
export interface SunlightSetbackAnalysis {
  // 정북방향 높이제한
  northMaxHeight9m: number       // 9m 이하 구간: 인접대지경계선에서 최소 이격 (m)
  northMaxHeightFormula: string  // 9m 초과 구간: 높이의 1/2 이상 이격 공식
  effectiveNorthSetback: number  // 실제 북측 이격거리 (m)
  maxHeightAtNorth: number       // 북측 경계에서의 최대 건물 높이 (m)
  
  // 도로사선 제한
  roadSlopeRatio: number         // 사선 비율 (1:1.5 등)
  maxHeightByRoad: number        // 도로사선에 의한 최대 높이 (m)
  
  // 상층부 영향
  fullFloorMaxHeight: number     // 전체 바닥면적 가능 최대 높이 (m)
  reducedFloorStart: number      // 면적 축소 시작 층
  upperFloorReduction: number    // 상층부 면적 감소율 (%)
  effectiveMaxFloors: number     // 사선 반영 실효 최대 층수
  effectiveGFA: number           // 사선 반영 실효 연면적 (㎡)
  
  // 판정
  isConstraining: boolean        // 사선제한이 높이/볼륨에 실질적 영향 있는지
  summary: string                // 요약 설명
  legalBasis: string             // 법적 근거
}

export interface ComplianceCheck {
  item: string
  status: 'ok' | 'warning' | 'violation'
  detail: string
  recommendation?: string
}

export interface RegulationResult {
  legal: LegalStandard
  parking: ParkingRequirement
  landscaping: LandscapingRequirement
  envelope: BuildingEnvelope
  setback: SetbackRequirement
  compliance: ComplianceCheck[]
  summary: {
    maxUnits: number           // 최대 세대수 (주거 기준)
    breakEvenFloors: number    // 수익 손익분기 최소 층수
    recommendedUseType: string // 권장 용도
  }
}

// ============================================================
// 법정 건폐율/용적률 기준 (국계법 시행령 [별표])
// ============================================================
const LEGAL_STANDARDS: Record<ZoneCode, LegalStandard> = {
  'residential-exclusive-1': {
    maxCoverageRatio: 50, maxFloorAreaRatio: 100,
    legalHeightLimit: null,
    source: '국계법 시행령 별표2 제1종전용주거지역'
  },
  'residential-exclusive-2': {
    maxCoverageRatio: 50, maxFloorAreaRatio: 150,
    legalHeightLimit: null,
    source: '국계법 시행령 별표3 제2종전용주거지역'
  },
  'residential-1': {
    maxCoverageRatio: 60, maxFloorAreaRatio: 200,
    legalHeightLimit: null,
    source: '국계법 시행령 별표4 제1종일반주거지역'
  },
  'residential-2': {
    maxCoverageRatio: 60, maxFloorAreaRatio: 250,
    legalHeightLimit: null,
    source: '국계법 시행령 별표5 제2종일반주거지역'
  },
  'residential-3': {
    maxCoverageRatio: 50, maxFloorAreaRatio: 300,
    legalHeightLimit: null,
    source: '국계법 시행령 별표6 제3종일반주거지역'
  },
  'semi-residential': {
    maxCoverageRatio: 70, maxFloorAreaRatio: 500,
    legalHeightLimit: null,
    source: '국계법 시행령 별표7 준주거지역'
  },
  'commercial-neighborhood': {
    maxCoverageRatio: 70, maxFloorAreaRatio: 900,
    legalHeightLimit: null,
    source: '국계법 시행령 별표8 근린상업지역'
  },
  'commercial-general': {
    maxCoverageRatio: 80, maxFloorAreaRatio: 1300,
    legalHeightLimit: null,
    source: '국계법 시행령 별표9 일반상업지역'
  },
  'commercial-central': {
    maxCoverageRatio: 90, maxFloorAreaRatio: 1500,
    legalHeightLimit: null,
    source: '국계법 시행령 별표9 중심상업지역'
  },
  'industrial-general': {
    maxCoverageRatio: 70, maxFloorAreaRatio: 350,
    legalHeightLimit: null,
    source: '국계법 시행령 별표13 일반공업지역'
  },
  'green-natural': {
    maxCoverageRatio: 20, maxFloorAreaRatio: 80,
    legalHeightLimit: null,
    source: '국계법 시행령 별표17 자연녹지지역'
  },
  'green-production': {
    maxCoverageRatio: 20, maxFloorAreaRatio: 100,
    legalHeightLimit: null,
    source: '국계법 시행령 별표18 생산녹지지역'
  },
  'management-planned': {
    maxCoverageRatio: 40, maxFloorAreaRatio: 100,
    legalHeightLimit: null,
    source: '국계법 시행령 별표20 계획관리지역'
  },
}

// ============================================================
// 주차 기준 (주차장법 시행령 [별표 1])
// ============================================================
function calcParking(
  input: RegulationInput,
  maxGFA: number
): ParkingRequirement {
  const zone = input.zoneCode
  const isCommercial = zone.includes('commercial')
  const isSemiRes = zone === 'semi-residential'

  // 서울시 기준 (타 지자체 유사)
  // 공동주택: 85㎡ 이하 세대 1대, 초과 1.2~1.5대
  // 업무시설: 150㎡당 1대
  // 근린생활: 200㎡당 1대
  let standard: string
  let requiredPerArea: number

  if (isCommercial || isSemiRes) {
    standard = '업무·상업시설 150㎡당 1대 (주차장법 시행령 별표1)'
    requiredPerArea = 150
  } else {
    standard = '공동주택 세대당 0.7대 기준 (85㎡이하 소형주택 서울시 기준)'
    requiredPerArea = 85 / 0.7  // 세대당 85㎡, 주차 0.7대 → 약 121m²당 1대
  }

  const estimatedRequired = Math.ceil(maxGFA / (requiredPerArea))
  // 주차 1대당 약 25㎡, 지하 1층 약 대지면적 × 0.7
  const parkingAreaPerFloor = input.siteArea * 0.7
  const parkingPerFloor = Math.floor(parkingAreaPerFloor / 27)
  const undergroundFloorsNeeded = Math.ceil(estimatedRequired / parkingPerFloor)

  return { standard, requiredPerArea, estimatedRequired, undergroundFloorsNeeded }
}

// ============================================================
// 조경 기준 (건축법 시행령 제27조의2)
// ============================================================
function calcLandscaping(input: RegulationInput): LandscapingRequirement {
  const { zoneCode, siteArea } = input
  const isCommercial = zoneCode.includes('commercial')
  const isResidential = zoneCode.includes('residential')

  // 200㎡ 미만 대지는 조경 불필요
  if (siteArea < 200) {
    return { required: false, minRatio: 0, minArea: 0, basis: '대지면적 200㎡ 미만 — 조경 불필요' }
  }

  let minRatio: number
  let basis: string

  if (isCommercial) {
    minRatio = 10 // 상업지역: 10% 이상
    basis = '건축법 시행령 제27조의2 — 상업지역 10% 이상'
  } else if (isResidential) {
    if (siteArea >= 5000) {
      minRatio = 15 // 대형 주거 대지: 15%
      basis = '건축법 시행령 제27조의2 — 주거지역 5,000㎡ 이상 15% 이상'
    } else {
      minRatio = 5 // 소형 주거: 5%
      basis = '건축법 시행령 제27조의2 — 주거지역 5% 이상'
    }
  } else {
    minRatio = 5
    basis = '건축법 시행령 제27조의2 — 기타 5% 이상'
  }

  const minArea = Math.ceil(siteArea * minRatio / 100)
  return { required: true, minRatio, minArea, basis }
}

// ============================================================
// 이격거리 및 사선제한 계산
// ============================================================
function calcSetback(input: RegulationInput): SetbackRequirement {
  const { zoneCode, roadWidth, hasDistrictPlan } = input
  const isResidential = zoneCode.includes('residential') && !zoneCode.includes('semi')

  // 기본 이격거리 (건축법 제58조)
  const front = hasDistrictPlan ? 2 : 1      // 전면
  const side = isResidential ? 1 : 0.5       // 측면
  const rear = isResidential ? 1.5 : 1       // 후면

  // 건축선 후퇴: 도로폭 4m 미만인 경우 중심선에서 2m 확보
  const roadSetback = roadWidth < 4 ? Math.max(0, 2 - roadWidth / 2) : 0

  // 북측사선: 주거지역에 적용 (건축법 제61조)
  const northSetbackApplied = isResidential

  // 도로사선: 전용주거/일반주거 (건축법 제61조)
  const roadSetbackApplied = isResidential &&
    (zoneCode.includes('exclusive') || zoneCode === 'residential-1' || zoneCode === 'residential-2')

  const basis = hasDistrictPlan
    ? '지구단위계획 기준 이격거리 적용'
    : '건축법 제58조 대지 안의 공지 기준'

  // 일조권 사선제한 상세 계산 (건축법 제61조)
  let sunlight: SunlightSetbackAnalysis | undefined
  if (northSetbackApplied) {
    sunlight = calcSunlightSetback(input, { front, side, rear, roadSetback, northSetbackApplied, roadSetbackApplied, basis })
  }

  return { front, side, rear, roadSetback, northSetbackApplied, roadSetbackApplied, basis, sunlight }
}

// ============================================================
// 일조권 사선제한 상세 계산 (건축법 제61조)
// ============================================================
function calcSunlightSetback(
  input: RegulationInput,
  basicSetback: { front: number; side: number; rear: number; roadSetback: number; northSetbackApplied: boolean; roadSetbackApplied: boolean; basis: string }
): SunlightSetbackAnalysis {
  const { siteArea, heightLimit, roadWidth, zoneCode } = input
  const floorHeight = 3.3
  
  // 대지 형상 근사 (정방형)
  const siteDepth = Math.sqrt(siteArea)
  
  // 건물 배치 기반 실제 북측 이격거리 계산
  // 건폐율 50% 기준 건물 깊이 → 남쪽 배치 시 북측 여유 계산
  const coverageRatio = zoneCode.includes('commercial') ? 0.7 : 0.5
  const buildingFootprint = siteArea * coverageRatio
  const buildingDepth = Math.sqrt(buildingFootprint) // 정방형 근사
  // 남쪽 배치: 전면이격 후 남쪽 붙이면 북측 여유 = 대지깊이 - 전면이격 - 건물깊이
  const maxNorthSetback = Math.max(siteDepth - basicSetback.front - buildingDepth, basicSetback.rear)
  // 최적 배치: 법정 후면 이격(1.5m)과 남쪽 배치 중 큰 값
  const effectiveNorthSetback = Math.max(maxNorthSetback, basicSetback.rear, 1.5)
  
  // ── 정북방향 높이제한 (건축법 제61조 제1항) ──
  // 1) 높이 9m 이하 부분: 인접대지경계선에서 1.5m 이상 이격
  // 2) 높이 9m 초과 부분: 인접대지경계선에서 해당 높이의 1/2 이상 이격
  const northMaxHeight9m = 1.5 // 9m 이하 구간 최소 이격
  
  // 건물 북측면이 경계선에서 effectiveNorthSetback만큼 떨어져 있을 때
  // 9m 초과 부분에서 추가로 높이의 1/2 이격 필요
  // 즉, 경계선에서 d미터 떨어진 곳의 최대 높이 = min(9 + (d - 1.5) × 2, heightLimit)
  // 단, d >= 1.5m 일 때
  const maxHeightAtNorth = effectiveNorthSetback >= 1.5
    ? Math.min(9 + (effectiveNorthSetback - 1.5) * 2, heightLimit)
    : 9 // 이격 부족하면 9m가 최대
    
  // ── 도로사선 제한 (건축법 제61조 제2항) ──
  // 전면도로 반대편 경계선에서 1:1.5 비율 (전용주거·일반주거)
  const isExclusiveOrGeneral = zoneCode.includes('exclusive') || 
    zoneCode === 'residential-1' || zoneCode === 'residential-2'
  const roadSlopeRatio = isExclusiveOrGeneral ? 1.5 : 0 // 0이면 미적용
  
  // 도로사선 최대 높이: 도로 반대편 경계 → 건물까지의 수평거리 × 1.5
  // 수평거리 = 도로폭 + 전면이격 + 건축선후퇴
  const horizontalToRoad = roadWidth + basicSetback.front + basicSetback.roadSetback
  const maxHeightByRoad = roadSlopeRatio > 0 
    ? Math.min(horizontalToRoad * roadSlopeRatio, heightLimit)
    : heightLimit // 미적용
    
  // ── 실효 최대 높이 (모든 제한 중 최소값) ──
  const effectiveMaxHeight = Math.min(heightLimit, maxHeightAtNorth, maxHeightByRoad)
  const effectiveMaxFloors = Math.floor(effectiveMaxHeight / floorHeight)
  
  // ── 상층부 면적 감소 계산 ──
  // 사선 초과 시작 높이 (9m = 약 2.7층 → 3층부터 사선 영향)
  const fullFloorMaxHeight = Math.min(9, effectiveMaxHeight) // 사선 없이 전체 바닥면적 가능 높이
  const fullFloors = Math.floor(fullFloorMaxHeight / floorHeight) // 전체 면적 가능 층수
  const reducedFloorStart = fullFloors + 1 // 면적 축소 시작 층
  
  // 상층부(사선 영향 구간)의 평균 면적 감소율
  // 사선에 의해 북측 면이 후퇴 → 건물 깊이 감소
  // 대략적 계산: 사선 초과 높이 / 전체 높이 비율로 감소
  const totalFloors = Math.floor(effectiveMaxHeight / floorHeight)
  let upperFloorReduction = 0
  if (totalFloors > fullFloors && totalFloors > 0) {
    // 상층부 각 층의 북측 후퇴량 계산
    let totalReduction = 0
    let affectedFloors = 0
    for (let f = fullFloors + 1; f <= totalFloors; f++) {
      const floorTopHeight = f * floorHeight
      if (floorTopHeight > 9) {
        // 이 층의 상단 높이에서 필요한 북측 이격 = 높이/2
        const requiredSetback = floorTopHeight / 2
        // 실제 이격과의 차이 → 건물 깊이 감소
        const additionalSetback = Math.max(0, requiredSetback - effectiveNorthSetback)
        // 깊이 감소율 = 추가이격 / 대지깊이
        const depthReduction = Math.min(additionalSetback / siteDepth, 0.5) // 최대 50%
        totalReduction += depthReduction
        affectedFloors++
      }
    }
    upperFloorReduction = affectedFloors > 0 ? Math.round((totalReduction / affectedFloors) * 100) : 0
  }
  
  // ── 실효 연면적 ──
  const maxBuildingArea = siteArea * 0.5 // 건폐율 50% 근사
  let effectiveGFA = 0
  for (let f = 1; f <= totalFloors; f++) {
    const floorTopHeight = f * floorHeight
    if (floorTopHeight <= 9) {
      effectiveGFA += maxBuildingArea // 전체 면적
    } else {
      const requiredSetback = floorTopHeight / 2
      const additionalSetback = Math.max(0, requiredSetback - effectiveNorthSetback)
      const depthReduction = Math.min(additionalSetback / siteDepth, 0.5)
      effectiveGFA += maxBuildingArea * (1 - depthReduction)
    }
  }
  effectiveGFA = Math.round(effectiveGFA)
  
  // ── 판정 ──
  const isConstraining = effectiveMaxHeight < heightLimit || upperFloorReduction > 5
  
  // 요약
  const parts: string[] = []
  if (basicSetback.northSetbackApplied) {
    parts.push(`정북사선: 경계 ${effectiveNorthSetback}m 이격 → 최대 ${Math.round(maxHeightAtNorth)}m`)
  }
  if (roadSlopeRatio > 0) {
    parts.push(`도로사선 1:${roadSlopeRatio} → 최대 ${Math.round(maxHeightByRoad)}m`)
  }
  if (upperFloorReduction > 0) {
    parts.push(`${reducedFloorStart}층부터 면적 약 ${upperFloorReduction}% 감소`)
  }
  
  return {
    northMaxHeight9m,
    northMaxHeightFormula: '높이 9m 초과 시: 인접대지경계선에서 높이의 1/2 이상 이격',
    effectiveNorthSetback,
    maxHeightAtNorth: Math.round(maxHeightAtNorth * 10) / 10,
    roadSlopeRatio,
    maxHeightByRoad: Math.round(maxHeightByRoad * 10) / 10,
    fullFloorMaxHeight,
    reducedFloorStart,
    upperFloorReduction,
    effectiveMaxFloors,
    effectiveGFA,
    isConstraining,
    summary: parts.join(' | ') || '사선제한 영향 없음',
    legalBasis: '건축법 제61조 (일조 등의 확보를 위한 건축물의 높이 제한)',
  }
}

// ============================================================
// 건축 가능 볼륨 계산
// ============================================================
function calcEnvelope(
  input: RegulationInput,
  legal: LegalStandard,
  setback: SetbackRequirement
): BuildingEnvelope {
  const { siteArea, heightLimit } = input

  // 이격거리 적용 유효 대지면적 (정방형 근사)
  const side = Math.sqrt(siteArea)
  const effectiveW = Math.max(side - (setback.side * 2) - setback.roadSetback, side * 0.7)
  const effectiveD = Math.max(side - setback.front - setback.rear, side * 0.7)
  const effectiveSiteArea = Math.round(effectiveW * effectiveD)

  // 최대 건축면적 (건폐율)
  const maxBuildingFootprint = Math.floor(effectiveSiteArea * legal.maxCoverageRatio / 100)

  // 최대 층수 (높이 제한 기준)
  const floorHeight = 3.3 // 층고 3.3m
  const maxFloorsByHeight = Math.floor(heightLimit / floorHeight)

  // 최대 연면적: 용적률 기준과 층수 제한 기준 중 작은 값
  const maxGFAByFAR = Math.floor(siteArea * legal.maxFloorAreaRatio / 100)
  const maxGFAByFloors = maxBuildingFootprint * maxFloorsByHeight
  const maxGrossFloorArea = Math.min(maxGFAByFAR, maxGFAByFloors)

  // 최대 층수
  const maxFloorsByFAR = Math.ceil(maxGrossFloorArea / maxBuildingFootprint)
  const maxFloors = Math.min(maxFloorsByHeight, maxFloorsByFAR)

  // 권장 층수 (경제성 고려: 법정 최대의 80~90%)
  const recommendedFloors = Math.max(3, Math.round(maxFloors * 0.85))

  // 건축 가능 볼륨
  const buildableVolume = maxBuildingFootprint * heightLimit

  return {
    effectiveSiteArea,
    maxBuildingFootprint,
    maxGrossFloorArea,
    maxFloors,
    recommendedFloors,
    buildableVolume
  }
}

// ============================================================
// 법규 준수 검토
// ============================================================
function checkCompliance(
  input: RegulationInput,
  legal: LegalStandard,
  envelope: BuildingEnvelope,
  parking: ParkingRequirement,
  landscaping: LandscapingRequirement
): ComplianceCheck[] {
  const checks: ComplianceCheck[] = []

  // 1. 접도 폭 검토
  if (input.roadWidth < 4) {
    checks.push({
      item: '접도 폭',
      status: 'violation',
      detail: `접도 ${input.roadWidth}m — 건축허가 최소 4m 미달`,
      recommendation: '막다른 도로 여부 확인, 건축선 후퇴로 4m 확보 필요'
    })
  } else if (input.roadWidth < 6) {
    checks.push({
      item: '접도 폭',
      status: 'warning',
      detail: `접도 ${input.roadWidth}m — 소방차 진입 제한 가능`,
      recommendation: '소방법 시행령 제2조 확인, 소방차 전용구역 설치 검토'
    })
  } else {
    checks.push({ item: '접도 폭', status: 'ok', detail: `접도 ${input.roadWidth}m — 적합` })
  }

  // 2. 건폐율 적합성 — 실제 건축면적 비교
  {
    const actualCoverage = Math.round(envelope.maxBuildingFootprint / input.siteArea * 100 * 10) / 10
    const isOver = actualCoverage > legal.maxCoverageRatio
    checks.push({
      item: '건폐율 한도',
      status: isOver ? 'violation' : 'ok',
      detail: `계획 건폐율 ${actualCoverage}% / 법정 최대 ${legal.maxCoverageRatio}% (${legal.source})`,
      recommendation: isOver ? `건축면적을 ${Math.floor(input.siteArea * legal.maxCoverageRatio / 100)}㎡ 이하로 축소 필요` : undefined,
    })
  }

  // 3. 용적률 적합성 — 실제 연면적 비교
  {
    const actualFAR = Math.round(envelope.maxGrossFloorArea / input.siteArea * 100 * 10) / 10
    const isOver = actualFAR > legal.maxFloorAreaRatio
    checks.push({
      item: '용적률 한도',
      status: isOver ? 'violation' : 'ok',
      detail: `계획 용적률 ${actualFAR}% / 법정 최대 ${legal.maxFloorAreaRatio}%`,
      recommendation: isOver ? `연면적을 ${Math.floor(input.siteArea * legal.maxFloorAreaRatio / 100).toLocaleString()}㎡ 이하로 조정 필요` : undefined,
    })
  }

  // 4. 주차 확보 가능성 — 자동으로 지하주차 계획으로 해결
  {
    const floors = parking.undergroundFloorsNeeded
    const addedCostBillion = Math.round(floors * input.siteArea * 0.7 * 0.8) / 10  // 억원
    if (floors > 3) {
      checks.push({
        item: '주차 확보',
        status: 'ok',
        detail: `지하주차장 ${floors}개층 계획 → ${parking.estimatedRequired}대 확보 (공사비 약 ${addedCostBillion}억원 증가 반영)`,
        recommendation: `지하 ${floors}개층 자주식 주차 계획. 기계식 병용 시 ${Math.ceil(floors * 0.6)}개층으로 축소 가능`
      })
    } else {
      checks.push({
        item: '주차 확보',
        status: 'ok',
        detail: `지하 ${floors}개층으로 ${parking.estimatedRequired}대 확보 가능`
      })
    }
  }

  // 4-1. 높이 제한 검토
  {
    const maxH = input.heightLimit
    const maxF = envelope.maxFloors
    const recommendedF = envelope.recommendedFloors
    if (maxH && maxH < 100) {
      checks.push({
        item: '높이 제한',
        status: 'ok',
        detail: `법정 높이 제한 ${maxH}m → 최대 ${maxF}층 (권장 ${recommendedF}층)`,
        recommendation: maxF <= 3 ? '저층 설계 필수 — 층고 3.3m 기준' : undefined,
      })
    }
  }

  // 5. 조경 면적
  if (landscaping.required) {
    checks.push({
      item: '조경 면적',
      status: 'ok',
      detail: `최소 ${landscaping.minArea.toLocaleString()}㎡ (대지의 ${landscaping.minRatio}%) 확보 필요`
    })
  } else {
    checks.push({ item: '조경 면적', status: 'ok', detail: '조경 불필요 (대지면적 200㎡ 미만)' })
  }

  // 6. 지구단위계획 — 인센티브 자동 확인 처리
  if (input.hasDistrictPlan) {
    // 용도지역별 지구단위계획 인센티브 자동 산정
    const baseRatio = legal.maxFloorAreaRatio
    const incentiveRatio = input.zoneCode === 'commercial-general' ? Math.round(baseRatio * 0.2) :
                           input.zoneCode === 'commercial-central' ? Math.round(baseRatio * 0.25) :
                           input.zoneCode === 'semi-residential' ? Math.round(baseRatio * 0.15) :
                           Math.round(baseRatio * 0.1)
    const maxWithIncentive = baseRatio + incentiveRatio
    checks.push({
      item: '지구단위계획',
      status: 'ok',
      detail: `지구단위계획 인센티브 적용 가능 — 용적률 최대 ${maxWithIncentive.toLocaleString()}%까지 허용 (기준 ${baseRatio.toLocaleString()}% + 인센티브 최대 ${incentiveRatio.toLocaleString()}%)`,
      recommendation: `구청 지구단위계획 지침서 확인 시 공공기여(공개공지·공용주차 등) 조건으로 용적률 추가 확보 가능`
    })
  }

  // 7. 소형 대지 (500㎡ 미만) 경고
  if (input.siteArea < 500) {
    checks.push({
      item: '대지 규모',
      status: 'warning',
      detail: `대지면적 ${input.siteArea}㎡ — 소규모 대지로 지하주차 확보 난이도 높음`,
      recommendation: '기계식 주차 또는 자주식 소형 지하주차 검토'
    })
  }

  return checks
}

// ============================================================
// 메인 계산 함수
// ============================================================
export function calculateRegulations(input: RegulationInput): RegulationResult {
  const legal = LEGAL_STANDARDS[input.zoneCode]
  const setback = calcSetback(input)
  const envelope = calcEnvelope(input, legal, setback)
  const parking = calcParking(input, envelope.maxGrossFloorArea)
  const landscaping = calcLandscaping(input)
  const compliance = checkCompliance(input, legal, envelope, parking, landscaping)

  // 최대 세대수 (전용 85㎡ 기준)
  const maxUnits = Math.floor(envelope.maxGrossFloorArea / 85)

  // 손익분기 최소 층수 (단순 추정: 총사업비 ≥ 분양수입)
  // 대지비(5,000/㎡) + 층당 공사비(4,500/㎡ × 건축면적) ≥ 분양가(5,000,000/㎡ × 세대수 × 85)
  const breakEvenFloors = Math.max(3, Math.ceil(
    (input.siteArea * 5000) / (envelope.maxBuildingFootprint * (5000 * 85 / 1000000 - 4.5))
  ))

  const isCommercial = input.zoneCode.includes('commercial')
  const recommendedUseType = isCommercial
    ? '업무·상업·주거 복합 (지구단위 인센티브 적극 활용)'
    : input.zoneCode === 'semi-residential'
      ? '준주거 복합 (1~2층 근린생활 + 상층 주거)'
      : '공동주택 (도시형생활주택 또는 아파트)'

  return {
    legal,
    parking,
    landscaping,
    envelope,
    setback,
    compliance,
    summary: { maxUnits, breakEvenFloors, recommendedUseType }
  }
}

// 용도지역 코드 → 표시 이름
export const ZONE_LABELS: Record<ZoneCode, string> = {
  'residential-exclusive-1': '제1종 전용주거지역',
  'residential-exclusive-2': '제2종 전용주거지역',
  'residential-1': '제1종 일반주거지역',
  'residential-2': '제2종 일반주거지역',
  'residential-3': '제3종 일반주거지역',
  'semi-residential': '준주거지역',
  'commercial-neighborhood': '근린상업지역',
  'commercial-general': '일반상업지역',
  'commercial-central': '중심상업지역',
  'industrial-general': '일반공업지역',
  'green-natural': '자연녹지지역',
  'green-production': '생산녹지지역',
  'management-planned': '계획관리지역',
}
