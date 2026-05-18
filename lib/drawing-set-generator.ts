/**
 * Multi-Sheet 실시설계 도면 세트 생성기
 * 
 * 한 번 클릭 → 전체 도면 세트 ZIP 다운로드
 * 도면 번호 체계: A-건축, S-구조, M-기계, E-전기, F-소방
 */

import type { StructuralGrid } from './structural-grid'
import type { StructuralCalc } from './structural-calc'
import type { MEPDesign } from './mep-design'
import { generateSchedules, type WindowSpec, type DoorSpec, type FinishSpec } from './schedule-generator'

// ━━━ DXF 기본 헬퍼 ━━━
function dxfHeader(layers: { name: string; color: number }[]): string {
  let h = `  0\nSECTION\n  2\nHEADER\n  9\n$ACADVER\n  1\nAC1009\n  0\nENDSEC\n  0\nSECTION\n  2\nTABLES\n  0\nTABLE\n  2\nLAYER\n 70\n${layers.length}\n`
  for (const l of layers) {
    h += `  0\nLAYER\n  2\n${l.name}\n 70\n0\n 62\n${l.color}\n  6\nCONTINUOUS\n`
  }
  h += `  0\nENDTAB\n  0\nENDSEC\n  0\nSECTION\n  2\nENTITIES\n`
  return h
}

function dxfFooter(): string { return `  0\nENDSEC\n  0\nEOF\n` }

function dxfLine(x1: number, y1: number, x2: number, y2: number, layer: string): string {
  return `  0\nLINE\n  8\n${layer}\n 10\n${x1}\n 20\n${y1}\n 11\n${x2}\n 21\n${y2}\n`
}

function dxfText(x: number, y: number, text: string, h: number, layer: string): string {
  return `  0\nTEXT\n  8\n${layer}\n 10\n${x}\n 20\n${y}\n 40\n${h}\n  1\n${text}\n`
}

function dxfRect(x: number, y: number, w: number, h: number, layer: string): string {
  return dxfLine(x, y, x + w, y, layer) + dxfLine(x + w, y, x + w, y + h, layer) +
    dxfLine(x + w, y + h, x, y + h, layer) + dxfLine(x, y + h, x, y, layer)
}

// ━━━ 타이틀 블록 (모든 도면 공통) ━━━
function titleBlock(sheetNo: string, sheetTitle: string, project: string, address: string, scale: string): string {
  const x = -2000, y = -2500, w = 15000, h = 2000
  let out = dxfRect(x, y, w, h, 'TITLE')
  // 도면 번호
  out += dxfText(x + 200, y + 1400, sheetNo, 500, 'TITLE')
  // 도면 제목
  out += dxfText(x + 3000, y + 1400, sheetTitle, 350, 'TITLE')
  // 프로젝트명
  out += dxfText(x + 3000, y + 800, project, 200, 'TITLE')
  // 주소
  out += dxfText(x + 3000, y + 400, address, 150, 'TITLE')
  // 축척
  out += dxfText(x + 12000, y + 1400, `SCALE: ${scale}`, 200, 'TITLE')
  // 날짜
  out += dxfText(x + 12000, y + 800, new Date().toISOString().split('T')[0], 150, 'TITLE')
  // Archi-Scan
  out += dxfText(x + 12000, y + 400, 'Archi-Scan AI', 150, 'TITLE')
  // 구분선
  out += dxfLine(x + 2800, y, x + 2800, y + h, 'TITLE')
  out += dxfLine(x + 11500, y, x + 11500, y + h, 'TITLE')
  out += dxfLine(x, y + 1200, x + w, y + 1200, 'TITLE')
  return out
}

// ━━━ A-001: 도면 목록 ━━━
function sheetDrawingIndex(sheets: { no: string; title: string }[], project: string, address: string): string {
  const layers = [{ name: 'TITLE', color: 7 }, { name: 'TEXT', color: 2 }]
  let out = dxfHeader(layers)
  out += titleBlock('A-001', '도면 목록 (DRAWING INDEX)', project, address, 'N.T.S.')
  
  let y = 8000
  out += dxfText(0, y, '[ DRAWING INDEX ]', 400, 'TEXT')
  y -= 600
  out += dxfText(0, y, 'NO', 200, 'TEXT')
  out += dxfText(3000, y, 'DRAWING TITLE', 200, 'TEXT')
  y -= 400
  out += dxfLine(0, y + 350, 12000, y + 350, 'TEXT')
  
  for (const s of sheets) {
    out += dxfText(0, y, s.no, 180, 'TEXT')
    out += dxfText(3000, y, s.title, 180, 'TEXT')
    y -= 350
  }
  
  out += dxfFooter()
  return out
}

