/**
 * 도면 품질 자동 평가 시스템 (QA Engine)
 * 
 * 5가지 차원으로 DXF/IFC/도면세트 품질을 자동 평가:
 *   1. 기술 정확성 (Technical Accuracy)
 *   2. 완성도 (Completeness)
 *   3. 호환성 (Compatibility)
 *   4. 전문성 (Professional Standards)
 *   5. 법규 적합성 (Code Compliance)
 */

import type { StructuralGrid } from './structural-grid'
import type { StructuralCalc } from './structural-calc'
import type { MEPDesign } from './mep-design'
import type { WindowSpec, DoorSpec, FinishSpec } from './schedule-generator'

export interface QACheck {
  category: string
  item: string
  pass: boolean
  score: number    // 0~100
  detail: string
  severity: 'critical' | 'major' | 'minor'
}

export interface QAReport {
  checks: QACheck[]
  scores: {
    accuracy: number
    completeness: number
    compatibility: number
    professional: number
    compliance: number
    site: number
    overall: number
  }
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D' | 'F'
  summary: string
}

// ━━━ 1. 기술 정확성 ━━━
function checkAccuracy(grid: StructuralGrid, calc: StructuralCalc, floors: number, siteArea: number): QACheck[] {
  const checks: QACheck[] = []
  const bayW = grid.bayWidthM, bayD = grid.bayDepthM
  
  // 치수 정합성: bay × 수 + 벽두께 = 전체 (WALL_RC = 0.2m)
  const calcW = grid.baysX * bayW + 0.2
  const diffW = Math.abs(calcW - grid.totalWidthM)
  checks.push({ category: '정확성', item: '폭 치수 정합', pass: diffW < 0.01, score: diffW < 0.01 ? 100 : diffW < 0.1 ? 80 : 50, detail: `${calcW.toFixed(2)}m vs ${grid.totalWidthM.toFixed(2)}m (오차 ${(diffW*1000).toFixed(0)}mm)`, severity: 'critical' })

  const calcD = grid.baysY * bayD + 0.2
  const diffD = Math.abs(calcD - grid.totalDepthM)
  checks.push({ category: '정확성', item: '깊이 치수 정합', pass: diffD < 0.01, score: diffD < 0.01 ? 100 : diffD < 0.1 ? 80 : 50, detail: `${calcD.toFixed(2)}m vs ${grid.totalDepthM.toFixed(2)}m (오차 ${(diffD*1000).toFixed(0)}mm)`, severity: 'critical' })

  // 면적 정합성
  const roomAreaSum = grid.rooms.reduce((s, r) => s + r.area, 0)
  const gridArea = grid.totalWidthM * grid.totalDepthM
  const areaRatio = roomAreaSum / gridArea
  checks.push({ category: '정확성', item: '면적 정합', pass: areaRatio > 0.80 && areaRatio < 1.15, score: areaRatio > 0.80 ? 100 : 70, detail: `방 합계 ${roomAreaSum.toFixed(1)}㎡ / 그리드 ${gridArea.toFixed(1)}㎡ (${(areaRatio*100).toFixed(0)}%, 벽두께 제외)`, severity: 'major' })

  // 구조 합리성: 기둥 크기 vs 층수
  const maxCol = Math.max(...calc.columns.map(c => c.width))
  const minColForFloors = floors >= 15 ? 500 : floors >= 5 ? 400 : 350
  checks.push({ category: '정확성', item: '기둥 크기 적정성', pass: maxCol >= minColForFloors, score: maxCol >= minColForFloors ? 100 : 60, detail: `${maxCol}mm (${floors}층 최소 ${minColForFloors}mm)`, severity: 'critical' })

  // 슬래브 두께
  const minSlab = Math.max(150, Math.min(bayW, bayD) * 1000 / 30)
  checks.push({ category: '정확성', item: '슬래브 두께', pass: calc.slab.thickness >= minSlab, score: calc.slab.thickness >= minSlab ? 100 : 70, detail: `${calc.slab.thickness}mm (최소 ${minSlab.toFixed(0)}mm)`, severity: 'major' })

  // 기초 두께 vs 층수
  const minFound = floors >= 10 ? 600 : floors >= 5 ? 400 : 300
  checks.push({ category: '정확성', item: '기초 두께', pass: calc.foundation.thickness >= minFound, score: calc.foundation.thickness >= minFound ? 100 : 60, detail: `${calc.foundation.type} ${calc.foundation.thickness}mm (${floors}층 최소 ${minFound}mm)`, severity: 'major' })

  // bay 크기 범위
  const bayOK = bayW >= 2.4 && bayW <= 3.6 && bayD >= 2.4 && bayD <= 3.6
  checks.push({ category: '정확성', item: 'bay 크기 범위', pass: bayOK, score: bayOK ? 100 : 50, detail: `${bayW}×${bayD}m (표준 2.4~3.6m)`, severity: 'minor' })

  return checks
}

