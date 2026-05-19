/**
 * TestFit 엔진 10개 샘플 테스트
 * 실제 앱에서 배치안 선택 → 세대 믹스 프리셋 변경 시 동일 로직 실행
 */

import { calculateUnitMix, generateParkingLayout, generateMixedUse, UNIT_MIX_PRESETS } from './lib/testfit-features'

// ━━━ 10개 샘플 대지 ━━━
const samples = [
  { name: '평창동 재건축', addr: '서울 종로구 평창12길 16-6', area: 7165, coverage: 49, floors: 3, units: 72, parking: 72, zone: 'residential-1' },
  { name: '강남 타워', addr: '서울 강남구 테헤란로 152', area: 1200, coverage: 60, floors: 15, units: 120, parking: 140, zone: 'commercial' },
  { name: '마포 빌라', addr: '서울 마포구 연남로 30', area: 660, coverage: 50, floors: 5, units: 20, parking: 20, zone: 'residential-2' },
  { name: '송파 아파트', addr: '서울 송파구 올림픽로 300', area: 3500, coverage: 40, floors: 20, units: 300, parking: 350, zone: 'residential-3' },
  { name: '서초 오피스텔', addr: '서울 서초구 반포대로 100', area: 900, coverage: 55, floors: 10, units: 80, parking: 60, zone: 'semi-residential' },
  { name: '성동 소형 빌라', addr: '서울 성동구 성수이로 50', area: 330, coverage: 55, floors: 4, units: 12, parking: 12, zone: 'residential-2' },
  { name: '용산 복합', addr: '서울 용산구 한강대로 100', area: 5000, coverage: 50, floors: 25, units: 400, parking: 450, zone: 'commercial' },
  { name: '노원 다세대', addr: '서울 노원구 동일로 200', area: 500, coverage: 50, floors: 4, units: 16, parking: 16, zone: 'residential-2' },
  { name: '관악 학생주택', addr: '서울 관악구 관악로 1', area: 800, coverage: 55, floors: 7, units: 50, parking: 25, zone: 'residential-2' },
  { name: '동작 프리미엄', addr: '서울 동작구 현충로 200', area: 2000, coverage: 45, floors: 12, units: 100, parking: 120, zone: 'residential-3' },
]

const presetIds = Object.keys(UNIT_MIX_PRESETS)

console.log('═══════════════════════════════════════════════════════')
console.log('  TestFit 엔진 10개 샘플 테스트')
console.log('═══════════════════════════════════════════════════════\n')

let passCount = 0
let failCount = 0
const errors: string[] = []

for (const s of samples) {
  console.log(`\n━━━ ${s.name} (${s.area}㎡, ${s.floors}층, ${s.units}세대) ━━━`)
  
  try {
    // ① 세대 믹스 — 6종 프리셋 전부 테스트
    const exclusiveArea = s.area * s.coverage / 100 * s.floors * 0.65
    console.log(`  전용면적: ${exclusiveArea.toFixed(0)}㎡`)
    
    for (const presetId of presetIds) {
      const preset = UNIT_MIX_PRESETS[presetId]
      const result = calculateUnitMix({
        totalExclusiveArea: exclusiveArea,
        mix: preset.mix,
        basePricePerM2: 5000000,
      })
      
      // 검증: NaN 체크
      if (isNaN(result.totalUnits) || isNaN(result.avgUnitArea) || isNaN(result.estimatedRevenue)) {
        failCount++
        const msg = `  ❌ [${s.name}] ${preset.name}: NaN 발견! units=${result.totalUnits}, avg=${result.avgUnitArea}, revenue=${result.estimatedRevenue}`
        console.log(msg)
        errors.push(msg)
        continue
      }
      
      // 검증: 0세대 체크
      if (result.totalUnits === 0) {
        failCount++
        const msg = `  ❌ [${s.name}] ${preset.name}: 0세대`
        console.log(msg)
        errors.push(msg)
        continue
      }
      
      // 검증: 음수 수입 체크
      if (result.estimatedRevenue < 0) {
        failCount++
        const msg = `  ❌ [${s.name}] ${preset.name}: 음수 수입 ${result.estimatedRevenue}`
        console.log(msg)
        errors.push(msg)
        continue
      }
      
      passCount++
      const units = result.units.filter(u => u.count > 0).map(u => `${u.type.name}${u.count}호`).join(', ')
      console.log(`  ✅ ${preset.name}: ${result.totalUnits}세대, 평균 ${result.avgUnitArea.toFixed(0)}㎡, ${(result.estimatedRevenue/1e8).toFixed(1)}억원 [${units}]`)
    }
    
    // ② 주차 레이아웃
    const parking = generateParkingLayout({
      requiredSpaces: s.parking,
      siteArea: s.area,
      buildingFootprint: s.area * s.coverage / 100,
      floors: s.floors,
    })
    
    if (isNaN(parking.totalSpaces) || parking.totalSpaces < 0) {
      failCount++
      const msg = `  ❌ [${s.name}] 주차: NaN 또는 음수 (${parking.totalSpaces})`
      console.log(msg)
      errors.push(msg)
    } else {
      passCount++
      console.log(`  ✅ 주차: ${parking.type} ${parking.totalSpaces}대 (일반${parking.regularSpaces}/소형${parking.compactSpaces}/장애인${parking.disabledSpaces}/전기차${parking.evSpaces}), ${parking.area}㎡, ${(parking.totalCost/1e8).toFixed(0)}억원`)
    }
    
    // ③ 복합개발
    const mixed = generateMixedUse({
      siteArea: s.area,
      totalFloors: s.floors,
      coverage: s.coverage,
      zoneType: s.zone,
    })
    
    if (isNaN(mixed.totalGFA) || mixed.totalGFA <= 0) {
      failCount++
      const msg = `  ❌ [${s.name}] 복합개발: GFA 이상 (${mixed.totalGFA})`
      console.log(msg)
      errors.push(msg)
    } else {
      passCount++
      const uses = mixed.uses.map(u => `${u.nameKo}:${u.area.toFixed(0)}㎡`).join(', ')
      console.log(`  ✅ 복합개발: GFA ${mixed.totalGFA.toFixed(0)}㎡, 수입 ${(mixed.totalRevenue/1e8).toFixed(1)}억원 [${uses}]`)
    }
    
  } catch (e: any) {
    failCount++
    const msg = `  ❌ [${s.name}] 크래시: ${e.message}`
    console.log(msg)
    errors.push(msg)
  }
}

console.log('\n═══════════════════════════════════════════════════════')
console.log(`  결과: ✅ ${passCount} PASS / ❌ ${failCount} FAIL`)
console.log('═══════════════════════════════════════════════════════')

if (errors.length > 0) {
  console.log('\n⚠️ 실패 목록:')
  errors.forEach(e => console.log(e))
}

process.exit(failCount > 0 ? 1 : 0)