// ━━━ A-101~103: 층별 평면도 ━━━
function sheetFloorPlan(floor: number, totalFloors: number, grid: StructuralGrid, project: string, address: string): string {
  const layers = [
    { name: 'TITLE', color: 7 }, { name: 'A-GRID', color: 1 },
    { name: 'A-COLS', color: 7 }, { name: 'A-WALL', color: 7 },
    { name: 'A-ROOM', color: 2 }, { name: 'A-DIMS', color: 4 },
    { name: 'A-DOOR', color: 2 }, { name: 'A-WINDOW', color: 5 },
  ]
  let out = dxfHeader(layers)
  
  const label = floor === 1 ? '1층 평면도' : floor >= totalFloors ? `${floor}층 (최상층) 평면도` : `${floor}층 평면도`
  out += titleBlock(`A-${100 + floor}`, label, project, address, '1/100')
  
  const bayW = grid.bayWidthM * 1000
  const bayD = grid.bayDepthM * 1000
  const totalW = grid.totalWidthM * 1000
  const totalD = grid.totalDepthM * 1000
  
  // 그리드 라인
  for (let x = 0; x <= grid.baysX; x++) {
    out += dxfLine(x * bayW, 0, x * bayW, totalD, 'A-GRID')
    out += dxfText(x * bayW, totalD + 400, String.fromCharCode(65 + x), 250, 'A-GRID')
  }
  for (let y = 0; y <= grid.baysY; y++) {
    out += dxfLine(0, y * bayD, totalW, y * bayD, 'A-GRID')
    out += dxfText(-600, y * bayD, String(y + 1), 250, 'A-GRID')
  }
  
  // 기둥 (400×400mm)
  for (const col of grid.columns) {
    const cx = col.x * bayW - 200, cy = col.y * bayD - 200
    out += dxfRect(cx, cy, 400, 400, 'A-COLS')
  }
  
  // 방
  for (const room of grid.rooms) {
    const rx = room.gridX * bayW, ry = (grid.baysY - room.gridY - room.spanY) * bayD
    const rw = room.spanX * bayW, rh = room.spanY * bayD
    // 벽체
    out += dxfRect(rx, ry, rw, rh, 'A-WALL')
    // 방 이름 + 면적
    out += dxfText(rx + rw / 2 - 300, ry + rh / 2 + 100, room.label, 180, 'A-ROOM')
    out += dxfText(rx + rw / 2 - 300, ry + rh / 2 - 200, `${room.area.toFixed(1)}m2`, 120, 'A-ROOM')
    // 문
    if (room.hasDoor) out += dxfText(rx + 100, ry + rh - 200, 'D', 150, 'A-DOOR')
    // 창문
    if (room.hasWindow) out += dxfText(rx + rw - 300, ry + rh / 2, 'W', 150, 'A-WINDOW')
  }
  
  // 치수선
  out += dxfText(totalW / 2, -500, `${(totalW / 1000).toFixed(1)}m`, 200, 'A-DIMS')
  out += dxfText(-1200, totalD / 2, `${(totalD / 1000).toFixed(1)}m`, 200, 'A-DIMS')
  
  out += dxfFooter()
  return out
}