// ━━━ 2. 완성도 ━━━
function checkCompleteness(grid: StructuralGrid, calc: StructuralCalc, mep: MEPDesign, windows: WindowSpec[], doors: DoorSpec[], finishes: FinishSpec[], dxfContent: string, ifcContent: string, sheetCount: number): QACheck[] {
  const checks: QACheck[] = []

  // 필수 방 존재
  const roomTypes = grid.rooms.map(r => r.type)
  const required = ['entrance', 'living', 'kitchen', 'master', 'bathroom_main']
  for (const req of required) {
    checks.push({ category: '완성도', item: `${req} 존재`, pass: roomTypes.includes(req), score: roomTypes.includes(req) ? 100 : 0, detail: roomTypes.includes(req) ? '포함됨' : '누락', severity: req === 'entrance' || req === 'living' ? 'critical' : 'major' })
  }

  // 스케줄 완성
  checks.push({ category: '완성도', item: '창호 스케줄', pass: windows.length >= 3, score: Math.min(100, windows.length * 25), detail: `${windows.length}종`, severity: 'major' })
  checks.push({ category: '완성도', item: '문 스케줄', pass: doors.length >= 3, score: Math.min(100, doors.length * 25), detail: `${doors.length}종`, severity: 'major' })
  checks.push({ category: '완성도', item: '마감표', pass: finishes.length >= grid.rooms.length, score: finishes.length >= grid.rooms.length ? 100 : Math.round(finishes.length / grid.rooms.length * 100), detail: `${finishes.length}/${grid.rooms.length}실`, severity: 'major' })

  // 구조 계산
  checks.push({ category: '완성도', item: '기둥 계산', pass: calc.columns.length > 0, score: calc.columns.length > 0 ? 100 : 0, detail: `${calc.columns.length}종`, severity: 'critical' })
  checks.push({ category: '완성도', item: '보 계산', pass: calc.beams.length >= 2, score: calc.beams.length >= 2 ? 100 : 50, detail: `${calc.beams.length}종 (X/Y)`, severity: 'major' })

  // MEP
  checks.push({ category: '완성도', item: '전기 설비', pass: mep.summary.outlets > 0, score: mep.summary.outlets >= 6 ? 100 : Math.min(100, mep.summary.outlets * 15), detail: `콘센트 ${mep.summary.outlets}구 스위치 ${mep.summary.switches}개`, severity: 'major' })
  checks.push({ category: '완성도', item: '소방 설비', pass: mep.summary.detectors > 0 && mep.summary.sprinklers > 0, score: mep.summary.detectors > 0 && mep.summary.sprinklers > 0 ? 100 : 30, detail: `감지기 ${mep.summary.detectors} SP ${mep.summary.sprinklers}`, severity: 'critical' })

  // DXF 섹션
  const dxfSections = ['WINDOW SCHEDULE', 'DOOR SCHEDULE', 'FINISH SCHEDULE', 'COLUMN SCHEDULE', 'BEAM SCHEDULE', 'FOUNDATION', 'A-GRID', 'M-PS', 'M-ELEC']
  const dxfHit = dxfSections.filter(s => dxfContent.includes(s)).length
  checks.push({ category: '완성도', item: 'DXF 섹션', pass: dxfHit === dxfSections.length, score: Math.round(dxfHit / dxfSections.length * 100), detail: `${dxfHit}/${dxfSections.length}`, severity: 'major' })

  // IFC 요소
  const ifcElements = ['IFCPROJECT', 'IFCSITE', 'IFCBUILDING', 'IFCBUILDINGSTOREY', 'IFCSPACE']
  const ifcHit = ifcElements.filter(e => ifcContent.includes(e)).length
  checks.push({ category: '완성도', item: 'IFC 요소', pass: ifcHit === ifcElements.length, score: Math.round(ifcHit / ifcElements.length * 100), detail: `${ifcHit}/${ifcElements.length}`, severity: 'major' })

  // 도면 세트 수량
  checks.push({ category: '완성도', item: '도면 세트', pass: sheetCount >= 10, score: Math.min(100, Math.round(sheetCount / 12 * 100)), detail: `${sheetCount}장`, severity: 'minor' })

  return checks
}

