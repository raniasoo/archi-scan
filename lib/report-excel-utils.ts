/**
 * Excel Import/Export Utilities for Feasibility Report Template
 * 
 * Parses uploaded Excel files using the 9 fixed worksheet names and converts
 * worksheet values into the existing ReportSummary input model.
 * 
 * Uses frozen template defaults as fallback for missing cells or sheets.
 * Preserves current PDF generation, screen layout, wording, and template logic.
 */

import * as XLSX from 'xlsx'
import {
  type FeasibilityReportData,
  type 기본정보,
  type 대상지분석,
  type 법규검토,
  type 배치안비교,
  type 배치안항목,
  type 선택안상세,
  type 사업성검토,
  type 리스크,
  type 리스크항목,
  type 결론및제안,
  type 종합의견등급,
  type 고정설정,
  EXCEL_SHEET_NAMES,
  EMPTY_REPORT_TEMPLATE,
  DEFAULT_FIXED_SETTINGS,
  DEFAULT_RISK_ITEMS,
} from './report-data-schema'

// ============================================================================
// ReportSummary Input Model (matches existing component props)
// ============================================================================
export interface LayoutScores {
  regulationCompliance: number
  profitability: number
  marketability: number
  feasibility: number
  overall: number
}

export interface LayoutRecommendation {
  isRecommended: boolean
  reasons: string[]
  warnings: string[]
  strategyMatch: number
}

export interface AIReasoning {
  summary: string
  regulationConsiderations: string[]
  profitabilityAdvantages: string[]
  designFeatures: string[]
  risksAndChallenges: string[]
}

export interface LayoutOption {
  id: number
  name: string
  type: 'tower' | 'courtyard' | 'lshape' | 'linear' | 'cluster'
  description: string
  coverage: number
  units: number
  floors: number
  parking: number
  features: string[]
  scores?: LayoutScores
  recommendation?: LayoutRecommendation
  reasoning?: AIReasoning
}

export interface ZoningRegulation {
  zoneType: string
  zoneTypeCustom?: string
  maxCoverageRatio: number
  maxFloorAreaRatio: number
  maxHeight: number
  maxFloors: number
  roadWidth: number
  roadCondition: string
  parkingRatio: number
  setbackType: string
  setbackAngle: number
  setbackFront: number
  setbackSide: number
  setbackRear: number
  additionalNotes: string
}

export interface ReportSummaryInput {
  layout: LayoutOption
  address: string
  siteArea: number
  gfa: number
  allLayouts?: LayoutOption[]
  regulation?: ZoningRegulation
}

// ============================================================================
// Helper Functions
// ============================================================================

function parseNumber(value: unknown, fallback: number = 0): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(/[^0-9.-]/g, ''))
    return isNaN(parsed) ? fallback : parsed
  }
  return fallback
}

function parseString(value: unknown, fallback: string = ''): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return String(value)
  return fallback
}

function getSheetData(workbook: XLSX.WorkBook, sheetName: string): Record<string, unknown>[] {
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) return []
  return XLSX.utils.sheet_to_json(sheet, { defval: '' })
}

function getKeyValueSheet(workbook: XLSX.WorkBook, sheetName: string): Record<string, unknown> {
  const data = getSheetData(workbook, sheetName)
  const result: Record<string, unknown> = {}
  
  data.forEach((row) => {
    const key = parseString(row['항목'] || row['구분'])
    const value = row['값'] || row['내용']
    if (key) {
      result[key] = value
    }
  })
  
  return result
}

function inferLayoutType(name: string, description: string): 'tower' | 'courtyard' | 'lshape' | 'linear' | 'cluster' {
  const text = (name + description).toLowerCase()
  if (text.includes('타워') || text.includes('tower')) return 'tower'
  if (text.includes('중정') || text.includes('courtyard')) return 'courtyard'
  if (text.includes('l자') || text.includes('lshape') || text.includes('ㄱ자')) return 'lshape'
  if (text.includes('선형') || text.includes('linear') || text.includes('판상')) return 'linear'
  if (text.includes('클러스터') || text.includes('cluster') || text.includes('군집')) return 'cluster'
  return 'tower'
}



// ============================================================================
// Excel Sheet Names Object (for easy access)
// ============================================================================
export const EXCEL_SHEET_NAMES_OBJ = {
  기본정보: '기본정보',
  대상지분석: '대상지분석',
  법규검토: '법규검토',
  배치안비교: '배치안비교',
  선택안상세: '선택안상세',
  사업성검토: '사업성검토',
  리스크: '리스크',
  결론및제안: '결론및제안',
  고정설정: '고정설정',
} as const

// Re-export as EXCEL_SHEET_NAMES for component usage
export { EXCEL_SHEET_NAMES_OBJ as EXCEL_SHEET_NAMES }

