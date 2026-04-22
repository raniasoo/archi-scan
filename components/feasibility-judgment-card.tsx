"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2,
  XCircle,
  Lightbulb,
  Target
} from "lucide-react"

export type FeasibilityJudgment = 'profitable' | 'marginal' | 'unprofitable'

export interface FeasibilityAnalysis {
  judgment: FeasibilityJudgment
  roi: number
  breakEvenRate: number
  mainCauses: string[]
  improvements: string[]
}

interface FeasibilityJudgmentCardProps {
  analysis: FeasibilityAnalysis
}

const JUDGMENT_CONFIG: Record<FeasibilityJudgment, {
  label: string
  description: string
  badgeClass: string
  bgClass: string
  borderClass: string
  icon: typeof TrendingUp
  iconClass: string
}> = {
  profitable: {
    label: '사업 가능',
    description: '현재 조건에서 사업 추진이 가능합니다',
    badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    bgClass: 'bg-emerald-500/5',
    borderClass: 'border-emerald-500/30',
    icon: CheckCircle2,
    iconClass: 'text-emerald-500',
  },
  marginal: {
    label: '검토 필요',
    description: '조건 개선 시 사업 가능성이 있습니다',
    badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    bgClass: 'bg-amber-500/5',
    borderClass: 'border-amber-500/30',
    icon: AlertTriangle,
    iconClass: 'text-amber-500',
  },
  unprofitable: {
    label: '수익성 부족',
    description: '현재 조건에서는 사업성 확보가 어렵습니다',
    badgeClass: 'bg-red-500/20 text-red-400 border-red-500/30',
    bgClass: 'bg-red-500/5',
    borderClass: 'border-red-500/30',
    icon: XCircle,
    iconClass: 'text-red-500',
  },
}

export function analyzeFeasibility(
  roi: number,
  breakEvenRate: number,
  landCostRatio: number,
  unitCount: number,
  parkingRatio: number
): FeasibilityAnalysis {
  // Determine judgment based on ROI
  let judgment: FeasibilityJudgment
  if (roi >= 15) {
    judgment = 'profitable'
  } else if (roi >= 8) {
    judgment = 'marginal'
  } else {
    judgment = 'unprofitable'
  }

  // Identify main causes
  const mainCauses: string[] = []
  if (landCostRatio > 40) {
    mainCauses.push('토지 매입비 비중 과다')
  }
  if (unitCount < 20) {
    mainCauses.push('세대수 부족으로 분양수익 한계')
  }
  if (parkingRatio > 1.3) {
    mainCauses.push('주차 확보 부담이 큼')
  }
  if (breakEvenRate > 85) {
    mainCauses.push('손익분기점이 높아 리스크 있음')
  }
  if (roi < 10) {
    mainCauses.push('투자 대비 수익률이 낮음')
  }
  
  // Add positive causes for profitable projects
  if (judgment === 'profitable') {
    mainCauses.length = 0 // Clear negative causes
    if (roi >= 20) mainCauses.push('높은 투자수익률 확보')
    if (breakEvenRate < 75) mainCauses.push('안정적인 손익분기점')
    if (landCostRatio < 35) mainCauses.push('토지비 비중 적정')
  }

  // Suggest improvements
  const improvements: string[] = []
  if (judgment !== 'profitable') {
    if (landCostRatio > 40) {
      improvements.push('토지 매입가 협상 또는 대안 부지 검토')
    }
    if (unitCount < 25) {
      improvements.push('세대 구성 최적화로 세대수 증가')
    }
    if (parkingRatio > 1.2) {
      improvements.push('주차 방식 변경 (기계식/지하확장) 검토')
    }
    improvements.push('분양가 가정 재검토')
    if (breakEvenRate > 80) {
      improvements.push('공사비 절감 방안 검토')
    }
  } else {
    improvements.push('현재 조건 유지하며 세부 설계 진행')
    improvements.push('분양 시장 동향 모니터링')
    improvements.push('인허가 일정 확인 후 착수')
  }

  return {
    judgment,
    roi,
    breakEvenRate,
    mainCauses: mainCauses.slice(0, 3),
    improvements: improvements.slice(0, 3),
  }
}

export function FeasibilityJudgmentCard({ analysis }: FeasibilityJudgmentCardProps) {
  const config = JUDGMENT_CONFIG[analysis.judgment]
  const Icon = config.icon

  return (
    <Card className={`${config.bgClass} ${config.borderClass} border`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <span className="text-base font-semibold">사업성 종합 판단</span>
          </div>
          <Badge className={`${config.badgeClass} border text-xs px-2`}>
            <Icon className={`h-3 w-3 mr-1 ${config.iconClass}`} />
            {config.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/50">
          <Icon className={`h-8 w-8 ${config.iconClass}`} />
          <div>
            <p className="text-sm font-medium text-foreground">{config.description}</p>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span>예상 수익률: <span className="font-semibold text-foreground">{analysis.roi.toFixed(1)}%</span></span>
              <span>손익분기: <span className="font-semibold text-foreground">{analysis.breakEvenRate.toFixed(1)}%</span></span>
            </div>
          </div>
        </div>

        {/* Main Causes */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            {analysis.judgment === 'profitable' ? (
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-amber-500" />
            )}
            <span className="text-xs font-medium text-foreground">
              {analysis.judgment === 'profitable' ? '주요 강점' : '주요 원인'}
            </span>
          </div>
          <ul className="space-y-1.5">
            {analysis.mainCauses.map((cause, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs">
                <span className={`mt-1 h-1.5 w-1.5 rounded-full shrink-0 ${
                  analysis.judgment === 'profitable' ? 'bg-emerald-500' : 'bg-amber-500'
                }`} />
                <span className="text-muted-foreground">{cause}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Improvements */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Lightbulb className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-foreground">
              {analysis.judgment === 'profitable' ? '다음 단계' : '개선 방향'}
            </span>
          </div>
          <ul className="space-y-1.5">
            {analysis.improvements.map((imp, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                <span className="text-muted-foreground">{imp}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
