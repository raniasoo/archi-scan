/**
 * Christopher Alexander's 15 Fundamental Properties of Living Structure
 * "The Nature of Order" (2002-2005)
 * 
 * 건축물이 "살아있는 구조"를 가지는지 평가하는 15개 속성
 * 각 속성은 0~10점으로 평가되며, 배치안의 물리적 특성에서 자동 계산됨
 */

export interface FifteenPropertyScore {
  id: number
  name: string
  nameKo: string
  score: number       // 0~10
  maxScore: 10
  description: string // 이 배치안에서 이 속성이 어떻게 나타나는지
  icon: string
}

export interface FifteenPropertiesResult {
  properties: FifteenPropertyScore[]
  totalScore: number      // 0~150
  normalizedScore: number // 0~100
  grade: 'S' | 'A' | 'B' | 'C' | 'D'
  gradeLabel: string
  gradeColor: string
  philosophy: string      // 종합 평가 서술
  topStrengths: string[]  // 상위 3개 강점
  improvements: string[]  // 개선 가능한 부분
}

interface LayoutInput {
  type: string          // tower, plate, courtyard, L-shape, etc.
  name: string
  coverage: number      // 건폐율 (%)
  floors: number        // 층수
  units: number         // 세대수
  parking: number       // 주차대수
  gfa: number           // 연면적 (㎡)
  siteArea: number      // 대지면적 (㎡)
  strategy?: string     // 설계 전략
  userValues?: {
    profitVsQuality: number    // 0~100
    privacyVsCommunity: number // 0~100
    efficiencyVsSpace: number  // 0~100
  }
}

// ═══════════════════════════════════════════
// 15개 속성 정의 및 평가 함수
// ═══════════════════════════════════════════

