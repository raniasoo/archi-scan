/**
 * Archi-Scan 자동 회귀 테스트
 * CI/CD에서 매 배포마다 실행
 * 10개 주소 × 145+ 검증 항목
 */

import { generateStructuralGrid, gridToRoomDefs } from '../lib/structural-grid'
import { getBuildingDimensionsInMeters } from '../lib/building-geometry'
import { generateSchedules } from '../lib/schedule-generator'
import { calculateStructure } from '../lib/structural-calc'
import { generateMEPDesign } from '../lib/mep-design'
import { generateIFC } from '../lib/ifc-generator'
import { generateCompleteDXF } from '../lib/dxf-generator'
import { generateDrawingSet } from '../lib/drawing-set-generator'
import { evaluateQuality } from '../lib/qa-engine'
import { verifyAll } from '../lib/verify-engine'
import { simulateSunlight } from '../lib/sunlight-simulator'
import { analyzeMarket } from '../lib/market-data'

const cases = [
  { name: '강남 타워', type: 'tower', area: 500, cov: 50, fl: 10, units: 36 },
  { name: '해운대 ㄱ자', type: 'lshape', area: 915, cov: 28, fl: 3, units: 2 },
  { name: '분당 ㄱ자', type: 'lshape', area: 860, cov: 20, fl: 6, units: 5 },
  { name: '판교 판상', type: 'linear', area: 1200, cov: 55, fl: 7, units: 42 },
  { name: '성수 중정', type: 'courtyard', area: 950, cov: 45, fl: 5, units: 16 },
  { name: '홍대 타워', type: 'tower', area: 400, cov: 55, fl: 15, units: 56 },
  { name: '서초 판상', type: 'linear', area: 1500, cov: 60, fl: 8, units: 96 },
  { name: '마포 중정', type: 'courtyard', area: 600, cov: 50, fl: 4, units: 12 },
  { name: '용산 타워', type: 'tower', area: 800, cov: 60, fl: 20, units: 80 },
  { name: '강서 빌라', type: 'tower', area: 300, cov: 55, fl: 5, units: 10 },
]

let totalPass = 0, totalFail = 0, errors: string[] = []

console.log('🧪 Archi-Scan 자동 회귀 테스트')
console.log('━'.repeat(60))

for (let i = 0; i < cases.length; i++) {
  const c = cases[i]
  try {
    const unitArea = Math.round(c.area * c.cov / 100 * c.fl / Math.max(c.units, 1))
    
    // Phase 0: 건물 치수
    const geo = getBuildingDimensionsInMeters({ type: c.type as any, coverage: c.cov, siteArea: c.area, floors: c.fl })
    if (!geo.blocksInMeters.length) throw new Error('No blocks')
    
    const mainBlock = geo.blocksInMeters.reduce((a: any, b: any) => (a.widthM * a.depthM > b.widthM * b.depthM ? a : b))
    
    // Phase 1: 구조 그리드
    const grid = generateStructuralGrid({ widthM: mainBlock.widthM, depthM: mainBlock.depthM, unitAreaM2: unitArea, floors: c.fl })
    if (grid.rooms.length < 4) throw new Error(`Too few rooms: ${grid.rooms.length}`)
    if (grid.score < 85) throw new Error(`Low Alexander score: ${grid.score}`)
    
    // Phase 4: 스케줄
    const sch = generateSchedules(grid)
    if (sch.windows.length < 3) throw new Error(`Too few windows: ${sch.windows.length}`)
    
    // Phase 5: 구조 계산
    const calc = calculateStructure(grid, c.fl, c.area)
    if (calc.columns.length === 0) throw new Error('No columns')
    
    // Phase 6: MEP
    const mep = generateMEPDesign(grid)
    if (mep.summary.outlets < 1) throw new Error('No outlets')
    
    // Phase 7: IFC
    const ifc = generateIFC({ grid, calc, floors: c.fl, floorHeight: 3.3, projectName: c.name, address: '' })
    if (!ifc.includes('IFCPROJECT')) throw new Error('IFC missing IFCPROJECT')
    
    // DXF
    const dxf = generateCompleteDXF({ type: c.type, coverage: c.cov, siteArea: c.area, floors: c.fl, units: c.units, unitArea, layoutName: c.name })
    if (dxf.length < 10000) throw new Error(`DXF too small: ${dxf.length}`)
    
    // 도면 세트
    const sheets = generateDrawingSet({ grid, calc, mep, floors: c.fl, floorHeight: 3300, project: c.name, address: '' })
    if (sheets.length < 10) throw new Error(`Too few sheets: ${sheets.length}`)
    
    // QA 엔진
    const qa = evaluateQuality({ grid, calc, mep, windows: sch.windows, doors: sch.doors, finishes: sch.finishes, dxfContent: dxf, ifcContent: ifc, sheetCount: sheets.length, floors: c.fl, siteArea: c.area, coverage: c.cov })
    if (qa.scores.overall < 90) throw new Error(`QA below 90: ${qa.scores.overall}`)
    
    // 검증 엔진 v2
    const verify = verifyAll({ grid, calc, mep, windows: sch.windows, doors: sch.doors, finishes: sch.finishes, dxf, ifc, sheetCount: sheets.length, floors: c.fl, siteArea: c.area, coverage: c.cov, unitArea })
    if (verify.overall < 90) throw new Error(`Verify below 90: ${verify.overall}`)
    
    // 일조 시뮬레이션
    const sun = simulateSunlight({ buildingHeight: c.fl * 3.3, floors: c.fl })
    if (sun.totalHours < 5) throw new Error(`Sunlight too low: ${sun.totalHours}h`)
    
    // 시장 분석
    const market = analyzeMarket({ address: '서울특별시 강남구', siteArea: c.area, floors: c.fl, type: c.type })
    if (market.estimatedSalePrice <= 0) throw new Error('Market price zero')
    
    totalPass++
    console.log(`✅ #${i + 1} ${c.name} — QA ${qa.grade} | Verify ${verify.grade} | Alex ${grid.score} | DXF ${Math.round(dxf.length/1024)}KB | ${sheets.length}장`)
    
  } catch (err: any) {
    totalFail++
    errors.push(`#${i + 1} ${c.name}: ${err.message}`)
    console.log(`❌ #${i + 1} ${c.name} — ${err.message}`)
  }
}

console.log('━'.repeat(60))
console.log(`결과: ${totalPass}/${cases.length} PASS (${totalFail} FAIL)`)

if (errors.length > 0) {
  console.log('\n❌ 실패 항목:')
  errors.forEach(e => console.log(`  ${e}`))
  process.exit(1)
}

console.log('\n🏆 모든 테스트 통과!')
process.exit(0)
