/**
 * BOQ (물량 산출) 자동화 엔진
 * 
 * 구조 계산 + 마감표 + 창호 → 자재별 물량 자동 산출
 * 콘크리트/철근/타일/마루/창호/문 물량 + 예산
 */

import type { StructuralGrid } from './structural-grid'
import type { StructuralCalc } from './structural-calc'
import type { WindowSpec, DoorSpec, FinishSpec } from './schedule-generator'

export interface BOQItem {
  category: string    // 공종 (구조/건축/설비)
  item: string        // 항목
  spec: string        // 규격
  unit: string        // 단위
  quantity: number    // 수량
  unitPrice: number   // 단가 (원)
  totalPrice: number  // 금액 (원)
}

export interface BOQReport {
  items: BOQItem[]
  totalCost: number          // 총 공사비 (원)
  totalCostBillion: number   // 총 공사비 (억원)
  costPerM2: number          // ㎡당 공사비 (원)
  categories: {
    structure: number        // 구조 공사비
    architecture: number     // 건축 공사비
    mep: number             // 설비 공사비
    indirect: number        // 간접비
  }
}

export function generateBOQ(params: {
  grid: StructuralGrid
  calc: StructuralCalc
  windows: WindowSpec[]
  doors: DoorSpec[]
  finishes: FinishSpec[]
  floors: number
  siteArea: number
}): BOQReport {
  const { grid, calc, windows, doors, finishes, floors, siteArea } = params
  const items: BOQItem[] = []
  const GFA = grid.totalWidthM * grid.totalDepthM * floors
  const footprint = grid.totalWidthM * grid.totalDepthM

  // ━━━ 구조 공사 ━━━

  // 콘크리트 — 기둥
  const colVol = calc.columns.reduce((s, c) => {
    const vol = (c.width / 1000) * (c.depth / 1000) * 3.3 // 1층 높이
    const count = grid.columns.length // 개소
    return s + vol * count * floors
  }, 0)
  items.push({ category: '구조', item: '콘크리트 (기둥)', spec: `${calc.columns[0]?.concrete || 'C24'} ${calc.columns[0]?.width}×${calc.columns[0]?.depth}`, unit: '㎥', quantity: Math.round(colVol * 10) / 10, unitPrice: 180000, totalPrice: 0 })

  // 콘크리트 — 보
  const beamVol = calc.beams.reduce((s, b) => {
    const vol = (b.width / 1000) * (b.depth / 1000) * (b.direction === 'X' ? grid.totalWidthM : grid.totalDepthM)
    const count = b.direction === 'X' ? (grid.baysY + 1) : (grid.baysX + 1)
    return s + vol * count * floors
  }, 0)
  items.push({ category: '구조', item: '콘크리트 (보)', spec: `${calc.beams[0]?.concrete || 'C24'}`, unit: '㎥', quantity: Math.round(beamVol * 10) / 10, unitPrice: 180000, totalPrice: 0 })

  // 콘크리트 — 슬래브
  const slabVol = footprint * (calc.slab.thickness / 1000) * floors
  items.push({ category: '구조', item: '콘크리트 (슬래브)', spec: `THK${calc.slab.thickness} ${calc.slab.concrete}`, unit: '㎥', quantity: Math.round(slabVol * 10) / 10, unitPrice: 170000, totalPrice: 0 })

  // 콘크리트 — 기초
  const foundVol = footprint * 1.2 * (calc.foundation.thickness / 1000) // 기초 면적 ≈ 건축면적 × 1.2
  items.push({ category: '구조', item: '콘크리트 (기초)', spec: `${calc.foundation.type} THK${calc.foundation.thickness}`, unit: '㎥', quantity: Math.round(foundVol * 10) / 10, unitPrice: 160000, totalPrice: 0 })

  // 철근
  const totalConcrete = colVol + beamVol + slabVol + foundVol
  const rebarWeight = totalConcrete * 120 // 약 120kg/㎥ (평균 배근량)
  items.push({ category: '구조', item: '철근', spec: 'SD400 D10~D25', unit: 'ton', quantity: Math.round(rebarWeight / 1000 * 10) / 10, unitPrice: 1200000, totalPrice: 0 })

  // 거푸집
  const formworkArea = (colVol * 4 / 0.4 + beamVol * 3 / 0.3 + slabVol / (calc.slab.thickness / 1000)) // 대략적 거푸집 면적
  items.push({ category: '구조', item: '거푸집', spec: '합판 유로폼', unit: '㎡', quantity: Math.round(formworkArea), unitPrice: 45000, totalPrice: 0 })

  // ━━━ 건축 공사 ━━━

  // 외벽 (벽돌 + 단열)
  const perimeterM = (grid.totalWidthM + grid.totalDepthM) * 2
  const extWallArea = perimeterM * 3.3 * floors * 0.7 // 창문 제외 70%
  items.push({ category: '건축', item: '외벽 (벽돌+단열)', spec: '0.5B + 단열 100T', unit: '㎡', quantity: Math.round(extWallArea), unitPrice: 120000, totalPrice: 0 })

  // 내벽 (경량벽체)
  const intWallLength = grid.rooms.length * Math.max(grid.bayWidthM, grid.bayDepthM) * 0.8
  const intWallArea = intWallLength * 2.7 * floors // 천장고 2.7m
  items.push({ category: '건축', item: '내벽 (경량벽체)', spec: '석고보드 양면 + 스터드', unit: '㎡', quantity: Math.round(intWallArea), unitPrice: 65000, totalPrice: 0 })

  // 창호
  for (const w of windows) {
    const area = (w.width / 1000) * (w.height / 1000)
    items.push({ category: '건축', item: `창호 ${w.id}`, spec: `${w.type} ${w.width}×${w.height} ${w.material}`, unit: '개소', quantity: w.count * floors, unitPrice: Math.round(area * 350000), totalPrice: 0 })
  }

  // 문
  for (const d of doors) {
    items.push({ category: '건축', item: `문 ${d.id}`, spec: `${d.type} ${d.width}mm ${d.material}`, unit: '개소', quantity: d.count * floors, unitPrice: d.type === '현관문' ? 450000 : d.type === '방화문' ? 380000 : 250000, totalPrice: 0 })
  }

  // 바닥 마감
  const wetFinish = finishes.filter(f => f.floor.includes('타일'))
  const dryFinish = finishes.filter(f => !f.floor.includes('타일'))
  if (dryFinish.length > 0) {
    const dryArea = dryFinish.reduce((s, f) => s + (grid.rooms.find(r => r.label === f.room)?.area || 15), 0) * floors
    items.push({ category: '건축', item: '바닥 마감 (마루)', spec: '강마루 12T', unit: '㎡', quantity: Math.round(dryArea), unitPrice: 55000, totalPrice: 0 })
  }
  if (wetFinish.length > 0) {
    const wetArea = wetFinish.reduce((s, f) => s + (grid.rooms.find(r => r.label === f.room)?.area || 8), 0) * floors
    items.push({ category: '건축', item: '바닥 마감 (타일)', spec: '포세린 300×300', unit: '㎡', quantity: Math.round(wetArea), unitPrice: 75000, totalPrice: 0 })
  }

  // 도장
  const paintArea = intWallArea + footprint * floors // 벽 + 천장
  items.push({ category: '건축', item: '도장', spec: '수성페인트 2회', unit: '㎡', quantity: Math.round(paintArea), unitPrice: 12000, totalPrice: 0 })

  // ━━━ 설비 공사 ━━━
  items.push({ category: '설비', item: '전기 설비', spec: '일식', unit: '㎡', quantity: Math.round(GFA), unitPrice: 85000, totalPrice: 0 })
  items.push({ category: '설비', item: '기계 설비 (급배수/환기)', spec: '일식', unit: '㎡', quantity: Math.round(GFA), unitPrice: 95000, totalPrice: 0 })
  items.push({ category: '설비', item: '소방 설비', spec: '일식', unit: '㎡', quantity: Math.round(GFA), unitPrice: 35000, totalPrice: 0 })
  items.push({ category: '설비', item: '승강기', spec: floors >= 6 ? '15인승 × 1대' : '없음', unit: '대', quantity: floors >= 6 ? 1 : 0, unitPrice: floors >= 6 ? 80000000 : 0, totalPrice: 0 })

  // ━━━ 간접비 ━━━
  const directTotal = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0)
  items.push({ category: '간접비', item: '일반관리비', spec: '직접공사비 × 6%', unit: '식', quantity: 1, unitPrice: Math.round(directTotal * 0.06), totalPrice: 0 })
  items.push({ category: '간접비', item: '이윤', spec: '직접공사비 × 10%', unit: '식', quantity: 1, unitPrice: Math.round(directTotal * 0.10), totalPrice: 0 })
  items.push({ category: '간접비', item: '설계비', spec: 'GFA × 15,000원', unit: '식', quantity: 1, unitPrice: Math.round(GFA * 15000), totalPrice: 0 })
  items.push({ category: '간접비', item: '감리비', spec: 'GFA × 10,000원', unit: '식', quantity: 1, unitPrice: Math.round(GFA * 10000), totalPrice: 0 })

  // totalPrice 계산
  for (const it of items) {
    it.totalPrice = it.quantity * it.unitPrice
  }

  const totalCost = items.reduce((s, it) => s + it.totalPrice, 0)
  const byCat = (cat: string) => items.filter(it => it.category === cat).reduce((s, it) => s + it.totalPrice, 0)

  return {
    items,
    totalCost,
    totalCostBillion: Math.round(totalCost / 100000000 * 10) / 10,
    costPerM2: Math.round(totalCost / GFA),
    categories: {
      structure: byCat('구조'),
      architecture: byCat('건축'),
      mep: byCat('설비'),
      indirect: byCat('간접비'),
    },
  }
}
