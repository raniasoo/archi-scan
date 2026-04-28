"use client"

import { useState, useMemo } from "react"
import { SlidersHorizontal, TrendingUp, TrendingDown, AlertTriangle, Info } from "lucide-react"
import { calculateFeasibility } from "@/lib/project-analysis-state"

interface ScenarioSliderProps {
  siteArea: number
  gfa: number
  units: number
  floors: number
  parking: number
  landPricePerM2: number
  baseROI: number
  baseTotalCost: number
  baseProfit: number
}

export function ScenarioSlider({
  siteArea, gfa, units, floors, parking,
  landPricePerM2, baseROI, baseTotalCost, baseProfit,
}: ScenarioSliderProps) {
  const [salePriceAdj, setSalePriceAdj] = useState(0)
  const [constCostAdj, setConstCostAdj] = useState(0)
  const [landPriceAdj, setLandPriceAdj] = useState(0)

  // calculateFeasibility와 동일한 공식 사용
  const scenario = useMemo(() => {
    const adjLandPrice = landPricePerM2 * (1 + landPriceAdj / 100)
    const adjConstCost = 2500000 * (1 + constCostAdj / 100) // calculateFeasibility 기본값
    const adjSalePrice = 8000000 * (1 + salePriceAdj / 100) // calculateFeasibility 기본값

    const result = calculateFeasibility({
      siteArea, grossFloorArea: gfa, unitCount: units,
      floorCount: floors, parkingCount: parking,
      landPricePerM2: adjLandPrice,
      constructionCostPerM2: adjConstCost,
      salesPricePerM2: adjSalePrice,
    })

    return result
  }, [siteArea, gfa, units, floors, parking, landPricePerM2, salePriceAdj, constCostAdj, landPriceAdj])

  const roiDiff = scenario.roi - baseROI
  const roiColor = scenario.roi >= 15 ? "text-emerald-400" : scenario.roi >= 5 ? "text-blue-400" : scenario.roi >= 0 ? "text-orange-400" : "text-red-400"

  const sliders = [
    { label: "분양가 조정", value: salePriceAdj, set: setSalePriceAdj, min: -20, max: 30, step: 1, unit: "%", color: "#3b82f6" },
    { label: "공사비 조정", value: constCostAdj, set: setConstCostAdj, min: -15, max: 30, step: 1, unit: "%", color: "#f59e0b" },
    { label: "토지비 조정", value: landPriceAdj, set: setLandPriceAdj, min: -20, max: 30, step: 1, unit: "%", color: "#8b5cf6" },
  ]

  const reset = () => { setSalePriceAdj(0); setConstCostAdj(0); setLandPriceAdj(0) }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">시나리오 시뮬레이션</span>
          </div>
          <button onClick={reset} className="text-[10px] px-2 py-1 rounded bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            초기화
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">※ 위 사업성 검토와 동일한 계산식 기반 — 조건 변경 시 ROI 변화를 확인합니다.</p>
      </div>

      <div className="p-4 space-y-4">
        {/* 결과 카드 */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-secondary/30 p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-1">시나리오 ROI</p>
            <p className={`text-lg font-bold ${roiColor}`}>{scenario.roi.toFixed(1)}%</p>
            <p className={`text-[10px] mt-0.5 ${roiDiff >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {roiDiff >= 0 ? <TrendingUp className="inline h-3 w-3 mr-0.5" /> : <TrendingDown className="inline h-3 w-3 mr-0.5" />}
              {roiDiff >= 0 ? "+" : ""}{roiDiff.toFixed(1)}%p
            </p>
          </div>
          <div className="rounded-lg bg-secondary/30 p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-1">예상수익</p>
            <p className={`text-lg font-bold ${scenario.profit >= 0 ? "text-foreground" : "text-red-400"}`}>
              {(scenario.profit / 1e8).toFixed(1)}억
            </p>
          </div>
          <div className="rounded-lg bg-secondary/30 p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-1">총사업비</p>
            <p className="text-lg font-bold text-foreground">
              {(scenario.totalCost / 1e8).toFixed(1)}억
            </p>
          </div>
        </div>

        {/* 슬라이더 */}
        <div className="space-y-3">
          {sliders.map((s) => (
            <div key={s.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
                <span className="text-xs font-bold" style={{ color: s.color }}>
                  {(s.value >= 0 ? "+" : "") + s.value}{s.unit}
                </span>
              </div>
              <input
                type="range" min={s.min} max={s.max} step={s.step} value={s.value}
                onChange={(e) => s.set(Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, ${s.color} 0%, ${s.color} ${((s.value - s.min) / (s.max - s.min)) * 100}%, hsl(var(--secondary)) ${((s.value - s.min) / (s.max - s.min)) * 100}%, hsl(var(--secondary)) 100%)`,
                }}
              />
              <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
                <span>{s.min}%</span><span>+{s.max}%</span>
              </div>
            </div>
          ))}
        </div>

        {/* 기준값 안내 */}
        <div className="rounded-lg bg-secondary/20 p-3">
          <p className="text-[10px] text-muted-foreground flex items-center gap-1 mb-1.5">
            <Info className="h-3 w-3" /> 현재 기준 단가
          </p>
          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <div><span className="text-muted-foreground">분양가:</span> <span className="text-foreground font-medium">{(8000000 * (1 + salePriceAdj / 100) / 10000).toFixed(0)}만/㎡</span></div>
            <div><span className="text-muted-foreground">공사비:</span> <span className="text-foreground font-medium">{(2500000 * (1 + constCostAdj / 100) / 10000).toFixed(0)}만/㎡</span></div>
            <div><span className="text-muted-foreground">토지비:</span> <span className="text-foreground font-medium">{(landPricePerM2 * (1 + landPriceAdj / 100) / 10000).toFixed(0)}만/㎡</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}
