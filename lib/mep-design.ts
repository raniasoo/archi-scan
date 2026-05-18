/**
 * Phase 6: MEP 상세 설계 자동화
 * 
 * 전기: 분전함 → 콘센트/스위치 배선 (KEC 기준)
 * 급배수: PS → 각 실 배관 경로 (KDS 31 30)
 * 환기: 덕트 크기 + 경로 (건축물 설비기준)
 * 소방: 감지기/스프링클러 자동 배치 (소방법)
 */

import type { StructuralGrid, Room } from './structural-grid'

// ━━━ 전기 설비 ━━━
export interface ElectricalItem {
  type: 'outlet' | 'switch' | 'light' | 'panel' | 'intercom' | 'tv' | 'data'
  label: string
  x: number  // 그리드 상대 좌표 (0~1)
  y: number
  room: string
  circuit: string  // 회로명 (L-1, L-2...)
}

// ━━━ 급배수 ━━━
export interface PlumbingItem {
  type: 'cold' | 'hot' | 'drain' | 'vent' | 'ps'
  label: string
  x: number; y: number
  endX?: number; endY?: number  // 배관 경로 끝점
  diameter: number  // mm
  room: string
}

// ━━━ 환기 설비 ━━━
export interface HVACItem {
  type: 'supply' | 'return' | 'exhaust' | 'duct' | 'diffuser'
  label: string
  x: number; y: number
  endX?: number; endY?: number
  size: string  // 덕트 사이즈 (예: "300×200")
  room: string
}

// ━━━ 소방 설비 ━━━
export interface FireItem {
  type: 'detector' | 'sprinkler' | 'extinguisher' | 'alarm' | 'exit_sign'
  label: string
  x: number; y: number
  room: string
  coverage: number  // 감지 면적 m²
}

export interface MEPDesign {
  electrical: ElectricalItem[]
  plumbing: PlumbingItem[]
  hvac: HVACItem[]
  fire: FireItem[]
  summary: {
    circuits: number
    outlets: number
    switches: number
    sprinklers: number
    detectors: number
    psCount: number
    ductLength: number  // m
  }
}

// ━━━ 전기 배치 규칙 (KEC 기준) ━━━
function placeElectrical(rooms: Room[], grid: StructuralGrid): ElectricalItem[] {
  const items: ElectricalItem[] = []
  const bX = grid.baysX, bY = grid.baysY
  let circuitNum = 1
  
  // 분전함 (현관 근처)
  const entrance = rooms.find(r => r.type === 'entrance')
  if (entrance) {
    items.push({ type: 'panel', label: 'MDB', x: (entrance.gridX + 0.2) / bX, y: (entrance.gridY + 0.2) / bY, room: entrance.label, circuit: 'MAIN' })
  }
  
  for (const room of rooms) {
    const cx = (room.gridX + room.spanX / 2) / bX
    const cy = (room.gridY + room.spanY / 2) / bY
    const circuit = `L-${circuitNum}`
    
    // 조명 (모든 실 중앙)
    items.push({ type: 'light', label: '조명', x: cx, y: cy, room: room.label, circuit })
    
    // 스위치 (문 옆)
    if (room.hasDoor) {
      const sx = room.doorSide === 'left' ? (room.gridX + 0.15) / bX : room.doorSide === 'right' ? (room.gridX + room.spanX - 0.15) / bX : cx
      const sy = room.doorSide === 'top' ? (room.gridY + 0.15) / bY : room.doorSide === 'bottom' ? (room.gridY + room.spanY - 0.15) / bY : cy
      items.push({ type: 'switch', label: 'SW', x: sx, y: sy, room: room.label, circuit })
    }
    
    // 콘센트 (방 타입별)
    switch (room.type) {
      case 'living':
        items.push({ type: 'outlet', label: '2구', x: (room.gridX + 0.2) / bX, y: (room.gridY + 0.8) / bY, room: room.label, circuit })
        items.push({ type: 'outlet', label: '2구', x: (room.gridX + room.spanX - 0.2) / bX, y: (room.gridY + 0.8) / bY, room: room.label, circuit })
        items.push({ type: 'tv', label: 'TV', x: (room.gridX + room.spanX / 2) / bX, y: (room.gridY + 0.9) / bY, room: room.label, circuit })
        items.push({ type: 'data', label: 'LAN', x: (room.gridX + room.spanX / 2) / bX, y: (room.gridY + 0.1) / bY, room: room.label, circuit })
        break
      case 'master': case 'bedroom2': case 'bedroom3':
        items.push({ type: 'outlet', label: '2구', x: (room.gridX + 0.2) / bX, y: (room.gridY + 0.5) / bY, room: room.label, circuit })
        items.push({ type: 'outlet', label: '2구', x: (room.gridX + room.spanX - 0.2) / bX, y: (room.gridY + 0.5) / bY, room: room.label, circuit })
        items.push({ type: 'data', label: 'LAN', x: (room.gridX + 0.8) / bX, y: (room.gridY + 0.2) / bY, room: room.label, circuit })
        break
      case 'kitchen':
        items.push({ type: 'outlet', label: '전용4구', x: (room.gridX + 0.3) / bX, y: (room.gridY + 0.2) / bY, room: room.label, circuit })
        items.push({ type: 'outlet', label: '냉장고', x: (room.gridX + room.spanX - 0.2) / bX, y: (room.gridY + 0.2) / bY, room: room.label, circuit })
        break
      case 'bathroom_main': case 'bathroom_sub':
        items.push({ type: 'outlet', label: '방수1구', x: (room.gridX + 0.3) / bX, y: (room.gridY + 0.3) / bY, room: room.label, circuit })
        break
      case 'entrance':
        items.push({ type: 'intercom', label: '인터폰', x: (room.gridX + 0.5) / bX, y: (room.gridY + 0.3) / bY, room: room.label, circuit })
        break
    }
    circuitNum++
  }
  return items
}

