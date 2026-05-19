import { analyzeTerrainAndSoil } from '../lib/terrain-soil-analysis'
import { generateSiteRiskReport } from '../lib/site-risk-analysis'
import { analyzeSubsidence, analyzeCollapseRisk, analyzeSiteHistoryDetail, analyzeSoilContamination, analyzeCulturalHeritage } from '../lib/site-deep-analysis'
import { calculateSiteDesignImpact, calculateSiteBOQImpact, calculateSiteFeasibilityImpact, generateSiteVerification } from '../lib/site-design-bridge'

// 10개 주소 — 실제 표고 데이터 (archiscan.kr/api/terrain에서 조회한 실데이터)
const cases = [
  { name: '① 강남 역삼동', addr: '서울특별시 강남구', elev: 43, min: 37, max: 47, slope: 2, soil: 'SAND', fl: 10, area: 500, gw: 'low', baseCost: 1880000000, roi: 28, npv: 14 },
  { name: '② 서초 서초동', addr: '서울특별시 서초구', elev: 30, min: 30, max: 39, slope: 5.8, soil: 'SAND', fl: 7, area: 700, gw: 'low', baseCost: 1500000000, roi: 25, npv: 11 },
  { name: '③ 용산 한남동', addr: '서울특별시 용산구', elev: 47, min: 36, max: 48, slope: 9.1, soil: 'SAND', fl: 15, area: 600, gw: 'low', baseCost: 2200000000, roi: 30, npv: 18 },
  { name: '④ 마포 합정동', addr: '서울특별시 마포구', elev: 17, min: 16, max: 22, slope: 3.4, soil: 'SAND', fl: 5, area: 400, gw: 'low', baseCost: 800000000, roi: 18, npv: 6 },
  { name: '⑤ 송파 잠실동', addr: '서울특별시 송파구', elev: 17, min: 15, max: 20, slope: 2.9, soil: 'CLAY', fl: 8, area: 800, gw: 'medium', baseCost: 1600000000, roi: 22, npv: 9 },
  { name: '⑥ 성동 성수동', addr: '서울특별시 성동구', elev: 16, min: 16, max: 21, slope: 4.5, soil: 'SAND', fl: 5, area: 500, gw: 'low', baseCost: 900000000, roi: 20, npv: 7 },
  { name: '⑦ 종로 인사동', addr: '서울특별시 종로구', elev: 35, min: 33, max: 37, slope: 3, soil: 'SAND', fl: 5, area: 400, gw: 'low', baseCost: 800000000, roi: 15, npv: 5, bldAge: 45 },
  { name: '⑧ 부산 해운대', addr: '부산광역시 해운대구', elev: 9, min: 6, max: 11, slope: 4, soil: 'SILT', fl: 20, area: 1000, gw: 'high', baseCost: 3500000000, roi: 24, npv: 12 },
  { name: '⑨ 인천 송도', addr: '인천광역시 연수구', elev: 3, min: 2, max: 5, slope: 0.5, soil: 'FILL', fl: 15, area: 1200, gw: 'high', baseCost: 4500000000, roi: 22, npv: 10 },
  { name: '⑩ 분당 정자동', addr: '경기도 성남시 분당구', elev: 66, min: 66, max: 68, slope: 1.4, soil: 'SAND', fl: 10, area: 700, gw: 'low', baseCost: 1700000000, roi: 26, npv: 13 },
]

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('  🔗 대지 분석 → 설계 → BOQ → 사업성 → 검증 전체 파이프라인 테스트')
console.log('  (표고 데이터: archiscan.kr/api/terrain 실서버에서 조회한 실데이터)')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

let totalPass = 0, totalFail = 0

for (const c of cases) {
  // A. 대지 분석
  const terrain = analyzeTerrainAndSoil({ elevation: c.elev, minElevation: c.min, maxElevation: c.max, slope: c.slope, slopeDirection: '', floors: c.fl, siteArea: c.area })
  const risk = generateSiteRiskReport({ address: c.addr, elevation: c.elev, slope: c.slope, soilCode: c.soil, floors: c.fl, siteArea: c.area, buildingAge: (c as any).bldAge })
  const subsidence = analyzeSubsidence({ soilCode: c.soil, elevation: c.elev, floors: c.fl, siteArea: c.area, groundwaterRisk: c.gw })
  
  // B. 브릿지 — 대지→설계→BOQ→사업성→검증
  const design = calculateSiteDesignImpact({ terrain, risk, subsidence, floors: c.fl, siteArea: c.area, gfa: c.area * c.fl * 0.5 })
  const boq = calculateSiteBOQImpact({ terrain, risk, subsidence, design, floors: c.fl, siteArea: c.area, baseBOQCost: c.baseCost })
  const feasibility = calculateSiteFeasibilityImpact({ boqImpact: boq, subsidence, risk, baseROI: c.roi, baseNPV: c.npv, baseTotalCost: c.baseCost * 3, constructionMonths: 24 })
  const verify = generateSiteVerification({ design, terrain, risk, subsidence })
  
  // C. 심화 분석
  const collapse = analyzeCollapseRisk({ slope: c.slope, elevation: c.elev, soilCode: c.soil, buildingAge: (c as any).bldAge, floors: c.fl })
  const heritage = analyzeCulturalHeritage({ address: c.addr, siteArea: c.area, elevation: c.elev })

  const icon = verify.criticalCount > 0 ? '🔴' : verify.failCount > 0 ? '🟡' : '🟢'
  totalPass += verify.passCount
  totalFail += verify.failCount

  console.log(`\n${icon} ${c.name} (${c.elev}m, ${c.soil}, 경사${c.slope}%)`)
  console.log(`  ┌─ 대지분석: 토질=${terrain.estimatedSoil.nameKo} 지내력=${terrain.estimatedSoil.bearing}kN/㎡ 적합도=${terrain.buildabilityScore}점`)
  console.log(`  ├─ 위험도: 지진=${risk.seismic.risk}(${risk.seismic.zone}-${risk.seismic.siteClass}) 침수=${risk.flood.risk} 침하=${subsidence.risk}(${subsidence.estimatedSettlement}mm)`)
  console.log(`  ├─ 설계반영: 기초=${design.foundation.type} GL+${design.architectural.floorLevelGL}mm 내진=${design.structural.seismicCategory}`)
  if (design.foundation.pilesNeeded) console.log(`  │   파일: ${design.foundation.pileCount}본 × ${design.foundation.pileLength}m`)
  if (design.architectural.retainingWall) console.log(`  │   옹벽: H=${design.architectural.retainingHeight}m`)
  console.log(`  ├─ BOQ추가: ${boq.additionalItems.length}항목 +${(boq.totalAdditionalCost/1e8).toFixed(1)}억 (+${boq.costIncreasePercent}%)`)
  console.log(`  ├─ 사업성: ROI ${c.roi}% → ${feasibility.adjustedROI}% | NPV ${c.npv}억 → ${feasibility.adjustedNPV}억 | 지연+${feasibility.scheduleDelay}개월`)
  console.log(`  └─ 검증: ${verify.passCount}✅ ${verify.failCount}❌ ${verify.criticalCount}🔴`)
  
  // 실패/경고 항목만 표시
  const issues = verify.checks.filter(ch => !ch.pass || ch.severity === 'warning')
  if (issues.length > 0) {
    issues.forEach(ch => console.log(`     ${ch.pass ? '⚠️' : '❌'} ${ch.id}: ${ch.name} — ${ch.description}`))
  }
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log(`  종합: ${totalPass}✅ / ${totalFail}❌ (${cases.length}개 주소 × 15항목 = ${cases.length * 15}항목 검증)`)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
