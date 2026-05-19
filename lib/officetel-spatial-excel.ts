/**
 * 오피스텔 유형 + 공간엑셀(Spatial Excel) 실시간 재계산
 * 
 * ① 오피스텔 전용 배치안 (수익형 부동산)
 * ② 공간엑셀: 파라미터 변경 → 모든 수치 실시간 재계산
 */

// ━━━ ① 오피스텔 유형 ━━━

export interface OfficetelUnit {
  id: string
  name: string
  area: number        // 전용면적 (㎡)
  width: number       // 폭 (m)
  depth: number       // 깊이 (m)
  type: 'studio' | '1room' | '2room' | 'duplex'
  monthlyRent: number // 월 임대료 추정 (만원)
  deposit: number     // 보증금 추정 (만원)
  salePrice: number   // 분양가 배율 (기준 대비)
}

export const OFFICETEL_UNITS: OfficetelUnit[] = [
  { id: 'OT-S1', name: '원룸 A', area: 16, width: 2.7, depth: 5.9, type: 'studio', monthlyRent: 55, deposit: 1000, salePrice: 1.20 },
  { id: 'OT-S2', name: '원룸 B', area: 19, width: 3.0, depth: 6.3, type: 'studio', monthlyRent: 65, deposit: 1500, salePrice: 1.15 },
  { id: 'OT-S3', name: '원룸 C', area: 24, width: 3.3, depth: 7.3, type: 'studio', monthlyRent: 80, deposit: 2000, salePrice: 1.10 },
  { id: 'OT-1R', name: '1.5룸', area: 33, width: 4.5, depth: 7.3, type: '1room', monthlyRent: 100, deposit: 3000, salePrice: 1.05 },
  { id: 'OT-2R', name: '투룸', area: 45, width: 6.0, depth: 7.5, type: '2room', monthlyRent: 130, deposit: 5000, salePrice: 1.00 },
  { id: 'OT-DX', name: '복층', area: 36, width: 3.6, depth: 5.0, type: 'duplex', monthlyRent: 110, deposit: 3500, salePrice: 1.08 },
]

export interface OfficetelLayout {
  totalUnits: number
  unitMix: { unit: OfficetelUnit; count: number }[]
  coreCount: number          // 코어 수
  corridorType: 'center' | 'side'  // 중복도 / 편복도
  floorUnits: number         // 층당 세대수
  exclusiveRatio: number     // 전용률 (%)
  monthlyIncome: number      // 월 임대수입 (만원)
  annualYield: number        // 연 수익률 (%)
  totalSaleRevenue: number   // 총 분양수입 (원)
}

export function generateOfficetelLayout(params: {
  siteArea: number; coverage: number; floors: number; basePricePerM2: number
}): OfficetelLayout {
  const { siteArea, coverage, floors, basePricePerM2 } = params
  const footprint = siteArea * coverage / 100
  const gfa = footprint * floors
  const exclusiveRatio = 52 // 오피스텔 전용률 52% (아파트보다 낮음)
  const totalExclusive = gfa * exclusiveRatio / 100
  
  // 코어 면적 제외
  const coreArea = footprint * 0.15 // 15% 코어
  const floorExclusive = (footprint - coreArea) * exclusiveRatio / 100
  
  // 층당 유닛 배치 (원룸 중심)
  const mainUnit = OFFICETEL_UNITS[2] // 24㎡ 원룸 C
  const subUnit = OFFICETEL_UNITS[4]  // 45㎡ 투룸
  
  const mainCount = Math.floor(floorExclusive * 0.7 / mainUnit.area)
  const subCount = Math.floor(floorExclusive * 0.3 / subUnit.area)
  const floorUnits = mainCount + subCount
  
  const totalMain = mainCount * floors
  const totalSub = subCount * floors
  const totalUnits = totalMain + totalSub
  
  // 수익 계산
  const monthlyIncome = totalMain * mainUnit.monthlyRent + totalSub * subUnit.monthlyRent
  const totalCost = gfa * basePricePerM2 * 0.7 // 공사비 추정
  const annualYield = totalCost > 0 ? (monthlyIncome * 10000 * 12) / totalCost * 100 : 0
  
  const totalSaleRevenue = totalMain * mainUnit.area * basePricePerM2 * mainUnit.salePrice +
    totalSub * subUnit.area * basePricePerM2 * subUnit.salePrice

  return {
    totalUnits,
    unitMix: [
      { unit: mainUnit, count: totalMain },
      { unit: subUnit, count: totalSub },
    ],
    coreCount: footprint > 300 ? 2 : 1,
    corridorType: footprint > 200 ? 'center' : 'side',
    floorUnits,
    exclusiveRatio,
    monthlyIncome,
    annualYield: Math.round(annualYield * 10) / 10,
    totalSaleRevenue,
  }
}

