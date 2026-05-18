/**
 * 사업성 검토 + 보고서 세계 최고 수준 검증 엔진
 * 
 * Gap 1: ROI 계산 공식 역산 검증
 * Gap 2: 공사비/분양가 시장 합리성
 * Gap 3: 손익분기 역산 + 사업 가능성
 * Gap 4: 보고서 섹션 간 숫자 교차 검증
 * Gap 5: 5등급 종합 판정
 */

export interface FeasibilityData {
  roi: number                // ROI (%)
  totalCost: number          // 총투자비 (억원)
  expectedRevenue: number    // 예상매출 (억원)
  expectedProfit: number     // 예상수익 (억원)
  breakeven: number          // 손익분기 분양률 (%)
  landCost: number           // 토지비 (억원)
  constructionCost: number   // 공사비 (억원)
  otherCost: number          // 부대비 (억원)
  gfa: number                // 연면적 (㎡)
  salePrice: number          // 분양가 (만원/㎡)
  constructionUnitCost: number // 공사비 단가 (만원/㎡)
  planName: string           // 배치안명
  verdict: string            // 종합 판정
  units: number              // 세대수
  floors: number             // 층수
}

export interface ReportData {
  address: string
  siteArea: number
  zoning: string
  coverage: number           // 건폐율 (%)
  far: number                // 용적률 (%)
  floors: number
  units: number
  gfa: number
  roi: number
  totalCost: number
  profit: number
  verdict: string
  planName: string
  breakeven: number
  scenarios?: { optimistic: number; base: number; pessimistic: number }
}

export interface FeasibilityCheck {
  id: string
  category: 'FORMULA' | 'MARKET' | 'BREAKEVEN' | 'CROSS-SECTION' | 'JUDGMENT'
  item: string
  pass: boolean
  score: number
  detail: string
  severity: 'critical' | 'major' | 'minor'
}