// ━━━ A-201: 입면도 ━━━
function sheetElevation(floors: number, floorH: number, grid: StructuralGrid, project: string, address: string): string {
  const layers = [{ name: 'TITLE', color: 7 }, { name: 'ELEV', color: 7 }, { name: 'DIMS', color: 4 }, { name: 'WINDOW', color: 5 }]
  let out = dxfHeader(layers)
  out += titleBlock('A-201', '정면도 (FRONT ELEVATION)', project, address, '1/100')
  
  const totalW = grid.totalWidthM * 1000
  const totalH = floors * floorH
  
  // 외벽 윤곽
  out += dxfRect(0, 0, totalW, totalH, 'ELEV')
  // 층 구분선
  for (let f = 1; f < floors; f++) {
    out += dxfLine(0, f * floorH, totalW, f * floorH, 'ELEV')
    out += dxfText(-800, f * floorH + floorH / 2, `${f + 1}F`, 180, 'DIMS')
  }
  out += dxfText(-800, floorH / 2, '1F', 180, 'DIMS')
  
  // 창문 (각 층별)
  const winW = 1800, winH = 1500, sillH = 900
  for (let f = 0; f < floors; f++) {
    const baseY = f * floorH
    const numWin = Math.min(grid.baysX, 4)
    const gap = totalW / (numWin + 1)
    for (let w = 0; w < numWin; w++) {
      const wx = gap * (w + 1) - winW / 2
      out += dxfRect(wx, baseY + sillH, winW, winH, 'WINDOW')
      // 이중선 (유리)
      out += dxfLine(wx + winW / 2, baseY + sillH, wx + winW / 2, baseY + sillH + winH, 'WINDOW')
    }
  }
  
  // 치수
  out += dxfText(totalW + 400, totalH / 2, `H=${(totalH / 1000).toFixed(1)}m`, 180, 'DIMS')
  out += dxfText(totalW / 2, -500, `W=${(totalW / 1000).toFixed(1)}m`, 180, 'DIMS')
  
  out += dxfFooter()
  return out
}

// ━━━ A-301: 단면도 ━━━
function sheetSection(floors: number, floorH: number, grid: StructuralGrid, calc: StructuralCalc, project: string, address: string): string {
  const layers = [{ name: 'TITLE', color: 7 }, { name: 'SECT', color: 7 }, { name: 'DIMS', color: 4 }, { name: 'HATC', color: 8 }]
  let out = dxfHeader(layers)
  out += titleBlock('A-301', '단면도 (SECTION A-A)', project, address, '1/100')
  
  const totalW = grid.totalWidthM * 1000
  const totalH = floors * floorH
  const slabT = calc.slab.thickness
  const foundT = calc.foundation.thickness
  
  // 지반선 (GL)
  out += dxfLine(-2000, 0, totalW + 2000, 0, 'SECT')
  out += dxfText(-1800, 200, 'GL', 180, 'DIMS')
  
  // 기초
  out += dxfRect(-500, -foundT - 1200, totalW + 1000, foundT, 'HATC')
  out += dxfText(totalW / 2, -foundT - 1200 + foundT / 2, `기초 ${foundT}mm`, 150, 'DIMS')
  
  // 각 층
  for (let f = 0; f <= floors; f++) {
    const y = f * floorH
    // 슬래브
    out += dxfRect(0, y, totalW, slabT, 'SECT')
    if (f < floors) {
      out += dxfText(totalW + 400, y + floorH / 2, `${f + 1}F`, 200, 'DIMS')
      out += dxfText(totalW + 400, y + floorH / 2 - 300, `CH=${floorH - slabT}`, 120, 'DIMS')
    }
  }
  
  // 외벽 (양쪽)
  out += dxfLine(0, 0, 0, totalH + slabT, 'SECT')
  out += dxfLine(200, 0, 200, totalH + slabT, 'SECT')
  out += dxfLine(totalW, 0, totalW, totalH + slabT, 'SECT')
  out += dxfLine(totalW - 200, 0, totalW - 200, totalH + slabT, 'SECT')
  
  // 전체 높이 치수
  out += dxfText(-1500, totalH / 2, `총 높이 ${(totalH / 1000).toFixed(1)}m`, 180, 'DIMS')
  
  out += dxfFooter()
  return out
}

// ━━━ A-501: 창호 상세 ━━━
function sheetWindowDetail(windows: WindowSpec[], project: string, address: string): string {
  const layers = [{ name: 'TITLE', color: 7 }, { name: 'DETAIL', color: 7 }, { name: 'DIMS', color: 4 }, { name: 'TEXT', color: 2 }]
  let out = dxfHeader(layers)
  out += titleBlock('A-501', '창호 상세도 (WINDOW DETAIL)', project, address, '1/20')
  
  let x = 0
  for (const w of windows) {
    const scale = 0.5 // 1/20 스케일 표현
    const ww = w.width * scale, wh = w.height * scale
    
    // 창호 입면 심볼
    out += dxfRect(x, 0, ww, wh, 'DETAIL')
    // 이중선 (유리)
    out += dxfLine(x + ww / 2, 0, x + ww / 2, wh, 'DETAIL')
    // 가로 분할선
    out += dxfLine(x, wh * 0.6, x + ww, wh * 0.6, 'DETAIL')
    
    // 라벨
    out += dxfText(x + ww / 2 - 200, wh + 200, w.id, 180, 'TEXT')
    out += dxfText(x + ww / 2 - 300, wh + 500, w.type, 120, 'TEXT')
    out += dxfText(x + ww / 2 - 400, -300, `${w.width}×${w.height}`, 120, 'DIMS')
    out += dxfText(x + ww / 2 - 300, -600, w.material, 100, 'TEXT')
    out += dxfText(x + ww / 2 - 300, -850, w.glass, 100, 'TEXT')
    
    x += ww + 1500
  }
  
  out += dxfFooter()
  return out
}

