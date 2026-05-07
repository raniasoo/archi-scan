"use client"

import { type Dispatch, type SetStateAction } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Brain, Table, Sparkles, CheckCircle2, ChevronRight, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { ARCHISCAN_COPY, getStrategyName } from "@/constants/archiscan-copy"
import type { LayoutOption } from "@/app/page"
import type { ZoningRegulation } from "@/lib/regulation-types"
import type { DesignStrategy } from "@/lib/design-strategy"
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
const AIHub = dynamic(() => import("@/components/ai-hub").then(m => ({ default: m.AIHub })))

function displayScore(score: unknown, fallbackText: string = '산정 중'): string {
  if (score === undefined || score === null) return fallbackText
  const num = Number(score)
  return isNaN(num) ? fallbackText : `${num}점`
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

  const recommendedLayout = layouts.find(l => l.recommendation.isRecommended) || layouts[0]

  return (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Brain className="h-5 w-5 text-primary" />
                  <h2 className="text-xl md:text-2xl font-bold text-foreground">AI 배치안 비교</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto gap-1 text-xs"
                    onClick={() => setShowComparisonModal(true)}
                  >
                    <Table className="h-3.5 w-3.5" />
                    비교표 보기
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-auto gap-1 text-xs"
                    onClick={async () => {
                      const { optimizeLayout } = await loadLayoutOptimizer()
                      const result = optimizeLayout({
                        siteArea: siteAreaNum,
                        maxCoverage: regulation.maxCoverageRatio,
                        maxFAR: regulation.maxFloorAreaRatio,
                        maxFloors: regulation.maxFloors || 20,
                        maxHeight: regulation.maxHeight || 60,
                        parkingRatio: regulation.parkingRatio || 1.0,
                        landCostPerM2: landPriceData.pricePerM2 || 5000000,
                        constructionCostPerM2: regionalPricing?.constructionCostPerM2 || 2500000,
                        salesPricePerM2: marketPrice.suggestedSalePrice || regionalPricing?.salesPricePerM2 || 5000000,
                      })
                      setOptimizationResult(result)
                      toast.success(`${result.searchSpace}개 조합 탐색 완료 — 최적 ROI ${result.best.roi}%`)
                    }}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    수익성 시뮬레이션
                  </Button>
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

                {/* 수익성 극대화 시뮬레이션 결과 */}
                {optimizationResult && (() => {
                  const current = recommendedLayout || layouts[0]
                  const currentROI = current ? (feasibilityResult?.roi ?? 0) : 0
                  const roiGap = optimizationResult.best.roi - currentROI
                  return (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold text-foreground">수익성 극대화 시뮬레이션</span>
                      <span className="text-[10px] text-muted-foreground ml-auto">{optimizationResult.searchSpace}개 조합 탐색</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
                      현재 대지의 법규 조건(건폐율·용적률·높이) 안에서 건폐율 × 층수 × 세대크기를 조합하여
                      <strong className="text-foreground"> 수익률(ROI)이 가장 높은 조합</strong>을 탐색한 결과입니다. 현재 AI 추천 배치안과 비교하여 참고하세요.
                      {optimizationResult.best.roi <= 0 && ' 현재 토지 단가 대비 분양가가 낮아 수익 확보가 어려운 대지입니다.'}
                    </p>

                    {/* 현재 vs 최적화 비교 테이블 */}
                    {current && (
                      <div className="overflow-x-auto mb-3">
                        <table className="w-full text-[11px]">
                          <thead>
                            <tr className="border-b border-border/50">
                              <th className="text-left py-1.5 px-2 text-muted-foreground font-medium">항목</th>
                              <th className="text-center py-1.5 px-2 text-muted-foreground font-medium">현재 ({current.name})</th>
                              <th className="text-center py-1.5 px-2 text-primary font-semibold">ROI 극대화</th>
                              <th className="text-center py-1.5 px-2 text-muted-foreground font-medium">차이</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              { label: '건폐율', cur: `${current.coverage?.toFixed(0)}%`, opt: `${optimizationResult.best.coverage}%` },
                              { label: '층수', cur: `${current.floors}층`, opt: `${optimizationResult.best.floors}층` },
                              { label: '세대수', cur: `${current.units}세대`, opt: `${optimizationResult.best.units}세대`, diff: optimizationResult.best.units - current.units },
                              { label: '연면적', cur: `${current.gfa?.toLocaleString()}㎡`, opt: `${optimizationResult.best.gfa.toLocaleString()}㎡` },
                              { label: '예상수익', cur: `${(feasibilityResult?.profit ? feasibilityResult.profit / 1e8 : 0).toFixed(1)}억`, opt: `${(optimizationResult.best.profit / 1e8).toFixed(1)}억`, diff: optimizationResult.best.profit / 1e8 - (feasibilityResult?.profit ? feasibilityResult.profit / 1e8 : 0), isMoney: true },
                              { label: 'ROI', cur: `${currentROI.toFixed(1)}%`, opt: `${optimizationResult.best.roi.toFixed(1)}%`, diff: roiGap, isPercent: true },
                            ].map((row, i) => (
                              <tr key={i} className={`border-b border-border/30 ${row.label === 'ROI' ? 'bg-primary/5' : ''}`}>
                                <td className="py-1.5 px-2 font-medium">{row.label}</td>
                                <td className="py-1.5 px-2 text-center text-muted-foreground">{row.cur}</td>
                                <td className="py-1.5 px-2 text-center font-semibold">{row.opt}</td>
                                <td className={`py-1.5 px-2 text-center font-medium ${
                                  row.diff !== undefined ? (row.diff > 0 ? 'text-emerald-500' : row.diff < 0 ? 'text-red-500' : 'text-muted-foreground') : 'text-muted-foreground'
                                }`}>
                                  {row.diff !== undefined 
                                    ? `${row.diff > 0 ? '▲' : row.diff < 0 ? '▼' : '-'} ${Math.abs(row.diff).toFixed(row.isPercent ? 1 : row.isMoney ? 1 : 0)}${row.isPercent ? '%p' : row.isMoney ? '억' : ''}`
                                    : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <p className="text-[10px] text-muted-foreground">{optimizationResult.improvement} · 세대크기 {optimizationResult.best.unitSize}㎡ ({optimizationResult.best.unitSize <= 59 ? '소형' : optimizationResult.best.unitSize <= 84 ? '중형' : '대형'}) 기준</p>

                    {/* 장점과 단점 분석 */}
                    {roiGap !== 0 && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5">
                          <p className="text-[10px] font-semibold text-emerald-500 mb-1.5">장점</p>
                          <ul className="space-y-1 text-[10px] text-muted-foreground">
                            {roiGap > 0 && <li>• ROI {roiGap.toFixed(1)}%p 개선 가능</li>}
                            {optimizationResult.best.units > (current?.units || 0) && <li>• 세대수 증가 → 분양 수익 증가</li>}
                            {optimizationResult.best.gfa > (current?.gfa || 0) && <li>• 연면적 증가 → 공간 활용도 향상</li>}
                            {optimizationResult.best.unitSize <= 59 && <li>• 소형 세대 → 초기 분양률 유리</li>}
                            {optimizationResult.best.unitSize >= 84 && <li>• 중대형 세대 → 세대당 단가 높음</li>}
                          </ul>
                        </div>
                        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5">
                          <p className="text-[10px] font-semibold text-amber-500 mb-1.5">고려사항</p>
                          <ul className="space-y-1 text-[10px] text-muted-foreground">
                            <li>• ROI만 고려 (건축적 품질 미반영)</li>
                            {optimizationResult.best.unitSize <= 59 && <li>• 소형 위주 → 가족 수요 부적합</li>}
                            {optimizationResult.best.coverage > 50 && <li>• 높은 건폐율 → 조경/이격 여유 감소</li>}
                            {optimizationResult.best.floors >= 6 && <li>• 6층 이상 → 일조권/사선제한 검토 필요</li>}
                            <li>• 인허가·민원 등 현실 변수 미반영</li>
                          </ul>
                        </div>
                      </div>
                    )}

                    {roiGap > 0 && (
                      <p className="text-[10px] text-emerald-500 mt-2">💡 ROI 극대화 조건 적용 시 {roiGap.toFixed(1)}%p 높일 수 있습니다. 위 고려사항을 검토한 후 설계사와 상의하세요.</p>
                    )}
                    {roiGap <= 0 && optimizationResult.best.roi > 0 && (
                      <p className="text-[10px] text-blue-400 mt-2">✅ 현재 AI 추천 배치안이 이미 수익성과 건축 품질을 균형 있게 반영하고 있습니다.</p>
                    )}
                    {optimizationResult.best.roi <= 0 && (
                      <p className="text-[10px] text-amber-400 mt-2">⚠️ 어떤 조합으로도 수익 확보가 어렵습니다. 토지 매입가 재협상 또는 용도변경을 검토하세요.</p>
                    )}
                  </div>
                  )
                })()}

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

            {selectedLayout && selectedLayoutData && (
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
            )}

            {selectedLayout && selectedLayoutData && (
              <AIHub
                input={{
                  address,
                  zoneType: regulation.zoneType,
                  zoneName: (() => {
                    const label = (molitSupplementData as any).zoneLabel
                    if (label && !label.includes('residential') && !label.includes('commercial')) return label
                    const map: Record<string, string> = {
                      'residential-exclusive-1': '제1종전용주거지역', 'residential-exclusive-2': '제2종전용주거지역',
                      'residential-1': '제1종일반주거지역', 'residential-2': '제2종일반주거지역',
                      'residential-3': '제3종일반주거지역', 'semi-residential': '준주거지역',
                      'commercial-neighborhood': '근린상업지역', 'commercial-general': '일반상업지역',
                      'commercial-central': '중심상업지역', 'industrial': '준공업지역',
                      'green-natural': '자연녹지지역',
                    }
                    return map[regulation.zoneType] || label || regulation.zoneType
                  })(),
                  siteArea: safeNumber(siteArea, 660),
                  layoutName: selectedLayoutData.name,
                  floors: selectedLayoutData.floors,
                  units: selectedLayoutData.units || 0,
                  buildingCoverageRatio: selectedLayoutData.coverage,
                  floorAreaRatio: Math.round((selectedLayoutData.gfa / safeNumber(siteArea, 660)) * 100),
                  roi: feasibilityResult?.roi || 0,
                  totalProjectCost: feasibilityResult?.totalCost || 0,
                  strategy,
                  buildingType: selectedLayoutData.type,
                  values: props.userValues ? {
                    profitVsQuality: props.userValues.profitVsQuality,
                    privacyVsCommunity: props.userValues.privacyVsCommunity,
                    efficiencyVsSpace: props.userValues.efficiencyVsSpace,
                  } : undefined,
                  patterns: props.userValues?.selectedPatterns,
                  surroundingContext: props.surroundingContext,
                  satelliteUrl: props.satelliteUrl,
                }}
                onRenderComplete={props.onAiRenderComplete}
              />
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
  )
}
