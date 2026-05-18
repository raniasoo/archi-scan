/**
 * 환경 시뮬레이션 확장 엔진
 * 바람 / 소음 / 조망권 / 에너지 성능
 * 
 * Forma/빌드잇 수준 달성 목표
 */

// ━━━ 바람 시뮬레이션 (간이 CFD) ━━━

export interface WindAnalysis {
  prevailingDirection: string   // 탁월풍 방향 (예: NW)
  avgSpeed: number              // 평균 풍속 (m/s)
  beaufortScale: number         // 보퍼트 등급 (0~12)
  comfortLevel: string          // 보행자 편의 등급
  issues: string[]
  recommendations: string[]
  facadeExposure: Record<string, 'high' | 'medium' | 'low'>  // 각 면 바람 노출도
}

export function analyzeWind(params: {
  buildingHeight: number; floors: number; type: string; orientation?: number
}): WindAnalysis {
  const { buildingHeight, floors, type, orientation = 0 } = params
  // 서울 기준 탁월풍: 겨울 NW, 여름 SE
  const avgSpeed = 2.5 + buildingHeight * 0.02 // 고층일수록 풍속 증가
  const beaufort = avgSpeed < 1 ? 0 : avgSpeed < 3 ? 2 : avgSpeed < 5 ? 3 : avgSpeed < 8 ? 4 : 5

  const issues: string[] = []
  const recs: string[] = []

  // 고층 빌풍 효과
  if (floors >= 15) {
    issues.push(`${floors}층 고층 건물 하부 빌풍(downwash) 발생 가능`)
    recs.push('1층 캐노피/방풍림 설치 권장')
  }

  // 타워형 와류
  if (type === 'tower' && floors >= 10) {
    issues.push('타워형 건물 측면 와류(vortex shedding) 주의')
    recs.push('건물 모서리 라운딩 또는 방풍 스크린 검토')
  }

  // 중정형 바람길
  if (type === 'courtyard') {
    recs.push('중정 개구부 방향을 여름 탁월풍(SE)과 맞추면 자연환기 효과')
  }

  // 면별 바람 노출도
  const facadeExposure: Record<string, 'high' | 'medium' | 'low'> = {
    north: floors >= 10 ? 'high' : 'medium',
    south: 'medium',
    east: 'low',
    west: floors >= 15 ? 'high' : 'medium',
  }

  return {
    prevailingDirection: 'NW (겨울) / SE (여름)',
    avgSpeed: Math.round(avgSpeed * 10) / 10,
    beaufortScale: beaufort,
    comfortLevel: beaufort <= 2 ? '쾌적' : beaufort <= 3 ? '양호' : beaufort <= 4 ? '약간 불편' : '불편',
    issues, recommendations: recs, facadeExposure,
  }
}

// ━━━ 소음 분석 ━━━

export interface NoiseAnalysis {
  roadDistance: number       // 도로까지 거리 (m)
  estimatedDb: number        // 추정 소음 (dB)
  noiseGrade: string         // 소음 등급
  indoorEstimate: number     // 실내 추정 소음 (dB)
  meetsStandard: boolean     // 소음 기준 충족 여부
  recommendations: string[]
}

export function analyzeNoise(params: {
  roadDistance?: number; roadType?: 'highway' | 'main' | 'local'
  floors: number; windowType?: string
}): NoiseAnalysis {
  const { roadDistance = 20, roadType = 'main', floors, windowType = 'double' } = params

  // 도로 유형별 소음원 (dB)
  const sourceDb: Record<string, number> = { highway: 80, main: 70, local: 60 }
  const source = sourceDb[roadType] || 70

  // 거리 감쇄 (자유 공간: -6dB per 배거리)
  const distAttenuation = 20 * Math.log10(Math.max(roadDistance, 1) / 1)

  // 층수 보정 (고층은 반사음 감소)
  const floorAttenuation = Math.min(floors * 0.5, 5)

  const outdoorDb = Math.round(source - distAttenuation - floorAttenuation)

  // 창호 차음 성능
  const windowAttenuation: Record<string, number> = { single: 15, double: 25, triple: 35 }
  const winAtten = windowAttenuation[windowType] || 25

  const indoorDb = Math.max(outdoorDb - winAtten, 20)
  const meetsStandard = indoorDb <= 45 // 주거 기준 45dB

  const recs: string[] = []
  if (!meetsStandard) {
    if (windowType !== 'triple') recs.push('3중 유리 창호 적용 권장 (차음 35dB)')
    recs.push('도로변 세대 방음벽 또는 방음 루버 설치 검토')
    if (roadDistance < 15) recs.push('건물 후퇴(setback) 확대 검토')
  }

  return {
    roadDistance, estimatedDb: outdoorDb,
    noiseGrade: outdoorDb <= 50 ? '양호' : outdoorDb <= 60 ? '보통' : outdoorDb <= 70 ? '주의' : '불량',
    indoorEstimate: indoorDb, meetsStandard, recommendations: recs,
  }
}

// ━━━ 조망권 분석 ━━━

