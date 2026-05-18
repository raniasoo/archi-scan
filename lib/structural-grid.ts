/**
 * 구조 모듈 그리드 기반 자동 평면 설계 엔진
 * 
 * 한국 공동주택 표준 모듈: 2.4m / 2.7m / 3.0m / 3.3m / 3.6m
 * 크리스토퍼 알렉산더 패턴 적용:
 *   #127 Intimacy Gradient (공적→사적 전이)
 *   #129 Common Areas at the Heart (중심에 공용 공간)
 *   #139 Farmhouse Kitchen (주방↔식당↔거실 연결)
 *   #159 Light on Two Sides (코너방 양면 채광)
 *   #191 The Shape of Indoor Space (1:1.2~1:1.6 비례)
 * 
 * 15개 속성 적용:
 *   Strong Centers → 거실 = 세대 중심
 *   Boundaries → 현관 = 공/사 경계
 *   Gradients → 현관→거실→복도→침실 점진적 전이
 *   Positive Space → 모든 공간 활용 가능
 *   Good Shape → 방 비례 최적화
 */

// ━━━ 표준 모듈 ━━━
export const STANDARD_BAYS = [2.4, 2.7, 3.0, 3.3, 3.6] as const
export const WALL_RC = 0.2       // RC벽 200mm
export const WALL_PARTITION = 0.1 // 경량벽 100mm
export const COLUMN_SIZE = 0.4    // 기둥 400mm
export const BALCONY_DEPTH = 1.5  // 발코니 1.5m
export const CORRIDOR_W = 1.2     // 복도 1.2m

// ━━━ 방 타입 ━━━
export type RoomType = 
  | 'living' | 'kitchen' | 'dining' | 'master' | 'bedroom2' | 'bedroom3'
  | 'bathroom_main' | 'bathroom_sub' | 'entrance' | 'corridor' | 'dressroom'
  | 'balcony' | 'utility' | 'storage' | 'core'

export interface Room {
  type: RoomType
  label: string
  gridX: number      // 그리드 시작 X (bay 인덱스)
  gridY: number      // 그리드 시작 Y (bay 인덱스)
  spanX: number      // X방향 bay 수
  spanY: number      // Y방향 bay 수
  area: number       // 면적 (㎡)
  isWet: boolean     // 습식 공간 여부
  wallType: 'rc' | 'partition' | 'none'  // 벽 타입
  hasDoor: boolean
  doorSide: 'top' | 'bottom' | 'left' | 'right'
  hasWindow: boolean
  windowSides: ('top' | 'bottom' | 'left' | 'right')[]
}

export interface StructuralGrid {
  baysX: number       // X방향 bay 수
  baysY: number       // Y방향 bay 수
  bayWidthM: number   // bay 폭 (m)
  bayDepthM: number   // bay 깊이 (m)
  totalWidthM: number
  totalDepthM: number
  rooms: Room[]
  columns: { x: number; y: number }[]  // 기둥 위치 (그리드 교차점)
  score: number       // Alexander 패턴 적합도 (0-100)
  patterns: string[]  // 적용된 패턴 목록
}

// ━━━ 최적 bay 크기 결정 ━━━
function findOptimalBay(widthM: number, depthM: number): { bayW: number; bayD: number; baysX: number; baysY: number } {
  // 한국 공동주택: 가로 3~5 bay, 세로 2~3 bay
  // 건물이 좁고 길면 → 가로/세로를 전환하여 합리적 비율 확보
  let w = widthM, d = depthM
  let swapped = false
  
  // 세로가 가로의 2배 이상이면 전환 (세로로 긴 블록 → 가로로 눕힘)
  if (d > w * 1.8) {
    [w, d] = [d, w]
    swapped = true
  }
  
  let best = { bayW: 3.0, bayD: 3.3, baysX: 3, baysY: 2, waste: Infinity }
  
  for (const bw of STANDARD_BAYS) {
    for (const bd of STANDARD_BAYS) {
      const nx = Math.floor((w - WALL_RC) / bw)
      const ny = Math.floor((d - WALL_RC) / bd)
      
      // 핵심 제약: 가로 3~5 bay, 세로 2~3 bay
      if (nx < 3 || nx > 6) continue
      if (ny < 2 || ny > 4) continue
      
      const usedW = nx * bw + WALL_RC
      const usedD = ny * bd + WALL_RC
      const waste = Math.abs(w - usedW) + Math.abs(d - usedD)
      
      // 3×2 또는 4×2 선호 (가장 일반적인 한국 아파트)
      const idealPenalty = Math.abs(nx - 4) * 0.5 + Math.abs(ny - 2) * 1.0
      const totalWaste = waste + idealPenalty
      
      if (totalWaste < best.waste) {
        best = { bayW: bw, bayD: bd, baysX: nx, baysY: ny, waste: totalWaste }
      }
    }
  }
  
  // 전환했으면 다시 원래대로
  if (swapped) {
    [best.bayW, best.bayD] = [best.bayD, best.bayW];
    [best.baysX, best.baysY] = [best.baysY, best.baysX]
  }
  
  // 최소 보장
  if (best.baysX < 3) best.baysX = 3
  if (best.baysY < 2) best.baysY = 2
  if (best.baysX > 5) best.baysX = 5
  if (best.baysY > 3) best.baysY = 3
  
  return best
}

