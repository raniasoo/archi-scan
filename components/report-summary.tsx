"use client"
// @version STABLE-v195-png-fix | @checkpoint release-candidate | 2026-04-30

import { useRef, useState, useEffect } from "react"
import { generateSitePlanSvg, generateSectionSvg, generateIsometricSvg, generateElevationSvg, generatePerspectiveSvg, generateFloorPlanSvg, svgToImgTag } from "@/lib/report-drawings"
import { calculateFeasibility } from "@/lib/project-analysis-state"
import { evaluatePatternQuality } from "@/lib/pattern-quality"
// Card components replaced with native divs for isolated styling
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { 
  FileText, 
  Download, 
  MapPin, 
  Ruler, 
  Building2, 
  Layers, 
  Car, 
  Banknote,
  TrendingUp,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Table,
  Award,
  Printer,
  Loader2,
  Sparkles
} from "lucide-react"
import { downloadExcelExport } from "@/lib/report-excel-utils"
import { 
  type BrandingConfig, 
  DEFAULT_BRANDING, 
  formatBrandFullName, 
  formatFooterContactLine,
  formatCoverContactBlock 
} from "@/lib/branding-config"
import {
  type SiteVisualsConfig,
  EMPTY_SITE_VISUALS,
  hasSiteMap,
  hasSitePhotos,
} from "@/lib/site-visuals-config"
import {
  type FinancialScenariosConfig,
  EMPTY_SCENARIOS_CONFIG,
  hasScenarios,
  getScenarioSummary,
  getROIStatusClass,
} from "@/lib/financial-scenarios-config"
import { FinancialScenarioComparison } from "@/components/financial-scenario-comparison"
import { ARCHISCAN_COPY } from "@/constants/archiscan-copy"

interface LayoutScores {
  regulationCompliance: number
  profitability: number
  marketability: number
  feasibility: number
  overall: number
}

interface LayoutRecommendation {
  isRecommended: boolean
  reasons: string[]
  warnings: string[]
  strategyMatch: number
}

interface AIReasoning {
  summary: string
  regulationConsiderations: string[]
  profitabilityAdvantages: string[]
  designFeatures: string[]
  risksAndChallenges: string[]
}

