/**
 * Christopher Alexander's 15 Fundamental Properties of Living Structure
 * "The Nature of Order" (2002-2005)
 * 
 * 알렉산더는 모든 "살아있는 구조"에 이 15가지 속성이 존재한다고 했다.
 * 각 속성은 건축 배치안의 품질을 평가하는 기준이 된다.
 */

export interface FundamentalProperty {
  id: number
  name: string
  nameKo: string
  description: string
  descriptionKo: string
  designCriteria: DesignCriterion[]
  icon: string
}

export interface DesignCriterion {
  condition: string
  conditionKo: string
  evaluator: (params: LayoutParams) => number // 0~10 점수
}

export interface LayoutParams {
  type: string          // tower, plate, courtyard, L-shape, mixed, garden
  coverage: number      // 건폐율 (%)
  floors: number        // 층수
  units: number         // 세대수
  parking: number       // 주차대수
  gfa: number           // 연면적
  siteArea: number      // 대지면적
  strategy: string      // 설계전략
  userValues?: {
    profitVsQuality: number     // 0=수익, 100=품질
    privacyVsCommunity: number  // 0=프라이버시, 100=커뮤니티
    efficiencyVsSpace: number   // 0=효율, 100=여유
  }
}

export interface PropertyScore {
  property: FundamentalProperty
  score: number        // 0~10
  maxScore: number     // 10
  reasoning: string    // 점수 근거
}

export interface LivingStructureResult {
  scores: PropertyScore[]
  totalScore: number       // 0~150
  normalizedScore: number  // 0~100
  grade: string            // S/A/B/C/D
  gradeColor: string
  summary: string          // 종합 평가 서술
  strengths: string[]      // 강점 속성
  weaknesses: string[]     // 약점 속성
}

// ═══════════════════════════════════════════════════
// 15가지 기본 속성 정의
// ═══════════════════════════════════════════════════

