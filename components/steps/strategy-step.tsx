"use client"

import { useState, type Dispatch, type SetStateAction } from "react"
import { Button } from "@/components/ui/button"
import { ChevronRight, ChevronDown, Brain, Sparkles } from "lucide-react"
import type { ZoningRegulation } from "@/lib/regulation-types"
import type { DesignStrategy } from "@/lib/design-strategy"
import type { UserValues } from "@/lib/pattern-quality"
import type { LegalSummary } from "@/lib/project-analysis-state"
import { safeNumber } from "@/lib/project-analysis-state"
import dynamic from "next/dynamic"

const ValuePrioritySelector = dynamic(() => import("@/components/value-priority-selector").then(m => ({ default: m.ValuePrioritySelector })))

export interface StrategyStepProps {
  address: string
  siteArea: string
  strategy: DesignStrategy
  setStrategy: Dispatch<SetStateAction<DesignStrategy>>
  designApproach: 'quantitative' | 'alexander' | 'combined'
  setDesignApproach: Dispatch<SetStateAction<'quantitative' | 'alexander' | 'combined'>>
  userValues: UserValues
  setUserValues: Dispatch<SetStateAction<UserValues>>
  regulation: ZoningRegulation
  legalSummary: LegalSummary | null
  molitSupplementData: Record<string, unknown>
  handleStrategyComplete: () => void
  handleGenerate: () => void
}

const GOALS = [
  {
    id: "profit" as const,
    emoji: "💰",
    title: "수익 극대화",
    desc: "투자 대비 최대 수익을 추구합니다",
    strategy: "profitability" as DesignStrategy,
    approach: "quantitative" as const,
    color: "border-emerald-500/40 bg-emerald-500/5",
    activeColor: "border-emerald-500 bg-emerald-500/15 ring-2 ring-emerald-500/30",
  },
  {
    id: "comfort" as const,
    emoji: "🏠",
    title: "쾌적한 주거",
    desc: "살기 좋은 환경이 우선입니다",
    strategy: "livability" as DesignStrategy,
    approach: "combined" as const,
    color: "border-blue-500/40 bg-blue-500/5",
    activeColor: "border-blue-500 bg-blue-500/15 ring-2 ring-blue-500/30",
  },
  {
    id: "view" as const,
    emoji: "🌇",
    title: "조망·프리미엄",
    desc: "조망과 브랜드 가치를 높입니다",
    strategy: "view-priority" as DesignStrategy,
    approach: "combined" as const,
    color: "border-purple-500/40 bg-purple-500/5",
    activeColor: "border-purple-500 bg-purple-500/15 ring-2 ring-purple-500/30",
  },
  {
    id: "practical" as const,
    emoji: "⚙️",
    title: "실용적 설계",
    desc: "주차·동선 효율을 최적화합니다",
    strategy: "parking-efficient" as DesignStrategy,
    approach: "quantitative" as const,
    color: "border-slate-500/40 bg-slate-500/5",
    activeColor: "border-slate-500 bg-slate-500/15 ring-2 ring-slate-500/30",
  },
]

export function StrategyStep(props: StrategyStepProps) {
  const {
    address, siteArea, strategy, setStrategy,
    designApproach, setDesignApproach, userValues, setUserValues,
    regulation, legalSummary, molitSupplementData,
    handleStrategyComplete, handleGenerate,
  } = props

  const [selectedGoal, setSelectedGoal] = useState<string>(() => {
    const match = GOALS.find(g => g.strategy === strategy)
    return match?.id || "profit"
  })
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleGoalSelect = (goalId: string) => {
    const goal = GOALS.find(g => g.id === goalId)
    if (!goal) return
    setSelectedGoal(goalId)
    setStrategy(goal.strategy)
    setDesignApproach(goal.approach)
  }

  const handleStart = () => {
    handleGenerate()
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Brain className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">설계 방향 선택</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {address} · {Number(siteArea).toLocaleString()}㎡
        </p>
      </div>

      {/* 하나의 질문, 4개 선택지 */}
      <div>
        <h3 className="text-base font-semibold mb-3">어떤 건물을 만들고 싶으세요?</h3>
        <div className="grid grid-cols-2 gap-3">
          {GOALS.map(goal => (
            <button
              key={goal.id}
              onClick={() => handleGoalSelect(goal.id)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                selectedGoal === goal.id ? goal.activeColor : goal.color
              }`}
            >
              <span className="text-2xl block mb-2">{goal.emoji}</span>
              <span className="text-sm font-bold block mb-0.5">{goal.title}</span>
              <span className="text-xs text-muted-foreground leading-snug block">{goal.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 배치안 생성 CTA */}
      <Button
        onClick={handleStart}
        size="lg"
        className="w-full gap-2 py-6 text-base font-bold"
      >
        <Sparkles className="h-5 w-5" />
        AI 배치안 생성하기
        <ChevronRight className="h-5 w-5" />
      </Button>

      {/* 고급 설정 토글 */}
      <div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
        >
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          고급 설정
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4">
            {/* 세부 전략 선택 */}
            <div className="border border-border/60 rounded-xl p-4 bg-card/50">
              <p className="text-xs font-semibold mb-2">세부 전략</p>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: "profitability" as DesignStrategy, label: "수익성" },
                  { id: "livability" as DesignStrategy, label: "실거주" },
                  { id: "view-priority" as DesignStrategy, label: "조망" },
                  { id: "privacy-priority" as DesignStrategy, label: "프라이버시" },
                  { id: "area-maximize" as DesignStrategy, label: "면적최대" },
                  { id: "parking-efficient" as DesignStrategy, label: "주차효율" },
                ].map(s => (
                  <button
                    key={s.id}
                    onClick={() => setStrategy(s.id)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                      strategy === s.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 가치 우선순위 슬라이더 */}
            <ValuePrioritySelector
              values={userValues}
              onChange={setUserValues}
            />
          </div>
        )}
      </div>
    </div>
  )
}