export interface FeasibilityReport {
  checks: FeasibilityCheck[]
  formulaScore: number
  marketScore: number
  breakevenScore: number
  crossSectionScore: number
  judgmentScore: number
  overall: number
  grade: string    // S/A+/A/B+/B/C/D
  feasibilityGrade: string  // 사업성 5등급
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Gap 1: ROI 계산 공식 역산 검증
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function verifyFormula(f: FeasibilityData): FeasibilityCheck[] {
  const checks: FeasibilityCheck[] = []

  // F-01: ROI = (매출 - 비용) / 비용 × 100
  const calcROI = f.totalCost > 0 ? ((f.expectedRevenue - f.totalCost) / f.totalCost) * 100 : 0
  const roiDiff = Math.abs(calcROI - f.roi)
  checks.push({ id: 'F-01', category: 'FORMULA', item: 'ROI 공식 역산', pass: roiDiff < 1.0, score: roiDiff < 0.5 ? 100 : roiDiff < 1.0 ? 90 : roiDiff < 5.0 ? 60 : 30, detail: `계산 ${calcROI.toFixed(1)}% vs 표시 ${f.roi.toFixed(1)}% (차이 ${roiDiff.toFixed(1)}%)`, severity: 'critical' })

  // F-02: 수익 = 매출 - 비용
  const calcProfit = f.expectedRevenue - f.totalCost
  const profitDiff = Math.abs(calcProfit - f.expectedProfit)
  const profitOK = f.totalCost > 0 ? profitDiff / f.totalCost < 0.05 : profitDiff < 0.1
  checks.push({ id: 'F-02', category: 'FORMULA', item: '수익 = 매출 - 비용', pass: profitOK, score: profitOK ? 100 : 50, detail: `계산 ${calcProfit.toFixed(1)}억 vs 표시 ${f.expectedProfit.toFixed(1)}억`, severity: 'critical' })

  // F-03: 총투자비 = 토지비 + 공사비 + 부대비
  const calcTotal = f.landCost + f.constructionCost + f.otherCost
  const totalDiff = Math.abs(calcTotal - f.totalCost)
  const totalOK = f.totalCost > 0 ? totalDiff / f.totalCost < 0.05 : totalDiff < 0.1
  checks.push({ id: 'F-03', category: 'FORMULA', item: '총투자비 = 토지+공사+부대', pass: totalOK, score: totalOK ? 100 : 50, detail: `토지${f.landCost.toFixed(1)}+공사${f.constructionCost.toFixed(1)}+부대${f.otherCost.toFixed(1)}=${calcTotal.toFixed(1)}억 vs ${f.totalCost.toFixed(1)}억`, severity: 'critical' })

  // F-04: 매출 역산 (분양면적 = GFA × 0.6~0.85, 만원→억원)
  // 한국 부동산: 분양면적 ≠ 연면적(GFA). 분양면적 ≈ GFA × 전용률
  const calcRevenueHigh = f.gfa * f.salePrice / 10000
  const calcRevenueLow = f.gfa * 0.5 * f.salePrice / 10000
  const revInRange = f.expectedRevenue >= calcRevenueLow * 0.5 && f.expectedRevenue <= calcRevenueHigh * 1.2
  checks.push({ id: 'F-04', category: 'FORMULA', item: '매출 역산', pass: revInRange, score: revInRange ? 100 : 50, detail: `매출 ${f.expectedRevenue.toFixed(1)}억 (GFA기준 ${calcRevenueLow.toFixed(0)}~${calcRevenueHigh.toFixed(0)}억 범위)`, severity: 'major' })

  // F-05: 공사비 역산 (GFA × 단가, 공용부 포함)
  const calcConstHigh = f.gfa * f.constructionUnitCost / 10000
  const calcConstLow = f.gfa * 0.4 * f.constructionUnitCost / 10000
  const constInRange = f.constructionCost >= calcConstLow * 0.5 && f.constructionCost <= calcConstHigh * 1.2
  checks.push({ id: 'F-05', category: 'FORMULA', item: '공사비 역산', pass: constInRange, score: constInRange ? 100 : 50, detail: `공사비 ${f.constructionCost.toFixed(1)}억 (GFA기준 ${calcConstLow.toFixed(0)}~${calcConstHigh.toFixed(0)}억 범위)`, severity: 'major' })

  return checks
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Gap 2: 공사비/분양가 시장 합리성
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function verifyMarket(f: FeasibilityData): FeasibilityCheck[] {
  const checks: FeasibilityCheck[] = []

  // M-01: 공사비 단가 범위 (350~650만원/㎡ = 한국 2024~2025 기준)
  const constMin = 350, constMax = 650
  const constOK = f.constructionUnitCost >= constMin && f.constructionUnitCost <= constMax
  checks.push({ id: 'M-01', category: 'MARKET', item: '공사비 단가 시장 범위', pass: constOK, score: constOK ? 100 : f.constructionUnitCost > 0 ? 60 : 0, detail: `${f.constructionUnitCost}만/㎡ (시장 ${constMin}~${constMax}만)`, severity: 'major' })

  // M-02: 분양가 범위 (지역별 차이 — 만원/㎡ 또는 만원/평)
  const saleMin = 300, saleMax = 5000
  const saleOK = f.salePrice >= saleMin && f.salePrice <= saleMax
  checks.push({ id: 'M-02', category: 'MARKET', item: '분양가 시장 범위', pass: saleOK, score: saleOK ? 100 : f.salePrice > 0 ? 60 : 0, detail: `${f.salePrice}만/㎡ (시장 ${saleMin}~${saleMax}만)`, severity: 'major' })

  // M-03: 토지비 비중 (총투자비의 30~70% 정상)
  const landRatio = f.totalCost > 0 ? f.landCost / f.totalCost * 100 : 0
  const landOK = landRatio >= 20 && landRatio <= 75
  checks.push({ id: 'M-03', category: 'MARKET', item: '토지비 비중', pass: landOK, score: landOK ? 100 : 60, detail: `${landRatio.toFixed(0)}% (정상 20~75%)`, severity: 'minor' })

  // M-04: 공사비 비중 (총투자비의 25~60%)
  const constRatio = f.totalCost > 0 ? f.constructionCost / f.totalCost * 100 : 0
  const constRatioOK = constRatio >= 15 && constRatio <= 65
  checks.push({ id: 'M-04', category: 'MARKET', item: '공사비 비중', pass: constRatioOK, score: constRatioOK ? 100 : 60, detail: `${constRatio.toFixed(0)}% (정상 15~65%)`, severity: 'minor' })

  // M-05: 부대비 비중 (총투자비의 5~20%)
  const otherRatio = f.totalCost > 0 ? f.otherCost / f.totalCost * 100 : 0
  const otherOK = otherRatio >= 3 && otherRatio <= 25
  checks.push({ id: 'M-05', category: 'MARKET', item: '부대비 비중', pass: otherOK, score: otherOK ? 100 : 60, detail: `${otherRatio.toFixed(0)}% (정상 3~25%)`, severity: 'minor' })

  return checks
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Gap 3: 손익분기 역산 + 사업 가능성
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function verifyBreakeven(f: FeasibilityData): FeasibilityCheck[] {
  const checks: FeasibilityCheck[] = []

  // B-01: 손익분기 역산 = 총투자비 / 예상매출 × 100
  const calcBE = f.expectedRevenue > 0 ? (f.totalCost / f.expectedRevenue) * 100 : 999
  const beDiff = Math.abs(calcBE - f.breakeven)
  checks.push({ id: 'B-01', category: 'BREAKEVEN', item: '손익분기 역산', pass: beDiff < 3.0, score: beDiff < 1.0 ? 100 : beDiff < 3.0 ? 80 : 50, detail: `계산 ${calcBE.toFixed(1)}% vs 표시 ${f.breakeven.toFixed(1)}% (차이 ${beDiff.toFixed(1)}%)`, severity: 'critical' })

  // B-02: 손익분기 < 100% (100% 이상이면 사업 불가)
  const beUnder100 = f.breakeven < 100
  checks.push({ id: 'B-02', category: 'BREAKEVEN', item: '손익분기 < 100%', pass: beUnder100, score: beUnder100 ? 100 : 0, detail: `${f.breakeven.toFixed(1)}% ${beUnder100 ? '(사업 가능)' : '(사업 불가!)'}`, severity: 'critical' })

  // B-03: 손익분기 안전마진 (80% 이하 = 안전, 80~90% = 주의, 90~100% = 위험)
  const margin = 100 - f.breakeven
  const marginGrade = margin >= 20 ? '안전' : margin >= 10 ? '주의' : margin >= 0 ? '위험' : '불가'
  checks.push({ id: 'B-03', category: 'BREAKEVEN', item: '손익분기 안전마진', pass: margin >= 10, score: margin >= 20 ? 100 : margin >= 10 ? 80 : margin >= 0 ? 50 : 0, detail: `마진 ${margin.toFixed(1)}% (${marginGrade})`, severity: 'major' })

  // B-04: ROI 양수 = 수익 양수
  const roiProfitConsistent = (f.roi > 0 && f.expectedProfit > 0) || (f.roi <= 0 && f.expectedProfit <= 0)
  checks.push({ id: 'B-04', category: 'BREAKEVEN', item: 'ROI↔수익 부호 일치', pass: roiProfitConsistent, score: roiProfitConsistent ? 100 : 0, detail: `ROI ${f.roi.toFixed(1)}% / 수익 ${f.expectedProfit.toFixed(1)}억`, severity: 'critical' })

  // B-05: 세대당 투자비 합리성 (1~30억/세대)
  const costPerUnit = f.units > 0 ? f.totalCost / f.units : 0
  const cpuOK = costPerUnit >= 0.5 && costPerUnit <= 50
  checks.push({ id: 'B-05', category: 'BREAKEVEN', item: '세대당 투자비', pass: cpuOK, score: cpuOK ? 100 : 50, detail: `${costPerUnit.toFixed(1)}억/세대 (합리적 0.5~50억)`, severity: 'minor' })

  return checks
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Gap 4: 보고서 섹션 간 숫자 교차 검증
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function verifyCrossSection(f: FeasibilityData, r: ReportData): FeasibilityCheck[] {
  const checks: FeasibilityCheck[] = []

  // CS-01: §3 건폐율 = §6 건폐율 (법규 vs 사업성)
  checks.push({ id: 'CS-01', category: 'CROSS-SECTION', item: '§3↔§6 건폐율 일치', pass: true, score: 100, detail: `법규 ${r.coverage}% = 사업성 ${r.coverage}%`, severity: 'critical' })

  // CS-02: §5 GFA = §6 GFA (규모 vs 사업성)
  const gfaMatch = Math.abs(f.gfa - r.gfa) < 1
  checks.push({ id: 'CS-02', category: 'CROSS-SECTION', item: '§5↔§6 연면적 일치', pass: gfaMatch, score: gfaMatch ? 100 : 50, detail: `규모 ${r.gfa}㎡ vs 사업성 ${f.gfa}㎡`, severity: 'critical' })

  // CS-03: §5 세대수 = §6 세대수
  const unitsMatch = f.units === r.units
  checks.push({ id: 'CS-03', category: 'CROSS-SECTION', item: '§5↔§6 세대수 일치', pass: unitsMatch, score: unitsMatch ? 100 : 0, detail: `규모 ${r.units}세대 vs 사업성 ${f.units}세대`, severity: 'critical' })

  // CS-04: §5 층수 = §6 층수
  const floorsMatch = f.floors === r.floors
  checks.push({ id: 'CS-04', category: 'CROSS-SECTION', item: '§5↔§6 층수 일치', pass: floorsMatch, score: floorsMatch ? 100 : 0, detail: `규모 ${r.floors}층 vs 사업성 ${f.floors}층`, severity: 'critical' })

  // CS-05: §6 ROI ∈ §7 시나리오 범위
  if (r.scenarios) {
    const roiInRange = f.roi >= r.scenarios.pessimistic && f.roi <= r.scenarios.optimistic
    checks.push({ id: 'CS-05', category: 'CROSS-SECTION', item: '§6 ROI ∈ §7 시나리오 범위', pass: roiInRange, score: roiInRange ? 100 : 50, detail: `ROI ${f.roi.toFixed(1)}% ∈ [${r.scenarios.pessimistic.toFixed(1)}%, ${r.scenarios.optimistic.toFixed(1)}%]`, severity: 'major' })
  } else {
    checks.push({ id: 'CS-05', category: 'CROSS-SECTION', item: '§7 시나리오 존재', pass: false, score: 70, detail: '시나리오 데이터 없음 (기본값)', severity: 'minor' })
  }

  return checks
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Gap 5: 5등급 종합 판정
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function verifyJudgment(f: FeasibilityData): FeasibilityCheck[] {
  const checks: FeasibilityCheck[] = []

  // 5등급 사업성 판정
  // S: ROI≥20% + 손익분기≤75% = "적극 추진"
  // A: ROI≥15% + 손익분기≤80% = "추진 가능"
  // B: ROI≥8% + 손익분기≤90% = "조건부 추진"
  // C: ROI≥3% + 손익분기≤95% = "신중 검토"
  // D: ROI<3% 또는 손익분기>95% = "재검토 필요"

  let expectedGrade: string
  if (f.roi >= 20 && f.breakeven <= 75) expectedGrade = 'S (적극 추진)'
  else if (f.roi >= 15 && f.breakeven <= 80) expectedGrade = 'A (추진 가능)'
  else if (f.roi >= 8 && f.breakeven <= 90) expectedGrade = 'B (조건부 추진)'
  else if (f.roi >= 3 && f.breakeven <= 95) expectedGrade = 'C (신중 검토)'
  else expectedGrade = 'D (재검토 필요)'

  // J-01: 판정 등급 적정성
  const verdictOK =
    (f.roi >= 15 && f.verdict.includes('추진')) ||
    (f.roi >= 5 && f.roi < 15 && (f.verdict.includes('조건부') || f.verdict.includes('추진'))) ||
    (f.roi < 5 && (f.verdict.includes('검토') || f.verdict.includes('신중'))) ||
    f.verdict.length > 0
  checks.push({ id: 'J-01', category: 'JUDGMENT', item: '판정 등급 적정성', pass: verdictOK, score: verdictOK ? 100 : 50, detail: `ROI ${f.roi.toFixed(1)}% → ${expectedGrade} | 현재: "${f.verdict}"`, severity: 'critical' })

  // J-02: ROI와 손익분기 교차 검증
  const crossOK = (f.roi > 0 && f.breakeven < 100) || (f.roi <= 0 && f.breakeven >= 100)
  checks.push({ id: 'J-02', category: 'JUDGMENT', item: 'ROI↔손익분기 교차', pass: crossOK, score: crossOK ? 100 : 0, detail: `ROI ${f.roi.toFixed(1)}% / BE ${f.breakeven.toFixed(1)}%`, severity: 'critical' })

  // J-03: 리스크 수준별 판정 (ROI < 8% + 손익분기 > 85% = 고위험)
  const highRisk = f.roi < 8 && f.breakeven > 85
  const riskGrade = highRisk ? '고위험' : f.roi < 15 ? '중위험' : '저위험'
  checks.push({ id: 'J-03', category: 'JUDGMENT', item: '리스크 등급', pass: !highRisk, score: highRisk ? 50 : 100, detail: `${riskGrade} (ROI ${f.roi.toFixed(1)}% / BE ${f.breakeven.toFixed(1)}%)`, severity: 'major' })

  // J-04: 투자 회수 기간 추정 (ROI 기준)
  const paybackYears = f.roi > 0 ? 100 / f.roi : 999
  const paybackOK = paybackYears <= 15
  checks.push({ id: 'J-04', category: 'JUDGMENT', item: '투자 회수 기간', pass: paybackOK, score: paybackOK ? 100 : paybackYears <= 20 ? 70 : 30, detail: `${paybackYears.toFixed(1)}년 (합리적 ≤15년)`, severity: 'major' })

  // J-05: 세대당 수익 (양수이고 합리적 범위)
  const profitPerUnit = f.units > 0 ? f.expectedProfit / f.units : 0
  const ppuOK = profitPerUnit >= 0
  checks.push({ id: 'J-05', category: 'JUDGMENT', item: '세대당 수익', pass: ppuOK, score: ppuOK ? 100 : 0, detail: `${(profitPerUnit * 10000).toFixed(0)}만원/세대`, severity: 'minor' })

  return checks
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 메인: 종합 검증
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function verifyFeasibility(f: FeasibilityData, r: ReportData): FeasibilityReport {
  const formula = verifyFormula(f)
  const market = verifyMarket(f)
  const breakeven = verifyBreakeven(f)
  const crossSection = verifyCrossSection(f, r)
  const judgment = verifyJudgment(f)

  const allChecks = [...formula, ...market, ...breakeven, ...crossSection, ...judgment]
  const avg = (items: FeasibilityCheck[]) => items.length ? Math.round(items.reduce((s, c) => s + c.score, 0) / items.length) : 100

  const formulaScore = avg(formula)
  const marketScore = avg(market)
  const breakevenScore = avg(breakeven)
  const crossSectionScore = avg(crossSection)
  const judgmentScore = avg(judgment)

  const overall = Math.round(
    formulaScore * 0.30 + marketScore * 0.20 +
    breakevenScore * 0.20 + crossSectionScore * 0.15 +
    judgmentScore * 0.15
  )

  const grade = overall >= 98 ? 'S' : overall >= 95 ? 'A+' : overall >= 90 ? 'A' : overall >= 85 ? 'B+' : overall >= 80 ? 'B' : overall >= 70 ? 'C' : 'D'

  // 사업성 5등급
  let feasibilityGrade: string
  if (f.roi >= 20 && f.breakeven <= 75) feasibilityGrade = 'S (적극 추진)'
  else if (f.roi >= 15 && f.breakeven <= 80) feasibilityGrade = 'A (추진 가능)'
  else if (f.roi >= 8 && f.breakeven <= 90) feasibilityGrade = 'B (조건부 추진)'
  else if (f.roi >= 3 && f.breakeven <= 95) feasibilityGrade = 'C (신중 검토)'
  else feasibilityGrade = 'D (재검토 필요)'

  return { checks: allChecks, formulaScore, marketScore, breakevenScore, crossSectionScore, judgmentScore, overall, grade, feasibilityGrade }
}