export const FIFTEEN_PROPERTIES: FundamentalProperty[] = [
  {
    id: 1,
    name: "Levels of Scale",
    nameKo: "스케일의 단계",
    icon: "📐",
    description: "A structure has life when it contains centers at many different scales, with a beautiful range of sizes.",
    descriptionKo: "살아있는 구조는 다양한 크기의 중심을 포함한다. 큰 것에서 작은 것으로 자연스러운 크기의 단계가 있어야 한다.",
    designCriteria: [
      {
        condition: "Building mass has varied scales (main + sub volumes)",
        conditionKo: "건물 매스에 다양한 스케일이 있는가 (주동 + 부속)",
        evaluator: (p) => {
          if (p.type === 'courtyard' || p.type === 'L-shape') return 8
          if (p.type === 'mixed') return 7
          if (p.type === 'garden') return 9
          if (p.floors <= 2) return 6
          return 5
        }
      },
      {
        condition: "Floor plan has hierarchy of spaces",
        conditionKo: "평면에 공간의 위계가 있는가",
        evaluator: (p) => {
          if (p.units > 0 && p.siteArea > 0) {
            const unitArea = p.gfa / Math.max(p.units, 1)
            if (unitArea > 100) return 8  // 큰 세대 = 다양한 공간 가능
            if (unitArea > 60) return 6
            return 4
          }
          return 5
        }
      }
    ]
  },
  {
    id: 2,
    name: "Strong Centers",
    nameKo: "강한 중심",
    icon: "🎯",
    description: "Every living structure has strong centers — focal points that organize the space around them.",
    descriptionKo: "살아있는 구조에는 강한 중심이 있다. 공간을 조직하는 명확한 초점이 존재해야 한다.",
    designCriteria: [
      {
        condition: "Layout has a clear focal point (courtyard, plaza, garden)",
        conditionKo: "배치에 명확한 중심 공간이 있는가 (중정, 광장, 정원)",
        evaluator: (p) => {
          if (p.type === 'courtyard') return 10
          if (p.type === 'L-shape') return 7
          if (p.type === 'garden') return 8
          if (p.coverage < 40) return 6  // 낮은 건폐율 = 외부 중심 가능
          return 4
        }
      }
    ]
  },
  {
    id: 3,
    name: "Boundaries",
    nameKo: "경계",
    icon: "🔲",
    description: "Living centers are strengthened by boundaries — thick borders that are themselves centers.",
    descriptionKo: "살아있는 중심은 경계에 의해 강화된다. 경계 자체가 하나의 중심이 되는 두꺼운 테두리가 필요하다.",
    designCriteria: [
      {
        condition: "Building has clear boundary zones (setbacks, landscaping, transition)",
        conditionKo: "건물에 명확한 경계 영역이 있는가 (이격, 조경, 전이공간)",
        evaluator: (p) => {
          const setbackRatio = (100 - p.coverage) / 100
          if (setbackRatio > 0.6) return 9  // 건폐율 40% 이하 = 넓은 경계
          if (setbackRatio > 0.5) return 7
          if (setbackRatio > 0.4) return 5
          return 3
        }
      }
    ]
  },
  {
    id: 4,
    name: "Alternating Repetition",
    nameKo: "교대하는 반복",
    icon: "🔄",
    description: "Repeating centers alternate with contrasting elements, creating rhythm.",
    descriptionKo: "반복되는 중심이 대비 요소와 교대하며 리듬을 만든다. 단순한 반복이 아닌 변주가 있는 반복.",
    designCriteria: [
      {
        condition: "Units have rhythm (varied unit types, alternating balconies)",
        conditionKo: "세대 배치에 리듬이 있는가 (다양한 세대 유형, 발코니 변주)",
        evaluator: (p) => {
          if (p.units >= 6 && p.type !== 'tower') return 7
          if (p.units >= 4) return 6
          if (p.type === 'garden') return 8  // 정원형은 자연스러운 변주
          return 5
        }
      }
    ]
  },
  {
    id: 5,
    name: "Positive Space",
    nameKo: "긍정적 공간",
    icon: "✨",
    description: "Both the built space and the outdoor space must have definite, positive shape.",
    descriptionKo: "건물뿐 아니라 외부 공간도 명확한 형태를 가져야 한다. 남은 공간이 아닌, 의도된 외부 공간.",
    designCriteria: [
      {
        condition: "Outdoor space has intentional shape (not leftover)",
        conditionKo: "외부 공간이 의도적 형태를 가지는가 (남은 공간이 아닌)",
        evaluator: (p) => {
          if (p.type === 'courtyard') return 10  // 중정 = 가장 명확한 긍정적 공간
          if (p.type === 'L-shape') return 8     // ㄱ자 = 반둘러싸인 마당
          if (p.type === 'garden') return 9
          if (p.coverage <= 35) return 7
          if (p.coverage <= 50) return 5
          return 3
        }
      }
    ]
  },
  {
    id: 6,
    name: "Good Shape",
    nameKo: "좋은 형태",
    icon: "💎",
    description: "A shape that is itself made of multiple coherent centers has good shape.",
    descriptionKo: "여러 중심이 조화를 이루는 형태가 좋은 형태이다. 기하학적으로 단순하면서도 풍부한 형태.",
    designCriteria: [
      {
        condition: "Building form has coherent geometry",
        conditionKo: "건물 형태가 조화로운 기하학을 가지는가",
        evaluator: (p) => {
          if (p.type === 'courtyard') return 9
          if (p.type === 'L-shape') return 7
          if (p.type === 'plate') return 6
          if (p.type === 'tower') return 5
          if (p.type === 'garden') return 8
          return 6
        }
      }
    ]
  },
  {
    id: 7,
    name: "Local Symmetries",
    nameKo: "국소적 대칭",
    icon: "🪞",
    description: "Living structure has many small local symmetries, not one overall symmetry.",
    descriptionKo: "전체적 대칭이 아닌 부분적 대칭이 많아야 한다. 각 부분이 자체적으로 균형을 이룬다.",
    designCriteria: [
      {
        condition: "Parts have their own symmetry without rigid overall symmetry",
        conditionKo: "부분들이 전체 대칭 없이 자체적 균형을 가지는가",
        evaluator: (p) => {
          if (p.type === 'L-shape') return 8    // 각 날개가 자체 대칭
          if (p.type === 'courtyard') return 7
          if (p.type === 'garden') return 9     // 비정형 속의 부분 대칭
          if (p.type === 'plate') return 5      // 전체 대칭에 의존
          return 6
        }
      }
    ]
  },
  {
    id: 8,
    name: "Deep Interlock and Ambiguity",
    nameKo: "깊은 맞물림과 모호함",
    icon: "🔗",
    description: "Adjacent centers are interlocked so deeply that it is hard to say where one ends and the other begins.",
    descriptionKo: "인접한 중심들이 깊이 맞물려 어디서 끝나고 시작되는지 구분하기 어렵다. 내부와 외부가 침투한다.",
    designCriteria: [
      {
        condition: "Indoor-outdoor boundary is blurred (terraces, covered walks, semi-open spaces)",
        conditionKo: "내외부 경계가 모호한가 (테라스, 지붕있는 통로, 반개방 공간)",
        evaluator: (p) => {
          if (p.type === 'courtyard') return 9
          if (p.type === 'L-shape') return 7
          if (p.type === 'garden') return 8
          if (p.type === 'mixed') return 6
          if (p.floors <= 2) return 7  // 저층은 내외부 침투가 쉬움
          return 4
        }
      }
    ]
  },
  {
    id: 9,
    name: "Contrast",
    nameKo: "대비",
    icon: "◼️",
    description: "Living structure draws its energy from contrasts: light/dark, solid/void, open/enclosed.",
    descriptionKo: "살아있는 구조는 대비에서 에너지를 얻는다. 밝음/어둠, 채움/비움, 개방/폐쇄의 대비.",
    designCriteria: [
      {
        condition: "Design has strong contrasts (solid vs transparent, high vs low, dense vs open)",
        conditionKo: "설계에 강한 대비가 있는가 (솔리드/투명, 높은/낮은, 밀집/개방)",
        evaluator: (p) => {
          const hasHeightVariation = p.floors >= 3
          const hasDensityVariation = p.coverage >= 30 && p.coverage <= 50
          let score = 4
          if (hasHeightVariation) score += 2
          if (hasDensityVariation) score += 2
          if (p.type === 'mixed' || p.type === 'L-shape') score += 1
          return Math.min(score, 10)
        }
      }
    ]
  },
  {
    id: 10,
    name: "Gradients",
    nameKo: "점진적 변화",
    icon: "🌅",
    description: "Living structure shows gradual transitions, not abrupt changes.",
    descriptionKo: "살아있는 구조는 급격한 변화가 아닌 점진적 전이를 보여준다. 공적→사적, 밝은→어두운 등의 그라데이션.",
    designCriteria: [
      {
        condition: "Space transitions are gradual (public→semi-public→semi-private→private)",
        conditionKo: "공간 전이가 점진적인가 (공적→반공적→반사적→사적)",
        evaluator: (p) => {
          if (p.type === 'courtyard') return 9  // 가장 자연스러운 단계적 전이
          if (p.type === 'L-shape') return 8
          if (p.type === 'garden') return 8
          if (p.coverage < 40) return 7
          if (p.type === 'tower') return 4  // 엘리베이터 홀→복도→현관, 단절적
          return 5
        }
      }
    ]
  },
  {
    id: 11,
    name: "Roughness",
    nameKo: "거칠음",
    icon: "🪨",
    description: "Living things are slightly irregular. Perfect precision kills life.",
    descriptionKo: "살아있는 것은 약간 불규칙하다. 완벽한 정밀함은 생명력을 죽인다. 자연스러운 변형과 불완전함.",
    designCriteria: [
      {
        condition: "Design allows for irregularity and organic variation",
        conditionKo: "설계에 불규칙성과 유기적 변형이 허용되는가",
        evaluator: (p) => {
          if (p.type === 'garden') return 9   // 가장 유기적
          if (p.type === 'courtyard') return 7
          if (p.type === 'L-shape') return 7
          if (p.type === 'plate') return 4    // 가장 정형적
          if (p.type === 'tower') return 3    // 매우 정형적
          return 5
        }
      }
    ]
  },
  {
    id: 12,
    name: "Echoes",
    nameKo: "메아리",
    icon: "🔔",
    description: "Similar forms, angles, or elements echo throughout the structure, creating family resemblance.",
    descriptionKo: "유사한 형태, 각도, 요소가 구조 전체에 메아리친다. 부분들 사이의 가족 유사성.",
    designCriteria: [
      {
        condition: "Design elements repeat with variation (window rhythm, balcony pattern, roof forms)",
        conditionKo: "설계 요소가 변주를 가지며 반복되는가 (창문 리듬, 발코니 패턴, 지붕 형태)",
        evaluator: (p) => {
          if (p.units >= 4) return 7   // 세대 반복 = 자연스러운 메아리
          if (p.type === 'garden') return 8
          if (p.type === 'courtyard') return 7
          return 5
        }
      }
    ]
  },
  {
    id: 13,
    name: "The Void",
    nameKo: "비움",
    icon: "⬜",
    description: "At the heart of every living structure there is a void — an empty center that brings calm.",
    descriptionKo: "모든 살아있는 구조의 중심에는 비움이 있다. 고요함을 가져오는 빈 중심.",
    designCriteria: [
      {
        condition: "Layout has a calm empty center (courtyard, garden, open space)",
        conditionKo: "배치에 고요한 빈 중심이 있는가 (중정, 정원, 열린 공간)",
        evaluator: (p) => {
          if (p.type === 'courtyard') return 10
          if (p.type === 'garden') return 9
          if (p.type === 'L-shape') return 7
          if (p.coverage <= 35) return 7
          if (p.coverage <= 50) return 5
          return 3
        }
      }
    ]
  },
  {
    id: 14,
    name: "Simplicity and Inner Calm",
    nameKo: "단순함과 내적 고요",
    icon: "🕊️",
    description: "Living structure achieves complexity through simple means, creating inner calm.",
    descriptionKo: "살아있는 구조는 단순한 수단으로 복잡함을 달성하며, 내적 고요함을 만든다.",
    designCriteria: [
      {
        condition: "Design achieves richness through simple, clear organization",
        conditionKo: "단순하고 명확한 조직으로 풍요로움을 달성하는가",
        evaluator: (p) => {
          // 단순한 형태 + 적절한 규모 = 높은 점수
          const unitArea = p.gfa / Math.max(p.units, 1)
          if (p.type === 'plate' && unitArea > 60) return 7
          if (p.type === 'garden' && p.floors <= 3) return 9
          if (p.type === 'courtyard') return 7
          if (p.floors <= 2 && p.coverage <= 50) return 8
          if (p.floors > 10) return 3  // 복잡한 고층 = 내적 고요 낮음
          return 5
        }
      }
    ]
  },
  {
    id: 15,
    name: "Not-Separateness",
    nameKo: "분리되지 않음",
    icon: "🌍",
    description: "The structure is connected to its surroundings, not an isolated object.",
    descriptionKo: "구조물이 주변 환경과 연결되어 있다. 고립된 객체가 아닌, 맥락과 하나인 건물.",
    designCriteria: [
      {
        condition: "Building connects to context (street, landscape, neighborhood)",
        conditionKo: "건물이 맥락과 연결되는가 (도로, 경관, 동네)",
        evaluator: (p) => {
          if (p.type === 'garden') return 9    // 자연과 가장 연결
          if (p.type === 'courtyard') return 8
          if (p.type === 'L-shape') return 7
          if (p.type === 'mixed') return 7     // 상가 = 가로 연결
          if (p.type === 'tower') return 3     // 타워 = 가장 고립
          if (p.floors <= 3) return 7
          return 5
        }
      }
    ]
  },
]

