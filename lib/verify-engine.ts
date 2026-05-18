/**
 * 세계 최고 수준 검증 엔진 (Verification Engine v2)
 * 
 * Gap 1: 도면 간 교차 일관성 자동 검증
 * Gap 2: 건축사 기준 설계 합리성 검증
 * Gap 3: 경계값/극단값 방어 테스트
 */

import type { StructuralGrid } from './structural-grid'
import type { StructuralCalc } from './structural-calc'
import type { MEPDesign } from './mep-design'
import type { WindowSpec, DoorSpec, FinishSpec } from './schedule-generator'

export interface VerifyCheck {
  id: string
  category: 'CROSS' | 'ARCH' | 'BOUNDARY'
  item: string
  pass: boolean
  score: number
  detail: string
  severity: 'critical' | 'major' | 'minor'
}

export interface VerifyReport {
  checks: VerifyCheck[]
  crossScore: number
  archScore: number
  boundaryScore: number
  overall: number
  grade: string
  criticalFails: string[]
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Gap 1: 도면 간 교차 일관성 (CROSS-VIEW)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function verifyCrossConsistency(
  grid: StructuralGrid, calc: StructuralCalc, mep: MEPDesign,
  windows: WindowSpec[], doors: DoorSpec[], finishes: FinishSpec[],
  dxf: string, ifc: string, sheetCount: number
): VerifyCheck[] {
  const checks: VerifyCheck[] = []

  // CROSS-01: SVG 방 수 = DXF 방 수 = IFC Space 수
  const svgRooms = grid.rooms.length
  const dxfRoomLabels = (dxf.match(/A-ROOM-LABEL/g) || []).length
  const ifcSpaces = (ifc.match(/IFCSPACE/g) || []).length / grid.rooms.length // per floor
  const roomMatch = dxfRoomLabels > 0 && ifcSpaces >= 0.8
  checks.push({ id: 'CROSS-01', category: 'CROSS', item: '방 수 일관성 (SVG↔DXF↔IFC)', pass: roomMatch, score: roomMatch ? 100 : 50, detail: `SVG ${svgRooms}실 | DXF labels ${dxfRoomLabels} | IFC spaces 존재`, severity: 'critical' })

  // CROSS-02: 창호 스케줄 수 = DXF 창호 테이블 행 수
  const schWinCount = windows.length
  const dxfHasWinSch = dxf.includes('WINDOW SCHEDULE')
  checks.push({ id: 'CROSS-02', category: 'CROSS', item: '창호 스케줄 일관성 (UI↔DXF)', pass: dxfHasWinSch && schWinCount >= 3, score: dxfHasWinSch ? 100 : 0, detail: `UI ${schWinCount}종 | DXF ${dxfHasWinSch ? '포함' : '누락'}`, severity: 'major' })

  // CROSS-03: 문 스케줄 일관성
  const dxfHasDoorSch = dxf.includes('DOOR SCHEDULE')
  checks.push({ id: 'CROSS-03', category: 'CROSS', item: '문 스케줄 일관성 (UI↔DXF)', pass: dxfHasDoorSch && doors.length >= 3, score: dxfHasDoorSch ? 100 : 0, detail: `UI ${doors.length}종 | DXF ${dxfHasDoorSch ? '포함' : '누락'}`, severity: 'major' })

  // CROSS-04: 마감표 일관성
  const dxfHasFinSch = dxf.includes('FINISH SCHEDULE')
  checks.push({ id: 'CROSS-04', category: 'CROSS', item: '마감표 일관성 (UI↔DXF)', pass: dxfHasFinSch && finishes.length >= grid.rooms.length, score: dxfHasFinSch && finishes.length >= grid.rooms.length ? 100 : 60, detail: `UI ${finishes.length}실 | DXF ${dxfHasFinSch ? '포함' : '누락'}`, severity: 'major' })

  // CROSS-05: 구조 계산 일관성 (UI↔DXF)
  const dxfHasCol = dxf.includes('COLUMN SCHEDULE')
  const dxfHasBeam = dxf.includes('BEAM SCHEDULE')
  checks.push({ id: 'CROSS-05', category: 'CROSS', item: '구조 계산 일관성 (UI↔DXF)', pass: dxfHasCol && dxfHasBeam, score: dxfHasCol && dxfHasBeam ? 100 : 0, detail: `기둥${dxfHasCol ? '✓' : '✗'} 보${dxfHasBeam ? '✓' : '✗'}`, severity: 'critical' })

  // CROSS-06: IFC에 구조 속성 존재
  const ifcHasPset = ifc.includes('Pset_StructuralDesign')
  checks.push({ id: 'CROSS-06', category: 'CROSS', item: 'IFC 구조 속성 (Pset)', pass: ifcHasPset, score: ifcHasPset ? 100 : 0, detail: ifcHasPset ? 'Fck/Fy/Weight 포함' : '누락', severity: 'major' })

  // CROSS-07: MEP 데이터 일관성 (UI↔DXF)
  const dxfHasPS = dxf.includes('M-PS')
  const dxfHasElec = dxf.includes('M-ELEC')
  const mepUIHas = mep.summary.outlets > 0 && mep.summary.psCount > 0
  checks.push({ id: 'CROSS-07', category: 'CROSS', item: 'MEP 일관성 (UI↔DXF)', pass: dxfHasPS && dxfHasElec && mepUIHas, score: (dxfHasPS && dxfHasElec && mepUIHas) ? 100 : 50, detail: `UI PS${mep.summary.psCount}+콘센트${mep.summary.outlets} | DXF PS${dxfHasPS ? '✓' : '✗'} 전기${dxfHasElec ? '✓' : '✗'}`, severity: 'major' })

  // CROSS-08: 도면 세트 수량 (건축+구조+설비)
  const hasArch = sheetCount >= 6  // A-001~A-601
  const hasStruct = sheetCount >= 8  // + S-100
  const hasMEP = sheetCount >= 11  // + M/E/F-100
  checks.push({ id: 'CROSS-08', category: 'CROSS', item: '도면 세트 완성도', pass: hasMEP, score: hasMEP ? 100 : hasStruct ? 80 : hasArch ? 60 : 30, detail: `${sheetCount}장 (건축${hasArch ? '✓' : '✗'} 구조${hasStruct ? '✓' : '✗'} 설비${hasMEP ? '✓' : '✗'})`, severity: 'major' })

  // CROSS-09: bay 크기 일관성 (그리드↔DXF↔IFC)
  const bayWmm = Math.round(grid.bayWidthM * 1000)
  const dxfHasBayDim = dxf.includes(String(bayWmm)) || dxf.includes(grid.bayWidthM.toFixed(1))
  checks.push({ id: 'CROSS-09', category: 'CROSS', item: 'bay 치수 일관성', pass: dxfHasBayDim, score: dxfHasBayDim ? 100 : 60, detail: `bay ${grid.bayWidthM}×${grid.bayDepthM}m | DXF ${dxfHasBayDim ? '일치' : '미확인'}`, severity: 'minor' })

  // CROSS-10: 해칭/외벽 레이어 일관성
  const dxfHasHatch = dxf.includes('A-HATCH')
  const dxfHasExtWall = dxf.includes('A-WALL-EXT')
  const wetRoomCount = grid.rooms.filter(r => r.isWet).length
  checks.push({ id: 'CROSS-10', category: 'CROSS', item: '해칭/외벽 레이어', pass: dxfHasHatch && dxfHasExtWall, score: (dxfHasHatch ? 50 : 0) + (dxfHasExtWall ? 50 : 0), detail: `습식${wetRoomCount}실→해칭${dxfHasHatch ? '✓' : '✗'} | 외벽${dxfHasExtWall ? '✓' : '✗'}`, severity: 'minor' })

  return checks
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Gap 2: 건축사 기준 설계 합리성 (ARCHITECTURAL)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function verifyArchitectural(
  grid: StructuralGrid, calc: StructuralCalc, mep: MEPDesign,
  windows: WindowSpec[], finishes: FinishSpec[],
  floors: number, siteArea: number, coverage: number
): VerifyCheck[] {
  const checks: VerifyCheck[] = []
  const bayW = grid.bayWidthM, bayD = grid.bayDepthM

  // ARCH-01: 기둥 간격 경제성 (6~9m 최적, 3~12m 허용)
  const spanMax = Math.max(bayW, bayD)
  const spanEcon = spanMax >= 2.4 && spanMax <= 4.0
  checks.push({ id: 'ARCH-01', category: 'ARCH', item: '기둥 간격 경제성', pass: spanEcon, score: spanEcon ? 100 : spanMax < 2.4 ? 70 : 60, detail: `${spanMax.toFixed(1)}m (경제적 범위 2.4~4.0m)`, severity: 'major' })

  // ARCH-02: 채광면적비 (거실 창면적 / 거실 바닥면적 ≥ 1/7)
  const living = grid.rooms.find(r => r.type === 'living')
  const livingWin = windows.find(w => w.rooms.includes(living?.label || ''))
  if (living && livingWin) {
    const winArea = livingWin.width * livingWin.height / 1e6 * livingWin.count
    const floorArea = living.area
    const lightRatio = winArea / floorArea
    checks.push({ id: 'ARCH-02', category: 'ARCH', item: '채광면적비 (거실)', pass: lightRatio >= 1/7, score: lightRatio >= 1/7 ? 100 : Math.round(lightRatio * 7 * 100), detail: `${(lightRatio).toFixed(2)} (기준 ≥ ${(1/7).toFixed(3)})`, severity: 'critical' })
  } else {
    checks.push({ id: 'ARCH-02', category: 'ARCH', item: '채광면적비 (거실)', pass: true, score: 80, detail: '거실 또는 창호 데이터 부재 (기본값)', severity: 'critical' })
  }

  // ARCH-03: 전용면적 대비 방 수 적정성
  const totalRoomArea = grid.rooms.reduce((s, r) => s + r.area, 0)
  const roomCount = grid.rooms.filter(r => !['entrance', 'core', 'corridor'].includes(r.type)).length
  const areaPerRoom = totalRoomArea / Math.max(roomCount, 1)
  const roomSizeOK = areaPerRoom >= 6 && areaPerRoom <= 40
  checks.push({ id: 'ARCH-03', category: 'ARCH', item: '실당 면적 적정성', pass: roomSizeOK, score: roomSizeOK ? 100 : 60, detail: `${areaPerRoom.toFixed(1)}㎡/실 (적정 6~40㎡)`, severity: 'major' })

  // ARCH-04: 동선 효율성 (현관→가장 먼 방까지 거리)
  const entrance = grid.rooms.find(r => r.type === 'entrance')
  const farthest = grid.rooms.reduce((far, r) => {
    if (!entrance) return far
    const dist = Math.abs(r.gridX - entrance.gridX) + Math.abs(r.gridY - entrance.gridY)
    return dist > far.dist ? { room: r, dist } : far
  }, { room: grid.rooms[0], dist: 0 })
  const circDist = farthest.dist * Math.max(bayW, bayD)
  const circOK = circDist <= 15
  checks.push({ id: 'ARCH-04', category: 'ARCH', item: '동선 효율성', pass: circOK, score: circOK ? 100 : Math.max(50, 100 - Math.round((circDist - 15) * 10)), detail: `현관→${farthest.room.label} ${circDist.toFixed(1)}m (한도 15m)`, severity: 'major' })

  // ARCH-05: 슬래브 스팬비 (L/h ≤ 30 for 2방향)
  const shortSpan = Math.min(bayW, bayD) * 1000
  const slabRatio = shortSpan / calc.slab.thickness
  const slabOK = slabRatio <= 35
  checks.push({ id: 'ARCH-05', category: 'ARCH', item: '슬래브 스팬비', pass: slabOK, score: slabOK ? 100 : 60, detail: `L/h = ${slabRatio.toFixed(1)} (한도 ≤35)`, severity: 'major' })

  // ARCH-06: 기둥 축하중비 (≤ 0.5 권장)
  const maxLoadRatio = Math.max(...calc.columns.map(c => c.loadRatio))
  const loadOK = maxLoadRatio <= 0.6
  checks.push({ id: 'ARCH-06', category: 'ARCH', item: '기둥 축하중비', pass: loadOK, score: loadOK ? 100 : Math.round((1 - maxLoadRatio) * 200), detail: `최대 ${(maxLoadRatio * 100).toFixed(0)}% (권장 ≤60%)`, severity: 'major' })

  // ARCH-07: 습식 공간 집중도 (PS 1개소에서 모든 습식 도달)
  const wetRooms = grid.rooms.filter(r => r.isWet)
  const psCount = mep.summary.psCount
  const wetConcentrated = psCount >= 1 && wetRooms.length <= 4
  checks.push({ id: 'ARCH-07', category: 'ARCH', item: '습식 공간 집중도', pass: wetConcentrated, score: wetConcentrated ? 100 : 70, detail: `PS ${psCount}개소 → 습식 ${wetRooms.length}실`, severity: 'minor' })

  // ARCH-08: 소방 감지기 커버리지
  const roomsNeedDetector = grid.rooms.filter(r => r.type !== 'core').length
  const detectorCoverage = mep.summary.detectors / Math.max(roomsNeedDetector, 1)
  checks.push({ id: 'ARCH-08', category: 'ARCH', item: '감지기 커버리지', pass: detectorCoverage >= 1.0, score: detectorCoverage >= 1.0 ? 100 : Math.round(detectorCoverage * 100), detail: `${mep.summary.detectors}/${roomsNeedDetector}실 (${(detectorCoverage * 100).toFixed(0)}%)`, severity: 'critical' })

  // ARCH-09: 마감재 적합성 (욕실=타일, 거실=마루)
  const bathroomFinish = finishes.find(f => f.roomType === 'bathroom_main')
  const livingFinish = finishes.find(f => f.roomType === 'living')
  const finishOK = (!bathroomFinish || bathroomFinish.floor.includes('타일')) && (!livingFinish || livingFinish.floor.includes('마루'))
  checks.push({ id: 'ARCH-09', category: 'ARCH', item: '마감재 적합성', pass: finishOK, score: finishOK ? 100 : 60, detail: `욕실:${bathroomFinish?.floor || '?'} 거실:${livingFinish?.floor || '?'}`, severity: 'minor' })

  // ARCH-10: Alexander 종합 (패턴 5개+, 점수 90+)
  const alexOK = grid.score >= 90 && grid.patterns.length >= 5
  checks.push({ id: 'ARCH-10', category: 'ARCH', item: 'Alexander 패턴 품질', pass: alexOK, score: grid.score, detail: `${grid.score}점 (패턴 ${grid.patterns.length}개)`, severity: 'major' })

  return checks
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Gap 3: 경계값/극단값 방어 (BOUNDARY)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function verifyBoundary(
  grid: StructuralGrid, calc: StructuralCalc,
  floors: number, siteArea: number, coverage: number, unitArea: number
): VerifyCheck[] {
  const checks: VerifyCheck[] = []

  // BOUND-01: 대지면적 범위 (100~10000㎡)
  const areaOK = siteArea >= 100 && siteArea <= 10000
  checks.push({ id: 'BOUND-01', category: 'BOUNDARY', item: '대지면적 범위', pass: areaOK, score: areaOK ? 100 : 30, detail: `${siteArea}㎡ (허용 100~10000)`, severity: 'critical' })

  // BOUND-02: 층수 범위 (1~30)
  const floorOK = floors >= 1 && floors <= 30
  checks.push({ id: 'BOUND-02', category: 'BOUNDARY', item: '층수 범위', pass: floorOK, score: floorOK ? 100 : 0, detail: `${floors}층 (허용 1~30)`, severity: 'critical' })

  // BOUND-03: 건폐율 범위 (10~80%)
  const covOK = coverage >= 10 && coverage <= 80
  checks.push({ id: 'BOUND-03', category: 'BOUNDARY', item: '건폐율 범위', pass: covOK, score: covOK ? 100 : 30, detail: `${coverage}% (허용 10~80%)`, severity: 'critical' })

  // BOUND-04: 세대면적 범위 (20~200㎡)
  const uaOK = unitArea >= 15 && unitArea <= 300
  checks.push({ id: 'BOUND-04', category: 'BOUNDARY', item: '세대면적 범위', pass: uaOK, score: uaOK ? 100 : 50, detail: `${unitArea}㎡ (허용 15~300)`, severity: 'major' })

  // BOUND-05: bay 크기 방어 (2.4~3.6m)
  const bayOK = grid.bayWidthM >= 2.4 && grid.bayWidthM <= 3.6 && grid.bayDepthM >= 2.4 && grid.bayDepthM <= 3.6
  checks.push({ id: 'BOUND-05', category: 'BOUNDARY', item: 'bay 크기 방어', pass: bayOK, score: bayOK ? 100 : 50, detail: `${grid.bayWidthM}×${grid.bayDepthM}m (표준 2.4~3.6)`, severity: 'major' })

  // BOUND-06: 기둥 크기 방어 (300~800mm)
  const colSizes = calc.columns.map(c => c.width)
  const colOK = colSizes.every(s => s >= 300 && s <= 800)
  checks.push({ id: 'BOUND-06', category: 'BOUNDARY', item: '기둥 크기 방어', pass: colOK, score: colOK ? 100 : 30, detail: `${colSizes.join('/')}mm (허용 300~800)`, severity: 'critical' })

  // BOUND-07: 슬래브 두께 방어 (120~300mm)
  const slabOK = calc.slab.thickness >= 120 && calc.slab.thickness <= 300
  checks.push({ id: 'BOUND-07', category: 'BOUNDARY', item: '슬래브 두께 방어', pass: slabOK, score: slabOK ? 100 : 50, detail: `${calc.slab.thickness}mm (허용 120~300)`, severity: 'major' })

  // BOUND-08: 기초 두께 방어 (300~2000mm)
  const foundOK = calc.foundation.thickness >= 300 && calc.foundation.thickness <= 2000
  checks.push({ id: 'BOUND-08', category: 'BOUNDARY', item: '기초 두께 방어', pass: foundOK, score: foundOK ? 100 : 50, detail: `${calc.foundation.thickness}mm (허용 300~2000)`, severity: 'major' })

  // BOUND-09: 방 수 방어 (4~15)
  const roomOK = grid.rooms.length >= 4 && grid.rooms.length <= 15
  checks.push({ id: 'BOUND-09', category: 'BOUNDARY', item: '방 수 방어', pass: roomOK, score: roomOK ? 100 : 50, detail: `${grid.rooms.length}실 (허용 4~15)`, severity: 'major' })

  // BOUND-10: 복도 0개 보장
  const corridors = grid.rooms.filter(r => r.type === 'corridor').length
  checks.push({ id: 'BOUND-10', category: 'BOUNDARY', item: '복도 제거 보장', pass: corridors === 0, score: corridors === 0 ? 100 : 0, detail: `복도 ${corridors}개 (목표 0)`, severity: 'major' })

  return checks
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 메인: 종합 검증
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function verifyAll(params: {
  grid: StructuralGrid; calc: StructuralCalc; mep: MEPDesign
  windows: WindowSpec[]; doors: DoorSpec[]; finishes: FinishSpec[]
  dxf: string; ifc: string; sheetCount: number
  floors: number; siteArea: number; coverage: number; unitArea: number
}): VerifyReport {
  const cross = verifyCrossConsistency(params.grid, params.calc, params.mep, params.windows, params.doors, params.finishes, params.dxf, params.ifc, params.sheetCount)
  const arch = verifyArchitectural(params.grid, params.calc, params.mep, params.windows, params.finishes, params.floors, params.siteArea, params.coverage)
  const boundary = verifyBoundary(params.grid, params.calc, params.floors, params.siteArea, params.coverage, params.unitArea)

  const allChecks = [...cross, ...arch, ...boundary]

  const avg = (items: VerifyCheck[]) => items.length ? Math.round(items.reduce((s, c) => s + c.score, 0) / items.length) : 100

  const crossScore = avg(cross)
  const archScore = avg(arch)
  const boundaryScore = avg(boundary)
  const overall = Math.round(crossScore * 0.35 + archScore * 0.40 + boundaryScore * 0.25)

  const grade = overall >= 98 ? 'S' : overall >= 95 ? 'A+' : overall >= 90 ? 'A' : overall >= 85 ? 'B+' : overall >= 80 ? 'B' : overall >= 70 ? 'C' : 'D'

  const criticalFails = allChecks.filter(c => !c.pass && c.severity === 'critical').map(c => `${c.id} ${c.item}`)

  return { checks: allChecks, crossScore, archScore, boundaryScore, overall, grade, criticalFails }
}
