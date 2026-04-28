"use client"

import { useState, useMemo } from "react"
import { SlidersHorizontal, TrendingUp, TrendingDown, Info, RotateCcw } from "lucide-react"
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

  const isDefault = salePriceAdj === 0 && constCostAdj === 0 && landPriceAdj === 0

  // calculateFeasibility와 100% 동일한 공식 사용
  const scenario = useMemo(() => {
    const adjLandPrice = landPricePerM2 * (1 + landPriceAdj / 100)
    const adjConstCost = 2500000 * (1 + constCostAdj / 100)
    const adjSalePrice = 8000000 * (1 + salePriceAdj / 100)

    return calculateFeasibility({
      siteArea, grossFloorArea: gfa, unitCount: units,
      floorCount: floors, parkingCount: parking,
      landPricePerM2: adjLandPrice,
      constructionCostPerM2: adjConstCost,
      salesPricePerM2: adjSalePrice,
    })
  }, [siteArea, gfa, units, floors, parking, landPricePerM2, salePriceAdj, constCostAdj, landPriceAdj])

  // 기본값일 때는 상위 계산 결과를 그대로 사용하여 불일치 방지
  const displayROI = isDefault ? baseROI : scenario.roi
  const displayProfit = isDefault ? baseProfit : scenario.profit
  const displayTotalCost = isDefault ? baseTotalCost : scenario.totalCost
  const roiDiff = displayROI - baseROI
  const roiColor = displayROI >= 15 ? "text-emerald-400" : displayROI >= 5 ? "text-blue-400" : displayROI >= 0 ? "text-orange-400" : "text-red-400"

  // 손익분기 분양률
  const revenue = isDefault ? (baseTotalCost + baseProfit) : scenario.totalRevenue
  const safeBreakEven = revenue > 0 ? Math.min((displayTotalCost / revenue) * 100, 999) : 100

  const sliders = [
    { label: "분양가", value: salePriceAdj, set: setSalePriceAdj, min: -20, max: 30, step: 1, color: "#3b82f6" },
    { label: "공사비", value: constCostAdj, set: setConstCostAdj, min: -15, max: 30, step: 1, color: "#f59e0b" },
    { label: "토지비", value: landPriceAdj, set: setLandPriceAdj, min: -20, max: 30, step: 1, color: "#8b5cf6" },
  ]

  const reset = () => { setSalePriceAdj(0); setConstCostAdj(0); setLandPriceAdj(0) }

  // 비용 구성
  const tc = displayTotalCost || 1
  const lc = siteArea * landPricePerM2 * (1 + landPriceAdj / 100)
  const landRatio = (lc / tc) * 100
  const constRatio = (scenario.constructionCost / tc) * 100
  const otherRatio = Math.max(0, 100 - landRatio - constRatio)

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">사업성 시나리오 시뮬레이션</span>
          </div>
          {!isDefault && (
            <button onClick={reset} className="text-[10px] px-2 py-1 rounded bg-secondary text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              <RotateCcw className="h-3 w-3" />
              초기화
            </button>
          )}
        </div>
        {isDefault && (
          <p className="text-[10px] text-muted-foreground mt-1">슬라이더를 조정하면 위 사업성 수치가 어떻게 변하는지 확인할 수 있습니다.</p>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* 결과 카드 */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-secondary/30 p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-1">시나리오 ROI</p>
            <p className={`text-lg font-bold ${roiColor}`}>{displayROI.toFixed(1)}%</p>
            {!isDefault && (
              <p className={`text-[10px] mt-0.5 ${roiDiff >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {roiDiff >= 0 ? <TrendingUp className="inline h-3 w-3 mr-0.5" /> : <TrendingDown className="inline h-3 w-3 mr-0.5" />}
                {roiDiff >= 0 ? "+" : ""}{roiDiff.toFixed(1)}%p
              </p>
            )}
            {isDefault && <p className="text-[10px] mt-0.5 text-muted-foreground">기본값</p>}
          </div>
          <div className="rounded-lg bg-secondary/30 p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-1">예상수익</p>
            <p className={`text-lg font-bold ${displayProfit >= 0 ? "text-foreground" : "text-red-400"}`}>
              {(displayProfit / 1e8).toFixed(1)}억
            </p>
          </div>
          <div className="rounded-lg bg-secondary/30 p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-1">손익분기 분양률</p>
            <p className={`text-lg font-bold ${safeBreakEven <= 85 ? "text-emerald-400" : safeBreakEven <= 95 ? "text-orange-400" : "text-red-400"}`}>
              {safeBreakEven.toFixed(0)}%
            </p>
          </div>
        </div>

        {/* 슬라이더 */}
        <div className="space-y-3">
          {sliders.map((s) => (
            <div key={s.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
                <span className={`text-xs font-bold ${s.value === 0 ? "text-muted-foreground" : ""}`} style={s.value !== 0 ? { color: s.color } : undefined}>
                  {s.value === 0 ? "+0%" : `${s.value >= 0 ? "+" : ""}${s.value}%`}
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

        {/* 비용 구성 바 */}
        <div className="rounded-lg bg-secondary/20 p-3">
          <p className="text-[10px] text-muted-foreground flex items-center gap-1 mb-1.5">
            <Info className="h-3 w-3" /> 비용 구성
          </p>
          <div className="h-3 rounded-full overflow-hidden flex">
            <div style={{ width: `${landRatio}%`, backgroundColor: "#3b82f6" }} />
            <div style={{ width: `${constRatio}%`, backgroundColor: "#f59e0b" }} />
            <div style={{ width: `${otherRatio}%`, backgroundColor: "#ef4444" }} />
          </div>
          <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
            <span>토지 {landRatio.toFixed(0)}%</span>
            <span>공사 {constRatio.toFixed(0)}%</span>
            <span>기타 {otherRatio.toFixed(0)}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