// ═══════════════════════════════════════════════════
// 평가 함수
// ═══════════════════════════════════════════════════

export function evaluateLivingStructure(params: LayoutParams): LivingStructureResult {
  const scores: PropertyScore[] = FIFTEEN_PROPERTIES.map(prop => {
    const criteriaScores = prop.designCriteria.map(c => c.evaluator(params))
    const avgScore = criteriaScores.reduce((a, b) => a + b, 0) / criteriaScores.length
    const score = Math.round(avgScore * 10) / 10

    // 가치관 보정 (있는 경우)
    let adjustedScore = score
    if (params.userValues) {
      const v = params.userValues
      // 품질 중시 → 자연/공간 관련 속성 가산
      if (v.profitVsQuality > 60 && [3, 5, 10, 13, 14].includes(prop.id)) {
        adjustedScore = Math.min(10, adjustedScore + 0.5)
      }
      // 커뮤니티 중시 → 공공성 관련 속성 가산
      if (v.privacyVsCommunity > 60 && [2, 8, 12, 15].includes(prop.id)) {
        adjustedScore = Math.min(10, adjustedScore + 0.5)
      }
      // 여유 중시 → 비움/단순함 가산
      if (v.efficiencyVsSpace > 60 && [13, 14, 5].includes(prop.id)) {
        adjustedScore = Math.min(10, adjustedScore + 0.5)
      }
    }

    const reasoning = generateReasoning(prop, adjustedScore, params)

    return {
      property: prop,
      score: adjustedScore,
      maxScore: 10,
      reasoning,
    }
  })

  const totalScore = scores.reduce((sum, s) => sum + s.score, 0)
  const normalizedScore = Math.round(totalScore / 150 * 100)

  const grade = normalizedScore >= 85 ? 'S' : normalizedScore >= 72 ? 'A' : normalizedScore >= 58 ? 'B' : normalizedScore >= 42 ? 'C' : 'D'
  const gradeColor = grade === 'S' ? '#f59e0b' : grade === 'A' ? '#10b981' : grade === 'B' ? '#3b82f6' : grade === 'C' ? '#8b5cf6' : '#ef4444'

  const sorted = [...scores].sort((a, b) => b.score - a.score)
  const strengths = sorted.slice(0, 3).map(s => `${s.property.icon} ${s.property.nameKo} (${s.score}/10)`)
  const weaknesses = sorted.slice(-3).map(s => `${s.property.icon} ${s.property.nameKo} (${s.score}/10)`)

  const summary = generateSummary(params, normalizedScore, grade, sorted)

  return { scores, totalScore, normalizedScore, grade, gradeColor, summary, strengths, weaknesses }
}

