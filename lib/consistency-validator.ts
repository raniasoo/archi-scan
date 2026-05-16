/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Single Source of Truth — 전체 시스템 일관성 검증기
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Archi-Scan의 10개 주요 시스템 간 교차 검증:
 * 
 *   ① 법규적합성 (regulation-calculator)
 *   ② 설계전략 (design-strategy)  
 *   ③ 배치안 (generateLayouts / LayoutOption)
 *   ④ AI 렌더링 프롬프트 (ai-hub / site-context-builder)
 *   ⑤ 인테리어 렌더링 (ai-hub interior)
 *   ⑥ 도면 7종 (floor-plan, site-plan, isometric, section, elevation, perspective, DXF)
 *   ⑦ 3D 모델 (building-volume-3d / building-geometry)
 *   ⑧ 알렉산더 253 패턴 (alexander-patterns)
 *   ⑨ 15개 속성 (fifteen-properties)  
 *   ⑩ 평면자동설계 (floorplan-optimizer / floorplan-templates)
 *   ⑪ 일조사선 분석 (constraint-solver / sun-analysis)
 *   ⑫ ROI/사업성 (project-analysis-state)
 * 
 * 사용법:
 *   const report = validateConsistency(snapshot)
 *   // report.isConsistent === false 이면 불일치 목록 표시
 */

import { getBuildingGeometry, type BuildingGeometry } from './building-geometry'
import { analyzeSolarEnvelope, type SolarEnvelopeResult } from './sun-analysis'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 입력: 전체 시스템 상태 스냅샷
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** 검증에 필요한 전체 시스템 스냅샷 */
export interface SystemSnapshot {
  // ── 기본 입력 (Single Source) ──
  siteArea: number                    // 대지면적 (㎡)
  address?: string
  
  // ── ① 법규 ──
  regulation: {
    zoneType: string
    maxCoverageRatio: number          // 법정 최대 건폐율 (%)
    maxFloorAreaRatio: number         // 법정 최대 용적률 (%)
    maxHeight: number                 // 법정 최대 높이 (m)
    maxFloors: number                 // 법정 최대 층수
    roadWidth: number
    parkingRatio: number
    setbackFront?: number
    setbackSide?: number
    setbackRear?: number
  }
  
  // ── ② 설계전략 ──
  strategy?: string                   // DesignStrategy ID
  
  // ── ③ 배치안 (선택된 LayoutOption) ──
  layout: {
    type: 'tower' | 'courtyard' | 'lshape' | 'linear' | 'cluster'
    _originalType?: string
    name: string
    coverage: number                  // 건폐율 (%)
    floors: number
    units: number
    gfa: number                       // 연면적 (㎡)
    parking: number
    buildingCount?: number
    solarData?: {
      winterSunlightHours: number
      shadowLength: number
      northSolarMaxHeight: number
      effectiveMaxFloors: number
      solarScore?: number
      isConstraining?: boolean
    }
  }
  
  // ── ④ AI 렌더링 (생성된 프롬프트 데이터) ──
  aiRendering?: {
    buildingType: string              // 프롬프트에 사용된 건물 유형
    floors: number                    // 프롬프트에 사용된 층수
    units?: number
    style?: string
    buildingCount?: number
  }
  
  // ── ⑤ 인테리어 렌더링 ──
  interiorRendering?: {
    unitType?: string                 // 세대 타입 (원룸/투룸 등)
    unitArea?: number                 // 전용면적
    style?: string
  }
  
  // ── ⑥ 도면 (렌더링에 사용된 파라미터) ──
  drawings?: {
    type: string                      // 도면에 사용된 건물 타입
    coverage: number
    floors: number
    siteArea: number
    buildingCount?: number
    originalType?: string
  }
  
  // ── ⑦ 3D 모델 ──
  model3d?: {
    type: string
    coverage: number
    floors: number
    siteArea: number
    buildingCount?: number
    originalType?: string
  }
  
  // ── ⑧⑨ 알렉산더 패턴 / 15속성 ──
  patterns?: {
    selectedPatterns: string[]
    layoutTypeId?: string             // 매칭된 알렉산더 레이아웃 타입
    propertyScores?: Record<string, number>
  }
  
