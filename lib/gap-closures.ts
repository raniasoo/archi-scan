/**
 * 통합 개선 모듈 — BIM/시장/품질/AI 갭 해소
 * 
 * ④ BIM: IFC 벽체/문/창/MEP 엔티티 추가
 * ⑤ 시장: 수익 시뮬레이션 + 공정표 연동
 * ⑥ 품질: 성능 벤치마크
 * ⑦ AI: 스타일 일관성 + 후처리 메타데이터
 */

import type { StructuralGrid } from './structural-grid'
import type { StructuralCalc } from './structural-calc'

// ━━━ ④ BIM: IFC 확장 엔티티 생성 ━━━

export interface IFCEnhancement {
  walls: string[]        // IfcWall 엔티티
  doors: string[]        // IfcDoor 엔티티
  windows: string[]      // IfcWindow 엔티티
  slabs: string[]        // IfcSlab 엔티티
  mepElements: string[]  // IfcDistributionElement
  entityCount: number
}

export function generateIFCEnhancements(grid: StructuralGrid, calc: StructuralCalc, floors: number): IFCEnhancement {
  const walls: string[] = [], doors: string[] = [], windows: string[] = [], slabs: string[] = [], mepElements: string[] = []
  let id = 1000

  // 벽체 (외벽 + 내벽)
  const perimeter = (grid.totalWidthM + grid.totalDepthM) * 2
  for (let f = 0; f < floors; f++) {
    walls.push(`#${id++}=IFCWALL('${guid()}',#2,'ExteriorWall-F${f+1}',$,$,#50,#51,$,.STANDARD.);`)
    // 내벽 (방 경계)
    for (const room of grid.rooms) {
      if (room.wallType === 'rc' || room.wallType === 'partition') {
        walls.push(`#${id++}=IFCWALL('${guid()}',#2,'${room.label}-Wall-F${f+1}',$,$,#50,#51,$,.PARTITIONING.);`)
      }
    }
  }

  // 문
  for (const room of grid.rooms) {
    if (room.hasDoor) {
      for (let f = 0; f < floors; f++) {
        doors.push(`#${id++}=IFCDOOR('${guid()}',#2,'Door-${room.label}-F${f+1}',$,$,#50,#51,$,1.0,${room.type === 'entrance' ? 1.0 : 0.9},.DOOR.,$,.SINGLE_SWING_LEFT.);`)
      }
    }
  }

  // 창호
  for (const room of grid.rooms) {
    if (room.hasWindow) {
      for (let f = 0; f < floors; f++) {
        const ww = room.spanX * grid.bayWidthM * 0.6
        windows.push(`#${id++}=IFCWINDOW('${guid()}',#2,'Window-${room.label}-F${f+1}',$,$,#50,#51,$,2.1,${ww.toFixed(1)},.WINDOW.,$,.TRIPLE_PANEL_HORIZONTAL.);`)
      }
    }
  }

  // 슬래브 (각 층)
  for (let f = 0; f <= floors; f++) {
    slabs.push(`#${id++}=IFCSLAB('${guid()}',#2,'Slab-F${f}',$,$,#50,#51,$,.FLOOR.);`)
  }
  // 기초 슬래브
  slabs.push(`#${id++}=IFCSLAB('${guid()}',#2,'Foundation-Slab',$,$,#50,#51,$,.BASESLAB.);`)

  // MEP (배관/덕트/전기)
  const wetRooms = grid.rooms.filter(r => r.isWet)
  for (const room of wetRooms) {
    mepElements.push(`#${id++}=IFCDISTRIBUTIONELEMENT('${guid()}',#2,'PS-${room.label}',$,$,#50,#51,$);`)
    mepElements.push(`#${id++}=IFCFLOWSEGMENT('${guid()}',#2,'Pipe-${room.label}',$,$,#50,#51,$);`)
  }
  mepElements.push(`#${id++}=IFCDISTRIBUTIONELEMENT('${guid()}',#2,'MDB-Panel',$,$,#50,#51,$);`)
  mepElements.push(`#${id++}=IFCFLOWSEGMENT('${guid()}',#2,'Main-Duct',$,$,#50,#51,$);`)

  return {
    walls, doors, windows, slabs, mepElements,
    entityCount: walls.length + doors.length + windows.length + slabs.length + mepElements.length,
  }
}

// ━━━ ⑤ 시장: 수익 시뮬레이션 ━━━

export interface ProfitSimulation {
  scenarios: { name: string; roi: number; profit: number; period: number }[]
  npv: number        // 순현재가치 (억원)
  irr: number        // 내부수익률 (%)
  paybackMonths: number
}

