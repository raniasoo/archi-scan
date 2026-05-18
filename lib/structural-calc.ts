/**
 * Phase 5: 구조 계산 자동화 엔진
 * 
 * KDS 41 10 15 (콘크리트 구조 설계기준)
 * KDS 41 30 00 (철근콘크리트 부재 설계)
 * 
 * 입력: 구조 그리드 (bay 크기, 층수)
 * 출력: 기둥/보 단면, 슬래브 두께, 배근 패턴
 */

import type { StructuralGrid } from './structural-grid'

// ━━━ 콘크리트 강도 ━━━
const FCK = 24 // MPa (24MPa = 일반 공동주택)
const FY = 400  // MPa (SD400 철근)

// ━━━ 기둥 단면 ━━━
export interface ColumnSection {
  id: string        // C1, C2...
  width: number     // mm
  depth: number     // mm
  mainBar: string   // 주근 (예: 8-D22)
  tieBar: string    // 띠철근 (예: D10@300)
  location: string  // 위치 설명
  loadRatio: number // 축하중비 (0~1)
}

// ━━━ 보 단면 ━━━
export interface BeamSection {
  id: string        // G1, G2...
  width: number     // mm
  depth: number     // mm
  topBar: string    // 상부근 (예: 3-D22)
  bottomBar: string // 하부근 (예: 2-D22)
  stirrup: string   // 전단보강근 (예: D10@200)
  span: number      // 경간 mm
  direction: 'X' | 'Y'
}

// ━━━ 슬래브 ━━━
export interface SlabSpec {
  thickness: number  // mm
  topMesh: string    // 상부 배근 (예: D10@200)
  bottomMesh: string // 하부 배근 (예: D10@200)
  type: string       // 1방향/2방향
}

// ━━━ 기초 ━━━
export interface FoundationSpec {
  type: string       // 매트기초/독립기초/줄기초
  thickness: number  // mm
  bottomBar: string  // 하부 배근
  topBar: string     // 상부 배근
  depth: number      // 근입 깊이 mm
}

export interface StructuralCalc {
  columns: ColumnSection[]
  beams: BeamSection[]
  slab: SlabSpec
  foundation: FoundationSpec
  summary: {
    fck: number         // 콘크리트 강도 MPa
    fy: number          // 철근 항복강도 MPa
    totalWeight: number // 건물 자중 kN
    soilPressure: number // 지반 반력 kN/m²
  }
}

// ━━━ 기둥 단면 계산 ━━━
// 간이법: N = (지지면적 × 층수 × 단위하중) → 필요 단면적 = N / (0.4 × fck)
function calcColumnSection(
  tributaryArea: number, // 지지 면적 m²
  floors: number,
  isCorner: boolean,
  isEdge: boolean,
): ColumnSection {
  const unitLoad = 12 // kN/m² (고정+활하중+마감)
  const axialLoad = tributaryArea * floors * unitLoad
  
  // 필요 단면적 (안전율 포함)
  const reqArea = (axialLoad * 1000) / (0.35 * FCK) // mm²
  
  // 표준 단면 선택 (50mm 단위)
  let size = Math.max(400, Math.ceil(Math.sqrt(reqArea) / 50) * 50)
  if (size > 800) size = 800 // 최대 800mm
  
  // 철근량 계산 (최소 철근비 0.01)
  const steelArea = Math.max(size * size * 0.01, reqArea * 0.04)
  const barDia = size >= 600 ? 25 : 22 // D25 or D22
  const barArea = barDia === 25 ? 507 : 387 // mm²
  const barCount = Math.max(4, Math.ceil(steelArea / barArea))
  
  const loadRatio = axialLoad / (0.85 * FCK * size * size / 1000)
  
  const loc = isCorner ? '모서리' : isEdge ? '외주' : '내부'
  
  return {
    id: '',
    width: size, depth: size,
    mainBar: `${barCount}-D${barDia}`,
    tieBar: `D10@${size >= 600 ? 250 : 300}`,
    location: loc,
    loadRatio: Math.min(1, loadRatio),
  }
}

// ━━━ 보 단면 계산 ━━━
// 간이법: h = L/12 (연속보), b = h × 0.5
function calcBeamSection(spanM: number, tributaryWidthM: number, direction: 'X' | 'Y'): BeamSection {
  const span = spanM * 1000
  
  // 보 깊이: L/12 (연속보), 최소 400mm
  let depth = Math.max(400, Math.ceil(span / 12 / 50) * 50)
  if (depth > 800) depth = 800
  
  // 보 폭: h × 0.4~0.6, 최소 300mm
  let width = Math.max(300, Math.ceil(depth * 0.5 / 50) * 50)
  
  // 하중 계산
  const unitLoad = 12 // kN/m²
  const lineLoad = unitLoad * tributaryWidthM // kN/m
  const moment = lineLoad * spanM * spanM / 10 // 연속보 Mo = wL²/10
  
  // 필요 철근량
  const d = depth - 60 // 유효깊이
  const reqAs = (moment * 1e6) / (0.87 * FY * d * 0.9)
  const barDia = depth >= 600 ? 25 : 22
  const barArea = barDia === 25 ? 507 : 387
  const bottomCount = Math.max(2, Math.ceil(reqAs / barArea))
  const topCount = Math.max(2, Math.ceil(bottomCount * 0.6))
  
  return {
    id: '', width, depth,
    topBar: `${topCount}-D${barDia}`,
    bottomBar: `${bottomCount}-D${barDia}`,
    stirrup: `D10@${depth >= 600 ? 150 : 200}`,
    span, direction,
  }
}

