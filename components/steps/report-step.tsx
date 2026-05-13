"use client"

import { type Dispatch, type SetStateAction } from "react"
import { trackPdfDownload, trackShareLink } from "@/components/google-analytics"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Code, Table, Printer, Loader2, RotateCcw, Settings2, Share2 } from "lucide-react"
import { toast } from "sonner"
import type { LayoutOption } from "@/app/page"
import type { ZoningRegulation } from "@/lib/regulation-types"
import type { DesignStrategy } from "@/lib/design-strategy"
import type { FeasibilityResult } from "@/lib/project-analysis-state"
import type { BrandingConfig } from "@/lib/branding-config"
import type { SiteVisualsConfig } from "@/lib/site-visuals-config"
import type { FinancialScenariosConfig } from "@/lib/financial-scenarios-config"
import type { RegionalPricing } from "@/lib/regional-pricing"
import type { UserValues } from "@/lib/pattern-quality"
import { buildExportData } from "@/lib/build-export-data"

const LoadingBox = () => <div className="flex items-center justify-center p-8 text-muted-foreground"><span className="animate-spin mr-2">⏳</span>로딩 중...</div>
const ReportSummary = dynamic(() => import("@/components/report-summary").then(m => ({ default: m.ReportSummary })), { loading: LoadingBox })
const FinancialAnalysis = dynamic(() => import("@/components/financial-analysis").then(m => ({ default: m.FinancialAnalysis })), { loading: LoadingBox })
const AIReasoningPanel = dynamic(() => import("@/components/ai-reasoning").then(m => ({ default: m.AIReasoningPanel })))

export interface ReportStepProps {
  selectedLayoutData: LayoutOption
  address: string
  siteArea: string
  siteAreaNum: number
  gfa: number
  layouts: LayoutOption[]
  regulation: ZoningRegulation
  strategy: DesignStrategy
  branding: BrandingConfig | null
  feasibilityResult: FeasibilityResult | null
  landPriceData: { pricePerM2: number }
  marketPrice: { loaded: boolean; suggestedSalePrice: number }
  regionalPricing: RegionalPricing | null
  molitSupplementData: Record<string, unknown>
  siteVisuals: SiteVisualsConfig
  financialScenarios: FinancialScenariosConfig
  setFinancialScenarios: Dispatch<SetStateAction<FinancialScenariosConfig>>
  userValues: UserValues
  downloadingPdf: boolean
  downloadingHtml: boolean
  downloadingExcel: boolean
  downloadError: string | null
  setDownloadingPdf: Dispatch<SetStateAction<boolean>>
  setDownloadingHtml: Dispatch<SetStateAction<boolean>>
  setDownloadingExcel: Dispatch<SetStateAction<boolean>>
  setDownloadError: Dispatch<SetStateAction<string | null>>
  setCurrentStep: Dispatch<SetStateAction<any>>
  setShowBrandingEditor: Dispatch<SetStateAction<boolean>>
  loadExportFunctions: () => Promise<any>
  aiRenderImage?: string | null
  aiMultiImages?: {angle: string; image: string | null}[] | null
  aiInteriorComparison?: {style: string; label: string; image: string}[] | null
  sitePolygon?: { coords: [number, number][]; centroid: [number, number] } | null
}

