"use client"

import { useState, useMemo } from "react"
import { SlidersHorizontal, TrendingUp, TrendingDown, AlertTriangle, Info } from "lucide-react"

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
  // 시나리오 변수 (기본값 = 현재 사업성 기준)
  const [salePriceAdj, setSalePriceAdj] = useState(0) // 분양가 조정 (%)
  const [constCostAdj, setConstCostAdj] = useState(0) // 공사비 조정 (%)
  const [interestRate, setInterestRate] = useState(4.5) // 금리 (%)
  const [landPriceAdj, setLandPriceAdj] = useState(0) // 토지비 조정 (%)

  // 재계산
  const scenario = useMemo(() => {
    // 기본 단가들
    const avgUnitArea = gfa / Math.max(units, 1) // 세대당 평균 면적
    const baseSalePrice = 12000000 // 기본 분양단가 (원/㎡)
    const baseConstCost = 2800000 // 기본 공사비 (원/㎡)

    // 조정된 단가
    const adjSalePrice = baseSalePrice * (1 + salePriceAdj / 100)
    const adjConstCost = baseConstCost * (1 + constCostAdj / 100)
    const adjLandPrice = landPricePerM2 * (1 + landPriceAdj / 100)

    // 비용
    const landCost = siteArea * adjLandPrice
    const constructionCost = gfa * adjConstCost
    const interestCost = (landCost + constructionCost) * (interestRate / 100) * 2.5 // 2.5년 사업기간
    const indirectCost = constructionCost * 0.15
    const totalCost = landCost + constructionCost + interestCost + indirectCost

    // 수익
    const totalRevenue = gfa * adjSalePrice * 0.85 // 전용률 85%
    const profit = totalRevenue - totalCost
    const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0
    const breakEvenRate = totalRevenue > 0 ? (totalCost / totalRevenue) * 100 : 100

    return { totalCost, totalRevenue, profit, roi, breakEvenRate, interestCost, landCost, constructionCost }
  }, [siteArea, gfa, units, salePriceAdj, constCostAdj, interestRate, landPriceAdj, landPricePerM2])

  const roiDiff = scenario.roi - baseROI
  const roiColor = scenario.roi >= 20 ? "text-emerald-400" : scenario.roi >= 10 ? "text-blue-400" : scenario.roi >= 0 ? "text-orange-400" : "text-red-400"

  const sliders = [
    { label: "분양가", value: salePriceAdj, set: setSalePriceAdj, min: -20, max: 30, step: 1, unit: "%", color: "#3b82f6" },
    { label: "공사비", value: constCostAdj, set: setConstCostAdj, min: -15, max: 30, step: 1, unit: "%", color: "#f59e0b" },
    { label: "토지비", value: landPriceAdj, set: setLandPriceAdj, min: -20, max: 30, step: 1, unit: "%", color: "#8b5cf6" },
    { label: "금리", value: interestRate, set: setInterestRate, min: 2, max: 8, step: 0.1, unit: "%", color: "#ef4444", isAbsolute: true },
  ]

  const reset = () => {
    setSalePriceAdj(0)
    setConstCostAdj(0)
    setInterestRate(4.5)
    setLandPriceAdj(0)
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">사업성 시나리오 시뮬레이션</span>
          </div>
          <button onClick={reset} className="text-[10px] px-2 py-1 rounded bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            초기화
          </button>
        </div>
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
            <p className="text-[10px] text-muted-foreground mt-0.5">
              총사업비 {(scenario.totalCost / 1e8).toFixed(1)}억
            </p>
          </div>
          <div className="rounded-lg bg-secondary/30 p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-1">손익분기 분양률</p>
            <p className={`text-lg font-bold ${scenario.breakEvenRate <= 85 ? "text-emerald-400" : scenario.breakEvenRate <= 100 ? "text-orange-400" : "text-red-400"}`}>
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
                <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
                <span className="text-xs font-bold" style={{ color: s.color }}>
                  {s.isAbsolute ? s.value.toFixed(1) : (s.value >= 0 ? "+" : "") + s.value}{s.unit}
                </span>
              </div>
              <input
                type="range"
                min={s.min}
                max={s.max}
                step={s.step}
                value={s.value}
                onChange={(e) => s.set(Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, ${s.color} 0%, ${s.color} ${((s.value - s.min) / (s.max - s.min)) * 100}%, hsl(var(--secondary)) ${((s.value - s.min) / (s.max - s.min)) * 100}%, hsl(var(--secondary)) 100%)`,
                }}
              />
              <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
                <span>{s.isAbsolute ? s.min : `${s.min}%`}</span>
                <span>{s.isAbsolute ? s.max : `+${s.max}%`}</span>
              </div>
            </div>
          ))}
        </div>

        {/* 비용 구성 */}
        <div className="rounded-lg bg-secondary/20 p-3">
          <p className="text-[10px] text-muted-foreground mb-2 flex items-center gap-1">
            <Info className="h-3 w-3" /> 비용 구성
          </p>
          <div className="w-full h-3 rounded-full overflow-hidden flex">
            {[
              { value: scenario.landCost, color: "#8b5cf6", label: "토지" },
              { value: scenario.constructionCost, color: "#f59e0b", label: "공사" },
              { value: scenario.interestCost, color: "#ef4444", label: "금융" },
              { value: scenario.totalCost - scenario.landCost - scenario.constructionCost - scenario.interestCost, color: "#64748b", label: "간접" },
            ].map((seg, i) => (
              <div
                key={i}
                className="h-full transition-all duration-500"
                style={{
                  width: `${(seg.value / scenario.totalCost) * 100}%`,
                  backgroundColor: seg.color,
                }}
                title={`${seg.label}: ${(seg.value / 1e8).toFixed(1)}억원`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1.5 text-[9px]">
            <span style={{ color: "#8b5cf6" }}>토지 {(scenario.landCost / scenario.totalCost * 100).toFixed(0)}%</span>
            <span style={{ color: "#f59e0b" }}>공사 {(scenario.constructionCost / scenario.totalCost * 100).toFixed(0)}%</span>
            <span style={{ color: "#ef4444" }}>금융 {(scenario.interestCost / scenario.totalCost * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
