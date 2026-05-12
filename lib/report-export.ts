/**
 * v0 250 기준 Export 유틸리티
 * PDF / HTML / Excel / Print 모두 ReportDataV250을 사용합니다.
 */

import * as XLSX from 'xlsx';
import { type ReportDataV250, buildReportDataV250 } from './report-data-v250';
import { generateSitePlanSvg, generateSectionSvg, generateIsometricSvg, generateElevationSvg, generatePerspectiveSvg, svgToImgTag } from './report-drawings';
import { calculateFeasibility } from './project-analysis-state';
import { getLabels, type ReportLang } from './report-i18n';

// 다국어 HTML 변환
function translateHtml(html: string, lang: ReportLang): string {
  if (lang === 'ko') return html;
  const ko = getLabels('ko');
  const en = getLabels('en');
  let result = html;
  // 전체 번역 맵 (긴 문자열 우선 치환)
  const replacements: [string, string][] = [
    // 표지 & 문서 제목
    [ko.docTitle, en.docTitle],
    ['공동주택 개발사업', 'Residential Development'],
    ['개발사업 사전검토', 'Preliminary Feasibility Review'],
    [ko.execSummaryTag, en.execSummaryTag],
    [ko.execSummary, en.execSummary],
    // 종합 검토 결과
    ['종합 검토 결과', 'Summary Results'],
    ['선정 배치안', 'Selected Layout'],
    ['사업 추진 가능', 'Feasible'],
    ['조건부 가능', 'Conditionally Feasible'],
    ['추가 검토 필요', 'Further Review Required'],
    ['추천 판정', 'Verdict'],
    // 섹션 제목
    ['검토 개요', 'Review Overview'],
    ['대상지 분석', en.siteAnalysis],
    ['법규 검토', en.regulationReview],
    ['배치안 비교 검토', en.layoutComparison],
    ['규모 산정 및 계획 구성', en.planning],
    ['설계 도면', en.drawings],
    ['사업성 검토', en.feasibility],
    ['AI 분석', en.aiAnalysis],
    ['시나리오 및 사업기간 분석', en.scenarios],
    ['리스크 및 고려사항', en.risks],
    ['결론 및 제안', en.conclusion],
    ['예상 사업 일정', en.timeline],
    // 타임라인
    ['사업기획', en.planning_phase],
    ['인허가', en.permit_phase],
    ['시공', en.construction_phase],
    ['분양/입주', en.sales_phase],
    // AI 점수
    ['법규 부합성', en.legalCompliance],
    ['상품성', en.marketability],
    ['종합 점수', en.totalScore],
    // 핵심 지표 (긴 것 먼저)
    ['손익분기 분양률', en.breakEven],
    ['투자수익률 (ROI)', en.roi],
    ['투자수익률', 'ROI'],
    ['총사업비', en.totalCost],
    ['예상수익', en.expectedProfit],
    ['세대수', en.units],
    ['연면적', en.gfa],
    ['예상 분양수입', 'Expected Sales Revenue'],
    ['예상 토지비', 'Est. Land Cost'],
    ['예상 공사비', 'Est. Construction Cost'],
    ['예상 간접비', 'Est. Indirect Cost'],
    ['예상수익', 'Expected Profit'],
    // 대상지 분석
    ['소재지', 'Location'],
    ['대지면적', 'Site Area'],
    ['토지이용계획', 'Land Use Plan'],
    ['접도현황', 'Road Access'],
    ['높이제한', 'Height Limit'],
    ['지구단위계획', 'District Plan'],
    ['해당 없음', 'N/A'],
    ['해당없음', 'N/A'],
    // 검토 개요
    ['검토 기준일', 'Review Date'],
    ['검토 범위', 'Review Scope'],
    ['토지이용계획 및 건축법규 검토, 배치대안 수립 및 규모 검토, 개략 사업수지 분석, 사업 타당성 종합 평가', 
     'Land use & building regulation review, layout alternatives, scale review, preliminary P&L analysis, overall feasibility assessment'],
    // 법규 검토
    ['건폐율', 'Building Coverage Ratio'],
    ['용적률', 'Floor Area Ratio'],
    ['허용 건폐율', 'Max BCR'],
    ['허용 용적률', 'Max FAR'],
    ['적합', 'Compliant'],
    ['부적합', 'Non-compliant'],
    ['일조권 사선제한', 'Sunlight Right Setback'],
    ['정북방향 인접대지 이격거리', 'North-facing Setback'],
    ['도로사선제한', 'Road Setback'],
    ['주차대수', 'Parking Spaces'],
    ['조경면적', 'Landscaping Area'],
    ['층수 제한', 'Floor Limit'],
    // 배치안 비교
    ['배치안', 'Layout'],
    ['배치안명', 'Layout Name'],
    // 규모 산정
    ['지상층수', 'Above-ground Floors'],
    ['지하층수', 'Underground Floors'],
    ['전용면적', 'Exclusive Area'],
    ['공용면적', 'Common Area'],
    ['전용률', 'Exclusive Ratio'],
    ['주차대수', 'Parking'],
    // 사업성
    ['사업성', en.profitability],
    ['분양가 단가', 'Unit Sale Price'],
    ['공사비 단가', 'Construction Unit Cost'],
    ['토지비', 'Land Cost'],
    ['공사비', 'Construction Cost'],
    ['간접비', 'Indirect Cost'],
    ['분양수입', 'Sales Revenue'],
    ['사업이익', 'Project Profit'],
    // 리스크
    ['토지 리스크', 'Land Risk'],
    ['인허가 리스크', 'Permit Risk'],
    ['시장 리스크', 'Market Risk'],
    ['공사 리스크', 'Construction Risk'],
    // 핵심 포인트
    ['핵심 포인트', en.keyPoints],
    // 워터마크
    ['사전검토용', 'PRELIMINARY'],
    // 푸터
    [ko.disclaimer, en.disclaimer],
    // 작성일자
    ['작성일자', 'Date'],
    ['검토 배치안', 'Layout Plan'],
    // 기타
    ['억원', 'M KRW'],
    ['만원', '0K KRW'],
    // 배치안 타입명
    ['판상형 배치안', 'Flat-type Layout'],
    ['타워형 배치안', 'Tower-type Layout'],
    ['고밀도 타워형', 'High-Density Tower'],
    ['파노라마 타워형', 'Panorama Tower'],
    ['수익형 타워', 'Revenue Tower'],
    ['주차 최적 ㄱ자형', 'Parking-opt. L-shape'],
    ['주차 최적', 'Parking Optimized'],
    ['ㄱ자형', 'L-shaped'],
    ['판상형', 'Flat-type'],
    ['타워형', 'Tower-type'],
    // 추천 판정 문구
    ['추진 판정', 'Verdict'],
    // 동적 문장 (핵심 포인트 등)
    ['적용으로 법정 한도 내 최적 규모 확보', 'applied for optimal scale within legal limits'],
    ['이상 주차 확보', 'parking spaces secured'],
    ['세대당 1대 이상 주차 확보', '1+ parking per unit secured'],
    ['사업 추진 가능 수준', 'indicates project feasibility'],
    ['로 사업 추진 가능 수준', 'indicates project feasibility'],
    // 표 헤더
    ['검토항목', 'Review Item'],
    ['법적기준', 'Legal Standard'],
    ['계획값', 'Planned Value'],
    ['적합여부', 'Compliance'],
    ['구분', 'Category'],
    ['항목', 'Item'],
    ['금액', 'Amount'],
    ['비율', 'Ratio'],
    ['비고', 'Notes'],
    ['용도지역', 'Zoning'],
    // 민감도/시나리오
    ['민감도 분석', 'Sensitivity Analysis'],
    ['낙관', 'Optimistic'],
    ['기본', 'Base'],
    ['비관', 'Pessimistic'],
    ['분양가 변동', 'Sale Price Change'],
    ['공사비 변동', 'Construction Cost Change'],
    // 결론
    ['종합 의견', 'Overall Opinion'],
    ['제안 사항', 'Recommendations'],
    // 법규 상세
    ['건축선 후퇴', 'Building Line Setback'],
    ['정북방향', 'True North'],
    ['인접대지', 'Adjacent Land'],
    ['이격거리', 'Setback Distance'],
    ['최고높이', 'Max Height'],
    ['이상 도로 접함', 'road frontage'],
  ];
  for (const [k, v] of replacements) {
    result = result.split(k).join(v);
  }
  return result;
}

// ============================================
// 파일명 생성 헬퍼
// ============================================

export function generateFileName(address: string, extension: string, layoutName?: string): string {
  const today = new Date();
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const safeAddress = address
    .replace(/[^\w\s가-힣]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 20);
  const safeLayout = layoutName
    ? '_' + layoutName.replace(/[^\w가-힣]/g, '').slice(0, 10)
    : '';
  return `ArchiScan_${safeAddress}${safeLayout}_${dateStr}.${extension}`;
}

// 인앱 브라우저 감지 (카카오톡, 라인, 인스타그램, 페이스북 등)
function isInAppBrowser(): string | null {
  const ua = navigator.userAgent || '';
  if (/KAKAOTALK/i.test(ua)) return '카카오톡';
  if (/Line\//i.test(ua)) return '라인';
  if (/FBAN|FBAV/i.test(ua)) return '페이스북';
  if (/Instagram/i.test(ua)) return '인스타그램';
  if (/NAVER/i.test(ua)) return '네이버';
  return null;
}

// 모바일 호환 다운로드 헬퍼
function mobileDownload(content: string | Blob, fileName: string, mimeType: string = 'text/html;charset=utf-8'): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  // 인앱 브라우저 감지
  const inAppName = isInAppBrowser();
  if (inAppName) {
    // 인앱 브라우저: 다운로드 제한됨 → 안내 + 대안 시도
    const isAndroid = /Android/i.test(navigator.userAgent);
    
    if (isAndroid) {
      // Android: intent scheme으로 외부 브라우저 열기 시도
      try {
        const currentUrl = window.location.href;
        window.location.href = `intent://${currentUrl.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`;
      } catch { /* ignore */ }
    }
    
    // 안내 메시지 (toast가 없으면 alert)
    const msg = `${inAppName} 브라우저에서는 파일 다운로드가 제한됩니다.\n\n` +
      (isAndroid 
        ? '우측 상단 ⋮ 메뉴 → "다른 브라우저로 열기"를 눌러주세요.'
        : '하단 공유 버튼(□↑) → "Safari로 열기"를 눌러주세요.');
    
    // toast 시도 (sonner)
    try {
      const { toast } = require('sonner');
      toast.info(msg, { duration: 8000 });
    } catch {
      alert(msg);
    }
    
    // 그래도 다운로드 시도는 함 (일부 인앱에서 작동할 수 있음)
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 30000);
    return;
  }
  
  // iOS 감지
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  
  if (isIOS && typeof navigator.share === 'function') {
    // iOS Safari: Web Share API로 파일 공유 (다운로드 보장)
    const file = new File([blob], fileName, { type: blob.type });
    navigator.share({ files: [file], title: fileName }).catch(() => {
      // 공유 실패 시 새 탭에서 열기
      window.open(url, '_blank');
    });
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } else {
    // Android Chrome / 데스크톱: 표준 다운로드 링크
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 10000);
  }
}

// ============================================
// Export 입력 데이터 타입 (기존 호환성 유지)
// ============================================

export interface ExportData {
  address: string;
  siteArea: number;
  lang?: 'ko' | 'en';
  branding?: {
    brandName?: string;
    brandTagline?: string;
    representativeName?: string;
    representativeTitle?: string;
    phone?: string;
    email?: string;
    address?: string;
    website?: string;
    logoBase64?: string;
  };
  layout: {
    name: string;
    type?: string;
    floors: number;
    units: number;
    parking: number;
    buildingCoverage: number;
    far: number;
    gfa: number;
  };
  allLayouts?: Array<{
    name: string;
    buildingCoverage: number;
    floors: number;
    units: number;
    parking: number;
    roi?: number;
    isRecommended?: boolean;
  }>;
  feasibility: {
    landCost?: number;
    constructionCost?: number;
    indirectCost?: number;
    totalCost?: number;
    totalRevenue?: number;
    expectedProfit?: number;
    roi?: number;
    breakEvenRate?: number;
    costPerSqm?: number;
    avgSalePrice?: number;
    breakEvenPrice?: number;
  };
  regulation?: {
    zoneType?: string;
    roadWidth?: number;
    maxHeight?: number;
    buildingCoverageLimit?: number;
    farLimit?: number;
    hasDistrictPlan?: boolean;
  };
  verdict: string;
  risks?: {
    land?: string[];
    permit?: string[];
    market?: string[];
    construction?: string[];
  };
  aiAnalysis?: {
    legalCompliance?: number;
    profitability?: number;
    marketability?: number;
    totalScore?: number;
    recommendation?: string;
    caution?: string;
  };
  patternQuality?: {
    overallQuality: number;
    grade: string;
    gradeColor: string;
    totalPatternScore: number;
    totalLivingScore: number;
    philosophy: string;
    topPatterns: { id: number; nameKr: string; score: number }[];
  };
  aiRenderImage?: string | null;
  aiMultiImages?: {angle: string; image: string | null}[] | null;
}

// ExportData를 ReportDataV250으로 변환
function convertToV250(data: ExportData): ReportDataV250 {
  // 필수 데이터 검증
  if (!data.address) {
    throw new Error('주소 정보가 없습니다');
  }
  if (!data.layout) {
    throw new Error('배치안 정보가 없습니다');
  }
  if (!data.layout.name) {
    throw new Error('배치안 이름이 없습니다');
  }

  const input = {
    address: data.address,
    siteArea: data.siteArea || 0,
    branding: data.branding,
    regulation: {
      ...data.regulation,
      districtPlan: data.regulation?.hasDistrictPlan ? '지구단위계획 적용' : undefined,
    },
    selectedLayout: {
      id: 'selected',
      name: data.layout.name || '기본 배치안',
      floors: data.layout.floors || 0,
      units: data.layout.units || 0,
      parking: data.layout.parking || 0,
      buildingCoverage: data.layout.buildingCoverage || 0,
      far: data.layout.far || 0,
      gfa: data.layout.gfa || 0,
    },
    allLayouts: data.allLayouts?.map((l, i) => {
      // ROI가 이미 계산되어 전달된 경우 재계산하지 않음
      const preCalcRoi = l.roi
      let layoutRoi = preCalcRoi ?? 0
      if (preCalcRoi === undefined || preCalcRoi === null) {
        try {
          const layoutFeas = calculateFeasibility({
            siteArea: data.siteArea,
            grossFloorArea: l.gfa || Math.round(data.siteArea * (l.buildingCoverage / 100) * l.floors),
            unitCount: l.units,
            floorCount: l.floors,
            parkingCount: l.parking,
            landPricePerM2: data.feasibility?.landCost && data.siteArea
              ? (data.feasibility.landCost * 1e8) / data.siteArea
              : 5000000,
            salesPricePerM2: data.feasibility?.avgSalePrice || undefined,
          });
          layoutRoi = layoutFeas.roi
        } catch { layoutRoi = 0 }
      }
      return {
        id: l.name === data.layout.name ? 'selected' : `layout-${i}`,
        name: l.name || `배치안 ${i + 1}`,
        floors: l.floors || 0,
        units: l.units || 0,
        parking: l.parking || 0,
        buildingCoverage: l.buildingCoverage || 0,
        far: 0,
        gfa: l.gfa || 0,
        roi: layoutRoi,
        isRecommended: l.isRecommended || l.name === data.layout.name,
      };
    }),
    feasibilityResult: {
      landCost: data.feasibility?.landCost || 0,
      constructionCost: data.feasibility?.constructionCost || 0,
      indirectCost: data.feasibility?.indirectCost || 0,
      totalCost: data.feasibility?.totalCost || 0,
      totalRevenue: data.feasibility?.totalRevenue || 0,
      expectedProfit: data.feasibility?.expectedProfit || 0,
      roi: data.feasibility?.roi || 0,
      breakEvenRate: data.feasibility?.breakEvenRate || 0,
    },
  };

  const report = buildReportDataV250(input);
  
  // 결과 검증
  if (!report.cover) throw new Error('보고서 표지 생성 실패');
  if (!report.summary) throw new Error('종합 검토 결과 생성 실패');
  if (!report.regulationReview) throw new Error('법규 검토 생성 실패');
  if (!report.layoutComparison) throw new Error('배치안 비교 생성 실패');
  if (!report.feasibility) throw new Error('사업성 분석 생성 실패');

  return report;
}

// ============================================
// 엑셀 다운로드 (v0 250 양식 - 5개 시트)
// ============================================