// ━━━ 급배수 배치 (KDS 31 30) ━━━
function placePlumbing(rooms: Room[], grid: StructuralGrid): PlumbingItem[] {
  const items: PlumbingItem[] = []
  const bX = grid.baysX, bY = grid.baysY
  
  // PS 위치 찾기 (습식 공간 근처)
  const wetRooms = rooms.filter(r => r.isWet)
  const psRooms = wetRooms.length > 0 ? [wetRooms[0]] : []
  
  for (const ps of psRooms) {
    const psX = (ps.gridX + ps.spanX - 0.1) / bX
    const psY = (ps.gridY + 0.1) / bY
    items.push({ type: 'ps', label: 'PS', x: psX, y: psY, diameter: 150, room: ps.label })
    
    // PS에서 각 습식 공간으로 배관
    for (const wet of wetRooms) {
      const wx = (wet.gridX + wet.spanX / 2) / bX
      const wy = (wet.gridY + wet.spanY / 2) / bY
      
      // 급수 (파랑)
      items.push({ type: 'cold', label: '급수', x: psX, y: psY, endX: wx, endY: wy, diameter: 20, room: wet.label })
      // 온수 (빨강)
      items.push({ type: 'hot', label: '온수', x: psX, y: psY + 0.02, endX: wx, endY: wy + 0.02, diameter: 20, room: wet.label })
      // 배수 (녹색)
      items.push({ type: 'drain', label: '배수', x: wx, y: wy - 0.02, endX: psX, endY: psY - 0.02, diameter: 50, room: wet.label })
    }
  }
  
  // 주방 배관
  const kitchen = rooms.find(r => r.type === 'kitchen')
  if (kitchen && psRooms.length > 0) {
    const kx = (kitchen.gridX + 0.3) / bX
    const ky = (kitchen.gridY + 0.3) / bY
    items.push({ type: 'cold', label: '급수(주방)', x: psRooms[0].gridX / bX, y: psRooms[0].gridY / bY, endX: kx, endY: ky, diameter: 15, room: kitchen.label })
    items.push({ type: 'drain', label: '배수(주방)', x: kx, y: ky, endX: psRooms[0].gridX / bX, endY: psRooms[0].gridY / bY, diameter: 40, room: kitchen.label })
  }
  
  return items
}

