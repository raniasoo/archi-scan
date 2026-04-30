/**
 * Report Internationalization Labels
 * 보고서 다국어 지원
 */

export type ReportLang = 'ko' | 'en'

export const REPORT_LABELS: Record<ReportLang, Record<string, string>> = {
  ko: {
    docTitle: '개발사업 사전검토 보고서',
    execSummary: '핵심 요약',
    execSummaryTag: 'EXECUTIVE SUMMARY',
    roi: '투자수익률 (ROI)',
    layout: '배치안',
    totalCost: '총사업비',
    expectedProfit: '예상수익',
    units: '세대수',
    gfa: '연면적',
    breakEven: '손익분기 분양률',
    legalCompliance: '법규 부합성',
    profitability: '사업성',
    marketability: '상품성',
    totalScore: '종합 점수',
    keyPoints: '핵심 포인트',
    siteAnalysis: '대상지 분석',
    regulationReview: '법규 검토',
    layoutComparison: '배치안 비교 검토',
    planning: '규모 산정 및 계획 구성',
    drawings: '설계 도면',
    feasibility: '사업성 검토',
    aiAnalysis: 'AI 분석',
    scenarios: '시나리오 및 사업기간 분석',
    risks: '리스크 및 고려사항',
    conclusion: '결론 및 제안',
    disclaimer: '본 보고서는 사전검토 단계의 개략적 분석입니다.',
    timeline: '예상 사업 일정',
    planning_phase: '사업기획',
    permit_phase: '인허가',
    construction_phase: '시공',
    sales_phase: '분양/입주',
  },
  en: {
    docTitle: 'Development Feasibility Report',
    execSummary: 'Executive Summary',
    execSummaryTag: 'EXECUTIVE SUMMARY',
    roi: 'Return on Investment (ROI)',
    layout: 'Layout Plan',
    totalCost: 'Total Cost',
    expectedProfit: 'Expected Profit',
    units: 'Units',
    gfa: 'GFA',
    breakEven: 'Break-Even Rate',
    legalCompliance: 'Legal Compliance',
    profitability: 'Profitability',
    marketability: 'Marketability',
    totalScore: 'Overall Score',
    keyPoints: 'Key Points',
    siteAnalysis: 'Site Analysis',
    regulationReview: 'Regulation Review',
    layoutComparison: 'Layout Comparison',
    planning: 'Planning & Design',
    drawings: 'Architectural Drawings',
    feasibility: 'Feasibility Study',
    aiAnalysis: 'AI Analysis',
    scenarios: 'Scenario & Timeline Analysis',
    risks: 'Risks & Considerations',
    conclusion: 'Conclusion & Recommendations',
    disclaimer: 'This report is a preliminary feasibility analysis.',
    timeline: 'Project Timeline',
    planning_phase: 'Planning',
    permit_phase: 'Permits',
    construction_phase: 'Construction',
    sales_phase: 'Sales/Move-in',
  }
}

export function getLabels(lang: ReportLang = 'ko') {
  return REPORT_LABELS[lang]
}