// ━━━ A-601: 마감표 ━━━
function sheetFinishSchedule(finishes: FinishSpec[], project: string, address: string): string {
  const layers = [{ name: 'TITLE', color: 7 }, { name: 'TABLE', color: 7 }, { name: 'TEXT', color: 2 }]
  let out = dxfHeader(layers)
  out += titleBlock('A-601', '실내 마감표 (FINISH SCHEDULE)', project, address, 'N.T.S.')
  
  const colW = [2000, 3500, 3500, 3000, 2000, 1500]
  const headers = ['실명', '바닥', '벽', '천장', '걸레받이', 'CH(mm)']
  let y = 8000
  
  // 헤더
  let cx = 0
  for (let i = 0; i < headers.length; i++) {
    out += dxfText(cx + 100, y, headers[i], 200, 'TEXT')
    out += dxfRect(cx, y - 100, colW[i], 500, 'TABLE')
    cx += colW[i]
  }
  y -= 500
  
  // 데이터
  for (const f of finishes) {
    cx = 0
    const vals = [f.room, f.floor, f.wall, f.ceiling, f.baseboard, String(f.ceilingHeight)]
    for (let i = 0; i < vals.length; i++) {
      out += dxfText(cx + 100, y, vals[i], 150, 'TEXT')
      out += dxfRect(cx, y - 100, colW[i], 400, 'TABLE')
      cx += colW[i]
    }
    y -= 400
  }
  
  out += dxfFooter()
  return out
}

// ━━━ S-100: 구조 평면도 ━━━
function sheetStructuralPlan(grid: StructuralGrid, calc: StructuralCalc, project: string, address: string): string {
  const layers = [
    { name: 'TITLE', color: 7 }, { name: 'S-GRID', color: 1 },
    { name: 'S-COLS', color: 7 }, { name: 'S-BEAM', color: 3 },
    { name: 'S-DIMS', color: 4 }, { name: 'S-TEXT', color: 2 },
  ]
  let out = dxfHeader(layers)
  out += titleBlock('S-100', '구조 평면도 (STRUCTURAL PLAN)', project, address, '1/100')
  
  const bayW = grid.bayWidthM * 1000
  const bayD = grid.bayDepthM * 1000
  const totalW = grid.totalWidthM * 1000
  const totalD = grid.totalDepthM * 1000
  
  // 그리드
  for (let x = 0; x <= grid.baysX; x++) {
    out += dxfLine(x * bayW, -500, x * bayW, totalD + 500, 'S-GRID')
    out += dxfText(x * bayW - 100, totalD + 700, String.fromCharCode(65 + x), 250, 'S-GRID')
  }
  for (let y = 0; y <= grid.baysY; y++) {
    out += dxfLine(-500, y * bayD, totalW + 500, y * bayD, 'S-GRID')
    out += dxfText(-1000, y * bayD - 100, String(y + 1), 250, 'S-GRID')
  }
  
  // 기둥 (단면 크기 표시)
  const colSize = calc.columns.length > 0 ? calc.columns[0].width : 400
  for (const col of grid.columns) {
    const cx = col.x * bayW - colSize / 2, cy = col.y * bayD - colSize / 2
    out += dxfRect(cx, cy, colSize, colSize, 'S-COLS')
    // 대각선 (기둥 심볼)
    out += dxfLine(cx, cy, cx + colSize, cy + colSize, 'S-COLS')
    out += dxfLine(cx + colSize, cy, cx, cy + colSize, 'S-COLS')
  }
  
  // 보 (이중선)
  const beamW = calc.beams.length > 0 ? calc.beams[0].width : 300
  for (let x = 0; x <= grid.baysX; x++) {
    out += dxfLine(x * bayW - beamW / 2, 0, x * bayW - beamW / 2, totalD, 'S-BEAM')
    out += dxfLine(x * bayW + beamW / 2, 0, x * bayW + beamW / 2, totalD, 'S-BEAM')
  }
  for (let y = 0; y <= grid.baysY; y++) {
    out += dxfLine(0, y * bayD - beamW / 2, totalW, y * bayD - beamW / 2, 'S-BEAM')
    out += dxfLine(0, y * bayD + beamW / 2, totalW, y * bayD + beamW / 2, 'S-BEAM')
  }
  
  // 기둥/보 스케줄
  let ty = -3000
  out += dxfText(0, ty, '[ COLUMN/BEAM SCHEDULE ]', 250, 'S-TEXT')
  ty -= 500
  for (const c of calc.columns) {
    out += dxfText(0, ty, `${c.id}: ${c.width}x${c.depth} ${c.mainBar} ${c.tieBar}`, 150, 'S-TEXT')
    ty -= 350
  }
  for (const b of calc.beams) {
    out += dxfText(0, ty, `${b.id}: ${b.width}x${b.depth} T:${b.topBar} B:${b.bottomBar} ${b.stirrup}`, 150, 'S-TEXT')
    ty -= 350
  }
  
  out += dxfFooter()
  return out
}

