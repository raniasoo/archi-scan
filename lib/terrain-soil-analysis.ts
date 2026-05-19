/**
 * 대지 지형·토질 분석 엔진
 * 
 * 표고/경사 데이터 + 지질 추정 → 기초 타입/공사비 영향 분석
 * 한국 지질 특성 기반 토질 추정 모델
 */

export interface SoilType {
  code: string        // ROCK / GRAVEL / SAND / CLAY / SILT / FILL
  nameKo: string      // 암반 / 자갈 / 모래 / 점토 / 실트 / 매립
  bearing: number     // 허용 지내력 (kN/㎡)
  description: string
  color: string       // 시각화 색상
}

export interface TerrainAnalysis {
  // 표고 정보
  elevation: number          // 중심 표고 (m)
  elevationRange: [number, number]  // 최저~최고 (m)
  slope: number              // 경사도 (%)
  slopeGrade: string         // 평탄/완경사/경사/급경사/산악
  slopeDirection: string     // 경사 방향
  
  // 토질 추정
  estimatedSoil: SoilType
  soilConfidence: 'high' | 'medium' | 'low'
  groundwaterRisk: 'low' | 'medium' | 'high'
  liquefactionRisk: 'low' | 'medium' | 'high'
  
  // 기초 추천
  foundationType: string     // 독립기초 / 매트기초 / 파일기초
  foundationDepth: number    // 기초 깊이 (m)
  foundationCostFactor: number  // 기초 비용 계수 (1.0=표준, 2.0=2배)
  
  // 토공사 영향
  earthworkType: string      // 일반굴착 / 암파쇄 / 발파
  earthworkCostFactor: number // 토공사 비용 계수
  retainingWallNeeded: boolean // 옹벽 필요 여부
  
  // 건축 적합도
  buildabilityScore: number  // 0~100
  buildabilityGrade: string  // 최적/양호/보통/주의/부적합
  warnings: string[]
  recommendations: string[]
  
  // 총 비용 영향
  totalCostImpact: number    // 추가 비용 (%) — 0=표준, 30=30% 추가
}

// 토질 데이터베이스
const SOIL_TYPES: Record<string, SoilType> = {
  ROCK: { code: 'ROCK', nameKo: '암반 (경암/연암)', bearing: 4000, description: '풍화암 또는 연암층, 발파 필요 가능', color: '#6b7280' },
  GRAVEL: { code: 'GRAVEL', nameKo: '자갈층 (풍화토)', bearing: 300, description: '풍화된 암반 위 자갈+모래 혼합층', color: '#d97706' },
  SAND: { code: 'SAND', nameKo: '모래층 (사질토)', bearing: 200, description: '하천 근처 충적층, 배수 양호', color: '#eab308' },
  CLAY: { code: 'CLAY', nameKo: '점토층 (점성토)', bearing: 100, description: '평야부 점토, 압밀침하 주의', color: '#92400e' },
  SILT: { code: 'SILT', nameKo: '실트층 (세립토)', bearing: 50, description: '하천변/해안 세립토, 연약지반', color: '#78716c' },
  FILL: { code: 'FILL', nameKo: '매립토 (성토)', bearing: 30, description: '인공 매립지, 부등침하 위험', color: '#ef4444' },
}

// 표고+경사로 토질 추정 (한국 지질 기반)
function estimateSoilType(elevation: number, slope: number): { soil: SoilType; confidence: 'high' | 'medium' | 'low' } {
  // 고도 200m+ & 경사 15%+ → 암반 가능성 높음
  if (elevation > 200 && slope > 15) return { soil: SOIL_TYPES.ROCK, confidence: 'medium' }
  // 고도 100~200m & 경사 10%+ → 풍화토/자갈
  if (elevation > 100 && slope > 10) return { soil: SOIL_TYPES.GRAVEL, confidence: 'medium' }
  // 고도 50~100m & 경사 5%+ → 자갈/모래
  if (elevation > 50 && slope > 5) return { soil: SOIL_TYPES.GRAVEL, confidence: 'low' }
  // 고도 30~80m & 평탄 → 모래/점토 (도시 지역)
  if (elevation > 30 && slope <= 5) return { soil: SOIL_TYPES.SAND, confidence: 'low' }
  // 고도 10~30m & 평탄 → 점토 (충적 평야)
  if (elevation > 10 && slope <= 3) return { soil: SOIL_TYPES.CLAY, confidence: 'low' }
  // 고도 10m 이하 & 평탄 → 실트/매립 가능성
  if (elevation <= 10) return { soil: SOIL_TYPES.SILT, confidence: 'low' }
  // 기본값
  return { soil: SOIL_TYPES.SAND, confidence: 'low' }
}

// 기초 타입 추천
function recommendFoundation(soil: SoilType, floors: number, buildingHeight: number): {
  type: string; depth: number; costFactor: number; description: string
} {
  const load = floors * 12 // kN/㎡ (층당 약 12kN/㎡ 하중)
  
  if (soil.bearing >= 300 && floors <= 5) {
    return { type: '독립기초', depth: 1.2, costFactor: 1.0, description: '지내력 충분, 독립기초 가능 (가장 경제적)' }
  }
  if (soil.bearing >= 100 && floors <= 10) {
    return { type: '매트기초 (전면기초)', depth: 1.5, costFactor: 1.3, description: '매트기초로 하중 분산 (보통 비용)' }
  }
  if (soil.bearing >= 50 && floors <= 15) {
    return { type: '매트기초 + 지반보강', depth: 2.0, costFactor: 1.8, description: '지반보강(SCP/DCM) 후 매트기초' }
  }
  // 연약지반 또는 고층
  const pileDepth = soil.code === 'FILL' ? 20 : soil.code === 'SILT' ? 15 : 10
  return { type: `파일기초 (PHC ${pileDepth}m)`, depth: pileDepth, costFactor: soil.code === 'FILL' ? 3.0 : 2.0, description: `파일기초 필요 (기초 비용 ${soil.code === 'FILL' ? '3' : '2'}배)` }
}

