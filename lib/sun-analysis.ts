// ============================================================
// 일조·조망 분석 유틸리티
// 주변 건물 높이 + 태양 각도 → 그림자/일조/조망 평가
// ============================================================

export interface SunAnalysisResult {
  winterSunAngle: number    // 동지 남중 태양 고도 (°)
  summerSunAngle: number    // 하지 남중 태양 고도 (°)
  shadowLength: number      // 동지 기준 그림자 길이 (건물높이 대비 배수)
  sunlightHours: number     // 동지 기준 예상 일조시간 (시간)
  southOpen: boolean        // 남측 개방 여부
  viewScore: number         // 조망 점수 (0~100)
  viewDirection: string     // 최적 조망 방향
  sunlightGrade: 'excellent' | 'good' | 'fair' | 'poor'
  description: string
  renderHint: string
  directions: {
    north: { blocked: boolean; maxHeight: number; viewQuality: number }
    south: { blocked: boolean; maxHeight: number; viewQuality: number }
    east: { blocked: boolean; maxHeight: number; viewQuality: number }
    west: { blocked: boolean; maxHeight: number; viewQuality: number }
  }
}

export function analyzeSunAndView(
  buildingFloors: number,
  buildingHeight: number,
  nearbyBuildings: { name?: string; floors?: number; height?: number; direction?: string }[],
  latitude: number = 37.55 // 서울 기본
): SunAnalysisResult {
  // 태양 고도 계산 (남중 기준)
  const winterSunAngle = 90 - latitude - 23.44 // 동지: ~29°
  const summerSunAngle = 90 - latitude + 23.44 // 하지: ~76°
  const equinoxAngle = 90 - latitude            // 춘추분: ~52.5°

  // 동지 그림자 길이 (건물높이 대비)
  const shadowMultiplier = 1 / Math.tan(winterSunAngle * Math.PI / 180)
  const shadowLength = Math.round(buildingHeight * shadowMultiplier * 10) / 10

  // 방향별 주변 건물 분석
  const dirAnalysis = { north: { maxH: 0, count: 0 }, south: { maxH: 0, count: 0 }, east: { maxH: 0, count: 0 }, west: { maxH: 0, count: 0 } }
  
  for (const b of nearbyBuildings) {
    const h = b.height || (b.floors || 0) * 3.3
    if (h <= 0) continue
    
    // 방향이 없으면 균등 분배
    const dir = b.direction || ['north', 'south', 'east', 'west'][Math.floor(Math.random() * 4)]
    const key = dir as keyof typeof dirAnalysis
    if (dirAnalysis[key]) {
      dirAnalysis[key].maxH = Math.max(dirAnalysis[key].maxH, h)
      dirAnalysis[key].count++
    }
  }

  // 남측 개방 여부 (남쪽에 높은 건물 없으면 일조 양호)
  const southBlocked = dirAnalysis.south.maxH > buildingHeight * 0.7
  const southOpen = !southBlocked

  // 일조시간 추정 (동지 기준)
  let sunlightHours = 4 // 기본 4시간 (동지 최악)
  if (southOpen) sunlightHours += 2
  if (dirAnalysis.east.maxH < buildingHeight) sunlightHours += 0.5
  if (dirAnalysis.west.maxH < buildingHeight) sunlightHours += 0.5
  if (buildingFloors >= 5) sunlightHours += 1 // 고층은 일조 유리
  sunlightHours = Math.min(sunlightHours, 8)

  // 조망 점수 (방향별)
  const viewScores = {
    north: Math.max(0, 100 - dirAnalysis.north.maxH * 3 - dirAnalysis.north.count * 5),
    south: Math.max(0, 100 - dirAnalysis.south.maxH * 3 - dirAnalysis.south.count * 5),
    east: Math.max(0, 100 - dirAnalysis.east.maxH * 3 - dirAnalysis.east.count * 5),
    west: Math.max(0, 100 - dirAnalysis.west.maxH * 3 - dirAnalysis.west.count * 5),
  }

  const bestDir = Object.entries(viewScores).sort((a, b) => b[1] - a[1])[0]
  const viewScore = Math.round(Object.values(viewScores).reduce((s, v) => s + v, 0) / 4)
  const dirNames: Record<string, string> = { north: '북측', south: '남측', east: '동측', west: '서측' }
  const viewDirection = dirNames[bestDir[0]] || '남측'

  // 일조 등급
  const sunlightGrade: SunAnalysisResult['sunlightGrade'] =
    sunlightHours >= 6 ? 'excellent' :
    sunlightHours >= 4.5 ? 'good' :
    sunlightHours >= 3 ? 'fair' : 'poor'

  const gradeKr = { excellent: '매우 양호', good: '양호', fair: '보통', poor: '불량' }

  const description = `동지 기준 남중 태양 고도 ${Math.round(winterSunAngle)}°, 예상 일조시간 ${sunlightHours.toFixed(1)}시간(${gradeKr[sunlightGrade]}). ` +
    `${buildingHeight}m 건물의 그림자는 약 ${shadowLength}m까지 도달합니다. ` +
    (southOpen ? '남측이 개방되어 일조 조건이 유리합니다.' : '남측에 높은 건물이 있어 저층부 일조가 제한될 수 있습니다.') +
    ` 최적 조망 방향은 ${viewDirection}입니다.`

  const renderHint = southOpen
    ? `Good southern exposure, building should face south for maximum sunlight. Best views toward ${viewDirection.replace('측', '')}`
    : `Southern exposure partially blocked, consider stepping back upper floors. Best views toward ${viewDirection.replace('측', '')}`

  return {
    winterSunAngle: Math.round(winterSunAngle * 10) / 10,
    summerSunAngle: Math.round(summerSunAngle * 10) / 10,
    shadowLength,
    sunlightHours: Math.round(sunlightHours * 10) / 10,
    southOpen,
    viewScore,
    viewDirection,
    sunlightGrade,
    description,
    renderHint,
    directions: {
      north: { blocked: dirAnalysis.north.maxH > buildingHeight * 0.5, maxHeight: dirAnalysis.north.maxH, viewQuality: viewScores.north },
      south: { blocked: southBlocked, maxHeight: dirAnalysis.south.maxH, viewQuality: viewScores.south },
      east: { blocked: dirAnalysis.east.maxH > buildingHeight * 0.5, maxHeight: dirAnalysis.east.maxH, viewQuality: viewScores.east },
      west: { blocked: dirAnalysis.west.maxH > buildingHeight * 0.5, maxHeight: dirAnalysis.west.maxH, viewQuality: viewScores.west },
    },
  }
}
