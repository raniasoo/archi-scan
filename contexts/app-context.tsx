"use client"

import { createContext, useContext, type Dispatch, type SetStateAction } from "react"
import type { LayoutOption } from "@/app/page"
import type { ZoningRegulation } from "@/lib/regulation-types"
import type { DesignStrategy } from "@/lib/design-strategy"
import type { LegalSummary, FeasibilityResult } from "@/lib/project-analysis-state"
import type { BrandingConfig } from "@/lib/branding-config"
import type { SiteVisualsConfig } from "@/lib/site-visuals-config"
import type { FinancialScenariosConfig } from "@/lib/financial-scenarios-config"
import type { RegionalPricing } from "@/lib/regional-pricing"
import type { UserValues } from "@/lib/pattern-quality"
import type { User, Project } from "@/lib/database"
import type { ProjectListItem } from "@/lib/project-storage"
import type { ProjectSnapshot } from "@/components/project-manager"
import type { OptimizationReport } from "@/lib/layout-optimizer"

export type AppStep = "input" | "strategy" | "regulation" | "layouts" | "floorplan" | "financial" | "report"

type S<T> = Dispatch<SetStateAction<T>>

export interface AppState {
  // Core
  mounted: boolean
  address: string
  siteArea: string
  siteAreaNum: number
  isGenerating: boolean
  currentStep: AppStep
  isProUser: boolean

  // Layouts
  layouts: LayoutOption[]
  selectedLayout: number | null
  selectedLayoutData: LayoutOption | undefined
  layoutViewMode: "card" | "compare"

  // Regulation & Strategy
  regulation: ZoningRegulation
  strategy: DesignStrategy
  designApproach: 'quantitative' | 'alexander' | 'combined'
  userValues: UserValues
  supplementData: Record<string, unknown>
  molitSupplementData: Record<string, unknown>
  supplementKey: number

  // Computed
  legalSummary: LegalSummary | null
  feasibilityResult: FeasibilityResult | null

  // Map / Site
  sitePolygon: { coords: [number, number][], centroid: [number, number] } | null
  siteCoords: { lng: number, lat: number } | null

  // Floorplan
  selectedFloor: number
  floorPlanViewMode: "fit" | "original"
  isFloorPlanFullscreen: boolean
  drawingTab: "floor" | "site" | "iso" | "section" | "elevation" | "perspective"
  showDxfPreview: boolean
  show3DVolume: boolean

  // Financial
  landPriceData: {
    pricePerM2: number; totalCost: number; source: string
    isDemo: boolean; stdrYear: number; message?: string; loading: boolean
  }
  marketPrice: {
    avgPricePerM2: number; suggestedSalePrice: number
    transactionCount: number; loaded: boolean
    transactions: Array<{ name: string; area: number; pricePerM2: number; dealDate: string }>
  }
  regionalPricing: RegionalPricing | null
  financialScenarios: FinancialScenariosConfig
  siteVisuals: SiteVisualsConfig

  // Branding / UI
  branding: BrandingConfig | null
  showBrandingEditor: boolean
  showComparisonModal: boolean
  showProjectComparison: boolean
  showAllProjectsList: boolean
  showDashboard: boolean
  optimizationResult: OptimizationReport | null
  inAppBrowser: string | null

  // Project
  currentUser: User | null
  currentProject: Project | null
  currentProjectId: string | null
  currentProjectName: string
  recentProjects: ProjectListItem[]
  canEdit: boolean

  // Download states
  downloadingPdf: boolean
  downloadingHtml: boolean
  downloadingExcel: boolean
  downloadError: string | null
}

export interface AppActions {
  setAddress: S<string>
  setSiteArea: S<string>
  setIsGenerating: S<boolean>
  setCurrentStep: S<AppStep>
  setLayouts: S<LayoutOption[]>
  setSelectedLayout: S<number | null>
  setLayoutViewMode: S<"card" | "compare">
  setRegulation: S<ZoningRegulation>
  setStrategy: S<DesignStrategy>
  setDesignApproach: S<'quantitative' | 'alexander' | 'combined'>
  setUserValues: S<UserValues>
  setSupplementData: S<Record<string, unknown>>
  setMolitSupplementData: S<Record<string, unknown>>
  setSupplementKey: S<number>
  setLegalSummary: S<LegalSummary | null>
  setFeasibilityResult: S<FeasibilityResult | null>
  setSitePolygon: S<{ coords: [number, number][], centroid: [number, number] } | null>
  setSiteCoords: S<{ lng: number, lat: number } | null>
  setSelectedFloor: S<number>
  setFloorPlanViewMode: S<"fit" | "original">
  setIsFloorPlanFullscreen: S<boolean>
  setDrawingTab: S<"floor" | "site" | "iso" | "section" | "elevation" | "perspective">
  setShowDxfPreview: S<boolean>
  setShow3DVolume: S<boolean>
  setLandPriceData: S<AppState['landPriceData']>
  setMarketPrice: S<AppState['marketPrice']>
  setRegionalPricing: S<RegionalPricing | null>
  setFinancialScenarios: S<FinancialScenariosConfig>
  setSiteVisuals: S<SiteVisualsConfig>
  setBranding: S<BrandingConfig | null>
  setShowBrandingEditor: S<boolean>
  setShowComparisonModal: S<boolean>
  setShowProjectComparison: S<boolean>
  setShowAllProjectsList: S<boolean>
  setShowDashboard: S<boolean>
  setOptimizationResult: S<OptimizationReport | null>
  setCurrentUser: S<User | null>
  setCurrentProject: S<Project | null>
  setCurrentProjectId: S<string | null>
  setCurrentProjectName: S<string>
  setRecentProjects: S<ProjectListItem[]>
  setCanEdit: S<boolean>
  setDownloadingPdf: S<boolean>
  setDownloadingHtml: S<boolean>
  setDownloadingExcel: S<boolean>
  setDownloadError: S<string | null>

  // Handler functions
  handleSiteInputComplete: () => void
  handleStrategyComplete: () => void
  handleLayoutSelect: (id: number) => void
  handleGoToStep: (step: AppStep) => void
  getCurrentSnapshot: () => ProjectSnapshot | null
  loadExportFunctions: () => Promise<typeof import("@/lib/report-export")>
  loadDxfGenerator: () => Promise<typeof import("@/lib/dxf-generator")>
  loadLayoutOptimizer: () => Promise<typeof import("@/lib/layout-optimizer")>
}

export interface AppContextValue {
  state: AppState
  actions: AppActions
}

export const AppContext = createContext<AppContextValue | null>(null)

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error("useApp must be used within AppContext.Provider")
  return ctx
}