// ━━━ ② 공간엑셀 (Spatial Excel) ━━━

export interface SpatialExcelInput {
  // 대지
  siteArea: number           // 대지면적 (㎡)
  coverage: number           // 건폐율 (%)
  floors: number             // 층수
  
  // 용도 배분
  retailFloors: number       // 상가 층수 (0~2)
  residentialFloors: number  // 주거 층수
  officetelFloors: number    // 오피스텔 층수
  parkingType: 'surface' | 'underground' | 'piloti'
  parkingLevels: number      // 지하 주차 층수
  
  // 세대 구성
  avgUnitArea: number        // 평균 세대 면적 (㎡)
  parkingRatio: number       // 세대당 주차 비율
  
  // 비용
  landPricePerM2: number     // 토지가 (원/㎡)
  constructionPerM2: number  // 공사비 (원/㎡)
  salePricePerM2: number     // 분양가 (원/㎡)
  retailPricePerM2: number   // 상가 분양가 (원/㎡)
}

export interface SpatialExcelOutput {
  // 면적
  footprint: number          // 건축면적 (㎡)
  totalGFA: number           // 연면적 (㎡)
  retailArea: number         // 상가 면적 (㎡)
  residentialArea: number    // 주거 면적 (㎡)
  officetelArea: number      // 오피스텔 면적 (㎡)
  parkingArea: number        // 주차 면적 (㎡)
  exclusiveArea: number      // 총 전용면적 (㎡)
  
  // 세대/실
  residentialUnits: number   // 주거 세대수
  officetelUnits: number     // 오피스텔 실수
  retailBays: number         // 상가 구획수
  parkingSpaces: number      // 주차대수
  
  // 법규
  actualCoverage: number     // 실제 건폐율 (%)
  actualFAR: number          // 실제 용적률 (%)
  
  // 비용
  landCost: number           // 토지비 (원)
  constructionCost: number   // 공사비 (원)
  totalCost: number          // 총사업비 (원)
  
  // 수입
  residentialRevenue: number // 주거 분양 수입 (원)
  officetelRevenue: number   // 오피스텔 분양 수입 (원)
  retailRevenue: number      // 상가 분양 수입 (원)
  totalRevenue: number       // 총 수입 (원)
  
  // 사업성
  profit: number             // 수익 (원)
  roi: number                // ROI (%)
  profitPerUnit: number      // 세대당 수익 (원)
  
  // 변경 감지
  changedFields: string[]    // 변경된 필드 목록
}