// ============================================================================
// Excel Import Result Type
// ============================================================================
export interface ExcelParseResult {
  data: FeasibilityReportData
  missingSheets: string[]
  errors: string[]
}

// ============================================================================
// Excel Import: Parse Excel to FeasibilityReportData
// ============================================================================

export function parseExcelToReportData(file: ArrayBuffer): ExcelParseResult {
  const workbook = XLSX.read(file, { type: 'array' })
  
  // Track missing sheets and errors
  const allSheetNames = ['기본정보', '대상지분석', '법규검토', '배치안비교', '선택안상세', '사업성검토', '리스크', '결론및제안', '고정설정']
  const presentSheets = workbook.SheetNames
  const missingSheets = allSheetNames.filter(name => !presentSheets.includes(name))
  const errors: string[] = []
  
  // Start with empty template as base
  const result: FeasibilityReportData = JSON.parse(JSON.stringify(EMPTY_REPORT_TEMPLATE))
  
  // [기본정보]
  const 기본정보Data = getKeyValueSheet(workbook, '기본정보')
  if (Object.keys(기본정보Data).length > 0) {
    result.기본정보 = {
      대상지주소: parseString(기본정보Data['대상지 주소'] || 기본정보Data['대상지주소'], result.기본정보.대상지주소),
      대지면적_sqm: parseNumber(기본정보Data['대지면적(㎡)'] || 기본정보Data['대지면적_sqm'], result.기본정보.대지면적_sqm),
      대지면적_pyeong: parseNumber(기본정보Data['대지면적(평)'] || 기본정보Data['대지면적_pyeong'], result.기본정보.대지면적_pyeong),
      사업유형: parseString(기본정보Data['사업 유형'] || 기본정보Data['사업유형'], result.기본정보.사업유형),
      작성일: parseString(기본정보Data['작성일'], result.기본정보.작성일),
      문서번호: parseString(기본정보Data['문서번호'], result.기본정보.문서번호),
    }
    // Auto-calculate pyeong if not provided
    if (result.기본정보.대지면적_sqm > 0 && result.기본정보.대지면적_pyeong === 0) {
      result.기본정보.대지면적_pyeong = Math.round(result.기본정보.대지면적_sqm * 0.3025)
    }
  }
  
  // [대상지분석]
  const 대상지분석Data = getKeyValueSheet(workbook, '대상지분석')
  if (Object.keys(대상지분석Data).length > 0) {
    result.대상지분석 = {
      소재지: parseString(대상지분석Data['소재지'], result.대상지분석.소재지),
      토지이용계획: parseString(대상지분석Data['토지이용계획'], result.대상지분석.토지이용계획),
      접도현황: parseString(대상지분석Data['접도 현황'] || 대상지분석Data['접도현황'], result.대상지분석.접도현황),
      주변입지특성: parseString(대상지분석Data['주변 입지 특성'] || 대상지분석Data['주변입지특성'], result.대상지분석.주변입지특성),
    }
  }
  
  // [법규검토]
  const 법규검토Data = getKeyValueSheet(workbook, '법규검토')
  if (Object.keys(법규검토Data).length > 0) {
    result.법규검토 = {
      용도지역: parseString(법규검토Data['용도지역'], result.법규검토.용도지역),
      건폐율한도_percent: parseNumber(법규검토Data['건폐율 한도(%)'] || 법규검토Data['건폐율한도_percent'], result.법규검토.건폐율한도_percent),
      용적률한도_percent: parseNumber(법규검토Data['용적률 한도(%)'] || 법규검토Data['용적률한도_percent'], result.법규검토.용적률한도_percent),
      높이제한: parseString(법규검토Data['높이 제한'] || 법규검토Data['높이제한'], result.법규검토.높이제한),
      최대층수: parseNumber(법규검토Data['최대 층수'] || 법규검토Data['최대층수'], result.법규검토.최대층수),
    }
  }
  
  // [배치안비교]
  const 배치안비교Data = getSheetData(workbook, '배치안비교')
  if (배치안비교Data.length > 0) {
    result.배치안비교 = 배치안비교Data
      .filter((row) => parseString(row['배치안명']))
      .map((row) => ({
        배치안명: parseString(row['배치안명']),
        건폐율: parseNumber(row['건폐율']),
        층수: parseNumber(row['층수']),
        세대수: parseNumber(row['세대수']),
        주차대수: parseNumber(row['주차대수']),
        ROI: parseNumber(row['ROI']),
      }))
  }
  
  // [선택안상세]
  const 선택안상세Data = getKeyValueSheet(workbook, '선택안상세')
  if (Object.keys(선택안상세Data).length > 0) {
    result.선택안상세 = {
      사용자선택배치안: parseString(선택안상세Data['사용자가 선택한 배치안'] || 선택안상세Data['사용자선택배치안'], result.선택안상세.사용자선택배치안),
      AI추천배치안: parseString(선택안상세Data['AI 추천 배치안'] || 선택안상세Data['AI추천배치안'], result.선택안상세.AI추천배치안),
      선택안설명문구: parseString(선택안상세Data['선택안 설명 문구'] || 선택안상세Data['선택안설명문구'], result.선택안상세.선택안설명문구),
      세대수: parseNumber(선택안상세Data['세대수'], result.선택안상세.세대수),
      규모: parseString(선택안상세Data['규모'], result.선택안상세.규모),
      주차대수: parseNumber(선택안상세Data['주차대수'], result.선택안상세.주차대수),
      건폐율: parseNumber(선택안상세Data['건폐율'], result.선택안상세.건폐율),
      연면적_sqm: parseNumber(선택안상세Data['연면적'] || 선택안상세Data['연면적_sqm'], result.선택안상세.연면적_sqm),
      연면적_pyeong: parseNumber(선택안상세Data['연면적_평'], result.선택안상세.연면적_pyeong),
      용적률: parseNumber(선택안상세Data['용적률'], result.선택안상세.용적률),
      배치특성: [
        parseString(선택안상세Data['배치 특성 배지 1'] || 선택안상세Data['배치특성1']),
        parseString(선택안상세Data['배치 특성 배지 2'] || 선택안상세Data['배치특성2']),
        parseString(선택안상세Data['배치 특성 배지 3'] || 선택안상세Data['배치특성3']),
        parseString(선택안상세Data['배치 특성 배지 4'] || 선택안상세Data['배치특성4']),
      ].filter(Boolean),
    }
    // Auto-calculate 평 if not provided
    if (result.선택안상세.연면적_sqm > 0 && result.선택안상세.연면적_pyeong === 0) {
      result.선택안상세.연면적_pyeong = Math.round(result.선택안상세.연면적_sqm * 0.3025)
    }
  }
  
  // [사업성검토]
  const 사업성검토Data = getKeyValueSheet(workbook, '사업성검토')
  if (Object.keys(사업성검토Data).length > 0) {
    result.사업성검토 = {
      토지비: parseNumber(사업성검토Data['토지비'], result.사업성검토.토지비),
      토지비_억원: parseString(사업성검토Data['토지비_억원'], result.사업성검토.토지비_억원),
      공사비: parseNumber(사업성검토Data['공사비'], result.사업성검토.공사비),
      공사비_억원: parseString(사업성검토Data['공사비_억원'], result.사업성검토.공사비_억원),
      기타비용: parseNumber(사업성검토Data['기타비용'], result.사업성검토.기타비용),
      기타비용_억원: parseString(사업성검토Data['기타비용_억원'], result.사업성검토.기타비용_억원),
      총사업비: parseNumber(사업성검토Data['총 사업비'] || 사업성검토Data['총사업비'], result.사업성검토.총사업비),
      총사업비_억원: parseString(사업성검토Data['총사업비_억원'], result.사업성검토.총사업비_억원),
      총분양수입: parseNumber(사업성검토Data['총 분양수입'] || 사업성검토Data['총분양수입'], result.사업성검토.총분양수입),
      총분양수입_억원: parseString(사업성검토Data['총분양수입_억원'], result.사업성검토.총분양수입_억원),
      예상사업이익: parseNumber(사업성검토Data['예상 사업이익'] || 사업성검토Data['예상사업이익'], result.사업성검토.예상사업이익),
      예상사업이익_억원: parseString(사업성검토Data['예상사업이익_억원'], result.사업성검토.예상사업이익_억원),
      투자수익률_ROI: parseNumber(사업성검토Data['투자수익률(ROI)'] || 사업성검토Data['투자수익률_ROI'], result.사업성검토.투자수익률_ROI),
      손익분기분양률: parseNumber(사업성검토Data['손익분기분양률'], result.사업성검토.손익분기분양률),
      예상사업기간: parseString(사업성검토Data['예상 사업기간'] || 사업성검토Data['예상사업기간'], result.사업성검토.예상사업기간),
      총사업기간: parseString(사업성검토Data['총사업기간'], result.사업성검토.총사업기간),
    }
  }
  
  // [리스크]
  const 리스크Data = getSheetData(workbook, '리스크')
  if (리스크Data.length > 0) {
    const riskMap: Record<string, string[]> = {}
    리스크Data.forEach((row) => {
      const category = parseString(row['구분'])
      const content = parseString(row['내용'])
      if (category && content) {
        if (!riskMap[category]) riskMap[category] = []
        riskMap[category].push(content)
      }
    })
    
    if (Object.keys(riskMap).length > 0) {
      result.리스크 = Object.entries(riskMap).map(([구분, 내용]) => ({
        구분: 구분 as 리스크항목['구분'],
        내용,
      }))
    }
  }
  
  // [결론및제안]
  const 결론및제안Data = getKeyValueSheet(workbook, '결론및제안')
  if (Object.keys(결론및제안Data).length > 0) {
    const 종합의견Raw = parseString(결론및제안Data['종합의견'], '조건부 추진 검토')
    let 종합의견: 종합의견등급 = '조건부 추진 검토'
    if (종합의견Raw.includes('적합')) 종합의견 = '사업 추진 적합'
    else if (종합의견Raw.includes('추가')) 종합의견 = '추가 검토 필요'
    
    result.결론및제안 = {
      종합의견,
      결론요약문구: parseString(결론및제안Data['결론 요약 문구'] || 결론및제안Data['결론요약문구'], result.결론및제안.결론요약문구),
      권고박스문구: parseString(결론및제안Data['권고 박스 문구'] || 결론및제안Data['권고박스문구'], result.결론및제안.권고박스문구),
    }
  }
  
  // [고정설정] - Always use defaults, ignore Excel values
  result.고정설정 = { ...DEFAULT_FIXED_SETTINGS }
  
  return { data: result, missingSheets, errors }
}

