"use client"

import { useMemo } from "react"
import { CheckCircle2, Sparkles } from "lucide-react"
import { calculateFeasibility } from "@/lib/project-analysis-state"
import type { LayoutOption } from "@/app/page"

interface LayoutComparisonProps {
  layouts: LayoutOption[]
  siteArea: number
  selectedLayout: number | null
  recommendedLayoutId?: number | null
  landPricePerM2?: number
  onSelect: (id: number) => void
}

export function LayoutComparison({
  layouts,
  siteArea,
  selectedLayout,
  recommendedLayoutId,
  landPricePerM2,
  onSelect,
}: LayoutComparisonProps) {
  const financials = useMemo(() =>
    layouts.map(l => calculateFeasibility({
      siteArea,
      grossFloorArea: l.gfa,
      unitCount: l.units,
      floorCount: l.floors,
      parkingCount: l.parking,
      landPricePerM2: landPricePerM2 || 5000000,
    })),
    [layouts, siteArea, landPricePerM2]
  )

  // 각 행별 최고값 계산
  const maxROI = Math.max(...financials.map(f => f.roi))
  const maxUnits = Math.max(...layouts.map(l => l.units))
  const maxScore = Math.max(...layouts.map(l => l.scores?.overall ?? 0))
  const minCost = Math.min(...financials.map(f => f.totalCost))
  const maxProfit = Math.max(...financials.map(f => f.profit))

  const rows = [
    { label: "층수", key: "floors", unit: "층", getValue: (i: number) => `지상 ${layouts[i].floors}층`, best: (i: number) => layouts[i].floors === Math.max(...layouts.map(l => l.floors)) },
    { label: "세대수", key: "units", unit: "세대", getValue: (i: number) => `${layouts[i].units.toLocaleString()}세대`, best: (i: number) => layouts[i].units === maxUnits },
    { label: "건폐율", key: "coverage", unit: "%", getValue: (i: number) => `${layouts[i].coverage.toFixed(1)}%`, best: () => false },
    { label: "연면적", key: "gfa", unit: "㎡", getValue: (i: number) => layouts[i].gfa >= 10000 ? `${(layouts[i].gfa / 10000).toFixed(1)}만㎡` : `${Math.round(layouts[i].gfa)}㎡`, best: (i: number) => layouts[i].gfa === Math.max(...layouts.map(l => l.gfa)) },
    { label: "주차대수", key: "parking", unit: "대", getValue: (i: number) => `${layouts[i].parking.toLocaleString()}대`, best: () => false },
    { label: "총사업비", key: "totalCost", unit: "억원", getValue: (i: number) => `${(financials[i].totalCost / 1e8).toFixed(1)}억`, best: (i: number) => financials[i].totalCost === minCost },
    { label: "예상수익", key: "profit", unit: "억원", getValue: (i: number) => `${(financials[i].profit / 1e8).toFixed(1)}억`, best: (i: number) => financials[i].profit === maxProfit },
    { label: "ROI", key: "roi", unit: "%", getValue: (i: number) => `${financials[i].roi.toFixed(1)}%`, best: (i: number) => financials[i].roi === maxROI },
    { label: "AI 점수", key: "score", unit: "점", getValue: (i: number) => layouts[i].scores?.overall ? `${layouts[i].scores!.overall}점` : "-", best: (i: number) => (layouts[i].scores?.overall ?? 0) === maxScore },
  ]

  return (
    <div className="overflow-x-auto rounded-xl border border-border/50">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-border/50">
            <th className="sticky left-0 bg-card px-3 py-3 text-left text-xs font-medium text-muted-foreground w-24 min-w-[80px]">
              항목
            </th>
            {layouts.map((layout, i) => (
              <th key={layout.id} className={`px-2 py-2 text-center min-w-[100px] ${selectedLayout === layout.id ? 'bg-primary/10' : 'bg-card'}`}>
                <button
                  onClick={() => onSelect(layout.id)}
                  className="w-full flex flex-col items-center gap-1"
                >
                  <div className="flex items-center gap-1 justify-center">
                    {layout.recommendation.isRecommended && (
                      <Sparkles className="h-3 w-3 text-primary shrink-0" />
                    )}
                    <span className={`text-xs font-semibold leading-tight ${selectedLayout === layout.id ? 'text-primary' : 'text-foreground'}`}>
                      {layout.name}
                    </span>
                  </div>
                  <div className={`mt-0.5 px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                    selectedLayout === layout.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground hover:bg-primary/20 hover:text-primary'
                  }`}>
                    {selectedLayout === layout.id ? (
                      <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />선택됨</span>
                    ) : '선택'}
                  </div>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr key={row.key} className={`border-b border-border/30 ${rowIdx % 2 === 0 ? '' : 'bg-secondary/10'}`}>
              <td className="sticky left-0 bg-inherit px-3 py-2.5 text-xs font-medium text-muted-foreground whitespace-nowrap">
                {row.label}
              </td>
              {layouts.map((layout, i) => {
                const isBest = row.best(i)
                const isSelected = selectedLayout === layout.id
                return (
                  <td
                    key={layout.id}
                    className={`px-2 py-2.5 text-center text-xs font-medium transition-colors ${
                      isSelected ? 'bg-primary/5' : ''
                    }`}
                  >
                    <span className={`${
                      isBest
                        ? row.key === 'totalCost'
                          ? 'text-blue-400 font-bold'
                          : 'text-emerald-400 font-bold'
                        : 'text-foreground'
                    }`}>
                      {row.getValue(i)}
                    </span>
                    {isBest && (
                      <span className={`ml-1 text-[9px] px-1 py-0.5 rounded ${
                        row.key === 'totalCost' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {row.key === 'totalCost' ? '최저' : '최고'}
                      </span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
