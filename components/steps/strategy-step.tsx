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

// ━━━ 타겟 고객 프리셋 ━━━
const TARGET_PRESETS = [
  { id: 'family', emoji: '👨‍👩‍👧‍👦', label: '신혼·가족', goalId: 'comfort', desc: '아이와 함께 살기 좋은 환경',
    values: { profitVsQuality: 85, privacyVsCommunity: 70, efficiencyVsSpace: 75 },
    patterns: ['courtyard', 'connected-play', 'walk-safe', 'accessible-green', 'balcony'] },
  { id: 'investor', emoji: '💼', label: '투자·임대', goalId: 'profit', desc: '최대 수익률 추구',
    values: { profitVsQuality: 15, privacyVsCommunity: 50, efficiencyVsSpace: 15 },
    patterns: ['shop-street', 'ground-floor', 'main-entrance', 'building-edge'] },
  { id: 'retiree', emoji: '🏖️', label: '은퇴·세컨', goalId: 'view', desc: '조용하고 전망 좋은 공간',
    values: { profitVsQuality: 75, privacyVsCommunity: 20, efficiencyVsSpace: 65 },
    patterns: ['balcony', 'rooftop', 'south-light', 'quiet-entry', 'garden-wall'] },
  { id: 'premium', emoji: '🏢', label: '프리미엄', goalId: 'privacy', desc: '독립적인 고급 주거',
    values: { profitVsQuality: 60, privacyVsCommunity: 10, efficiencyVsSpace: 55 },
    patterns: ['quiet-entry', 'intimacy-grad', 'ceiling-height', 'two-light', 'private-terrace'] },
]

// ━━━ 결과 미리보기 텍스트 ━━━
const PREVIEW_TEXTS: Record<string, { building: string; atmosphere: string; features: string }> = {
  'profitability': {
    building: '효율적이고 밀집된 배치, 정돈된 격자 창문의 깔끔한 외관',
    atmosphere: '수익 극대화를 위한 실용적 디자인',
    features: '1층 상가, 품격 있는 입구, 활기찬 저층부',
  },
  'livability': {
    building: '넓은 발코니와 커뮤니티 정원이 있는 따뜻한 분위기',
    atmosphere: '가족 친화적이고 살기 좋은 환경',
    features: '놀이마당, 접근 가능한 녹지, 옥상정원',
  },
  'view-priority': {
    building: '대형 창문과 계단식 테라스, 파노라마 유리 파사드',
    atmosphere: '조망과 채광을 극대화한 프리미엄 설계',
    features: '남향 채광, 깊은 발코니, 옥상 테라스, 양면 채광',
  },
  'privacy-priority': {
    building: '차폐된 발코니, 엇갈린 세대 배치, 식재 차폐막',
    atmosphere: '조용하고 독립적인 프라이빗 공간',
    features: '단계적 진입, 생울타리 담장, 마당을 감싸는 형태',
  },
  'area-maximize': {
    building: '최대 볼륨의 건물, 플러시 파사드, 높은 천장',
    atmosphere: '전용면적을 최대로 확보한 효율적 설계',
    features: '높은 천장, 남향 배치, 1층 상가 활용',
  },
  'parking-efficient': {
    building: '지하 주차 중심, 실용적이고 정돈된 디자인',
    atmosphere: '주차와 동선 효율을 최적화한 설계',
    features: '숨겨진 주차장, 안전한 보행 동선, 품격 입구',
  },
}

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
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null)

  const handleGoalSelect = (goalId: string) => {
    const goal = GOALS.find(g => g.id === goalId)
    if (!goal) return
    setSelectedGoal(goalId)
    setSelectedTarget(null) // 카드 직접 선택 시 프리셋 해제
    setStrategy(goal.strategy)
    setDesignApproach(goal.approach)
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

  const handleTargetSelect = (targetId: string) => {
    const target = TARGET_PRESETS.find(t => t.id === targetId)
    if (!target) return
    setSelectedTarget(targetId)
    // 매칭 카드 선택
    const goal = GOALS.find(g => g.id === target.goalId)
    if (goal) {
      setSelectedGoal(goal.id)
      setStrategy(goal.strategy)
      setDesignApproach(goal.approach)
    }
    // 타겟 전용 가치관 + 패턴 적용
    setUserValues({
      profitVsQuality: target.values.profitVsQuality,
      privacyVsCommunity: target.values.privacyVsCommunity,
      efficiencyVsSpace: target.values.efficiencyVsSpace,
      selectedPatterns: target.patterns,
    })
  }

  const handleStart = () => {
    handleGenerate()
  }

  const preview = PREVIEW_TEXTS[strategy]

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

      {/* 타겟 고객 프리셋 */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">누구를 위한 건물인가요?</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TARGET_PRESETS.map(t => (
            <button
              key={t.id}
              onClick={() => handleTargetSelect(t.id)}
              className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                selectedTarget === t.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card/50 text-muted-foreground hover:bg-muted/50'
              }`}
            >
              <span className="mr-1">{t.emoji}</span>{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 설계 방향 6개 카드 */}
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

      {/* 결과 미리보기 */}
      {preview && (
        <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3 space-y-1.5">
          <p className="text-[10px] font-semibold text-primary">🎨 AI가 생성할 건물 미리보기</p>
          <p className="text-[11px] text-foreground leading-relaxed">
            {preview.building}
          </p>
          <p className="text-[10px] text-muted-foreground">
            ✨ {preview.features}
          </p>
        </div>
      )}

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