// ━━━ 메인: 대지 지형·토질 분석 ━━━
export function analyzeTerrainAndSoil(params: {
  elevation: number
  minElevation: number
  maxElevation: number
  slope: number
  slopeDirection: string
  floors: number
  siteArea: number
  type?: string
}): TerrainAnalysis {
  const { elevation, minElevation, maxElevation, slope, slopeDirection, floors, siteArea } = params
  const buildingHeight = floors * 3.3
  
  // 경사 등급
  const slopeGrade = slope < 2 ? '평탄' : slope < 5 ? '완경사' : slope < 10 ? '경사' : slope < 20 ? '급경사' : '산악'
  
  // 토질 추정
  const { soil, confidence } = estimateSoilType(elevation, slope)
  
  // 지하수위 리스크 (저지대 + 평탄 → 높음)
  const gwRisk = elevation < 15 ? 'high' : elevation < 30 && slope < 3 ? 'medium' : 'low'
  
  // 액상화 리스크 (모래층 + 저지대)
  const liqRisk = (soil.code === 'SAND' || soil.code === 'SILT') && elevation < 20 ? 'medium' : 'low'
  
  // 기초 추천
  const foundation = recommendFoundation(soil, floors, buildingHeight)
  
  // 토공사
  const isRock = soil.code === 'ROCK'
  const earthworkType = isRock ? (slope > 20 ? '발파 + 암파쇄' : '암파쇄 (브레이커)') : '일반 굴착 (백호)'
  const earthworkCostFactor = isRock ? 2.5 : slope > 15 ? 1.8 : slope > 10 ? 1.3 : 1.0
  const retainingWall = slope > 10 || (maxElevation - minElevation) > 3
  
  // 경고 및 권장사항
  const warnings: string[] = []
  const recommendations: string[] = []
  
  if (soil.code === 'FILL') {
    warnings.push('⚠️ 매립지 추정: 부등침하 위험, 지반조사 필수')
    recommendations.push('지반조사(시추) 실시 후 파일기초 검토')
  }
  if (soil.code === 'SILT') {
    warnings.push('⚠️ 연약지반 추정: 압밀침하/측방유동 주의')
    recommendations.push('연약지반 처리공법(SCP/PBD) 검토')
  }
  if (gwRisk === 'high') {
    warnings.push('⚠️ 지하수위 높음 추정: 지하 굴착 시 차수공법 필요')
    recommendations.push('지하수위 조사 후 차수벽/웰포인트 검토')
  }
  if (slope > 15) {
    warnings.push('⚠️ 급경사지: 절토량 과다, 옹벽 필수')
    recommendations.push('절토 최소화 배치안 검토, 옹벽 구조 설계')
  }
  if (isRock && slope > 10) {
    warnings.push('⚠️ 암반 경사지: 발파 필요, 소음/진동 민원 주의')
    recommendations.push('무진동 암파쇄 공법(NB, 할암) 검토')
  }
  if (liqRisk === 'medium') {
    warnings.push('⚠️ 액상화 위험 지역: 내진 설계 강화 필요')
  }
  if (retainingWall) {
    recommendations.push(`옹벽 설계 필요 (고도차 ${(maxElevation - minElevation).toFixed(1)}m)`)
  }
  if (warnings.length === 0) {
    recommendations.push('일반적인 기초 설계로 충분 (표준 시공)')
  }
  
  // 건축 적합도 (100점 만점)
  let buildScore = 100
  if (soil.code === 'FILL') buildScore -= 40
  else if (soil.code === 'SILT') buildScore -= 30
  else if (soil.code === 'CLAY') buildScore -= 15
  if (slope > 20) buildScore -= 25
  else if (slope > 10) buildScore -= 15
  else if (slope > 5) buildScore -= 5
  if (gwRisk === 'high') buildScore -= 15
  if (retainingWall) buildScore -= 10
  buildScore = Math.max(10, buildScore)
  
  const buildGrade = buildScore >= 85 ? '최적' : buildScore >= 70 ? '양호' : buildScore >= 50 ? '보통' : buildScore >= 30 ? '주의' : '부적합'
  
  // 총 비용 영향
  const costImpact = Math.round((foundation.costFactor - 1) * 15 + (earthworkCostFactor - 1) * 10 + (retainingWall ? 8 : 0) + (gwRisk === 'high' ? 10 : gwRisk === 'medium' ? 3 : 0))
  
  return {
    elevation, elevationRange: [minElevation, maxElevation],
    slope, slopeGrade, slopeDirection,
    estimatedSoil: soil, soilConfidence: confidence,
    groundwaterRisk: gwRisk, liquefactionRisk: liqRisk,
    foundationType: foundation.type, foundationDepth: foundation.depth,
    foundationCostFactor: foundation.costFactor,
    earthworkType, earthworkCostFactor, retainingWallNeeded: retainingWall,
    buildabilityScore: buildScore, buildabilityGrade: buildGrade,
    warnings, recommendations,
    totalCostImpact: costImpact,
  }
}
