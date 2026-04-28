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
  // 실제 사업성 기준값
  baseROI: number
  baseTotalCost: number
  baseProfit: number
  baseSalesPricePerM2?: number
  baseConstructionCostPerM2?: number
}

export function ScenarioSlider({
  siteArea, gfa, units, floors, parking,
  landPricePerM2, baseROI, baseTotalCost, baseProfit,
  baseSalesPricePerM2 = 8000000, baseConstructionCostPerM2 = 2500000,
}: ScenarioSliderProps) {
  const [salePriceAdj, setSalePriceAdj] = useState(0)
  const [constCostAdj, setConstCostAdj] = useState(0)
  const [landPriceAdj, setLandPriceAdj] = useState(0)
  const [interestAdj, setInterestAdj] = useState(0) // 금융비용 조정 %

  // calculateFeasibility와 동일한 계산 사용
  const scenario = useMemo(() => {
    const adjLandPrice = landPricePerM2 * (1 + landPriceAdj / 100)
    const adjSalesPrice = baseSalesPricePerM2 * (1 + salePriceAdj / 100)
    const adjConstCost = baseConstructionCostPerM2 * (1 + constCostAdj / 100)

    const result = calculateFeasibility({
      siteArea, grossFloorArea: gfa, unitCount: units,
      floorCount: floors, parkingCount: parking,
      landPricePerM2: adjLandPrice,
      salesPricePerM2: adjSalesPrice,
      constructionCostPerM2: adjConstCost,
    })

    // 금융비용 조정 반영
    const interestDelta = result.totalCost * (interestAdj / 100) * 0.3
    const adjProfit = result.profit - interestDelta
    const adjTotalCost = result.totalCost + interestDelta
    const adjROI = adjTotalCost > 0 ? (adjProfit / adjTotalCost) * 100 : 0
    const adjBreakEven = result.totalRevenue > 0 ? (adjTotalCost / result.totalRevenue) * 100 : 100

    return {
      ...result,
      profit: adjProfit,
      totalCost: adjTotalCost,
      roi: adjROI,
      breakEvenRate: adjBreakEven,
      interestDelta,
    }
  }, [siteArea, gfa, units, floors, parking, landPricePerM2, salePriceAdj, constCostAdj, landPriceAdj, interestAdj, baseSalesPricePerM2, baseConstructionCostPerM2])

  const roiDiff = scenario.roi - baseROI
  const roiColor = scenario.roi >= 15 ? "text-emerald-400" : scenario.roi >= 5 ? "text-blue-400" : scenario.roi >= 0 ? "text-yellow-400" : "text-red-400"

  const sliders = [
    { label: "분양가 조정", value: salePriceAdj, set: setSalePriceAdj, min: -20, max: 30, step: 1, unit: "%", color: "#3b82f6", desc: `${(baseSalesPricePerM2/10000).toFixed(0)}만원/㎡ 기준` },
    { label: "공사비 조정", value: constCostAdj, set: setConstCostAdj, min: -15, max: 30, step: 1, unit: "%", color: "#f59e0b", desc: `${(baseConstructionCostPerM2/10000).toFixed(0)}만원/㎡ 기준` },
    { label: "토지비 조정", value: landPriceAdj, set: setLandPriceAdj, min: -20, max: 30, step: 1, unit: "%", color: "#8b5cf6", desc: `${(landPricePerM2/10000).toFixed(0)}만원/㎡ 기준` },
    { label: "금융비용 조정", value: interestAdj, set: setInterestAdj, min: -5, max: 10, step: 0.5, unit: "%p", color: "#ef4444", desc: "기본 금융비용 대비" },
  ]

  const reset = () => { setSalePriceAdj(0); setConstCostAdj(0); setLandPriceAdj(0); setInterestAdj(0) }
  const isDefault = salePriceAdj === 0 && constCostAdj === 0 && landPriceAdj === 0 && interestAdj === 0

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">시나리오 시뮬레이션</span>
          </div>
          {!isDefault && (
            <button onClick={reset} className="text-[10px] px-2 py-1 rounded bg-secondary text-muted-foreground hover:text-foreground transition-colors">
              초기화
            </button>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">슬라이더를 조절하면 현재 사업성 기준으로 수치가 변동됩니다</p>
      </div>

      <div className="p-4 space-y-4">
        {/* 결과 — 기본값이면 현재 사업성과 동일 표시 */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-secondary/30 p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-1">ROI</p>
            <p className={`text-lg font-bold ${roiColor}`}>{scenario.roi.toFixed(1)}%</p>
            {!isDefault && (
              <p className={`text-[10px] mt-0.5 ${roiDiff >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {roiDiff >= 0 ? <TrendingUp className="inline h-3 w-3 mr-0.5" /> : <TrendingDown className="inline h-3 w-3 mr-0.5" />}
                {roiDiff >= 0 ? "+" : ""}{roiDiff.toFixed(1)}%p
              </p>
            )}
            {isDefault && <p className="text-[10px] text-muted-foreground mt-0.5">현재 기준</p>}
          </div>
          <div className="rounded-lg bg-secondary/30 p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-1">예상수익</p>
            <p className={`text-lg font-bold ${scenario.profit >= 0 ? "text-foreground" : "text-red-400"}`}>
              {Math.abs(scenario.profit) >= 1e8 ? `${(scenario.profit / 1e8).toFixed(1)}억` : `${(scenario.profit / 1e4).toFixed(0)}만`}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              사업비 {(scenario.totalCost / 1e8).toFixed(1)}억
            </p>
          </div>
          <div className="rounded-lg bg-secondary/30 p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-1">손익분기</p>
            <p className={`text-lg font-bold ${scenario.breakEvenRate <= 85 ? "text-emerald-400" : scenario.breakEvenRate <= 100 ? "text-yellow-400" : "text-red-400"}`}>
              {scenario.breakEvenRate.toFixed(0)}%
            </p>
            {scenario.breakEvenRate > 100 && (
              <p className="text-[10px] text-red-400 mt-0.5 flex items-center justify-center gap-0.5">
                <AlertTriangle className="h-3 w-3" /> 적자
              </p>
            )}
          </div>
        </div>

        {/* 슬라이더 */}
        <div className="space-y-3">
          {sliders.map((s) => (
            <div key={s.label}>
              <div className="flex items-center justify-between mb-1">
                <div>
                  <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
                  <span className="text-[9px] text-muted-foreground/60 ml-1.5">{s.desc}</span>
                </div>
                <span className="text-xs font-bold" style={{ color: s.value !== 0 ? s.color : undefined }}>
                  {s.value >= 0 ? "+" : ""}{s.value}{s.unit}
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
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
