"use client"

/**
 * @version STABLE-v194
 * @checkpoint release-candidate
 * @date 2026-04-10
 * @description Production-ready version with:
 *   - Dashboard with project management
 *   - Report generation (HTML/PDF/Excel)
 *   - Financial scenario comparison
 *   - ROI calculations (consistent across views)
 *   - All Korean text encoding fixed
 *   - Build/deployment issues resolved
 */
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { SiteInputForm } from "@/components/site-input-form"
import type { SupplementData } from "@/components/manual-supplement-form"
import { LayoutCard } from "@/components/layout-card"
import { LayoutComparison } from "@/components/layout-comparison"
import { ProjectComparison } from "@/components/project-comparison"
import { BuildingVolume3D } from "@/components/building-volume-3d"
import { FloorPlan } from "@/components/floor-plan"
import { generateFloorPlanDXF, downloadDXF } from "@/lib/dxf-generator"
import { fetchLandPrice, formatLandPricePerM2, formatLandCost } from "@/lib/land-price"
import { FinancialAnalysis } from "@/components/financial-analysis"
import { ReportSummary } from "@/components/report-summary"
import { ExcelImport, type ImportedReportData } from "@/components/excel-import"
import { ProjectManager, type ProjectSnapshot } from "@/components/project-manager"
import { saveProject as saveProjectToStorage, getRecentProjects, loadProject as loadProjectFromStorage, type ProjectListItem } from "@/lib/project-storage"
import { SiteVisualsManager } from "@/components/site-visuals-manager"
import { type SiteVisualsConfig, EMPTY_SITE_VISUALS } from "@/lib/site-visuals-config"
import { type FinancialScenariosConfig, EMPTY_SCENARIOS_CONFIG } from "@/lib/financial-scenarios-config"
import { ARCHISCAN_COPY, getStrategyName } from "@/constants/archiscan-copy"
import { ARCHISCAN_SCENARIOS, applyScenarioToInput, IS_DEV_MODE } from "@/constants/archiscan-scenarios"
import { ScenarioSelector } from "@/components/scenario-selector"
import { DebugPanel } from "@/components/debug-panel"
import { ReleaseChecklistPanel } from "@/components/release-checklist-panel"
import { QAInspectionPanel } from "@/components/qa-inspection-panel"
import { downloadExcel, downloadHtml, downloadPdf, openPrintPreview, generateFileName, type ExportData } from "@/lib/report-export"
import { VersionHistoryManager } from "@/components/version-history-manager"
import { ApprovalWorkflowManager } from "@/components/approval-workflow-manager"
import { CollaborationManager } from "@/components/collaboration-manager"
import { Dashboard } from "@/components/dashboard"
import { type ProjectApprovalData, isEditingAllowed, getStoredUser } from "@/lib/user-roles-config"
import { BuildingFootprint } from "@/components/building-footprint"
import { RegulationInput } from "@/components/regulation-input"
import { RegulationAnalysisPanel } from "@/components/regulation-analysis"
import { LegalReviewPanel } from "@/components/legal-review-panel"
import { CadastralMap } from "@/components/cadastral-map"
import { SitePlan } from "@/components/site-plan"
import { IsometricView } from "@/components/isometric-view"
import { SectionView } from "@/components/section-view"
import { ElevationView } from "@/components/elevation-view"
import { PerspectiveView } from "@/components/perspective-view"
import { ScenarioSlider } from "@/components/scenario-slider"
import { BrandingEditor } from "@/components/branding-editor"
import { type BrandingConfig, loadBrandingConfig } from "@/lib/branding-config"
import { StrategySelection } from "@/components/strategy-selection"
import { AIReasoningPanel } from "@/components/ai-reasoning"
import { 
  Building2, 
  LayoutGrid, 
  Layers, 
  Banknote, 
  FileText,
  ChevronRight,
  ChevronLeft,
  Loader2,
  CreditCard,
  Scale,
  Brain,
  Sparkles,
  LayoutDashboard,
  CheckCircle2,
  AlertCircle,
  Maximize2,
  Minimize2,
  DoorOpen,
  Calculator,
  RotateCcw,
  Settings2,
  Code,
  Table,
  Printer,
  Clock,
  TrendingUp
} from "lucide-react"
import { useSubscription } from "@/components/subscription-provider"
import { ErrorBoundary } from "@/components/error-boundary"
import { UserBadge } from "@/components/user-badge"
import { UpgradeModal } from "@/components/upgrade-modal"
import { PricingModal } from "@/components/pricing-modal"
import {
  ZoningRegulation,
  getDefaultRegulation,
  analyzeRegulations,
} from "@/lib/regulation-types"
import {
  calculateLegalSummary,
  calculateFeasibility,
  type LegalSummary,
  type FeasibilityResult,
  type SiteInput,
  safeNumber,
} from "@/lib/project-analysis-state"
import { getRegionalPricing, getZoneMultiplier, getTierInfo, type RegionalPricing } from "@/lib/regional-pricing"
import {
  DesignStrategy,
  STRATEGY_PARAMETERS,
  UNIT_SIZES,
  LAYOUT_TYPE_CHARACTERISTICS,
  calculateLayoutScores,
  generateRecommendation,
  generateAIReasoning,
  type LayoutScores,
  type LayoutRecommendation,
  type AIReasoning,
} from "@/lib/design-strategy"
import {
  getOrCreateUser,
  saveProject,
  saveLayouts,
  saveReport,
  type User,
  type Project,
} from "@/lib/database"

export interface LayoutOption {
  id: number
  name: string
  type: "tower" | "courtyard" | "lshape" | "linear" | "cluster"
  description: string
  coverage: number
  units: number
  floors: number
  parking: number
  gfa: number
  openSpace: number
  features: string[]
  scores: LayoutScores
  recommendation: LayoutRecommendation
  reasoning: AIReasoning
  isLegallyCompliant?: boolean // 법규 준수 여부
}

// safeNumber is imported from @/lib/project-analysis-state

// Format display value with fallback
function displayNumber(value: unknown, suffix: string = '', fallback: string = '-'): string {
  const num = safeNumber(value, NaN)
  if (Number.isFinite(num)) {
    return `${num}${suffix}`
  }
  return fallback + suffix
}

// Safe score display - prevents "종합 NaN점" from showing
function displayScore(score: unknown, fallbackText: string = '산정 중'): string {
  const num = safeNumber(score, NaN)
  if (Number.isFinite(num) && num > 0) {
    return `${num}점`
  }
  return fallbackText
}

// Get grade from score
function getGradeFromScore(score: unknown): string {
  const num = safeNumber(score, 0)
  if (num >= 85) return 'A'
  if (num >= 75) return 'B'
  if (num >= 65) return 'C'
  if (num >= 50) return 'D'
  return '-'
}

function generateLayouts(
  siteArea: number, 
  regulation: ZoningRegulation, 
  strategy: DesignStrategy
): LayoutOption[] {
  const params = STRATEGY_PARAMETERS[strategy]
  const analysis = analyzeRegulations(siteArea, regulation)
  
  // 전략에 따른 세대 크기
  const unitSize = UNIT_SIZES[params.unitSizePreference]
  
  // 법규 한도 계산
  const maxCoverage = regulation.maxCoverageRatio
  const maxFAR = regulation.maxFloorAreaRatio
  const maxFloorsByFAR = Math.ceil(maxFAR / (maxCoverage * params.coverageMultiplier))
  const maxFloorsByHeight = Math.floor(regulation.maxHeight / 3.3)
  const effectiveMaxFloors = Math.min(regulation.maxFloors, maxFloorsByFAR, maxFloorsByHeight)

  // 배치 유형별 계산 함수
  const calculateLayout = (
    typeId: string,
    typeName: string,
    coverageBase: number,
    floorBase: number,
    description: string
  ): LayoutOption => {
    const typeChars = LAYOUT_TYPE_CHARACTERISTICS[typeId] || LAYOUT_TYPE_CHARACTERISTICS.tower
    
    // 전략 파라미터 적용
    const coverage = Math.min(maxCoverage, Math.round(coverageBase * params.coverageMultiplier))
    const floors = Math.min(effectiveMaxFloors, Math.round(floorBase * params.floorMultiplier))
    const buildingArea = (siteArea * coverage) / 100
    const gfa = buildingArea * floors
    const openSpace = Math.round((100 - coverage) * params.openSpaceRatio * 100) / 100
    
    // 세대수 계산 (코어 효율 반영)
    const netArea = gfa * params.coreEfficiency
    const units = Math.max(Math.floor(netArea / unitSize), floors)
    
    // 주차대수 계산
    const requiredParking = Math.ceil(units * regulation.parkingRatio)
    const parkingEfficiency = params.parkingStrategy === "underground" ? 1.2 : 
                              params.parkingStrategy === "ground" ? 0.8 : 1.0
    const parking = Math.ceil(requiredParking * parkingEfficiency)
    
    // 점수 계산
    const layoutData = { type: typeId, coverage, floors, units, parking, gfa }
    const scores = calculateLayoutScores(layoutData, siteArea, regulation, strategy)
    const recommendation = generateRecommendation(typeId, scores, strategy, regulation)
    const reasoning = generateAIReasoning(typeId, scores, strategy, regulation, siteArea, gfa)
    
    // ============================================================
    // 법규 준수 검증 (CRITICAL: 법규 초과안 자동 필터링)
    // ============================================================
    const actualFAR = Math.round(gfa / siteArea * 100)
    const actualBCR = coverage
    const isLegallyCompliant = 
      actualBCR <= maxCoverage && 
      actualFAR <= maxFAR && 
      floors <= effectiveMaxFloors
    
    // 법규 초과 시 강제 clamp 적용
    const clampedCoverage = Math.min(coverage, maxCoverage)
    const clampedFloors = Math.min(floors, effectiveMaxFloors)
    const clampedBuildingArea = (siteArea * clampedCoverage) / 100
    const maxAllowedGFA = siteArea * maxFAR / 100
    const clampedGFA = Math.min(buildingArea * clampedFloors, maxAllowedGFA)
    const clampedFAR = Math.round(clampedGFA / siteArea * 100)
    
    // 세대수 재계산 (clamped GFA 기준)
    const clampedNetArea = clampedGFA * params.coreEfficiency
    const clampedUnits = Math.max(Math.floor(clampedNetArea / unitSize), clampedFloors)
    
    // 주차대수 재계산
    const clampedRequiredParking = Math.ceil(clampedUnits * regulation.parkingRatio)
    const clampedParking = Math.ceil(clampedRequiredParking * parkingEfficiency)
    
    // 특징 생성 (clamped 값 사용)
    const features: string[] = []
    if (typeChars.bestFor.includes(strategy)) {
      features.push("전략 최적화")
    }
    features.push(`건폐율 ${clampedCoverage}%`)
    features.push(`용적률 ${clampedFAR}%`)
    if (scores.overall >= 80 && isLegallyCompliant) features.push("AI 추천")
    if (openSpace >= 25) features.push("넓은 개방공간")
    if (params.parkingStrategy === "underground") features.push("지하주차")
    
    // 법규 초과 시 경고 표시
    if (!isLegallyCompliant) {
      features.unshift("법규 조정됨")
    }
    
    return {
      id: 0, // Will be set later
      name: typeName,
      type: typeId as LayoutOption["type"],
      description,
      coverage: clampedCoverage, // Use clamped value
      units: clampedUnits, // Use clamped value
      floors: clampedFloors, // Use clamped value
      parking: clampedParking, // Use clamped value
      gfa: clampedGFA, // Use clamped value
      openSpace,
      features: features.slice(0, 5),
      scores,
      recommendation,
      reasoning,
      isLegallyCompliant, // Add compliance flag
    }
  }
  
  // 전략에 따른 배치 유형 선택 및 우선순위
  const layouts: LayoutOption[] = []
  
  // 타워형 - 고층 개발에 적합
  const tower = calculateLayout(
    "tower",
    strategy === "view-priority" ? "파노라마 타워형" :
    strategy === "area-maximize" ? "고밀도 타워형" :
    strategy === "profitability" ? "수익형 타워" : "컴팩트 타워형",
    45,
    effectiveMaxFloors,
    strategy === "view-priority" 
      ? "전 세대 탁 트인 조망 확보를 위한 슬림한 타워 배치로 개방감 극대화"
      : strategy === "area-maximize"
      ? "법적 용적률 한도까지 연면적을 극대화하는 고층 타워 배치"
      : strategy === "profitability"
      ? "효율적인 코어 배치로 분양 면적을 극대화한 수익 중심 설계"
      : "최소 대지점유로 용적률을 극대화하는 고층 타워 배치"
  )
  tower.id = 1
  layouts.push(tower)
  
  // 중정형 - 커뮤니티/실거주에 적합
  const courtyard = calculateLayout(
    "courtyard",
    strategy === "livability" ? "라이프스타일 중정형" :
    strategy === "privacy-priority" ? "프라이빗 중정형" : "커뮤니티 중정형",
    55,
    Math.ceil(effectiveMaxFloors * 0.6),
    strategy === "livability"
      ? "중앙 정원과 커뮤니티 공간을 중심으로 입주민의 삶의 질을 높이는 배치"
      : strategy === "privacy-priority"
      ? "세대 간 시선 분리와 독립된 동선으로 프라이버시를 보장하는 중정 배치"
      : "중앙 정원을 통한 커뮤니티 형성과 자연채광 극대화"
  )
  courtyard.id = 2
  layouts.push(courtyard)
  
  // ㄱ자형 - 균형잡힌 배치
  const lshape = calculateLayout(
    "lshape",
    strategy === "parking-efficient" ? "주차 최적 ㄱ자형" :
    strategy === "privacy-priority" ? "독립 동선 ㄱ자형" : "코너 활용 ㄱ자형",
    50,
    Math.ceil(effectiveMaxFloors * 0.75),
    strategy === "parking-efficient"
      ? "지하주차장 진입과 동선을 최적화하여 주차 효율을 극대화한 배치"
      : strategy === "privacy-priority"
      ? "두 동의 분리로 세대별 독립성과 프라이버시를 확보한 ㄱ자 배치"
      : "코너 활용 극대화와 프라이버시를 고려한 균형 잡힌 배치"
  )
  lshape.id = 3
  layouts.push(lshape)
  
  // 추가 배치 유형 (전략에 따라 선택적 추가)
  if (strategy === "area-maximize" || strategy === "profitability") {
    const linear = calculateLayout(
      "linear",
      "판상형 배치안",
      60,
      Math.ceil(effectiveMaxFloors * 0.8),
      "남향 일자 배치로 전 세대 균일한 채광 확보와 시공 효율성 극대화"
    )
    linear.id = 4
    layouts.push(linear)
  }
  
  if (strategy === "privacy-priority" || strategy === "livability") {
    const cluster = calculateLayout(
      "cluster",
      "클러스터 배치안",
      40,
      Math.ceil(effectiveMaxFloors * 0.5),
      "독립된 소규모 동으로 세대별 프라이버시와 정원 공간을 확보한 배치"
    )
    cluster.id = 5
    layouts.push(cluster)
  }
  
  // ============================================================
  // 법규 준수안 우선 정렬 + 전략 부합도 정렬
  // ============================================================
  layouts.sort((a, b) => {
    // 1. 법규 준수안을 먼저 배치
    if (a.isLegallyCompliant && !b.isLegallyCompliant) return -1
    if (!a.isLegallyCompliant && b.isLegallyCompliant) return 1
    // 2. 같은 준수 상태면 전략 부합도로 정렬
    return b.recommendation.strategyMatch - a.recommendation.strategyMatch
  })
  
  // 법규 비준수안 점수 감점
  layouts.forEach(layout => {
    if (!layout.isLegallyCompliant) {
      layout.scores.legal = Math.max(0, layout.scores.legal - 30)
      layout.scores.overall = Math.round(
        layout.scores.legal * 0.3 + 
        layout.scores.feasibility * 0.25 + 
        layout.scores.layout * 0.25 + 
        layout.scores.product * 0.2
      )
      layout.recommendation.strategyMatch = Math.max(0, layout.recommendation.strategyMatch - 20)
    }
  })
  
  // ID 재할당 및 추천안 설정 (오직 1개만 추천)
  let recommendationSet = false
  layouts.forEach((layout, index) => {
    layout.id = index + 1
    // 첫 번째 법규 준수안만 AI 추천으로 설정
    if (!recommendationSet && layout.isLegallyCompliant) {
      layout.recommendation.isRecommended = true
      recommendationSet = true
    } else {
      layout.recommendation.isRecommended = false
    }
  })
  
  // 법규 준수안이 없으면 첫 번째 안을 추천 (fallback)
  if (!recommendationSet && layouts.length > 0) {
    layouts[0].recommendation.isRecommended = true
  }
  
  return layouts
}

type AppStep = "input" | "strategy" | "regulation" | "layouts" | "floorplan" | "financial" | "report"

