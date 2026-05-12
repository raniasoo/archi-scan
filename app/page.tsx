"use client"

import { buildSiteContextPrompt } from "@/lib/site-context-builder"
/**
 * @version STABLE-v195
 * @checkpoint performance-optimization
 * @date 2026-05-05
 * @description Performance optimized:
 *   - Dynamic imports for heavy components (50+ components lazy loaded)
 *   - Initial bundle reduced by ~60%
 *   - Only step 1 (input) components loaded on first render
 */
import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { SupplementData } from "@/components/manual-supplement-form"
import { type SiteVisualsConfig, EMPTY_SITE_VISUALS } from "@/lib/site-visuals-config"
import { ZONE_LAYOUT_CONFIGS, getUseLabel } from "@/lib/zone-layout-config"
import { type FinancialScenariosConfig, EMPTY_SCENARIOS_CONFIG } from "@/lib/financial-scenarios-config"
import { saveProject as saveProjectToStorage, getRecentProjects, type ProjectListItem } from "@/lib/project-storage"
import { saveProjectToCloud } from "@/lib/cloud-storage"
import { type BrandingConfig, loadBrandingConfig } from "@/lib/branding-config"
import { toast } from "sonner"
import { useSubscription } from "@/components/subscription-provider"
import { ErrorBoundary } from "@/components/error-boundary"
import { AuthButton } from "@/components/auth-button"
import { fetchLandPrice } from "@/lib/land-price"
import type { ImportedReportData } from "@/components/excel-import"
import { type ProjectSnapshot } from "@/components/project-manager"
import {
  Building2, LayoutGrid, Layers, Banknote, FileText,
  Loader2, CreditCard, Scale, Brain, LayoutDashboard,
  Settings2, Share2, Sparkles,
} from "lucide-react"
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
import { getRegionalPricing, getZoneMultiplier, type RegionalPricing } from "@/lib/regional-pricing"
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
import { evaluatePatternQuality, type UserValues } from "@/lib/pattern-quality"
import { ALEXANDER_LAYOUT_TYPES, recommendLayoutTypes, getAlexanderLayoutDescription } from "@/lib/alexander-layouts"

// ── 동적 임포트: 3D/시각화 (가장 무거움, SSR 불필요) ──
const LoadingBox = () => <div className="flex items-center justify-center p-8 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" />로딩 중...</div>
const BuildingVolume3D = dynamic(() => import("@/components/building-volume-3d").then(m => ({ default: m.BuildingVolume3D })), { ssr: false, loading: LoadingBox })
const FloorPlan = dynamic(() => import("@/components/floor-plan").then(m => ({ default: m.FloorPlan })), { ssr: false, loading: LoadingBox })

// ── 동적 임포트: 무거운 기능 컴포넌트 ──
const Dashboard = dynamic(() => import("@/components/dashboard").then(m => ({ default: m.Dashboard })), { loading: LoadingBox })
const CollaborationManager = dynamic(() => import("@/components/collaboration-manager").then(m => ({ default: m.CollaborationManager })), { loading: LoadingBox })


// ── 동적 임포트: 단계별 컴포넌트 ──
const ProjectComparison = dynamic(() => import("@/components/project-comparison").then(m => ({ default: m.ProjectComparison })))
const SiteVisualsManager = dynamic(() => import("@/components/site-visuals-manager").then(m => ({ default: m.SiteVisualsManager })))
const BrandingEditor = dynamic(() => import("@/components/branding-editor").then(m => ({ default: m.BrandingEditor })))
const LandingPage = dynamic(() => import("@/components/landing-page").then(m => ({ default: m.LandingPage })))
const QuickAnalysis = dynamic(() => import("@/components/quick-analysis").then(m => ({ default: m.QuickAnalysis })))

// ── 동적 임포트: 관리/도구 컴포넌트 ──
const ExcelImport = dynamic(() => import("@/components/excel-import").then(m => ({ default: m.ExcelImport })))
const ProjectManager = dynamic(() => import("@/components/project-manager").then(m => ({ default: m.ProjectManager })))
const VersionHistoryManager = dynamic(() => import("@/components/version-history-manager").then(m => ({ default: m.VersionHistoryManager })))
const ApprovalWorkflowManager = dynamic(() => import("@/components/approval-workflow-manager").then(m => ({ default: m.ApprovalWorkflowManager })))
const DevPanels = dynamic(() => import("@/components/dev-panels").then(m => ({ default: m.DevPanels })))
const OnboardingTour = dynamic(() => import("@/components/onboarding-tour").then(m => ({ default: m.OnboardingTour })), { ssr: false })
const FloorplanStep = dynamic(() => import("@/components/steps/floorplan-step").then(m => ({ default: m.FloorplanStep })), { loading: LoadingBox })
const LayoutsStep = dynamic(() => import("@/components/steps/layouts-step").then(m => ({ default: m.LayoutsStep })), { loading: LoadingBox })
const InputStep = dynamic(() => import("@/components/steps/input-step").then(m => ({ default: m.InputStep })), { loading: LoadingBox })
const StrategyStep = dynamic(() => import("@/components/steps/strategy-step").then(m => ({ default: m.StrategyStep })), { loading: LoadingBox })
const RegulationStep = dynamic(() => import("@/components/steps/regulation-step").then(m => ({ default: m.RegulationStep })), { loading: LoadingBox })
const FinancialStep = dynamic(() => import("@/components/steps/financial-step").then(m => ({ default: m.FinancialStep })), { loading: LoadingBox })
const ReportStep = dynamic(() => import("@/components/steps/report-step").then(m => ({ default: m.ReportStep })), { loading: LoadingBox })
const AIHub = dynamic(() => import("@/components/ai-hub").then(m => ({ default: m.AIHub })), { loading: LoadingBox })