function generateReasoning(prop: FundamentalProperty, score: number, params: LayoutParams): string {
  const typeNames: Record<string, string> = {
    tower: '타워형', plate: '판상형', courtyard: '중정형',
    'L-shape': 'ㄱ자형', mixed: '복합형', garden: '정원형',
  }
  const typeName = typeNames[params.type] || params.type

  if (score >= 8) return `${typeName} 배치의 ${prop.nameKo} 속성이 우수함`
  if (score >= 6) return `${typeName} 배치에서 ${prop.nameKo}이(가) 양호하게 구현됨`
  if (score >= 4) return `${prop.nameKo} 속성이 부분적으로 나타남. 개선 여지 있음`
  return `${typeName} 배치에서 ${prop.nameKo}이(가) 약함. 설계 보완 필요`
}

function generateSummary(params: LayoutParams, score: number, grade: string, sorted: PropertyScore[]): string {
  const typeNames: Record<string, string> = {
    tower: '타워형', plate: '판상형', courtyard: '중정형',
    'L-shape': 'ㄱ자형', mixed: '복합형', garden: '정원형',
  }
  const typeName = typeNames[params.type] || params.type
  const top = sorted[0]
  const bottom = sorted[sorted.length - 1]

  if (grade === 'S') {
    return `이 ${typeName} 배치안은 알렉산더의 Living Structure 관점에서 탁월합니다. ` +
      `특히 ${top.property.nameKo}에서 뛰어나며, 건물이 주변 맥락과 유기적으로 연결된 ` +
      `"살아있는 건축"의 조건을 높은 수준으로 충족합니다.`
  }
  if (grade === 'A') {
    return `이 ${typeName} 배치안은 살아있는 구조의 속성을 잘 갖추고 있습니다. ` +
      `${top.property.nameKo}이(가) 특히 강하며, ${bottom.property.nameKo}을(를) 보강하면 ` +
      `더 높은 건축 품질을 달성할 수 있습니다.`
  }
  if (grade === 'B') {
    return `이 ${typeName} 배치안은 일부 살아있는 속성을 갖추고 있으나, ` +
      `${bottom.property.nameKo}에서 개선이 필요합니다. ` +
      `외부 공간의 질과 전이 공간을 강화하면 거주 품질이 크게 향상됩니다.`
  }
  return `이 ${typeName} 배치안은 효율성에 치중하여 살아있는 구조의 속성이 부족합니다. ` +
    `${bottom.property.nameKo}을(를) 개선하고, 스케일의 다양성과 외부 공간의 질을 높여야 합니다.`
}

// ═══════════════════════════════════════════════════
// 배치안 유형별 15속성 프로필 (빠른 참조용)
// ═══════════════════════════════════════════════════

export const TYPE_PROFILES: Record<string, { avgScore: number, bestProperties: number[], worstProperties: number[] }> = {
  tower:     { avgScore: 45, bestProperties: [4, 9, 12], worstProperties: [5, 8, 11, 13, 15] },
  plate:     { avgScore: 55, bestProperties: [4, 6, 12, 14], worstProperties: [7, 8, 11] },
  courtyard: { avgScore: 82, bestProperties: [2, 5, 8, 10, 13], worstProperties: [] },
  'L-shape': { avgScore: 72, bestProperties: [1, 7, 8, 10], worstProperties: [4] },
  mixed:     { avgScore: 62, bestProperties: [9, 15], worstProperties: [11, 13, 14] },
  garden:    { avgScore: 88, bestProperties: [1, 5, 7, 11, 13, 14, 15], worstProperties: [] },
}