const PROPERTY_DEFINITIONS = [
  {
    id: 1,
    name: "Levels of Scale",
    nameKo: "스케일의 단계",
    icon: "📐",
    evaluate: (l: LayoutInput): { score: number, desc: string } => {
      // 건물에 다양한 스케일 단계가 있는가? (전체→동→세대→방)
      // 낮은 층수 + 적절한 세대수 → 다양한 스케일 가능
      let score = 5
      if (l.floors <= 4) score += 2 // 저층은 스케일 단계가 풍부
      if (l.floors <= 2) score += 1
      if (l.units > 4 && l.units <= 20) score += 1 // 적절한 세대수
      if (l.coverage < 50) score += 1 // 여유 있는 배치 → 외부 스케일 단계
      const desc = score >= 8 ? "전체 건물→동→세대→방의 스케일 단계가 풍부하다" :
                   score >= 6 ? "기본적인 스케일 단계가 있으나 중간 단계가 부족할 수 있다" :
                   "단일 매스로 인해 스케일 단계가 제한적이다"
      return { score: Math.min(10, score), desc }
    }
  },
  {
    id: 2,
    name: "Strong Centers",
    nameKo: "강한 중심",
    icon: "🎯",
    evaluate: (l: LayoutInput): { score: number, desc: string } => {
      // 건물에 명확한 중심(중정, 로비, 공용공간)이 있는가?
      let score = 4
      const type = l.type.toLowerCase()
      if (type.includes('courtyard') || type.includes('중정')) score += 4 // 중정형은 강한 중심
      if (type.includes('l-shape') || type.includes('ㄱ')) score += 2 // ㄱ자는 꺾임점이 중심
      if (l.coverage >= 30 && l.coverage <= 50) score += 1 // 적절한 건폐율 → 내외부 중심 형성
      if (l.units >= 8) score += 1 // 공용 로비 필요 → 중심 형성
      const desc = score >= 8 ? "중정이나 공용 공간이 건물의 명확한 중심을 형성한다" :
                   score >= 6 ? "입구와 공용 공간이 중심 역할을 한다" :
                   "건물의 중심이 불명확하다"
      return { score: Math.min(10, score), desc }
    }
  },
  {
    id: 3,
    name: "Boundaries",
    nameKo: "경계",
    icon: "🔲",
    evaluate: (l: LayoutInput): { score: number, desc: string } => {
      // 공간들 사이에 명확하면서도 투과적인 경계가 있는가?
      let score = 5
      if (l.coverage < 60) score += 1 // 건물-외부 사이 전이 공간 가능
      if (l.coverage < 40) score += 1 // 더 풍부한 경계 공간
      const type = l.type.toLowerCase()
      if (type.includes('garden') || type.includes('정원')) score += 2 // 정원은 자연스러운 경계
      if (type.includes('courtyard') || type.includes('중정')) score += 1 // 중정 벽이 경계
      if (l.floors <= 3) score += 1 // 저층은 지면 경계가 풍부
      const desc = score >= 8 ? "공적→반공적→반사적→사적 공간의 경계가 자연스럽게 전이된다" :
                   score >= 6 ? "건물과 외부 사이 경계가 존재하나 더 섬세한 전이가 필요하다" :
                   "건물이 주변과 단절되어 경계의 풍부함이 부족하다"
      return { score: Math.min(10, score), desc }
    }
  },
  {
    id: 4,
    name: "Alternating Repetition",
    nameKo: "교차 반복",
    icon: "🔁",
    evaluate: (l: LayoutInput): { score: number, desc: string } => {
      // 유사하지만 미세하게 다른 요소들의 반복이 있는가?
      let score = 5
      if (l.units >= 4 && l.units <= 12) score += 2 // 적절한 반복 수
      if (l.units > 12) score += 1 // 반복은 있지만 단조로움 위험
      if (l.floors >= 2 && l.floors <= 4) score += 1 // 층의 반복
      const type = l.type.toLowerCase()
      if (type.includes('row') || type.includes('연립')) score += 2 // 연립은 교차 반복의 전형
      if (type.includes('terrace') || type.includes('계단')) score += 1 // 계단식 반복
      const desc = score >= 8 ? "세대들이 유사하면서도 개성 있게 반복되어 리듬감이 있다" :
                   score >= 6 ? "반복적 요소가 있으나 변주가 더 필요하다" :
                   "반복이 단조롭거나 반복 패턴 자체가 부족하다"
      return { score: Math.min(10, score), desc }
    }
  },
  {
    id: 5,
    name: "Positive Space",
    nameKo: "긍정적 공간",
    icon: "✨",
    evaluate: (l: LayoutInput): { score: number, desc: string } => {
      // 건물 사이의 외부 공간이 '비어있는 것'이 아니라 '방'처럼 느껴지는가?
      let score = 3
      const openRatio = 100 - l.coverage
      if (openRatio >= 40 && openRatio <= 70) score += 3 // 외부 공간이 방처럼 형성
      if (openRatio > 70) score += 1 // 너무 넓으면 긍정적 공간이 약해짐
      const type = l.type.toLowerCase()
      if (type.includes('courtyard') || type.includes('중정')) score += 3 // 중정은 긍정적 공간의 전형
      if (type.includes('l-shape') || type.includes('ㄱ')) score += 2 // ㄱ자는 감싸는 공간
      if (type.includes('garden') || type.includes('정원')) score += 2
      const desc = score >= 8 ? "외부 공간이 건물에 감싸여 '야외 방'처럼 느껴진다" :
                   score >= 6 ? "일부 외부 공간이 긍정적으로 형성되어 있다" :
                   "외부 공간이 남은 공간으로 느껴지며 의도적 형태가 부족하다"
      return { score: Math.min(10, score), desc }
    }
  },
  {
    id: 6,
    name: "Good Shape",
    nameKo: "좋은 형태",
    icon: "💎",
    evaluate: (l: LayoutInput): { score: number, desc: string } => {
      // 건물의 형태가 기하학적으로 아름다운가?
      let score = 5
      const type = l.type.toLowerCase()
      if (type.includes('courtyard') || type.includes('중정')) score += 2
      if (type.includes('l-shape') || type.includes('ㄱ')) score += 2
      if (type.includes('tower') || type.includes('타워')) score += 1 // 타워는 단순한 좋은 형태
      if (l.coverage >= 30 && l.coverage <= 50) score += 1 // 적절한 비율
      if (l.floors <= 5) score += 1 // 인간적 스케일
      const desc = score >= 8 ? "건물 형태가 대지에 잘 맞고 기하학적으로 아름답다" :
                   score >= 6 ? "기본적으로 좋은 형태이나 대지와의 관계를 더 다듬을 수 있다" :
                   "형태가 경제적 논리에만 따르고 있다"
      return { score: Math.min(10, score), desc }
    }
  },
  {
    id: 7,
    name: "Local Symmetries",
    nameKo: "국소적 대칭",
    icon: "🪞",
    evaluate: (l: LayoutInput): { score: number, desc: string } => {
      // 전체가 아닌 부분에서의 대칭이 있는가?
      let score = 5
      if (l.units >= 2) score += 1 // 세대 배치의 국소 대칭
      if (l.units >= 4 && l.units % 2 === 0) score += 1 // 쌍을 이루는 세대
      const type = l.type.toLowerCase()
      if (type.includes('courtyard') || type.includes('중정')) score += 2 // 중정 주변 대칭
      if (type.includes('plate') || type.includes('판상')) score += 1 // 판상형은 입면 대칭
      if (l.floors >= 2) score += 1 // 층간 대칭
      const desc = score >= 8 ? "각 세대, 창, 입면에서 국소적 대칭이 풍부하다" :
                   score >= 6 ? "부분적 대칭이 존재하나 더 세심한 적용이 가능하다" :
                   "대칭이 전체적이거나 거의 없어 국소적 풍부함이 부족하다"
      return { score: Math.min(10, score), desc }
    }
  },
  {
    id: 8,
    name: "Deep Interlock and Ambiguity",
    nameKo: "깊은 맞물림과 모호성",
    icon: "🔗",
    evaluate: (l: LayoutInput): { score: number, desc: string } => {
      // 공간들이 서로 맞물려 경계가 모호한 부분이 있는가?
      let score = 4
      const type = l.type.toLowerCase()
      if (type.includes('courtyard') || type.includes('중정')) score += 3 // 내부-외부 맞물림
      if (type.includes('l-shape') || type.includes('ㄱ')) score += 2
      if (type.includes('mixed') || type.includes('복합')) score += 2 // 용도 혼합 = 맞물림
      if (l.coverage >= 30 && l.coverage <= 55) score += 1 // 적절한 밀도 → 공간 맞물림
      if (l.floors <= 3) score += 1 // 저층에서 내외부 맞물림 용이
      const desc = score >= 8 ? "실내와 실외, 공적과 사적 공간이 깊이 맞물려 풍부한 경험을 만든다" :
                   score >= 6 ? "일부 공간에서 맞물림이 나타나지만 더 깊은 연결이 가능하다" :
                   "공간들이 명확히 분리되어 있어 맞물림의 풍부함이 부족하다"
      return { score: Math.min(10, score), desc }
    }
  },
  {
    id: 9,
    name: "Contrast",
    nameKo: "대비",
    icon: "◐",
    evaluate: (l: LayoutInput): { score: number, desc: string } => {
      // 밝음/어두움, 큼/작음, 높음/낮음의 대비가 있는가?
      let score = 5
      if (l.floors >= 2) score += 1 // 높낮이 대비
      if (l.floors >= 3 && l.floors <= 5) score += 1 // 적절한 높이 대비
      const type = l.type.toLowerCase()
      if (type.includes('mixed') || type.includes('복합')) score += 2 // 용도 대비
      if (type.includes('courtyard') || type.includes('중정')) score += 1 // 내부-외부 대비
      if (l.coverage < 50) score += 1 // 건물-공간 대비
      const desc = score >= 8 ? "빛과 그림자, 높고 낮은 공간, 넓고 좁은 공간의 대비가 극적이다" :
                   score >= 6 ? "기본적인 대비가 있으나 더 극적인 공간 경험이 가능하다" :
                   "공간이 균일하여 대비의 풍부함이 부족하다"
      return { score: Math.min(10, score), desc }
    }
  },
  {
    id: 10,
    name: "Gradients",
    nameKo: "그라디언트",
    icon: "🌅",
    evaluate: (l: LayoutInput): { score: number, desc: string } => {
      // 공적→사적, 밝음→어두움 등의 점진적 변화가 있는가?
      let score = 4
      const type = l.type.toLowerCase()
      if (type.includes('courtyard') || type.includes('중정')) score += 3 // 중심에서 외부로 그라디언트
      if (type.includes('l-shape') || type.includes('ㄱ')) score += 2
      if (type.includes('terrace') || type.includes('계단')) score += 2 // 높이 그라디언트
      if (l.coverage < 50) score += 1 // 밀도 그라디언트 가능
      if (l.floors <= 4) score += 1 // 인간적 높이 그라디언트
      const desc = score >= 8 ? "거리에서 집 안쪽까지 공공성·밝기·밀도의 점진적 변화가 자연스럽다" :
                   score >= 6 ? "일부 그라디언트가 있으나 더 섬세한 전이가 가능하다" :
                   "공적/사적 공간의 전이가 갑작스럽다"
      return { score: Math.min(10, score), desc }
    }
  },
  {
    id: 11,
    name: "Roughness",
    nameKo: "거칠음",
    icon: "🪨",
    evaluate: (l: LayoutInput): { score: number, desc: string } => {
      // 기계적 완벽함이 아닌, 인간적 불규칙함이 있는가?
      let score = 4
      const type = l.type.toLowerCase()
      if (type.includes('garden') || type.includes('정원')) score += 3 // 정원은 자연스러운 거칠음
      if (type.includes('courtyard') || type.includes('중정')) score += 1
      if (l.floors <= 3) score += 2 // 저층은 수공예적 느낌 가능
      if (l.floors > 10) score -= 1 // 고층은 기계적 완벽함 필요
      if (l.units <= 8) score += 1 // 소규모는 개별성 가능
      const desc = score >= 8 ? "기계적 완벽함 대신 인간적 따뜻함과 자연스러운 변주가 있다" :
                   score >= 6 ? "부분적으로 자연스러운 변주가 있다" :
                   "기계적으로 반복되는 형태로 인간적 거칠음이 부족하다"
      return { score: Math.min(10, Math.max(0, score)), desc }
    }
  },
  {
    id: 12,
    name: "Echoes",
    nameKo: "메아리",
    icon: "🔔",
    evaluate: (l: LayoutInput): { score: number, desc: string } => {
      // 건물 전체에 걸쳐 유사한 형태/각도/비례가 반복되는가?
      let score = 5
      if (l.units >= 3) score += 1 // 세대 형태의 메아리
      if (l.floors >= 2) score += 1 // 층간 메아리
      const type = l.type.toLowerCase()
      if (type.includes('courtyard') || type.includes('중정')) score += 1
      if (type.includes('row') || type.includes('연립')) score += 2 // 연립은 메아리의 전형
      if (l.coverage >= 30 && l.coverage <= 55) score += 1
      const desc = score >= 8 ? "창의 비례, 처마의 각도, 재료의 패턴이 건물 전체에서 메아리친다" :
                   score >= 6 ? "일부 요소에서 형태적 메아리가 나타난다" :
                   "요소들 사이의 형태적 연관성이 부족하다"
      return { score: Math.min(10, score), desc }
    }
  },
  {
    id: 13,
    name: "The Void",
    nameKo: "비움",
    icon: "⭕",
    evaluate: (l: LayoutInput): { score: number, desc: string } => {
      // 의도적으로 비워진, 고요한 중심 공간이 있는가?
      let score = 3
      const openRatio = 100 - l.coverage
      if (openRatio >= 50) score += 2 // 넉넉한 외부 공간
      if (openRatio >= 65) score += 1 // 더 여유로운 비움
      const type = l.type.toLowerCase()
      if (type.includes('courtyard') || type.includes('중정')) score += 4 // 중정 = 의도적 비움
      if (type.includes('garden') || type.includes('정원')) score += 2
      if (type.includes('l-shape') || type.includes('ㄱ')) score += 1
      const desc = score >= 8 ? "건물 중심에 의도적으로 비워진 고요한 공간이 있다" :
                   score >= 6 ? "외부 공간이 있으나 '의도적 비움'의 깊이를 더할 수 있다" :
                   "빈 공간이 남은 공간이지 의도적 비움이 아니다"
      return { score: Math.min(10, score), desc }
    }
  },
  {
    id: 14,
    name: "Simplicity and Inner Calm",
    nameKo: "단순함과 내적 고요",
    icon: "🧘",
    evaluate: (l: LayoutInput): { score: number, desc: string } => {
      // 복잡함 속의 단순함, 기하학적 명료함이 있는가?
      let score = 5
      const type = l.type.toLowerCase()
      if (type.includes('plate') || type.includes('판상')) score += 2 // 판상형은 단순명료
      if (type.includes('tower') || type.includes('타워')) score += 1
      if (l.floors <= 3) score += 1 // 저층은 단순
      if (l.units <= 10) score += 1 // 소규모는 명료
      if (l.coverage >= 25 && l.coverage <= 45) score += 1 // 적절한 밀도 = 여유
      const desc = score >= 8 ? "건물 전체에 군더더기 없는 단순함과 명료함이 깃들어 있다" :
                   score >= 6 ? "기본적으로 단순하나 일부 요소가 복잡함을 더하고 있다" :
                   "기능적 요소가 과도하여 내적 고요가 부족하다"
      return { score: Math.min(10, score), desc }
    }
  },
  {
    id: 15,
    name: "Not-Separateness",
    nameKo: "비분리성",
    icon: "🌿",
    evaluate: (l: LayoutInput): { score: number, desc: string } => {
      // 건물이 주변 환경과 하나로 연결되어 있는가?
      let score = 4
      if (l.coverage < 50) score += 1 // 외부 공간을 통한 연결
      if (l.coverage < 35) score += 1 // 더 여유로운 연결
      const type = l.type.toLowerCase()
      if (type.includes('garden') || type.includes('정원')) score += 3 // 정원이 주변과 연결
      if (type.includes('courtyard') || type.includes('중정')) score += 1
      if (type.includes('terrace') || type.includes('계단')) score += 2 // 경사지 순응
      if (l.floors <= 3) score += 1 // 저층은 주변과 연결 용이
      if (l.floors <= 2) score += 1
      const desc = score >= 8 ? "건물이 대지, 이웃, 자연과 하나로 녹아들어 경계가 없다" :
                   score >= 6 ? "주변과 연결되어 있으나 더 깊은 융합이 가능하다" :
                   "건물이 주변과 단절되어 독립된 객체처럼 서 있다"
      return { score: Math.min(10, score), desc }
    }
  },
]

