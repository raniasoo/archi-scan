"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, Building2, Layers, Car, Percent, Sparkles, TrendingUp } from "lucide-react"
import { BuildingFootprint } from "./building-footprint"
import type { LayoutScores } from "@/lib/design-strategy"

interface LayoutOption {
  id: number
  name: string
  type: "tower" | "courtyard" | "lshape" | "linear" | "cluster"
  description: string
  coverage: number
  units: number
  floors: number
  parking: number
  gfa?: number
  openSpace?: number
  features: string[]
}

interface LayoutCardProps {
  layout: LayoutOption
  siteArea: number
  isSelected: boolean
  onSelect: () => void
  scores?: LayoutScores
  isRecommended?: boolean
}

// Safe number helper for scores
function safeScore(value: unknown, fallback: number = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  return fallback
}

function MiniScoreBar({ value, color }: { value: number; color: string }) {
  const safeValue = safeScore(value, 0)
  return (
    <div className="h-1 w-full rounded-full bg-secondary overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-300 ${color}`}
        style={{ width: `${Math.min(safeValue, 100)}%` }}
      />
    </div>
  )
}

export function LayoutCard({ 
  layout, 
  siteArea, 
  isSelected, 
  onSelect, 
  scores,
  isRecommended 
}: LayoutCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 85) return "bg-emerald-500"
    if (score >= 70) return "bg-primary"
    if (score >= 55) return "bg-amber-500"
    return "bg-red-500"
  }

  const getGradeLabel = (score: number) => {
    if (score >= 90) return { grade: "S", color: "text-emerald-500" }
    if (score >= 80) return { grade: "A", color: "text-primary" }
    if (score >= 70) return { grade: "B", color: "text-blue-500" }
    if (score >= 60) return { grade: "C", color: "text-amber-500" }
    return { grade: "D", color: "text-red-500" }
  }

  return (
    <Card
      className={`cursor-pointer transition-all duration-200 hover:border-primary/50 hover:shadow-lg relative ${
        isSelected ? "border-primary ring-2 ring-primary/20 shadow-lg shadow-primary/10" : ""
      } ${isRecommended ? "border-primary/50" : ""}`}
      onClick={onSelect}
    >
      {/* Recommended Badge */}
      {isRecommended && (
        <div className="absolute -top-2 left-4 z-10">
          <Badge className="bg-primary text-primary-foreground gap-1 shadow-md">
            <Sparkles className="h-3 w-3" />
            AI 추천
          </Badge>
        </div>
      )}

      <CardHeader className={`pb-3 ${isRecommended ? "pt-5" : ""}`}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{layout.name}</CardTitle>
          <div className="flex items-center gap-2">
            {scores && safeScore(scores.overall, 0) > 0 && (
              <div className="text-center">
                <div className={`text-lg font-bold ${getGradeLabel(safeScore(scores.overall, 0)).color}`}>
                  {getGradeLabel(safeScore(scores.overall, 0)).grade}
                </div>
              </div>
            )}
            {isSelected && (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                <Check className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">{layout.description}</p>
      </CardHeader>
      <CardContent>
        {/* SVG Building Footprint Visualization */}
        <div className="mb-4 aspect-square rounded-lg bg-secondary/30 border border-border p-2">
          <BuildingFootprint 
            type={layout.type} 
            siteArea={siteArea} 
            coverage={layout.coverage} 
            isSelected={isSelected}
          />
        </div>

        {/* Score Bars (if scores provided and valid) */}
        {scores && safeScore(scores.overall, 0) > 0 && (
          <div className="mb-4 space-y-2 p-3 rounded-lg bg-secondary/30">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">종합 점수</span>
              <span className={`font-bold ${getGradeLabel(safeScore(scores.overall, 0)).color}`}>{safeScore(scores.overall, 0)}점</span>
            </div>
            <MiniScoreBar value={safeScore(scores.overall, 0)} color={getScoreColor(safeScore(scores.overall, 0))} />
            
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-2">
              <div className="space-y-0.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">법규</span>
                  <span className="text-foreground">{safeScore(scores.regulationCompliance, 0)}</span>
                </div>
                <MiniScoreBar value={safeScore(scores.regulationCompliance, 0)} color={getScoreColor(safeScore(scores.regulationCompliance, 0))} />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">사업성</span>
                  <span className="text-foreground">{safeScore(scores.profitability, 0)}</span>
                </div>
                <MiniScoreBar value={safeScore(scores.profitability, 0)} color={getScoreColor(safeScore(scores.profitability, 0))} />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">상품성</span>
                  <span className="text-foreground">{safeScore(scores.marketability, 0)}</span>
                </div>
                <MiniScoreBar value={safeScore(scores.marketability, 0)} color={getScoreColor(safeScore(scores.marketability, 0))} />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">실현성</span>
                  <span className="text-foreground">{safeScore(scores.feasibility, 0)}</span>
                </div>
                <MiniScoreBar value={safeScore(scores.feasibility, 0)} color={getScoreColor(safeScore(scores.feasibility, 0))} />
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 rounded-md bg-secondary/50 p-2">
            <Percent className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">건폐율</p>
              <p className="text-sm font-semibold text-foreground">{layout.coverage}%</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-md bg-secondary/50 p-2">
            <Building2 className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">세대수</p>
              <p className="text-sm font-semibold text-foreground">{layout.units}세대</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-md bg-secondary/50 p-2">
            <Layers className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">층수</p>
              <p className="text-sm font-semibold text-foreground">{layout.floors}층</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-md bg-secondary/50 p-2">
            <Car className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">주차대수</p>
              <p className="text-sm font-semibold text-foreground">{layout.parking}대</p>
            </div>
          </div>
        </div>

        {/* GFA and FAR (if available) */}
        {layout.gfa && (
          <div className="mb-4 flex items-center justify-between p-2 rounded-md bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">연면적</span>
            </div>
            <span className="text-sm font-semibold text-foreground">
              {layout.gfa.toLocaleString()}㎡ ({Math.round(layout.gfa / siteArea * 100)}%)
            </span>
          </div>
        )}

        {/* Features */}
        <div className="flex flex-wrap gap-1.5">
          {layout.features.slice(0, 4).map((feature) => (
            <Badge 
              key={feature} 
              variant={feature === "AI 추천" || feature === "전략 최적화" ? "default" : "secondary"} 
              className="text-xs"
            >
              {feature}
            </Badge>
          ))}
          {layout.features.length > 4 && (
            <Badge variant="outline" className="text-xs">
              +{layout.features.length - 4}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
