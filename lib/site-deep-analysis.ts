/**
 * 대지 심화 위험도 분석
 * 
 * ① 침하(부등침하) 가능성 분석
 * ② 붕괴/산사태 위험 분석
 * ③ 철거 건물 이력 (건축물대장 말소)
 * ④ 토양 오염 위험도
 * ⑤ 매장 문화재 위험도
 */

// ━━━ ① 침하(부등침하) 분석 ━━━

export interface SubsidenceAnalysis {
  risk: 'low' | 'medium' | 'high' | 'very-high'
  estimatedSettlement: number    // 추정 침하량 (mm)
  differentialRisk: boolean      // 부등침하 위험
  consolidationTime: number      // 압밀 소요 기간 (개월)
  causes: string[]
  preventionMethods: string[]
  costImpact: number             // 추가 비용 (%)
}

export function analyzeSubsidence(params: {
  soilCode: string; elevation: number; floors: number
  siteArea: number; groundwaterRisk: string
}): SubsidenceAnalysis {
  const { soilCode, elevation, floors, groundwaterRisk } = params
  const buildingLoad = floors * 12  // kN/㎡

  // 토질별 침하 특성
  const soilSettlement: Record<string, { base: number; rate: number; consolidation: number }> = {
    ROCK: { base: 0, rate: 0.01, consolidation: 0 },
    GRAVEL: { base: 2, rate: 0.05, consolidation: 1 },
    SAND: { base: 5, rate: 0.1, consolidation: 3 },
    CLAY: { base: 20, rate: 0.3, consolidation: 24 },
    SILT: { base: 40, rate: 0.5, consolidation: 36 },
    FILL: { base: 80, rate: 1.0, consolidation: 60 },
  }

  const ss = soilSettlement[soilCode] || soilSettlement.SAND
  const settlement = Math.round(ss.base + buildingLoad * ss.rate)
  const differential = soilCode === 'FILL' || soilCode === 'SILT' || (soilCode === 'CLAY' && floors >= 5)

  const causes: string[] = []
  const prevention: string[] = []

  if (soilCode === 'FILL') {
    causes.push('매립토 불균일 다짐 → 부등침하 고위험')
    causes.push('유기물 분해 → 장기 침하')
    prevention.push('선행 재하(프리로딩) 공법')
    prevention.push('심층 혼합처리(DCM) 공법')
    prevention.push('파일기초로 지지층까지 관입')
  }
  if (soilCode === 'SILT' || soilCode === 'CLAY') {
    causes.push('연약 점성토 압밀침하')
    if (groundwaterRisk === 'high') causes.push('높은 지하수위 → 유효응력 감소')
    prevention.push('연직배수(PBD/SCP) + 프리로딩')
    prevention.push('매트기초 + 지반보강')
  }
  if (soilCode === 'SAND' && elevation < 15) {
    causes.push('느슨한 모래층 진동 다짐 가능성')
    prevention.push('진동다짐 또는 동다짐 공법')
  }
  if (causes.length === 0) {
    causes.push('양호한 지반 조건 (침하 위험 낮음)')
    prevention.push('일반 기초 설계로 충분')
  }

  const risk = settlement >= 50 ? 'very-high' : settlement >= 25 ? 'high' : settlement >= 10 ? 'medium' : 'low'
  const costImpact = soilCode === 'FILL' ? 25 : soilCode === 'SILT' ? 18 : soilCode === 'CLAY' ? 8 : 0

  return {
    risk, estimatedSettlement: settlement, differentialRisk: differential,
    consolidationTime: ss.consolidation, causes, preventionMethods: prevention,
    costImpact,
  }
}

// ━━━ ② 붕괴/산사태 위험 분석 ━━━

export interface CollapseAnalysis {
  structuralRisk: 'low' | 'medium' | 'high'   // 구조 붕괴
  landsideRisk: 'low' | 'medium' | 'high'     // 산사태
  sinkholeRisk: 'low' | 'medium' | 'high'     // 싱크홀
  existingBuildingAge: number | null            // 기존 건물 연령
  structuralGrade: string                       // 안전등급 추정
  warnings: string[]
  inspectionNeeded: string[]
}

