export const ARCHISCAN_COPY = {
  brand: {
    name: "Archi-Scan",
    subtitle: "건축기획 분석 시스템",
    reportEnglishTitle: "PRELIMINARY FEASIBILITY REVIEW",
    reportKoreanTitle: "개발사업 사전검토 보고서",
  },

  common: {
    confirm: "확인",
    cancel: "취소",
    edit: "수정",
    save: "저장",
    selected: "선택됨",
    recommended: "추천",
    aiRecommended: "AI 추천",
    applicable: "적용",
    compliant: "적정",
    suitable: "적합",
    requiredCheck: "직접 확인 필요 항목",
    memoOptional: "기타 메모 (선택)",
    reportCheck: "보고서 확인",
    nextStep: "다음 단계로",
    generatePlan: "배치안 생성",
    generateAiPlan: "AI 배치안 생성",
    saveAndContinue: "저장하고 다음 단계로",
    temporarySave: "임시 저장",
    fillLater: "나중에 입력",
    recheck: "재조회",
    scoreUnit: "점",
    householdUnit: "세대",
    parkingUnit: "대",
    floorUnit: "층",
    meterUnit: "m",
    squareMeterUnit: "㎡",
    pyeongUnit: "평",
    roiLabel: "수익률(ROI)",
    totalOpinion: "종합의견",
    selectedPlan: "선정 배치안",
    currentAppliedPlan: "현재 반영 배치안",
    currentCalculationBase: "현재 사업성 계산 기준",
    keyReviewPoints: "주요 검토 포인트",
    finalReviewBaseApplied: "최종 검토 기준 적용",
  },

  entry: {
    pageTitle: "대지 분석 시작",
    pageDescription: "대지 정보를 입력하여 AI 기반 최적 배치안을 생성하세요",
    sectionTitle: "대상지 정보",
    sectionDescription: "대지 정보를 입력하여 배치안을 생성하세요",
    addressLabel: "대지 주소",
    areaLabel: "대지 면적 (㎡)",
    completedBadge: "보완 입력 완료",
    nextButton: "설계 전략 선택으로",
    helper: "배치안 비교 · 평면도 검토 · 보고서에 반영됩니다.",
  },

  manualReview: {
    title: "수동 보완 입력",
    description:
      "자동조회 결과를 바탕으로 기본 정보는 반영되었습니다. 아래 항목만 확인하면 다음 단계로 진행할 수 있습니다.",
    progressLabel: "보완 입력 진행률",
    fields: {
      zoning: {
        label: "용도지역",
        help: "건폐율, 용적률 검토에 필요합니다.",
      },
      frontage: {
        label: "접도 현황",
        help: "진입 가능성과 인허가 검토에 필요합니다.",
      },
      heightLimit: {
        label: "높이 제한",
        help: "층수 계획과 사선 검토에 필요합니다.",
      },
      districtUnitPlan: {
        label: "지구단위계획 여부",
        help: "추가 규제 여부 확인에 필요합니다.",
        yes: "예",
        no: "아니오",
      },
      note: {
        label: "기타 메모 (선택)",
        placeholder: "추가 확인이 필요한 사항이나 특이사항을 입력하세요",
      },
    },
  },

  strategy: {
    title: "설계 전략 선택",
    description:
      "입력한 대지 조건과 보완 정보를 바탕으로 추천 전략을 제안합니다.",
    footer:
      "전략은 배치안 생성 방향을 정하는 단계입니다. 실제 계산과 보고서는 이후 선택한 배치안을 기준으로 반영됩니다.",
    confirmButton: "이 전략으로 진행",
    estimateNotice: "예상 수치는 전략 비교를 위한 초기 추정값입니다.",

    cards: {
      areaMax: {
        id: "area-maximize",
        title: "면적 확보형",
        description: "법적 한도 내 최대 연면적을 확보하는 배치",
        pros: ["연면적 극대화", "높은 수익성"],
        checkPoints: ["일조/이격 검토 필요", "코어 효율 대비 상품성 균형"],
      },
      businessMax: {
        id: "profitability",
        title: "사업성 우선형",
        description: "투자 수익률과 분양성을 우선 고려한 배치",
        pros: ["투자 효율 중심", "수익성 비교 유리"],
        checkPoints: ["주거 품질 타협 가능", "시장가정 민감"],
      },
      parking: {
        id: "parking-efficient",
        title: "주차 효율형",
        description: "주차 확보와 동선 효율을 우선 고려하는 배치",
        pros: ["주차 확보 용이", "진출입 동선 효율화"],
        checkPoints: ["연면적 감소 가능", "지하주차 규모 검토 필요"],
      },
      residential: {
        id: "livability",
        title: "실거주 최적형",
        description: "실제 거주자의 생활 편의를 중심으로 한 배치",
        pros: ["생활 편의 중심", "상품성 강화 가능"],
        checkPoints: ["분양가 상승 필요", "세대수 감소 가능"],
      },
    },
  },

  codeReview: {
    title: "법규 검토",
    appliedBaseTitle: "현재 적용 기준값",
    appliedBaseDescription: "입력한 용도지역, 접도, 높이, 지구단위 여부를 기준으로 산정했습니다.",
    summaryTitle: "법규 기준 요약",
    maxBuildingArea: "최대 건축면적",
    maxFloorArea: "최대 연면적",
    recommendedFloors: "권장 층수",
    requiredParking: "필요 주차",
    effectiveSiteAnalysis: "유효 대지면적 분석",
    originalSiteArea: "원래 대지면적",
    afterSetbackArea: "이격거리 적용 후",
    utilizationRate: "활용률",
    riskTitle: "주요 리스크 및 유의사항",
    estimateNotice: "권장 층수와 예상 세대수는 배치안 생성 전 참고 추정치입니다.",
    riskParking: {
      title: "주차 면적 과다",
      description:
        "필요 주차대수 확보를 위해 지하주차장 2개층 이상이 필요할 수 있습니다.",
      action: "사업성 검토 시 조정 필요",
    },
  },

  layoutCompare: {
    title: "AI 배치안 비교",
    description: "선택한 전략을 기준으로 생성된 배치안을 비교합니다.",
    notice: "아래에서 선택한 배치안이 평면도, 사업성, 최종 보고서에 반영됩니다.",
    differentNotice: "AI 추천안과 별도로, 현재 보고서는 사용자가 선택한 배치안을 기준으로 작성됩니다.",
    compareTitle: "배치안 비교 검토",
    columns: ["배치안", "건폐율", "층수", "세대수", "주차대수"],
    opinionPrefix: "검토의견:",
    opinionSuffix:
      "투자수익률, 세대당 주차대수 확보율, 법정 용적률 활용도 등을 종합적으로 고려할 때 가장 적합한 것으로 판단됩니다.",
  },

  layoutSummary: {
    title: "규모 산정 및 계획 구성",
    selectedPlan: "선정 배치안",
    featuresTitle: "배치 특성",
    tags: {
      optimized: "전략 최적화",
      ai: "AI 추천",
      undergroundParking: "지하주차",
      openSpace: "넓은 개방공간",
    },
  },

  feasibility: {
    title: "사업성 검토",
    description: "현재 선택한 배치안을 기준으로 사업성을 계산했습니다.",
    currentBase: "현재 사업성 계산 기준",
    notice: "이 화면의 수치는 현재 선택한 배치안을 기준으로 계산됩니다.",
    totalCost: "총 투자비",
    expectedSales: "예상 매출",
    expectedProfit: "예상 수익",
    roi: "수익률(ROI)",
    costComposition: "투자비 구성",
    formulaTitle: "세부 계산식",
    roiNote: "추정 사업수지 기준 수익률입니다. 실제 금융비, 인허가비, 공사비 변동에 따라 달라질 수 있습니다.",
    costTable: {
      land: "토지 매입비",
      construction: "공사비",
      indirect: "간접비 (설계/인허가/금융)",
      total: "총 투자비",
    },
    resultTable: {
      sales: "분양 매출",
      profit: "예상 수익",
    },
  },

  floorPlan: {
    title: "평면도 검토",
    description: "현재 선택한 배치안을 기준으로 층별 평면 구성을 확인합니다.",
    notice: "현재 선택한 배치안을 기준으로 평면 구성이 표시됩니다.",
  },

  report: {
    resultTitle: "종합 검토 결과",
    overviewTitle: "1. 검토 개요",
    siteTitle: "2. 대상지 분석",
    regulationTitle: "3. 법규 검토",
    compareTitle: "4. 배치안 비교 검토",
    scaleTitle: "5. 규모 산정 및 계획 구성",
    feasibilityTitle: "6. 사업성 검토",
    riskTitle: "7. AI 분석",
    cautionTitle: "8. 리스크 및 고려사항",
    conclusionTitle: "9. 결론 및 제안",

    purposeText:
      "본 보고서는 상기 대상지의 개발 방향 및 개략 사업성을 검토하기 위하여 작성되었습니다. 건축기획 분석 시스템을 활용하여 복수의 배치대안을 수립하고, 각 대안의 규모 및 사업성을 비교 분석하였습니다.",

    criteriaGuide: [
      "전략은 사용자의 우선순위를 반영한 검토 방향입니다.",
      "배치안은 실제 법규, 규모, 사업성 계산에 적용되는 설계 대안입니다.",
      "본 결과는 초기 검토용 참고자료이며, 실제 인허가 및 설계 결과와 차이가 있을 수 있습니다.",
    ],

    verdict: {
      proceed: "사업 추진 가능",
      conditional: "조건부 가능",
      reviewNeeded: "추가 검토 필요",
    },

    finalOpinion: {
      good:
        "본 대상지는 초기 검토 결과 사업성이 양호한 것으로 분석됩니다. 본격적인 사업 추진에 앞서 토지 매입가 적정성 검증, 용도지역 및 개발 규제 확인, 인근 분양시세 및 경쟁 물량 조사, 정밀 사업수지 분석 등 후속 검토를 진행하시기 바랍니다.",
      conditional:
        "현 조건 기준 수익성 확보에 유의가 필요한 것으로 분석됩니다. 토지 매입가 재협상, 대안 배치를 통한 규모 최적화, 용도 변경 또는 복합개발 방안 검토, 시장 여건 재검토 등 사업구조 개선 방안을 검토하시기 바랍니다.",
    },

    disclaimer:
      "본 보고서는 개략적인 사전검토를 목적으로 작성된 참고자료이며, 실제 인허가 및 설계 결과와 상이할 수 있습니다. 사업 추진을 위한 의사결정 시에는 건축사, 감정평가사, 세무사, 법무사 등 해당 분야 전문가의 검토를 받으시기 바랍니다.",
  },

  riskMessages: {
    parkingOver: {
      title: "주차 면적 과다",
      description: "필요 주차대수 확보를 위해 지하주차장 검토가 필요할 수 있습니다.",
      action: "사업성 검토 시 주차 계획 조정 필요",
    },
    heightReview: {
      title: "높이 관련 법규 확인 필요",
      description: "높이·일조·이격 법규는 현장 조건에 따라 달라질 수 있습니다.",
      action: "인허가 전 현장 기준 재확인 필요",
    },
    districtPlan: {
      title: "지구단위계획 세부 확인 필요",
      description: "지구단위계획 적용 시 추가 규제가 있을 수 있습니다.",
      action: "지구단위계획 세부 지침 검토 필요",
    },
    farNearLimit: {
      title: "용적률 한도 근접",
      description: "현재 계획은 법정 용적률 상한에 근접합니다.",
      action: "상세 설계 단계에서 재검토 필요",
    },
    farExceeded: {
      title: "용적률 초과",
      description: "현재 계획은 법정 용적률을 초과합니다.",
      action: "배치안 조정 또는 대안 검토 필요",
    },
    highDensity: {
      title: "고밀도 개발 유의",
      description: "고밀도 개발로 일조·사선 추가 검토가 필요할 수 있습니다.",
      action: "일조권 사선 분석 필요",
    },
    setbackReduction: {
      title: "이격거리로 인한 유효면적 감소",
      description: "법정 이격거리 확보로 유효 대지면적이 줄어들 수 있습니다.",
      action: "유효 대지면적 기준 규모 재검토 필요",
    },
  },

  judgement: {
    good: {
      title: "사업 추진 가능",
      subtitle: "ROI 기준 사업성이 양호한 것으로 판단됩니다.",
      points: ["높이·일조·이격 법규 현장 확인 필요"],
      conclusion:
        "검토 결과, 상기 대상지는 선택 배치안 적용 시 개발이 가능하며 사업성이 양호한 것으로 판단됩니다. 본격적인 사업 추진 전에는 토지 매입가 적정성, 인허가 조건, 인근 분양 시세, 공사비 변동 요인에 대한 추가 검토를 권장합니다.",
    },
    conditional: {
      title: "조건부 추진 가능",
      subtitle: "수익성 보완 검토가 필요한 것으로 판단됩니다.",
      points: ["수익성 보완 필요", "높이·일조·이격 법규 현장 확인 필요"],
      conclusion:
        "검토 결과, 상기 대상지는 선택 배치안 적용 시 개발은 가능하나 수익성 보완 검토가 필요한 것으로 판단됩니다. 분양가, 세대수, 주차 계획, 공사비 조건을 재조정한 대안 비교를 권장합니다.",
    },
    reviewNeeded: {
      title: "추가 검토 필요",
      subtitle: "현 조건 기준 수익성 확보에 유의가 필요합니다.",
      points: ["분양가·공사비·세대수 재조정 검토 필요", "법규 및 주차 계획 재확인 필요"],
      conclusion:
        "검토 결과, 현 조건 기준으로는 수익성 확보가 제한적일 수 있습니다. 토지 매입가 재협상, 대안 배치 검토, 용도 조정 가능성 검토 등 사업구조 개선 방안을 우선 검토하시기 바랍니다.",
    },
  },

  labels: {
    strategy: {
      selected: "선택 전략",
      recommended: "AI 추천안",
      currentLayout: "현재 반영 배치안",
      finalLayout: "최종 반영 배치안",
    },
    metrics: {
      siteArea: "대지면적",
      buildingCoverage: "건폐율",
      floorAreaRatio: "용적률",
      floors: "층수",
      units: "세대수",
      parking: "주차대수",
      grossFloorArea: "연면적",
      maxBuildingArea: "최대 건축면적",
      maxGrossFloorArea: "최대 연면적",
      recommendedFloors: "권장 층수",
      totalCost: "총투자비",
      expectedRevenue: "예상 매출",
      expectedProfit: "예상 수익",
      roi: "수익률(ROI)",
    },
    status: {
      aiRecommended: "AI 추천",
      currentlyApplied: "현재 반영 중",
      applied: "반영 완료",
      selected: "선택됨",
      legalFit: "적합",
      legalCaution: "주의",
      legalExceed: "초과",
    },
  },

  checklist: {
    finalCopyCheck: [
      "버튼 문구가 모두 행동 중심 표현인지 확인",
      "AI 추천과 최종 반영 배치안의 의미가 혼동되지 않는지 확인",
      "전략 / 배치안 / 보고서 결과의 용어가 일관적인지 확인",
      "조건부 가능, 사업 추진 가능, 추가 검토 필요 기준 문구가 일관적인지 확인",
      "법규 수치와 사업성 수치가 같은 화면 내에서 충돌하지 않는지 확인",
      "세대수, 주차대수, 연면적이 평면도 / 배치안 / 보고서에서 동일한지 확인",
      "예상, 권장, 적용, 반영 상태 표현이 명확한지 확인",
      "문장 길이가 모바일 한 화면에서 과도하게 길지 않은지 확인",
      "주의 문구가 경고처럼 보이되 불필요하게 불안감을 주지 않는지 확인",
      "보고서 표지, 본문, 결론의 톤이 동일한지 확인",
    ],
  },

  testedScenarios: [
    {
      id: "R3_8M_30M_DP_YES_660",
      label: "제3종 일반주거지역 / 8m 이상 도로 / 높이 30m / 지구단위 있음 / 660㎡",
      summary: {
        zoning: "제3종 일반주거지역",
        coverageRatio: "50%",
        floorAreaRatio: "250%",
        selectedPlan: "판상형 배치안",
        floors: "지상 5층",
        units: "24세대",
        parking: "24대",
        totalFloorArea: "1,650㎡",
        roi: "50.6%",
        verdict: "사업 추진 가능",
      },
    },
    {
      id: "R2_6M_20M_DP_YES_660",
      label: "제2종 일반주거지역 / 6m 이상 도로 / 높이 20m / 지구단위 있음 / 660㎡",
      summary: {
        zoning: "제2종 일반주거지역",
        coverageRatio: "50%",
        floorAreaRatio: "200%",
        selectedPlan: "판상형 배치안",
        floors: "지상 4층",
        units: "19세대",
        parking: "19대",
        totalFloorArea: "1,320㎡",
        roi: "37.8%",
        verdict: "사업 추진 가능",
      },
    },
    {
      id: "R3_8M_30M_CORNER_660",
      label: "제3종 일반주거지역 / 8m 이상 도로 / 높이 30m / 코너 활용 ㄱ자형 / 660㎡",
      summary: {
        zoning: "제3종 일반주거지역",
        coverageRatio: "28%",
        floorAreaRatio: "168%",
        selectedPlan: "코너 활용 ㄱ자형",
        floors: "지상 6층",
        units: "7세대",
        parking: "9대",
        totalFloorArea: "1,108.8㎡",
        roi: "31.3%",
        verdict: "사업 추진 가능",
      },
    },
  ],
} as const;

