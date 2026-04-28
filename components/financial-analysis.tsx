"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, TrendingDown, Banknote, Building, Landmark, Percent } from "lucide-react"

interface FinancialData {
  landCost: number
  constructionCost: number
  softCosts: number
  totalCost: number
  projectedRevenue: number
  profit: number
  roi: number
  costPerSqm: number
  revenuePerUnit: number
}

// Centralized feasibility result from parent
interface CentralizedFeasibilityResult {
  landCost: number
  constructionCost: number
  softCost: number
  totalCost: number
  totalRevenue: number
  profit: number
  roi: number
}

interface FinancialAnalysisProps {
  siteArea: number
  gfa: number
  units: number
  floors: number
  // NEW: Use centralized result if provided
  feasibilityResult?: CentralizedFeasibilityResult | null
  landPricePerM2?: number
}

/**
 * Local fallback calculation - matches project-analysis-state.ts calculateFeasibility
 * Used only when feasibilityResult is not provided from parent
 * IMPORTANT: Keep in sync with lib/project-analysis-state.ts calculateFeasibility
 */
function calculateFinancials(siteArea: number, gfa: number, units: number, floors: number): FinancialData {
  // 비용 가정 (㎡당 단가 - 원화 기준) - 공통 함수와 동일하게 설정
  const landPricePerSqm = 5000000 // 토지 ㎡당 500만원 (공통 함수와 동일)
  const constructionCostPerSqm = 2500000 // 공사비 ㎡당 250만원 (공통 함수와 동일)
  const softCostPercentage = 0.15 // 간접비 15%
  
  // 층수 프리미엄 (공통 함수와 동일)
  const heightPremium = floors > 15 ? 1.15 : floors > 10 ? 1.08 : 1.0
  
  // 수익 가정
  const salesPricePerSqm = 8000000 // 분양가 ㎡당 800만원 (공통 함수와 동일)
  
  // 계산
  const landCost = siteArea * landPricePerSqm
  const constructionCost = gfa * constructionCostPerSqm * heightPremium
  const softCosts = constructionCost * softCostPercentage
  const totalCost = landCost + constructionCost + softCosts
  
  const projectedRevenue = gfa * salesPricePerSqm // 연면적 기반 (공통 함수와 동일)
  const profit = projectedRevenue - totalCost
  const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0
  
  return {
    landCost,
    constructionCost,
    softCosts,
    totalCost,
    projectedRevenue,
    profit,
    roi,
    costPerSqm: totalCost / Math.max(gfa, 1),
    revenuePerUnit: projectedRevenue / Math.max(units, 1),
  }
}

function formatKRW(value: number): string {
  if (value >= 100000000) {
    return `${(value / 100000000).toFixed(1)}억원`
  }
  if (value >= 10000) {
    return `${(value / 10000).toFixed(0)}만원`
  }
  return `${value.toLocaleString()}원`
}

