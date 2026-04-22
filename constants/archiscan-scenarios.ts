export const ARCHISCAN_SCENARIOS = [
  {
    id: "R3_8M_30M_DP_YES_660",
    label: "제3종 일반주거지역 / 8m 이상 도로 / 높이 30m / 지구단위 있음 / 660㎡",
    input: {
      address: "서울 종로구 평창길 182",
      siteArea: 660,
      zoning: "제3종 일반주거지역",
      road: "8m 이상 도로 접함",
      heightLimit: "30m",
      districtPlan: "있음",
      selectedStrategy: "면적 확보형",
    },
    expected: {
      selectedPlan: "판상형 배치안",
      floors: "지상 5층",
      units: "24세대",
      parking: "24대",
      buildingCoverage: "50%",
      floorAreaRatio: "250%",
      totalFloorArea: "1,650㎡",
      totalCost: "87.6억원",
      expectedRevenue: "132.0억원",
      expectedProfit: "44.4억원",
      roi: "50.6%",
      verdict: "사업 추진 가능",
    },
  },
  {
    id: "R2_6M_20M_DP_YES_660",
    label: "제2종 일반주거지역 / 6m 이상 도로 / 높이 20m / 지구단위 있음 / 660㎡",
    input: {
      address: "서울 종로구 평창길 182",
      siteArea: 660,
      zoning: "제2종 일반주거지역",
      road: "6m 이상 도로 접함",
      heightLimit: "20m",
      districtPlan: "있음",
      selectedStrategy: "면적 확보형",
    },
    expected: {
      selectedPlan: "판상형 배치안",
      floors: "지상 4층",
      units: "19세대",
      parking: "19대",
      buildingCoverage: "50%",
      floorAreaRatio: "200%",
      totalFloorArea: "1,320㎡",
      totalCost: "74.8억원",
      expectedRevenue: "103.1억원",
      expectedProfit: "28.3억원",
      roi: "37.8%",
      verdict: "사업 추진 가능",
    },
  },
  {
    id: "R3_8M_30M_CORNER_660",
    label: "제3종 일반주거지역 / 8m 이상 도로 / 높이 30m / 코너 활용 ㄱ자형 / 660㎡",
    input: {
      address: "서울 종로구 평창길 182",
      siteArea: 660,
      zoning: "제3종 일반주거지역",
      road: "8m 이상 도로 접함",
      heightLimit: "30m",
      districtPlan: "있음",
      selectedStrategy: "조망 우선형",
    },
    expected: {
      selectedPlan: "코너 활용 ㄱ자형",
      floors: "지상 6층",
      units: "7세대",
      parking: "9대",
      buildingCoverage: "28%",
      floorAreaRatio: "168%",
      totalFloorArea: "1,108.8㎡",
      totalCost: "58.2억원",
      expectedRevenue: "76.4억원",
      expectedProfit: "18.2억원",
      roi: "31.3%",
      verdict: "사업 추진 가능",
    },
  },
  {
    id: "COMMERCIAL_6M_20M_COURTYARD_660",
    label: "근린상업지역 / 6m 이상 도로 / 높이 20m / 중정형 / 660㎡",
    input: {
      address: "서울 종로구 평창길 182",
      siteArea: 660,
      zoning: "근린상업지역",
      road: "6m 이상 도로 접함",
      heightLimit: "20m",
      districtPlan: "있음",
      selectedStrategy: "실거주 최적형",
    },
    expected: {
      selectedPlan: "커뮤니티 중정형",
      floors: "지상 4층",
      units: "5세대",
      parking: "6대",
      buildingCoverage: "30%",
      floorAreaRatio: "120%",
      totalFloorArea: "792㎡",
      totalCost: "57.6억원",
      expectedRevenue: "63.4억원",
      expectedProfit: "5.8억원",
      roi: "10.1%",
      verdict: "조건부 가능",
    },
  },
] as const

export type ArchiScanScenario = (typeof ARCHISCAN_SCENARIOS)[number]

// Helper function to get scenario by ID
export function getScenarioById(id: string): ArchiScanScenario | undefined {
  return ARCHISCAN_SCENARIOS.find(s => s.id === id)
}

// Helper function to apply scenario to site input
export function applyScenarioToInput(scenario: ArchiScanScenario) {
  return {
    address: scenario.input.address,
    siteArea: scenario.input.siteArea,
    zoning: scenario.input.zoning,
    roadCondition: scenario.input.road,
    heightLimit: scenario.input.heightLimit.replace("m", ""),
    districtPlan: scenario.input.districtPlan === "있음",
    selectedStrategy: scenario.input.selectedStrategy,
  }
}

// Development mode check
export const IS_DEV_MODE = process.env.NODE_ENV === "development"
