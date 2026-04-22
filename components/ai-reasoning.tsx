"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Brain, 
  Scale, 
  TrendingUp, 
  Sparkles, 
  AlertTriangle,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronUp
} from "lucide-react"
import { useState } from "react"
import type { LayoutScores, AIReasoning, LayoutRecommendation } from "@/lib/design-strategy"

interface AIReasoningPanelProps {
  layoutName: string
  scores: LayoutScores
  reasoning: AIReasoning
  recommendation: LayoutRecommendation
  isRecommended: boolean
}

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold text-foreground">{score}점</span>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  )
}

export function AIReasoningPanel({
  layoutName,
  scores,
  reasoning,
  recommendation,
  isRecommended,
}: AIReasoningPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  // Safe defaults for potentially undefined values
  const safeScores = {
    regulationCompliance: scores?.regulationCompliance ?? 0,
    profitability: scores?.profitability ?? 0,
    marketability: scores?.marketability ?? 0,
    feasibility: scores?.feasibility ?? 0,
    overall: scores?.overall ?? 0,
  }
  
  const safeReasoning = {
    summary: reasoning?.summary ?? '분석 데이터가 없습니다.',
    regulationConsiderations: reasoning?.regulationConsiderations ?? [],
    profitabilityAdvantages: reasoning?.profitabilityAdvantages ?? [],
    designFeatures: reasoning?.designFeatures ?? [],
    risksAndChallenges: reasoning?.risksAndChallenges ?? [],
  }
  
  const safeRecommendation = {
    isRecommended: recommendation?.isRecommended ?? false,
    reasons: recommendation?.reasons ?? [],
    warnings: recommendation?.warnings ?? [],
    strategyMatch: recommendation?.strategyMatch ?? 0,
  }

  const getScoreColor = (score: number) => {
    if (score >= 85) return "bg-emerald-500"
    if (score >= 70) return "bg-primary"
    if (score >= 55) return "bg-amber-500"
    return "bg-red-500"
  }

  const getOverallGrade = (score: number) => {
    if (score >= 90) return { grade: "S", label: "최우수", color: "text-emerald-500" }
    if (score >= 80) return { grade: "A", label: "우수", color: "text-primary" }
    if (score >= 70) return { grade: "B", label: "양호", color: "text-blue-500" }
    if (score >= 60) return { grade: "C", label: "보통", color: "text-amber-500" }
    return { grade: "D", label: "개선필요", color: "text-red-500" }
  }

  const overall = getOverallGrade(safeScores.overall)

  return (
    <Card className={`border-border ${isRecommended ? "ring-2 ring-primary/30" : ""}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70">
              <Brain className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">AI 분석 결과</CardTitle>
              <p className="text-xs text-muted-foreground">{layoutName}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isRecommended && (
              <Badge className="bg-primary text-primary-foreground gap-1">
                <Sparkles className="h-3 w-3" />
                추천
              </Badge>
            )}
            <div className="text-center">
              <div className={`text-2xl font-bold ${overall.color}`}>{overall.grade}</div>
              <div className="text-[10px] text-muted-foreground">{overall.label}</div>
            </div>
          </div>
        </div>
        
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-2"
        >
          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {isExpanded ? "접기" : "자세히 보기"}
        </button>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Score Summary */}
        <div className="grid grid-cols-2 gap-3">
          <ScoreBar label="법규 적합성" score={safeScores.regulationCompliance} color={getScoreColor(safeScores.regulationCompliance)} />
          <ScoreBar label="사업성" score={safeScores.profitability} color={getScoreColor(safeScores.profitability)} />
          <ScoreBar label="상품성" score={safeScores.marketability} color={getScoreColor(safeScores.marketability)} />
          <ScoreBar label="실현 가능성" score={safeScores.feasibility} color={getScoreColor(safeScores.feasibility)} />
        </div>

        {/* Overall Score */}
        <div className="flex items-center justify-between rounded-lg bg-secondary/50 p-3">
          <span className="text-sm font-medium text-foreground">종합 점수</span>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className={`h-full rounded-full ${getScoreColor(safeScores.overall)}`}
                style={{ width: `${safeScores.overall}%` }}
              />
            </div>
            <span className={`text-lg font-bold ${overall.color}`}>{safeScores.overall}점</span>
          </div>
        </div>

        {isExpanded && (
          <>
            {/* AI Summary */}
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-sm text-foreground leading-relaxed">
                {safeReasoning.summary}
              </p>
            </div>

            {/* Recommendation Reasons */}
            {safeRecommendation.reasons.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <h4 className="text-sm font-medium text-foreground">추천 이유</h4>
                </div>
                <ul className="space-y-1.5 pl-6">
                  {safeRecommendation.reasons.map((reason, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                      <div className="h-1 w-1 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Warnings */}
            {safeRecommendation.warnings.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <h4 className="text-sm font-medium text-foreground">유의 사항</h4>
                </div>
                <ul className="space-y-1.5 pl-6">
                  {safeRecommendation.warnings.map((warning, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                      <div className="h-1 w-1 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Regulation Considerations */}
            {safeReasoning.regulationConsiderations.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Scale className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-medium text-foreground">법규 검토 사항</h4>
                </div>
                <ul className="space-y-1.5 pl-6">
                  {safeReasoning.regulationConsiderations.slice(0, 4).map((item, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                      <div className="h-1 w-1 rounded-full bg-primary mt-1.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Profitability Advantages */}
            {safeReasoning.profitabilityAdvantages.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  <h4 className="text-sm font-medium text-foreground">사업성 장점</h4>
                </div>
                <ul className="space-y-1.5 pl-6">
                  {safeReasoning.profitabilityAdvantages.map((item, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                      <div className="h-1 w-1 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Design Features */}
            {safeReasoning.designFeatures.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4 text-blue-500" />
                  <h4 className="text-sm font-medium text-foreground">설계 특징</h4>
                </div>
                <ul className="space-y-1.5 pl-6">
                  {safeReasoning.designFeatures.map((item, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                      <div className="h-1 w-1 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Risks */}
            {safeReasoning.risksAndChallenges.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <h4 className="text-sm font-medium text-foreground">리스크 및 과제</h4>
                </div>
                <ul className="space-y-1.5 pl-6">
                  {safeReasoning.risksAndChallenges.map((item, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                      <div className="h-1 w-1 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Strategy Match */}
            <div className="rounded-lg border border-dashed border-border p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">전략 부합도</p>
              <div className="flex items-center justify-center gap-2">
                <div className="w-32 h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={`h-full rounded-full ${getScoreColor(safeRecommendation.strategyMatch)}`}
                    style={{ width: `${safeRecommendation.strategyMatch}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-foreground">{safeRecommendation.strategyMatch}%</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
