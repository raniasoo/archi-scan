/**
 * Phase 4: 창호·마감 자동화 엔진
 * 
 * 구조 그리드의 방 데이터 → 창호 스케줄 + 마감표 + 문 스케줄 자동 생성
 * 한국 건축 실시설계 기준:
 *   KS F 4805 (창호), KS F 4009 (문), 건축물의 피난·방화구조 등의 기준
 */

import type { Room, StructuralGrid } from './structural-grid'

// ━━━ 창호 타입 ━━━
export interface WindowSpec {
  id: string          // W-01, W-02...
  type: string        // 이중창, 시스템창, 고정창
  width: number       // mm
  height: number      // mm
  material: string    // AL, PVC, 시스템
  glass: string       // 24mm 복층, 22mm 로이
  count: number       // 수량
  rooms: string[]     // 적용 방
}

// ━━━ 문 타입 ━━━
export interface DoorSpec {
  id: string          // D-01, D-02...
  type: string        // 방화문, 방문, 화장실문, 현관문
  width: number       // mm
  height: number      // mm
  material: string    // 스틸, 원목, ABS
  hardware: string    // 레버, 푸시풀, 디지털
  fireRating: string  // 갑종, 을종, 비방화
  count: number
  rooms: string[]
}

// ━━━ 마감 타입 ━━━
export interface FinishSpec {
  room: string        // 방 이름
  roomType: string    // 방 타입
  floor: string       // 바닥 마감
  wall: string        // 벽 마감
  ceiling: string     // 천장 마감
  baseboard: string   // 걸레받이
  ceilingHeight: number // 천장고 mm
}

// ━━━ 방 타입 → 창호 규격 매핑 ━━━
function getWindowSpec(room: Room, bayW: number, bayD: number): WindowSpec | null {
  if (!room.hasWindow || room.windowSides.length === 0) return null
  
  const spanM = Math.max(room.spanX * bayW, room.spanY * bayD)
  
  switch (room.type) {
    case 'living':
      return { id: '', type: '시스템 이중창', width: Math.round(spanM * 0.7 * 1000), height: 2200, material: 'AL 시스템', glass: '24mm 로이복층', count: room.windowSides.length, rooms: [room.label] }
    case 'master':
      return { id: '', type: '이중창', width: Math.round(spanM * 0.6 * 1000), height: 2100, material: 'AL 시스템', glass: '24mm 로이복층', count: room.windowSides.length, rooms: [room.label] }
    case 'bedroom2': case 'bedroom3':
      return { id: '', type: '이중창', width: Math.round(spanM * 0.5 * 1000), height: 2000, material: 'PVC 이중', glass: '22mm 복층', count: room.windowSides.length, rooms: [room.label] }
    case 'kitchen':
      return { id: '', type: '프로젝트창', width: Math.round(spanM * 0.4 * 1000), height: 600, material: 'AL', glass: '22mm 복층', count: 1, rooms: [room.label] }
    default:
      return null
  }
}

// ━━━ 방 타입 → 문 규격 매핑 ━━━
function getDoorSpec(room: Room): DoorSpec | null {
  if (!room.hasDoor) return null
  
  switch (room.type) {
    case 'entrance':
      return { id: '', type: '현관문', width: 1000, height: 2100, material: '스틸 방화', hardware: '디지털 도어락', fireRating: '을종 방화', count: 1, rooms: [room.label] }
    case 'master':
      return { id: '', type: '방문', width: 900, height: 2100, material: '원목 무늬목', hardware: '레버 핸들', fireRating: '비방화', count: 1, rooms: [room.label] }
    case 'bedroom2': case 'bedroom3':
      return { id: '', type: '방문', width: 900, height: 2100, material: 'ABS 시트', hardware: '레버 핸들', fireRating: '비방화', count: 1, rooms: [room.label] }
    case 'bathroom_main': case 'bathroom_sub':
      return { id: '', type: '화장실문', width: 800, height: 2100, material: 'ABS 방수', hardware: '잠금 레버', fireRating: '비방화', count: 1, rooms: [room.label] }
    case 'dressroom':
      return { id: '', type: '슬라이딩', width: 1200, height: 2100, material: '유리+AL', hardware: '소프트클로징', fireRating: '비방화', count: 1, rooms: [room.label] }
    case 'core':
      return { id: '', type: '방화문', width: 900, height: 2100, material: '스틸 갑종', hardware: '패닉바+도어체크', fireRating: '갑종 방화', count: 1, rooms: [room.label] }
    default:
      return null
  }
}