export function ReportStep(props: ReportStepProps) {
  const {
    selectedLayoutData, address, siteArea, siteAreaNum, gfa, layouts,
    regulation, strategy, branding, feasibilityResult,
    landPriceData, marketPrice, regionalPricing, molitSupplementData,
    siteVisuals, financialScenarios, setFinancialScenarios, userValues,
    downloadingPdf, downloadingHtml, downloadingExcel, downloadError,
    setDownloadingPdf, setDownloadingHtml, setDownloadingExcel, setDownloadError,
    setCurrentStep, setShowBrandingEditor, loadExportFunctions,
  } = props

  const getExportData = () => buildExportData({
    address, siteAreaNum, branding, selectedLayoutData, layouts,
    feasibilityResult, marketPrice, regionalPricing, landPriceData,
    regulation, molitSupplementData, strategy, userValues,
    aiRenderImage: props.aiRenderImage, aiMultiImages: props.aiMultiImages, aiInteriorComparison: props.aiInteriorComparison,
  })

  return (
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
                    toast.loading('PDF 생성 중...', { id: 'pdf-dl' })
                    try {
                      if (!selectedLayoutData) {
                        throw new Error('배치안 데이터가 없습니다. 먼저 배치안을 생성해주세요.');
                      }
                      if (!address) {
                        throw new Error('주소가 없습니다. 먼저 주소를 입력해주세요.');
                      }
                      const exportData = buildExportData({ address, siteAreaNum, branding, selectedLayoutData: selectedLayoutData!, layouts, feasibilityResult, marketPrice, regionalPricing, landPriceData, regulation, molitSupplementData, strategy, userValues, aiRenderImage: props.aiRenderImage, aiMultiImages: props.aiMultiImages, aiInteriorComparison: props.aiInteriorComparison });
                      const { downloadPdf } = await loadExportFunctions(); const result = await downloadPdf(exportData);
                      if (!result.success) {
                        toast.error('PDF 생성 실패', { id: 'pdf-dl', description: result.error })
                        setDownloadError(result.error || 'PDF 다운로드 중 오류가 발생했습니다.');
                      } else {
                        toast.success('PDF 다운로드 완료', { id: 'pdf-dl' })
                        trackPdfDownload()
                      }
                    } catch (err) {
                      const errorMsg = err instanceof Error ? err.message : String(err);
                      if (errorMsg.includes('ChunkLoadError') || errorMsg.includes('Loading chunk') || errorMsg.includes('Failed to fetch dynamically imported module')) {
                        window.location.reload();
                        return;
                      }
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
                    toast.loading('HTML 생성 중...', { id: 'html-dl' })
                    try {
                      if (!selectedLayoutData) {
                        throw new Error('배치안 데이터가 없습니다. 먼저 배치안을 생성해주세요.');
                      }
                      if (!address) {
                        throw new Error('주소가 없습니다. 먼저 주소를 입력해주세요.');
                      }
                      const exportData = buildExportData({ address, siteAreaNum, branding, selectedLayoutData: selectedLayoutData!, layouts, feasibilityResult, marketPrice, regionalPricing, landPriceData, regulation, molitSupplementData, strategy, userValues, aiRenderImage: props.aiRenderImage, aiMultiImages: props.aiMultiImages, aiInteriorComparison: props.aiInteriorComparison });
                      const { downloadHtml } = await loadExportFunctions(); const result = downloadHtml(exportData);
                      if (!result.success) {
                        toast.error('HTML 생성 실패', { id: 'html-dl', description: result.error })
                        setDownloadError(result.error || 'HTML 다운로드 중 오류가 발생했습니다.');
                      } else {
                        toast.success('HTML 다운로드 완료', { id: 'html-dl' })
                      }
                    } catch (err) {
                      const errorMsg = err instanceof Error ? err.message : String(err);

                      if (errorMsg.includes('ChunkLoadError') || errorMsg.includes('Loading chunk') || errorMsg.includes('Failed to fetch dynamically imported module')) {
                        window.location.reload();
                        return;
                      }
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
                  onClick={async () => {
                    setDownloadingExcel(true);
                    setDownloadError(null);
                    try {
                      if (!selectedLayoutData) {
                        throw new Error('배치안 데이터가 없습니다. 먼저 배치안을 생성해주세요.');
                      }
                      if (!address) {
                        throw new Error('주소가 없습니다. 먼저 주소를 입력해주세요.');
                      }
                      const exportData = buildExportData({ address, siteAreaNum, branding, selectedLayoutData: selectedLayoutData!, layouts, feasibilityResult, marketPrice, regionalPricing, landPriceData, regulation, molitSupplementData, strategy, userValues, aiRenderImage: props.aiRenderImage, aiMultiImages: props.aiMultiImages, aiInteriorComparison: props.aiInteriorComparison });
                      const { downloadExcel } = await loadExportFunctions(); const result = downloadExcel(exportData);
                      if (!result.success) {
                        setDownloadError(result.error || '엑셀 다운로드 중 오류가 발생했습니다.');
                      } else {
                        toast.success('엑셀 다운로드 완료', { id: 'excel-dl' });
                      }
                    } catch (err) {
                      const errorMsg = err instanceof Error ? err.message : String(err);

                      if (errorMsg.includes('ChunkLoadError') || errorMsg.includes('Loading chunk') || errorMsg.includes('Failed to fetch dynamically imported module')) {
                        window.location.reload();
                        return;
                      }
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
                  onClick={async () => {
                    setDownloadError(null);
                    try {
                      if (!selectedLayoutData) {
                        throw new Error('배치안 데이터가 없습니다. 먼저 배치안을 생성해주세요.');
                      }
                      if (!address) {
                        throw new Error('주소가 없습니다. 먼저 주소를 입력해주세요.');
                      }
                      const exportData = buildExportData({ address, siteAreaNum, branding, selectedLayoutData: selectedLayoutData!, layouts, feasibilityResult, marketPrice, regionalPricing, landPriceData, regulation, molitSupplementData, strategy, userValues, aiRenderImage: props.aiRenderImage, aiMultiImages: props.aiMultiImages, aiInteriorComparison: props.aiInteriorComparison });
                      const { openPrintPreview } = await loadExportFunctions(); const result = openPrintPreview(exportData);
                      if (!result.success) {
                        setDownloadError(result.error || '인쇄 준비 중 오류가 발생했습니다.');
                      }
                    } catch (err) {
                      const errorMsg = err instanceof Error ? err.message : String(err);

                      if (errorMsg.includes('ChunkLoadError') || errorMsg.includes('Loading chunk') || errorMsg.includes('Failed to fetch dynamically imported module')) {
                        window.location.reload();
                        return;
                      }
                      console.error('[v0] 인쇄 오류:', errorMsg, err);
                      setDownloadError(`인쇄 준비 실패: ${errorMsg}`);
                    }
                  }}
                >
                  <Printer className="h-4 w-4" />
                  인쇄
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={async () => {
                    if (!selectedLayoutData || !feasibilityResult) return
                    try {
                      trackShareLink()
                      toast.loading('공유 링크 생성 중...', { id: 'share' })
                      const res = await fetch('/api/share', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          address,
                          siteArea: siteAreaNum,
                          zoneType: regulation?.zoneType || '',
                          layoutName: selectedLayoutData.name,
                          snapshotData: {
                            floors: selectedLayoutData.floors,
                            units: selectedLayoutData.units,
                            coverage: selectedLayoutData.coverage,
                            far: Math.round((selectedLayoutData.gfa / siteAreaNum) * 100) || Math.round((selectedLayoutData.gfa / siteAreaNum) * 100),
                            floorAreaRatio: Math.round((selectedLayoutData.gfa / siteAreaNum) * 100) || Math.round((selectedLayoutData.gfa / siteAreaNum) * 100),
                            gfa: selectedLayoutData.gfa,
                            feasibility: feasibilityResult,
                            roi: feasibilityResult?.roi,
                            totalProjectCost: feasibilityResult?.totalCost,
                            expectedProfit: feasibilityResult?.profit,
                          },
                        }),
                      })
                      const result = await res.json()
                      if (result.success) {
                        const shareUrl = `${window.location.origin}${result.shareUrl}`
                        const summary = `[Archi-Scan 사전검토]\n${address}\n배치안: ${selectedLayoutData.name}\nROI: ${feasibilityResult.roi?.toFixed(1)}%\n\n${shareUrl}`
                        if (navigator.share) {
                          await navigator.share({ title: 'Archi-Scan 보고서', text: summary, url: shareUrl })
                        } else {
                          await navigator.clipboard.writeText(shareUrl)
                          toast.success('공유 링크가 복사되었습니다', { id: 'share' })
                        }
                      } else {
                        // fallback: 텍스트 공유
                        const summary = `[Archi-Scan 사전검토]\n${address}\n배치안: ${selectedLayoutData.name}\nROI: ${feasibilityResult.roi?.toFixed(1)}%`
                        if (navigator.share) { await navigator.share({ title: 'Archi-Scan 보고서', text: summary }) }
                        else { await navigator.clipboard.writeText(summary); toast.success('보고서 요약이 복사되었습니다', { id: 'share' }) }
                      }
                    } catch {
                      toast.dismiss('share')
                    }
                  }}
                >
                  <Share2 className="h-4 w-4" />
                  공유
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
                  userValues={userValues}
                  designStrategy={strategy}
                  aiRenderImage={props.aiRenderImage}
                  aiMultiImages={props.aiMultiImages}
                  sitePolygon={props.sitePolygon}
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
          </div>  )
}