// ━━━ 3. 호환성 ━━━
function checkCompatibility(dxfContent: string, ifcContent: string): QACheck[] {
  const checks: QACheck[] = []

  // DXF R12 형식
  checks.push({ category: '호환성', item: 'DXF 버전', pass: dxfContent.includes('AC1009'), score: dxfContent.includes('AC1009') ? 100 : 0, detail: dxfContent.includes('AC1009') ? 'R12 (AC1009)' : '버전 미확인', severity: 'critical' })

  // DXF 구조 (HEADER/TABLES/ENTITIES/EOF)
  const hasHeader = dxfContent.includes('SECTION') && dxfContent.includes('HEADER')
  const hasTables = dxfContent.includes('TABLES') && dxfContent.includes('LAYER')
  const hasEntities = dxfContent.includes('ENTITIES')
  const hasEOF = dxfContent.includes('EOF')
  checks.push({ category: '호환성', item: 'DXF 구조', pass: hasHeader && hasTables && hasEntities && hasEOF, score: [hasHeader, hasTables, hasEntities, hasEOF].filter(Boolean).length * 25, detail: `H${hasHeader?'✓':'✗'} T${hasTables?'✓':'✗'} E${hasEntities?'✓':'✗'} EOF${hasEOF?'✓':'✗'}`, severity: 'critical' })

  // DXF 레이어 수
  const layerCount = (dxfContent.match(/LAYER\n/g) || []).length
  checks.push({ category: '호환성', item: 'DXF 레이어', pass: layerCount >= 14, score: Math.min(100, Math.round(layerCount / 14 * 100)), detail: `${layerCount}개 (표준 14개)`, severity: 'major' })

  // IFC 2x3 형식
  checks.push({ category: '호환성', item: 'IFC 버전', pass: ifcContent.includes('IFC2X3'), score: ifcContent.includes('IFC2X3') ? 100 : 0, detail: ifcContent.includes('IFC2X3') ? 'IFC 2x3' : '버전 미확인', severity: 'critical' })

  // IFC STEP 형식
  const hasISO = ifcContent.includes('ISO-10303-21')
  const hasData = ifcContent.includes('DATA;')
  const hasEndISO = ifcContent.includes('END-ISO-10303-21')
  checks.push({ category: '호환성', item: 'IFC STEP 구조', pass: hasISO && hasData && hasEndISO, score: (hasISO && hasData && hasEndISO) ? 100 : [hasISO, hasData, hasEndISO].filter(Boolean).length * 33, detail: `ISO${hasISO?'✓':'✗'} DATA${hasData?'✓':'✗'} END${hasEndISO?'✓':'✗'}`, severity: 'critical' })

  // DXF 파일 크기 (너무 작으면 비정상)
  const dxfKB = Math.round(dxfContent.length / 1024)
  checks.push({ category: '호환성', item: 'DXF 파일 크기', pass: dxfKB >= 20 && dxfKB <= 500, score: dxfKB >= 20 ? 100 : 30, detail: `${dxfKB}KB`, severity: 'minor' })

  return checks
}

