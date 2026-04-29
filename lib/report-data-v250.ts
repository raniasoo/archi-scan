/**
 * v0 250 기준 공통 Report Data Schema
 * PDF / HTML / Excel / Print 모두 이 데이터 구조를 공유합니다.
 */

const ZONE_LABELS: Record<string, string> = {
  'residential-exclusive-1': '제1종 전용주거지역',
  'residential-exclusive-2': '제2종 전용주거지역',
  'residential-1': '제1종 일반주거지역',
  'residential-2': '제2종 일반주거지역',
  'residential-3': '제3종 일반주거지역',
  'semi-residential': '준주거지역',
  'commercial-general': '일반상업지역',
  'commercial-neighborhood': '근린상업지역',
  'commercial-central': '중심상업지역',
  'industrial-general': '일반공업지역',
  'industrial': '준공업지역',
  'green-natural': '자연녹지지역',
}

// ============================================
// 1. 공통 타입 정의
// ============================================

export interface ReportDataV250 {
  // 메타 정보
  meta: ReportMeta;
  // 1. 표지
  cover: ReportCover;
  // 2. 종합 검토 결과
  summary: ReportSummary;
  // 3. 검토 개요
  overview: ReportOverview;
  // 4. 대상지 분석
  siteAnalysis: ReportSiteAnalysis;
  // 5. 법규 검토
  regulationReview: ReportRegulationReview;
  // 6. 배치안 비교 검토
  layoutComparison: ReportLayoutComparison;
  // 7. 규모 산정 및 계획 구성
  planning: ReportPlanning;
  // 8. 사업성 검토
  feasibility: ReportFeasibility;
  // 9. AI 분석
  aiAnalysis: ReportAIAnalysis;
  // 10. 리스크 및 고려사항
  risks: ReportRisks;
  // 11. 결론 및 제안
  conclusion: ReportConclusion;
  // 12. 면책문구
  disclaimer: ReportDisclaimer;
}

export interface ReportMeta {
  version: string;
  generatedAt: string;
  documentNumber: string;
}

export interface ReportCover {
  documentNumber: string;
  englishSubtitle: string;
  koreanTitle: string;
  address: string;
  projectType: string;
  siteArea: number;
  siteAreaFormatted: string;
  selectedLayoutName: string;
  createdDate: string;
  companyName: string;
  contact: string;
}

export interface ReportSummary {
  selectedLayoutName: string;
  verdict: string;
  verdictType: 'good' | 'conditional' | 'reviewNeeded';
  roi: number;
  roiFormatted: string;
  siteArea: number;
  siteAreaFormatted: string;
  buildingCoverage: number;
  buildingCoverageFormatted: string;
  far: number;
  farFormatted: string;
  units: number;
  parking: number;
  totalCost: number;
  totalCostFormatted: string;
  expectedRevenue: number;
  expectedRevenueFormatted: string;
  expectedProfit: number;
  expectedProfitFormatted: string;
  keyPoints: string[];
}

export interface ReportOverview {
  purpose: string;
  reviewDate: string;
  scope: string[];
  standards: string[];
}

export interface ReportSiteAnalysis {
  address: string;
  siteArea: number;
  siteAreaFormatted: string;
  landUsePlan: string;
  roadAccess: string;
  heightLimit: number;
  heightLimitFormatted: string;
  districtPlan: string;
}

export interface ReportRegulationReview {
  items: RegulationItem[];
  // HTML 템플릿 편의 필드
  buildingCoverage: { limit: string; planned: string; status: string };
  far: { limit: string; planned: string; status: string };
  height: { limit: string; planned: string; status: string };
  parking: { limit: string; planned: string; status: string };
}

export interface RegulationItem {
  name: string;
  legalLimit: string;
  appliedPlan: string;
  isCompliant: boolean;
  status: '적정' | '주의' | '초과';
}

export interface ReportLayoutComparison {
  layouts: LayoutComparisonItem[];
  recommendedLayoutName: string;
  recommendationReason: string;
  opinion: string; // HTML 템플릿 호환용
}

export interface LayoutComparisonItem {
  name: string;
  buildingCoverage: number;
  buildingCoverageFormatted: string;
  floors: number;
  floorsFormatted: string;
  units: number;
  parking: number;
  roi?: number;
  roiFormatted?: string;
  isRecommended: boolean;
}

