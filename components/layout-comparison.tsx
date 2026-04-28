"use client"

import { useMemo } from "react"
import { CheckCircle2, Sparkles, TrendingUp, Building2, Users, Car } from "lucide-react"
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

// 미니 아이소메트릭 (배치 유형별)
function MiniIso({ type, size = 40 }: { type: string; size?: number }) {
  const s = size
  const c = s / 2
  const toI = (x: number, y: number, z: number): [number, number] => [
    c + (x - y) * 0.43, c * 0.8 + (x + y) * 0.25 - z * 0.6,
  ]
  const face = (pts: [number, number, number][]): string =>
    pts.map(p => toI(p[0], p[1], p[2]).join(",")).join(" ")

  const blocks: { x: number; y: number; w: number; d: number; h: number }[] = (() => {
    const b = s * 0.25
    switch (type) {
      case "tower": return [{ x: -b * 0.5, y: -b * 0.5, w: b, d: b, h: b * 1.8 }]
      case "courtyard": {
        const t = b * 0.25
        return [
          { x: -b * 0.5, y: -b * 0.5, w: b, d: t, h: b * 1.2 },
          { x: -b * 0.5, y: b * 0.5 - t, w: b, d: t, h: b * 1.2 },
          { x: -b * 0.5, y: -b * 0.5 + t, w: t, d: b - t * 2, h: b * 1.2 },
          { x: b * 0.5 - t, y: -b * 0.5 + t, w: t, d: b - t * 2, h: b * 1.2 },
        ]
      }
      case "lshape": return [
        { x: -b * 0.5, y: -b * 0.5, w: b * 0.4, d: b, h: b * 1.4 },
        { x: -b * 0.1, y: b * 0.05, w: b * 0.6, d: b * 0.4, h: b * 1.2 },
      ]
      case "linear": return [{ x: -b * 0.6, y: -b * 0.2, w: b * 1.2, d: b * 0.4, h: b * 1.3 }]
      case "cluster": return [
        { x: -b * 0.55, y: -b * 0.45, w: b * 0.45, d: b * 0.8, h: b * 1.4 },
        { x: b * 0.05, y: -b * 0.35, w: b * 0.45, d: b * 0.8, h: b * 1.2 },
      ]
      default: return [{ x: -b * 0.5, y: -b * 0.5, w: b, d: b, h: b * 1.4 }]
    }
  })()

  return (
    <svg viewBox={`0 0 ${s} ${s}`} width={s} height={s}>
      {blocks.map((b, i) => (
        <g key={i}>
          <polygon points={face([[b.x, b.y + b.d, 0], [b.x, b.y + b.d, b.h], [b.x, b.y, b.h], [b.x, b.y, 0]])}
            fill="#1e3a5f" stroke="#3b82f6" strokeWidth="0.5" opacity="0.9" />
          <polygon points={face([[b.x, b.y, 0], [b.x, b.y, b.h], [b.x + b.w, b.y, b.h], [b.x + b.w, b.y, 0]])}
            fill="#2563eb" stroke="#3b82f6" strokeWidth="0.5" opacity="0.9" />
          <polygon points={face([[b.x, b.y, b.h], [b.x, b.y + b.d, b.h], [b.x + b.w, b.y + b.d, b.h], [b.x + b.w, b.y, b.h]])}
            fill="#60a5fa" stroke="#3b82f6" strokeWidth="0.5" opacity="0.7" />
        </g>
      ))}
    </svg>
  )
}

// 바 차트 인디케이터
function MetricBar({ value, max, color = "#3b82f6" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="w-full h-1.5 bg-secondary/50 rounded-full overflow-hidden mt-1">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  )
}