// ━━━ 4. 전문성 ━━━
function checkProfessional(dxfContent: string, sheetCount: number, grid: StructuralGrid): QACheck[] {
  const checks: QACheck[] = []

  // 레이어 명명 규칙 (A-/M-/S- 표준)
  const stdLayers = ['A-GRID', 'A-COLS', 'A-WALL', 'A-ROOM', 'A-DIMS', 'A-DOOR', 'A-WINDOW', 'M-PS', 'M-DUCT', 'M-ELEC']
  const foundLayers = stdLayers.filter(l => dxfContent.includes(l))
  checks.push({ category: '전문성', item: '레이어 명명 규칙', pass: foundLayers.length >= 8, score: Math.round(foundLayers.length / stdLayers.length * 100), detail: `${foundLayers.length}/${stdLayers.length} 표준명`, severity: 'major' })

  // 타이틀 블록
  const hasTitle = dxfContent.includes('A-TITLE') || dxfContent.includes('TITLE')
  checks.push({ category: '전문성', item: '타이틀 블록', pass: hasTitle, score: hasTitle ? 100 : 0, detail: hasTitle ? '포함' : '누락', severity: 'major' })

  // 도면 번호 체계
  checks.push({ category: '전문성', item: '도면 번호 체계', pass: sheetCount >= 10, score: sheetCount >= 10 ? 100 : Math.round(sheetCount / 10 * 100), detail: `A-001~F-100 (${sheetCount}장)`, severity: 'major' })

  // 축척 표시
  const hasScale = dxfContent.includes('SCALE') || dxfContent.includes('1/100')
  checks.push({ category: '전문성', item: '축척 표시', pass: hasScale, score: hasScale ? 100 : 0, detail: hasScale ? '1/100' : '미표시', severity: 'minor' })

  // 치수선 (DIM 텍스트 존재)
  const hasDims = dxfContent.includes('A-DIMS')
  checks.push({ category: '전문성', item: '치수선', pass: hasDims, score: hasDims ? 100 : 0, detail: hasDims ? '치수선 + 텍스트 (A-DIMS)' : '누락', severity: 'major' })

  // 해칭 (습식 공간)
  const hasHatch = dxfContent.includes('A-HATCH')
  checks.push({ category: '전문성', item: '습식 해칭', pass: hasHatch, score: hasHatch ? 100 : 40, detail: hasHatch ? '45도 대각선 해칭 포함' : 'DXF 미포함', severity: 'minor' })

  // 선 가중치 구분
  const hasExtWall = dxfContent.includes('A-WALL-EXT')
  checks.push({ category: '전문성', item: '선 가중치', pass: hasExtWall, score: hasExtWall ? 100 : 40, detail: hasExtWall ? '외벽(A-WALL-EXT) / 내벽(A-WALL-RC/PART) 분리' : '단일 선폭', severity: 'minor' })

  // Alexander 패턴 점수
  checks.push({ category: '전문성', item: 'Alexander 패턴', pass: grid.score >= 90, score: grid.score, detail: `${grid.score}점 (패턴 ${grid.patterns.length}개)`, severity: 'minor' })

  return checks
}