export function simulateProfit(params: {
  totalCost: number; revenue: number; constructionMonths: number; saleMonths?: number
}): ProfitSimulation {
  const { totalCost, revenue, constructionMonths, saleMonths = 12 } = params
  const discountRate = 0.05 // 연 5%
  const profit = revenue - totalCost
  const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0
  const totalMonths = constructionMonths + saleMonths

  // NPV 계산
  const monthlyRate = discountRate / 12
  const cashFlows = Array.from({ length: totalMonths }, (_, m) => {
    if (m < constructionMonths) return -totalCost / constructionMonths // 공사비 분산
    return revenue / saleMonths // 분양수입 분산
  })
  const npv = cashFlows.reduce((s, cf, m) => s + cf / Math.pow(1 + monthlyRate, m + 1), 0)

  // IRR 근사 (Newton-Raphson)
  let irr = 0.01
  for (let iter = 0; iter < 50; iter++) {
    let f = 0, df = 0
    cashFlows.forEach((cf, m) => {
      f += cf / Math.pow(1 + irr, m + 1)
      df -= (m + 1) * cf / Math.pow(1 + irr, m + 2)
    })
    if (Math.abs(df) < 1e-10) break
    irr -= f / df
    if (irr < -0.5) { irr = 0; break }
    if (irr > 5) { irr = 5; break }
  }

  return {
    scenarios: [
      { name: '낙관', roi: roi * 1.3, profit: profit * 1.3, period: totalMonths - 3 },
      { name: '기준', roi, profit, period: totalMonths },
      { name: '비관', roi: roi * 0.6, profit: profit * 0.6, period: totalMonths + 6 },
    ],
    npv: Math.round(npv * 10) / 10,
    irr: Math.round(irr * 10000) / 100,
    paybackMonths: roi > 0 ? Math.round(totalMonths * totalCost / revenue) : 999,
  }
}

// ━━━ ⑥ 품질: 성능 벤치마크 ━━━

export interface PerformanceBenchmark {
  gridGenMs: number
  scheduleGenMs: number
  structCalcMs: number
  mepDesignMs: number
  dxfGenMs: number
  ifcGenMs: number
  totalMs: number
  memoryMB: number
  grade: string
}

export function benchmarkPerformance(timings: {
  gridGen: number; scheduleGen: number; structCalc: number
  mepDesign: number; dxfGen: number; ifcGen: number
}): PerformanceBenchmark {
  const total = Object.values(timings).reduce((s, t) => s + t, 0)
  const grade = total < 100 ? 'S' : total < 500 ? 'A' : total < 1000 ? 'B' : 'C'
  return {
    gridGenMs: timings.gridGen,
    scheduleGenMs: timings.scheduleGen,
    structCalcMs: timings.structCalc,
    mepDesignMs: timings.mepDesign,
    dxfGenMs: timings.dxfGen,
    ifcGenMs: timings.ifcGen,
    totalMs: total,
    memoryMB: Math.round(process.memoryUsage?.()?.heapUsed / 1024 / 1024 || 0),
    grade,
  }
}

// ━━━ ⑦ AI: 스타일 일관성 메타데이터 ━━━

export interface AIStyleConsistency {
  buildingIdentity: {
    type: string; floors: number; material: string; roofType: string
    windowPattern: string; entranceType: string; balconyType: string
  }
  colorPalette: { primary: string; secondary: string; accent: string }
  renderHistory: { angle: string; timestamp: number; prompt: string }[]
  consistencyScore: number // 0~100
}

export function createStyleIdentity(params: {
  type: string; floors: number; style?: string; material?: string
}): AIStyleConsistency['buildingIdentity'] {
  const { type, floors, style = 'modern', material = 'composite' } = params
  return {
    type,
    floors,
    material: material === 'glass-curtain' ? '유리 커튼월' : material === 'brick' ? '벽돌' : material === 'stone' ? '석재' : '복합 (석재+타일+유리)',
    roofType: floors <= 3 ? '평지붕 + 옥상정원' : floors <= 10 ? '평지붕 + 기계실' : '평지붕 + 옥탑',
    windowPattern: floors <= 5 ? '대형 발코니창 + 개별 창호' : '정규 그리드 창 + 발코니 난간',
    entranceType: floors <= 2 ? '정원 진입 + 저층 캐노피' : '필로티 + 로비 + 캐노피',
    balconyType: floors <= 5 ? '1.5m 깊이 개방형' : '1.2m 깊이 유리난간',
  }
}

// GUID 생성 (IFC용)
function guid(): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$'
  return Array.from({ length: 22 }, () => chars[Math.floor(Math.random() * 64)]).join('')
}