// ━━━ M/E/F: 설비 평면도 ━━━
function sheetMEPPlan(mep: MEPDesign, grid: StructuralGrid, type: 'M' | 'E' | 'F', project: string, address: string): string {
  const titles = { M: '기계설비 평면도 (MECHANICAL PLAN)', E: '전기설비 평면도 (ELECTRICAL PLAN)', F: '소방설비 평면도 (FIRE PLAN)' }
  const sheetNos = { M: 'M-100', E: 'E-100', F: 'F-100' }
  const layers = [{ name: 'TITLE', color: 7 }, { name: 'GRID', color: 8 }, { name: 'MEP', color: type === 'M' ? 5 : type === 'E' ? 2 : 1 }, { name: 'TEXT', color: 2 }]
  
  let out = dxfHeader(layers)
  out += titleBlock(sheetNos[type], titles[type], project, address, '1/100')
  
  const bayW = grid.bayWidthM * 1000
  const bayD = grid.bayDepthM * 1000
  const totalW = grid.totalWidthM * 1000
  const totalD = grid.totalDepthM * 1000
  
  // 배경 그리드 (얇은 선)
  for (let x = 0; x <= grid.baysX; x++) out += dxfLine(x * bayW, 0, x * bayW, totalD, 'GRID')
  for (let y = 0; y <= grid.baysY; y++) out += dxfLine(0, y * bayD, totalW, y * bayD, 'GRID')
  
  // 방 이름
  for (const room of grid.rooms) {
    const rx = (room.gridX + room.spanX / 2) * bayW
    const ry = (grid.baysY - room.gridY - room.spanY / 2) * bayD
    out += dxfText(rx - 400, ry, room.label, 120, 'GRID')
  }
  
  if (type === 'E') {
    // 전기: 콘센트/스위치/조명 심볼
    for (const item of mep.electrical) {
      const ix = item.x * totalW, iy = (1 - item.y) * totalD
      const sym = item.type === 'outlet' ? '⊙' : item.type === 'switch' ? 'S' : item.type === 'light' ? '◎' : item.type === 'panel' ? '▣' : '●'
      out += dxfText(ix, iy, `${sym} ${item.label}`, 100, 'MEP')
    }
  } else if (type === 'M') {
    // 기계: 배관/덕트
    for (const item of mep.plumbing) {
      const ix = item.x * totalW, iy = (1 - item.y) * totalD
      if (item.endX !== undefined && item.endY !== undefined) {
        out += dxfLine(ix, iy, item.endX * totalW, (1 - item.endY) * totalD, 'MEP')
      }
      out += dxfText(ix, iy + 50, `${item.label} ∅${item.diameter}`, 80, 'TEXT')
    }
    for (const item of mep.hvac) {
      const ix = item.x * totalW, iy = (1 - item.y) * totalD
      out += dxfText(ix, iy, `${item.label} ${item.size}`, 100, 'MEP')
    }
  } else {
    // 소방: 감지기/스프링클러
    for (const item of mep.fire) {
      const ix = item.x * totalW, iy = (1 - item.y) * totalD
      const sym = item.type === 'detector' ? '◇' : item.type === 'sprinkler' ? '⊕' : item.type === 'extinguisher' ? '▲' : '☆'
      out += dxfText(ix, iy, `${sym} ${item.label}`, 100, 'MEP')
    }
  }
  
  out += dxfFooter()
  return out
}