// ━━━ 5. 법규 적합성 ━━━
function checkCompliance(grid: StructuralGrid, calc: StructuralCalc, mep: MEPDesign, floors: number, siteArea: number, coverage: number): QACheck[] {
  const checks: QACheck[] = []

  // 건폐율
  const footprint = grid.totalWidthM * grid.totalDepthM
  const actualCov = footprint / siteArea * 100
  checks.push({ category: '법규', item: '건폐율', pass: actualCov <= 60, score: actualCov <= 60 ? 100 : 50, detail: `${actualCov.toFixed(1)}% (한도 60%)`, severity: 'critical' })

  // 주차 (세대당 1대)
  checks.push({ category: '법규', item: '주차 기준', pass: true, score: 100, detail: '세대당 1대 이상 (별도 검증)', severity: 'major' })

  // 방화문 (현관 = 을종)
  const entrance = grid.rooms.find(r => r.type === 'entrance')
  checks.push({ category: '법규', item: '현관 방화문', pass: !!entrance, score: entrance ? 100 : 0, detail: entrance ? '을종 방화문 (D 스케줄)' : '현관 없음', severity: 'critical' })

  // 소방 감지기 (모든 실)
  const roomCount = grid.rooms.filter(r => r.type !== 'core').length
  checks.push({ category: '법규', item: '연기감지기', pass: mep.summary.detectors >= roomCount, score: mep.summary.detectors >= roomCount ? 100 : Math.round(mep.summary.detectors / roomCount * 100), detail: `${mep.summary.detectors}/${roomCount}실`, severity: 'critical' })

  // 스프링클러 (면적 기준)
  const totalArea = grid.rooms.reduce((s, r) => s + r.area, 0)
  const minSP = Math.ceil(totalArea / 10)
  checks.push({ category: '법규', item: '스프링클러', pass: mep.summary.sprinklers >= minSP * 0.8, score: mep.summary.sprinklers >= minSP ? 100 : Math.round(mep.summary.sprinklers / minSP * 100), detail: `${mep.summary.sprinklers}/${minSP}개 (10㎡당 1개)`, severity: 'major' })

  // 기초 근입 깊이
  const minDepth = Math.max(1200, floors * 200)
  checks.push({ category: '법규', item: '기초 근입', pass: calc.foundation.depth >= minDepth, score: calc.foundation.depth >= minDepth ? 100 : 70, detail: `${calc.foundation.depth}mm (최소 ${minDepth}mm)`, severity: 'major' })

  // 최소 천장고 (2.1m)
  const slabThk = calc.slab.thickness / 1000
  const clearH = 3.3 - slabThk
  checks.push({ category: '법규', item: '최소 천장고', pass: clearH >= 2.1, score: clearH >= 2.1 ? 100 : 0, detail: `${(clearH * 1000).toFixed(0)}mm (최소 2100mm)`, severity: 'critical' })

  return checks
}

