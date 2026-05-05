"use client"

import { type Dispatch, type SetStateAction } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronRight, ChevronLeft, Maximize2, Minimize2, CheckCircle2, AlertCircle } from "lucide-react"
import type { LayoutOption } from "@/app/page"
import type { ZoningRegulation } from "@/lib/regulation-types"
import type { DesignStrategy } from "@/lib/design-strategy"
import { safeNumber } from "@/lib/project-analysis-state"

const LoadingBox = () => <div className="flex items-center justify-center p-8 text-muted-foreground"><span className="animate-spin mr-2">⏳</span>로딩 중...</div>
const FloorPlan = dynamic(() => import("@/components/floor-plan").then(m => ({ default: m.FloorPlan })), { ssr: false, loading: LoadingBox })
const IsometricView = dynamic(() => import("@/components/isometric-view").then(m => ({ default: m.IsometricView })), { ssr: false, loading: LoadingBox })
const SectionView = dynamic(() => import("@/components/section-view").then(m => ({ default: m.SectionView })), { ssr: false, loading: LoadingBox })
const ElevationView = dynamic(() => import("@/components/elevation-view").then(m => ({ default: m.ElevationView })), { ssr: false, loading: LoadingBox })
const PerspectiveView = dynamic(() => import("@/components/perspective-view").then(m => ({ default: m.PerspectiveView })), { ssr: false, loading: LoadingBox })
const SitePlan = dynamic(() => import("@/components/site-plan").then(m => ({ default: m.SitePlan })), { ssr: false, loading: LoadingBox })

export interface FloorplanStepProps {
  selectedLayoutData: LayoutOption
  selectedFloor: number
  setSelectedFloor: Dispatch<SetStateAction<number>>
  drawingTab: "floor" | "site" | "iso" | "section" | "elevation" | "perspective"
  setDrawingTab: Dispatch<SetStateAction<"floor" | "site" | "iso" | "section" | "elevation" | "perspective">>
  floorPlanViewMode: "fit" | "original"
  setFloorPlanViewMode: Dispatch<SetStateAction<"fit" | "original">>
  isFloorPlanFullscreen: boolean
  setIsFloorPlanFullscreen: Dispatch<SetStateAction<boolean>>
  setShowDxfPreview: Dispatch<SetStateAction<boolean>>
  setShow3DVolume: Dispatch<SetStateAction<boolean>>
  setCurrentStep: Dispatch<SetStateAction<any>>
  address: string
  siteArea: string
  siteAreaNum: number
  regulation: ZoningRegulation
  strategy: DesignStrategy
  gfa: number
  sitePolygon: { coords: [number, number][], centroid: [number, number] } | null
  molitSupplementData: Record<string, unknown>
  loadDxfGenerator: () => Promise<any>
}

export function FloorplanStep(props: FloorplanStepProps) {
  const {
    selectedLayoutData, selectedFloor, setSelectedFloor,
    drawingTab, setDrawingTab, floorPlanViewMode, setFloorPlanViewMode,
    isFloorPlanFullscreen, setIsFloorPlanFullscreen,
    setShowDxfPreview, setShow3DVolume, setCurrentStep,
    address, siteArea, siteAreaNum, regulation, strategy, gfa,
    sitePolygon, molitSupplementData, loadDxfGenerator,
  } = props

  // Type-safe access to molit supplement data
  const molit = molitSupplementData as {
    hasDistrictPlan?: boolean; zoneCode?: string; roadWidth?: number; heightLimit?: number
  }

  return (
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
                          zoneType={molit.zoneCode || regulation.zoneType}
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
                          zoneType={molit.zoneCode || regulation.zoneType}
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
                          zoneType={molit.zoneCode || regulation.zoneType}
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
                  onClick={async () => {
                    const { generateFloorPlanDXF, downloadDXF } = await loadDxfGenerator()
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
                        front: molit.hasDistrictPlan ? 2 : 1,
                        side: (molit.zoneCode || regulation.zoneType)?.includes('residential') ? 1 : 0.5,
                        rear: (molit.zoneCode || regulation.zoneType)?.includes('residential') ? 1.5 : 1,
                      }}
                      landscapingRatio={siteAreaNum >= 200 ? 15 : 0}
                      roadWidth={molit.roadWidth || regulation.roadWidth || 8}
                      hasDistrictPlan={molit.hasDistrictPlan ?? false}
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
                      zoneType={molit.zoneCode || regulation.zoneType}
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
                      zoneType={molit.zoneCode || regulation.zoneType}
                    />
                  )}
                  {drawingTab === "section" && (
                    <SectionView
                      siteArea={siteAreaNum}
                      buildingCoverage={selectedLayoutData.coverage}
                      floors={selectedLayoutData.floors}
                      units={selectedLayoutData.units}
                      parking={selectedLayoutData.parking}
                      heightLimit={molit.heightLimit || regulation.maxHeight}
                      type={selectedLayoutData.type}
                      layoutName={selectedLayoutData.name}
                      roadWidth={molit.roadWidth || regulation.roadWidth || 8}
                      hasDistrictPlan={molit.hasDistrictPlan ?? false}
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
                      roadWidth={molit.roadWidth || regulation.roadWidth || 8}
                      heightLimit={molit.heightLimit || regulation.maxHeight}
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
  )
}