// Type exports
export type ArchiscanCopy = typeof ARCHISCAN_COPY;
export type StrategyId = "area-maximize" | "profitability" | "parking-efficient" | "livability";
export type JudgementType = "good" | "conditional" | "reviewNeeded";
export type RiskType = keyof typeof ARCHISCAN_COPY.riskMessages;

// Helper function to get strategy name by id
export function getStrategyName(id: StrategyId): string {
  const cards = ARCHISCAN_COPY.strategy.cards;
  switch (id) {
    case "area-maximize": return cards.areaMax.title;
    case "profitability": return cards.businessMax.title;
    case "parking-efficient": return cards.parking.title;
    case "livability": return cards.residential.title;
    default: return "전략 미선택";
  }
}

// Helper function to get judgement by ROI
export function getJudgementByROI(roi: number): JudgementType {
  if (roi >= 15) return "good";
  if (roi >= 5) return "conditional";
  return "reviewNeeded";
}

// Report Download Configuration
export const REPORT_DOWNLOAD_CONFIG = {
  buttonLabel: "최종 PDF 다운로드",
  loadingLabel: "PDF 생성 중...",
  successLabel: "다운로드 완료",
  helperText: "선택한 배치안 기준으로 검토 보고서를 PDF로 저장합니다.",
  fileNamePattern: "Archi-Scan_개발사업사전검토보고서_{address}_{date}.pdf",
  toastSuccess: "PDF가 다운로드되었습니다.",
  toastError: "PDF 다운로드 중 오류가 발생했습니다.",
} as const;

// Helper function to generate safe filename
export function generateReportFileName(address: string): string {
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  // 주소에서 파일명에 안전한 문자열로 변환
  const safeAddress = address
    .replace(/[^\w\s가-힣]/g, '') // 특수문자 제거
    .replace(/\s+/g, '-') // 공백을 하이픈으로
    .slice(0, 30); // 길이 제한
  
  return `Archi-Scan_개발사업사전검토보고서_${safeAddress}_${dateStr}.pdf`;
}