interface LayoutOption {
  id: number
  name: string
  type: "tower" | "courtyard" | "lshape" | "linear" | "cluster"
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

interface ZoningRegulation {
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

// Centralized feasibility result type from project-analysis-state
interface CentralizedFeasibilityResult {
  landCost: number
  constructionCost: number
  softCost: number
  totalCost: number
  salesPricePerM2: number
  totalRevenue: number
  profit: number
  roi: number
  breakevenSalePrice: number
  premiumRate: number
  projectDuration: number
  feasibilityGrade: 'excellent' | 'good' | 'normal' | 'poor' | 'critical'
  feasibilityLabel: string
  mainIssues: string[]
  improvements: string[]
}

interface ReportSummaryProps {
  layout: LayoutOption
  address: string
  siteArea: number
  gfa: number
  allLayouts?: LayoutOption[]
  regulation?: ZoningRegulation
  branding?: BrandingConfig
  siteVisuals?: SiteVisualsConfig
  financialScenarios?: FinancialScenariosConfig
  onScenariosChange?: (config: FinancialScenariosConfig) => void
  landPricePerM2?: number
  molitData?: { zoneCode?: string; roadWidth?: number; heightLimit?: number | null; hasDistrictPlan?: boolean }
  // NEW: Centralized feasibility result from parent
  feasibilityResult?: CentralizedFeasibilityResult | null
  // Alexander pattern quality
  userValues?: { profitVsQuality: number; privacyVsCommunity: number; efficiencyVsSpace: number; selectedPatterns: string[] }
  designStrategy?: string
  aiRenderImage?: string | null
  sitePolygon?: { coords: [number, number][]; centroid: [number, number] } | null
}

function formatKRW(value: number): string {
  if (value >= 100000000) {
    const billions = value / 100000000
    return billions >= 100 ? `${Math.round(billions)}억원` : `${billions.toFixed(1)}억원`
  }
  if (value >= 10000) {
    return `${Math.round(value / 10000).toLocaleString()}만원`
  }
  return `${value.toLocaleString()}원`
}

/**
 * Local fallback calculation for report - matches project-analysis-state.ts calculateFeasibility
 * IMPORTANT: Keep in sync with lib/project-analysis-state.ts calculateFeasibility
 */
function calculateFinancials(siteArea: number, layout: LayoutOption, landPricePerM2?: number, salesPricePerM2?: number, constructionCostPerM2?: number) {
  // calculateFeasibility와 동일한 공식 사용 (ROI 불일치 방지)
  const result = calculateFeasibility({
    siteArea,
    grossFloorArea: layout.gfa || Math.round(siteArea * (layout.coverage / 100) * layout.floors),
    unitCount: layout.units,
    floorCount: layout.floors,
    parkingCount: layout.parking,
    landPricePerM2: landPricePerM2 || 5000000,
    salesPricePerM2: salesPricePerM2 || undefined,
    constructionCostPerM2: constructionCostPerM2 || undefined,
  })
  return {
    gfa: result.grossFloorArea || layout.gfa,
    landCost: result.landCost,
    constructionCost: result.constructionCost,
    softCost: result.softCost,
    totalInvestment: result.totalCost,
    projectedRevenue: result.totalRevenue,
    profit: result.profit,
    roi: result.roi,
    breakEvenRate: result.totalCost > 0 ? (result.totalCost / result.totalRevenue * 100) : 0,
  }
}

function getRecommendedLayout(layouts: LayoutOption[], siteArea: number): LayoutOption {
  let bestLayout = layouts[0]
  let bestScore = 0
  
  // Safe access with fallback for empty layouts
  if (!layouts || layouts.length === 0) {
    return null
  }
  
  layouts.forEach(layout => {
    const financials = calculateFinancials(siteArea, layout, landPricePerM2)
    const roiScore = Math.min(financials.roi / 25, 1) * 40
    const maxUnits = Math.max(...layouts.map(l => l.units), 1)
    const maxParkingRatio = Math.max(...layouts.map(l => l.parking / Math.max(l.units, 1)), 1)
    const unitScore = (layout.units / maxUnits) * 30
    const parkingScore = ((layout.parking / Math.max(layout.units, 1)) / maxParkingRatio) * 30
    const score = roiScore + unitScore + parkingScore
    
    if (score > bestScore) {
      bestScore = score
      bestLayout = layout
    }
  })
  
  return bestLayout
}

export function ReportSummary({ layout, address, siteArea, gfa, allLayouts, regulation, branding, siteVisuals, financialScenarios, onScenariosChange, landPricePerM2, molitData, feasibilityResult: externalFeasibility, userValues, designStrategy, aiRenderImage, sitePolygon }: ReportSummaryProps) {
  // molitData 우선 적용 — regulation race condition 방지
  // regulation 한도(buildingCoverageLimit/farLimit)에서 용도지역 역추정 (zone-lookup 미완료 시 안전장치)
  const inferZoneFromLimits = (coverage?: number, far?: number): string => {
    if (!coverage || !far) return ''
    if (far >= 1300 && coverage >= 80) return 'commercial-general'
    if (far >= 1400 && coverage >= 90) return 'commercial-central'
    if (far >= 800 && coverage >= 70) return 'commercial-neighborhood'
    if (far >= 400 && coverage >= 70) return 'semi-residential'
    if (far >= 250 && coverage >= 50) return 'residential-3'
    if (far >= 200 && coverage >= 50) return 'residential-2'
    if (far >= 100 && coverage >= 50) return 'residential-1'
    if (far >= 300 && coverage >= 70) return 'industrial-general'
    return ''
  }
  const zoneFromMolit = molitData?.zoneCode || ''
  const zoneFromRegulation = regulation?.zoneType || ''
  const zoneFromLimits = inferZoneFromLimits(regulation?.maxCoverageRatio, regulation?.maxFloorAreaRatio)
  const effectiveZoneType = zoneFromMolit || zoneFromRegulation || zoneFromLimits || 'residential-2'
  const effectiveRoadWidth = molitData?.roadWidth || regulation?.roadWidth || 8
  const effectiveMaxHeight = molitData?.heightLimit || regulation?.maxHeight || 30
  const effectiveMaxFloors = molitData?.heightLimit ? Math.floor(molitData.heightLimit / 3.3) : regulation?.maxFloors || 10
  const effectiveHasDistrict = molitData?.hasDistrictPlan ?? regulation?.additionalNotes?.includes('지구단위') ?? false
  const ZONE_MAP: Record<string, string> = {
    'residential-exclusive-1': '제1종 전용주거지역', 'residential-exclusive-2': '제2종 전용주거지역',
    'residential-1': '제1종 일반주거지역', 'residential-2': '제2종 일반주거지역',
    'residential-3': '제3종 일반주거지역', 'semi-residential': '준주거지역',
    'commercial-general': '일반상업지역', 'commercial-neighborhood': '근린상업지역',
    'commercial-central': '중심상업지역', 'industrial-general': '일반공업지역',
    'green-natural': '자연녹지지역',
  }
  const effectiveZoneLabel = ZONE_MAP[effectiveZoneType] || effectiveZoneType
  const effectiveRoadLabel = `${effectiveRoadWidth}m 이상 도로 접함`
  // Use provided branding or default
  const brandConfig = branding || DEFAULT_BRANDING
  // Use provided site visuals or empty
  const visualsConfig = siteVisuals || EMPTY_SITE_VISUALS
  // Use provided financial scenarios or empty
  const scenariosConfig = financialScenarios || EMPTY_SCENARIOS_CONFIG
  const printRef = useRef<HTMLDivElement>(null)
  
  // Use centralized feasibility result if provided, otherwise calculate with SAME formula as FinancialAnalysis
  const centralFeasibility = externalFeasibility || calculateFeasibility({
    siteArea, grossFloorArea: gfa || layout.gfa, unitCount: layout.units,
    floorCount: layout.floors, parkingCount: layout.parking,
    landPricePerM2: landPricePerM2 || 5000000,
  })
  const effectiveSalesPrice = centralFeasibility.salesPricePerM2 || 8000000
  const effectiveConstCost = centralFeasibility.constructionCostPerM2 || 2500000
  const financials = {
    gfa: gfa || centralFeasibility.grossFloorArea || layout.gfa,
    landCost: centralFeasibility.landCost,
    constructionCost: centralFeasibility.constructionCost,
    softCost: centralFeasibility.softCost,
    totalInvestment: centralFeasibility.totalCost,
    projectedRevenue: centralFeasibility.totalRevenue,
    profit: centralFeasibility.profit,
    roi: centralFeasibility.roi,
    breakEvenRate: centralFeasibility.totalCost > 0 
      ? (centralFeasibility.totalCost / centralFeasibility.totalRevenue * 100) 
      : 0,
  }
  const [mounted, setMounted] = useState(false)
  const [dateStr, setDateStr] = useState("")
  const [docNumber, setDocNumber] = useState("")
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [downloadComplete, setDownloadComplete] = useState(false)
  
  useEffect(() => {
    setMounted(true)
    const today = new Date()
    setDateStr(`${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`)
    setDocNumber(`AS-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}-${String(Date.now()).slice(-6)}`)
  }, [])
  
  // FAR = (연면적 / 대지면적) * 100 for percentage display
  const far = ((gfa / siteArea) * 100).toFixed(1)
  const estimatedTimeline = layout.floors > 8 ? "24~30개월" : layout.floors > 5 ? "18~24개월" : "14~18개월"
  
  // NOTE: 'financials' is already defined above using externalFeasibility when available
  // DO NOT redefine here - this was causing data inconsistency between screens
  
  const layouts = allLayouts || [layout]
  // AI 추천: ROI 기준 최적 배치안 자동 선택 (사용자 선택과 무관)
  let recommendedLayout = layout
  if (layouts.length > 1) {
    let bestROI = -Infinity
    for (const l of layouts) {
      const f = calculateFinancials(siteArea, l, landPricePerM2, externalFeasibility?.salesPricePerM2, externalFeasibility?.constructionCostPerM2)
      if (f.roi > bestROI) {
        bestROI = f.roi
        recommendedLayout = l
      }
    }
  }
  const isRecommended = layout.id === recommendedLayout.id

  // 섹션 번호 동적 계산 (단일 배치안: 4번 비교 섹션 없어서 5~9→4~8)
  const sn = (n: number) => layouts.length > 1 ? n : n <= 3 ? n : n - 1

  // Generate HTML report for download - properly formatted with Korean support
  const handleDownloadReport = async () => {
    console.log("[v0] HTML 보고서 생성 시작")
    
    // 도면 SVG → PNG 변환 (인라인 — tree-shaking 방지)
    const convertSvgToPng = async (svgStr: string): Promise<string> => {
      const W = 720, H = 600
      const canvas = document.createElement("canvas")
      canvas.width = W; canvas.height = H
      const ctx = canvas.getContext("2d")
      if (!ctx) return `<div style="width:100%;height:200px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:11px;">도면은 앱에서 확인하세요</div>`
      ctx.fillStyle = "#f8fafc"
      ctx.fillRect(0, 0, W, H)
      // SVG에 명시적 크기 주입
      let fixed = svgStr.replace(/<svg\s/, `<svg width="${W}" height="${H}" `)
      fixed = fixed.replace(/style="[^"]*"/g, (m) => {
        const cleaned = m.replace(/width[^;]*;?/g, "").replace(/max-width[^;]*;?/g, "")
        return cleaned === 'style=""' ? "" : cleaned
      })
      const blob = new Blob([fixed], { type: "image/svg+xml;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const img = new Image(); img.width = W; img.height = H
      const dataUrl = await new Promise<string>((resolve) => {
        const timer = setTimeout(() => { URL.revokeObjectURL(url); resolve("") }, 5000)
        img.onload = () => { clearTimeout(timer); ctx.drawImage(img, 0, 0, W, H); URL.revokeObjectURL(url); resolve(canvas.toDataURL("image/png")) }
        img.onerror = () => { clearTimeout(timer); URL.revokeObjectURL(url); resolve("") }
        img.src = url
      })
      if (!dataUrl) return `<div style="width:100%;height:200px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:11px;">도면은 앱에서 확인하세요</div>`
      return `<img src="${dataUrl}" style="width:100%;max-width:360px;border-radius:6px;border:1px solid #e2e8f0;" />`
    }

    const drawingInput = {
      siteArea, buildingCoverage: layout.coverage, floors: layout.floors,
      units: layout.units, parking: layout.parking, type: layout.type,
      roadWidth: regulation?.roadWidth ?? 8, heightLimit: regulation?.maxHeight ?? 30,
      setbacks: { front: regulation?.setbackFront ?? 1, side: regulation?.setbackSide ?? 0.5, rear: regulation?.setbackRear ?? 1 },
      layoutName: layout.name, gfa, sitePolygon,
    }
    
    let sitePlanImg = '', sectionImg = '', isoImg = '', elevImg = '', perspImg = '', floorPlanImg = ''
    try {
      const results = await Promise.all([
        convertSvgToPng(generateSitePlanSvg(drawingInput)),
        convertSvgToPng(generateSectionSvg(drawingInput)),
        convertSvgToPng(generateIsometricSvg(drawingInput)),
        convertSvgToPng(generateElevationSvg(drawingInput)),
        convertSvgToPng(generatePerspectiveSvg(drawingInput)),
        convertSvgToPng(generateFloorPlanSvg(drawingInput)),
      ])
      sitePlanImg = results[0]; sectionImg = results[1]; isoImg = results[2]; elevImg = results[3]; perspImg = results[4]; floorPlanImg = results[5]
    } catch {
      sitePlanImg = svgToImgTag(generateSitePlanSvg(drawingInput))
      sectionImg = svgToImgTag(generateSectionSvg(drawingInput))
      isoImg = svgToImgTag(generateIsometricSvg(drawingInput))
      elevImg = svgToImgTag(generateElevationSvg(drawingInput))
      perspImg = svgToImgTag(generatePerspectiveSvg(drawingInput))
      floorPlanImg = svgToImgTag(generateFloorPlanSvg(drawingInput))
    }
    
    const htmlContent = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>1차 사업성 검토 보고서 - ${address}</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Noto Sans KR', 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1a1a1a;
      background: #fff;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    @media print {
      body { padding: 0; }
      @page { size: A4; margin: 12mm 15mm; }
      /* 그리드 카드 레이아웃 print 강제 적용 */
      .grid-2 { display: grid !important; }
      .ai-score-grid { display: grid !important; grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; margin-bottom: 12px !important; }
      .ai-score-card { display: block !important; background: #f8fafc !important; border: 1px solid #e2e8f0 !important; border-radius: 6px !important; padding: 10px 8px !important; text-align: center !important; break-inside: avoid !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; width: 100% !important; min-width: 0 !important; }
      .stat-box { display: block !important; background: #f8fafc !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      /* 섹션 제목 + 바로 다음 요소 함께 묶기 */
      .section-title { page-break-after: avoid !important; break-after: avoid !important; }
      .section-title + * { page-break-before: avoid !important; break-before: avoid !important; }
      /* 섹션 단위 분할 — 주요 섹션 앞에서 끊기 */
      .section { page-break-inside: auto; }
      .page-break-before { page-break-before: always !important; break-before: page !important; }
      /* 카드/박스 내부 분할 방지 */
      .ai-score-card { page-break-inside: avoid; break-inside: avoid; }
      .risk-box { page-break-inside: avoid; break-inside: avoid; }
      .stat-box.small { page-break-inside: avoid; break-inside: avoid; }
      .highlight { page-break-inside: avoid; break-inside: avoid; }
      /* 플로팅 UI 숨김 */
      .no-print { display: none !important; }
      /* 표지 print */
      .cover { -webkit-print-color-adjust: exact; print-color-adjust: exact; page-break-after: always; }
      /* 고아 줄 방지 */
      p { orphans: 3; widows: 3; }
      /* 테이블 행 분할 방지 */
      tr { page-break-inside: avoid; break-inside: avoid; }
      /* 섹션 여백 축소 (인쇄 시) */
      .section { margin-bottom: 16px; }
      /* 커버 뒤 빈 페이지 방지 */
      .cover + .section { page-break-before: auto; }
    }
    @media screen and (max-width: 600px) {
      body { padding: 8px; font-size: 9.5pt; }
      /* 표지 - 잘림 완전 방지 */
      .cover { padding: 16px 10px; min-height: auto; overflow: visible; }
      .cover h1 { font-size: 13pt; word-break: keep-all; overflow-wrap: break-word; line-height: 1.3; max-width: 100%; white-space: normal; }
      .cover .address { font-size: 10pt; word-break: break-all; max-width: 100%; line-height: 1.4; }
      .cover .meta { flex-direction: column; gap: 6px; }
      .cover .meta-item { padding: 6px 8px; }
      .cover .subtitle { font-size: 8pt; }
      .cover .project-type { font-size: 9pt; }
      .cover .doc-number { font-size: 7pt; }
      /* 그리드 - 모바일 2열 */
      .grid-2 { grid-template-columns: 1fr 1fr; gap: 5px; }
      .risk-grid { grid-template-columns: 1fr; gap: 6px; }
      /* AI 점수 카드 - 모바일 2x2 */
      .ai-score-grid { grid-template-columns: 1fr 1fr !important; gap: 5px; }
      .ai-score-card { padding: 6px 5px; min-height: 0; }
      /* 5번 섹션 카드 모바일 축소 */
      .stat-box { padding: 5px 4px; min-height: 0; }
      .stat-value { font-size: 10pt; }
      .stat-label { font-size: 7pt; }
      .stat-note { font-size: 7pt; }
      table { font-size: 7.5pt; display: block; overflow-x: auto; white-space: nowrap; }
      th, td { padding: 3px 4px; min-width: 45px; }
      /* 섹션 간격 최소화 */
      .section { margin-bottom: 8px; padding-bottom: 6px; }
      .section:last-child { margin-bottom: 2px; padding-bottom: 0; }
      .section-title { font-size: 10pt; margin-bottom: 6px; padding-bottom: 5px; }
      .section-number { width: 18px; height: 18px; font-size: 9pt; }
      /* 여백 압축 */
      .highlight { padding: 6px 7px; margin: 4px 0; }
      .conclusion { padding: 8px; margin: 6px 0; }
      .feature-tags { gap: 3px; }
      .feature-tag { padding: 2px 5px; font-size: 7pt; }
      /* 제목/주소 잘림 완전 방지 */
      .section-title span { word-break: keep-all; }
      .cover h1, .cover .address { overflow: visible !important; text-overflow: unset !important; white-space: normal !important; }
      /* 리스크/결론 박스 여백 축소 */
      .risk-box { padding: 6px; }
      .risk-title { font-size: 8pt; margin-bottom: 4px; }
      .risk-list li { font-size: 7.5pt; margin-bottom: 2px; }
      /* 도면 이미지 모바일 축소 */
      .drawing-grid img { max-height: 120px; }
    }
    .cover { text-align: center; padding: 60px 20px; margin-bottom: 40px; background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white; border-radius: 8px; }
    .cover h1 { font-size: 24pt; font-weight: 700; margin-bottom: 8px; }
    .cover .subtitle { font-size: 10pt; letter-spacing: 3px; color: #94a3b8; margin-bottom: 20px; }
    .cover .address { font-size: 14pt; font-weight: 500; margin-bottom: 8px; }
    .cover .project-type { font-size: 10pt; color: #cbd5e1; }
    .cover .meta { display: flex; justify-content: center; gap: 40px; margin-top: 30px; }
    .cover .meta-item { text-align: center; }
    .cover .meta-label { font-size: 9pt; color: #94a3b8; margin-bottom: 4px; }
    .cover .meta-value { font-size: 11pt; font-weight: 500; }
    .doc-number { font-size: 9pt; color: #64748b; margin-bottom: 16px; }
    .section { margin-bottom: 18px; }
    .section-header { page-break-after: avoid; break-after: avoid; }
    .section-title { font-size: 12pt; font-weight: 700; color: #1e293b; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; page-break-after: avoid; break-after: avoid; }
    .section-number { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; background: #f1f5f9; border-radius: 4px; font-size: 11pt; color: #475569; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 10pt; }
    th, td { padding: 10px 14px; border: 1px solid #e2e8f0; text-align: left; }
    th { background: #f8fafc; font-weight: 500; color: #475569; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .highlight { background: #f0f9ff; border: 1px solid #bae6fd; padding: 16px; border-radius: 6px; margin: 16px 0; }
    .highlight-title { font-weight: 600; color: #0369a1; margin-bottom: 8px; }
    .warning { background: #fffbeb; border: 1px solid #fde68a; padding: 12px 16px; border-radius: 6px; font-size: 10pt; color: #92400e; margin: 12px 0; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 8px 0; }
    .ai-score-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 12px; }
    .ai-score-card { background: #f8fafc; padding: 12px 8px; border-radius: 6px; border: 1px solid #e2e8f0; text-align: center; break-inside: avoid; }
    .stat-box { background: #f8fafc; padding: 10px 8px; border-radius: 6px; border: 1px solid #e2e8f0; }
    .stat-label { font-size: 8pt; color: #64748b; margin-bottom: 3px; }
    .stat-value { font-size: 14pt; font-weight: 700; color: #1e293b; }
    .stat-note { font-size: 9pt; color: #94a3b8; margin-top: 2px; }
    .badge { display: inline-block; padding: 3px 8px; font-size: 9pt; font-weight: 500; border-radius: 4px; }
    .badge-green { background: #dcfce7; color: #166534; }
    .badge-amber { background: #fef3c7; color: #92400e; }
    .badge-blue { background: #dbeafe; color: #1e40af; }
    .risk-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .risk-box { background: #f8fafc; padding: 14px; border-radius: 6px; }
    .risk-title { font-weight: 600; font-size: 10pt; margin-bottom: 8px; color: #1e293b; }
    .risk-list { list-style: none; padding: 0; }
    .risk-list li { font-size: 9pt; color: #64748b; padding: 3px 0; padding-left: 12px; position: relative; }
    .risk-list li::before { content: "•"; position: absolute; left: 0; color: #94a3b8; }
    .conclusion { padding: 20px; border-radius: 8px; margin: 20px 0; }
    .conclusion-positive { background: #f0fdf4; border: 1px solid #bbf7d0; }
    .conclusion-neutral { background: #f0f9ff; border: 1px solid #bae6fd; }
    .conclusion-caution { background: #fffbeb; border: 1px solid #fde68a; }
    .conclusion-title { font-weight: 700; margin-bottom: 8px; }
    .conclusion-positive .conclusion-title { color: #166534; }
    .conclusion-neutral .conclusion-title { color: #0369a1; }
    .conclusion-caution .conclusion-title { color: #92400e; }
    .conclusion p { font-size: 10pt; color: #475569; line-height: 1.7; }
    .disclaimer { text-align: center; padding: 20px; background: #f8fafc; border-radius: 6px; margin-top: 40px; border: 1px solid #e2e8f0; }
    .disclaimer p { font-size: 9pt; color: #64748b; line-height: 1.6; }
    .disclaimer .brand { margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 10pt; color: #94a3b8; }
    .feature-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .feature-tag { display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; background: #f1f5f9; border-radius: 4px; font-size: 9pt; color: #475569; }
    .total-row { background: #f1f5f9 !important; font-weight: 700; }
    .recommended { background: #eff6ff !important; }
  </style>
</head>
<body>
  <div class="cover">
    <div class="doc-number">문서번호: ${docNumber}</div>
    <div class="subtitle">PRELIMINARY FEASIBILITY REVIEW</div>
    <h1>개발사업 사전검토 보고서</h1>
    <div style="width: 60px; height: 1px; background: #64748b; margin: 20px auto;"></div>
    <div class="address">${address}</div>
    <div class="project-type">공동주택 신축사업</div>
    <div class="meta">
      <div class="meta-item">
        <div class="meta-label">대지면적</div>
        <div class="meta-value">${siteArea.toLocaleString()}㎡</div>
      </div>
<div class="meta-item">
  <div class="meta-label">최종 반영 배치안</div>
  <div class="meta-value">${layout.name}</div>
  </div>
      <div class="meta-item">
        <div class="meta-label">작성일자</div>
        <div class="meta-value">${dateStr}</div>
      </div>
    </div>
  </div>

  ${aiRenderImage ? `
  <div style="margin-bottom: 20px; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; page-break-inside: avoid;">
    <img src="${aiRenderImage}" alt="AI 건축 렌더링" style="width: 100%; max-height: 360px; object-fit: cover; display: block;" />
    <div style="padding: 8px 12px; background: #f8fafc; display: flex; align-items: center; justify-content: space-between;">
      <span style="font-size: 9pt; font-weight: 600; color: #475569;">✨ AI 건축 렌더링</span>
      <span style="font-size: 8pt; color: #94a3b8;">Powered by Gemini</span>
    </div>
  </div>
  ` : ''}

  <div class="section">
    <div class="section-title"><span class="section-number">1</span> 검토 개요</div>
    <p style="margin-bottom: 16px;"><strong>검토 목적</strong></p>
    <p style="padding-left: 16px; border-left: 3px solid #e2e8f0; color: #475569;">
      본 보고서는 상기 대상지에 대한 공동주택 개발사업의 초기 타당성을 검토하기 위하여 작성되었습니다. 
      건축기획 분석 시스템을 활용하여 복수의 배치대안을 수립하고, 각 대안별 규모 및 개략 사업수지를 비교 분석하였습니다.
    </p>
    <div class="grid-2" style="margin-top: 20px;">
      <div class="stat-box">
        <div class="stat-label">검토 기준일</div>
        <div class="stat-value" style="font-size: 11pt;">${dateStr}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">검토 범위</div>
        <div class="stat-value" style="font-size: 11pt;">배치안 수립 및 사업수지 분석</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title"><span class="section-number">2</span> 대상지 분석</div>
    <table>
      <tr><th style="width: 120px;">소재지</th><td>${address}</td></tr>
      <tr><th>대지면적</th><td>${siteArea.toLocaleString()}㎡ (${Math.round(siteArea * 0.3025).toLocaleString()}평)</td></tr>
      <tr><th>토지이용계획</th><td>${regulation ? `${effectiveZoneLabel} <span class="badge badge-blue" style="font-size: 8pt; margin-left: 4px;">적용</span>` : '<span style="color: #94a3b8;">현장 확인 필요</span>'}</td></tr>
      <tr><th>접도 현황</th><td>${regulation ? `${effectiveRoadLabel} <span class="badge badge-blue" style="font-size: 8pt; margin-left: 4px;">적용</span>` : '<span style="color: #94a3b8;">현장 확인 필요</span>'}</td></tr>
      <tr><th>높이제한</th><td>${regulation ? `${effectiveMaxHeight}m / ${effectiveMaxFloors}층 <span class="badge badge-blue" style="font-size: 8pt; margin-left: 4px;">적용</span>` : '<span style="color: #94a3b8;">현장 확인 필요</span>'}</td></tr>
    </table>
    ${hasSiteMap(visualsConfig) || hasSitePhotos(visualsConfig) ? `
    <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
      ${hasSiteMap(visualsConfig) && visualsConfig.siteMap ? `
      <div style="text-align: center; margin-bottom: 16px;">
        <img src="${visualsConfig.siteMap.url}" alt="${visualsConfig.siteMap.caption || '대상지 위치도'}" style="max-width: 80%; height: auto; border-radius: 8px; border: 1px solid #e2e8f0;" />
        <p style="font-size: 9pt; color: #64748b; margin-top: 8px;">${visualsConfig.siteMap.caption || '대상지 위치도'}</p>
      </div>
      ` : ''}
      ${hasSitePhotos(visualsConfig) && visualsConfig.sitePhotos.length > 0 ? `
      <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
        ${visualsConfig.sitePhotos.map((photo, idx) => `
        <div style="text-align: center; flex: 1; min-width: 120px; max-width: 200px;">
          <img src="${photo.url}" alt="${photo.caption || `현장 사진 ${idx + 1}`}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 6px; border: 1px solid #e2e8f0;" />
          <p style="font-size: 8pt; color: #64748b; margin-top: 6px;">${photo.caption || `현장 사진 ${idx + 1}`}</p>
        </div>
        `).join('')}
      </div>
      ` : ''}
    </div>
    ` : ''}
  </div>

  <div class="section">
    <div class="section-title"><span class="section-number">3</span> 법규 검토</div>
    <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
      <span class="badge badge-blue" style="font-size: 9pt;">최종 검토 기준 적용</span>
      ${regulation ? '' : '<span class="badge badge-amber" style="font-size: 9pt;">일부 추정값 포함</span>'}
    </div>
    ${regulation ? `
    <table>
      <tr><th style="width: 120px;">용도지역</th><td>${effectiveZoneLabel}</td></tr>
      <tr><th>접도 폭</th><td>${effectiveRoadWidth}m (${regulation.roadCondition === 'corner' ? '코너 대지 2면 접도' : regulation.roadCondition + ' 이상'})</td></tr>
      <tr><th>이격거리</th><td>전면 ${regulation?.setbackFront ?? 1}m / 측면 ${regulation?.setbackSide ?? 0.5}m / 후면 ${regulation?.setbackRear ?? 1}m</td></tr>
      <tr><th>사선제한</th><td>${regulation.setbackType === 'none' ? '없음' : regulation.setbackType === 'north' ? '북측사선제한' : regulation.setbackType === 'road' ? '도로사선제한' : '복합적용'} ${regulation.setbackType !== 'none' ? '(' + regulation.setbackAngle + '°)' : ''}</td></tr>
    </table>
    ` : `
    <div class="warning">
      ※ 본 검토는 제2종 일반주거지역을 가정하여 작성되었습니다. 정확한 용도지역은 토지이용계획확인서를 통해 반드시 확인하시기 바랍니다.
    </div>
    `}
    <table style="margin-top: 16px;">
      <thead>
        <tr><th>구분</th><th class="text-center">법정 한도</th><th class="text-center">적용 계획</th><th class="text-center">적정 여부</th></tr>
      </thead>
      <tbody>
        <tr><td>건폐율</td><td class="text-center">${regulation ? regulation.maxCoverageRatio : 60}% 이하</td><td class="text-center" style="font-weight: 600;">${layout.coverage}%</td><td class="text-center"><span class="badge ${layout.coverage <= (regulation ? regulation.maxCoverageRatio : 60) ? 'badge-green' : 'badge-amber'}">${layout.coverage <= (regulation ? regulation.maxCoverageRatio : 60) ? '적정' : '초과'}</span></td></tr>
        <tr><td>용적률</td><td class="text-center">${regulation ? regulation.maxFloorAreaRatio : 200}% 이하</td><td class="text-center" style="font-weight: 600;">${far}%</td><td class="text-center"><span class="badge ${parseFloat(far) <= (regulation ? regulation.maxFloorAreaRatio : 200) ? 'badge-green' : 'badge-amber'}">${parseFloat(far) <= (regulation ? regulation.maxFloorAreaRatio : 200) ? '적정' : '초과'}</span></td></tr>
        <tr><td>높이제한</td><td class="text-center">${regulation ? effectiveMaxHeight + 'm / ' + effectiveMaxFloors + '층 이하' : '<span style="color: #d97706;">지구단위/현장 확인</span>'}</td><td class="text-center" style="font-weight: 600;">지상 ${layout.floors}층</td><td class="text-center"><span class="badge ${regulation && layout.floors <= effectiveMaxFloors ? 'badge-green' : 'badge-amber'}">${regulation && layout.floors <= effectiveMaxFloors ? '적정' : (regulation ? '초과 검토' : '확인 필요')}</span></td></tr>
        <tr><td>주차기준</td><td class="text-center">세대당 ${regulation ? regulation.parkingRatio : 1.0}대</td><td class="text-center" style="font-weight: 600;">${layout.parking}대 (${(layout.parking / layout.units).toFixed(2)}대/세대)</td><td class="text-center"><span class="badge ${(layout.parking / layout.units) >= (regulation ? regulation.parkingRatio : 1.0) ? 'badge-green' : 'badge-amber'}">${(layout.parking / layout.units) >= (regulation ? regulation.parkingRatio : 1.0) ? '충족' : '부족'}</span></td></tr>
      </tbody>
    </table>
  </div>

  ${layouts.length > 1 ? `
  <div class="section">
    <div class="section-title"><span class="section-number">4</span> 배치안 비교 검토</div>
    <table>
      <thead>
        <tr><th>배치안</th><th class="text-center">건폐율</th><th class="text-center">층수</th><th class="text-center">세대수</th><th class="text-center">주차대수</th><th class="text-center">수익률</th></tr>
      </thead>
      <tbody>
        ${layouts.map(l => {
          const f = calculateFinancials(siteArea, l, landPricePerM2, effectiveSalesPrice, effectiveConstCost)
          const isRec = l.id === recommendedLayout.id
          return `<tr${isRec ? ' class="recommended"' : ''}>
            <td>${l.name}${isRec ? ' <span class="badge badge-blue">추천</span>' : ''}</td>
            <td class="text-center">${l.coverage}%</td>
            <td class="text-center">${l.floors}층</td>
            <td class="text-center">${l.units}세대</td>
            <td class="text-center">${l.parking}대</td>
            <td class="text-center" style="font-weight: 600;">${f.roi.toFixed(1)}%</td>
          </tr>`
        }).join('')}
      </tbody>
    </table>
    <div class="highlight">
      <div class="highlight-title">검토의견: ${recommendedLayout.name} 배치안 추천</div>
      <p style="font-size: 10pt; color: #475569;">
        상기 배치안은 투자수익률, 세대당 주차대수 확보율, 법정 용적률 활용도 등을 종합적으로 고려할 때 가장 적합한 것으로 판단됩니다.
      </p>
    </div>
  </div>
  ` : ''}

  <div class="section">
    <div class="section-title"><span class="section-number">${layouts.length > 1 ? '5' : '4'}</span> 규모 산정 및 계획 특성</div>
    <div class="highlight" style="padding: 10px 12px; margin: 8px 0;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 8pt; color: #64748b;">선정 배치안</div>
          <div style="font-size: 12pt; font-weight: 700; margin-top: 2px;">${layout.name}</div>
          <div style="font-size: 9pt; color: #64748b; margin-top: 2px;">${layout.description}</div>
        </div>
        ${isRecommended ? '<span class="badge badge-blue">추천</span>' : ''}
      </div>
    </div>
    <div class="grid-2" style="grid-template-columns: repeat(4, 1fr); margin: 8px 0;">
      <div class="stat-box small text-center">
        <div class="stat-label">세대수</div>
        <div class="stat-value">${layout.units}<span style="font-size: 10pt; font-weight: 400;">세대</span></div>
      </div>
      <div class="stat-box small text-center">
        <div class="stat-label">규모</div>
        <div class="stat-value">지상 ${layout.floors}<span style="font-size: 10pt; font-weight: 400;">층</span></div>
      </div>
      <div class="stat-box small text-center">
        <div class="stat-label">주차대수</div>
        <div class="stat-value">${layout.parking}<span style="font-size: 10pt; font-weight: 400;">대</span></div>
      </div>
      <div class="stat-box small text-center">
        <div class="stat-label">건폐율</div>
        <div class="stat-value">${layout.coverage}<span style="font-size: 10pt; font-weight: 400;">%</span></div>
      </div>
    </div>

    <div class="grid-2">
      <div class="stat-box">
        <div class="stat-label">연면적 (추정)</div>
        <div class="stat-value">${gfa.toLocaleString()}㎡</div>
        <div class="stat-note">(${Math.round(gfa * 0.3025).toLocaleString()}평)</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">용적률</div>
        <div class="stat-value">${far}%</div>
        <div class="stat-note">법정 ${regulation?.maxFloorAreaRatio ?? 200}% 기준</div>
      </div>
    </div>

    <p style="margin-top: 12px; font-weight: 500;">배치 특성</p>
    <div class="feature-tags">
      ${layout.features.map(f => `<span class="feature-tag">✓ ${f}</span>`).join('')}
    </div>
  </div>

  <!-- 설계 컨셉/철학 섹션 -->
  <div class="section" id="rpt-s6">
    <div class="section-title"><span class="section-number">${layouts.length > 1 ? '6' : '5'}</span> 설계 컨셉</div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
      <div style="padding: 12px; background: #f0fdf4; border-radius: 8px; border: 1px solid #dcfce7;">
        <p style="font-size: 8pt; color: #64748b; margin-bottom: 4px;">설계 전략</p>
        <p style="font-size: 11pt; font-weight: 700; color: #166534;">${
          designStrategy === 'view-priority' ? '조망 극대화' :
          designStrategy === 'privacy-priority' ? '프라이버시 중심' :
          designStrategy === 'area-maximize' ? '면적 효율 극대화' :
          designStrategy === 'parking-efficient' ? '주차 효율화' :
          designStrategy === 'livability' ? '실거주 최적화' :
          '수익성 극대화'
        }</p>
      </div>
      <div style="padding: 12px; background: #eff6ff; border-radius: 8px; border: 1px solid #dbeafe;">
        <p style="font-size: 8pt; color: #64748b; margin-bottom: 4px;">배치 타입</p>
        <p style="font-size: 11pt; font-weight: 700; color: #1e40af;">${layout.name}</p>
      </div>
    </div>
    <div style="padding: 14px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; line-height: 1.7;">
      <p style="font-size: 9pt; font-weight: 600; color: #1e293b; margin-bottom: 6px;">설계 철학</p>
      <p style="font-size: 8.5pt; color: #374151;">
        본 배치안은 대지면적 ${siteArea}㎡, ${
          (() => {
            const z = regulation?.zoneName || '일반주거지역'
            return z
          })()
        } 조건에서 
        ${layout.name} 형태를 통해 건폐율 ${layout.coverage}%, 용적률 ${Math.round((layout.gfa || gfa) / parseFloat(siteArea || '1') * 100)}%를 
        달성하는 것을 목표로 설계되었습니다.
        지상 ${layout.floors}층, 총 ${layout.units}세대 규모로 주차 ${layout.parking}대를 확보하며,
        ${designStrategy === 'view-priority' ? '조망권 확보와 일조 조건 개선을 최우선으로 고려하여 건물 배치를 최적화했습니다.' :
          designStrategy === 'privacy-priority' ? '세대 간 프라이버시 확보와 소음 차단을 최우선으로 고려하여 세대 배치를 설계했습니다.' :
          designStrategy === 'area-maximize' ? '법적 용적률 한도 내에서 전용면적을 극대화하여 분양 경쟁력을 높이는 데 중점을 두었습니다.' :
          designStrategy === 'parking-efficient' ? '법정 주차대수를 효율적으로 확보하면서 지상 공간 활용도를 높이는 데 중점을 두었습니다.' :
          designStrategy === 'livability' ? '입주자의 실제 생활 편의성과 커뮤니티 공간 확보를 최우선으로 설계했습니다.' :
          '투자수익률(ROI) 극대화를 목표로 시공비 효율과 분양가 경쟁력의 균형을 추구했습니다.'}
      </p>
    </div>
  </div>

  <!-- 설계 도면 섹션 -->
  <div class="section" id="rpt-s7" style="page-break-before: always;">
    <div class="section-title"><span class="section-number">${layouts.length > 1 ? '7' : '6'}</span> 설계 도면</div>
    <div style="margin-bottom: 12px;">
      <p style="font-weight: 600; font-size: 9pt; margin-bottom: 6px; color: #1e293b;">기준층 평면도</p>
      ${floorPlanImg}
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
      <div>
        <p style="font-weight: 600; font-size: 9pt; margin-bottom: 6px; color: #1e293b;">배치도</p>
        ${sitePlanImg}
      </div>
      <div>
        <p style="font-weight: 600; font-size: 9pt; margin-bottom: 6px; color: #1e293b;">단면도</p>
        ${sectionImg}
      </div>
      <div>
        <p style="font-weight: 600; font-size: 9pt; margin-bottom: 6px; color: #1e293b;">아이소메트릭</p>
        ${isoImg}
      </div>
      <div>
        <p style="font-weight: 600; font-size: 9pt; margin-bottom: 6px; color: #1e293b;">입면도</p>
        ${elevImg}
      </div>
    </div>
    <div style="margin-top: 10px;">
      <p style="font-weight: 600; font-size: 9pt; margin-bottom: 6px; color: #1e293b;">투시도</p>
      ${perspImg}
    </div>
    <p style="font-size: 7pt; color: #94a3b8; margin-top: 6px; text-align: center;">※ 도면은 사전검토 단계의 개략적 배치이며, 실시설계 시 변경될 수 있습니다.</p>
  </div>

  <div class="section page-break-before" style="page-break-before: always;">
    <div class="section-title"><span class="section-number">${layouts.length > 1 ? '8' : '7'}</span> 사업성 검토</div>
    <table style="break-before: avoid;">
      <caption style="font-weight: 500; text-align: left; padding: 0 0 8px 0; color: #374151;">사업비 추정</caption>
      <thead>
        <tr><th>항목</th><th class="text-right">금액</th><th>비고</th></tr>
      </thead>
      <tbody>
        <tr><td>토지비</td><td class="text-right" style="font-weight: 500;">${formatKRW(financials.landCost)}</td><td style="font-size: 9pt; color: #94a3b8;">15,000천원/㎡ 적용</td></tr>
        <tr><td>공사비</td><td class="text-right" style="font-weight: 500;">${formatKRW(financials.constructionCost)}</td><td style="font-size: 9pt; color: #94a3b8;">4,500천원/㎡ + 간접비 15%</td></tr>
        ${(feasibilityResult as any)?.earthworkCost > 0 ? `<tr><td>토공비</td><td class="text-right" style="font-weight: 500;">${formatKRW((feasibilityResult as any).earthworkCost)}</td><td style="font-size: 9pt; color: #94a3b8;">경사지 성토/절토</td></tr>` : ''}
        <tr><td>기타비용</td><td class="text-right" style="font-weight: 500;">${formatKRW(financials.softCost)}</td><td style="font-size: 9pt; color: #94a3b8;">설계/감리/인허가 등 8%</td></tr>
        <tr class="total-row"><td style="font-weight: 700;">총 사업비</td><td class="text-right" style="font-size: 13pt; font-weight: 700;">${formatKRW(financials.totalInvestment)}</td><td></td></tr>
      </tbody>
    </table>

    <div class="grid-2" style="grid-template-columns: repeat(3, 1fr); margin-top: 20px;">
      <div class="stat-box">
        <div class="stat-label">총 분양수입</div>
        <div class="stat-value" style="font-size: 13pt;">${formatKRW(financials.projectedRevenue)}</div>
        <div class="stat-note">세대당 ${formatKRW(financials.projectedRevenue / layout.units)}</div>
      </div>
      <div class="stat-box" style="background: ${financials.profit >= 0 ? '#f0fdf4' : '#fef2f2'}; border-color: ${financials.profit >= 0 ? '#bbf7d0' : '#fecaca'};">
        <div class="stat-label" style="color: ${financials.profit >= 0 ? '#166534' : '#991b1b'};">${financials.profit >= 0 ? '예상수익' : '예상손실'}</div>
        <div class="stat-value" style="font-size: 13pt; color: ${financials.profit >= 0 ? '#166534' : '#dc2626'};">${financials.profit < 0 ? '-' : ''}${formatKRW(Math.abs(financials.profit))}</div>
      </div>
      <div class="stat-box" style="background: ${financials.roi >= 0 ? '#eff6ff' : '#fef2f2'}; border-color: ${financials.roi >= 0 ? '#bfdbfe' : '#fecaca'};">
        <div class="stat-label" style="color: ${financials.roi >= 0 ? '#1e40af' : '#991b1b'};">수익률(ROI)</div>
        <div class="stat-value" style="font-size: 13pt; color: ${financials.roi >= 0 ? '#1e40af' : '#dc2626'};">${financials.roi.toFixed(1)}%</div>
        <div class="stat-note">손익분기 분양률: ${financials.breakEvenRate.toFixed(1)}%</div>
      </div>
    </div>

    <div class="stat-box" style="margin-top: 16px;">
      <div class="stat-label">예상 사업기간</div>
      <div style="font-weight: 500; margin-top: 4px;">설계/인허가 6~8개월 + 시공 ${estimatedTimeline} = 총 ${layout.floors > 8 ? '30~38개월' : layout.floors > 5 ? '24~32개월' : '20~26개월'}</div>
    </div>
  </div>

  <div class="section page-break-before" style="page-break-before: always;">
    <div class="section-title"><span class="section-number">${layouts.length > 1 ? '9' : '8'}</span> AI 분석</div>
    <div class="ai-score-grid" style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:12px;">
      <div class="ai-score-card" style="background:#f8fafc;padding:12px 8px;border-radius:6px;border:1px solid #e2e8f0;text-align:center;">
        <div class="stat-label">법규 적합성</div>
        <div class="stat-value">${layout.scores?.regulationCompliance ?? (layout.coverage <= 60 ? 90 : 70)}<span style="font-size: 10pt; font-weight: 400;">점</span></div>
      </div>
      <div class="ai-score-card" style="background:#f8fafc;padding:12px 8px;border-radius:6px;border:1px solid #e2e8f0;text-align:center;">
        <div class="stat-label">사업성</div>
        <div class="stat-value">${layout.scores?.profitability ?? (financials.roi > 20 ? 85 : financials.roi > 12 ? 70 : 55)}<span style="font-size: 10pt; font-weight: 400;">점</span></div>
      </div>
      <div class="ai-score-card" style="background:#f8fafc;padding:12px 8px;border-radius:6px;border:1px solid #e2e8f0;text-align:center;">
        <div class="stat-label">상품성</div>
        <div class="stat-value">${layout.scores?.marketability ?? (financials.roi > 15 ? 78 : 65)}<span style="font-size: 10pt; font-weight: 400;">점</span></div>
      </div>
      <div class="ai-score-card" style="background:#ecfdf5;padding:12px 8px;border-radius:6px;border:1px solid #6ee7b7;text-align:center;">
        <div class="stat-label">종합 점수</div>
        <div class="stat-value" style="color: #166534;">${layout.scores?.overall ?? Math.round((financials.roi > 20 ? 85 : financials.roi > 12 ? 70 : 55) * 0.95)}<span style="font-size: 10pt; font-weight: 400;">점</span></div>
      </div>
    </div>
    
    ${layout.reasoning?.summary ? `
    <div class="highlight" style="margin-bottom: 16px;">
      <div class="highlight-title">AI 분석 요약</div>
      <p style="font-size: 10pt; color: #475569;">${layout.reasoning.summary}</p>
    </div>
    ` : ''}
    
    ${(() => {
      try {
        const pq = evaluatePatternQuality({
          type: layout.type || 'tower',
          name: layout.name,
          coverage: layout.coverage,
          floors: layout.floors,
          units: layout.units || 0,
          parking: layout.parking || 0,
          gfa: layout.gfa,
          siteArea: siteArea,
          strategy: designStrategy || 'profitability',
        }, userValues)
        const topPatterns = [...pq.patterns].sort((a, b) => b.score - a.score).slice(0, 3)
        const pqLabel = userValues?.profitVsQuality != null ? (userValues.profitVsQuality > 60 ? '거주 품질 중심' : userValues.profitVsQuality < 40 ? '수익 극대화' : '균형') : ''
        return `
        <div style="margin-bottom: 16px; background: #ecfdf5; border-left: 3px solid #10b981; border-radius: 6px; padding: 14px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
            <div style="font-size: 10pt; font-weight: 700; color: #065f46;">📖 설계 품질 평가 (Alexander Pattern Language)</div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 28px; height: 28px; border-radius: 6px; background: ${pq.gradeColor}; color: white; font-weight: 900; font-size: 14pt; display: flex; align-items: center; justify-content: center;">${pq.grade}</div>
              <span style="font-size: 12pt; font-weight: 800;">${pq.overallQuality}점</span>
            </div>
          </div>
          <p style="font-size: 9pt; color: #374151; line-height: 1.6; margin-bottom: 12px;">${pq.philosophy}</p>
          
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 10px;">
            ${topPatterns.map(p => `
              <div style="background: white; border: 1px solid #d1fae5; border-radius: 5px; padding: 8px; text-align: center;">
                <div style="font-size: 8pt; color: #6b7280; margin-bottom: 2px;">#${p.id} ${p.nameKr}</div>
                <div style="font-size: 14pt; font-weight: 800; color: ${p.score >= 80 ? '#059669' : p.score >= 60 ? '#2563eb' : '#d97706'};">${p.score}</div>
                <div style="height: 4px; background: #e5e7eb; border-radius: 2px; margin-top: 4px;">
                  <div style="height: 100%; width: ${p.score}%; background: ${p.score >= 80 ? '#10b981' : p.score >= 60 ? '#3b82f6' : '#f59e0b'}; border-radius: 2px;"></div>
                </div>
              </div>
            `).join('')}
          </div>
          
          <div style="display: flex; gap: 12px; font-size: 8pt; color: #6b7280; border-top: 1px solid #d1fae5; padding-top: 8px;">
            <span>패턴 점수: <b>${pq.totalPatternScore}</b>/100</span>
            <span>Living Structure: <b>${pq.totalLivingScore}</b>/100</span>
            ${pqLabel ? `<span>설계 방향: <b>${pqLabel}</b></span>` : ''}
          </div>
        </div>`
      } catch { return '' }
    })()}
    
    ${(layout.recommendation?.reasons?.length ?? 0) > 0 || (layout.recommendation?.warnings?.length ?? 0) > 0 ? `
    <div class="risk-grid">
      ${(layout.recommendation?.reasons?.length ?? 0) > 0 ? `
      <div class="risk-box" style="background: #f0fdf4; border: 1px solid #bbf7d0;">
        <div class="risk-title" style="color: #166534;">추천 이유</div>
        <ul class="risk-list">
          ${(layout.recommendation?.reasons ?? []).map(r => `<li style="color: #166534;">${r}</li>`).join('')}
        </ul>
      </div>
      ` : ''}
      ${(layout.recommendation?.warnings?.length ?? 0) > 0 ? `
      <div class="risk-box" style="background: #fffbeb; border: 1px solid #fde68a;">
        <div class="risk-title" style="color: #92400e;">유의 사항</div>
        <ul class="risk-list">
          ${(layout.recommendation?.warnings ?? []).map(w => `<li style="color: #92400e;">${w}</li>`).join('')}
        </ul>
      </div>
      ` : ''}
    </div>
    ` : ''}
    
    ${(layout.reasoning?.designFeatures?.length ?? 0) > 0 || (layout.reasoning?.risksAndChallenges?.length ?? 0) > 0 ? `
    <div class="risk-grid" style="margin-top: 16px;">
      ${(layout.reasoning?.designFeatures?.length ?? 0) > 0 ? `
      <div class="risk-box">
        <div class="risk-title" style="color: #0369a1;">설계 특징</div>
        <ul class="risk-list">
          ${(layout.reasoning?.designFeatures ?? []).map(f => `<li>${f}</li>`).join('')}
        </ul>
      </div>
      ` : ''}
      ${(layout.reasoning?.risksAndChallenges?.length ?? 0) > 0 ? `
      <div class="risk-box">
        <div class="risk-title" style="color: #92400e;">리스크 및 과제</div>
        <ul class="risk-list">
          ${(layout.reasoning?.risksAndChallenges ?? []).map(r => `<li>${r}</li>`).join('')}
        </ul>
      </div>
      ` : ''}
    </div>
    ` : ''}
    
    ${layout.recommendation?.strategyMatch ? `
    <div class="stat-box" style="margin-top: 12px; text-align: center;">
      <div class="stat-label">전략 부합도</div>
      <div class="stat-value" style="font-size: 14pt; color: ${layout.recommendation.strategyMatch >= 80 ? '#166534' : layout.recommendation.strategyMatch >= 60 ? '#0369a1' : '#92400e'};">${layout.recommendation.strategyMatch}%</div>
    </div>
    ` : ''}
  </div>

  <div class="section">
    <div class="section-title"><span class="section-number">${layouts.length > 1 ? '10' : '9'}</span> 리스크 및 고려사항</div>
    <div class="risk-grid">
      <div class="risk-box">
        <div class="risk-title">토지 관련</div>
        <ul class="risk-list">
          <li>감정평가에 따른 매입가 변동</li>
          <li>소유권 및 권리관계 확인</li>
          <li>토지거래허가구역 해당 여부</li>
        </ul>
      </div>
      <div class="risk-box">
        <div class="risk-title">인허가 관련</div>
        <ul class="risk-list">
          <li>건축위원회 심의에 따른 규모 조정</li>
          <li>환경/교통영향평가 대상 여부</li>
          <li>각종 부담금 발생 가능성</li>
        </ul>
      </div>
      <div class="risk-box">
        <div class="risk-title">시장 관련</div>
        <ul class="risk-list">
          <li>부동산 경기 변동에 따른 분양률 하락</li>
          <li>인근 경쟁 단지 공급 물량</li>
          <li>금리 변동에 따른 금융비용</li>
        </ul>
      </div>
      <div class="risk-box">
        <div class="risk-title">공사 관련</div>
        <ul class="risk-list">
          <li>자재비/인건비 상승</li>
          <li>지반 조건에 따른 추가 비용</li>
          <li>민원에 따른 공사 지연</li>
        </ul>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title"><span class="section-number">${layouts.length > 1 ? '11' : '10'}</span> 결론 및 제안</div>
    
    <div class="stat-box" style="margin-bottom: 20px;">
      <p style="line-height: 1.8;">
        검토 결과, 상기 대상지(${siteArea.toLocaleString()}㎡)는 ${layout.name} 적용 시 
        지상 ${layout.floors}층 규모, 총 <strong>${layout.units}세대</strong>의 공동주택 개발이 가능한 것으로 분석됩니다.
        개략 사업수지 검토 결과, 예상 투자수익률은 <strong>ROI ${financials.roi.toFixed(1)}%</strong> 수준으로 
        ${financials.roi > 20 ? '사업성이 양호한' : financials.roi > 12 ? '기본적인 수익성이 확보되는' : '수익성 확보에 유의가 필요한'} 것으로 판단됩니다.
      </p>
    </div>

    <div class="conclusion ${financials.roi > 20 ? 'conclusion-positive' : financials.roi > 12 ? 'conclusion-neutral' : 'conclusion-caution'}">
      <div class="conclusion-title">${financials.roi > 20 ? '종합의견: 사업 추진 사전검토안으로 적합함' : financials.roi > 12 ? '종합의견: 조건부 추진 검토가 가능한 수준' : '종합의견: 사업구조 개선 후 재검토 권장'}</div>
      <p>
        ${financials.roi > 20 
          ? '본 대상지는 초기 검토 결과 사업성이 양호한 것으로 분석됩니다. 본격적인 사업 추진에 앞서 토지 매입가 적정성 검증, 용도지역 및 개발 규제 확인, 인근 분양시세 및 경쟁 물량 조사, 정밀 사업수지 분석 등 후속 검토를 진행하시기 바랍니다.'
          : financials.roi > 12 
            ? '본 대상지는 기본적인 수익성이 확보되나, 사업성 개선 여지가 있는 것으로 분석됩니다. 토지 매입가 협상, 설계 최적화를 통한 분양면적 확대, 공사비 절감(VE) 방안 검토, 분양가 상향 가능성 검토 등을 통해 수익성 개선을 권고드립니다.'
            : '현 조건 기준 수익성 확보에 유의가 필요한 것으로 분석됩니다. 토지 매입가 재협상, 대안 배치를 통한 규모 최적화, 용도 변경 또는 복합개발 방안 검토, 시장 여건 재검토 등 사업구조 개선 방안을 검토하시기 바랍니다.'}
      </p>
    </div>
  </div>

  <div class="disclaimer">
    <p>
      본 보고서는 사전 검토용 참고자료입니다. 최종 의사결정 전 건축사, 감정평가사 등 전문가 검토를 권장합니다.
    </p>
    <div class="brand">
      <strong>${brandConfig.brandName}</strong>${brandConfig.brandTagline ? ` | ${brandConfig.brandTagline}` : ''}<br/>
      <span style="font-size: 9pt;">${brandConfig.representativeName}${brandConfig.representativeTitle ? ` ${brandConfig.representativeTitle}` : ''} · ${brandConfig.phone} · ${brandConfig.email}</span><br/>
      <span style="font-size: 9pt;">${brandConfig.address}</span><br/>
      <span style="font-size: 8pt; color: #888;">본 보고서는 ${dateStr}에 생성되었습니다</span>
    </div>
  </div>
</body>
</html>`

    // Create blob and download with mobile-friendly fallback
    try {
      console.log("[v0] HTML export: starting download")
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const downloadDate = new Date()
      const fileName = `사업성검토보고서_${address.replace(/\s/g, '_')}_${downloadDate.getFullYear()}${String(downloadDate.getMonth() + 1).padStart(2, '0')}${String(downloadDate.getDate()).padStart(2, '0')}.html`
      
      // Check if we're on mobile
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      console.log("[v0] HTML export: isMobile =", isMobile)
      
      if (isMobile) {
        // Mobile: try to open in new tab first (more reliable on iOS/Android)
        const newWindow = window.open()
        if (newWindow) {
          console.log("[v0] HTML export: opened new window")
          newWindow.document.write(htmlContent)
          newWindow.document.close()
        } else {
          // If popup blocked, try direct navigation
          console.log("[v0] HTML export: popup blocked, trying direct navigation")
          window.location.href = url
        }
      } else {
        // Desktop: standard download approach
        const link = document.createElement('a')
        link.href = url
        link.download = fileName
        link.style.display = 'none'
        document.body.appendChild(link)
        link.click()
        
        // Clean up after a short delay
        setTimeout(() => {
          document.body.removeChild(link)
          URL.revokeObjectURL(url)
        }, 100)
      }
      console.log("[v0] HTML export: completed successfully")
    } catch (error) {
      console.error("[v0] HTML export error:", error)
      // Fallback: show error to user
      alert('HTML 보고서 다운로드 중 오류가 발생했습니다. 브라우저 설정을 확인해주세요.')
    }
  }

  const handlePrint = () => {
    console.log("[v0] 인쇄 시작")
    window.print()
    console.log("[v0] 인쇄 대화상자 열림")
  }

  const handleDownloadExcel = () => {
    console.log("[v0] Excel 내보내기 시작")
    try {
      const filename = `사업성검토_${address.replace(/\s/g, '_')}.xlsx`
      downloadExcelExport(
        {
          layout,
          address,
          siteArea,
          gfa,
          allLayouts: layouts,
          regulation,
        },
        financials,
        dateStr,
        docNumber,
        filename
      )
      console.log("[v0] Excel 다운로드 완료:", filename)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error("[v0] Excel 생성 실패:", message, error)
      alert(`Excel 생성 실패: ${message}`)
    }
  }

  const handleDownloadPDF = async () => {
    if (isGeneratingPDF) return
    setIsGeneratingPDF(true)
    console.log("[v0] PDF 생성 시작")

    try {
      console.log("[v0] jsPDF 모듈 로딩...")
      const jsPDF = (await import("jspdf")).default
      const pdf = new jsPDF("p", "mm", "a4")
      console.log("[v0] jsPDF 인스턴스 생성 완료")
      
      // Helper function for safe Base64 encoding of binary data
      const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
        const bytes = new Uint8Array(buffer)
        let binary = ''
        const chunkSize = 8192 // Process in chunks to avoid call stack issues
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.subarray(i, i + chunkSize)
          binary += String.fromCharCode.apply(null, Array.from(chunk))
        }
        return btoa(binary)
      }
      
      // Load and register Korean fonts (Regular + Bold)
      console.log("[v0] 한글 폰트 로딩...")
      const [fontResponse, boldFontResponse] = await Promise.all([
        fetch("/fonts/NotoSansKR-Regular.ttf"),
        fetch("/fonts/NotoSansKR-Bold.ttf")
      ])
      
      if (!fontResponse.ok || !boldFontResponse.ok) {
        throw new Error("폰트 파일을 불러올 수 없습니다.")
      }
      
      const [fontArrayBuffer, boldFontArrayBuffer] = await Promise.all([
        fontResponse.arrayBuffer(),
        boldFontResponse.arrayBuffer()
      ])
      
      const fontBase64 = arrayBufferToBase64(fontArrayBuffer)
      const boldFontBase64 = arrayBufferToBase64(boldFontArrayBuffer)
      
      // Register Regular font
      pdf.addFileToVFS("NotoSansKR-Regular.ttf", fontBase64)
      pdf.addFont("NotoSansKR-Regular.ttf", "NotoSansKR", "normal")
      
      // Register Bold font
      pdf.addFileToVFS("NotoSansKR-Bold.ttf", boldFontBase64)
      pdf.addFont("NotoSansKR-Bold.ttf", "NotoSansKR", "bold")
      
      pdf.setFont("NotoSansKR", "normal")
      
      // Verify font is properly loaded by checking font list
      const fontList = pdf.getFontList()
      console.log("[v0] 등록된 폰트 목록:", Object.keys(fontList))
      if (!fontList["NotoSansKR"]) {
        throw new Error("한글 폰트 등록 실패")
      }
      console.log("[v0] 폰트 로딩 완료 (Regular + Bold)")
      
      // Helper to ensure Korean font is always used
      const setKoreanFont = (style: "normal" | "bold" = "normal") => {
        pdf.setFont("NotoSansKR", style)
      }
      
      // PDF Layout Settings - Optimized for A4 with tighter margins
      const pageWidth = 210
      const pageHeight = 297
      const margin = 12 // Reduced from 20mm to 12mm
      const topMargin = 14 // Top margin
      const bottomMargin = 16 // Bottom margin for footer
      const contentWidth = pageWidth - 2 * margin
      const maxY = pageHeight - bottomMargin - 10 // Maximum Y before page break
      let y = topMargin
      let pageNum = 1
      const sectionNum = layouts.length > 1 ? (n: number) => n : (n: number) => n <= 3 ? n : n - 1

      // Enhanced page break check - prevents orphaned section titles
      const checkPageBreak = (height: number, isSectionStart: boolean = false) => {
        // If section start and not enough space for title + some content, break
        const minSectionSpace = isSectionStart ? 40 : height
        if (y + minSectionSpace > maxY) {
          addFooter()
          pdf.addPage()
          pageNum++
          y = topMargin
        }
      }

      const addFooter = () => {
        pdf.setDrawColor(220, 220, 220)
        pdf.setLineWidth(0.3)
        pdf.line(margin, pageHeight - bottomMargin, pageWidth - margin, pageHeight - bottomMargin)
        setKoreanFont("normal")
        pdf.setFontSize(6.5)
        pdf.setTextColor(130, 130, 130)
        // Use branding config for footer
        const footerBrand = formatBrandFullName(brandConfig)
        const footerContact = formatFooterContactLine(brandConfig)
        pdf.text(footerBrand, margin, pageHeight - bottomMargin + 4)
        pdf.text(footerContact, margin, pageHeight - bottomMargin + 7.5)
        pdf.text(docNumber, pageWidth / 2, pageHeight - bottomMargin + 5.5, { align: "center" })
        pdf.text(`${pageNum}`, pageWidth - margin, pageHeight - bottomMargin + 5.5, { align: "right" })
        pdf.setTextColor(30, 30, 30)
      }

      const drawSectionTitle = (num: number, title: string) => {
        setKoreanFont("bold")
        pdf.setFontSize(10)
        pdf.setTextColor(30, 40, 60)
        pdf.text(`${num}. ${title}`, margin, y)
        y += 1.5
        pdf.setDrawColor(60, 130, 246)
        pdf.setLineWidth(0.6)
        pdf.line(margin, y, margin + 45, y)
        y += 6
        setKoreanFont("normal")
      }

      // === COVER PAGE === (Bright blue gradient style)
      // Background: Bright professional blue #4A6AA0 (between #3A5A8E and #5B7DB3)
      pdf.setFillColor(74, 106, 160)
      pdf.rect(0, 0, pageWidth, 90, "F")
      
      // Document number - visible white text
      setKoreanFont("normal")
      pdf.setFontSize(7.5)
      pdf.setTextColor(220, 228, 240) // Soft white for visibility
      pdf.text(`문서번호: ${docNumber}`, pageWidth / 2, 14, { align: "center" })
      
      // English subtitle - refined
      pdf.setFontSize(8)
      pdf.setTextColor(225, 232, 242) // Slightly brighter
      pdf.text("PRELIMINARY FEASIBILITY REVIEW", pageWidth / 2, 26, { align: "center" })
      
      // Main title - larger, bolder, pure white
      setKoreanFont("bold")
      pdf.setFontSize(23) // 12-18% larger than 20
      pdf.setTextColor(255, 255, 255)
      pdf.text("개발사업 사전검토 보고서", pageWidth / 2, 40, { align: "center" })
      
      // Separator line - refined, shorter, subtle white
      pdf.setDrawColor(180, 195, 220) // Soft white-blue
      pdf.setLineWidth(0.3)
      pdf.line(pageWidth / 2 - 24, 46, pageWidth / 2 + 24, 46)
      
      // Address - pure white
      pdf.setFontSize(12)
      pdf.setTextColor(255, 255, 255)
      pdf.text(address, pageWidth / 2, 56, { align: "center" })
      
      // Project type - clear white
      pdf.setFontSize(8.5)
      pdf.setTextColor(230, 238, 248)
      pdf.text("공동주택 신축사업", pageWidth / 2, 64, { align: "center" })
      
      // Cover stats - semi-transparent white card style
      const statY = 72
      const cardWidth = 50
      const cardHeight = 14
      const cardSpacing = 6
      const totalCardsWidth = 3 * cardWidth + 2 * cardSpacing
      const cardsStartX = (pageWidth - totalCardsWidth) / 2
      
      // Draw 3 info cards with subtle lighter background
      const cardPositions = [
        { x: cardsStartX, label: "대지면적", value: `${siteArea.toLocaleString()}㎡` },
        { x: cardsStartX + cardWidth + cardSpacing, label: "최종 반영 배치안", value: layout.name },
        { x: cardsStartX + 2 * (cardWidth + cardSpacing), label: "작성일자", value: dateStr },
      ]
      
      cardPositions.forEach(card => {
        // Card background - lighter blue overlay (simulated transparency)
        pdf.setFillColor(95, 128, 178) // Lighter blue for card bg
        pdf.setDrawColor(130, 158, 200) // Subtle border
        pdf.setLineWidth(0.2)
        pdf.roundedRect(card.x, statY, cardWidth, cardHeight, 1.5, 1.5, "FD")
        
        // Label - soft white
        pdf.setFontSize(6.5)
        pdf.setTextColor(210, 220, 235)
        pdf.text(card.label, card.x + cardWidth / 2, statY + 4.5, { align: "center" })
        
        // Value - pure white
        pdf.setFontSize(9)
        pdf.setTextColor(255, 255, 255)
        pdf.text(card.value, card.x + cardWidth / 2, statY + 10.5, { align: "center" })
      })
      
      // === COVER BRANDING BLOCK === (Below cover area, on white background)
      const brandingY = 96
      const brandingLines = formatCoverContactBlock(brandConfig)
      
      // Draw subtle separator line
      pdf.setDrawColor(200, 200, 200)
      pdf.setLineWidth(0.2)
      pdf.line(margin, brandingY - 2, pageWidth - margin, brandingY - 2)
      
      // Draw branding text (centered, dark color for white background area)
      setKoreanFont("normal")
      pdf.setFontSize(6.5)
      pdf.setTextColor(80, 90, 110)
      let brandLineY = brandingY
      for (const line of brandingLines) {
        pdf.text(line, pageWidth / 2, brandLineY, { align: "center" })
        brandLineY += 3
      }
      
      pdf.setTextColor(30, 30, 30)
      y = 110 // Start content after cover

      // === SECTION 1: 검토 개요 ===
      drawSectionTitle(1, "검토 개요")
      
      setKoreanFont("bold")
      pdf.setFontSize(8)
      pdf.setTextColor(60, 60, 60)
      pdf.text("검토 목적", margin, y)
      y += 5
      
      setKoreanFont("normal")
      pdf.setFontSize(8)
      pdf.setTextColor(50, 50, 50)
      const purposeText = "본 보고서는 상기 대상지에 대한 공동주택 개발사업의 초기 타당성을 검토하기 위하여 작성되었습니다. 건축기획 분석 시스템을 활용하여 복수의 배치대안을 수립하고, 각 대안별 규모 및 개략 사업수지를 비교 분석하였습니다."
      const splitPurpose = pdf.splitTextToSize(purposeText, contentWidth - 8)
      pdf.text(splitPurpose, margin + 4, y)
      y += splitPurpose.length * 4 + 6
      
      // Info boxes - more compact
      pdf.setFillColor(248, 250, 252)
      pdf.rect(margin, y, contentWidth / 2 - 2, 15, "F")
      pdf.rect(margin + contentWidth / 2 + 2, y, contentWidth / 2 - 2, 15, "F")
      
      setKoreanFont("normal")
      pdf.setFontSize(6.5)
      pdf.setTextColor(100, 116, 139)
      pdf.text("검토 기준일", margin + 3, y + 5)
      pdf.text("검토 범위", margin + contentWidth / 2 + 5, y + 5)
      
      pdf.setFontSize(8)
      pdf.setTextColor(30, 40, 60)
      pdf.text(dateStr, margin + 3, y + 11)
      pdf.text("배치안 수립 및 사업수지 분석", margin + contentWidth / 2 + 5, y + 11)
      y += 20

      // === SECTION 2: 대상지 분석 ===
      checkPageBreak(40, true)
      drawSectionTitle(2, "대상지 분석")
      
      // Use actual regulation data for PDF - same source as HTML report
      const zoneLabel = regulation ? effectiveZoneLabel : '현장 확인 필요'
      
      const roadLabel = regulation ? (
        regulation.roadCondition === 'both' ? '12m 이상 도로 (양면 접도)' :
        regulation.roadCondition === 'corner' ? '8m 이상 도로 (코너)' :
        regulation.roadCondition === 'single' ? `${effectiveRoadWidth}m 이상 도로 접함` :
        `${effectiveRoadWidth}m 도로 접함`
      ) : '현장 확인 필요'
      
      const siteData = [
        ["소재지", address],
        ["대지면적", `${siteArea.toLocaleString()}㎡ (${Math.round(siteArea * 0.3025).toLocaleString()}평)`],
        ["토지이용계획", zoneLabel],
        ["접도 현황", roadLabel],
      ]
      
      setKoreanFont("normal")
      siteData.forEach(([label, value], idx) => {
        pdf.setFillColor(idx % 2 === 0 ? 248 : 255, idx % 2 === 0 ? 250 : 255, idx % 2 === 0 ? 252 : 255)
        pdf.rect(margin, y - 2, contentWidth, 8, "F")
        pdf.setFontSize(8)
        pdf.setTextColor(50, 60, 80)
        pdf.text(label, margin + 3, y + 2)
        pdf.setTextColor(value.includes("확인") ? 130 : 25, value.includes("확인") ? 130 : 30, value.includes("확인") ? 130 : 45)
        pdf.text(value, margin + 38, y + 2)
        y += 8
      })
      y += 5

      // === SITE VISUALS (Optional Extension) ===
      const hasMap = hasSiteMap(visualsConfig)
      const hasPhotos = hasSitePhotos(visualsConfig)
      
      if (hasMap || hasPhotos) {
        // Calculate layout based on available visuals
        const imageHeight = 45
        const imageSpacing = 5
        const totalVisualsHeight = hasMap && hasPhotos 
          ? imageHeight + imageSpacing + imageHeight 
          : imageHeight
        
        checkPageBreak(totalVisualsHeight + 15)
        
        // Site Map
        if (hasMap && visualsConfig.siteMap) {
          try {
            const mapWidth = contentWidth * 0.6
            const mapX = margin + (contentWidth - mapWidth) / 2
            pdf.addImage(visualsConfig.siteMap.url, 'JPEG', mapX, y, mapWidth, imageHeight, undefined, 'MEDIUM')
            y += imageHeight + 2
            setKoreanFont("normal")
            pdf.setFontSize(7)
            pdf.setTextColor(100, 100, 100)
            pdf.text(visualsConfig.siteMap.caption || '대상지 위치도', pageWidth / 2, y, { align: 'center' })
            y += 8
          } catch (e) {
            // Skip if image fails to load
            console.warn('Failed to add site map to PDF:', e)
          }
        }
        
        // Site Photos (grid layout)
        if (hasPhotos && visualsConfig.sitePhotos.length > 0) {
          const photoCount = visualsConfig.sitePhotos.length
          const photoWidth = (contentWidth - (photoCount - 1) * imageSpacing) / photoCount
          const photoHeight = 40
          
          checkPageBreak(photoHeight + 12)
          
          visualsConfig.sitePhotos.forEach((photo, idx) => {
            const photoX = margin + idx * (photoWidth + imageSpacing)
            try {
              pdf.addImage(photo.url, 'JPEG', photoX, y, photoWidth, photoHeight, undefined, 'MEDIUM')
            } catch (e) {
              // Draw placeholder if image fails
              pdf.setFillColor(240, 240, 240)
              pdf.rect(photoX, y, photoWidth, photoHeight, 'F')
            }
          })
          y += photoHeight + 2
          
          // Photo captions
          setKoreanFont("normal")
          pdf.setFontSize(6.5)
          pdf.setTextColor(100, 100, 100)
          visualsConfig.sitePhotos.forEach((photo, idx) => {
            const photoX = margin + idx * (photoWidth + imageSpacing) + photoWidth / 2
            const caption = photo.caption || `현장 사진 ${idx + 1}`
            pdf.text(caption, photoX, y, { align: 'center' })
          })
          y += 8
        }
      }
      
      y += 2

      // === SECTION 3: 법규 검토 ===
      checkPageBreak(55, true)
      // Use actual regulation status for title
      drawSectionTitle(3, regulation ? "법규 검토" : "법규 검토 (추정)")
      
      // Warning box - use actual zone type
      pdf.setFillColor(255, 251, 235)
      pdf.setDrawColor(253, 230, 138)
      pdf.setLineWidth(0.2)
      pdf.rect(margin, y, contentWidth, 10, "FD")
      setKoreanFont("normal")
      pdf.setFontSize(7)
      pdf.setTextColor(146, 64, 14)
      const warningZone = regulation ? zoneLabel : '제2종 일반주거지역'
      pdf.text(`※ 본 검토는 ${warningZone} 기준으로 작성되었습니다. 정확한 용도지역은 토지이용계획확인서를 통해 반드시 확인하시기 바랍니다.`, margin + 3, y + 6)
      y += 14
      
      // Regulation table header - compact
      pdf.setFillColor(248, 250, 252)
      pdf.rect(margin, y - 2, contentWidth, 8, "F")
      setKoreanFont("bold")
      pdf.setFontSize(7.5)
      pdf.setTextColor(50, 60, 80)
      pdf.text("구분", margin + 3, y + 2)
      pdf.text("법정 한도", margin + 45, y + 2)
      pdf.text("적용 계획", margin + 90, y + 2)
      pdf.text("적정 여부", margin + 135, y + 2)
      y += 8
      
      const regRows = [
        ["건폐율", `${regulation?.maxCoverageRatio || 60}% 이하`, `${layout.coverage}%`, layout.coverage <= (regulation?.maxCoverageRatio || 60) ? "적정" : "초과"],
        ["용적률", `${regulation?.maxFloorAreaRatio || 200}% 이하`, `${far}%`, parseFloat(far) <= (regulation?.maxFloorAreaRatio || 200) ? "적정" : "초과"],
        ["높이제한", regulation ? `${effectiveMaxHeight}m / ${effectiveMaxFloors}층 이하` : "지구단위 확인", `지상 ${layout.floors}층`, regulation && layout.floors <= effectiveMaxFloors ? "적정" : (regulation ? "초과 검토" : "확인 필요")],
      ]
      
      setKoreanFont("normal")
      regRows.forEach(([label, limit, plan, status]) => {
        pdf.setDrawColor(230, 230, 230)
        pdf.line(margin, y - 2, margin + contentWidth, y - 2)
        pdf.setFontSize(8)
        pdf.setTextColor(25, 30, 45)
        pdf.text(label, margin + 3, y + 2)
        pdf.text(limit, margin + 45, y + 2)
        pdf.text(plan, margin + 90, y + 2)
        pdf.setTextColor(status === "적정" ? 22 : 146, status === "적정" ? 101 : 64, status === "적정" ? 52 : 14)
        pdf.text(status, margin + 135, y + 2)
        y += 8
      })
      y += 8

      // === SECTION 4: 배치안 비교 검토 (conditional) ===
      if (layouts.length > 1) {
        checkPageBreak(65, true)
        drawSectionTitle(4, "배치안 비교 검토")
        
        // Table header - compact
        pdf.setFillColor(248, 250, 252)
        pdf.rect(margin, y - 2, contentWidth, 8, "F")
        setKoreanFont("bold")
        pdf.setFontSize(7.5)
        pdf.setTextColor(50, 60, 80)
        const tblCols = [margin + 3, margin + 42, margin + 67, margin + 92, margin + 117, margin + 145]
        pdf.text("배치안", tblCols[0], y + 2)
        pdf.text("건폐율", tblCols[1], y + 2)
        pdf.text("층수", tblCols[2], y + 2)
        pdf.text("세대수", tblCols[3], y + 2)
        pdf.text("주차대수", tblCols[4], y + 2)
        pdf.text("수익률", tblCols[5], y + 2)
        y += 8
        
        setKoreanFont("normal")
        layouts.forEach((l) => {
          const f = calculateFinancials(siteArea, l, landPricePerM2, effectiveSalesPrice, effectiveConstCost)
          const isRec = l.id === recommendedLayout.id
          
          if (isRec) {
            pdf.setFillColor(239, 246, 255)
            pdf.rect(margin, y - 2, contentWidth, 8, "F")
          }
          pdf.setDrawColor(230, 230, 230)
          pdf.line(margin, y - 2, margin + contentWidth, y - 2)
          
          pdf.setFontSize(8)
          pdf.setTextColor(25, 30, 45)
          pdf.text(l.name + (isRec ? " [추천]" : ""), tblCols[0], y + 2)
          pdf.text(`${l.coverage}%`, tblCols[1], y + 2)
          pdf.text(`${l.floors}층`, tblCols[2], y + 2)
          pdf.text(`${l.units}세대`, tblCols[3], y + 2)
          pdf.text(`${l.parking}대`, tblCols[4], y + 2)
          // ROI color: green for positive, red for negative
          const roiVal = f.roi
          pdf.setTextColor(roiVal >= 0 ? 22 : 185, roiVal >= 0 ? 101 : 28, roiVal >= 0 ? 52 : 28)
          pdf.text(`${roiVal.toFixed(1)}%`, tblCols[5], y + 2)
          pdf.setTextColor(25, 30, 45)
          y += 8
        })
        y += 4
        
        // Recommendation box - compact
        pdf.setFillColor(240, 249, 255)
        pdf.setDrawColor(186, 230, 253)
        pdf.rect(margin, y, contentWidth, 14, "FD")
        setKoreanFont("bold")
        pdf.setFontSize(8)
        pdf.setTextColor(3, 105, 161)
        pdf.text(`검토의견: ${recommendedLayout.name} 배치안 추천`, margin + 3, y + 5)
        setKoreanFont("normal")
        pdf.setFontSize(7)
        pdf.setTextColor(71, 85, 105)
        pdf.text("상기 배치안은 투자수익률, 세대당 주차대수 확보율, 법정 용적률 활용도 등을 종합 고려 시 가장 적합한 것으로 판단됩니다.", margin + 3, y + 10)
        y += 18
      }

      // === SECTION 5/4: 규모 산정 및 계획 특성 ===
      checkPageBreak(75, true)
      drawSectionTitle(sectionNum(5), "규모 산정 및 계획 특성")
      
      // Selected layout box - compact
      pdf.setFillColor(240, 249, 255)
      pdf.setDrawColor(191, 219, 254)
      pdf.rect(margin, y, contentWidth, 18, "FD")
      setKoreanFont("normal")
      pdf.setFontSize(6.5)
      pdf.setTextColor(100, 116, 139)
      pdf.text("선정 배치안", margin + 3, y + 5)
      pdf.setFontSize(11)
      pdf.setTextColor(30, 40, 60)
      pdf.text(layout.name, margin + 3, y + 12)
      pdf.setFontSize(7)
      pdf.setTextColor(100, 116, 139)
      if (isRecommended) {
        pdf.setFillColor(59, 130, 246)
        pdf.roundedRect(pageWidth - margin - 18, y + 5, 14, 5, 1, 1, "F")
        pdf.setFontSize(5.5)
        pdf.setTextColor(255, 255, 255)
        pdf.text("추천", pageWidth - margin - 11, y + 8.5, { align: "center" })
      }
      y += 22
      
      // Stats grid - compact
      const statsData = [
        { label: "세대수", value: `${layout.units}`, unit: "세대" },
        { label: "규모", value: `지상 ${layout.floors}`, unit: "층" },
        { label: "주차대수", value: `${layout.parking}`, unit: "대" },
        { label: "건폐율", value: `${layout.coverage}`, unit: "%" },
      ]
      const statBoxW = (contentWidth - 6) / 4
      setKoreanFont("normal")
      statsData.forEach((stat, idx) => {
        const sx = margin + idx * (statBoxW + 2)
        pdf.setDrawColor(230, 230, 230)
        pdf.rect(sx, y, statBoxW, 18, "S")
        pdf.setFontSize(6.5)
        pdf.setTextColor(100, 116, 139)
        pdf.text(stat.label, sx + statBoxW / 2, y + 5, { align: "center" })
        pdf.setFontSize(10)
        pdf.setTextColor(30, 40, 60)
        pdf.text(stat.value + stat.unit, sx + statBoxW / 2, y + 13, { align: "center" })
      })
      y += 22
      
      // GFA and FAR - compact
      pdf.setFillColor(248, 250, 252)
      pdf.rect(margin, y, contentWidth / 2 - 2, 18, "F")
      pdf.rect(margin + contentWidth / 2 + 2, y, contentWidth / 2 - 2, 18, "F")
      
      setKoreanFont("normal")
      pdf.setFontSize(6.5)
      pdf.setTextColor(100, 116, 139)
      pdf.text("연면적 (추정)", margin + 3, y + 5)
      pdf.text("용적률", margin + contentWidth / 2 + 5, y + 5)
      
      pdf.setFontSize(10)
      pdf.setTextColor(30, 40, 60)
      pdf.text(`${gfa.toLocaleString()}㎡`, margin + 3, y + 12)
      pdf.text(`${far}%`, margin + contentWidth / 2 + 5, y + 12)
      
      pdf.setFontSize(6.5)
      pdf.setTextColor(148, 163, 184)
      pdf.text(`(${Math.round(gfa * 0.3025).toLocaleString()}평)`, margin + 3, y + 16)
      pdf.text(`법정 ${regulation?.maxFloorAreaRatio ?? 200}% 기준`, margin + contentWidth / 2 + 5, y + 16)
      y += 22
      
      // Features - compact
      setKoreanFont("bold")
      pdf.setFontSize(8)
      pdf.setTextColor(30, 40, 60)
      pdf.text("배치 특성", margin, y)
      y += 6
      
      setKoreanFont("normal")
      let featX = margin
      layout.features.forEach((feature) => {
        const featWidth = pdf.getTextWidth(`✓ ${feature}`) + 6
        if (featX + featWidth > pageWidth - margin) {
          featX = margin
          y += 7
        }
        pdf.setFillColor(241, 245, 249)
        pdf.roundedRect(featX, y - 3.5, featWidth, 6, 1, 1, "F")
        pdf.setFontSize(7)
        pdf.setTextColor(71, 85, 105)
        pdf.text(`✓ ${feature}`, featX + 3, y)
        featX += featWidth + 3
      })
      y += 10

      // === SECTION 6/5: 설계 도면 (배치도 + 단면도 간략) ===
      checkPageBreak(100, true)
      drawSectionTitle(sectionNum(6), "설계 도면")

      // 배치도 (좌측)
      const drawW = (contentWidth - 8) / 2
      const drawH = 70
      const drawX1 = margin
      const drawX2 = margin + drawW + 8
      const drawY = y

      // -- 배치도 --
      setKoreanFont("bold")
      pdf.setFontSize(7)
      pdf.setTextColor(30, 41, 59)
      pdf.text("배치도", drawX1, drawY)

      const siteRW = Math.sqrt(siteArea * 1.25)
      const siteRH = siteArea / siteRW
      const dScale = Math.min((drawW - 10) / siteRW, (drawH - 18) / siteRH)
      const dsW = siteRW * dScale, dsH = siteRH * dScale
      const dsX = drawX1 + (drawW - dsW) / 2, dsY = drawY + 5

      // 대지 경계
      pdf.setDrawColor(59, 130, 246)
      pdf.setLineWidth(0.4)
      pdf.rect(dsX, dsY, dsW, dsH)

      // 이격거리선
      const dfs = (regulation?.setbackFront ?? 1) * dScale
      const dss = (regulation?.setbackSide ?? 0.5) * dScale
      const drs = (regulation?.setbackRear ?? 1) * dScale
      pdf.setDrawColor(34, 211, 238)
      pdf.setLineWidth(0.2)
      // 대시 패턴 — 호환성 위해 수동 대시선
      const dashLen = 1.5, gapLen = 1
      const setbackRect = { x: dsX + dss, y: dsY + drs, w: dsW - dss * 2, h: dsH - dfs - drs }
      for (let dx = 0; dx < setbackRect.w; dx += dashLen + gapLen) {
        const len = Math.min(dashLen, setbackRect.w - dx)
        pdf.line(setbackRect.x + dx, setbackRect.y, setbackRect.x + dx + len, setbackRect.y)
        pdf.line(setbackRect.x + dx, setbackRect.y + setbackRect.h, setbackRect.x + dx + len, setbackRect.y + setbackRect.h)
      }
      for (let dy = 0; dy < setbackRect.h; dy += dashLen + gapLen) {
        const len = Math.min(dashLen, setbackRect.h - dy)
        pdf.line(setbackRect.x, setbackRect.y + dy, setbackRect.x, setbackRect.y + dy + len)
        pdf.line(setbackRect.x + setbackRect.w, setbackRect.y + dy, setbackRect.x + setbackRect.w, setbackRect.y + dy + len)
      }

      // 건물
      const dbW = (dsW - dss * 2) * 0.75
      const dbH = (dsH - dfs - drs) * 0.6
      const dbX = dsX + dss + ((dsW - dss * 2) - dbW) / 2
      const dbY = dsY + drs + ((dsH - dfs - drs) - dbH) / 2
      pdf.setFillColor(219, 234, 254)
      pdf.setDrawColor(37, 99, 235)
      pdf.setLineWidth(0.3)
      pdf.rect(dbX, dbY, dbW, dbH, "FD")

      // 건물 라벨
      setKoreanFont("bold")
      pdf.setFontSize(6)
      pdf.setTextColor(30, 64, 175)
      pdf.text(layout.name, dbX + dbW / 2, dbY + dbH / 2 + 1, { align: "center" })

      // 치수
      pdf.setFontSize(5)
      pdf.setTextColor(239, 68, 68)
      pdf.text(`${siteRW.toFixed(1)}m`, dsX + dsW / 2, dsY - 1, { align: "center" })
      pdf.text(`${siteRH.toFixed(1)}m`, dsX - 2, dsY + dsH / 2, { angle: 90 })

      // -- 단면도 --
      setKoreanFont("bold")
      pdf.setFontSize(7)
      pdf.setTextColor(30, 41, 59)
      pdf.text("단면도", drawX2, drawY)

      const secY = drawY + 5
      const glY = secY + drawH * 0.5
      const totalBldH = 4.5 + (layout.floors - 1) * 3.3
      const secVScale = Math.min((drawH * 0.45) / totalBldH, 1.2)
      const secBldW = drawW * 0.5
      const secBldX = drawX2 + (drawW - secBldW) / 2

      // 지반선
      pdf.setDrawColor(120, 113, 108)
      pdf.setLineWidth(0.5)
      pdf.line(drawX2 + 5, glY, drawX2 + drawW - 5, glY)
      pdf.setFontSize(4)
      pdf.setTextColor(120, 113, 108)
      pdf.text("GL", drawX2 + 3, glY + 1.5)

      // 건물
      const bldTopY = glY - totalBldH * secVScale
      pdf.setFillColor(219, 234, 254)
      pdf.setDrawColor(37, 99, 235)
      pdf.setLineWidth(0.3)
      pdf.rect(secBldX, bldTopY, secBldW, totalBldH * secVScale, "FD")

      // 1층 강조
      const gfPxH = 4.5 * secVScale
      pdf.setFillColor(254, 243, 199)
      pdf.setDrawColor(245, 158, 11)
      pdf.setLineWidth(0.2)
      pdf.rect(secBldX, glY - gfPxH, secBldW, gfPxH, "FD")
      pdf.setFontSize(4.5)
      pdf.setTextColor(146, 64, 14)
      pdf.text("로비", secBldX + secBldW / 2, glY - gfPxH / 2 + 1, { align: "center" })

      // 높이 치수
      pdf.setFontSize(4.5)
      pdf.setTextColor(239, 68, 68)
      pdf.text(`${totalBldH.toFixed(1)}m`, secBldX - 3, bldTopY + (totalBldH * secVScale) / 2, { angle: 90 })

      // 층수
      pdf.setTextColor(100, 116, 139)
      pdf.text(`${layout.floors}F`, secBldX + secBldW + 2, bldTopY + 3)

      y = drawY + drawH + 4

      // === 아이소메트릭 + 입면도 + 투시도: SVG → PNG → jsPDF 삽입 ===
      try {
        const svgToPng = async (svgStr: string, w: number, h: number): Promise<string> => {
          return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas')
            const scale = 2 // 고해상도
            canvas.width = w * scale
            canvas.height = h * scale
            const ctx = canvas.getContext('2d')
            if (!ctx) { reject('Canvas not supported'); return }
            ctx.scale(scale, scale)

            const img = new Image()
            const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
            const url = URL.createObjectURL(svgBlob)
            img.onload = () => {
              ctx.fillStyle = '#f8fafc'
              ctx.fillRect(0, 0, w, h)
              ctx.drawImage(img, 0, 0, w, h)
              URL.revokeObjectURL(url)
              resolve(canvas.toDataURL('image/png'))
            }
            img.onerror = () => { URL.revokeObjectURL(url); reject('SVG render failed') }
            img.src = url
          })
        }

        const drawingInput = {
          siteArea, buildingCoverage: layout.coverage, floors: layout.floors,
          units: layout.units, parking: layout.parking, type: layout.type,
          roadWidth: regulation?.roadWidth ?? 8, heightLimit: regulation?.maxHeight ?? 30,
          setbacks: { front: regulation?.setbackFront ?? 1, side: regulation?.setbackSide ?? 0.5, rear: regulation?.setbackRear ?? 1 },
          layoutName: layout.name, gfa, sitePolygon,
        }

        const isoSvg = generateIsometricSvg(drawingInput)
        const elevSvg = generateElevationSvg(drawingInput)
        const perspSvg = generatePerspectiveSvg(drawingInput)

        const imgW = 360, imgH = 300
        const [isoPng, elevPng, perspPng] = await Promise.all([
          svgToPng(isoSvg, imgW, imgH),
          svgToPng(elevSvg, imgW, imgH),
          svgToPng(perspSvg, imgW, imgH),
        ])

        // 아이소메트릭 + 입면도 (같은 행)
        const imgDrawW = (contentWidth - 6) / 2
        const imgDrawH = imgDrawW * (imgH / imgW)
        checkPageBreak(imgDrawH + 20)

        setKoreanFont("bold")
        pdf.setFontSize(7)
        pdf.setTextColor(30, 41, 59)
        pdf.text("아이소메트릭", margin, y)
        pdf.text("입면도", margin + imgDrawW + 6, y)
        y += 2

        pdf.addImage(isoPng, 'PNG', margin, y, imgDrawW, imgDrawH)
        pdf.addImage(elevPng, 'PNG', margin + imgDrawW + 6, y, imgDrawW, imgDrawH)
        y += imgDrawH + 4

        // 투시도 (전체 너비)
        const perspDrawW = contentWidth
        const perspDrawH = perspDrawW * (imgH / imgW)
        checkPageBreak(perspDrawH + 12)

        setKoreanFont("bold")
        pdf.setFontSize(7)
        pdf.setTextColor(30, 41, 59)
        pdf.text("투시도", margin, y)
        y += 2

        pdf.addImage(perspPng, 'PNG', margin, y, perspDrawW, perspDrawH)
        y += perspDrawH + 4

        console.log("[v0] PDF 도면 5종 삽입 완료")
      } catch (drawErr) {
        console.warn("[v0] PDF 도면 SVG→PNG 변환 실패:", drawErr)
        // fallback: 도면 없이 진행
      }

      pdf.setFontSize(5)
      pdf.setTextColor(148, 163, 184)
      pdf.text("※ 도면은 사전검토 단계의 개략적 배치이며, 실시설계 시 변경될 수 있습니다.", margin, y)
      y += 8

      // === SECTION 7/6: 사업성 검토 ===
      checkPageBreak(85, true)
      drawSectionTitle(sectionNum(7), "사업성 검토")
      
      setKoreanFont("bold")
      pdf.setFontSize(8)
      pdf.setTextColor(30, 40, 60)
      pdf.text("사업비 추정", margin, y)
      y += 6
      
      // Cost table header - compact
      pdf.setFillColor(248, 250, 252)
      pdf.rect(margin, y - 2, contentWidth, 8, "F")
      setKoreanFont("bold")
      pdf.setFontSize(7.5)
      pdf.setTextColor(50, 60, 80)
      pdf.text("항목", margin + 3, y + 2)
      pdf.text("금액", margin + 75, y + 2)
      pdf.text("비고", margin + 115, y + 2)
      y += 8
      
      const costRows = [
        ["토지비", formatKRW(financials.landCost), "15,000천원/㎡ 적용"],
        ["공사비", formatKRW(financials.constructionCost), "4,500천원/㎡ + 간접비 15%"],
        ["기타비용", formatKRW(financials.softCost), "설계/감리/인허가 등 15%"],
      ]
      
      setKoreanFont("normal")
      costRows.forEach(([item, amount, note]) => {
        pdf.setDrawColor(230, 230, 230)
        pdf.line(margin, y - 2, margin + contentWidth, y - 2)
        pdf.setFontSize(8)
        pdf.setTextColor(25, 30, 45)
        pdf.text(item, margin + 3, y + 2)
        pdf.text(amount, margin + 75, y + 2)
        pdf.setTextColor(120, 130, 150)
        pdf.setFontSize(6.5)
        pdf.text(note, margin + 115, y + 2)
        y += 8
      })
      
      // Total row - compact
      pdf.setFillColor(241, 245, 249)
      pdf.rect(margin, y - 2, contentWidth, 9, "F")
      setKoreanFont("bold")
      pdf.setFontSize(8)
      pdf.setTextColor(20, 25, 40)
      pdf.text("총 사업비", margin + 3, y + 3)
      pdf.setFontSize(10)
      pdf.text(formatKRW(financials.totalInvestment), margin + 75, y + 3)
      y += 12
      
      // Revenue boxes - compact
      const revBoxW = (contentWidth - 4) / 3
      
      // Box 1: 총 분양수입
      pdf.setFillColor(248, 250, 252)
      pdf.rect(margin, y, revBoxW, 22, "F")
      setKoreanFont("normal")
      pdf.setFontSize(6.5)
      pdf.setTextColor(80, 90, 110)
      pdf.text("총 분양수입", margin + 3, y + 5)
      pdf.setFontSize(10)
      pdf.setTextColor(20, 30, 50)
      pdf.text(formatKRW(financials.projectedRevenue), margin + 3, y + 13)
      pdf.setFontSize(6)
      pdf.setTextColor(120, 130, 150)
      pdf.text(`세대당 ${formatKRW(financials.projectedRevenue / layout.units)}`, margin + 3, y + 18)
      
      // Box 2: 예상 사업이익 / 손실
      const isProfitable = financials.profit >= 0
      pdf.setFillColor(isProfitable ? 240 : 254, isProfitable ? 253 : 242, isProfitable ? 244 : 242)
      pdf.rect(margin + revBoxW + 2, y, revBoxW, 22, "F")
      setKoreanFont("normal")
      pdf.setFontSize(6.5)
      pdf.setTextColor(isProfitable ? 22 : 185, isProfitable ? 101 : 28, isProfitable ? 52 : 28)
      pdf.text(isProfitable ? "예상수익" : "예상손실", margin + revBoxW + 5, y + 5)
      pdf.setFontSize(10)
      pdf.text(`${isProfitable ? '' : '-'}${formatKRW(Math.abs(financials.profit))}`, margin + revBoxW + 5, y + 13)
      
      // Box 3: 투자수익률
      const isPositiveROI = financials.roi >= 0
      pdf.setFillColor(isPositiveROI ? 239 : 254, isPositiveROI ? 246 : 242, isPositiveROI ? 255 : 242)
      pdf.rect(margin + 2 * (revBoxW + 2), y, revBoxW, 22, "F")
      setKoreanFont("normal")
      pdf.setFontSize(6.5)
      pdf.setTextColor(isPositiveROI ? 30 : 185, isPositiveROI ? 64 : 28, isPositiveROI ? 175 : 28)
      pdf.text("수익률(ROI)", margin + 2 * (revBoxW + 2) + 3, y + 5)
      pdf.setFontSize(10)
      pdf.text(`${financials.roi.toFixed(1)}%`, margin + 2 * (revBoxW + 2) + 3, y + 13)
      pdf.setFontSize(6)
      pdf.setTextColor(100, 116, 139)
      pdf.text(`손익분기 분양률: ${financials.breakEvenRate.toFixed(1)}%`, margin + 2 * (revBoxW + 2) + 3, y + 18)
      y += 26
      
      // Timeline - compact
      pdf.setDrawColor(230, 230, 230)
      pdf.rect(margin, y, contentWidth, 12, "S")
      setKoreanFont("normal")
      pdf.setFontSize(6.5)
      pdf.setTextColor(100, 116, 139)
      pdf.text("예상 사업기간", margin + 3, y + 4)
      pdf.setFontSize(8)
      pdf.setTextColor(30, 40, 60)
      pdf.text(`설계/인허가 6~8개월 + 시공 ${estimatedTimeline} = 총 ${layout.floors > 8 ? '30~38개월' : layout.floors > 5 ? '24~32개월' : '20~26개월'}`, margin + 3, y + 9)
      y += 16

      // === SCENARIO COMPARISON (Optional Extension) ===
      if (hasScenarios(scenariosConfig)) {
        const scenarioRowHeight = 7
        const scenarioHeaderHeight = 10
        const scenarioTotalHeight = scenarioHeaderHeight + (scenariosConfig.scenarios.length * scenarioRowHeight) + 15
        
        checkPageBreak(scenarioTotalHeight)
        
        // Section header
        pdf.setFillColor(248, 250, 252)
        pdf.rect(margin, y, contentWidth, 8, "F")
        pdf.setFontSize(9)
        pdf.setTextColor(30, 58, 138)
        pdf.text("시나리오 분석", margin + 4, y + 5.5)
        y += 12
        
        // Table header
        const scenColWidths = [50, 35, 35, 35, 25]
        const scenColX = [margin, margin + 50, margin + 85, margin + 120, margin + 155]
        
        pdf.setFillColor(241, 245, 249)
        pdf.rect(margin, y, contentWidth, 7, "F")
        pdf.setFontSize(7)
        pdf.setTextColor(71, 85, 105)
        pdf.text("시나리오", scenColX[0] + 2, y + 4.5)
        pdf.text("총 사업비", scenColX[1] + 2, y + 4.5)
        pdf.text("총 분양수입", scenColX[2] + 2, y + 4.5)
        pdf.text("예상 이익", scenColX[3] + 2, y + 4.5)
        pdf.text("ROI", scenColX[4] + 2, y + 4.5)
        y += 8
        
        // Table rows
        scenariosConfig.scenarios.forEach((scenario, idx) => {
          const isOdd = idx % 2 === 1
          if (isOdd) {
            pdf.setFillColor(248, 250, 252)
            pdf.rect(margin, y, contentWidth, scenarioRowHeight, "F")
          }
          
          pdf.setFontSize(7)
          pdf.setTextColor(30, 41, 59)
          pdf.text(scenario.name, scenColX[0] + 2, y + 4.5)
          pdf.text(formatKRW(scenario.totalCost), scenColX[1] + 2, y + 4.5)
          pdf.text(formatKRW(scenario.totalRevenue), scenColX[2] + 2, y + 4.5)
          
          // Profit with color
          if (scenario.profit >= 0) {
            pdf.setTextColor(22, 101, 52)
          } else {
            pdf.setTextColor(185, 28, 28)
          }
          pdf.text(formatKRW(scenario.profit), scenColX[3] + 2, y + 4.5)
          
          // ROI with color based on value
          if (scenario.roi > 20) {
            pdf.setTextColor(22, 101, 52)
          } else if (scenario.roi > 12) {
            pdf.setTextColor(30, 64, 175)
          } else if (scenario.roi > 5) {
            pdf.setTextColor(180, 83, 9)
          } else {
            pdf.setTextColor(185, 28, 28)
          }
          pdf.text(`${scenario.roi.toFixed(1)}%`, scenColX[4] + 2, y + 4.5)
          
          y += scenarioRowHeight
        })
        
        // Note
        y += 3
        pdf.setFontSize(6.5)
        pdf.setTextColor(100, 116, 139)
        pdf.text("* 시나리오 분석은 시장 변동성에 따른 민감도 검토용 참고 자료입니다.", margin, y + 3)
        y += 10
      }

      // === AI ANALYSIS SECTION (Optional) ===
      const hasAIAnalysis = layout.scores || layout.reasoning || layout.recommendation
      if (hasAIAnalysis) {
        checkPageBreak(80, true)
        drawSectionTitle(sectionNum(8), "AI 분석")
        
        // Scores grid - compact
        if (layout.scores) {
          const scoreBoxW = (contentWidth - 6) / 4
          const scoreData = [
            { label: "법규 적합성", value: layout.scores.regulationCompliance ?? 0 },
            { label: "사업성", value: layout.scores.profitability ?? 0 },
            { label: "상품성", value: layout.scores.marketability ?? 0 },
            { label: "종합 점수", value: layout.scores.overall ?? 0 },
          ]
          
          scoreData.forEach((score, idx) => {
            const sx = margin + idx * (scoreBoxW + 2)
            pdf.setDrawColor(226, 232, 240)
            if (idx === 3) { pdf.setFillColor(236, 253, 245); pdf.setDrawColor(110, 231, 183) }
            else pdf.setFillColor(248, 250, 252)
            pdf.roundedRect(sx, y, scoreBoxW, 15, 1.5, 1.5, "FD")
            pdf.setFontSize(6.5)
            pdf.setTextColor(100, 116, 139)
            pdf.text(score.label, sx + scoreBoxW / 2, y + 4, { align: 'center' })
            pdf.setFontSize(10)
            if (score.value >= 80) pdf.setTextColor(22, 101, 52)
            else if (score.value >= 60) pdf.setTextColor(30, 64, 175)
            else pdf.setTextColor(146, 64, 14)
            pdf.text(`${score.value}`, sx + scoreBoxW / 2, y + 11, { align: 'center' })
          })
          y += 18
        }
        
        // AI Summary - compact
        if (layout.reasoning?.summary) {
          pdf.setFillColor(240, 249, 255)
          pdf.setDrawColor(186, 230, 253)
          pdf.rect(margin, y, contentWidth, 14, "FD")
          pdf.setFontSize(7)
          pdf.setTextColor(3, 105, 161)
          pdf.text("AI 분석 요약", margin + 3, y + 4)
          pdf.setFontSize(7)
          pdf.setTextColor(71, 85, 105)
          const summaryLines = pdf.splitTextToSize(layout.reasoning.summary, contentWidth - 6)
          pdf.text(summaryLines.slice(0, 2), margin + 3, y + 9)
          y += 17
        }
        
        // Recommendation reasons and warnings - compact
        const reasons = layout.recommendation?.reasons ?? []
        const warnings = layout.recommendation?.warnings ?? []
        if (reasons.length > 0 || warnings.length > 0) {
          const recBoxW = (contentWidth - 3) / 2
          
          if (reasons.length > 0) {
            pdf.setFillColor(240, 253, 244)
            pdf.rect(margin, y, recBoxW, 20, "F")
            setKoreanFont("bold")
            pdf.setFontSize(7)
            pdf.setTextColor(22, 101, 52)
            pdf.text("추천 이유", margin + 3, y + 4)
            setKoreanFont("normal")
            pdf.setFontSize(6.5)
            reasons.slice(0, 3).forEach((reason, i) => {
              pdf.text(`• ${reason}`, margin + 3, y + 9 + i * 3.5)
            })
          }
          
          if (warnings.length > 0) {
            pdf.setFillColor(255, 251, 235)
            pdf.rect(margin + recBoxW + 3, y, recBoxW, 20, "F")
            setKoreanFont("bold")
            pdf.setFontSize(8)
            pdf.setTextColor(146, 64, 14)
            pdf.text("유의 사항", margin + recBoxW + 8, y + 5)
            setKoreanFont("normal")
            pdf.setFontSize(7)
            warnings.slice(0, 3).forEach((warning, i) => {
              pdf.text(`• ${warning}`, margin + recBoxW + 8, y + 11 + i * 4)
            })
          }
          y += 28
        }
        
        // Design features and risks
        const designFeatures = layout.reasoning?.designFeatures ?? []
        const risksAndChallenges = layout.reasoning?.risksAndChallenges ?? []
        if (designFeatures.length > 0 || risksAndChallenges.length > 0) {
          const featBoxW = (contentWidth - 4) / 2
          
          if (designFeatures.length > 0) {
            pdf.setFillColor(248, 250, 252)
            pdf.rect(margin, y, featBoxW, 24, "F")
            pdf.setFontSize(8)
            pdf.setTextColor(3, 105, 161)
            pdf.text("설계 특징", margin + 4, y + 5)
            pdf.setFontSize(7)
            pdf.setTextColor(71, 85, 105)
            designFeatures.slice(0, 3).forEach((feature, i) => {
              pdf.text(`• ${feature}`, margin + 4, y + 11 + i * 4)
            })
          }
          
          if (risksAndChallenges.length > 0) {
            pdf.setFillColor(248, 250, 252)
            pdf.rect(margin + featBoxW + 4, y, featBoxW, 24, "F")
            pdf.setFontSize(8)
            pdf.setTextColor(146, 64, 14)
            pdf.text("리스크 및 과제", margin + featBoxW + 8, y + 5)
            pdf.setFontSize(7)
            pdf.setTextColor(71, 85, 105)
            risksAndChallenges.slice(0, 3).forEach((risk, i) => {
              pdf.text(`• ${risk}`, margin + featBoxW + 8, y + 11 + i * 4)
            })
          }
          y += 28
        }
        
        // Strategy match
        if (layout.recommendation?.strategyMatch) {
          pdf.setFillColor(248, 250, 252)
          pdf.rect(margin, y, contentWidth, 14, "F")
          pdf.setFontSize(8)
          pdf.setTextColor(100, 116, 139)
          pdf.text("전략 부합도:", margin + 4, y + 9)
          pdf.setFontSize(11)
          const strategyMatch = layout.recommendation.strategyMatch
          if (strategyMatch >= 80) pdf.setTextColor(22, 101, 52)
          else if (strategyMatch >= 60) pdf.setTextColor(30, 64, 175)
          else pdf.setTextColor(146, 64, 14)
          pdf.text(`${strategyMatch}%`, margin + 35, y + 9)
          y += 18
        }
        
        y += 4
      }

      // === SECTION 7/6 or 8/7: 리스크 및 고려사항 ===
      checkPageBreak(55, true)
      drawSectionTitle(hasAIAnalysis ? sectionNum(9) : sectionNum(8), "리스크 및 고려사항")
      
      const risks = [
        { title: "토지 관련", items: ["감정평가에 따른 매입가 변동", "소유권 및 권리관계 확인", "토지���래허가구역 해당 여부"] },
        { title: "인허가 관련", items: ["건축위원회 심의에 따른 규모 조정", "환경/교통영향평가 대상 여부", "각종 부담금 발생 가능성"] },
        { title: "시장 관련", items: ["부동산 경기 변동에 따른 분양률", "인근 경쟁 단지 공급 물량", "금리 변동에 따른 금융비용"] },
        { title: "공사 관련", items: ["자재비/인건비 상승", "지반 조건에 따른 추가 비용", "민원에 따른 공사 지연"] },
      ]
      
      const riskBoxW = (contentWidth - 4) / 2
      risks.forEach((risk, idx) => {
        const rx = margin + (idx % 2) * (riskBoxW + 4)
        const ry = y + Math.floor(idx / 2) * 22
        
        pdf.setFillColor(248, 250, 252)
        pdf.rect(rx, ry, riskBoxW, 20, "F")
        pdf.setFontSize(8)
        pdf.setTextColor(25, 30, 45)
        pdf.text(risk.title, rx + 3, ry + 5)
        
        pdf.setFontSize(6.5)
        pdf.setTextColor(70, 80, 100)
        risk.items.forEach((item, i) => {
          pdf.text(`• ${item}`, rx + 3, ry + 10 + i * 3.5)
        })
      })
      y += 48

      // === SECTION 8/7 or 9/8: 결론 및 제안 ===
      checkPageBreak(55, true)
      drawSectionTitle(hasAIAnalysis ? sectionNum(10) : sectionNum(9), "결론 및 제안")
      
      // Summary box - compact
      pdf.setFillColor(248, 250, 252)
      pdf.rect(margin, y, contentWidth, 18, "F")
      pdf.setFontSize(8)
      pdf.setTextColor(25, 30, 45)
      const conclusionText = `검토 결과, 상기 대상지(${siteArea.toLocaleString()}㎡)는 ${layout.name} 적용 시 지상 ${layout.floors}층 규모, 총 ${layout.units}세대의 공동주택 개발이 가능한 것으로 분석됩니다. 예상 투자수익률은 ${financials.roi.toFixed(1)}% 수준으로 ${financials.roi > 20 ? '사업성이 양호한' : financials.roi > 12 ? '기본적인 수익성이 확보되는' : '수익성 확보에 주의가 필요한'} 것으로 판단됩니다.`
      const splitConclusion = pdf.splitTextToSize(conclusionText, contentWidth - 6)
      pdf.text(splitConclusion, margin + 3, y + 5)
      y += 22
      
      // Recommendation box - compact
      const recColor = financials.roi > 20 ? { bg: [240, 253, 244], border: [187, 247, 208], text: [22, 101, 52] } 
        : financials.roi > 12 ? { bg: [239, 246, 255], border: [191, 219, 254], text: [30, 64, 175] }
        : { bg: [255, 251, 235], border: [253, 230, 138], text: [146, 64, 14] }
      
      pdf.setFillColor(recColor.bg[0], recColor.bg[1], recColor.bg[2])
      pdf.setDrawColor(recColor.border[0], recColor.border[1], recColor.border[2])
      pdf.rect(margin, y, contentWidth, 22, "FD")
      
      setKoreanFont("bold")
      pdf.setFontSize(8)
      pdf.setTextColor(recColor.text[0], recColor.text[1], recColor.text[2])
      const recTitle = financials.roi > 20 ? "종합의견: 사업 추진 적합" : financials.roi > 12 ? "종합의견: 조건부 추진 검토" : "종합의견: 추가 검토 필요"
      pdf.text(recTitle, margin + 3, y + 5)
      
      setKoreanFont("normal")
      pdf.setFontSize(7)
      pdf.setTextColor(50, 60, 80)
      const recText = financials.roi > 20 
        ? "본 대상지는 초기 검토 결과 사업성이 양호한 것으로 분석됩니다. 본격적인 사업 추진에 앞서 토지 매입가 적정성 검증, 용도지역 및 개발 규제 확인, 인근 분양시세 및 경쟁 물량 조사, 정밀 사업수지 분석 등 후속 검토를 진행하시기 바랍니다."
        : financials.roi > 12 
          ? "본 대상지는 기본적인 수익성이 확보되나, 사업성 개선 여지가 있는 것으로 분석됩니다. 토지 매입가 협상, 설계 최적화를 통한 분양면적 확대, 공사비 절감(VE) 방안 검토, 분양가 상향 가능성 검토 등을 통해 수익성 개선을 권고드립니다."
          : "현 조건 기준 수익성 확보에 유의가 필요한 것으로 분석됩니다. 토지 매입가 재협상, 대안 배치를 통한 규모 최적화, 용도 변경 또는 복합개발 방안 검토, 시장 여건 재검토 등 사업구조 개선 방안을 검토하시기 바랍니다."
      const splitRec = pdf.splitTextToSize(recText, contentWidth - 6)
      pdf.text(splitRec, margin + 3, y + 11)
      y += 26

      // === DISCLAIMER === - compact
      checkPageBreak(25)
      pdf.setFillColor(248, 250, 252)
      pdf.rect(margin, y, contentWidth, 22, "F")
      setKoreanFont("normal")
      pdf.setFontSize(6.5)
      pdf.setTextColor(80, 90, 110)
      const disclaimerText = "본 보고서는 개략적인 사전검토를 목적으로 작성된 참고자료이며, 실제 인허가 및 설계 결과와 상이할 수 있습니다. 사업 추진을 위한 의사결정 시에는 건축사, 감정평가사, 세무사, 법무사 등 해당 분야 전문가의 검토를 받으시기 바랍니다."
      const splitDisclaimer = pdf.splitTextToSize(disclaimerText, contentWidth - 6)
      pdf.text(splitDisclaimer, margin + 3, y + 5)
      
      pdf.setDrawColor(230, 230, 230)
      pdf.line(margin + 3, y + 13, margin + contentWidth - 3, y + 13)
      
      pdf.setFontSize(7)
      pdf.setTextColor(100, 110, 130)
      // Use branding config for disclaimer footer
      pdf.text(formatBrandFullName(brandConfig), pageWidth / 2, y + 17, { align: "center" })
      pdf.setFontSize(6.5)
      pdf.text(formatFooterContactLine(brandConfig), pageWidth / 2, y + 20, { align: "center" })

  addFooter()
  console.log("[v0] PDF 파일 저장 중...")
  // 파일명 생성: 주소에서 안전한 문자열로 변환
  const today = new Date()
  const dateStrForFile = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const safeAddress = address
    .replace(/[^\w\s가-힣]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 30)
  const filename = `Archi-Scan_개발사업사전검토보고서_${safeAddress}_${dateStrForFile}.pdf`
  pdf.save(filename)
  console.log("[v0] PDF 다운로드 완료:", filename)
  setDownloadComplete(true)
  // 3초 후 다운로드 완료 상태 초기화
  setTimeout(() => setDownloadComplete(false), 3000)
  } catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error("[v0] PDF 생성 실패:", message, error)
  alert(`PDF 다운로드 중 오류가 발생했습니다: ${message}`)
  } finally {
  setIsGeneratingPDF(false)
  }
  }
  
  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="report-text-muted text-sm">보고서 로딩 중...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="report-wrapper">
      {/* 섹션 네비게이터 */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/50 mb-3 -mx-1 px-1 print:hidden">
        <div className="flex items-center gap-1 py-1.5 overflow-x-auto scrollbar-hide">
          {[
            { id: 'rpt-cover', label: '표지' },
            { id: 'rpt-summary', label: '요약' },
            { id: 'rpt-s1', label: '개요' },
            { id: 'rpt-s2', label: '대상지' },
            { id: 'rpt-s3', label: '법규' },
            { id: 'rpt-s4', label: '배치' },
            { id: 'rpt-s5', label: '규모' },
            { id: 'rpt-s6', label: '설계' },
            { id: 'rpt-s7', label: '도면' },
            { id: 'rpt-s8', label: '사업성' },
            { id: 'rpt-s9', label: 'AI' },
            { id: 'rpt-s10', label: '리스크' },
          ].map(s => (
            <button key={s.id} onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap border border-border/50 bg-card/50 text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors shrink-0">{s.label}</button>
          ))}
        </div>
      </div>

      {/* PDF-Style Report Layout - Premium Light Theme */}
      <div 
        id="report"
        ref={printRef} 
        className="flex flex-col gap-3 sm:gap-5 print:bg-white print:gap-0 print:block"
        style={{ fontFamily: "'Noto Sans KR', 'Malgun Gothic', sans-serif" }}
      >
        {/* Report Cover - Sand Beige & Forest Green Premium */}
        <div className="report-cover-compact overflow-hidden print:mb-4 avoid-break" id="rpt-cover">
          <div className="flex flex-col gap-3 pt-2">
            {/* Header Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" style={{ color: '#2F6B4F' }} />
                <p className="text-[11px] tracking-wider font-semibold" style={{ color: '#2F2A24' }}>Archi-Scan</p>
              </div>
              <p className="text-[10px] font-mono" style={{ color: '#746B5E' }}>{docNumber}</p>
            </div>
            
            {/* Main Title */}
            <div className="text-center py-4">
              <p className="text-[10px] tracking-widest uppercase mb-2" style={{ color: '#2F6B4F' }}>Preliminary Feasibility Review</p>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-2" style={{ color: '#2F2A24' }}>
                개발사업 사전검토 보고서
              </h1>
              <p className="text-sm font-medium" style={{ color: '#2F2A24' }}>{address}</p>
              <p className="text-xs mt-2" style={{ color: '#746B5E' }}>공동주택 신축사업 | {dateStr}</p>
            </div>
            
            {/* Key Info Row */}
            <div className="grid grid-cols-3 gap-2 py-2" style={{ borderTop: '1px solid #DED6C8' }}>
              <div className="text-center">
                <p className="text-[9px] mb-0.5" style={{ color: '#746B5E' }}>대지면적</p>
                <p className="text-xs font-semibold" style={{ color: '#2F2A24' }}>{siteArea.toLocaleString()}㎡</p>
              </div>
              <div className="text-center" style={{ borderLeft: '1px solid #DED6C8', borderRight: '1px solid #DED6C8' }}>
                <p className="text-[9px] mb-0.5" style={{ color: '#746B5E' }}>배치안</p>
                <p className="text-xs font-semibold" style={{ color: '#2F2A24' }}>{layout.name}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] mb-0.5" style={{ color: '#746B5E' }}>작성일</p>
                <p className="text-xs font-semibold" style={{ color: '#2F2A24' }}>{dateStr}</p>
              </div>
            </div>
            
            {/* Branding Footer */}
            <div className="text-center pt-2" style={{ borderTop: '1px solid #DED6C8' }}>
              <p className="text-[10px]" style={{ color: '#746B5E' }}>
                {formatBrandFullName(brandConfig)} | {brandConfig.phone}
              </p>
            </div>
          </div>
        </div>

        {/* AI 건축 렌더링 — 표지 바로 다음 */}
        {aiRenderImage && (
          <div className="report-card avoid-break print-section overflow-hidden">
            <img 
              src={aiRenderImage} 
              alt="AI 건축 렌더링" 
              className="w-full"
              style={{ maxHeight: '320px', objectFit: 'cover' }}
            />
            <div className="px-4 py-2 flex items-center justify-between bg-secondary/20">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" style={{ color: '#7c3aed' }} />
                <span className="text-[10px] font-medium">AI 건축 렌더링</span>
              </div>
              <span className="text-[9px] text-muted-foreground">Powered by Nano Banana (Gemini)</span>
            </div>
          </div>
        )}

        {/* Executive Summary Card - Redesigned */}
        {(() => {
          const safeRoi = Number.isFinite(financials.roi) ? financials.roi : 0
          const safeTotalInvestment = financials.totalInvestment ?? 0
          const safeProjectedRevenue = financials.projectedRevenue ?? 0
          const safeProfit = financials.profit ?? 0
          
          return (
            <div className="report-card avoid-break print-section">
              <div className="p-4 sm:p-5 space-y-4">
                {/* Section Title */}
                <div className="report-section-title">
                  <Award className="h-4 w-4" style={{ color: '#2F6B4F' }} />
                  <span>종합 검토 결과</span>
                </div>
                
                {/* Key Summary Cards - Reordered: 배치안, 세대수, 연면적, 총사업비, 예상수익, ROI, 건폐율, 용적률 */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* 선택 배치안 */}
                  <div className="report-summary-card">
                    <p className="label">선택 배치안</p>
                    <p className="value text-base">{layout.name}</p>
                    <p className="text-[10px]" style={{ color: '#746B5E' }}>지상 {layout.floors}층</p>
                  </div>
                  {/* 세대수 */}
                  <div className="report-summary-card">
                    <p className="label">세대수</p>
                    <p className="value">{layout.units}<span className="unit">세대</span></p>
                  </div>
                  {/* 연면적 */}
                  <div className="report-summary-card">
                    <p className="label">연면적</p>
                    <p className="value text-lg">{gfa.toLocaleString()}<span className="unit">㎡</span></p>
                  </div>
                  {/* 총사업비 - Premium */}
                  <div className="report-summary-card report-summary-card-premium">
                    <p className="label">총사업비</p>
                    <p className="value">{(safeTotalInvestment / 100000000).toFixed(1)}<span className="unit">억원</span></p>
                  </div>
                  {/* 예상수익 - Premium */}
                  <div className={`report-summary-card ${safeProfit >= 0 ? 'report-summary-card-highlight' : ''}`} style={safeProfit < 0 ? { background: '#FEF2F2', borderColor: '#FECACA' } : undefined}>
                    <p className="label">예상수익</p>
                    <p className="value" style={safeProfit < 0 ? { color: '#DC2626' } : undefined}>
                      {safeProfit >= 0 ? '+' : ''}{(safeProfit / 100000000).toFixed(1)}<span className="unit">억원</span>
                    </p>
                  </div>
                  {/* ROI - Most Important / Premium */}
                  <div className={`report-summary-card col-span-2 sm:col-span-1 ${safeRoi >= 15 ? 'report-summary-card-premium' : ''}`} style={safeRoi < 15 ? (safeRoi >= 0 ? { background: '#FFFBEB', borderColor: '#FDE68A' } : { background: '#FEF2F2', borderColor: '#FECACA' }) : undefined}>
                    <p className="label">ROI</p>
                    <p className="value text-xl" style={safeRoi < 15 ? (safeRoi >= 0 ? { color: '#D97706' } : { color: '#DC2626' }) : undefined}>
                      {safeRoi.toFixed(1)}<span className="unit">%</span>
                    </p>
                  </div>
                  {/* 건폐율 */}
                  <div className="report-summary-card">
                    <p className="label">건폐율</p>
                    <p className="value">{layout.coverage}<span className="unit">%</span></p>
                  </div>
                  {/* 용적률 */}
                  <div className="report-summary-card">
                    <p className="label">용적률</p>
                    <p className="value">{far}<span className="unit">%</span></p>
                  </div>
                </div>
                
                {/* Judgment Box */}
                <div className={`report-judgment-box ${safeRoi >= 15 ? 'success' : safeRoi >= 0 ? 'warning' : 'danger'}`}>
                  <p className="text-[10px] mb-1" style={{ color: '#746B5E' }}>종합 판단</p>
                  <p className="text-lg font-bold mb-1" style={{ color: safeRoi >= 15 ? '#166534' : safeRoi >= 0 ? '#B45309' : '#DC2626' }}>
                    {safeRoi >= 15 ? '사업 추진 가능' : safeRoi >= 0 ? '조건부 추진 검토' : '수익성 재검토 필요'}
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: '#5C534A' }}>
                    {safeRoi >= 15 
                      ? '법규 적합성 및 수익성 기준 검토 시 추진 가능한 수준으로 판단됩니다.'
                      : safeRoi >= 0 
                        ? '기본적 수익성은 확보되나, 사업비 최적화 또는 분양가 검토가 필요합니다.'
                        : '현 조건에서는 수익성 확보가 어려우며, 사업 구조 재검토가 필요합니다.'
                    }
                  </p>
                </div>
                
                {/* Key Review Points */}
                <div className="rounded-lg p-3" style={{ background: '#F0F3EA', border: '1px solid #DED6C8' }}>
                  <p className="text-xs font-medium mb-2 flex items-center gap-1.5" style={{ color: '#2F2A24' }}>
                    <CheckCircle2 className="h-3.5 w-3.5" style={{ color: '#2F6B4F' }} />
                    주요 검토 포인트
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-[13px]" style={{ color: '#2F2A24' }}>
                      <CheckCircle2 className="h-3 w-3 shrink-0 mt-0.5" style={{ color: '#22C55E' }} />
                      <span>용적률 {far}% 적용으로 법정 한도 내 최적 규모 확보</span>
                    </li>
                    <li className="flex items-start gap-2 text-[13px]" style={{ color: '#2F2A24' }}>
                      <CheckCircle2 className="h-3 w-3 shrink-0 mt-0.5" style={{ color: layout.parking >= layout.units ? '#22C55E' : '#F59E0B' }} />
                      <span>세대당 {(layout.parking / layout.units).toFixed(1)}대 주차 확보 ({layout.parking}대 / {layout.units}세대)</span>
                    </li>
                    <li className="flex items-start gap-2 text-[13px]" style={{ color: '#2F2A24' }}>
                      <CheckCircle2 className="h-3 w-3 shrink-0 mt-0.5" style={{ color: safeRoi >= 15 ? '#22C55E' : safeRoi >= 0 ? '#F59E0B' : '#EF4444' }} />
                      <span>ROI {safeRoi.toFixed(1)}%로 {safeRoi >= 15 ? '사업 추진 가능 수준' : safeRoi >= 0 ? '조건부 추진 가능' : '재검토 필요'}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )
        })()}

        {/* Section 1: 검토 개요 */}
        <div id="rpt-s1" className="report-card avoid-break print-section">
          <div className="p-4 sm:p-5 space-y-4">
            <div className="report-section-title">
              <FileText className="h-4 w-4" style={{ color: '#2F6B4F' }} />
              <span>1. 검토 개요</span>
            </div>
            
            <div className="space-y-4 text-sm">
              {/* 검토 목적 */}
              <div>
                <p className="text-xs font-medium mb-1.5" style={{ color: '#746B5E' }}>검토 목적</p>
                <p className="pl-3 leading-relaxed text-[13px]" style={{ color: '#5C534A', borderLeft: '2px solid #8FA287' }}>
                  본 보고서는 상기 대상지의 공동주택 개발에 대한 초기 사업성을 검토하기 위해 작성되었습니다. 
                  AI 기반 건축기획 시스템을 활용하여 복수의 배치대안을 수립하고, 각 대안의 규모 및 사업수지를 비교 분석하였습니다.
                </p>
              </div>
              
              {/* 기본 정보 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg" style={{ background: '#F0F3EA', border: '1px solid #DED6C8' }}>
                  <p className="text-[10px] mb-0.5" style={{ color: '#746B5E' }}>검토 기준일</p>
                  <p className="font-medium text-sm" style={{ color: '#2F2A24' }}>{dateStr}</p>
                </div>
                <div className="p-3 rounded-lg" style={{ background: '#F0F3EA', border: '1px solid #DED6C8' }}>
                  <p className="text-[10px] mb-0.5" style={{ color: '#746B5E' }}>검토 범위</p>
                  <p className="font-medium text-sm" style={{ color: '#2F2A24' }}>배치안 수립 및 사업수지 분석</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: 대상지 분석 */}
        <div id="rpt-s2" className="report-card avoid-break print-section">
          <div className="p-4 sm:p-5 space-y-4">
            <div className="report-section-title">
              <MapPin className="h-4 w-4" style={{ color: '#2F6B4F' }} />
              <span>2. 대상지 분석</span>
            </div>
            
            <div className="overflow-hidden rounded-lg" style={{ border: '1px solid #DED6C8' }}>
              <table className="report-table">
                <tbody>
                  <tr>
                    <td className="font-medium w-28" style={{ background: '#F0F3EA', color: '#746B5E' }}>소재지</td>
                    <td className="font-medium" style={{ color: '#2F2A24' }}>{address}</td>
                  </tr>
                  <tr>
                    <td className="font-medium" style={{ background: '#F0F3EA', color: '#746B5E' }}>대지면적</td>
                    <td style={{ color: '#2F2A24' }}>{siteArea.toLocaleString()}㎡ ({Math.round(siteArea * 0.3025).toLocaleString()}평)</td>
                  </tr>
                  <tr>
                    <td className="font-medium" style={{ background: '#F0F3EA', color: '#746B5E' }}>토지이용계획</td>
                    <td style={{ color: '#2F2A24' }}>
                      {regulation ? (
                        <span className="flex items-center gap-2">
                          {effectiveZoneLabel}
                          <span className="report-badge report-badge-info">적용</span>
                        </span>
                      ) : (
                        <span style={{ color: '#746B5E' }}>현장 확인 필요</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="font-medium" style={{ background: '#F0F3EA', color: '#746B5E' }}>접도 현황</td>
                    <td style={{ color: '#2F2A24' }}>
                      {regulation ? (
                        <span className="flex items-center gap-2">
                          {effectiveRoadWidth}m 이상 도로 접함
                          <span className="report-badge report-badge-info">적용</span>
                        </span>
                      ) : (
                        <span style={{ color: '#746B5E' }}>현장 확인 필요</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="font-medium" style={{ background: '#F0F3EA', color: '#746B5E' }}>높이제한</td>
                    <td style={{ color: '#2F2A24' }}>
                      {regulation ? (
                        <span className="flex items-center gap-2">
                          {effectiveMaxHeight}m / {effectiveMaxFloors}층 이하
                          <span className="report-badge report-badge-info">적용</span>
                        </span>
                      ) : (
                        <span style={{ color: '#746B5E' }}>지구단위 확인 필요</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            {/* Site Visuals (Optional Extension) */}
            {(hasSiteMap(visualsConfig) || hasSitePhotos(visualsConfig)) && (
              <div className="mt-5 pt-5" style={{ borderTop: '1px solid #DED6C8' }}>
                {/* Site Map */}
                {hasSiteMap(visualsConfig) && visualsConfig.siteMap && (
                  <div className="mb-4">
                    <div className="relative max-w-md mx-auto">
                      <img
                        src={visualsConfig.siteMap.url}
                        alt={visualsConfig.siteMap.caption || '대상지 위치도'}
                        className="w-full h-auto rounded-lg"
                        style={{ border: '1px solid #DED6C8' }}
                      />
                    </div>
                    <p className="text-xs text-center mt-2" style={{ color: '#746B5E' }}>
                      {visualsConfig.siteMap.caption || '대상지 위치도'}
                    </p>
                  </div>
                )}
                
                {/* Site Photos */}
                {hasSitePhotos(visualsConfig) && visualsConfig.sitePhotos.length > 0 && (
                  <div className={`grid gap-3 ${
                    visualsConfig.sitePhotos.length === 1 ? 'grid-cols-1 max-w-sm mx-auto' :
                    visualsConfig.sitePhotos.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
                  }`}>
                    {visualsConfig.sitePhotos.map((photo, idx) => (
                      <div key={idx} className="text-center">
                        <img
                          src={photo.url}
                          alt={photo.caption || `현장 사진 ${idx + 1}`}
                          className="w-full h-32 object-cover rounded-lg border report-border print:border-gray-200"
                        />
                        <p className="text-xs report-text-muted mt-1.5 print:text-gray-500">
                          {photo.caption || `현장 사진 ${idx + 1}`}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Section 3: 법규 검토 */}
        <div id="rpt-s3" className="report-card avoid-break print-section">
          <div className="p-4 sm:p-5 space-y-4">
            <div className="report-section-title">
              <FileCheck className="h-4 w-4" style={{ color: '#2F6B4F' }} />
              <span>3. 법규 검토 {regulation ? '' : '(추정)'}</span>
            </div>
            
            {/* Quick Status */}
            <div className="flex flex-wrap gap-1.5">
              <span className={`report-badge ${layout.coverage <= (regulation?.maxCoverageRatio || 60) ? 'report-badge-success' : 'report-badge-danger'}`}>
                건폐율 {layout.coverage <= (regulation?.maxCoverageRatio || 60) ? '적합' : '초과'}
              </span>
              <span className={`report-badge ${parseFloat(far) <= (regulation?.maxFloorAreaRatio || 200) ? 'report-badge-success' : 'report-badge-danger'}`}>
                용적률 {parseFloat(far) <= (regulation?.maxFloorAreaRatio || 200) ? '적합' : '초과'}
              </span>
              <span className={`report-badge ${regulation && layout.floors <= effectiveMaxFloors ? 'report-badge-success' : 'report-badge-warning'}`}>
                높이 {regulation && layout.floors <= effectiveMaxFloors ? '적합' : '확인 필요'}
              </span>
            </div>
            
            {/* Regulation Table */}
            <div className="overflow-hidden rounded-lg border report-border">
              <table className="report-table">
                <thead>
                  <tr className="report-bg-secondary">
                    <th className="text-left text-xs">구분</th>
                    <th className="text-center text-xs">법정 한도</th>
                    <th className="text-center text-xs">적용 계획</th>
                    <th className="text-center text-xs">적정 여부</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>건폐율</td>
                    <td className="text-center">{regulation?.maxCoverageRatio || 60}% 이하</td>
                    <td className="text-center font-semibold">{layout.coverage}%</td>
                    <td className="text-center">
                      <span className={`report-badge ${layout.coverage <= (regulation?.maxCoverageRatio || 60) ? 'report-badge-success' : 'report-badge-danger'}`}>
                        {layout.coverage <= (regulation?.maxCoverageRatio || 60) ? '적정' : '초과'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td>용적률</td>
                    <td className="text-center">{regulation?.maxFloorAreaRatio || 200}% 이하</td>
                    <td className="text-center font-semibold">{far}%</td>
                    <td className="text-center">
                      <span className={`report-badge ${parseFloat(far) <= (regulation?.maxFloorAreaRatio || 200) ? 'report-badge-success' : 'report-badge-danger'}`}>
                        {parseFloat(far) <= (regulation?.maxFloorAreaRatio || 200) ? '적정' : '초과'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td>높이제한</td>
                    <td className="text-center">{regulation ? `${effectiveMaxHeight}m / ${effectiveMaxFloors}층` : '지구단위 확인'}</td>
                    <td className="text-center font-semibold">지상 {layout.floors}층</td>
                    <td className="text-center">
                      <span className={`report-badge ${
                        regulation && layout.floors <= effectiveMaxFloors
                          ? 'report-badge-success'
                          : 'report-badge-warning'
                      }`}>{regulation && layout.floors <= effectiveMaxFloors ? '적합' : '확인 필요'}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Section 4: 배치안 비교 검토 */}
        <div id="rpt-s4" style={{marginTop: -1}} />
        {layouts.length > 1 && (
          <div className="report-card avoid-break print-section">
            <div className="p-4 sm:p-5 space-y-4">
              <div className="report-section-title">
                <Table className="h-4 w-4" style={{ color: '#2F6B4F' }} />
                <span>4. 배치안 비교 검토</span>
              </div>
              
              {/* 모바일: 카드형 레이아웃 */}
              <div className="sm:hidden space-y-2.5">
                {layouts.map((l) => {
                  const f = calculateFinancials(siteArea, l, landPricePerM2, effectiveSalesPrice, effectiveConstCost)
                  const isRec = l.id === recommendedLayout.id
                  return (
                    <div key={l.id} className={`rounded-lg border p-3 ${isRec ? 'report-highlight-bg report-highlight-border' : 'report-border'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm">{l.name}</span>
                        {isRec && <span className="report-badge report-badge-info">추천</span>}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div><span className="report-text-muted">건폐율</span> <span className="font-medium">{l.coverage}%</span></div>
                        <div><span className="report-text-muted">세대수</span> <span className="font-medium">{l.units}</span></div>
                        <div><span className="report-text-muted">ROI</span> <span className="font-bold report-text-primary">{f.roi.toFixed(1)}%</span></div>
                      </div>
                    </div>
                  )
                })}
              </div>
              
              {/* 태블릿/PC: 테이블형 */}
              <div className="hidden sm:block overflow-x-auto rounded-lg border report-border">
                <table className="report-table">
                  <thead>
                    <tr className="report-bg-secondary">
                      <th className="text-left text-xs">배치안</th>
                      <th className="text-center text-xs">건폐율</th>
                      <th className="text-center text-xs">층수</th>
                      <th className="text-center text-xs">세대수</th>
                      <th className="text-center text-xs">주차</th>
                      <th className="text-center text-xs">ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {layouts.map((l) => {
                      const f = calculateFinancials(siteArea, l, landPricePerM2, effectiveSalesPrice, effectiveConstCost)
                      const isRec = l.id === recommendedLayout.id
                      return (
                        <tr key={l.id} className={isRec ? 'report-highlight-bg' : ''}>
                          <td>
                            <span className="font-medium">{l.name}</span>
                            {isRec && <span className="report-badge report-badge-info ml-1.5">추천</span>}
                          </td>
                          <td className="text-center">{l.coverage}%</td>
                          <td className="text-center">{l.floors}층</td>
                          <td className="text-center">{l.units}세대</td>
                          <td className="text-center">{l.parking}대</td>
                          <td className="text-center font-semibold report-text-primary">{f.roi.toFixed(1)}%</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* 검토 의견 */}
              <div className="report-highlight-bg report-highlight-border rounded-lg p-3">
                <p className="text-xs font-medium report-text mb-1">검토의견: {recommendedLayout.name} 추천</p>
                <p className="text-xs report-text-muted leading-relaxed">
                  투자수익률, 세대당 주차 확보, 법정 용적률 활용도를 종합적으로 고려할 때 가장 적합한 안으로 판단됩니다.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Section 5: 규모 산정 */}
        <div id="rpt-s5" className="report-card avoid-break print-section">
          <div className="p-4 sm:p-5 space-y-4">
            <div className="report-section-title">
              <Building2 className="h-4 w-4" style={{ color: '#2F6B4F' }} />
              <span>{sn(5)}. 규모 산정 및 계획 구성</span>
            </div>

            {/* 핵심 정보 카드 4개 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="report-summary-card" style={{padding: '0.5rem 0.4rem'}}>
                <p className="label">선택 배치안</p>
                <p className="value" style={{fontSize: '0.9rem'}}>{layout.name}</p>
              </div>
              <div className="report-summary-card" style={{padding: '0.5rem 0.4rem'}}>
                <p className="label">층수</p>
                <p className="value" style={{fontSize: '0.9rem'}}>지상 {layout.floors}<span className="unit">층</span></p>
              </div>
              <div className="report-summary-card" style={{padding: '0.5rem 0.4rem'}}>
                <p className="label">세대수</p>
                <p className="value" style={{fontSize: '0.9rem'}}>{layout.units}<span className="unit">세대</span></p>
              </div>
              <div className="report-summary-card" style={{padding: '0.5rem 0.4rem'}}>
                <p className="label">주차대수</p>
                <p className="value" style={{fontSize: '0.9rem'}}>{layout.parking}<span className="unit">대</span></p>
              </div>
            </div>

            {/* 세부 수치 리스트 */}
            <div className="bg-secondary/30 rounded-lg p-3 border report-border/30">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-[10px] report-text-muted">건폐율</p>
                  <p className="font-semibold">{layout.coverage}%</p>
                </div>
                <div>
                  <p className="text-[10px] report-text-muted">용적률</p>
                  <p className="font-semibold">{far}%</p>
                </div>
                <div>
                  <p className="text-[10px] report-text-muted">연면적</p>
                  <p className="font-semibold">{gfa.toLocaleString()}㎡</p>
                </div>
              </div>
            </div>

            {/* 배치 특성 */}
            <div>
              <p className="text-xs font-medium mb-2">배치 특성</p>
              <div className="flex flex-wrap gap-1.5">
                {layout.features.map((feature) => (
                  <span key={feature} className="inline-flex items-center gap-1 px-2 py-1 rounded report-bg-secondary text-xs">
                    <CheckCircle2 className="h-3 w-3 report-text-primary" />
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section 6: 설계 도면 */}
        {/* Section 6: 설계 컨셉 */}
        <div id="rpt-s6" className="report-card avoid-break print-section">
          <div className="p-4 sm:p-5 space-y-4">
            <div className="report-section-title">
              <Sparkles className="h-4 w-4" style={{ color: '#2F6B4F' }} />
              <span>{sn(6)}. 설계 컨셉</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <p className="text-[10px] text-muted-foreground mb-1">설계 전략</p>
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{
                  designStrategy === 'view-priority' ? '조망 극대화' :
                  designStrategy === 'privacy-priority' ? '프라이버시 중심' :
                  designStrategy === 'area-maximize' ? '면적 효율 극대화' :
                  designStrategy === 'parking-efficient' ? '주차 효율화' :
                  designStrategy === 'livability' ? '실거주 최적화' :
                  '수익성 극대화'
                }</p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-[10px] text-muted-foreground mb-1">배치 타입</p>
                <p className="text-sm font-bold text-blue-700 dark:text-blue-400">{layout.name}</p>
              </div>
            </div>
            <div className="p-3 bg-secondary/30 rounded-lg border report-border/30 text-xs leading-relaxed">
              <p className="font-semibold mb-1">설계 철학</p>
              <p className="text-muted-foreground">
                본 배치안은 대지면적 {siteArea.toLocaleString()}㎡, {regulation?.zoneName || '일반주거지역'} 조건에서 {layout.name} 형태를 통해 
                건폐율 {layout.coverage}%, 용적률 {far}%를 달성합니다.
                지상 {layout.floors}층, 총 {layout.units}세대, 주차 {layout.parking}대 규모이며, {
                  designStrategy === 'view-priority' ? '조망권 확보와 일조 조건 개선을 최우선으로 고려하여 건물 배치를 최적화했습니다.' :
                  designStrategy === 'privacy-priority' ? '세대 간 프라이버시 확보와 소음 차단을 최우선으로 설계했습니다.' :
                  designStrategy === 'area-maximize' ? '전용면적을 극대화하여 분양 경쟁력을 높이는 데 중점을 두었습니다.' :
                  designStrategy === 'parking-efficient' ? '법정 주차대수를 효율적으로 확보하면서 지상 공간 활용도를 높였습니다.' :
                  designStrategy === 'livability' ? '입주자 생활 편의성과 커뮤니티 공간 확보를 최우선으로 설계했습니다.' :
                  '투자수익률 극대화를 목표로 시공비 효율과 분양가 경쟁력의 균형을 추구했습니다.'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Section 7: 설계 도면 */}
        <div id="rpt-s8" className="report-card avoid-break print-section">
          <div className="p-4 sm:p-5 space-y-4">
            <div className="report-section-title">
              <Ruler className="h-4 w-4" style={{ color: '#2F6B4F' }} />
              <span>{sn(7)}. 설계 도면</span>
            </div>
            {/* 기준층 평면도 */}
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: '#2F2A24' }}>기준층 평면도</p>
              <div dangerouslySetInnerHTML={{ __html: generateFloorPlanSvg({
                siteArea, buildingCoverage: layout.coverage, floors: layout.floors,
                units: layout.units, parking: layout.parking, type: layout.type,
                roadWidth: regulation?.roadWidth ?? 8, heightLimit: regulation?.maxHeight ?? 30,
                setbacks: { front: regulation?.setbackFront ?? 1, side: regulation?.setbackSide ?? 0.5, rear: regulation?.setbackRear ?? 1 },
                layoutName: layout.name, gfa, sitePolygon,
              }) }} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: '#2F2A24' }}>배치도</p>
                <div dangerouslySetInnerHTML={{ __html: generateSitePlanSvg({
                  siteArea, buildingCoverage: layout.coverage, floors: layout.floors,
                  units: layout.units, parking: layout.parking, type: layout.type,
                  roadWidth: regulation?.roadWidth ?? 8, heightLimit: regulation?.maxHeight ?? 30,
                  setbacks: { front: regulation?.setbackFront ?? 1, side: regulation?.setbackSide ?? 0.5, rear: regulation?.setbackRear ?? 1 },
                  layoutName: layout.name, gfa, sitePolygon,
                }) }} />
              </div>
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: '#2F2A24' }}>단면도</p>
                <div dangerouslySetInnerHTML={{ __html: generateSectionSvg({
                  siteArea, buildingCoverage: layout.coverage, floors: layout.floors,
                  units: layout.units, parking: layout.parking, type: layout.type,
                  roadWidth: regulation?.roadWidth ?? 8, heightLimit: regulation?.maxHeight ?? 30,
                  setbacks: { front: regulation?.setbackFront ?? 1, side: regulation?.setbackSide ?? 0.5, rear: regulation?.setbackRear ?? 1 },
                  layoutName: layout.name, gfa, sitePolygon,
                }) }} />
              </div>
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: '#2F2A24' }}>아이소메트릭</p>
                <div dangerouslySetInnerHTML={{ __html: generateIsometricSvg({
                  siteArea, buildingCoverage: layout.coverage, floors: layout.floors,
                  units: layout.units, parking: layout.parking, type: layout.type,
                  roadWidth: regulation?.roadWidth ?? 8, heightLimit: regulation?.maxHeight ?? 30,
                  setbacks: { front: regulation?.setbackFront ?? 1, side: regulation?.setbackSide ?? 0.5, rear: regulation?.setbackRear ?? 1 },
                  layoutName: layout.name, gfa, sitePolygon,
                }) }} />
              </div>
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: '#2F2A24' }}>입면도</p>
                <div dangerouslySetInnerHTML={{ __html: generateElevationSvg({
                  siteArea, buildingCoverage: layout.coverage, floors: layout.floors,
                  units: layout.units, parking: layout.parking, type: layout.type,
                  roadWidth: regulation?.roadWidth ?? 8, heightLimit: regulation?.maxHeight ?? 30,
                  setbacks: { front: regulation?.setbackFront ?? 1, side: regulation?.setbackSide ?? 0.5, rear: regulation?.setbackRear ?? 1 },
                  layoutName: layout.name, gfa, sitePolygon,
                }) }} />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-xs font-semibold mb-2" style={{ color: '#2F2A24' }}>투시도</p>
              <div dangerouslySetInnerHTML={{ __html: generatePerspectiveSvg({
                siteArea, buildingCoverage: layout.coverage, floors: layout.floors,
                units: layout.units, parking: layout.parking, type: layout.type,
                roadWidth: regulation?.roadWidth ?? 8, heightLimit: regulation?.maxHeight ?? 30,
                setbacks: { front: regulation?.setbackFront ?? 1, side: regulation?.setbackSide ?? 0.5, rear: regulation?.setbackRear ?? 1 },
                layoutName: layout.name, gfa, sitePolygon,
              }) }} />
            </div>
            <p className="text-[10px] text-center" style={{ color: '#94a3b8' }}>※ 도면은 사전검토 단계의 개략적 배치이며, 실시설계 시 변경될 수 있습니다.</p>
          </div>
        </div>

        {/* Section 7: 사업성 검토 */}
        <div id="rpt-s8" className="report-card avoid-break print-section">
          <div className="p-4 sm:p-5 space-y-4">
            <div className="report-section-title">
              <Banknote className="h-4 w-4" style={{ color: '#2F6B4F' }} />
              <span>{sn(8)}. 사업성 검토</span>
            </div>

            {/* 사업비 추정 테이블 */}
            <div className="overflow-hidden rounded-lg border report-border">
              <table className="report-table">
                <thead>
                  <tr className="report-bg-secondary">
                    <th className="text-left text-xs">항목</th>
                    <th className="text-right text-xs">금액</th>
                    <th className="text-left text-xs">비고</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>토지비</td>
                    <td className="text-right font-medium">{formatKRW(financials.landCost)}</td>
                    <td className="text-xs report-text-muted">5,000천원/㎡ 적용</td>
                  </tr>
                  <tr>
                    <td>공사비</td>
                    <td className="text-right font-medium">{formatKRW(financials.constructionCost)}</td>
                    <td className="text-xs report-text-muted">4,500천원/㎡ + 간접비 15%</td>
                  </tr>
                  <tr>
                    <td>기타비용</td>
                    <td className="text-right font-medium">{formatKRW(financials.softCost)}</td>
                    <td className="text-xs report-text-muted">설계/감리/인허가 등 8%</td>
                  </tr>
                  <tr className="bg-primary/5 font-semibold">
                    <td className="font-semibold">총사업비</td>
                    <td className="text-right font-bold text-base report-text-primary">{formatKRW(financials.totalInvestment)}</td>
                    <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>

            {/* 핵심 수익 지표 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="report-summary-card">
                <p className="label">예상매출</p>
                <p className="value text-base">{(financials.projectedRevenue / 100000000).toFixed(1)}<span className="unit">억원</span></p>
              </div>
              <div className={`report-summary-card ${financials.profit >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                <p className="label">예상수익</p>
                <p className={`value text-base ${financials.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {financials.profit >= 0 ? '+' : ''}{(financials.profit / 100000000).toFixed(1)}<span className="unit">억원</span>
                </p>
              </div>
              {/* ROI - 강조 */}
              <div className={`report-summary-card col-span-2 sm:col-span-2 ${financials.roi >= 15 ? 'bg-primary/10 border-primary/30' : financials.roi >= 0 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
                <p className="label">ROI (투자수익률)</p>
                <p className={`value text-2xl ${financials.roi >= 15 ? 'report-text-primary' : financials.roi >= 0 ? 'text-amber-600' : 'text-red-600'}`}>
                  {financials.roi.toFixed(1)}<span className="unit">%</span>
                </p>
                <p className="text-[10px] report-text-muted">손익분기점 분양률: {financials.breakEvenRate.toFixed(1)}%</p>
              </div>
            </div>

            {/* 사업기간 */}
            <div className="bg-secondary/30 border report-border/30 rounded-lg p-3 flex items-center gap-3">
              <Calendar className="h-4 w-4 report-text-primary shrink-0" />
              <div>
                <p className="text-[10px] report-text-muted">예상 사업기간(인허가~준공 기준)</p>
                <p className="text-sm font-medium">
                  설계/인허가 6~8개월 + 시공 {estimatedTimeline} = 총 {layout.floors > 8 ? '30~38개월' : layout.floors > 5 ? '24~32개월' : '20~26개월'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Scenario Comparison (Optional Extension) */}
        {onScenariosChange && (
          <div className="print:hidden">
            <FinancialScenarioComparison
              baseFinancials={financials}
              config={scenariosConfig}
              onChange={onScenariosChange}
            />
          </div>
        )}
        
        {/* Scenario Comparison for Print (if enabled) */}
        {hasScenarios(scenariosConfig) && (
          <div className="hidden print:block report-card print:shadow-none print:border print:border-gray-200 print:bg-white">
            <div className="pb-3 border-b" style={{ borderColor: '#DED6C8' }}>
              <div className="flex items-center gap-3 text-base p-4" style={{ color: '#2F2A24' }}>
                <span className="font-semibold">시나리오 분석</span>
              </div>
            </div>
            <div className="pt-5 p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">시나리오</th>
                    <th className="text-right py-2 px-3">총 사업비</th>
                    <th className="text-right py-2 px-3">총 분양수입</th>
                    <th className="text-right py-2 px-3">예상 이익</th>
                    <th className="text-right py-2 px-3">ROI</th>
                  </tr>
                </thead>
                <tbody>
                  {scenariosConfig.scenarios.map((scenario, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="py-2 px-3">{scenario.name}</td>
                      <td className="text-right py-2 px-3">{formatKRW(scenario.totalCost)}</td>
                      <td className="text-right py-2 px-3">{formatKRW(scenario.totalRevenue)}</td>
                      <td className="text-right py-2 px-3">{formatKRW(scenario.profit)}</td>
                      <td className="text-right py-2 px-3">{scenario.roi.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Section 7: AI 분석 */}
        <div className="report-card avoid-break print-section">
          <div className="p-4 sm:p-5 space-y-4">
            <div className="report-section-title">
              <TrendingUp className="h-4 w-4" style={{ color: '#2F6B4F' }} />
              <span>{sn(9)}. AI 분석</span>
            </div>
            
            {/* AI 점수 그리드 - 4개 카드 (종합 점수 강조) */}
            <div className="report-ai-scores">
              <div className="report-ai-score">
                <p className="label">법규 부합성</p>
                <p className="value">{layout.scores?.regulationCompliance ?? (layout.coverage <= 60 ? 90 : 70)}</p>
              </div>
              <div className="report-ai-score">
                <p className="label">사업성</p>
                <p className="value">{layout.scores?.profitability ?? (financials.roi > 20 ? 85 : financials.roi > 12 ? 70 : 55)}</p>
              </div>
              <div className="report-ai-score">
                <p className="label">상품성</p>
                <p className="value">{layout.scores?.marketability ?? (financials.roi > 15 ? 78 : 65)}</p>
              </div>
              <div className="report-ai-score highlight">
                <p className="label">종합 점수</p>
                <p className="value">{layout.scores?.overall ?? Math.round((financials.roi > 20 ? 85 : financials.roi > 12 ? 70 : 55) * 0.95)}</p>
              </div>
            </div>

              {/* AI 분석 요약 - Premium */}
              {layout.reasoning && (
                <div className="bg-gradient-to-br from-accent/40 to-accent/20 border border-primary/25 rounded-lg p-3.5">
                  <p className="text-xs font-semibold report-text mb-1.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                    AI 분석 요약
                  </p>
                  <p className="text-[13px] report-text/80 leading-relaxed">
                    {layout.reasoning.summary}
                  </p>
                  {layout.scores && layout.scores.marketability < layout.scores.overall && (
                    <p className="text-[11px] report-text-muted mt-2 pt-2 border-t border-primary/10">
                      * 상품성 점수는 시장 경쟁 요소와 분양 경쟁력을 반영하여 보수적으로 평가되었습니다.
                    </p>
                  )}
                </div>
              )}

              {/* 설계 품질 평가 — Alexander Pattern Language */}
              {(() => {
                try {
                  const pq = evaluatePatternQuality({
                    type: layout.type || 'tower',
                    name: layout.name,
                    coverage: layout.coverage,
                    floors: layout.floors,
                    units: layout.units || 0,
                    parking: layout.parking || 0,
                    gfa: layout.gfa || 0,
                    siteArea: siteArea,
                    strategy: designStrategy || 'profitability',
                  }, userValues)
                  const topPatterns = [...pq.patterns].sort((a, b) => b.score - a.score).slice(0, 3)
                  return (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3.5">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                          📖 설계 품질 평가
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-md flex items-center justify-center text-white font-black text-sm" style={{ backgroundColor: pq.gradeColor }}>
                            {pq.grade}
                          </div>
                          <span className="text-sm font-extrabold">{pq.overallQuality}점</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-700 leading-relaxed mb-3">{pq.philosophy}</p>
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        {topPatterns.map(p => (
                          <div key={p.id} className="bg-white rounded-md p-2 text-center border border-gray-100">
                            <p className="text-[9px] text-gray-500">#{p.id} {p.nameKr}</p>
                            <p className="text-base font-black" style={{ color: p.score >= 80 ? '#059669' : p.score >= 60 ? '#2563eb' : '#d97706' }}>{p.score}</p>
                            <div className="h-1 bg-emerald-100 rounded-full mt-1">
                              <div className="h-full rounded-full" style={{ width: `${p.score}%`, backgroundColor: p.score >= 80 ? '#10b981' : p.score >= 60 ? '#3b82f6' : '#f59e0b' }} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-3 text-[10px] text-gray-500 border-t border-emerald-200 pt-2">
                        <span>패턴 {pq.totalPatternScore}/100</span>
                        <span>Living {pq.totalLivingScore}/100</span>
                      </div>
                    </div>
                  )
                } catch { return null }
              })()}

              {/* 추천 이유 및 유의 사항 */}
              {layout.reasoning && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-emerald-700 mb-2">추천 이유</p>
                    <ul className="space-y-1">
                      {layout.reasoning.profitabilityAdvantages.slice(0, 3).map((item, idx) => (
                        <li key={idx} className="text-[11px] report-text-muted flex items-start gap-1.5">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-amber-700 mb-2">유의 사항</p>
                    <ul className="space-y-1">
                      {layout.reasoning.risksAndChallenges.slice(0, 3).map((item, idx) => (
                        <li key={idx} className="text-[11px] report-text-muted flex items-start gap-1.5">
                          <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
          </div>
        </div>

        {/* Section 8: 리스크 및 고려사항 */}
        <div id="rpt-s10" className="report-card avoid-break print-section">
          <div className="p-4 sm:p-5 space-y-4">
            <div className="report-section-title">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span>{sn(10)}. 리스크 및 고려사항</span>
            </div>
            
            <div className="report-risk-grid">
              {[
                { title: '토지 관련', items: ['감정평가에 따른 매입가 변동', '소유권 및 권리관계 확인', '토지거래허가구역 해당 여부'] },
                { title: '인허가 관련', items: ['건축위원회 심의에 따른 규모 조정', '환경/교통영향평가 대상 여부', '각종 부담금 발생 가능성'] },
                { title: '시장 관련', items: ['부동산 경기 변동에 따른 분양률', '인근 경쟁 단지 공급 물량', '금리 변동에 따른 금융비용'] },
                { title: '공사 관련', items: ['자재비/인건비 상승', '지반 조건에 따른 추가 비용', '민원에 따른 공사 지연'] },
              ].map((section, idx) => (
                <div key={idx} className="report-risk-card">
                  <h4>{section.title}</h4>
                  <ul>
                    {section.items.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 9: 결론 및 제안 */}
        <div className="report-card avoid-break print-section conclusion-box">
          <div className="p-4 sm:p-5 space-y-4">
            <div className="report-section-title">
              <TrendingUp className="h-4 w-4" style={{ color: '#2F6B4F' }} />
              <span>{sn(11)}. 결론 및 제안</span>
            </div>
            
            {/* 결론 문장 - 핵심 수치만 강조 */}
            <p className="text-sm leading-relaxed" style={{ color: '#3D3830' }}>
              검토 결과, 상기 대상지({siteArea.toLocaleString()}㎡)는 {layout.name} 적용 시 
              지상 {layout.floors}층 규모, 총 <strong>{layout.units}세대</strong>의 공동주택 개발이 가능한 것으로 분석됩니다.
              예상 투자수익률은 <strong>ROI {financials.roi.toFixed(1)}%</strong> 수준으로{' '}
              {financials.roi > 20 ? '사업성이 양호한' : financials.roi > 12 ? '기본적 수익성이 확보되는' : '수익성 확보에 유의가 필요한'} 것으로 판단됩니다.
            </p>

            {/* 요약 항목 박스 - Premium */}
            <div className="report-conclusion">
              <div className="report-conclusion-items">
                <div className="text-center py-1">
                  <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: '#746B5E' }}>추천안</p>
                  <p className="font-semibold text-sm" style={{ color: '#2F2A24' }}>{layout.name}</p>
                </div>
                <div className="text-center py-1">
                  <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: '#746B5E' }}>예상 ROI</p>
                  <p className="font-bold text-xl" style={{ color: '#2F6B4F' }}>{financials.roi.toFixed(1)}%</p>
                </div>
                <div className="text-center py-1">
                  <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: '#746B5E' }}>총사업비</p>
                  <p className="font-semibold text-sm" style={{ color: '#2F2A24' }}>{(financials.totalInvestment / 100000000).toFixed(1)}억원</p>
                </div>
                <div className="text-center py-1">
                  <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: '#746B5E' }}>예상수익</p>
                  <p className="font-bold text-sm" style={{ color: financials.profit >= 0 ? '#166534' : '#DC2626' }}>
                    {financials.profit >= 0 ? '+' : ''}{(financials.profit / 100000000).toFixed(1)}억원
                  </p>
                </div>
              </div>
              <div className="mt-3 pt-3 text-center" style={{ borderTop: '1px solid rgba(47, 107, 79, 0.2)' }}>
                <p className="text-[11px] font-medium" style={{ color: '#3D3830' }}>
                  종합의견: {financials.roi > 20 ? '사업 추진 사전검토안으로 적합함' : financials.roi > 12 ? '조건부 추진 검토가 가능한 수준' : '사업구조 개선 후 재검토 권장'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Professional */}
        <div className="report-footer">
          <p className="text-[11px] leading-relaxed mb-2" style={{ color: '#5C534A' }}>
            본 보고서는 사전 검토용 참고자료입니다. 최종 의사결정 전 건축사, 감정평가사 등 전문가 검토를 권장합니다.
          </p>
          <div className="pt-2" style={{ borderTop: '1px solid #DED6C8' }}>
            <p className="text-[10px] font-medium" style={{ color: '#5C534A' }}>
              {formatBrandFullName(brandConfig)} | {brandConfig.phone}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: '#8C8478' }}>
              &copy; 2026 Archi-Scan. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            font-family: 'Noto Sans KR', 'Malgun Gothic', sans-serif !important;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:bg-white {
            background-color: white !important;
          }
          
          .print\\:text-black {
            color: black !important;
          }
        }
      `}</style>
    </div>
  )
}
