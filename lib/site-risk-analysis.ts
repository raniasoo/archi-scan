/**
 * 대지 위험도 분석 엔진
 * 
 * ① 지진 위험도 (내진 설계 등급)
 * ② 침수 위험도 (표고/하천 기반)
 * ③ 대지 이력 (과거 용도/오염 가능성)
 */

// ━━━ ① 지진 위험도 분석 ━━━

export interface SeismicAnalysis {
  zone: string             // 지진구역 I / II
  zoneFactor: number       // 지역계수 (Z) — 0.11 또는 0.07
  siteClass: string        // 지반분류 S1~S5
  designAccel: number      // 설계 지반가속도 (g)
  seismicDesignCategory: string // 내진 설계 등급 (특/1/2/3)
  amplificationFactor: number  // 지반 증폭 계수
  risk: 'low' | 'medium' | 'high'
  description: string
  requirements: string[]
}

// 한국 지진구역 (시도별)
const SEISMIC_ZONE_MAP: Record<string, { zone: string; Z: number }> = {
  '경북': { zone: 'I', Z: 0.11 }, '경남': { zone: 'I', Z: 0.11 },
  '대구': { zone: 'I', Z: 0.11 }, '울산': { zone: 'I', Z: 0.11 },
  '부산': { zone: 'I', Z: 0.11 }, '충남': { zone: 'I', Z: 0.11 },
  '전남': { zone: 'I', Z: 0.11 }, '전북': { zone: 'I', Z: 0.11 },
  '충북': { zone: 'I', Z: 0.11 }, '대전': { zone: 'I', Z: 0.11 },
  '광주': { zone: 'I', Z: 0.11 }, '세종': { zone: 'I', Z: 0.11 },
  '서울': { zone: 'II', Z: 0.07 }, '경기': { zone: 'II', Z: 0.07 },
  '인천': { zone: 'II', Z: 0.07 }, '강원': { zone: 'II', Z: 0.07 },
  '제주': { zone: 'II', Z: 0.07 },
}

// 지반분류별 증폭 계수
const SITE_CLASS_AMP: Record<string, number> = {
  'S1': 0.8, 'S2': 1.0, 'S3': 1.2, 'S4': 1.6, 'S5': 2.0,
}

export function analyzeSeismicRisk(params: {
  address: string; soilCode: string; floors: number; siteArea: number
}): SeismicAnalysis {
  const { address, soilCode, floors, siteArea } = params

  // 지진구역 판정
  let zoneInfo = { zone: 'II', Z: 0.07 }
  for (const [region, info] of Object.entries(SEISMIC_ZONE_MAP)) {
    if (address.includes(region)) { zoneInfo = info; break }
  }

  // 지반분류 (토질 기반)
  const siteClass = soilCode === 'ROCK' ? 'S1' : soilCode === 'GRAVEL' ? 'S2' :
    soilCode === 'SAND' ? 'S3' : soilCode === 'CLAY' ? 'S4' : 'S5'

  const amp = SITE_CLASS_AMP[siteClass] || 1.2
  const designAccel = Math.round(zoneInfo.Z * amp * 1000) / 1000

  // 내진 설계 등급
  let category: string
  if (floors >= 6 || siteArea >= 1000) category = '내진 특등급'
  else if (floors >= 3) category = '내진 1등급'
  else category = '내진 2등급'

  const risk = zoneInfo.zone === 'I' && siteClass >= 'S4' ? 'high' :
    zoneInfo.zone === 'I' || siteClass >= 'S4' ? 'medium' : 'low'

  const requirements: string[] = []
  if (floors >= 3) requirements.push(`내진 설계 의무 (${floors}층 ≥ 3층)`)
  if (siteClass >= 'S4') requirements.push('연약지반 내진 보강 필요 (지반 증폭 고려)')
  if (zoneInfo.zone === 'I') requirements.push('지진구역 I: 강화된 내진 기준 적용')
  if (floors >= 6) requirements.push('내진 특등급: 비구조요소 내진 설계 포함')
  requirements.push(`설계 지반가속도: ${designAccel}g (KDS 41 17 00)`)

  return {
    zone: zoneInfo.zone, zoneFactor: zoneInfo.Z, siteClass,
    designAccel, seismicDesignCategory: category,
    amplificationFactor: amp, risk,
    description: `지진구역 ${zoneInfo.zone} (Z=${zoneInfo.Z}), 지반 ${siteClass} (증폭 ×${amp})`,
    requirements,
  }
}

// ━━━ ② 침수 위험도 분석 ━━━