export function analyzeCollapseRisk(params: {
  slope: number; elevation: number; soilCode: string
  buildingAge?: number; floors: number
}): CollapseAnalysis {
  const { slope, elevation, soilCode, buildingAge, floors } = params
  const warnings: string[] = []
  const inspections: string[] = []

  // 산사태 위험 (경사 + 토질)
  let landsideRisk: 'low' | 'medium' | 'high' = 'low'
  if (slope > 30 && (soilCode === 'CLAY' || soilCode === 'SILT')) {
    landsideRisk = 'high'
    warnings.push('⚠️ 급경사+연약토: 산사태/사면붕괴 고위험')
    inspections.push('사면안정성 검토 (지반조사 + 사면해석)')
  } else if (slope > 15) {
    landsideRisk = 'medium'
    warnings.push('경사지: 사면안정성 확인 필요')
    inspections.push('절토 사면 안정성 검토')
  }

  // 싱크홀 위험 (석회암 지대, 지하수 과다 양수)
  let sinkholeRisk: 'low' | 'medium' | 'high' = 'low'
  if (soilCode === 'FILL' && elevation < 10) {
    sinkholeRisk = 'medium'
    warnings.push('매립지 저지대: 지반 함몰(싱크홀) 주의')
  }

  // 기존 건물 구조 위험
  let structuralRisk: 'low' | 'medium' | 'high' = 'low'
  let grade = '해당없음'
  if (buildingAge) {
    if (buildingAge >= 40) {
      structuralRisk = 'high'
      grade = 'D등급(불량) 추정'
      warnings.push(`⚠️ 건축 ${buildingAge}년 경과: 구조 안전성 우려 (안전진단 필수)`)
      inspections.push('정밀안전진단 실시 (시설물안전법)')
    } else if (buildingAge >= 25) {
      structuralRisk = 'medium'
      grade = 'C등급(보통) 추정'
      warnings.push(`건축 ${buildingAge}년: 노후 건물 (안전점검 권장)`)
      inspections.push('정기안전점검 결과 확인')
    } else {
      grade = 'B등급(양호) 추정'
    }
    // 석면 위험
    if (buildingAge >= 25) {
      warnings.push('⚠️ 2001년 이전 건축물: 석면 함유 가능 → 철거 전 석면조사 의무')
      inspections.push('석면 사전조사 (석면안전관리법)')
    }
  }

  if (warnings.length === 0) {
    warnings.push('특이 위험 요소 없음')
  }

  return {
    structuralRisk, landsideRisk, sinkholeRisk,
    existingBuildingAge: buildingAge || null,
    structuralGrade: grade,
    warnings, inspectionNeeded: inspections,
  }
}

// ━━━ ③ 철거 건물 이력 ━━━

export interface DemolishedBuilding {
  usage: string            // 용도 (주택/공장/주유소 등)
  area: number             // 면적 (㎡)
  floors: number           // 층수
  builtYear: number        // 건축년도
  demolishedYear: number   // 철거년도
  contaminationRisk: string // 오염 위험
}

export interface SiteHistoryDetail {
  demolishedBuildings: DemolishedBuilding[]
  previousUses: string[]
  contaminationSources: string[]
  contaminationRisk: 'none' | 'low' | 'medium' | 'high'
  requiredSurveys: string[]
}

// 과거 용도에 따른 오염 위험
const CONTAMINATION_RISK: Record<string, { risk: 'high' | 'medium' | 'low'; pollutants: string }> = {
  '주유소': { risk: 'high', pollutants: 'TPH(석유계총탄화수소), BTEX(벤젠류)' },
  '세탁소': { risk: 'high', pollutants: 'TCE(트리클로로에틸렌), 건식세제' },
  '공장': { risk: 'high', pollutants: '중금속(Pb,Cd,Cr), 유기용제' },
  '인쇄소': { risk: 'medium', pollutants: '유기용제, 중금속(Pb)' },
  '도금공장': { risk: 'high', pollutants: '시안(CN), 크롬(Cr6+), 니켈(Ni)' },
  '정비소': { risk: 'medium', pollutants: '폐유, TPH' },
  '창고': { risk: 'low', pollutants: '보관물에 따라 상이' },
  '주택': { risk: 'low', pollutants: '해당 없음 (석면 제외)' },
  '농지': { risk: 'low', pollutants: '농약 잔류 가능' },
}