export interface ReportPlanning {
  selectedLayoutName: string;
  units: number;
  floors: number;
  floorsFormatted: string;
  parking: number;
  buildingCoverage: number;
  buildingCoverageFormatted: string;
  gfa: number;
  gfaFormatted: string;
  far: number;
  farFormatted: string;
  layoutCharacteristics: string[];
  characteristics: string[]; // HTML 템플릿 호환용 (layoutCharacteristics alias)
}

export interface ReportFeasibility {
  // 비용
  landCost: number;
  landCostFormatted: string;
  constructionCost: number;
  constructionCostFormatted: string;
  indirectCost: number;
  indirectCostFormatted: string;
  totalCost: number;
  totalCostFormatted: string;
  // 수익
  totalRevenue: number;
  totalRevenueFormatted: string;
  expectedProfit: number;
  expectedProfitFormatted: string;
  roi: number;
  roiFormatted: string;
  // 추가 지표
  breakEvenRate: number;
  breakEvenRateFormatted: string;
  projectPeriod: string;
  costPerSqm: number;
  costPerSqmFormatted: string;
  avgSalePrice: number;
  avgSalePriceFormatted: string;
  breakEvenPrice: number;
  breakEvenPriceFormatted: string;
  // 시나리오 분석
  scenarios: FeasibilityScenario[];
  projectDuration: string; // HTML 템플릿 호환용 (projectPeriod alias)
}

export interface FeasibilityScenario {
  name: string;
  description: string;
  priceChange: string; // HTML 템플릿 호환용
  roi: number;
  roiFormatted: string;
  expectedRoi: string; // HTML 템플릿 호환용
}

export interface ReportAIAnalysis {
  legalCompliance: number;
  profitability: number;
  marketability: number;
  totalScore: number;
  summaryText: string;
  summary: string; // HTML 템플릿 호환용
  recommendation: string;
  caution: string;
  designFeatures: string[];
  risksAndChallenges: string[];
  overallCompliance: string;
}

export interface ReportRisks {
  land: string[];
  permit: string[];
  market: string[];
  construction: string[];
}

export interface ReportConclusion {
  finalParagraph: string;
  summaryBox: string;
}

export interface ReportDisclaimer {
  mainText: string;
  expertAdvice: string;
  copyright: string;
}

// ============================================
// 2. 데이터 빌더 함수
// ============================================

interface BuildReportDataInput {
  address: string;
  siteArea: number;
  branding?: {
    brandName?: string;
    brandTagline?: string;
    representativeName?: string;
    representativeTitle?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  regulation?: {
    zoneType?: string;
    roadWidth?: number;
    maxHeight?: number;
    buildingCoverageLimit?: number;
    farLimit?: number;
    districtPlan?: string;
  };
  selectedLayout: {
    id: string;
    name: string;
    floors: number;
    units: number;
    parking: number;
    buildingCoverage: number;
    far: number;
    gfa: number;
    type?: string;
  };
  allLayouts?: Array<{
    id: string;
    name: string;
    floors: number;
    units: number;
    parking: number;
    buildingCoverage: number;
    far: number;
    gfa: number;
  }>;
  feasibilityResult?: {
    landCost?: number;
    constructionCost?: number;
    indirectCost?: number;
    totalCost?: number;
    totalRevenue?: number;
    expectedProfit?: number;
    roi?: number;
    breakEvenRate?: number;
  };
  strategy?: string;
}

// 안전한 숫자 포맷팅
function safeNumber(value: number | undefined | null, fallback: number = 0): number {
  return typeof value === 'number' && !isNaN(value) ? value : fallback;
}

function formatPercent(value: number | undefined | null, fallback: number = 0): string {
  const v = safeNumber(value, fallback);
  return `${v.toFixed(1)}%`;
}

function formatCurrency(value: number | undefined | null, unit: '억원' | '만원' = '억원'): string {
  const v = safeNumber(value, 0);
  return `${v.toFixed(1)}${unit}`;
}

function formatArea(value: number | undefined | null): string {
  const v = safeNumber(value, 0);
  return `${v.toLocaleString()}㎡`;
}

// 문서번호 생성
function generateDocNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `AS-${year}${month}${day}-${random}`;
}

