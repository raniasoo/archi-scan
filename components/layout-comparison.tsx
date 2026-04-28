"use client"

import { useMemo } from "react"
import { CheckCircle2, Sparkles, TrendingUp } from "lucide-react"
import { calculateFeasibility } from "@/lib/project-analysis-state"

interface ComparisonLayout {
  id: number; name: string; type: string; coverage: number; units: number
  floors: number; parking: number; gfa: number; features: string[]
  scores?: { overall?: number } | null
  recommendation: { isRecommended: boolean }
}

interface LayoutComparisonProps {
  layouts: ComparisonLayout[]
  siteArea: number
  selectedLayout: number | null
  recommendedLayoutId?: number | null
  landPricePerM2?: number
  onSelect: (id: number) => void
}

export function LayoutComparison({
  layouts, siteArea, selectedLayout, recommendedLayoutId, landPricePerM2, onSelect,
}: LayoutComparisonProps) {
  const financials = useMemo(() => {
    try {
      return layouts.map(l => calculateFeasibility({
        siteArea, grossFloorArea: l.gfa || 0, unitCount: l.units || 0,
        floorCount: l.floors || 0, parkingCount: l.parking || 0,
        landPricePerM2: landPricePerM2 || 5000000,
      }))
    } catch { return layouts.map(() => ({ roi: 0, profit: 0, totalCost: 0, totalRevenue: 0, breakevenSalePrice: 0, premiumRate: 0, projectDuration: 0, feasibilityGrade: 'poor' as const, feasibilityLabel: '-', landCost: 0, constructionCost: 0, softCost: 0, parkingCost: 0 })) }
  }, [layouts, siteArea, landPricePerM2])

  if (!layouts.length) return null

  const maxROI = Math.max(...financials.map(f => f.roi), 0.1)
  const maxUnits = Math.max(...layouts.map(l => l.units || 0), 1)
  const maxScore = Math.max(...layouts.map(l => l.scores?.overall ?? 0), 1)
  const maxProfit = Math.max(...financials.map(f => f.profit), 1)
  const maxGfa = Math.max(...layouts.map(l => l.gfa || 0), 1)

  const rows = [
    { label: "층수", getValue: (i: number) => `지상 ${layouts[i].floors}층`, best: (i: number) => layouts[i].floors === Math.max(...layouts.map(l => l.floors)), tag: "최고" },
    { label: "세대수", getValue: (i: number) => `${(layouts[i].units || 0).toLocaleString()}세대`, best: (i: number) => layouts[i].units === maxUnits, tag: "최고" },
    { label: "건폐율", getValue: (i: number) => `${(layouts[i].coverage || 0).toFixed(1)}%`, best: () => false, tag: "" },
    { label: "연면적", getValue: (i: number) => (layouts[i].gfa || 0) >= 10000 ? `${((layouts[i].gfa || 0) / 10000).toFixed(1)}만㎡` : `${Math.round(layouts[i].gfa || 0)}㎡`, best: (i: number) => (layouts[i].gfa || 0) === maxGfa, tag: "최고" },
    { label: "주차대수", getValue: (i: number) => `${(layouts[i].parking || 0).toLocaleString()}대`, best: () => false, tag: "" },
    { label: "총사업비", getValue: (i: number) => `${(financials[i].totalCost / 1e8).toFixed(1)}억`, best: (i: number) => financials[i].totalCost === Math.min(...financials.map(f => f.totalCost)), tag: "최저" },
    { label: "예상수익", getValue: (i: number) => `${(financials[i].profit / 1e8).toFixed(1)}억`, best: (i: number) => financials[i].profit === maxProfit, tag: "최고" },
    { label: "ROI", getValue: (i: number) => `${financials[i].roi.toFixed(1)}%`, best: (i: number) => Math.abs(financials[i].roi - Math.max(...financials.map(f => f.roi))) < 0.01, tag: "최고" },
    { label: "AI 종합", getValue: (i: number) => (layouts[i].scores?.overall ?? 0) > 0 ? `${layouts[i].scores?.overall}점` : "-", best: (i: number) => (layouts[i].scores?.overall ?? 0) === maxScore && maxScore > 0, tag: "최고" },
  ]

  return (
    <div className="space-y-4">
      {/* 수익성 비교 바 차트 */}
      <div className="rounded-xl border border-border/50 bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">수익성 비교</span>
        </div>
        <div className="space-y-2.5">
          {layouts.map((layout, i) => {
            const f = financials[i]
            const maxAbsROI = Math.max(...financials.map(ff => Math.abs(ff.roi)), 1)
            const barPct = Math.min(100, (Math.abs(f.roi) / maxAbsROI) * 100)
            const isSelected = selectedLayout === layout.id
            return (
              <div key={layout.id} className={`flex items-center gap-3 ${isSelected ? "opacity-100" : "opacity-70"}`}>
                <div className="w-20 text-right text-xs font-medium text-muted-foreground truncate">{layout.name}</div>
                <div className="flex-1 h-6 bg-secondary/30 rounded-md overflow-hidden relative">
                  <div
                    className="h-full rounded-md transition-all duration-700 flex items-center justify-end pr-2"
                    style={{
                      width: `${Math.max(barPct, 8)}%`,
                      backgroundColor: f.roi >= 15 ? "#059669" : f.roi >= 5 ? "#2563eb" : f.roi >= 0 ? "#d97706" : "#dc2626",
                    }}
                  >
                    <span className="text-[10px] font-bold text-white">{f.roi.toFixed(1)}%</span>
                  </div>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                    {f.profit >= 0 ? "+" : ""}{(f.profit / 1e8).toFixed(1)}억
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 상세 비교 테이블 */}
      <div className="overflow-x-auto rounded-xl border border-border/50">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border/50">
              <th className="sticky left-0 bg-card px-3 py-2.5 text-left text-xs font-medium text-muted-foreground w-20 min-w-[70px]">항목</th>
              {layouts.map((layout) => (
                <th key={layout.id} className={`px-2 py-2 text-center min-w-[80px] cursor-pointer ${selectedLayout === layout.id ? "bg-primary/10" : "bg-card"}`}
                  onClick={() => onSelect(layout.id)}>
                  <div className="flex items-center gap-1 justify-center">
                    {layout.recommendation?.isRecommended && <Sparkles className="h-3 w-3 text-primary shrink-0" />}
                    <span className={`text-xs font-semibold ${selectedLayout === layout.id ? "text-primary" : "text-foreground"}`}>
                      {layout.name}
                    </span>
                  </div>
                  <div className={`mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium ${
                    selectedLayout === layout.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                  }`}>
                    {selectedLayout === layout.id ? <span className="flex items-center gap-0.5 justify-center"><CheckCircle2 className="h-2.5 w-2.5" />선택</span> : "선택"}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.label} className={`border-b border-border/30 ${idx % 2 === 0 ? "" : "bg-secondary/10"}`}>
                <td className="sticky left-0 bg-inherit px-3 py-2 text-xs font-medium text-muted-foreground whitespace-nowrap">{row.label}</td>
                {layouts.map((_, i) => {
                  const isBest = row.best(i)
                  return (
                    <td key={layouts[i].id} className={`px-2 py-2 text-center text-xs font-medium ${selectedLayout === layouts[i].id ? "bg-primary/5" : ""}`}>
                      <span className={isBest ? (row.tag === "최저" ? "text-blue-400 font-bold" : "text-emerald-400 font-bold") : "text-foreground"}>
                        {row.getValue(i)}
                      </span>
                      {isBest && row.tag && <span className={`ml-1 text-[9px] px-1 py-0.5 rounded ${row.tag === "최저" ? "bg-blue-500/20 text-blue-400" : "bg-emerald-500/20 text-emerald-400"}`}>{row.tag}</span>}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