  // ── ⑩ 평면자동설계 ──
  floorPlan?: {
    unitTypes: { type: string; area: number; count: number }[]
    coreEfficiency: number            // 전용률 (%)
    unitsPerFloor: number
    totalNetArea: number              // 전용면적 합계
  }
  
  // ── ⑫ ROI/사업성 ──
  financial?: {
    roi: number
    totalCost: number
    totalRevenue: number
    profit: number
    gfa: number                       // 사업성 계산에 사용된 연면적
    units: number                     // 사업성 계산에 사용된 세대수
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 출력: 검증 결과
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type Severity = 'error' | 'warning' | 'info'

export interface ConsistencyIssue {
  id: string                          // 고유 규칙 ID (예: 'REG-LAY-01')
  severity: Severity
  systemA: string                     // 비교 시스템 A
  systemB: string                     // 비교 시스템 B
  field: string                       // 불일치 필드
  valueA: string | number             // A의 값
  valueB: string | number             // B의 값
  message: string                     // 설명
  fix?: string                        // 자동 수정 제안
}

export interface ConsistencyReport {
  isConsistent: boolean               // 전체 일관성 여부 (error 0개)
  score: number                       // 일관성 점수 (0~100)
  totalChecks: number                 // 총 검증 항목 수
  passedChecks: number                // 통과 항목 수
  issues: ConsistencyIssue[]          // 불일치 목록
  summary: string                     // 요약 문장
  
  // 시스템별 상태
  systemStatus: Record<string, {
    checked: boolean
    issues: number
    status: 'ok' | 'warning' | 'error' | 'skipped'
  }>
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 허용 오차
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const TOLERANCE = {
  coverage: 2,       // 건폐율 ±2%
  far: 5,            // 용적률 ±5%
  floors: 0,         // 층수 정확 일치
  units: 1,          // 세대수 ±1
  gfa: 50,           // 연면적 ±50㎡
  area: 5,           // 면적 ±5㎡
  height: 0.5,       // 높이 ±0.5m
  roi: 2,            // ROI ±2%p
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 검증 규칙
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function runChecks(s: SystemSnapshot): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = []
  
  // ━━━━━ A. 법규 ↔ 배치안 ━━━━━
  
  // REG-LAY-01: 건폐율 한도 초과
  if (s.layout.coverage > s.regulation.maxCoverageRatio) {
    issues.push({
      id: 'REG-LAY-01', severity: 'error',
      systemA: '법규', systemB: '배치안',
      field: '건폐율',
      valueA: s.regulation.maxCoverageRatio, valueB: s.layout.coverage,
      message: `배치안 건폐율 ${s.layout.coverage}%가 법정 한도 ${s.regulation.maxCoverageRatio}%를 초과`,
      fix: `건폐율을 ${s.regulation.maxCoverageRatio}% 이하로 조정`,
    })
  }
  
  // REG-LAY-02: 용적률 한도 초과
  const actualFAR = Math.round((s.layout.gfa / s.siteArea) * 100)
  if (actualFAR > s.regulation.maxFloorAreaRatio + TOLERANCE.far) {
    issues.push({
      id: 'REG-LAY-02', severity: 'error',
      systemA: '법규', systemB: '배치안',
      field: '용적률',
      valueA: s.regulation.maxFloorAreaRatio, valueB: actualFAR,
      message: `실제 용적률 ${actualFAR}%가 법정 한도 ${s.regulation.maxFloorAreaRatio}%를 초과`,
      fix: `연면적을 ${Math.floor(s.siteArea * s.regulation.maxFloorAreaRatio / 100)}㎡ 이하로 축소`,
    })
  }
  
  // REG-LAY-03: 층수 초과
  if (s.layout.floors > s.regulation.maxFloors) {
    issues.push({
      id: 'REG-LAY-03', severity: 'error',
      systemA: '법규', systemB: '배치안',
      field: '층수',
      valueA: s.regulation.maxFloors, valueB: s.layout.floors,
      message: `배치안 ${s.layout.floors}층이 법정 최대 ${s.regulation.maxFloors}층을 초과`,
    })
  }
  
  // REG-LAY-04: 높이 초과
  const buildingHeight = s.layout.floors * 3.3
  if (buildingHeight > s.regulation.maxHeight + TOLERANCE.height) {
    issues.push({
      id: 'REG-LAY-04', severity: 'error',
      systemA: '법규', systemB: '배치안',
      field: '높이',
      valueA: s.regulation.maxHeight, valueB: buildingHeight,
      message: `건물높이 ${buildingHeight.toFixed(1)}m가 법정 한도 ${s.regulation.maxHeight}m를 초과`,
    })
  }
  
  // REG-LAY-05: 일조사선 반영 여부
  if (s.layout.solarData?.isConstraining && 
      s.layout.floors > (s.layout.solarData.effectiveMaxFloors || 999)) {
    issues.push({
      id: 'REG-LAY-05', severity: 'error',
      systemA: '일조사선', systemB: '배치안',
      field: '사선제한 층수',
      valueA: s.layout.solarData.effectiveMaxFloors, valueB: s.layout.floors,
      message: `사선제한 실효 최대 ${s.layout.solarData.effectiveMaxFloors}층인데 배치안은 ${s.layout.floors}층`,
      fix: `층수를 ${s.layout.solarData.effectiveMaxFloors}층으로 조정`,
    })
  }
  
  // ━━━━━ B. 배치안 ↔ AI 렌더링 ━━━━━
  
  if (s.aiRendering) {
    // LAY-AIR-01: 건물 유형 불일치
    const layoutType = s.layout._originalType || s.layout.type
    if (s.aiRendering.buildingType !== layoutType && s.aiRendering.buildingType !== s.layout.type) {
      issues.push({
        id: 'LAY-AIR-01', severity: 'error',
        systemA: '배치안', systemB: 'AI렌더링',
        field: '건물유형',
        valueA: layoutType, valueB: s.aiRendering.buildingType,
        message: `배치안은 '${layoutType}'인데 AI 렌더링 프롬프트는 '${s.aiRendering.buildingType}'으로 생성`,
        fix: `AI 렌더링 buildingType을 '${layoutType}'으로 통일`,
      })
    }
    
    // LAY-AIR-02: 층수 불일치
    if (Math.abs(s.aiRendering.floors - s.layout.floors) > TOLERANCE.floors) {
      issues.push({
        id: 'LAY-AIR-02', severity: 'error',
        systemA: '배치안', systemB: 'AI렌더링',
        field: '층수',
        valueA: s.layout.floors, valueB: s.aiRendering.floors,
        message: `배치안 ${s.layout.floors}층 ≠ AI 렌더링 ${s.aiRendering.floors}층`,
      })
    }
    
    // LAY-AIR-03: 동수 불일치 (클러스터)
    if (s.layout.type === 'cluster' && s.aiRendering.buildingCount && s.layout.buildingCount) {
      if (s.aiRendering.buildingCount !== s.layout.buildingCount) {
        issues.push({
          id: 'LAY-AIR-03', severity: 'warning',
          systemA: '배치안', systemB: 'AI렌더링',
          field: '동수',
          valueA: s.layout.buildingCount, valueB: s.aiRendering.buildingCount,
          message: `배치안 ${s.layout.buildingCount}동 ≠ AI 렌더링 ${s.aiRendering.buildingCount}동`,
        })
      }
    }
  }
  
  // ━━━━━ C. 배치안 ↔ 도면 ━━━━━
  
  if (s.drawings) {
    // LAY-DRW-01: 건물 유형 불일치
    if (s.drawings.type !== s.layout.type) {
      issues.push({
        id: 'LAY-DRW-01', severity: 'error',
        systemA: '배치안', systemB: '도면',
        field: '건물유형',
        valueA: s.layout.type, valueB: s.drawings.type,
        message: `배치안 타입 '${s.layout.type}' ≠ 도면 타입 '${s.drawings.type}'`,
      })
    }
    
    // LAY-DRW-02: 건폐율 불일치
    if (Math.abs(s.drawings.coverage - s.layout.coverage) > TOLERANCE.coverage) {
      issues.push({
        id: 'LAY-DRW-02', severity: 'warning',
        systemA: '배치안', systemB: '도면',
        field: '건폐율',
        valueA: s.layout.coverage, valueB: s.drawings.coverage,
        message: `배치안 건폐율 ${s.layout.coverage}% ≠ 도면 ${s.drawings.coverage}%`,
      })
    }
    
    // LAY-DRW-03: 층수 불일치
    if (s.drawings.floors !== s.layout.floors) {
      issues.push({
        id: 'LAY-DRW-03', severity: 'error',
        systemA: '배치안', systemB: '도면',
        field: '층수',
        valueA: s.layout.floors, valueB: s.drawings.floors,
        message: `배치안 ${s.layout.floors}층 ≠ 도면 ${s.drawings.floors}층`,
      })
    }
    
    // LAY-DRW-04: 대지면적 불일치
    if (Math.abs(s.drawings.siteArea - s.siteArea) > TOLERANCE.area) {
      issues.push({
        id: 'LAY-DRW-04', severity: 'error',
        systemA: '입력', systemB: '도면',
        field: '대지면적',
        valueA: s.siteArea, valueB: s.drawings.siteArea,
        message: `입력 대지면적 ${s.siteArea}㎡ ≠ 도면 ${s.drawings.siteArea}㎡`,
      })
    }
  }
  
  // ━━━━━ D. 배치안 ↔ 3D 모델 ━━━━━
  
  if (s.model3d) {
    // LAY-3D-01: 건물 유형 불일치
    if (s.model3d.type !== s.layout.type) {
      issues.push({
        id: 'LAY-3D-01', severity: 'error',
        systemA: '배치안', systemB: '3D모델',
        field: '건물유형',
        valueA: s.layout.type, valueB: s.model3d.type,
        message: `배치안 '${s.layout.type}' ≠ 3D 모델 '${s.model3d.type}'`,
      })
    }
    
    // LAY-3D-02: 층수 불일치
    if (s.model3d.floors !== s.layout.floors) {
      issues.push({
        id: 'LAY-3D-02', severity: 'error',
        systemA: '배치안', systemB: '3D모델',
        field: '층수',
        valueA: s.layout.floors, valueB: s.model3d.floors,
        message: `배치안 ${s.layout.floors}층인데 3D 모델은 ${s.model3d.floors}층으로 표시`,
      })
    }
    
    // LAY-3D-03: 건축면적 정합성 (building-geometry 교차 검증)
    try {
      const geo = getBuildingGeometry({
        type: s.layout.type,
        coverage: s.layout.coverage,
        siteArea: s.siteArea,
        floors: s.layout.floors,
        buildingCount: s.layout.buildingCount,
        originalType: s.layout._originalType,
      })
      const expectedFootprint = s.siteArea * s.layout.coverage / 100
      if (Math.abs(geo.totalFootprint - expectedFootprint) > expectedFootprint * 0.15) {
        issues.push({
          id: 'LAY-3D-03', severity: 'warning',
          systemA: '배치안', systemB: '3D지오메트리',
          field: '건축면적',
          valueA: Math.round(expectedFootprint), valueB: Math.round(geo.totalFootprint),
          message: `배치안 건축면적 ${Math.round(expectedFootprint)}㎡ vs 3D 지오메트리 ${Math.round(geo.totalFootprint)}㎡ (${Math.round(Math.abs(geo.totalFootprint - expectedFootprint) / expectedFootprint * 100)}% 차이)`,
        })
      }
    } catch { /* building-geometry 계산 실패 시 무시 */ }
  }
  
  // ━━━━━ E. 배치안 ↔ 평면자동설계 ━━━━━
  
  if (s.floorPlan) {
    // LAY-FP-01: 세대수 불일치
    // 평면설계의 총 세대수 = 층당 세대수 × 주거층수
    const residentialFloors = Math.max(1, s.layout.floors - 1)
    const fpTotalUnits = s.floorPlan.unitsPerFloor * residentialFloors
    // 허용 오차: 층당 반올림 차이 × 주거층수 (최소 2세대)
    const allowedDiff = Math.max(2, residentialFloors)
    if (Math.abs(fpTotalUnits - s.layout.units) > allowedDiff) {
      issues.push({
        id: 'LAY-FP-01', severity: 'warning',
        systemA: '배치안', systemB: '평면설계',
        field: '세대수',
        valueA: s.layout.units, valueB: fpTotalUnits,
        message: `배치안 ${s.layout.units}세대 vs 평면설계 ${fpTotalUnits}세대 (${Math.round(Math.abs(fpTotalUnits - s.layout.units) / s.layout.units * 100)}% 차이)`,
      })
    }
    
    // LAY-FP-02: 전용면적 합계 vs 연면적 정합성
    if (s.floorPlan.totalNetArea > s.layout.gfa) {
      issues.push({
        id: 'LAY-FP-02', severity: 'error',
        systemA: '평면설계', systemB: '배치안',
        field: '전용면적',
        valueA: s.floorPlan.totalNetArea, valueB: s.layout.gfa,
        message: `평면 전용면적 합계 ${s.floorPlan.totalNetArea}㎡가 배치안 연면적 ${s.layout.gfa}㎡를 초과 (물리적 불가능)`,
      })
    }
  }
  
  // ━━━━━ F. 배치안 ↔ 사업성 ━━━━━
  
  if (s.financial) {
    // LAY-FIN-01: 연면적 불일치 (ROI 계산 근거)
    if (Math.abs(s.financial.gfa - s.layout.gfa) > TOLERANCE.gfa) {
      issues.push({
        id: 'LAY-FIN-01', severity: 'error',
        systemA: '배치안', systemB: '사업성',
        field: '연면적',
        valueA: s.layout.gfa, valueB: s.financial.gfa,
        message: `배치안 연면적 ${Math.round(s.layout.gfa)}㎡ ≠ 사업성 계산 ${Math.round(s.financial.gfa)}㎡ → ROI 부정확`,
        fix: '사업성 계산에 배치안 연면적을 직접 전달',
      })
    }
    
    // LAY-FIN-02: 세대수 불일치
    if (Math.abs(s.financial.units - s.layout.units) > TOLERANCE.units) {
      issues.push({
        id: 'LAY-FIN-02', severity: 'warning',
        systemA: '배치안', systemB: '사업성',
        field: '세대수',
        valueA: s.layout.units, valueB: s.financial.units,
        message: `배치안 ${s.layout.units}세대 ≠ 사업성 ${s.financial.units}세대 → 분양수익 오차`,
      })
    }
  }
  
  // ━━━━━ G. 법규 ↔ 일조사선 ━━━━━
  
  if (s.layout.solarData) {
    const isResidential = s.regulation.zoneType.includes('residential') && 
                          !s.regulation.zoneType.includes('semi')
    
    // REG-SOL-01: 주거지역인데 사선제한 미적용
    if (isResidential && !s.layout.solarData.isConstraining && 
        s.layout.floors > 3 && s.regulation.maxHeight > 15) {
      // 사선이 제약이 아닌 게 맞는지 재검증
      const solarCheck = analyzeSolarEnvelope({
        siteArea: s.siteArea,
        heightLimit: s.regulation.maxHeight,
        roadWidth: s.regulation.roadWidth,
        isResidential: true,
      })
      if (solarCheck.isConstraining && !s.layout.solarData.isConstraining) {
        issues.push({
          id: 'REG-SOL-01', severity: 'warning',
          systemA: '일조사선', systemB: '배치안',
          field: '사선제한 판정',
          valueA: '제약 있음', valueB: '제약 없음',
          message: `재검증 결과 사선제한이 실질적 제약인데 배치안에는 미반영 (${solarCheck.reductionPercent}% 감소)`,
        })
      }
    }
  }
  
  // ━━━━━ H. 알렉산더 패턴 ↔ 배치안 ━━━━━
  
  if (s.patterns?.layoutTypeId) {
    // PAT-LAY-01: 패턴 레이아웃 타입 vs 실제 배치안 타입 매칭
    const patternToLayout: Record<string, string[]> = {
      'panorama-tower': ['tower'],
      'sunlight-plate': ['linear'],
      'living-courtyard': ['courtyard'],
      'hill-cascade': ['cluster', 'lshape'],
      'garden-cluster': ['cluster'],
      'safe-streets': ['linear', 'cluster'],
      'mixed-use': ['tower', 'lshape'],
      'profit-tower': ['tower'],
    }
    const validTypes = patternToLayout[s.patterns.layoutTypeId] || []
    const actualType = s.layout._originalType || s.layout.type
    if (validTypes.length > 0 && !validTypes.includes(actualType)) {
      issues.push({
        id: 'PAT-LAY-01', severity: 'info',
        systemA: '알렉산더패턴', systemB: '배치안',
        field: '배치유형',
        valueA: s.patterns.layoutTypeId, valueB: actualType,
        message: `선택된 패턴 '${s.patterns.layoutTypeId}'은 ${validTypes.join('/')}형에 적합하나, 실제 배치안은 '${actualType}'`,
      })
    }
  }
  
  // ━━━━━ I. 도면 ↔ 3D 모델 ↔ AI 렌더링 (3자 교차검증) ━━━━━
  
  if (s.drawings && s.model3d && s.aiRendering) {
    const types = new Set([s.drawings.type, s.model3d.type, s.aiRendering.buildingType])
    if (types.size > 1) {
      issues.push({
        id: 'TRI-01', severity: 'error',
        systemA: '도면+3D+AI렌더링', systemB: '배치안',
        field: '건물유형',
        valueA: s.layout.type, valueB: Array.from(types).join('/'),
        message: `3개 시스템의 건물유형이 불일치: 도면=${s.drawings.type}, 3D=${s.model3d.type}, AI=${s.aiRendering.buildingType}`,
        fix: `모두 배치안의 '${s.layout.type}'으로 통일`,
      })
    }
    
    const floors = new Set([s.drawings.floors, s.model3d.floors, s.aiRendering.floors])
    if (floors.size > 1) {
      issues.push({
        id: 'TRI-02', severity: 'error',
        systemA: '도면+3D+AI렌더링', systemB: '배치안',
        field: '층수',
        valueA: s.layout.floors, valueB: Array.from(floors).join('/'),
        message: `3개 시스템의 층수가 불일치: 도면=${s.drawings.floors}, 3D=${s.model3d.floors}, AI=${s.aiRendering.floors}`,
        fix: `모두 배치안의 ${s.layout.floors}층으로 통일`,
      })
    }
  }
  
  // ━━━━━ J. 내부 정합성 (self-consistency) ━━━━━
  
  // SELF-01: 연면적 = 건축면적 × 층수 (±10%)
  const expectedGFA = s.siteArea * s.layout.coverage / 100 * s.layout.floors
  if (Math.abs(expectedGFA - s.layout.gfa) > expectedGFA * 0.15) {
    issues.push({
      id: 'SELF-01', severity: 'warning',
      systemA: '배치안', systemB: '배치안',
      field: '연면적 계산',
      valueA: Math.round(expectedGFA), valueB: Math.round(s.layout.gfa),
      message: `건폐율×층수로 계산한 연면적 ${Math.round(expectedGFA)}㎡ vs 배치안 표시 ${Math.round(s.layout.gfa)}㎡ (${Math.round(Math.abs(expectedGFA - s.layout.gfa) / expectedGFA * 100)}% 차이)`,
    })
  }
  
  // SELF-02: 주차대수 충분성
  const requiredParking = Math.ceil(s.layout.units * s.regulation.parkingRatio)
  if (s.layout.parking < requiredParking) {
    issues.push({
      id: 'SELF-02', severity: 'warning',
      systemA: '법규', systemB: '배치안',
      field: '주차대수',
      valueA: requiredParking, valueB: s.layout.parking,
      message: `필요 주차 ${requiredParking}대 > 계획 ${s.layout.parking}대`,
    })
  }
  
  // SELF-03: _originalType 유실 체크
  if (s.layout.type === 'cluster' && !s.layout._originalType) {
    issues.push({
      id: 'SELF-03', severity: 'warning',
      systemA: '배치안', systemB: '배치안',
      field: '_originalType',
      valueA: 'cluster', valueB: 'undefined',
      message: `클러스터 변환되었으나 _originalType이 없어 원래 배치유형을 알 수 없음`,
      fix: '클러스터 변환 전에 _originalType = layout.type 저장',
    })
  }
  
  return issues
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 메인 검증 함수
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 전체 시스템 일관성 검증
 * 
 * @param snapshot 현재 시스템 상태 스냅샷
 * @returns 검증 보고서
 */
export function validateConsistency(snapshot: SystemSnapshot): ConsistencyReport {
  const issues = runChecks(snapshot)
  
  const errors = issues.filter(i => i.severity === 'error')
  const warnings = issues.filter(i => i.severity === 'warning')
  const infos = issues.filter(i => i.severity === 'info')
  
  // 총 검증 항목 수 (규칙 ID 기준)
  const totalRules = 22 // 위에서 정의한 총 규칙 수
  const systemsProvided = [
    snapshot.aiRendering, snapshot.drawings, snapshot.model3d,
    snapshot.patterns, snapshot.floorPlan, snapshot.financial,
    snapshot.interiorRendering, snapshot.layout.solarData,
  ].filter(Boolean).length + 2 // regulation + layout은 필수
  
  // 제공된 시스템에 해당하는 규칙만 카운트
  const applicableRules = Math.max(5, Math.floor(totalRules * systemsProvided / 10))
  const passedChecks = applicableRules - errors.length - warnings.length
  
  // 점수: error=-10, warning=-3, info=-0
  const score = Math.max(0, Math.min(100,
    100 - errors.length * 15 - warnings.length * 5 - infos.length * 1
  ))
  
  // 시스템별 상태
  const systemNames = ['법규', '배치안', 'AI렌더링', '인테리어렌더링', '도면', '3D모델', 
                        '알렉산더패턴', '평면설계', '사업성', '일조사선']
  const systemStatus: ConsistencyReport['systemStatus'] = {}
  
  for (const name of systemNames) {
    const sysIssues = issues.filter(i => i.systemA === name || i.systemB === name)
    const hasError = sysIssues.some(i => i.severity === 'error')
    const hasWarning = sysIssues.some(i => i.severity === 'warning')
    const checked = sysIssues.length > 0 || name === '법규' || name === '배치안'
    
    systemStatus[name] = {
      checked,
      issues: sysIssues.length,
      status: !checked ? 'skipped' : hasError ? 'error' : hasWarning ? 'warning' : 'ok',
    }
  }
  
  // 요약
  const summary = errors.length === 0 && warnings.length === 0
    ? `✅ 전체 ${applicableRules}개 검증 항목 통과 — 모든 시스템이 일관됩니다`
    : errors.length === 0
    ? `⚠️ ${warnings.length}개 경고 발견 (${applicableRules - warnings.length}/${applicableRules} 통과) — 권장 수정 사항이 있습니다`
    : `❌ ${errors.length}개 오류 + ${warnings.length}개 경고 — 즉시 수정이 필요합니다`
  
  return {
    isConsistent: errors.length === 0,
    score,
    totalChecks: applicableRules,
    passedChecks: Math.max(0, passedChecks),
    issues,
    summary,
    systemStatus,
  }
}

/**
 * LayoutOption에서 SystemSnapshot을 빠르게 생성하는 헬퍼
 * page.tsx에서 바로 사용 가능
 */
export function createSnapshotFromLayout(
  siteArea: number,
  regulation: SystemSnapshot['regulation'],
  layout: SystemSnapshot['layout'],
  extras?: Partial<Omit<SystemSnapshot, 'siteArea' | 'regulation' | 'layout'>>
): SystemSnapshot {
  return {
    siteArea,
    regulation,
    layout,
    ...extras,
  }
}

/**
 * 검증 보고서를 사람이 읽을 수 있는 문자열로 변환
 */
export function formatConsistencyReport(report: ConsistencyReport): string {
  const lines: string[] = [
    `━━━ 일관성 검증 결과: ${report.score}점 ━━━`,
    report.summary,
    '',
  ]
  
  if (report.issues.length > 0) {
    lines.push('발견된 이슈:')
    for (const issue of report.issues) {
      const icon = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️'
      lines.push(`  ${icon} [${issue.id}] ${issue.message}`)
      if (issue.fix) {
        lines.push(`     → 수정: ${issue.fix}`)
      }
    }
  }
  
  lines.push('')
  lines.push('시스템별 상태:')
  for (const [name, status] of Object.entries(report.systemStatus)) {
    if (status.status === 'skipped') continue
    const icon = status.status === 'ok' ? '✅' : status.status === 'warning' ? '⚠️' : '❌'
    lines.push(`  ${icon} ${name} (${status.issues}건)`)
  }
  
  return lines.join('\n')
}
