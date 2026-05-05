"use client"

import { type Dispatch, type SetStateAction } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { ChevronRight, Brain } from "lucide-react"
import type { ZoningRegulation } from "@/lib/regulation-types"
import type { DesignStrategy } from "@/lib/design-strategy"
import type { UserValues } from "@/lib/pattern-quality"
import type { LegalSummary } from "@/lib/project-analysis-state"
import { safeNumber } from "@/lib/project-analysis-state"

const StrategySelection = dynamic(() => import("@/components/strategy-selection").then(m => ({ default: m.StrategySelection })))
const ValuePrioritySelector = dynamic(() => import("@/components/value-priority-selector").then(m => ({ default: m.ValuePrioritySelector })))
const BuildingGoalSelector = dynamic(() => import("@/components/building-goal-selector").then(m => ({ default: m.BuildingGoalSelector })))

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

export function StrategyStep(props: StrategyStepProps) {
  const {
    address, siteArea, strategy, setStrategy,
    designApproach, setDesignApproach, userValues, setUserValues,
    regulation, legalSummary, molitSupplementData,
    handleStrategyComplete, handleGenerate,
  } = props

  return (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Brain className="h-5 w-5 text-primary" />
                  <h2 className="text-xl md:text-2xl font-bold text-foreground">AI 설계 전략</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  {address} · {Number(siteArea).toLocaleString()}㎡ | 배치안 생성 방향을 선택하세요
                </p>
              </div>
              <Button onClick={handleStrategyComplete} className="gap-2 w-full md:w-auto">
                법규 검토
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* 설계 접근 방식 선택 */}
            <div className="border border-border/60 rounded-xl p-4 bg-card">
              <h3 className="text-sm font-semibold mb-1">설계 접근 방식</h3>
              <p className="text-[11px] text-muted-foreground mb-3">어떤 관점으로 배치안을 평가할까요?</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'quantitative' as const, emoji: '📊', label: '사업성 중심', desc: 'ROI·수익률 최적화' },
                  { id: 'alexander' as const, emoji: '🏛️', label: '건축 철학', desc: '패턴·거주 품질 중심' },
                  { id: 'combined' as const, emoji: '⚖️', label: '균형 (추천)', desc: '수익 + 품질 모두' },
                ].map(a => (
                  <button
                    key={a.id}
                    onClick={() => setDesignApproach(a.id)}
                    className={`p-2.5 rounded-lg text-left border transition-all ${
                      designApproach === a.id
                        ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                        : 'border-border/50 hover:border-border'
                    }`}
                  >
                    <div className="text-lg mb-0.5">{a.emoji}</div>
                    <div className="text-xs font-semibold">{a.label}</div>
                    <div className="text-[10px] text-muted-foreground">{a.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 건물 목표 선택 — 사업성/균형 모드 */}
            {designApproach !== 'alexander' && (
            <div className="border border-primary/20 rounded-xl p-4 bg-gradient-to-br from-primary/5 to-blue-500/5">
              <BuildingGoalSelector
                onRecommend={(strategies) => {
                  if (strategies.length > 0) {
                    setStrategy(strategies[0])
                    setTimeout(() => handleGenerate(), 300)
                  }
                }}
                onSkip={() => handleGenerate()}
              />
            </div>
            )}

            {/* 가치 우선순위 — 알렉산더/균형 모드 */}
            {designApproach !== 'quantitative' && (
            <ValuePrioritySelector
              values={userValues}
              onChange={setUserValues}
            />
            )}

            {/* 알렉산더 모드 전용: 패턴 기반 배치안 생성 */}
            {designApproach === 'alexander' && (
              <div className="border border-amber-500/30 rounded-xl p-4 bg-gradient-to-br from-amber-500/5 to-orange-500/5">
                <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">🏛️ 패턴 기반 배치안 생성</h3>
                <p className="text-[11px] text-muted-foreground mb-3">선택한 가치관과 패턴에 맞는 배치안을 생성합니다</p>
                <button
                  onClick={() => handleGenerate()}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-colors"
                >
                  패턴 기반 배치안 생성 →
                </button>
              </div>
            )}

            <div className="flex items-center gap-3 px-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">또는 직접 전략을 선택하세요</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <StrategySelection 
  selected={strategy} 
  onChange={setStrategy}
  legalSummary={legalSummary}
  siteConditions={{
    siteArea: safeNumber(siteArea, 660),
    zoneType: (molitSupplementData as any).zoneCode || regulation.zoneType,
    roadCondition: `${(molitSupplementData as any).roadWidth || regulation.roadWidth}m 이상`,
    heightLimit: String((molitSupplementData as any).heightLimit || regulation.maxHeight),
    districtPlan: ((molitSupplementData as any).hasDistrictPlan ?? regulation.additionalNotes.includes('지구단위')) ? '적용' : '없음',
  }}
/>

            <div className="flex justify-center pt-4">
              <Button onClick={handleStrategyComplete} size="lg" className="gap-2 w-full md:w-auto">
                이 전략으로 진행
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>  )
}
