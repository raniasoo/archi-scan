"use client"

// ============================================================
// 크리스토퍼 알렉산더 패턴 기반 설계 품질 평가 시스템
// A Pattern Language (1977) + The Nature of Order (2002-2005)
// ============================================================

export interface PatternScore {
  id: number
  name: string
  nameKr: string
  score: number       // 0-100
  description: string // 이 배치안에서의 적용 상태
  category: "town" | "building" | "construction"
}

export interface LivingStructureScore {
  property: string
  propertyKr: string
  score: number  // 0-100
  reason: string
}

export interface PatternQualityResult {
  patterns: PatternScore[]
  livingStructure: LivingStructureScore[]
  totalPatternScore: number      // 0-100
  totalLivingScore: number       // 0-100
  overallQuality: number         // 0-100 (패턴 + 살아있는구조 합산)
  grade: string                  // S/A/B/C/D
  gradeColor: string
  philosophy: string             // 설계 철학 자동 서술
}

export interface LayoutForPattern {
  type: string           // tower / courtyard / l-shape / bar
  name: string
  coverage: number       // 건폐율 %
  floors: number
  units: number
  parking: number
  gfa: number
  siteArea: number
  strategy: string
  hasCourtyard?: boolean
  southFacing?: boolean
}

export interface UserValues {
  profitVsQuality: number     // 0=수익극대화, 100=거주품질
  privacyVsCommunity: number  // 0=프라이버시, 100=커뮤니티
  efficiencyVsSpace: number   // 0=효율성, 100=여유공간
  selectedPatterns: string[]  // 사용자가 선택한 패턴 ID
}

// ============================================================
// 알렉산더 253개 패턴 중 한국 개발사업 적용 가능 핵심 패턴 12개
// ============================================================

