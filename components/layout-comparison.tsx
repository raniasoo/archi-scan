"use client"

import { useMemo, useState } from "react"
import { CheckCircle2, Sparkles, BarChart3, Trophy, Crown } from "lucide-react"
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { calculateFeasibility, type FeasibilityResult } from "@/lib/project-analysis-state"
import type { LayoutOption } from "@/app/page"

interface LayoutComparisonProps {
  layouts: LayoutOption[]
  siteArea: number
  selectedLayout: number | null
  recommendedLayoutId?: number | null
  landPricePerM2?: number
  salesPricePerM2?: number
  constructionCostPerM2?: number
  onSelect: (id: number) => void
}

const COLORS = ["#2563eb", "#059669", "#d97706", "#8b5cf6", "#ec4899"]
const RANK_EMOJI = ["🥇", "🥈", "🥉"]

function getRoiGrade(roi: number) {
  if (roi >= 20) return { label: "최우수", color: "text-emerald-400", bg: "bg-emerald-500/15" }
  if (roi >= 10) return { label: "우수", color: "text-emerald-400", bg: "bg-emerald-500/10" }
  if (roi >= 5) return { label: "양호", color: "text-blue-400", bg: "bg-blue-500/10" }
  if (roi >= 0) return { label: "보통", color: "text-amber-400", bg: "bg-amber-500/10" }
  return { label: "검토", color: "text-red-400", bg: "bg-red-500/10" }
}

function formatBillion(v: number): string {
  const b = v / 1e8
  if (Math.abs(b) >= 10000) return `${(b / 10000).toFixed(1)}조`
  return `${b.toFixed(1)}억`
}

