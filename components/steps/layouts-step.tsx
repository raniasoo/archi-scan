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
import { SolarMiniDiagram } from "@/components/solar-mini-diagram"
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
  onCardRoiChanged?: (roi: number) => void
  onUpdateLayout?: (layoutId: number, updates: { floors?: number; units?: number; buildingCount?: number }) => void
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
  effectiveSalesPrice: number  // 중앙 계산값 (page.tsx useMemo)
  effectiveConstructionCost: number  // 중앙 계산값
  feasibilityResult: FeasibilityResult | null
  optimizationResult: OptimizationReport | null
  molitSupplementData: Record<string, unknown>
  loadLayoutOptimizer: () => Promise<any>
  handleSelectLayout: (id: number) => void
  onAiRenderComplete?: (imageData: string) => void
  // TestFit 엔진 연동
  unitMixPreset?: string
  testfitData?: { unitMix: any; parking: any; mixedUse: any }
  onUnitMixPresetChange?: (preset: string) => void
}

export function LayoutsStep(props: LayoutsStepProps) {
  const {
    layouts, selectedLayout, selectedLayoutData,
    setSelectedLayout, setCurrentStep, setLayoutViewMode, setShowComparisonModal, setOptimizationResult,
    layoutViewMode, isGenerating, address, siteArea, siteAreaNum,
    regulation, strategy, userValues, gfa,
    landPriceData, marketPrice, regionalPricing, effectiveSalesPrice, effectiveConstructionCost, onCardRoiChanged, onUpdateLayout,
    feasibilityResult, optimizationResult, molitSupplementData, loadLayoutOptimizer,
    handleSelectLayout,
  } = props
  const { unitMixPreset, testfitData, onUnitMixPresetChange } = props

  const [showDetails, setShowDetails] = useState(false)
  const [showComparison, setShowComparison] = useState(false)
  const [cardOrCompare, setCardOrCompare] = useState<"card" | "compare">("card")
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
  // 중앙 계산값 사용 (page.tsx effectiveSalesPrice useMemo)
  const salesPrice = effectiveSalesPrice
  const constructionCost = effectiveConstructionCost

  // 선택된 배치안의 ROI를 부모에게 전달 (스트립 ROI와 카드 ROI 100% 일치 보장)
  useEffect(() => {
    if (!selectedLayoutData || !onCardRoiChanged) return
    const f = calculateFeasibility({
      siteArea: siteAreaNum || 1,
      grossFloorArea: selectedLayoutData.gfa || 1,
      unitCount: selectedLayoutData.units || 1,
      floorCount: selectedLayoutData.floors || 1,
      parkingCount: selectedLayoutData.parking || 0,
      buildingCount: selectedLayoutData.buildingCount || 1,
      landPricePerM2: landPriceData.pricePerM2 || 5000000,
      salesPricePerM2: salesPrice,
      constructionCostPerM2: constructionCost,
    })
    onCardRoiChanged(f?.roi ?? 0)
  }, [selectedLayout, layouts, salesPrice, constructionCost, siteAreaNum, landPriceData.pricePerM2]) // eslint-disable-line react-hooks/exhaustive-deps

  // ROI 전체 마이너스 여부
  const allNegativeROI = layouts.length > 0 && layouts.every(l => {
    const f = calculateFeasibility({
      siteArea: siteAreaNum || 1,
      grossFloorArea: l.gfa || 1,
      unitCount: l.units || 1,
      floorCount: l.floors || 1,
      parkingCount: l.parking || 0,
      buildingCount: l.buildingCount || 1,
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

      {/* ━━━ 1. 선택된 배치안 요약 배너 ━━━ */}
      {(selectedLayoutData || recommendedLayout) && (() => {
        const bannerLayout = selectedLayoutData || recommendedLayout!
        const isRecommendedLayout = bannerLayout.recommendation?.isRecommended
        return (
          <div className={`rounded-xl border p-4 ${isRecommendedLayout ? 'border-primary/20 bg-primary/5' : 'border-border bg-card'}`}>
            <div className="flex items-center gap-2 mb-2">
              {isRecommendedLayout && <Sparkles className="h-4 w-4 text-primary" />}
              {isRecommendedLayout && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-semibold">AI 추천</span>}
              {bannerLayout.name === '수익 최적화안' && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-semibold">💰 수익 최적</span>}
              <span className={`text-sm font-bold ${isRecommendedLayout ? 'text-primary' : ''}`}>{bannerLayout.name}</span>
              <Badge variant="outline" className={`ml-auto text-xs ${isRecommendedLayout ? 'border-primary/50 text-primary' : 'border-border'}`}>
                종합 {displayScore(bannerLayout?.scores?.overall)}
              </Badge>
            </div>
            <div className="flex gap-3">
              <LayoutSketch type={bannerLayout._originalType || bannerLayout.type || 'tower'} size={64} className="shrink-0 opacity-70" siteArea={siteAreaNum} coverage={bannerLayout.coverage} floors={bannerLayout.floors} buildingCount={bannerLayout.buildingCount} />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {getLayoutStory(bannerLayout, strategy)}
                </p>
                {bannerLayout.recommendation?.reason && (
                  <p className="text-[10px] text-amber-400/80 mt-1">🏛️ {bannerLayout.recommendation.reason}</p>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* ━━━ 2. 카드/비교 뷰 전환 ━━━ */}
      <div>
        <div className="flex items-center gap-1 mb-2 p-0.5 bg-secondary/30 rounded-lg">
          <button
            onClick={() => setCardOrCompare("card")}
            className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${cardOrCompare === "card" ? "bg-card shadow text-foreground" : "text-muted-foreground"}`}
          >
            카드뷰
          </button>
          <button
            onClick={() => setCardOrCompare("compare")}
            className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors flex items-center justify-center gap-1 ${cardOrCompare === "compare" ? "bg-card shadow text-foreground" : "text-muted-foreground"}`}
          >
            <Table className="h-3 w-3" /> 비교분석
          </button>
        </div>

        {cardOrCompare === "card" ? (
          <>
            <p className="text-[10px] text-muted-foreground mb-1.5">← 스와이프하여 배치안 비교 →</p>

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
      buildingCount: layout.buildingCount || 1,
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
                  {layout.name === '수익 최적화안' && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-semibold">💰 수익 최적</span>}
                </div>

                {/* SVG 배치 스케치 */}
                <div className="flex justify-center mb-2 opacity-80">
                  <LayoutSketch type={layout._originalType || layout.type || 'tower'} size={72} siteArea={siteAreaNum} coverage={layout.coverage} floors={layout.floors} buildingCount={layout.buildingCount} />
                </div>

                {/* 스토리 한 줄 */}
                <p className="text-[11px] text-muted-foreground mb-2 leading-relaxed line-clamp-2">
                  {getLayoutStory(layout, strategy)}
                </p>
                {/* Alexander 패턴 추천 이유 */}
                {layout.recommendation?.reason && (
                  <p className="text-[9px] text-amber-400/70 mb-2 line-clamp-1">🏛️ {layout.recommendation.reason}</p>
                )}

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

                {/* ☀️ 일조사선 미니 다이어그램 */}
                {layout.solarData && (
                  <div className="mb-2 rounded-lg bg-secondary/20 border border-border/50 p-2">
                    <SolarMiniDiagram
                      buildingHeight={layout.floors * 3.3}
                      northMaxHeight={layout.solarData.northSolarMaxHeight}
                      effectiveMaxFloors={layout.solarData.effectiveMaxFloors}
                      shadowLength={layout.solarData.shadowLength}
                      winterSunlightHours={layout.solarData.winterSunlightHours}
                      isConstraining={layout.solarData.isConstraining || false}
                      summary={layout.solarData.summary}
                    />
                  </div>
                )}

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
          </>
        ) : (
          /* 비교분석 뷰 */
          <LayoutComparison
            layouts={layouts}
            siteArea={siteAreaNum}
            selectedLayout={selectedLayout}
            recommendedLayoutId={recommendedLayout?.id}
            landPricePerM2={landPriceData.pricePerM2 || 5000000}
            salesPricePerM2={salesPrice}
            constructionCostPerM2={constructionCost}
            onSelect={(id) => handleSelectLayout(id)}
          />
        )}
      </div>
      {allNegativeROI && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
          <p className="text-[11px] text-amber-400 leading-relaxed">
            💡 이 지역은 토지비 대비 분양수익이 낮아 수익형 개발이 어렵습니다. 
            <strong> 실거주·프리미엄 목적</strong>이라면 상품성({displayScore(recommendedLayout?.scores?.marketability)})과 
            법규적합성({displayScore(recommendedLayout?.scores?.regulationCompliance)})이 핵심 지표입니다.
          </p>
        </div>
      )}

      {/* ━━━ 배치 수동 조정 ━━━ */}
      {selectedLayout && selectedLayoutData && onUpdateLayout && (() => {
        const layout = selectedLayoutData
        const typeName: Record<string, string> = { tower: '타워형', courtyard: '중정형', lshape: 'ㄱ자형', linear: '판상형', cluster: '클러스터' }
        const bt = layout._originalType || layout.type
        const defaultBldgCount = (() => {
          if (layout.buildingCount) return layout.buildingCount
          const f = layout.floors || 3
          const u = layout.units || 10
          const sa = safeNumber(siteArea, 660)
          if (f <= 5 && u > 20 && sa > 1500) {
            const perFloor: Record<string, number> = { linear: 12, lshape: 6, courtyard: 10, tower: 4, cluster: 4 }
            return Math.max(1, Math.ceil(u / ((perFloor[bt] || 4) * f)))
          }
          return 1
        })()
        return (
          <div className="rounded-xl border border-border bg-card/50 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-foreground">🔧 배치 조정</span>
              <span className="text-[10px] text-muted-foreground">{typeName[bt] || bt}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {/* 동수 */}
              <div className="text-center">
                <label className="text-[9px] text-muted-foreground block mb-1">동수</label>
                <div className="flex items-center justify-center gap-1">
                  <button
                    className="w-6 h-6 rounded bg-secondary text-xs font-bold hover:bg-secondary/80"
                    onClick={() => {
                      const cur = layout.buildingCount || defaultBldgCount
                      if (cur > 1) onUpdateLayout(layout.id, { buildingCount: cur - 1 })
                    }}
                  >−</button>
                  <span className="text-sm font-bold w-6 text-center">{layout.buildingCount || defaultBldgCount}</span>
                  <button
                    className="w-6 h-6 rounded bg-secondary text-xs font-bold hover:bg-secondary/80"
                    onClick={() => {
                      const cur = layout.buildingCount || defaultBldgCount
                      // 건축가능영역 기반 최대 동수 제한
                      const maxByFootprint = Math.floor(siteAreaNum * (layout.coverage || 50) / 100 / 300) // 동당 최소 300㎡
                      const maxByUnits = Math.floor(layout.units / (layout.floors * 2)) // 동당 최소 2세대/층
                      const maxBldg = Math.min(maxByFootprint, maxByUnits, 8) // 최대 8동
                      if (cur < maxBldg) onUpdateLayout(layout.id, { buildingCount: cur + 1 })
                    }}
                  >+</button>
                </div>
              </div>
              {/* 세대수 */}
              <div className="text-center">
                <label className="text-[9px] text-muted-foreground block mb-1">세대수</label>
                <div className="flex items-center justify-center gap-1">
                  <button
                    className="w-6 h-6 rounded bg-secondary text-xs font-bold hover:bg-secondary/80"
                    onClick={() => { if (layout.units > 4) onUpdateLayout(layout.id, { units: layout.units - 2 }) }}
                  >−</button>
                  <span className="text-sm font-bold w-8 text-center">{layout.units}</span>
                  <button
                    className="w-6 h-6 rounded bg-secondary text-xs font-bold hover:bg-secondary/80"
                    onClick={() => onUpdateLayout(layout.id, { units: layout.units + 2 })}
                  >+</button>
                </div>
              </div>
              {/* 층수 */}
              <div className="text-center">
                <label className="text-[9px] text-muted-foreground block mb-1">층수</label>
                <div className="flex items-center justify-center gap-1">
                  <button
                    className="w-6 h-6 rounded bg-secondary text-xs font-bold hover:bg-secondary/80"
                    onClick={() => { if (layout.floors > 2) onUpdateLayout(layout.id, { floors: layout.floors - 1 }) }}
                  >−</button>
                  <span className="text-sm font-bold w-6 text-center">{layout.floors}</span>
                  <button
                    className="w-6 h-6 rounded bg-secondary text-xs font-bold hover:bg-secondary/80"
                    onClick={() => onUpdateLayout(layout.id, { floors: layout.floors + 1 })}
                  >+</button>
                </div>
              </div>
            </div>
            {layout._userEdited && (
              <p className="text-[9px] text-amber-400 mt-2 text-center">⚡ 수동 조정됨 — AI 렌더링에 반영됩니다</p>
            )}
          </div>
        )
      })()}

      {/* ━━━ TestFit: 세대 믹스 프리셋 ━━━ */}
      {selectedLayout && selectedLayoutData && onUnitMixPresetChange && (() => {
        const presets = [
          { id: 'young-single', label: '청년', icon: '👤' },
          { id: 'newlywed', label: '신혼', icon: '💑' },
          { id: 'family', label: '가족', icon: '👨‍👩‍👧' },
          { id: 'premium', label: '프리미엄', icon: '💎' },
          { id: 'mixed', label: '균형', icon: '⚖️' },
          { id: 'rental', label: '임대', icon: '🏢' },
        ]
        const um = testfitData?.unitMix
        return (
          <div className="rounded-xl border border-border bg-card/50 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-foreground">🏠 세대 믹스</span>
              {um && <span className="text-[10px] text-muted-foreground">{um.totalUnits}세대 · 평균 {um.avgUnitArea?.toFixed(0)}㎡</span>}
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {presets.map(p => (
                <button
                  key={p.id}
                  onClick={() => onUnitMixPresetChange(p.id)}
                  className={`flex-shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                    unitMixPreset === p.id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  {p.icon} {p.label}
                </button>
              ))}
            </div>
            {um && um.units && um.units.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {um.units.filter((u: any) => u.count > 0).map((u: any, i: number) => (
                  <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-secondary/50 text-muted-foreground">
                    {u.type.name} {u.count}호 ({u.type.area}㎡)
                  </span>
                ))}
              </div>
            )}
            {um && (
              <div className="mt-1.5 text-[9px] text-emerald-500 font-medium">
                예상 분양수입 {(um.estimatedRevenue / 100000000).toFixed(1)}억원 · {um.demographics}
              </div>
            )}
          </div>
        )
      })()}

      {/* ━━━ 3. 핵심 점수 대시보드 (항상 보임) ━━━ */}
      {selectedLayout && selectedLayoutData && (() => {
        const patternResult = evaluatePatternQuality({
          type: selectedLayoutData.type || "tower",
          name: selectedLayoutData.name,
          coverage: selectedLayoutData.coverage,
          floors: selectedLayoutData.floors,
          units: selectedLayoutData.units || 0,
          parking: selectedLayoutData.parking || 0,
          gfa: selectedLayoutData.gfa,
          siteArea: safeNumber(siteArea, 660),
          strategy,
        }, userValues)
        const strategyFit = selectedLayoutData.recommendation?.strategyMatch ?? 0
        const inlineF = calculateFeasibility({
          siteArea: siteAreaNum || 1,
          grossFloorArea: selectedLayoutData.gfa || 1,
          unitCount: selectedLayoutData.units || 1,
          floorCount: selectedLayoutData.floors || 1,
          parkingCount: selectedLayoutData.parking || 0,
      buildingCount: selectedLayoutData.buildingCount || 1,
          landPricePerM2: landPriceData.pricePerM2 || 5000000,
          salesPricePerM2: salesPrice,
          constructionCostPerM2: constructionCost,
        })
        const roi = inlineF?.roi ?? 0
        const roiColor = roi >= 15 ? 'text-emerald-400' : roi >= 5 ? 'text-blue-400' : roi >= 0 ? 'text-amber-400' : 'text-red-400'

        // 법규 활용도: 건폐율·용적률을 법규 한도 대비 얼마나 쓰고 있는지
        const maxCov = regulation?.maxCoverageRatio || 60
        const maxFar = regulation?.maxFloorAreaRatio || 200
        const actualFar = safeNumber(siteArea, 660) > 0 ? Math.round((selectedLayoutData.gfa / safeNumber(siteArea, 660)) * 100) : 0
        const covUtil = Math.min((selectedLayoutData.coverage / maxCov) * 100, 100)
        const farUtil = Math.min((actualFar / maxFar) * 100, 100)
        const utilization = Math.round((covUtil + farUtil) / 2)
        const utilColor = utilization >= 80 ? 'text-emerald-400' : utilization >= 60 ? 'text-blue-400' : 'text-amber-400'

        return (
          <div className="grid grid-cols-4 gap-1.5">
            {/* 설계 품질 */}
            <div className="rounded-xl border border-border bg-card p-2.5 text-center">
              <p className="text-[9px] text-muted-foreground mb-0.5">설계</p>
              <p className="text-lg font-bold text-primary">{patternResult.overallQuality}</p>
              <span className="text-[9px] px-1 py-0.5 rounded-full bg-primary/15 text-primary font-semibold">{patternResult.grade}</span>
            </div>
            {/* 전략 부합도 */}
            <div className="rounded-xl border border-border bg-card p-2.5 text-center">
              <p className="text-[9px] text-muted-foreground mb-0.5">전략</p>
              <p className="text-lg font-bold">{strategyFit}<span className="text-[9px] text-muted-foreground">%</span></p>
              <div className="mt-0.5 h-1 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(strategyFit, 100)}%` }} />
              </div>
            </div>
            {/* ROI */}
            <div className="rounded-xl border border-border bg-card p-2.5 text-center">
              <p className="text-[9px] text-muted-foreground mb-0.5">ROI</p>
              <p className={`text-lg font-bold ${roiColor}`}>{roi > 0 ? '+' : ''}{roi.toFixed(1)}<span className="text-[9px]">%</span></p>
              <p className="text-[8px] text-muted-foreground">{roi >= 15 ? '추천' : roi >= 0 ? '보통' : '검토'}</p>
            </div>
            {/* 법규 활용도 */}
            <div className="rounded-xl border border-border bg-card p-2.5 text-center">
              <p className="text-[9px] text-muted-foreground mb-0.5">활용</p>
              <p className={`text-lg font-bold ${utilColor}`}>{utilization}<span className="text-[9px]">%</span></p>
              <p className="text-[8px] text-muted-foreground">법규한도</p>
            </div>
          </div>
        )
      })()}

      {/* ━━━ 4. 상세 분석 토글 ━━━ */}
      {selectedLayout && selectedLayoutData && (
        <Button variant="outline" onClick={() => setShowDetails(!showDetails)} className="w-full gap-1">
          <ChevronDown className={`h-4 w-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
          AI 상세 분석 {showDetails ? '접기' : '보기'}
        </Button>
      )}


      {/* ━━━ 5. 상세 정보 (접기/펼치기) ━━━ */}
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

          {/* 패턴 품질 상세 */}
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