function evaluatePatterns(layout: LayoutForPattern, values?: UserValues): PatternScore[] {
  const patterns: PatternScore[] = []
  const openSpaceRatio = 100 - layout.coverage

  // Pattern #36: 단계적 밀도 (Degrees of Publicness)
  const p36Score = layout.type === "courtyard" ? 85 : layout.type === "l-shape" ? 75 : layout.type === "tower" ? 60 : 65
  patterns.push({
    id: 36, name: "Degrees of Publicness", nameKr: "단계적 공공성",
    score: p36Score, category: "town",
    description: layout.type === "courtyard" 
      ? "중정을 중심으로 공적→반공적→사적 공간이 자연스럽게 전환됩니다"
      : "동 배치에서 공공-반공적-사적 공간의 단계적 전환이 부분적으로 형성됩니다"
  })

  // Pattern #105: 남향 외부공간 (South Facing Outdoors)
  const southScore = layout.type === "courtyard" ? 80 :
    layout.type === "bar" ? 85 : layout.type === "tower" ? 70 : 75
  patterns.push({
    id: 105, name: "South Facing Outdoors", nameKr: "남향 외부공간",
    score: southScore, category: "building",
    description: southScore >= 80 
      ? "주요 외부공간이 남향으로 배치되어 일조와 자연광이 풍부합니다"
      : "일부 외부공간의 남향 확보가 제한적입니다"
  })

  // Pattern #106: 양면 채광 (Light on Two Sides)
  const lightScore = layout.type === "bar" ? 90 : layout.type === "tower" ? 55 :
    layout.type === "courtyard" ? 75 : 70
  patterns.push({
    id: 106, name: "Light on Two Sides of Every Room", nameKr: "양면 채광",
    score: lightScore, category: "building",
    description: lightScore >= 80
      ? "대부분의 주요 실이 두 방향 이상에서 자연광을 받을 수 있습니다"
      : "일부 세대는 단면 채광에 의존하며, 내부 실의 자연광이 부족할 수 있습니다"
  })

  // Pattern #112: 진입 전이공간 (Entrance Transition)
  const entranceScore = layout.type === "courtyard" ? 90 : layout.type === "l-shape" ? 80 :
    layout.floors > 15 ? 60 : 70
  patterns.push({
    id: 112, name: "Entrance Transition", nameKr: "진입 전이공간",
    score: entranceScore, category: "building",
    description: entranceScore >= 80
      ? "도로→단지입구→중정/마당→현관 순서로 점진적 진입 경험이 풍부합니다"
      : "고층 타워 특성상 진입 전이가 로비 중심으로 단순화됩니다"
  })

  // Pattern #115: 활기 있는 안마당 (Courtyards Which Live)
  const courtyardScore = layout.type === "courtyard" ? 95 :
    openSpaceRatio > 50 ? 70 : openSpaceRatio > 35 ? 55 : 40
  patterns.push({
    id: 115, name: "Courtyards Which Live", nameKr: "활기 있는 안마당",
    score: courtyardScore, category: "building",
    description: layout.type === "courtyard"
      ? "중정이 단지의 중심에서 거주자의 일상적 만남과 활동을 유도합니다"
      : openSpaceRatio > 50
      ? "여유 있는 외부공간이 커뮤니티 마당 역할을 할 수 있습니다"
      : "건폐율이 높아 공용 마당 확보가 어렵습니다"
  })

  // Pattern #127: 친밀도 기울기 (Intimacy Gradient)
  const intimacyScore = layout.type === "courtyard" ? 85 : layout.type === "l-shape" ? 80 :
    layout.type === "bar" ? 75 : layout.type === "tower" ? 65 : 70
  patterns.push({
    id: 127, name: "Intimacy Gradient", nameKr: "친밀도 기울기",
    score: intimacyScore, category: "building",
    description: "진입부에서 깊숙한 개인 공간까지 공적→사적 분위기가 점진적으로 전환됩니다"
  })

  // Pattern #159: 창가 자리 (Window Place)
  const windowScore = layout.type === "bar" ? 85 : layout.type === "tower" && layout.floors > 15 ? 75 :
    layout.type === "courtyard" ? 80 : 70
  patterns.push({
    id: 159, name: "Window Place", nameKr: "창가의 자리",
    score: windowScore, category: "construction",
    description: "거실과 침실의 창가에 머물고 싶은 자리가 형성될 수 있는 깊이와 방향입니다"
  })

  // Pattern #168: 땅과의 연결 (Connection to the Earth)
  const earthScore = layout.floors <= 5 ? 90 : layout.floors <= 10 ? 70 :
    layout.floors <= 15 ? 55 : 40
  patterns.push({
    id: 168, name: "Connection to the Earth", nameKr: "땅과의 연결",
    score: earthScore, category: "construction",
    description: layout.floors <= 5
      ? "저층 배치로 거주자가 땅과 자연에 가깝게 생활할 수 있습니다"
      : "고층 주거로 지면과의 물리적 연결이 약해집니다. 저층부 커뮤니티 공간이 보완책입니다"
  })

  // Pattern #171: 나무가 있는 곳 (Tree Places)
  const treeScore = openSpaceRatio > 50 ? 85 : openSpaceRatio > 35 ? 70 : 50
  patterns.push({
    id: 171, name: "Tree Places", nameKr: "나무가 있는 곳",
    score: treeScore, category: "building",
    description: openSpaceRatio > 50
      ? "충분한 외부공간에 수목을 풍부하게 배치할 수 있습니다"
      : "제한된 외부공간이지만 전략적 수목 배치로 녹지감을 확보할 수 있습니다"
  })

  // Pattern #87: 개별 상점 (Individually Owned Shops)
  const shopScore = layout.strategy === "profitability" ? 85 :
    layout.type === "courtyard" ? 70 : layout.floors > 10 ? 75 : 60
  patterns.push({
    id: 87, name: "Individually Owned Shops", nameKr: "가로 활성화 상점",
    score: shopScore, category: "town",
    description: "1층 근린생활시설 배치로 보행 가로에 활력을 부여합니다"
  })

  // Pattern #60: 접근 가능한 녹지 (Accessible Green)
  const greenScore = openSpaceRatio > 45 ? 90 : openSpaceRatio > 30 ? 70 : 50
  patterns.push({
    id: 60, name: "Accessible Green", nameKr: "접근 가능한 녹지",
    score: greenScore, category: "town",
    description: `외부 공간 비율 ${openSpaceRatio.toFixed(0)}%로, ${openSpaceRatio > 45 ? "풍부한 녹지 확보가 가능합니다" : "핵심 동선에 녹지를 집중 배치해야 합니다"}`
  })

  // Pattern #79: 보차분리 (Looped Local Roads)
  const pedestrianScore = layout.parking >= layout.units * 0.8 ? 80 :
    layout.strategy === "parking-efficient" ? 85 : 65
  patterns.push({
    id: 79, name: "Looped Local Roads", nameKr: "보행과 차량의 분리",
    score: pedestrianScore, category: "town",
    description: "주차 진입과 보행 동선이 분리되어 안전하고 쾌적한 보행 환경을 조성합니다"
  })

  // ============================================================
  // 사용자가 선택한 패턴 → 점수 가중치 적용 (1.3배, 최대 100)
  // "내가 중요하게 여기는 것"이 점수에 실제 반영됨
  // ============================================================
  if (values?.selectedPatterns?.length) {
    const patternIdMap: Record<string, number> = {
      'courtyard': 115, 'south-light': 105, 'shop-street': 87,
      'tree-view': 171, 'quiet-entry': 112, 'neighbors': 36,
      'walk-safe': 79, 'two-light': 106,
    }
    const boostedIds = new Set(
      values.selectedPatterns.map(sp => patternIdMap[sp]).filter(Boolean)
    )
    patterns.forEach(p => {
      if (boostedIds.has(p.id)) {
        p.score = Math.min(100, Math.round(p.score * 1.3))
        p.description += ' ⭐ 사용자 중시 항목'
      }
    })
  }

  return patterns
}