export function FinancialAnalysis({ siteArea, gfa, units, floors, feasibilityResult, landPricePerM2 }: FinancialAnalysisProps) {
  // Use centralized result if provided, otherwise calculate locally (fallback)
  const effectiveLandPrice = landPricePerM2 || 5000000
  const localData = calculateFinancials(siteArea, gfa, units, floors)
  
  const data: FinancialData = feasibilityResult ? {
    landCost: feasibilityResult.landCost,
    constructionCost: feasibilityResult.constructionCost,
    softCosts: feasibilityResult.softCost,
    totalCost: feasibilityResult.totalCost,
    projectedRevenue: feasibilityResult.totalRevenue,
    profit: feasibilityResult.profit,
    roi: feasibilityResult.roi,
    costPerSqm: feasibilityResult.totalCost / Math.max(gfa, 1),
    revenuePerUnit: feasibilityResult.totalRevenue / Math.max(units, 1),
  } : localData
  
  const isProfitable = data.profit > 0
  
  const costBreakdown = [
    { label: "토지 매입비", value: data.landCost, percentage: (data.landCost / data.totalCost) * 100, color: "bg-chart-1" },
    { label: "공사비", value: data.constructionCost, percentage: (data.constructionCost / data.totalCost) * 100, color: "bg-chart-2" },
    { label: "간접비 (설계/인허가/금융)", value: data.softCosts, percentage: (data.softCosts / data.totalCost) * 100, color: "bg-chart-3" },
  ]
  
  return (
    <div className="flex flex-col gap-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Landmark className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">총 투자비</p>
                <p className="text-xl font-bold text-foreground">{formatKRW(data.totalCost)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/10">
                <Banknote className="h-5 w-5 text-chart-2" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">예상 매출</p>
                <p className="text-xl font-bold text-foreground">{formatKRW(data.projectedRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isProfitable ? "bg-green-500/10" : "bg-destructive/10"}`}>
                {isProfitable ? (
                  <TrendingUp className="h-5 w-5 text-green-500" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-destructive" />
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {isProfitable ? "예상 수익" : "예상 손실"}
                </p>
                <p className={`text-xl font-bold ${isProfitable ? "text-green-500" : "text-destructive"}`}>
                  {isProfitable ? "" : "-"}{formatKRW(Math.abs(data.profit))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${data.roi >= 0 ? "bg-green-500/10" : "bg-destructive/10"}`}>
                <Percent className={`h-5 w-5 ${data.roi >= 0 ? "text-green-500" : "text-destructive"}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">수익률(ROI)</p>
                <p className={`text-xl font-bold ${data.roi >= 0 ? "text-green-500" : "text-destructive"}`}>
                  {data.roi.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Cost Breakdown */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building className="h-4 w-4 text-primary" />
            투자비 구성
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {costBreakdown.map((item) => (
            <div key={item.label} className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium text-foreground">{formatKRW(item.value)}</span>
              </div>
              <div className="flex items-center gap-3">
                <Progress value={item.percentage} className={`h-2 flex-1`} />
                <span className="w-12 text-right text-xs text-muted-foreground">{item.percentage.toFixed(0)}%</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      
      {/* Calculation Details */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">세부 계산식</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Cost Calculation */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground border-b pb-2">투자비 계산</p>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">토지 매입비</span>
                  <span className="font-mono">{siteArea.toLocaleString()}㎡ × {Math.round(effectiveLandPrice / 10000).toLocaleString()}만원 = {formatKRW(data.landCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">공사비</span>
                  <span className="font-mono">{gfa.toLocaleString()}㎡ × 250만원 = {formatKRW(data.constructionCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">간접비 (설계/인허가/금융)</span>
                  <span className="font-mono">공사비 × 15% = {formatKRW(data.softCosts)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t font-medium">
                  <span className="text-foreground">총 투자비</span>
                  <span className="text-foreground">{formatKRW(data.totalCost)}</span>
                </div>
              </div>
            </div>
            
            {/* Revenue Calculation */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground border-b pb-2">매출/수익 계산</p>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">분양 매출</span>
                  <span className="font-mono">{gfa.toLocaleString()}㎡ × 800만원 = {formatKRW(data.projectedRevenue)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>(연면적 기준 산정)</span>
                  <span className="font-mono">㎡당 분양가 적용</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-foreground font-medium">{isProfitable ? '예상 수익' : '예상 손실'}</span>
                  <span className={`font-medium ${isProfitable ? 'text-green-500' : 'text-destructive'}`}>
                    {formatKRW(data.projectedRevenue)} - {formatKRW(data.totalCost)} = {isProfitable ? '' : '-'}{formatKRW(Math.abs(data.profit))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Key Metrics */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">주요 재무 지표</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-secondary/50 p-4">
              <p className="text-xs text-muted-foreground">㎡당 총 사업비 (연면적 기준)</p>
              <p className="text-lg font-semibold text-foreground">{formatKRW(data.costPerSqm)}</p>
            </div>
            <div className="rounded-lg bg-secondary/50 p-4">
              <p className="text-xs text-muted-foreground">세대당 평균 분양가</p>
              <p className="text-lg font-semibold text-foreground">{formatKRW(data.revenuePerUnit)}</p>
            </div>
            <div className="rounded-lg bg-secondary/50 p-4">
              <p className="text-xs text-muted-foreground">세대당 손익분기 분양가</p>
              <p className="text-lg font-semibold text-foreground">{formatKRW(data.totalCost / units)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
