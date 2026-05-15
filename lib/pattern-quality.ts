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

  // ━━━ 추가 패턴 12개 (Phase 6 확장) ━━━

  // Pattern #107: 빛의 날개 (Wings of Light)
  const wingsScore = layout.type === 'linear' ? 90 : layout.type === 'courtyard' ? 85 : layout.type === 'l-shape' ? 80 : 65
  patterns.push({ id: 107, name: "Wings of Light", nameKr: "빛의 날개", score: wingsScore, category: "building",
    description: "건물 폭을 7m 이내로 유지하여 모든 실에 자연광이 도달합니다" })

  // Pattern #118: 옥상 정원 (Roof Garden)
  const roofScore = layout.floors <= 5 ? 80 : layout.floors <= 10 ? 70 : 60
  patterns.push({ id: 118, name: "Roof Garden", nameKr: "옥상 정원", score: roofScore, category: "building",
    description: layout.floors <= 5 ? "저층 옥상을 녹화하여 세대 전용 정원으로 활용합니다" : "옥상 공용 정원으로 커뮤니티 공간을 제공합니다" })

  // Pattern #140: 거리 면 사적 테라스 (Private Terrace on Street)
  const terraceScore = layout.floors <= 3 ? 90 : layout.type === 'courtyard' ? 85 : 70
  patterns.push({ id: 140, name: "Private Terrace on Street", nameKr: "사적 테라스", score: terraceScore, category: "building",
    description: "각 세대에 전용 외부 공간(테라스/정원)이 부여됩니다" })

  // Pattern #159: 양면 채광 (Light on Two Sides)
  const twoLightScore = layout.type === 'courtyard' ? 90 : layout.type === 'l-shape' ? 85 : layout.type === 'linear' ? 80 : 60
  patterns.push({ id: 159, name: "Light on Two Sides", nameKr: "양면 채광", score: twoLightScore, category: "building",
    description: "각 실이 최소 두 면에서 자연광을 받아 건강한 실내 환경을 만듭니다" })

  // Pattern #163: 야외 방 (Outdoor Room)
  const outdoorRoomScore = layout.type === 'courtyard' ? 95 : layout.type === 'l-shape' ? 85 : openSpaceRatio > 45 ? 75 : 55
  patterns.push({ id: 163, name: "Outdoor Room", nameKr: "야외 방", score: outdoorRoomScore, category: "building",
    description: layout.type === 'courtyard' ? "중정이 세 면으로 둘러싸인 야외 방을 형성합니다" : "건물이 형성하는 외부공간이 실외 거실 역할을 합니다" })

  // Pattern #167: 6피트 발코니 (Six-Foot Balcony)
  const balconyScore = layout.floors >= 2 ? 80 : 60
  patterns.push({ id: 167, name: "Six-Foot Balcony", nameKr: "넓은 발코니", score: balconyScore, category: "building",
    description: "1.8m 이상의 넓은 발코니로 실외 생활 공간을 확보합니다" })

  // Pattern #190: 천장 높이 변화 (Ceiling Height Variety)
  const ceilingScore = layout.floors <= 3 ? 85 : layout.floors <= 5 ? 75 : 65
  patterns.push({ id: 190, name: "Ceiling Height Variety", nameKr: "천장 높이 변화", score: ceilingScore, category: "building",
    description: "거실은 높게, 침실은 아늑하게 — 공간별 천장 높이 변화로 풍요로운 공간감을 만듭니다" })

  // Pattern #207: 좋은 재료 (Good Materials)
  const materialScore = layout.strategy === 'quality' ? 90 : 75
  patterns.push({ id: 207, name: "Good Materials", nameKr: "좋은 재료", score: materialScore, category: "construction",
    description: "천연석, 실목재, 고품질 마감재로 시간이 지나도 아름다운 건물을 만듭니다" })

  // Pattern #238: 여과된 빛 (Filtered Light)
  const filteredLightScore = layout.type === 'courtyard' ? 85 : layout.floors <= 3 ? 80 : 70
  patterns.push({ id: 238, name: "Filtered Light", nameKr: "여과된 빛", score: filteredLightScore, category: "construction",
    description: "루버, 격자, 나뭇잎을 통해 부드럽게 여과된 빛이 실내를 채웁니다" })

  // Pattern #245: 높인 화단 (Raised Flowers)
  const raisedFlowerScore = openSpaceRatio > 35 ? 80 : 65
  patterns.push({ id: 245, name: "Raised Flowers", nameKr: "높인 화단", score: raisedFlowerScore, category: "construction",
    description: "허리 높이의 화단이 보행로를 따라 배치되어 사계절 꽃과 녹지를 제공합니다" })

  // Pattern #247: 틈새 포장 (Paving with Cracks)
  const pavingScore = layout.type === 'courtyard' || layout.type === 'l-shape' ? 80 : 65
  patterns.push({ id: 247, name: "Paving with Cracks Between", nameKr: "틈새 포장", score: pavingScore, category: "construction",
    description: "포장 틈새에 이끼와 잔디가 자라 자연스러운 노면을 만듭니다" })

  // Pattern #250: 따뜻한 색 (Warm Colors)
  patterns.push({ id: 250, name: "Warm Colors", nameKr: "따뜻한 색", score: 80, category: "construction",
    description: "크림, 베이지, 테라코타 등 따뜻한 어스톤으로 편안한 분위기를 조성합니다" })

  // ============================================================
  // 사용자가 선택한 패턴 → 점수 가중치 적용 (1.3배, 최대 100)
  // "내가 중요하게 여기는 것"이 점수에 실제 반영됨
  // ============================================================
  if (values?.selectedPatterns?.length) {
    const patternIdMap: Record<string, number> = {
      // 단지·외부
      'courtyard': 115, 'neighbors': 36, 'accessible-green': 60, 'walk-safe': 79,
      'shop-street': 87, 'tree-view': 171, 'small-parking': 22, 'connected-play': 73,
      'garden-wall': 173, 'outdoor-room': 163, 'main-entrance': 110, 'local-sports': 72, 'fruit-trees': 170,
      // 건물·동선
      'south-light': 105, 'quiet-entry': 112, 'intimacy-grad': 127, 'short-corridor': 132,
      'stair-seat': 125, 'rooftop': 118, 'balcony': 167, 'building-edge': 160,
      'common-area': 67, 'ground-floor': 96, 'ceiling-height': 190, 'natural-vent': 162,
      'gallery-surround': 119, 'visible-roof': 117, 'cascade-roof': 116,
      // 실·생활
      'two-light': 106, 'window-place': 180, 'open-kitchen': 184, 'private-terrace': 140,
      'sleeping-sun': 138, 'couple-realm': 136, 'child-realm': 137, 'storage-wall': 197,
      'bathing-room': 144, 'indoor-sun': 128, 'earth-connect': 168, 'home-workshop': 157,
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
// 15가지 근본 속성 (The Nature of Order) — 완전 구현
// ============================================================

function evaluateLivingStructure(layout: LayoutForPattern): LivingStructureScore[] {
  const scores: LivingStructureScore[] = []
  const openSpace = 100 - layout.coverage
  const isCourtyard = layout.type === "courtyard"
  const isBar = layout.type === "bar"
  const isTower = layout.type === "tower"
  const isLShape = layout.type === "l-shape"

  // 1. 스케일의 단계 (Levels of Scale)
  const scaleScore = layout.floors > 10 ? 75 : layout.floors > 5 ? 80 : 85
  scores.push({ property: "Levels of Scale", propertyKr: "스케일의 단계", score: scaleScore,
    reason: "단지→동→세대→실 스케일 전이의 자연스러움" })

  // 2. 강한 중심 (Strong Centers)
  scores.push({ property: "Strong Centers", propertyKr: "강한 중심",
    score: isCourtyard ? 90 : isLShape ? 75 : isTower ? 65 : 70,
    reason: isCourtyard ? "중정이 명확한 공간적 중심을 형성합니다" : "공용공간이 시각적 중심 역할을 합니다" })

  // 3. 두꺼운 경계 (Boundaries)
  scores.push({ property: "Boundaries", propertyKr: "두꺼운 경계",
    score: isCourtyard ? 85 : openSpace > 40 ? 75 : 60,
    reason: "외부→내부 전이 구간의 풍부함" })

  // 4. 교대 반복 (Alternating Repetition)
  scores.push({ property: "Alternating Repetition", propertyKr: "교대 반복",
    score: layout.units > 20 ? 80 : layout.units > 10 ? 70 : 60,
    reason: "동 배치와 세대 구성의 리듬감" })

  // 5. 양의 공간 (Positive Space)
  scores.push({ property: "Positive Space", propertyKr: "양의 공간",
    score: isCourtyard ? 90 : isLShape ? 80 : openSpace > 50 ? 75 : 55,
    reason: "건물 사이 외부공간이 의미 있는 형태를 가지는 정도" })

  // 6. 좋은 형태 (Good Shape)
  scores.push({ property: "Good Shape", propertyKr: "좋은 형태",
    score: layout.coverage > 30 && layout.coverage < 60 ? 80 : layout.coverage >= 60 ? 55 : 70,
    reason: "건물 매스의 비례와 조형적 완성도" })

  // 7. 국소 대칭 (Local Symmetries)
  scores.push({ property: "Local Symmetries", propertyKr: "국소 대칭",
    score: isBar ? 85 : isTower ? 75 : isCourtyard ? 80 : 70,
    reason: "세대 배치의 좌우 균형과 대칭성" })

  // 8. 깊은 맞물림 (Deep Interlock and Ambiguity)
  scores.push({ property: "Deep Interlock", propertyKr: "깊은 맞물림",
    score: isCourtyard ? 85 : isLShape ? 80 : isTower ? 55 : 65,
    reason: "내부와 외부가 서로 맞물리는 복잡성 (테라스, 발코니, 필로티)" })

  // 9. 대비 (Contrast)
  scores.push({ property: "Contrast", propertyKr: "대비",
    score: layout.floors > 10 ? 80 : layout.floors > 5 ? 70 : 60,
    reason: "저층부와 고층부, 매스와 공간의 대비감" })

  // 10. 점진적 변이 (Gradients)
  scores.push({ property: "Gradients", propertyKr: "점진적 변이",
    score: isLShape ? 80 : isCourtyard ? 75 : isTower ? 70 : 65,
    reason: "공공→반공적→사적 공간의 점진적 전이" })

  // 11. 거침 (Roughness)
  scores.push({ property: "Roughness", propertyKr: "거침",
    score: layout.floors <= 3 ? 80 : layout.floors <= 5 ? 70 : 55,
    reason: "자연 소재, 비정형 요소, 손으로 만진 듯한 질감" })

  // 12. 반향 (Echoes)
  scores.push({ property: "Echoes", propertyKr: "반향",
    score: isBar ? 80 : isCourtyard ? 75 : 65,
    reason: "건물 전체에서 반복되는 형태적 모티브의 일관성" })

  // 13. 여백 (The Void)
  scores.push({ property: "The Void", propertyKr: "여백",
    score: isCourtyard ? 90 : openSpace > 50 ? 80 : openSpace > 35 ? 65 : 45,
    reason: "비움의 공간이 주는 여유와 숨쉴 틈" })

  // 14. 단순함과 내적 고요 (Simplicity and Inner Calm)
  scores.push({ property: "Simplicity", propertyKr: "단순함",
    score: layout.units <= 10 ? 85 : layout.units <= 30 ? 70 : 55,
    reason: "과도하지 않은 디자인의 명료함" })

  // 15. 비분리 (Not-Separateness)
  scores.push({ property: "Not-Separateness", propertyKr: "비분리",
    score: layout.floors <= 5 ? 85 : layout.floors <= 10 ? 70 : 55,
    reason: "주변 도시 맥락과의 조화, 동네에 자연스럽게 어울림" })

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

// ============================================================
// 사용자가 선택할 수 있는 패턴 카드 데이터 — 40개 (3카테고리)
// 크리스토퍼 알렉산더 "A Pattern Language" 253개 중 한국 개발사업 적용 핵심
// ============================================================

export type PatternCategory = 'site' | 'building' | 'living'

export const PATTERN_CATEGORIES = [
  { id: 'site' as const, emoji: '🏘️', label: '단지·외부', desc: '배치, 녹지, 보행, 주차' },
  { id: 'building' as const, emoji: '🏢', label: '건물·동선', desc: '층 구성, 진입, 복도, 외관' },
  { id: 'living' as const, emoji: '🏠', label: '실·생활', desc: '채광, 환기, 주방, 수납' },
]

export const SELECTABLE_PATTERNS = [
  // ━━━ 🏘️ 단지·외부 (13개) ━━━
  { id: "courtyard", emoji: "🏡", label: "아이들이 놀 수 있는 마당", pattern: "#115 활기 있는 안마당", strategies: ["livability"], category: "site" as PatternCategory },
  { id: "neighbors", emoji: "👋", label: "이웃과 자연스러운 만남", pattern: "#36 단계적 공공성", strategies: ["livability"], category: "site" },
  { id: "accessible-green", emoji: "🌿", label: "집 앞에 녹지가 있으면 좋겠다", pattern: "#60 접근 가능한 녹지", strategies: ["livability", "view-priority"], category: "site" },
  { id: "walk-safe", emoji: "🛡", label: "차 없이 안전한 보행 동선", pattern: "#79 보행과 차량의 분리", strategies: ["livability", "parking-efficient"], category: "site" },
  { id: "shop-street", emoji: "🏪", label: "1층에 카페와 상점", pattern: "#87 가로 활성화 상점", strategies: ["profitability"], category: "site" },
  { id: "tree-view", emoji: "🌳", label: "창에서 나무가 보이면 좋겠다", pattern: "#171 나무가 있는 곳", strategies: ["livability", "view-priority"], category: "site" },
  { id: "small-parking", emoji: "🅿️", label: "주차장이 눈에 띄지 않게", pattern: "#22 소규모 주차", strategies: ["livability", "view-priority"], category: "site" },
  { id: "connected-play", emoji: "🧒", label: "아이들이 안전하게 뛰어놀 공간", pattern: "#73 모험 놀이터", strategies: ["livability"], category: "site" },
  { id: "garden-wall", emoji: "🧱", label: "담장 대신 생울타리나 텃밭", pattern: "#173 정원 담장", strategies: ["livability", "privacy-priority"], category: "site" },
  { id: "outdoor-room", emoji: "🪑", label: "밖에서도 앉아 쉴 수 있는 공간", pattern: "#163 야외 방", strategies: ["livability"], category: "site" },
  { id: "main-entrance", emoji: "🚪", label: "건물 입구가 품격 있으면 좋겠다", pattern: "#110 메인 입구", strategies: ["view-priority", "profitability"], category: "site" },
  { id: "local-sports", emoji: "🏃", label: "운동할 수 있는 공간", pattern: "#72 지역 스포츠", strategies: ["livability"], category: "site" },
  { id: "fruit-trees", emoji: "🍎", label: "열매 맺는 나무가 있으면", pattern: "#170 과실수", strategies: ["livability"], category: "site" },

  // ━━━ 🏢 건물·동선 (15개) ━━━
  { id: "south-light", emoji: "☀️", label: "햇빛이 잘 드는 거실", pattern: "#105 남향 외부공간", strategies: ["view-priority", "livability"], category: "building" },
  { id: "quiet-entry", emoji: "🚶", label: "조용하게 집에 들어오는 느낌", pattern: "#112 진입 전이공간", strategies: ["privacy-priority"], category: "building" },
  { id: "intimacy-grad", emoji: "🔒", label: "공용→개인 공간 점진적 전환", pattern: "#127 친밀도 기울기", strategies: ["privacy-priority"], category: "building" },
  { id: "short-corridor", emoji: "🚶‍♂️", label: "복도가 짧고 밝으면 좋겠다", pattern: "#132 짧은 복도", strategies: ["livability"], category: "building" },
  { id: "stair-seat", emoji: "🪜", label: "계단에서도 잠깐 앉을 수 있게", pattern: "#125 계단 의자", strategies: ["livability"], category: "building" },
  { id: "rooftop", emoji: "🏙️", label: "옥상에서 하늘이 보이면", pattern: "#118 옥상 정원", strategies: ["view-priority", "livability"], category: "building" },
  { id: "balcony", emoji: "🌅", label: "발코니에서 바깥을 바라보고 싶다", pattern: "#167 6피트 발코니", strategies: ["view-priority", "livability"], category: "building" },
  { id: "building-edge", emoji: "🏛️", label: "건물 1층이 활기차면 좋겠다", pattern: "#160 건물 가장자리", strategies: ["profitability", "livability"], category: "building" },
  { id: "common-area", emoji: "🤝", label: "이웃끼리 모일 수 있는 공간", pattern: "#67 공용 공간", strategies: ["livability"], category: "building" },
  { id: "ground-floor", emoji: "🛍️", label: "1층은 주거보다 상가/커뮤니티", pattern: "#96 지상층 활용", strategies: ["profitability"], category: "building" },
  { id: "ceiling-height", emoji: "📐", label: "천장이 높으면 좋겠다", pattern: "#190 천장 높이 변화", strategies: ["view-priority", "area-maximize"], category: "building" },
  { id: "natural-vent", emoji: "🌬️", label: "자연 환기가 잘 되면 좋겠다", pattern: "#162 가벽", strategies: ["livability"], category: "building" },
  { id: "gallery-surround", emoji: "🏰", label: "건물이 마당을 감싸는 형태", pattern: "#119 아케이드", strategies: ["livability", "privacy-priority"], category: "building" },
  { id: "visible-roof", emoji: "🏠", label: "지붕이 보이는 집다운 모습", pattern: "#117 보호하는 지붕", strategies: ["livability"], category: "building" },
  { id: "cascade-roof", emoji: "⛰️", label: "주변 건물과 높이가 어울리게", pattern: "#116 캐스케이드 지붕", strategies: ["view-priority"], category: "building" },

  // ━━━ 🏠 실·생활 (12개) ━━━
  { id: "two-light", emoji: "💡", label: "방마다 두 방향 빛이 들면", pattern: "#106 양면 채광", strategies: ["view-priority", "livability"], category: "living" },
  { id: "window-place", emoji: "🪟", label: "창가에 앉을 수 있는 자리", pattern: "#180 창가의 자리", strategies: ["livability"], category: "living" },
  { id: "open-kitchen", emoji: "🍳", label: "주방에서 가족이 보이면 좋겠다", pattern: "#184 요리하는 자리", strategies: ["livability"], category: "living" },
  { id: "private-terrace", emoji: "🌺", label: "나만의 작은 테라스/정원", pattern: "#140 사적 테라스", strategies: ["privacy-priority", "livability"], category: "living" },
  { id: "sleeping-sun", emoji: "🌄", label: "침실에 아침 햇살이 들면", pattern: "#138 잠자는 곳의 동향", strategies: ["livability"], category: "living" },
  { id: "couple-realm", emoji: "💑", label: "부부만의 독립된 공간", pattern: "#136 커플의 영역", strategies: ["privacy-priority"], category: "living" },
  { id: "child-realm", emoji: "👶", label: "아이 방이 독립적이면 좋겠다", pattern: "#137 아이의 영역", strategies: ["livability"], category: "living" },
  { id: "storage-wall", emoji: "🗄️", label: "수납이 넉넉하면 좋겠다", pattern: "#197 두꺼운 벽", strategies: ["livability", "area-maximize"], category: "living" },
  { id: "bathing-room", emoji: "🛁", label: "욕실이 쾌적하면 좋겠다", pattern: "#144 욕실", strategies: ["livability"], category: "living" },
  { id: "indoor-sun", emoji: "🌤️", label: "실내가 밝으면 좋겠다", pattern: "#128 실내 일조", strategies: ["livability", "view-priority"], category: "living" },
  { id: "earth-connect", emoji: "🌏", label: "1층은 땅과 연결된 느낌", pattern: "#168 땅과의 연결", strategies: ["livability"], category: "living" },
  { id: "home-workshop", emoji: "💻", label: "집에서 일할 수 있는 공간", pattern: "#157 홈오피스", strategies: ["livability"], category: "living" },
]
