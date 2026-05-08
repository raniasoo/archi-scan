// 건축 법규 관련 타입 정의

export interface ZoningRegulation {
  // 용도지역
  zoneType: ZoneType
  zoneTypeCustom?: string
  
  // 건폐율/용적률
  maxCoverageRatio: number // 건폐율 (%)
  maxFloorAreaRatio: number // 용적률 (%)
  
  // 높이 제한
  maxHeight: number // 높이 제한 (m)
  maxFloors: number // 최대 층수
  
  // 도로 조건
  roadWidth: number // 접도 폭 (m)
  roadCondition: RoadCondition
  
  // 주차 기준
  parkingRatio: number // 세대당 주차대수
  
  // 사선 제한
  setbackType: SetbackType
  setbackAngle: number // 사선 각도 (도)
  
  // 이격거리
  setbackFront: number // 전면 이격 (m)
  setbackSide: number // 측면 이격 (m)
  setbackRear: number // 후면 이격 (m)
  
  // 기타
  additionalNotes: string
}

export type ZoneType = 
  | "residential-exclusive-1" // 제1종 전용주거지역
  | "residential-exclusive-2" // 제2종 전용주거지역
  | "residential-1" // 제1종 일반주거지역
  | "residential-2" // 제2종 일반주거지역
  | "residential-3" // 제3종 일반주거지역
  | "semi-residential" // 준주거지역
  | "commercial-general" // 일반상업지역
  | "commercial-neighborhood" // 근린상업지역
  | "commercial-central" // 중심상업지역
  | "industrial" // 준공업지역
  | "industrial-general" // 일반공업지역
  | "green-natural" // 자연녹지지역
  | "custom" // 직접 입력

export type RoadCondition = 
  | "4m" // 4m 이상
  | "6m" // 6m 이상
  | "8m" // 8m 이상
  | "12m" // 12m 이상
  | "corner" // 코너 대지

export type SetbackType = 
  | "none" // 없음
  | "north" // 북측사선
  | "road" // 도로사선
  | "both" // 복합적용

export const ZONE_TYPE_LABELS: Record<ZoneType, string> = {
  "residential-exclusive-1": "제1종 전용주거지역",
  "residential-exclusive-2": "제2종 전용주거지역",
  "residential-1": "제1종 일반주거지역",
  "residential-2": "제2종 일반주거지역",
  "residential-3": "제3종 일반주거지역",
  "semi-residential": "준주거지역",
  "commercial-general": "일반상업지역",
  "commercial-neighborhood": "근린상업지역",
  "commercial-central": "중심상업지역",
  "industrial": "준공업지역",
  "industrial-general": "일반공업지역",
  "green-natural": "자연녹지지역",
  "custom": "직접 입력",
}

export const ROAD_CONDITION_LABELS: Record<RoadCondition, string> = {
  "4m": "4m 이상",
  "6m": "6m 이상",
  "8m": "8m 이상",
  "12m": "12m 이상",
  "corner": "코너 대지 (2면 접도)",
}

export const SETBACK_TYPE_LABELS: Record<SetbackType, string> = {
  "none": "없음",
  "north": "북측사선제한",
  "road": "도로사선제한",
  "both": "복합적용",
}

// 용도지역별 기본값 (국토계획법 시행령 + 서울시 도시계획조례 기준)
export const ZONE_DEFAULTS: Record<ZoneType, Partial<ZoningRegulation>> = {
  "residential-exclusive-1": {
    maxCoverageRatio: 50,
    maxFloorAreaRatio: 100,
    maxHeight: 12,
    maxFloors: 3,
    parkingRatio: 1.0,
  },
  "residential-exclusive-2": {
    maxCoverageRatio: 50,
    maxFloorAreaRatio: 150,
    maxHeight: 18,
    maxFloors: 5,
    parkingRatio: 1.0,
  },
  "residential-1": {
    maxCoverageRatio: 60,
    maxFloorAreaRatio: 150,
    maxHeight: 16,
    maxFloors: 4,
    parkingRatio: 1.0,
  },
  "residential-2": {
    maxCoverageRatio: 60,
    maxFloorAreaRatio: 200,
    maxHeight: 30,
    maxFloors: 12,
    parkingRatio: 1.0,
  },
  "residential-3": {
    maxCoverageRatio: 50,
    maxFloorAreaRatio: 300,
    maxHeight: 50,
    maxFloors: 15,
    parkingRatio: 1.0,
  },
  "semi-residential": {
    maxCoverageRatio: 60,
    maxFloorAreaRatio: 400,
    maxHeight: 60,
    maxFloors: 20,
    parkingRatio: 1.0,
  },
  "commercial-general": {
    maxCoverageRatio: 60,
    maxFloorAreaRatio: 800,
    maxHeight: 100,
    maxFloors: 30,
    parkingRatio: 0.8,
  },
  "commercial-neighborhood": {
    maxCoverageRatio: 60,
    maxFloorAreaRatio: 600,
    maxHeight: 60,
    maxFloors: 20,
    parkingRatio: 0.8,
  },
  "commercial-central": {
    maxCoverageRatio: 60,
    maxFloorAreaRatio: 1000,
    maxHeight: 150,
    maxFloors: 40,
    parkingRatio: 0.7,
  },
  "industrial": {
    maxCoverageRatio: 60,
    maxFloorAreaRatio: 400,
    maxHeight: 50,
    maxFloors: 12,
    parkingRatio: 0.5,
  },
  "industrial-general": {
    maxCoverageRatio: 60,
    maxFloorAreaRatio: 350,
    maxHeight: 50,
    maxFloors: 10,
    parkingRatio: 0.5,
  },
  "green-natural": {
    maxCoverageRatio: 20,
    maxFloorAreaRatio: 80,
    maxHeight: 12,
    maxFloors: 3,
    parkingRatio: 1.0,
  },
  "custom": {
    maxCoverageRatio: 60,
    maxFloorAreaRatio: 200,
    maxHeight: 30,
    maxFloors: 10,
    parkingRatio: 1.0,
  },
}

