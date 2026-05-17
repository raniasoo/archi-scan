// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ④ 교차 검증 (Cross-Validation)
// SVG/3D 도면 ↔ AI 렌더링 간 일관성 자동 검증
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { getBuildingDimensionsInMeters } from '@/lib/building-geometry'

export type CheckStatus = 'pass' | 'warn' | 'fail' | 'skip'

export interface ValidationItem {
  id: string
  category: 'geometry' | 'parameter' | 'visual'
  label: string
  status: CheckStatus
  expected: string
  actual: string
  detail: string
  severity: 'critical' | 'major' | 'minor'
}

export interface ValidationResult {
  timestamp: number
  items: ValidationItem[]
  summary: { pass: number; warn: number; fail: number; skip: number; score: number }
}

export interface CrossValidationInput {
  // SVG/3D 측 파라미터 (building-geometry 기반)
  svgParams: {
    type: string
    originalType?: string
    coverage: number
    siteArea: number
    floors: number
    units: number
    buildingCount?: number
    parking?: number
    gfa?: number
  }
  // AI 렌더링 측 파라미터 (API에 전달된 값)
  aiParams: {
    buildingType?: string
    originalType?: string
    coverage?: number
    siteArea?: number
    floors?: number
    units?: number
    buildingCount?: number
  }
  // 법규 제한값
  regulation?: {
    maxCoverageRatio?: number
    maxFloorAreaRatio?: number
    maxHeight?: number
    maxFloors?: number
  }
  // AI 렌더링 결과 이미지 존재 여부
  hasAiRender?: boolean
  // 3D 캡처 이미지 존재 여부
  has3dCapture?: boolean
}

/**
 * SVG/3D 도면과 AI 렌더링 간 교차 검증 실행
 */
