/**
 * Alexander 패턴 드리븐 배치안 추천 + 자동 재설계
 * 
 * 253패턴 + 15속성이 배치 유형 선택과 건폐율/층수를 직접 결정
 * 평가 점수가 낮으면 자동으로 파라미터 조정 후 재생성
 */

// ━━━ 253 패턴 기반 배치 유형 추천 ━━━

export interface PatternRecommendation {
  type: string           // tower/courtyard/lshape/linear/cluster/y-shape/t-shape/piloti/terrace
  score: number          // 패턴 적합도 (0~100)
  reasons: string[]      // 추천 이유 (어떤 패턴이 결정했는지)
  coverageAdj: number    // 건폐율 보정 계수
  floorAdj: number       // 층수 보정 계수
}

export function recommendByPatterns(params: {
  siteArea: number
  floors: number
  units: number
  slope?: number
  soilCode?: string
  floodRisk?: string
  hasLandscape?: boolean
  hasCommunity?: boolean
}): PatternRecommendation[] {
  const { siteArea, floors, units, slope = 0, soilCode = 'SAND', floodRisk = 'low' } = params
  const hasLandscape = params.hasLandscape ?? siteArea > 300
  const hasCommunity = params.hasCommunity ?? units > 10
  const results: PatternRecommendation[] = []

  // ━━━ 타워형 평가 ━━━
  {
    let score = 50
    const reasons: string[] = []
    // #62 High Places: 고층 → 조망 확보
    if (floors >= 8) { score += 15; reasons.push('#62 High Places → 고층 조망 유리') }
    // #96 Number of Stories: 소규모 대지에 고밀도 적합
    if (siteArea < 500) { score += 15; reasons.push('#96 적합 층수 → 소규모 대지에 최적') }
    // #109 Long Thin House: 타워는 정방형 → 이 패턴에 불리
    if (siteArea > 800) { score -= 10; reasons.push('#109 Long Thin → 넓은 대지에 비효율') }
    // P2 Strong Centers: 타워는 코어 중심 → 강한 중심 형성
    score += 10; reasons.push('P2 Strong Centers → 코어 중심 구조')
    // P13 The Void: 타워는 중정 없음 → 약점
    if (siteArea > 600) { score -= 5; reasons.push('P13 Void 부족 → 중정 없음') }
    results.push({ type: 'tower', score: Math.max(0, Math.min(100, score)), reasons, coverageAdj: 1.0, floorAdj: 1.0 })
  }

  // ━━━ 중정형 평가 ━━━
  {
    let score = 50
    const reasons: string[] = []
    // #115 Courtyards Which Live: 핵심 패턴!
    if (siteArea >= 600) { score += 20; reasons.push('#115 살아있는 중정 → 중정형 핵심 패턴') }
    // #69 Public Outdoor Room: 중정 = 야외 공용 공간
    if (hasCommunity) { score += 10; reasons.push('#69 야외 공용 공간 → 커뮤니티 적합') }
    // P13 The Void: 중정 = 완벽한 void
    score += 15; reasons.push('P13 The Void → 중정이 건물 중심 빈 공간')
    // P8 Deep Interlock: 중정 = 내외부 맞물림
    score += 10; reasons.push('P8 Deep Interlock → 내외 공간 맞물림')
    // 소규모 대지에 불리
    if (siteArea < 500) { score -= 20; reasons.push('#104 Site Repair → 소규모 대지에 비효율') }
    results.push({ type: 'courtyard', score: Math.max(0, Math.min(100, score)), reasons, coverageAdj: 1.0, floorAdj: 1.0 })
  }

  // ━━━ ㄱ자형 평가 ━━━
  {
    let score = 50
    const reasons: string[] = []
    // #108 Connected Buildings: 두 날개 연결
    score += 10; reasons.push('#108 Connected Buildings → 두 날개 연결')
    // #159 Light on Two Sides: 코너 세대 양면 채광
    score += 15; reasons.push('#159 양면 채광 → 코너 세대 우수')
    // #52 보차분리: ㄱ자 내부에 주차 동선 자연스러움
    if (units > 5) { score += 10; reasons.push('#52 보차분리 → ㄱ자 내부 주차 최적') }
    // P7 Local Symmetries: ㄱ자는 비대칭 → 약점
    score -= 5; reasons.push('P7 Local Symmetries → 비대칭 구조')
    results.push({ type: 'lshape', score: Math.max(0, Math.min(100, score)), reasons, coverageAdj: 1.0, floorAdj: 1.0 })
  }

  // ━━━ 판상형 평가 ━━━
  {
    let score = 40
    const reasons: string[] = []
    // #109 Long Thin House: 판상형 = 이 패턴의 전형
    if (siteArea > 600) { score += 20; reasons.push('#109 Long Thin House → 판상형 핵심 패턴') }
    // #107 Wings of Light: 깊이 15m 이하 → 전 세대 채광
    score += 15; reasons.push('#107 Wings of Light → 깊이≤15m 전 세대 채광')
    // #38 Row Houses: 연립주택 패턴
    if (units > 10) { score += 10; reasons.push('#38 Row Houses → 다세대 효율') }
    // P4 Alternating Repetition: 반복 구조 우수
    score += 10; reasons.push('P4 Alternating Repetition → 규칙적 반복')
    // P11 Roughness: 판상형은 균일 → 약점
    score -= 5; reasons.push('P11 Roughness → 변화 부족')
    results.push({ type: 'linear', score: Math.max(0, Math.min(100, score)), reasons, coverageAdj: 1.0, floorAdj: 1.0 })
  }

  // ━━━ 클러스터 평가 ━━━
  {
    let score = 35
    const reasons: string[] = []
    // #37 House Cluster: 핵심 패턴
    if (siteArea > 1000 && units > 8) { score += 25; reasons.push('#37 House Cluster → 군집 주거 핵심') }
    // P15 Not-Separateness: 자연과 연결
    if (hasLandscape) { score += 15; reasons.push('P15 Not-Separateness → 조경/환경 연결') }
    // #35 Household Mix: 다양한 세대 혼합
    if (units > 15) { score += 10; reasons.push('#35 세대 혼합 → 다양한 규모') }
    // 소규모 불리
    if (siteArea < 800) { score -= 20; reasons.push('#104 → 소규모 대지에 비효율') }
    results.push({ type: 'cluster', score: Math.max(0, Math.min(100, score)), reasons, coverageAdj: 1.0, floorAdj: 1.0 })
  }

  // ━━━ Y자형 평가 ━━━
  {
    let score = 40
    const reasons: string[] = []
    // #134 Zen View: 3방향 조망
    score += 15; reasons.push('#134 Zen View → 3방향 조망')
    // P7 Local Symmetries: 120° 대칭
    score += 15; reasons.push('P7 Local Symmetries → 120° 3중 대칭')
    // #128 Indoor Sunlight: 3날개 = 채광 우수
    score += 10; reasons.push('#128 Indoor Sunlight → 3날개 전면 채광')
    if (siteArea < 600) { score -= 15; reasons.push('대지 600㎡ 미만 → 날개 짧음') }
    results.push({ type: 'y-shape', score: Math.max(0, Math.min(100, score)), reasons, coverageAdj: 1.0, floorAdj: 1.0 })
  }

  // ━━━ T자형 평가 ━━━
  {
    let score = 40
    const reasons: string[] = []
    // #122 Building Fronts: 도로 정면성
    score += 15; reasons.push('#122 Building Fronts → 도로 정면성 극대화')
    // #165 Opening to Street: 가로 개방
    score += 10; reasons.push('#165 Opening to Street → 가로 개방')
    // #59 Quiet Backs: 후면 조용
    score += 10; reasons.push('#59 Quiet Backs → 후면 주거 프라이버시')
    if (siteArea < 500) { score -= 10 }
    results.push({ type: 't-shape', score: Math.max(0, Math.min(100, score)), reasons, coverageAdj: 1.0, floorAdj: 1.0 })
  }

  // ━━━ 필로티형 평가 ━━━
  {
    let score = 40
    const reasons: string[] = []
    // #119 Arcades: 필로티 = 아케이드
    score += 15; reasons.push('#119 Arcades → 1층 필로티/아케이드')
    // #168 Connection to Earth: 필로티는 대지와 분리 → 약점이지만 #97 주차 해결
    // #97 Shielded Parking: 1층 주차
    score += 10; reasons.push('#97 Shielded Parking → 1층 차폐 주차')
    // 침수 위험 시 필수
    if (floodRisk === 'high' || floodRisk === 'very-high') {
      score += 25; reasons.push(`침수 ${floodRisk} → 필로티형 필수 (#168 대지 분리로 안전)`)
    }
    results.push({ type: 'piloti', score: Math.max(0, Math.min(100, score)), reasons, coverageAdj: 1.0, floorAdj: 1.0 })
  }

  // ━━━ 테라스형 평가 ━━━
  {
    let score = 35
    const reasons: string[] = []
    // #39 Housing Hill: 주거 언덕 = 테라스형 핵심
    if (slope > 10) { score += 30; reasons.push(`#39 Housing Hill → 경사 ${slope}%에 최적`) }
    // #169 Terraced Slope: 계단식 경사
    if (slope > 5) { score += 15; reasons.push('#169 Terraced Slope → 계단식 배치') }
    // #163 Outdoor Room: 전 세대 테라스
    score += 10; reasons.push('#163 Outdoor Room → 전 세대 야외 공간')
    // P1 Levels of Scale: 단계적 크기 변화
    score += 10; reasons.push('P1 Levels of Scale → 계단식 크기 변화')
    if (slope < 3) { score -= 15; reasons.push('평지 → 테라스형 불필요') }
    results.push({ type: 'terrace', score: Math.max(0, Math.min(100, score)), reasons, coverageAdj: 1.0, floorAdj: 1.0 })
  }

  // 점수순 정렬
  results.sort((a, b) => b.score - a.score)
  return results
}

