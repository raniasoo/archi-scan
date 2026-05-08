// AI 설계 전략 관련 타입 및 로직

import type { ZoningRegulation } from "./regulation-types"

export type DesignStrategy =
  | "view-priority"        // 조망 우선형
  | "privacy-priority"     // 프라이버시 우선형
  | "area-maximize"        // 면적 확보형
  | "parking-efficient"    // 주차 효율형
  | "profitability"        // 사업성 우선형
  | "livability"           // 실거주 최적형

export interface StrategyInfo {
  id: DesignStrategy
  name: string
  description: string
  icon: string
  priorities: string[]
  tradeoffs: string[]
}

export const STRATEGY_INFO: Record<DesignStrategy, StrategyInfo> = {
  "view-priority": {
    id: "view-priority",
    name: "조망 우선형",
    description: "개방감과 조망권을 최우선으로 고려한 배치",
    icon: "eye",
    priorities: ["남향 배치", "전면 개방", "높은 층고", "테라스 확보"],
    tradeoffs: ["건폐율 낮음", "연면적 감소 가능"],
  },
  "privacy-priority": {
    id: "privacy-priority",
    name: "프라이버시 우선형",
    description: "세대 간 프라이버시와 독립성을 중시한 배치",
    icon: "shield",
    priorities: ["세대 분리", "이격거리 확보", "시선 차단", "독립 동선"],
    tradeoffs: ["공용면적 증가", "세대수 감소"],
  },
  "area-maximize": {
    id: "area-maximize",
    name: "면적 확보형",
    description: "법적 한도 내 최대 연면적을 확보하는 배치",
    icon: "maximize",
    priorities: ["용적률 극대화", "건폐율 최대 활용", "층수 최대화", "공용면적 최소화"],
    tradeoffs: ["개방감 감소", "주거 환경 품질"],
  },
  "parking-efficient": {
    id: "parking-efficient",
    name: "주차 효율형",
    description: "주차 공간과 차량 동선을 최적화한 배치",
    icon: "car",
    priorities: ["지상주차 최소화", "주차 효율", "차량 동선", "보행자 안전"],
    tradeoffs: ["지하 공사비 증가", "건축면적 제약"],
  },
  "profitability": {
    id: "profitability",
    name: "사업성 우선형",
    description: "투자 수익률과 분양성을 극대화하는 배치",
    icon: "trending-up",
    priorities: ["세대수 극대화", "분양 면적 확보", "공사비 절감", "빠른 분양"],
    tradeoffs: ["주거 품질 타협", "커뮤니티 공간 축소"],
  },
  "livability": {
    id: "livability",
    name: "실거주 최적형",
    description: "실제 거주자의 생활 편의를 중심으로 한 배치",
    icon: "home",
    priorities: ["생활 편의", "커뮤니티", "녹지 공간", "채광/환기"],
    tradeoffs: ["연면적 소폭 감소", "분양가 상승"],
  },
}

// 점수 시스템
export interface LayoutScores {
  regulationCompliance: number  // 법규 적합성 (0-100)
  profitability: number         // 사업성 (0-100)
  marketability: number         // 상품성 (0-100)
  feasibility: number           // 실현 가능성 (0-100)
  overall: number               // 종합 점수 (0-100)
}

export interface LayoutRecommendation {
  isRecommended: boolean
  reasons: string[]
  warnings: string[]
  strategyMatch: number  // 전략 부합도 (0-100)
}

export interface AIReasoning {
  summary: string
  regulationConsiderations: string[]
  profitabilityAdvantages: string[]
  designFeatures: string[]
  risksAndChallenges: string[]
}

// 전략별 배치안 생성 파라미터
export interface StrategyParameters {
  coverageMultiplier: number      // 건폐율 활용 비율
  floorMultiplier: number         // 층수 활용 비율
  openSpaceRatio: number          // 개방공간 비율
  unitSizePreference: "small" | "medium" | "large" | "mixed"
  parkingStrategy: "underground" | "ground" | "mixed"
  coreEfficiency: number          // 코어 효율 (0-1)
}