// ━━━ Alexander 패턴 기반 방 배치 ━━━
function placeRooms(baysX: number, baysY: number, bayW: number, bayD: number, unitAreaM2: number): { rooms: Room[]; patterns: string[] } {
  const rooms: Room[] = []
  const patterns: string[] = []
  
  const cellArea = bayW * bayD
  
  // 세대 면적에 따른 방 구성
  const isLarge = unitAreaM2 > 85   // 4룸
  const isMedium = unitAreaM2 > 59  // 3룸
  
  // ━━━ 고정 레이아웃 (bay 수에 따라 최적 배치) ━━━
  // 한국 아파트 표준: 상단=공적(현관/주방), 하단=사적(침실)
  
  if (baysX >= 4 && baysY >= 2) {
    // ━━━ 4×2 이상: 표준 한국 아파트 ━━━
    patterns.push('#127 공적→사적 전이', '#129 거실=세대 중심', '#139 주방↔식당↔거실')
    
    // Row 0 (상단 = 공적): 현관 | 주방/식당 | 거실(2bay) 
    rooms.push({ type: 'entrance', label: '현관', gridX: 0, gridY: 0, spanX: 1, spanY: 1, area: cellArea, isWet: false, wallType: 'partition', hasDoor: true, doorSide: 'top', hasWindow: false, windowSides: [] })
    rooms.push({ type: 'kitchen', label: '주방/식당', gridX: 1, gridY: 0, spanX: 1, spanY: 1, area: cellArea, isWet: true, wallType: 'partition', hasDoor: false, doorSide: 'left', hasWindow: true, windowSides: ['top'] })
    rooms.push({ type: 'living', label: '거실', gridX: 2, gridY: 0, spanX: Math.min(2, baysX - 2), spanY: 1, area: cellArea * Math.min(2, baysX - 2), isWet: false, wallType: 'none', hasDoor: false, doorSide: 'bottom', hasWindow: true, windowSides: ['top', 'right'] })
    if (baysX >= 5) rooms.push({ type: 'core', label: 'EV/계단', gridX: baysX - 1, gridY: 0, spanX: 1, spanY: 1, area: cellArea, isWet: false, wallType: 'rc', hasDoor: false, doorSide: 'left', hasWindow: false, windowSides: [] })
    
    // Row 1 (하단 = 사적): 안방(2bay) | 주욕실 | 침실2 | 보조욕실
    patterns.push('#159 코너방 양면 채광', '#191 방 비례')
    rooms.push({ type: 'master', label: '안방', gridX: 0, gridY: 1, spanX: 2, spanY: 1, area: cellArea * 2, isWet: false, wallType: 'rc', hasDoor: true, doorSide: 'top', hasWindow: true, windowSides: ['left', 'bottom'] })
    rooms.push({ type: 'bathroom_main', label: '주욕실', gridX: 2, gridY: 1, spanX: 1, spanY: 1, area: cellArea, isWet: true, wallType: 'partition', hasDoor: true, doorSide: 'top', hasWindow: false, windowSides: [] })
    if (baysX >= 4) rooms.push({ type: 'bedroom2', label: '침실2', gridX: 3, gridY: 1, spanX: 1, spanY: 1, area: cellArea, isWet: false, wallType: 'partition', hasDoor: true, doorSide: 'top', hasWindow: true, windowSides: ['bottom', 'right'] })
    if (baysX >= 5) rooms.push({ type: 'bathroom_sub', label: '보조욕실', gridX: 4, gridY: 1, spanX: 1, spanY: 1, area: cellArea, isWet: true, wallType: 'partition', hasDoor: true, doorSide: 'top', hasWindow: false, windowSides: [] })
    
    // Row 2 (있으면): 드레스룸 | 서재 | 침실3 | 다용도
    if (baysY >= 3) {
      patterns.push('#130 현관 전이공간')
      rooms.push({ type: 'dressroom', label: '드레스룸', gridX: 0, gridY: 2, spanX: 1, spanY: 1, area: cellArea, isWet: false, wallType: 'partition', hasDoor: true, doorSide: 'top', hasWindow: false, windowSides: [] })
      rooms.push({ type: 'storage', label: '서재', gridX: 1, gridY: 2, spanX: 1, spanY: 1, area: cellArea, isWet: false, wallType: 'partition', hasDoor: true, doorSide: 'top', hasWindow: false, windowSides: [] })
      rooms.push({ type: 'bedroom3', label: '침실3', gridX: 2, gridY: 2, spanX: Math.min(2, baysX - 2), spanY: 1, area: cellArea * Math.min(2, baysX - 2), isWet: false, wallType: 'partition', hasDoor: true, doorSide: 'top', hasWindow: true, windowSides: ['bottom'] })
      if (baysX >= 5) rooms.push({ type: 'utility', label: '다용도', gridX: baysX - 1, gridY: 2, spanX: 1, spanY: 1, area: cellArea, isWet: true, wallType: 'partition', hasDoor: true, doorSide: 'top', hasWindow: false, windowSides: [] })
    }
    
  } else if (baysX === 3 && baysY >= 2) {
    // ━━━ 3×2: 소형 아파트/빌라 ━━━
    patterns.push('#127 공적→사적 전이', '#129 거실=세대 중심', '#139 주방↔거실')
    
    // Row 0: 현관/코어 | 주방 | 거실
    rooms.push({ type: 'entrance', label: '현관', gridX: 0, gridY: 0, spanX: 1, spanY: 1, area: cellArea, isWet: false, wallType: 'partition', hasDoor: true, doorSide: 'top', hasWindow: false, windowSides: [] })
    rooms.push({ type: 'kitchen', label: '주방/식당', gridX: 1, gridY: 0, spanX: 1, spanY: 1, area: cellArea, isWet: true, wallType: 'partition', hasDoor: false, doorSide: 'right', hasWindow: true, windowSides: ['top'] })
    rooms.push({ type: 'living', label: '거실', gridX: 2, gridY: 0, spanX: 1, spanY: 1, area: cellArea, isWet: false, wallType: 'none', hasDoor: false, doorSide: 'left', hasWindow: true, windowSides: ['top', 'right'] })
    
    // Row 1: 욕실 | 안방 | 침실2
    patterns.push('#159 코너방 양면 채광')
    rooms.push({ type: 'bathroom_main', label: '욕실', gridX: 0, gridY: 1, spanX: 1, spanY: 1, area: cellArea, isWet: true, wallType: 'partition', hasDoor: true, doorSide: 'top', hasWindow: false, windowSides: [] })
    rooms.push({ type: 'master', label: '안방', gridX: 1, gridY: 1, spanX: 1, spanY: 1, area: cellArea, isWet: false, wallType: 'rc', hasDoor: true, doorSide: 'top', hasWindow: true, windowSides: ['bottom'] })
    rooms.push({ type: 'bedroom2', label: '침실2', gridX: 2, gridY: 1, spanX: 1, spanY: 1, area: cellArea, isWet: false, wallType: 'partition', hasDoor: true, doorSide: 'top', hasWindow: true, windowSides: ['bottom', 'right'] })
    
    // Row 2 (있으면)
    if (baysY >= 3) {
      rooms.push({ type: 'dressroom', label: '드레스룸', gridX: 0, gridY: 2, spanX: 1, spanY: 1, area: cellArea, isWet: false, wallType: 'partition', hasDoor: true, doorSide: 'top', hasWindow: false, windowSides: [] })
      rooms.push({ type: 'bedroom3', label: '침실3', gridX: 1, gridY: 2, spanX: 2, spanY: 1, area: cellArea * 2, isWet: false, wallType: 'partition', hasDoor: true, doorSide: 'top', hasWindow: true, windowSides: ['bottom'] })
    }
    
  } else {
    // ━━━ 기타: 단순 배치 ━━━
    patterns.push('#127 공적→사적 전이')
    for (let y = 0; y < baysY; y++) {
      for (let x = 0; x < baysX; x++) {
        const idx = y * baysX + x
        const types: { t: RoomType; l: string }[] = [
          { t: 'entrance', l: '현관' }, { t: 'living', l: '거실' }, { t: 'kitchen', l: '주방' },
          { t: 'master', l: '안방' }, { t: 'bedroom2', l: '침실' }, { t: 'bathroom_main', l: '욕실' },
        ]
        const { t, l } = types[idx % types.length]
        rooms.push({ type: t, label: l, gridX: x, gridY: y, spanX: 1, spanY: 1, area: cellArea,
          isWet: t.includes('bath'), wallType: 'partition', hasDoor: true, doorSide: 'top',
          hasWindow: y === baysY - 1 || x === 0, windowSides: y === baysY - 1 ? ['bottom'] : x === 0 ? ['left'] : [] })
      }
    }
  }
  
  patterns.push('#191 방 비례 1:1.2~1:1.6')
  return { rooms, patterns }
}