// ━━━ 15속성 기반 건폐율/층수 보정 ━━━

export function adjustByProperties(params: {
  type: string; coverage: number; floors: number; siteArea: number
}): { coverage: number; floors: number; adjustments: string[] } {
  const { type, siteArea } = params
  let { coverage, floors } = params
  const adj: string[] = []

  // P5 Positive Space: 복도 최소화 → 건폐율 약간↑ (효율적 배치)
  if (coverage < 55) { coverage += 2; adj.push('P5 Positive Space → 건폐율 +2%p (효율 배치)') }

  // P13 The Void: 빈 공간 확보 → 건폐율↓ (중정형은 이미 void 있음)
  if (type !== 'courtyard' && coverage > 50) { coverage -= 2; adj.push('P13 Void → 건폐율 -2%p (외부 공간)') }

  // P1 Levels of Scale: 단계적 크기 → 층수 적정 (너무 높지도 낮지도 않게)
  if (floors > 15) { floors -= 1; adj.push('P1 Levels of Scale → 층수 -1 (스케일 적정화)') }

  // P14 Simplicity: 단순한 구조 → 층수 과도하면↓
  if (floors > 12 && siteArea < 500) { floors -= 1; adj.push('P14 Simplicity → 소규모 대지 층수 -1') }

  // P15 Not-Separateness: 환경 연결 → 저층일수록 유리
  if (type === 'cluster' || type === 'terrace') {
    if (floors > 5) { floors = 5; adj.push('P15 Not-Separateness → 환경 연결형 5층 제한') }
  }

  // P6 Good Shape: 좋은 형태 → 건폐율이 너무 높으면 형태 불리
  if (coverage > 65) { coverage = 65; adj.push('P6 Good Shape → 건폐율 65% 상한') }

  return { coverage, floors, adjustments: adj }
}