export function downloadExcel(data: ExportData): { success: boolean; error?: string } {
  console.log('[v0] downloadExcel 시작');
  try {
    const report = convertToV250(data);
    console.log('[v0] report 데이터 변환 완료:', report.cover.documentNumber);
    const workbook = XLSX.utils.book_new();

  // 1. 요약 시트
  const summaryData = [
    ['Archi-Scan 개발사업 사전검토 보고서'],
    [''],
    ['문서번호', report.meta.documentNumber],
    ['작성일자', report.cover.createdDate],
    [''],
    ['=== 대상지 정보 ==='],
    ['주소', report.cover.address],
    ['대지면적', report.siteAnalysis.siteAreaFormatted],
    ['용도지역', report.siteAnalysis.landUsePlan],
    ['접도현황', report.siteAnalysis.roadAccess],
    ['높이제한', report.siteAnalysis.heightLimitFormatted],
    [''],
    ['=== 선정 배치안 ==='],
    ['배치안명', report.planning.selectedLayoutName],
    ['층수', report.planning.floorsFormatted],
    ['세대수', `${report.planning.units}세대`],
    ['주차대수', `${report.planning.parking}대`],
    ['건폐율', report.planning.buildingCoverageFormatted],
    ['용적률', report.planning.farFormatted],
    ['연면적', report.planning.gfaFormatted],
    [''],
    ['=== 사업성 분석 ==='],
    ['총투자비', report.feasibility.totalCostFormatted],
    ['예상매출', report.feasibility.totalRevenueFormatted],
    ['예상수익', report.feasibility.expectedProfitFormatted],
    ['ROI', report.feasibility.roiFormatted],
    ['손익분기 분양률', report.feasibility.breakEvenRateFormatted],
    [''],
    ['=== 종합 판단 ==='],
    ['판단결과', report.summary.verdict],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 20 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, '요약');

  // 2. 배치안비교 시트
  const compareHeader = ['배치안명', '건폐율', '층수', '세대수', '주차대수', 'ROI', '추천'];
  const compareData = [
    ['=== 배치안 비교 검토 ==='],
    [''],
    compareHeader,
    ...report.layoutComparison.layouts.map(layout => [
      layout.name,
      layout.buildingCoverageFormatted,
      `${layout.floors}층`,
      `${layout.units}세대`,
      `${layout.parking}대`,
      layout.roiFormatted || '-',
      layout.isRecommended ? '추천' : '',
    ]),
    [''],
    ['검토의견', report.layoutComparison.recommendationReason],
  ];
  const compareSheet = XLSX.utils.aoa_to_sheet(compareData);
  compareSheet['!cols'] = [{ wch: 18 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 8 }];
  XLSX.utils.book_append_sheet(workbook, compareSheet, '배치안비교');

  // 2.5. 법규검토 시트
  const regData = [
    ['=== 법규 검토 ==='],
    [''],
    ['검토 항목', '법정 한도', '적용 계획', '적정 여부'],
    ...report.regulationReview.items.map((item: { name: string; legalLimit: string; appliedPlan: string; status: string }) => [
      item.name, item.legalLimit, item.appliedPlan, item.status
    ]),
  ];
  const regSheet = XLSX.utils.aoa_to_sheet(regData);
  regSheet['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(workbook, regSheet, '법규검토');

  // 3. 사업성 시트
  const feasibilityData = [
    ['=== 사업성 검토 ==='],
    [''],
    ['구분', '금액', '비고'],
    ['토지비', report.feasibility.landCostFormatted, ''],
    ['공사비', report.feasibility.constructionCostFormatted, ''],
    ['기타비용', report.feasibility.indirectCostFormatted, '설계비, 인허가, 금융비용 등'],
    ['총사업비', report.feasibility.totalCostFormatted, ''],
    [''],
    ['총분양수입', report.feasibility.totalRevenueFormatted, ''],
    ['예상수익', report.feasibility.expectedProfitFormatted, ''],
    ['ROI', report.feasibility.roiFormatted, ''],
    [''],
    ['=== 추가 지표 ==='],
    ['손익분기 분양률', report.feasibility.breakEvenRateFormatted, ''],
    ['㎡당 사업비', report.feasibility.costPerSqmFormatted, ''],
    ['세대당 평균분양가', report.feasibility.avgSalePriceFormatted, ''],
    ['세대당 손익분기가', report.feasibility.breakEvenPriceFormatted, ''],
    ['사업기간', report.feasibility.projectPeriod, ''],
    [''],
    ['=== 시나리오 분석 ==='],
    ...report.feasibility.scenarios.map(s => [s.name, s.roiFormatted, s.description]),
  ];
  const feasibilitySheet = XLSX.utils.aoa_to_sheet(feasibilityData);
  feasibilitySheet['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(workbook, feasibilitySheet, '사업성');

  // 4. AI분석 시트
  const aiData = [
    ['=== AI 분석 결과 ==='],
    [''],
    ['항목', '점수'],
    ['법규 부합성', `${report.aiAnalysis.legalCompliance}점`],
    ['사업성', `${report.aiAnalysis.profitability}점`],
    ['상품성', `${report.aiAnalysis.marketability}점`],
    ['종합 점수', `${report.aiAnalysis.totalScore}점`],
    [''],
    ['=== 분석 요약 ==='],
    ['', report.aiAnalysis.summaryText],
    [''],
    ['=== 추천 이유 ==='],
    ['', report.aiAnalysis.recommendation],
    [''],
    ['=== 유의 사항 ==='],
    ['', report.aiAnalysis.caution],
    [''],
    ['=== 설계 특징 ==='],
    ...report.aiAnalysis.designFeatures.map(f => ['', f]),
    [''],
    ['=== 리스크 및 과제 ==='],
    ...report.aiAnalysis.risksAndChallenges.map(r => ['', r]),
  ];
  const aiSheet = XLSX.utils.aoa_to_sheet(aiData);
  aiSheet['!cols'] = [{ wch: 15 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(workbook, aiSheet, 'AI분석');

  // 5. 리스크 시트
  const riskData = [
    ['=== 리스크 및 고려사항 ==='],
    [''],
    ['분류', '항목'],
    ...report.risks.land.map(item => ['토지 관련', item]),
    ...report.risks.permit.map(item => ['인허가 관련', item]),
    ...report.risks.market.map(item => ['시장 관련', item]),
    ...report.risks.construction.map(item => ['공사 관련', item]),
  ];
  const riskSheet = XLSX.utils.aoa_to_sheet(riskData);
  riskSheet['!cols'] = [{ wch: 15 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(workbook, riskSheet, '리스크');

  // 다운로드
    const fileName = generateFileName(data.address, 'xlsx', data.layout?.name);
    console.log('[v0] 엑셀 파일 생성:', fileName);
    XLSX.writeFile(workbook, fileName);
    console.log('[v0] downloadExcel 완료');
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[v0] downloadExcel 오류:', message, error);
    return { success: false, error: message };
  }
}

// ============================================
// HTML 다운로드 (v0 250 양식 - 전체 보고서)
// ============================================

export function downloadHtml(data: ExportData): { success: boolean; error?: string } {
  console.log('[v0] downloadHtml 시작');

  try {
    const report = convertToV250(data);
    console.log('[v0] report 데이터 변환 완료');
  
  // PDF 전용 CSS - A4 폭 기준 + Section 7 indivisible block + Grid 카드
  const printCss = `
    @media print {
      /* ===== 기본 페이지 설정 ===== */
      @page { 
        size: A4; 
        margin: 15mm; 
      }
      
      html, body { 
        background: #fff !important; 
        -webkit-print-color-adjust: exact; 
        print-color-adjust: exact;
        font-size: 12pt !important;
        width: 100% !important;
        max-width: 100% !important;
        transform: none !important;
        zoom: 1 !important;
      }
      
      .page { 
        width: 100% !important;
        max-width: 100% !important; 
        padding: 0 !important; 
        margin: 0 !important;
        display: block !important;
        transform: none !important;
        zoom: 1 !important;
      }

      /* 화면 보기에서 page-break 빈 공간 제거 */
      @media screen {
        .page, .pdf-section, section { page-break-before: auto !important; page-break-after: auto !important; }
      }

      /* ===== 표지 ===== */
      .cover, .pdf-cover { 
        height: 267mm !important;
        max-height: 267mm !important;
        overflow: visible !important; 
        break-after: page !important; 
        page-break-after: always !important; 
        display: flex !important;
        flex-direction: column !important;
        justify-content: center !important;
      }

      /* ===== 섹션 기본 - 분할 허용, 여백 축소 ===== */
      .section, .pdf-section, .report-section {
        display: block !important;
        width: 100% !important;
        padding: 4px 0 !important;
        margin-bottom: 2px !important;
        break-inside: auto !important;
        page-break-inside: auto !important;
      }
      
      /* ===== 섹션 5,6,7,8,9 압축 레이아웃 ===== */
      .pdf-section, .pdf-section, .pdf-section,
      .pdf-section, .pdf-section {
        padding: 2px 0 !important;
      }
      
      /* ===== 5번 섹션 - 초압축 그리드 ===== */
      .compact-section {
        padding: 4px 0 !important;
      }
      .compact-section .section-title {
        margin-bottom: 6px !important;
        font-size: 12pt !important;
      }
      .compact-grid-4 {
        display: grid !important;
        grid-template-columns: repeat(4, 1fr) !important;
        gap: 4px !important;
        margin-bottom: 4px !important;
      }
      .compact-card {
        background: #f8fafc !important;
        border: 1px solid #e2e8f0 !important;
        border-radius: 4px !important;
        padding: 4px 6px !important;
        text-align: center !important;
      }
      .compact-label {
        display: block !important;
        font-size: 8pt !important;
        color: #64748b !important;
        margin-bottom: 1px !important;
      }
      .compact-value {
        display: block !important;
        font-size: 10pt !important;
        font-weight: 700 !important;
        color: #1e293b !important;
        line-height: 1.3 !important;
      }
      .compact-stats-row {
        display: flex !important;
        gap: 12px !important;
        margin-bottom: 4px !important;
        font-size: 9pt !important;
        color: #374151 !important;
      }
      .stat-item {
        display: inline-block !important;
      }
      .stat-item strong {
        color: #0369a1 !important;
        margin-right: 4px !important;
      }
      .compact-tags {
        margin-top: 2px !important;
      }
      .compact-tag {
        display: inline-block !important;
        background: #f0f9ff !important;
        border: 1px solid #bae6fd !important;
        padding: 2px 8px !important;
        border-radius: 10px !important;
        font-size: 8pt !important;
        color: #0369a1 !important;
        margin: 1px !important;
      }
      
      /* ===== 6번 섹션 - 비용표+요약 병렬 ===== */
      .feasibility-compact-layout {
        display: grid !important;
        grid-template-columns: 1.2fr 1fr !important;
        gap: 8px !important;
        margin-bottom: 6px !important;
      }
      .cost-table-compact {
        width: 100% !important;
      }
      .compact-table {
        width: 100% !important;
        font-size: 9pt !important;
        margin: 0 !important;
      }
      .compact-table td, .compact-table th {
        padding: 3px 6px !important;
        font-size: 9pt !important;
      }
      .compact-table .total-row {
        background: #f1f5f9 !important;
      }
      .compact-table .roi-row {
        background: #ecfdf5 !important;
      }
      .compact-table .roi-row td {
        font-size: 11pt !important;
      }
      .roi-summary-compact {
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        gap: 3px !important;
      }
      .mini-stat {
        background: #f8fafc !important;
        border: 1px solid #e2e8f0 !important;
        border-radius: 4px !important;
        padding: 4px 6px !important;
        text-align: center !important;
      }
      .mini-label {
        display: block !important;
        font-size: 7pt !important;
        color: #64748b !important;
      }
      .mini-value {
        display: block !important;
        font-size: 9pt !important;
        font-weight: 700 !important;
        color: #1e293b !important;
      }
      .scenario-compact {
        margin-top: 4px !important;
      }
      .scenario-compact table {
        margin: 0 !important;
      }
      
      /* ===== 섹션 제목 스타일 (print) ===== */
      .section-title,
      .report-section-title,
      .section-header h2,
      .section-header h3 {
        line-height: 1.35 !important;
        padding-top: 4px !important;
        padding-bottom: 4px !important;
        margin-bottom: 6px !important;
        overflow: visible !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      
      /* ===== 제목 + 첫 요소 묶음 (제목만 고아 방지) ===== */
      .section-title,
      .print-title-group {
        break-after: avoid !important;
        page-break-after: avoid !important;
      }
      /* 제목 바로 다음 요소도 새 페이지 시작 금지 */
      .section-title + *,
      .print-title-group + * {
        break-before: avoid !important;
        page-break-before: avoid !important;
      }
      
      /* ===== 섹션 헤더 래퍼 ===== */
      .section-header,
      .report-section-header {
        display: flex !important;
        align-items: center !important;
        overflow: visible !important;
      }
      
      /* ===== 큰 블록만 보호 (작은 카드 제외) ===== */
      .verdict-box,
      .conclusion-box,
      .opinion-box,
      .ai-analysis-summary,
      .section-subtitle + div,
      .section-subtitle + table {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      
      /* 표 행 분리 방지 */
      tr {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      td, th {
        line-height: 1.45 !important;
        padding-bottom: 4px !important;
      }
      
      /* 섹션 제목과 첫 내용 함께 유지 */
      .section-title {
        break-after: avoid !important;
        page-break-after: avoid !important;
      }
      
      /* 모바일 PDF AI 카드 2x2 폴백 */
      @media print and (max-width: 600px) {
        .ai-score-grid {
          grid-template-columns: repeat(2, 1fr) !important;
        }
      }
      
      /* 과도한 여백 축소 */
      .pdf-section {
        padding: 8px 0 !important;
        margin-bottom: 4px !important;
      }
      
      /* 마지막 페이지 빈 여백 최소화 */
      .conclusion-box, .risk-category {
        margin-bottom: 8px !important;
        padding: 10px !important;
      }
      /* 리스크 그리드: 분할 허용 (큰 경우 빈 공간 유발) */
      .risk-grid {
        break-inside: auto !important;
        page-break-inside: auto !important;
      }
      /* table은 기본 분할 허용, 단 작은 테이블은 보호 */
      table {
        break-inside: auto !important;
        page-break-inside: auto !important;
      }
      tr {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      
      /* ===== 작은 카드는 분할 허용 + 초압축 (모바일) ===== */
      .summary-card,
      .metric-card,
      .ai-score-card {
        break-inside: auto !important;
        page-break-inside: auto !important;
        padding: 4px 8px !important;
        margin: 1px 1% !important;
        min-height: auto !important;
        height: auto !important;
      }

      /* ===== 공통 블록 - 간격 최소화 ===== */
      .print-block {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      .print-cards-block,
      .print-details-block,
      .print-cost-block,
      .print-roi-block,
      .print-scenario-block,
      .print-risk-block {
        display: block !important;
        width: 100% !important;
        margin-bottom: 1px !important;
        padding: 0 !important;
      }

      /* ===== AI 분석 - 요약 박스만 보호 ===== */
      .ai-analysis-summary {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
        padding: 10px !important;
        margin: 4px 0 !important;
      }
      
      /* 섹션 레이아웃 */
      .ai-analysis-section {
        display: block !important;
        width: 100% !important;
        padding: 8px 0 !important;
      }
      
      .ai-analysis-inner {
        display: block !important;
        width: 100% !important;
        overflow: visible !important;
        height: auto !important;
        max-height: none !important;
      }
      
      /* AI 점수 그리드 - CSS Grid 4열 압축 */
      .ai-score-grid {
        display: grid !important;
        grid-template-columns: repeat(4, 1fr) !important;
        gap: 6px !important;
        width: 100% !important;
        margin: 16px 0 !important;
      }
      .ai-score-card {
        display: flex !important;
        flex-direction: column !important;
        justify-content: center !important;
        align-items: center !important;
        text-align: center !important;
        background: #eef7fb !important;
        border: 1px solid #d9e6ee !important;
        border-radius: 10px !important;
        padding: 14px 10px !important;
        min-height: 88px !important;
        box-sizing: border-box !important;
      }
      .ai-score-card.highlight-card {
        background: #e0f2fe !important;
        border-color: #7dd3fc !important;
      }
      .ai-score-label {
        display: block !important;
        font-size: 10pt !important;
        color: #5f7285 !important;
        margin-bottom: 6px !important;
        white-space: nowrap !important;
      }
      .ai-score-value {
        display: block !important;
        font-size: 24pt !important;
        font-weight: 700 !important;
        color: #1b5e75 !important;
        line-height: 1.4 !important;
      }
      
      /* AI 분석 요약 박스 - 텍스트 잘림 방지 + 페이지 분��� 방지 */
      .ai-analysis-summary {
        background: #ecfdf5 !important;
        border: 1px solid #a7f3d0 !important;
        border-radius: 8px !important;
        padding: 16px !important;
        margin: 16px 0 !important;
        overflow: visible !important;
        height: auto !important;
        min-height: auto !important;
        max-height: none !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      .ai-analysis-summary .summary-text {
        color: #065f46 !important;
        margin-top: 8px !important;
        overflow: visible !important;
        white-space: normal !important;
        line-height: 1.6 !important;
        max-height: none !important;
        -webkit-line-clamp: unset !important;
        display: block !important;
      }
      
      /* 추천 이유 / 유의 사항 - 텍스트 잘림 방지 + 페이지 분할 방지 */
      .ai-analysis-reason,
      .ai-analysis-warning {
        margin-top: 16px !important;
        overflow: visible !important;
        height: auto !important;
        max-height: none !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      .ai-analysis-reason p,
      .ai-analysis-warning p {
        overflow: visible !important;
        white-space: normal !important;
        line-height: 1.6 !important;
        max-height: none !important;
        -webkit-line-clamp: unset !important;
        display: block !important;
      }
      .ai-analysis-warning .warning-text {
        color: #b45309 !important;
        overflow: visible !important;
        white-space: normal !important;
        max-height: none !important;
      }

      /* ===== Section 8+9+Footer 마지막 페이지 ===== */
      .print-final-page-group {
        display: block !important;
      }
      .print-risk-card {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      .print-conclusion-group {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
        display: block !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      .print-footer {
        margin-top: 8px !important;
        padding: 10px !important;
        break-inside: avoid !important;
      }

      /* ===== 제목 ===== */
      .section-title, .pdf-title, h2, h3, h4 {
        break-after: avoid !important;
        page-break-after: avoid !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
        font-size: 16pt !important;
      }

      /* ===== 테이블 - 압축 ===== */
      table { 
        width: 100% !important;
        border-collapse: collapse !important;
        table-layout: fixed !important;
        font-size: 10pt !important;
        margin: 4px 0 !important;
      }
      thead { display: table-header-group !important; }
      tfoot { display: table-footer-group !important; }
      tr {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      th, td {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
        padding: 5px 8px !important;
        white-space: normal !important;
        word-wrap: break-word !important;
        font-size: 10pt !important;
      }

      /* ===== 카드 그리드 - 2열 압축 ===== */
      .summary-grid, .metric-grid, .score-grid {
        display: block !important;
        width: 100% !important;
        margin: 2px 0 !important;
      }
      .summary-card {
        display: inline-block !important;
        width: 48% !important;
        margin: 2px 1% !important;
        padding: 6px 10px !important;
        vertical-align: top !important;
        box-sizing: border-box !important;
        font-size: 10pt !important;
      }
      .summary-card .label {
        font-size: 9pt !important;
        margin-bottom: 2px !important;
      }
      .summary-card .value {
        font-size: 12pt !important;
        padding-bottom: 2px !important;
      }

      /* ===== AI 점수 - 4열 압축 ===== */
      .ai-scores .summary-card {
        width: 23% !important;
        text-align: center !important;
        padding: 3px 4px !important;
      }

      /* ===== 리스크 그리드 - 2열 초압축 ===== */
      .risk-grid {
        display: block !important;
        width: 100% !important;
        margin: 2px 0 !important;
      }
      .risk-category {
        display: inline-block !important;
        width: 48% !important;
        margin: 1px 1% !important;
        padding: 6px 8px !important;
        vertical-align: top !important;
        box-sizing: border-box !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
        font-size: 8pt !important;
      }
      .risk-category h4 {
        font-size: 9pt !important;
        margin-bottom: 3px !important;
      }
      .risk-list li {
        font-size: 8pt !important;
        line-height: 1.3 !important;
      }

      /* ===== 결론/면책 - 빈 공간 완전 제거 (모바일 최적화) ===== */
      .pdf-section, .pdf-section, .pdf-section, .pdf-section, .pdf-section {
        display: block !important;
        min-height: auto !important;
        height: auto !important;
        padding: 1px 0 !important;
        margin-bottom: 0 !important;
      }
      .verdict-box {
        padding: 8px 10px !important;
        margin: 4px 0 2px 0 !important;
      }
      .conclusion-box, .ai-summary-box {
        padding: 8px 10px !important;
        margin: 4px 0 !important;
      }
      .pdf-note {
        font-size: 8pt !important;
        margin: 4px 0 !important;
        color: #6b7280 !important;
        line-height: 1.5 !important;
        padding-bottom: 2px !important;
      }
      .disclaimer {
        min-height: auto !important;
        height: auto !important;
        margin-top: 2px !important;
        padding: 8px !important;
        flex: none !important;
        flex-grow: 0 !important;
        break-inside: avoid !important;
        font-size: 8pt !important;
        line-height: 1.5 !important;
      }

      /* ===== 화면 전용 요소 숨기기 (플로팅 버튼, 인디케이터 등) ===== */
      .screen-only,
      .floating-button,
      .page-indicator,
      .nav-buttons,
      .export-overlay,
      [data-floating],
      .fixed,
      button:not(.print-button) {
        display: none !important;
        visibility: hidden !important;
      }
      
      /* ===== 모바일 PDF 전용 폰트/줄간격 축소 ===== */
      body {
        font-size: 9pt !important;
        line-height: 1.35 !important;
      }
      p, li, td, th {
        font-size: 9pt !important;
        line-height: 1.35 !important;
      }
    }
  `;
  
  let htmlContent = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Archi-Scan 개발사업 사전검토 보고서</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f1f5f9; color: #1f2937; line-height: 1.6; -webkit-font-smoothing: antialiased;
      width: 100%; min-width: 320px;
    }
    .page { max-width: 900px; margin: 0 auto; padding: 40px; background: #ffffff; }
    
    /* ===== 전역 제목 시스템 - 하단 잘림 완전 방지 ===== */
    h1, h2, h3, h4, h5, h6,
    .section-title, .report-title, .plan-title,
    .metric-title, .metric-value, .big-number,
    .status-title, .card-title, .label, .title {
      display: block !important;
      line-height: 1.5 !important;
      padding-top: 2px !important;
      padding-bottom: 4px !important;
      margin-bottom: 2px !important;
      overflow: visible !important;
      height: auto !important;
      min-height: auto !important;
      max-height: none !important;
    }
    
    /* 큰 숫자/강조 텍스트 - 더 강화 */
    .value, .result, .score-value,
    .ai-score-value, .highlight-value {
      display: block !important;
      line-height: 1.45 !important;
      padding-top: 3px !important;
      padding-bottom: 6px !important;
      margin-bottom: 2px !important;
      overflow: visible !important;
      height: auto !important;
      min-height: auto !important;
      max-height: none !important;
    }
    
    /* 모든 카드/박스 래퍼 - overflow 완전 제거 + 세로 정렬 해제 */
    .summary-card, .metric-card, .verdict-box,
    .conclusion-box, .risk-category, .ai-score-card,
    .score-card, .info-box, .opinion-box, .key-point,
    .print-scenario-block, .ai-analysis-summary,
    .summary-grid > *, .score-grid > *, .ai-score-grid > * {
      overflow: visible !important;
      height: auto !important;
      min-height: auto !important;
      max-height: none !important;
      align-items: flex-start !important;
      justify-content: flex-start !important;
    }
    
    /* ===== 5번/6번 섹션 압축 레이아웃 (screen) ===== */
    .compact-section { padding: 16px 0; }
    .compact-grid-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 12px;
    }
    .compact-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 14px;
      text-align: center;
    }
    .compact-label {
      display: block;
      font-size: 11px;
      color: #64748b;
      margin-bottom: 4px;
    }
    .compact-value {
      display: block;
      font-size: 16px;
      font-weight: 700;
      color: #1e293b;
      line-height: 1.4;
    }
    .compact-stats-row {
      display: flex;
      gap: 20px;
      margin-bottom: 12px;
      font-size: 13px;
      color: #374151;
    }
    .stat-item strong {
      color: #0369a1;
      margin-right: 6px;
    }
    .compact-tags { margin-top: 8px; }
    .compact-tag {
      display: inline-block;
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 12px;
      color: #0369a1;
      margin: 2px;
    }
    .feasibility-compact-layout {
      display: grid;
      grid-template-columns: 1.3fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }
    .compact-table {
      width: 100%;
      border-collapse: collapse;
    }
    .compact-table td, .compact-table th {
      padding: 8px 12px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 13px;
    }
    .compact-table th {
      background: #f8fafc;
      font-weight: 600;
      text-align: left;
    }
    .compact-table .total-row { background: #f1f5f9; }
    .compact-table .roi-row { background: #ecfdf5; }
    .compact-table .roi-row td { font-size: 16px; font-weight: 700; }
    .roi-summary-compact {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .mini-stat {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      text-align: center;
    }
    .mini-label {
      display: block;
      font-size: 10px;
      color: #64748b;
      margin-bottom: 2px;
    }
    .mini-value {
      display: block;
      font-size: 14px;
      font-weight: 700;
      color: #1e293b;
    }
    .scenario-compact { margin-top: 12px; }
    
    /* 워터마크 — 사전검토용 표시 */
    .page { position: relative; }
    .page::after {
      content: '사전검토용';
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%) rotate(-35deg);
      font-size: 72px;
      font-weight: 800;
      color: rgba(148, 163, 184, 0.06);
      pointer-events: none;
      white-space: nowrap;
      z-index: 0;
      letter-spacing: 12px;
    }
    .cover::after { content: none; }
    
    ${printCss}
    

    /* ===== 화면(모바일) 반응형 ===== */
    @media screen {
      .cover { 
        height: auto !important; max-height: none !important;
        min-height: 100vh; min-height: 100dvh;
        padding: 40px 24px !important;
      }
      .page { 
        max-width: 100% !important; 
        padding: 24px 16px !important; 
      }
    }
    /* === 모바일 화면 최적화 === */
    @media screen and (max-width: 767px) {
      .cover h1 { font-size: 24px !important; word-break: keep-all !important; line-height: 1.35 !important; }
      .cover .address { font-size: 15px !important; }
      .cover .meta-info { font-size: 11px !important; }
      .cover .company { font-size: 13px !important; }
      .section-title { font-size: 17px !important; margin-bottom: 10px !important; }
      .summary-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 6px !important; }
      .summary-card { padding: 8px 6px !important; }
      .summary-card .value { font-size: 16px !important; }
      .summary-card .label { font-size: 10px !important; }
      .plan-card { padding: 10px !important; }
      table { font-size: 11px !important; }
      table td, table th { padding: 5px 6px !important; }
      .risk-grid { grid-template-columns: 1fr !important; }
      .conclusion-box { padding: 12px !important; }
      .ai-score-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 6px !important; }
      .ai-score-value { font-size: 18px !important; }
      .score-grid { grid-template-columns: repeat(2, 1fr) !important; }
    }
    @media screen and (min-width: 768px) {
      .page { 
        max-width: 900px !important; 
        padding: 40px !important; 
      }
      .cover {
        padding: 60px 50px !important;
      }
    }

    /* 표지 - 블루 테마 (A4 1페이지 고정) */
    .cover { 
      height: 297mm; max-height: 297mm; width: 100%;
      display: flex; flex-direction: column; justify-content: center; 
      text-align: center; padding: 60px 50px;
      background: linear-gradient(160deg, #0f172a 0%, #1e3a5f 35%, #0c4a6e 65%, #134e4a 100%);
      color: #fff; page-break-after: always; break-after: page;
      overflow: visible; position: relative;
    }
    .cover::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      background: radial-gradient(circle at 30% 20%, rgba(94,234,212,0.08) 0%, transparent 50%),
                  radial-gradient(circle at 70% 80%, rgba(56,189,248,0.06) 0%, transparent 50%);
      pointer-events: none;
    }
    .cover .doc-number { font-size: 11px; color: rgba(255,255,255,0.4); margin-bottom: 48px; letter-spacing: 1px; }
    .cover .english-title { font-size: 12px; color: #5eead4; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 12px; display: block; }
    .cover h1 { font-size: clamp(26px, 6vw, 38px); color: #fff; margin-bottom: 20px; font-weight: 800; line-height: 1.3; display: block; word-break: keep-all; }
    .cover .cover-divider { width: 60px; height: 2px; background: linear-gradient(90deg, transparent, #5eead4, transparent); margin: 0 auto 24px; }
    .cover .address { font-size: 18px; color: rgba(255,255,255,0.9); margin-bottom: 6px; font-weight: 500; display: block; }
    .cover .project-type { font-size: 14px; color: rgba(255,255,255,0.5); margin-bottom: 56px; }
    .cover .meta-info { font-size: 13px; color: rgba(255,255,255,0.55); line-height: 1.8; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px; }
    .cover .meta-info p { margin: 2px 0; }
    .cover .company { margin-top: 48px; font-size: 15px; color: #5eead4; font-weight: 700; letter-spacing: 1px; display: block; }
    
    /* 섹션 - 화이트 테마 */
    .section { padding: 16px 0; border-bottom: 1px solid #e5e7eb; background: #ffffff; overflow: visible; }
    
    /* 섹션 제목 - 하단 잘림 완전 방지 */
    .section-title { 
      font-size: 20px; color: #0369a1; 
      margin-top: 4px; margin-bottom: 14px;
      padding-top: 2px; padding-bottom: 4px; padding-left: 12px;
      font-weight: 700; line-height: 1.4; 
      overflow: visible; display: block;
      border-left: 4px solid #0369a1;
      height: auto; min-height: auto;
    }
    .section-title::before { 
      display: none !important; content: none !important;
      width: 0 !important; height: 0 !important;
    }
    .section-subtitle { 
      font-size: 15px; color: #6b7280; margin-bottom: 12px; 
      line-height: 1.5; padding-bottom: 4px; 
      overflow: visible; display: block;
    }
    
    /* 섹션 헤더 래퍼 */
    .section-header, .report-section-header {
      display: block; overflow: visible;
    }
    .section-header + *, .report-section-header + * {
      margin-top: 12px;
    }
    
    /* 종합 결과 카드 - 상단 정렬, 패딩 확대 */
    .summary-grid { 
      display: grid; grid-template-columns: repeat(4, 1fr); 
      gap: 8px; margin-bottom: 12px; overflow: visible;
    }
    .summary-card { 
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; 
      padding: 10px 8px; overflow: visible;
    }
    .summary-card .label { 
      font-size: 11px; color: #64748b; margin-bottom: 6px; 
      line-height: 1.5; padding-bottom: 3px; display: block;
    }
    .summary-card .value { 
      font-size: 14px; font-weight: 700; color: #1e293b; 
      line-height: 1.3; padding-bottom: 3px; display: block;
    }
    .summary-card .value.highlight { color: #0d9488; }
    
    /* 판단 박스 - 민트/그린, 상단 정렬, 패딩 확대 */
    .verdict-box { 
      background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); 
      border-radius: 8px; padding: 20px 18px; text-align: center; margin-top: 12px;
      border: 1px solid #6ee7b7; overflow: visible;
    }
    .verdict-box .label { 
      font-size: 12px; color: #047857; margin-bottom: 8px; 
      line-height: 1.5; padding-bottom: 3px; display: block;
    }
    .verdict-box .result { 
      font-size: 20px; font-weight: 700; color: #065f46; 
      line-height: 1.45; padding-bottom: 6px; display: block;
    }
    
    /* 테이블 */
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f1f5f9; color: #475569; font-weight: 600; font-size: 12px; }
    td { color: #374151; font-size: 13px; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .highlight { color: #0d9488; font-weight: 600; }
    
    /* 시나리오 분석 블록 - 밝은 카드형 */
    .print-scenario-block {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      margin-top: 16px;
      overflow: visible;
    }
    .print-scenario-block .section-subtitle {
      color: #475569;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 12px;
      line-height: 1.45;
      padding-bottom: 3px;
    }
    .print-scenario-block table {
      background: #ffffff;
      border: 1px solid #e2e8f0;
    }
    .print-scenario-block th {
      background: #f1f5f9;
      color: #475569;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 12px;
      line-height: 1.45;
      padding-bottom: 3px;
    }
    .print-scenario-block table {
      background: #ffffff;
      border: 1px solid #e2e8f0;
    }
    .print-scenario-block th {
      background: #f1f5f9;
      color: #475569;
    }
    .print-scenario-block td {
      background: #ffffff;
    }
    
    /* 리스크 그리드 */
    .risk-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; overflow: visible; }
    .risk-category { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 18px; overflow: visible; }
    .risk-category h4 { 
      font-size: 13px; color: #b45309; margin-bottom: 12px; font-weight: 600; 
      line-height: 1.5; padding-bottom: 4px; display: block;
    }
    .risk-list { list-style: none; }
    .risk-list li { 
      padding: 6px 0 6px 16px; position: relative; font-size: 13px; color: #78350f; line-height: 1.6;
    }
    .risk-list li::before { 
      content: '•'; position: absolute; left: 0; color: #d97706; 
    }
    
    /* 결론 박스 - 연한 민트 */
    .conclusion-box { 
      background: #ecfdf5; border-left: 4px solid #10b981; 
      padding: 22px; margin-top: 14px; border-radius: 0 12px 12px 0;
      overflow: visible;
    }
    .conclusion-box p { color: #065f46; line-height: 1.6; }
    .conclusion-box h3, .conclusion-box h4 { 
      line-height: 1.5; padding-bottom: 5px; margin-bottom: 12px; display: block;
    }
    
    /* 면책문구 */
    .disclaimer { 
      text-align: center; padding: 20px 16px; color: #9ca3af; 
      font-size: 11px; border-top: 1px solid #e5e7eb; margin-top: 16px;
      background: #f9fafb; overflow: visible;
    }
    .disclaimer p { margin: 4px 0; line-height: 1.7; padding-bottom: 2px; }
    
    /* 키포인트 */
    .key-points { margin-top: 24px; overflow: visible; }
    .key-point { 
      display: block; 
      padding: 16px 0 16px 44px; border-bottom: 1px solid #e5e7eb;
      position: relative; overflow: visible;
    }
    .key-point::before { 
      content: '✓'; position: absolute; left: 0; top: 16px;
      width: 28px; height: 28px; background: #d1fae5; border-radius: 50%; 
      text-align: center; line-height: 28px;
      color: #059669; font-size: 14px;
    }
    
    /* AI 분석 점수 */
    .score-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; overflow: visible; }
    .score-card { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px 18px; text-align: center; overflow: visible; }
    .score-card .score-label { 
      font-size: 12px; color: #0369a1; margin-bottom: 8px; 
      line-height: 1.5; padding-bottom: 3px; display: block;
    }
    .score-card .score-value { 
      font-size: 28px; font-weight: 700; color: #0c4a6e; 
      line-height: 1.45; padding-bottom: 5px; display: block;
    }
  </style>
</head>
<body>
  <!-- 1. 표지 -->
  <div class="cover">
      <p class="doc-number">${report.cover.documentNumber}</p>
      <p class="english-title">${report.cover.englishSubtitle}</p>
      <h1>${report.cover.koreanTitle}</h1>
      <div class="cover-divider"></div>
      <p class="address">${report.cover.address}</p>
      <p class="project-type">${report.cover.projectType}</p>
      <div class="meta-info">
        <p>대지면적: ${report.cover.siteAreaFormatted}</p>
        <p>검토 배치안: ${report.cover.selectedLayoutName}</p>
        <p>작성일자: ${report.cover.createdDate}</p>
      </div>
      <p class="company">${report.cover.companyName}</p>
      ${report.cover.website ? `<p style="font-size: 11px; color: #3b82f6; margin-top: 6px;"><a href="${report.cover.website}" style="color: #3b82f6; text-decoration: none;">${report.cover.website}</a></p>` : ''}
      <p style="font-size: 10px; color: #94a3b8; margin-top: 4px;">${report.cover.contact}</p>
    </div>



  ${(() => {
    const angleLabels: Record<string, string> = { 'eye-level': '정면 · 보행자 시점', 'birds-eye': '조감도 · 드론 시점', 'entrance': '입구 · 클로즈업' }
    const images = data.aiMultiImages?.filter(m => m.image) || []
    if (images.length > 0) {
      return `<div style="margin: 0 30px; padding: 20px 0;">
        <div style="font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 12px;">&#10024; AI 건축 렌더링</div>
        <div style="display: grid; grid-template-columns: ${images.length === 1 ? '1fr' : images.length === 2 ? '1fr 1fr' : '1fr 1fr'}; gap: 10px;">
          ${images.map((m, i) => `<div style="border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;${images.length === 3 && i === 0 ? ' grid-column: 1 / -1;' : ''}">
            <img src="${m.image}" alt="${angleLabels[m.angle] || m.angle}" style="width: 100%; height: auto; display: block;" />
            <div style="padding: 5px 10px; background: #f8fafc; font-size: 9px; color: #64748b;">${angleLabels[m.angle] || m.angle}</div>
          </div>`).join('')}
        </div>
        <div style="text-align: right; margin-top: 4px; font-size: 8px; color: #94a3b8;">Powered by Gemini</div>
      </div>`
    } else if (data.aiRenderImage) {
      return `<div style="margin: 0 30px; padding: 20px 0;">
        <div style="border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0;">
          <img src="${data.aiRenderImage}" alt="AI 건축 렌더링" style="width: 100%; height: auto; display: block;" />
          <div style="padding: 8px 14px; background: #f8fafc; display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 10px; font-weight: 600; color: #475569;">&#10024; AI 건축 렌더링</span>
            <span style="font-size: 9px; color: #94a3b8;">Powered by Gemini</span>
          </div>
        </div>
      </div>`
    }
    return ''
  })()}
  <!-- Executive Summary -->
  <div class="page" style="padding: 40px 30px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <p style="font-size: 10px; color: #64748b; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 4px;">EXECUTIVE SUMMARY</p>
        <h2 style="font-size: 22px; font-weight: 800; color: #1e293b; margin: 0;">핵심 요약</h2>
        <p style="font-size: 11px; color: #94a3b8; margin-top: 4px;">${report.cover.address}</p>
      </div>
      <div style="text-align: center; padding: 20px; background: ${report.summary.roi >= 15 ? 'linear-gradient(135deg, #d1fae5, #a7f3d0)' : report.summary.roi >= 5 ? 'linear-gradient(135deg, #dbeafe, #bfdbfe)' : report.summary.roi >= 0 ? 'linear-gradient(135deg, #fef3c7, #fde68a)' : 'linear-gradient(135deg, #fee2e2, #fecaca)'}; border-radius: 12px; margin-bottom: 16px;">
        <p style="font-size: 11px; color: #64748b; margin: 0 0 4px 0;">투자수익률 (ROI)</p>
        <p style="font-size: 42px; font-weight: 900; color: ${report.summary.roi >= 15 ? '#059669' : report.summary.roi >= 5 ? '#2563eb' : report.summary.roi >= 0 ? '#d97706' : '#dc2626'}; margin: 0; line-height: 1.1;">${report.summary.roiFormatted}</p>
        <p style="font-size: 12px; font-weight: 600; color: #475569; margin: 6px 0 0 0;">${report.summary.verdict}</p>
      </div>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px;">
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center;"><p style="font-size: 10px; color: #64748b; margin: 0 0 4px 0;">배치안</p><p style="font-size: 14px; font-weight: 700; color: #1e293b; margin: 0;">${report.summary.selectedLayoutName}</p></div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center;"><p style="font-size: 10px; color: #64748b; margin: 0 0 4px 0;">총사업비</p><p style="font-size: 14px; font-weight: 700; color: #1e293b; margin: 0;">${report.summary.totalCostFormatted}</p></div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center;"><p style="font-size: 10px; color: #64748b; margin: 0 0 4px 0;">예상수익</p><p style="font-size: 14px; font-weight: 700; color: #0d9488; margin: 0;">${report.summary.expectedProfitFormatted}</p></div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center;"><p style="font-size: 10px; color: #64748b; margin: 0 0 4px 0;">세대수</p><p style="font-size: 14px; font-weight: 700; color: #1e293b; margin: 0;">${report.summary.units}세대</p></div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center;"><p style="font-size: 10px; color: #64748b; margin: 0 0 4px 0;">연면적</p><p style="font-size: 14px; font-weight: 700; color: #1e293b; margin: 0;">${report.planning.gfaFormatted}</p></div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center;"><p style="font-size: 10px; color: #64748b; margin: 0 0 4px 0;">손익분기 분양률</p><p style="font-size: 14px; font-weight: 700; color: #1e293b; margin: 0;">${report.feasibility.breakEvenRateFormatted}</p></div>
      </div>
      <div class="ai-score-grid" style="display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:16px;">
        <div class="ai-score-card" style="background:#f0f9ff; border:1px solid #bae6fd; border-radius:8px; padding:10px; text-align:center;"><span class="ai-score-label" style="font-size:9px; color:#64748b; display:block; margin-bottom:2px;">법규 부합성</span><span class="ai-score-value" style="font-size:20px; font-weight:800; color:#0369a1; display:block;">${report.aiAnalysis.legalCompliance}</span></div>
        <div class="ai-score-card" style="background:#f0f9ff; border:1px solid #bae6fd; border-radius:8px; padding:10px; text-align:center;"><span class="ai-score-label" style="font-size:9px; color:#64748b; display:block; margin-bottom:2px;">사업성</span><span class="ai-score-value" style="font-size:20px; font-weight:800; color:#0369a1; display:block;">${report.aiAnalysis.profitability}</span></div>
        <div class="ai-score-card" style="background:#f0f9ff; border:1px solid #bae6fd; border-radius:8px; padding:10px; text-align:center;"><span class="ai-score-label" style="font-size:9px; color:#64748b; display:block; margin-bottom:2px;">상품성</span><span class="ai-score-value" style="font-size:20px; font-weight:800; color:#0369a1; display:block;">${report.aiAnalysis.marketability}</span></div>
        <div class="ai-score-card highlight-card" style="background:#0d9488; border-radius:8px; padding:10px; text-align:center;"><span class="ai-score-label" style="font-size:9px; color:rgba(255,255,255,0.8); display:block; margin-bottom:2px;">종합 점수</span><span class="ai-score-value" style="font-size:20px; font-weight:800; color:#fff; display:block;">${report.aiAnalysis.totalScore}</span></div>
      </div>
      <div style="background: #f1f5f9; border-radius: 8px; padding: 14px;">
        <p style="font-size: 11px; font-weight: 700; color: #334155; margin: 0 0 8px 0;">핵심 포인트</p>
        ${report.summary.keyPoints.slice(0, 3).map((p: string) => `<p style="font-size: 11px; color: #475569; margin: 0 0 4px 0; padding-left: 12px; position: relative;"><span style="position: absolute; left: 0;">•</span>${p}</p>`).join('')}
      </div>
    </div>


    <!-- 2. 종합 검토 결과 -->
    <div class="section pdf-section">
      <h2 class="section-title">종합 검토 결과</h2>
      <div class="summary-grid pdf-card-group" style="display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:10px;">
        <div class="summary-card">
          <p class="label">선정 배치안</p>
          <p class="value">${report.summary.selectedLayoutName}</p>
        </div>
        <div class="summary-card">
          <p class="label">연면적</p>
          <p class="value">${report.planning.gfaFormatted}</p>
        </div>
        <div class="summary-card">
          <p class="label">세대수</p>
          <p class="value">${report.summary.units}세대</p>
        </div>
        <div class="summary-card">
          <p class="label">ROI</p>
          <p class="value highlight">${report.summary.roiFormatted}</p>
        </div>
        <div class="summary-card">
          <p class="label">총투자비</p>
          <p class="value">${report.summary.totalCostFormatted}</p>
        </div>
        <div class="summary-card">
          <p class="label">예상수익</p>
          <p class="value highlight">${report.summary.expectedProfitFormatted}</p>
        </div>
      </div>
      <div class="verdict-box pdf-summary-box">
        <p class="label">종합 판단</p>
        <p class="result">${report.summary.verdict}</p>
      </div>
      <div class="key-points pdf-summary-box">
        ${report.summary.keyPoints.map(point => `
        <div class="key-point">
          <div class="key-point-icon"></div>
          <span>${point}</span>
        </div>
        `).join('')}
      </div>
    </div>

    <!-- 3. 검토 개요 -->
    <div class="section pdf-section pdf-card-group">
      <h2 class="section-title">1. 검토 개요</h2>
      <div class="print-block" style="padding:0; margin:0;">
        <p style="margin-bottom: 12px;">${report.overview.purpose}</p>
        <h4 class="section-subtitle">검토 범위</h4>
        <ul style="list-style: disc; margin-left: 20px; color: #374151; margin-bottom:8px;">
          ${report.overview.scope.map(item => `<li>${item}</li>`).join('')}
        </ul>
        <h4 class="section-subtitle" style="margin-top: 12px;">검토 기준</h4>
        <ul style="list-style: disc; margin-left: 20px; color: #374151;">
          ${report.overview.standards.map(item => `<li>${item}</li>`).join('')}
        </ul>
      </div>
    </div>

    <!-- 4. 대상지 분석 -->
    <div class="section pdf-section pdf-card-group">
      <div style="padding:0; margin:0;">
        <h2 class="section-title" style="margin-bottom:8px;">2. 대상지 분석</h2>
        <div class="pdf-table-wrap">
        <table>
          <thead><tr><th>항목</th><th>내용</th></tr></thead>
          <tbody>
            <tr><td>주소</td><td>${report.siteAnalysis.address}</td></tr>
            <tr><td>대지면적</td><td>${report.siteAnalysis.siteAreaFormatted}</td></tr>
            <tr><td>토지이용계획</td><td>${report.siteAnalysis.landUsePlan}</td></tr>
            <tr><td>접도현황</td><td>${report.siteAnalysis.roadAccess}</td></tr>
            <tr><td>높이제한</td><td>${report.siteAnalysis.heightLimitFormatted}</td></tr>
            <tr><td>지구단위계획</td><td>${report.siteAnalysis.districtPlan}</td></tr>
          </tbody>
        </table>
        </div>
      </div>
    </div>

<!-- 3. 법규 검토 -->
    <section class="pdf-section pdf-section">
      <div class="print-title-group">
        <h2 class="section-title">3. 법규 검토</h2>
      </div>
      <div class="print-block">
        <table>
          <thead>
            <tr>
              <th>항목</th>
              <th class="text-center">법정 한도</th>
              <th class="text-center">적용 계획</th>
              <th class="text-center">적정 여부</th>
            </tr>
          </thead>
          <tbody>
            ${report.regulationReview.items.map(item => `
            <tr>
              <td>${item.name}</td>
              <td class="text-center">${item.legalLimit}</td>
              <td class="text-center">${item.appliedPlan}</td>
              <td class="text-center ${item.status === '적정' ? 'highlight' : item.status === '초과' ? 'danger' : 'warning'}">${item.status}</td>
            </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </section>

    <!-- 6. 배치안 비교 검토 -->
    <div class="section pdf-section pdf-card-group">
      <h2 class="section-title">4. 배치안 비교 검토</h2>
      <div class="pdf-table-wrap">
        <table>
        <tr>
          <th>배치안</th>
          <th class="text-center">건폐율</th>
          <th class="text-center">층수</th>
          <th class="text-center">세대수</th>
          <th class="text-center">주차대수</th>
          <th class="text-center">ROI</th>
        </tr>
        ${report.layoutComparison.layouts.map(layout => `
        <tr style="${layout.isRecommended ? 'background:#ecfdf5;' : ''}">
          <td>${layout.name}${layout.isRecommended ? ' <span class="highlight">(추천)</span>' : ''}</td>
          <td class="text-center">${layout.buildingCoverageFormatted}</td>
          <td class="text-center">${layout.floors}층</td>
          <td class="text-center">${layout.units}세대</td>
          <td class="text-center">${layout.parking}대</td>
          <td class="text-center ${layout.isRecommended ? 'highlight' : ''}">${layout.roiFormatted}</td>
        </tr>
        `).join('')}
      </table>
      </div>
      <div class="conclusion-box pdf-summary-box">
        <p><strong>검토의견: ${report.layoutComparison.recommendedLayoutName} 배치안 추천</strong></p>
        <p style="margin-top: 8px; color: #065f46;">${report.layoutComparison.recommendationReason}</p>
      </div>
    </div>

<!-- 5. 규모 산정 및 계획 구성 -->
    <section class="pdf-section pdf-section">
      <div class="print-title-group">
        <h2 class="section-title">5. 규모 산정 및 계획 구성</h2>
      </div>
      <div class="print-cards-block">
        <div class="summary-grid pdf-card-group" style="display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:10px;">
          <div class="summary-card">
            <p class="label">선정 배치안</p>
            <p class="value">${report.planning.selectedLayoutName}</p>
          </div>
          <div class="summary-card">
            <p class="label">층수</p>
            <p class="value">${report.planning.floorsFormatted}</p>
          </div>
          <div class="summary-card">
            <p class="label">세대수</p>
            <p class="value">${report.planning.units}세대</p>
          </div>
          <div class="summary-card">
            <p class="label">주차대수</p>
            <p class="value">${report.planning.parking}대</p>
          </div>
        </div>
      </div>
      <div class="print-details-block">
        <table>
          <tbody>
            <tr><td style="width: 120px; color: #64748b;">건폐율</td><td>${report.planning.buildingCoverageFormatted}</td></tr>
            <tr><td style="color: #64748b;">용적률</td><td>${report.planning.farFormatted}</td></tr>
            <tr><td style="color: #64748b;">연면적</td><td>${report.planning.gfaFormatted}</td></tr>
          </tbody>
        </table>
        <div style="margin-top: 12px;">
          ${report.planning.layoutCharacteristics.map(tag => `<span style="background:#f0f9ff; border:1px solid #bae6fd; padding:4px 12px; border-radius:16px; font-size:12px; color:#0369a1; display:inline-block; margin:2px;">${tag}</span>`).join('')}
        </div>
      </div>
    </section>

    <!-- 7. 사업성 검토 -->
    <section class="pdf-section pdf-section">
      <div class="print-title-group">
        <h2 class="section-title">7. 사업성 검토</h2>
      </div>
      <div class="print-cost-block">
        <table>
          <thead><tr><th>구분</th><th class="text-right">금액</th></tr></thead>
          <tbody>
            <tr><td>토지비</td><td class="text-right">${report.feasibility.landCostFormatted}</td></tr>
            <tr><td>공사비</td><td class="text-right">${report.feasibility.constructionCostFormatted}</td></tr>
            <tr><td>기타비용</td><td class="text-right">${report.feasibility.indirectCostFormatted}</td></tr>
            <tr style="background:#f1f5f9;"><td><strong>총사업비</strong></td><td class="text-right"><strong>${report.feasibility.totalCostFormatted}</strong></td></tr>
            <tr><td colspan="2" style="height:8px;border:none;"></td></tr>
            <tr><td>총분양수입</td><td class="text-right">${report.feasibility.totalRevenueFormatted}</td></tr>
            <tr><td>예상수익</td><td class="text-right highlight">${report.feasibility.expectedProfitFormatted}</td></tr>
            <tr style="background:#ecfdf5;"><td><strong>ROI</strong></td><td class="text-right highlight" style="font-size:18px;"><strong>${report.feasibility.roiFormatted}</strong></td></tr>
          </tbody>
        </table>
      </div>
    </section>

    </section>

    <!-- 7. AI 분석 -->
    <section class="pdf-section pdf-section pdf-card-group">

      <h2 class="section-title" style="margin-bottom:12px;">8. AI 분석</h2>

      <div class="ai-score-grid" style="display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin:12px 0;">
        <div class="ai-score-card" style="text-align:center; padding:14px 8px; background:#f0fdfa; border:1px solid #99f6e4; border-radius:8px;">
          <span class="ai-score-label" style="font-size:11px; color:#64748b; display:block; margin-bottom:6px;">법규 부합성</span>
          <span class="ai-score-value" style="font-size:22px; font-weight:700; color:#0f766e; display:block;">${report.aiAnalysis?.legalCompliance ?? (report.planning.coverage <= 60 ? 90 : 75)}</span>
        </div>
        <div class="ai-score-card" style="text-align:center; padding:14px 8px; background:#f0fdfa; border:1px solid #99f6e4; border-radius:8px;">
          <span class="ai-score-label" style="font-size:11px; color:#64748b; display:block; margin-bottom:6px;">사업성</span>
          <span class="ai-score-value" style="font-size:22px; font-weight:700; color:#0f766e; display:block;">${report.aiAnalysis?.profitability ?? (report.feasibility.roi > 20 ? 85 : report.feasibility.roi > 12 ? 70 : 55)}</span>
        </div>
        <div class="ai-score-card" style="text-align:center; padding:14px 8px; background:#f0fdfa; border:1px solid #99f6e4; border-radius:8px;">
          <span class="ai-score-label" style="font-size:11px; color:#64748b; display:block; margin-bottom:6px;">상품성</span>
          <span class="ai-score-value" style="font-size:22px; font-weight:700; color:#0f766e; display:block;">${report.aiAnalysis?.marketability ?? (report.feasibility.roi > 15 ? 78 : 65)}</span>
        </div>
        <div class="ai-score-card highlight-card" style="text-align:center; padding:14px 8px; background:#ecfdf5; border:2px solid #6ee7b7; border-radius:8px;">
          <span class="ai-score-label" style="font-size:11px; color:#064e3b; display:block; margin-bottom:6px; font-weight:600;">종합 점수</span>
          <span class="ai-score-value" style="font-size:26px; font-weight:700; color:#065f46; display:block;">${report.aiAnalysis?.totalScore ?? Math.round((report.feasibility.roi > 20 ? 85 : report.feasibility.roi > 12 ? 70 : 55) * 0.95)}</span>
        </div>
      </div>
    </section>

    
    <!-- 8.5 설계 품질 평가 (Alexander Pattern Language) -->
    ${data.patternQuality ? `
    <section class="pdf-section pdf-card-group">
      <h2 class="section-title" style="margin-bottom:12px;">설계 품질 평가</h2>
      <p style="font-size:11px; color:#64748b; margin-bottom:12px;">Alexander Pattern Language · The Nature of Order 기반</p>
      
      <div style="display:grid; grid-template-columns:1fr 2fr; gap:12px; margin-bottom:14px;">
        <div style="text-align:center; padding:16px; background:${data.patternQuality.gradeColor}15; border:2px solid ${data.patternQuality.gradeColor}; border-radius:12px;">
          <p style="font-size:11px; color:#64748b; margin:0 0 6px 0;">종합 등급</p>
          <p style="font-size:36px; font-weight:800; color:${data.patternQuality.gradeColor}; margin:0; line-height:1;">${data.patternQuality.grade}</p>
          <p style="font-size:18px; font-weight:700; color:#1e293b; margin:4px 0 0 0;">${data.patternQuality.overallQuality}점</p>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
          <div style="padding:12px; background:#f0fdfa; border:1px solid #99f6e4; border-radius:8px; text-align:center;">
            <p style="font-size:10px; color:#64748b; margin:0 0 4px 0;">패턴 점수</p>
            <p style="font-size:22px; font-weight:700; color:#0f766e; margin:0;">${data.patternQuality.totalPatternScore}</p>
          </div>
          <div style="padding:12px; background:#f0f9ff; border:1px solid #bae6fd; border-radius:8px; text-align:center;">
            <p style="font-size:10px; color:#64748b; margin:0 0 4px 0;">Living Structure</p>
            <p style="font-size:22px; font-weight:700; color:#0369a1; margin:0;">${data.patternQuality.totalLivingScore}</p>
          </div>
        </div>
      </div>

      <div style="background:#f8fafb; border:1px solid #e2e8f0; border-left:4px solid #14b8a6; border-radius:8px; padding:12px; margin-bottom:14px;">
        <p style="font-size:11px; font-weight:700; color:#0f766e; margin:0 0 6px 0;">설계 철학</p>
        <p style="font-size:11px; color:#334155; line-height:1.6; margin:0;">${data.patternQuality.philosophy}</p>
      </div>

      <p style="font-size:11px; font-weight:600; color:#334155; margin-bottom:8px;">핵심 패턴 평가</p>
      <table style="width:100%; border-collapse:collapse; font-size:11px;">
        <thead><tr style="background:#f1f5f9;"><th style="padding:6px 8px; text-align:left; color:#64748b;">패턴</th><th style="padding:6px 8px; text-align:left; color:#64748b;">이름</th><th style="padding:6px 8px; text-align:right; color:#64748b;">점수</th></tr></thead>
        <tbody>
          ${data.patternQuality.topPatterns.map(p => `<tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:5px 8px; color:#14b8a6; font-weight:600;">#${p.id}</td><td style="padding:5px 8px; color:#334155;">${p.nameKr}</td><td style="padding:5px 8px; text-align:right; font-weight:600;">${p.score}</td></tr>`).join('')}
        </tbody>
      </table>
      <p style="font-size:9px; color:#94a3b8; margin-top:8px; text-align:center;">Christopher Alexander, A Pattern Language (1977)</p>
    </section>
    ` : ''}

    <!-- 8. 시나리오 및 사업기간 분석 -->
    <section class="pdf-section pdf-section">
      <div class="print-title-group">
        <h2 class="section-title">9. 시나리오 및 사업기간 분석</h2>
      </div>
      <div class="print-roi-block pdf-card-group">
        <div class="summary-grid pdf-card-group" style="display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:10px;">
          <div class="summary-card">
            <p class="label">손익분기 분양률</p>
            <p class="value">${report.feasibility.breakEvenRateFormatted}</p>
          </div>
          <div class="summary-card">
            <p class="label">㎡당 사업비</p>
            <p class="value">${report.feasibility.costPerSqmFormatted}</p>
          </div>
          <div class="summary-card">
            <p class="label">세대당 평균분양가</p>
            <p class="value">${report.feasibility.avgSalePriceFormatted}</p>
          </div>
          <div class="summary-card">
            <p class="label">예상 사업기간</p>
            <p class="value">${report.feasibility.projectPeriod}</p>
          </div>
        </div>
      </div>
      <div class="print-scenario-block">
        <h4 class="section-subtitle">시나리오 분석</h4>
        <table>
          <thead><tr><th>시나리오</th><th>조건</th><th class="text-center">ROI</th></tr></thead>
          <tbody>
            ${report.feasibility.scenarios.map(s => `
            <tr>
              <td>${s.name}</td>
              <td>${s.description}</td>
              <td class="text-center ${s.roi >= 20 ? 'highlight' : ''}">${s.roiFormatted}</td>
            </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="margin-top: 16px;">
          <h4 class="section-subtitle" style="margin-bottom: 8px;">예상 사업 일정</h4>
          <div style="display: flex; gap: 2px; height: 36px; border-radius: 6px; overflow: visible; font-size: 9px; font-weight: 600; line-height: 1.4;">
            <div style="flex: 2; background: #dbeafe; color: #1e40af; display: flex; align-items: center; justify-content: center;">사업기획<br/>2-3개월</div>
            <div style="flex: 3; background: #bae6fd; color: #0369a1; display: flex; align-items: center; justify-content: center;">인허가<br/>4-6개월</div>
            <div style="flex: 8; background: #99f6e4; color: #0f766e; display: flex; align-items: center; justify-content: center;">시공<br/>18-24개월</div>
            <div style="flex: 3; background: #fde68a; color: #92400e; display: flex; align-items: center; justify-content: center;">분양/입주<br/>3-6개월</div>
          </div>
          <p style="font-size: 9px; color: #94a3b8; margin-top: 4px; text-align: center;">※ 실제 일정은 규모·인허가 조건에 따라 달라질 수 있습니다.</p>
        </div>
      </div>
    </section>

    <!-- 8 + 9 + Footer 그룹 - 마지막 페이지 -->
    <div class="print-final-page-group">
      <!-- 9. 리스크 및 고려사항 -->
      <section class="pdf-section pdf-section">
        <div class="print-title-group">
          <h2 class="section-title">10. 리스크 및 고려사항</h2>
        </div>
        <div class="print-risk-block">
          <div class="risk-grid">
            <div class="risk-category print-risk-card">
              <h4>토지 관련</h4>
              <ul class="risk-list">
                ${report.risks.land.map(item => `<li>${item}</li>`).join('')}
              </ul>
            </div>
            <div class="risk-category print-risk-card">
              <h4>인허가 관련</h4>
              <ul class="risk-list">
                ${report.risks.permit.map(item => `<li>${item}</li>`).join('')}
              </ul>
            </div>
            <div class="risk-category print-risk-card">
              <h4>시장 관련</h4>
              <ul class="risk-list">
                ${report.risks.market.map(item => `<li>${item}</li>`).join('')}
              </ul>
            </div>
            <div class="risk-category print-risk-card">
              <h4>공사 관련</h4>
              <ul class="risk-list">
                ${report.risks.construction.map(item => `<li>${item}</li>`).join('')}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <!-- 10. 결론 및 제안 -->
      <section class="pdf-section pdf-section">
        <div class="print-conclusion-group">
          <h2 class="section-title">11. 결론 및 제안</h2>
          <p style="color: #374151; line-height: 1.8; margin-top: 12px;">${report.conclusion.finalParagraph}</p>
          <div class="verdict-box">
            <p style="font-size: 16px; color: #065f46;">${report.conclusion.summaryBox}</p>
          </div>
          <p class="pdf-note" style="font-size: 11px; line-height: 1.8; padding-bottom: 4px; overflow: visible;">본 보고서는 참고 자료로만 활용하시기 바랍니다.</p>
        </div>
      </section>

      <!-- 면책문구 -->
      <div class="disclaimer print-footer">
        <p>${report.disclaimer.mainText}</p>
        <p>${report.disclaimer.expertAdvice}</p>
        <p>${report.disclaimer.copyright}${report.cover.website ? ` · <a href="${report.cover.website}" style="color: #3b82f6; text-decoration: none;">${report.cover.website}</a>` : ''}</p>
      </div>
    </div>
</body>
</html>`;

  // 도면 SVG 삽입
  try {
    const drawingInput = {
      siteArea: data.siteArea,
      buildingCoverage: data.layout.buildingCoverage,
      floors: data.layout.floors,
      units: data.layout.units,
      parking: data.layout.parking,
      type: data.layout.type || 'tower',
      roadWidth: data.regulation?.roadWidth || 8,
      heightLimit: data.regulation?.maxHeight || 30,
      setbacks: { front: data.regulation?.hasDistrictPlan ? 2 : 1, side: 0.5, rear: 1 },
      layoutName: data.layout.name,
      gfa: data.layout.gfa,
    };
    const drawingSection = `
    <!-- 6. 설계 도면 -->
    <section class="pdf-section" style="page-break-before: always;">
      <div class="print-title-group">
        <h2 class="section-title">6. 설계 도면</h2>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div>
          <p style="font-weight: 600; font-size: 11px; margin-bottom: 6px; color: #1e293b;">배치도</p>
          ${generateSitePlanSvg(drawingInput)}
        </div>
        <div>
          <p style="font-weight: 600; font-size: 11px; margin-bottom: 6px; color: #1e293b;">단면도</p>
          ${generateSectionSvg(drawingInput)}
        </div>
        <div>
          <p style="font-weight: 600; font-size: 11px; margin-bottom: 6px; color: #1e293b;">아이소메트릭</p>
          ${generateIsometricSvg(drawingInput)}
        </div>
        <div>
          <p style="font-weight: 600; font-size: 11px; margin-bottom: 6px; color: #1e293b;">입면도</p>
          ${generateElevationSvg(drawingInput)}
        </div>
      </div>
      <div style="margin-top: 12px;">
        <p style="font-weight: 600; font-size: 11px; margin-bottom: 6px; color: #1e293b;">투시도</p>
        ${generatePerspectiveSvg(drawingInput)}
      </div>
      <p style="font-size: 9px; color: #94a3b8; margin-top: 8px; text-align: center;">※ 도면은 사전검토 단계의 개략적 배치이며, 실시설계 시 변경될 수 있습니다.</p>
    </section>

    <!-- 7. 사업성 검토 -->`;
    htmlContent = htmlContent.replace('<!-- 7. 사업성 검토 -->', drawingSection + '\n    <!-- 7. 사업성 검토 -->');
    htmlContent = htmlContent.replace('>8. AI 분석<', '>8. AI 분석<');
    htmlContent = htmlContent.replace('>8. 시나리오<', '>9. 시나리오<');
    htmlContent = htmlContent.replace('>10. 리스크 및 고려사항<', '>10. 리스크 및 고려사항<');
    htmlContent = htmlContent.replace('>11. 결론 및 제안<', '>11. 결론 및 제안<');
  } catch (e) { console.warn('[report-export] HTML 도면 삽입 실패:', e); }

  const finalHtml = translateHtml(htmlContent, (data.lang || 'ko') as ReportLang);
  const fileName = generateFileName(data.address, 'html', data.layout?.name);
    console.log('[v0] HTML 파일 생성:', fileName);
    mobileDownload(finalHtml, fileName);
    console.log('[v0] downloadHtml 완료');
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[v0] downloadHtml 오류:', message, error);
    return { success: false, error: message };
  }
}

// ============================================
// PDF 파일 다운로드 (실제 .pdf 파일 생성)
// ============================================

export async function downloadPdf(data: ExportData): Promise<{ success: boolean; error?: string }> {
  try {
    const report = convertToV250(data);
    let htmlContent = generateFullHtmlReport(report, data.address, data.patternQuality);
    
    // AI 렌더링 이미지 삽입 (멀티앵글 우선, 단일 이미지 fallback)
    const _aL: Record<string,string> = {'eye-level':'정면','birds-eye':'조감도','entrance':'입구'}
    const _mI = data.aiMultiImages?.filter(m => m.image) || []
    if (_mI.length > 0) {
      const aiBlock = '<div class="pdf-section" style="margin:0 30px;padding:20px 0"><div style="font-size:13px;font-weight:700;color:#1e293b;margin-bottom:10px">&#10024; AI 건축 렌더링</div>' +
        '<div style="border-radius:8px;overflow:hidden;border:1px solid #e2e8f0"><img src="'+_mI[0].image+'" style="width:100%;display:block"/><div style="padding:4px 10px;background:#f8fafc;font-size:9px;color:#64748b">'+(_aL[_mI[0].angle]||_mI[0].angle)+'</div></div></div>' + _mI.slice(1).map(m => '<div class="pdf-section" style="margin:0 30px;padding:4px 0"><div style="border-radius:8px;overflow:hidden;border:1px solid #e2e8f0"><img src="'+m.image+'" style="width:100%;display:block"/><div style="padding:4px 10px;background:#f8fafc;font-size:9px;color:#64748b">'+(_aL[m.angle]||m.angle)+'</div></div></div>').join('');
      htmlContent = htmlContent.replace('<!-- Executive Summary -->', aiBlock + '<!-- Executive Summary -->');
    } else if (data.aiRenderImage) {
      const aiBlock = '<div class="pdf-section" style="margin:0 30px;padding:20px 0"><div style="border-radius:10px;overflow:hidden;border:1px solid #e2e8f0"><img src="'+data.aiRenderImage+'" style="width:100%;display:block"/><div style="padding:8px 14px;background:#f8fafc"><span style="font-size:10px;font-weight:600;color:#475569">&#10024; AI 건축 렌더링</span></div></div></div>';
      htmlContent = htmlContent.replace('<!-- Executive Summary -->', aiBlock + '<!-- Executive Summary -->');
    }
    
    // 도면 SVG 삽입
    try {
      const drawingInput = {
        siteArea: data.siteArea,
        buildingCoverage: data.layout.buildingCoverage,
        floors: data.layout.floors,
        units: data.layout.units,
        parking: data.layout.parking,
        type: data.layout.type || 'tower',
        roadWidth: data.regulation?.roadWidth || 8,
        heightLimit: data.regulation?.maxHeight || 30,
        setbacks: { front: data.regulation?.hasDistrictPlan ? 2 : 1, side: 0.5, rear: 1 },
        layoutName: data.layout.name,
        gfa: data.layout.gfa,
      };
      
      // SVG → Canvas → PNG 변환 (html2canvas 호환)
      const svgToPngDataUrl = async (svgStr: string): Promise<string> => {
        try {
          const W = 720, H = 500;
          const c = document.createElement('canvas'); c.width = W; c.height = H;
          const ctx = c.getContext('2d');
          if (!ctx) return svgToImgTag(svgStr);
          ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 0, W, H);
          // SVG에 명시적 크기 설정
          let fixed = svgStr;
          if (!fixed.includes('width=')) fixed = fixed.replace(/<svg/, `<svg width="${W}" height="${H}"`);
          // data URI 방식 (Blob URL보다 안정적)
          const encoded = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(fixed);
          const img = new Image();
          const dataUrl = await new Promise<string>((res) => {
            const t = setTimeout(() => res(''), 8000);
            img.onload = () => { clearTimeout(t); try { ctx.drawImage(img, 0, 0, W, H); res(c.toDataURL('image/png')); } catch { res(''); } };
            img.onerror = () => { clearTimeout(t); res(''); };
            img.src = encoded;
          });
          if (dataUrl) return `<img src="${dataUrl}" style="width:100%;max-width:340px;border-radius:6px;border:1px solid #e2e8f0;" />`;
          return svgToImgTag(svgStr);
        } catch { return svgToImgTag(svgStr); }
      };
      // 순차 변환 (동시 변환 시 Canvas 충돌 방지)
      const pngImgs: string[] = [];
      for (const gen of [generateSitePlanSvg, generateSectionSvg, generateIsometricSvg, generateElevationSvg, generatePerspectiveSvg]) {
        pngImgs.push(await svgToPngDataUrl(gen(drawingInput)));
      }
      
      const drawingSection = `
    <!-- 6. 설계 도면 -->
    <section class="pdf-section" style="page-break-before: always;">
      <div class="print-title-group">
        <h2 class="section-title">6. 설계 도면</h2>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div>
          <p style="font-weight: 600; font-size: 11px; margin-bottom: 6px; color: #1e293b;">배치도</p>
          ${pngImgs[0]}
        </div>
        <div>
          <p style="font-weight: 600; font-size: 11px; margin-bottom: 6px; color: #1e293b;">단면도</p>
          ${pngImgs[1]}
        </div>
        <div>
          <p style="font-weight: 600; font-size: 11px; margin-bottom: 6px; color: #1e293b;">아이소메트릭</p>
          ${pngImgs[2]}
        </div>
        <div>
          <p style="font-weight: 600; font-size: 11px; margin-bottom: 6px; color: #1e293b;">입면도</p>
          ${pngImgs[3]}
        </div>
      </div>
      <div style="margin-top: 12px;">
        <p style="font-weight: 600; font-size: 11px; margin-bottom: 6px; color: #1e293b;">투시도</p>
        ${pngImgs[4]}
      </div>
      <p style="font-size: 9px; color: #94a3b8; margin-top: 8px; text-align: center;">※ 도면은 사전검토 단계의 개략적 배치이며, 실시설계 시 변경될 수 있습니다.</p>
    </section>

    <!-- 7. 사업성 검토 -->`;
      htmlContent = htmlContent.replace('<!-- 7. 사업성 검토 -->', drawingSection + '\n    <!-- 7. 사업성 검토 -->');
      // 섹션 번호 +1
    } catch (e) { console.warn('[report-export] 도면 삽입 실패:', e); }
    
    // 동적으로 jsPDF와 html2canvas 로드
    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
      import('jspdf'),
      import('html2canvas')
    ]);
    
    // 숨겨진 iframe에서 HTML 렌더링
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.width = '794px'; // A4 너비 (72dpi 기준)
    iframe.style.height = 'auto';
    document.body.appendChild(iframe);
    
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      document.body.removeChild(iframe);
      return { success: false, error: 'PDF 생성용 문서를 만들 수 없습니다.' };
    }
    
    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();
    
    // PDF 전용 스타일 주입 (html2canvas 렌더링 최적화)
    const pdfStyle = iframeDoc.createElement('style');
    pdfStyle.textContent = `
      .page { padding: 24px 30px !important; }
      .pdf-section { padding: 6px 0 !important; margin-bottom: 4px !important; }
      .section-title { font-size: 15px !important; margin-bottom: 8px !important; }
      .summary-card { padding: 8px 6px !important; }
      .summary-card .label { font-size: 10px !important; margin-bottom: 3px !important; }
      .summary-card .value { font-size: 13px !important; }
      table { font-size: 12px !important; width: 100% !important; border-collapse: collapse !important; }
      table td, table th { padding: 6px 8px !important; }
      .verdict-box { padding: 14px !important; margin-top: 8px !important; }
      .risk-grid { gap: 8px !important; }
      .risk-category { padding: 10px !important; }
      .key-points { margin-top: 14px !important; }
      .conclusion-box { padding: 14px !important; margin-top: 8px !important; }
      
      /* AI 점수 카드 - html2canvas Grid 렌더링 강화 */
      .ai-score-grid {
        display: grid !important;
        grid-template-columns: repeat(4, 1fr) !important;
        gap: 8px !important;
        width: 100% !important;
        margin: 12px 0 !important;
      }
      .ai-score-card {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        text-align: center !important;
        padding: 14px 8px !important;
        border-radius: 8px !important;
        min-height: 80px !important;
        box-sizing: border-box !important;
      }
      .ai-score-value {
        font-size: 22px !important;
        font-weight: 800 !important;
        display: block !important;
      }
      .ai-score-label {
        font-size: 11px !important;
        display: block !important;
        margin-bottom: 4px !important;
      }
      
      /* Executive Summary 카드 그리드 */
      .exec-summary-grid, .summary-grid, .score-grid {
        display: grid !important;
        gap: 8px !important;
      }
      
      /* 섹션 간 여백 최소화 */
      section { margin-bottom: 8px !important; }
      h2 { margin-top: 12px !important; margin-bottom: 8px !important; }
      
      /* 워터마크 위치 고정 */
      .watermark {
        position: absolute !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) rotate(-30deg) !important;
        opacity: 0.06 !important;
        pointer-events: none !important;
      }
    `;
    iframeDoc.head.appendChild(pdfStyle);
    
    // 렌더링 대기 — 모든 이미지 로딩 완료까지 대기
    const allImgs = Array.from(iframeDoc.querySelectorAll('img'))
    if (allImgs.length > 0) {
      await Promise.all(allImgs.map(img =>
        img.complete && img.naturalHeight > 0
          ? Promise.resolve()
          : new Promise<void>(resolve => {
              img.onload = () => resolve()
              img.onerror = () => { console.warn('[PDF] 이미지 로드 실패:', img.src?.substring(0, 80)); resolve() }
              setTimeout(resolve, 5000) // 5초 타임아웃
            })
      ))
      console.log(`[PDF] ${allImgs.length}개 이미지 로딩 완료`)
    }
    await new Promise(resolve => setTimeout(resolve, 300)); // 추가 렌더링 안정화
    
    // PDF 생성
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const topMargin = 8; // 상단 여백 (mm)
    const bottomMargin = 8; // 하단 여백 (mm)
    const sideMargin = 8; // 좌우 여백 (mm)
    const contentWidth = pdfWidth - (sideMargin * 2);
    const usableHeight = pdfHeight - topMargin - bottomMargin;
    const blockGap = 2; // 블록 간 간격 (mm)
    
    // 블록 단위로 캡처할 요소들 수집 (하위 블록 포함)
    // 표지는 별도로, 나머지는 하위 블록 단위로 분해
    const cover = iframeDoc.querySelector('.cover') as HTMLElement | null;
    const contentBlocks: HTMLElement[] = [];
    
    // 섹션 내부 블록들을 개별적으로 수집
    const sections = iframeDoc.querySelectorAll('.pdf-section, .section');
    sections.forEach((section) => {
      const title = section.querySelector(':scope > .section-title, :scope > h2, :scope > .print-title-group') as HTMLElement | null;
      
      const innerBlocks = section.querySelectorAll(
        ':scope > .pdf-card-group, ' +
        ':scope > .print-cards-block, :scope > .print-details-block, ' +
        ':scope > .print-cost-block, :scope > .print-roi-block, :scope > .print-scenario-block, ' +
        ':scope > .print-risk-block, :scope > .print-conclusion-group, :scope > .print-block, ' +
        ':scope > .pdf-table-wrap, :scope > .conclusion-box, :scope > .opinion-box, ' +
        ':scope > table'
      );
      
      if (innerBlocks.length > 0) {
        if (title) contentBlocks.push(title);
        innerBlocks.forEach((block) => {
          let isChild = false;
          for (const existing of contentBlocks) {
            if (existing !== block && existing.contains(block)) { isChild = true; break; }
          }
          if (!isChild) contentBlocks.push(block as HTMLElement);
        });
      } else {
        contentBlocks.push(section as HTMLElement);
      }
    });
    
    // 푸터 추가
    const footer = iframeDoc.querySelector('.print-footer, .report-footer') as HTMLElement | null;
    if (footer && !contentBlocks.includes(footer)) {
      contentBlocks.push(footer);
    }
    
    // 표지 처리 (전체 페이지)
    if (cover) {
      const coverCanvas = await html2canvas(cover, {
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: 794,
      });
      const coverImgData = coverCanvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(coverImgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.addPage();
    }
    
    // 직접 addImage 제거하여 중복 방지
    
    // 블록별로 캡처하여 최적 배치
    let currentY = topMargin;
    
    // 블록 캡처 및 배치
    for (let i = 0; i < contentBlocks.length; i++) {
      const block = contentBlocks[i];
      
      // 블록 캡처
      const canvas = await html2canvas(block, {
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: 794,
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * contentWidth) / canvas.width;
      
      // 제목 고아 방지: 제목 블록이면 다음 블록과 함께 고려
      const isTitle = block.classList.contains('section-title') || 
                      block.classList.contains('print-title-group') ||
                      block.tagName === 'H2';
      
      // 현재 페이지 남은 공간
      const availableHeight = usableHeight - (currentY - topMargin);
      
      // 제목 고아 방지: 제목이면 다음 블록 실제 높이 포함해서 판단
      let minHeightNeeded = imgHeight;
      if (isTitle && i + 1 < contentBlocks.length) {
        // 다음 블록을 미리 캡처해서 실제 높이 계산
        try {
          const nextCanvas = await html2canvas(contentBlocks[i + 1], {
            scale: 1, // 빠른 캡처용 저해상도
            useCORS: true,
            logging: false,
            windowWidth: 794,
          });
          const nextImgHeight = (nextCanvas.height * contentWidth) / nextCanvas.width;
          // 제목 + 다음 블록 전체 높이 (다음 블록이 한 페이지보다 크면 usableHeight/2 사용)
          const nextMinHeight = Math.min(nextImgHeight, usableHeight * 0.5);
          minHeightNeeded = imgHeight + nextMinHeight;
        } catch {
          minHeightNeeded = imgHeight + 60; // fallback
        }
      }
      
      // 공간 부족 시 새 페이지
      if (minHeightNeeded > availableHeight && currentY > topMargin + 20) {
        pdf.addPage();
        currentY = topMargin;
      }
      
      // 블록이 한 페이지보다 큰 경우: 스크롤 분할 (이미지 잘라서 배���)
      if (imgHeight > usableHeight) {
        // 큰 블록은 페이지를 넘겨가며 배치
        const scale = canvas.width / contentWidth; // mm당 픽셀
        let srcY = 0;
        let heightRemaining = imgHeight;
        
        while (heightRemaining > 0) {
          const drawHeight = Math.min(heightRemaining, usableHeight - (currentY - topMargin));
          const srcHeight = drawHeight * scale * (canvas.height / imgHeight);
          
          // 캔버스에서 해당 부분만 잘라서 배치
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = canvas.width;
          tempCanvas.height = srcHeight;
          const ctx = tempCanvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(canvas, 0, srcY, canvas.width, srcHeight, 0, 0, canvas.width, srcHeight);
            const partImgData = tempCanvas.toDataURL('image/jpeg', 0.95);
            pdf.addImage(partImgData, 'JPEG', sideMargin, currentY, imgWidth, drawHeight);
          }
          
          srcY += srcHeight;
          heightRemaining -= drawHeight;
          
          if (heightRemaining > 0) {
            pdf.addPage();
            currentY = topMargin;
          } else {
            currentY += drawHeight + blockGap;
          }
        }
      } else {
        // 일반 블록 배치
        pdf.addImage(imgData, 'JPEG', sideMargin, currentY, imgWidth, imgHeight);
        currentY += imgHeight + blockGap;
      }
    }
    
    // 다운로드 (모바일 호환)
    const fileName = generateFileName(data.address, 'pdf', data.layout?.name);
    const pdfBlob = pdf.output('blob');
    mobileDownload(pdfBlob, fileName, 'application/pdf');
    
    // 정리
    document.body.removeChild(iframe);
    
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: `PDF 생성 실패: ${message}` };
  }
}

// ============================================
// 인쇄 전용 (프린트 미리보기 + 인쇄 다이얼로그)
// ============================================

export function openPrintPreview(data: ExportData): { success: boolean; error?: string } {
  try {
    const report = convertToV250(data);
    let htmlContent = generateFullHtmlReport(report, data.address, data.patternQuality);
    
    // AI 렌더링 이미지 삽입 (멀티앵글 우선, 단일 이미지 fallback)
    const _aL: Record<string,string> = {'eye-level':'정면','birds-eye':'조감도','entrance':'입구'}
    const _mI = data.aiMultiImages?.filter(m => m.image) || []
    if (_mI.length > 0) {
      const aiBlock = '<div class="pdf-section" style="margin:0 30px;padding:20px 0"><div style="font-size:13px;font-weight:700;color:#1e293b;margin-bottom:10px">&#10024; AI 건축 렌더링</div>' +
        '<div style="border-radius:8px;overflow:hidden;border:1px solid #e2e8f0"><img src="'+_mI[0].image+'" style="width:100%;display:block"/><div style="padding:4px 10px;background:#f8fafc;font-size:9px;color:#64748b">'+(_aL[_mI[0].angle]||_mI[0].angle)+'</div></div></div>' + _mI.slice(1).map(m => '<div class="pdf-section" style="margin:0 30px;padding:4px 0"><div style="border-radius:8px;overflow:hidden;border:1px solid #e2e8f0"><img src="'+m.image+'" style="width:100%;display:block"/><div style="padding:4px 10px;background:#f8fafc;font-size:9px;color:#64748b">'+(_aL[m.angle]||m.angle)+'</div></div></div>').join('');
      htmlContent = htmlContent.replace('<!-- Executive Summary -->', aiBlock + '<!-- Executive Summary -->');
    } else if (data.aiRenderImage) {
      const aiBlock = '<div class="pdf-section" style="margin:0 30px;padding:20px 0"><div style="border-radius:10px;overflow:hidden;border:1px solid #e2e8f0"><img src="'+data.aiRenderImage+'" style="width:100%;display:block"/><div style="padding:8px 14px;background:#f8fafc"><span style="font-size:10px;font-weight:600;color:#475569">&#10024; AI 건축 렌더링</span></div></div></div>';
      htmlContent = htmlContent.replace('<!-- Executive Summary -->', aiBlock + '<!-- Executive Summary -->');
    }
    
    // 도면 SVG 삽입 (HTML 다운로드와 동일)
    try {
      const drawingInput = {
        siteArea: data.siteArea,
        buildingCoverage: data.layout.buildingCoverage,
        floors: data.layout.floors,
        units: data.layout.units,
        parking: data.layout.parking,
        type: data.layout.type || 'tower',
        roadWidth: data.regulation?.roadWidth || 8,
        heightLimit: data.regulation?.maxHeight || 30,
        setbacks: { front: data.regulation?.hasDistrictPlan ? 2 : 1, side: 0.5, rear: 1 },
        layoutName: data.layout.name,
        gfa: data.layout.gfa,
      };
      const drawingSection = `
    <section class="pdf-section" style="page-break-before: always;">
      <div class="print-title-group">
        <h2 class="section-title">6. 설계 도면</h2>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div><p style="font-weight:600;font-size:11px;margin-bottom:6px;color:#1e293b;">배치도</p>${generateSitePlanSvg(drawingInput)}</div>
        <div><p style="font-weight:600;font-size:11px;margin-bottom:6px;color:#1e293b;">단면도</p>${generateSectionSvg(drawingInput)}</div>
        <div><p style="font-weight:600;font-size:11px;margin-bottom:6px;color:#1e293b;">아이소메트릭</p>${generateIsometricSvg(drawingInput)}</div>
        <div><p style="font-weight:600;font-size:11px;margin-bottom:6px;color:#1e293b;">입면도</p>${generateElevationSvg(drawingInput)}</div>
      </div>
      <div style="margin-top:12px;"><p style="font-weight:600;font-size:11px;margin-bottom:6px;color:#1e293b;">투시도</p>${generatePerspectiveSvg(drawingInput)}</div>
      <p style="font-size:9px;color:#94a3b8;margin-top:8px;text-align:center;">※ 도면은 사전검토 단계의 개략적 배치이며, 실시설계 시 변경될 수 있습니다.</p>
    </section>`;
      htmlContent = htmlContent.replace('<!-- 7. 사업성 검토 -->', drawingSection + '\n    <!-- 7. 사업성 검토 -->');
    } catch (e) { console.warn('[print] 도면 삽입 실패:', e); }
    
    // 인쇄 도구바 삽입
    const toolbar = `<div id="print-toolbar" style="position:fixed;top:0;left:0;right:0;z-index:9999;background:#1e293b;padding:10px 20px;display:flex;align-items:center;gap:12px;box-shadow:0 2px 8px rgba(0,0,0,0.15);">
      <button onclick="window.print()" style="background:#2563eb;color:#fff;border:none;padding:8px 20px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;">🖨️ 인쇄하기</button>
      <button onclick="window.close()" style="background:#475569;color:#fff;border:none;padding:8px 16px;border-radius:6px;font-size:13px;cursor:pointer;">닫기</button>
      <span style="color:#94a3b8;font-size:12px;margin-left:auto;">Archi-Scan 보고서 인쇄 미리보기</span>
    </div>
    <style>@media print { #print-toolbar { display:none !important; } body { padding-top:0 !important; } }</style>
    <style>body { padding-top: 52px; }</style>`;
    htmlContent = htmlContent.replace('<body', toolbar + '<body');
    
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      return { success: true };
    } else {
      return { success: false, error: '팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.' };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

// 공통 HTML 생성 함수 (HTML 다운로드��� 프린트 미리보기 공유)
function generateFullHtmlReport(report: ReportDataV250, address: string, patternQuality?: ExportData["patternQuality"]): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Archi-Scan 개발사업 사전검토 보고서 - ${address}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f1f5f9; color: #1f2937; line-height: 1.6; -webkit-font-smoothing: antialiased;
      width: 100%; min-width: 320px;
    }
    .page { max-width: 900px; margin: 0 auto; padding: 40px; background: #ffffff; }
    
    /* ===== 전역 제목 시스템 - 하단 잘림 완전 방지 ===== */
    h1, h2, h3, h4, h5, h6,
    .section-title, .report-title, .plan-title,
    .metric-title, .metric-value, .big-number,
    .status-title, .card-title, .label, .title {
      display: block !important;
      line-height: 1.5 !important;
      padding-top: 2px !important;
      padding-bottom: 4px !important;
      margin-bottom: 2px !important;
      overflow: visible !important;
      height: auto !important;
      min-height: auto !important;
      max-height: none !important;
    }
    
    /* 큰 숫자/강조 텍스트 - 더 강화 */
    .value, .result, .score-value,
    .ai-score-value, .highlight-value {
      display: block !important;
      line-height: 1.45 !important;
      padding-top: 3px !important;
      padding-bottom: 6px !important;
      margin-bottom: 2px !important;
      overflow: visible !important;
      height: auto !important;
      min-height: auto !important;
      max-height: none !important;
    }
    
    /* 모든 카드/박스 래퍼 - overflow 완전 제거 + 세로 정렬 해제 */
    .summary-card, .metric-card, .verdict-box,
    .conclusion-box, .risk-category, .ai-score-card,
    .score-card, .info-box, .opinion-box, .key-point,
    .print-scenario-block, .ai-analysis-summary,
    .summary-grid > *, .score-grid > *, .ai-score-grid > * {
      overflow: visible !important;
      height: auto !important;
      min-height: auto !important;
      max-height: none !important;
      align-items: flex-start !important;
      justify-content: flex-start !important;
    }
    
    /* ===== 5번/6번 섹션 압축 레이아웃 (screen) ===== */
    .compact-section { padding: 16px 0; }
    .compact-grid-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 12px;
    }
    .compact-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 14px;
      text-align: center;
    }
    .compact-label {
      display: block;
      font-size: 11px;
      color: #64748b;
      margin-bottom: 4px;
    }
    .compact-value {
      display: block;
      font-size: 16px;
      font-weight: 700;
      color: #1e293b;
      line-height: 1.4;
    }
    .compact-stats-row {
      display: flex;
      gap: 20px;
      margin-bottom: 12px;
      font-size: 13px;
      color: #374151;
    }
    .stat-item strong {
      color: #0369a1;
      margin-right: 6px;
    }
    .compact-tags { margin-top: 8px; }
    .compact-tag {
      display: inline-block;
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 12px;
      color: #0369a1;
      margin: 2px;
    }
    .feasibility-compact-layout {
      display: grid;
      grid-template-columns: 1.3fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }
    .compact-table {
      width: 100%;
      border-collapse: collapse;
    }
    .compact-table td, .compact-table th {
      padding: 8px 12px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 13px;
    }
    .compact-table th {
      background: #f8fafc;
      font-weight: 600;
      text-align: left;
    }
    .compact-table .total-row { background: #f1f5f9; }
    .compact-table .roi-row { background: #ecfdf5; }
    .compact-table .roi-row td { font-size: 16px; font-weight: 700; }
    .roi-summary-compact {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .mini-stat {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      text-align: center;
    }
    .mini-label {
      display: block;
      font-size: 10px;
      color: #64748b;
      margin-bottom: 2px;
    }
    .mini-value {
      display: block;
      font-size: 14px;
      font-weight: 700;
      color: #1e293b;
    }
    .scenario-compact { margin-top: 12px; }
    

    /* ===== 화면(모바일) 반응형 ===== */
    @media screen {
      .cover { 
        height: auto !important; max-height: none !important;
        min-height: 100vh; min-height: 100dvh;
        padding: 40px 24px !important;
      }
      .page { 
        max-width: 100% !important; 
        padding: 24px 16px !important; 
      }
    }
    /* === 모바일 화면 최적화 === */
    @media screen and (max-width: 767px) {
      .cover h1 { font-size: 24px !important; word-break: keep-all !important; line-height: 1.35 !important; }
      .cover .address { font-size: 15px !important; }
      .section-title { font-size: 17px !important; margin-bottom: 10px !important; }
      .summary-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 6px !important; }
      .summary-card { padding: 8px 6px !important; }
      .ai-score-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 6px !important; }
      .score-grid { grid-template-columns: repeat(2, 1fr) !important; }
      .risk-grid { grid-template-columns: 1fr !important; }
      table { font-size: 11px !important; }
      table td, table th { padding: 5px 6px !important; }
    }
    @media screen and (min-width: 768px) {
      .page { 
        max-width: 900px !important; 
        padding: 40px !important; 
      }
      .cover {
        padding: 60px 50px !important;
      }
    }

    /* 표지 - 블루 테마 (A4 1페이지 고정) */
    .cover { 
      height: 297mm; max-height: 297mm; width: 100%;
      display: flex; flex-direction: column; justify-content: center; 
      text-align: center; padding: 60px 50px;
      background: linear-gradient(160deg, #0f172a 0%, #1e3a5f 35%, #0c4a6e 65%, #134e4a 100%);
      color: #fff; page-break-after: always; break-after: page;
      overflow: visible; position: relative;
    }
    .cover::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      background: radial-gradient(circle at 30% 20%, rgba(94,234,212,0.08) 0%, transparent 50%),
                  radial-gradient(circle at 70% 80%, rgba(56,189,248,0.06) 0%, transparent 50%);
      pointer-events: none;
    }
    .cover .doc-number { font-size: 11px; color: rgba(255,255,255,0.4); margin-bottom: 48px; letter-spacing: 1px; }
    .cover .english-title { font-size: 12px; color: #5eead4; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 12px; display: block; }
    .cover h1 { font-size: clamp(26px, 6vw, 38px); color: #fff; margin-bottom: 20px; font-weight: 800; line-height: 1.3; display: block; word-break: keep-all; }
    .cover .cover-divider { width: 60px; height: 2px; background: linear-gradient(90deg, transparent, #5eead4, transparent); margin: 0 auto 24px; }
    .cover .address { font-size: 18px; color: rgba(255,255,255,0.9); margin-bottom: 6px; font-weight: 500; display: block; }
    .cover .project-type { font-size: 14px; color: rgba(255,255,255,0.5); margin-bottom: 56px; }
    .cover .meta-info { font-size: 13px; color: rgba(255,255,255,0.55); line-height: 1.8; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px; }
    .cover .meta-info p { margin: 2px 0; }
    .cover .company { margin-top: 48px; font-size: 15px; color: #5eead4; font-weight: 700; letter-spacing: 1px; display: block; }
    
    /* 섹션 - 화이트 테마 */
    .section { padding: 16px 0; border-bottom: 1px solid #e5e7eb; background: #ffffff; overflow: visible; }
    
    /* 섹션 제목 - 하단 잘림 완전 방지 */
    .section-title { 
      font-size: 20px; color: #0369a1; 
      margin-top: 4px; margin-bottom: 14px;
      padding-top: 2px; padding-bottom: 4px; padding-left: 12px;
      font-weight: 700; line-height: 1.4; 
      overflow: visible; display: block;
      border-left: 4px solid #0369a1;
      height: auto; min-height: auto;
    }
    .section-title::before { 
      display: none !important; content: none !important;
      width: 0 !important; height: 0 !important;
    }
    .section-subtitle { 
      font-size: 15px; color: #6b7280; margin-bottom: 12px; 
      line-height: 1.5; padding-bottom: 4px; 
      overflow: visible; display: block;
    }
    
    /* 섹션 헤더 래퍼 */
    .section-header, .report-section-header {
      display: block; overflow: visible;
    }
    .section-header + *, .report-section-header + * {
      margin-top: 12px;
    }
    
    /* 종합 결과 카드 - 상단 정렬, 패딩 확대 */
    .summary-grid { 
      display: grid; grid-template-columns: repeat(4, 1fr); 
      gap: 8px; margin-bottom: 12px; overflow: visible;
    }
    .summary-card { 
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; 
      padding: 10px 8px; overflow: visible;
    }
    .summary-card .label { 
      font-size: 11px; color: #64748b; margin-bottom: 6px; 
      line-height: 1.5; padding-bottom: 3px; display: block;
    }
    .summary-card .value { 
      font-size: 14px; font-weight: 700; color: #1e293b; 
      line-height: 1.3; padding-bottom: 3px; display: block;
    }
    .summary-card .value.highlight { color: #0d9488; }
    
    /* 판단 박스 - 민트/그린, 상단 정렬, 패딩 확대 */
    .verdict-box { 
      background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); 
      border-radius: 8px; padding: 20px 18px; text-align: center; margin-top: 12px;
      border: 1px solid #6ee7b7; overflow: visible;
    }
    .verdict-box .label { 
      font-size: 12px; color: #047857; margin-bottom: 8px; 
      line-height: 1.5; padding-bottom: 3px; display: block;
    }
    .verdict-box .result { 
      font-size: 20px; font-weight: 700; color: #065f46; 
      line-height: 1.45; padding-bottom: 6px; display: block;
    }
    
    /* 테이블 */
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f1f5f9; color: #475569; font-weight: 600; font-size: 12px; }
    td { color: #374151; font-size: 13px; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .highlight { color: #0d9488; font-weight: 600; }
    
    /* 시나리오 분석 블록 - 밝은 카드형 */
    .print-scenario-block {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      margin-top: 16px;
      overflow: visible;
    }
    .print-scenario-block .section-subtitle {
      color: #475569;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 12px;
      line-height: 1.35;
      padding-bottom: 0.12em;
    }
    .print-scenario-block table {
      background: #ffffff;
      border: 1px solid #e2e8f0;
    }
    .print-scenario-block th {
      background: #f1f5f9;
      color: #475569;
    }
    .print-scenario-block td {
      background: #ffffff;
    }
    
    /* 리스크 그리드 */
    .risk-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; overflow: visible; }
    .risk-category { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; overflow: visible; }
    .risk-category h4 { 
      font-size: 13px; color: #b45309; margin-bottom: 10px; font-weight: 600; 
      line-height: 1.35; padding-bottom: 0.15em; display: block;
    }
    .risk-list { list-style: none; }
    .risk-list li { 
      padding: 5px 0 5px 16px; position: relative; font-size: 13px; color: #78350f; line-height: 1.5;
    }
    .risk-list li::before { 
      content: '•'; position: absolute; left: 0; color: #d97706; 
    }
    
    /* 결론 박스 - 연한 민트 */
    .conclusion-box { 
      background: #ecfdf5; border-left: 4px solid #10b981; 
      padding: 20px; margin-top: 14px; border-radius: 0 12px 12px 0;
      overflow: visible;
    }
    .conclusion-box p { color: #065f46; line-height: 1.6; }
    .conclusion-box h3, .conclusion-box h4 { 
      line-height: 1.35; padding-bottom: 0.15em; margin-bottom: 10px; display: block;
    }
    
    /* 면책문구 */
    .disclaimer { 
      text-align: center; padding: 20px 16px; color: #9ca3af; 
      font-size: 11px; border-top: 1px solid #e5e7eb; margin-top: 16px;
      background: #f9fafb; overflow: visible;
    }
    .disclaimer p { margin: 4px 0; line-height: 1.5; }
    
    /* 키포인트 */
    .key-points { margin-top: 24px; overflow: visible; }
    .key-point { 
      display: block; 
      padding: 14px 0 14px 40px; border-bottom: 1px solid #e5e7eb;
      position: relative; overflow: visible; color: #374151;
    }
    .key-point::before { 
      content: '✓'; position: absolute; left: 0; top: 14px;
      width: 26px; height: 26px; background: #d1fae5; border-radius: 50%; 
      text-align: center; line-height: 26px;
      color: #059669; font-size: 14px;
    }
    
    /* AI 분석 점수 - 4열 카드 박스, 상단 정렬 */
    .ai-score-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin: 16px 0;
      overflow: visible;
    }
    .ai-score-card {
      display: block;
      text-align: center;
      background: #eef7fb;
      border: 1px solid #d9e6ee;
      border-radius: 8px;
      padding: 16px 12px;
      overflow: visible;
    }
    .ai-score-card.highlight-card {
      background: #e0f2fe;
      border-color: #7dd3fc;
    }
    .ai-score-label {
      display: block;
      font-size: 11px;
      color: #5f7285;
      margin-bottom: 6px;
      line-height: 1.4;
      padding-bottom: 0.1em;
    }
    .ai-score-value {
      display: block;
      font-size: 22px;
      font-weight: 700;
      color: #1b5e75;
      line-height: 1.3;
      padding-bottom: 0.15em;
    }
    
    /* AI 분석 요약/추천/유의 */
    .ai-analysis-summary {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 8px;
      padding: 16px;
      margin: 12px 0;
      overflow: visible;
    }
    .ai-analysis-summary .summary-title {
      display: block;
      line-height: 1.35;
      padding-bottom: 0.12em;
    }
    .ai-analysis-summary .summary-text {
      color: #065f46;
      margin-top: 8px;
      line-height: 1.6;
    }
    .ai-analysis-reason,
    .ai-analysis-warning {
      margin-top: 12px;
      overflow: visible;
    }
    .ai-analysis-warning .warning-text {
      color: #b45309;
      line-height: 1.6;
    }
    
    /* AI 분석 점수 (구 클래스 - 호환성) */
    .ai-scores { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 24px 0; overflow: visible; }
    .ai-score { display: block; text-align: center; padding: 18px 16px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; overflow: visible; }
    .ai-score .label { display: block; font-size: 12px; color: #0369a1; line-height: 1.4; padding-bottom: 0.1em; margin-bottom: 6px; }
    .ai-score .value { display: block; font-size: 28px; font-weight: 700; color: #0c4a6e; line-height: 1.3; padding-bottom: 0.15em; }
    
    /* 정보 박스 */
    .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin-top: 16px; overflow: visible; }
    .info-box .info-label { display: block; font-size: 12px; color: #64748b; margin-bottom: 8px; line-height: 1.4; padding-bottom: 0.1em; }
    
    /* 인쇄/PDF 스타일 - A4 폭 기준 정상 렌더링 */
    @media print {
      /* ===== 기본 페이지 설정 - 축소 금지 ===== */
      @page { 
        size: A4; 
        margin: 15mm; 
      }
      
      html, body { 
        background: #fff !important; 
        -webkit-print-color-adjust: exact; 
        print-color-adjust: exact;
        font-size: 12pt !important;
        width: 100% !important;
        max-width: 100% !important;
        transform: none !important;
        zoom: 1 !important;
      }
      
      /* 메인 컨테이너 - A4 폭 100% 사용 */
      .page { 
        width: 100% !important;
        max-width: 100% !important; 
        padding: 0 !important; 
        margin: 0 !important;
        display: block !important;
        transform: none !important;
        zoom: 1 !important;
      }

      /* ===== 표지 - A4 한 페이지 ===== */
      .cover, .pdf-cover { 
        height: 267mm !important;
        max-height: 267mm !important;
        overflow: visible !important; 
        break-after: page !important; 
        page-break-after: always !important; 
        display: flex !important;
        flex-direction: column !important;
        justify-content: center !important;
      }

      /* ===== 섹션 기본 - 분할 허용, 여백 축소 ===== */
      .section, .pdf-section {
        display: block !important;
        width: 100% !important;
        padding: 4px 0 !important;
        margin-bottom: 2px !important;
        break-inside: auto !important;
        page-break-inside: auto !important;
      }
      
      /* ===== 섹션 5,6,7,8,9 압축 레이아웃 ===== */
      .pdf-section, .pdf-section, .pdf-section,
      .pdf-section, .pdf-section {
        padding: 2px 0 !important;
      }
      
      /* ===== 5번/6번 섹션 초압축 ===== */
      .compact-section { padding: 4px 0 !important; }
      .compact-section .section-title { margin-bottom: 6px !important; font-size: 12pt !important; }
      .compact-grid-4 { display: grid !important; grid-template-columns: repeat(4, 1fr) !important; gap: 4px !important; margin-bottom: 4px !important; }
      .compact-card { background: #f8fafc !important; border: 1px solid #e2e8f0 !important; border-radius: 4px !important; padding: 4px 6px !important; text-align: center !important; }
      .compact-label { display: block !important; font-size: 8pt !important; color: #64748b !important; margin-bottom: 1px !important; }
      .compact-value { display: block !important; font-size: 10pt !important; font-weight: 700 !important; color: #1e293b !important; line-height: 1.3 !important; }
      .compact-stats-row { display: flex !important; gap: 12px !important; margin-bottom: 4px !important; font-size: 9pt !important; color: #374151 !important; }
      .stat-item { display: inline-block !important; }
      .stat-item strong { color: #0369a1 !important; margin-right: 4px !important; }
      .compact-tags { margin-top: 2px !important; }
      .compact-tag { display: inline-block !important; background: #f0f9ff !important; border: 1px solid #bae6fd !important; padding: 2px 8px !important; border-radius: 10px !important; font-size: 8pt !important; color: #0369a1 !important; margin: 1px !important; }
      .feasibility-compact-layout { display: grid !important; grid-template-columns: 1.2fr 1fr !important; gap: 8px !important; margin-bottom: 6px !important; }
      .cost-table-compact { width: 100% !important; }
      .compact-table { width: 100% !important; font-size: 9pt !important; margin: 0 !important; }
      .compact-table td, .compact-table th { padding: 3px 6px !important; font-size: 9pt !important; }
      .compact-table .total-row { background: #f1f5f9 !important; }
      .compact-table .roi-row { background: #ecfdf5 !important; }
      .compact-table .roi-row td { font-size: 11pt !important; }
      .roi-summary-compact { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 3px !important; }
      .mini-stat { background: #f8fafc !important; border: 1px solid #e2e8f0 !important; border-radius: 4px !important; padding: 4px 6px !important; text-align: center !important; }
      .mini-label { display: block !important; font-size: 7pt !important; color: #64748b !important; }
      .mini-value { display: block !important; font-size: 9pt !important; font-weight: 700 !important; color: #1e293b !important; }
      .scenario-compact { margin-top: 4px !important; }
      .scenario-compact table { margin: 0 !important; }
      
      /* ===== 섹션 제목 스타일 (print) ===== */
      .section-title,
      .report-section-title,
      .section-header h2,
      .section-header h3 {
        line-height: 1.35 !important;
        padding-top: 4px !important;
        padding-bottom: 4px !important;
        margin-bottom: 6px !important;
        overflow: visible !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      
      /* ===== 제목 + 첫 요소 묶음 (제목만 고아 방지) ===== */
      .section-title,
      .print-title-group {
        break-after: avoid !important;
        page-break-after: avoid !important;
      }
      /* 제목 바로 다음 요소도 새 페이지 시작 금지 */
      .section-title + *,
      .print-title-group + * {
        break-before: avoid !important;
        page-break-before: avoid !important;
      }
      
      /* ===== 섹션 헤더 래퍼 ===== */
      .section-header,
      .report-section-header {
        display: flex !important;
        align-items: center !important;
        overflow: visible !important;
      }
      
      /* ===== 큰 블록만 보호 (작은 카드 제외) ===== */
      .verdict-box,
      .conclusion-box,
      .opinion-box,
      .ai-analysis-summary,
      .section-subtitle + div,
      .section-subtitle + table {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      
      /* 표 행 분리 방지 */
      tr {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      
      /* 섹션 제목과 첫 내용 함께 유지 */
      .section-title {
        break-after: avoid !important;
        page-break-after: avoid !important;
      }
      
      /* 모바일 PDF AI 카드 2x2 폴백 */
      @media print and (max-width: 600px) {
        .ai-score-grid {
          grid-template-columns: repeat(2, 1fr) !important;
        }
      }
      
      /* 과도한 여백 축소 */
      .pdf-section {
        padding: 8px 0 !important;
        margin-bottom: 4px !important;
      }
      
      /* 마지막 페이지 빈 여백 최소화 */
      .conclusion-box, .risk-category {
        margin-bottom: 8px !important;
        padding: 10px !important;
      }
      /* 리스크 그리드: 분할 허용 (큰 경우 빈 공간 유발) */
      .risk-grid {
        break-inside: auto !important;
        page-break-inside: auto !important;
      }
      /* table은 기본 분할 허용, 단 작은 테이블은 보호 */
      table {
        break-inside: auto !important;
        page-break-inside: auto !important;
      }
      tr {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      
      /* ===== 작은 카드는 분할 허용 + 초압축 (모바일) ===== */
      .summary-card,
      .metric-card,
      .ai-score-card {
        break-inside: auto !important;
        page-break-inside: auto !important;
        padding: 4px 8px !important;
        margin: 1px 1% !important;
        min-height: auto !important;
        height: auto !important;
      }

      /* ===== 공통 블록 - 간격 최소화 ===== */
      .print-block {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      .print-cards-block,
      .print-details-block,
      .print-cost-block,
      .print-roi-block,
      .print-scenario-block,
      .print-risk-block {
        display: block !important;
        width: 100% !important;
        margin-bottom: 1px !important;
        padding: 0 !important;
      }

      /* ===== AI 분석 - 요약 박스만 보호 ===== */
      .ai-analysis-summary {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
        padding: 10px !important;
        margin: 4px 0 !important;
      }
      
      /* 섹션 레이아웃 */
      .ai-analysis-section {
        display: block !important;
        width: 100% !important;
        padding: 8px 0 !important;
      }
      
      .ai-analysis-inner {
        display: block !important;
        width: 100% !important;
        overflow: visible !important;
        height: auto !important;
        max-height: none !important;
      }
      
      /* AI 점수 그리드 - CSS Grid 4열 압축 */
      .ai-score-grid {
        display: grid !important;
        grid-template-columns: repeat(4, 1fr) !important;
        gap: 6px !important;
        width: 100% !important;
        margin: 8px 0 !important;
        overflow: visible !important;
      }
      .ai-score-card {
        display: block !important;
        text-align: center !important;
        background: #eef7fb !important;
        border: 1px solid #d9e6ee !important;
        border-radius: 8px !important;
        padding: 10px 8px !important;
        box-sizing: border-box !important;
        overflow: visible !important;
      }
      .ai-score-card.highlight-card {
        background: #e0f2fe !important;
        border-color: #7dd3fc !important;
      }
      .ai-score-label {
        display: block !important;
        font-size: 10pt !important;
        color: #5f7285 !important;
        margin-bottom: 8px !important;
        line-height: 1.4 !important;
        padding-bottom: 0.1em !important;
      }
      .ai-score-value {
        display: block !important;
        font-size: 24pt !important;
        font-weight: 700 !important;
        color: #1b5e75 !important;
        line-height: 1.3 !important;
        padding-bottom: 0.15em !important;
      }
      
      /* AI 분석 요약 박스 - 텍스트 잘림 방지 + 페이지 분할 방지 */
      .ai-analysis-summary {
        background: #ecfdf5 !important;
        border: 1px solid #a7f3d0 !important;
        border-radius: 8px !important;
        padding: 16px !important;
        margin: 16px 0 !important;
        overflow: visible !important;
        height: auto !important;
        min-height: auto !important;
        max-height: none !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      .ai-analysis-summary .summary-text {
        color: #065f46 !important;
        margin-top: 8px !important;
        overflow: visible !important;
        white-space: normal !important;
        line-height: 1.6 !important;
        max-height: none !important;
        -webkit-line-clamp: unset !important;
        display: block !important;
      }
      
      /* 추천 이유 / 유의 사항 - 텍스트 잘림 방지 + 페이지 분할 방지 */
      .ai-analysis-reason,
      .ai-analysis-warning {
        margin-top: 16px !important;
        overflow: visible !important;
        height: auto !important;
        max-height: none !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      .ai-analysis-reason p,
      .ai-analysis-warning p {
        overflow: visible !important;
        white-space: normal !important;
        line-height: 1.6 !important;
        max-height: none !important;
        -webkit-line-clamp: unset !important;
        display: block !important;
      }
      .ai-analysis-warning .warning-text {
        color: #b45309 !important;
        overflow: visible !important;
        white-space: normal !important;
        max-height: none !important;
      }

      /* ===== Section 8+9+Footer 마지막 페이지 ===== */
      .print-final-page-group {
        display: block !important;
      }
      .print-risk-card {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      .print-conclusion-group {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
        display: block !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      .print-footer {
        margin-top: 8px !important;
        padding: 10px !important;
        break-inside: avoid !important;
      }

      /* ===== 제목 ===== */
      .section-title, .pdf-title, h2, h3, h4 {
        break-after: avoid !important;
        page-break-after: avoid !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
        font-size: 16pt !important;
      }

      /* ===== 테이블 - 압축 ===== */
      table { 
        width: 100% !important;
        border-collapse: collapse !important;
        table-layout: fixed !important;
        font-size: 10pt !important;
        margin: 4px 0 !important;
      }
      thead { display: table-header-group !important; }
      tfoot { display: table-footer-group !important; }
      tr {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      th, td {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
        padding: 5px 8px !important;
        white-space: normal !important;
        word-wrap: break-word !important;
        font-size: 10pt !important;
      }

      /* ===== 카드 그리드 - 2열 압축 ===== */
      .summary-grid, .metric-grid, .score-grid {
        display: block !important;
        width: 100% !important;
        margin: 2px 0 !important;
      }
      .summary-card {
        display: inline-block !important;
        width: 48% !important;
        margin: 2px 1% !important;
        padding: 6px 10px !important;
        vertical-align: top !important;
        box-sizing: border-box !important;
        font-size: 10pt !important;
      }
      .summary-card .label {
        font-size: 8pt !important;
        margin-bottom: 1px !important;
        line-height: 1.45 !important;
      }
      .summary-card .value {
        font-size: 10pt !important;
        padding-bottom: 1px !important;
        line-height: 1.3 !important;
      }

      /* ===== AI 점수 - 4열 초압축 ===== */
      .ai-scores .summary-card {
        width: 23% !important;
        text-align: center !important;
        padding: 3px 4px !important;
      }

      /* ===== 리스크 그리드 - 2열 초압축 (모바일) ===== */
      .risk-grid {
        display: block !important;
        width: 100% !important;
        margin: 2px 0 !important;
      }
      .risk-category {
        display: inline-block !important;
        width: 48% !important;
        margin: 1px 1% !important;
        padding: 6px 8px !important;
        vertical-align: top !important;
        box-sizing: border-box !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
        font-size: 8pt !important;
      }
      .risk-category h4 {
        font-size: 9pt !important;
        margin-bottom: 3px !important;
      }
      .risk-list li {
        font-size: 8pt !important;
        line-height: 1.3 !important;
      }

      /* ===== 결론/면책 - 빈 공간 완전 제거 (모바일) ===== */
      .pdf-section, .pdf-section, .pdf-section, .pdf-section, .pdf-section {
        display: block !important;
        min-height: auto !important;
        height: auto !important;
        padding: 1px 0 !important;
        margin-bottom: 0 !important;
      }
      .verdict-box {
        padding: 8px 10px !important;
        margin: 4px 0 2px 0 !important;
      }
      .conclusion-box, .ai-summary-box {
        padding: 8px 10px !important;
        margin: 4px 0 !important;
      }
      thead { display: table-header-group !important; }
      tfoot { display: table-footer-group !important; }
      tr {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      th, td {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
        padding: 5px 8px !important;
        white-space: normal !important;
        word-wrap: break-word !important;
        font-size: 9pt !important;
      }

      /* ===== 카드 그리드 - 2열 초압축 (모바일) ===== */
      .summary-grid, .metric-grid, .score-grid {
        display: block !important;
        width: 100% !important;
        margin: 1px 0 !important;
      }
      .summary-card {
        display: inline-block !important;
        width: 48% !important;
        margin: 1px 1% !important;
        padding: 10px 14px !important;
        vertical-align: top !important;
        box-sizing: border-box !important;
        font-size: 11pt !important;
      }
      .summary-card .label {
        font-size: 10pt !important;
      }
      .summary-card .value {
        font-size: 14pt !important;
      }

      /* ===== AI 점수 - 4열 ===== */
      .ai-scores .summary-card {
        width: 23% !important;
        text-align: center !important;
      }

      /* ===== PDF 노트/면책 압축 ===== */
      .pdf-note {
        font-size: 8pt !important;
        margin: 4px 0 !important;
        color: #6b7280 !important;
        line-height: 1.5 !important;
        padding-bottom: 2px !important;
      }
      .disclaimer {
        min-height: auto !important;
        height: auto !important;
        margin-top: 2px !important;
        padding: 8px !important;
        flex: none !important;
        flex-grow: 0 !important;
        break-inside: avoid !important;
        font-size: 8pt !important;
        line-height: 1.5 !important;
      }

      /* ===== 화면 전용 요소 숨기기 (플로팅 버튼, 인디케이터 등) ===== */
      .screen-only,
      .floating-button,
      .page-indicator,
      .nav-buttons,
      .export-overlay,
      [data-floating],
      .fixed,
      button:not(.print-button) {
        display: none !important;
        visibility: hidden !important;
      }
      
      /* ===== 모바일 PDF 전용 폰트/줄간격 축소 ===== */
      body {
        font-size: 9pt !important;
        line-height: 1.35 !important;
      }
      p, li, td, th {
        font-size: 9pt !important;
        line-height: 1.35 !important;
      }
    }
  </style>
</head>
<body>
  <!-- 1. 표지 -->
  <div class="cover">
      <p class="doc-number">${report.cover.documentNumber}</p>
      <p class="english-title">${report.cover.englishSubtitle}</p>
      <h1>${report.cover.koreanTitle}</h1>
      <div class="cover-divider"></div>
      <p class="address">${report.cover.address}</p>
      <p class="project-type">${report.cover.projectType}</p>
      <div class="meta-info">
        <p>대지면적: ${report.cover.siteAreaFormatted}</p>
        <p>검토 배치안: ${report.cover.selectedLayoutName}</p>
        <p>작성일자: ${report.cover.createdDate}</p>
      </div>
      <p class="company">${report.cover.companyName}</p>
      ${report.cover.website ? `<p style="font-size: 11px; color: #3b82f6; margin-top: 6px;"><a href="${report.cover.website}" style="color: #3b82f6; text-decoration: none;">${report.cover.website}</a></p>` : ''}
      <p style="font-size: 10px; color: #94a3b8; margin-top: 4px;">${report.cover.contact}</p>
    </div>



  <!-- Executive Summary -->
  <div class="page" style="padding: 40px 30px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <p style="font-size: 10px; color: #64748b; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 4px;">EXECUTIVE SUMMARY</p>
        <h2 style="font-size: 22px; font-weight: 800; color: #1e293b; margin: 0;">핵심 요약</h2>
        <p style="font-size: 11px; color: #94a3b8; margin-top: 4px;">${report.cover.address}</p>
      </div>
      <div style="text-align: center; padding: 20px; background: ${report.summary.roi >= 15 ? 'linear-gradient(135deg, #d1fae5, #a7f3d0)' : report.summary.roi >= 5 ? 'linear-gradient(135deg, #dbeafe, #bfdbfe)' : report.summary.roi >= 0 ? 'linear-gradient(135deg, #fef3c7, #fde68a)' : 'linear-gradient(135deg, #fee2e2, #fecaca)'}; border-radius: 12px; margin-bottom: 16px;">
        <p style="font-size: 11px; color: #64748b; margin: 0 0 4px 0;">투자수익률 (ROI)</p>
        <p style="font-size: 42px; font-weight: 900; color: ${report.summary.roi >= 15 ? '#059669' : report.summary.roi >= 5 ? '#2563eb' : report.summary.roi >= 0 ? '#d97706' : '#dc2626'}; margin: 0; line-height: 1.1;">${report.summary.roiFormatted}</p>
        <p style="font-size: 12px; font-weight: 600; color: #475569; margin: 6px 0 0 0;">${report.summary.verdict}</p>
      </div>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px;">
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center;"><p style="font-size: 10px; color: #64748b; margin: 0 0 4px 0;">배치안</p><p style="font-size: 14px; font-weight: 700; color: #1e293b; margin: 0;">${report.summary.selectedLayoutName}</p></div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center;"><p style="font-size: 10px; color: #64748b; margin: 0 0 4px 0;">총사업비</p><p style="font-size: 14px; font-weight: 700; color: #1e293b; margin: 0;">${report.summary.totalCostFormatted}</p></div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center;"><p style="font-size: 10px; color: #64748b; margin: 0 0 4px 0;">예상수익</p><p style="font-size: 14px; font-weight: 700; color: #0d9488; margin: 0;">${report.summary.expectedProfitFormatted}</p></div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center;"><p style="font-size: 10px; color: #64748b; margin: 0 0 4px 0;">세대수</p><p style="font-size: 14px; font-weight: 700; color: #1e293b; margin: 0;">${report.summary.units}세대</p></div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center;"><p style="font-size: 10px; color: #64748b; margin: 0 0 4px 0;">연면적</p><p style="font-size: 14px; font-weight: 700; color: #1e293b; margin: 0;">${report.planning.gfaFormatted}</p></div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center;"><p style="font-size: 10px; color: #64748b; margin: 0 0 4px 0;">손익분기 분양률</p><p style="font-size: 14px; font-weight: 700; color: #1e293b; margin: 0;">${report.feasibility.breakEvenRateFormatted}</p></div>
      </div>
      <div class="ai-score-grid" style="display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:16px;">
        <div class="ai-score-card" style="background:#f0f9ff; border:1px solid #bae6fd; border-radius:8px; padding:10px; text-align:center;"><span class="ai-score-label" style="font-size:9px; color:#64748b; display:block; margin-bottom:2px;">법규 부합성</span><span class="ai-score-value" style="font-size:20px; font-weight:800; color:#0369a1; display:block;">${report.aiAnalysis.legalCompliance}</span></div>
        <div class="ai-score-card" style="background:#f0f9ff; border:1px solid #bae6fd; border-radius:8px; padding:10px; text-align:center;"><span class="ai-score-label" style="font-size:9px; color:#64748b; display:block; margin-bottom:2px;">사업성</span><span class="ai-score-value" style="font-size:20px; font-weight:800; color:#0369a1; display:block;">${report.aiAnalysis.profitability}</span></div>
        <div class="ai-score-card" style="background:#f0f9ff; border:1px solid #bae6fd; border-radius:8px; padding:10px; text-align:center;"><span class="ai-score-label" style="font-size:9px; color:#64748b; display:block; margin-bottom:2px;">상품성</span><span class="ai-score-value" style="font-size:20px; font-weight:800; color:#0369a1; display:block;">${report.aiAnalysis.marketability}</span></div>
        <div class="ai-score-card highlight-card" style="background:#0d9488; border-radius:8px; padding:10px; text-align:center;"><span class="ai-score-label" style="font-size:9px; color:rgba(255,255,255,0.8); display:block; margin-bottom:2px;">종합 점수</span><span class="ai-score-value" style="font-size:20px; font-weight:800; color:#fff; display:block;">${report.aiAnalysis.totalScore}</span></div>
      </div>
      <div style="background: #f1f5f9; border-radius: 8px; padding: 14px;">
        <p style="font-size: 11px; font-weight: 700; color: #334155; margin: 0 0 8px 0;">핵심 포인트</p>
        ${report.summary.keyPoints.slice(0, 3).map((p: string) => `<p style="font-size: 11px; color: #475569; margin: 0 0 4px 0; padding-left: 12px; position: relative;"><span style="position: absolute; left: 0;">•</span>${p}</p>`).join('')}
      </div>
    </div>


    <!-- 2. 종합 검토 결과 -->
    <div class="section pdf-section">
      <h2 class="section-title">종합 검토 결과</h2>
      <div class="summary-grid pdf-card-group" style="display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:10px;">
        <div class="summary-card">
          <p class="label">선정 배치안</p>
          <p class="value">${report.summary.selectedLayoutName}</p>
        </div>
        <div class="summary-card">
          <p class="label">연면적</p>
          <p class="value">${report.planning.gfaFormatted}</p>
        </div>
        <div class="summary-card">
          <p class="label">세대수</p>
          <p class="value">${report.summary.units}세대</p>
        </div>
        <div class="summary-card">
          <p class="label">ROI</p>
          <p class="value highlight">${report.summary.roiFormatted}</p>
        </div>
      </div>
      <div class="summary-grid pdf-card-group" style="display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:10px;">
        <div class="summary-card">
          <p class="label">건폐율</p>
          <p class="value">${report.summary.buildingCoverageFormatted}</p>
        </div>
        <div class="summary-card">
          <p class="label">용적률</p>
          <p class="value">${report.summary.farFormatted}</p>
        </div>
        <div class="summary-card">
          <p class="label">총사업비</p>
          <p class="value">${report.summary.totalCostFormatted}</p>
        </div>
        <div class="summary-card">
          <p class="label">예상수익</p>
          <p class="value highlight">${report.summary.expectedProfitFormatted}</p>
        </div>
      </div>
      <div class="verdict-box pdf-summary-box">
        <p class="label">종합 판단</p>
        <p class="result">${report.summary.verdict}</p>
      </div>
      <div class="key-points pdf-summary-box">
        <h3 style="font-size: 16px; color: #475569; margin-bottom: 16px; font-weight: 600;">주요 검토 포인트</h3>
        ${report.summary.keyPoints.map(point => `
        <div class="key-point">
          <span class="key-point-icon"></span>
          <span>${point}</span>
        </div>
        `).join('')}
      </div>
    </div>

    <!-- 3. 검토 개요 -->
    <div class="section pdf-section pdf-card-group">
      <h2 class="section-title">1. 검토 개요</h2>
      <p style="margin-bottom: 16px;">${report.overview.purpose}</p>
      <table>
        <tr><td style="width: 120px; color: #64748b;">검토 기준일</td><td>${report.overview.reviewDate}</td></tr>
        <tr><td style="color: #64748b;">검토 범위</td><td>${report.overview.scope.join(', ')}</td></tr>
      </table>
      <div class="info-box">
        <p class="info-label">검토 기준</p>
        <ul style="list-style: none;">
          ${report.overview.standards.map(s => `<li style="padding: 4px 0; font-size: 14px;">• ${s}</li>`).join('')}
        </ul>
      </div>
    </div>

    <!-- 4. 대상지 분석 -->
    <div class="section pdf-section pdf-card-group">
      <div style="padding:0; margin:0;">
        <h2 class="section-title" style="margin-bottom:8px;">2. 대상지 분석</h2>
        <div class="pdf-table-wrap">
        <table>
          <tbody>
            <tr><td style="width: 120px; color: #64748b;">소재지</td><td>${report.siteAnalysis.address}</td></tr>
            <tr><td style="color: #64748b;">대지면적</td><td>${report.siteAnalysis.siteAreaFormatted}</td></tr>
            <tr><td style="color: #64748b;">토지이용계획</td><td>${report.siteAnalysis.landUsePlan}</td></tr>
            <tr><td style="color: #64748b;">접도현황</td><td>${report.siteAnalysis.roadAccess}</td></tr>
            <tr><td style="color: #64748b;">높이제한</td><td>${report.siteAnalysis.heightLimitFormatted}</td></tr>
            <tr><td style="color: #64748b;">지구단위계획</td><td>${report.siteAnalysis.districtPlan}</td></tr>
          </tbody>
        </table>
        </div>
      </div>
    </div>

<!-- 3. 법규 검토 -->
    <section class="pdf-section pdf-section">
      <div class="print-title-group">
        <h2 class="section-title">3. 법규 검토</h2>
      </div>
      <div class="print-block">
        <table>
          <thead>
            <tr>
              <th>검토 항목</th>
              <th class="text-center">법정 한도</th>
              <th class="text-center">적용 계획</th>
              <th class="text-center">적정 여부</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>건폐율</td>
              <td class="text-center">${report.regulationReview.buildingCoverage.limit}</td>
              <td class="text-center">${report.regulationReview.buildingCoverage.planned}</td>
              <td class="text-center ${report.regulationReview.buildingCoverage.status === '적정' ? 'highlight' : ''}">${report.regulationReview.buildingCoverage.status}</td>
            </tr>
            <tr>
              <td>용적률</td>
              <td class="text-center">${report.regulationReview.far.limit}</td>
              <td class="text-center">${report.regulationReview.far.planned}</td>
              <td class="text-center ${report.regulationReview.far.status === '적정' ? 'highlight' : ''}">${report.regulationReview.far.status}</td>
            </tr>
            <tr>
              <td>높이제한</td>
              <td class="text-center">${report.regulationReview.height.limit}</td>
              <td class="text-center">${report.regulationReview.height.planned}</td>
              <td class="text-center ${report.regulationReview.height.status === '적정' ? 'highlight' : ''}">${report.regulationReview.height.status}</td>
            </tr>
            <tr>
              <td>주차대수</td>
              <td class="text-center">${report.regulationReview.parking.limit}</td>
              <td class="text-center">${report.regulationReview.parking.planned}</td>
              <td class="text-center ${report.regulationReview.parking.status === '적정' ? 'highlight' : ''}">${report.regulationReview.parking.status}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- 6. 배치안 비교 검토 -->
    <div class="section pdf-section pdf-card-group">
      <h2 class="section-title">4. 배치안 비교 검토</h2>
      <div class="pdf-table-wrap">
        <table>
          <thead>
            <tr>
              <th>배치안명</th>
              <th class="text-center">건폐율</th>
              <th class="text-center">층수</th>
              <th class="text-center">세대수</th>
              <th class="text-center">주차</th>
              <th class="text-center">ROI</th>
              <th class="text-center">추천</th>
            </tr>
          </thead>
          <tbody>
            ${report.layoutComparison.layouts.map(l => `
            <tr>
              <td>${l.name}</td>
              <td class="text-center">${l.buildingCoverageFormatted}</td>
              <td class="text-center">${l.floorsFormatted}</td>
              <td class="text-center">${l.units}세대</td>
              <td class="text-center">${l.parking}대</td>
              <td class="text-center ${l.isRecommended ? 'highlight' : ''}">${l.roiFormatted}</td>
              <td class="text-center">${l.isRecommended ? '<span class="highlight">추천</span>' : '-'}</td>
            </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div class="conclusion-box pdf-summary-box">
        <p style="font-size: 14px; color: #047857; margin-bottom: 8px; font-weight: 600;">검토의견: ${report.layoutComparison.recommendedLayoutName} 배치안 추천</p>
        <p style="color: #065f46;">${report.layoutComparison.opinion}</p>
      </div>
    </div>

    <!-- 5. 규모 산정 및 계획 구성 -->
    <section class="pdf-section pdf-section">
      <div class="print-title-group">
        <h2 class="section-title">5. 규모 산정 및 계획 구성</h2>
      </div>
      <div class="print-cards-block">
        <div class="summary-grid pdf-card-group" style="display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:10px;">
          <div class="summary-card">
            <p class="label">선정 배치안</p>
            <p class="value">${report.planning.selectedLayoutName}</p>
          </div>
          <div class="summary-card">
            <p class="label">층수</p>
            <p class="value">${report.planning.floorsFormatted}</p>
          </div>
          <div class="summary-card">
            <p class="label">세대수</p>
            <p class="value">${report.planning.units}세대</p>
          </div>
          <div class="summary-card">
            <p class="label">주차대수</p>
            <p class="value">${report.planning.parking}대</p>
          </div>
        </div>
      </div>
      <div class="print-details-block">
        <table>
          <tbody>
            <tr><td style="width: 120px; color: #64748b;">건폐율</td><td>${report.planning.buildingCoverageFormatted}</td></tr>
            <tr><td style="color: #64748b;">용적률</td><td>${report.planning.farFormatted}</td></tr>
            <tr><td style="color: #64748b;">연면적</td><td>${report.planning.gfaFormatted}</td></tr>
          </tbody>
        </table>
        <div style="margin-top: 12px;">
          ${report.planning.characteristics.map(c => `<span style="background:#f0f9ff; border:1px solid #bae6fd; padding:4px 12px; border-radius:16px; font-size:12px; color:#0369a1; display:inline-block; margin:2px;">${c}</span>`).join('')}
        </div>
      </div>
    </section>

    <!-- 7. 사업성 검토 -->
    <section class="pdf-section pdf-section">
      <div class="print-title-group">
        <h2 class="section-title">7. 사업성 검토</h2>
      </div>
      <div class="print-cost-block">
        <table>
          <thead><tr><th>구분</th><th class="text-right">금액</th></tr></thead>
          <tbody>
            <tr><td>토지비</td><td class="text-right">${report.feasibility.landCostFormatted}</td></tr>
            <tr><td>공사비</td><td class="text-right">${report.feasibility.constructionCostFormatted}</td></tr>
            <tr><td>기타비용</td><td class="text-right">${report.feasibility.indirectCostFormatted}</td></tr>
            <tr style="background:#f1f5f9;"><td><strong>총사업비</strong></td><td class="text-right"><strong>${report.feasibility.totalCostFormatted}</strong></td></tr>
            <tr><td colspan="2" style="height:8px;border:none;"></td></tr>
            <tr><td>예상매출</td><td class="text-right highlight">${report.feasibility.totalRevenueFormatted}</td></tr>
            <tr><td>예상수익</td><td class="text-right highlight">${report.feasibility.expectedProfitFormatted}</td></tr>
            <tr style="background:#ecfdf5;"><td><strong>ROI</strong></td><td class="text-right highlight" style="font-size:18px;"><strong>${report.feasibility.roiFormatted}</strong></td></tr>
          </tbody>
        </table>
      </div>
    </section>

    </section>

    <!-- 7. AI 분석 -->
    <section class="pdf-section pdf-section pdf-card-group">
      <h2 class="section-title" style="margin-bottom:12px;">8. AI 분석</h2>
      <div class="ai-score-grid" style="display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin:12px 0;">
        <div class="ai-score-card" style="text-align:center; padding:14px 8px; background:#f0fdfa; border:1px solid #99f6e4; border-radius:8px;">
          <span class="ai-score-label" style="font-size:11px; color:#64748b; display:block; margin-bottom:6px;">법규 부합성</span>
          <span class="ai-score-value" style="font-size:22px; font-weight:700; color:#0f766e; display:block;">${report.aiAnalysis?.legalCompliance ?? (report.planning.coverage <= 60 ? 90 : 75)}</span>
        </div>
        <div class="ai-score-card" style="text-align:center; padding:14px 8px; background:#f0fdfa; border:1px solid #99f6e4; border-radius:8px;">
          <span class="ai-score-label" style="font-size:11px; color:#64748b; display:block; margin-bottom:6px;">사업성</span>
          <span class="ai-score-value" style="font-size:22px; font-weight:700; color:#0f766e; display:block;">${report.aiAnalysis?.profitability ?? (report.feasibility.roi > 20 ? 85 : report.feasibility.roi > 12 ? 70 : 55)}</span>
        </div>
        <div class="ai-score-card" style="text-align:center; padding:14px 8px; background:#f0fdfa; border:1px solid #99f6e4; border-radius:8px;">
          <span class="ai-score-label" style="font-size:11px; color:#64748b; display:block; margin-bottom:6px;">상품성</span>
          <span class="ai-score-value" style="font-size:22px; font-weight:700; color:#0f766e; display:block;">${report.aiAnalysis?.marketability ?? (report.feasibility.roi > 15 ? 78 : 65)}</span>
        </div>
        <div class="ai-score-card highlight-card" style="text-align:center; padding:14px 8px; background:#ecfdf5; border:2px solid #6ee7b7; border-radius:8px;">
          <span class="ai-score-label" style="font-size:11px; color:#064e3b; display:block; margin-bottom:6px; font-weight:600;">종합 점수</span>
          <span class="ai-score-value" style="font-size:26px; font-weight:700; color:#065f46; display:block;">${report.aiAnalysis?.totalScore ?? Math.round((report.feasibility.roi > 20 ? 85 : report.feasibility.roi > 12 ? 70 : 55) * 0.95)}</span>
        </div>
      </div>
    </section>

    
    <!-- 8.5 설계 품질 평가 (Alexander Pattern Language) -->
    ${patternQuality ? `
    <section class="pdf-section pdf-card-group">
      <h2 class="section-title" style="margin-bottom:12px;">설계 품질 평가</h2>
      <p style="font-size:11px; color:#64748b; margin-bottom:12px;">Alexander Pattern Language · The Nature of Order 기반</p>
      
      <div style="display:grid; grid-template-columns:1fr 2fr; gap:12px; margin-bottom:14px;">
        <div style="text-align:center; padding:16px; background:${patternQuality.gradeColor}15; border:2px solid ${patternQuality.gradeColor}; border-radius:12px;">
          <p style="font-size:11px; color:#64748b; margin:0 0 6px 0;">종합 등급</p>
          <p style="font-size:36px; font-weight:800; color:${patternQuality.gradeColor}; margin:0; line-height:1;">${patternQuality.grade}</p>
          <p style="font-size:18px; font-weight:700; color:#1e293b; margin:4px 0 0 0;">${patternQuality.overallQuality}점</p>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
          <div style="padding:12px; background:#f0fdfa; border:1px solid #99f6e4; border-radius:8px; text-align:center;">
            <p style="font-size:10px; color:#64748b; margin:0 0 4px 0;">패턴 점수</p>
            <p style="font-size:22px; font-weight:700; color:#0f766e; margin:0;">${patternQuality.totalPatternScore}</p>
          </div>
          <div style="padding:12px; background:#f0f9ff; border:1px solid #bae6fd; border-radius:8px; text-align:center;">
            <p style="font-size:10px; color:#64748b; margin:0 0 4px 0;">Living Structure</p>
            <p style="font-size:22px; font-weight:700; color:#0369a1; margin:0;">${patternQuality.totalLivingScore}</p>
          </div>
        </div>
      </div>

      <div style="background:#f8fafb; border:1px solid #e2e8f0; border-left:4px solid #14b8a6; border-radius:8px; padding:12px; margin-bottom:14px;">
        <p style="font-size:11px; font-weight:700; color:#0f766e; margin:0 0 6px 0;">설계 철학</p>
        <p style="font-size:11px; color:#334155; line-height:1.6; margin:0;">${patternQuality.philosophy}</p>
      </div>

      <p style="font-size:11px; font-weight:600; color:#334155; margin-bottom:8px;">핵심 패턴 평가</p>
      <table style="width:100%; border-collapse:collapse; font-size:11px;">
        <thead><tr style="background:#f1f5f9;"><th style="padding:6px 8px; text-align:left; color:#64748b;">패턴</th><th style="padding:6px 8px; text-align:left; color:#64748b;">이름</th><th style="padding:6px 8px; text-align:right; color:#64748b;">점수</th></tr></thead>
        <tbody>
          ${patternQuality.topPatterns.map(p => `<tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:5px 8px; color:#14b8a6; font-weight:600;">#${p.id}</td><td style="padding:5px 8px; color:#334155;">${p.nameKr}</td><td style="padding:5px 8px; text-align:right; font-weight:600;">${p.score}</td></tr>`).join('')}
        </tbody>
      </table>
      <p style="font-size:9px; color:#94a3b8; margin-top:8px; text-align:center;">Christopher Alexander, A Pattern Language (1977)</p>
    </section>
    ` : ''}

    <!-- 8. 시나리오 및 사업기간 분석 -->
    <section class="pdf-section pdf-section">
      <div class="print-title-group">
        <h2 class="section-title">9. 시나리오 및 사업기간 분석</h2>
      </div>
      <div class="print-roi-block pdf-card-group">
        <div class="summary-grid pdf-card-group" style="display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:10px;">
          <div class="summary-card">
            <p class="label">손익분기 분양률</p>
            <p class="value">${report.feasibility.breakEvenRateFormatted}</p>
          </div>
          <div class="summary-card">
            <p class="label">예상 사업기간</p>
            <p class="value">${report.feasibility.projectDuration}</p>
          </div>
        </div>
      </div>
      <div class="print-scenario-block">
        <h4 class="section-subtitle">시나리오 분석</h4>
        <table>
          <thead><tr><th>시나리오</th><th class="text-center">분양가 변동</th><th class="text-center">예상 ROI</th></tr></thead>
          <tbody>
            ${report.feasibility.scenarios.map(s => `
            <tr>
              <td>${s.name}</td>
              <td class="text-center">${s.priceChange}</td>
              <td class="text-center ${s.name === '기본' ? 'highlight' : ''}">${s.expectedRoi}</td>
            </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="margin-top: 16px;">
          <h4 class="section-subtitle" style="margin-bottom: 8px;">예상 사업 일정</h4>
          <div style="display: flex; gap: 2px; height: 36px; border-radius: 6px; overflow: visible; font-size: 9px; font-weight: 600; line-height: 1.4;">
            <div style="flex: 2; background: #dbeafe; color: #1e40af; display: flex; align-items: center; justify-content: center;">사업기획<br/>2-3개월</div>
            <div style="flex: 3; background: #bae6fd; color: #0369a1; display: flex; align-items: center; justify-content: center;">인허가<br/>4-6개월</div>
            <div style="flex: 8; background: #99f6e4; color: #0f766e; display: flex; align-items: center; justify-content: center;">시공<br/>18-24개월</div>
            <div style="flex: 3; background: #fde68a; color: #92400e; display: flex; align-items: center; justify-content: center;">분양/입주<br/>3-6개월</div>
          </div>
          <p style="font-size: 9px; color: #94a3b8; margin-top: 4px; text-align: center;">※ 실제 일정은 규모·인허가 조건에 따라 달라질 수 있습니다.</p>
        </div>
      </div>
    </section>

    <!-- 8 + 9 + Footer 그룹 - 마지막 페이지 -->
    <div class="print-final-page-group">
      <!-- 9. 리스크 및 고려사항 -->
      <section class="pdf-section pdf-section">
        <div class="print-title-group">
          <h2 class="section-title">10. 리스크 및 고려사항</h2>
        </div>
        <div class="print-risk-block">
          <div class="risk-grid">
            <div class="risk-category print-risk-card">
              <h4>토지 관련</h4>
              <ul class="risk-list">
                ${report.risks.land.map(r => `<li>${r}</li>`).join('')}
              </ul>
            </div>
            <div class="risk-category print-risk-card">
              <h4>인허가 관련</h4>
              <ul class="risk-list">
                ${report.risks.permit.map(r => `<li>${r}</li>`).join('')}
              </ul>
            </div>
            <div class="risk-category print-risk-card">
              <h4>시장 관련</h4>
              <ul class="risk-list">
                ${report.risks.market.map(r => `<li>${r}</li>`).join('')}
              </ul>
            </div>
            <div class="risk-category print-risk-card">
              <h4>공사 관련</h4>
              <ul class="risk-list">
                ${report.risks.construction.map(r => `<li>${r}</li>`).join('')}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <!-- 10. 결론 및 제안 -->
      <section class="pdf-section pdf-section">
        <div class="print-conclusion-group">
          <h2 class="section-title">11. 결론 및 제안</h2>
          <p style="color: #374151; line-height: 1.8; margin-top: 12px;">${report.conclusion.finalParagraph}</p>
          <div class="verdict-box">
            <p style="font-size: 16px; color: #065f46;">${report.conclusion.summaryBox}</p>
          </div>
          <p class="pdf-note" style="font-size: 11px; line-height: 1.8; padding-bottom: 4px; overflow: visible;">본 보고서는 참고 자료로만 활용하시기 바랍니다.</p>
        </div>
      </section>

      <!-- 면책문구 -->
      <div class="disclaimer print-footer">
        <p>${report.disclaimer.mainText}</p>
        <p>${report.disclaimer.expertAdvice}</p>
        <p>${report.disclaimer.copyright}${report.cover.website ? ` · <a href="${report.cover.website}" style="color: #3b82f6; text-decoration: none;">${report.cover.website}</a>` : ''}</p>
      </div>
    </div>
</body>
</html>`;
}

// ============================================
// 배치안 비교 보고서 다운로드
// ============================================

export function downloadComparisonHtml(
  address: string,
  siteArea: number,
  layouts: Array<{ name: string; type: string; floors: number; units: number; gfa: number; coverage: number; far: number; parking: number; roi: number; totalCost: number; profit: number; scores?: { overall: number } }>
): { success: boolean; error?: string } {
  try {
    const date = new Date().toLocaleDateString('ko-KR');
    const rows = layouts.map(l => `
      <tr>
        <td style="font-weight:600;">${l.name}</td>
        <td>${l.floors}층</td>
        <td>${l.units}세대</td>
        <td>${l.gfa.toLocaleString()}㎡</td>
        <td>${l.coverage.toFixed(1)}%</td>
        <td>${l.far.toFixed(1)}%</td>
        <td>${l.parking}대</td>
        <td>${(l.totalCost / 100000000).toFixed(1)}억</td>
        <td>${(l.profit / 100000000).toFixed(1)}억</td>
        <td style="font-weight:700; color:${l.roi >= 15 ? '#059669' : l.roi >= 5 ? '#2563eb' : l.roi >= 0 ? '#d97706' : '#dc2626'};">${l.roi.toFixed(1)}%</td>
        <td>${l.scores?.overall?.toFixed(0) || '-'}</td>
      </tr>`).join('');

    const best = layouts.reduce((a, b) => a.roi > b.roi ? a : b);

    const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>배치안 비교 — ${address}</title>
    <style>
      body { font-family: 'Noto Sans KR', sans-serif; padding: 40px; color: #1e293b; max-width: 1100px; margin: 0 auto; }
      h1 { font-size: 22px; margin-bottom: 4px; }
      .meta { font-size: 13px; color: #64748b; margin-bottom: 24px; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th { background: #f1f5f9; padding: 10px 8px; text-align: center; border-bottom: 2px solid #cbd5e1; font-weight: 600; }
      td { padding: 10px 8px; text-align: center; border-bottom: 1px solid #e2e8f0; }
      tr:hover { background: #f8fafc; }
      .best { background: #ecfdf5; border-left: 3px solid #059669; padding: 14px; border-radius: 8px; margin-top: 20px; }
      .footer { margin-top: 32px; font-size: 11px; color: #94a3b8; text-align: center; }
    </style></head><body>
    <h1>배치안 비교 분석</h1>
    <p class="meta">${address} · 대지면적 ${siteArea.toLocaleString()}㎡ · ${date}</p>
    <table>
      <thead><tr><th>배치안</th><th>층수</th><th>세대</th><th>연면적</th><th>건폐율</th><th>용적률</th><th>주차</th><th>총사업비</th><th>예상수익</th><th>ROI</th><th>AI점수</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="best">
      <strong>추천 배치안:</strong> ${best.name} (ROI ${best.roi.toFixed(1)}%, 예상수익 ${(best.profit / 100000000).toFixed(1)}억원)
    </div>
    <p class="footer">Archi-Scan · 사전검토용 비교 보고서 · ${date}</p>
    </body></html>`;

    mobileDownload(html, generateFileName(address, 'html', '비교분석'));
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ============================================
// Export: ReportDataV250 빌더 (직접 사용 가능)
// ============================================

export { buildReportDataV250, type ReportDataV250 } from './report-data-v250';