// ============================================================================
// Convert FeasibilityReportData to ReportSummaryInput
// ============================================================================

export function reportDataToSummaryInput(data: FeasibilityReportData): ReportSummaryInput {
  // Build layouts from 배치안비교
  const layouts: LayoutOption[] = data.배치안비교.map((item, index) => {
    const floors = item.층수 || 7
    return {
      id: index + 1,
      name: item.배치안명,
      type: inferLayoutType(item.배치안명, ''),
      description: '',
      coverage: item.건폐율,
      units: item.세대수,
      floors,
      parking: item.주차대수,
      features: [],
    }
  })
  
  // Find selected layout
  const selectedLayoutName = data.선택안상세.사용자선택배치안
  let selectedLayout = layouts.find((l) => l.name === selectedLayoutName) || layouts[0]
  
  // If no layouts from 배치안비교, create one from 선택안상세
  if (layouts.length === 0 && data.선택안상세.세대수 > 0) {
    const floorsMatch = data.선택안상세.규모.match(/(\d+)/)
    const floors = floorsMatch ? parseInt(floorsMatch[1], 10) : 7
    
    selectedLayout = {
      id: 1,
      name: data.선택안상세.사용자선택배치안 || '배치안 A',
      type: inferLayoutType(data.선택안상세.사용자선택배치안, data.선택안상세.선택안설명문구),
      description: data.선택안상세.선택안설명문구,
      coverage: data.선택안상세.건폐율,
      units: data.선택안상세.세대수,
      floors,
      parking: data.선택안상세.주차대수,
      features: data.선택안상세.배치특성,
    }
    layouts.push(selectedLayout)
  }
  
  // Update selected layout with detailed info
  if (selectedLayout) {
    selectedLayout.description = data.선택안상세.선택안설명문구
    selectedLayout.features = data.선택안상세.배치특성
  }
  
  // Build regulation
  const regulation: ZoningRegulation = {
    zoneType: data.법규검토.용도지역,
    maxCoverageRatio: data.법규검토.건폐율한도_percent,
    maxFloorAreaRatio: data.법규검토.용적률한도_percent,
    maxHeight: parseNumber(data.법규검토.높이제한.replace(/[^0-9.]/g, ''), 0),
    maxFloors: data.법규검토.최대층수,
    roadWidth: 8,
    roadCondition: '양호',
    parkingRatio: 1.2,
    setbackType: '일반',
    setbackAngle: 0,
    setbackFront: 3,
    setbackSide: 1.5,
    setbackRear: 2,
    additionalNotes: '',
  }
  
  return {
    layout: selectedLayout,
    address: data.기본정보.대상지주소 || data.대상지분석.소재지,
    siteArea: data.기본정보.대지면적_sqm,
    gfa: data.선택안상세.연면적_sqm || Math.round(data.기본정보.대지면적_sqm * (selectedLayout?.coverage || 50) / 100 * (selectedLayout?.floors || 7)),
    allLayouts: layouts.length > 1 ? layouts : undefined,
    regulation,
  }
}

