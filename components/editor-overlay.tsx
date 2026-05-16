/**
 * 3D 뷰 인터랙티브 편집 오버레이
 * 
 * building-volume-3d.tsx 위에 오버레이로 표시
 * 편집 모드 활성화 시 실시간 법규/일조/ROI 메트릭 표시
 */

"use client"

import { useState, useEffect, useMemo } from "react"
import { Move, X, Sun, Building2, Scale, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react"
import { createLayoutEditor, type LiveMetrics } from "@/lib/interactive-editor"
import { toSiteGeometry, toLegalConstraints } from "@/lib/constraint-solver"

interface EditorOverlayProps {
  siteArea: number
  coverage: number
  floors: number
  units: number
  buildingType: string
  zoneType: string
  maxCoverage: number
  maxFAR: number
  maxHeight: number
  maxFloors: number
  roadWidth: number
  parkingRatio: number
  onClose: () => void
}

export function EditorOverlay({
  siteArea, coverage, floors, units, buildingType,
  zoneType, maxCoverage, maxFAR, maxHeight, maxFloors,
  roadWidth, parkingRatio, onClose,
}: EditorOverlayProps) {
  const [metrics, setMetrics] = useState<LiveMetrics | null>(null)
  const [adjustedFloors, setAdjustedFloors] = useState(floors)
  const [adjustedCoverage, setAdjustedCoverage] = useState(coverage)
  
  const editor = useMemo(() => {
    const site = toSiteGeometry(siteArea, roadWidth)
    const legal = toLegalConstraints({
      maxCoverageRatio: maxCoverage,
      maxFloorAreaRatio: maxFAR,
      maxHeight,
      maxFloors,
      roadWidth,
      parkingRatio,
      zoneType,
    })
    return createLayoutEditor(site, legal)
  }, [siteArea, maxCoverage, maxFAR, maxHeight, maxFloors, roadWidth, parkingRatio, zoneType])
  
  // 건물 등록 및 메트릭 계산
  useEffect(() => {
    const buildingArea = siteArea * adjustedCoverage / 100
    const bW = Math.sqrt(buildingArea * 1.3)
    const bD = buildingArea / bW
    
    editor.clearBuildings()
    editor.addBuilding({
      id: 'main',
      meshId: 'main-mesh',
      label: 'A동',
      x: 0,
      z: 0,
      width: bW,
      depth: bD,
      floors: adjustedFloors,
      height: adjustedFloors * 3.3,
    })
    
    const unsubscribe = editor.onUpdate((m) => setMetrics(m))
    const m = editor.validateAll()
    setMetrics(m)
    
    return unsubscribe
  }, [adjustedFloors, adjustedCoverage, editor, siteArea])

  if (!metrics) return null

  const isCompliant = metrics.isLegallyCompliant
  const scoreColor = isCompliant ? 'text-emerald-400' : 'text-red-400'
  const score = editor.getOptimizationScore()

  return (
    <div className="absolute inset-0 z-20 pointer-events-none">
      {/* 상단 바 */}
      <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-border shadow-lg">
          <Move className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold">실시간 편집</span>
          <span className={`text-xs font-bold ${scoreColor}`}>{score}점</span>
        </div>
        <button onClick={onClose} className="bg-background/90 backdrop-blur-sm rounded-lg p-1.5 border border-border shadow-lg pointer-events-auto">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* 슬라이더 패널 (좌측) */}
      <div className="absolute left-2 top-14 w-44 bg-background/95 backdrop-blur-sm rounded-xl border border-border shadow-xl p-3 space-y-3 pointer-events-auto">
        <div>
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="text-muted-foreground">층수</span>
            <span className="font-bold">{adjustedFloors}층</span>
          </div>
          <input type="range" min={2} max={maxFloors} value={adjustedFloors}
            onChange={e => setAdjustedFloors(Number(e.target.value))}
            className="w-full h-1.5 accent-primary" />
        </div>
        <div>
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="text-muted-foreground">건폐율</span>
            <span className="font-bold">{adjustedCoverage}%</span>
          </div>
          <input type="range" min={20} max={maxCoverage} value={adjustedCoverage}
            onChange={e => setAdjustedCoverage(Number(e.target.value))}
            className="w-full h-1.5 accent-primary" />
        </div>
      </div>

      {/* 실시간 메트릭 (하단) */}
      <div className="absolute bottom-2 left-2 right-2 pointer-events-auto">
        <div className="bg-background/95 backdrop-blur-sm rounded-xl border border-border shadow-xl p-3">
          {/* 법규 상태 배너 */}
          {!isCompliant && (
            <div className="flex items-center gap-1.5 mb-2 px-2 py-1 rounded-md bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="h-3 w-3 text-red-400 shrink-0" />
              <span className="text-[10px] text-red-400 line-clamp-1">{metrics.violations[0]}</span>
            </div>
          )}
          {isCompliant && (
            <div className="flex items-center gap-1.5 mb-2 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
              <span className="text-[10px] text-emerald-400">전체 법규 준수</span>
            </div>
          )}
          
          {/* 6칸 메트릭 그리드 */}
          <div className="grid grid-cols-6 gap-1.5">
            <div className="text-center rounded-md bg-secondary/30 py-1.5">
              <Scale className="h-3 w-3 mx-auto mb-0.5 text-blue-400" />
              <p className="text-[8px] text-muted-foreground">건폐율</p>
              <p className={`text-[11px] font-bold ${metrics.coverageRatio > maxCoverage ? 'text-red-400' : 'text-foreground'}`}>
                {metrics.coverageRatio}%
              </p>
            </div>
            <div className="text-center rounded-md bg-secondary/30 py-1.5">
              <Building2 className="h-3 w-3 mx-auto mb-0.5 text-violet-400" />
              <p className="text-[8px] text-muted-foreground">용적률</p>
              <p className={`text-[11px] font-bold ${metrics.floorAreaRatio > maxFAR ? 'text-red-400' : 'text-foreground'}`}>
                {metrics.floorAreaRatio}%
              </p>
            </div>
            <div className="text-center rounded-md bg-secondary/30 py-1.5">
              <Sun className="h-3 w-3 mx-auto mb-0.5 text-amber-400" />
              <p className="text-[8px] text-muted-foreground">일조</p>
              <p className={`text-[11px] font-bold ${metrics.winterSunlightHours < 4 ? 'text-amber-400' : 'text-foreground'}`}>
                {metrics.winterSunlightHours}h
              </p>
            </div>
            <div className="text-center rounded-md bg-secondary/30 py-1.5">
              <p className="text-[8px] text-muted-foreground mt-1">사선</p>
              <p className={`text-[11px] font-bold ${metrics.solarViolation ? 'text-red-400' : 'text-emerald-400'}`}>
                {metrics.solarViolation ? '위반' : `${metrics.northSolarMaxHeight}m`}
              </p>
            </div>
            <div className="text-center rounded-md bg-secondary/30 py-1.5">
              <p className="text-[8px] text-muted-foreground mt-1">세대</p>
              <p className="text-[11px] font-bold">{metrics.units}</p>
            </div>
            <div className="text-center rounded-md bg-secondary/30 py-1.5">
              <TrendingUp className="h-3 w-3 mx-auto mb-0.5 text-emerald-400" />
              <p className="text-[8px] text-muted-foreground">ROI</p>
              <p className={`text-[11px] font-bold ${metrics.estimatedROI >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {metrics.estimatedROI}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