export function runCrossValidation(input: CrossValidationInput): ValidationResult {
  const items: ValidationItem[] = []
  const { svgParams: svg, aiParams: ai, regulation: reg } = input

  // ━━━ 1. 건물 타입 일치 검증 ━━━
  const svgType = svg.originalType || svg.type
  const aiType = ai.originalType || ai.buildingType || ''
  items.push({
    id: 'type-match',
    category: 'parameter',
    label: '건물 타입 일치',
    status: !aiType ? 'skip' : svgType === aiType ? 'pass' : 'fail',
    expected: svgType,
    actual: aiType || '(미전달)',
    detail: svgType !== aiType
      ? `SVG/3D는 "${svgType}"으로 그리지만 AI는 "${aiType}"로 렌더링 → 형태 불일치 위험`
      : '도면과 AI 렌더링이 동일한 건물 타입을 사용',
    severity: 'critical',
  })

  // ━━━ 2. 층수 일치 검증 ━━━
  items.push({
    id: 'floors-match',
    category: 'parameter',
    label: '층수 일치',
    status: !ai.floors ? 'skip' : svg.floors === ai.floors ? 'pass' : 'fail',
    expected: `${svg.floors}층`,
    actual: ai.floors ? `${ai.floors}층` : '(미전달)',
    detail: svg.floors !== ai.floors
      ? `도면은 ${svg.floors}층이지만 AI에 ${ai.floors}층으로 전달 → 높이 불일치`
      : '동일한 층수',
    severity: 'critical',
  })

  // ━━━ 3. 세대수 일치 검증 ━━━
  items.push({
    id: 'units-match',
    category: 'parameter',
    label: '세대수 일치',
    status: !ai.units ? 'skip' : svg.units === ai.units ? 'pass' : Math.abs(svg.units - (ai.units || 0)) <= 2 ? 'warn' : 'fail',
    expected: `${svg.units}세대`,
    actual: ai.units ? `${ai.units}세대` : '(미전달)',
    detail: svg.units !== ai.units
      ? `도면 ${svg.units}세대 vs AI ${ai.units}세대 → 건물 규모 인식 차이`
      : '동일한 세대수',
    severity: 'major',
  })

  // ━━━ 4. 건폐율 일치 검증 ━━━
  items.push({
    id: 'coverage-match',
    category: 'parameter',
    label: '건폐율 일치',
    status: !ai.coverage ? 'skip' : svg.coverage === ai.coverage ? 'pass' : Math.abs(svg.coverage - (ai.coverage || 0)) <= 3 ? 'warn' : 'fail',
    expected: `${svg.coverage}%`,
    actual: ai.coverage ? `${ai.coverage}%` : '(미전달)',
    detail: svg.coverage !== ai.coverage
      ? `건폐율 차이 ${Math.abs(svg.coverage - (ai.coverage || 0))}% → 건물 면적 비율 불일치`
      : '동일한 건폐율',
    severity: 'major',
  })

  // ━━━ 5. 대지면적 일치 검증 ━━━
  items.push({
    id: 'site-area-match',
    category: 'parameter',
    label: '대지면적 일치',
    status: !ai.siteArea ? 'skip' : svg.siteArea === ai.siteArea ? 'pass' : Math.abs(svg.siteArea - (ai.siteArea || 0)) / svg.siteArea < 0.05 ? 'warn' : 'fail',
    expected: `${svg.siteArea}㎡`,
    actual: ai.siteArea ? `${ai.siteArea}㎡` : '(미전달)',
    detail: '대지면적이 동일해야 건물 비율이 정확',
    severity: 'major',
  })

  // ━━━ 6. 동수 일치 검증 (클러스터/다동) ━━━
  const svgCount = svg.buildingCount || 1
  const aiCount = ai.buildingCount || 1
  items.push({
    id: 'building-count-match',
    category: 'parameter',
    label: '동수 일치',
    status: svgCount === aiCount ? 'pass' : 'fail',
    expected: `${svgCount}동`,
    actual: `${aiCount}동`,
    detail: svgCount !== aiCount
      ? `도면 ${svgCount}동 vs AI ${aiCount}동 → 건물 개수 불일치`
      : '동일한 동수',
    severity: svgCount > 1 || aiCount > 1 ? 'critical' : 'minor',
  })

  // ━━━ 7. building-geometry 블록 치수 검증 ━━━
  try {
    const geo = getBuildingDimensionsInMeters({
      type: svg.type,
      coverage: svg.coverage,
      siteArea: svg.siteArea,
      floors: svg.floors,
      buildingCount: svg.buildingCount,
      originalType: svg.originalType,
    })
    const aiGeo = getBuildingDimensionsInMeters({
      type: ai.buildingType || svg.type,
      coverage: ai.coverage || svg.coverage,
      siteArea: ai.siteArea || svg.siteArea,
      floors: ai.floors || svg.floors,
      buildingCount: ai.buildingCount,
      originalType: ai.originalType || ai.buildingType,
    })

    const svgBlocks = geo.blocksInMeters
    const aiBlocks = aiGeo.blocksInMeters

    // 블록 수 비교
    items.push({
      id: 'block-count',
      category: 'geometry',
      label: '블록 수 일치',
      status: svgBlocks.length === aiBlocks.length ? 'pass' : 'fail',
      expected: `${svgBlocks.length}개 블록`,
      actual: `${aiBlocks.length}개 블록`,
      detail: svgBlocks.length !== aiBlocks.length
        ? `SVG/3D는 ${svgBlocks.length}개 블록으로 그리지만 AI는 ${aiBlocks.length}개 → 형태 불일치`
        : 'building-geometry 블록 구조 일치',
      severity: 'critical',
    })

    // 첫 블록 종횡비 비교
    if (svgBlocks.length > 0 && aiBlocks.length > 0) {
      const svgRatio = svgBlocks[0].widthM / svgBlocks[0].depthM
      const aiRatio = aiBlocks[0].widthM / aiBlocks[0].depthM
      const ratioDiff = Math.abs(svgRatio - aiRatio)
      items.push({
        id: 'aspect-ratio',
        category: 'geometry',
        label: '건물 종횡비 일치',
        status: ratioDiff < 0.05 ? 'pass' : ratioDiff < 0.2 ? 'warn' : 'fail',
        expected: `${svgBlocks[0].widthM.toFixed(1)}m × ${svgBlocks[0].depthM.toFixed(1)}m (${svgRatio.toFixed(2)})`,
        actual: `${aiBlocks[0].widthM.toFixed(1)}m × ${aiBlocks[0].depthM.toFixed(1)}m (${aiRatio.toFixed(2)})`,
        detail: ratioDiff >= 0.2
          ? `종횡비 차이 ${(ratioDiff * 100).toFixed(0)}% → 건물 비율이 다르게 보일 수 있음`
          : '건물 비율 일치',
        severity: 'major',
      })

      // 건축면적 비교
      const svgFootprint = geo.totalFootprint
      const aiFootprint = aiGeo.totalFootprint
      const fpDiff = Math.abs(svgFootprint - aiFootprint) / svgFootprint
      items.push({
        id: 'footprint-area',
        category: 'geometry',
        label: '건축면적 일치',
        status: fpDiff < 0.01 ? 'pass' : fpDiff < 0.1 ? 'warn' : 'fail',
        expected: `${Math.round(svgFootprint)}㎡`,
        actual: `${Math.round(aiFootprint)}㎡`,
        detail: fpDiff >= 0.1
          ? `건축면적 차이 ${(fpDiff * 100).toFixed(0)}% → 건물 크기 불일치`
          : '건축면적 일치',
        severity: 'major',
      })
    }
  } catch (e) {
    items.push({
      id: 'geometry-error',
      category: 'geometry',
      label: 'building-geometry 계산',
      status: 'warn',
      expected: '정상 계산',
      actual: '계산 오류',
      detail: `블록 치수 비교 불가: ${e}`,
      severity: 'minor',
    })
  }

  // ━━━ 8. 법규 준수 검증 ━━━
  if (reg) {
    if (reg.maxCoverageRatio) {
      items.push({
        id: 'legal-coverage',
        category: 'parameter',
        label: '건폐율 법규 준수',
        status: svg.coverage <= reg.maxCoverageRatio ? 'pass' : 'fail',
        expected: `≤ ${reg.maxCoverageRatio}%`,
        actual: `${svg.coverage}%`,
        detail: svg.coverage > reg.maxCoverageRatio
          ? `건폐율 ${svg.coverage}%가 법정 한도 ${reg.maxCoverageRatio}% 초과`
          : '법정 건폐율 이내',
        severity: 'critical',
      })
    }
    if (reg.maxFloors) {
      items.push({
        id: 'legal-floors',
        category: 'parameter',
        label: '층수 법규 준수',
        status: svg.floors <= reg.maxFloors ? 'pass' : 'fail',
        expected: `≤ ${reg.maxFloors}층`,
        actual: `${svg.floors}층`,
        detail: svg.floors > reg.maxFloors
          ? `${svg.floors}층이 법정 ${reg.maxFloors}층 초과`
          : '법정 층수 이내',
        severity: 'critical',
      })
    }
  }

  // ━━━ 9. 시각 출력물 존재 검증 ━━━
  items.push({
    id: 'ai-render-exists',
    category: 'visual',
    label: 'AI 렌더링 생성 완료',
    status: input.hasAiRender ? 'pass' : 'skip',
    expected: '이미지 생성됨',
    actual: input.hasAiRender ? '생성 완료' : '미생성',
    detail: input.hasAiRender ? 'AI 렌더링 이미지 존재' : 'AI 렌더링을 먼저 생성하세요',
    severity: 'minor',
  })

  items.push({
    id: '3d-capture-exists',
    category: 'visual',
    label: '3D 캡처 참조 전달',
    status: input.has3dCapture ? 'pass' : 'warn',
    expected: '3D 캡처 전달됨',
    actual: input.has3dCapture ? '전달 완료' : '미전달',
    detail: input.has3dCapture
      ? '3D 모델 캡처가 AI 렌더링의 형태 참조로 사용됨'
      : '3D 캡처 없이 AI 렌더링 → 형태 정확도 저하 가능',
    severity: 'minor',
  })

  // ━━━ 점수 집계 ━━━
  const summary = {
    pass: items.filter(i => i.status === 'pass').length,
    warn: items.filter(i => i.status === 'warn').length,
    fail: items.filter(i => i.status === 'fail').length,
    skip: items.filter(i => i.status === 'skip').length,
    score: 0,
  }
  const checked = summary.pass + summary.warn + summary.fail
  summary.score = checked > 0
    ? Math.round((summary.pass / checked) * 100 - summary.fail * 10)
    : 0
  summary.score = Math.max(0, Math.min(100, summary.score))

  return { timestamp: Date.now(), items, summary }
}