// ━━━ 메인: 전체 도면 세트 생성 ━━━
export interface DrawingSheet {
  filename: string
  no: string
  title: string
  content: string
}

export function generateDrawingSet(params: {
  grid: StructuralGrid
  calc: StructuralCalc
  mep: MEPDesign
  floors: number
  floorHeight: number
  project: string
  address: string
}): DrawingSheet[] {
  const { grid, calc, mep, floors, floorHeight, project, address } = params
  const sch = generateSchedules(grid)
  const sheets: DrawingSheet[] = []
  
  // 층별 평면도
  const floorSheets: { no: string; title: string }[] = []
  for (let f = 1; f <= Math.min(floors, 3); f++) {
    const label = f === 1 ? '1층 평면도' : f >= floors ? `${f}층 최상층 평면도` : `${f}층 기준층 평면도`
    floorSheets.push({ no: `A-${100 + f}`, title: label })
  }
  if (floors > 3) floorSheets.push({ no: `A-${100 + floors}`, title: `${floors}층 최상층 평면도` })
  
  // 도면 목록 (마지막에 추가)
  const allSheets = [
    { no: 'A-001', title: '도면 목록' },
    ...floorSheets,
    { no: 'A-201', title: '정면도' },
    { no: 'A-301', title: '단면도 A-A' },
    { no: 'A-501', title: '창호 상세도' },
    { no: 'A-601', title: '실내 마감표' },
    { no: 'S-100', title: '구조 평면도' },
    { no: 'M-100', title: '기계설비 평면도' },
    { no: 'E-100', title: '전기설비 평면도' },
    { no: 'F-100', title: '소방설비 평면도' },
  ]
  
  // A-001: 도면 목록
  sheets.push({ filename: 'A-001_Drawing_Index.dxf', no: 'A-001', title: '도면 목록', content: sheetDrawingIndex(allSheets, project, address) })
  
  // A-101~: 층별 평면도
  for (let f = 1; f <= Math.min(floors, 3); f++) {
    sheets.push({ filename: `A-${100 + f}_Floor_Plan_${f}F.dxf`, no: `A-${100 + f}`, title: `${f}층 평면도`, content: sheetFloorPlan(f, floors, grid, project, address) })
  }
  if (floors > 3) {
    sheets.push({ filename: `A-${100 + floors}_Floor_Plan_${floors}F.dxf`, no: `A-${100 + floors}`, title: `${floors}층 최상층`, content: sheetFloorPlan(floors, floors, grid, project, address) })
  }
  
  // A-201: 입면도
  sheets.push({ filename: 'A-201_Front_Elevation.dxf', no: 'A-201', title: '정면도', content: sheetElevation(floors, floorHeight, grid, project, address) })
  
  // A-301: 단면도
  sheets.push({ filename: 'A-301_Section_AA.dxf', no: 'A-301', title: '단면도', content: sheetSection(floors, floorHeight, grid, calc, project, address) })
  
  // A-501: 창호 상세
  sheets.push({ filename: 'A-501_Window_Detail.dxf', no: 'A-501', title: '창호 상세', content: sheetWindowDetail(sch.windows, project, address) })
  
  // A-601: 마감표
  sheets.push({ filename: 'A-601_Finish_Schedule.dxf', no: 'A-601', title: '마감표', content: sheetFinishSchedule(sch.finishes, project, address) })
  
  // S-100: 구조 평면도
  sheets.push({ filename: 'S-100_Structural_Plan.dxf', no: 'S-100', title: '구조 평면도', content: sheetStructuralPlan(grid, calc, project, address) })
  
  // M/E/F: 설비 평면도
  sheets.push({ filename: 'M-100_Mechanical_Plan.dxf', no: 'M-100', title: '기계설비', content: sheetMEPPlan(mep, grid, 'M', project, address) })
  sheets.push({ filename: 'E-100_Electrical_Plan.dxf', no: 'E-100', title: '전기설비', content: sheetMEPPlan(mep, grid, 'E', project, address) })
  sheets.push({ filename: 'F-100_Fire_Plan.dxf', no: 'F-100', title: '소방설비', content: sheetMEPPlan(mep, grid, 'F', project, address) })
  
  return sheets
}
