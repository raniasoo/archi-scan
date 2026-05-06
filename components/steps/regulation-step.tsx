"use client"

import { type Dispatch, type SetStateAction } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Sparkles, ChevronRight } from "lucide-react"
import type { ZoningRegulation } from "@/lib/regulation-types"
import { ZONE_LAYOUT_CONFIGS, getUseLabel } from "@/lib/zone-layout-config"
import { formatLandPricePerM2, formatLandCost } from "@/lib/land-price"

const LoadingBox = () => <div className="flex items-center justify-center p-8 text-muted-foreground"><span className="animate-spin mr-2">⏳</span>로딩 중...</div>
const RegulationInput = dynamic(() => import("@/components/regulation-input").then(m => ({ default: m.RegulationInput })))
const RegulationAnalysisPanel = dynamic(() => import("@/components/regulation-analysis").then(m => ({ default: m.RegulationAnalysisPanel })))
const LegalReviewPanel = dynamic(() => import("@/components/legal-review-panel").then(m => ({ default: m.LegalReviewPanel })))
const ZoneAllowedUsesCard = dynamic(() => import("@/components/zone-allowed-uses-card").then(m => ({ default: m.ZoneAllowedUsesCard })))
const CadastralMap = dynamic(() => import("@/components/cadastral-map").then(m => ({ default: m.CadastralMap })), { ssr: false, loading: LoadingBox })

export interface RegulationStepProps {
  address: string
  siteArea: string
  siteAreaNum: number
  regulation: ZoningRegulation
  setRegulation: Dispatch<SetStateAction<ZoningRegulation>>
  setSiteArea: Dispatch<SetStateAction<string>>
  setSitePolygon: Dispatch<SetStateAction<any>>
  landPriceData: { pricePerM2: number; totalCost: number; source: string; isDemo: boolean; stdrYear: number; message?: string; loading: boolean }
  marketPrice: { avgPricePerM2: number; suggestedSalePrice: number; transactionCount: number; loaded: boolean; transactions: any[] }
  molitSupplementData: Record<string, unknown>
  siteBdMgtSn: string
  handleGenerate: () => void
}

export function RegulationStep(props: RegulationStepProps) {
  const {
    address, siteArea, siteAreaNum, regulation, setRegulation,
    setSiteArea, setSitePolygon, landPriceData, marketPrice,
    molitSupplementData, siteBdMgtSn, handleGenerate,
  } = props

  return (
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
                entX={(molitSupplementData as any).entX}
                entY={(molitSupplementData as any).entY}
                bdMgtSn={siteBdMgtSn || (molitSupplementData as any).bdMgtSn}
                setbackFront={regulation.setbackFront}
                setbackSide={regulation.setbackSide}
                setbackRear={regulation.setbackRear}
                coverageRatio={(molitSupplementData as any).zoneCode ? (
                  (molitSupplementData as any).zoneCode.includes('commercial') ? 80 :
                  (molitSupplementData as any).zoneCode.includes('semi-residential') ? 70 :
                  (molitSupplementData as any).zoneCode.includes('residential') ? 60 : 60
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

            {/* 중첩 규제 분석 */}
            {(() => {
              const regs = (molitSupplementData as any)?.overlappingRegulations as { name: string; category: string; severity: string; coverageOverride?: number; heightLimit?: number; floorLimit?: number; description?: string }[] | undefined
              if (!regs || regs.length === 0) return null
              const critical = regs.filter(r => r.severity === 'critical')
              const high = regs.filter(r => r.severity === 'high')
              const others = regs.filter(r => r.severity !== 'critical' && r.severity !== 'high')
              const severityColor = { critical: 'bg-red-500/20 text-red-400 border-red-500/30', high: 'bg-amber-500/20 text-amber-400 border-amber-500/30', medium: 'bg-blue-500/20 text-blue-400 border-blue-500/30', info: 'bg-slate-500/20 text-slate-400 border-slate-500/30' }
              const severityLabel = { critical: '⚠️ 심각', high: '⚡ 높음', medium: 'ℹ️ 보통', info: '📋 참고' }
              return (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-5 w-5 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px]">🔍</div>
                    <h3 className="text-sm font-semibold">중첩 규제 분석</h3>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">{regs.length}개 규제 적용</span>
                  </div>
                  {critical.length > 0 && (
                    <div className="mb-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                      <p className="text-[10px] font-bold text-red-400 mb-1">⚠️ 핵심 규제 — 사업성에 직접 영향</p>
                      {critical.map((r, i) => (
                        <div key={i} className="flex items-start gap-2 py-1">
                          <span className="text-xs font-semibold text-red-300 shrink-0">{r.name}</span>
                          {r.description && <span className="text-[10px] text-red-400/80">{r.description}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="space-y-1">
                    {[...high, ...others].map((r, i) => (
                      <div key={i} className="flex items-center gap-2 py-0.5">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded border ${severityColor[r.severity as keyof typeof severityColor] || severityColor.info}`}>
                          {severityLabel[r.severity as keyof typeof severityLabel] || '📋 참고'}
                        </span>
                        <span className="text-xs text-foreground">{r.name}</span>
                        <span className="text-[10px] text-muted-foreground">({r.category})</span>
                      </div>
                    ))}
                  </div>
                  {(critical.some(r => r.coverageOverride) || high.some(r => r.coverageOverride)) && (
                    <div className="mt-3 pt-2 border-t border-amber-500/20">
                      <p className="text-[10px] text-amber-400 font-medium">
                        💡 중첩 규제에 의해 건폐율이 {Math.min(...regs.filter(r => r.coverageOverride).map(r => r.coverageOverride!))}% 이하로 제한될 수 있습니다.
                        {regs.some(r => r.heightLimit) && ` 높이 제한: ${Math.min(...regs.filter(r => r.heightLimit).map(r => r.heightLimit!))}m`}
                      </p>
                    </div>
                  )}
                </div>
              )
            })()}

            <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
              {/* Regulation Input */}
              <div className="order-2 lg:order-1 space-y-4">
                <RegulationInput regulation={regulation} onChange={setRegulation} />
                {/* 건축 가능 용도 안내 */}
                {regulation.zoneType && regulation.zoneType !== 'custom' && (
                  <ZoneAllowedUsesCard 
                    zoneType={regulation.zoneType} 
                    zoneName={regulation.zoneType}
                  />
                )}
              </div>

              {/* Regulation Analysis + Legal Review */}
              <div className="order-1 lg:order-2 space-y-4">
                {/* 기존 분석 패널 */}
                {(() => {
                  const rw = (molitSupplementData as any).roadWidth || regulation.roadWidth || 8
                  const zc = (molitSupplementData as any).zoneCode || regulation.zoneType
                  const ht = (molitSupplementData as any).heightLimit || regulation.maxHeight
                  const dp = (molitSupplementData as any).hasDistrictPlan ?? regulation.additionalNotes.includes('지구단위')
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
                    zoneCode={(molitSupplementData as any).zoneCode || regulation.zoneType}
                    siteArea={siteAreaNum}
                    roadWidth={(molitSupplementData as any).roadWidth || regulation.roadWidth || 8}
                    heightLimit={(molitSupplementData as any).heightLimit || regulation.maxHeight}
                    hasDistrictPlan={(molitSupplementData as any).hasDistrictPlan ?? regulation.additionalNotes?.includes('지구단위') ?? false}
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
          </div>  )
}