// ━━━ 환기 설비 (건축물 설비기준) ━━━
function placeHVAC(rooms: Room[], grid: StructuralGrid): HVACItem[] {
  const items: HVACItem[] = []
  const bX = grid.baysX, bY = grid.baysY
  
  for (const room of rooms) {
    const cx = (room.gridX + room.spanX / 2) / bX
    const cy = (room.gridY + room.spanY / 2) / bY
    const area = room.area
    
    // 급기 디퓨저 (거실/침실)
    if (['living', 'master', 'bedroom2', 'bedroom3'].includes(room.type)) {
      items.push({ type: 'diffuser', label: '급기', x: cx, y: cy - 0.05, size: '□300', room: room.label })
      items.push({ type: 'return', label: '환기', x: cx + 0.1, y: cy + 0.05, size: '□200', room: room.label })
    }
    
    // 배기 (주방/욕실)
    if (room.type === 'kitchen') {
      items.push({ type: 'exhaust', label: '레인지후드', x: cx, y: (room.gridY + 0.15) / bY, size: '∅150', room: room.label })
      // 덕트 경로 (주방→외벽)
      items.push({ type: 'duct', label: '배기덕트', x: cx, y: (room.gridY + 0.15) / bY, endX: 0, endY: (room.gridY + 0.15) / bY, size: '∅150', room: room.label })
    }
    if (['bathroom_main', 'bathroom_sub'].includes(room.type)) {
      items.push({ type: 'exhaust', label: '환풍기', x: cx, y: cy, size: '∅100', room: room.label })
    }
  }
  
  return items
}

// ━━━ 소방 설비 (소방시설법) ━━━
function placeFire(rooms: Room[], grid: StructuralGrid): FireItem[] {
  const items: FireItem[] = []
  const bX = grid.baysX, bY = grid.baysY
  
  for (const room of rooms) {
    const cx = (room.gridX + room.spanX / 2) / bX
    const cy = (room.gridY + room.spanY / 2) / bY
    const area = room.area
    
    // 연기감지기: 모든 실 (감지 면적 제한: 1종 60㎡)
    if (room.type !== 'core') {
      items.push({ type: 'detector', label: '연기감지기', x: cx, y: cy, room: room.label, coverage: Math.min(area, 60) })
    }
    
    // 스프링클러: 10㎡당 1개 (간이/습식)
    if (area > 5) {
      const headCount = Math.max(1, Math.ceil(area / 10))
      for (let h = 0; h < Math.min(headCount, 4); h++) {
        const hx = (room.gridX + room.spanX * (0.25 + h * 0.5 / headCount)) / bX
        const hy = (room.gridY + room.spanY * 0.5) / bY
        items.push({ type: 'sprinkler', label: 'SP', x: hx, y: hy, room: room.label, coverage: 10 })
      }
    }
  }
  
  // 소화기: 현관/코어 (보행거리 20m 이내)
  const entrance = rooms.find(r => r.type === 'entrance')
  if (entrance) {
    items.push({ type: 'extinguisher', label: '소화기', x: (entrance.gridX + 0.5) / bX, y: (entrance.gridY + 0.8) / bY, room: entrance.label, coverage: 0 })
  }
  
  // 유도등: 현관/코어
  const core = rooms.find(r => r.type === 'core')
  if (core) {
    items.push({ type: 'exit_sign', label: '유도등', x: (core.gridX + 0.5) / bX, y: (core.gridY + 0.1) / bY, room: core.label, coverage: 0 })
  }
  items.push({ type: 'alarm', label: '경보기', x: entrance ? (entrance.gridX + 0.8) / bX : 0.5, y: entrance ? (entrance.gridY + 0.5) / bY : 0.5, room: entrance?.label || '현관', coverage: 0 })
  
  return items
}

// ━━━ 메인 함수 ━━━
export function generateMEPDesign(grid: StructuralGrid): MEPDesign {
  const electrical = placeElectrical(grid.rooms, grid)
  const plumbing = placePlumbing(grid.rooms, grid)
  const hvac = placeHVAC(grid.rooms, grid)
  const fire = placeFire(grid.rooms, grid)
  
  return {
    electrical, plumbing, hvac, fire,
    summary: {
      circuits: new Set(electrical.map(e => e.circuit)).size,
      outlets: electrical.filter(e => e.type === 'outlet').length,
      switches: electrical.filter(e => e.type === 'switch').length,
      sprinklers: fire.filter(f => f.type === 'sprinkler').length,
      detectors: fire.filter(f => f.type === 'detector').length,
      psCount: plumbing.filter(p => p.type === 'ps').length,
      ductLength: Math.round(hvac.filter(h => h.type === 'duct').length * grid.bayWidthM),
    },
  }
}
