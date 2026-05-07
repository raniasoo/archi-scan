"use client"

import { type Dispatch, type SetStateAction } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { ChevronRight, ChevronLeft, CheckCircle2, AlertCircle, ChevronDown } from "lucide-react"
import type { LayoutOption } from "@/app/page"
import type { ZoningRegulation } from "@/lib/regulation-types"
import type { DesignStrategy } from "@/lib/design-strategy"
import { safeNumber } from "@/lib/project-analysis-state"
import { useState } from "react"

const LoadingBox = () => <div className="flex items-center justify-center p-8 text-muted-foreground"><span className="animate-spin mr-2">⏳</span>로딩 중...</div>
const IsometricView = dynamic(() => import("@/components/isometric-view").then(m => ({ default: m.IsometricView })), { ssr: false, loading: LoadingBox })
const SectionView = dynamic(() => import("@/components/section-view").then(m => ({ default: m.SectionView })), { ssr: false, loading: LoadingBox })
const ElevationView = dynamic(() => import("@/components/elevation-view").then(m => ({ default: m.ElevationView })), { ssr: false, loading: LoadingBox })
const PerspectiveView = dynamic(() => import("@/components/perspective-view").then(m => ({ default: m.PerspectiveView })), { ssr: false, loading: LoadingBox })
const SitePlan = dynamic(() => import("@/components/site-plan").then(m => ({ default: m.SitePlan })), { ssr: false, loading: LoadingBox })
const AIFloorPlan = dynamic(() => import("@/components/ai-floorplan-renderer").then(m => ({ default: m.AIFloorPlan })), { ssr: false, loading: LoadingBox })

export interface FloorplanStepProps {
  selectedLayoutData: LayoutOption
  selectedFloor: number
  setSelectedFloor: Dispatch<SetStateAction<number>>
  drawingTab: "floor" | "site" | "iso" | "section" | "elevation" | "perspective" | "ai-generate"
  setDrawingTab: Dispatch<SetStateAction<"floor" | "site" | "iso" | "section" | "elevation" | "perspective" | "ai-generate">>
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

  const molit = molitSupplementData as {
    hasDistrictPlan?: boolean; zoneCode?: string; roadWidth?: number; heightLimit?: number
  }

  const [showInfo, setShowInfo] = useState(false)
  const totalFloors = safeNumber(selectedLayoutData.floors, selectedFloor)

  // 통합 탭 목록
  const tabs = [
    { id: "ai-generate" as const, label: "📐 평면도" },
    { id: "site" as const, label: "배치도" },
    { id: "iso" as const, label: "아이소" },
    { id: "perspective" as const, label: "투시도" },
    { id: "section" as const, label: "단면도" },
    { id: "elevation" as const, label: "입면도" },
  ]

  return (
    <div className="flex flex-col gap-3">
      {/* ━━━ 헤더: 배치안 정보 한 줄 ━━━ */}
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-foreground">평면도 검토</h2>
          <p className="text-[11px] text-muted-foreground truncate">
            {selectedLayoutData.name} · 지상 {selectedLayoutData.floors}층 · {selectedLayoutData.units}세대 · 주차 {selectedLayoutData.parking}대
          </p>
        </div>
        <button onClick={() => setShowInfo(!showInfo)} className="shrink-0 p-1.5 rounded-lg hover:bg-secondary/50">
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showInfo ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* ━━━ 접이식 상세 정보 ━━━ */}
      {showInfo && (
        <div className="grid grid-cols-4 gap-1.5 animate-in slide-in-from-top-2 duration-200">
          <div className="bg-secondary/30 border border-border rounded p-1.5 text-center">
            <p className="text-[9px] text-muted-foreground">세대수</p>
            <p className="text-xs font-semibold">{selectedLayoutData.units}세대</p>
          </div>
          <div className="bg-secondary/30 border border-border rounded p-1.5 text-center">
            <p className="text-[9px] text-muted-foreground">규모</p>
            <p className="text-xs font-semibold">지상{selectedLayoutData.floors}층</p>
          </div>
          <div className="bg-secondary/30 border border-border rounded p-1.5 text-center">
            <p className="text-[9px] text-muted-foreground">주차</p>
            <p className="text-xs font-semibold">{selectedLayoutData.parking}대</p>
          </div>
          <div className="bg-secondary/30 border border-border rounded p-1.5 text-center">
            <p className="text-[9px] text-muted-foreground">건폐율</p>
            <p className="text-xs font-semibold">{selectedLayoutData.coverage}%</p>
          </div>
        </div>
      )}

