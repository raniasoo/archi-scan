/**
 * v0 250 기준 Export 유틸리티
 * PDF / HTML / Excel / Print 모두 ReportDataV250을 사용합니다.
 */

import * as XLSX from 'xlsx';
import { type ReportDataV250, buildReportDataV250 } from './report-data-v250';
import { generateSitePlanSvg, generateSectionSvg, generateIsometricSvg, generateElevationSvg, generatePerspectiveSvg } from './report-drawings';
import { calculateFeasibility } from './project-analysis-state';

// ============================================
// 파일명 생성 헬퍼
// ============================================

export function generateFileName(address: string, extension: string): string {
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const safeAddress = address
    .replace(/[^\w\s가-힣]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 30);
  return `Archi-Scan_개발사업사전검토보고서_${safeAddress}_${dateStr}.${extension}`;
}

// ============================================
// Export 입력 데이터 타입 (기존 호환성 유지)
// ============================================

export interface ExportData {
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
      return {
        id: l.name === data.layout.name ? 'selected' : `layout-${i}`,
        name: l.name || `배치안 ${i + 1}`,
        floors: l.floors || 0,
        units: l.units || 0,
        parking: l.parking || 0,
        buildingCoverage: l.buildingCoverage || 0,
        far: 0,
        gfa: l.gfa || 0,
        roi: l.name === data.layout.name ? (data.feasibility?.roi || 0) : layoutFeas.roi,
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

  // 3. 사업성 시트
  const feasibilityData = [
    ['=== 사업성 검토 ==='],
    [''],
    ['구분', '금액', '비고'],
    ['토지비', report.feasibility.landCostFormatted, ''],
    ['공사비', report.feasibility.constructionCostFormatted, ''],
    ['기타���������용', report.feasibility.indirectCostFormatted, '설계비, 인허가, 금융비용 등'],
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
    const fileName = generateFileName(data.address, 'xlsx');
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

      /* ===== 표지 ===== */
      .cover, .pdf-cover { 
        height: 267mm !important;
        max-height: 267mm !important;
        overflow: hidden !important; 
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
      .pdf-section-5, .pdf-section-6, .pdf-section-7,
      .pdf-section-8, .pdf-section-9 {
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
      .ai-analysis-summary {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
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
        line-height: 1.1 !important;
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
      .pdf-section-5, .pdf-section-6, .pdf-section-7, .pdf-section-8, .pdf-section-9 {
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
        font-size: 7pt !important;
        margin: 2px 0 !important;
        color: #6b7280 !important;
      }
      .disclaimer {
        min-height: auto !important;
        height: auto !important;
        margin-top: 2px !important;
        padding: 6px !important;
        flex: none !important;
        flex-grow: 0 !important;
        break-inside: avoid !important;
        font-size: 7pt !important;
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
      background: #ffffff; color: #1f2937; line-height: 1.6;
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
    
    \${printCss}
    
    /* 표지 - 블루 테마 (A4 1페이지 고정) */
    .cover { 
      height: 297mm; /* A4 높이 고정 */
      max-height: 297mm;
      display: flex; flex-direction: column; justify-content: center; 
      text-align: center; padding: 60px 40px;
      background: linear-gradient(135deg, #1e3a5f 0%, #0c4a6e 50%, #164e63 100%);
      color: #ffffff;
      page-break-after: always;
      break-after: page;
      overflow: visible;
    }
    .cover .doc-number { font-size: 12px; color: rgba(255,255,255,0.6); margin-bottom: 40px; line-height: 1.5; padding-bottom: 4px; }
    .cover .english-title { font-size: 14px; color: #5eead4; letter-spacing: 2px; margin-bottom: 16px; line-height: 1.5; padding-bottom: 4px; display: block; }
    .cover h1 { font-size: 36px; color: #ffffff; margin-bottom: 60px; font-weight: 700; line-height: 1.45; padding-bottom: 6px; display: block; }
    .cover .address { font-size: 20px; color: rgba(255,255,255,0.9); margin-bottom: 8px; line-height: 1.45; padding-bottom: 5px; display: block; }
    .cover .project-type { font-size: 16px; color: rgba(255,255,255,0.7); margin-bottom: 60px; line-height: 1.5; padding-bottom: 4px; }
    .cover .meta-info { font-size: 14px; color: rgba(255,255,255,0.7); line-height: 1.6; }
    .cover .meta-info p { margin: 4px 0; padding-bottom: 3px; }
    .cover .company { margin-top: 60px; font-size: 14px; color: #5eead4; font-weight: 600; line-height: 1.5; padding-bottom: 4px; display: block; }
    
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
      line-height: 1.2;
      padding-bottom: 2px;
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
      line-height: 1.2;
      padding-bottom: 2px;
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
    .disclaimer p { margin: 4px 0; line-height: 1.6; }
    
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
  <div class="page">
    <!-- 1. 표지 -->
    <div class="cover">
      <p class="doc-number">${report.cover.documentNumber}</p>
      <p class="english-title">${report.cover.englishSubtitle}</p>
      <h1>${report.cover.koreanTitle}</h1>
      <p class="address">${report.cover.address}</p>
      <p class="project-type">${report.cover.projectType}</p>
      <div class="meta-info">
        <p>대지면적: ${report.cover.siteAreaFormatted}</p>
        <p>검토 배치안: ${report.cover.selectedLayoutName}</p>
        <p>작성일자: ${report.cover.createdDate}</p>
      </div>
      <p class="company">${report.cover.companyName}</p>
      <p style="font-size: 10px; color: #94a3b8; margin-top: 4px;">${report.cover.contact}</p>
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
    <section class="pdf-section pdf-section-3">
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
    <section class="pdf-section pdf-section-5">
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

    <!-- 6. 사업성 검토 -->
    <section class="pdf-section pdf-section-6">
      <div class="print-title-group">
        <h2 class="section-title">6. 사업성 검토</h2>
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
    <section class="pdf-section pdf-section-7 pdf-card-group">

      <h2 class="section-title" style="margin-bottom:12px;">7. AI 분석</h2>

      <div class="pdf-card-group" style="display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin:12px 0;">
        <div style="text-align:center; padding:14px 8px; background:#f0fdfa; border:1px solid #99f6e4; border-radius:8px;">
          <p style="font-size:11px; color:#64748b; margin-bottom:6px;">법규 부합성</p>
          <p style="font-size:22px; font-weight:700; color:#0f766e;">${report.aiAnalysis?.legalCompliance ?? (report.planning.coverage <= 60 ? 90 : 75)}</p>
        </div>
        <div style="text-align:center; padding:14px 8px; background:#f0fdfa; border:1px solid #99f6e4; border-radius:8px;">
          <p style="font-size:11px; color:#64748b; margin-bottom:6px;">사업성</p>
          <p style="font-size:22px; font-weight:700; color:#0f766e;">${report.aiAnalysis?.profitability ?? (report.feasibility.roi > 20 ? 85 : report.feasibility.roi > 12 ? 70 : 55)}</p>
        </div>
        <div style="text-align:center; padding:14px 8px; background:#f0fdfa; border:1px solid #99f6e4; border-radius:8px;">
          <p style="font-size:11px; color:#64748b; margin-bottom:6px;">상품성</p>
          <p style="font-size:22px; font-weight:700; color:#0f766e;">${report.aiAnalysis?.marketability ?? (report.feasibility.roi > 15 ? 78 : 65)}</p>
        </div>
        <div style="text-align:center; padding:14px 8px; background:#ecfdf5; border:2px solid #6ee7b7; border-radius:8px;">
          <p style="font-size:11px; color:#064e3b; margin-bottom:6px; font-weight:600;">종합 점수</p>
          <p style="font-size:26px; font-weight:700; color:#065f46;">${report.aiAnalysis?.totalScore ?? Math.round((report.feasibility.roi > 20 ? 85 : report.feasibility.roi > 12 ? 70 : 55) * 0.95)}</p>
        </div>
      </div>
    </section>

    <!-- 8. 시나리오 및 사업기간 분석 -->
    <section class="pdf-section pdf-section-8">
      <div class="print-title-group">
        <h2 class="section-title">8. 시나리오 및 사업기간 분석</h2>
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
      </div>
    </section>

    <!-- 8 + 9 + Footer 그룹 - 마지막 페이지 -->
    <div class="print-final-page-group">
      <!-- 9. 리스크 및 고려사항 -->
      <section class="pdf-section pdf-section-9">
        <div class="print-title-group">
          <h2 class="section-title">9. 리스크 및 고려사항</h2>
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
      <section class="pdf-section pdf-section-10">
        <div class="print-conclusion-group">
          <h2 class="section-title">10. 결론 및 제안</h2>
          <p style="color: #374151; line-height: 1.8; margin-top: 12px;">${report.conclusion.finalParagraph}</p>
          <div class="verdict-box">
            <p style="font-size: 16px; color: #065f46;">${report.conclusion.summaryBox}</p>
          </div>
          <p class="pdf-note">본 보고서는 참고 자료로만 활용하시기 바랍니다.</p>
        </div>
      </section>

      <!-- 면책문구 -->
      <div class="disclaimer print-footer">
        <p>${report.disclaimer.mainText}</p>
        <p>${report.disclaimer.expertAdvice}</p>
        <p>${report.disclaimer.copyright}</p>
      </div>
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
    const sitePlanSvg = generateSitePlanSvg(drawingInput);
    const sectionSvg = generateSectionSvg(drawingInput);
    const isometricSvg = generateIsometricSvg(drawingInput);
    const elevationSvg = generateElevationSvg(drawingInput);
    const perspectiveSvg = generatePerspectiveSvg(drawingInput);
    const drawingSection = `
    <!-- 6. 설계 도면 -->
    <section class="pdf-section" style="page-break-before: always;">
      <div class="print-title-group">
        <h2 class="section-title">6. 설계 도면</h2>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div>
          <p style="font-weight: 600; font-size: 11px; margin-bottom: 6px; color: #1e293b;">배치도</p>
          ${sitePlanSvg}
        </div>
        <div>
          <p style="font-weight: 600; font-size: 11px; margin-bottom: 6px; color: #1e293b;">단면도</p>
          ${sectionSvg}
        </div>
        <div>
          <p style="font-weight: 600; font-size: 11px; margin-bottom: 6px; color: #1e293b;">아이소메트릭</p>
          ${isometricSvg}
        </div>
        <div>
          <p style="font-weight: 600; font-size: 11px; margin-bottom: 6px; color: #1e293b;">입면도</p>
          ${elevationSvg}
        </div>
      </div>
      <div style="margin-top: 12px;">
        <p style="font-weight: 600; font-size: 11px; margin-bottom: 6px; color: #1e293b;">투시도</p>
        ${perspectiveSvg}
      </div>
      <p style="font-size: 9px; color: #94a3b8; margin-top: 8px; text-align: center;">※ 도면은 사전검토 단계의 개략적 배치이며, 실시설계 시 변경될 수 있습니다.</p>
    </section>

    <!-- 7. 사업성 검토 -->`;
    htmlContent = htmlContent.replace('<!-- 6. 사업성 검토 -->', drawingSection);
    htmlContent = htmlContent.replace('>6. 사업성 검토<', '>7. 사업성 검토<');
    htmlContent = htmlContent.replace('>7. AI 분석<', '>8. AI 분석<');
    htmlContent = htmlContent.replace('>8. 시나리오<', '>9. 시나리오<');
    htmlContent = htmlContent.replace('>9. 리스크 및 고려사항<', '>10. 리스크 및 고려사항<');
    htmlContent = htmlContent.replace('>10. 결론 및 제안<', '>11. 결론 및 제안<');
  } catch (e) { console.warn('[report-export] HTML 도면 삽입 실패:', e); }

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = generateFileName(data.address, 'html');
    console.log('[v0] HTML 파일 생성:', a.download);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
    let htmlContent = generateFullHtmlReport(report, data.address);
    
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
      const sitePlanSvg = generateSitePlanSvg(drawingInput);
      const sectionSvg = generateSectionSvg(drawingInput);
      const isometricSvg = generateIsometricSvg(drawingInput);
      const elevationSvg = generateElevationSvg(drawingInput);
      const perspectiveSvg = generatePerspectiveSvg(drawingInput);
      const drawingSection = `
    <!-- 6. 설계 도면 -->
    <section class="pdf-section" style="page-break-before: always;">
      <div class="print-title-group">
        <h2 class="section-title">6. 설계 도면</h2>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div>
          <p style="font-weight: 600; font-size: 11px; margin-bottom: 6px; color: #1e293b;">배치도</p>
          ${sitePlanSvg}
        </div>
        <div>
          <p style="font-weight: 600; font-size: 11px; margin-bottom: 6px; color: #1e293b;">단면도</p>
          ${sectionSvg}
        </div>
        <div>
          <p style="font-weight: 600; font-size: 11px; margin-bottom: 6px; color: #1e293b;">아이소메트릭</p>
          ${isometricSvg}
        </div>
        <div>
          <p style="font-weight: 600; font-size: 11px; margin-bottom: 6px; color: #1e293b;">입면도</p>
          ${elevationSvg}
        </div>
      </div>
      <div style="margin-top: 12px;">
        <p style="font-weight: 600; font-size: 11px; margin-bottom: 6px; color: #1e293b;">투시도</p>
        ${perspectiveSvg}
      </div>
      <p style="font-size: 9px; color: #94a3b8; margin-top: 8px; text-align: center;">※ 도면은 사전검토 단계의 개략적 배치이며, 실시설계 시 변경될 수 있습니다.</p>
    </section>

    <!-- 7. 사업성 검토 -->`;
      htmlContent = htmlContent.replace('<!-- 6. 사업성 검토 -->', drawingSection);
      // 섹션 번호 +1
      htmlContent = htmlContent.replace('>6. 사업성 검토<', '>7. 사업성 검토<');
      htmlContent = htmlContent.replace('>7. AI 분석<', '>8. AI 분석<');
      htmlContent = htmlContent.replace('>8. 시나리오<', '>9. 시나리오<');
      htmlContent = htmlContent.replace('>9. 리스크 및 고려사항<', '>10. 리스크 및 고려사항<');
      htmlContent = htmlContent.replace('>10. 결론 및 제안<', '>11. 결론 및 제안<');
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
    
    // 렌더링 대기
    await new Promise(resolve => setTimeout(resolve, 500));
    
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
    
    // 다운로드
    const fileName = generateFileName(data.address, 'pdf');
    pdf.save(fileName);
    
    // 정��
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
    const htmlContent = generateFullHtmlReport(report, data.address);
    
    // 새 창에서 열고 인쇄
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // 로드 완료 후 인쇄 다이얼로그 열기
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 500);
      };
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
function generateFullHtmlReport(report: ReportDataV250, address: string): string {
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
      background: #ffffff; color: #1f2937; line-height: 1.6;
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
    
    /* 표지 - 블루 테마 (A4 1페이지 고정) */
    .cover { 
      height: 297mm; /* A4 높이 고정 */
      max-height: 297mm;
      display: flex; flex-direction: column; justify-content: center; 
      text-align: center; padding: 60px 40px;
      background: linear-gradient(135deg, #1e3a5f 0%, #0c4a6e 50%, #164e63 100%);
      color: #ffffff;
      page-break-after: always;
      break-after: page;
      overflow: visible;
    }
    .cover .doc-number { font-size: 12px; color: rgba(255,255,255,0.6); margin-bottom: 40px; line-height: 1.5; padding-bottom: 4px; }
    .cover .english-title { font-size: 14px; color: #5eead4; letter-spacing: 2px; margin-bottom: 16px; line-height: 1.5; padding-bottom: 4px; display: block; }
    .cover h1 { font-size: 36px; color: #ffffff; margin-bottom: 60px; font-weight: 700; line-height: 1.45; padding-bottom: 6px; display: block; }
    .cover .address { font-size: 20px; color: rgba(255,255,255,0.9); margin-bottom: 8px; line-height: 1.45; padding-bottom: 5px; display: block; }
    .cover .project-type { font-size: 16px; color: rgba(255,255,255,0.7); margin-bottom: 60px; line-height: 1.5; padding-bottom: 4px; }
    .cover .meta-info { font-size: 14px; color: rgba(255,255,255,0.7); line-height: 1.6; }
    .cover .meta-info p { margin: 4px 0; padding-bottom: 3px; }
    .cover .company { margin-top: 60px; font-size: 14px; color: #5eead4; font-weight: 600; line-height: 1.5; padding-bottom: 4px; display: block; }
    
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
        overflow: hidden !important; 
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
      .pdf-section-5, .pdf-section-6, .pdf-section-7,
      .pdf-section-8, .pdf-section-9 {
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
      .ai-analysis-summary {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
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
        line-height: 1.2 !important;
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
      .pdf-section-5, .pdf-section-6, .pdf-section-7, .pdf-section-8, .pdf-section-9 {
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
        font-size: 7pt !important;
        margin: 2px 0 !important;
        color: #6b7280 !important;
      }
      .disclaimer {
        min-height: auto !important;
        height: auto !important;
        margin-top: 2px !important;
        padding: 6px !important;
        flex: none !important;
        flex-grow: 0 !important;
        break-inside: avoid !important;
        font-size: 7pt !important;
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
  <div class="page">
    <!-- 1. 표지 -->
    <div class="cover">
      <p class="doc-number">${report.cover.documentNumber}</p>
      <p class="english-title">${report.cover.englishSubtitle}</p>
      <h1>${report.cover.koreanTitle}</h1>
      <p class="address">${report.cover.address}</p>
      <p class="project-type">${report.cover.projectType}</p>
      <div class="meta-info">
        <p>대지면적: ${report.cover.siteAreaFormatted}</p>
        <p>검토 배치안: ${report.cover.selectedLayoutName}</p>
        <p>작성일자: ${report.cover.createdDate}</p>
      </div>
      <p class="company">${report.cover.companyName}</p>
      <p style="font-size: 10px; color: #94a3b8; margin-top: 4px;">${report.cover.contact}</p>
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
    <section class="pdf-section pdf-section-3">
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
    <section class="pdf-section pdf-section-5">
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

    <!-- 6. 사업성 검토 -->
    <section class="pdf-section pdf-section-6">
      <div class="print-title-group">
        <h2 class="section-title">6. 사업성 검토</h2>
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
    <section class="pdf-section pdf-section-7 pdf-card-group">
      <h2 class="section-title" style="margin-bottom:12px;">7. AI 분석</h2>
      <div class="pdf-card-group" style="display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin:12px 0;">
        <div style="text-align:center; padding:14px 8px; background:#f0fdfa; border:1px solid #99f6e4; border-radius:8px;">
          <p style="font-size:11px; color:#64748b; margin-bottom:6px;">법규 부합성</p>
          <p style="font-size:22px; font-weight:700; color:#0f766e;">${report.aiAnalysis?.legalCompliance ?? (report.planning.coverage <= 60 ? 90 : 75)}</p>
        </div>
        <div style="text-align:center; padding:14px 8px; background:#f0fdfa; border:1px solid #99f6e4; border-radius:8px;">
          <p style="font-size:11px; color:#64748b; margin-bottom:6px;">사업성</p>
          <p style="font-size:22px; font-weight:700; color:#0f766e;">${report.aiAnalysis?.profitability ?? (report.feasibility.roi > 20 ? 85 : report.feasibility.roi > 12 ? 70 : 55)}</p>
        </div>
        <div style="text-align:center; padding:14px 8px; background:#f0fdfa; border:1px solid #99f6e4; border-radius:8px;">
          <p style="font-size:11px; color:#64748b; margin-bottom:6px;">상품성</p>
          <p style="font-size:22px; font-weight:700; color:#0f766e;">${report.aiAnalysis?.marketability ?? (report.feasibility.roi > 15 ? 78 : 65)}</p>
        </div>
        <div style="text-align:center; padding:14px 8px; background:#ecfdf5; border:2px solid #6ee7b7; border-radius:8px;">
          <p style="font-size:11px; color:#064e3b; margin-bottom:6px; font-weight:600;">종합 점수</p>
          <p style="font-size:26px; font-weight:700; color:#065f46;">${report.aiAnalysis?.totalScore ?? Math.round((report.feasibility.roi > 20 ? 85 : report.feasibility.roi > 12 ? 70 : 55) * 0.95)}</p>
        </div>
      </div>
    </section>

    <!-- 8. 시나리오 및 사업기간 분석 -->
    <section class="pdf-section pdf-section-8">
      <div class="print-title-group">
        <h2 class="section-title">8. 시나리오 및 사업기간 분석</h2>
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
      </div>
    </section>

    <!-- 8 + 9 + Footer 그룹 - 마지막 페이지 -->
    <div class="print-final-page-group">
      <!-- 9. 리스크 및 고려사항 -->
      <section class="pdf-section pdf-section-9">
        <div class="print-title-group">
          <h2 class="section-title">9. 리스크 및 고려사항</h2>
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
      <section class="pdf-section pdf-section-10">
        <div class="print-conclusion-group">
          <h2 class="section-title">10. 결론 및 제안</h2>
          <p style="color: #374151; line-height: 1.8; margin-top: 12px;">${report.conclusion.finalParagraph}</p>
          <div class="verdict-box">
            <p style="font-size: 16px; color: #065f46;">${report.conclusion.summaryBox}</p>
          </div>
          <p class="pdf-note">본 보고서는 참고 자료로만 활용하시기 바랍니다.</p>
        </div>
      </section>

      <!-- 면책문구 -->
      <div class="disclaimer print-footer">
        <p>${report.disclaimer.mainText}</p>
        <p>${report.disclaimer.expertAdvice}</p>
        <p>${report.disclaimer.copyright}</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ============================================
// Export: ReportDataV250 빌더 (직접 사용 가능)
// ============================================

export { buildReportDataV250, type ReportDataV250 } from './report-data-v250';