export const STRATEGY_PARAMETERS: Record<DesignStrategy, StrategyParameters> = {
  "view-priority": {
    coverageMultiplier: 0.55,
    floorMultiplier: 0.9,
    openSpaceRatio: 0.35,
    unitSizePreference: "large",
    parkingStrategy: "underground",
    coreEfficiency: 0.75,
  },
  "privacy-priority": {
    coverageMultiplier: 0.6,
    floorMultiplier: 0.7,
    openSpaceRatio: 0.30,
    unitSizePreference: "medium",
    parkingStrategy: "underground",
    coreEfficiency: 0.70,
  },
  "area-maximize": {
    coverageMultiplier: 0.95,
    floorMultiplier: 1.0,
    openSpaceRatio: 0.15,
    unitSizePreference: "small",
    parkingStrategy: "mixed",
    coreEfficiency: 0.88,
  },
  "parking-efficient": {
    coverageMultiplier: 0.70,
    floorMultiplier: 0.85,
    openSpaceRatio: 0.25,
    unitSizePreference: "medium",
    parkingStrategy: "underground",
    coreEfficiency: 0.80,
  },
  "profitability": {
    coverageMultiplier: 0.90,
    floorMultiplier: 0.95,
    openSpaceRatio: 0.18,
    unitSizePreference: "small",
    parkingStrategy: "mixed",
    coreEfficiency: 0.85,
  },
  "livability": {
    coverageMultiplier: 0.65,
    floorMultiplier: 0.75,
    openSpaceRatio: 0.30,
    unitSizePreference: "mixed",
    parkingStrategy: "underground",
    coreEfficiency: 0.75,
  },
}

// 세대 크기별 평균 면적
export const UNIT_SIZES = {
  small: 59,    // 소형 (59㎡ 이하)
  medium: 84,   // 중형 (84㎡)
  large: 115,   // 대형 (115㎡ 이상)
  mixed: 78,    // 혼합 (평균)
}

// 배치 유형별 특성
export interface LayoutTypeCharacteristics {
  viewScore: number
  privacyScore: number
  efficiencyScore: number
  communityScore: number
  constructionDifficulty: number
  bestFor: DesignStrategy[]
}

export const LAYOUT_TYPE_CHARACTERISTICS: Record<string, LayoutTypeCharacteristics> = {
  tower: {
    viewScore: 95,
    privacyScore: 70,
    efficiencyScore: 90,
    communityScore: 60,
    constructionDifficulty: 75,
    bestFor: ["view-priority", "area-maximize", "profitability"],
  },
  courtyard: {
    viewScore: 70,
    privacyScore: 85,
    efficiencyScore: 75,
    communityScore: 95,
    constructionDifficulty: 65,
    bestFor: ["livability", "privacy-priority"],
  },
  lshape: {
    viewScore: 80,
    privacyScore: 80,
    efficiencyScore: 80,
    communityScore: 75,
    constructionDifficulty: 60,
    bestFor: ["parking-efficient", "livability", "privacy-priority"],
  },
  linear: {
    viewScore: 85,
    privacyScore: 75,
    efficiencyScore: 85,
    communityScore: 70,
    constructionDifficulty: 50,
    bestFor: ["area-maximize", "profitability"],
  },
  cluster: {
    viewScore: 75,
    privacyScore: 90,
    efficiencyScore: 70,
    communityScore: 85,
    constructionDifficulty: 70,
    bestFor: ["privacy-priority", "livability"],
  },
}