// 법규 분석 결과 타입
export interface RegulationAnalysis {
  // 최대 건축 가능 면적
  maxBuildingArea: number // 최대 건축면적 (건폐율 적용)
  maxGrossFloorArea: number // 최대 연면적 (용적률 적용)
  
  // 권장 층수 범위
  recommendedMinFloors: number
  recommendedMaxFloors: number
  
  // 예상 세대수
  estimatedUnits: number
  
  // 필요 주차 대수
  requiredParking: number
  
  // 유효 대지면적 (이격거리 적용 후)
  effectiveSiteArea: number
  
  // 경고 및 유의사항
  warnings: RegulationWarning[]
  
  // 추가 검토 필요 항목
  reviewItems: string[]
}

export interface RegulationWarning {
  type: "error" | "warning" | "info"
  title: string
  description: string
}

// 법규 분석 함수
export function analyzeRegulations(
  siteArea: number,
  regulation: ZoningRegulation
): RegulationAnalysis {
  // regulation이 불완전할 경우 안전 기본값 적용
  const r = regulation || getDefaultRegulation()
  
  // 이격거리 반영한 유효 대지면적 계산 (간단한 근사)
  const totalSetback = (r.setbackFront ?? 3) + (r.setbackRear ?? 2)
  const sideSetback = (r.setbackSide ?? 1.5) * 2
  
  // 대지 형상을 정사각형으로 가정하여 유효면적 계산
  const sideLength = Math.sqrt(siteArea)
  const effectiveLength = Math.max(sideLength - sideSetback, 0)
  const effectiveDepth = Math.max(sideLength - totalSetback, 0)
  const effectiveSiteArea = effectiveLength * effectiveDepth
  
  // 사선 제한에 따른 높이 조정
  let effectiveMaxHeight = r.maxHeight ?? 30
  if (r.setbackType !== "none") {
    const roadFactor = (r.roadWidth ?? 8) * Math.tan(((r.setbackAngle ?? 45) * Math.PI) / 180)
    effectiveMaxHeight = Math.min(effectiveMaxHeight, roadFactor + (r.setbackFront ?? 3))
  }
  
  // 최대 건축면적 (건폐율 적용)
  const maxBuildingArea = (effectiveSiteArea * (r.maxCoverageRatio ?? 60)) / 100
  
  // 최대 연면적: 용적률 기준과 층수 제한 기준 중 작은 값
  const maxGFAByFAR = (siteArea * (r.maxFloorAreaRatio ?? 200)) / 100
  const maxGFAByFloors = maxBuildingArea * (r.maxFloors ?? 12)
  const maxGrossFloorArea = Math.min(maxGFAByFAR, maxGFAByFloors)
  
  // 층당 평균 면적을 80%로 가정 (공용면적 제외)
  const avgFloorArea = maxBuildingArea * 0.8
  
  // 권장 층수 계산
  const recommendedMaxFloors = Math.min(
    r.maxFloors ?? 12,
    Math.floor(effectiveMaxHeight / 3.2), // 층고 3.2m 기준
    Math.ceil(maxGrossFloorArea / avgFloorArea)
  )
  const recommendedMinFloors = Math.max(3, Math.ceil(recommendedMaxFloors * 0.6))
  
  // 예상 세대수 (세대당 전용 84㎡ 기준 — 한국 표준 주거 면적)
  const avgUnitSize = 84
  const estimatedUnits = Math.floor(maxGrossFloorArea / avgUnitSize)
  
  // 법정 주차대수 — regulation.parkingRatio 사용 (용도지역별 이미 설정됨)
  const requiredParking = Math.ceil(estimatedUnits * r.parkingRatio ?? 1.0)
  
  // 경고 및 유의사항 생성
  const warnings: RegulationWarning[] = []
  
  if (effectiveSiteArea < siteArea * 0.5) {
    warnings.push({
      type: "warning",
      title: "유효 대지면적 감소",
      description: `이격거리 적용 후 유효 대지면적이 원래 면적의 ${Math.round((effectiveSiteArea / siteArea) * 100)}%로 감소합니다. 건축 계획 수립 시 주의가 필요합니다.`,
    })
  }
  
  if (r.roadWidth ?? 8 < 4) {
    warnings.push({
      type: "error",
      title: "접도 요건 미충족",
      description: "건축법 제44조에 따라 건축물 대지는 2m 이상 도로에 접해야 합니다. 현재 접도 폭이 4m 미만으로 건축 허가에 제한이 있을 수 있습니다.",
    })
  } else if (r.roadWidth ?? 8 < 6) {
    warnings.push({
      type: "warning",
      title: "협소한 접도 폭",
      description: "접도 폭이 6m 미만인 경우 차량 진출입 및 소방차 접근에 제한이 있을 수 있습니다. 건축선 후퇴가 필요할 수 있습니다.",
    })
  }
  
  if (r.setbackType === "both") {
    warnings.push({
      type: "info",
      title: "복합 사선제한 적용",
      description: "북측사선과 도로사선이 동시에 적용되어 상층부 면적이 감소할 수 있습니다. 건축법 제61조 일조권 사선제한 검토가 필요합니다.",
    })
  }
  
  if (regulation.maxFloorAreaRatio > 300 && regulation.zoneType.includes("residential")) {
    warnings.push({
      type: "info",
      title: "고밀도 주거 개발",
      description: "용적률 300% 이상의 고밀도 개발은 일조권, 프라이버시, 환경영향평가 대상 여부 등에 대한 추가 검토가 필요합니다.",
    })
  }
  
  if (regulation.zoneType === "residential-exclusive-1" || regulation.zoneType === "residential-exclusive-2") {
    warnings.push({
      type: "info",
      title: "전용주거지역 용도 제한",
      description: "전용주거지역은 단독주택과 공동주택만 건축 가능하며, 근린생활시설(상가) 배치가 제한됩니다. 국토계획법 시행령 제71조를 확인하세요.",
    })
  }
  
  if (regulation.zoneType === "green-natural") {
    warnings.push({
      type: "warning",
      title: "자연녹지지역 개발 제한",
      description: "자연녹지지역은 건폐율 20%, 용적률 80%로 개발 밀도가 매우 낮습니다. 개발행위 허가 기준을 별도로 확인해야 합니다.",
    })
  }
  
  if (requiredParking > maxBuildingArea / 25) {
    warnings.push({
      type: "warning",
      title: "주차 면적 과다",
      description: `필요 주차 ${requiredParking}대 확보를 위해 지하주차장 2개층 이상이 필요할 수 있습니다. 기계식 주차장 검토를 권고합니다.`,
    })
  }
  
  if (siteArea < 200) {
    warnings.push({
      type: "info",
      title: "소규모 대지",
      description: "대지면적 200㎡ 미만은 건축 효율이 크게 떨어집니다. 인접 필지 합필 가능성을 검토하세요.",
    })
  }
  
  // 추가 검토 필요 항목
  const reviewItems: string[] = [
    "토지이용계획확인서 상 세부 규제 사항 확인",
    "지구단위계획 수립 여부 및 세부 지침 확인",
    "일조권 사선제한 적용 범위 확인",
    "학교정화구역, 군사시설보호구역 등 특별 규제 확인",
    "문화재보호구역, 경관지구 해당 여부 확인",
    "환경영향평가, 교통영향평가 대상 여부 확인",
  ]
  
  return {
    maxBuildingArea,
    maxGrossFloorArea,
    recommendedMinFloors,
    recommendedMaxFloors,
    estimatedUnits,
    requiredParking,
    effectiveSiteArea,
    warnings,
    reviewItems,
  }
}

// 기본 법규 값 생성
export function getDefaultRegulation(): ZoningRegulation {
  return {
    zoneType: "residential-2",
    maxCoverageRatio: 60,
    maxFloorAreaRatio: 200,
    maxHeight: 30,
    maxFloors: 12,
    roadWidth: 8,
    roadCondition: "8m",
    parkingRatio: 1.0,
    setbackType: "north",
    setbackAngle: 45,
    setbackFront: 3,
    setbackSide: 1.5,
    setbackRear: 2,
    additionalNotes: "",
  }
}
