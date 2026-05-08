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

// ━━━ 전략별 추천 슬라이더 값 ━━━
const STRATEGY_PRESETS: Record<string, { profitVsQuality: number; privacyVsCommunity: number; efficiencyVsSpace: number; recommendedPatterns: string[] }> = {
  'profitability': { profitVsQuality: 20, privacyVsCommunity: 50, efficiencyVsSpace: 20, recommendedPatterns: ['shop-street', 'main-entrance', 'ground-floor', 'building-edge'] },
  'livability': { profitVsQuality: 80, privacyVsCommunity: 65, efficiencyVsSpace: 70, recommendedPatterns: ['courtyard', 'accessible-green', 'balcony', 'rooftop'] },
  'view-priority': { profitVsQuality: 70, privacyVsCommunity: 40, efficiencyVsSpace: 60, recommendedPatterns: ['south-light', 'balcony', 'rooftop', 'two-light', 'cascade-roof'] },
  'privacy-priority': { profitVsQuality: 50, privacyVsCommunity: 15, efficiencyVsSpace: 50, recommendedPatterns: ['quiet-entry', 'intimacy-grad', 'garden-wall', 'gallery-surround'] },
  'area-maximize': { profitVsQuality: 25, privacyVsCommunity: 50, efficiencyVsSpace: 15, recommendedPatterns: ['ceiling-height', 'ground-floor', 'south-light', 'shop-street'] },
  'parking-efficient': { profitVsQuality: 35, privacyVsCommunity: 50, efficiencyVsSpace: 30, recommendedPatterns: ['small-parking', 'walk-safe', 'main-entrance', 'building-edge'] },
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
    id: "privacy" as const,
    emoji: "🔒",
    title: "프라이버시",
    desc: "독립적이고 조용한 공간을 만듭니다",
    strategy: "privacy-priority" as DesignStrategy,
    approach: "combined" as const,
    color: "border-indigo-500/40 bg-indigo-500/5",
    activeColor: "border-indigo-500 bg-indigo-500/15 ring-2 ring-indigo-500/30",
  },
  {
    id: "area" as const,
    emoji: "📐",
    title: "면적 극대화",
    desc: "전용면적을 최대로 확보합니다",
    strategy: "area-maximize" as DesignStrategy,
    approach: "quantitative" as const,
    color: "border-amber-500/40 bg-amber-500/5",
    activeColor: "border-amber-500 bg-amber-500/15 ring-2 ring-amber-500/30",
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
    // 슬라이더 + 패턴 자동 추천
    const preset = STRATEGY_PRESETS[goal.strategy]
    if (preset) {
      setUserValues({
        profitVsQuality: preset.profitVsQuality,
        privacyVsCommunity: preset.privacyVsCommunity,
        efficiencyVsSpace: preset.efficiencyVsSpace,
        selectedPatterns: preset.recommendedPatterns,
      })
    }
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
        <div className="grid grid-cols-2 gap-2.5">
          {GOALS.map(goal => (
            <button
              key={goal.id}
              onClick={() => handleGoalSelect(goal.id)}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                selectedGoal === goal.id ? goal.activeColor : goal.color
              }`}
            >
              <span className="text-xl block mb-1">{goal.emoji}</span>
              <span className="text-xs font-bold block mb-0.5">{goal.title}</span>
              <span className="text-[10px] text-muted-foreground leading-snug block">{goal.desc}</span>
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