// ═══════════════════════════════════════════
// 메인 평가 함수
// ═══════════════════════════════════════════

export function evaluateFifteenProperties(layout: LayoutInput): FifteenPropertiesResult {
  const properties: FifteenPropertyScore[] = PROPERTY_DEFINITIONS.map(def => {
    const { score, desc } = def.evaluate(layout)
    return {
      id: def.id,
      name: def.name,
      nameKo: def.nameKo,
      score,
      maxScore: 10,
      description: desc,
      icon: def.icon,
    }
  })

  const totalScore = properties.reduce((sum, p) => sum + p.score, 0)
  const normalizedScore = Math.round(totalScore / 150 * 100)

  // 등급 결정
  let grade: 'S' | 'A' | 'B' | 'C' | 'D'
  let gradeLabel: string
  let gradeColor: string
  if (normalizedScore >= 85) { grade = 'S'; gradeLabel = '탁월'; gradeColor = '#8b5cf6' }
  else if (normalizedScore >= 70) { grade = 'A'; gradeLabel = '우수'; gradeColor = '#10b981' }
  else if (normalizedScore >= 55) { grade = 'B'; gradeLabel = '양호'; gradeColor = '#3b82f6' }
  else if (normalizedScore >= 40) { grade = 'C'; gradeLabel = '보통'; gradeColor = '#f59e0b' }
  else { grade = 'D'; gradeLabel = '미흡'; gradeColor = '#ef4444' }

  // 상위 강점 / 개선점
  const sorted = [...properties].sort((a, b) => b.score - a.score)
  const topStrengths = sorted.slice(0, 3).map(p => `${p.icon} ${p.nameKo}: ${p.description}`)
  const improvements = sorted.slice(-3).reverse().map(p => `${p.icon} ${p.nameKo}: ${p.description}`)

  // 철학 서술 자동 생성
  const top3 = sorted.slice(0, 3)
  const typeName = layout.name || layout.type
  const philosophy = generatePhilosophy(typeName, top3, grade, normalizedScore, layout)

  return {
    properties,
    totalScore,
    normalizedScore,
    grade,
    gradeLabel,
    gradeColor,
    philosophy,
    topStrengths,
    improvements,
  }
}

