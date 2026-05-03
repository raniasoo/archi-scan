import { ZoneType } from "./regulation-types"

// 건물 용도 유형
export type BuildingUseType = 
  | "apartment"       // 공동주택(아파트)
  | "multi-family"    // 다세대/연립
  | "single-family"   // 단독주택
  | "officetel"       // 오피스텔
  | "commercial-mix"  // 주상복합
  | "neighborhood"    // 근린생활시설
  | "office"          // 업무시설
  | "retail"          // 판매시설
  | "knowledge-industry" // 지식산업센터

export interface ZoneLayoutConfig {
  allowedUses: BuildingUseType[]
  primaryUse: BuildingUseType
  layoutNamePrefix: Record<string, string> // layout type → 이름 접두사
  floorMultiplier: number // 층수 보정
  coverageMultiplier: number // 건폐율 보정
  description: string
}

const USE_LABELS: Record<BuildingUseType, string> = {
  "apartment": "공동주택(아파트)",
  "multi-family": "다세대/연립주택",
  "single-family": "단독주택",
  "officetel": "오피스텔",
  "commercial-mix": "주상복합",
  "neighborhood": "근린생활시설",
  "office": "업무시설",
  "retail": "판매시설",
  "knowledge-industry": "지식산업센터",
}

export function getUseLabel(use: BuildingUseType): string {
  return USE_LABELS[use] || use
}

// 용도지역별 배치안 설정
export const ZONE_LAYOUT_CONFIGS: Record<string, ZoneLayoutConfig> = {
  // ===== 주거지역 =====
  "residential-exclusive-1": {
    allowedUses: ["single-family"],
    primaryUse: "single-family",
    layoutNamePrefix: {
      tower: "저층 단독형",
      courtyard: "정원형 단독",
      lshape: "ㄱ자형 단독",
      linear: "나란히형 단독",
      cluster: "필지 분할형",
    },
    floorMultiplier: 0.3, // 최대 2~3층
    coverageMultiplier: 0.85,
    description: "단독주택만 가능 (4층 이하)",
  },

  "residential-exclusive-2": {
    allowedUses: ["single-family", "multi-family"],
    primaryUse: "multi-family",
    layoutNamePrefix: {
      tower: "저층 다세대형",
      courtyard: "중정형 다세대",
      lshape: "ㄱ자형 다세대",
      linear: "연립형 배치",
      cluster: "테라스형 다세대",
    },
    floorMultiplier: 0.4,
    coverageMultiplier: 0.85,
    description: "단독·다세대 주택 (아파트 불가)",
  },

  "residential-1": {
    allowedUses: ["multi-family", "single-family"],
    primaryUse: "multi-family",
    layoutNamePrefix: {
      tower: "컴팩트 다세대",
      courtyard: "중정형 빌라",
      lshape: "ㄱ자형 빌라",
      linear: "판상형 빌라",
      cluster: "타운하우스형",
    },
    floorMultiplier: 0.4, // 4층 이하
    coverageMultiplier: 1.0,
    description: "4층 이하 다세대·빌라",
  },

  "residential-2": {
    allowedUses: ["apartment", "multi-family"],
    primaryUse: "apartment",
    layoutNamePrefix: {
      tower: "타워형 아파트",
      courtyard: "중정형 아파트",
      lshape: "ㄱ자형 아파트",
      linear: "판상형 아파트",
      cluster: "클러스터형 아파트",
    },
    floorMultiplier: 0.8,
    coverageMultiplier: 1.0,
    description: "아파트 포함 공동주택",
  },

  "residential-3": {
    allowedUses: ["apartment", "officetel", "multi-family"],
    primaryUse: "apartment",
    layoutNamePrefix: {
      tower: "고층 타워형",
      courtyard: "중정형 주거",
      lshape: "ㄱ자형 주거",
      linear: "판상형 주거",
      cluster: "주거 클러스터",
    },
    floorMultiplier: 1.0,
    coverageMultiplier: 1.0,
    description: "고층 아파트·오피스텔 가능",
  },

  "semi-residential": {
    allowedUses: ["apartment", "officetel", "commercial-mix", "neighborhood"],
    primaryUse: "commercial-mix",
    layoutNamePrefix: {
      tower: "주상복합 타워",
      courtyard: "복합 중정형",
      lshape: "상가+주거 ㄱ자형",
      linear: "스트리트형 복합",
      cluster: "블록형 복합",
    },
    floorMultiplier: 1.0,
    coverageMultiplier: 1.1,
    description: "주상복합·오피스텔·상가 혼합",
  },

  // ===== 상업지역 =====
  "commercial-neighborhood": {
    allowedUses: ["commercial-mix", "officetel", "neighborhood", "apartment", "retail"],
    primaryUse: "commercial-mix",
    layoutNamePrefix: {
      tower: "근린 복합타워",
      courtyard: "오픈몰형",
      lshape: "상가+오피스텔 ㄱ자형",
      linear: "스트리트 상가",
      cluster: "근린 상업블록",
    },
    floorMultiplier: 1.0,
    coverageMultiplier: 1.1,
    description: "상가·오피스텔·주상복합",
  },

  "commercial-general": {
    allowedUses: ["commercial-mix", "officetel", "office", "retail", "apartment"],
    primaryUse: "commercial-mix",
    layoutNamePrefix: {
      tower: "복합 상업타워",
      courtyard: "중정형 복합몰",
      lshape: "상업+오피스 ㄱ자형",
      linear: "대형 상가동",
      cluster: "상업 블록형",
    },
    floorMultiplier: 1.2,
    coverageMultiplier: 1.2,
    description: "거의 모든 용도 가능 (고층 복합)",
  },

  "commercial-central": {
    allowedUses: ["office", "commercial-mix", "retail", "officetel", "apartment"],
    primaryUse: "office",
    layoutNamePrefix: {
      tower: "초고층 복합타워",
      courtyard: "중심상업 복합",
      lshape: "듀얼타워 복합",
      linear: "메가 상업동",
      cluster: "도심 복합블록",
    },
    floorMultiplier: 1.5,
    coverageMultiplier: 1.3,
    description: "초고층 업무·상업 복합 개발",
  },

  // ===== 공업지역 =====
  "industrial": {
    allowedUses: ["knowledge-industry", "officetel", "apartment", "neighborhood"],
    primaryUse: "knowledge-industry",
    layoutNamePrefix: {
      tower: "지식산업 타워",
      courtyard: "캠퍼스형 산업단지",
      lshape: "산업+주거 ㄱ자형",
      linear: "산업동 배치",
      cluster: "산업 클러스터",
    },
    floorMultiplier: 0.9,
    coverageMultiplier: 1.1,
    description: "지식산업센터·오피스텔 (조건부 주거)",
  },

  "industrial-general": {
    allowedUses: ["knowledge-industry"],
    primaryUse: "knowledge-industry",
    layoutNamePrefix: {
      tower: "산업시설 타워",
      courtyard: "공장형 배치",
      lshape: "ㄱ자형 공장",
      linear: "물류동 배치",
      cluster: "산업 블록형",
    },
    floorMultiplier: 0.6,
    coverageMultiplier: 1.1,
    description: "공장·물류·지식산업센터 (주거 불가)",
  },

  // ===== 녹지지역 =====
  "green-natural": {
    allowedUses: ["single-family"],
    primaryUse: "single-family",
    layoutNamePrefix: {
      tower: "저층 전원형",
      courtyard: "정원형 주택",
      lshape: "ㄱ자형 전원주택",
      linear: "테라스형 주택",
      cluster: "전원 클러스터",
    },
    floorMultiplier: 0.2, // 2~3층 이하
    coverageMultiplier: 0.4,
    description: "단독주택 제한적 가능",
  },
}