export function LayoutComparison({
  layouts, siteArea, selectedLayout, recommendedLayoutId, landPricePerM2, salesPricePerM2, constructionCostPerM2, onSelect,
}: LayoutComparisonProps) {
  const [viewMode, setViewMode] = useState<"summary" | "detail">("summary")

  const financials = useMemo(() => {
    try {
      return layouts.map(l => calculateFeasibility({
        siteArea: siteArea || 1,
        grossFloorArea: l.gfa || 1,
        unitCount: l.units || 1,
        floorCount: l.floors || 1,
        parkingCount: l.parking || 0,
        buildingCount: l.buildingCount || 1,
        landPricePerM2: landPricePerM2 || 5000000,
        salesPricePerM2: salesPricePerM2 || undefined,
        constructionCostPerM2: constructionCostPerM2 || undefined,
      }))
    } catch {
      return layouts.map(() => ({
        roi: 0, profit: 0, totalCost: 1, totalRevenue: 0,
        breakevenSalePrice: 0, premiumRate: 0, projectDuration: 0,
        feasibilityGrade: 'poor', feasibilityLabel: '-',
        landCost: 0, constructionCost: 0, softCost: 0,
        salesPricePerM2: 0, constructionCostPerM2: 0,
        mainIssues: [] as string[], improvements: [] as string[],
      } as FeasibilityResult))
    }
  }, [layouts, siteArea, landPricePerM2, salesPricePerM2, constructionCostPerM2])

  // 각 항목별 순위 계산
  const rankings = useMemo(() => {
    const metrics = [
      { key: "roi", values: financials.map(f => f.roi), higher: true },
      { key: "profit", values: financials.map(f => f.profit), higher: true },
      { key: "totalCost", values: financials.map(f => f.totalCost), higher: false },
      { key: "units", values: layouts.map(l => l.units || 0), higher: true },
      { key: "gfa", values: layouts.map(l => l.gfa || 0), higher: true },
      { key: "score", values: layouts.map(l => l.scores?.overall ?? 0), higher: true },
      { key: "floors", values: layouts.map(l => l.floors || 0), higher: true },
      { key: "parking", values: layouts.map(l => l.parking || 0), higher: true },
    ]
    const result: Record<string, number[]> = {}
    metrics.forEach(m => {
      const sorted = [...m.values].map((v, i) => ({ v, i }))
        .sort((a, b) => m.higher ? b.v - a.v : a.v - b.v)
      const ranks = new Array(m.values.length)
      sorted.forEach((s, rank) => { ranks[s.i] = rank })
      result[m.key] = ranks
    })
    return result
  }, [layouts, financials])

  // 종합 1등 배치안
  const overallBest = useMemo(() => {
    if (!layouts.length) return -1
    const scores = layouts.map((_, i) => {
      const roiRank = rankings.roi?.[i] ?? 99
      const scoreRank = rankings.score?.[i] ?? 99
      const profitRank = rankings.profit?.[i] ?? 99
      return roiRank * 3 + scoreRank * 2 + profitRank * 2
    })
    let best = 0
    scores.forEach((s, i) => { if (s < scores[best]) best = i })
    return layouts[best]?.id ?? -1
  }, [layouts, rankings])

  if (!layouts.length) return null

  return (
    <div className="space-y-3">
      {/* ━━━ 탭 전환 ━━━ */}
      <div className="flex gap-1 p-0.5 bg-secondary/30 rounded-lg">
        <button
          onClick={() => setViewMode("summary")}
          className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${viewMode === "summary" ? "bg-card shadow text-foreground" : "text-muted-foreground"}`}
        >
          핵심 비교
        </button>
        <button
          onClick={() => setViewMode("detail")}
          className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${viewMode === "detail" ? "bg-card shadow text-foreground" : "text-muted-foreground"}`}
        >
          상세 테이블
        </button>
      </div>

      {viewMode === "summary" ? (
        <>
          {/* ━━━ 1. 종합 순위 카드 ━━━ */}
          <div className="space-y-2">
            {layouts.map((layout, i) => {
              const f = financials[i]
              if (!f) return null
              const rank = rankings.roi?.[i] ?? 99
              const isOverallBest = layout.id === overallBest
              const isSelected = selectedLayout === layout.id
              const roiGrade = getRoiGrade(f.roi)

              return (
                <button
                  key={layout.id}
                  onClick={() => onSelect(layout.id)}
                  className={`w-full rounded-xl border-2 p-3 text-left transition-all ${
                    isSelected ? "border-primary bg-primary/5 ring-1 ring-primary/20" :
                    isOverallBest ? "border-primary/30 bg-card" :
                    "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  {/* 상단: 순위 + 이름 + 뱃지 */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">{RANK_EMOJI[rank] || `${rank + 1}위`}</span>
                    <span className="text-sm font-bold flex-1">{layout.name}</span>
                    {isOverallBest && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-semibold flex items-center gap-0.5">
                        <Crown className="h-2.5 w-2.5" /> 종합 최적
                      </span>
                    )}
                    {layout.recommendation?.isRecommended && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-semibold">AI 추천</span>
                    )}
                    {isSelected && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                  </div>

                  {/* 핵심 지표 3개 */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className={`rounded-lg p-2 text-center ${roiGrade.bg}`}>
                      <p className="text-[9px] text-muted-foreground">ROI</p>
                      <p className={`text-base font-bold ${roiGrade.color}`}>
                        {f.roi > 0 ? "+" : ""}{f.roi.toFixed(1)}%
                      </p>
                      <p className={`text-[8px] font-medium ${roiGrade.color}`}>{roiGrade.label}</p>
                    </div>
                    <div className="rounded-lg bg-secondary/30 p-2 text-center">
                      <p className="text-[9px] text-muted-foreground">예상수익</p>
                      <p className={`text-base font-bold ${f.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {f.profit >= 0 ? "+" : ""}{formatBillion(f.profit)}
                      </p>
                      <p className="text-[8px] text-muted-foreground">총 {formatBillion(f.totalRevenue)}</p>
                    </div>
                    <div className="rounded-lg bg-secondary/30 p-2 text-center">
                      <p className="text-[9px] text-muted-foreground">AI 종합</p>
                      <p className="text-base font-bold text-foreground">
                        {layout.scores?.overall ?? "-"}<span className="text-[9px] text-muted-foreground">점</span>
                      </p>
                      <p className="text-[8px] text-muted-foreground">{layout.floors}층·{layout.units}세대</p>
                    </div>
                  </div>

                  {/* 사업비 vs 매출 프로그레스 바 */}
                  <div className="mt-2">
                    <div className="flex items-center gap-1 text-[9px] text-muted-foreground mb-0.5">
                      <span>사업비 {formatBillion(f.totalCost)}</span>
                      <span className="flex-1 text-center">→</span>
                      <span>매출 {formatBillion(f.totalRevenue)}</span>
                    </div>
                    <div className="relative h-2 rounded-full bg-red-500/20 overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-emerald-500/60 transition-all duration-500"
                        style={{ width: `${Math.min((f.totalRevenue / Math.max(f.totalCost, 1)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* ━━━ 2. 레이더 차트 ━━━ */}
          {layouts.length >= 2 && (
            <div className="rounded-xl border border-border/50 bg-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">다차원 비교</span>
              </div>
              <p className="text-[10px] text-muted-foreground mb-3">ROI·세대수·AI점수·연면적·주차 5개 축 기준</p>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={(() => {
                  const dims = [
                    { name: "ROI", key: "roi" },
                    { name: "세대수", key: "units" },
                    { name: "AI점수", key: "score" },
                    { name: "연면적", key: "gfa" },
                    { name: "주차", key: "parking" },
                  ]
                  return dims.map(d => {
                    const vals = layouts.map((l, i) => {
                      if (d.key === "roi") return Math.max(0, financials[i]?.roi || 0)
                      if (d.key === "units") return l.units || 0
                      if (d.key === "score") return l.scores?.overall || 0
                      if (d.key === "gfa") return l.gfa || 0
                      if (d.key === "parking") return l.parking || 0
                      return 0
                    })
                    const mx = Math.max(...vals, 1)
                    const row: Record<string, string | number> = { dim: d.name }
                    layouts.forEach((l, i) => { row[l.name] = Math.round((vals[i] / mx) * 100) })
                    return row
                  })
                })()}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="dim" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                  {layouts.map((l, i) => (
                    <Radar key={l.id} name={l.name} dataKey={l.name}
                      stroke={COLORS[i % 5]}
                      fill={COLORS[i % 5]}
                      fillOpacity={selectedLayout === l.id ? 0.3 : 0.08}
                      strokeWidth={selectedLayout === l.id ? 2.5 : 1}
                    />
                  ))}
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ fontSize: 11, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    formatter={(value: number) => `${value}%`}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ━━━ 3. 항목별 1등 요약 ━━━ */}
          {layouts.length >= 2 && (
            <div className="rounded-xl border border-border/50 bg-card p-3">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-semibold">항목별 1위</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {[
                  { label: "ROI", key: "roi" },
                  { label: "예상수익", key: "profit" },
                  { label: "사업비(최저)", key: "totalCost" },
                  { label: "세대수", key: "units" },
                  { label: "AI 종합", key: "score" },
                  { label: "연면적", key: "gfa" },
                ].map(item => {
                  const bestIdx = rankings[item.key]?.indexOf(0) ?? -1
                  const bestLayout = bestIdx >= 0 ? layouts[bestIdx] : null
                  return (
                    <div key={item.key} className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-medium text-foreground truncate ml-1">🥇 {bestLayout?.name ?? "-"}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        /* ━━━ 상세 테이블 모드 ━━━ */
        <DetailTable
          layouts={layouts}
          financials={financials}
          rankings={rankings}
          selectedLayout={selectedLayout}
          onSelect={onSelect}
        />
      )}
    </div>
  )
}

/* ━━━ 상세 비교 테이블 ━━━ */
function DetailTable({
  layouts, financials, rankings, selectedLayout, onSelect,
}: {
  layouts: LayoutOption[]
  financials: FeasibilityResult[]
  rankings: Record<string, number[]>
  selectedLayout: number | null
  onSelect: (id: number) => void
}) {
  const rows = [
    { label: "층수", key: "floors", get: (i: number) => `${layouts[i]?.floors || 0}층` },
    { label: "세대수", key: "units", get: (i: number) => `${layouts[i]?.units || 0}세대` },
    { label: "건폐율", key: "", get: (i: number) => `${(layouts[i]?.coverage || 0).toFixed(1)}%` },
    { label: "연면적", key: "gfa", get: (i: number) => {
      const g = layouts[i]?.gfa || 0
      return g >= 10000 ? `${(g / 10000).toFixed(1)}만㎡` : `${Math.round(g)}㎡`
    }},
    { label: "주차", key: "parking", get: (i: number) => `${layouts[i]?.parking || 0}대` },
    { label: "총사업비", key: "totalCost", get: (i: number) => formatBillion(financials[i]?.totalCost || 0) },
    { label: "총매출", key: "", get: (i: number) => formatBillion(financials[i]?.totalRevenue || 0) },
    { label: "예상수익", key: "profit", get: (i: number) => `${financials[i]?.profit >= 0 ? "+" : ""}${formatBillion(financials[i]?.profit || 0)}` },
    { label: "ROI", key: "roi", get: (i: number) => `${financials[i]?.roi > 0 ? "+" : ""}${(financials[i]?.roi || 0).toFixed(1)}%` },
    { label: "AI 종합", key: "score", get: (i: number) => layouts[i]?.scores?.overall ? `${layouts[i].scores!.overall}점` : "-" },
  ]

  return (
    <div className="overflow-x-auto rounded-xl border border-border/50">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-border/50">
            <th className="sticky left-0 z-10 bg-card px-3 py-2.5 text-left text-xs font-medium text-muted-foreground w-20 min-w-[70px]">항목</th>
            {layouts.map((layout) => (
              <th
                key={layout.id}
                className={`px-2 py-2 text-center min-w-[90px] cursor-pointer transition-colors ${selectedLayout === layout.id ? "bg-primary/10" : "bg-card hover:bg-secondary/20"}`}
                onClick={() => onSelect(layout.id)}
              >
                <div className="flex items-center gap-1 justify-center">
                  {layout.recommendation?.isRecommended && <Sparkles className="h-3 w-3 text-primary shrink-0" />}
                  <span className={`text-xs font-semibold ${selectedLayout === layout.id ? "text-primary" : "text-foreground"}`}>
                    {layout.name}
                  </span>
                </div>
                {selectedLayout === layout.id && (
                  <div className="mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-primary text-primary-foreground inline-flex items-center gap-0.5">
                    <CheckCircle2 className="h-2.5 w-2.5" />선택
                  </div>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const isHighlight = row.key === "roi" || row.key === "profit"
            return (
              <tr key={row.label} className={`border-b border-border/30 ${isHighlight ? "bg-primary/5" : idx % 2 === 0 ? "" : "bg-secondary/10"}`}>
                <td className={`sticky left-0 z-10 px-3 py-2 text-xs font-medium whitespace-nowrap ${isHighlight ? "bg-primary/5 text-foreground font-semibold" : "bg-inherit text-muted-foreground"}`}>
                  {row.label}
                </td>
                {layouts.map((_, i) => {
                  const rank = row.key ? (rankings[row.key]?.[i] ?? 99) : 99
                  const isBest = rank === 0 && layouts.length > 1
                  return (
                    <td key={layouts[i]?.id || i} className={`px-2 py-2 text-center text-xs font-medium ${selectedLayout === layouts[i]?.id ? "bg-primary/5" : ""}`}>
                      <span className={isBest ? "text-emerald-400 font-bold" : isHighlight ? "text-foreground font-semibold" : "text-foreground"}>
                        {row.get(i)}
                      </span>
                      {isBest && <span className="ml-1 text-[9px]">🥇</span>}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