// 공간엑셀 핵심: 모든 파라미터로부터 모든 수치를 실시간 계산
export function calculateSpatialExcel(input: SpatialExcelInput): SpatialExcelOutput {
  const {
    siteArea, coverage, floors,
    retailFloors, residentialFloors, officetelFloors,
    parkingType, parkingLevels,
    avgUnitArea, parkingRatio,
    landPricePerM2, constructionPerM2, salePricePerM2, retailPricePerM2,
  } = input

  // 면적 계산
  const footprint = siteArea * coverage / 100
  const retailArea = footprint * retailFloors
  const residentialArea = footprint * residentialFloors
  const officetelArea = footprint * officetelFloors
  const aboveGFA = retailArea + residentialArea + officetelArea
  const parkingArea = parkingType === 'underground' ? siteArea * 0.85 * parkingLevels :
    parkingType === 'piloti' ? footprint : 0
  const totalGFA = aboveGFA + parkingArea

  // 전용면적
  const residentialExclusive = residentialArea * 0.65 // 주거 전용률 65%
  const officetelExclusive = officetelArea * 0.52    // 오피스텔 전용률 52%
  const retailExclusive = retailArea * 0.55           // 상가 전용률 55%
  const exclusiveArea = residentialExclusive + officetelExclusive + retailExclusive

  // 세대/실
  const residentialUnits = avgUnitArea > 0 ? Math.round(residentialExclusive / avgUnitArea) : 0
  const officetelUnits = Math.round(officetelExclusive / 24) // 평균 24㎡
  const retailBays = Math.max(1, Math.round(retailExclusive / 50)) // 평균 50㎡/구획
  const totalUnits = residentialUnits + officetelUnits
  const parkingSpaces = Math.ceil(totalUnits * parkingRatio)

  // 법규
  const actualCoverage = Math.round(footprint / siteArea * 100)
  const actualFAR = Math.round(aboveGFA / siteArea * 100)

  // 비용
  const landCost = siteArea * landPricePerM2
  const constructionCost = totalGFA * constructionPerM2
  const indirectCost = (landCost + constructionCost) * 0.12 // 간접비 12%
  const financeCost = (landCost + constructionCost) * 0.05  // 금융비 5%
  const totalCost = landCost + constructionCost + indirectCost + financeCost

  // 수입
  const residentialRevenue = residentialExclusive * salePricePerM2
  const officetelRevenue = officetelExclusive * salePricePerM2 * 0.85 // 오피스텔은 85%
  const retailRevenue = retailExclusive * retailPricePerM2
  const totalRevenue = residentialRevenue + officetelRevenue + retailRevenue

  // 사업성
  const profit = totalRevenue - totalCost
  const roi = totalCost > 0 ? Math.round(profit / totalCost * 1000) / 10 : 0
  const profitPerUnit = totalUnits > 0 ? Math.round(profit / totalUnits) : 0

  return {
    footprint: Math.round(footprint),
    totalGFA: Math.round(totalGFA),
    retailArea: Math.round(retailArea),
    residentialArea: Math.round(residentialArea),
    officetelArea: Math.round(officetelArea),
    parkingArea: Math.round(parkingArea),
    exclusiveArea: Math.round(exclusiveArea),
    residentialUnits, officetelUnits, retailBays, parkingSpaces,
    actualCoverage, actualFAR,
    landCost: Math.round(landCost),
    constructionCost: Math.round(constructionCost),
    totalCost: Math.round(totalCost),
    residentialRevenue: Math.round(residentialRevenue),
    officetelRevenue: Math.round(officetelRevenue),
    retailRevenue: Math.round(retailRevenue),
    totalRevenue: Math.round(totalRevenue),
    profit: Math.round(profit),
    roi, profitPerUnit,
    changedFields: [],
  }
}

// 파라미터 하나 변경 시 전체 재계산 + 변경 감지
export function recalculate(prev: SpatialExcelOutput, input: SpatialExcelInput): SpatialExcelOutput {
  const next = calculateSpatialExcel(input)
  const changed: string[] = []
  
  const fields: (keyof SpatialExcelOutput)[] = [
    'totalGFA', 'residentialUnits', 'officetelUnits', 'parkingSpaces',
    'actualFAR', 'totalCost', 'totalRevenue', 'profit', 'roi',
  ]
  for (const f of fields) {
    if (prev[f] !== next[f]) changed.push(f as string)
  }
  next.changedFields = changed
  return next
}