// 용도지역에 맞는 배치안 이름 생성
export function getZoneLayoutName(
  zoneType: string, 
  layoutType: string, 
  strategy: string
): string {
  const config = ZONE_LAYOUT_CONFIGS[zoneType]
  if (!config) return layoutType // fallback
  
  const prefix = config.layoutNamePrefix[layoutType]
  if (!prefix) return layoutType
  
  // 전략에 따른 접미사
  const strategySuffix: Record<string, string> = {
    "view-priority": "(조망형)",
    "area-maximize": "(고밀도)",
    "profitability": "(수익형)",
    "livability": "(생활형)",
    "privacy-priority": "(프라이빗)",
    "parking-efficient": "(주차최적)",
  }
  
  return `${prefix} ${strategySuffix[strategy] || ''}`.trim()
}

// 용도지역에 맞는 배치안 설명 생성
export function getZoneLayoutDescription(
  zoneType: string,
  layoutType: string,
  strategy: string
): string {
  const config = ZONE_LAYOUT_CONFIGS[zoneType]
  if (!config) return ''
  
  const use = getUseLabel(config.primaryUse)
  const descriptions: Record<string, Record<string, string>> = {
    tower: {
      "single-family": "대지 효율을 높인 3층 이하 단독주택",
      "multi-family": "소규모 대지에 최적화된 저층 다세대 배치",
      "apartment": "법적 용적률을 최대 활용하는 고층 타워 배치",
      "officetel": "효율적 코어로 임대수익을 극대화하는 오피스텔 타워",
      "commercial-mix": "저층 상가 + 상층 주거의 주상복합 타워",
      "office": "대형 업무공간을 확보하는 오피스 타워",
      "knowledge-industry": "제조·연구·사무 복합 지식산업센터",
    },
    courtyard: {
      "single-family": "중앙 정원을 둘러싼 프라이빗 단독주택",
      "multi-family": "채광과 통풍이 우수한 중정형 빌라",
      "apartment": "중앙 정원과 커뮤니티 공간 중심의 아파트",
      "commercial-mix": "오픈몰과 주거가 결합된 복합 중정형",
      "office": "녹지와 업무공간이 조화된 캠퍼스형 배치",
      "knowledge-industry": "연구동과 녹지가 어우러진 캠퍼스형",
    },
  }
  
  return descriptions[layoutType]?.[config.primaryUse] || 
    `${use} 중심의 ${layoutType} 배치`
}
