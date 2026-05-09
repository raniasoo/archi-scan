"use client"

import { useState, useEffect } from "react"
import { Building2, Scale, Sparkles, ChevronRight, X } from "lucide-react"

const STORAGE_KEY = "archi-scan-onboarding-v1"

const STEPS = [
  {
    icon: Building2,
    emoji: "📍",
    title: "주소만 입력하세요",
    description: "대상지 주소를 입력하면 용도지역, 건폐율, 용적률을 자동으로 분석합니다.",
    accent: "from-emerald-500/20 to-emerald-500/5",
    iconColor: "text-emerald-400",
  },
  {
    icon: Scale,
    emoji: "⚖️",
    title: "AI가 배치안을 설계합니다",
    description: "법규 검토부터 배치안 생성, 사업성 분석까지 AI가 자동으로 수행합니다.",
    accent: "from-blue-500/20 to-blue-500/5",
    iconColor: "text-blue-400",
  },
  {
    icon: Sparkles,
    emoji: "✨",
    title: "AI 렌더링으로 확인하세요",
    description: "하단 AI 탭에서 건축물 외관을 미리 확인하고 PDF 보고서로 다운로드하세요.",
    accent: "from-violet-500/20 to-violet-500/5",
    iconColor: "text-violet-400",
  },
]

export function OnboardingTour() {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const seen = localStorage.getItem(STORAGE_KEY)
      if (!seen) setVisible(true)
    } catch {}
  }, [])

  const dismiss = () => {
    setExiting(true)
    setTimeout(() => {
      setVisible(false)
      try { localStorage.setItem(STORAGE_KEY, "1") } catch {}
    }, 300)
  }

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1)
    } else {
      dismiss()
    }
  }

  if (!visible) return null

  const current = STEPS[step]
  const Icon = current.icon

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-end sm:items-center justify-center transition-opacity duration-300 ${exiting ? "opacity-0" : "opacity-100"}`}
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
    >
      <div
        className={`relative w-full max-w-sm mx-4 mb-4 sm:mb-0 rounded-2xl bg-card border border-border/50 shadow-2xl overflow-hidden transition-all duration-300 ${exiting ? "translate-y-8 scale-95" : "translate-y-0 scale-100"}`}
      >
        {/* 상단 그라데이션 */}
        <div className={`h-32 bg-gradient-to-b ${current.accent} flex items-center justify-center relative`}>
          <button
            onClick={dismiss}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-background/50 hover:bg-background/80 transition-colors"
            aria-label="닫기"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>

          <div className="flex flex-col items-center gap-2">
            <div className="text-3xl">{current.emoji}</div>
            <Icon className={`h-8 w-8 ${current.iconColor}`} />
          </div>
        </div>

        {/* 내용 */}
        <div className="px-6 pt-5 pb-4 text-center">
          <h3 className="text-lg font-bold mb-2">{current.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{current.description}</p>
        </div>

        {/* 인디케이터 + 버튼 */}
        <div className="px-6 pb-6 flex items-center justify-between">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
              >
                이전
              </button>
            )}
            <button
              onClick={next}
              className="flex items-center gap-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              {step < STEPS.length - 1 ? "다음" : "시작하기"}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 건너뛰기 */}
        {step < STEPS.length - 1 && (
          <div className="text-center pb-4">
            <button onClick={dismiss} className="text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors">
              건너뛰기
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
