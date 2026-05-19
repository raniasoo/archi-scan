/**
 * 지형(표고) 데이터 조회 엔진
 * Open-Meteo Elevation API로 실제 고도 데이터 수집
 * 대상지 주변 격자 고도 → 3D 지형 메시 생성용
 */

export interface TerrainData {
  centerElevation: number        // 대상지 중심 표고 (m)
  gridSize: number               // 격자 크기 (예: 5×5)
  elevations: number[][]         // [row][col] 고도 배열 (m)
  minElevation: number
  maxElevation: number
  slope: number                  // 평균 경사도 (%)
  slopeDirection: string         // 경사 방향 (N/S/E/W)
  areaWidth: number              // 조회 영역 폭 (m)
  areaHeight: number             // 조회 영역 높이 (m)
}

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/elevation'

// 단일 지점 고도 조회
async function fetchElevation(lat: number, lng: number): Promise<number> {
  try {
    const res = await fetch(`${OPEN_METEO_URL}?latitude=${lat}&longitude=${lng}`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return 0
    const data = await res.json()
    return data.elevation?.[0] ?? 0
  } catch {
    return 0
  }
}

// 복수 지점 고도 일괄 조회 (Open-Meteo는 쉼표로 여러 좌표 지원)
async function fetchElevations(coords: { lat: number; lng: number }[]): Promise<number[]> {
  if (coords.length === 0) return []
  try {
    const lats = coords.map(c => c.lat.toFixed(6)).join(',')
    const lngs = coords.map(c => c.lng.toFixed(6)).join(',')
    const res = await fetch(`${OPEN_METEO_URL}?latitude=${lats}&longitude=${lngs}`, {
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return coords.map(() => 0)
    const data = await res.json()
    return data.elevation ?? coords.map(() => 0)
  } catch {
    return coords.map(() => 0)
  }
}

// ━━━ 메인: 대상지 주변 격자 지형 조회 ━━━
export async function fetchTerrainGrid(params: {
  lat: number; lng: number
  gridSize?: number     // 격자 수 (기본 5 → 5×5=25점)
  areaSize?: number     // 조회 영역 크기 (m, 기본 100)
}): Promise<TerrainData> {
  const { lat, lng, gridSize = 5, areaSize = 100 } = params

  // 격자 좌표 생성
  const LAT_M = 111319
  const LNG_M = Math.cos(lat * Math.PI / 180) * 111319
  const halfSize = areaSize / 2
  const step = areaSize / (gridSize - 1)

  const coords: { lat: number; lng: number; row: number; col: number }[] = []
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const offsetX = -halfSize + col * step  // 미터
      const offsetY = -halfSize + row * step
      coords.push({
        lat: lat + offsetY / LAT_M,
        lng: lng + offsetX / LNG_M,
        row, col,
      })
    }
  }

  // 일괄 조회 (최대 25점)
  const elevations = await fetchElevations(coords.map(c => ({ lat: c.lat, lng: c.lng })))

  // 2D 배열로 변환
  const grid: number[][] = Array.from({ length: gridSize }, () => Array(gridSize).fill(0))
  coords.forEach((c, i) => {
    grid[c.row][c.col] = elevations[i] ?? 0
  })

  const flat = grid.flat()
  const minE = Math.min(...flat)
  const maxE = Math.max(...flat)
  const center = grid[Math.floor(gridSize / 2)][Math.floor(gridSize / 2)]

  // 경사도 계산 (남북 방향 고도차 / 거리)
  const northEdge = grid[0].reduce((s, v) => s + v, 0) / gridSize
  const southEdge = grid[gridSize - 1].reduce((s, v) => s + v, 0) / gridSize
  const westEdge = grid.map(row => row[0]).reduce((s, v) => s + v, 0) / gridSize
  const eastEdge = grid.map(row => row[gridSize - 1]).reduce((s, v) => s + v, 0) / gridSize

  const nsSlope = (southEdge - northEdge) / areaSize * 100  // %
  const ewSlope = (eastEdge - westEdge) / areaSize * 100

  const slope = Math.sqrt(nsSlope * nsSlope + ewSlope * ewSlope)
  const slopeDir = Math.abs(nsSlope) > Math.abs(ewSlope)
    ? (nsSlope > 0 ? 'S→N (남고북저)' : 'N→S (북고남저)')
    : (ewSlope > 0 ? 'E→W (동고서저)' : 'W→E (서고동저)')

  return {
    centerElevation: center,
    gridSize,
    elevations: grid,
    minElevation: minE,
    maxElevation: maxE,
    slope: Math.round(slope * 10) / 10,
    slopeDirection: slopeDir,
    areaWidth: areaSize,
    areaHeight: areaSize,
  }
}

// 서버사이드 API용 간이 버전 (page.tsx에서 호출)
export async function fetchSiteElevation(lat: number, lng: number): Promise<{
  elevation: number; slope: number; slopeDirection: string
}> {
  const terrain = await fetchTerrainGrid({ lat, lng, gridSize: 3, areaSize: 50 })
  return {
    elevation: terrain.centerElevation,
    slope: terrain.slope,
    slopeDirection: terrain.slopeDirection,
  }
}
