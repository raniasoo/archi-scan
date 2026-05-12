"use client"

import { useState, useMemo } from "react"
import { SlidersHorizontal, TrendingUp, TrendingDown, Info } from "lucide-react"
import { calculateFeasibility } from "@/lib/project-analysis-state"

interface ScenarioSliderProps {
  siteArea: number
  gfa: number
  units: number
  floors: number
  parking: number
  buildingCount?: number
  landPricePerM2: number
  salesPricePerM2?: number
  constructionCostPerM2?: number
  baseROI: number
  baseTotalCost: number
  baseProfit: number
}

export function ScenarioSlider({
  siteArea, gfa, units, floors, parking,
  landPricePerM2, salesPricePerM2, constructionCostPerM2, baseROI, baseTotalCost, baseProfit,
}: ScenarioSliderProps) {
  const [salePriceAdj, setSalePriceAdj] = useState(0)
  const [constCostAdj, setConstCostAdj] = useState(0)
  const [landPriceAdj, setLandPriceAdj] = useState(0)
  const [interestRate, setInterestRate] = useState(0) // 금리 (연 %, 0=금융비 미적용)

  const baseSalePrice = salesPricePerM2 || 5000000
  const baseConstCost = constructionCostPerM2 || 2500000

  // 기준 feasibility (0%일 때 위 사업성과 동일)
  const baseFeasibility = useMemo(() => calculateFeasibility({
    siteArea, grossFloorArea: gfa, unitCount: units,
    floorCount: floors, parkingCount: parking, buildingCount: buildingCount || 1,
    landPricePerM2,
    salesPricePerM2: baseSalePrice,
    constructionCostPerM2: baseConstCost,
  }), [siteArea, gfa, units, floors, parking, landPricePerM2, baseSalePrice, baseConstCost])

  const isChanged = salePriceAdj !== 0 || constCostAdj !== 0 || landPriceAdj !== 0 || interestRate > 0

  // 조정된 feasibility — 슬라이더 0%일 때 사업성 탭의 값을 그대로 사용
  const scenario = useMemo(() => {
    const noAdj = salePriceAdj === 0 && constCostAdj === 0 && landPriceAdj === 0 && interestRate === 0
    if (noAdj) {
      // 슬라이더 미조정 → 사업성 탭에서 전달받은 값 직접 사용 (ROI 일치 보장)
      return { ...baseFeasibility, roi: baseROI, totalCost: baseTotalCost || baseFeasibility.totalCost, profit: baseProfit, financeCost: 0 }
    }
    const base = calculateFeasibility({
      siteArea, grossFloorArea: gfa, unitCount: units,
      floorCount: floors, parkingCount: parking, buildingCount: buildingCount || 1,
      landPricePerM2: landPricePerM2 * (1 + landPriceAdj / 100),
      constructionCostPerM2: baseConstCost * (1 + constCostAdj / 100),
      salesPricePerM2: baseSalePrice * (1 + salePriceAdj / 100),
    })
    // 금리 적용 시 금융비용 추가
    if (interestRate > 0) {
      const financeCost = base.totalCost * (interestRate / 100) * 2.5 // 2.5년 사업기간
      const adjTotalCost = base.totalCost + financeCost
      const adjProfit = base.totalRevenue - adjTotalCost
      const adjROI = adjTotalCost > 0 ? (adjProfit / adjTotalCost) * 100 : 0
      return { ...base, totalCost: adjTotalCost, profit: adjProfit, roi: adjROI, financeCost }
    }
    return { ...base, financeCost: 0 }
  }, [siteArea, gfa, units, floors, parking, landPricePerM2, salePriceAdj, constCostAdj, landPriceAdj, interestRate, baseFeasibility, baseROI, baseTotalCost, baseProfit])

  const roiDiff = scenario.roi - baseROI
  const profitDiff = scenario.profit - baseProfit
  const roiColor = scenario.roi >= 15 ? "text-emerald-400" : scenario.roi >= 5 ? "text-blue-400" : scenario.roi >= 0 ? "text-orange-400" : "text-red-400"

  const sliders = [
    { label: "분양가", value: salePriceAdj, set: setSalePriceAdj, min: -20, max: 30, step: 1, color: "#3b82f6", unit: "%" },
    { label: "공사비", value: constCostAdj, set: setConstCostAdj, min: -15, max: 30, step: 1, color: "#f59e0b", unit: "%" },
    { label: "토지비", value: landPriceAdj, set: setLandPriceAdj, min: -20, max: 30, step: 1, color: "#8b5cf6", unit: "%" },
    { label: "금리 (연)", value: interestRate, set: setInterestRate, min: 0, max: 8, step: 0.5, color: "#ef4444", unit: "%", isAbsolute: true },
  ]

  const reset = () => { setSalePriceAdj(0); setConstCostAdj(0); setLandPriceAdj(0); setInterestRate(0) }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">사업성 시나리오 시뮬레이션</span>
          </div>
          {isChanged && (
            <button onClick={reset} className="text-[10px] px-2 py-1 rounded bg-secondary text-muted-foreground hover:text-foreground transition-colors">
              초기화
            </button>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">슬라이더를 조정하면 위 사업성 수치가 어떻게 변하는지 확인할 수 있습니다.</p>
      </div>

      <div className="p-4 space-y-4">
        {/* 결과 카드 — 항상 표시 */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-secondary/30 p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-1">시나리오 ROI</p>
            <p className={`text-lg font-bold ${roiColor}`}>{scenario.roi.toFixed(1)}%</p>
            {isChanged && (
              <p className={`text-[10px] mt-0.5 ${roiDiff >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {roiDiff >= 0 ? <TrendingUp className="inline h-3 w-3 mr-0.5" /> : <TrendingDown className="inline h-3 w-3 mr-0.5" />}
                {roiDiff >= 0 ? "+" : ""}{roiDiff.toFixed(1)}%p
              </p>
            )}
            {!isChanged && <p className="text-[10px] text-muted-foreground mt-0.5">기본값</p>}
          </div>
          <div className="rounded-lg bg-secondary/30 p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-1">예상수익</p>
            <p className={`text-lg font-bold ${scenario.profit >= 0 ? "text-foreground" : "text-red-400"}`}>
              {Math.abs(scenario.profit) >= 1e12 ? `${(scenario.profit / 1e12).toFixed(1)}조` : `${(scenario.profit / 1e8).toFixed(1)}억`}
            </p>
          </div>
          <div className="rounded-lg bg-secondary/30 p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-1">손익분기 분양률</p>
            <p className={`text-lg font-bold ${scenario.totalRevenue > 0 && (scenario.totalCost / scenario.totalRevenue * 100) <= 90 ? "text-emerald-400" : (scenario.totalCost / scenario.totalRevenue * 100) <= 100 ? "text-orange-400" : "text-red-400"}`}>
              {scenario.totalRevenue > 0 ? (scenario.totalCost / scenario.totalRevenue * 100).toFixed(0) : "N/A"}%
            </p>
          </div>
        </div>

        {/* 슬라이더 */}
        <div className="space-y-3">
          {sliders.map((s) => {
            const pct = ((s.value - s.min) / (s.max - s.min)) * 100
            return (
              <div key={s.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
                  <span className="text-xs font-bold" style={{ color: s.value !== (s.isAbsolute ? 0 : 0) || s.isAbsolute ? s.color : '#64748b' }}>
                    {s.isAbsolute ? s.value.toFixed(1) : (s.value > 0 ? "+" : "") + s.value}{s.unit}
                  </span>
                </div>
                {/* 커스텀 슬라이더 트랙 */}
                <div className="relative w-full h-6 flex items-center">
                  <div className="absolute inset-x-0 h-2 rounded-full bg-slate-700/60" />
                  <div className="absolute left-0 h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: s.color, opacity: 0.7 }} />
                  <input
                    type="range" min={s.min} max={s.max} step={s.step} value={s.value}
                    onChange={(e) => s.set(Number(e.target.value))}
                    className="absolute inset-x-0 w-full h-6 appearance-none bg-transparent cursor-pointer z-10"
                    style={{
                      WebkitAppearance: 'none',
                    }}
                  />
                  {/* 커스텀 thumb */}
                  <div className="absolute h-5 w-5 rounded-full border-2 shadow-lg pointer-events-none"
                    style={{
                      left: `calc(${pct}% - 10px)`,
                      backgroundColor: s.color,
                      borderColor: '#fff',
                      boxShadow: `0 0 6px ${s.color}80`,
                    }} />
                </div>
                <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
                  <span>{s.isAbsolute ? `${s.min}%` : `${s.min}%`}</span>
                  <span>{s.isAbsolute ? `${s.max}%` : `+${s.max}%`}</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* 비용 구성 */}
        {isChanged && (
          <div className="rounded-lg bg-secondary/20 p-3">
            <p className="text-[10px] text-muted-foreground mb-2 flex items-center gap-1">
              <Info className="h-3 w-3" /> 비용 구성
            </p>
            <div className="w-full h-3 rounded-full overflow-hidden flex">
              {[
                { value: scenario.landCost || 0, color: "#8b5cf6", label: "토지" },
                { value: scenario.constructionCost || 0, color: "#f59e0b", label: "공사" },
                { value: (scenario as any).financeCost || 0, color: "#ef4444", label: "금융" },
                { value: (scenario.softCost || 0) + ((scenario as any).parkingCost || 0), color: "#64748b", label: "기타" },
              ].filter(s => s.value > 0).map((seg, i) => (
                <div key={i} className="h-full transition-all duration-500"
                  style={{ width: `${(seg.value / scenario.totalCost) * 100}%`, backgroundColor: seg.color }}
                  title={`${seg.label}: ${(seg.value / 1e8).toFixed(0)}억원`} />
              ))}
            </div>
            <div className="flex justify-between mt-1.5 text-[9px] text-muted-foreground">
              <span>총사업비: {scenario.totalCost >= 1e12 ? `${(scenario.totalCost / 1e12).toFixed(1)}조` : `${(scenario.totalCost / 1e8).toFixed(0)}억`}</span>
              {(scenario as any).financeCost > 0 && (
                <span style={{ color: "#ef4444" }}>금융비: {((scenario as any).financeCost / 1e8).toFixed(0)}억</span>
              )}
            </div>
          </div>
        )}

        {!isChanged && (
          <div className="flex items-start gap-1.5">
            <Info className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-[10px] text-muted-foreground">
              슬라이더를 움직여 분양가·공사비·토지비·금리 변동에 따른 수익 변화를 확인하세요.
            </p>
          </div>
        )}
      </div>

      <style jsx>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 20px; height: 20px;
          border-radius: 50%;
          background: transparent;
          cursor: pointer;
        }
        input[type="range"]::-moz-range-thumb {
          width: 20px; height: 20px;
          border-radius: 50%;
          background: transparent;
          border: none;
          cursor: pointer;
        }
      `}</style>
    </div>
  )
}