// ============================================================
// 15가지 근본 속성 (The Nature of Order) — 자동 측정 가능 7개
// ============================================================

function evaluateLivingStructure(layout: LayoutForPattern): LivingStructureScore[] {
  const scores: LivingStructureScore[] = []
  const openSpace = 100 - layout.coverage

  // 1. 강한 중심 (Strong Centers)
  const centerScore = layout.type === "courtyard" ? 90 : layout.type === "l-shape" ? 75 :
    layout.type === "tower" ? 65 : 70
  scores.push({
    property: "Strong Centers", propertyKr: "강한 중심",
    score: centerScore,
    reason: layout.type === "courtyard" ? "중정이 명확한 공간적 중심을 형성합니다" : "공용공간이 시각적 중심 역할을 합니다"
  })

  // 2. 두꺼운 경계 (Boundaries)
  const boundaryScore = layout.type === "courtyard" ? 85 : openSpace > 40 ? 75 : 60
  scores.push({
    property: "Boundaries", propertyKr: "두꺼운 경계",
    score: boundaryScore,
    reason: "외부→내부 전이 구간의 풍부함 정도"
  })

  // 3. 교대 반복 (Alternating Repetition)
  const repetitionScore = layout.units > 20 ? 80 : layout.units > 10 ? 70 : 60
  scores.push({
    property: "Alternating Repetition", propertyKr: "교대 반복",
    score: repetitionScore,
    reason: "동 배치와 세대 구성의 리듬감"
  })

  // 4. 양의 공간 (Positive Space)
  const positiveScore = layout.type === "courtyard" ? 90 : layout.type === "l-shape" ? 80 :
    openSpace > 50 ? 75 : 55
  scores.push({
    property: "Positive Space", propertyKr: "양의 공간",
    score: positiveScore,
    reason: layout.type === "courtyard" ? "건물이 감싸는 외부공간이 명확한 형태를 가집니다" : "동 사이 외부공간의 형태적 완결성"
  })

  // 5. 좋은 형태 (Good Shape)
  const shapeScore = layout.coverage > 30 && layout.coverage < 60 ? 80 :
    layout.coverage >= 60 ? 55 : 70
  scores.push({
    property: "Good Shape", propertyKr: "좋은 형태",
    score: shapeScore,
    reason: "건물 매스의 비례와 조형적 완성도"
  })

  // 6. 대비 (Contrast)
  const contrastScore = layout.floors > 10 ? 80 : layout.floors > 5 ? 70 : 60
  scores.push({
    property: "Contrast", propertyKr: "대비",
    score: contrastScore,
    reason: "저층부와 고층부, 매스와 공간의 대비감"
  })

  // 7. 점진적 변이 (Gradients)
  const gradientScore = layout.type === "l-shape" ? 80 : layout.type === "courtyard" ? 75 :
    layout.type === "tower" ? 70 : 65
  scores.push({
    property: "Gradients", propertyKr: "점진적 변이",
    score: gradientScore,
    reason: "공간의 크기·밀도·높이가 점진적으로 변화하는 정도"
  })

  return scores
}

// ============================================================
// 설계 철학 자동 서술 (보고서용)
// ============================================================