// 점수 계산 함수
export function calculateLayoutScores(
  layout: {
    type: string
    coverage: number
    floors: number
    units: number
    parking: number
    gfa: number
  },
  siteArea: number,
  regulation: ZoningRegulation,
  strategy: DesignStrategy
): LayoutScores {
  const params = STRATEGY_PARAMETERS[strategy]
  const typeChars = LAYOUT_TYPE_CHARACTERISTICS[layout.type] || LAYOUT_TYPE_CHARACTERISTICS.tower
  
  // 법규 적합성 점수
  const coverageCompliance = layout.coverage <= regulation?.maxCoverageRatio ?? 60 ? 100 : Math.max(0, 100 - (layout.coverage - regulation?.maxCoverageRatio ?? 60) * 5)
  const farCompliance = (layout.gfa / siteArea * 100) <= regulation?.maxFloorAreaRatio ?? 200 ? 100 : Math.max(0, 100 - ((layout.gfa / siteArea * 100) - regulation?.maxFloorAreaRatio ?? 200) * 2)
  const heightCompliance = layout.floors <= regulation?.maxFloors ?? 12 ? 100 : Math.max(0, 100 - (layout.floors - regulation?.maxFloors ?? 12) * 10)
  const parkingCompliance = (layout.parking / layout.units) >= regulation.parkingRatio ? 100 : Math.max(0, (layout.parking / layout.units / regulation.parkingRatio) * 100)
  
  const regulationCompliance = Math.round(
    coverageCompliance * 0.25 + farCompliance * 0.30 + heightCompliance * 0.25 + parkingCompliance * 0.20
  )
  
  // 사업성 점수
  const farUtilization = Math.min(100, (layout.gfa / siteArea * 100) / regulation?.maxFloorAreaRatio ?? 200 * 100)
  const unitCount = Math.min(100, layout.units / (siteArea / 50) * 100) // 50㎡당 1세대 기준
  const efficiencyBonus = typeChars.efficiencyScore * 0.3
  const profitability = Math.round(farUtilization * 0.4 + unitCount * 0.35 + efficiencyBonus)
  
  // 상품성 점수
  const viewBonus = typeChars.viewScore * (strategy === "view-priority" ? 0.4 : 0.2)
  const privacyBonus = typeChars.privacyScore * (strategy === "privacy-priority" ? 0.4 : 0.2)
  const communityBonus = typeChars.communityScore * (strategy === "livability" ? 0.3 : 0.15)
  const openSpaceBonus = (100 - layout.coverage) * 0.25
  const marketability = Math.round(Math.min(100, viewBonus + privacyBonus + communityBonus + openSpaceBonus))
  
  // 실현 가능성 점수
  const constructionEase = 100 - typeChars.constructionDifficulty
  const scaleAppropriate = layout.floors <= 15 ? 90 : layout.floors <= 20 ? 75 : 60
  const regulationMargin = Math.min(100, regulationCompliance * 1.1)
  const feasibility = Math.round(constructionEase * 0.3 + scaleAppropriate * 0.3 + regulationMargin * 0.4)
  
  // 종합 점수
  const overall = Math.round(
    regulationCompliance * 0.25 + profitability * 0.30 + marketability * 0.25 + feasibility * 0.20
  )
  
  return {
    regulationCompliance,
    profitability,
    marketability,
    feasibility,
    overall,
  }
}

