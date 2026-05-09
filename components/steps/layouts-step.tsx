"use client"

import { useState, useRef, useEffect, type Dispatch, type SetStateAction } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Brain, Table, Sparkles, CheckCircle2, ChevronRight, ChevronDown, Loader2 } from "lucide-react"
import { toast } from "sonner"
import type { LayoutOption } from "@/app/page"
import type { ZoningRegulation } from "@/lib/regulation-types"
import type { DesignStrategy } from "@/lib/design-strategy"
import { LayoutSketch } from "@/components/layout-sketch"
import type { FeasibilityResult, LegalSummary } from "@/lib/project-analysis-state"
import { calculateFeasibility, safeNumber } from "@/lib/project-analysis-state"
import { getZoneMultiplier, type RegionalPricing } from "@/lib/regional-pricing"
import { evaluatePatternQuality, type UserValues } from "@/lib/pattern-quality"
import type { OptimizationReport } from "@/lib/layout-optimizer"

const LoadingBox = () => <div className="flex items-center justify-center p-8 text-muted-foreground"><span className="animate-spin mr-2">⏳</span>로딩 중...</div>
const LayoutCard = dynamic(() => import("@/components/layout-card").then(m => ({ default: m.LayoutCard })))
const LayoutComparison = dynamic(() => import("@/components/layout-comparison").then(m => ({ default: m.LayoutComparison })))
const PatternQualityCard = dynamic(() => import("@/components/pattern-quality-card").then(m => ({ default: m.PatternQualityCard })))
const AIReasoningPanel = dynamic(() => import("@/components/ai-reasoning").then(m => ({ default: m.AIReasoningPanel })))

function displayScore(score: unknown, fallbackText: string = '산정 중'): string {
  if (score === undefined || score === null) return fallbackText
  const num = Number(score)
  return isNaN(num) ? fallbackText : `${num}점`
}

// 배치안별 스토리텔링
function getLayoutStory(layout: LayoutOption, strategy: string): string {
  const type = layout.type || 'tower'
  const stories: Record<string, string> = {
    'tower': `${layout.floors}층 타워형 구조로 조망과 채광을 극대화한 설계입니다.`,
    'courtyard': `중정을 품은 ${layout.units}세대 빌라. 각 세대가 마당을 공유하며 커뮤니티를 형성합니다.`,
    'lshape': `L자형 배치로 남향 채광과 프라이버시를 동시에 확보한 설계입니다.`,
    'linear': `일자형 배치로 모든 세대가 균등한 조건을 갖습니다. 시공 효율이 높습니다.`,
    'cluster': `${layout.units}세대를 여러 동으로 분산 배치. 마을 같은 주거 환경을 만듭니다.`,
  }
  return stories[type] || `${layout.floors}층 ${layout.units}세대 규모의 주거 건물입니다.`
}

// 전략 이름
function getStrategyLabel(s: string): string {
  const map: Record<string, string> = {
    'profitability': '수익성 우선', 'livability': '실거주 최적', 'view-priority': '조망 우선',
    'privacy-priority': '프라이버시 우선', 'area-maximize': '면적 확보', 'parking-efficient': '주차 효율',
  }
  return map[s] || s
}

export interface LayoutsStepProps {
  layouts: LayoutOption[]
  selectedLayout: number | null
  selectedLayoutData: LayoutOption | undefined
  setSelectedLayout: Dispatch<SetStateAction<number | null>>
  setCurrentStep: Dispatch<SetStateAction<any>>
  setLayoutViewMode: Dispatch<SetStateAction<"card" | "compare">>
  setShowComparisonModal: Dispatch<SetStateAction<boolean>>
  setOptimizationResult: Dispatch<SetStateAction<OptimizationReport | null>>
  layoutViewMode: "card" | "compare"
  isGenerating: boolean
  address: string
  siteArea: string
  siteAreaNum: number
  regulation: ZoningRegulation
  strategy: DesignStrategy
  userValues: UserValues
  surroundingContext?: string
  satelliteUrl?: string
  cadastralMapUrl?: string
  streetViewUrls?: string[]
  sitePolygon?: number[][]
  gfa: number
  landPriceData: { pricePerM2: number }
  marketPrice: { loaded: boolean; suggestedSalePrice: number }
  regionalPricing: RegionalPricing | null
  feasibilityResult: FeasibilityResult | null
  optimizationResult: OptimizationReport | null
  molitSupplementData: Record<string, unknown>
  loadLayoutOptimizer: () => Promise<any>
  handleSelectLayout: (id: number) => void
  onAiRenderComplete?: (imageData: string) => void
}