// 날짜 포맷팅
function formatDate(date: Date = new Date()): string {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

// 종합 판단 결정
function getVerdict(roi: number): { text: string; type: 'good' | 'conditional' | 'reviewNeeded' } {
  if (roi >= 20) return { text: '사업 추진 가능', type: 'good' };
  if (roi >= 10) return { text: '조건부 가능', type: 'conditional' };
  return { text: '추가 검토 필요', type: 'reviewNeeded' };
}

// 배치안 특성 태그 생성
function getLayoutCharacteristics(layoutName: string, strategy?: string): string[] {
  const tags: string[] = [];
  
  // 첫 번째 태그로 배치안 이름 자체를 추가
  tags.push(layoutName);
  
  // 전략 기반 추가 태그
  if (strategy === 'profitability') tags.push('수익성 최적화');
  if (strategy === 'efficiency') tags.push('용적률 극대화');
  if (strategy === 'livability') tags.push('주거쾌적성 강화');
  if (strategy === 'balanced') tags.push('균형 배치');
  
  return tags;
}

/**
 * v0 250 기준 공통 Report Data 빌더
 * 모든 export/print 기능에서 이 함수를 호출하여 동일한 데이터를 사용합니다.
 */
export function buildReportDataV250(input: BuildReportDataInput): ReportDataV250 {
  const {
    address,
    siteArea,
    regulation,
    selectedLayout,
    allLayouts,
    feasibilityResult,
    strategy,
  } = input;

  const docNumber = generateDocNumber();
  const createdDate = formatDate();
  const roi = safeNumber(feasibilityResult?.roi, 0);
  const verdict = getVerdict(roi);

  // 비용 계산 (이미 억원 단위로 전달됨 - 변환 없이 그대로 사용)
  const landCost = safeNumber(feasibilityResult?.landCost, 0);
  const constructionCost = safeNumber(feasibilityResult?.constructionCost, 0);
  const indirectCost = safeNumber(feasibilityResult?.indirectCost, 0);
  // totalCost는 입력에서 직접 받아서 사용 (화면과 동일한 값)
  const totalCost = safeNumber(feasibilityResult?.totalCost, landCost + constructionCost + indirectCost);
  const totalRevenue = safeNumber(feasibilityResult?.totalRevenue, 0);
  const expectedProfit = safeNumber(feasibilityResult?.expectedProfit, 0);

  // breakEvenRate도 입력에서 직접 받아서 사용 (화면과 동일한 값)
  const breakEvenRate = safeNumber(feasibilityResult?.breakEvenRate, totalRevenue > 0 ? (totalCost / totalRevenue) * 100 : 0);
  const costPerSqm = selectedLayout.gfa > 0 ? (totalCost * 100000000) / selectedLayout.gfa : 0;
  const avgSalePrice = selectedLayout.units > 0 ? totalRevenue / selectedLayout.units : 0;
  const breakEvenPrice = selectedLayout.units > 0 ? totalCost / selectedLayout.units : 0;

  return {
    meta: {
      version: 'v0 250',
      generatedAt: new Date().toISOString(),
      documentNumber: docNumber,
    },

    cover: {
      documentNumber: docNumber,
      englishSubtitle: 'PRELIMINARY FEASIBILITY REVIEW',
      koreanTitle: '개발사업 사전검토 보고서',
      address: address,
      projectType: '공동주택 개발사업',
      siteArea: siteArea,
      siteAreaFormatted: formatArea(siteArea),
      selectedLayoutName: selectedLayout.name,
      createdDate: createdDate,
      companyName: input.branding?.brandName || 'Archi-Scan',
      contact: input.branding?.phone 
        ? `${input.branding.representativeName || ''} ${input.branding.representativeTitle || ''} · ${input.branding.phone} · ${input.branding.email || ''}`
        : 'archiscan.official@gmail.com',
    },

    summary: {
      selectedLayoutName: selectedLayout.name,
      verdict: verdict.text,
      verdictType: verdict.type,
      roi: roi,
      roiFormatted: formatPercent(roi),
      siteArea: siteArea,
      siteAreaFormatted: formatArea(siteArea),
      buildingCoverage: selectedLayout.buildingCoverage,
      buildingCoverageFormatted: formatPercent(selectedLayout.buildingCoverage),
      far: selectedLayout.far,
      farFormatted: formatPercent(selectedLayout.far),
      units: selectedLayout.units,
      parking: selectedLayout.parking,
      totalCost: totalCost,
      totalCostFormatted: formatCurrency(totalCost),
      expectedRevenue: totalRevenue,
      expectedRevenueFormatted: formatCurrency(totalRevenue),
      expectedProfit: expectedProfit,
      expectedProfitFormatted: formatCurrency(expectedProfit),
      keyPoints: [
        `용적률 ${formatPercent(selectedLayout.far)} 적용으로 법정 한도 내 최적 규모 확보`,
        `세대당 1대 이상 주차 확보 (${selectedLayout.parking}대/${selectedLayout.units}세대)`,
        `ROI ${formatPercent(roi)}로 ${verdict.text} 수준`,
      ],
    },

    overview: {
      purpose: '본 보고서는 상기 대상지에 대한 공동주택 개발사업의 초기 타당성을 검토하기 위하여 작성되었습니다. 건축기획 분석 시스템을 활용하여 복수의 배치대안을 수립하고, 각 대안별 규모 및 개략 사업수지를 비교 분석하였습니다.',
      reviewDate: createdDate,
      scope: [
        '토지이용계획 및 건축법규 검토',
        '배치대안 수립 및 규모 검토',
        '개략 사업수지 분석',
        '사업 타당성 종합 평가',
      ],
      standards: [
        '본 보고서의 분석 결과는 현행 법규 및 일반적인 시장 조건을 기준으로 작성되었습니다.',
        '실제 사업 추진 시 정밀 설계 및 인허가 과정에서 변동이 있을 수 있습니다.',
      ],
    },

    siteAnalysis: {
      address: address,
      siteArea: siteArea,
      siteAreaFormatted: formatArea(siteArea),
      landUsePlan: (regulation?.zoneType ? ZONE_LABELS[regulation.zoneType] || regulation.zoneType : '제2종 일반주거지역'),
      roadAccess: `${safeNumber(regulation?.roadWidth, 8)}m 이상 도로 접함`,
      heightLimit: safeNumber(regulation?.maxHeight, 30),
      heightLimitFormatted: `${safeNumber(regulation?.maxHeight, 30)}m`,
      districtPlan: regulation?.districtPlan || (regulation?.additionalNotes?.includes('지구단위') ? '지구단위계획 적용' : '해당 없음'),
    },

    regulationReview: {
      items: [
        {
          name: '건폐율',
          legalLimit: formatPercent(regulation?.buildingCoverageLimit, 50),
          appliedPlan: formatPercent(selectedLayout.buildingCoverage),
          isCompliant: selectedLayout.buildingCoverage <= safeNumber(regulation?.buildingCoverageLimit, 50),
          status: selectedLayout.buildingCoverage <= safeNumber(regulation?.buildingCoverageLimit, 50) ? '적정' : '초과',
        },
        {
          name: '용적률',
          legalLimit: formatPercent(regulation?.farLimit, 250),
          appliedPlan: formatPercent(selectedLayout.far),
          isCompliant: selectedLayout.far <= safeNumber(regulation?.farLimit, 250),
          status: selectedLayout.far <= safeNumber(regulation?.farLimit, 250) ? '적정' : '초과',
        },
        {
          name: '높이제한',
          legalLimit: `${safeNumber(regulation?.maxHeight, 30)}m`,
          appliedPlan: `${selectedLayout.floors * 3.5}m (${selectedLayout.floors}층)`,
          isCompliant: (selectedLayout.floors * 3.5) <= safeNumber(regulation?.maxHeight, 30),
          status: (selectedLayout.floors * 3.5) <= safeNumber(regulation?.maxHeight, 30) ? '적정' : '초과',
        },
        {
          name: '주차대수',
          legalLimit: `세대당 1.0대 (${selectedLayout.units}대 이상)`,
          appliedPlan: `${selectedLayout.parking}대`,
          isCompliant: selectedLayout.parking >= selectedLayout.units,
          status: selectedLayout.parking >= selectedLayout.units ? '적정' : '주의',
        },
      ],
      // HTML 템플릿 편의 필드
      buildingCoverage: {
        limit: formatPercent(regulation?.buildingCoverageLimit, 50),
        planned: formatPercent(selectedLayout.buildingCoverage),
        status: selectedLayout.buildingCoverage <= safeNumber(regulation?.buildingCoverageLimit, 50) ? '적정' : '초과',
      },
      far: {
        limit: formatPercent(regulation?.farLimit, 250),
        planned: formatPercent(selectedLayout.far),
        status: selectedLayout.far <= safeNumber(regulation?.farLimit, 250) ? '적정' : '초과',
      },
      height: {
        limit: `${safeNumber(regulation?.maxHeight, 30)}m`,
        planned: `${selectedLayout.floors * 3.5}m (${selectedLayout.floors}층)`,
        status: (selectedLayout.floors * 3.5) <= safeNumber(regulation?.maxHeight, 30) ? '적정' : '초과',
      },
      parking: {
        limit: `세대당 1.0대 (${selectedLayout.units}대 이상)`,
        planned: `${selectedLayout.parking}대`,
        status: selectedLayout.parking >= selectedLayout.units ? '적정' : '주의',
      },
    },

    layoutComparison: {
      layouts: (allLayouts || [selectedLayout]).map(layout => {
        // 선택된 배치안인지 확인 (id 또는 이름으로 비교)
        const isSelected = layout.id === selectedLayout.id || layout.name === selectedLayout.name;
        // ROI: 선택된 배치안은 계산된 roi 사용, 그 외는 전달된 roi 또는 undefined
        const layoutRoi = isSelected ? roi : (layout as { roi?: number }).roi;
        const hasRoi = layoutRoi !== undefined && layoutRoi !== null;
        // 추천 여부: 명시적으로 지정되었거나 선택된 배치안인 경우
        const isRec = (layout as { isRecommended?: boolean }).isRecommended || isSelected;
        
        return {
          name: layout.name,
          buildingCoverage: layout.buildingCoverage,
          buildingCoverageFormatted: formatPercent(layout.buildingCoverage),
          floors: layout.floors,
          floorsFormatted: `지상 ${layout.floors}층`,
          units: layout.units,
          parking: layout.parking,
          roi: hasRoi ? layoutRoi : undefined,
          roiFormatted: hasRoi ? formatPercent(layoutRoi) : '-',
          isRecommended: isRec,
        };
      }),
      recommendedLayoutName: selectedLayout.name,
      recommendationReason: '상기 배치안은 투자수익률, 세대당 주차대수 확보율, 법정 용적률 활용도 등을 종합적으로 고려할 때 가장 적합한 것으로 판단됩니다.',
      opinion: '상기 배치안은 투자수익률, 세대당 주차대수 확보율, 법정 용적률 활용도 등을 종합적으로 고려할 때 가장 적합한 것으로 판단됩니다.',
    },

    planning: {
      selectedLayoutName: selectedLayout.name,
      units: selectedLayout.units,
      floors: selectedLayout.floors,
      floorsFormatted: `지상 ${selectedLayout.floors}층`,
      parking: selectedLayout.parking,
      buildingCoverage: selectedLayout.buildingCoverage,
      buildingCoverageFormatted: formatPercent(selectedLayout.buildingCoverage),
      gfa: selectedLayout.gfa,
      gfaFormatted: formatArea(selectedLayout.gfa),
      far: selectedLayout.far,
      farFormatted: formatPercent(selectedLayout.far),
      layoutCharacteristics: getLayoutCharacteristics(selectedLayout.name, strategy),
      characteristics: getLayoutCharacteristics(selectedLayout.name, strategy),
    },

    feasibility: {
      landCost: landCost,
      landCostFormatted: formatCurrency(landCost),
      constructionCost: constructionCost,
      constructionCostFormatted: formatCurrency(constructionCost),
      indirectCost: indirectCost,
      indirectCostFormatted: formatCurrency(indirectCost),
      totalCost: totalCost,
      totalCostFormatted: formatCurrency(totalCost),
      totalRevenue: totalRevenue,
      totalRevenueFormatted: formatCurrency(totalRevenue),
      expectedProfit: expectedProfit,
      expectedProfitFormatted: formatCurrency(expectedProfit),
      roi: roi,
      roiFormatted: formatPercent(roi),
      breakEvenRate: breakEvenRate,
      breakEvenRateFormatted: formatPercent(breakEvenRate),
      projectPeriod: '약 24~36개월',
      costPerSqm: costPerSqm,
      costPerSqmFormatted: `${Math.round(costPerSqm).toLocaleString()}원`,
      avgSalePrice: avgSalePrice,
      avgSalePriceFormatted: formatCurrency(avgSalePrice),
      breakEvenPrice: breakEvenPrice,
      breakEvenPriceFormatted: formatCurrency(breakEvenPrice),
      scenarios: [
        {
          name: '기본',
          description: '현재 시장 조건 기준',
          priceChange: '0%',
          roi: roi,
          roiFormatted: formatPercent(roi),
          expectedRoi: formatPercent(roi),
        },
        {
          name: '낙관',
          description: '분양가 10% 상승 시',
          priceChange: '+10%',
          roi: roi * 1.3,
          roiFormatted: formatPercent(roi * 1.3),
          expectedRoi: formatPercent(roi * 1.3),
        },
        {
          name: '보수',
          description: '공사비 10% 상승 시',
          priceChange: '-10%',
          roi: roi * 0.7,
          roiFormatted: formatPercent(roi * 0.7),
          expectedRoi: formatPercent(roi * 0.7),
        },
      ],
      projectDuration: '약 24~36개월',
    },

    aiAnalysis: {
      legalCompliance: 85,
      profitability: roi >= 20 ? 90 : roi >= 10 ? 70 : 50,
      marketability: 75,
      totalScore: Math.round((85 + (roi >= 20 ? 90 : roi >= 10 ? 70 : 50) + 75) / 3),
      summaryText: `본 대상지는 ${regulation?.zoneType ? ZONE_LABELS[regulation.zoneType] || regulation.zoneType : '제3종 일반주거지역'}에 위치하며, ${selectedLayout.name} 배치안 적용 시 ${selectedLayout.units}세대 규모의 공동주택 개발이 가능합니다. ROI ${formatPercent(roi)} 수준으로 ${verdict.text}으로 분석됩니다.`,
      summary: `본 대상지는 ${regulation?.zoneType ? ZONE_LABELS[regulation.zoneType] || regulation.zoneType : '제3종 일반주거지역'}에 위치하며, ${selectedLayout.name} 배치안 적용 시 ${selectedLayout.units}세대 규모의 공동주택 개발이 가능합니다. ROI ${formatPercent(roi)} 수준으로 ${verdict.text}으로 분석됩니다.`,
      recommendation: `${selectedLayout.name}은 법정 용적률 대비 ${formatPercent(selectedLayout.far / safeNumber(regulation?.farLimit, 250) * 100)} 활용률을 보이며, 세대당 1대 이상 주차 확보가 가능합니다.`,
      caution: '실제 사업 추진 시 정밀 설계, 지질조사, 인허가 협의 등 추가 검토가 필요합니다.',
      designFeatures: [
        '법규 범위 내 최적 규모 설계',
        '세대당 주차 1대 이상 확보',
        '효율적인 코어 배치',
      ],
      risksAndChallenges: [
        '인허가 일정 지연 가능성',
        '공사비 상승 리스크',
        '분양 시장 변동성',
      ],
      overallCompliance: '법규 적합',
    },

    risks: {
      land: [
        '감정평가에 따른 매입가 변동',
        '소유권 및 권리관계 확인',
        '토지거래허가구역 해당 여부',
      ],
      permit: [
        '지구단위계획 변경 필요 여부',
        '건축심의 소요기간',
        '각종 부담금 발생 가능성',
      ],
      market: [
        '분양가 상한제 적용 여부',
        '인근 경쟁 물량 현황',
        '금리 변동에 따른 수요 변화',
      ],
      construction: [
        '공사비 상승 리스크',
        '공사기간 지연 가능성',
        '하자보수 책임',
      ],
    },

    conclusion: {
      finalParagraph: verdict.type === 'good'
        ? `본 대상지는 초기 검토 결과 ${verdict.text}으로 분석됩니다. 본격적인 사업 추진에 앞서 토지 매입가 적정성 검증, 용도지역 및 개발 규제 확인, 인근 분양시세 및 경쟁 물량 조사, 정밀 사업수지 분석 등 후속 검토를 진행하시기 바랍니다.`
        : `본 대상지는 현 조건 기준 ${verdict.text}으로 분석됩니다. 토지 매입가 재협상, 대안 배치를 통한 규모 최적화, 용도 변경 또는 복합개발 방안 검토, 시장 여건 재검토 등 사업구조 개선 방안을 검토하시기 바랍니다.`,
      summaryBox: `${selectedLayout.name} 기준 ROI ${formatPercent(roi)}, 총투자비 ${formatCurrency(totalCost)}, 예상수익 ${formatCurrency(expectedProfit)}`,
    },

    disclaimer: {
      mainText: '본 보고서는 개략적인 사전검토를 목적으로 작성된 참고자료이며, 실제 인허가 및 설계 결과와 상이할 수 있습니다.',
      expertAdvice: '사업 추진을 위한 의사결정 시에는 건축사, 감정평가사, 세무사, 법무사 등 해당 분야 전문가의 검토를 받으시기 바랍니다.',
      copyright: `© ${new Date().getFullYear()} ${input.branding?.brandName || 'Archi-Scan'}. All rights reserved.`,
    },
  };
}