function generatePhilosophy(
  layout: LayoutForPattern,
  patterns: PatternScore[],
  livingScores: LivingStructureScore[],
  totalPattern: number,
  totalLiving: number,
  values?: UserValues
): string {
  const topPatterns = [...patterns].sort((a, b) => b.score - a.score).slice(0, 3)
  const weakPatterns = [...patterns].sort((a, b) => a.score - b.score).slice(0, 2)

  const typeNameKr = layout.type === "tower" ? "타워형" : layout.type === "courtyard" ? "중정형" :
    layout.type === "l-shape" ? "ㄱ자형" : layout.type === "bar" ? "판상형" : layout.type

  let text = `이 ${layout.name} 배치안은 `

  // 가장 강한 패턴 기반 서술
  text += `크리스토퍼 알렉산더의 패턴 중 '${topPatterns[0].nameKr}(Pattern #${topPatterns[0].id})'`
  if (topPatterns.length > 1) text += `과 '${topPatterns[1].nameKr}(Pattern #${topPatterns[1].id})'`
  text += `의 원리를 잘 따르고 있습니다. `

  // 형태별 특성
  if (layout.type === "courtyard") {
    text += `중정을 중심으로 세대를 배치하여 '활기 있는 안마당'과 '단계적 공공성'이 자연스럽게 구현됩니다. `
  } else if (layout.type === "tower") {
    text += `타워형 배치는 조망과 용적률 극대화에 유리하지만, '땅과의 연결'이 약해질 수 있어 저층부 커뮤니티 공간이 중요합니다. `
  } else if (layout.type === "bar") {
    text += `판상형 배치는 양면 채광과 남향 확보에 가장 유리하여, '양면 채광(Pattern #106)'이 높은 점수를 받습니다. `
  }

  // 사용자 가치 반영
  if (values) {
    if (values.profitVsQuality > 60) {
      text += `사업주가 '거주 품질'을 우선시하였으므로, 건폐율을 법적 상한보다 낮추고 외부공간을 넉넉하게 확보하는 방향이 적합합니다. `
    } else if (values.profitVsQuality < 40) {
      text += `수익성을 중시하는 방향에서도 '창가의 자리(Pattern #159)'와 '보행 분리(Pattern #79)'는 분양 경쟁력에 직접 기여합니다. `
    }

    if (values.privacyVsCommunity > 60) {
      text += `커뮤니티 지향의 가치관에 따라, 공용 마당과 만남의 공간을 적극 배치하는 것을 권고합니다. `
    }
  }

  // 개선 포인트
  if (weakPatterns.length > 0 && weakPatterns[0].score < 60) {
    text += `다만 '${weakPatterns[0].nameKr}'(${weakPatterns[0].score}점)은 보완이 필요하며, `
    text += `${weakPatterns[0].description.includes("고층") ? "저층부 공간 프로그램 강화" : "외부공간 계획 보완"}을 통해 개선할 수 있습니다.`
  }

  return text
}

// ============================================================
// 메인 평가 함수
// ============================================================

export function evaluatePatternQuality(
  layout: LayoutForPattern,
  values?: UserValues
): PatternQualityResult {
  const patterns = evaluatePatterns(layout, values)
  const livingStructure = evaluateLivingStructure(layout)

  const totalPatternScore = Math.round(
    patterns.reduce((sum, p) => sum + p.score, 0) / patterns.length
  )
  const totalLivingScore = Math.round(
    livingStructure.reduce((sum, s) => sum + s.score, 0) / livingStructure.length
  )

  const overallQuality = Math.round(totalPatternScore * 0.6 + totalLivingScore * 0.4)

  let grade: string, gradeColor: string
  if (overallQuality >= 85) { grade = "S"; gradeColor = "#8b5cf6" }
  else if (overallQuality >= 75) { grade = "A"; gradeColor = "#22c55e" }
  else if (overallQuality >= 65) { grade = "B"; gradeColor = "#3b82f6" }
  else if (overallQuality >= 55) { grade = "C"; gradeColor = "#f59e0b" }
  else { grade = "D"; gradeColor = "#ef4444" }

  const philosophy = generatePhilosophy(layout, patterns, livingStructure, totalPatternScore, totalLivingScore, values)

  return {
    patterns,
    livingStructure,
    totalPatternScore,
    totalLivingScore,
    overallQuality,
    grade,
    gradeColor,
    philosophy,
  }
}

// ============================================================
// 사용자가 선택할 수 있는 패턴 카드 데이터
// ============================================================

export const SELECTABLE_PATTERNS = [
  { id: "courtyard", emoji: "🏡", label: "아이들이 놀 수 있는 마당", pattern: "#115 활기 있는 안마당", strategies: ["livability"] },
  { id: "south-light", emoji: "☀️", label: "햇빛이 잘 드는 거실", pattern: "#105 남향 외부공간", strategies: ["view-priority", "livability"] },
  { id: "shop-street", emoji: "🏪", label: "1층에 카페와 상점", pattern: "#87 가로 활성화 상점", strategies: ["profitability"] },
  { id: "tree-view", emoji: "🌳", label: "창에서 나무가 보이면 좋겠다", pattern: "#171 나무가 있는 곳", strategies: ["livability", "view-priority"] },
  { id: "quiet-entry", emoji: "🚶", label: "조용하게 집에 들어오는 느낌", pattern: "#112 진입 전이공간", strategies: ["privacy-priority"] },
  { id: "neighbors", emoji: "👋", label: "이웃과 자연스러운 만남", pattern: "#36 단계적 공공성", strategies: ["livability"] },
  { id: "walk-safe", emoji: "🛡", label: "차 없이 안전한 보행 동선", pattern: "#79 보차분리", strategies: ["livability", "parking-efficient"] },
  { id: "two-light", emoji: "💡", label: "방마다 두 방향 빛이 들면 좋겠다", pattern: "#106 양면 채광", strategies: ["view-priority", "livability"] },
]