// 추천 여부 및 이유 생성
export function generateRecommendation(
  layoutType: string,
  scores: LayoutScores,
  strategy: DesignStrategy,
  regulation: ZoningRegulation
): LayoutRecommendation {
  const typeChars = LAYOUT_TYPE_CHARACTERISTICS[layoutType] || LAYOUT_TYPE_CHARACTERISTICS.tower
  const strategyInfo = STRATEGY_INFO[strategy]
  
  // 전략 부합도 계산
  const isBestForStrategy = typeChars.bestFor.includes(strategy)
  const strategyMatch = isBestForStrategy ? Math.min(100, scores.overall + 15) : Math.max(40, scores.overall - 10)
  
  const isRecommended = strategyMatch >= 75 && scores.regulationCompliance >= 80
  
  const reasons: string[] = []
  const warnings: string[] = []
  
  // 추천 이유 생성
  if (isBestForStrategy) {
    reasons.push(`${strategyInfo.name} 전략에 최적화된 배치 유형입니다`)
  }
  
  if (scores.regulationCompliance >= 90) {
    reasons.push("모든 법규 요건을 충족합니다")
  } else if (scores.regulationCompliance >= 80) {
    reasons.push("법규 요건을 대부분 충족합니다")
  }
  
  if (scores.profitability >= 85) {
    reasons.push("높은 사업성이 기대됩니다")
  } else if (scores.profitability >= 70) {
    reasons.push("적정 수준의 사업성을 확보합니다")
  }
  
  if (typeChars.viewScore >= 85 && strategy === "view-priority") {
    reasons.push("우수한 조망 확보가 가능합니다")
  }
  
  if (typeChars.privacyScore >= 85 && strategy === "privacy-priority") {
    reasons.push("세대 간 프라이버시가 우수합니다")
  }
  
  if (typeChars.communityScore >= 85 && strategy === "livability") {
    reasons.push("커뮤니티 공간 확보에 유리합니다")
  }
  
  // 경고 사항 생성
  if (scores.regulationCompliance < 80) {
    warnings.push("일부 법규 요건에 대한 추가 검토가 필요합니다")
  }
  
  if (scores.feasibility < 70) {
    warnings.push("시공 난이도가 높아 공사비 상승이 예상됩니다")
  }
  
  if (regulation.setbackType === "both") {
    warnings.push("복합 사선제한으로 상층부 면적 감소가 예상됩니다")
  }
  
  if (typeChars.constructionDifficulty >= 70) {
    warnings.push("복잡한 형태로 시공 기간이 길어질 수 있습니다")
  }
  
  return {
    isRecommended,
    reasons: reasons.slice(0, 4),
    warnings: warnings.slice(0, 3),
    strategyMatch,
  }
}