// ━━━ 방 타입 → 마감 사양 매핑 ━━━
function getFinishSpec(room: Room): FinishSpec {
  const base = { room: room.label, roomType: room.type, baseboard: '알루미늄 50mm', ceilingHeight: 2400 }
  
  switch (room.type) {
    case 'living': case 'dining':
      return { ...base, floor: '강마루 12T (오크)', wall: '실크벽지 (KS)', ceiling: '석고보드 9.5T + 도장', ceilingHeight: 2500 }
    case 'kitchen':
      return { ...base, floor: '포세린 타일 600×600', wall: '포세린 타일 (H1200) + 도장', ceiling: '석고보드 9.5T + 도장', baseboard: '타일 걸레받이' }
    case 'master':
      return { ...base, floor: '강마루 12T (월넛)', wall: '실크벽지 (KS)', ceiling: '석고보드 9.5T + 도장', ceilingHeight: 2500 }
    case 'bedroom2': case 'bedroom3':
      return { ...base, floor: '강마루 12T (오크)', wall: '실크벽지 (KS)', ceiling: '석고보드 9.5T + 도장' }
    case 'bathroom_main':
      return { ...base, floor: '포세린 타일 300×300 (논슬립)', wall: '포세린 타일 300×600 (전면)', ceiling: 'SMC 욕실천장', baseboard: '타일 (R형)', ceilingHeight: 2300 }
    case 'bathroom_sub':
      return { ...base, floor: '포세린 타일 300×300 (논슬립)', wall: '포세린 타일 300×600 (전면)', ceiling: 'SMC 욕실천장', baseboard: '타일 (R형)', ceilingHeight: 2300 }
    case 'entrance':
      return { ...base, floor: '포세린 타일 600×600', wall: '도장 + 포인트 월', ceiling: '석고보드 9.5T + 도장', ceilingHeight: 2400 }
    case 'dressroom':
      return { ...base, floor: '강마루 12T', wall: '합판+도장', ceiling: '석고보드 9.5T + 도장', ceilingHeight: 2400 }
    case 'corridor':
      return { ...base, floor: '강마루 12T', wall: '실크벽지', ceiling: '석고보드 9.5T + 도장' }
    case 'core':
      return { ...base, floor: '에폭시 도장', wall: '시멘트 도장', ceiling: '노출', ceilingHeight: 2700 }
    default:
      return { ...base, floor: '강마루 12T', wall: '실크벽지', ceiling: '석고보드 + 도장' }
  }
}

// ━━━ 메인 함수: 스케줄 생성 ━━━
export function generateSchedules(grid: StructuralGrid): {
  windows: WindowSpec[]
  doors: DoorSpec[]
  finishes: FinishSpec[]
} {
  const windowMap = new Map<string, WindowSpec>()
  const doorMap = new Map<string, DoorSpec>()
  const finishes: FinishSpec[] = []
  
  for (const room of grid.rooms) {
    // 창호
    const win = getWindowSpec(room, grid.bayWidthM, grid.bayDepthM)
    if (win) {
      const key = `${win.type}-${win.width}-${win.height}`
      if (windowMap.has(key)) {
        const existing = windowMap.get(key)!
        existing.count += win.count
        existing.rooms.push(...win.rooms)
      } else {
        windowMap.set(key, { ...win })
      }
    }
    
    // 문
    const door = getDoorSpec(room)
    if (door) {
      const key = `${door.type}-${door.width}-${door.material}`
      if (doorMap.has(key)) {
        const existing = doorMap.get(key)!
        existing.count += door.count
        existing.rooms.push(...door.rooms)
      } else {
        doorMap.set(key, { ...door })
      }
    }
    
    // 마감
    finishes.push(getFinishSpec(room))
  }
  
  // ID 부여
  const windows = [...windowMap.values()].map((w, i) => ({ ...w, id: `W-${String(i + 1).padStart(2, '0')}` }))
  const doors = [...doorMap.values()].map((d, i) => ({ ...d, id: `D-${String(i + 1).padStart(2, '0')}` }))
  
  return { windows, doors, finishes }
}