// ━━━ 기둥 배치 ━━━
function placeColumns(baysX: number, baysY: number): { x: number; y: number }[] {
  const columns: { x: number; y: number }[] = []
  // 모든 그리드 교차점에 기둥 (외곽 + 내부)
  for (let y = 0; y <= baysY; y++) {
    for (let x = 0; x <= baysX; x++) {
      columns.push({ x, y })
    }
  }
  return columns
}

// ━━━ Alexander 패턴 적합도 점수 ━━━
function calculateScore(rooms: Room[], baysX: number, baysY: number): number {
  let score = 60 // 기본 점수
  
  // Strong Center: 거실이 중앙에 있는가?
  const living = rooms.find(r => r.type === 'living')
  if (living && living.gridY > 0 && living.gridY < baysY - 1) score += 10
  
  // Intimacy Gradient: 현관→거실→침실 순서인가?
  const entrance = rooms.find(r => r.type === 'entrance')
  const master = rooms.find(r => r.type === 'master')
  if (entrance && master && entrance.gridY < master.gridY) score += 10
  
  // Light on Two Sides: 안방이 코너에 있는가?
  if (master && (master.gridX === 0 || master.gridX === baysX - 1)) score += 10
  
  // Kitchen connected to living
  const kitchen = rooms.find(r => r.type === 'kitchen')
  if (kitchen && living && Math.abs(kitchen.gridY - living.gridY) <= 1) score += 10
  
  return Math.min(100, score)
}

// ━━━ 메인 함수: 구조 그리드 생성 ━━━
export function generateStructuralGrid(params: {
  widthM: number
  depthM: number
  unitAreaM2: number
  floors: number
  unitType?: string  // 'studio' | 'oneroom' | 'tworoom' | 'threeroom' | 'fourroom'
}): StructuralGrid {
  const { widthM, depthM, unitAreaM2 } = params
  
  // 1. 최적 bay 크기 결정
  const { bayW, bayD, baysX, baysY } = findOptimalBay(widthM, depthM)
  
  // 2. 방 배치 (Alexander 패턴 적용)
  const { rooms, patterns } = placeRooms(baysX, baysY, bayW, bayD, unitAreaM2)
  
  // 3. 기둥 배치
  const columns = placeColumns(baysX, baysY)
  
  // 4. 패턴 적합도 점수
  const score = calculateScore(rooms, baysX, baysY)
  
  return {
    baysX, baysY, bayWidthM: bayW, bayDepthM: bayD,
    totalWidthM: baysX * bayW + WALL_RC,
    totalDepthM: baysY * bayD + WALL_RC,
    rooms, columns, score, patterns,
  }
}
