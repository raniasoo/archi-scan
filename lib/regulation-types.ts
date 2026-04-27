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
  "residential-1": "제1종 일반주거지역",
  "residential-2": "제2종 일반주거지역",
  "residential-3": "제3종 일반주거지역",
  "semi-residential": "준주거지역",
  "commercial-general": "일반상업지역",
  "commercial-neighborhood": "근린상업지역",
  "industrial": "준공업지역",
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

// 용도지역별 기본값
export const ZONE_DEFAULTS: Record<ZoneType, Partial<ZoningRegulation>> = {
  "residential-1": {
    maxCoverageRatio: 60,
    maxFloorAreaRatio: 150,
    maxHeight: 20,
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
    maxFloorAreaRatio: 250,
    maxHeight: 50,
    maxFloors: 15,
    parkingRatio: 1.2,
  },
  "semi-residential": {
    maxCoverageRatio: 70,
    maxFloorAreaRatio: 400,
    maxHeight: 60,
    maxFloors: 20,
    parkingRatio: 1.0,
  },
  "commercial-general": {
    maxCoverageRatio: 80,
    maxFloorAreaRatio: 800,
    maxHeight: 100,
    maxFloors: 30,
    parkingRatio: 0.7,
  },
  "commercial-neighborhood": {
    maxCoverageRatio: 70,
    maxFloorAreaRatio: 600,
    maxHeight: 60,
    maxFloors: 15,
    parkingRatio: 0.8,
  },
  "industrial": {
    maxCoverageRatio: 70,
    maxFloorAreaRatio: 400,
    maxHeight: 50,
    maxFloors: 12,
    parkingRatio: 0.5,
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
  // 이격거리 반영한 유효 대지면적 계산 (간단한 근사)
  const totalSetback = regulation.setbackFront + regulation.setbackRear
  const sideSetback = regulation.setbackSide * 2
  
  // 대지 형상을 정사각형으로 가정하여 유효면적 계산
  const sideLength = Math.sqrt(siteArea)
  const effectiveLength = Math.max(sideLength - sideSetback, 0)
  const effectiveDepth = Math.max(sideLength - totalSetback, 0)
  const effectiveSiteArea = effectiveLength * effectiveDepth
  
  // 사선 제한에 따른 높이 조정
  let effectiveMaxHeight = regulation.maxHeight
  if (regulation.setbackType !== "none") {
    // 사선제한 적용 시 높이 감소 (간단한 계산)
    const roadFactor = regulation.roadWidth * Math.tan((regulation.setbackAngle * Math.PI) / 180)
    effectiveMaxHeight = Math.min(effectiveMaxHeight, roadFactor + regulation.setbackFront)
  }
  
  // 최대 건축면적 (건폐율 적용)
  const maxBuildingArea = (effectiveSiteArea * regulation.maxCoverageRatio) / 100
  
  // 최대 연면적: 용적률 기준과 층수 제한 기준 중 작은 값
  const maxGFAByFAR = (siteArea * regulation.maxFloorAreaRatio) / 100
  const maxGFAByFloors = maxBuildingArea * regulation.maxFloors  // 층수 제한 기준
  const maxGrossFloorArea = Math.min(maxGFAByFAR, maxGFAByFloors)
  
  // 층당 평균 면적을 80%로 가정 (공용면적 제외)
  const avgFloorArea = maxBuildingArea * 0.8
  
  // 권장 층수 계산
  const recommendedMaxFloors = Math.min(
    regulation.maxFloors,
    Math.floor(effectiveMaxHeight / 3.2), // 층고 3.2m 기준
    Math.ceil(maxGrossFloorArea / avgFloorArea)
  )
  const recommendedMinFloors = Math.max(3, Math.ceil(recommendedMaxFloors * 0.6))
  
  // 예상 세대수 (세대당 85㎡ 기준 - 공용 포함 약 110㎡ 공급면적 기준으로 보수적 계산)
  const avgUnitSize = 85
  const estimatedUnits = Math.floor(maxGrossFloorArea / avgUnitSize)
  
  // 법정 주차대수 (서울시 조례 기준)
  // 전용 60m² 이하: 0.5대/세대, 60~85m²: 1.0대/세대
  // 85m² 기준 세대는 소형(60m²이하) 위주로 가정 → 0.7대/세대 (혼합 기준)
  const parkingPerUnit = avgUnitSize <= 60 ? 0.5 : avgUnitSize <= 85 ? 0.7 : 1.0
  const requiredParking = Math.ceil(estimatedUnits * parkingPerUnit)
  
  // 경고 및 유의사항 생성
  const warnings: RegulationWarning[] = []
  
  if (effectiveSiteArea < siteArea * 0.5) {
    warnings.push({
      type: "warning",
      title: "유효 대지면적 감소",
      description: `이격거리 적용 후 유효 대지면적이 원래 면적의 ${Math.round((effectiveSiteArea / siteArea) * 100)}%로 감소합니다. 건축 계획 수립 시 주의가 필요합니다.`,
    })
  }
  
  if (regulation.roadWidth < 6) {
    warnings.push({
      type: "warning",
      title: "협소한 접도 폭",
      description: "접도 폭이 6m 미만인 경우 차량 진출입 및 소방차 접근에 제한이 있을 수 있습니다.",
    })
  }
  
  if (regulation.setbackType === "both") {
    warnings.push({
      type: "info",
      title: "복합 사선제한 적용",
      description: "북측사선과 도로사선이 동시에 적용되어 상층부 면적이 감소할 수 있습니다.",
    })
  }
  
  if (regulation.maxFloorAreaRatio > 300 && regulation.zoneType.includes("residential")) {
    warnings.push({
      type: "info",
      title: "고밀도 주거 개발",
      description: "용적률 300% 이상의 고밀도 개발은 일조권, 프라이버시 등에 대한 추가 검토가 필요합니다.",
    })
  }
  
  if (requiredParking > maxBuildingArea / 25) {
    warnings.push({
      type: "warning",
      title: "주차 면적 과다",
      description: "필요 주차대수 확보를 위해 지하주차장 2개층 이상이 필요할 수 있습니다.",
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