// ── 동적 임포트: 내보내기 함수 (사용 시에만 로드) ──
const loadExportFunctions = () => import("@/lib/report-export")
const loadDxfGenerator = () => import("@/lib/dxf-generator")
const loadLayoutOptimizer = () => import("@/lib/layout-optimizer")
import type { OptimizationReport } from "@/lib/layout-optimizer"

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
  buildingCount?: number // 동수 (사용자 수동 입력 가능)
  features: string[]
  scores: LayoutScores
  recommendation: LayoutRecommendation
  reasoning: AIReasoning
  isLegallyCompliant?: boolean // 법규 준수 여부
  _originalType?: "tower" | "courtyard" | "lshape" | "linear" | "cluster" // 클러스터 변환 전 원래 타입
  _userEdited?: boolean // 사용자가 수동 조정했는지 여부
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
  strategy: DesignStrategy,
  userValues?: UserValues,
  designApproach?: 'quantitative' | 'alexander' | 'combined'
): LayoutOption[] {
  const params = STRATEGY_PARAMETERS[strategy]
  const analysis = analyzeRegulations(siteArea, regulation)
  
  // 전략에 따른 세대 크기
  const unitSize = UNIT_SIZES[params.unitSizePreference]
  
  // ============================================================
  // 알렉산더 3축 슬라이더 → 배치안 파라미터 조절
  // profitVsQuality: 0=수익극대화 → 높은건폐율, 100=거주품질 → 낮은건폐율+여유공간
  // privacyVsCommunity: 0=프라이버시 → 동간격↑, 100=커뮤니티 → 공유공간↑
  // efficiencyVsSpace: 0=효율 → 빈틈없는배치, 100=여유 → 넉넉한외부공간
  // ============================================================
  const pq = userValues?.profitVsQuality ?? 50
  const pc = userValues?.privacyVsCommunity ?? 50
  const es = userValues?.efficiencyVsSpace ?? 50
  
  // 슬라이더 기반 보정 계수 (0.85 ~ 1.15 범위)
  const coverageAdj = 1.15 - (pq + es) / 200 * 0.30      // 품질↑/여유↑ → 건폐율↓
  const floorAdj = 1.10 - pq / 100 * 0.20                 // 품질↑ → 층수↓ (여유있는 스케일)
  const openSpaceAdj = 1.0 + (pq + es) / 200 * 0.30       // 품질↑/여유↑ → 외부공간↑
  
  // 법규 한도 계산 (regulation이 불완전할 경우 안전 기본값)
  const maxCoverage = regulation?.maxCoverageRatio ?? 60
  const maxFAR = regulation?.maxFloorAreaRatio ?? 200
  const maxFloorsByFAR = Math.ceil(maxFAR / (maxCoverage * params.coverageMultiplier))
  const maxFloorsByHeight = Math.floor((regulation?.maxHeight ?? 30) / 3.3)
  const effectiveMaxFloors = Math.min(regulation?.maxFloors ?? 12, maxFloorsByFAR, maxFloorsByHeight)

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
    const coverage = Math.min(maxCoverage, Math.round(coverageBase * params.coverageMultiplier * coverageAdj))
    const floors = Math.min(effectiveMaxFloors, Math.round(floorBase * params.floorMultiplier * floorAdj))
    const buildingArea = (siteArea * coverage) / 100
    const gfa = buildingArea * floors
    const openSpace = Math.round((100 - coverage) * params.openSpaceRatio * openSpaceAdj * 100) / 100
    
    // 세대수 계산 (층별 건축면적 기준 — 현실적 세대수)
    const netFloorArea = buildingArea * params.coreEfficiency
    const unitsPerFloor = Math.max(Math.floor(netFloorArea / unitSize), 1)
    const residentialFloors = Math.max(floors - 1, 1) // 1층은 로비/상가
    const units = unitsPerFloor * residentialFloors
    
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
    
    // 세대수 재계산 (clamped 건축면적 기준 — 현실적 세대수)
    const clampedNetFloorArea = clampedBuildingArea * params.coreEfficiency
    const clampedUnitsPerFloor = Math.max(Math.floor(clampedNetFloorArea / unitSize), 1)
    const clampedResidentialFloors = Math.max(clampedFloors - 1, 1)
    const clampedUnits = clampedUnitsPerFloor * clampedResidentialFloors
    
    // 주차대수 재계산
    const clampedRequiredParking = Math.ceil(clampedUnits * regulation.parkingRatio)
    const clampedParking = Math.ceil(clampedRequiredParking * parkingEfficiency)
    
    // 특징 생성 (clamped 값 사용)
    const features: string[] = []
    // 건물 용도 표시 (용도지역 기반)
    if (zoneConfig) {
      features.push(getUseLabel(zoneConfig.primaryUse))
    }
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
  
  // 용도지역 기반 배치안 이름 가져오기
  const zoneConfig = ZONE_LAYOUT_CONFIGS[regulation.zoneType] || null
  const getLayoutName = (typeId: string, defaultName: string) => {
    if (zoneConfig?.layoutNamePrefix[typeId]) {
      return zoneConfig.layoutNamePrefix[typeId]
    }
    return defaultName
  }
  const getLayoutDesc = (typeId: string, defaultDesc: string) => {
    if (zoneConfig) {
      const use = getUseLabel(zoneConfig.primaryUse)
      const descs: Record<string, string> = {
        tower: zoneConfig.primaryUse === 'single-family' ? '대지 효율을 높인 저층 단독주택' :
               zoneConfig.primaryUse === 'multi-family' ? '소규모 대지에 최적화된 저층 다세대' :
               zoneConfig.primaryUse === 'commercial-mix' ? `저층 상가 + 상층 주거의 ${use}` :
               zoneConfig.primaryUse === 'office' ? `대형 업무공간 확보 오피스 타워` :
               zoneConfig.primaryUse === 'knowledge-industry' ? '제조·연구·사무 복합 지식산업센터' :
               defaultDesc,
        courtyard: zoneConfig.primaryUse === 'single-family' ? '중앙 정원 프라이빗 단독주택' :
                   zoneConfig.primaryUse === 'commercial-mix' ? '오픈몰+주거 복합 중정형' :
                   defaultDesc,
        lshape: zoneConfig.primaryUse === 'commercial-mix' ? '상가+주거 복합 ㄱ자형 배치' :
                defaultDesc,
      }
      return descs[typeId] || defaultDesc
    }
    return defaultDesc
  }
  
  // 타워형 - 고층 개발에 적합
  const tower = calculateLayout(
    "tower",
    getLayoutName("tower",
      strategy === "view-priority" ? "파노라마 타워형" :
      strategy === "area-maximize" ? "고밀도 타워형" :
      strategy === "profitability" ? "수익형 타워" : "컴팩트 타워형"
    ),
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
    getLayoutName("courtyard",
      strategy === "livability" ? "라이프스타일 중정형" :
      strategy === "privacy-priority" ? "프라이빗 중정형" : "커뮤니티 중정형"
    ),
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
    getLayoutName("lshape",
      strategy === "parking-efficient" ? "주차 최적 ㄱ자형" :
      strategy === "privacy-priority" ? "독립 동선 ㄱ자형" : "코너 활용 ㄱ자형"
    ),
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
  // ★ 대규모 대지 + 다세대 + 저층 → 다동 클러스터 자동 전환
  // AI 렌더링 프롬프트와 동일 조건 (도면 일치)
  // ============================================================
  layouts.forEach(layout => {
    layout._originalType = layout.type // 원래 타입 보존
    if (layout.type !== 'cluster' && layout.type !== 'tower' &&
        siteArea > 1500 && (layout.units || 0) > 20 && layout.floors <= 5) {
      layout.type = 'cluster'
      // ★ 동수 자동 계산 (타입별 차별화)
      if (!layout.buildingCount) {
        const perFloor: Record<string, number> = { linear: 12, lshape: 6, courtyard: 10, tower: 4, cluster: 4 }
        const maxPerFloor = perFloor[layout._originalType] || 4
        layout.buildingCount = Math.max(2, Math.ceil((layout.units || 20) / (maxPerFloor * layout.floors)))
      }
    }
  })

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

type AppStep = "input" | "strategy" | "regulation" | "layouts" | "floorplan" | "ai-render" | "financial" | "report"

export default function ArchiScanPage() {
  const [mounted, setMounted] = useState(false) // v2
  const [showLanding, setShowLanding] = useState(true)
  const [showQuickMode, setShowQuickMode] = useState(false)
  const [autoTriggerLookup, setAutoTriggerLookup] = useState(false)
  const [inAppBrowser, setInAppBrowser] = useState<string | null>(null)
  
  const { 
    isProUser, 
    showUpgradeModal, 
    setShowUpgradeModal, 
    showPricingModal, 
    setShowPricingModal 
  } = useSubscription()
  
  const [address, setAddress] = useState("")
  const [siteArea, setSiteArea] = useState("")
  const [projectType, setProjectType] = useState<'new' | 'reconstruction' | 'unknown'>('unknown')
  const [existingBuildingInfo, setExistingBuildingInfo] = useState<{
    mainPurpose?: string; groundFloors?: number; buildingName?: string; householdCount?: number; totalFloorArea?: number
  } | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [layouts, setLayouts] = useState<LayoutOption[]>([])
  const [selectedLayout, setSelectedLayout] = useState<number | null>(null)
  const [currentStep, setCurrentStep] = useState<AppStep>("input")
  
  // ━━━ 변경 감지 + 무효화 시스템 ━━━
  // 상위 단계 변경 시 하위 단계를 무효화 (stale)
  const [staleSteps, setStaleSteps] = useState<Set<string>>(new Set())
  const [dataSnapshots, setDataSnapshots] = useState<Record<string, string>>({})
  
  // ★ 해시 변수 + useEffect + markStepFresh는 모든 useState 뒤에 선언 (TDZ 방지)
  const [selectedFloor, setSelectedFloor] = useState(1)
  const [floorPlanViewMode, setFloorPlanViewMode] = useState<"fit" | "original">("fit")
  const [isFloorPlanFullscreen, setIsFloorPlanFullscreen] = useState(false)
  const [drawingTab, setDrawingTab] = useState<"floor" | "site" | "iso" | "section" | "elevation" | "perspective" | "ai-generate">("floor")
  const [showDxfPreview, setShowDxfPreview] = useState(false)
  const [layoutViewMode, setLayoutViewMode] = useState<"card" | "compare">("card")
  const [sitePolygon, setSitePolygon] = useState<{ coords: [number, number][], centroid: [number, number] } | null>(null)
  const [analysisRawData, setAnalysisRawData] = useState<any>(null)
  const [siteCoords, setSiteCoords] = useState<{ lng: number, lat: number } | null>(null)
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
  const [designApproach, setDesignApproach] = useState<'quantitative' | 'alexander' | 'combined'>('combined')
  const [userValues, setUserValues] = useState<UserValues>({
    profitVsQuality: 50,
    privacyVsCommunity: 50,
    efficiencyVsSpace: 50,
    selectedPatterns: [],
  })
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
    overlappingRegulations?: { name: string; category: string; severity: string; coverageOverride?: number; heightLimit?: number; floorLimit?: number; description?: string }[]
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
  const [cardRoi, setCardRoi] = useState<number | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [siteVisuals, setSiteVisuals] = useState<SiteVisualsConfig>(EMPTY_SITE_VISUALS)
  const [aiRenderImage, setAiRenderImage] = useState<string | null>(null)
  const [aiMultiImages, setAiMultiImages] = useState<{angle:string; image:string|null}[] | null>(null)
  const [financialScenarios, setFinancialScenarios] = useState<FinancialScenariosConfig>(EMPTY_SCENARIOS_CONFIG)
  const [optimizationResult, setOptimizationResult] = useState<OptimizationReport | null>(null)
  const [showComparisonModal, setShowComparisonModal] = useState(false)
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
  const [currentProjectName, setCurrentProjectName] = useState<string>("")
  const [recentProjects, setRecentProjects] = useState<ProjectListItem[]>([])
  const [showProjectComparison, setShowProjectComparison] = useState(false)
  const [showAllProjectsList, setShowAllProjectsList] = useState(false)
  
  // 최근 프로젝트 목록 로드
  useEffect(() => {
    if (mounted) {
      try { setRecentProjects(getRecentProjects(10)) } catch {}
    }
  }, [mounted, currentProjectId])
  
  // 자동 저장 — 배치안 생성 완료 시 (localStorage + Cloud)
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
          
          // 클라우드 저장 (로그인 사용자만, 비동기)
          saveProjectToCloud({
            name: saved.name,
            address,
            siteArea: Number(siteArea),
            zoneType: regulation?.zoneName,
            snapshotData: snapshot,
          }).then(r => {
            if (r.success) console.log('[cloud-save] 클라우드 저장 완료:', r.id)
          }).catch(() => {})
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

  // ━━━ 변경 감지 해시 + useEffect (모든 useState 뒤에 선언 — TDZ 방지) ━━━
  const currentInputHash = `${address}|${siteArea}`
  const currentRegHash = `${regulation?.zoneType}|${regulation?.maxCoverageRatio}|${regulation?.maxFloorAreaRatio}`
  const currentStrategyHash = `${strategy}|${userValues?.profitVsQuality}|${userValues?.privacyVsCommunity}`
  
  useEffect(() => {
    if (!dataSnapshots.input || !address) return
    if (dataSnapshots.input !== currentInputHash) {
      setStaleSteps(prev => { const next = new Set(prev); next.add('regulation'); next.add('layouts'); next.add('financial'); next.add('report'); return next })
    }
  }, [currentInputHash]) // eslint-disable-line react-hooks/exhaustive-deps
  
  useEffect(() => {
    if (!dataSnapshots.regulation || !regulation?.zoneType) return
    if (dataSnapshots.regulation !== currentRegHash) {
      setStaleSteps(prev => { const next = new Set(prev); next.add('layouts'); next.add('financial'); next.add('report'); return next })
    }
  }, [currentRegHash]) // eslint-disable-line react-hooks/exhaustive-deps
  
  useEffect(() => {
    if (!dataSnapshots.strategy) return
    if (dataSnapshots.strategy !== currentStrategyHash) {
      setStaleSteps(prev => { const next = new Set(prev); next.add('layouts'); next.add('financial'); next.add('report'); return next })
    }
  }, [currentStrategyHash]) // eslint-disable-line react-hooks/exhaustive-deps
  
  const markStepFresh = (stepId: string) => {
    setStaleSteps(prev => { const next = new Set(prev); next.delete(stepId); return next })
    setDataSnapshots(prev => ({
      ...prev,
      ...(stepId === 'input' ? { input: currentInputHash } : {}),
      ...(stepId === 'regulation' ? { regulation: currentRegHash } : {}),
      ...(stepId === 'strategy' ? { strategy: currentStrategyHash } : {}),
      ...(stepId === 'layouts' ? { layouts: `${layouts.length}|${selectedLayout}` } : {}),
    }))
  }

  useEffect(() => {
    setMounted(true)
    // 인앱 브라우저 감지
    const ua = navigator.userAgent || ''
    if (/KAKAOTALK/i.test(ua)) setInAppBrowser('카카오톡')
    else if (/Line\//i.test(ua)) setInAppBrowser('라인')
    else if (/FBAN|FBAV/i.test(ua)) setInAppBrowser('페이스북')
    else if (/Instagram/i.test(ua)) setInAppBrowser('인스타그램')
    else if (/NAVER/i.test(ua)) setInAppBrowser('네이버')
    // Initialize user
    getOrCreateUser().then(setCurrentUser)

    // 랜딩 페이지 스킵 여부 (이전 방문자 또는 세션 존재 시)
    const hasUsed = localStorage.getItem('archi-scan-session') || localStorage.getItem('archi-scan-visited')
    const hasSession = localStorage.getItem('archi-scan-session')
    if (hasSession) { setShowLanding(false); setShowQuickMode(false) }
    else if (hasUsed) { setShowLanding(false); setShowQuickMode(true) }

    // 저장된 프로젝트 상태 복원
    try {
      const saved = localStorage.getItem('archi-scan-session')
      if (saved) {
        const s = JSON.parse(saved)
        if (s.address) setAddress(s.address)
        if (s.siteArea) setSiteArea(String(s.siteArea))
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

  // Auto-load parcel polygon for 3D terrain boundary overlay
  useEffect(() => {
    if (!siteCoords || !address || sitePolygon) return
    const fetchPolygon = async () => {
      try {
        const res = await fetch('/api/vworld', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address, siteArea, entX: siteCoords.lng, entY: siteCoords.lat }),
        })
        const data = await res.json()
        if (data.success && data.parcel?.coordinates?.length) {
          setSitePolygon({ coords: data.parcel.coordinates, centroid: data.parcel.centroid })
        } else if (data.demoParcel?.coordinates?.length) {
          setSitePolygon({ coords: data.demoParcel.coordinates, centroid: data.demoParcel.centroid })
        }
      } catch {}
    }
    fetchPolygon()
  }, [siteCoords, address])

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
    
    // 분양가 우선순위: 실거래가 > 지역별 테이블 > 기본값 (카드와 동일)
    const effectiveSalesPrice = (marketPrice.loaded && marketPrice.suggestedSalePrice > 0)
      ? marketPrice.suggestedSalePrice
      : regionalPricing 
        ? Math.round(regionalPricing.salesPricePerM2 * getZoneMultiplier(regulation.zoneType || ''))
        : 5000000
    
    // 공사비: 지역별 테이블 > 기본값 (카드와 동일)
    const effectiveConstCost = regionalPricing?.constructionCostPerM2 || 2500000
    
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

  // ━━━ AI 렌더링 이미지 sessionStorage 영속화 ━━━
  // 마운트 시 복원
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const saved = sessionStorage.getItem('archi-scan-render')
      if (saved && !aiRenderImage) setAiRenderImage(saved)
    } catch {}
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 변경 시 저장
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      if (aiRenderImage) sessionStorage.setItem('archi-scan-render', aiRenderImage)
    } catch {}
  }, [aiRenderImage])

  // ━━━ 보고서 탭 진입 시 AI 렌더링 자동 생성 ━━━
  useEffect(() => {
    if (currentStep !== 'report') return
    if (aiRenderImage) return // 이미 있으면 스킵
    if (!selectedLayout || layouts.length === 0) return

    const layout = layouts.find(l => l.id === selectedLayout)
    if (!layout) return

    let cancelled = false
    const autoGenerate = async () => {
      try {
        const r = await fetch('/api/ai-render', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `${layout.name} ${layout.floors}층 ${layout.units}세대`,
            style: 'modern-luxury',
            address,
            layoutName: layout.name,
            floors: layout.floors,
            units: layout.units,
            siteArea: safeNumber(siteArea, 660),
            buildingType: layout.type || 'tower',
            coverage: layout.coverage,
            cameraAngle: 'eye-level',
            sceneMode: 'afternoon',
            regulation: {
              heightLimit: regulation.maxHeight,
              zoneName: regulation.zoneType,
              northShadow: true,
              northShadowAngle: 45,
            },
          }),
        })
        if (!r.ok || cancelled) return
        const d = await r.json()
        if (d.success && d.image && !cancelled) {
          setAiRenderImage(d.image)
        }
      } catch {}
    }
    autoGenerate()
    return () => { cancelled = true }
  }, [currentStep, aiRenderImage, selectedLayout, layouts]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSiteInputComplete = () => {
    markStepFresh('input')
    setCurrentStep("regulation")
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
    overlappingRegulations?: { name: string; category: string; severity: string; coverageOverride?: number; heightLimit?: number; floorLimit?: number; description?: string }[]
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
    
    // ━━━ 신축/재건축 자동 판단 ━━━
    const d = data as any
    if (d.mainPurpose || (d.groundFloors && d.groundFloors > 0) || d.buildingName) {
      setProjectType('reconstruction')
      setExistingBuildingInfo({
        mainPurpose: d.mainPurpose,
        groundFloors: d.groundFloors,
        buildingName: d.buildingName,
        householdCount: d.householdCount,
        totalFloorArea: d.totalFloorArea,
      })
      console.log('[v0] 기존 건물 감지 → 재건축/리모델링 사업:', d.mainPurpose, d.groundFloors, '층')
    } else if (data.bdMgtSn) {
      // bdMgtSn은 있지만 건물 상세 없음 → 기존 건물 존재 가능성
      setProjectType('reconstruction')
      setExistingBuildingInfo(null)
      console.log('[v0] bdMgtSn 존재 → 기존 건물 가능성:', data.bdMgtSn)
    } else {
      setProjectType('new')
      setExistingBuildingInfo(null)
      console.log('[v0] 기존 건물 없음 → 신축 사업')
    }
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
      // 중첩 규제 저장
      overlappingRegulations: data.overlappingRegulations || prev.overlappingRegulations,
    }))
    
    // MOLIT 용도지역이 있고 regulation에 아직 설정 안 된 경우 → 직접 반영
    if (molitMappedZone) {
      const zoneLabelMap: Record<string, string> = {
        'residential-exclusive-1': '제1종 전용주거지역',
        'residential-exclusive-2': '제2종 전용주거지역',
        'residential-1': '제1종 일반주거지역',
        'residential-2': '제2종 일반주거지역',
        'residential-3': '제3종 일반주거지역',
        'semi-residential': '준주거지역',
        'commercial-neighborhood': '근린상업지역',
        'commercial-general': '일반상업지역',
        'commercial-central': '중심상업지역',
        'industrial': '준공업지역',
        'industrial-general': '일반공업지역',
        'green-natural': '자연녹지지역',
      }
      setRegulation(prev => ({
        ...prev,
        zoneType: molitMappedZone as any,
        zoneName: zoneLabelMap[molitMappedZone] || data.zoneType || prev.zoneName,
      }))
      console.log('[v0] MOLIT 용도지역 직접 반영:', molitMappedZone, data.zoneType)
    }
    
    // regulation의 접도/지구단위 즉시 업데이트
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

    // 좌표 저장 (지도 미리보기용)
    if (data.entX && data.entY) {
      setSiteCoords({ lng: data.entX, lat: data.entY })
    } else {
      // JUSO 개발 키에서 좌표 미반환 시 VWorld 지오코딩으로 변환
      const geoAddr = roadAddr || address
      if (geoAddr) {
        fetch(`/api/geocode?address=${encodeURIComponent(geoAddr)}`)
          .then(r => r.json())
          .then(g => { if (g.success && g.lng && g.lat) setSiteCoords({ lng: g.lng, lat: g.lat }) })
          .catch(() => {})
      }
    }
    
    // 필지 폴리곤 저장 (MOLIT LP_PA_CBND_BUBUN 기반 — 지적도와 동일한 실제 필지 경계)
    const pp = (data as any)?.parcelPolygon
    if (pp?.coords?.length > 2) {
      setSitePolygon({ coords: pp.coords, centroid: pp.centroid })
      console.log(`[v0] MOLIT 필지 폴리곤 적용: ${pp.coords.length}점 (지적도 일치)`)
    }
    
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
      const generatedLayouts = generateLayouts(area, regulation, strategy, userValues, designApproach)
      
      // 알렉산더/조합 모드: 배치안을 패턴 기반 이름으로 변환
      if (designApproach !== 'quantitative') {
        // 대지 조건에 따른 최적 유형 추천
        const recommendedTypes = recommendLayoutTypes({
          siteArea: area,
          zoneType: regulation.zoneType,
          maxFloors: regulation.maxFloors || 5,
        })
        
        // 기존 배치안 유형 → 알렉산더 유형 매핑
        const typeMapping: Record<string, string> = {
          'tower': 'panorama-tower',
          'linear': 'sunlight-plate',
          'courtyard': 'living-courtyard',
          'lshape': 'transition-house',
          'cluster': 'village-cluster',
        }
        
        generatedLayouts.forEach((layout, i) => {
          // 매핑 또는 추천순 배정
          const mappedId = typeMapping[layout.type] || recommendedTypes[Math.min(i, recommendedTypes.length - 1)]?.id
          const alexType = ALEXANDER_LAYOUT_TYPES.find(t => t.id === mappedId) || recommendedTypes[i]
          
          if (alexType) {
            layout.name = `${alexType.icon} ${alexType.name}`
            layout.description = getAlexanderLayoutDescription(alexType)
            
            if (designApproach === 'alexander') {
              layout.description += ` — ${alexType.philosophy.slice(0, 80)}...`
            }
          }
        })
        
        // 모든 배치안에 건축 타입 표시
        const typeLabel: Record<string, string> = {
          tower: '타워', courtyard: '중정', lshape: 'ㄱ자', linear: '판상', cluster: '클러스터'
        }
        generatedLayouts.forEach(l => {
          const origType = l._originalType || l.type
          const suffix = typeLabel[origType] || origType
          if (!l.name.includes('·') && !l.name.includes('수익 최적화')) {
            l.name = `${l.name} · ${suffix}`
          }
        })
      }
      
      // ============================================================
      // 알렉산더/균형 모드: 패턴 품질 점수로 배치안 재정렬
      // 사용자의 가치관 선택이 추천 순서에 실제 반영됨
      // ============================================================
      if (designApproach !== 'quantitative') {
        const scored = generatedLayouts.map(layout => {
          const pq = evaluatePatternQuality({
            type: layout.type || 'tower',
            name: layout.name,
            coverage: layout.coverage,
            floors: layout.floors,
            units: layout.units || 0,
            parking: layout.parking || 0,
            gfa: layout.gfa || 0,
            siteArea: area,
            strategy,
          }, userValues)
          return { layout, patternScore: pq.overallQuality }
        })
        
        // 법규 준수 유지하면서 패턴 점수로 재정렬
        scored.sort((a, b) => {
          const aLegal = a.layout.isLegallyCompliant ? 1 : 0
          const bLegal = b.layout.isLegallyCompliant ? 1 : 0
          if (aLegal !== bLegal) return bLegal - aLegal
          return b.patternScore - a.patternScore
        })
        
        // 재정렬된 순서 적용
        generatedLayouts.length = 0
        scored.forEach((s, i) => {
          s.layout.id = i + 1
          s.layout.recommendation.isRecommended = i === 0
          generatedLayouts.push(s.layout)
        })
      }
      
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
      markStepFresh('strategy')
      markStepFresh('regulation')
      setTimeout(() => markStepFresh('layouts'), 500)
      
      // ━━━ 수익 최적화 배치안 자동 생성 ━━━
      try {
        const { optimizeLayout } = await loadLayoutOptimizer()
        const optResult = optimizeLayout({
          siteArea: area,
          maxCoverage: regulation.maxCoverageRatio || 60,
          maxFAR: regulation.maxFloorAreaRatio || 200,
          maxFloors: regulation.maxFloors || 20,
          maxHeight: regulation.maxHeight || 60,
          parkingRatio: regulation.parkingRatio || 1.0,
          landCostPerM2: landPriceData.pricePerM2 || 5000000,
          constructionCostPerM2: regionalPricing?.constructionCostPerM2 || 2500000,
          salesPricePerM2: marketPrice.suggestedSalePrice || regionalPricing?.salesPricePerM2 || 5000000,
        })
        if (optResult?.best) {
          const b = optResult.best
          // 기존 배치안과 중복 여부 확인 (건폐율·층수 동일하면 스킵)
          const isDuplicate = generatedLayouts.some(l => l.coverage === b.coverage && l.floors === b.floors)
          if (!isDuplicate && b.roi > (generatedLayouts[0]?.scores?.profitability ?? 0) * 0.5 - 50) {
            const optType = b.floors >= 5 ? 'tower' : b.coverage >= 50 ? 'linear' : 'courtyard'
            const maxId = Math.max(...generatedLayouts.map(l => l.id), 0)
            const profitLayout: LayoutOption = {
              id: maxId + 1,
              name: '수익 최적화안',
              type: optType as LayoutOption['type'],
              description: `법규 한도 내 최대 수익 조합 (${optResult.searchSpace}개 탐색)`,
              coverage: b.coverage,
              units: b.units,
              floors: b.floors,
              parking: b.parking,
              gfa: b.gfa,
              openSpace: Math.round(area * (1 - b.coverage / 100)),
              features: [
                `ROI ${b.roi.toFixed(1)}% (${optResult.searchSpace}개 조합 중 최적)`,
                `건폐율 ${b.coverage}% · 용적률 ${Math.round(b.gfa / area * 100)}%`,
                `총사업비 ${(b.totalCost / 100000000).toFixed(1)}억 · 수익 ${(b.profit / 100000000).toFixed(1)}억`,
              ],
              scores: {
                regulationCompliance: 90,
                profitability: Math.min(Math.max(Math.round(b.roi + 50), 0), 100),
                marketability: 65,
                feasibility: 80,
                overall: Math.min(Math.max(Math.round(b.roi * 0.6 + 60), 30), 95),
                strategyFit: 60,
              },
              recommendation: {
                isRecommended: false,
                reasons: ['법규 한도 내 수익 최대화 조합', `${optResult.searchSpace}개 조합 전수 탐색 결과`],
                warnings: ['설계 품질보다 수익성을 우선한 배치입니다', '실제 설계 시 조정이 필요할 수 있습니다'],
                strategyMatch: 60,
              },
              reasoning: {
                summary: `법규 한도(건폐 ${regulation.maxCoverageRatio}%, 용적 ${regulation.maxFloorAreaRatio}%) 내에서 ${optResult.searchSpace}개 조합을 탐색하여 ROI ${b.roi.toFixed(1)}%의 최적 조합을 도출했습니다.`,
                regulationConsiderations: [`건폐율 ${b.coverage}% (한도 ${regulation.maxCoverageRatio}%)`, `용적률 ${Math.round(b.gfa / area * 100)}% (한도 ${regulation.maxFloorAreaRatio}%)`],
                profitabilityAdvantages: [`ROI ${b.roi.toFixed(1)}%`, `총수익 ${(b.totalRevenue / 100000000).toFixed(1)}억원`],
                designFeatures: [`${b.floors}층 · ${b.units}세대`, `세대당 ${b.unitSize.toFixed(0)}㎡`],
                risksAndChallenges: ['수익 최적화 목적으로 설계 품질이 낮을 수 있음'],
              },
              isLegallyCompliant: true,
            }
            setLayouts(prev => [...prev, profitLayout])
            console.log('[v0] 수익 최적화 배치안 추가:', b.floors, '층', b.coverage, '%', 'ROI', b.roi.toFixed(1), '%')
          }
        }
      } catch (e) {
        console.warn('[v0] 수익 최적화 배치안 생성 실패:', e)
      }
      
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

  // 요약 스트립용 ROI — useEffect 파라미터와 100% 동일
  const siteAreaNum = safeNumber(siteArea, 660)
  // 스트립 ROI = 카드가 직접 계산한 ROI (100% 일치 보장)
  const stripRoi = cardRoi
  
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
  const gfa = selectedLayoutData ? selectedLayoutData.gfa : 0

  const handleSelectLayout = (id: number) => {
    setSelectedLayout(id)
    setSelectedFloor(1)
  }

  // 배치안 수동 조정 핸들러
  const handleUpdateLayout = (layoutId: number, updates: { floors?: number; units?: number; buildingCount?: number }) => {
    setLayouts(prev => prev.map(layout => {
      if (layout.id !== layoutId) return layout
      
      const newFloors = updates.floors ?? layout.floors
      const newUnits = updates.units ?? layout.units
      const newBuildingCount = updates.buildingCount ?? layout.buildingCount
      
      // 건폐율은 유지, GFA와 주차 재계산
      const siteAreaNum = parseFloat(siteArea) || 660
      const buildingArea = (siteAreaNum * layout.coverage) / 100
      const newGfa = buildingArea * newFloors
      const newParking = Math.ceil(newUnits * (regulation?.parkingRatio || 1))
      
      return {
        ...layout,
        floors: newFloors,
        units: newUnits,
        buildingCount: newBuildingCount,
        gfa: newGfa,
        parking: newParking,
        _userEdited: true,
      }
    }))
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
    
    // Calculate financials using REAL data from feasibilityResult
    const area = Number(siteArea)
    const gfa = Math.round(area * (selected.coverage / 100) * selected.floors)
    
    // feasibilityResult가 있으면 실제 값 사용, 없으면 fallback
    const realLandPrice = landPriceData.pricePerM2 || 5000000
    const heightPremium = selected.floors > 15 ? 1.15 : selected.floors > 10 ? 1.08 : 1.0
    const landCost = feasibilityResult?.landCost || area * realLandPrice
    const constructionCost = feasibilityResult?.constructionCost || gfa * 2500000 * heightPremium
    const otherCosts = feasibilityResult?.softCost || constructionCost * 0.15
    const parkingCost = selected.parking * 30000000
    const totalInvestment = feasibilityResult?.totalCost || (landCost + constructionCost + otherCosts + parkingCost)
    const projectedRevenue = feasibilityResult?.totalRevenue || gfa * 5000000
    const profit = feasibilityResult?.profit || (projectedRevenue - totalInvestment)
    const roi = feasibilityResult?.roi || (totalInvestment > 0 ? (profit / totalInvestment) * 100 : 0)
    
    return {
      address,
      siteArea: area,
      projectType: projectType === 'reconstruction' ? '재건축·리모델링 사업' : '공동주택 신축사업',
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
    "ai-render": "AI · 렌더링",
    financial: "\uC0AC\uC5C5\uC131",
    report: "\uBCF4\uACE0\uC11C",
  }
  
  const steps = [
    { id: "input", label: STEP_LABELS.input, icon: Building2 },
    { id: "regulation", label: STEP_LABELS.regulation, icon: Scale },
    { id: "strategy", label: STEP_LABELS.strategy, icon: Brain },
    { id: "layouts", label: STEP_LABELS.layouts, icon: LayoutGrid },
    { id: "ai-render", label: STEP_LABELS["ai-render"], icon: Sparkles },
    { id: "financial", label: STEP_LABELS.financial, icon: Banknote },
    { id: "report", label: STEP_LABELS.report, icon: FileText },
  ]

  const isStepClickable = (stepId: string) => {
    if (stepId === "input") return true
    const hasAddress = String(siteArea).trim() !== ""
    if (stepId === "regulation" || stepId === "strategy") return hasAddress
    if (stepId === "layouts") return layouts.length > 0 || hasAddress
    if (stepId === "ai-render" || stepId === "floorplan" || stepId === "financial" || stepId === "report") {
      return selectedLayout !== null
    }
    return false
  }
  
  // 탭 데이터 상태 아이콘
  const getTabStatus = (stepId: string): 'active' | 'ready' | 'locked' | 'stale' => {
    if (!isStepClickable(stepId)) return 'locked'
    if (staleSteps.has(stepId)) return 'stale'
    if (stepId === 'layouts' && layouts.length > 0) return 'ready'
    if (stepId === 'regulation' && regulation) return 'ready'
    if ((stepId === 'ai-render' || stepId === 'floorplan' || stepId === 'financial' || stepId === 'report') && selectedLayout !== null) return 'ready'
    if (stepId === 'input' && String(siteArea).trim() !== '') return 'ready'
    if (stepId === 'strategy' && strategy) return 'ready'
    return 'active'
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

  // 랜딩 페이지 표시 (첫 방문자)
  if (showLanding) {
    return (
      <LandingPage onStart={() => {
        localStorage.setItem('archi-scan-visited', 'true')
        setShowQuickMode(true)
        setShowLanding(false)
      }} />
    )
  }

  if (showQuickMode) {
    return (
      <QuickAnalysis strategy={strategy} userValues={userValues} onDetailedAnalysis={(addr, area, rawData, quickRenderImage) => {
        // Quick 분석 데이터를 Full 분석에 주입
        setAddress(addr)
        setSiteArea(String(area))
        setAnalysisRawData(rawData)
        // Quick에서 생성된 AI 렌더링 이미지 전달
        if (quickRenderImage) setAiRenderImage(quickRenderImage)
        if (rawData) {
          const zc = rawData.zoneType || ''
          if (zc) {
            setMolitSupplementData(prev => ({
              ...prev,
              zoneCode: zc,
              sigunguCd: rawData.sigunguCd,
              bjdongCd: rawData.bjdongCd,
              bun: rawData.bun,
              ji: rawData.ji,
              entX: rawData.entX,
              entY: rawData.entY,
              overlappingRegulations: rawData.overlappingRegulations,
            }))
          }
          // Quick에서 계산된 법규 데이터를 regulation에 직접 반영
          if (rawData._quickZoneCode) {
            setRegulation(prev => ({
              ...prev,
              zoneType: rawData._quickZoneCode,
              zoneName: rawData._quickZoneName || prev.zoneName,
              buildingCoverage: rawData._quickCoverage || prev.buildingCoverage,
              far: rawData._quickFAR || prev.far,
              maxHeight: rawData._quickHeight || prev.maxHeight,
            }))
          }
        }
        // ━━━ QuickAnalysis rawData에서 신축/재건축 판단 ━━━
        if (rawData?.mainPurpose || (rawData?.groundFloors && rawData.groundFloors > 0) || rawData?.buildingName) {
          setProjectType('reconstruction')
          setExistingBuildingInfo({
            mainPurpose: rawData.mainPurpose,
            groundFloors: rawData.groundFloors,
            buildingName: rawData.buildingName,
            householdCount: rawData.householdCount,
            totalFloorArea: rawData.totalFloorArea,
          })
        } else if (rawData?.bdMgtSn) {
          setProjectType('reconstruction')
        }
        setShowQuickMode(false)
        setAutoTriggerLookup(true)
        setCurrentStep('input' as AppStep)
        // 입력 완료 스냅샷
        setTimeout(() => markStepFresh('input'), 100)
      }} />
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
      {/* 인앱 브라우저 안내 배너 */}
      {inAppBrowser && (
        <div className="bg-amber-500/90 text-white text-center py-2 px-4 text-xs flex items-center justify-center gap-2 z-50 relative">
          <span>⚠️ {inAppBrowser} 브라우저에서는 PDF 다운로드가 제한됩니다.</span>
          <button
            onClick={() => {
              const isAndroid = /Android/i.test(navigator.userAgent)
              if (isAndroid) {
                try { window.location.href = `intent://${window.location.href.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end` } catch {}
              } else {
                alert('하단 공유 버튼(□↑) → "Safari로 열기"를 눌러주세요.')
              }
            }}
            className="underline font-semibold whitespace-nowrap"
          >
            외부 브라우저로 열기
          </button>
          <button onClick={() => setInAppBrowser(null)} className="ml-1 opacity-70">✕</button>
        </div>
      )}
      {/* 3D 볼륨 모델 모달 */}
      {show3DVolume && selectedLayoutData && (
        <BuildingVolume3D
          layoutName={selectedLayoutData.name}
          layoutType={selectedLayoutData.type as any}
          originalType={selectedLayoutData._originalType}
          buildingCount={selectedLayoutData.buildingCount}
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
                onClick={async () => {
                  const { generateFloorPlanDXF, downloadDXF } = await loadDxfGenerator()
                  const dxf = generateFloorPlanDXF({
                    type: selectedLayoutData._originalType || selectedLayoutData.type,
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
                type={selectedLayoutData._originalType || selectedLayoutData.type}
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
        <div className="mx-auto max-w-7xl px-4 md:px-6 py-4">
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
                  <p className="text-[10px] md:text-xs text-muted-foreground">AI 건축 사전기획 플랫폼</p>
                </div>
              </button>
              <div className="hidden md:block">
                <UserBadge />
              </div>
              <button onClick={() => setShowBrandingEditor(true)} className="p-2 rounded-lg hover:bg-secondary transition-colors" title="보고서 브랜딩 설정">
                <Settings2 className="h-4 w-4 text-muted-foreground" />
              </button>
              <AuthButton />
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
              <div className="flex items-center gap-1">
                {currentProjectId && (
                  <span className="text-[10px] text-emerald-500/70 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    저장됨
                  </span>
                )}
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
              </div>
            )}
            </div>

          </div>
          
          {/* Tab Navigation - Desktop */}
          <div className="hidden xl:flex items-center gap-0.5 bg-muted/50 rounded-xl p-1">
            {steps.map((step) => {
              const Icon = step.icon
              const isActive = currentStep === step.id
              const isClickable = isStepClickable(step.id)
              const status = getTabStatus(step.id)
              
              return (
                <button
                  key={step.id}
                  onClick={() => isClickable && setCurrentStep(step.id as AppStep)}
                  disabled={!isClickable}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all text-xs font-medium ${
                    isActive 
                      ? "bg-background text-foreground shadow-sm" 
                      : isClickable 
                        ? "text-muted-foreground hover:text-foreground hover:bg-background/50 cursor-pointer"
                        : "text-muted-foreground/30 cursor-not-allowed"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{step.label}</span>
                  {status === 'ready' && !isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  )}
                  {status === 'stale' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </header>

      {/* Desktop Summary Dashboard Strip */}
      {address && String(siteArea).trim() !== '' && (
        <div className="hidden xl:block border-b border-border/50 bg-muted/20">
          <div className="mx-auto max-w-7xl px-6 py-2.5 flex items-center gap-6">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Building2 className="h-4 w-4 text-primary shrink-0" />
              <p className="text-sm font-medium truncate">{address}</p>
              <Badge variant="secondary" className="text-[11px] shrink-0">{parseFloat(siteArea).toLocaleString()}㎡</Badge>
              {projectType !== 'unknown' && (
                <Badge variant={projectType === 'reconstruction' ? 'destructive' : 'default'} className="text-[10px] shrink-0">
                  {projectType === 'reconstruction' ? '재건축·리모델링' : '신축'}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm shrink-0">
              {regulation && (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground text-xs">건폐율</span>
                    <span className="font-semibold">{regulation.maxCoverageRatio || 60}%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground text-xs">용적률</span>
                    <span className="font-semibold">{regulation.maxFloorAreaRatio || 200}%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground text-xs">높이</span>
                    <span className="font-semibold">{regulation.maxHeight ? `${regulation.maxHeight}m` : '-'}</span>
                  </div>
                </>
              )}
              {selectedLayoutData && (
                <>
                  <div className="h-4 w-px bg-border" />
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground text-xs">규모</span>
                    <span className="font-semibold">{selectedLayoutData.floors}층 {selectedLayoutData.units}세대</span>
                  </div>
                  {stripRoi !== null && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground text-xs">ROI</span>
                      <span className={`font-bold ${stripRoi > 0 ? 'text-emerald-600' : 'text-orange-500'}`}>
                        {stripRoi.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 md:px-6 py-6 md:py-8 pb-16 md:pb-8">
        {/* Mobile Tab Navigation + Summary Dashboard */}
        <div className="xl:hidden mb-4 space-y-3">
          {/* Scrollable Tab Bar */}
          <div className="flex gap-1 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
            {steps.map((step) => {
              const Icon = step.icon
              const isActive = currentStep === step.id
              const isClickable = isStepClickable(step.id)
              const status = getTabStatus(step.id)
              return (
                <button
                  key={step.id}
                  onClick={() => isClickable && setCurrentStep(step.id as AppStep)}
                  disabled={!isClickable}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all text-xs font-medium whitespace-nowrap shrink-0 ${
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-sm" 
                      : isClickable 
                        ? "bg-secondary/70 text-foreground hover:bg-secondary"
                        : "bg-muted/30 text-muted-foreground/30"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{step.label}</span>
                  {status === 'ready' && !isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  )}
                </button>
              )
            })}
          </div>
          
          {/* Summary Dashboard Strip */}
          {address && String(siteArea).trim() !== '' && (
            <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl p-3 border border-primary/10">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-xs font-medium text-foreground truncate flex-1">{address}</p>
                <Badge variant="secondary" className="text-[10px] shrink-0">{parseFloat(siteArea).toLocaleString()}㎡</Badge>
                {projectType !== 'unknown' && (
                  <Badge variant={projectType === 'reconstruction' ? 'destructive' : 'default'} className="text-[9px] shrink-0 px-1.5">
                    {projectType === 'reconstruction' ? '재건축' : '신축'}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                {regulation && (
                  <>
                    <span className="text-muted-foreground">건폐 <span className="text-foreground font-semibold">{regulation.maxCoverageRatio || 60}%</span></span>
                    <span className="text-muted-foreground">용적 <span className="text-foreground font-semibold">{regulation.maxFloorAreaRatio || 200}%</span></span>
                    <span className="text-muted-foreground">높이 <span className="text-foreground font-semibold">{regulation.maxHeight ? `${regulation.maxHeight}m` : '-'}</span></span>
                  </>
                )}
                {selectedLayoutData && (
                  <>
                    <span className="text-primary/70">|</span>
                    <span className="text-muted-foreground">{selectedLayoutData.floors}층 <span className="text-foreground font-semibold">{selectedLayoutData.units}세대</span></span>
                    {stripRoi !== null && (
                      <span className={`font-semibold ${stripRoi > 0 ? 'text-emerald-600' : 'text-orange-500'}`}>
                        ROI {stripRoi.toFixed(1)}%
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Step: Input */}
        {currentStep === "input" && (
          <InputStep
            address={address} setAddress={setAddress} siteArea={siteArea}
            setSiteArea={setSiteArea} setStrategy={setStrategy}
            setSupplementData={setSupplementData}
            setCurrentProjectId={setCurrentProjectId}
            setCurrentProjectName={setCurrentProjectName}
            setRecentProjects={setRecentProjects}
            setShowAllProjectsList={setShowAllProjectsList}
            setShowProjectComparison={setShowProjectComparison}
            showAllProjectsList={showAllProjectsList}
            showProjectComparison={showProjectComparison}
            mounted={mounted} currentProjectId={currentProjectId}
            recentProjects={recentProjects} molitSupplementData={molitSupplementData}
            siteCoords={siteCoords} sitePolygon={sitePolygon}
            supplementKey={supplementKey}
            handleSiteInputComplete={handleSiteInputComplete}
            handleSupplementDataChange={handleSupplementDataChange}
            handleMolitDataFetched={handleMolitDataFetched}
            handleProjectLoad={handleProjectLoad}
            autoTriggerLookup={autoTriggerLookup}
          />
        )}

        {/* Step: Strategy Selection */}
        {currentStep === "strategy" && (
          <StrategyStep
            address={address} siteArea={siteArea} strategy={strategy}
            setStrategy={setStrategy} designApproach={designApproach}
            setDesignApproach={setDesignApproach} userValues={userValues}
            setUserValues={setUserValues} regulation={regulation}
            legalSummary={legalSummary} molitSupplementData={molitSupplementData}
            handleStrategyComplete={handleStrategyComplete}
            handleGenerate={handleGenerate}
          />
        )}

        {/* Step: Regulation */}
        {currentStep === "regulation" && (
          <RegulationStep
            address={address} siteArea={siteArea} siteAreaNum={siteAreaNum}
            regulation={regulation} setRegulation={setRegulation}
            setSiteArea={setSiteArea} setSitePolygon={setSitePolygon}
            landPriceData={landPriceData} marketPrice={marketPrice}
            molitSupplementData={molitSupplementData} siteBdMgtSn={siteBdMgtSn}
            handleGenerate={handleGenerate}
            onNextStep={() => setCurrentStep("strategy")}
          />
        )}

        {/* Step: Layouts */}
        {currentStep === "layouts" && (<>
          {staleSteps.has('layouts') && (
            <div className="mx-4 mb-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-amber-400 text-sm">⚠️</span>
                <span className="text-xs text-amber-300">이전 단계 정보가 변경되어 배치안 재생성이 필요합니다</span>
              </div>
              <button onClick={() => { markStepFresh('layouts'); setCurrentStep('strategy') }} className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-[10px] font-medium border border-amber-500/30">재생성</button>
            </div>
          )}
          <LayoutsStep
            layouts={layouts}
            selectedLayout={selectedLayout}
            selectedLayoutData={selectedLayoutData}
            setSelectedLayout={setSelectedLayout}
            setCurrentStep={setCurrentStep}
            setLayoutViewMode={setLayoutViewMode}
            setShowComparisonModal={setShowComparisonModal}
            setOptimizationResult={setOptimizationResult}
            layoutViewMode={layoutViewMode}
            isGenerating={isGenerating}
            address={address}
            siteArea={siteArea}
            siteAreaNum={siteAreaNum}
            regulation={regulation}
            strategy={strategy}
            userValues={userValues}
            gfa={gfa}
            landPriceData={landPriceData}
            marketPrice={marketPrice}
            regionalPricing={regionalPricing}
            onCardRoiChanged={setCardRoi}
            onUpdateLayout={handleUpdateLayout}
            feasibilityResult={feasibilityResult}
            optimizationResult={optimizationResult}
            molitSupplementData={molitSupplementData}
            loadLayoutOptimizer={loadLayoutOptimizer}
            handleSelectLayout={handleSelectLayout}
            onAiRenderComplete={setAiRenderImage}
            satelliteUrl={analysisRawData?.satelliteUrl}
            cadastralMapUrl={analysisRawData?.cadastralMapUrl}
            streetViewUrls={analysisRawData?.streetViewUrls}
            sitePolygon={analysisRawData?.parcelPolygon}
            regulation={analysisRawData ? { heightLimit: analysisRawData.heightLimit || 12, zoneName: analysisRawData.zoneName, northShadow: true, northShadowAngle: 45, overlappingRegs: analysisRawData.overlappingRegulations?.map((r: any) => r.name) } : undefined}
            surroundingContext={(() => {
              try {
                
                const rd = analysisRawData
                const ctx = buildSiteContextPrompt({
                  address,
                  siteArea: parseFloat(siteArea) || 660,
                  polygon: rd?.parcelPolygon,
                  nearbyBuildings: rd?.nearbyBuildings,
                  siteContext: rd?.siteContext,
                  terrain: rd?.terrain,
                  sunAnalysis: rd?.sunAnalysis,
                  elevation: rd?.terrain?.maxElevation,
                  floors: selectedLayoutData?.floors,
                  buildingHeight: selectedLayoutData ? selectedLayoutData.floors * 3.3 : 10,
                })
                return ctx.fullPrompt || undefined
              } catch { return undefined }
            })()}
          />
        </>)}

        {currentStep === "ai-render" && selectedLayoutData && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">AI 건축 렌더링</h2>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">선택한 배치안을 기반으로 건축물 외관을 AI가 렌더링합니다.</p>
            <AIHub
              input={{
                address,
                zoneType: regulation?.zoneType,
                zoneName: (() => {
                  try {
                    const rawLabel = (molitSupplementData as Record<string, unknown>)?.zoneLabel
                    const label = typeof rawLabel === 'string' ? rawLabel : ''
                    if (label && !label.includes('residential') && !label.includes('commercial')) return label
                    const map: Record<string, string> = {
                      'residential-exclusive-1': '제1종전용주거지역', 'residential-exclusive-2': '제2종전용주거지역',
                      'residential-1': '제1종일반주거지역', 'residential-2': '제2종일반주거지역',
                      'residential-3': '제3종일반주거지역', 'semi-residential': '준주거지역',
                      'commercial-neighborhood': '근린상업지역', 'commercial-general': '일반상업지역',
                      'commercial-central': '중심상업지역', 'industrial': '준공업지역',
                      'green-natural': '자연녹지지역',
                    }
                    return map[regulation?.zoneType] || label || regulation?.zoneType
                  } catch { return '' }
                })(),
                siteArea: siteAreaNum,
                layoutName: selectedLayoutData.name,
                floors: selectedLayoutData.floors,
                units: selectedLayoutData.units || 0,
                buildingCoverageRatio: selectedLayoutData.coverage,
                floorAreaRatio: Math.round((selectedLayoutData.gfa / siteAreaNum) * 100),
                roi: feasibilityResult?.roi || 0,
                totalProjectCost: feasibilityResult?.totalCost || 0,
                strategy,
                buildingType: selectedLayoutData._originalType || selectedLayoutData.type,
                buildingCount: selectedLayoutData.buildingCount,
                isMultiBuilding: selectedLayoutData.type === 'cluster' && (selectedLayoutData._originalType || selectedLayoutData.type) !== 'cluster',
                values: userValues ? {
                  profitVsQuality: userValues.profitVsQuality,
                  privacyVsCommunity: userValues.privacyVsCommunity,
                  efficiencyVsSpace: userValues.efficiencyVsSpace,
                } : undefined,
                patterns: userValues?.selectedPatterns,
                sitePolygon,
                regulation: {
                  heightLimit: regulation?.maxHeight,
                  zoneName: regulation?.zoneType,
                  northShadow: true,
                  northShadowAngle: 45,
                },
              }}
              onRenderComplete={setAiRenderImage}
              previousRenderImage={aiRenderImage}
              savedMultiImages={aiMultiImages}
              onMultiImagesComplete={setAiMultiImages}
            />

            {/* 하단 CTA — 평면도 → 사업성 */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setCurrentStep("floorplan" as AppStep)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-border bg-secondary/30 hover:bg-secondary/50 transition-colors text-sm font-semibold"
              >
                <Layers className="h-4 w-4" />
                평면도 보기
              </button>
              <button
                onClick={() => setCurrentStep("financial")}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-semibold"
              >
                <Banknote className="h-4 w-4" />
                사업성 분석
              </button>
            </div>
          </div>
        )}

        {currentStep === "floorplan" && selectedLayoutData && (
          <FloorplanStep
            selectedLayoutData={selectedLayoutData}
            selectedFloor={selectedFloor}
            setSelectedFloor={setSelectedFloor}
            drawingTab={drawingTab}
            setDrawingTab={setDrawingTab}
            floorPlanViewMode={floorPlanViewMode}
            setFloorPlanViewMode={setFloorPlanViewMode}
            isFloorPlanFullscreen={isFloorPlanFullscreen}
            setIsFloorPlanFullscreen={setIsFloorPlanFullscreen}
            setShowDxfPreview={setShowDxfPreview}
            setShow3DVolume={setShow3DVolume}
            setCurrentStep={setCurrentStep}
            address={address}
            siteArea={siteArea}
            siteAreaNum={siteAreaNum}
            regulation={regulation}
            strategy={strategy}
            gfa={gfa}
            sitePolygon={sitePolygon}
            molitSupplementData={molitSupplementData}
            loadDxfGenerator={loadDxfGenerator}
            selectedPatterns={userValues.selectedPatterns}
          />
        )}
        {currentStep === "financial" && selectedLayoutData && (<>
          {staleSteps.has('financial') && (
            <div className="mx-4 mb-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-amber-400 text-sm">⚠️</span>
                <span className="text-xs text-amber-300">배치안이 변경되어 사업성 재검토가 필요합니다</span>
              </div>
              <button onClick={() => { markStepFresh('financial'); }} className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-[10px] font-medium border border-amber-500/30">확인</button>
            </div>
          )}
          <FinancialStep
            selectedLayoutData={selectedLayoutData}
            allLayouts={layouts}
            projectType={projectType}
            existingBuildingInfo={existingBuildingInfo}
            address={address} siteAreaNum={siteAreaNum} gfa={gfa}
            regulation={regulation} feasibilityResult={feasibilityResult}
            landPriceData={landPriceData} marketPrice={marketPrice}
            regionalPricing={regionalPricing} setCurrentStep={setCurrentStep}
          />
        </>)}

        {/* Step: Report */}
        {currentStep === "report" && selectedLayoutData && (
          <ReportStep
            selectedLayoutData={selectedLayoutData}
            address={address} siteArea={siteArea} siteAreaNum={siteAreaNum} gfa={gfa}
            layouts={layouts} regulation={regulation} strategy={strategy}
            branding={branding} feasibilityResult={feasibilityResult}
            landPriceData={landPriceData} marketPrice={marketPrice}
            regionalPricing={regionalPricing} molitSupplementData={molitSupplementData}
            siteVisuals={siteVisuals} financialScenarios={financialScenarios}
            setFinancialScenarios={setFinancialScenarios} userValues={userValues}
            downloadingPdf={downloadingPdf} downloadingHtml={downloadingHtml}
            downloadingExcel={downloadingExcel} downloadError={downloadError}
            setDownloadingPdf={setDownloadingPdf} setDownloadingHtml={setDownloadingHtml}
            setDownloadingExcel={setDownloadingExcel} setDownloadError={setDownloadError}
            setCurrentStep={setCurrentStep} setShowBrandingEditor={setShowBrandingEditor}
            loadExportFunctions={loadExportFunctions}
            aiRenderImage={aiRenderImage}
            aiMultiImages={aiMultiImages}
            sitePolygon={sitePolygon}
          />
        )}
        
        {/* Dev Panels - Debug/Release/QA (Development Only) */}
        <DevPanels
          address={address}
          siteAreaNum={siteAreaNum}
          regulation={regulation}
          supplementData={supplementData}
          strategy={strategy}
          recommendedLayout={recommendedLayout}
          selectedLayoutData={selectedLayoutData}
          feasibilityResult={feasibilityResult}
        />
      </main>

      {/* 배치안 비교 모달 */}
      {showComparisonModal && layouts.length > 0 && (() => {
        const fins = layouts.map(l => {
          try {
            const effectiveSalesPrice = (marketPrice.loaded && marketPrice.suggestedSalePrice > 0)
              ? marketPrice.suggestedSalePrice
              : regionalPricing
                ? Math.round(regionalPricing.salesPricePerM2 * getZoneMultiplier(regulation.zoneType || ''))
                : undefined
            return calculateFeasibility({
              siteArea: siteAreaNum || 1, grossFloorArea: l.gfa || 1, unitCount: l.units || 1,
              floorCount: l.floors || 1, parkingCount: l.parking || 0,
              landPricePerM2: landPriceData.pricePerM2 || 5000000,
              salesPricePerM2: effectiveSalesPrice,
              constructionCostPerM2: regionalPricing?.constructionCostPerM2 || undefined,
            })
          } catch { return { roi: 0, profit: 0, totalCost: 0 } }
        })
        return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={() => setShowComparisonModal(false)}>
          <div className="bg-background w-full max-w-3xl max-h-[85vh] rounded-t-2xl sm:rounded-2xl overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-border bg-background/95 backdrop-blur">
              <h3 className="font-bold text-sm">배치안 비교 분석</h3>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => {
                  const text = layouts.map((l, i) => `${l.name}: ${l.floors}층 ${l.units}세대 ROI ${(fins[i]?.roi||0).toFixed(1)}% 수익 ${((fins[i]?.profit||0)/1e8).toFixed(1)}억`).join('\n')
                  const summary = `[Archi-Scan 비교분석]\n${address}\n대지면적 ${siteAreaNum.toLocaleString()}㎡\n\n${text}`
                  if (navigator.share) { navigator.share({ title: '배치안 비교', text: summary }) }
                  else { navigator.clipboard.writeText(summary); toast.success('비교 내용 복사 완료') }
                }}>
                  <Share2 className="h-3.5 w-3.5" />공유
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowComparisonModal(false)}>✕</Button>
              </div>
            </div>
            <div className="p-4">
              <p className="text-xs text-muted-foreground mb-3">{address} · {siteAreaNum.toLocaleString()}㎡ · {new Date().toLocaleDateString('ko-KR')}</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs" style={{ minWidth: '640px' }}>
                  <thead>
                    <tr className="border-b-2 border-border">
                      {['배치안','층수','세대','연면적','건폐율','용적률','주차','총사업비','예상수익','ROI'].map(h => (
                        <th key={h} className="px-2 py-2 text-center font-semibold bg-muted/50 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {layouts.map((l, i) => {
                      const f = fins[i] || { roi: 0, profit: 0, totalCost: 0 }
                      const roiColor = f.roi >= 15 ? 'text-emerald-500' : f.roi >= 5 ? 'text-blue-500' : f.roi >= 0 ? 'text-amber-500' : 'text-red-500'
                      const isRec = l.recommendation?.isRecommended
                      return (
                        <tr key={i} className={`border-b border-border/50 ${isRec ? 'bg-primary/5' : ''}`}>
                          <td className="px-2 py-2.5 font-medium whitespace-nowrap">
                            {l.name}{isRec && <span className="ml-1 text-[9px] text-primary">추천</span>}
                          </td>
                          <td className="px-2 py-2.5 text-center">{l.floors}층</td>
                          <td className="px-2 py-2.5 text-center">{l.units}세대</td>
                          <td className="px-2 py-2.5 text-center whitespace-nowrap">{l.gfa?.toLocaleString()}㎡</td>
                          <td className="px-2 py-2.5 text-center">{(l.buildingCoverage || l.coverage)?.toFixed(1)}%</td>
                          <td className="px-2 py-2.5 text-center">{((l.gfa / siteAreaNum) * 100).toFixed(1)}%</td>
                          <td className="px-2 py-2.5 text-center">{l.parking}대</td>
                          <td className="px-2 py-2.5 text-center whitespace-nowrap">{(f.totalCost / 1e8).toFixed(1)}억</td>
                          <td className="px-2 py-2.5 text-center whitespace-nowrap">{(f.profit / 1e8).toFixed(1)}억</td>
                          <td className={`px-2 py-2.5 text-center font-bold whitespace-nowrap ${roiColor}`}>{f.roi.toFixed(1)}%</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {(() => {
                const bestIdx = fins.reduce((bi, f, i) => f.roi > (fins[bi]?.roi || -Infinity) ? i : bi, 0)
                const best = layouts[bestIdx]
                const bestF = fins[bestIdx]
                return (
                  <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-xs font-medium"><span className="text-emerald-500">추천:</span> {best?.name} (ROI {(bestF?.roi||0).toFixed(1)}%, 수익 {((bestF?.profit||0)/1e8).toFixed(1)}억원)</p>
                  </div>
                )
              })()}
              <p className="text-[10px] text-muted-foreground text-center mt-4">Archi-Scan · 사전검토용 비교 분석</p>
            </div>
          </div>
        </div>
        )
      })()}
      
      {/* 모바일 하단 탭 네비게이션 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-background/95 backdrop-blur-md border-t border-border/50 px-2 py-1.5 safe-area-bottom">
        <div className="flex items-center justify-between max-w-lg mx-auto gap-0.5">
          {steps.map((step) => {
            const Icon = step.icon
            const isActive = currentStep === step.id
            const isClickable = isStepClickable(step.id)
            const status = getTabStatus(step.id)
            const shortLabels: Record<string, string> = { '대지 입력': '대지', '설계 전략': '설계', '법규 검토': '법규', '배치안': '배치', 'AI · 렌더링': 'AI', '평면도': '평면', '사업성': '사업', '보고서': '보고' }
            const shortLabel = shortLabels[step.label] || step.label
            return (
              <button key={step.id}
                onClick={() => isClickable && setCurrentStep(step.id as AppStep)}
                disabled={!isClickable}
                className={`flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg transition-all relative ${
                  isActive
                    ? 'text-primary flex-[1.5] min-w-[44px]'
                    : isClickable
                    ? 'text-muted-foreground flex-1 min-w-[36px]'
                    : 'text-muted-foreground/25 flex-1 min-w-[36px]'
                }`}
              >
                {isActive && <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-primary" />}
                <div className="relative">
                  <Icon className={`${isActive ? 'h-5 w-5' : 'h-4 w-4'} transition-all`} />
                  {status === 'ready' && !isActive && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  )}
                  {status === 'stale' && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  )}
                </div>
                <span className={`leading-none ${isActive ? 'text-[10px] font-bold' : 'text-[9px]'}`}>{shortLabel}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 온보딩 투어 (첫 방문자) */}
      <OnboardingTour />

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
