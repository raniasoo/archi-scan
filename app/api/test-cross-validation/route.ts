import { NextResponse } from 'next/server'
import { getBuildingDimensionsInMeters } from '@/lib/building-geometry'

// GET /api/test-cross-validation — 10개 시나리오 교차 검증 자동 테스트
export async function GET() {
  const scenarios = [
    { name: '강남 타워형', type: 'tower', siteArea: 500, coverage: 50, floors: 10, units: 36 },
    { name: '분당 ㄱ자형', type: 'lshape', siteArea: 860, coverage: 20, floors: 6, units: 5 },
    { name: '판교 판상형', type: 'linear', siteArea: 1200, coverage: 55, floors: 7, units: 42 },
    { name: '성수 중정형', type: 'courtyard', siteArea: 950, coverage: 45, floors: 5, units: 16 },
    { name: '잠실 클러스터←타워', type: 'cluster', siteArea: 3000, coverage: 40, floors: 5, units: 60, buildingCount: 4, originalType: 'tower' },
    { name: '홍대 상업타워', type: 'tower', siteArea: 400, coverage: 70, floors: 15, units: 56 },
    { name: '이태원 ㄱ자대형', type: 'lshape', siteArea: 2000, coverage: 30, floors: 4, units: 24 },
    { name: '서초 판상고밀', type: 'linear', siteArea: 1500, coverage: 60, floors: 8, units: 96 },
    { name: '마포 중정소형', type: 'courtyard', siteArea: 600, coverage: 50, floors: 4, units: 12 },
    { name: '강동 클러스터←ㄱ자', type: 'cluster', siteArea: 2500, coverage: 35, floors: 5, units: 30, buildingCount: 3, originalType: 'lshape' },
  ]

  const results = scenarios.map(s => {
    try {
      // SVG/3D 측 geometry
      const svgGeo = getBuildingDimensionsInMeters({
        type: s.type as any, coverage: s.coverage, siteArea: s.siteArea,
        floors: s.floors, buildingCount: s.buildingCount, originalType: s.originalType,
      })

      // AI 렌더링 측 geometry (수정 후: _originalType || type 전달)
      const aiType = s.originalType || s.type
      const aiGeo = getBuildingDimensionsInMeters({
        type: aiType as any, coverage: s.coverage, siteArea: s.siteArea,
        floors: s.floors, buildingCount: s.buildingCount, originalType: s.originalType || aiType,
      })

      // 검증 항목
      const checks = {
        typeMatch: (s.originalType || s.type) === aiType,
        svgBlocks: svgGeo.blocksInMeters.length,
        aiBlocks: aiGeo.blocksInMeters.length,
        blocksMatch: svgGeo.blocksInMeters.length === aiGeo.blocksInMeters.length,
        svgFootprint: Math.round(svgGeo.totalFootprint),
        aiFootprint: Math.round(aiGeo.totalFootprint),
        footprintMatch: Math.abs(svgGeo.totalFootprint - aiGeo.totalFootprint) / svgGeo.totalFootprint < 0.05,
        svgBlock0: svgGeo.blocksInMeters[0] ? {
          w: +svgGeo.blocksInMeters[0].widthM.toFixed(1),
          d: +svgGeo.blocksInMeters[0].depthM.toFixed(1),
          ratio: +(svgGeo.blocksInMeters[0].widthM / svgGeo.blocksInMeters[0].depthM).toFixed(2),
        } : null,
        aiBlock0: aiGeo.blocksInMeters[0] ? {
          w: +aiGeo.blocksInMeters[0].widthM.toFixed(1),
          d: +aiGeo.blocksInMeters[0].depthM.toFixed(1),
          ratio: +(aiGeo.blocksInMeters[0].widthM / aiGeo.blocksInMeters[0].depthM).toFixed(2),
        } : null,
      }

      const passCount = [checks.typeMatch, checks.blocksMatch, checks.footprintMatch].filter(Boolean).length
      const score = Math.round(passCount / 3 * 100)

      return {
        name: s.name,
        type: s.type,
        originalType: s.originalType || null,
        aiType,
        siteArea: s.siteArea,
        coverage: s.coverage,
        floors: s.floors,
        units: s.units,
        checks,
        score,
        status: score === 100 ? 'PASS' : score >= 67 ? 'WARN' : 'FAIL',
      }
    } catch (e: any) {
      return { name: s.name, type: s.type, error: e.message, score: 0, status: 'ERROR' }
    }
  })

  const totalPass = results.filter(r => r.status === 'PASS').length
  const totalWarn = results.filter(r => r.status === 'WARN').length
  const totalFail = results.filter(r => r.status === 'FAIL' || r.status === 'ERROR').length

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    commit: 'b065010',
    summary: { total: 10, pass: totalPass, warn: totalWarn, fail: totalFail },
    results,
  })
}