export function LayoutsStep(props: LayoutsStepProps) {
  const {
    layouts, selectedLayout, selectedLayoutData,
    setSelectedLayout, setCurrentStep, setLayoutViewMode, setShowComparisonModal, setOptimizationResult,
    layoutViewMode, isGenerating, address, siteArea, siteAreaNum,
    regulation, strategy, userValues, gfa,
    landPriceData, marketPrice, regionalPricing,
    feasibilityResult, optimizationResult, molitSupplementData, loadLayoutOptimizer,
    handleSelectLayout,
  } = props

  const [showDetails, setShowDetails] = useState(false)
  const [showComparison, setShowComparison] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // 배치안이 있지만 선택되지 않았을 때 자동 선택
  useEffect(() => {
    if (selectedLayout === null && layouts.length > 0) {
      const recommended = layouts.find(l => l.recommendation?.isRecommended)
      handleSelectLayout(recommended?.id ?? layouts[0].id)
    }
  }, [layouts.length, selectedLayout]) // eslint-disable-line react-hooks/exhaustive-deps
  const recommendedLayout = layouts.find(l => l.recommendation?.isRecommended) || layouts[0]

  // 분양가 계산
  const salesPrice = (marketPrice.loaded && marketPrice.suggestedSalePrice > 0)
    ? marketPrice.suggestedSalePrice
    : regionalPricing ? Math.round(regionalPricing.salesPricePerM2 * getZoneMultiplier(regulation?.zoneType || '')) : 5000000
  const constructionCost = regionalPricing?.constructionCostPerM2 || 2500000

  // ROI 전체 마이너스 여부
  const allNegativeROI = layouts.length > 0 && layouts.every(l => {
    const f = calculateFeasibility({
      siteArea: siteAreaNum || 1,
      grossFloorArea: l.gfa || 1,
      unitCount: l.units || 1,
      floorCount: l.floors || 1,
      parkingCount: l.parking || 0,
      landPricePerM2: landPriceData.pricePerM2 || 5000000,
      salesPricePerM2: salesPrice,
      constructionCostPerM2: constructionCost,
    })
    return (f?.roi ?? 0) < 0
  })

  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="relative">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
          <Brain className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <p className="text-lg font-medium mt-6">AI가 최적 배치안을 생성 중입니다...</p>
        <p className="text-sm text-muted-foreground mt-2">법규 검토, 전략 반영, 점수 산정 진행 중</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">

      {/* ━━━ 1. AI 추천 배너 ━━━ */}
      {recommendedLayout && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-sm font-bold">AI 추천</span>
            <span className="text-primary text-sm font-bold">{recommendedLayout.name}</span>
            <Badge variant="outline" className="ml-auto border-primary/50 text-primary text-xs">
              종합 {displayScore(recommendedLayout?.scores?.overall)}
            </Badge>
          </div>
          <div className="flex gap-3">
            <LayoutSketch type={recommendedLayout.type || 'tower'} size={64} className="shrink-0 opacity-70" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              {getLayoutStory(recommendedLayout, strategy)}
            </p>
          </div>
        </div>
      )}

      {/* ━━━ 2. 배치안 카드 (가로 스와이프) ━━━ */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground">← 스와이프하여 배치안 비교 →</p>
          <button onClick={() => setShowComparison(!showComparison)} className="text-[11px] text-primary flex items-center gap-1">
            <Table className="h-3 w-3" /> 비교표
          </button>
        </div>

        <div ref={scrollRef} className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {layouts.map((layout, idx) => {
            const isSelected = selectedLayout === layout.id
            const isRecommended = layout.recommendation?.isRecommended
            const f = calculateFeasibility({
              siteArea: siteAreaNum || 1,
              grossFloorArea: layout.gfa || 1,
              unitCount: layout.units || 1,
              floorCount: layout.floors || 1,
              parkingCount: layout.parking || 0,
              landPricePerM2: landPriceData.pricePerM2 || 5000000,
              salesPricePerM2: salesPrice,
              constructionCostPerM2: constructionCost,
            })
            const roi = f?.roi ?? 0

            return (
              <button
                key={layout.id}
                onClick={() => handleSelectLayout(layout.id)}
                className={`snap-center flex-shrink-0 w-[75vw] max-w-[300px] rounded-xl border-2 p-4 text-left transition-all ${
                  isSelected ? 'border-primary bg-primary/10 ring-2 ring-primary/30' 
                  : 'border-border bg-card hover:border-primary/50'
                }`}
              >
                {/* 상단: 이름 + 추천 뱃지 */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-bold">{layout.name}</span>
                  {isRecommended && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-semibold">AI 추천</span>}
                </div>

                {/* SVG 배치 스케치 */}
                <div className="flex justify-center mb-2 opacity-80">
                  <LayoutSketch type={layout.type || 'tower'} size={72} />
                </div>

                {/* 스토리 한 줄 */}
                <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed line-clamp-2">
                  {getLayoutStory(layout, strategy)}
                </p>

                {/* 핵심 수치 3개 */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="text-center rounded-lg bg-secondary/30 py-1.5">
                    <p className="text-[9px] text-muted-foreground">층수</p>
                    <p className="text-xs font-bold">{layout.floors}층</p>
                  </div>
                  <div className="text-center rounded-lg bg-secondary/30 py-1.5">
                    <p className="text-[9px] text-muted-foreground">세대</p>
                    <p className="text-xs font-bold">{layout.units}세대</p>
                  </div>
                  <div className="text-center rounded-lg bg-secondary/30 py-1.5">
                    <p className="text-[9px] text-muted-foreground">건폐율</p>
                    <p className="text-xs font-bold">{layout.coverage?.toFixed(0)}%</p>
                  </div>
                </div>

                {/* ROI + AI 점수 */}
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    ROI {roi.toFixed(1)}%
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    AI {displayScore(layout.scores?.overall)}
                  </span>
                </div>

                {/* 선택 상태 */}
                {isSelected && (
                  <div className="flex items-center gap-1 mt-2 text-primary text-[11px]">
                    <CheckCircle2 className="h-3.5 w-3.5" /> 선택됨
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ━━━ ROI 마이너스 안내 ━━━ */}
      {allNegativeROI && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
          <p className="text-[11px] text-amber-400 leading-relaxed">
            💡 이 지역은 토지비 대비 분양수익이 낮아 수익형 개발이 어렵습니다. 
            <strong> 실거주·프리미엄 목적</strong>이라면 상품성({displayScore(recommendedLayout?.scores?.marketability)})과 
            법규적합성({displayScore(recommendedLayout?.scores?.legalCompliance)})이 핵심 지표입니다.
          </p>
        </div>
      )}

      {/* ━━━ 3. 선택된 배치안 상세 토글 ━━━ */}
      {selectedLayout && selectedLayoutData && (
        <Button variant="outline" onClick={() => setShowDetails(!showDetails)} className="w-full gap-1">
          <ChevronDown className={`h-4 w-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
          상세 정보 {showDetails ? '접기' : '보기'}
        </Button>
      )}

      {/* ━━━ 비교표 (접기/펼치기) ━━━ */}
      {showComparison && layouts.length > 0 && (
        <LayoutComparison
          layouts={layouts}
          siteArea={siteAreaNum}
          selectedLayout={selectedLayout}
          recommendedLayoutId={recommendedLayout?.id}
          landPricePerM2={landPriceData.pricePerM2 || 5000000}
          salesPricePerM2={
            (marketPrice.loaded && marketPrice.suggestedSalePrice > 0) ? marketPrice.suggestedSalePrice
            : regionalPricing ? Math.round(regionalPricing.salesPricePerM2 * getZoneMultiplier(regulation?.zoneType || '')) : undefined
          }
          constructionCostPerM2={regionalPricing?.constructionCostPerM2 || undefined}
          onSelect={(id) => handleSelectLayout(id)}
        />
      )}

      {/* ━━━ 4. 상세 정보 (접기/펼치기) ━━━ */}
      {showDetails && selectedLayoutData && (
        <div className="space-y-4">
          {/* AI 분석 결과 */}
          <AIReasoningPanel
            layoutName={selectedLayoutData.name}
            scores={selectedLayoutData.scores}
            reasoning={selectedLayoutData.reasoning}
            recommendation={selectedLayoutData.recommendation}
            isRecommended={selectedLayoutData.recommendation?.isRecommended}
          />

          {/* 패턴 품질 */}
          <PatternQualityCard
            result={evaluatePatternQuality({
              type: selectedLayoutData.type || "tower",
              name: selectedLayoutData.name,
              coverage: selectedLayoutData.coverage,
              floors: selectedLayoutData.floors,
              units: selectedLayoutData.units || 0,
              parking: selectedLayoutData.parking || 0,
              gfa: selectedLayoutData.gfa,
              siteArea: safeNumber(siteArea, 660),
              strategy,
            }, userValues)}
          />

          {/* 수익성 시뮬레이션 */}
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={async () => {
              const { optimizeLayout } = await loadLayoutOptimizer()
              const result = optimizeLayout({
                siteArea: siteAreaNum,
                maxCoverage: regulation?.maxCoverageRatio ?? 60,
                maxFAR: regulation?.maxFloorAreaRatio ?? 200,
                maxFloors: regulation?.maxFloors || 20,
                maxHeight: regulation?.maxHeight || 60,
                parkingRatio: regulation?.parkingRatio || 1.0,
                landCostPerM2: landPriceData.pricePerM2 || 5000000,
                constructionCostPerM2: regionalPricing?.constructionCostPerM2 || 2500000,
                salesPricePerM2: marketPrice.suggestedSalePrice || regionalPricing?.salesPricePerM2 || 5000000,
              })
              setOptimizationResult(result)
              toast.success(`${result.searchSpace}개 조합 탐색 완료`)
            }}
          >
            <Sparkles className="h-4 w-4" /> 수익성 시뮬레이션
          </Button>
        </div>
      )}

      {/* ━━━ 하단 CTA ━━━ */}
      {selectedLayout && (
        <Button onClick={() => setCurrentStep("ai-render")} size="lg" className="w-full gap-2 py-6 text-base font-bold">
          AI 렌더링으로 이동
          <ChevronRight className="h-5 w-5" />
        </Button>
      )}
    </div>
  )
}