export interface FloodAnalysis {
  risk: 'low' | 'medium' | 'high' | 'very-high'
  riskScore: number          // 0~100 (높을수록 위험)
  elevationRisk: string      // 표고 기반 위험도
  drainageRisk: string       // 배수 위험도
  factors: string[]
  recommendations: string[]
  floodHistoryNote: string
  designFloodLevel: number   // 설계 홍수위 (m)
}

export function analyzeFloodRisk(params: {
  elevation: number; slope: number; address: string
}): FloodAnalysis {
  const { elevation, slope, address } = params
  let score = 0
  const factors: string[] = []
  const recs: string[] = []

  // 표고 위험 (10m 이하 고위험)
  if (elevation <= 5) { score += 40; factors.push(`극저지대 (표고 ${elevation}m ≤ 5m)`) }
  else if (elevation <= 10) { score += 30; factors.push(`저지대 (표고 ${elevation}m ≤ 10m)`) }
  else if (elevation <= 20) { score += 15; factors.push(`저지대 (표고 ${elevation}m ≤ 20m)`) }
  else { factors.push(`안전 표고 (${elevation}m > 20m)`) }

  // 경사 위험 (1% 미만 배수 불량)
  if (slope < 1) { score += 20; factors.push('배수 불량 (경사 1% 미만)') }
  else if (slope < 2) { score += 10; factors.push('배수 보통 (경사 1~2%)') }
  else { factors.push(`배수 양호 (경사 ${slope}%)`) }

  // 지역 위험 (하천 근접 도시)
  const floodProne = ['강남구', '서초구', '송파구', '영등포구', '동작구', '마포구', '성동구']
  const coastalProne = ['해운대구', '수영구', '남구', '중구']
  for (const area of floodProne) {
    if (address.includes(area)) { score += 15; factors.push(`${area}: 한강 인접 침수 이력 지역`); break }
  }
  for (const area of coastalProne) {
    if (address.includes(area)) { score += 15; factors.push(`${area}: 해안 침수 위험 지역`); break }
  }

  // 반지하 위험
  if (elevation <= 15 && slope < 2) {
    score += 10
    factors.push('반지하 침수 고위험 조건')
    recs.push('반지하 계획 금지 또는 방수/배수 강화 필수')
  }

  // 권장사항
  if (score >= 50) {
    recs.push('건축물 1층 바닥 GL+500mm 이상 계획')
    recs.push('지하 주차장 진입부 방수턱(500mm) 설치')
    recs.push('빗물펌프/역류방지밸브 설치')
  }
  if (score >= 30) {
    recs.push('우수 저류조 설치 검토')
    recs.push('투수성 포장 적용 (우수 유출 저감)')
  }
  if (score < 30) {
    recs.push('일반적인 배수 설계로 충분')
  }

  const risk = score >= 60 ? 'very-high' : score >= 40 ? 'high' : score >= 20 ? 'medium' : 'low'

  return {
    risk, riskScore: Math.min(100, score),
    elevationRisk: elevation <= 10 ? '위험' : elevation <= 20 ? '주의' : '안전',
    drainageRisk: slope < 1 ? '불량' : slope < 2 ? '보통' : '양호',
    factors, recommendations: recs,
    floodHistoryNote: score >= 40 ? '최근 10년 내 침수 이력 확인 필요 (지자체 문의)' : '침수 이력 낮은 지역 추정',
    designFloodLevel: elevation <= 10 ? elevation + 2 : elevation + 1,
  }
}

// ━━━ ③ 대지 이력 분석 ━━━

export interface SiteHistory {
  currentUse: string           // 현재 용도
  previousUseEstimate: string  // 과거 용도 추정
  contaminationRisk: 'low' | 'medium' | 'high'
  culturalAssetRisk: 'low' | 'medium' | 'high'
  demolitionHistory: string
  warnings: string[]
  recommendations: string[]
}

