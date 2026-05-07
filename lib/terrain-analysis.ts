// ============================================================
// 지형 분석 유틸리티 — 표고 데이터 → 경사도/토공량/비용
// ============================================================

export interface TerrainAnalysis {
  minElevation: number      // 최저 표고 (m)
  maxElevation: number      // 최고 표고 (m)
  elevationDiff: number     // 고저차 (m)
  avgSlope: number          // 평균 경사도 (%)
  maxSlope: number          // 최대 경사도 (%)
  slopeDirection: string    // 경사 방향 (남향/북향/동향/서향)
  slopeGrade: 'flat' | 'gentle' | 'moderate' | 'steep' | 'very-steep'
  earthworkVolume: number   // 예상 토공량 (㎥)
  earthworkCost: number     // 토공비 (원)
  foundationType: string    // 추천 기초 타입
  description: string       // 지형 설명 (한글)
  renderHint: string        // AI 렌더링용 영문 힌트
}

export function analyzeTerrrain(
  elevations: number[],
  gridSize: number,
  siteArea: number,
  rangeMeters: number = 66 // 조회 반경 (m)
): TerrainAnalysis {
  if (!elevations?.length || elevations.length < 4) {
    return getFlat(siteArea)
  }

  const minE = Math.min(...elevations)
  const maxE = Math.max(...elevations)
  const diff = maxE - minE
  const cellSize = (rangeMeters * 2) / (gridSize - 1) // 셀 크기 (m)

  // 경사도 계산 (각 셀의 기울기)
  const slopes: number[] = []
  let slopeNS = 0, slopeEW = 0 // 남북, 동서 경사 합산

  for (let y = 0; y < gridSize - 1; y++) {
    for (let x = 0; x < gridSize - 1; x++) {
      const idx = y * gridSize + x
      const dxE = (elevations[idx + 1] - elevations[idx]) / cellSize // 동서 기울기
      const dyS = (elevations[idx + gridSize] - elevations[idx]) / cellSize // 남북 기울기
      const slope = Math.sqrt(dxE * dxE + dyS * dyS) * 100 // %
      slopes.push(slope)
      slopeEW += dxE
      slopeNS += dyS
    }
  }

  const avgSlope = Math.round(slopes.reduce((s, v) => s + v, 0) / slopes.length * 10) / 10
  const maxSlope = Math.round(Math.max(...slopes) * 10) / 10

  // 경사 방향 (전체적인 기울기 방향)
  const totalNS = slopeNS / slopes.length
  const totalEW = slopeEW / slopes.length
  let slopeDirection = '평지'
  if (Math.abs(totalNS) > 0.02 || Math.abs(totalEW) > 0.02) {
    if (Math.abs(totalNS) > Math.abs(totalEW)) {
      slopeDirection = totalNS > 0 ? '남향 경사 (북고남저)' : '북향 경사 (남고북저)'
    } else {
      slopeDirection = totalEW > 0 ? '동향 경사 (서고동저)' : '서향 경사 (동고서저)'
    }
  }

  // 경사 등급
  const slopeGrade: TerrainAnalysis['slopeGrade'] =
    avgSlope < 2 ? 'flat' :
    avgSlope < 5 ? 'gentle' :
    avgSlope < 10 ? 'moderate' :
    avgSlope < 15 ? 'steep' : 'very-steep'

  // 토공량 추정 (단순화: 평균 표고와 각 지점 차이의 합)
  const avgE = elevations.reduce((s, v) => s + v, 0) / elevations.length
  const cellArea = siteArea / elevations.length
  let cutVolume = 0, fillVolume = 0
  for (const e of elevations) {
    const d = e - avgE
    if (d > 0) cutVolume += d * cellArea // 절토
    else fillVolume += Math.abs(d) * cellArea // 성토
  }
  const earthworkVolume = Math.round(cutVolume + fillVolume)

  // 토공 비용 (절토 25,000원/㎥, 성토 30,000원/㎥, 운반 포함)
  const earthworkCost = Math.round(cutVolume * 25000 + fillVolume * 30000)

  // 기초 타입 추천
  const foundationType = 
    slopeGrade === 'flat' ? '일반 매트 기초' :
    slopeGrade === 'gentle' ? '일반 매트 기초 (레벨 조정)' :
    slopeGrade === 'moderate' ? '계단식 기초 또는 파일 기초' :
    slopeGrade === 'steep' ? '파일 기초 + 옹벽' :
    '심층 파일 기초 + 대규모 옹벽'

  // 한글 설명
  const gradeNames = { flat: '평탄', gentle: '완만', moderate: '보통', steep: '급경사', 'very-steep': '매우 급경사' }
  const description = diff < 0.5
    ? `대지는 거의 평탄하며(고저차 ${diff.toFixed(1)}m), 별도 토공이 거의 불필요합니다.`
    : diff < 2
    ? `${gradeNames[slopeGrade]}한 경사지(고저차 ${diff.toFixed(1)}m, 평균 경사 ${avgSlope}%)로, ${slopeDirection}입니다. 소규모 레벨 조정이 필요합니다.`
    : `${gradeNames[slopeGrade]} 경사지(고저차 ${diff.toFixed(1)}m, 평균 경사 ${avgSlope}%)로, ${slopeDirection}입니다. 토공량 약 ${earthworkVolume}㎥, 예상 토공비 ${Math.round(earthworkCost / 10000).toLocaleString()}만원입니다.`

  // AI 렌더링 힌트
  const renderHint = diff < 0.5
    ? 'Flat terrain, level ground'
    : diff < 2
    ? `Gently sloping site (${diff.toFixed(1)}m elevation change), ${slopeDirection.includes('남향') ? 'sloping south' : slopeDirection.includes('북향') ? 'sloping north' : 'slightly sloped'}`
    : `Steep hillside site (${diff.toFixed(1)}m elevation change, ${avgSlope}% grade), building may need stepped foundation, retaining walls visible, ${slopeDirection.includes('남향') ? 'south-facing slope with views' : 'hillside terrain'}`

  return {
    minElevation: Math.round(minE * 10) / 10,
    maxElevation: Math.round(maxE * 10) / 10,
    elevationDiff: Math.round(diff * 10) / 10,
    avgSlope,
    maxSlope,
    slopeDirection,
    slopeGrade,
    earthworkVolume,
    earthworkCost,
    foundationType,
    description,
    renderHint,
  }
}

function getFlat(siteArea: number): TerrainAnalysis {
  return {
    minElevation: 0, maxElevation: 0, elevationDiff: 0,
    avgSlope: 0, maxSlope: 0, slopeDirection: '평지',
    slopeGrade: 'flat', earthworkVolume: 0, earthworkCost: 0,
    foundationType: '일반 매트 기초',
    description: '표고 데이터 없음. 평탄 지형으로 가정합니다.',
    renderHint: 'Flat terrain',
  }
}