// ============================================================================
// Export ReportSummaryInput to Excel
// ============================================================================

export function exportReportToExcel(
  input: ReportSummaryInput,
  financials: {
    landCost: number
    constructionCost: number
    softCost: number
    totalInvestment: number
    projectedRevenue: number
    profit: number
    roi: number
    breakEvenRate: number
  },
  dateStr: string,
  docNumber: string
): ArrayBuffer {
  const workbook = XLSX.utils.book_new()
  
  // Format currency helper
  const formatBillion = (val: number) => `${(val / 100000000).toFixed(1)}억원`
  
  // Safe helper: Ensure sheet metadata arrays exist
  const ensureSheetMeta = (ws: XLSX.WorkSheet) => {
    if (!ws['!cols']) ws['!cols'] = []
    if (!ws['!rows']) ws['!rows'] = []
    if (!ws['!merges']) ws['!merges'] = []
    return ws
  }
  
  // Safe helper: Set column widths
  const setCols = (ws: XLSX.WorkSheet, widths: number[]) => {
    ensureSheetMeta(ws)
    ws['!cols'] = widths.map(w => ({ wch: w }))
  }
  
  // Safe helper: Set single row height
  const setRowHeight = (ws: XLSX.WorkSheet, rowIndex: number, height: number) => {
    ensureSheetMeta(ws)
    if (ws['!rows']) {
      ws['!rows'][rowIndex] = { hpt: height }
    }
  }
  
  // Safe helper: Set multiple row heights
  const setRowHeights = (ws: XLSX.WorkSheet, heights: Record<number, number>) => {
    ensureSheetMeta(ws)
    Object.entries(heights).forEach(([row, height]) => {
      const r = parseInt(row, 10)
      if (ws['!rows']) {
        ws['!rows'][r] = { hpt: height }
      }
    })
  }
  
  // Safe helper: Freeze first row
  const freezePane = (ws: XLSX.WorkSheet) => {
    ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2' }
  }
  
  // [기본정보] - A: 18, B: 28
  const 기본정보Sheet = XLSX.utils.aoa_to_sheet([
    ['항목', '값'],
    ['대상지 주소', input.address],
    ['대지면적', `${input.siteArea.toLocaleString()}㎡`],
    ['대지면적(평)', `${Math.round(input.siteArea * 0.3025).toLocaleString()}평`],
    ['사업 유형', '공동주택 신축사업'],
    ['작성일', dateStr],
    ['문서번호', docNumber],
  ])
  setCols(기본정보Sheet, [18, 28])
  setRowHeight(기본정보Sheet, 0, 28)
  freezePane(기본정보Sheet)
  XLSX.utils.book_append_sheet(workbook, 기본정보Sheet, '기본정보')
  
  // [대상지분석] - A: 18, B: 36
  const 대상지분석Sheet = XLSX.utils.aoa_to_sheet([
    ['항목', '값'],
    ['소재지', input.address],
    ['토지이용계획', '현장 확인 필요'],
    ['접도 현황', '현장 확인 필요'],
    ['주변 입지 특성', ''],
  ])
  setCols(대상지분석Sheet, [18, 36])
  setRowHeight(대상지분석Sheet, 0, 28)
  freezePane(대상지분석Sheet)
  XLSX.utils.book_append_sheet(workbook, 대상지분석Sheet, '대상지분석')
  
  // [법규검토] - A: 18, B: 18, C: 18, D: 14 (4열 구조)
  const 법규검토Sheet = XLSX.utils.aoa_to_sheet([
    ['항목', '값', '', ''],
    ['용도지역', input.regulation?.zoneType || '제2종 일반주거지역', '', ''],
    ['건폐율 한도', `${input.regulation?.maxCoverageRatio || 60}%`, '용적률 한도', `${input.regulation?.maxFloorAreaRatio || 200}%`],
    ['높이 제한', input.regulation?.maxHeight ? `${input.regulation.maxHeight}m` : '별도 확인', '최대 층수', `${input.regulation?.maxFloors || 7}층`],
  ])
  setCols(법규검토Sheet, [18, 18, 18, 14])
  setRowHeight(법규검토Sheet, 0, 28)
  freezePane(법규검토Sheet)
  XLSX.utils.book_append_sheet(workbook, 법규검토Sheet, '법규검토')
  
  // [배치안비교] - Optimized column order for mobile (important columns first)
  const layouts = input.allLayouts || [input.layout]
  const 배치안비교Data: (string | number)[][] = [['배치안', '세대수', '층수', 'ROI', '건폐율', '주차']]
  layouts.forEach((l) => {
    const gfa = Math.round(input.siteArea * (l.coverage / 100) * l.floors)
    const heightPremium = l.floors > 15 ? 1.15 : l.floors > 10 ? 1.08 : 1.0
    const landCost = input.siteArea * 5000000 // unified
    const constructionCost = gfa * 2500000 * heightPremium // unified
    const softCost = constructionCost * 0.15 // unified
    const parkingCost = l.parking * 30000000
    const totalInvestment = landCost + constructionCost + softCost + parkingCost
    const projectedRevenue = gfa * 8000000 // unified: area-based
    const profit = projectedRevenue - totalInvestment
    const roi = totalInvestment > 0 ? (profit / totalInvestment) * 100 : 0
    배치안비교Data.push([
      l.name,
      `${l.units}세대`,
      `${l.floors}층`,
      `${roi.toFixed(1)}%`,
      `${l.coverage}%`,
      `${l.parking}대`
    ])
  })
  const 배치안비교Sheet = XLSX.utils.aoa_to_sheet(배치안비교Data)
  setCols(배치안비교Sheet, [20, 10, 10, 10, 10, 10])
  setRowHeight(배치안비교Sheet, 0, 28)
  freezePane(배치안비교Sheet)
  XLSX.utils.book_append_sheet(workbook, 배치안비교Sheet, '배치안비교')
  
  // [선택안상세]
  const recommendedLayout = layouts.length > 1 
    ? layouts.reduce((best, l) => {
        const getScore = (layout: LayoutOption) => {
          const gfa = Math.round(input.siteArea * (layout.coverage / 100) * layout.floors)
          const heightPremium = layout.floors > 15 ? 1.15 : layout.floors > 10 ? 1.08 : 1.0
          const landCost = input.siteArea * 5000000 // unified
          const constructionCost = gfa * 2500000 * heightPremium // unified
          const softCost = constructionCost * 0.15 // unified
          const parkingCost = layout.parking * 30000000
          const totalInvestment = landCost + constructionCost + softCost + parkingCost
          const projectedRevenue = gfa * 8000000 // unified: area-based
          const profit = projectedRevenue - totalInvestment
          const roi = totalInvestment > 0 ? (profit / totalInvestment) * 100 : 0
          return roi
        }
        return getScore(l) > getScore(best) ? l : best
      }, layouts[0])
    : input.layout
  
  // Build description with line breaks for readability
  const descriptionText = input.layout.description || '해당 배치안은 법규 조건을 충족하면서 세대수와 수익성을 균형있게 확보한 안입니다.'
  
  // [선택안상세] A: 18, B: 50 (wide B column, no merge)
  const 선택안상세Data: (string | number)[][] = [
    ['항목', '내용'],
    ['사용자 선택 배치안', input.layout.name],
    ['AI 추천 배치안', recommendedLayout.name],
    [''],
    ['[규모 정보]', ''],
    ['세대수', `${input.layout.units}세대`],
    ['규모', `지상 ${input.layout.floors}층`],
    ['주차대수', `${input.layout.parking}대`],
    ['건폐율', `${input.layout.coverage}%`],
    ['연면적', `${input.gfa.toLocaleString()}㎡ (${Math.round(input.gfa * 0.3025).toLocaleString()}평)`],
    ['용적률', `${(input.gfa / input.siteArea * 100).toFixed(1)}%`],
    [''],
    ['[배치 특성]', ''],
    ['특성 1', input.layout.features[0] || '-'],
    ['특성 2', input.layout.features[1] || '-'],
    ['특성 3', input.layout.features[2] || '-'],
    ['특성 4', input.layout.features[3] || '-'],
    [''],
    ['[배치안 설명]', ''],
    ['설명', descriptionText],
  ]
  
  const 선택안상세Sheet = XLSX.utils.aoa_to_sheet(선택안상세Data)
  setCols(선택안상세Sheet, [18, 52]) // A: 18, B: 52 for mobile
  setRowHeights(선택안상세Sheet, { 
    0: 28,   // Header
    4: 26,   // [규모 정보]
    12: 26,  // [배치 특성]
    13: 34, 14: 34, 15: 34, 16: 34, // 특성 rows
    18: 26,  // [배치안 설명]
    19: 72   // 설명 - tall for wrap
  })
  freezePane(선택안상세Sheet)
  XLSX.utils.book_append_sheet(workbook, 선택안상세Sheet, '선택안상세')
  
  // [사업성검토]
  const isProfitable = financials.profit >= 0
  const profitLabel = isProfitable ? '예상 사업이익' : '예상 손실'
  const profitValue = isProfitable 
    ? formatBillion(financials.profit)
    : `-${formatBillion(Math.abs(financials.profit))}`
  const roiValue = `${financials.roi >= 0 ? '' : ''}${financials.roi.toFixed(1)}%`
  
  const 사업성검토Sheet = XLSX.utils.aoa_to_sheet([
    ['항목', '금액/값', '비고'],
    ['[투자비]', '', ''],
    ['토지비', formatBillion(financials.landCost), '15,000천원/㎡ 적용'],
    ['공사비', formatBillion(financials.constructionCost), '4,500천원/㎡ + 간접비 15%'],
    ['기타비용', formatBillion(financials.softCost), '설계/감리/인허가 등 8%'],
    ['총 사업비', formatBillion(financials.totalInvestment), ''],
    [''],
    ['[수익]', '', ''],
    ['총 분양수입', formatBillion(financials.projectedRevenue), `${input.layout.units}세대 기준`],
    [profitLabel, profitValue, isProfitable ? '' : '** 손실 발생 **'],
    ['투자수익률(ROI)', roiValue, isProfitable ? '' : '** 음수 ROI **'],
    [''],
    ['[사업기간]', '', ''],
    ['예상 시공기간', input.layout.floors > 8 ? '24~30개월' : input.layout.floors > 5 ? '18~24개월' : '14~18개월', ''],
    ['총 사업기간', input.layout.floors > 8 ? '30~38개월' : input.layout.floors > 5 ? '24~32개월' : '20~26개월', '설계/인허가 포함'],
  ])
  setCols(사업성검토Sheet, [18, 18, 22])
  setRowHeights(사업성검토Sheet, { 0: 28, 1: 26, 7: 26, 12: 26 })
  freezePane(사업성검토Sheet)
  XLSX.utils.book_append_sheet(workbook, 사업성검토Sheet, '사업성검토')
  
  // [리스크] A: 16, B: 50 (wide B column, no merge)
  const 리스크Data: (string)[][] = [['구분', '내용']]
  DEFAULT_RISK_ITEMS.forEach((risk) => {
    risk.내용.forEach((item) => {
      리스크Data.push([risk.구분, item])
    })
  })
  const 리스크Sheet = XLSX.utils.aoa_to_sheet(리스크Data)
  setCols(리스크Sheet, [16, 50])
  setRowHeight(리스크Sheet, 0, 28)
  // Set fixed height for all content rows (40pt for wrapped text)
  for (let i = 1; i < 리스크Data.length; i++) {
    setRowHeight(리스크Sheet, i, 40)
  }
  freezePane(리스크Sheet)
  XLSX.utils.book_append_sheet(workbook, 리스크Sheet, '리스크')
  
  // [AI분석] A: 16, B: 55 (wide B column, no merge)
  const hasAIAnalysis = input.layout.scores || input.layout.reasoning || input.layout.recommendation
  if (hasAIAnalysis) {
    const AI분석Data: (string | number)[][] = [['항목', '내용']]
    const longTextRowIndices: number[] = []
    
    // Scores section
    AI분석Data.push(['[평가 점수]', ''])
    if (input.layout.scores) {
      AI분석Data.push(['법규 적합성', `${input.layout.scores.regulationCompliance ?? 0}점`])
      AI분석Data.push(['사업성', `${input.layout.scores.profitability ?? 0}점`])
      AI분석Data.push(['상품성', `${input.layout.scores.marketability ?? 0}점`])
      AI분석Data.push(['실현 가능성', `${input.layout.scores.feasibility ?? 0}점`])
      AI분석Data.push(['종합 점수', `${input.layout.scores.overall ?? 0}점`])
    }
    
    // Reasoning summary
    if (input.layout.reasoning?.summary) {
      AI분석Data.push([''])
      AI분석Data.push(['[분석 요약]', ''])
      longTextRowIndices.push(AI분석Data.length)
      AI분석Data.push(['요약', input.layout.reasoning.summary])
    }
    
    // Recommendation reasons
    const reasons = input.layout.recommendation?.reasons ?? []
    if (reasons.length > 0) {
      AI분석Data.push([''])
      AI분석Data.push(['[추천 이유]', ''])
      reasons.forEach((reason, idx) => {
        longTextRowIndices.push(AI분석Data.length)
        AI분석Data.push([`이유 ${idx + 1}`, reason])
      })
    }
    
    // Warnings
    const warnings = input.layout.recommendation?.warnings ?? []
    if (warnings.length > 0) {
      AI분석Data.push([''])
      AI분석Data.push(['[유의 사항]', ''])
      warnings.forEach((warning, idx) => {
        longTextRowIndices.push(AI분석Data.length)
        AI분석Data.push([`유의 ${idx + 1}`, warning])
      })
    }
    
    // Design features
    const designFeatures = input.layout.reasoning?.designFeatures ?? []
    if (designFeatures.length > 0) {
      AI분석Data.push([''])
      AI분석Data.push(['[설계 특징]', ''])
      designFeatures.forEach((feature, idx) => {
        longTextRowIndices.push(AI분석Data.length)
        AI분석Data.push([`특징 ${idx + 1}`, feature])
      })
    }
    
    // Risks and challenges
    const risksAndChallenges = input.layout.reasoning?.risksAndChallenges ?? []
    if (risksAndChallenges.length > 0) {
      AI분석Data.push([''])
      AI분석Data.push(['[리스크]', ''])
      risksAndChallenges.forEach((risk, idx) => {
        longTextRowIndices.push(AI분석Data.length)
        AI분석Data.push([`리스크 ${idx + 1}`, risk])
      })
    }
    
    // Strategy match
    if (input.layout.recommendation?.strategyMatch) {
      AI분석Data.push([''])
      AI분석Data.push(['[전략 부합도]', ''])
      AI분석Data.push(['부합도', `${input.layout.recommendation.strategyMatch}%`])
    }
    
    const AI분석Sheet = XLSX.utils.aoa_to_sheet(AI분석Data)
    setCols(AI분석Sheet, [18, 58]) // A: 18, B: 58 for mobile readability
    setRowHeight(AI분석Sheet, 0, 28) // Header
    setRowHeight(AI분석Sheet, 1, 26) // Section header [평가 점수]
    // Set taller height for long text rows (56-72pt for wrap)
    longTextRowIndices.forEach(rowIdx => {
      setRowHeight(AI분석Sheet, rowIdx, 64) // Tall for wrapped long text
    })
    freezePane(AI분석Sheet)
    XLSX.utils.book_append_sheet(workbook, AI분석Sheet, 'AI분석')
  }
  
  // [결론및제안] A: 18, B: 60 (wide for text, no merge)
  const 종합의견 = financials.roi > 20 ? '사업 추진 적합' : financials.roi > 12 ? '조건부 추진 검토' : '추가 검토 필요'
  const 결론요약 = `검토 결과, 상기 대상지(${input.siteArea.toLocaleString()}㎡)는 ${input.layout.name} 적용 시 지상 ${input.layout.floors}층 규모, 총 ${input.layout.units}세대의 공동주택 개발이 가능한 것으로 분석됩니다.`
  const 권고문구 = financials.roi > 20 
    ? '본 대상지는 초기 검토 결과 사업성이 양호한 것으로 분석됩니다. 본격적인 사업 추진에 앞서 토지 매입가 적정성 검증, 용도지역 및 개발 규제 확인 등 후속 검토를 진행하시기 바랍니다.'
    : financials.roi > 12 
      ? '본 대상지는 기본적인 수익성이 확보되나, 사업성 개선 여지가 있는 것으로 분석됩니다. 토지 매입가 협상, 설계 최적화 등을 통해 수익성 개선을 권고드립니다.'
      : '현 조건 기준 수익성 확보에 유의가 필요한 것으로 분석됩니다. 토지 매입가 재협상, 대안 배치 검토 등 사업구조 개선 방안을 검토하시기 바랍니다.'
  
  // Build data - A: 18, B: 60 (wide B column, no merge)
  const 결론및제안Data: (string)[][] = [
    ['항목', '내용'],
    ['종합의견', 종합의견],
    [''],
    ['[결론 요약]', ''],
    ['요약', 결론요약],
    [''],
    ['[권고사항]', ''],
    ['권고', 권고문구],
  ]
  
  const 결론및제안Sheet = XLSX.utils.aoa_to_sheet(결론및제안Data)
  setCols(결론및제안Sheet, [18, 60]) // A: 18, B: 60 for long text
  setRowHeights(결론및제안Sheet, { 
    0: 28,  // Header
    1: 32,  // 종합의견
    3: 26,  // [결론 요약] section
    4: 84,  // 요약 - very tall for long wrapped text
    6: 26,  // [권고사항] section
    7: 84   // 권고 - very tall for long wrapped text
  })
  freezePane(결론및제안Sheet)
  XLSX.utils.book_append_sheet(workbook, 결론및제안Sheet, '결론및제안')
  
  // [고정설정] A: 18, B: 32
  const 고정설정Sheet = XLSX.utils.aoa_to_sheet([
    ['항목', '설정값'],
    ['브랜드명', DEFAULT_FIXED_SETTINGS.브랜드명],
    ['영문 부제', DEFAULT_FIXED_SETTINGS.영문부제],
    ['PDF 방식', DEFAULT_FIXED_SETTINGS.PDF방식],
    ['한글 폰트', DEFAULT_FIXED_SETTINGS.한글폰트],
  ])
  setCols(고정설정Sheet, [18, 32])
  setRowHeight(고정설정Sheet, 0, 28)
  freezePane(고정설정Sheet)
  XLSX.utils.book_append_sheet(workbook, 고정설정Sheet, '고정설정')
  
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
}

// ============================================================================
// Import Excel File and Return ReportSummaryInput
// ============================================================================

export async function importExcelFile(file: File): Promise<ReportSummaryInput> {
  const arrayBuffer = await file.arrayBuffer()
  const reportData = parseExcelToReportData(arrayBuffer)
  return reportDataToSummaryInput(reportData)
}

// ============================================================================
// Download Excel Export
// ============================================================================

export function downloadExcelExport(
  input: ReportSummaryInput,
  financials: {
    landCost: number
    constructionCost: number
    softCost: number
    totalInvestment: number
    projectedRevenue: number
    profit: number
    roi: number
    breakEvenRate: number
  },
  dateStr: string,
  docNumber: string,
  filename: string = '사업성검토보고서_데이터.xlsx'
): void {
  const buffer = exportReportToExcel(input, financials, dateStr, docNumber)
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