export interface ViewAnalysis {
  facades: {
    direction: string
    openRatio: number        // 개방률 (%) — 높을수록 조망 좋음
    viewType: string         // 산/강/공원/도시/차폐
    viewScore: number        // 조망 점수 (0~100)
    grade: string            // A~D
  }[]
  bestDirection: string
  overallGrade: string
  premiumFactor: number      // 조망 프리미엄 (분양가 할증 %)
}

export function analyzeView(params: {
  floors: number; buildingHeight: number; type: string; surroundingHeight?: number
}): ViewAnalysis {
  const { floors, buildingHeight, surroundingHeight = 15 } = params

  // 각 방향별 조망 분석
  const directions = [
    { dir: '남향', baseOpen: 70, viewType: '도시 스카이라인', bonus: 10 },
    { dir: '동향', baseOpen: 60, viewType: '일출/산', bonus: 15 },
    { dir: '서향', baseOpen: 55, viewType: '석양/도시', bonus: 5 },
    { dir: '북향', baseOpen: 50, viewType: '산/공원', bonus: 20 },
  ]

  const facades = directions.map(d => {
    // 높이가 주변보다 높을수록 개방률 증가
    const heightAdvantage = Math.max(0, (buildingHeight - surroundingHeight) / surroundingHeight * 30)
    const openRatio = Math.min(d.baseOpen + heightAdvantage, 95)
    const viewScore = Math.round(openRatio * 0.7 + d.bonus * 0.3)
    const grade = viewScore >= 80 ? 'A' : viewScore >= 60 ? 'B' : viewScore >= 40 ? 'C' : 'D'

    return {
      direction: d.dir,
      openRatio: Math.round(openRatio),
      viewType: buildingHeight > surroundingHeight * 1.5 ? d.viewType : '부분 차폐',
      viewScore, grade,
    }
  })

  facades.sort((a, b) => b.viewScore - a.viewScore)
  const best = facades[0]
  const avgScore = Math.round(facades.reduce((s, f) => s + f.viewScore, 0) / facades.length)
  const overallGrade = avgScore >= 75 ? 'A' : avgScore >= 55 ? 'B' : avgScore >= 35 ? 'C' : 'D'

  // 조망 프리미엄 (A등급 → +5%, D등급 → 0%)
  const premiumFactor = overallGrade === 'A' ? 5 : overallGrade === 'B' ? 3 : overallGrade === 'C' ? 1 : 0

  return { facades, bestDirection: best.direction, overallGrade, premiumFactor }
}

// ━━━ 에너지 성능 예측 ━━━

export interface EnergyAnalysis {
  annualHeating: number     // 연간 난방 부하 (kWh/㎡·년)
  annualCooling: number     // 연간 냉방 부하 (kWh/㎡·년)
  totalEnergy: number       // 총 에너지 소비 (kWh/㎡·년)
  energyGrade: string       // 에너지 효율 등급 (1++~5)
  co2Emission: number       // CO2 배출량 (kgCO2/㎡·년)
  zeroEnergyPossible: boolean
  recommendations: string[]
}

export function analyzeEnergy(params: {
  floors: number; type: string; gfa: number
  wallUValue?: number; windowUValue?: number; region?: string
}): EnergyAnalysis {
  const { floors, gfa, wallUValue = 0.17, windowUValue = 1.5, region = '중부' } = params

  // 기본 에너지 소비량 추정 (kWh/㎡·년)
  const baseHeating = region === '중부' ? 90 : 70 // 중부/남부
  const baseCooling = 30

  // 단열 성능에 따른 보정
  const wallFactor = wallUValue / 0.24 // 기준 대비 비율
  const windowFactor = windowUValue / 2.1

  const heating = Math.round(baseHeating * wallFactor * 0.6 + baseHeating * windowFactor * 0.4)
  const cooling = Math.round(baseCooling * windowFactor * 0.7 + baseCooling * 0.3)
  const total = heating + cooling + 40 // 조명+환기+급탕 40kWh

  // 에너지 효율 등급 (건축물 에너지효율등급 인증 기준)
  const grade = total <= 60 ? '1++' : total <= 90 ? '1+' : total <= 120 ? '1' : total <= 150 ? '2' : total <= 190 ? '3' : total <= 230 ? '4' : '5'

  const co2 = Math.round(total * 0.46) // 전력 배출계수 0.46 kgCO2/kWh
  const zeroEnergyPossible = total <= 120 && floors <= 5

  const recs: string[] = []
  if (wallUValue > 0.15) recs.push(`외벽 단열 강화 (현재 U=${wallUValue} → 0.15 권장)`)
  if (windowUValue > 1.0) recs.push(`고성능 창호 적용 (현재 U=${windowUValue} → 1.0 이하 권장)`)
  if (total > 120) recs.push('열회수형 환기장치(HRV) 설치 권장')
  if (zeroEnergyPossible) recs.push('제로에너지건축물 5등급 인증 가능 (태양광 패널 추가 시)')

  return {
    annualHeating: heating, annualCooling: cooling, totalEnergy: total,
    energyGrade: grade, co2Emission: co2, zeroEnergyPossible, recommendations: recs,
  }
}
