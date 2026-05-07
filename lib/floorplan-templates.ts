// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 파라메트릭 평면 템플릿 시스템
// 8타입 × 3크기 × 4변형 = 96+ 조합
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface RoomDef {
  name: string
  rx: number; ry: number; rw: number; rh: number
  fill: string
  furniture?: string
}

export interface UnitTemplate {
  id: string
  name: string
  type: string        // 원룸, 1.5룸, 투룸, 투룸+, 쓰리룸, 쓰리룸+, 포룸, 복층
  variant: string     // A, B, C, D
  size: 'S'|'M'|'L'
  area: number        // 전용면적 ㎡
  rooms: number       // 방 수
  baths: number       // 욕실 수
  description: string // 설명
  generate: (w: number, h: number, mirror: boolean) => RoomDef[]
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 실 색상
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const C = {
  living: '#f0fdf4', kitchen: '#fef3c7', master: '#eff6ff', bed2: '#f0f9ff',
  bed3: '#f5f3ff', bed4: '#fdf2f8', bath: '#e0f2fe', dress: '#faf5ff',
  entry: '#f1f5f9', balcony: '#ecfdf5', util: '#fef9c3', study: '#fdf4ff',
  pantry: '#fff7ed', hall: '#f8fafc', storage: '#f1f5f9',
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 헬퍼: 미러 변환
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function mirrorRooms(rooms: RoomDef[], unitW: number): RoomDef[] {
  return rooms.map(r => ({ ...r, rx: unitW - r.rx - r.rw }))
}

function applyMirror(rooms: RoomDef[], w: number, mirror: boolean): RoomDef[] {
  return mirror ? mirrorRooms(rooms, w) : rooms
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. 원룸 (16~24㎡) — 4변형
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function studioA(w: number, h: number, mirror: boolean): RoomDef[] {
  // A: 일자형 — 현관→욕실→메인룸+미니주방
  const bathW = w * 0.3, mainW = w - bathW
  const kitH = h * 0.25
  return applyMirror([
    { name: '원룸', rx: 0, ry: 0, rw: mainW, rh: h - kitH, fill: C.living, furniture: 'bed-single' },
    { name: '미니주방', rx: 0, ry: h - kitH, rw: mainW, rh: kitH, fill: C.kitchen, furniture: 'kitchen' },
    { name: '욕실', rx: mainW, ry: 0, rw: bathW, rh: h * 0.55, fill: C.bath, furniture: 'toilet' },
    { name: '현관', rx: mainW, ry: h * 0.55, rw: bathW, rh: h * 0.45, fill: C.entry, furniture: 'shoe' },
  ], w, mirror)
}

function studioB(w: number, h: number, mirror: boolean): RoomDef[] {
  // B: ㄱ자형 — 현관 옆 욕실, 주방 분리
  const entryW = w * 0.25, kitH = h * 0.3
  return applyMirror([
    { name: '원룸', rx: 0, ry: 0, rw: w, rh: h - kitH, fill: C.living, furniture: 'bed-single' },
    { name: '주방', rx: 0, ry: h - kitH, rw: w * 0.5, rh: kitH, fill: C.kitchen, furniture: 'kitchen' },
    { name: '욕실', rx: w * 0.5, ry: h - kitH, rw: w * 0.25, rh: kitH, fill: C.bath, furniture: 'toilet' },
    { name: '현관', rx: w * 0.75, ry: h - kitH, rw: w * 0.25, rh: kitH, fill: C.entry, furniture: 'shoe' },
  ], w, mirror)
}

function studioC(w: number, h: number, mirror: boolean): RoomDef[] {
  // C: 분리형 — 침실/거실 반분리
  const splitH = h * 0.55, bathW = w * 0.28
  return applyMirror([
    { name: '침실', rx: 0, ry: 0, rw: w * 0.55, rh: splitH, fill: C.master, furniture: 'bed-single' },
    { name: '거실', rx: w * 0.55, ry: 0, rw: w * 0.45, rh: splitH, fill: C.living, furniture: 'sofa' },
    { name: '주방', rx: 0, ry: splitH, rw: w - bathW, rh: h - splitH, fill: C.kitchen, furniture: 'kitchen' },
    { name: '욕실', rx: w - bathW, ry: splitH, rw: bathW, rh: (h - splitH) * 0.55, fill: C.bath, furniture: 'toilet' },
    { name: '현관', rx: w - bathW, ry: splitH + (h - splitH) * 0.55, rw: bathW, rh: (h - splitH) * 0.45, fill: C.entry, furniture: 'shoe' },
  ], w, mirror)
}

function studioD(w: number, h: number, mirror: boolean): RoomDef[] {
  // D: 복도형 — 긴 복도 + 측면 실
  const hallW = w * 0.2
  return applyMirror([
    { name: '원룸', rx: 0, ry: 0, rw: w - hallW, rh: h * 0.65, fill: C.living, furniture: 'bed-single' },
    { name: '주방', rx: 0, ry: h * 0.65, rw: w - hallW, rh: h * 0.35, fill: C.kitchen, furniture: 'kitchen' },
    { name: '욕실', rx: w - hallW, ry: 0, rw: hallW, rh: h * 0.4, fill: C.bath, furniture: 'toilet' },
    { name: '현관', rx: w - hallW, ry: h * 0.4, rw: hallW, rh: h * 0.3, fill: C.entry, furniture: 'shoe' },
    { name: '수납', rx: w - hallW, ry: h * 0.7, rw: hallW, rh: h * 0.3, fill: C.storage },
  ], w, mirror)
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. 1.5룸 (24~33㎡) — 4변형
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function oneHalfA(w: number, h: number, mirror: boolean): RoomDef[] {
  const lrH = h * 0.55, brW = w * 0.45
  return applyMirror([
    { name: '거실', rx: 0, ry: 0, rw: w * 0.6, rh: lrH, fill: C.living, furniture: 'sofa' },
    { name: '주방', rx: w * 0.6, ry: 0, rw: w * 0.4, rh: lrH, fill: C.kitchen, furniture: 'kitchen' },
    { name: '침실', rx: 0, ry: lrH, rw: brW, rh: h - lrH, fill: C.master, furniture: 'bed-single' },
    { name: '욕실', rx: brW, ry: lrH, rw: w * 0.3, rh: h - lrH, fill: C.bath, furniture: 'toilet' },
    { name: '현관', rx: brW + w * 0.3, ry: lrH, rw: w - brW - w * 0.3, rh: h - lrH, fill: C.entry, furniture: 'shoe' },
  ], w, mirror)
}

function oneHalfB(w: number, h: number, mirror: boolean): RoomDef[] {
  const topH = h * 0.5
  return applyMirror([
    { name: '거실/주방', rx: 0, ry: 0, rw: w, rh: topH, fill: C.living, furniture: 'sofa' },
    { name: '침실', rx: 0, ry: topH, rw: w * 0.5, rh: h - topH, fill: C.master, furniture: 'bed-single' },
    { name: '욕실', rx: w * 0.5, ry: topH, rw: w * 0.25, rh: h - topH, fill: C.bath, furniture: 'toilet' },
    { name: '현관', rx: w * 0.75, ry: topH, rw: w * 0.25, rh: h - topH, fill: C.entry, furniture: 'shoe' },
  ], w, mirror)
}

function oneHalfC(w: number, h: number, mirror: boolean): RoomDef[] {
  return applyMirror([
    { name: '거실', rx: 0, ry: 0, rw: w * 0.55, rh: h * 0.5, fill: C.living, furniture: 'sofa' },
    { name: '주방', rx: w * 0.55, ry: 0, rw: w * 0.45, rh: h * 0.5, fill: C.kitchen, furniture: 'kitchen' },
    { name: '침실', rx: 0, ry: h * 0.5, rw: w * 0.45, rh: h * 0.5, fill: C.master, furniture: 'bed-single' },
    { name: '드레스룸', rx: w * 0.45, ry: h * 0.5, rw: w * 0.2, rh: h * 0.5, fill: C.dress, furniture: 'closet' },
    { name: '욕실', rx: w * 0.65, ry: h * 0.5, rw: w * 0.2, rh: h * 0.5, fill: C.bath, furniture: 'toilet' },
    { name: '현관', rx: w * 0.85, ry: h * 0.5, rw: w * 0.15, rh: h * 0.5, fill: C.entry, furniture: 'shoe' },
  ], w, mirror)
}

function oneHalfD(w: number, h: number, mirror: boolean): RoomDef[] {
  return applyMirror([
    { name: '거실', rx: 0, ry: 0, rw: w, rh: h * 0.4, fill: C.living, furniture: 'sofa' },
    { name: '침실', rx: 0, ry: h * 0.4, rw: w * 0.5, rh: h * 0.35, fill: C.master, furniture: 'bed-single' },
    { name: '주방', rx: w * 0.5, ry: h * 0.4, rw: w * 0.5, rh: h * 0.35, fill: C.kitchen, furniture: 'kitchen' },
    { name: '욕실', rx: 0, ry: h * 0.75, rw: w * 0.35, rh: h * 0.25, fill: C.bath, furniture: 'toilet' },
    { name: '다용도', rx: w * 0.35, ry: h * 0.75, rw: w * 0.3, rh: h * 0.25, fill: C.util },
    { name: '현관', rx: w * 0.65, ry: h * 0.75, rw: w * 0.35, rh: h * 0.25, fill: C.entry, furniture: 'shoe' },
  ], w, mirror)
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. 투룸 (33~49㎡) — 4변형
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function twoRoomA(w: number, h: number, mirror: boolean): RoomDef[] {
  const topH = h * 0.52, brW = w * 0.42, br2W = w * 0.32, restW = w - brW - br2W
  return applyMirror([
    { name: '거실', rx: 0, ry: 0, rw: w * 0.55, rh: topH, fill: C.living, furniture: 'sofa' },
    { name: '주방/식당', rx: w * 0.55, ry: 0, rw: w * 0.45, rh: topH, fill: C.kitchen, furniture: 'kitchen' },
    { name: '안방', rx: 0, ry: topH, rw: brW, rh: h - topH, fill: C.master, furniture: 'bed-master' },
    { name: '침실2', rx: brW, ry: topH, rw: br2W, rh: h - topH, fill: C.bed2, furniture: 'bed-single' },
    { name: '욕실', rx: brW + br2W, ry: topH, rw: restW, rh: (h - topH) * 0.55, fill: C.bath, furniture: 'toilet' },
    { name: '현관', rx: brW + br2W, ry: topH + (h - topH) * 0.55, rw: restW, rh: (h - topH) * 0.45, fill: C.entry, furniture: 'shoe' },
  ], w, mirror)
}

function twoRoomB(w: number, h: number, mirror: boolean): RoomDef[] {
  // B: 주방 독립형
  const topH = h * 0.45, midH = h * 0.3, botH = h - topH - midH
  return applyMirror([
    { name: '거실', rx: 0, ry: 0, rw: w, rh: topH, fill: C.living, furniture: 'sofa' },
    { name: '안방', rx: 0, ry: topH, rw: w * 0.5, rh: midH, fill: C.master, furniture: 'bed-master' },
    { name: '침실2', rx: w * 0.5, ry: topH, rw: w * 0.5, rh: midH, fill: C.bed2, furniture: 'bed-single' },
    { name: '주방', rx: 0, ry: topH + midH, rw: w * 0.45, rh: botH, fill: C.kitchen, furniture: 'kitchen' },
    { name: '욕실', rx: w * 0.45, ry: topH + midH, rw: w * 0.3, rh: botH, fill: C.bath, furniture: 'toilet' },
    { name: '현관', rx: w * 0.75, ry: topH + midH, rw: w * 0.25, rh: botH, fill: C.entry, furniture: 'shoe' },
  ], w, mirror)
}

function twoRoomC(w: number, h: number, mirror: boolean): RoomDef[] {
  // C: ㄱ자 주방형
  return applyMirror([
    { name: '거실', rx: 0, ry: 0, rw: w * 0.6, rh: h * 0.5, fill: C.living, furniture: 'sofa' },
    { name: '주방', rx: w * 0.6, ry: 0, rw: w * 0.4, rh: h * 0.35, fill: C.kitchen, furniture: 'kitchen' },
    { name: '현관', rx: w * 0.6, ry: h * 0.35, rw: w * 0.4, rh: h * 0.15, fill: C.entry, furniture: 'shoe' },
    { name: '안방', rx: 0, ry: h * 0.5, rw: w * 0.5, rh: h * 0.5, fill: C.master, furniture: 'bed-master' },
    { name: '침실2', rx: w * 0.5, ry: h * 0.5, rw: w * 0.3, rh: h * 0.5, fill: C.bed2, furniture: 'bed-single' },
    { name: '욕실', rx: w * 0.8, ry: h * 0.5, rw: w * 0.2, rh: h * 0.5, fill: C.bath, furniture: 'toilet' },
  ], w, mirror)
}

function twoRoomD(w: number, h: number, mirror: boolean): RoomDef[] {
  // D: 광폭 거실형
  return applyMirror([
    { name: '거실', rx: 0, ry: 0, rw: w * 0.65, rh: h * 0.55, fill: C.living, furniture: 'sofa' },
    { name: '주방', rx: w * 0.65, ry: 0, rw: w * 0.35, rh: h * 0.55, fill: C.kitchen, furniture: 'kitchen' },
    { name: '안방', rx: 0, ry: h * 0.55, rw: w * 0.4, rh: h * 0.45, fill: C.master, furniture: 'bed-master' },
    { name: '침실2', rx: w * 0.4, ry: h * 0.55, rw: w * 0.28, rh: h * 0.45, fill: C.bed2, furniture: 'bed-single' },
    { name: '욕실', rx: w * 0.68, ry: h * 0.55, rw: w * 0.15, rh: h * 0.45, fill: C.bath, furniture: 'toilet' },
    { name: '현관', rx: w * 0.83, ry: h * 0.55, rw: w * 0.17, rh: h * 0.45, fill: C.entry, furniture: 'shoe' },
  ], w, mirror)
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. 투룸+ (46~59㎡) — 4변형
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function twoPlusA(w: number, h: number, mirror: boolean): RoomDef[] {
  const topH = h * 0.5
  return applyMirror([
    { name: '거실', rx: 0, ry: 0, rw: w * 0.55, rh: topH, fill: C.living, furniture: 'sofa' },
    { name: '주방/식당', rx: w * 0.55, ry: 0, rw: w * 0.45, rh: topH, fill: C.kitchen, furniture: 'kitchen' },
    { name: '안방', rx: 0, ry: topH, rw: w * 0.4, rh: h - topH, fill: C.master, furniture: 'bed-master' },
    { name: '침실2', rx: w * 0.4, ry: topH, rw: w * 0.3, rh: (h - topH) * 0.65, fill: C.bed2, furniture: 'bed-single' },
    { name: '주욕실', rx: w * 0.7, ry: topH, rw: w * 0.3, rh: (h - topH) * 0.5, fill: C.bath, furniture: 'bath' },
    { name: '보조욕실', rx: w * 0.4, ry: topH + (h - topH) * 0.65, rw: w * 0.3, rh: (h - topH) * 0.35, fill: C.bath, furniture: 'toilet' },
    { name: '현관', rx: w * 0.7, ry: topH + (h - topH) * 0.5, rw: w * 0.3, rh: (h - topH) * 0.5, fill: C.entry, furniture: 'shoe' },
  ], w, mirror)
}

function twoPlusB(w: number, h: number, mirror: boolean): RoomDef[] {
  return applyMirror([
    { name: '거실', rx: 0, ry: 0, rw: w * 0.6, rh: h * 0.45, fill: C.living, furniture: 'sofa' },
    { name: '주방', rx: w * 0.6, ry: 0, rw: w * 0.4, rh: h * 0.45, fill: C.kitchen, furniture: 'kitchen' },
    { name: '안방', rx: 0, ry: h * 0.45, rw: w * 0.42, rh: h * 0.55, fill: C.master, furniture: 'bed-master' },
    { name: '침실2', rx: w * 0.42, ry: h * 0.45, rw: w * 0.3, rh: h * 0.35, fill: C.bed2, furniture: 'bed-single' },
    { name: '주욕실', rx: w * 0.72, ry: h * 0.45, rw: w * 0.28, rh: h * 0.35, fill: C.bath, furniture: 'bath' },
    { name: '보조욕실', rx: w * 0.42, ry: h * 0.8, rw: w * 0.25, rh: h * 0.2, fill: C.bath, furniture: 'toilet' },
    { name: '다용도', rx: w * 0.67, ry: h * 0.8, rw: w * 0.15, rh: h * 0.2, fill: C.util },
    { name: '현관', rx: w * 0.82, ry: h * 0.8, rw: w * 0.18, rh: h * 0.2, fill: C.entry, furniture: 'shoe' },
  ], w, mirror)
}

function twoPlusC(w: number, h: number, m: boolean): RoomDef[] {
  return applyMirror([
    { name: '거실', rx: 0, ry: 0, rw: w * 0.5, rh: h * 0.5, fill: C.living, furniture: 'sofa' },
    { name: '주방', rx: w * 0.5, ry: 0, rw: w * 0.5, rh: h * 0.3, fill: C.kitchen, furniture: 'kitchen' },
    { name: '현관', rx: w * 0.5, ry: h * 0.3, rw: w * 0.25, rh: h * 0.2, fill: C.entry, furniture: 'shoe' },
    { name: '다용도', rx: w * 0.75, ry: h * 0.3, rw: w * 0.25, rh: h * 0.2, fill: C.util },
    { name: '안방', rx: 0, ry: h * 0.5, rw: w * 0.45, rh: h * 0.5, fill: C.master, furniture: 'bed-master' },
    { name: '침실2', rx: w * 0.45, ry: h * 0.5, rw: w * 0.3, rh: h * 0.5, fill: C.bed2, furniture: 'bed-single' },
    { name: '주욕실', rx: w * 0.75, ry: h * 0.5, rw: w * 0.25, rh: h * 0.3, fill: C.bath, furniture: 'bath' },
    { name: '보조욕실', rx: w * 0.75, ry: h * 0.8, rw: w * 0.25, rh: h * 0.2, fill: C.bath, furniture: 'toilet' },
  ], w, m)
}

function twoPlusD(w: number, h: number, m: boolean): RoomDef[] {
  return applyMirror([
    { name: '거실', rx: 0, ry: 0, rw: w * 0.55, rh: h * 0.48, fill: C.living, furniture: 'sofa' },
    { name: '주방/식당', rx: w * 0.55, ry: 0, rw: w * 0.45, rh: h * 0.48, fill: C.kitchen, furniture: 'kitchen' },
    { name: '안방', rx: 0, ry: h * 0.48, rw: w * 0.38, rh: h * 0.52, fill: C.master, furniture: 'bed-master' },
    { name: '드레스룸', rx: w * 0.38, ry: h * 0.48, rw: w * 0.18, rh: h * 0.3, fill: C.dress, furniture: 'closet' },
    { name: '침실2', rx: w * 0.56, ry: h * 0.48, rw: w * 0.28, rh: h * 0.3, fill: C.bed2, furniture: 'bed-single' },
    { name: '주욕실', rx: w * 0.84, ry: h * 0.48, rw: w * 0.16, rh: h * 0.3, fill: C.bath, furniture: 'bath' },
    { name: '보조욕실', rx: w * 0.38, ry: h * 0.78, rw: w * 0.22, rh: h * 0.22, fill: C.bath, furniture: 'toilet' },
    { name: '현관', rx: w * 0.6, ry: h * 0.78, rw: w * 0.4, rh: h * 0.22, fill: C.entry, furniture: 'shoe' },
  ], w, m)
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. 쓰리룸 (59~84㎡) — 4변형
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function threeRoomA(w: number, h: number, m: boolean): RoomDef[] {
  const topH = h * 0.42, midH = h * 0.33, botH = h - topH - midH
  return applyMirror([
    { name: '거실', rx: 0, ry: 0, rw: w * 0.52, rh: topH, fill: C.living, furniture: 'sofa' },
    { name: '주방/식당', rx: w * 0.52, ry: 0, rw: w * 0.48, rh: topH, fill: C.kitchen, furniture: 'kitchen' },
    { name: '안방', rx: 0, ry: topH, rw: w * 0.38, rh: midH, fill: C.master, furniture: 'bed-master' },
    { name: '침실2', rx: w * 0.38, ry: topH, rw: w * 0.32, rh: midH, fill: C.bed2, furniture: 'bed-single' },
    { name: '주욕실', rx: w * 0.7, ry: topH, rw: w * 0.3, rh: midH, fill: C.bath, furniture: 'bath' },
    { name: '침실3', rx: 0, ry: topH + midH, rw: w * 0.35, rh: botH, fill: C.bed3, furniture: 'bed-single' },
    { name: '드레스룸', rx: w * 0.35, ry: topH + midH, rw: w * 0.22, rh: botH, fill: C.dress, furniture: 'closet' },
    { name: '보조욕실', rx: w * 0.57, ry: topH + midH, rw: w * 0.2, rh: botH, fill: C.bath, furniture: 'toilet' },
    { name: '현관', rx: w * 0.77, ry: topH + midH, rw: w * 0.23, rh: botH, fill: C.entry, furniture: 'shoe' },
  ], w, m)
}

function threeRoomB(w: number, h: number, m: boolean): RoomDef[] {
  // B: 판상형
  return applyMirror([
    { name: '거실', rx: 0, ry: 0, rw: w * 0.6, rh: h * 0.4, fill: C.living, furniture: 'sofa' },
    { name: '주방', rx: w * 0.6, ry: 0, rw: w * 0.4, rh: h * 0.4, fill: C.kitchen, furniture: 'kitchen' },
    { name: '안방', rx: 0, ry: h * 0.4, rw: w * 0.35, rh: h * 0.35, fill: C.master, furniture: 'bed-master' },
    { name: '침실2', rx: w * 0.35, ry: h * 0.4, rw: w * 0.3, rh: h * 0.35, fill: C.bed2, furniture: 'bed-single' },
    { name: '침실3', rx: w * 0.65, ry: h * 0.4, rw: w * 0.35, rh: h * 0.35, fill: C.bed3, furniture: 'bed-single' },
    { name: '주욕실', rx: 0, ry: h * 0.75, rw: w * 0.25, rh: h * 0.25, fill: C.bath, furniture: 'bath' },
    { name: '드레스룸', rx: w * 0.25, ry: h * 0.75, rw: w * 0.2, rh: h * 0.25, fill: C.dress, furniture: 'closet' },
    { name: '보조욕실', rx: w * 0.45, ry: h * 0.75, rw: w * 0.2, rh: h * 0.25, fill: C.bath, furniture: 'toilet' },
    { name: '현관', rx: w * 0.65, ry: h * 0.75, rw: w * 0.35, rh: h * 0.25, fill: C.entry, furniture: 'shoe' },
  ], w, m)
}

function threeRoomC(w: number, h: number, m: boolean): RoomDef[] {
  // C: 중정형
  return applyMirror([
    { name: '거실', rx: 0, ry: 0, rw: w * 0.5, rh: h * 0.45, fill: C.living, furniture: 'sofa' },
    { name: '주방/식당', rx: w * 0.5, ry: 0, rw: w * 0.5, rh: h * 0.45, fill: C.kitchen, furniture: 'kitchen' },
    { name: '안방', rx: 0, ry: h * 0.45, rw: w * 0.4, rh: h * 0.3, fill: C.master, furniture: 'bed-master' },
    { name: '주욕실', rx: 0, ry: h * 0.75, rw: w * 0.22, rh: h * 0.25, fill: C.bath, furniture: 'bath' },
    { name: '드레스룸', rx: w * 0.22, ry: h * 0.75, rw: w * 0.18, rh: h * 0.25, fill: C.dress, furniture: 'closet' },
    { name: '침실2', rx: w * 0.4, ry: h * 0.45, rw: w * 0.3, rh: h * 0.55, fill: C.bed2, furniture: 'bed-single' },
    { name: '침실3', rx: w * 0.7, ry: h * 0.45, rw: w * 0.3, rh: h * 0.3, fill: C.bed3, furniture: 'bed-single' },
    { name: '보조욕실', rx: w * 0.7, ry: h * 0.75, rw: w * 0.15, rh: h * 0.25, fill: C.bath, furniture: 'toilet' },
    { name: '현관', rx: w * 0.85, ry: h * 0.75, rw: w * 0.15, rh: h * 0.25, fill: C.entry, furniture: 'shoe' },
  ], w, m)
}

function threeRoomD(w: number, h: number, m: boolean): RoomDef[] {
  // D: 타워형
  return applyMirror([
    { name: '거실', rx: 0, ry: 0, rw: w * 0.55, rh: h * 0.38, fill: C.living, furniture: 'sofa' },
    { name: '주방', rx: w * 0.55, ry: 0, rw: w * 0.45, rh: h * 0.38, fill: C.kitchen, furniture: 'kitchen' },
    { name: '안방', rx: 0, ry: h * 0.38, rw: w * 0.4, rh: h * 0.32, fill: C.master, furniture: 'bed-master' },
    { name: '침실2', rx: w * 0.4, ry: h * 0.38, rw: w * 0.35, rh: h * 0.32, fill: C.bed2, furniture: 'bed-single' },
    { name: '주욕실', rx: w * 0.75, ry: h * 0.38, rw: w * 0.25, rh: h * 0.32, fill: C.bath, furniture: 'bath' },
    { name: '침실3', rx: 0, ry: h * 0.7, rw: w * 0.3, rh: h * 0.3, fill: C.bed3, furniture: 'bed-single' },
    { name: '드레스룸', rx: w * 0.3, ry: h * 0.7, rw: w * 0.2, rh: h * 0.3, fill: C.dress, furniture: 'closet' },
    { name: '보조욕실', rx: w * 0.5, ry: h * 0.7, rw: w * 0.18, rh: h * 0.3, fill: C.bath, furniture: 'toilet' },
    { name: '다용도', rx: w * 0.68, ry: h * 0.7, rw: w * 0.14, rh: h * 0.3, fill: C.util },
    { name: '현관', rx: w * 0.82, ry: h * 0.7, rw: w * 0.18, rh: h * 0.3, fill: C.entry, furniture: 'shoe' },
  ], w, m)
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 6. 쓰리룸+ (84~115㎡) — 4변형
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function threePlusA(w: number, h: number, m: boolean): RoomDef[] {
  return applyMirror([
    { name: '거실', rx: 0, ry: 0, rw: w * 0.45, rh: h * 0.4, fill: C.living, furniture: 'sofa' },
    { name: '주방/식당', rx: w * 0.45, ry: 0, rw: w * 0.35, rh: h * 0.4, fill: C.kitchen, furniture: 'kitchen' },
    { name: '팬트리', rx: w * 0.8, ry: 0, rw: w * 0.2, rh: h * 0.2, fill: C.pantry },
    { name: '다용도', rx: w * 0.8, ry: h * 0.2, rw: w * 0.2, rh: h * 0.2, fill: C.util },
    { name: '안방', rx: 0, ry: h * 0.4, rw: w * 0.35, rh: h * 0.35, fill: C.master, furniture: 'bed-master' },
    { name: '드레스룸', rx: 0, ry: h * 0.75, rw: w * 0.18, rh: h * 0.25, fill: C.dress, furniture: 'closet' },
    { name: '주욕실', rx: w * 0.18, ry: h * 0.75, rw: w * 0.17, rh: h * 0.25, fill: C.bath, furniture: 'bath' },
    { name: '침실2', rx: w * 0.35, ry: h * 0.4, rw: w * 0.3, rh: h * 0.3, fill: C.bed2, furniture: 'bed-single' },
    { name: '침실3', rx: w * 0.65, ry: h * 0.4, rw: w * 0.35, rh: h * 0.3, fill: C.bed3, furniture: 'bed-single' },
    { name: '서재', rx: w * 0.35, ry: h * 0.7, rw: w * 0.25, rh: h * 0.3, fill: C.study, furniture: 'desk' },
    { name: '보조욕실', rx: w * 0.6, ry: h * 0.7, rw: w * 0.18, rh: h * 0.3, fill: C.bath, furniture: 'toilet' },
    { name: '현관', rx: w * 0.78, ry: h * 0.7, rw: w * 0.22, rh: h * 0.3, fill: C.entry, furniture: 'shoe' },
  ], w, m)
}

function threePlusB(w: number, h: number, m: boolean): RoomDef[] {
  return applyMirror([
    { name: '거실', rx: 0, ry: 0, rw: w * 0.5, rh: h * 0.42, fill: C.living, furniture: 'sofa' },
    { name: '주방/식당', rx: w * 0.5, ry: 0, rw: w * 0.5, rh: h * 0.42, fill: C.kitchen, furniture: 'kitchen' },
    { name: '안방', rx: 0, ry: h * 0.42, rw: w * 0.38, rh: h * 0.33, fill: C.master, furniture: 'bed-master' },
    { name: '침실2', rx: w * 0.38, ry: h * 0.42, rw: w * 0.3, rh: h * 0.33, fill: C.bed2, furniture: 'bed-single' },
    { name: '침실3', rx: w * 0.68, ry: h * 0.42, rw: w * 0.32, rh: h * 0.33, fill: C.bed3, furniture: 'bed-single' },
    { name: '드레스룸', rx: 0, ry: h * 0.75, rw: w * 0.2, rh: h * 0.25, fill: C.dress, furniture: 'closet' },
    { name: '주욕실', rx: w * 0.2, ry: h * 0.75, rw: w * 0.18, rh: h * 0.25, fill: C.bath, furniture: 'bath' },
    { name: '서재', rx: w * 0.38, ry: h * 0.75, rw: w * 0.22, rh: h * 0.25, fill: C.study, furniture: 'desk' },
    { name: '보조욕실', rx: w * 0.6, ry: h * 0.75, rw: w * 0.15, rh: h * 0.25, fill: C.bath, furniture: 'toilet' },
    { name: '현관', rx: w * 0.75, ry: h * 0.75, rw: w * 0.25, rh: h * 0.25, fill: C.entry, furniture: 'shoe' },
  ], w, m)
}

function threePlusC(w: number, h: number, m: boolean): RoomDef[] { return threePlusA(w, h, !m) } // A의 미러
function threePlusD(w: number, h: number, m: boolean): RoomDef[] { return threePlusB(w, h, !m) } // B의 미러

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 7. 포룸 (115~135㎡) — 4변형
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function fourRoomA(w: number, h: number, m: boolean): RoomDef[] {
  return applyMirror([
    { name: '거실', rx: 0, ry: 0, rw: w * 0.45, rh: h * 0.38, fill: C.living, furniture: 'sofa' },
    { name: '주방/식당', rx: w * 0.45, ry: 0, rw: w * 0.35, rh: h * 0.38, fill: C.kitchen, furniture: 'kitchen' },
    { name: '팬트리', rx: w * 0.8, ry: 0, rw: w * 0.2, rh: h * 0.18, fill: C.pantry },
    { name: '다용도', rx: w * 0.8, ry: h * 0.18, rw: w * 0.2, rh: h * 0.2, fill: C.util },
    { name: '안방', rx: 0, ry: h * 0.38, rw: w * 0.32, rh: h * 0.32, fill: C.master, furniture: 'bed-master' },
    { name: '침실2', rx: w * 0.32, ry: h * 0.38, rw: w * 0.24, rh: h * 0.32, fill: C.bed2, furniture: 'bed-single' },
    { name: '침실3', rx: w * 0.56, ry: h * 0.38, rw: w * 0.24, rh: h * 0.32, fill: C.bed3, furniture: 'bed-single' },
    { name: '침실4', rx: w * 0.8, ry: h * 0.38, rw: w * 0.2, rh: h * 0.32, fill: C.bed4, furniture: 'bed-single' },
    { name: '드레스룸', rx: 0, ry: h * 0.7, rw: w * 0.18, rh: h * 0.3, fill: C.dress, furniture: 'closet' },
    { name: '주욕실', rx: w * 0.18, ry: h * 0.7, rw: w * 0.17, rh: h * 0.3, fill: C.bath, furniture: 'bath' },
    { name: '서재', rx: w * 0.35, ry: h * 0.7, rw: w * 0.22, rh: h * 0.3, fill: C.study, furniture: 'desk' },
    { name: '보조욕실', rx: w * 0.57, ry: h * 0.7, rw: w * 0.15, rh: h * 0.3, fill: C.bath, furniture: 'toilet' },
    { name: '현관', rx: w * 0.72, ry: h * 0.7, rw: w * 0.28, rh: h * 0.3, fill: C.entry, furniture: 'shoe' },
  ], w, m)
}

function fourRoomB(w: number, h: number, m: boolean): RoomDef[] { return fourRoomA(w, h, !m) }
function fourRoomC(w: number, h: number, m: boolean): RoomDef[] {
  return applyMirror([
    { name: '거실', rx: 0, ry: 0, rw: w * 0.55, rh: h * 0.35, fill: C.living, furniture: 'sofa' },
    { name: '주방/식당', rx: w * 0.55, ry: 0, rw: w * 0.45, rh: h * 0.35, fill: C.kitchen, furniture: 'kitchen' },
    { name: '안방', rx: 0, ry: h * 0.35, rw: w * 0.3, rh: h * 0.35, fill: C.master, furniture: 'bed-master' },
    { name: '침실2', rx: w * 0.3, ry: h * 0.35, rw: w * 0.25, rh: h * 0.35, fill: C.bed2, furniture: 'bed-single' },
    { name: '침실3', rx: w * 0.55, ry: h * 0.35, rw: w * 0.25, rh: h * 0.35, fill: C.bed3, furniture: 'bed-single' },
    { name: '서재/침실4', rx: w * 0.8, ry: h * 0.35, rw: w * 0.2, rh: h * 0.35, fill: C.bed4, furniture: 'desk' },
    { name: '드레스룸', rx: 0, ry: h * 0.7, rw: w * 0.17, rh: h * 0.3, fill: C.dress, furniture: 'closet' },
    { name: '주욕실', rx: w * 0.17, ry: h * 0.7, rw: w * 0.18, rh: h * 0.3, fill: C.bath, furniture: 'bath' },
    { name: '보조욕실', rx: w * 0.35, ry: h * 0.7, rw: w * 0.15, rh: h * 0.3, fill: C.bath, furniture: 'toilet' },
    { name: '팬트리', rx: w * 0.5, ry: h * 0.7, rw: w * 0.15, rh: h * 0.3, fill: C.pantry },
    { name: '다용도', rx: w * 0.65, ry: h * 0.7, rw: w * 0.12, rh: h * 0.3, fill: C.util },
    { name: '현관', rx: w * 0.77, ry: h * 0.7, rw: w * 0.23, rh: h * 0.3, fill: C.entry, furniture: 'shoe' },
  ], w, m)
}
function fourRoomD(w: number, h: number, m: boolean): RoomDef[] { return fourRoomC(w, h, !m) }

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 8. 복층 (가변) — 4변형
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function duplexA(w: number, h: number, m: boolean): RoomDef[] {
  // 하층: 거실+주방+현관+욕실 / 상층: 안방+침실+드레스룸+서재
  const splitH = h * 0.5
  return applyMirror([
    { name: '거실 (하)', rx: 0, ry: 0, rw: w * 0.55, rh: splitH, fill: C.living, furniture: 'sofa' },
    { name: '주방 (하)', rx: w * 0.55, ry: 0, rw: w * 0.45, rh: splitH * 0.65, fill: C.kitchen, furniture: 'kitchen' },
    { name: '현관 (하)', rx: w * 0.55, ry: splitH * 0.65, rw: w * 0.25, rh: splitH * 0.35, fill: C.entry, furniture: 'shoe' },
    { name: '욕실 (하)', rx: w * 0.8, ry: splitH * 0.65, rw: w * 0.2, rh: splitH * 0.35, fill: C.bath, furniture: 'toilet' },
    { name: '안방 (상)', rx: 0, ry: splitH, rw: w * 0.4, rh: h - splitH, fill: C.master, furniture: 'bed-master' },
    { name: '침실2 (상)', rx: w * 0.4, ry: splitH, rw: w * 0.3, rh: (h - splitH) * 0.6, fill: C.bed2, furniture: 'bed-single' },
    { name: '서재 (상)', rx: w * 0.7, ry: splitH, rw: w * 0.3, rh: (h - splitH) * 0.6, fill: C.study, furniture: 'desk' },
    { name: '드레스룸 (상)', rx: w * 0.4, ry: splitH + (h - splitH) * 0.6, rw: w * 0.3, rh: (h - splitH) * 0.4, fill: C.dress, furniture: 'closet' },
    { name: '주욕실 (상)', rx: w * 0.7, ry: splitH + (h - splitH) * 0.6, rw: w * 0.3, rh: (h - splitH) * 0.4, fill: C.bath, furniture: 'bath' },
  ], w, m)
}
function duplexB(w: number, h: number, m: boolean): RoomDef[] { return duplexA(w, h, !m) }
function duplexC(w: number, h: number, m: boolean): RoomDef[] {
  const splitH = h * 0.48
  return applyMirror([
    { name: '거실 (하)', rx: 0, ry: 0, rw: w * 0.6, rh: splitH, fill: C.living, furniture: 'sofa' },
    { name: '주방/식당 (하)', rx: w * 0.6, ry: 0, rw: w * 0.4, rh: splitH * 0.7, fill: C.kitchen, furniture: 'kitchen' },
    { name: '욕실 (하)', rx: w * 0.6, ry: splitH * 0.7, rw: w * 0.2, rh: splitH * 0.3, fill: C.bath, furniture: 'toilet' },
    { name: '현관 (하)', rx: w * 0.8, ry: splitH * 0.7, rw: w * 0.2, rh: splitH * 0.3, fill: C.entry, furniture: 'shoe' },
    { name: '안방 (상)', rx: 0, ry: splitH, rw: w * 0.35, rh: h - splitH, fill: C.master, furniture: 'bed-master' },
    { name: '침실2 (상)', rx: w * 0.35, ry: splitH, rw: w * 0.25, rh: (h - splitH) * 0.55, fill: C.bed2, furniture: 'bed-single' },
    { name: '침실3 (상)', rx: w * 0.6, ry: splitH, rw: w * 0.4, rh: (h - splitH) * 0.55, fill: C.bed3, furniture: 'bed-single' },
    { name: '드레스룸 (상)', rx: w * 0.35, ry: splitH + (h - splitH) * 0.55, rw: w * 0.22, rh: (h - splitH) * 0.45, fill: C.dress, furniture: 'closet' },
    { name: '주욕실 (상)', rx: w * 0.57, ry: splitH + (h - splitH) * 0.55, rw: w * 0.2, rh: (h - splitH) * 0.45, fill: C.bath, furniture: 'bath' },
    { name: '서재 (상)', rx: w * 0.77, ry: splitH + (h - splitH) * 0.55, rw: w * 0.23, rh: (h - splitH) * 0.45, fill: C.study, furniture: 'desk' },
  ], w, m)
}
function duplexD(w: number, h: number, m: boolean): RoomDef[] { return duplexC(w, h, !m) }

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 전체 템플릿 카탈로그 (8타입 × S/M/L × 4변형 = 96가지)
// + 크기별 추천 폭/높이
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface SizeSpec { area: number; w: number; h: number }
const SIZES: Record<string, Record<'S'|'M'|'L', SizeSpec>> = {
  '원룸':    { S: { area: 16, w: 55, h: 65 },  M: { area: 20, w: 60, h: 72 },  L: { area: 24, w: 65, h: 80 } },
  '1.5룸':  { S: { area: 24, w: 60, h: 75 },  M: { area: 28, w: 68, h: 82 },  L: { area: 33, w: 75, h: 90 } },
  '투룸':    { S: { area: 33, w: 75, h: 90 },  M: { area: 42, w: 85, h: 100 }, L: { area: 49, w: 90, h: 110 } },
  '투룸+':   { S: { area: 46, w: 85, h: 105 }, M: { area: 52, w: 92, h: 112 }, L: { area: 59, w: 100, h: 120 } },
  '쓰리룸':  { S: { area: 59, w: 95, h: 115 }, M: { area: 72, w: 105, h: 125 },L: { area: 84, w: 115, h: 135 } },
  '쓰리룸+': { S: { area: 84, w: 110, h: 130 },M: { area: 100, w: 125, h: 145},L: { area: 115, w: 135, h: 155 } },
  '포룸':    { S: { area: 115, w: 130, h: 150 },M:{ area: 125, w: 140, h: 160},L: { area: 135, w: 150, h: 170 } },
  '복층':    { S: { area: 60, w: 100, h: 130 }, M: { area: 85, w: 120, h: 150 },L: { area: 115, w: 140, h: 170 } },
}

const GENERATORS: Record<string, ((w:number,h:number,m:boolean)=>RoomDef[])[]> = {
  '원룸':    [studioA, studioB, studioC, studioD],
  '1.5룸':  [oneHalfA, oneHalfB, oneHalfC, oneHalfD],
  '투룸':    [twoRoomA, twoRoomB, twoRoomC, twoRoomD],
  '투룸+':   [twoPlusA, twoPlusB, twoPlusC, twoPlusD],
  '쓰리룸':  [threeRoomA, threeRoomB, threeRoomC, threeRoomD],
  '쓰리룸+': [threePlusA, threePlusB, threePlusC, threePlusD],
  '포룸':    [fourRoomA, fourRoomB, fourRoomC, fourRoomD],
  '복층':    [duplexA, duplexB, duplexC, duplexD],
}

const ROOM_COUNTS: Record<string, number> = {
  '원룸': 1, '1.5룸': 1, '투룸': 2, '투룸+': 2, '쓰리룸': 3, '쓰리룸+': 3, '포룸': 4, '복층': 3,
}
const BATH_COUNTS: Record<string, number> = {
  '원룸': 1, '1.5룸': 1, '투룸': 1, '투룸+': 2, '쓰리룸': 2, '쓰리룸+': 2, '포룸': 2, '복층': 2,
}
const DESCRIPTIONS: Record<string, string> = {
  '원룸': '1인 가구 · 도시형생활주택',
  '1.5룸': '1인 · 오피스텔/도시형',
  '투룸': '신혼 · 1~2인',
  '투룸+': '신혼 · 소가족',
  '쓰리룸': '가족 · 표준',
  '쓰리룸+': '프리미엄 · 가족',
  '포룸': '프리미엄 · 대가족',
  '복층': '테라스하우스 · 프리미엄',
}

// 전체 카탈로그 생성
export function buildCatalog(): UnitTemplate[] {
  const catalog: UnitTemplate[] = []
  const types = Object.keys(GENERATORS)
  const sizes: ('S'|'M'|'L')[] = ['S', 'M', 'L']
  const variants = ['A', 'B', 'C', 'D']

  for (const type of types) {
    for (const size of sizes) {
      const spec = SIZES[type][size]
      const gens = GENERATORS[type]
      for (let vi = 0; vi < variants.length; vi++) {
        catalog.push({
          id: `${type}-${size}-${variants[vi]}`,
          name: `${type} ${spec.area}㎡ ${variants[vi]}타입`,
          type,
          variant: variants[vi],
          size,
          area: spec.area,
          rooms: ROOM_COUNTS[type],
          baths: BATH_COUNTS[type],
          description: DESCRIPTIONS[type],
          generate: (w, h, mirror) => gens[vi](w, h, mirror),
        })
      }
    }
  }
  return catalog
}

// 카탈로그 싱글턴
let _catalog: UnitTemplate[] | null = null
export function getCatalog(): UnitTemplate[] {
  if (!_catalog) _catalog = buildCatalog()
  return _catalog
}

// 타입+사이즈로 템플릿 찾기
export function getTemplate(type: string, size: 'S'|'M'|'L' = 'M', variant: string = 'A'): UnitTemplate | undefined {
  return getCatalog().find(t => t.type === type && t.size === size && t.variant === variant)
}

// 타입별 모든 변형 가져오기
export function getVariants(type: string, size: 'S'|'M'|'L' = 'M'): UnitTemplate[] {
  return getCatalog().filter(t => t.type === type && t.size === size)
}

// 전체 타입 목록
export function getTypes(): string[] {
  return Object.keys(GENERATORS)
}

// 사이즈 스펙 가져오기
export function getSizeSpec(type: string, size: 'S'|'M'|'L'): SizeSpec {
  return SIZES[type]?.[size] || { area: 59, w: 90, h: 110 }
}

// ============================================================
// 패턴 기반 실 비율 조정 (사용자 선택 패턴 → 평면 반영)
// ============================================================

interface RoomModifier {
  target: string[]      // 대상 실 이름 (부분 매칭)
  scaleW?: number       // 폭 배율 (1.1 = +10%)
  scaleH?: number       // 높이 배율
  rename?: string       // 이름 변경
  addFurniture?: string // 가구 추가/변경
  fill?: string         // 색상 변경
}

const PATTERN_ROOM_MODIFIERS: Record<string, RoomModifier[]> = {
  // 🏠 실·생활 패턴
  'child-realm': [
    { target: ['침실2', '침실3'], scaleW: 1.08, scaleH: 1.08 }, // 아이 방 확대
  ],
  'couple-realm': [
    { target: ['안방', '주침실'], scaleW: 1.1, scaleH: 1.05 }, // 안방 확대
  ],
  'storage-wall': [
    { target: ['드레스룸', 'DR'], scaleW: 1.15, scaleH: 1.1 }, // 수납 확대
  ],
  'bathing-room': [
    { target: ['주욕실', '욕실'], scaleW: 1.1, scaleH: 1.1 }, // 욕실 확대
  ],
  'open-kitchen': [
    { target: ['주방', '주방/식당'], scaleW: 1.12 }, // 주방 확대
  ],
  'home-workshop': [
    { target: ['다용도', '서재'], rename: '홈오피스', addFurniture: 'desk', fill: '#fdf4ff' },
  ],
  'window-place': [
    { target: ['거실'], fill: '#f0fdf4' }, // 거실 강조 (창가 자리)
  ],
  'indoor-sun': [
    { target: ['거실'], scaleW: 1.08 }, // 거실 확대 (밝은 실내)
  ],
  'private-terrace': [
    { target: ['발코니'], scaleW: 1.2, scaleH: 1.15 }, // 테라스 확대
  ],
  'sleeping-sun': [
    { target: ['안방', '주침실'], fill: '#fef9c3' }, // 동향 침실 강조
  ],

  // 🏢 건물·동선 패턴
  'balcony': [
    { target: ['발코니'], scaleW: 1.2 },
  ],
  'ceiling-height': [], // 평면에는 미반영 (단면에 반영)
  'natural-vent': [
    { target: ['거실', '안방'], fill: '#ecfdf5' }, // 환기 좋은 실 표시
  ],
  'rooftop': [], // 평면에는 미반영

  // 🏘️ 단지·외부 패턴 — 단위세대 평면에는 미반영 (배치도에 반영)
  'courtyard': [], 'neighbors': [], 'accessible-green': [], 'walk-safe': [],
  'shop-street': [], 'tree-view': [], 'small-parking': [], 'connected-play': [],
  'garden-wall': [], 'outdoor-room': [], 'main-entrance': [], 'local-sports': [],
  'fruit-trees': [], 'earth-connect': [],
}

export function applyPatternModifiers(rooms: RoomDef[], selectedPatterns: string[]): RoomDef[] {
  if (!selectedPatterns?.length) return rooms

  // 원본 보존을 위해 깊은 복사
  let modified = rooms.map(r => ({ ...r }))

  for (const patternId of selectedPatterns) {
    const modifiers = PATTERN_ROOM_MODIFIERS[patternId]
    if (!modifiers?.length) continue

    for (const mod of modifiers) {
      modified = modified.map(room => {
        const isTarget = mod.target.some(t => room.name.includes(t))
        if (!isTarget) return room

        const updated = { ...room }
        if (mod.scaleW) {
          const dw = room.rw * (mod.scaleW - 1)
          updated.rw = room.rw + dw
        }
        if (mod.scaleH) {
          const dh = room.rh * (mod.scaleH - 1)
          updated.rh = room.rh + dh
        }
        if (mod.rename) updated.name = mod.rename
        if (mod.addFurniture) updated.furniture = mod.addFurniture
        if (mod.fill) updated.fill = mod.fill

        return updated
      })
    }
  }

  return modified
}