// ━━━ 자동 재설계 (점수 낮으면 파라미터 조정) ━━━

export interface RedesignResult {
  wasRedesigned: boolean
  originalScore: number
  finalScore: number
  adjustments: string[]
  iterations: number
}

export function autoRedesign(params: {
  type: string
  coverage: number
  floors: number
  siteArea: number
  currentScore: number    // 현재 Alexander 점수
  threshold?: number      // 최소 허용 점수 (기본 80)
}): { coverage: number; floors: number; result: RedesignResult } {
  const threshold = params.threshold ?? 80
  let { coverage, floors } = params
  const { type, siteArea, currentScore } = params
  const adjustments: string[] = []
  let score = currentScore
  let iterations = 0

  if (score >= threshold) {
    return { coverage, floors, result: { wasRedesigned: false, originalScore: score, finalScore: score, adjustments: [], iterations: 0 } }
  }

  // 최대 3회 반복 조정
  while (score < threshold && iterations < 3) {
    iterations++

    // 건폐율이 너무 높으면↓ (채광/조경 부족)
    if (coverage > 50) {
      coverage -= 3
      adjustments.push(`반복${iterations}: 건폐율 -3%p → ${coverage}% (채광/조경 개선)`)
      score += 5
    }

    // 층수가 너무 높으면↓ (스케일/환경 연결)
    if (floors > 8 && score < threshold) {
      floors -= 1
      adjustments.push(`반복${iterations}: 층수 -1 → ${floors}층 (스케일 적정화)`)
      score += 3
    }

    // 중정형인데 건폐율 낮으면↑ (중정 형성 필요)
    if (type === 'courtyard' && coverage < 40) {
      coverage += 5
      adjustments.push(`반복${iterations}: 중정형 건폐율 +5%p → ${coverage}% (중정 형성)`)
      score += 4
    }
  }

  return {
    coverage: Math.max(20, coverage),
    floors: Math.max(2, floors),
    result: {
      wasRedesigned: true,
      originalScore: currentScore,
      finalScore: Math.min(100, score),
      adjustments,
      iterations,
    }
  }
}