function generatePhilosophy(
  name: string,
  top3: FifteenPropertyScore[],
  grade: string,
  score: number,
  layout: LayoutInput
): string {
  const strengthNames = top3.map(p => p.nameKo).join(', ')
  
  if (grade === 'S') {
    return `'${name}'은(는) 알렉산더가 말한 '살아있는 구조'의 거의 모든 속성을 갖추고 있다. ` +
      `특히 ${strengthNames}에서 탁월하며, 이 건물에 사는 사람들은 공간이 자신을 감싸고 보호하면서도 ` +
      `주변 세계와 연결되어 있음을 느낄 것이다. 이것은 단순한 주거가 아니라 '장소'이다.`
  }
  if (grade === 'A') {
    return `'${name}'은(는) ${strengthNames}에서 뛰어난 공간 품질을 보여준다. ` +
      `알렉산더의 관점에서 이 건물은 '살아있는 구조'에 가깝다. ` +
      `건물이 대지 위에 자연스럽게 자리잡고, 내부와 외부가 유기적으로 연결되며, ` +
      `거주자의 일상이 풍요로워질 수 있는 공간적 깊이를 가지고 있다.`
  }
  if (grade === 'B') {
    return `'${name}'은(는) ${strengthNames}에서 좋은 가능성을 보인다. ` +
      `현재 상태에서도 기본적인 공간 품질이 확보되어 있으나, 알렉산더가 강조한 ` +
      `'공간이 사람을 감싸는 느낌'을 더 깊이 구현하면 건물의 가치가 크게 높아질 것이다.`
  }
  if (grade === 'C') {
    return `'${name}'은(는) 기능적으로는 적절하나, 알렉산더가 말한 '살아있는 구조'의 속성이 ` +
      `부족하다. ${strengthNames}에서 일부 가능성이 보이지만, 건물이 거주자의 삶에 깊이 ` +
      `영향을 주는 '장소'가 되려면 공간의 위계, 경계의 풍부함, 내외부의 맞물림을 강화해야 한다.`
  }
  return `'${name}'은(는) 경제적 효율에 치중하여 공간의 질적 측면이 크게 부족하다. ` +
    `알렉산더는 "건물이 사람의 영혼을 치유할 수도, 파괴할 수도 있다"고 했다. ` +
    `이 배치안은 거주자의 일상에 긍정적 영향을 주기 어려우며, 근본적인 공간 구성 재검토가 필요하다.`
}

// 레이더 차트용 데이터 변환
export function toRadarData(result: FifteenPropertiesResult): Array<{ property: string, score: number, fullMark: number }> {
  return result.properties.map(p => ({
    property: p.nameKo,
    score: p.score,
    fullMark: 10,
  }))
}