export default function ArchiScanPage() {
  const [mounted, setMounted] = useState(false) // v2
  
  const { 
    isProUser, 
    showUpgradeModal, 
    setShowUpgradeModal, 
    showPricingModal, 
    setShowPricingModal 
  } = useSubscription()
  
  const [address, setAddress] = useState("")
  const [siteArea, setSiteArea] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [layouts, setLayouts] = useState<LayoutOption[]>([])
  const [selectedLayout, setSelectedLayout] = useState<number | null>(null)
  const [currentStep, setCurrentStep] = useState<AppStep>("input")
  const [selectedFloor, setSelectedFloor] = useState(1)
  const [floorPlanViewMode, setFloorPlanViewMode] = useState<"fit" | "original">("fit")
  const [isFloorPlanFullscreen, setIsFloorPlanFullscreen] = useState(false)
  const [drawingTab, setDrawingTab] = useState<"floor" | "site" | "iso" | "section" | "elevation" | "perspective">("site")
  const [showDxfPreview, setShowDxfPreview] = useState(false)
  const [layoutViewMode, setLayoutViewMode] = useState<"card" | "compare">("card")
  const [sitePolygon, setSitePolygon] = useState<{ coords: [number, number][], centroid: [number, number] } | null>(null)
  const [show3DVolume, setShow3DVolume] = useState(false)
  const [showBrandingEditor, setShowBrandingEditor] = useState(false)
  const [branding, setBranding] = useState<BrandingConfig | null>(null)
  
  // 브랜딩 초기 로드
  useEffect(() => {
    if (mounted) setBranding(loadBrandingConfig())
  }, [mounted])
  const [supplementKey, setSupplementKey] = useState(0)  // 강제 리렌더용
  const [regulation, setRegulation] = useState<ZoningRegulation>(getDefaultRegulation())
  const [strategy, setStrategy] = useState<DesignStrategy>("profitability")
  const [supplementData, setSupplementData] = useState<{
    zoneType?: string
    roadWidth?: string
    heightLimit?: number
    districtPlan?: string
    note?: string
  }>({})
  // MOLIT에서 직접 받은 supplement 값 (법규검토 패널에 우선 사용)
  const [molitSupplementData, setMolitSupplementData] = useState<{
    zoneCode?: string
    roadWidth?: number
    heightLimit?: number
    hasDistrictPlan?: boolean
    entX?: number
    entY?: number
    sigunguCd?: string   // 공시지가 조회용
    bjdongCd?: string
    bun?: string
    ji?: string
    bdMgtSn?: string  // 건물관리번호 (지적도 PNU 조회용)
  }>({})

  // 공시지가 state
  // 건물관리번호 - 지적도 PNU 조회용 독립 state (molitSupplementData chain 우회)
  
  // 실거래가 시세 데이터
  const [marketPrice, setMarketPrice] = useState<{
    avgPricePerM2: number
    suggestedSalePrice: number
    transactionCount: number
    loaded: boolean
    transactions: Array<{ name: string; area: number; pricePerM2: number; dealDate: string }>
  }>({ avgPricePerM2: 0, suggestedSalePrice: 0, transactionCount: 0, loaded: false, transactions: [] })
  const [siteBdMgtSn, setSiteBdMgtSn] = useState<string>('')
  
  // 지역별 분양가·공사비 (주소 기반 자동 적용)
  const [regionalPricing, setRegionalPricing] = useState<RegionalPricing | null>(null)

  const [landPriceData, setLandPriceData] = useState<{
    pricePerM2: number
    totalCost: number
    source: 'api' | 'district-average'
    isDemo: boolean
    stdrYear: number
    message?: string
    loading: boolean
  }>({ pricePerM2: 5000000, totalCost: 0, source: 'district-average', isDemo: true, stdrYear: 0, loading: false })
  
  // Centralized computed results - single source of truth
  const [legalSummary, setLegalSummary] = useState<LegalSummary | null>(null)
  const [feasibilityResult, setFeasibilityResult] = useState<FeasibilityResult | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [siteVisuals, setSiteVisuals] = useState<SiteVisualsConfig>(EMPTY_SITE_VISUALS)
  const [financialScenarios, setFinancialScenarios] = useState<FinancialScenariosConfig>(EMPTY_SCENARIOS_CONFIG)
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
  const [currentProjectName, setCurrentProjectName] = useState<string>("")
  const [recentProjects, setRecentProjects] = useState<ProjectListItem[]>([])
  const [showProjectComparison, setShowProjectComparison] = useState(false)
  
  // 최근 프로젝트 목록 로드
  useEffect(() => {
    if (mounted) {
      try { setRecentProjects(getRecentProjects(10)) } catch {}
    }
  }, [mounted, currentProjectId])
  
  // 자동 저장 — 배치안 생성 완료 시
  useEffect(() => {
    if (layouts.length > 0 && address && Number(siteArea) > 0) {
      const snapshot = getCurrentSnapshot?.()
      if (snapshot) {
        try {
          const saved = saveProjectToStorage(snapshot, currentProjectId || undefined, currentProjectName || `${address.split(' ').slice(-2).join(' ')}`)
          if (!currentProjectId) {
            setCurrentProjectId(saved.id)
            setCurrentProjectName(saved.name)
          }
          setRecentProjects(getRecentProjects(10))
          console.log('[auto-save] 프로젝트 자동 저장:', saved.name)
        } catch {}
      }
    }
  }, [layouts.length])
  const [canEdit, setCanEdit] = useState(true)
  const [showDashboard, setShowDashboard] = useState(false)
  
  // Download/Export states
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [downloadingHtml, setDownloadingHtml] = useState(false)
  const [downloadingExcel, setDownloadingExcel] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    // Initialize user
    getOrCreateUser().then(setCurrentUser)

    // 저장된 프로젝트 상태 복원
    try {
      const saved = localStorage.getItem('archi-scan-session')
      if (saved) {
        const s = JSON.parse(saved)
        if (s.address) setAddress(s.address)
        if (s.siteArea) setSiteArea(s.siteArea)
        if (s.strategy) setStrategy(s.strategy)
        if (s.regulation) {
          // zoneType, roadWidth는 자동조회 시 항상 새로 추론 (캐시 오염 방지)
          const { zoneType: _z, roadWidth: _r, roadCondition: _rc, ...safeRegulation } = s.regulation
          setRegulation(prev => ({ ...prev, ...safeRegulation }))
        }
        // supplementData, molitSupplementData는 복원 안 함
        // → 자동조회 시 항상 새로 추론 (캐시 오염 방지)
        if (s.layouts?.length) {
          setLayouts(s.layouts)
          if (s.currentStep && s.currentStep !== 'input') setCurrentStep(s.currentStep)
          if (s.selectedLayout != null) setSelectedLayout(s.selectedLayout)
        }
      }
    } catch {}
  }, [])

  // 핵심 상태 변경 시 자동 저장
  useEffect(() => {
    if (!mounted) return
    try {
      localStorage.setItem('archi-scan-session', JSON.stringify({
        address,
        siteArea,
        strategy,
        regulation,
        supplementData,
        molitSupplementData,
        layouts,
        currentStep,
        selectedLayout,
        savedAt: new Date().toISOString(),
      }))
    } catch {}
  }, [mounted, address, siteArea, strategy, regulation, supplementData, molitSupplementData, layouts, currentStep, selectedLayout])


  // Auto-calculate legalSummary when regulation or siteArea changes
  useEffect(() => {
    const siteAreaNum = safeNumber(siteArea, 660)
    const siteInput: SiteInput = {
      address,
      siteArea: siteAreaNum,
      zoneType: regulation.zoneType,
      roadCondition: regulation.roadWidth >= 12 ? '12m-plus' :
                     regulation.roadWidth >= 8 ? '8m-plus' :
                     regulation.roadWidth >= 6 ? '6m-plus' :
                     regulation.roadWidth >= 4 ? '4m-plus' : 'under-4m',
      roadWidth: regulation.roadWidth,
      heightLimit: regulation.maxHeight,
      floorLimit: regulation.maxFloors,
      hasDistrictPlan: regulation.additionalNotes.includes('지구단위'),
      districtPlanDetail: regulation.additionalNotes,
    }
    
    const summary = calculateLegalSummary(siteInput, regulation)
    setLegalSummary(summary)
    console.log('[v0] LegalSummary updated:', summary)
  }, [regulation, siteArea, address])

  // Auto-calculate feasibilityResult when selectedLayout changes
  useEffect(() => {
    if (selectedLayout === null || layouts.length === 0) {
      setFeasibilityResult(null)
      return
    }
    
    const layout = layouts.find(l => l.id === selectedLayout)
    if (!layout) {
      setFeasibilityResult(null)
      return
    }
    
    const siteAreaNum = safeNumber(siteArea, 660)
    
    // 분양가 우선순위: 실거래가 > 지역별 테이블 > 기본값
    const effectiveSalesPrice = (marketPrice.loaded && marketPrice.suggestedSalePrice > 0)
      ? marketPrice.suggestedSalePrice
      : regionalPricing 
        ? Math.round(regionalPricing.salesPricePerM2 * getZoneMultiplier(regulation.zoneType || ''))
        : undefined
    
    // 공사비: 지역별 테이블 > 기본값
    const effectiveConstCost = regionalPricing?.constructionCostPerM2 || undefined
    
    const result = calculateFeasibility({
      siteArea: siteAreaNum,
      grossFloorArea: layout.gfa,
      unitCount: layout.units,
      floorCount: layout.floors,
      parkingCount: layout.parking,
      landPricePerM2: landPriceData.pricePerM2 || 5000000,
      salesPricePerM2: effectiveSalesPrice,
      constructionCostPerM2: effectiveConstCost,
    })
    
    setFeasibilityResult(result)
    console.log('[v0] FeasibilityResult updated:', result, '분양가:', (effectiveSalesPrice || 8000000) / 10000, '만/㎡')
  }, [selectedLayout, layouts, siteArea, landPriceData.pricePerM2, marketPrice.suggestedSalePrice, regionalPricing, regulation.zoneType])

  const handleSiteInputComplete = () => {
    setCurrentStep("strategy")
  }

  /**
   * CRITICAL: Sync supplement data to regulation state
   * This ensures all downstream components (regulation, layouts, feasibility, report)
   * use the same source of truth for site conditions
   */
  const handleSupplementDataChange = (data: SupplementData) => {
    console.log('[v0] Syncing supplement data to regulation:', data)
    
    // Validate and extract zone type (filter out sentinel values)
    const validZoneTypes = ['residential-exclusive-1', 'residential-exclusive-2', 'residential-1', 'residential-2', 'residential-3', 'semi-residential', 'commercial-general', 'commercial-neighborhood', 'commercial-central', 'industrial', 'industrial-general', 'green-natural', 'green-production', 'green-conservation'] as const
    // zoneType이 비어있으면 기존 regulation 유지 (residential-2로 덮어쓰지 않음)
    const hasValidZone = data.zoneType && (validZoneTypes as readonly string[]).includes(data.zoneType)
    
    // Extract height limit (now number or null)
    const heightLimit = typeof data.heightLimit === 'number' ? data.heightLimit : 30
    
    // Map supplement data to regulation state
    setRegulation(prev => ({
      ...prev,
      // Map zoneType — 유효한 값이 있을 때만 업데이트
      zoneType: hasValidZone ? data.zoneType as typeof validZoneTypes[number] : prev.zoneType,
      // Map roadCondition to roadWidth
      roadWidth: data.roadCondition === '12m-plus' ? 12 :
                 data.roadCondition === '8m-plus' ? 8 :
                 data.roadCondition === '6m-plus' ? 6 :
                 data.roadCondition === '4m-plus' ? 4 :
                 data.roadCondition === 'under-4m' ? 3 : prev.roadWidth,
      roadCondition: data.roadCondition === '12m-plus' ? 'both' :
                     data.roadCondition === '8m-plus' ? 'corner' :
                     data.roadCondition === '6m-plus' ? 'single' :
                     data.roadCondition === '4m-plus' ? 'single' : prev.roadCondition,
      // Map height limit (now number)
      maxHeight: heightLimit,
      maxFloors: Math.floor(heightLimit / 3.3),
      // Map district plan - use boolean hasDistrictPlan
      additionalNotes: data.hasDistrictPlan 
        ? (data.districtPlanNotes || '지구단위계획 적용')
        : '',
      // Update ratios based on zone type (국계법 기준) — 유효한 zone이 있을 때만
      maxCoverageRatio: hasValidZone ? (
                        data.zoneType === 'residential-exclusive-1' ? 50 :
                        data.zoneType === 'residential-exclusive-2' ? 50 :
                        data.zoneType === 'residential-1' ? 60 :
                        data.zoneType === 'residential-2' ? 60 :
                        data.zoneType === 'residential-3' ? 50 :
                        data.zoneType === 'semi-residential' ? 70 :
                        data.zoneType === 'commercial-general' ? 80 :
                        data.zoneType === 'commercial-neighborhood' ? 70 :
                        data.zoneType === 'commercial-central' ? 90 :
                        data.zoneType === 'industrial-general' ? 70 :
                        data.zoneType === 'green-natural' ? 20 : prev.maxCoverageRatio
                        ) : prev.maxCoverageRatio,
      maxFloorAreaRatio: hasValidZone ? (
                         data.zoneType === 'residential-exclusive-1' ? 100 :
                         data.zoneType === 'residential-exclusive-2' ? 150 :
                         data.zoneType === 'residential-1' ? 200 :
                         data.zoneType === 'residential-2' ? 250 :
                         data.zoneType === 'residential-3' ? 300 :
                         data.zoneType === 'semi-residential' ? 500 :
                         data.zoneType === 'commercial-general' ? 1300 :
                         data.zoneType === 'commercial-neighborhood' ? 900 :
                         data.zoneType === 'commercial-central' ? 1500 :
                         data.zoneType === 'industrial-general' ? 400 :
                         data.zoneType === 'green-natural' ? 100 : prev.maxFloorAreaRatio
                         ) : prev.maxFloorAreaRatio,
    }))
    
    // Also update siteArea if provided
    if (data.siteArea && data.siteArea > 0) {
      setSiteArea(String(data.siteArea))
    } else if ((data.entX && data.entY) || data.bdMgtSn) {
      // MOLIT에서 면적 없으면 Vworld 지적도에서 자동 조회
      fetch('/api/vworld', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, siteArea: 0, entX: data.entX, entY: data.entY, bdMgtSn: data.bdMgtSn }),
      }).then(r => r.json()).then(vd => {
        if (vd.parcel?.area && vd.parcel.area > 0) {
          setSiteArea(prev => (!prev || prev === '' || Number(prev) === 0)
            ? String(Math.round(vd.parcel.area)) : prev)
          console.log('[v0] Vworld fallback 대지면적:', vd.parcel.area)
        }
      }).catch(() => {})
    }
    
    // MOLIT supplement 직접 저장 (법규검토 패널 우선 사용)
    const roadWidthNum = data.roadCondition === '12m-plus' ? 12 :
                         data.roadCondition === '8m-plus' ? 8 :
                         data.roadCondition === '6m-plus' ? 6 :
                         data.roadCondition === '4m-plus' ? 4 : 6
    setMolitSupplementData(prev => ({
      ...prev,
      zoneCode: hasValidZone ? data.zoneType : prev.zoneCode || '',
      roadWidth: roadWidthNum || prev.roadWidth,
      heightLimit: typeof data.heightLimit === 'number' ? data.heightLimit : prev.heightLimit ?? 30,
      hasDistrictPlan: data.hasDistrictPlan ?? prev.hasDistrictPlan ?? false,
    }))
    
    console.log('[v0] Regulation state updated from supplement data:', {
      zoneType: data.zoneType,
      heightLimit,
      hasDistrictPlan: data.hasDistrictPlan,
    })
  }

  const handleStrategyComplete = () => {
    setCurrentStep("regulation")
  }

  // MOLIT 자동조회 완료 즉시 → molitSupplementData 업데이트 (supplement 저장 불필요)
  // 용도지역 코드 매핑 헬퍼
  const mapZoneString = (raw: string): string => {
    if (!raw) return ''
    if (raw.includes('제1종전용')) return 'residential-exclusive-1'
    if (raw.includes('제2종전용')) return 'residential-exclusive-2'
    if (raw.includes('제1종일반')) return 'residential-1'
    if (raw.includes('제2종일반')) return 'residential-2'
    if (raw.includes('제3종일반')) return 'residential-3'
    if (raw.includes('준주거')) return 'semi-residential'
    if (raw.includes('일반주거')) return 'residential-2'
    if (raw.includes('전용주거')) return 'residential-exclusive-1'
    if (raw.includes('주거')) return 'residential-2'
    if (raw.includes('근린상업')) return 'commercial-neighborhood'
    if (raw.includes('중심상업')) return 'commercial-central'
    if (raw.includes('일반상업')) return 'commercial-general'
    if (raw.includes('유통상업')) return 'commercial-general'
    if (raw.includes('상업')) return 'commercial-general'
    if (raw.includes('일반공업')) return 'industrial-general'
    if (raw.includes('준공업')) return 'industrial-general'
    if (raw.includes('공업')) return 'industrial-general'
    if (raw.includes('자연녹지')) return 'green-natural'
    if (raw.includes('생산녹지')) return 'green-production'
    if (raw.includes('보전녹지')) return 'green-natural'
    if (raw.includes('녹지')) return 'green-natural'
    if (raw.includes('계획관리')) return 'management-planned'
    if (raw.includes('생산관리')) return 'management-planned'
    if (raw.includes('보전관리')) return 'management-planned'
    if (raw.includes('관리')) return 'management-planned'
    return ''
  }

  // 용도지역 코드로 regulation + molitSupplement 일괄 업데이트
  const applyZoneData = (
    zone: string, roadAddr: string, hasDistrict: boolean,
    extra: Record<string, any> = {}
  ) => {
    const heightByZone: Record<string, number> = {
      'residential-exclusive-1': 9, 'residential-exclusive-2': 12,
      'residential-1': 12, 'residential-2': 20, 'residential-3': 30,
      'semi-residential': 45, 'commercial-neighborhood': 45,
      'commercial-general': 60, 'commercial-central': 200,
      'industrial-general': 30, 'green-natural': 20,
      'green-production': 20, 'management-planned': 20,
    }
    const coverageByZone: Record<string, number> = {
      'residential-exclusive-1': 50, 'residential-exclusive-2': 50,
      'residential-1': 60, 'residential-2': 60, 'residential-3': 50,
      'semi-residential': 70, 'commercial-neighborhood': 70,
      'commercial-general': 80, 'commercial-central': 90,
      'industrial-general': 70, 'green-natural': 20,
    }
    const farByZone: Record<string, number> = {
      'residential-exclusive-1': 100, 'residential-exclusive-2': 150,
      'residential-1': 200, 'residential-2': 250, 'residential-3': 300,
      'semi-residential': 500, 'commercial-neighborhood': 900,
      'commercial-general': 1300, 'commercial-central': 1500,
      'industrial-general': 400, 'green-natural': 100,
    }
    const roadNameOnly = roadAddr.replace(/.*[구군시]\s*/,'')
    const roadWidth = roadNameOnly.includes('대로') ? 25 :
                      roadNameOnly.includes('길')   ? 4 :
                      roadNameOnly.includes('로')   ? 12 :
                      roadAddr.match(/\d+-\d+|\d+번지|동\s*\d/) ? 4 : 8  // 지번주소면 4m
    const roadConditionEnum = roadWidth >= 12 ? '12m-plus' :
                              roadWidth >= 8  ? '8m-plus' :
                              roadWidth >= 6  ? '6m-plus' :
                              roadWidth >= 4  ? '4m-plus' : 'under-4m'
    const heightLimit = heightByZone[zone] ?? 30

    setMolitSupplementData(prev => ({ ...prev, zoneCode: zone, roadWidth, heightLimit, hasDistrictPlan: hasDistrict, ...extra }))
    setSupplementKey(k => k + 1)  // useEffect 강제 재실행

    const validZoneTypes = ['residential-exclusive-1','residential-exclusive-2','residential-1','residential-2','residential-3','semi-residential',
      'commercial-general','commercial-neighborhood','commercial-central','industrial','industrial-general','green-natural','green-production','green-conservation'] as const
    type VZ = typeof validZoneTypes[number]
    setRegulation(prev => ({
      ...prev,
      zoneType: (validZoneTypes as readonly string[]).includes(zone) ? (zone as VZ) : prev.zoneType,
      maxHeight: heightLimit, maxFloors: Math.floor(heightLimit / 3.3),
      roadWidth, roadCondition: roadConditionEnum as import('@/lib/regulation-types').RoadCondition,
      additionalNotes: hasDistrict ? '지구단위계획 적용' : prev.additionalNotes,
      maxCoverageRatio: coverageByZone[zone] ?? prev.maxCoverageRatio,
      maxFloorAreaRatio: farByZone[zone] ?? prev.maxFloorAreaRatio,
    }))
    console.log('[v0] applyZoneData:', zone, 'roadWidth:', roadWidth, 'height:', heightLimit)
  }

  const handleMolitDataFetched = (data: {
    zoneType?: string; area?: string; district?: string
    roadAddress?: string; siteArea?: number
    entX?: number; entY?: number
    sigunguCd?: string; bjdongCd?: string; bun?: string; ji?: string
    buildingCoverage?: number; floorAreaRatio?: number
    bdMgtSn?: string
  }) => {
    const vwZone = (data as any)?._vworldZoneCode
    // vworld-zone 결과 전달인 경우: zone만 적용하고 나머지는 건드리지 않음
    if (vwZone) {
      const roadAddr = data.roadAddress || address || ''
      const vwDistrict = (data as any)?._vworldHasDistrict ?? false
      const coords = { entX: data.entX, entY: data.entY, sigunguCd: data.sigunguCd, bjdongCd: data.bjdongCd, bun: data.bun, ji: data.ji, bdMgtSn: data.bdMgtSn }
      applyZoneData(vwZone, roadAddr, vwDistrict, coords)
      console.log('[v0] site-input-form에서 전달된 zone:', vwZone)
      // siteArea가 아직 비어있으면 Vworld에서 면적 자동 조회 (좌표 또는 PNU)
      if ((data.entX && data.entY) || data.bdMgtSn) {
        fetch('/api/vworld', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: roadAddr || address, siteArea: 0, entX: data.entX, entY: data.entY, bdMgtSn: data.bdMgtSn }),
        }).then(r => r.json()).then(vd => {
          if (vd.parcel?.area && vd.parcel.area > 0) {
            setSiteArea(prev => (!prev || prev === '' || Number(prev) === 0)
              ? String(Math.round(vd.parcel.area)) : prev)
            console.log('[v0] zone-path Vworld 대지면적:', vd.parcel.area)
          }
        }).catch(() => {})
      }
      return
    }
    // MOLIT 조회 결과 처리 — 기존 vworld-zone 데이터 보존
    setMolitSupplementData(prev => ({ ...prev }))
    if (data.bdMgtSn) setSiteBdMgtSn(data.bdMgtSn)
    const mappedZone = mapZoneString(data.zoneType || '')
    const roadAddr = data.roadAddress || address || ''
    const hasDistrict = !!((data.area?.includes('지구단위')) || (data.district?.includes('지구단위')))
    const coords = { entX: data.entX, entY: data.entY, sigunguCd: data.sigunguCd, bjdongCd: data.bjdongCd, bun: data.bun, ji: data.ji, bdMgtSn: data.bdMgtSn }

    if (data.siteArea && data.siteArea > 0) {
      setSiteArea(String(Math.round(data.siteArea)))
    } else {
      // siteArea 없으면 /api/vworld(지적도)에서 면적 자동 조회
      const vworldAddr = roadAddr || address
      if (vworldAddr || data.bdMgtSn) {
        fetch('/api/vworld', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: vworldAddr, siteArea: 0, entX: data.entX, entY: data.entY, bdMgtSn: data.bdMgtSn }),
        }).then(r => r.json()).then(vd => {
          if (vd.parcel?.area && vd.parcel.area > 0) {
            setSiteArea(prev => (!prev || prev === '' || Number(prev) === 0)
              ? String(Math.round(vd.parcel.area)) : prev)
            console.log('[v0] /api/vworld 대지면적 자동입력:', vd.parcel.area)
          }
        }).catch(() => {})
      }
    }

    // 용도지역: vwZone 처리는 상단 early return에서 완료
    // MOLIT 건축물대장 용도지역을 fallback으로 저장 (vworld-zone이 빈 값일 때 사용)
    const molitMappedZone = mapZoneString(data.zoneType || '')
    setMolitSupplementData(prev => ({ 
      ...prev, 
      ...coords,
      // vworld-zone 결과가 아직 없으면 MOLIT zone을 fallback으로 저장
      zoneCode: prev.zoneCode || molitMappedZone || prev.zoneCode,
    }))
    
    // regulation의 접도/지구단위 즉시 업데이트 (zoneType은 applyZoneData에서 설정)
    const roadNameOnly = roadAddr.replace(/.*[구군시]\s*/,'')
    const earlyRoadWidth = roadNameOnly.includes('대로') ? 25 :
                           roadNameOnly.includes('길') ? 4 :
                           roadNameOnly.includes('로') ? 12 : 8
    setRegulation(prev => ({
      ...prev,
      roadWidth: earlyRoadWidth,
      roadCondition: (earlyRoadWidth >= 12 ? 'both' : earlyRoadWidth >= 8 ? 'corner' : 'single') as any,
      additionalNotes: hasDistrict ? '지구단위계획 적용' : prev.additionalNotes,
    }))

    // 공시지가 자동 조회
    setLandPriceData(prev => ({ ...prev, loading: true }))
    fetchLandPrice({
      sigunguCd: data.sigunguCd || (data as any).sigunguCode,
      bjdongCd: data.bjdongCd || (data as any).bjdongCode,
      bun: data.bun, ji: data.ji, address: roadAddr,
      siteArea: data.siteArea || safeNumber(siteArea, 660),
      entX: data.entX, entY: data.entY,
      bdMgtSn: data.bdMgtSn,
    }).then(result => {
      setLandPriceData({ pricePerM2: result.landPricePerM2, totalCost: result.totalLandCost,
        source: result.source, isDemo: result.isDemo, stdrYear: result.stdrYear,
        message: result.message, loading: false })
      // 공시지가 API에서 필지면적이 오면 대지면적 자동입력
      if (result.siteArea && result.siteArea > 0) {
        setSiteArea(prev => (!prev || prev === '' || Number(prev) === 0) ? String(Math.round(result.siteArea!)) : prev)
      }
    }).catch(() => setLandPriceData(prev => ({ ...prev, loading: false })))
    
    // 실거래가 자동 조회
    const sgCd = data.sigunguCd || (data as any).sigunguCode
    
    // 지역별 공사비·분양가 테이블 자동 적용 (실거래가 보완용)
    if (sgCd || roadAddr || address) {
      const pricing = getRegionalPricing(sgCd, roadAddr || address)
      setRegionalPricing(pricing)
      console.log('[v0] 지역별 시세:', pricing.regionName, pricing.tier, '분양가:', pricing.salesPricePerM2 / 10000, '만/㎡, 공사비:', pricing.constructionCostPerM2 / 10000, '만/㎡')
    }
    
    if (sgCd && sgCd.length >= 5) {
      fetch(`/api/real-price?sigunguCd=${sgCd}`)
        .then(r => r.json())
        .then(result => {
          if (result.avgPricePerM2 > 0) {
            setMarketPrice({
              avgPricePerM2: result.avgPricePerM2,
              suggestedSalePrice: result.suggestedSalePrice,
              transactionCount: result.transactionCount,
              loaded: true,
              transactions: (result.transactions || []).slice(0, 30),
            })
            console.log(`[market-price] 실거래가: ${(result.avgPricePerM2/10000).toFixed(0)}만원/㎡, 추천 분양가: ${(result.suggestedSalePrice/10000).toFixed(0)}만원/㎡ (${result.transactionCount}건)`)
          }
        })
        .catch(() => {})
    }
  }


  const handleGenerate = async () => {
    setIsGenerating(true)
    setSelectedLayout(null)
    setCurrentStep("layouts")
    
    try {
      // Generate layouts first (synchronous calculation)
      const area = Number(siteArea)
      const generatedLayouts = generateLayouts(area, regulation, strategy)
      
      // Simulate AI processing time
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Save project to database
      let project: Project | null = null
      try {
        project = await saveProject({
          userId: currentUser?.id || null,
          address,
          siteArea: area,
          zoneType: regulation.zoneType,
          designStrategy: strategy,
        })
        
        if (project) {
          setCurrentProject(project)
          console.log("[v0] Project saved:", project.id)
        }
      } catch (dbError) {
        console.error("[v0] Supabase project save error:", dbError)
      }
      
      // Set layouts to state
      setLayouts(generatedLayouts)
      
      // Save layouts to database (non-blocking)
      if (project) {
        try {
          await saveLayouts(project.id, generatedLayouts.map(l => ({
            name: l.name,
            type: l.type,
            floors: l.floors,
            units: l.units,
            coverage: l.coverage,
            parking: l.parking,
            gfa: l.gfa,
            scores: l.scores,
            isRecommended: l.recommendation.isRecommended,
          })))
          console.log("[v0] Layouts saved for project:", project.id)
        } catch (dbError) {
          console.error("[v0] Supabase layouts save error:", dbError)
        }
      }
      
    } catch (error) {
      console.error("[v0] Layout generation error:", error)
      alert("배치 생성 중 오류가 발생했습니다. 다시 시도해 주세요.")
    } finally {
      setIsGenerating(false)
    }
  }

  const selectedLayoutData = layouts.find((l) => l.id === selectedLayout) || null
  
  // Debug: Log selected layout data for troubleshooting
  if (selectedLayoutData && process.env.NODE_ENV === 'development') {
    console.log('[v0] selectedLayoutData:', {
      id: selectedLayoutData.id,
      name: selectedLayoutData.name,
      units: selectedLayoutData.units,
      floors: selectedLayoutData.floors,
      parking: selectedLayoutData.parking,
      coverage: selectedLayoutData.coverage,
      scoreTotal: selectedLayoutData.scores?.overall
    })
  }
  const siteAreaNum = Number(siteArea) || 0
  const gfa = selectedLayoutData ? selectedLayoutData.gfa : 0

  const handleSelectLayout = (id: number) => {
    setSelectedLayout(id)
    setSelectedFloor(1)
  }

  // 추천 배치안 찾기
  const recommendedLayout = layouts.find(l => l.recommendation.isRecommended) || layouts[0]

  // Handle Excel import
  const handleExcelImport = (importedData: ImportedReportData) => {
    // Update state with imported data
    setAddress(importedData.address || '')
    setSiteArea(importedData.siteArea && importedData.siteArea > 0 ? String(importedData.siteArea) : '')
    
    // Safe layouts access with fallback
    const importedLayouts = importedData.layouts || []
    if (importedLayouts.length === 0) {
      console.warn('[v0] No layouts found in imported data')
      return
    }
    
    // Convert imported layouts to LayoutOption format with required fields
    const convertedLayouts: LayoutOption[] = importedLayouts.map((l, idx) => ({
      ...l,
      id: idx + 1,
      type: (l.type || "tower") as LayoutOption["type"],
      gfa: importedData.gfa || l.units * 85, // Estimate if not provided
      openSpace: 100 - l.coverage,
      scores: {
        profitability: 75,
        livability: 75,
        regulatory: 85,
        efficiency: 80,
        overall: 78,
      },
      recommendation: {
        isRecommended: idx === 0,
        rank: idx + 1,
        strategyMatch: 80 - idx * 10,
        strengths: l.features.slice(0, 2),
        weaknesses: [],
        summary: l.description || `${l.name} 배치안`,
      },
      reasoning: {
        mainPoints: [`${l.name} 배치안 특성`],
        details: l.description || '',
        recommendation: '엑셀 데이터 기반 분석',
      },
    }))
    
    setLayouts(convertedLayouts)
    
    // Select the first layout
    if (convertedLayouts.length > 0) {
      setSelectedLayout(convertedLayouts[0].id)
    }
    
    // Update regulation if provided
    if (importedData.regulation) {
      setRegulation(importedData.regulation as ZoningRegulation)
    }
    
    // Go directly to report step
    setCurrentStep("report")
  }

  // Create current project snapshot for save/load
  // Uses SAME financial formula as report-summary.tsx and dashboard-config.ts
  const getCurrentSnapshot = (): ProjectSnapshot | null => {
    if (!address || layouts.length === 0) return null
    
    const selected = layouts.find(l => l.id === selectedLayout) || layouts[0]
    const recommended = recommendedLayout
    
    // Calculate financials using UNIFIED formula (synced with calculateFeasibility)
    const area = Number(siteArea)
    const gfa = Math.round(area * (selected.coverage / 100) * selected.floors)
    const heightPremium = selected.floors > 15 ? 1.15 : selected.floors > 10 ? 1.08 : 1.0
    const landCost = area * 5000000 // 5M per sqm (unified)
    const constructionCost = gfa * 2500000 * heightPremium // 2.5M per sqm (unified)
    const otherCosts = constructionCost * 0.15 // 15% soft costs (unified)
    const parkingCost = selected.parking * 30000000 // parking cost
    const totalInvestment = landCost + constructionCost + otherCosts + parkingCost
    const projectedRevenue = gfa * 8000000 // 8M per sqm (unified, area-based)
    const profit = projectedRevenue - totalInvestment
    const roi = totalInvestment > 0 ? (profit / totalInvestment) * 100 : 0
    
    return {
      address,
      siteArea: area,
      projectType: '공동주택 신축사업',
      dateStr: new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }),
      docNumber: `AS-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      zoneType: regulation.zoneType,
      landUsePlan: '도시지역',
      roadAccess: '8m 도로 접함',
      regulation: {
        zoneType: regulation.zoneType,
        coverageRatio: regulation.coverageRatio,
        floorAreaRatio: regulation.floorAreaRatio,
        maxHeight: regulation.maxHeight,
        maxFloors: regulation.maxFloors,
      },
      layouts: layouts.map(l => ({
        id: l.id,
        name: l.name,
        type: l.type,
        description: l.description,
        coverage: l.coverage,
        units: l.units,
        floors: l.floors,
        parking: l.parking,
        features: l.features,
        gfa: l.gfa,
        openSpace: l.openSpace,
        scores: l.scores,
        recommendation: l.recommendation,
        reasoning: l.reasoning,
      })),
      selectedLayoutId: selected.id,
      recommendedLayoutId: recommended?.id || selected.id,
      financials: {
        landCost,
        constructionCost,
        otherCosts,
        totalInvestment,
        projectedRevenue,
        profit,
        roi,
      },
      risks: [
        { title: '토지 관련', items: ['소유권 및 지분관계 확인 필요', '지장물 철거비용 발생 가능', '토양오염 검사 필요'] },
        { title: '인허가 관련', items: ['건축위원회 심의에 따른 규모 조정', '환경/교통영향평가 대상 여부', '각종 부담금 발생 가능성'] },
        { title: '시장 관련', items: ['인근 경쟁 물량에 따른 분양 리스크', '부동산 경기 변동에 따른 분양률 하락', '금리 변동에 따른 수요 변화'] },
        { title: '공사 관련', items: ['지하수위 및 지반조건 확인', '건자재 가격 상승 리스크', '공사기간 지연 가능성'] },
      ],
      conclusionText: `상기 대상지는 ${area.toLocaleString()}㎡ 규모로서, ${selected.name}을 적용하여 지상 ${selected.floors}층, 총 ${selected.units}세대 규모의 공동주택 개발이 가능한 것으로 분석됩니다.`,
      recommendationType: roi > 20 ? 'positive' : roi > 12 ? 'conditional' : 'cautious',
    }
  }

  // Handle project load from saved snapshot
  const handleProjectLoad = (snapshot: ProjectSnapshot) => {
    if (!snapshot) {
      console.warn('[v0] handleProjectLoad called with null/undefined snapshot')
      return
    }
    
    setAddress(snapshot.address || '')
    setSiteArea(snapshot.siteArea && snapshot.siteArea > 0 ? String(snapshot.siteArea) : '')
    
    // Restore regulation (with safe fallback)
    const snapshotRegulation = snapshot.regulation || {}
    setRegulation({
      ...regulation,
      zoneType: snapshotRegulation.zoneType || regulation.zoneType,
      coverageRatio: snapshotRegulation.coverageRatio || regulation.coverageRatio,
      floorAreaRatio: snapshotRegulation.floorAreaRatio || regulation.floorAreaRatio,
      maxHeight: snapshotRegulation.maxHeight || regulation.maxHeight,
      maxFloors: snapshotRegulation.maxFloors || regulation.maxFloors,
    })
    
    // Restore layouts (with safe fallback)
    const snapshotLayouts = snapshot.layouts || []
    if (snapshotLayouts.length === 0) {
      console.warn('[v0] No layouts found in snapshot, using empty array')
    }
    const restoredLayouts: LayoutOption[] = snapshotLayouts.map(l => ({
      id: l.id,
      name: l.name,
      type: l.type as LayoutOption["type"],
      description: l.description,
      coverage: l.coverage,
      units: l.units,
      floors: l.floors,
      parking: l.parking,
      features: l.features,
      gfa: l.gfa || l.units * 85,
      openSpace: l.openSpace || 100 - l.coverage,
      scores: l.scores || {
        profitability: 75,
        livability: 75,
        regulatory: 85,
        efficiency: 80,
        overall: 78,
      },
      recommendation: l.recommendation || {
        isRecommended: l.id === snapshot.recommendedLayoutId,
        rank: l.id,
        strategyMatch: 80,
        strengths: l.features.slice(0, 2),
        weaknesses: [],
        summary: l.description,
      },
      reasoning: l.reasoning || {
        mainPoints: [`${l.name} 배치안 특성`],
        details: l.description,
        recommendation: '저장된 프로젝트 복원',
      },
    }))
    
    setLayouts(restoredLayouts)
    setSelectedLayout(snapshot.selectedLayoutId)
    setCurrentStep("report")
  }

  // Handle opening project from dashboard
  const handleDashboardOpenProject = (snapshot: ProjectSnapshot, projectId: string, projectName: string) => {
    setCurrentProjectId(projectId)
    setCurrentProjectName(projectName)
    handleProjectLoad(snapshot)
    setShowDashboard(false)
  }

  const STEP_LABELS = {
    input: "\uB300\uC9C0 \uC785\uB825",
    strategy: "\uC124\uACC4 \uC804\uB7B5",
    regulation: "\uBC95\uADDC \uAC80\uD1A0",
    layouts: "\uBC30\uCE58\uC548",
    floorplan: "\uD3C9\uBA74\uB3C4",
    financial: "\uC0AC\uC5C5\uC131",
    report: "\uBCF4\uACE0\uC11C",
  }
  
  const steps = [
    { id: "input", label: STEP_LABELS.input, icon: Building2 },
    { id: "strategy", label: STEP_LABELS.strategy, icon: Brain },
    { id: "regulation", label: STEP_LABELS.regulation, icon: Scale },
    { id: "layouts", label: STEP_LABELS.layouts, icon: LayoutGrid },
    { id: "floorplan", label: STEP_LABELS.floorplan, icon: Layers },
    { id: "financial", label: STEP_LABELS.financial, icon: Banknote },
    { id: "report", label: STEP_LABELS.report, icon: FileText },
  ]

  const isStepClickable = (stepId: string) => {
    if (stepId === "input") return true
    if (stepId === "strategy") return siteArea.trim() !== ""
    if (stepId === "regulation") return siteArea.trim() !== ""
    if (stepId === "layouts") return layouts.length > 0
    if (stepId === "floorplan" || stepId === "financial" || stepId === "report") {
      return selectedLayout !== null
    }
    return false
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-lg animate-pulse">
            <Building2 className="h-8 w-8 text-primary-foreground" />
          </div>
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (showDashboard) {
    return (
      <Dashboard
        onOpenProject={handleDashboardOpenProject}
        onClose={() => setShowDashboard(false)}
        canEdit={canEdit}
      />
    )
  }

  return (
    <ErrorBoundary>
    <div className="min-h-screen bg-background">
      {/* 3D 볼륨 모델 모달 */}
      {show3DVolume && selectedLayoutData && (
        <BuildingVolume3D
          layoutName={selectedLayoutData.name}
          layoutType={selectedLayoutData.type as any}
          floors={selectedLayoutData.floors}
          siteArea={siteAreaNum}
          coverage={selectedLayoutData.coverage}
          sitePolygon={sitePolygon}
          onClose={() => setShow3DVolume(false)}
        />
      )}

      {/* 브랜딩 설정 모달 */}
      {showBrandingEditor && branding && (
        <BrandingEditor
          branding={branding}
          onChange={setBranding}
          onClose={() => setShowBrandingEditor(false)}
        />
      )}

      {/* DXF 미리보기 모달 - 실제 FloorPlan 컴포넌트 사용 */}
      {showDxfPreview && selectedLayoutData && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 shrink-0">
            <div>
              <span className="text-sm font-semibold text-foreground">DXF 미리보기</span>
              <span className="text-xs text-muted-foreground ml-2">{selectedLayoutData.name} · {selectedFloor}층/{selectedLayoutData.floors}층</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const dxf = generateFloorPlanDXF({
                    type: selectedLayoutData.type,
                    floor: selectedFloor,
                    totalFloors: selectedLayoutData.floors,
                    strategy,
                    layoutName: selectedLayoutData.name,
                    siteArea,
                    units: selectedLayoutData.units,
                    floors: selectedLayoutData.floors,
                    parking: selectedLayoutData.parking,
                    sitePolygon: sitePolygon ?? undefined,
                  })
                  const addr = address.replace(/\s+/g, '_').replace(/[^\w가-힣]/g, '')
                  downloadDXF(dxf, `ArchiScan_${addr}_${selectedLayoutData.name}_${selectedFloor}F.dxf`)
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                DXF 저장
              </button>
              <button
                onClick={() => setShowDxfPreview(false)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground"
              >
                닫기
              </button>
            </div>
          </div>

          {/* 층 선택 탭 */}
          <div className="flex gap-1 px-4 py-2 border-b border-border/30 shrink-0 overflow-x-auto">
            {Array.from({ length: selectedLayoutData.floors }, (_, i) => i + 1).map(f => (
              <button
                key={f}
                onClick={() => setSelectedFloor(f)}
                className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedFloor === f
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                }`}
              >
                {f === 1 ? '1층 로비' : f === selectedLayoutData.floors ? `${f}층 최상` : `${f}층`}
              </button>
            ))}
          </div>

          {/* 실제 FloorPlan 컴포넌트 */}
          <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
            <div className="w-full h-full flex items-center justify-center" style={{ maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100vh - 180px)', aspectRatio: '3/2' }}>
              <FloorPlan
                type={selectedLayoutData.type}
                floor={selectedFloor}
                totalFloors={selectedLayoutData.floors}
                strategy={strategy}
                zoneType={molitSupplementData.zoneCode || regulation.zoneType}
                units={selectedLayoutData.units}
                gfa={selectedLayoutData.gfa || gfa}
              />
            </div>
          </div>

          <div className="px-4 py-2 text-center text-[11px] text-muted-foreground border-t border-border/50 shrink-0">
            DXF 저장 시 위 평면도와 동일한 구성의 CAD 파일이 생성됩니다.
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 md:px-6 py-4 overflow-x-hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 md:gap-4 shrink-0">
              <button 
                className="flex items-center gap-2 md:gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setShowDashboard(true)}
                title="대시보드 열기"
              >
                <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 shrink-0">
                  <Building2 className="h-4 w-4 md:h-6 md:w-6 text-primary-foreground" />
                </div>
                <div className="hidden xs:block text-left">
                  <h1 className="text-base md:text-xl font-bold tracking-tight text-foreground">Archi-Scan</h1>
                  <p className="text-[10px] md:text-xs text-muted-foreground">AI 건축 배치안 생성기</p>
                </div>
              </button>
              <div className="hidden md:block">
                <UserBadge />
              </div>
              <button onClick={() => setShowBrandingEditor(true)} className="p-2 rounded-lg hover:bg-secondary transition-colors" title="보고서 브랜딩 설정">
                <Settings2 className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Action Buttons - scrollable on mobile */}
            <div className="flex items-center gap-1 md:gap-2 overflow-x-auto scrollbar-hide max-w-[60vw] md:max-w-none">
            {/* Dashboard Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDashboard(true)}
              className="gap-2"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">대시보드</span>
            </Button>
            
            {/* Project Manager - Save/Load */}
            <ProjectManager
              currentSnapshot={getCurrentSnapshot()}
              onLoad={handleProjectLoad}
              onSaveSuccess={(project) => {
                setCurrentProjectId(project.id)
                setCurrentProjectName(project.name)
              }}
              currentProjectId={currentProjectId || undefined}
              canSave={canEdit}
            />
            
            {/* Version History Manager (only shown when project is saved) */}
            {currentProjectId && currentProjectName && (
              <VersionHistoryManager
                projectId={currentProjectId}
                projectName={currentProjectName}
                currentSnapshot={getCurrentSnapshot()}
                onLoadVersion={handleProjectLoad}
                canSaveVersion={canEdit}
              />
            )}
            
            {/* Excel Import (only when can edit) */}
            {canEdit && <ExcelImport onImport={handleExcelImport} />}
            
            {/* Site Visuals Manager */}
            {canEdit && (
              <SiteVisualsManager
                visuals={siteVisuals}
                onChange={setSiteVisuals}
              />
            )}
            
            {/* Approval Workflow Manager */}
            <ApprovalWorkflowManager
              projectId={currentProjectId}
              projectName={currentProjectName}
              onEditingStateChange={setCanEdit}
            />
            
            {/* Collaboration Manager */}
            <CollaborationManager
              projectId={currentProjectId}
              projectName={currentProjectName}
              canEdit={canEdit}
            />
            
            {/* Pricing Button */}
            {!isProUser && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowPricingModal(true)}
                className="hidden md:flex items-center gap-2"
              >
                <CreditCard className="h-4 w-4" />
                요금제
              </Button>
            )}

            {/* 자동저장 표시 + 새 프로젝트 */}
            {address && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm('현재 작업을 지우고 새 프로젝트를 시작할까요?')) {
                    localStorage.removeItem('archi-scan-session')
                    window.location.reload()
                  }
                }}
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                title="새 프로젝트 시작"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                <span className="hidden sm:inline">새 프로젝트</span>
              </Button>
            )}
            </div>

          </div>
          
          {/* Progress Steps - Desktop */}
          <div className="hidden xl:flex items-center gap-1">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = currentStep === step.id
              const isPast = steps.findIndex(s => s.id === currentStep) > index
              const isClickable = isStepClickable(step.id)
              
              return (
                <button
                  key={step.id}
                  onClick={() => isClickable && setCurrentStep(step.id as AppStep)}
                  disabled={!isClickable}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all text-xs ${
                    isActive 
                      ? "bg-primary text-primary-foreground" 
                      : isPast 
                        ? "bg-primary/20 text-primary cursor-pointer hover:bg-primary/30" 
                        : isClickable 
                          ? "text-muted-foreground hover:bg-secondary cursor-pointer"
                          : "text-muted-foreground/50 cursor-not-allowed"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="font-medium">{step.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 md:px-6 py-6 md:py-8 pb-16 md:pb-8">
        {/* Mobile Step Indicator */}
        <div className="xl:hidden mb-6">
          <div className="flex items-center justify-between bg-secondary/50 rounded-lg p-3">
            <span className="text-sm font-medium text-foreground">
              단계 {steps.findIndex(s => s.id === currentStep) + 1} / {steps.length}
            </span>
            <span className="text-sm text-muted-foreground">
              {steps.find(s => s.id === currentStep)?.label}
            </span>
          </div>
          {/* Mobile Step Dots */}
          <div className="flex justify-center gap-1.5 mt-3">
            {steps.map((step, index) => {
              const isActive = currentStep === step.id
              const isPast = steps.findIndex(s => s.id === currentStep) > index
              return (
                <button
                  key={step.id}
                  onClick={() => isStepClickable(step.id) && setCurrentStep(step.id as AppStep)}
                  disabled={!isStepClickable(step.id)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    isActive 
                      ? "bg-primary w-6" 
                      : isPast 
                        ? "bg-primary/50" 
                        : "bg-muted"
                  }`}
                />
              )
            })}
          </div>
        </div>

        {/* Step: Input */}
        {currentStep === "input" && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] md:min-h-[60vh]">
            <div className="w-full max-w-md">
              {/* 이전 작업 복원 알림 */}
              {address && mounted && (() => {
                try {
                  const saved = localStorage.getItem('archi-scan-session')
                  const s = saved ? JSON.parse(saved) : null
                  return s?.savedAt ? (
                    <div className="mb-3 flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs text-emerald-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v14a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                      이전 작업이 자동 복원됐습니다 ({new Date(s.savedAt).toLocaleString('ko', {month:'numeric',day:'numeric',hour:'numeric',minute:'2-digit'})})
                    </div>
                  ) : null
                } catch { return null }
              })()}

              {/* Dev Mode Scenario Selector */}
              <ScenarioSelector 
                className="mb-4"
                onApplyScenario={(scenario) => {
                  // 대지 입력
                  setAddress(scenario.input.address)
                  setSiteArea(String(scenario.input.siteArea))
                  // 보완 입력 데이터도 함께 적용
                  setSupplementData({
                    zoneType: scenario.input.zoning,
                    roadWidth: scenario.input.road.includes("8m") ? "8m 이상" : "6m 이상",
                    heightLimit: parseInt(scenario.input.heightLimit) || 30,
                    districtPlan: scenario.input.districtPlan,
                    note: `[DEV] ${scenario.label} 시나리오 자동 적용`,
                  })
                  // 전략도 자동 선택
                  const strategyMap: Record<string, "area-maximize" | "profitability" | "parking-efficient" | "livability"> = {
                    "면적 확보형": "area-maximize",
                    "사업성 우선형": "profitability",
                    "조망 우선형": "livability",
                    "실거주 최적형": "livability",
                  }
                  setStrategy(strategyMap[scenario.input.selectedStrategy] || "area-maximize")
                }}
              />
              
              <div className="text-center mb-6 md:mb-8">
                <div className="flex justify-center mb-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-lg">
                    <Building2 className="h-8 w-8 text-primary-foreground" />
                  </div>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">{ARCHISCAN_COPY.entry.pageTitle}</h2>
                <p className="text-sm md:text-base text-muted-foreground">{ARCHISCAN_COPY.entry.pageDescription}</p>
              </div>
              <Card className="w-full">
                <CardHeader>
                  <CardTitle className="text-xl">대상지 정보</CardTitle>
                </CardHeader>
                <CardContent>
                  <SiteInputForm
                    address={address}
                    siteArea={siteArea}
                    onAddressChange={setAddress}
                    onSiteAreaChange={setSiteArea}
                    onGenerate={handleSiteInputComplete}
                    isGenerating={false}
                    buttonText="설계 전략 선택으로"
                    onSupplementDataChange={handleSupplementDataChange}
                    onMolitDataFetched={handleMolitDataFetched}
                    externalSupplement={molitSupplementData.zoneCode ? { ...molitSupplementData, _key: supplementKey } : null}
                  />
                </CardContent>
              </Card>
              
              {/* 최근 프로젝트 */}
              {recentProjects.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-3 w-3" /> 최근 프로젝트
                    </p>
                    {recentProjects.length >= 2 && (
                      <button onClick={() => setShowProjectComparison(prev => !prev)}
                        className="text-xs text-primary hover:underline flex items-center gap-1">
                        {showProjectComparison ? '비교 닫기' : '프로젝트 비교'}
                      </button>
                    )}
                  </div>
                  
                  {showProjectComparison && (
                    <div className="mb-3">
                      <ProjectComparison
                        onClose={() => setShowProjectComparison(false)}
                        onLoadProject={(id) => {
                          try {
                            const proj = loadProjectFromStorage(id)
                            if (proj?.data) {
                              handleProjectLoad(proj.data)
                              setCurrentProjectId(proj.id)
                              setCurrentProjectName(proj.name)
                              setShowProjectComparison(false)
                            }
                          } catch {}
                        }}
                      />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    {recentProjects.slice(0, 3).map(p => (
                      <button key={p.id} onClick={() => {
                        try {
                          const proj = loadProjectFromStorage(p.id)
                          if (proj?.data) {
                            handleProjectLoad(proj.data)
                            setCurrentProjectId(proj.id)
                            setCurrentProjectName(proj.name)
                          }
                        } catch {}
                      }}
                        className="w-full text-left px-3 py-2 rounded-lg border border-border/50 bg-secondary/20 hover:bg-secondary/40 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-foreground truncate">{p.name}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                            {new Date(p.updatedAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">{p.address} · {p.siteArea?.toLocaleString()}㎡</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step: Strategy Selection */}
        {currentStep === "strategy" && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Brain className="h-5 w-5 text-primary" />
                  <h2 className="text-xl md:text-2xl font-bold text-foreground">AI 설계 전략</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  {address} · {Number(siteArea).toLocaleString()}㎡ | 배치안 생성 방향을 선택하세요
                </p>
              </div>
              <Button onClick={handleStrategyComplete} className="gap-2 w-full md:w-auto">
                법규 검토
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <StrategySelection 
  selected={strategy} 
  onChange={setStrategy}
  legalSummary={legalSummary}
  siteConditions={{
    siteArea: safeNumber(siteArea, 660),
    zoneType: molitSupplementData.zoneCode || regulation.zoneType,
    roadCondition: `${molitSupplementData.roadWidth || regulation.roadWidth}m 이상`,
    heightLimit: String(molitSupplementData.heightLimit || regulation.maxHeight),
    districtPlan: (molitSupplementData.hasDistrictPlan ?? regulation.additionalNotes.includes('지구단위')) ? '적용' : '없음',
  }}
/>

            <div className="flex justify-center pt-4">
              <Button onClick={handleStrategyComplete} size="lg" className="gap-2 w-full md:w-auto">
                이 전략으로 진행
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Step: Regulation */}
        {currentStep === "regulation" && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-foreground">법규 검토</h2>
                <p className="text-sm text-muted-foreground">
                  {address} - {Number(siteArea).toLocaleString()}㎡
                </p>
              </div>
              <Button onClick={handleGenerate} className="gap-2 w-full md:w-auto">
                <Sparkles className="h-4 w-4" />
                배치안 생성
              </Button>
            </div>

            {/* 공시지가 카드 */}
            {(landPriceData.pricePerM2 > 0 || landPriceData.loading) && (
              <div className={`rounded-xl border p-4 ${landPriceData.isDemo ? 'border-amber-500/20 bg-amber-500/5' : 'border-emerald-500/20 bg-emerald-500/5'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${landPriceData.isDemo ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>₩</div>
                    <h3 className="text-sm font-semibold">공시지가 기반 토지비</h3>
                    {landPriceData.loading && <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />}
                    {!landPriceData.loading && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${landPriceData.isDemo ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                        {landPriceData.isDemo ? '지역평균' : (landPriceData.stdrYear ? `${landPriceData.stdrYear}년 실측` : 'Vworld 실측')}
                      </span>
                    )}
                  </div>
                </div>

                {!landPriceData.loading && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-secondary/30 p-3">
                      <p className="text-[10px] text-muted-foreground mb-1">공시지가 단가</p>
                      <p className="text-lg font-bold text-foreground">{formatLandPricePerM2(landPriceData.pricePerM2)}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{landPriceData.pricePerM2.toLocaleString()}원/㎡</p>
                    </div>
                    <div className="rounded-lg bg-secondary/30 p-3">
                      <p className="text-[10px] text-muted-foreground mb-1">예상 토지매입비</p>
                      <p className="text-lg font-bold text-foreground">{formatLandCost(landPriceData.totalCost || landPriceData.pricePerM2 * siteAreaNum)}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{siteAreaNum.toLocaleString()}㎡ × {formatLandPricePerM2(landPriceData.pricePerM2)}</p>
                    </div>
                  </div>
                )}

                {landPriceData.message && (
                  <p className="text-[10px] text-muted-foreground mt-2">{landPriceData.message}</p>
                )}
                {landPriceData.source === 'district-average' && (
                  <p className="text-[10px] text-amber-400/70 mt-1">
                    💡 법정동 추정값 — 실제 공시지가와 다를 수 있습니다
                  </p>
                )}
              </div>
            )}

            {/* 지적도 섹션 */}
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-5 w-5 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-blue-400">지</span>
                </div>
                <h3 className="text-sm font-semibold">실제 지적도 기반 대지 형상</h3>
                <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                  Vworld 국토지리정보원
                </span>
              </div>
              <CadastralMap
                address={address}
                siteArea={siteAreaNum}
                entX={molitSupplementData.entX}
                entY={molitSupplementData.entY}
                bdMgtSn={siteBdMgtSn || molitSupplementData.bdMgtSn}
                setbackFront={regulation.setbackFront}
                setbackSide={regulation.setbackSide}
                setbackRear={regulation.setbackRear}
                coverageRatio={molitSupplementData.zoneCode ? (
                  molitSupplementData.zoneCode.includes('commercial') ? 80 :
                  molitSupplementData.zoneCode.includes('semi-residential') ? 70 :
                  molitSupplementData.zoneCode.includes('residential') ? 60 : 60
                ) : regulation.maxCoverageRatio}
                onParcelLoaded={(area) => {
                  if (area > 0 && Math.abs(area - siteAreaNum) > 10) {
                    setSiteArea(String(Math.round(area)))
                  }
                }}
                onParcelPolygonLoaded={(coords, centroid) => {
                  setSitePolygon({ coords, centroid })
                }}
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
              {/* Regulation Input */}
              <div className="order-2 lg:order-1">
                <RegulationInput regulation={regulation} onChange={setRegulation} />
              </div>

              {/* Regulation Analysis + Legal Review */}
              <div className="order-1 lg:order-2 space-y-4">
                {/* 기존 분석 패널 */}
                {(() => {
                  const rw = molitSupplementData.roadWidth || regulation.roadWidth || 8
                  const zc = molitSupplementData.zoneCode || regulation.zoneType
                  const ht = molitSupplementData.heightLimit || regulation.maxHeight
                  const dp = molitSupplementData.hasDistrictPlan ?? regulation.additionalNotes.includes('지구단위')
                  return (
                    <RegulationAnalysisPanel 
                      siteArea={siteAreaNum} 
                      regulation={{
                        ...regulation,
                        zoneType: zc as typeof regulation.zoneType,
                        roadWidth: rw,
                        maxHeight: ht,
                        additionalNotes: dp ? '지구단위계획 적용' : regulation.additionalNotes,
                      }} 
                    />
                  )
                })()}

                {/* 신규: 한국 건축법 기반 법규검토 자동계산 */}
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-primary">법</span>
                    </div>
                    <h3 className="text-sm font-semibold">건축법 기반 법규검토 자동계산</h3>
                    <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                      국계법·건축법·주차장법 기준
                    </span>
                  </div>
                  <LegalReviewPanel
                    zoneCode={molitSupplementData.zoneCode || regulation.zoneType}
                    siteArea={siteAreaNum}
                    roadWidth={molitSupplementData.roadWidth || regulation.roadWidth || 8}
                    heightLimit={molitSupplementData.heightLimit || regulation.maxHeight}
                    hasDistrictPlan={molitSupplementData.hasDistrictPlan ?? regulation.additionalNotes?.includes('지구단위') ?? false}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-4">
              <Button onClick={handleGenerate} size="lg" className="gap-2 w-full md:w-auto">
                <Sparkles className="h-5 w-5" />
                AI 배치안 생성
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Step: Layouts */}
        {currentStep === "layouts" && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Brain className="h-5 w-5 text-primary" />
                  <h2 className="text-xl md:text-2xl font-bold text-foreground">AI 배치안 비교</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  {address} | 건폐율 {regulation.maxCoverageRatio}% / 용적률 {regulation.maxFloorAreaRatio}% | 
                  <span className="text-primary ml-1">
                    {strategy === "view-priority" ? "조망 우선" : 
                     strategy === "privacy-priority" ? "프라이버시 우선" :
                     strategy === "area-maximize" ? "면적 확보" :
                     strategy === "parking-efficient" ? "주차 효율" :
                     strategy === "profitability" ? "사업성 우선" : "실거주 최적"} 전략
                  </span>
                </p>
              </div>
              {selectedLayout && (
                <div className="flex items-center gap-2">
                  {/* 뷰 전환 토글 */}
                  <div className="flex rounded-lg border border-border overflow-hidden">
                    <button
                      onClick={() => setLayoutViewMode("card")}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${
                        layoutViewMode === "card" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                      카드
                    </button>
                    <button
                      onClick={() => setLayoutViewMode("compare")}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${
                        layoutViewMode === "compare" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h18"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M3 21h18"/></svg>
                      비교
                    </button>
                  </div>
                  <Button onClick={() => setCurrentStep("floorplan")} className="gap-2">
                    평면도 보기
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {isGenerating ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="relative">
                  <Loader2 className="h-16 w-16 animate-spin text-primary" />
                  <Brain className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <p className="text-lg font-medium text-foreground mt-6">AI가 최적 배치안을 생성 중입니다...</p>
                <p className="text-sm text-muted-foreground mt-2">법규 검토, 전략 반영, 점수 산정 진행 중</p>
              </div>
            ) : (
              <>
                {/* Strategy + Selection Status Box */}
                <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 space-y-2">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{ARCHISCAN_COPY.labels.strategy.selected}:</span>
                      <Badge variant="outline" className="font-medium">
                        {getStrategyName(strategy as "area-maximize" | "profitability" | "parking-efficient" | "livability")}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{ARCHISCAN_COPY.labels.strategy.currentLayout}:</span>
                      <Badge className={selectedLayoutData ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/30" : "bg-muted text-muted-foreground"}>
                        {selectedLayoutData?.name || "미선택"}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    ※ {ARCHISCAN_COPY.layoutCompare?.notice ?? "아래에서 선택한 배치안이 평면도, 사업성, 최종 보고서에 반영됩니다."}
                  </p>
                </div>

                {/* AI Recommendation + User Selection Status */}
                <div className="flex flex-col gap-2">
                  {/* AI Recommended Layout */}
                  {recommendedLayout && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium text-foreground">
                        {ARCHISCAN_COPY.labels.strategy.recommended}: <span className="text-primary">{recommendedLayout.name}</span>
                      </span>
                      <Badge variant="outline" className="ml-auto border-primary/50 text-primary">
                        종합 {displayScore(recommendedLayout?.scores?.overall, '산정 중')}
                      </Badge>
                    </div>
                  )}
                  
                  {/* User Selected Layout (if different from recommendation) */}
                  {selectedLayoutData && selectedLayoutData.id !== recommendedLayout?.id && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      <span className="text-sm font-medium text-foreground">
                        현재 반영 중: <span className="text-emerald-500">{selectedLayoutData.name}</span>
                      </span>
                      <Badge className="ml-auto bg-emerald-500/20 text-emerald-500 border-emerald-500/30">
                        반영 완료
                      </Badge>
                    </div>
                  )}
                  
                  {/* Notice when selection differs from recommendation */}
                  {selectedLayoutData && selectedLayoutData.id !== recommendedLayout?.id && (
                    <p className="text-[11px] text-muted-foreground px-1">
                      ※ {ARCHISCAN_COPY.layoutCompare?.differentNotice ?? "AI 추천안과 별도로, 현재 보고서는 사용자가 선택한 배치안을 기준으로 작성됩니다."}
                    </p>
                  )}
                </div>

                {/* 비교표 뷰 */}
                {layoutViewMode === "compare" && layouts.length > 0 && (
                  <LayoutComparison
                    layouts={layouts}
                    siteArea={siteAreaNum}
                    selectedLayout={selectedLayout}
                    recommendedLayoutId={recommendedLayout?.id}
                    landPricePerM2={landPriceData.pricePerM2 || 5000000}
                    salesPricePerM2={
                      (marketPrice.loaded && marketPrice.suggestedSalePrice > 0)
                        ? marketPrice.suggestedSalePrice
                        : regionalPricing 
                          ? Math.round(regionalPricing.salesPricePerM2 * getZoneMultiplier(regulation.zoneType || ''))
                          : undefined
                    }
                    constructionCostPerM2={regionalPricing?.constructionCostPerM2 || undefined}
                    onSelect={(id) => {
                      handleSelectLayout(id)
                    }}
                  />
                )}

                {/* 카드 그리드 뷰 */}
                {layoutViewMode === "card" && (
                <div className="grid gap-4 md:gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {layouts.map((layout) => (
                    <div key={layout.id} className="flex flex-col gap-3">
                      <LayoutCard
                        layout={layout}
                        siteArea={siteAreaNum}
                        isSelected={selectedLayout === layout.id}
                        onSelect={() => handleSelectLayout(layout.id)}
                        scores={layout.scores}
                        isRecommended={layout.recommendation.isRecommended}
                      />
                    </div>
                  ))}
                </div>
                )} {/* end layoutViewMode === card */}

                {/* AI Reasoning Panel for Selected Layout */}
                {selectedLayoutData && (
                  <AIReasoningPanel
                    layoutName={selectedLayoutData.name}
                    scores={selectedLayoutData.scores}
                    reasoning={selectedLayoutData.reasoning}
                    recommendation={selectedLayoutData.recommendation}
                    isRecommended={selectedLayoutData.recommendation.isRecommended}
                  />
                )}
              </>
            )}

            {selectedLayout && (
              <div className="flex flex-col items-center gap-2 pt-4">
                <div className="flex items-center gap-2 text-sm text-emerald-500">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>반영 완료: {selectedLayoutData?.name}</span>
                </div>
                <Button onClick={() => setCurrentStep("floorplan")} size="lg" className="gap-2 w-full md:w-auto">
                  평면도 검토로 이동
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Step: Floor Plan */}
        {currentStep === "floorplan" && selectedLayoutData && (
          <div className="flex flex-col gap-4 md:gap-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-foreground">평면도 검토</h2>
                <p className="text-sm text-muted-foreground">
                  {selectedLayoutData.name} · {selectedFloor === 1 ? "1층 로비/상가/주차" : selectedFloor === safeNumber(selectedLayoutData.floors, selectedFloor) ? `${selectedFloor}층 최상층` : `${selectedFloor}층 기준층`}
                </p>
              </div>
              <Button onClick={() => setCurrentStep("financial")} className="gap-2">
                이 배치안의 사업성 보기
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Current Selection Status */}
            <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-muted-foreground">현재 반영 배치안:</span>
                <span className="font-medium text-emerald-500">{selectedLayoutData.name}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">지상 {selectedLayoutData.floors}층 · {selectedLayoutData.units}세대 · 주차 {selectedLayoutData.parking}대</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">※ 현재 선택한 배치안을 기준으로 평면 구성이 표시됩니다.</p>
            </div>

            {/* Key Metrics Summary - Building Total */}
            <div className="grid grid-cols-4 gap-1.5">
              <div className="bg-secondary/30 border border-border rounded p-1.5 text-center">
                <p className="text-[9px] text-muted-foreground">총 세대수</p>
                <p className="text-xs font-semibold text-foreground">{safeNumber(selectedLayoutData.units, 0) > 0 ? `${selectedLayoutData.units}세대` : '확인 필요'}</p>
              </div>
              <div className="bg-secondary/30 border border-border rounded p-1.5 text-center">
                <p className="text-[9px] text-muted-foreground">총 규모</p>
                <p className="text-xs font-semibold text-foreground">{safeNumber(selectedLayoutData.floors, 0) > 0 ? `지상${selectedLayoutData.floors}층` : '확인 필요'}</p>
              </div>
              <div className="bg-secondary/30 border border-border rounded p-1.5 text-center">
                <p className="text-[9px] text-muted-foreground">총 주차</p>
                <p className="text-xs font-semibold text-foreground">{safeNumber(selectedLayoutData.parking, 0) > 0 ? `${selectedLayoutData.parking}대` : '확인 필요'}</p>
              </div>
              <div className="bg-secondary/30 border border-border rounded p-1.5 text-center">
                <p className="text-[9px] text-muted-foreground">건폐율</p>
                <p className="text-xs font-semibold text-foreground">{safeNumber(selectedLayoutData.coverage, 0) > 0 ? `${selectedLayoutData.coverage}%` : '확인 필요'}</p>
              </div>
            </div>
            <p className="text-[9px] text-muted-foreground text-center mt-1">※ 배치안 전체 기준</p>

            {/* Main Floor Plan Card - Fullscreen Mode */}
            <Card className={`border-border bg-card ${isFloorPlanFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''}`}>
              <CardContent className={`${isFloorPlanFullscreen ? 'p-2 h-full flex flex-col' : 'p-1.5 sm:p-2'}`}>
                {/* Current Floor Info Bar - 2 Row Layout */}
                {(() => {
                  const totalFloors = safeNumber(selectedLayoutData.floors, selectedFloor)
                  const floorType = selectedFloor === 1 ? "로비/상가층" : selectedFloor === totalFloors ? "최상층" : "기준층"
                  
                  // Calculate actual units per floor based on strategy (matches FloorPlan component)
                  // 1F = 0 (lobby), upper floors depend on strategy
                  let currentFloorUnits = 0
                  if (selectedFloor > 1) {
                    if (strategy === "view-priority" || strategy === "privacy-priority") {
                      currentFloorUnits = 2 // A, B (large units)
                    } else if (strategy === "area-maximize" || strategy === "profitability") {
                      currentFloorUnits = 6 // A~F (small units)
                    } else {
                      currentFloorUnits = 4 // A~D (medium units - default)
                    }
                  }
                  
                  return (
                    <div className="bg-primary/10 border border-primary/20 rounded px-2 py-1.5 mb-2">
                      <div className="flex items-center justify-center gap-3 text-center">
                        <span className="text-[10px] text-muted-foreground">현재층 <span className="font-semibold text-foreground">{selectedFloor}층</span></span>
                        <span className="text-primary/40">|</span>
                        <span className="text-[10px] text-muted-foreground">세대수 <span className="font-semibold text-foreground">{currentFloorUnits > 0 ? `${currentFloorUnits}세대` : selectedFloor === 1 ? '비주거층' : '확인 필요'}</span></span>
                        <span className="text-primary/40">|</span>
                        <span className="text-[10px] text-muted-foreground">{floorType}</span>
                      </div>
                    </div>
                  )
                })()}
                
                {/* 3-Row Control Layout */}
                <div className="flex flex-col gap-1.5 mb-1 divide-y divide-border/40 [&>*]:pt-1.5 [&>*:first-child]:pt-0">
                  {/* Row 1: Floor Selection Chips */}
                  <div>
                    <p className="text-[9px] text-muted-foreground mb-0.5">층 선택</p>
                    <div className="flex gap-1 overflow-x-auto pb-0.5 -mx-1 px-1 scrollbar-hide">
                    {Array.from({ length: Math.max(safeNumber(selectedLayoutData.floors, 1), selectedFloor) }, (_, i) => i + 1).map((floor) => {
                      const totalFloors = safeNumber(selectedLayoutData.floors, selectedFloor)
                      const floorLabel = floor === 1 ? "1층 로비" : floor === totalFloors ? `${floor}층 최상층` : `${floor}층 기준층`
                      return (
                        <button
                          key={floor}
                          onClick={() => setSelectedFloor(floor)}
                          className={`shrink-0 px-2 py-1 rounded-full text-[11px] font-medium transition-all ${
                            selectedFloor === floor 
                              ? "bg-primary text-primary-foreground" 
                              : "bg-secondary/60 hover:bg-secondary text-muted-foreground"
                          }`}
                        >
                          {floorLabel}
                        </button>
                      )
                    })}
                    </div>
                  </div>
                  
                  {/* Row 2: View Mode + Navigation Combined */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex gap-1">
                      <Button variant={floorPlanViewMode === "fit" && !isFloorPlanFullscreen ? "default" : "outline"} size="sm" onClick={() => { setFloorPlanViewMode("fit"); setIsFloorPlanFullscreen(false); }} className="text-[10px] h-6 px-2">맞춤</Button>
                      <Button variant={floorPlanViewMode === "original" && !isFloorPlanFullscreen ? "default" : "outline"} size="sm" onClick={() => { setFloorPlanViewMode("original"); setIsFloorPlanFullscreen(false); }} className="text-[10px] h-6 px-2">원본</Button>
                      <Button variant={isFloorPlanFullscreen ? "default" : "outline"} size="sm" onClick={() => setIsFloorPlanFullscreen(!isFloorPlanFullscreen)} className="text-[10px] h-6 px-2">
                        {isFloorPlanFullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
                      </Button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button variant="outline" size="sm" disabled={selectedFloor === 1} onClick={() => setSelectedFloor(f => f - 1)} className="h-6 px-1.5">
                        <ChevronLeft className="h-3 w-3" />
                      </Button>
                      <span className="text-xs font-bold text-foreground min-w-[50px] text-center bg-secondary/40 px-2 py-0.5 rounded">
                        {selectedFloor}/{safeNumber(selectedLayoutData.floors, selectedFloor)}층
                      </span>
                      <Button variant="outline" size="sm" disabled={selectedFloor >= safeNumber(selectedLayoutData.floors, selectedFloor)} onClick={() => setSelectedFloor(f => f + 1)} className="h-6 px-1.5">
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Floor Plan Display - Fit/Original/Fullscreen Modes */}
                <div 
                  className={`w-full rounded-lg bg-secondary/20 border border-border ${
                    floorPlanViewMode === "original" && !isFloorPlanFullscreen
                      ? "overflow-auto" 
                      : "overflow-hidden"
                  } ${isFloorPlanFullscreen ? 'flex-1 min-h-0' : ''}`}
                  style={{ WebkitOverflowScrolling: 'touch' }}
                >
                  {/* Fit View Mode - Entire diagram always visible, centered */}
                  {floorPlanViewMode === "fit" && !isFloorPlanFullscreen && (
                    <div className="w-full">
                      <div 
                        className="w-full flex items-center justify-center"
                        style={{ 
                          aspectRatio: '3 / 2',
                          minHeight: '300px',
                          maxHeight: '460px'
                        }}
                      >
                        <FloorPlan 
                          type={selectedLayoutData.type} 
                          floor={selectedFloor}
                          totalFloors={selectedLayoutData.floors}
                          strategy={strategy}
                          zoneType={molitSupplementData.zoneCode || regulation.zoneType}
                          units={selectedLayoutData.units}
                          gfa={selectedLayoutData.gfa || gfa}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Original View Mode - Native ratio, scrollable if overflow */}
                  {floorPlanViewMode === "original" && !isFloorPlanFullscreen && (
                    <div className="w-max min-w-full p-3">
                      <div 
                        className="flex items-center justify-start"
                        style={{ 
                          width: '720px',
                          height: '480px',
                          maxWidth: 'none'
                        }}
                      >
                        <FloorPlan 
                          type={selectedLayoutData.type} 
                          floor={selectedFloor}
                          totalFloors={selectedLayoutData.floors}
                          strategy={strategy}
                          zoneType={molitSupplementData.zoneCode || regulation.zoneType}
                          units={selectedLayoutData.units}
                          gfa={selectedLayoutData.gfa || gfa}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Fullscreen Mode - Maximum size, still fit-first */}
                  {isFloorPlanFullscreen && (
                    <div className="w-full h-full p-4 flex items-center justify-center">
                      <div 
                        className="w-full h-full flex items-center justify-center"
                        style={{ 
                          maxWidth: 'calc(100vw - 32px)',
                          maxHeight: 'calc(100vh - 200px)',
                          aspectRatio: '3 / 2'
                        }}
                      >
                        <FloorPlan 
                          type={selectedLayoutData.type} 
                          floor={selectedFloor}
                          totalFloors={selectedLayoutData.floors}
                          strategy={strategy}
                          zoneType={molitSupplementData.zoneCode || regulation.zoneType}
                          units={selectedLayoutData.units}
                          gfa={selectedLayoutData.gfa || gfa}
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Mobile Scroll Hint */}
                {floorPlanViewMode === "original" && !isFloorPlanFullscreen && (
                  <p className="text-xs text-muted-foreground text-center mt-2 sm:hidden">
                    ← 좌우로 밀어서 전체 보기 →
                  </p>
                )}

                {/* Legend - 2 Row Fixed Layout */}
                <div className={`mt-1 pt-1 border-t border-border ${isFloorPlanFullscreen ? 'shrink-0' : ''}`}>
                  <div className="grid grid-cols-4 gap-x-1 gap-y-0">
                    <span className="inline-flex items-center gap-0.5 text-[10px]"><span className="w-2 h-2 rounded bg-primary/30 border border-primary"></span><span className="text-muted-foreground">세대</span></span>
                    <span className="inline-flex items-center gap-0.5 text-[10px]"><span className="w-2 h-2 rounded bg-amber-500/20 border border-amber-500"></span><span className="text-muted-foreground">상가</span></span>
                    <span className="inline-flex items-center gap-0.5 text-[10px]"><span className="w-2 h-2 rounded bg-cyan-500/20 border border-cyan-500"></span><span className="text-muted-foreground">로비</span></span>
                    <span className="inline-flex items-center gap-0.5 text-[10px]"><span className="w-2 h-2 rounded bg-slate-500/30 border border-slate-500"></span><span className="text-muted-foreground">EV</span></span>
                    <span className="inline-flex items-center gap-0.5 text-[10px]"><span className="w-2 h-2 rounded bg-slate-500/10 border border-slate-500 border-dashed"></span><span className="text-muted-foreground">주차</span></span>
                    <span className="inline-flex items-center gap-0.5 text-[10px]"><span className="w-2 h-2 rounded bg-emerald-500/20 border border-emerald-500"></span><span className="text-muted-foreground">출입</span></span>
                    <span className="inline-flex items-center gap-0.5 text-[10px]"><span className="w-2 h-2 rounded bg-violet-500/20 border border-violet-500"></span><span className="text-muted-foreground">공용</span></span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Floor Info Cards */}
            <div className="grid gap-1 md:grid-cols-3 mt-1">
              {/* Floor Description */}
              <Card className="border-border bg-card">
                <CardContent className="p-2">
                  <h4 className="text-[10px] font-semibold text-foreground mb-0.5">설계 의도</h4>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    {selectedFloor === 1 
                      ? "상가·로비·주차 통합 진입층. 보행/차량 동선 분리로 접근성과 안전성 확보."
                      : selectedFloor === selectedLayoutData.floors
                      ? "최상층 조망 및 상품성 강화. 프리미엄 세대 구성에 적합한 구조."
                      : "기준층 반복 평면. 중앙 코어 중심 세대 효율과 시공성 확보."
                    }
                  </p>
                </CardContent>
              </Card>

              {/* Advantages */}
              <Card className="border-border bg-card">
                <CardContent className="p-2">
                  <h4 className="text-[10px] font-semibold text-foreground mb-0.5">장점</h4>
                  <ul className="space-y-0">
                    {selectedFloor === 1 ? (
                      <>
                        <li className="text-[10px] text-muted-foreground flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-primary shrink-0" /><span>동선 분리</span></li>
                        <li className="text-[10px] text-muted-foreground flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-primary shrink-0" /><span>중정형 개방감</span></li>
                        <li className="text-[10px] text-muted-foreground flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-primary shrink-0" /><span>상가 연계 가능</span></li>
                      </>
                    ) : (
                      <>
                        <li className="text-[10px] text-muted-foreground flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-primary shrink-0" /><span>세대 효율 우수</span></li>
                        <li className="text-[10px] text-muted-foreground flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-primary shrink-0" /><span>기준층 반복 용이</span></li>
                        <li className="text-[10px] text-muted-foreground flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-primary shrink-0" /><span>분양 상품성 확보</span></li>
                      </>
                    )}
                  </ul>
                </CardContent>
              </Card>

              {/* Checkpoints */}
              <Card className="border-border bg-card">
                <CardContent className="p-2">
                  <h4 className="text-[10px] font-semibold text-foreground mb-0.5">체크포인트</h4>
                  <ul className="space-y-0">
                    {selectedFloor === 1 ? (
                      <>
                        <li className="text-[10px] text-muted-foreground flex items-center gap-1"><AlertCircle className="h-3 w-3 text-amber-500 shrink-0" /><span>주차 배치 재검토</span></li>
                        <li className="text-[10px] text-muted-foreground flex items-center gap-1"><AlertCircle className="h-3 w-3 text-amber-500 shrink-0" /><span>상가 가시성 검토</span></li>
                        <li className="text-[10px] text-muted-foreground flex items-center gap-1"><AlertCircle className="h-3 w-3 text-amber-500 shrink-0" /><span>커뮤니티 활용성</span></li>
                      </>
                    ) : selectedFloor === selectedLayoutData.floors ? (
                      <>
                        <li className="text-[10px] text-muted-foreground flex items-center gap-1"><AlertCircle className="h-3 w-3 text-amber-500 shrink-0" /><span>최상층 차별화</span></li>
                        <li className="text-[10px] text-muted-foreground flex items-center gap-1"><AlertCircle className="h-3 w-3 text-amber-500 shrink-0" /><span>옥상 활용 검토</span></li>
                      </>
                    ) : (
                      <>
                        <li className="text-[10px] text-muted-foreground flex items-center gap-1"><AlertCircle className="h-3 w-3 text-amber-500 shrink-0" /><span>세대 프라이버시</span></li>
                        <li className="text-[10px] text-muted-foreground flex items-center gap-1"><AlertCircle className="h-3 w-3 text-amber-500 shrink-0" /><span>환기/채광 확인</span></li>
                      </>
                    )}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Bottom CTA */}
            <div className="flex flex-col gap-2 pt-1 mt-0.5">
              {/* DXF 다운로드 버튼 */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowDxfPreview(true)
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-blue-500/30 text-blue-400 bg-blue-500/5 hover:bg-blue-500/10 transition-colors text-sm font-medium"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                  미리보기
                </button>
                <button
                  onClick={() => {
                    const dxf = generateFloorPlanDXF({
                      type: selectedLayoutData.type,
                      floor: selectedFloor,
                      totalFloors: selectedLayoutData.floors,
                      strategy,
                      layoutName: selectedLayoutData.name,
                      siteArea,
                      units: selectedLayoutData.units,
                      floors: selectedLayoutData.floors,
                      parking: selectedLayoutData.parking,
                      sitePolygon: sitePolygon ?? undefined,
                    })
                    const addr = address.replace(/\s+/g, '_').replace(/[^\w가-힣]/g, '')
                    downloadDXF(dxf, `ArchiScan_${addr}_${selectedLayoutData.name}_${selectedFloor}F.dxf`)
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 transition-colors text-sm font-medium"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  DXF 저장 ({selectedFloor}층)
                </button>
              </div>
              {/* 3D 볼륨 버튼 */}
              {/* 도면 탭 — 배치도 / 아이소메트릭 / 단면도 */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex border-b border-border overflow-x-auto">
                  {([
                    { id: "site" as const, label: "배치도" },
                    { id: "iso" as const, label: "아이소메트릭" },
                    { id: "perspective" as const, label: "투시도" },
                    { id: "section" as const, label: "단면도" },
                    { id: "elevation" as const, label: "입면도" },
                  ]).map(tab => (
                    <button key={tab.id} onClick={() => setDrawingTab(tab.id)}
                      className={`px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors ${
                        drawingTab === tab.id
                          ? "bg-primary/10 text-primary border-b-2 border-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}>{tab.label}</button>
                  ))}
                </div>
                <div className="p-3">
                  {drawingTab === "site" && (
                    <SitePlan
                      siteArea={siteAreaNum}
                      buildingCoverage={selectedLayoutData.coverage}
                      floors={selectedLayoutData.floors}
                      units={selectedLayoutData.units}
                      parking={selectedLayoutData.parking}
                      type={selectedLayoutData.type}
                      setbacks={{
                        front: molitSupplementData.hasDistrictPlan ? 2 : 1,
                        side: (molitSupplementData.zoneCode || regulation.zoneType)?.includes('residential') ? 1 : 0.5,
                        rear: (molitSupplementData.zoneCode || regulation.zoneType)?.includes('residential') ? 1.5 : 1,
                      }}
                      landscapingRatio={siteAreaNum >= 200 ? 15 : 0}
                      roadWidth={molitSupplementData.roadWidth || regulation.roadWidth || 8}
                      hasDistrictPlan={molitSupplementData.hasDistrictPlan ?? false}
                      layoutName={selectedLayoutData.name}
                      sitePolygon={sitePolygon}
                    />
                  )}
                  {drawingTab === "iso" && (
                    <IsometricView
                      siteArea={siteAreaNum}
                      buildingCoverage={selectedLayoutData.coverage}
                      floors={selectedLayoutData.floors}
                      units={selectedLayoutData.units}
                      type={selectedLayoutData.type}
                      layoutName={selectedLayoutData.name}
                      zoneType={molitSupplementData.zoneCode || regulation.zoneType}
                    />
                  )}
                  {drawingTab === "perspective" && (
                    <PerspectiveView
                      siteArea={siteAreaNum}
                      buildingCoverage={selectedLayoutData.coverage}
                      floors={selectedLayoutData.floors}
                      units={selectedLayoutData.units}
                      type={selectedLayoutData.type}
                      layoutName={selectedLayoutData.name}
                      zoneType={molitSupplementData.zoneCode || regulation.zoneType}
                    />
                  )}
                  {drawingTab === "section" && (
                    <SectionView
                      siteArea={siteAreaNum}
                      buildingCoverage={selectedLayoutData.coverage}
                      floors={selectedLayoutData.floors}
                      units={selectedLayoutData.units}
                      parking={selectedLayoutData.parking}
                      heightLimit={molitSupplementData.heightLimit || regulation.maxHeight}
                      type={selectedLayoutData.type}
                      layoutName={selectedLayoutData.name}
                      roadWidth={molitSupplementData.roadWidth || regulation.roadWidth || 8}
                      hasDistrictPlan={molitSupplementData.hasDistrictPlan ?? false}
                    />
                  )}
                  {drawingTab === "elevation" && (
                    <ElevationView
                      siteArea={siteAreaNum}
                      buildingCoverage={selectedLayoutData.coverage}
                      floors={selectedLayoutData.floors}
                      units={selectedLayoutData.units}
                      type={selectedLayoutData.type}
                      layoutName={selectedLayoutData.name}
                      roadWidth={molitSupplementData.roadWidth || regulation.roadWidth || 8}
                      heightLimit={molitSupplementData.heightLimit || regulation.maxHeight}
                    />
                  )}
                </div>
              </div>
              <button
                onClick={() => setShow3DVolume(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-purple-500/30 text-purple-400 bg-purple-500/5 hover:bg-purple-500/10 transition-colors text-sm font-medium"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                3D 볼륨 모델 보기
              </button>
              <Button onClick={() => setCurrentStep("financial")} size="lg" className="gap-2 w-full md:w-auto">
                이 배치안의 사업성 보기
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}

{/* Step: Financial Analysis */}
        {currentStep === "financial" && selectedLayoutData && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl md:text-2xl font-bold text-foreground">{ARCHISCAN_COPY.feasibility.title}</h2>
                </div>
                <p className="text-sm text-muted-foreground">{selectedLayoutData.name} - 투자 분석</p>
              </div>
              <Button onClick={() => setCurrentStep("report")} className="gap-2">
                {ARCHISCAN_COPY.common.reportCheck}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Current Calculation Basis Status Box */}
            <div className="p-3 rounded-lg bg-secondary/30 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">{ARCHISCAN_COPY.feasibility.currentBase}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">{ARCHISCAN_COPY.common.selectedPlan}:</span>
                  <span className="ml-1 font-medium text-foreground">{selectedLayoutData.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{ARCHISCAN_COPY.labels.metrics.grossFloorArea}:</span>
                  <span className="ml-1 font-medium text-foreground">{selectedLayoutData.gfa?.toLocaleString() || 0}{ARCHISCAN_COPY.common.squareMeterUnit}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{ARCHISCAN_COPY.labels.metrics.units}:</span>
                  <span className="ml-1 font-medium text-foreground">{selectedLayoutData.units}{ARCHISCAN_COPY.common.householdUnit}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{ARCHISCAN_COPY.labels.metrics.parking}:</span>
                  <span className="ml-1 font-medium text-foreground">{selectedLayoutData.parking}{ARCHISCAN_COPY.common.parkingUnit}</span>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">※ {ARCHISCAN_COPY.feasibility?.notice ?? "이 화면의 수치는 현재 선택한 배치안을 기준으로 계산됩니다."}</p>
            </div>

            <FinancialAnalysis 
              siteArea={siteAreaNum}
              gfa={gfa}
              units={selectedLayoutData.units}
              floors={selectedLayoutData.floors}
              feasibilityResult={feasibilityResult}
              landPricePerM2={landPriceData.pricePerM2 || 5000000}
            />

            {/* 주변 실거래가 정보 */}
            {marketPrice.loaded && marketPrice.avgPricePerM2 > 0 && (
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-semibold text-foreground">주변 실거래가 시세</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">{marketPrice.transactionCount}건</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-secondary/30 p-3">
                    <p className="text-[10px] text-muted-foreground">평균 거래가</p>
                    <p className="text-sm font-bold text-foreground">{(marketPrice.avgPricePerM2 / 10000).toFixed(0)}만원<span className="text-[10px] font-normal text-muted-foreground">/㎡</span></p>
                    <p className="text-[10px] text-muted-foreground">{(marketPrice.avgPricePerM2 * 3.3058 / 10000).toFixed(0)}만원/평</p>
                  </div>
                  <div className="rounded-lg bg-secondary/30 p-3">
                    <p className="text-[10px] text-muted-foreground">추천 분양가</p>
                    <p className="text-sm font-bold text-emerald-400">{(marketPrice.suggestedSalePrice / 10000).toFixed(0)}만원<span className="text-[10px] font-normal text-muted-foreground">/㎡</span></p>
                    <p className="text-[10px] text-muted-foreground">실거래가 +15% 프리미엄</p>
                  </div>
                </div>
                {/* 최근 실거래 내역 */}
                {marketPrice.transactions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/30">
                    <p className="text-[10px] font-medium text-muted-foreground mb-2">최근 거래 내역</p>
                    <div className="space-y-1">
                      {marketPrice.transactions.slice(0, 5).map((t, i) => {
                        const maxPrice = Math.max(...marketPrice.transactions.slice(0, 5).map(x => x.pricePerM2))
                        const pct = maxPrice > 0 ? (t.pricePerM2 / maxPrice) * 100 : 0
                        return (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-[9px] text-muted-foreground w-16 truncate">{t.name}</span>
                            <div className="flex-1 h-3 bg-secondary/30 rounded overflow-hidden">
                              <div className="h-full bg-blue-500/40 rounded" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[9px] font-medium text-foreground w-16 text-right">{(t.pricePerM2 / 10000).toFixed(0)}만/㎡</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground mt-2">※ 최근 6개월 인근 아파트 실거래가 기준. 실제 분양가와 다를 수 있습니다.</p>
              </div>
            )}

            {/* 지역별 시세 적용 정보 */}
            {regionalPricing && (
              <div className={`rounded-xl border p-4 ${regionalPricing.confidence === 'high' ? 'border-emerald-500/20 bg-emerald-500/5' : regionalPricing.confidence === 'medium' ? 'border-blue-500/20 bg-blue-500/5' : 'border-amber-500/20 bg-amber-500/5'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">지역별 단가 적용</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${getTierInfo(regionalPricing.tier).bgColor} ${getTierInfo(regionalPricing.tier).color}`}>
                      {regionalPricing.regionName} · {getTierInfo(regionalPricing.tier).label}
                    </span>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${regionalPricing.confidence === 'high' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                    {regionalPricing.confidence === 'high' ? '정확도 높음' : '추정치'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg bg-secondary/30 p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">공사비</p>
                    <p className="font-bold text-foreground">{Math.round(regionalPricing.constructionCostPerM2 / 10000).toLocaleString()}만/㎡</p>
                  </div>
                  <div className="rounded-lg bg-secondary/30 p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">지역 분양가</p>
                    <p className="font-bold text-foreground">{Math.round(regionalPricing.salesPricePerM2 / 10000).toLocaleString()}만/㎡</p>
                  </div>
                  <div className="rounded-lg bg-secondary/30 p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">토지비</p>
                    <p className="font-bold text-foreground">{Math.round((landPriceData.pricePerM2 || 5000000) / 10000).toLocaleString()}만/㎡</p>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">{regionalPricing.note} {marketPrice.loaded && marketPrice.suggestedSalePrice > 0 ? '· 분양가는 실거래가 기준 적용 중' : ''}</p>
              </div>
            )}

            {/* 사업성 시나리오 슬라이더 */}
            <ScenarioSlider
              siteArea={siteAreaNum}
              gfa={gfa}
              units={selectedLayoutData.units}
              floors={selectedLayoutData.floors}
              parking={selectedLayoutData.parking}
              landPricePerM2={landPriceData.pricePerM2 || 5000000}
              salesPricePerM2={(marketPrice.loaded && marketPrice.suggestedSalePrice > 0) 
                ? marketPrice.suggestedSalePrice 
                : regionalPricing ? Math.round(regionalPricing.salesPricePerM2 * getZoneMultiplier(regulation.zoneType || '')) : undefined}
              constructionCostPerM2={regionalPricing?.constructionCostPerM2 || undefined}
              baseROI={feasibilityResult?.roi ?? 0}
              baseTotalCost={feasibilityResult?.totalCost ?? 0}
              baseProfit={feasibilityResult?.profit ?? 0}
            />

            <div className="flex flex-col items-center gap-2 pt-4">
              <Button onClick={() => setCurrentStep("report")} size="lg" className="gap-2 w-full md:w-auto">
                <FileText className="h-5 w-5" />
                보고서 확인 및 PDF 다운로드
                <ChevronRight className="h-5 w-5" />
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">
                선택한 배치안 기준으로 검토 보고서를 PDF로 저장합니다.
              </p>
            </div>
          </div>
        )}

        {/* Step: Report */}
        {currentStep === "report" && selectedLayoutData && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl md:text-2xl font-bold text-foreground">종합 보고서</h2>
                </div>
                <p className="text-sm text-muted-foreground">{selectedLayoutData.name} 분석 결과</p>
                <button onClick={() => setShowBrandingEditor(true)} className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                  <Settings2 className="h-3.5 w-3.5" />
                  보고서 브랜딩 설정
                </button>
              </div>
              <div className="flex flex-col gap-2 w-full md:w-auto">
                <Button variant="outline" onClick={() => setCurrentStep("input")} className="gap-2 w-full md:w-auto">
                  <RotateCcw className="h-4 w-4" />
                  새 분석 시작
                </Button>
                <Button variant="ghost" onClick={() => setCurrentStep("strategy")} className="gap-2 w-full md:w-auto text-muted-foreground hover:text-foreground">
                  <Settings2 className="h-4 w-4" />
                  조건 재조정
                </Button>
              </div>
            </div>

            <Tabs defaultValue="summary" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="summary" className="text-xs sm:text-sm">요약</TabsTrigger>
                <TabsTrigger value="ai" className="text-xs sm:text-sm">AI 분석</TabsTrigger>
                <TabsTrigger value="financial" className="text-xs sm:text-sm">사업성</TabsTrigger>
              </TabsList>
              
              {/* Download Error Message */}
              {downloadError && (
                <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive flex items-center justify-between">
                  <span>{downloadError}</span>
                  <Button variant="ghost" size="sm" onClick={() => setDownloadError(null)} className="h-6 px-2">
                    닫기
                  </Button>
                </div>
              )}
              
              {/* Download Action Bar - Below Tabs (Single Line) */}
              <div className="flex flex-nowrap gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                <Button 
                  variant="default" 
                  size="sm" 
                  className="gap-1.5 whitespace-nowrap flex-shrink-0" 
                  disabled={downloadingPdf}
                  onClick={async () => {
                    setDownloadingPdf(true);
                    setDownloadError(null);
                    try {
                      // 데이터 검증
                      if (!selectedLayoutData) {
                        throw new Error('배치안 데이터가 없습니다. 먼저 배치안을 생성해주세요.');
                      }
                      if (!address) {
                        throw new Error('주소가 없습니다. 먼저 주소를 입력해주세요.');
                      }
                      const exportData: ExportData = {
                        address,
                        siteArea: siteAreaNum,
                        branding: branding || undefined,
                        layout: {
                          name: selectedLayoutData.name,
            type: selectedLayoutData.type,
                          floors: selectedLayoutData.floors,
                          units: selectedLayoutData.units,
                          parking: selectedLayoutData.parking,
                          buildingCoverage: selectedLayoutData.coverage ?? 0,
                          far: selectedLayoutData.gfa ? Math.round((selectedLayoutData.gfa / siteAreaNum) * 100) : 0,
                          gfa: selectedLayoutData.gfa ?? 0,
                        },
                        allLayouts: layouts.map(l => ({
                          name: l.name,
                          buildingCoverage: l.coverage ?? 0,
                          floors: l.floors,
                          units: l.units,
                          parking: l.parking,
                          gfa: l.gfa ?? 0,
                          roi: l.id === selectedLayoutData.id ? feasibilityResult?.roi : undefined,
                          isRecommended: l.id === selectedLayoutData.id,
                        })),
                        feasibility: {
                          landCost: feasibilityResult?.landCost ? feasibilityResult.landCost / 100000000 : 0,
                          constructionCost: feasibilityResult?.constructionCost ? feasibilityResult.constructionCost / 100000000 : 0,
                          indirectCost: feasibilityResult?.softCost ? feasibilityResult.softCost / 100000000 : 0,
                          totalCost: feasibilityResult?.totalCost ? feasibilityResult.totalCost / 100000000 : 0,
                          totalRevenue: feasibilityResult?.totalRevenue ? feasibilityResult.totalRevenue / 100000000 : 0,
                          expectedProfit: feasibilityResult?.profit ? feasibilityResult.profit / 100000000 : 0,
                          roi: feasibilityResult?.roi ?? 0,
                          avgSalePrice: feasibilityResult?.salesPricePerM2 || undefined,
                          breakEvenRate: feasibilityResult?.totalRevenue && feasibilityResult?.totalCost 
                            ? (feasibilityResult.totalCost / feasibilityResult.totalRevenue) * 100 
                            : 0,
                        },
                        regulation: {
                          zoneType: molitSupplementData.zoneCode || regulation?.zoneType || '',
                          roadWidth: molitSupplementData.roadWidth || regulation?.roadWidth,
                          maxHeight: molitSupplementData.heightLimit || regulation?.maxHeight,
                          buildingCoverageLimit: regulation?.maxCoverageRatio,
                          farLimit: regulation?.maxFloorAreaRatio,
                          hasDistrictPlan: molitSupplementData.hasDistrictPlan ?? regulation?.additionalNotes?.includes('지구단위') ?? false,
                        },
                        verdict: feasibilityResult?.roi && feasibilityResult.roi >= 20 ? "사업 추진 가능" : feasibilityResult?.roi && feasibilityResult.roi >= 10 ? "조건부 가능" : "추가 검토 필요",
                        risks: {
                          land: ["감정평가에 따른 매입가 변동", "소유권 및 권리관계 확인", "토지거래허가구역 해당 여부"],
                          permit: ["지구단위계획 변경 필요 여부", "건축심의 소요기간", "각종 부담금 발생 가능성"],
                          market: ["분양가 상한제 적용 여부", "인근 경쟁 물량 현황", "금리 변동에 따른 수요 변화"],
                          construction: ["공사비 상승 리스크", "공사기간 지연 가능성", "하자보수 책임"],
                        },
                      };
                      // PDF 파일 다운로드 (인쇄 미리보기 아님)
                      const result = await downloadPdf(exportData);
                      if (!result.success) {
                        setDownloadError(result.error || 'PDF 다운로드 중 오류가 발생했습니다.');
                      }
                    } catch (err) {
                      const errorMsg = err instanceof Error ? err.message : String(err);
                      setDownloadError(`PDF 생성 실패: ${errorMsg}`);
                    } finally {
                      setDownloadingPdf(false);
                    }
                  }}
                >
                  {downloadingPdf ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>생성 중...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      <span className="hidden sm:inline">최종 </span>PDF 다운로드
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-1.5 whitespace-nowrap flex-shrink-0"
                  disabled={downloadingHtml}
                  onClick={async () => {
                    setDownloadingHtml(true);
                    setDownloadError(null);
                    try {
                      if (!selectedLayoutData) {
                        throw new Error('배치안 데이터가 없습니다. 먼저 배치안을 생성해주세요.');
                      }
                      if (!address) {
                        throw new Error('주소가 없습니다. 먼저 주소를 입력해주세요.');
                      }
                      const exportData: ExportData = {
                        address,
                        siteArea: siteAreaNum,
                        branding: branding || undefined,
                        layout: {
                          name: selectedLayoutData.name,
            type: selectedLayoutData.type,
                          floors: selectedLayoutData.floors,
                          units: selectedLayoutData.units,
                          parking: selectedLayoutData.parking,
                          buildingCoverage: selectedLayoutData.coverage ?? 0,
                          far: selectedLayoutData.gfa ? Math.round((selectedLayoutData.gfa / siteAreaNum) * 100) : 0,
                          gfa: selectedLayoutData.gfa ?? 0,
                        },
                        allLayouts: layouts.map(l => ({
                          name: l.name,
                          buildingCoverage: l.coverage ?? 0,
                          floors: l.floors,
                          units: l.units,
                          parking: l.parking,
                          gfa: l.gfa ?? 0,
                          roi: l.id === selectedLayoutData.id ? feasibilityResult?.roi : undefined,
                          isRecommended: l.id === selectedLayoutData.id,
                        })),
                        feasibility: {
                          landCost: feasibilityResult?.landCost ? feasibilityResult.landCost / 100000000 : 0,
                          constructionCost: feasibilityResult?.constructionCost ? feasibilityResult.constructionCost / 100000000 : 0,
                          indirectCost: feasibilityResult?.softCost ? feasibilityResult.softCost / 100000000 : 0,
                          totalCost: feasibilityResult?.totalCost ? feasibilityResult.totalCost / 100000000 : 0,
                          totalRevenue: feasibilityResult?.totalRevenue ? feasibilityResult.totalRevenue / 100000000 : 0,
                          expectedProfit: feasibilityResult?.profit ? feasibilityResult.profit / 100000000 : 0,
                          roi: feasibilityResult?.roi ?? 0,
                          avgSalePrice: feasibilityResult?.salesPricePerM2 || undefined,
                          breakEvenRate: feasibilityResult?.totalRevenue && feasibilityResult?.totalCost 
                            ? (feasibilityResult.totalCost / feasibilityResult.totalRevenue) * 100 
                            : 0,
                        },
                        regulation: {
                          zoneType: molitSupplementData.zoneCode || regulation?.zoneType || '',
                          roadWidth: molitSupplementData.roadWidth || regulation?.roadWidth,
                          maxHeight: molitSupplementData.heightLimit || regulation?.maxHeight,
                          buildingCoverageLimit: regulation?.maxCoverageRatio,
                          farLimit: regulation?.maxFloorAreaRatio,
                          hasDistrictPlan: molitSupplementData.hasDistrictPlan ?? regulation?.additionalNotes?.includes('지구단위') ?? false,
                        },
                        verdict: feasibilityResult?.roi && feasibilityResult.roi >= 20 ? "사업 추진 가능" : feasibilityResult?.roi && feasibilityResult.roi >= 10 ? "조건부 가능" : "추가 검토 필요",
                        risks: {
                          land: ["감정평가에 따른 매입가 변동", "소유권 및 권리관계 확인", "토지거래허가구역 해당 여부"],
                          permit: ["지구단위계획 변경 필요 여부", "건축심의 소요기간", "각종 부담금 발생 가능성"],
                          market: ["분양가 상한제 적용 여부", "인근 경쟁 물량 현황", "금리 변동에 따른 수요 변화"],
                          construction: ["공사비 상승 리스크", "공사기간 지연 가능성", "하자보수 책임"],
                        },
                      };
                      const result = downloadHtml(exportData);
                      if (!result.success) {
                        setDownloadError(result.error || 'HTML 다운로드 중 오류가 발생했습니다.');
                      }
                    } catch (err) {
                      const errorMsg = err instanceof Error ? err.message : String(err);
                      console.error('[v0] HTML 오류:', errorMsg, err);
                      setDownloadError(`HTML 생성 실패: ${errorMsg}`);
                    } finally {
                      setDownloadingHtml(false);
                    }
                  }}
                >
                  {downloadingHtml ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>생성 중...</span>
                    </>
                  ) : (
                    <>
                      <Code className="h-4 w-4" />
                      HTML
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-1.5 whitespace-nowrap flex-shrink-0"
                  disabled={downloadingExcel}
                  onClick={() => {
                    setDownloadingExcel(true);
                    setDownloadError(null);
                    try {
                      if (!selectedLayoutData) {
                        throw new Error('배치안 데이터가 없습니다. 먼저 배치안을 생성해주세요.');
                      }
                      if (!address) {
                        throw new Error('주소가 없습니다. 먼저 주소를 입력해주세요.');
                      }
                      const exportData: ExportData = {
                        address,
                        siteArea: siteAreaNum,
                        branding: branding || undefined,
                        layout: {
                          name: selectedLayoutData.name,
            type: selectedLayoutData.type,
                          floors: selectedLayoutData.floors,
                          units: selectedLayoutData.units,
                          parking: selectedLayoutData.parking,
                          buildingCoverage: selectedLayoutData.coverage ?? 0,
                          far: selectedLayoutData.gfa ? Math.round((selectedLayoutData.gfa / siteAreaNum) * 100) : 0,
                          gfa: selectedLayoutData.gfa ?? 0,
                        },
                        allLayouts: layouts.map(l => ({
                          name: l.name,
                          buildingCoverage: l.coverage ?? 0,
                          floors: l.floors,
                          units: l.units,
                          parking: l.parking,
                          gfa: l.gfa ?? 0,
                          roi: l.id === selectedLayoutData.id ? feasibilityResult?.roi : undefined,
                          isRecommended: l.id === selectedLayoutData.id,
                        })),
                        feasibility: {
                          landCost: feasibilityResult?.landCost ? feasibilityResult.landCost / 100000000 : 0,
                          constructionCost: feasibilityResult?.constructionCost ? feasibilityResult.constructionCost / 100000000 : 0,
                          indirectCost: feasibilityResult?.softCost ? feasibilityResult.softCost / 100000000 : 0,
                          totalCost: feasibilityResult?.totalCost ? feasibilityResult.totalCost / 100000000 : 0,
                          totalRevenue: feasibilityResult?.totalRevenue ? feasibilityResult.totalRevenue / 100000000 : 0,
                          expectedProfit: feasibilityResult?.profit ? feasibilityResult.profit / 100000000 : 0,
                          roi: feasibilityResult?.roi ?? 0,
                          avgSalePrice: feasibilityResult?.salesPricePerM2 || undefined,
                          breakEvenRate: feasibilityResult?.totalRevenue && feasibilityResult?.totalCost 
                            ? (feasibilityResult.totalCost / feasibilityResult.totalRevenue) * 100 
                            : 0,
                        },
                        regulation: {
                          zoneType: molitSupplementData.zoneCode || regulation?.zoneType || '',
                          roadWidth: molitSupplementData.roadWidth || regulation?.roadWidth,
                          maxHeight: molitSupplementData.heightLimit || regulation?.maxHeight,
                          buildingCoverageLimit: regulation?.maxCoverageRatio,
                          farLimit: regulation?.maxFloorAreaRatio,
                          hasDistrictPlan: molitSupplementData.hasDistrictPlan ?? regulation?.additionalNotes?.includes('지구단위') ?? false,
                        },
                        verdict: feasibilityResult?.roi && feasibilityResult.roi >= 20 ? "사업 추진 가능" : feasibilityResult?.roi && feasibilityResult.roi >= 10 ? "조건부 가능" : "추가 검토 필요",
                        risks: {
                          land: ["감정평가에 따른 매입가 변동", "소유권 및 권리관계 확인", "토지거래허가구역 해당 여부"],
                          permit: ["지구단위계획 변경 필요 여부", "건축심의 소요기간", "각종 부담금 발생 가능성"],
                          market: ["분양가 상한제 적용 여부", "인근 경쟁 물량 현황", "금리 변동에 따른 수요 변화"],
                          construction: ["공사비 상승 리스크", "공사기간 지연 가능성", "하자보수 책임"],
                        },
                      };
                      const result = downloadExcel(exportData);
                      if (!result.success) {
                        setDownloadError(result.error || '엑셀 다운로드 중 오류가 발생했습니다.');
                      }
                    } catch (err) {
                      const errorMsg = err instanceof Error ? err.message : String(err);
                      console.error('[v0] Excel 오류:', errorMsg, err);
                      setDownloadError(`엑셀 생성 실패: ${errorMsg}`);
                    } finally {
                      setDownloadingExcel(false);
                    }
                  }}
                >
                  {downloadingExcel ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>생성 중...</span>
                    </>
                  ) : (
                    <>
                      <Table className="h-4 w-4" />
                      엑셀
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-1.5 whitespace-nowrap flex-shrink-0"
                  onClick={() => {
                    setDownloadError(null);
                    try {
                      if (!selectedLayoutData) {
                        throw new Error('배치안 데이터가 없습니다. 먼저 배치안을 생성해주세요.');
                      }
                      if (!address) {
                        throw new Error('주소가 없습니다. 먼저 주소를 입력해주세요.');
                      }
                      const exportData: ExportData = {
                        address,
                        siteArea: siteAreaNum,
                        branding: branding || undefined,
                        layout: {
                          name: selectedLayoutData.name,
            type: selectedLayoutData.type,
                          floors: selectedLayoutData.floors,
                          units: selectedLayoutData.units,
                          parking: selectedLayoutData.parking,
                          buildingCoverage: selectedLayoutData.coverage ?? 0,
                          far: selectedLayoutData.gfa ? Math.round((selectedLayoutData.gfa / siteAreaNum) * 100) : 0,
                          gfa: selectedLayoutData.gfa ?? 0,
                        },
                        allLayouts: layouts.map(l => ({
                          name: l.name,
                          buildingCoverage: l.coverage ?? 0,
                          floors: l.floors,
                          units: l.units,
                          parking: l.parking,
                          gfa: l.gfa ?? 0,
                          roi: l.id === selectedLayoutData.id ? feasibilityResult?.roi : undefined,
                          isRecommended: l.id === selectedLayoutData.id,
                        })),
                        feasibility: {
                          landCost: feasibilityResult?.landCost ? feasibilityResult.landCost / 100000000 : 0,
                          constructionCost: feasibilityResult?.constructionCost ? feasibilityResult.constructionCost / 100000000 : 0,
                          indirectCost: feasibilityResult?.softCost ? feasibilityResult.softCost / 100000000 : 0,
                          totalCost: feasibilityResult?.totalCost ? feasibilityResult.totalCost / 100000000 : 0,
                          totalRevenue: feasibilityResult?.totalRevenue ? feasibilityResult.totalRevenue / 100000000 : 0,
                          expectedProfit: feasibilityResult?.profit ? feasibilityResult.profit / 100000000 : 0,
                          roi: feasibilityResult?.roi ?? 0,
                          avgSalePrice: feasibilityResult?.salesPricePerM2 || undefined,
                          breakEvenRate: feasibilityResult?.totalRevenue && feasibilityResult?.totalCost 
                            ? (feasibilityResult.totalCost / feasibilityResult.totalRevenue) * 100 
                            : 0,
                        },
                        regulation: {
                          zoneType: molitSupplementData.zoneCode || regulation?.zoneType || '',
                          roadWidth: molitSupplementData.roadWidth || regulation?.roadWidth,
                          maxHeight: molitSupplementData.heightLimit || regulation?.maxHeight,
                          buildingCoverageLimit: regulation?.maxCoverageRatio,
                          farLimit: regulation?.maxFloorAreaRatio,
                          hasDistrictPlan: molitSupplementData.hasDistrictPlan ?? regulation?.additionalNotes?.includes('지구단위') ?? false,
                        },
                        verdict: feasibilityResult?.roi && feasibilityResult.roi >= 20 ? "사업 추진 가능" : feasibilityResult?.roi && feasibilityResult.roi >= 10 ? "조건부 가능" : "추가 검토 필요",
                        risks: {
                          land: ["감정평가에 따른 매입가 변동", "소유권 및 권리관계 확인", "토지거래허가구역 해당 여부"],
                          permit: ["지구단위계획 변경 필요 여부", "건축심의 소요기간", "각종 부담금 발생 가능성"],
                          market: ["분양가 상한제 적용 여부", "인근 경쟁 물량 현황", "금리 변동에 따른 수요 변화"],
                          construction: ["공사비 상승 리스크", "공사기간 지연 가능성", "하자보수 책임"],
                        },
                      };
                      const result = openPrintPreview(exportData);
                      if (!result.success) {
                        setDownloadError(result.error || '인쇄 준비 중 오류가 발생했습니다.');
                      }
                    } catch (err) {
                      const errorMsg = err instanceof Error ? err.message : String(err);
                      console.error('[v0] 인쇄 오류:', errorMsg, err);
                      setDownloadError(`인쇄 준비 실패: ${errorMsg}`);
                    }
                  }}
                >
                  <Printer className="h-4 w-4" />
                  인쇄
                </Button>
              </div>
              
              <TabsContent value="summary">
                <ReportSummary 
                  layout={selectedLayoutData}
                  address={address}
                  siteArea={siteAreaNum}
                  gfa={gfa}
                  allLayouts={layouts}
                  regulation={regulation}
                  branding={branding || undefined}
                  molitData={molitSupplementData}
                  siteVisuals={siteVisuals}
                  financialScenarios={financialScenarios}
                  onScenariosChange={setFinancialScenarios}
                  landPricePerM2={landPriceData.pricePerM2 || 5000000}
                  feasibilityResult={feasibilityResult}
                />
              </TabsContent>

              <TabsContent value="ai">
                <AIReasoningPanel
                  layoutName={selectedLayoutData.name}
                  scores={selectedLayoutData.scores}
                  reasoning={selectedLayoutData.reasoning}
                  recommendation={selectedLayoutData.recommendation}
                  isRecommended={selectedLayoutData.recommendation.isRecommended}
                />
              </TabsContent>

              <TabsContent value="financial">
                <FinancialAnalysis 
                  siteArea={siteAreaNum}
                  gfa={gfa}
                  units={selectedLayoutData.units}
                  floors={selectedLayoutData.floors}
                  feasibilityResult={feasibilityResult}
                  landPricePerM2={landPriceData.pricePerM2 || 5000000}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
        
        {/* Debug Panel - Development Only */}
        <DebugPanel
          address={address}
          siteArea={siteAreaNum}
          zoning={regulation?.zoneType}
          road={`${regulation?.roadWidth || 0}m`}
          heightLimit={regulation?.maxHeight}
          districtPlan={supplementData?.districtPlan ?? "없음"}
          selectedStrategy={strategy}
          recommendedLayout={recommendedLayout ? {
            id: recommendedLayout.id,
            name: recommendedLayout.name,
            floors: recommendedLayout.floors,
            units: recommendedLayout.units,
            parking: recommendedLayout.parking,
            buildingCoverage: recommendedLayout.buildingCoverage,
            far: recommendedLayout.far,
            gfa: recommendedLayout.gfa,
          } : null}
          selectedLayout={selectedLayoutData ? {
            id: selectedLayoutData.id,
            name: selectedLayoutData.name,
            type: selectedLayoutData.type,
            floors: selectedLayoutData.floors,
            units: selectedLayoutData.units,
            parking: selectedLayoutData.parking,
            buildingCoverage: selectedLayoutData.buildingCoverage,
            far: selectedLayoutData.far,
            gfa: selectedLayoutData.gfa,
          } : null}
          regulationResult={{
            maxCoverage: regulation?.buildingCoverageLimit,
            maxFar: regulation?.farLimit,
            maxGfa: Math.round(siteAreaNum * (regulation?.farLimit || 0) / 100),
            recommendedFloors: { min: 3, max: Math.min(7, Math.floor((regulation?.maxHeight || 30) / 3.5)) },
            requiredParking: selectedLayoutData?.units || 0,
          }}
          feasibilityResult={{
            planName: selectedLayoutData?.name,
            totalCost: feasibilityResult?.landCost ? Math.round((feasibilityResult.landCost + feasibilityResult.constructionCost + feasibilityResult.indirectCost) / 100000000) : undefined,
            expectedRevenue: feasibilityResult?.totalRevenue ? Math.round(feasibilityResult.totalRevenue / 100000000) : undefined,
            expectedProfit: feasibilityResult?.expectedProfit ? Math.round(feasibilityResult.expectedProfit / 100000000) : undefined,
            roi: feasibilityResult?.roi,
            revenueModel: "세대수 기준",
          }}
          reportData={{
            planName: selectedLayoutData?.name,
            verdict: feasibilityResult?.roi && feasibilityResult.roi >= 20 ? "사업 추진 가능" : feasibilityResult?.roi && feasibilityResult.roi >= 10 ? "조건부 가능" : "추가 검토 필요",
            roi: feasibilityResult?.roi,
            totalCost: feasibilityResult?.landCost ? Math.round((feasibilityResult.landCost + feasibilityResult.constructionCost + feasibilityResult.indirectCost) / 100000000) : undefined,
            expectedRevenue: feasibilityResult?.totalRevenue ? Math.round(feasibilityResult.totalRevenue / 100000000) : undefined,
            units: selectedLayoutData?.units,
            floors: selectedLayoutData?.floors,
            grossFloorArea: selectedLayoutData?.gfa,
          }}
          floorPlanName={selectedLayoutData?.name}
          comparisonCurrentPlan={selectedLayoutData?.name}
        />
        
        {/* Release Checklist Panel - Development Only */}
        <ReleaseChecklistPanel
          address={address}
          siteArea={siteAreaNum}
          zoning={regulation?.zoneType}
          road={`${regulation?.roadWidth || 0}m`}
          heightLimit={regulation?.maxHeight}
          districtPlan={supplementData?.districtPlan ?? "없음"}
          selectedStrategy={strategy}
          recommendedLayout={recommendedLayout ? {
            id: recommendedLayout.id,
            name: recommendedLayout.name,
            floors: recommendedLayout.floors,
            units: recommendedLayout.units,
            parking: recommendedLayout.parking,
            buildingCoverage: recommendedLayout.buildingCoverage,
            far: recommendedLayout.far,
            gfa: recommendedLayout.gfa,
          } : null}
          selectedLayout={selectedLayoutData ? {
            id: selectedLayoutData.id,
            name: selectedLayoutData.name,
            type: selectedLayoutData.type,
            floors: selectedLayoutData.floors,
            units: selectedLayoutData.units,
            parking: selectedLayoutData.parking,
            buildingCoverage: selectedLayoutData.buildingCoverage,
            far: selectedLayoutData.far,
            gfa: selectedLayoutData.gfa,
          } : null}
          regulationResult={{
            maxCoverage: regulation?.buildingCoverageLimit,
            maxFar: regulation?.farLimit,
            maxGfa: Math.round(siteAreaNum * (regulation?.farLimit || 0) / 100),
            recommendedFloors: { min: 3, max: Math.min(7, Math.floor((regulation?.maxHeight || 30) / 3.5)) },
            requiredParking: selectedLayoutData?.units || 0,
          }}
          floorPlanName={selectedLayoutData?.name}
          feasibilityResult={{
            planName: selectedLayoutData?.name,
            totalCost: feasibilityResult?.landCost ? (feasibilityResult.landCost + feasibilityResult.constructionCost + feasibilityResult.indirectCost) / 100000000 : undefined,
            expectedRevenue: feasibilityResult?.totalRevenue ? feasibilityResult.totalRevenue / 100000000 : undefined,
            expectedProfit: feasibilityResult?.expectedProfit ? feasibilityResult.expectedProfit / 100000000 : undefined,
            roi: feasibilityResult?.roi,
            gfa: selectedLayoutData?.gfa,
          }}
          reportData={{
            planName: selectedLayoutData?.name,
            verdict: feasibilityResult?.roi && feasibilityResult.roi >= 20 ? "사업 추진 가능" : feasibilityResult?.roi && feasibilityResult.roi >= 10 ? "조건부 가능" : "추가 검토 필요",
            roi: feasibilityResult?.roi,
            totalCost: feasibilityResult?.landCost ? (feasibilityResult.landCost + feasibilityResult.constructionCost + feasibilityResult.indirectCost) / 100000000 : undefined,
            expectedRevenue: feasibilityResult?.totalRevenue ? feasibilityResult.totalRevenue / 100000000 : undefined,
            units: selectedLayoutData?.units,
            floors: selectedLayoutData?.floors,
            grossFloorArea: selectedLayoutData?.gfa,
          }}
        />
        
        {/* QA Inspection Panel - Development Only */}
        <QAInspectionPanel
          address={address}
          siteArea={siteAreaNum}
          zoning={regulation?.zoneType}
          road={`${regulation?.roadWidth || 0}m`}
          heightLimit={regulation?.maxHeight}
          districtPlan={supplementData?.districtPlan ?? "없음"}
          selectedStrategy={strategy}
          recommendedLayout={recommendedLayout ? {
            id: recommendedLayout.id,
            name: recommendedLayout.name,
            floors: recommendedLayout.floors,
            units: recommendedLayout.units,
            parking: recommendedLayout.parking,
            buildingCoverage: recommendedLayout.buildingCoverage,
            far: recommendedLayout.far,
            gfa: recommendedLayout.gfa,
          } : null}
          selectedLayout={selectedLayoutData ? {
            id: selectedLayoutData.id,
            name: selectedLayoutData.name,
            type: selectedLayoutData.type,
            floors: selectedLayoutData.floors,
            units: selectedLayoutData.units,
            parking: selectedLayoutData.parking,
            buildingCoverage: selectedLayoutData.buildingCoverage,
            far: selectedLayoutData.far,
            gfa: selectedLayoutData.gfa,
          } : null}
          regulationResult={{
            maxCoverage: regulation?.buildingCoverageLimit,
            maxFar: regulation?.farLimit,
            maxGfa: Math.round(siteAreaNum * (regulation?.farLimit || 0) / 100),
            recommendedFloors: { min: 3, max: Math.min(7, Math.floor((regulation?.maxHeight || 30) / 3.5)) },
            requiredParking: selectedLayoutData?.units || 0,
          }}
          feasibilityResult={{
            planName: selectedLayoutData?.name,
            totalCost: feasibilityResult?.landCost ? (feasibilityResult.landCost + feasibilityResult.constructionCost + feasibilityResult.indirectCost) / 100000000 : undefined,
            expectedRevenue: feasibilityResult?.totalRevenue ? feasibilityResult.totalRevenue / 100000000 : undefined,
            expectedProfit: feasibilityResult?.expectedProfit ? feasibilityResult.expectedProfit / 100000000 : undefined,
            roi: feasibilityResult?.roi,
            gfa: selectedLayoutData?.gfa,
          }}
          reportData={{
            planName: selectedLayoutData?.name,
            verdict: feasibilityResult?.roi && feasibilityResult.roi >= 20 ? "사업 추진 가능" : feasibilityResult?.roi && feasibilityResult.roi >= 10 ? "조건부 가능" : "추가 검토 필요",
            roi: feasibilityResult?.roi,
            totalCost: feasibilityResult?.landCost ? (feasibilityResult.landCost + feasibilityResult.constructionCost + feasibilityResult.indirectCost) / 100000000 : undefined,
            expectedRevenue: feasibilityResult?.totalRevenue ? feasibilityResult.totalRevenue / 100000000 : undefined,
            units: selectedLayoutData?.units,
            floors: selectedLayoutData?.floors,
            grossFloorArea: selectedLayoutData?.gfa,
            address: address,
          }}
          floorPlanName={selectedLayoutData?.name}
          comparisonCurrentPlan={selectedLayoutData?.name}
        />
      </main>
      
      {/* 모바일 하단 단계 네비게이션 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-background/95 backdrop-blur border-t border-border/50 px-2 py-1.5 safe-area-bottom">
        <div className="flex items-center justify-between gap-1 max-w-lg mx-auto">
          {steps.map((step, index) => {
            const isActive = currentStep === step.id
            const isPast = steps.findIndex(s => s.id === currentStep) > index
            const isFuture = !isActive && !isPast
            return (
              <button key={step.id}
                onClick={() => {
                  if (isPast || isActive) setCurrentStep(step.id as AppStep)
                }}
                disabled={isFuture}
                className={`flex-1 flex flex-col items-center gap-0.5 py-1 rounded-lg transition-colors ${
                  isActive ? 'bg-primary/10 text-primary' : isPast ? 'text-muted-foreground' : 'text-muted-foreground/40'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-primary' : isPast ? 'bg-muted-foreground/50' : 'bg-muted-foreground/20'}`} />
                <span className="text-[9px] font-medium leading-none">{step.label.replace(/ /g, '\n').split('\n')[0]}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Modals */}
      <UpgradeModal 
        open={showUpgradeModal} 
        onOpenChange={setShowUpgradeModal} 
      />
      <PricingModal 
        open={showPricingModal} 
        onOpenChange={setShowPricingModal} 
      />
    </div>
    </ErrorBoundary>
  )
}