// ━━━ 슬래브 두께 계산 ━━━
function calcSlab(bayWM: number, bayDM: number): SlabSpec {
  const shortSpan = Math.min(bayWM, bayDM) * 1000
  const longSpan = Math.max(bayWM, bayDM) * 1000
  const ratio = longSpan / shortSpan
  
  // 1방향 vs 2방향
  const type = ratio > 2 ? '1방향' : '2방향'
  
  // 두께: L/30 (2방향), L/25 (1방향), 최소 150mm
  const minThickness = type === '2방향' ? shortSpan / 30 : shortSpan / 25
  const thickness = Math.max(150, Math.ceil(minThickness / 10) * 10)
  
  // 배근: 최소 철근비 0.0018 (수축/온도)
  const minAs = thickness * 1000 * 0.0018
  const barArea = 71.3 // D10
  const spacing = Math.min(300, Math.floor(barArea / (minAs / 1000)) * 10)
  
  return {
    thickness,
    topMesh: `D10@${spacing}`,
    bottomMesh: `D10@${Math.min(spacing, 200)}`,
    type,
  }
}

// ━━━ 기초 계산 ━━━
function calcFoundation(totalWeight: number, siteArea: number, floors: number): FoundationSpec {
  const soilBearing = 150 // kN/m² (보통 지반)
  const reqArea = totalWeight / soilBearing
  
  // 기초 타입 결정
  const coverRatio = reqArea / siteArea
  let type: string
  if (coverRatio > 0.5 || floors >= 5) {
    type = '매트기초'
  } else if (floors >= 3) {
    type = '줄기초'
  } else {
    type = '독립기초'
  }
  
  // 기초 두께
  const thickness = type === '매트기초' ? Math.max(500, floors * 80) :
                    type === '줄기초' ? Math.max(400, floors * 60) : 300
  
  const depth = Math.max(1200, floors * 200) // 근입 깊이
  
  return {
    type,
    thickness,
    bottomBar: `D16@${type === '매트기초' ? 150 : 200} 양방향`,
    topBar: `D13@${type === '매트기초' ? 200 : 250} 양방향`,
    depth,
  }
}

// ━━━ 메인 함수 ━━━
export function calculateStructure(grid: StructuralGrid, floors: number, siteArea: number): StructuralCalc {
  const bayW = grid.bayWidthM
  const bayD = grid.bayDepthM
  
  // ━━━ 기둥 ━━━
  const colMap = new Map<string, ColumnSection>()
  for (const col of grid.columns) {
    const isCorner = (col.x === 0 || col.x === grid.baysX) && (col.y === 0 || col.y === grid.baysY)
    const isEdge = col.x === 0 || col.x === grid.baysX || col.y === 0 || col.y === grid.baysY
    
    // 지지 면적
    const halfX = (col.x === 0 || col.x === grid.baysX) ? bayW / 2 : bayW
    const halfY = (col.y === 0 || col.y === grid.baysY) ? bayD / 2 : bayD
    const tribArea = halfX * halfY
    
    const section = calcColumnSection(tribArea, floors, isCorner, isEdge)
    const key = `${section.width}-${section.location}`
    if (!colMap.has(key)) {
      section.id = `C${colMap.size + 1}`
      colMap.set(key, section)
    }
  }
  
  // ━━━ 보 ━━━
  const beamMap = new Map<string, BeamSection>()
  // X방향 보
  const beamX = calcBeamSection(bayW, bayD, 'X')
  beamX.id = 'G1'
  beamMap.set('X', beamX)
  // Y방향 보
  const beamY = calcBeamSection(bayD, bayW, 'Y')
  beamY.id = 'G2'
  beamMap.set('Y', beamY)
  
  // ━━━ 슬래브 ━━━
  const slab = calcSlab(bayW, bayD)
  
  // ━━━ 건물 자중 ━━━
  const footprint = grid.totalWidthM * grid.totalDepthM * 0.7 // 유효 면적
  const totalWeight = footprint * floors * 12 // kN (12kN/m²)
  
  // ━━━ 기초 ━━━
  const foundation = calcFoundation(totalWeight, siteArea, floors)
  
  return {
    columns: [...colMap.values()],
    beams: [...beamMap.values()],
    slab,
    foundation,
    summary: {
      fck: FCK,
      fy: FY,
      totalWeight,
      soilPressure: Math.round(totalWeight / footprint),
    },
  }
}
