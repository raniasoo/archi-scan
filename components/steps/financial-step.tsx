"use client"

import { type Dispatch, type SetStateAction } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { ContributionSimulator } from "@/components/contribution-simulator"
import { ScenarioComparison } from "@/components/scenario-comparison"
import { ProjectRoadmap } from "@/components/project-roadmap"
import { ChevronRight, ChevronLeft, TrendingUp, Calculator, FileText } from "lucide-react"
import type { LayoutOption } from "@/app/page"
import type { ZoningRegulation } from "@/lib/regulation-types"
import type { FeasibilityResult } from "@/lib/project-analysis-state"
import type { RegionalPricing } from "@/lib/regional-pricing"
import { getZoneMultiplier, getTierInfo } from "@/lib/regional-pricing"
import { ARCHISCAN_COPY } from "@/constants/archiscan-copy"

const LoadingBox = () => <div className="flex items-center justify-center p-8 text-muted-foreground"><span className="animate-spin mr-2">⏳</span>로딩 중...</div>
const FinancialAnalysis = dynamic(() => import("@/components/financial-analysis").then(m => ({ default: m.FinancialAnalysis })), { loading: LoadingBox })
const ScenarioSlider = dynamic(() => import("@/components/scenario-slider").then(m => ({ default: m.ScenarioSlider })))

export interface FinancialStepProps {
  selectedLayoutData: LayoutOption
  address: string
  siteAreaNum: number
  gfa: number
  regulation: ZoningRegulation
  feasibilityResult: FeasibilityResult | null
  landPriceData: { pricePerM2: number }
  marketPrice: { loaded: boolean; suggestedSalePrice: number; avgPricePerM2: number; transactionCount: number; transactions: any[] }
  regionalPricing: RegionalPricing | null
  setCurrentStep: Dispatch<SetStateAction<any>>
}

export function FinancialStep(props: FinancialStepProps) {
  const {
    selectedLayoutData, address, siteAreaNum, gfa, regulation,
    feasibilityResult, landPriceData, marketPrice, regionalPricing,
    setCurrentStep,
  } = props

  return (
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

            {/* 분담금 시뮬레이션 (재건축 사업) */}
            {feasibilityResult && (
              <ContributionSimulator
                totalProjectCost={(feasibilityResult.totalCost || 0) / 100000000}
                totalUnits={selectedLayoutData.units}
                salePricePerM2={(marketPrice.loaded && marketPrice.suggestedSalePrice > 0) 
                  ? marketPrice.suggestedSalePrice 
                  : regionalPricing ? Math.round(regionalPricing.salesPricePerM2 * getZoneMultiplier(regulation.zoneType || '')) : 5000000}
                avgUnitArea={selectedLayoutData.gfa ? Math.round(selectedLayoutData.gfa / Math.max(selectedLayoutData.units, 1)) : 84}
              />
            )}

            {/* 사업 시나리오 비교 */}
            {feasibilityResult && (
              <ScenarioComparison
                siteArea={siteAreaNum}
                totalUnits={selectedLayoutData.units}
                floors={selectedLayoutData.floors}
                buildingCoverage={selectedLayoutData.coverage ?? 60}
                totalProjectCost={feasibilityResult.totalCost || 0}
                roi={feasibilityResult.roi ?? 0}
              />
            )}

            {/* 프로젝트 로드맵 — 시나리오 추천에 따라 자동 전환 */}
            {feasibilityResult && (() => {
              const isSmall = selectedLayoutData.units <= 200 && siteAreaNum < 10000
              const roi = feasibilityResult.roi ?? 0
              // ScenarioComparison과 동일한 추천 로직
              const scenario: 'reconstruction' | 'remodeling' | 'bulk-sale' = 
                roi > 15 ? 'reconstruction' : 'remodeling'
              return (
                <ProjectRoadmap
                  scenarioType={scenario}
                  totalUnits={selectedLayoutData.units}
                  isSmallScale={isSmall}
                />
              )
            })()}

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
          </div>  )
}