export function analyzeSiteHistoryDetail(params: {
  address: string; zoneType?: string; elevation: number
  molitData?: { usage?: string; builtYear?: number; area?: number; floors?: number }
}): SiteHistoryDetail {
  const { address, zoneType, elevation, molitData } = params
  const demolished: DemolishedBuilding[] = []
  const previousUses: string[] = []
  const contaminationSources: string[] = []
  const surveys: string[] = []

  // 건축물대장에서 기존 건물 정보가 있으면
  if (molitData?.usage) {
    const usage = molitData.usage
    previousUses.push(usage)

    // 오염 위험 체크
    for (const [key, info] of Object.entries(CONTAMINATION_RISK)) {
      if (usage.includes(key)) {
        contaminationSources.push(`${key}: ${info.pollutants}`)
        if (info.risk === 'high') surveys.push(`토양정밀조사 필수 (과거 ${key} 운영)`)
        break
      }
    }

    if (molitData.builtYear) {
      demolished.push({
        usage, area: molitData.area || 0, floors: molitData.floors || 0,
        builtYear: molitData.builtYear, demolishedYear: 0,
        contaminationRisk: contaminationSources.length > 0 ? 'high' : 'low',
      })
    }
  }

  // 용도지역 기반 추정
  if (zoneType?.includes('공업') || zoneType?.includes('산업')) {
    previousUses.push('공업지역 (공장/창고 가능성)')
    contaminationSources.push('공업지역: 중금속, 유기용제 오염 가능')
    surveys.push('토양오염도 조사 (토양환경보전법 제5조)')
  }

  // 저지대 매립 추정
  if (elevation <= 5) {
    previousUses.push('매립지/습지 (과거)')
    contaminationSources.push('매립토: 유기물 분해, 침출수 오염 가능')
    surveys.push('지반조사 + 토양오염조사')
  }

  // 기본 조사 권장
  surveys.push('건축물대장 말소 이력 확인 (정부24)')
  surveys.push('토지이용규제정보서비스(LURIS) 이력 확인')
  surveys.push('토지e음 토지이용계획 열람')

  const risk = contaminationSources.length >= 2 ? 'high' :
    contaminationSources.length >= 1 ? 'medium' : 'none'

  return {
    demolishedBuildings: demolished,
    previousUses: previousUses.length > 0 ? previousUses : ['주거/농업 (일반)'],
    contaminationSources,
    contaminationRisk: risk,
    requiredSurveys: surveys,
  }
}

// ━━━ ④ 토양 오염 위험도 상세 ━━━

export interface SoilContaminationDetail {
  risk: 'none' | 'low' | 'medium' | 'high'
  possiblePollutants: string[]
  remediationCost: string        // 정화 비용 추정
  remediationTime: string        // 정화 기간
  legalRequirements: string[]
  nearbyRiskSources: string[]
}

