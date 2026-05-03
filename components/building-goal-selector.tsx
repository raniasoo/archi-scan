"use client"

import { useState } from "react"
import { DesignStrategy } from "@/lib/design-strategy"

interface BuildingGoal {
  id: string
  emoji: string
  label: string
  desc: string
  strategies: DesignStrategy[]
}

const BUILDING_GOALS: BuildingGoal[] = [
  {
    id: "profit",
    emoji: "💰",
    label: "수익 극대화",
    desc: "투자 대비 최대 수익을 원합니다",
    strategies: ["profitability", "area-maximize"],
  },
  {
    id: "living",
    emoji: "🏡",
    label: "쾌적한 주거",
    desc: "살기 좋은 환경이 우선입니다",
    strategies: ["livability", "view-priority"],
  },
  {
    id: "landmark",
    emoji: "✨",
    label: "랜드마크",
    desc: "지역의 상징이 될 건물을 원합니다",
    strategies: ["view-priority", "area-maximize"],
  },
  {
    id: "practical",
    emoji: "🔧",
    label: "실용적 설계",
    desc: "주차와 동선이 편리해야 합니다",
    strategies: ["parking-efficient", "livability"],
  },
]

const BUILDING_USES: { id: string; emoji: string; label: string }[] = [
  { id: "apartment", emoji: "🏢", label: "공동주택" },
  { id: "officetel", emoji: "🏬", label: "오피스텔" },
  { id: "mixed", emoji: "🏙", label: "주상복합" },
  { id: "commercial", emoji: "🏪", label: "상업시설" },
]

interface Props {
  onRecommend: (strategies: DesignStrategy[]) => void
  onSkip: () => void
}

export function BuildingGoalSelector({ onRecommend, onSkip }: Props) {
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null)
  const [selectedUse, setSelectedUse] = useState<string | null>(null)

  const handleConfirm = () => {
    const goal = BUILDING_GOALS.find(g => g.id === selectedGoal)
    if (goal) {
      onRecommend(goal.strategies)
    }
  }

  return (
    <div className="space-y-6">
      {/* 건물 목표 */}
      <div>
        <h3 className="text-sm font-semibold mb-1">어떤 건물을 만들고 싶으세요?</h3>
        <p className="text-xs text-muted-foreground mb-3">목표에 맞는 배치 전략을 추천해드립니다</p>
        <div className="grid grid-cols-2 gap-2">
          {BUILDING_GOALS.map(goal => (
            <button
              key={goal.id}
              onClick={() => setSelectedGoal(goal.id)}
              className={`p-3 rounded-xl text-left transition-all ${
                selectedGoal === goal.id
                  ? "bg-primary/10 border-2 border-primary shadow-sm"
                  : "bg-card border border-border hover:border-primary/40"
              }`}
            >
              <span className="text-2xl block mb-1">{goal.emoji}</span>
              <span className="text-sm font-semibold block">{goal.label}</span>
              <span className="text-[11px] text-muted-foreground">{goal.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 건물 용도 */}
      <div>
        <h3 className="text-sm font-semibold mb-1">주요 용도는?</h3>
        <p className="text-xs text-muted-foreground mb-3">용도지역에 따라 자동 추천됩니다 (선택 사항)</p>
        <div className="grid grid-cols-4 gap-2">
          {BUILDING_USES.map(use => (
            <button
              key={use.id}
              onClick={() => setSelectedUse(selectedUse === use.id ? null : use.id)}
              className={`p-2 rounded-lg text-center transition-all ${
                selectedUse === use.id
                  ? "bg-primary/10 border-2 border-primary"
                  : "bg-card border border-border hover:border-primary/40"
              }`}
            >
              <span className="text-xl block">{use.emoji}</span>
              <span className="text-[11px] font-medium">{use.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 버튼 */}
      <div className="flex gap-2">
        <button
          onClick={handleConfirm}
          disabled={!selectedGoal}
          className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {selectedGoal ? "추천 전략 보기 →" : "목표를 선택해주세요"}
        </button>
        <button
          onClick={onSkip}
          className="px-4 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors"
        >
          건너뛰기
        </button>
      </div>
    </div>
  )
}
