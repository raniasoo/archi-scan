/**
 * 유전 알고리즘(GA) 배치 최적화 엔진
 * 
 * 수백 개 배치안을 자동 탐색하여 최적 조합 선별
 * 목적함수: ROI × 일조 × 법규적합성 최대화
 */

export interface GAParams {
  siteArea: number
  maxCoverage: number   // 법정 건폐율 상한 (%)
  maxFAR: number        // 법정 용적률 상한 (%)
  maxFloors: number     // 최대 층수
  minUnits?: number     // 최소 세대수
  targetROI?: number    // 목표 ROI (%)
  weights?: { roi: number; sunlight: number; efficiency: number }
}

export interface GACandidate {
  type: string
  coverage: number    // 건폐율 (%)
  floors: number
  units: number
  far: number         // 용적률 (%)
  roi: number         // 추정 ROI (%)
  sunlightScore: number  // 일조 점수 (0~100)
  efficiency: number     // 공간 효율 (%)
  fitness: number        // 종합 적합도 (0~1)
  rank: number
}

const BUILDING_TYPES = [
  'tower', 'linear', 'lshape', 'courtyard', 'cluster',
  'y-shape', 't-shape', 'piloti', 'terrace',
]

// 타입별 특성
const TYPE_TRAITS: Record<string, { effRange: [number, number]; sunMod: number; minArea: number }> = {
  'tower':     { effRange: [0.55, 0.70], sunMod: 1.0,  minArea: 200 },
  'linear':    { effRange: [0.60, 0.72], sunMod: 0.95, minArea: 400 },
  'lshape':    { effRange: [0.58, 0.68], sunMod: 0.90, minArea: 500 },
  'courtyard': { effRange: [0.50, 0.65], sunMod: 0.85, minArea: 600 },
  'cluster':   { effRange: [0.55, 0.67], sunMod: 0.80, minArea: 1000 },
  'y-shape':   { effRange: [0.52, 0.66], sunMod: 0.92, minArea: 600 },
  't-shape':   { effRange: [0.54, 0.67], sunMod: 0.88, minArea: 500 },
  'piloti':    { effRange: [0.58, 0.70], sunMod: 0.98, minArea: 200 },
  'terrace':   { effRange: [0.50, 0.62], sunMod: 1.05, minArea: 400 },
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

// 단일 후보 생성
function createCandidate(params: GAParams): GACandidate {
  const type = BUILDING_TYPES[Math.floor(Math.random() * BUILDING_TYPES.length)]
  const traits = TYPE_TRAITS[type] || TYPE_TRAITS.tower

  if (params.siteArea < traits.minArea) {
    // 면적이 작으면 타워/필로티만
    return createCandidate(params)
  }

  const coverage = clamp(rand(20, params.maxCoverage), 20, params.maxCoverage)
  const floors = clamp(Math.round(rand(2, params.maxFloors)), 2, params.maxFloors)
  const far = coverage * floors
  if (far > params.maxFAR) return createCandidate(params) // 용적률 초과 → 재생성

  const footprint = params.siteArea * coverage / 100
  const gfa = footprint * floors
  const efficiency = rand(traits.effRange[0], traits.effRange[1])
  const exclusiveArea = gfa * efficiency
  const unitArea = rand(59, 120) // 평균 세대 면적
  const units = Math.max(1, Math.round(exclusiveArea / unitArea))

  // ROI 간이 추정
  const constructionCost = gfa * 450 // 만원/㎡
  const landCost = params.siteArea * 2000 // 만원/㎡ (평균)
  const totalCost = constructionCost + landCost
  const revenue = exclusiveArea * 1200 // 분양 수입 (만원/㎡)
  const roi = totalCost > 0 ? ((revenue - totalCost) / totalCost) * 100 : 0

  // 일조 점수 (층수 낮을수록, 건폐율 낮을수록 좋음)
  const sunlightBase = 100 - coverage * 0.5 - floors * 1.5
  const sunlightScore = clamp(sunlightBase * traits.sunMod, 10, 100)

  return {
    type, coverage: Math.round(coverage), floors, units,
    far: Math.round(far), roi: Math.round(roi * 10) / 10,
    sunlightScore: Math.round(sunlightScore),
    efficiency: Math.round(efficiency * 100),
    fitness: 0, rank: 0,
  }
}

// 적합도 계산
function evaluate(c: GACandidate, weights: { roi: number; sunlight: number; efficiency: number }): number {
  const roiNorm = clamp(c.roi / 30, 0, 1)         // ROI 30% → 1.0
  const sunNorm = c.sunlightScore / 100
  const effNorm = c.efficiency / 75                  // 효율 75% → 1.0
  return roiNorm * weights.roi + sunNorm * weights.sunlight + effNorm * weights.efficiency
}

// 교차 (crossover)
function crossover(a: GACandidate, b: GACandidate, params: GAParams): GACandidate {
  const type = Math.random() > 0.5 ? a.type : b.type
  const coverage = clamp((a.coverage + b.coverage) / 2 + rand(-3, 3), 20, params.maxCoverage)
  const floors = clamp(Math.round((a.floors + b.floors) / 2 + rand(-1, 1)), 2, params.maxFloors)
  const traits = TYPE_TRAITS[type] || TYPE_TRAITS.tower
  const far = coverage * floors

  if (far > params.maxFAR) return a.fitness > b.fitness ? a : b

  const footprint = params.siteArea * coverage / 100
  const gfa = footprint * floors
  const efficiency = rand(traits.effRange[0], traits.effRange[1])
  const exclusiveArea = gfa * efficiency
  const unitArea = rand(59, 120)
  const units = Math.max(1, Math.round(exclusiveArea / unitArea))

  const constructionCost = gfa * 450
  const landCost = params.siteArea * 2000
  const totalCost = constructionCost + landCost
  const revenue = exclusiveArea * 1200
  const roi = totalCost > 0 ? ((revenue - totalCost) / totalCost) * 100 : 0

  const sunlightBase = 100 - coverage * 0.5 - floors * 1.5
  const sunlightScore = clamp(sunlightBase * traits.sunMod, 10, 100)

  return {
    type, coverage: Math.round(coverage), floors, units,
    far: Math.round(far), roi: Math.round(roi * 10) / 10,
    sunlightScore: Math.round(sunlightScore),
    efficiency: Math.round(efficiency * 100),
    fitness: 0, rank: 0,
  }
}

// ━━━ 메인: GA 최적화 실행 ━━━
export function optimizeLayout(params: GAParams, generations = 50, popSize = 100): GACandidate[] {
  const weights = params.weights || { roi: 0.4, sunlight: 0.3, efficiency: 0.3 }

  // 초기 모집단
  let population: GACandidate[] = []
  for (let i = 0; i < popSize; i++) {
    population.push(createCandidate(params))
  }

  // 세대 진화
  for (let gen = 0; gen < generations; gen++) {
    // 적합도 평가
    for (const c of population) {
      c.fitness = evaluate(c, weights)
    }
    population.sort((a, b) => b.fitness - a.fitness)

    // 엘리트 보존 (상위 20%)
    const elite = population.slice(0, Math.floor(popSize * 0.2))

    // 교차 + 돌연변이로 다음 세대
    const next = [...elite]
    while (next.length < popSize) {
      const a = elite[Math.floor(Math.random() * elite.length)]
      const b = elite[Math.floor(Math.random() * elite.length)]
      const child = crossover(a, b, params)
      // 돌연변이 (10%)
      if (Math.random() < 0.1) {
        child.coverage = clamp(child.coverage + rand(-5, 5), 20, params.maxCoverage)
        child.floors = clamp(child.floors + Math.round(rand(-2, 2)), 2, params.maxFloors)
      }
      next.push(child)
    }
    population = next
  }

  // 최종 평가 + 정렬
  for (const c of population) {
    c.fitness = evaluate(c, weights)
  }
  population.sort((a, b) => b.fitness - a.fitness)

  // 타입별 상위 1개씩 + 전체 상위 5개 → 중복 제거
  const seen = new Set<string>()
  const results: GACandidate[] = []

  // 타입별 베스트
  for (const type of BUILDING_TYPES) {
    const best = population.find(c => c.type === type && !seen.has(`${c.type}-${c.coverage}-${c.floors}`))
    if (best) {
      seen.add(`${best.type}-${best.coverage}-${best.floors}`)
      results.push(best)
    }
  }

  // 전체 상위
  for (const c of population) {
    const key = `${c.type}-${c.coverage}-${c.floors}`
    if (!seen.has(key) && results.length < 12) {
      seen.add(key)
      results.push(c)
    }
  }

  results.sort((a, b) => b.fitness - a.fitness)
  results.forEach((c, i) => c.rank = i + 1)

  return results.slice(0, 10)
}