export function analyzeSoilContamination(params: {
  address: string; zoneType?: string; previousUses: string[]
}): SoilContaminationDetail {
  const { address, zoneType, previousUses } = params
  const pollutants: string[] = []
  const legal: string[] = []
  const nearby: string[] = []

  let risk: 'none' | 'low' | 'medium' | 'high' = 'none'

  // 용도 기반 오염 추정
  for (const use of previousUses) {
    for (const [key, info] of Object.entries(CONTAMINATION_RISK)) {
      if (use.includes(key) && info.risk !== 'low') {
        pollutants.push(info.pollutants)
        risk = info.risk === 'high' ? 'high' : risk === 'high' ? 'high' : 'medium'
      }
    }
  }

  // 공업 지역
  if (zoneType?.includes('공업')) {
    risk = risk === 'none' ? 'medium' : risk
    nearby.push('공업지역: 주변 공장 토양오염 가능')
  }

  // 법적 요구사항
  if (risk === 'high') {
    legal.push('토양환경보전법 제10조의4: 토양오염조사 의무')
    legal.push('오염 확인 시 정화 명령 (토양정화비용 부담)')
    legal.push('토지거래 시 토양오염 고지 의무')
  }
  if (risk === 'medium') {
    legal.push('토양오염우려기준 초과 여부 확인 권장')
    legal.push('용도 변경 시 토양환경평가 필요 가능')
  }
  legal.push('토양환경보전법 시행규칙 별표3: 토양오염우려기준')

  // 비용 추정
  const costMap = { none: '불요', low: '불요', medium: '1~3억원', high: '5~30억원' }
  const timeMap = { none: '-', low: '-', medium: '3~6개월', high: '6~24개월' }

  return {
    risk, possiblePollutants: pollutants,
    remediationCost: costMap[risk],
    remediationTime: timeMap[risk],
    legalRequirements: legal,
    nearbyRiskSources: nearby,
  }
}

// ━━━ ⑤ 매장 문화재 위험도 상세 ━━━

export interface CulturalHeritageDetail {
  risk: 'none' | 'low' | 'medium' | 'high'
  nearbyHeritage: string[]
  surveyRequired: boolean
  surveyType: string
  estimatedDelay: string    // 예상 공사 지연 기간
  estimatedCost: string     // 조사 비용
  legalBasis: string[]
}

// 문화재 고위험 지역
const HERITAGE_ZONES: Record<string, string> = {
  '종로구': '경복궁/창덕궁/종묘 인접',
  '중구': '남산/한양도성 인접',
  '경주': '신라 왕경 유적 밀집',
  '부여': '백제 사비도성',
  '공주': '백제 웅진도성',
  '익산': '백제 왕궁리 유적',
  '김해': '가야 유적 밀집',
  '용인': '처인성 등 고려 유적',
  '파주': '임진강 유역 선사 유적',
}

export function analyzeCulturalHeritage(params: {
  address: string; siteArea: number; elevation: number
}): CulturalHeritageDetail {
  const { address, siteArea, elevation } = params
  const nearby: string[] = []
  const legal: string[] = []

  let risk: 'none' | 'low' | 'medium' | 'high' = 'none'
  let surveyRequired = false
  let surveyType = '불요'
  let delay = '-'
  let cost = '-'

  // 문화재 고위험 지역 체크
  for (const [area, desc] of Object.entries(HERITAGE_ZONES)) {
    if (address.includes(area)) {
      risk = 'high'
      nearby.push(`${area}: ${desc}`)
      surveyRequired = true
      break
    }
  }

  // 5,000㎡ 이상 의무 조사
  if (siteArea >= 5000) {
    surveyRequired = true
    risk = risk === 'none' ? 'medium' : risk
    legal.push('문화재보호법 제44조: 5,000㎡ 이상 개발 시 매장문화재 지표조사 의무')
  }

  // 30,000㎡ 이상
  if (siteArea >= 30000) {
    risk = 'high'
    legal.push('문화재보호법 시행령: 30,000㎡ 이상 개발 시 시굴조사 가능')
  }

  if (surveyRequired) {
    surveyType = risk === 'high' ? '지표조사 + 시굴조사 가능' : '지표조사'
    delay = risk === 'high' ? '3~12개월' : '1~3개월'
    cost = risk === 'high' ? '3,000만~2억원' : '500만~3,000만원'
    legal.push('매장문화재 발견 시 공사 중지 + 발굴조사 (문화재보호법 제44조)')
    legal.push('조사 비용은 사업시행자 부담')
  }

  if (!surveyRequired && risk === 'none') {
    legal.push('매장문화재 특이사항 없음 (일반 절차)')
  }

  return {
    risk, nearbyHeritage: nearby, surveyRequired, surveyType,
    estimatedDelay: delay, estimatedCost: cost, legalBasis: legal,
  }
}