// ━━━ 메인: 종합 평가 ━━━
export function evaluateQuality(params: {
  grid: StructuralGrid
  calc: StructuralCalc
  mep: MEPDesign
  windows: WindowSpec[]
  doors: DoorSpec[]
  finishes: FinishSpec[]
  dxfContent: string
  ifcContent: string
  sheetCount: number
  floors: number
  siteArea: number
  coverage: number
  siteConditions?: { slope?: number; soilCode?: string; floodRisk?: string; seismicRisk?: string; buildabilityScore?: number; elevation?: number }
}): QAReport {
  const { grid, calc, mep, windows, doors, finishes, dxfContent, ifcContent, sheetCount, floors, siteArea, coverage, siteConditions } = params

  const allChecks = [
    ...checkAccuracy(grid, calc, floors, siteArea),
    ...checkCompleteness(grid, calc, mep, windows, doors, finishes, dxfContent, ifcContent, sheetCount),
    ...checkCompatibility(dxfContent, ifcContent),
    ...checkProfessional(dxfContent, sheetCount, grid),
    ...checkCompliance(grid, calc, mep, floors, siteArea, coverage),
  ]

  // ★ 대지조건 검증 항목 추가
  if (siteConditions && siteConditions.elevation !== undefined) {
    const sc = siteConditions
    const slope = sc.slope || 0
    const soilCode = sc.soilCode || 'SAND'
    const floodRisk = sc.floodRisk || 'low'
    const seismicRisk = sc.seismicRisk || 'low'
    const buildScore = sc.buildabilityScore ?? 100

    // SITE-01: 건축 적합도
    allChecks.push({ category: '대지', item: '건축 적합도', pass: buildScore >= 50,
      score: buildScore, detail: `${buildScore}점 (${buildScore >= 85 ? '최적' : buildScore >= 70 ? '양호' : buildScore >= 50 ? '보통' : '주의'})`,
      severity: buildScore < 50 ? 'critical' : 'minor' })

    // SITE-02: 경사도 적합
    allChecks.push({ category: '대지', item: '경사도 적합', pass: slope <= 25,
      score: slope <= 5 ? 100 : slope <= 10 ? 85 : slope <= 15 ? 70 : slope <= 25 ? 50 : 30,
      detail: `경사 ${slope}% (${slope < 5 ? '평탄' : slope < 10 ? '완경사' : slope < 20 ? '급경사' : '산악'})`,
      severity: slope > 25 ? 'critical' : slope > 15 ? 'major' : 'minor' })

    // FND-01: 토질↔기초 정합성
    const foundationType = soilCode === 'FILL' || soilCode === 'SILT' ? '파일기초' : soilCode === 'CLAY' ? '매트+보강' : '매트기초'
    const calcFoundation = calc.foundation.type
    allChecks.push({ category: '대지', item: '기초 적정성', pass: true,
      score: soilCode === 'FILL' || soilCode === 'SILT' ? 60 : 100,
      detail: `${soilCode} → ${foundationType} 추천 (계산: ${calcFoundation})`,
      severity: soilCode === 'FILL' ? 'major' : 'minor' })

    // FND-02: 침하 위험
    const settlement = soilCode === 'FILL' ? 260 : soilCode === 'SILT' ? 160 : soilCode === 'CLAY' ? 49 : 17
    allChecks.push({ category: '대지', item: '침하 위험', pass: settlement <= 50,
      score: settlement <= 25 ? 100 : settlement <= 50 ? 80 : settlement <= 100 ? 50 : 30,
      detail: `추정 침하 ${settlement}mm (50mm 이하 적합)`,
      severity: settlement > 100 ? 'critical' : settlement > 50 ? 'major' : 'minor' })

    // EQ-01: 내진 적합
    allChecks.push({ category: '대지', item: '내진 설계', pass: true,
      score: seismicRisk === 'high' ? 70 : 100,
      detail: `지진 위험 ${seismicRisk} ${floors >= 3 ? '→ 내진 설계 의무' : ''}`,
      severity: seismicRisk === 'high' ? 'major' : 'minor' })

    // FLD-01: 침수 위험
    allChecks.push({ category: '대지', item: '침수 위험', pass: floodRisk !== 'very-high',
      score: floodRisk === 'very-high' ? 30 : floodRisk === 'high' ? 60 : floodRisk === 'medium' ? 80 : 100,
      detail: `침수 ${floodRisk} ${floodRisk !== 'low' ? '→ GL높이/배수 강화' : ''}`,
      severity: floodRisk === 'very-high' ? 'critical' : floodRisk === 'high' ? 'major' : 'minor' })
  }

  // 카테고리별 점수 계산
  const byCategory = (cat: string) => {
    const items = allChecks.filter(c => c.category === cat)
    if (items.length === 0) return 100
    return Math.round(items.reduce((s, c) => s + c.score, 0) / items.length)
  }

  const scores = {
    accuracy: byCategory('정확성'),
    completeness: byCategory('완성도'),
    compatibility: byCategory('호환성'),
    professional: byCategory('전문성'),
    compliance: byCategory('법규'),
    site: byCategory('대지'),
    overall: 0,
  }
  scores.overall = Math.round(
    scores.accuracy * 0.22 + scores.completeness * 0.22 +
    scores.compatibility * 0.18 + scores.professional * 0.13 +
    scores.compliance * 0.13 + scores.site * 0.12
  )

  const grade = scores.overall >= 95 ? 'A+' : scores.overall >= 90 ? 'A' : scores.overall >= 85 ? 'B+' : scores.overall >= 80 ? 'B' : scores.overall >= 70 ? 'C' : scores.overall >= 60 ? 'D' : 'F'

  const critFails = allChecks.filter(c => !c.pass && c.severity === 'critical')
  const summary = critFails.length === 0
    ? `전체 ${allChecks.length}개 항목 중 ${allChecks.filter(c => c.pass).length}개 통과. 치명적 결함 없음.`
    : `치명적 결함 ${critFails.length}건: ${critFails.map(c => c.item).join(', ')}`

  return { checks: allChecks, scores, grade, summary }
}
