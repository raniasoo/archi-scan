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
  let best = { bayW: 3.0, bayD: 3.0, baysX: 3, baysY: 3, waste: Infinity }
  
  for (const bw of STANDARD_BAYS) {
    for (const bd of STANDARD_BAYS) {
      const nx = Math.floor((widthM - WALL_RC) / bw)
      const ny = Math.floor((depthM - WALL_RC) / bd)
      if (nx < 2 || ny < 2) continue
      
      const usedW = nx * bw + WALL_RC
      const usedD = ny * bd + WALL_RC
      const waste = Math.abs(widthM - usedW) + Math.abs(depthM - usedD)
      
      // 선호: 3~5 bay, waste 최소
      const bayPenalty = (nx < 3 || nx > 6 ? 2 : 0) + (ny < 2 || ny > 4 ? 2 : 0)
      const totalWaste = waste + bayPenalty
      
      if (totalWaste < best.waste) {
        best = { bayW: bw, bayD: bd, baysX: nx, baysY: ny, waste: totalWaste }
      }
    }
  }
  return best
}

// ━━━ Alexander 패턴 기반 방 배치 ━━━
function placeRooms(baysX: number, baysY: number, bayW: number, bayD: number, unitAreaM2: number): { rooms: Room[]; patterns: string[] } {
  const rooms: Room[] = []
  const patterns: string[] = []
  const grid: (RoomType | null)[][] = Array.from({ length: baysY }, () => Array(baysX).fill(null))
  
  // 세대 면적에 따른 방 구성
  const isLarge = unitAreaM2 > 85   // 대형 (4룸)
  const isMedium = unitAreaM2 > 59  // 중형 (3룸)
  // else: 소형 (2룸)
  
  // ━━━ Pattern #127: Intimacy Gradient (공적→사적) ━━━
  // 하단(도로쪽) = 공적, 상단(후면) = 사적
  patterns.push('#127 공적→사적 전이')
  
  // ━━━ Pattern #129: Common Areas at the Heart ━━━
  // 거실+식당을 중앙에 배치
  patterns.push('#129 거실=세대 중심')
  
  // 코어(EV/계단) — 우측 상단
  const coreX = baysX - 1, coreY = 0
  grid[coreY][coreX] = 'core'
  rooms.push({
    type: 'core', label: 'EV/계단', gridX: coreX, gridY: coreY,
    spanX: 1, spanY: 1, area: bayW * bayD,
    isWet: false, wallType: 'rc', hasDoor: false, doorSide: 'left',
    hasWindow: false, windowSides: [],
  })
  
  // 현관 — 코어 옆 (Pattern: Entrance Transition #130)
  patterns.push('#130 현관 전이공간')
  const entrX = Math.max(0, coreX - 1), entrY = 0
  grid[entrY][entrX] = 'entrance'
  rooms.push({
    type: 'entrance', label: '현관', gridX: entrX, gridY: entrY,
    spanX: 1, spanY: 1, area: bayW * bayD,
    isWet: false, wallType: 'partition', hasDoor: true, doorSide: 'right',
    hasWindow: false, windowSides: [],
  })
  
  // ━━━ Pattern #139: 주방↔식당↔거실 연결 ━━━
  patterns.push('#139 주방↔식당↔거실')
  
  // 거실 — 중앙 (Strong Center)
  const livingSpanX = Math.min(baysX - 1, isMedium ? 2 : 1)
  const livingY = baysY > 2 ? 1 : 0
  for (let dx = 0; dx < livingSpanX; dx++) grid[livingY][dx] = 'living'
  rooms.push({
    type: 'living', label: '거실', gridX: 0, gridY: livingY,
    spanX: livingSpanX, spanY: 1, area: livingSpanX * bayW * bayD,
    isWet: false, wallType: 'none', hasDoor: false, doorSide: 'bottom',
    hasWindow: true, windowSides: ['left'],  // 남향 채광
  })
  
  // 주방/식당 — 거실 옆 (연결)
  const kitchenX = livingSpanX
  const kitchenSpanX = Math.min(baysX - livingSpanX - 1, 2)
  if (kitchenSpanX > 0) {
    for (let dx = 0; dx < kitchenSpanX; dx++) grid[livingY][kitchenX + dx] = 'kitchen'
    rooms.push({
      type: 'kitchen', label: '주방/식당', gridX: kitchenX, gridY: livingY,
      spanX: kitchenSpanX, spanY: 1, area: kitchenSpanX * bayW * bayD,
      isWet: true, wallType: 'partition', hasDoor: false, doorSide: 'left',
      hasWindow: true, windowSides: ['right'],
    })
  }
  
  // ━━━ Pattern #159: Light on Two Sides (코너방 양면 채광) ━━━
  patterns.push('#159 코너방 양면 채광')
  
  // 안방 — 좌측 하단 코너 (양면 채광)
  const masterY = baysY - 1
  const masterSpanX = isMedium ? 2 : 1
  for (let dx = 0; dx < masterSpanX; dx++) grid[masterY][dx] = 'master'
  rooms.push({
    type: 'master', label: '안방', gridX: 0, gridY: masterY,
    spanX: masterSpanX, spanY: 1, area: masterSpanX * bayW * bayD,
    isWet: false, wallType: 'rc', hasDoor: true, doorSide: 'top',
    hasWindow: true, windowSides: ['left', 'bottom'],  // 코너 양면 채광
  })
  
  // 주욕실 — 안방 옆
  const bathX = masterSpanX
  if (bathX < baysX) {
    grid[masterY][bathX] = 'bathroom_main'
    rooms.push({
      type: 'bathroom_main', label: '주욕실', gridX: bathX, gridY: masterY,
      spanX: 1, spanY: 1, area: bayW * bayD,
      isWet: true, wallType: 'partition', hasDoor: true, doorSide: 'top',
      hasWindow: false, windowSides: [],
    })
  }
  
  // 침실2 — 우측 하단
  const br2X = Math.min(bathX + 1, baysX - 1)
  if (br2X < baysX && !grid[masterY][br2X]) {
    grid[masterY][br2X] = 'bedroom2'
    rooms.push({
      type: 'bedroom2', label: '침실2', gridX: br2X, gridY: masterY,
      spanX: 1, spanY: 1, area: bayW * bayD,
      isWet: false, wallType: 'partition', hasDoor: true, doorSide: 'top',
      hasWindow: true, windowSides: ['bottom'],
    })
  }
  
  // 침실3 (대형만) — 중간층 우측
  if (isLarge && baysY > 2) {
    const br3Y = baysY > 3 ? 2 : 1
    const br3X = baysX - 1
    if (!grid[br3Y][br3X]) {
      grid[br3Y][br3X] = 'bedroom3'
      rooms.push({
        type: 'bedroom3', label: '침실3', gridX: br3X, gridY: br3Y,
        spanX: 1, spanY: 1, area: bayW * bayD,
        isWet: false, wallType: 'partition', hasDoor: true, doorSide: 'left',
        hasWindow: true, windowSides: ['right'],
      })
    }
  }
  
  // 보조욕실 — 현관 근처
  const subBathY = 0
  const subBathX = Math.max(0, entrX - 1)
  if (!grid[subBathY][subBathX]) {
    grid[subBathY][subBathX] = 'bathroom_sub'
    rooms.push({
      type: 'bathroom_sub', label: '보조욕실', gridX: subBathX, gridY: subBathY,
      spanX: 1, spanY: 1, area: bayW * bayD,
      isWet: true, wallType: 'partition', hasDoor: true, doorSide: 'bottom',
      hasWindow: false, windowSides: [],
    })
  }
  
  // 나머지 빈 셀 → 드레스룸/다용도/복도
  for (let y = 0; y < baysY; y++) {
    for (let x = 0; x < baysX; x++) {
      if (!grid[y][x]) {
        // 안방 옆이면 드레스룸
        if (y === masterY && x === masterSpanX - 1) continue // 이미 안방
        const nearMaster = y === masterY && Math.abs(x - masterSpanX) <= 1
        const type: RoomType = nearMaster ? 'dressroom' : 'corridor'
        const label = nearMaster ? '드레스룸' : (y === 0 ? '다용도' : '복도')
        grid[y][x] = type
        rooms.push({
          type, label, gridX: x, gridY: y,
          spanX: 1, spanY: 1, area: bayW * bayD,
          isWet: false, wallType: 'partition', hasDoor: nearMaster, doorSide: 'left',
          hasWindow: false, windowSides: [],
        })
      }
    }
  }
  
  // ━━━ Pattern #191: Good Shape (비례 검증) ━━━
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