export function LayoutComparison({
  layouts, siteArea, selectedLayout, recommendedLayoutId, landPricePerM2, onSelect,
}: LayoutComparisonProps) {
  const financials = useMemo(() =>
    layouts.map(l => calculateFeasibility({
      siteArea, grossFloorArea: l.gfa, unitCount: l.units,
      floorCount: l.floors, parkingCount: l.parking,
      landPricePerM2: landPricePerM2 || 5000000,
    })),
    [layouts, siteArea, landPricePerM2]
  )

  const maxROI = Math.max(...financials.map(f => f.roi), 1)
  const maxUnits = Math.max(...layouts.map(l => l.units), 1)
  const maxScore = Math.max(...layouts.map(l => l.scores?.overall ?? 0), 1)
  const maxProfit = Math.max(...financials.map(f => f.profit), 1)
  const maxGfa = Math.max(...layouts.map(l => l.gfa), 1)

  return (
    <div className="space-y-4">
      {/* 상단: 카드 비교 (아이소메트릭 + 핵심 수치) */}
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(layouts.length, 5)}, 1fr)` }}>
        {layouts.map((layout, i) => {
          const f = financials[i]
          const isSelected = selectedLayout === layout.id
          const isRec = layout.recommendation.isRecommended
          return (
            <button
              key={layout.id}
              onClick={() => onSelect(layout.id)}
              className={`relative rounded-xl border p-3 text-left transition-all ${
                isSelected
                  ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                  : "border-border/50 bg-card hover:border-primary/40 hover:bg-primary/5"
              }`}
            >
              {isRec && (
                <div className="absolute -top-2 left-3 px-2 py-0.5 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center gap-1">
                  <Sparkles className="h-2.5 w-2.5" /> AI 추천
                </div>
              )}
              {isSelected && (
                <CheckCircle2 className="absolute top-2 right-2 h-4 w-4 text-primary" />
              )}

              {/* 아이소메트릭 썸네일 */}
              <div className="flex justify-center mb-2 opacity-80">
                <MiniIso type={layout.type} size={48} />
              </div>

              {/* 배치안 이름 */}
              <p className={`text-xs font-bold text-center mb-2 ${isSelected ? "text-primary" : "text-foreground"}`}>
                {layout.name}
              </p>

              {/* 핵심 수치 3개 */}
              <div className="space-y-1.5">
                <div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">ROI</span>
                    <span className={`font-bold ${f.roi >= 20 ? "text-emerald-400" : f.roi >= 10 ? "text-blue-400" : "text-orange-400"}`}>
                      {f.roi.toFixed(1)}%
                    </span>
                  </div>
                  <MetricBar value={f.roi} max={maxROI} color={f.roi >= 20 ? "#34d399" : f.roi >= 10 ? "#60a5fa" : "#fb923c"} />
                </div>
                <div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">세대수</span>
                    <span className="font-semibold text-foreground">{layout.units}</span>
                  </div>
                  <MetricBar value={layout.units} max={maxUnits} color="#8b5cf6" />
                </div>
                <div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">AI 점수</span>
                    <span className="font-semibold text-foreground">{layout.scores?.overall ?? "-"}점</span>
                  </div>
                  <MetricBar value={layout.scores?.overall ?? 0} max={maxScore} color="#f59e0b" />
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* ROI 비교 바 차트 */}
      <div className="rounded-xl border border-border/50 bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">수익성 비교</span>
        </div>
        <div className="space-y-2.5">
          {layouts.map((layout, i) => {
            const f = financials[i]
            const roiPct = maxROI > 0 ? (f.roi / maxROI) * 100 : 0
            const isSelected = selectedLayout === layout.id
            return (
              <div key={layout.id} className={`flex items-center gap-3 ${isSelected ? "opacity-100" : "opacity-70"}`}>
                <div className="w-20 text-right text-xs font-medium text-muted-foreground truncate">{layout.name}</div>
                <div className="flex-1 h-6 bg-secondary/30 rounded-md overflow-hidden relative">
                  <div
                    className="h-full rounded-md transition-all duration-700 flex items-center justify-end pr-2"
                    style={{
                      width: `${Math.max(roiPct, 8)}%`,
                      backgroundColor: f.roi >= 20 ? "#059669" : f.roi >= 10 ? "#2563eb" : "#d97706",
                    }}
                  >
                    <span className="text-[10px] font-bold text-white">{f.roi.toFixed(1)}%</span>
                  </div>
                  {/* 수익금액 라벨 */}
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
              <th className="sticky left-0 bg-card px-3 py-2.5 text-left text-xs font-medium text-muted-foreground w-24">항목</th>
              {layouts.map((layout) => (
                <th key={layout.id} className={`px-2 py-2 text-center min-w-[90px] ${selectedLayout === layout.id ? "bg-primary/10" : "bg-card"}`}>
                  <span className={`text-xs font-semibold ${selectedLayout === layout.id ? "text-primary" : "text-foreground"}`}>
                    {layout.name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { label: "층수", icon: Building2, get: (i: number) => `지상 ${layouts[i].floors}층`, best: (i: number) => layouts[i].floors === Math.max(...layouts.map(l => l.floors)) },
              { label: "세대수", icon: Users, get: (i: number) => `${layouts[i].units}세대`, best: (i: number) => layouts[i].units === maxUnits },
              { label: "건폐율", icon: null, get: (i: number) => `${layouts[i].coverage.toFixed(1)}%`, best: () => false },
              { label: "연면적", icon: null, get: (i: number) => layouts[i].gfa >= 10000 ? `${(layouts[i].gfa / 10000).toFixed(1)}만㎡` : `${Math.round(layouts[i].gfa)}㎡`, best: (i: number) => layouts[i].gfa === maxGfa },
              { label: "주차대수", icon: Car, get: (i: number) => `${layouts[i].parking}대`, best: () => false },
              { label: "총사업비", icon: null, get: (i: number) => `${(financials[i].totalCost / 1e8).toFixed(1)}억`, best: (i: number) => financials[i].totalCost === Math.min(...financials.map(f => f.totalCost)), tag: "최저" },
              { label: "예상수익", icon: null, get: (i: number) => `${(financials[i].profit / 1e8).toFixed(1)}억`, best: (i: number) => financials[i].profit === maxProfit },
              { label: "ROI", icon: TrendingUp, get: (i: number) => `${financials[i].roi.toFixed(1)}%`, best: (i: number) => financials[i].roi === maxROI },
              { label: "AI 종합", icon: Sparkles, get: (i: number) => layouts[i].scores?.overall ? `${layouts[i].scores!.overall}점` : "-", best: (i: number) => (layouts[i].scores?.overall ?? 0) === maxScore },
            ].map((row, idx) => (
              <tr key={row.label} className={`border-b border-border/30 ${idx % 2 === 0 ? "" : "bg-secondary/10"}`}>
                <td className="sticky left-0 bg-inherit px-3 py-2 text-xs font-medium text-muted-foreground whitespace-nowrap">
                  {row.label}
                </td>
                {layouts.map((_, i) => {
                  const isBest = row.best(i)
                  return (
                    <td key={layouts[i].id} className={`px-2 py-2 text-center text-xs font-medium ${selectedLayout === layouts[i].id ? "bg-primary/5" : ""}`}>
                      <span className={isBest ? "text-emerald-400 font-bold" : "text-foreground"}>
                        {row.get(i)}
                      </span>
                      {isBest && <span className="ml-1 text-[9px] px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-400">{(row as any).tag || "최고"}</span>}
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