export function analyzeSiteHistory(params: {
  address: string; elevation: number; siteArea: number
  zoneType?: string; buildingAge?: number
}): SiteHistory {
  const { address, elevation, siteArea, zoneType, buildingAge } = params
  const warnings: string[] = []
  const recs: string[] = []

  // 현재 용도 추정 (용도지역 기반)
  let currentUse = '주거용 대지'
  if (zoneType?.includes('상업')) currentUse = '상업용 대지'
  else if (zoneType?.includes('공업') || zoneType?.includes('산업')) currentUse = '공업용 대지'
  else if (zoneType?.includes('녹지')) currentUse = '녹지 (개발 제한 가능)'

  // 과거 용도 추정
  let previousUse = '주거/농업'
  let contaminationRisk: 'low' | 'medium' | 'high' = 'low'

  // 공업 지역 → 토양 오염 위험
  if (zoneType?.includes('공업') || zoneType?.includes('산업')) {
    previousUse = '공장/산업시설 가능성'
    contaminationRisk = 'high'
    warnings.push('⚠️ 공업지역: 토양오염 가능성 — 토양정밀조사 필수')
    recs.push('토양환경평가 실시 (토양오염우려기준 초과 시 정화 비용 수십억)')
  }

  // 주유소/세탁소/인쇄소 밀집 지역
  if (address.includes('공단') || address.includes('산업')) {
    contaminationRisk = 'high'
    warnings.push('⚠️ 산업단지 인접: 토양/지하수 오염 가능성')
  }

  // 매립지 (저지대 + 평탄)
  if (elevation <= 5) {
    previousUse = '매립지/습지 가능성'
    contaminationRisk = 'medium'
    warnings.push('⚠️ 저지대: 과거 매립지 또는 습지 가능성 — 지반조사 필수')
  }

  // 문화재 위험 (종로/중구/경주 등 역사 지역)
  let culturalRisk: 'low' | 'medium' | 'high' = 'low'
  const historicAreas = ['종로구', '중구', '경주', '부여', '공주', '익산', '서울 사대문']
  for (const area of historicAreas) {
    if (address.includes(area)) {
      culturalRisk = 'medium'
      warnings.push(`⚠️ ${area}: 문화재 매장 가능성 — 매장문화재 지표조사 필요`)
      recs.push('문화재청 매장문화재 지표조사 의뢰 (공사 착수 전)')
      break
    }
  }

  // 대규모 부지
  if (siteArea >= 5000) {
    culturalRisk = culturalRisk === 'low' ? 'medium' : culturalRisk
    recs.push('5,000㎡ 이상: 매장문화재 지표조사 의무 (문화재보호법)')
  }

  // 건물 철거 이력
  let demolition = '확인 필요 (건축물대장 말소 기록)'
  if (buildingAge && buildingAge > 30) {
    demolition = `기존 건물 ${buildingAge}년 이상 노후 → 철거 후 신축 추정`
    recs.push('기존 건물 철거 시 석면 조사 의무 (2001년 이전 건축물)')
  }

  // 기본 권장
  if (warnings.length === 0) {
    recs.push('특이 위험 요소 없음 — 일반적인 사전조사로 충분')
  }
  recs.push('건축물대장 열람으로 과거 건물 이력 확인')
  recs.push('토지이용규제정보서비스(LURIS)에서 용도 변경 이력 확인')

  return {
    currentUse, previousUseEstimate: previousUse,
    contaminationRisk, culturalAssetRisk: culturalRisk,
    demolitionHistory: demolition,
    warnings, recommendations: recs,
  }
}

// ━━━ 종합 대지 위험도 보고서 ━━━

export interface SiteRiskReport {
  seismic: SeismicAnalysis
  flood: FloodAnalysis
  history: SiteHistory
  overallRisk: 'low' | 'medium' | 'high'
  overallScore: number  // 0~100 (높을수록 안전)
  summary: string
}

export function generateSiteRiskReport(params: {
  address: string; elevation: number; slope: number
  soilCode: string; floors: number; siteArea: number
  zoneType?: string; buildingAge?: number
}): SiteRiskReport {
  const seismic = analyzeSeismicRisk(params)
  const flood = analyzeFloodRisk(params)
  const history = analyzeSiteHistory(params)

  // 종합 점수 (100=안전, 0=위험)
  let score = 100
  if (seismic.risk === 'high') score -= 25
  else if (seismic.risk === 'medium') score -= 10
  score -= flood.riskScore * 0.3
  if (history.contaminationRisk === 'high') score -= 20
  else if (history.contaminationRisk === 'medium') score -= 10
  if (history.culturalAssetRisk === 'medium') score -= 5
  score = Math.max(0, Math.round(score))

  const overallRisk = score >= 70 ? 'low' : score >= 40 ? 'medium' : 'high'

  const summary = `지진 ${seismic.zone}구역(${seismic.siteClass}), 침수 ${flood.risk}, 오염 ${history.contaminationRisk} → 종합 ${score}점 (${overallRisk === 'low' ? '안전' : overallRisk === 'medium' ? '주의' : '위험'})`

  return { seismic, flood, history, overallRisk, overallScore: score, summary }
}