      {/* ━━━ 통합 도면 탭 ━━━ */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* 탭 바 */}
        <div className="flex border-b border-border overflow-x-auto scrollbar-hide">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setDrawingTab(tab.id)}
              className={`px-3 py-2.5 text-[11px] font-medium whitespace-nowrap transition-colors ${
                drawingTab === tab.id
                  ? "bg-primary/10 text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}>{tab.label}</button>
          ))}
        </div>

        {/* 도면 뷰어 */}
        <div className="p-3">
          {/* 평면도 */}
          {drawingTab === "ai-generate" && (
            <AIFloorPlan
              siteArea={siteAreaNum}
              buildingCoverage={selectedLayoutData.coverage}
              floors={selectedLayoutData.floors}
              units={selectedLayoutData.units}
              type={selectedLayoutData.type}
              layoutName={selectedLayoutData.name}
              address={address}
              zoneType={molit.zoneCode || regulation.zoneType}
              heightLimit={molit.heightLimit || regulation.maxHeight}
              setbacks={{
                front: molit.hasDistrictPlan ? 2 : 3,
                side: (molit.zoneCode || regulation.zoneType)?.includes('residential') ? 1.5 : 1,
                rear: (molit.zoneCode || regulation.zoneType)?.includes('residential') ? 2 : 1.5,
              }}
            />
          )}

          {/* 배치도 */}
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

          {/* 아이소메트릭 */}
          {drawingTab === "iso" && (
            <IsometricView siteArea={siteAreaNum} buildingCoverage={selectedLayoutData.coverage} floors={selectedLayoutData.floors} units={selectedLayoutData.units} type={selectedLayoutData.type} layoutName={selectedLayoutData.name} zoneType={molit.zoneCode || regulation.zoneType} />
          )}

          {/* 투시도 */}
          {drawingTab === "perspective" && (
            <PerspectiveView siteArea={siteAreaNum} buildingCoverage={selectedLayoutData.coverage} floors={selectedLayoutData.floors} units={selectedLayoutData.units} type={selectedLayoutData.type} layoutName={selectedLayoutData.name} zoneType={molit.zoneCode || regulation.zoneType} />
          )}

          {/* 단면도 */}
          {drawingTab === "section" && (
            <SectionView siteArea={siteAreaNum} buildingCoverage={selectedLayoutData.coverage} floors={selectedLayoutData.floors} units={selectedLayoutData.units} parking={selectedLayoutData.parking} heightLimit={molit.heightLimit || regulation.maxHeight} type={selectedLayoutData.type} layoutName={selectedLayoutData.name} roadWidth={molit.roadWidth || regulation.roadWidth || 8} hasDistrictPlan={molit.hasDistrictPlan ?? false} />
          )}

          {/* 입면도 */}
          {drawingTab === "elevation" && (
            <ElevationView siteArea={siteAreaNum} buildingCoverage={selectedLayoutData.coverage} floors={selectedLayoutData.floors} units={selectedLayoutData.units} type={selectedLayoutData.type} layoutName={selectedLayoutData.name} roadWidth={molit.roadWidth || regulation.roadWidth || 8} heightLimit={molit.heightLimit || regulation.maxHeight} />
          )}
        </div>
      </div>

      {/* ━━━ 액션 바 ━━━ */}
      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => setShowDxfPreview(true)}
          className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-blue-500/30 text-blue-400 bg-blue-500/5 hover:bg-blue-500/10 text-xs font-medium">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          DXF
        </button>
        <button onClick={() => setShow3DVolume(true)}
          className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-purple-500/30 text-purple-400 bg-purple-500/5 hover:bg-purple-500/10 text-xs font-medium">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
          3D
        </button>
        <Button onClick={() => setCurrentStep("financial")} size="sm" className="gap-1 text-xs h-auto py-2.5 rounded-xl">
          사업성
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
