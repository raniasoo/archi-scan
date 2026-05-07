"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Heart, Check } from "lucide-react"
import { SELECTABLE_PATTERNS, PATTERN_CATEGORIES, type UserValues } from "@/lib/pattern-quality"

interface Props {
  values: UserValues
  onChange: (values: UserValues) => void
}

function Slider({ label, leftLabel, rightLabel, value, onChange }: {
  label: string; leftLabel: string; rightLabel: string; value: number; onChange: (v: number) => void
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold">{label}</p>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-primary"
      />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  )
}

export function ValuePrioritySelector({ values, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(true)
  const [patternCat, setPatternCat] = useState<'site' | 'building' | 'living'>('site')

  const MAX_PATTERNS = 10
  const togglePattern = (id: string) => {
    const isSelected = values.selectedPatterns.includes(id)
    if (!isSelected && values.selectedPatterns.length >= MAX_PATTERNS) return // 최대 10개
    const selected = isSelected
      ? values.selectedPatterns.filter(p => p !== id)
      : [...values.selectedPatterns, id]
    onChange({ ...values, selectedPatterns: selected })
  }

  return (
    <div className="border border-amber-200 dark:border-amber-800 rounded-xl overflow-hidden bg-gradient-to-br from-amber-50/30 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/20">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-amber-50/50 dark:hover:bg-amber-900/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
            <Heart className="h-5 w-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-sm">나의 건축 가치관</h3>
            <p className="text-xs text-muted-foreground">어떤 건물을 만들고 싶으세요?</p>
          </div>
        </div>
        {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-5">
          {/* 3가지 가치 슬라이더 */}
          <div className="space-y-4">
            <Slider
              label="수익성 vs 거주 품질"
              leftLabel="💰 수익 극대화"
              rightLabel="🏡 살기 좋은 곳"
              value={values.profitVsQuality}
              onChange={v => onChange({ ...values, profitVsQuality: v })}
            />
            <Slider
              label="프라이버시 vs 커뮤니티"
              leftLabel="🔒 나만의 공간"
              rightLabel="👋 이웃과 함께"
              value={values.privacyVsCommunity}
              onChange={v => onChange({ ...values, privacyVsCommunity: v })}
            />
            <Slider
              label="효율성 vs 여유 공간"
              leftLabel="📐 알찬 공간"
              rightLabel="🌿 넉넉한 여백"
              value={values.efficiencyVsSpace}
              onChange={v => onChange({ ...values, efficiencyVsSpace: v })}
            />
          </div>

          {/* 구분선 */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] text-muted-foreground">중요하게 여기는 것을 골라주세요</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* 카테고리 탭 */}
          <div className="flex gap-1">
            {PATTERN_CATEGORIES.map(cat => {
              const count = SELECTABLE_PATTERNS.filter(p => (p as any).category === cat.id && values.selectedPatterns.includes(p.id)).length
              return (
                <button key={cat.id} onClick={() => setPatternCat(cat.id)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-medium ${
                    patternCat === cat.id ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-400' : 'bg-white/60 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700'
                  }`}>
                  {cat.emoji} {cat.label} {count > 0 && <span className="ml-0.5 text-amber-500">({count})</span>}
                </button>
              )
            })}
          </div>

          {/* 패턴 카드 선택 */}
          <div className="grid grid-cols-2 gap-2 max-h-[280px] overflow-y-auto scrollbar-hide">
            {SELECTABLE_PATTERNS.filter(p => (p as any).category === patternCat).map(p => {
              const selected = values.selectedPatterns.includes(p.id)
              return (
                <button
                  key={p.id}
                  onClick={() => togglePattern(p.id)}
                  className={`relative p-2.5 rounded-lg text-left transition-all ${
                    selected
                      ? "bg-amber-100 dark:bg-amber-900/40 border-2 border-amber-400 dark:border-amber-600"
                      : "bg-white/60 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 hover:border-amber-300"
                  }`}
                >
                  {selected && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center">
                      <Check className="h-2.5 w-2.5 text-white" />
                    </div>
                  )}
                  <span className="text-lg block mb-0.5">{p.emoji}</span>
                  <span className="text-[11px] font-medium block leading-tight">{p.label}</span>
                  <span className="text-[9px] text-muted-foreground block mt-0.5">{p.pattern}</span>
                </button>
              )
            })}
          </div>

          {values.selectedPatterns.length > 0 && (
            <p className={`text-[10px] text-center font-medium ${values.selectedPatterns.length >= MAX_PATTERNS ? 'text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {values.selectedPatterns.length}/{MAX_PATTERNS}개 패턴 선택됨{values.selectedPatterns.length >= MAX_PATTERNS ? ' (최대)' : ''} · 배치안 품질 평가 + AI 렌더링에 반영
            </p>
          )}
        </div>
      )}
    </div>
  )
}