// AI 추론 생성
export function generateAIReasoning(
  layoutType: string,
  scores: LayoutScores,
  strategy: DesignStrategy,
  regulation: ZoningRegulation,
  siteArea: number,
  gfa: number
): AIReasoning {
  const strategyInfo = STRATEGY_INFO[strategy]
  const typeChars = LAYOUT_TYPE_CHARACTERISTICS[layoutType] || LAYOUT_TYPE_CHARACTERISTICS.tower
  const far = (gfa / siteArea * 100).toFixed(1)
  
  // 요약문 생성
  const summaryParts: string[] = []
  
  if (typeChars.bestFor.includes(strategy)) {
    summaryParts.push(`본 배치안은 ${strategyInfo.name} 전략에 최적화된 형태입니다.`)
  } else {
    summaryParts.push(`본 배치안은 ${strategyInfo.name} 전략을 부분적으로 반영한 형태입니다.`)
  }
  
  if (scores.overall >= 80) {
    summaryParts.push(`종합 점수 ${scores.overall}점으로 우수한 평가를 받았습니다.`)
  } else if (scores.overall >= 65) {
    summaryParts.push(`종합 점수 ${scores.overall}점으로 양호한 평가를 받았습니다.`)
  } else {
    summaryParts.push(`종합 점수 ${scores.overall}점으로 개선 검토가 필요합니다.`)
  }
  
  const summary = summaryParts.join(" ")
  
  // 법규 고려 사항
  const zoneLabel = 
    regulation?.zoneType === 'residential-exclusive-1' ? '제1종 전용주거지역' :
    regulation?.zoneType === 'residential-exclusive-2' ? '제2종 전용주거지역' :
    regulation?.zoneType === 'residential-1' ? '제1종 일반주거지역' :
    regulation?.zoneType === 'residential-2' ? '제2종 일반주거지역' :
    regulation?.zoneType === 'residential-3' ? '제3종 일반주거지역' :
    regulation?.zoneType === 'semi-residential' ? '준주거지역' :
    regulation?.zoneType === 'commercial-general' ? '일반상업지역' :
    regulation?.zoneType === 'commercial-neighborhood' ? '근린상업지역' :
    regulation?.zoneType === 'commercial-central' ? '중심상업지역' :
    regulation?.zoneType === 'industrial-general' ? '일반공업지역' :
    regulation?.zoneType === 'industrial' ? '준공업지역' :
    regulation?.zoneType === 'green-natural' ? '자연녹지지역' : regulation?.zoneType
  const regulationConsiderations: string[] = [
    `용도지역: ${zoneLabel}`,
    `건폐율 ${regulation?.maxCoverageRatio ?? 60}% 이내 계획 (적용: ${far}%)`,
    `용적률 ${regulation?.maxFloorAreaRatio ?? 200}% 한도 내 최적화`,
    `최고 높이 ${regulation?.maxHeight ?? 30}m (${regulation?.maxFloors ?? 12}층) 제한 준수`,
  ]
  
  if (regulation.setbackType !== "none") {
    regulationConsiderations.push(`${regulation.setbackType === "north" ? "북측" : regulation.setbackType === "road" ? "도로" : "복합"} 사선제한 반영`)
  }
  
  regulationConsiderations.push(`주차 기준 세대당 ${regulation.parkingRatio}대 충족`)
  
  // 사업성 장점
  const profitabilityAdvantages: string[] = []
  
  if (scores.profitability >= 80) {
    profitabilityAdvantages.push("법적 용적률의 효율적 활용으로 높은 수익성 확보")
  }
  
  if (typeChars.efficiencyScore >= 85) {
    profitabilityAdvantages.push("높은 전용률로 분양 면적 극대화")
  }
  
  profitabilityAdvantages.push(`연면적 ${gfa.toLocaleString()}㎡ 확보로 적정 사업 규모 달성`)
  
  if (scores.marketability >= 75) {
    profitabilityAdvantages.push("우수한 상품성으로 분양 경쟁력 확보")
  }
  
  // 설계 특징
  const designFeatures: string[] = []
  
  if (layoutType === "tower") {
    designFeatures.push("수직 동선 효율화로 코어 면적 최소화")
    designFeatures.push("전 세대 개방감 있는 조망 확보")
    designFeatures.push("고층 랜드마크 효과로 단지 가치 상승")
  } else if (layoutType === "courtyard") {
    designFeatures.push("중정을 통한 자연 채광 및 환기 극대화")
    designFeatures.push("세대 간 시선 분리로 프라이버시 확보")
    designFeatures.push("커뮤니티 공간으로 입주민 교류 활성화")
  } else if (layoutType === "lshape") {
    designFeatures.push("코너 활용으로 다양한 평면 구성 가능")
    designFeatures.push("전면과 측면 모두 채광 확보")
    designFeatures.push("도로변 활성화와 내부 프라이버시 동시 확보")
  }
  
  // 리스크 및 과제
  const risksAndChallenges: string[] = []
  
  if (scores.regulationCompliance < 85) {
    risksAndChallenges.push("법규 적합성 추가 검토 필요")
  }
  
  if (typeChars.constructionDifficulty >= 70) {
    risksAndChallenges.push("복잡한 구조로 시공비 상승 가능")
  }
  
  if (regulation.setbackType === "both") {
    risksAndChallenges.push("복합 사선제한으로 상층부 설계 제약")
  }
  
  if (scores.feasibility < 75) {
    risksAndChallenges.push("시공 일정 및 품질 관리 주의 필요")
  }
  
  risksAndChallenges.push("인허가 과정에서 세부 조정 가능성")
  
  return {
    summary,
    regulationConsiderations,
    profitabilityAdvantages,
    designFeatures,
    risksAndChallenges,
  }
}
