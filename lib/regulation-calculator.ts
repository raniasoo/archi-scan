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
    standard = '공동주택 세대당 1대 기준 (85㎡이하 기준)'
    requiredPerArea = 85 // 세대당 85㎡ 가정
  }

  const estimatedRequired = Math.ceil(maxGFA / requiredPerArea)
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

  return { front, side, rear, roadSetback, northSetbackApplied, roadSetbackApplied, basis }
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

  // 최대 연면적 (용적률은 대지면적 기준)
  const maxGrossFloorArea = Math.floor(siteArea * legal.maxFloorAreaRatio / 100)

  // 최대 층수
  const floorHeight = 3.3 // 층고 3.3m
  const maxFloorsByHeight = Math.floor(heightLimit / floorHeight)
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

  // 2. 건폐율 적합성
  checks.push({
    item: '건폐율 한도',
    status: 'ok',
    detail: `법정 최대 건폐율 ${legal.maxCoverageRatio}% 이하 적용 (${legal.source})`
  })

  // 3. 용적률 적합성
  checks.push({
    item: '용적률 한도',
    status: 'ok',
    detail: `법정 최대 용적률 ${legal.maxFloorAreaRatio}% 이하 적용`
  })

  // 4. 주차 확보 가능성
  if (parking.undergroundFloorsNeeded > 3) {
    checks.push({
      item: '주차 확보',
      status: 'warning',
      detail: `지하주차장 ${parking.undergroundFloorsNeeded}개층 필요 — 공사비 증가 예상`,
      recommendation: '기계식 주차 또는 인근 공영주차장 활용 검토'
    })
  } else {
    checks.push({
      item: '주차 확보',
      status: 'ok',
      detail: `지하 ${parking.undergroundFloorsNeeded}개층으로 ${parking.estimatedRequired}대 확보 가능`
    })
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

  // 6. 지구단위계획 추가 검토
  if (input.hasDistrictPlan) {
    checks.push({
      item: '지구단위계획',
      status: 'warning',
      detail: '지구단위계획구역 — 별도 지침 건폐율/용적률/높이 인센티브 확인 필요',
      recommendation: '해당 구청 지구단위계획 지침서 확인 후 실제 한도 재검토'
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
