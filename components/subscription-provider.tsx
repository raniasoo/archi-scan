"use client"

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"

type Plan = "free" | "pro" | "enterprise"
type Feature = "multi-angle" | "brochure" | "interior-compare" | "excel" | "cloud-save" | "custom-branding"

// 플랜별 기능 접근 권한
const PLAN_FEATURES: Record<Plan, Feature[]> = {
  free: [],
  pro: ["multi-angle", "brochure", "interior-compare", "excel", "cloud-save"],
  enterprise: ["multi-angle", "brochure", "interior-compare", "excel", "cloud-save", "custom-branding"],
}

const FEATURE_LABELS: Record<Feature, string> = {
  "multi-angle": "멀티앵글 4장 렌더링",
  "brochure": "분양 브로셔 PDF",
  "interior-compare": "인테리어 3안 비교",
  "excel": "엑셀 내보내기",
  "cloud-save": "클라우드 저장",
  "custom-branding": "커스텀 브랜딩",
}

interface SubscriptionContextType {
  plan: Plan
  isProUser: boolean
  isEnterprise: boolean
  showUpgradeModal: boolean
  setShowUpgradeModal: (show: boolean) => void
  showPricingModal: boolean
  setShowPricingModal: (show: boolean) => void
  upgradeToPro: () => void
  downgradeToFree: () => void
  handlePayment: () => Promise<void>
  isPaymentLoading: boolean
  refreshPlan: () => Promise<void>
  canAnalyze: boolean
  monthlyUsage: number
  monthlyLimit: number
  checkAndTrackUsage: () => Promise<boolean>
  refreshUsage: () => Promise<void>
  canUseFeature: (feature: Feature) => boolean
  requireFeature: (feature: Feature) => boolean // true = 사용 가능, false = 업그레이드 모달 표시
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined)

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<Plan>("free")
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showPricingModal, setShowPricingModal] = useState(false)
  const [isPaymentLoading, setIsPaymentLoading] = useState(false)
  const [canAnalyze, setCanAnalyze] = useState(true)
  const [monthlyUsage, setMonthlyUsage] = useState(0)
  const [monthlyLimit, setMonthlyLimit] = useState(10)

  const supabase = createClient()

  const refreshUsage = useCallback(async () => {
    try {
      const res = await fetch("/api/usage")
      if (!res.ok) return
      const data = await res.json()
      setCanAnalyze(data.can_analyze ?? true)
      setMonthlyUsage(data.monthly_usage ?? 0)
      setMonthlyLimit(data.monthly_limit === -1 ? Infinity : (data.monthly_limit ?? 10))
      if (data.plan) setPlan(data.plan)
    } catch {}
  }, [])

  const checkAndTrackUsage = useCallback(async (): Promise<boolean> => {
    try {
      // Enterprise: 무제한, 트래킹만
      if (plan === "enterprise") {
        fetch("/api/usage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "analysis" }) })
        return true
      }
      // Free (10회) & Pro (30회): 체크 후 트래킹
      const checkRes = await fetch("/api/usage")
      if (!checkRes.ok) return true
      const checkData = await checkRes.json()
      if (!checkData.can_analyze) {
        setMonthlyUsage(checkData.monthly_usage)
        setCanAnalyze(false)
        setShowUpgradeModal(true)
        const { toast } = await import('sonner')
        toast.error(`이번 달 분석 횟수를 모두 사용했습니다 (${checkData.monthly_usage}/${checkData.monthly_limit ?? 10}회)`, { duration: 5000 })
        return false
      }
      const trackRes = await fetch("/api/usage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "analysis" }) })
      if (trackRes.status === 429) {
        setCanAnalyze(false)
        setShowUpgradeModal(true)
        return false
      }
      const trackData = await trackRes.json()
      setMonthlyUsage(trackData.monthly_usage ?? checkData.monthly_usage + 1)
      const currentUsage = trackData.monthly_usage ?? checkData.monthly_usage + 1
      const limit = checkData.monthly_limit ?? 10
      
      if (currentUsage >= limit) {
        setCanAnalyze(false)
      } else if (currentUsage === Math.ceil(limit * 0.8)) {
        // 80% 사용 알림
        const { toast } = await import('sonner')
        toast.warning(`이번 달 분석 ${currentUsage}/${limit}회 사용 — 잔여 ${limit - currentUsage}회`, { duration: 5000 })
      }
      return true
    } catch { return true }
  }, [plan])

  const refreshPlan = useCallback(async () => {
    try {
      const saved = localStorage.getItem('archi-scan-plan')
      if (saved) {
        const { plan: savedPlan, expiresAt } = JSON.parse(saved)
        if ((savedPlan === 'pro' || savedPlan === 'enterprise') && new Date(expiresAt) > new Date()) setPlan(savedPlan)
        else localStorage.removeItem('archi-scan-plan')
      }
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('plan, plan_expires_at').eq('id', user.id).single()
      if (profile?.plan === 'pro' || profile?.plan === 'enterprise') {
        const expired = profile.plan_expires_at && new Date(profile.plan_expires_at) < new Date()
        if (!expired) {
          setPlan(profile.plan as Plan)
          localStorage.setItem('archi-scan-plan', JSON.stringify({ plan: profile.plan, expiresAt: profile.plan_expires_at }))
        } else { setPlan('free'); localStorage.removeItem('archi-scan-plan') }
      }
    } catch {}
  }, [])

  useEffect(() => { refreshPlan(); refreshUsage() }, [refreshPlan, refreshUsage])

  const isProUser = plan === "pro" || plan === "enterprise"
  const isEnterprise = plan === "enterprise"
  const upgradeToPro = () => {
    setPlan("pro"); setCanAnalyze(true); setMonthlyLimit(30)
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    localStorage.setItem('archi-scan-plan', JSON.stringify({ plan: 'pro', expiresAt }))
    setShowUpgradeModal(false); setShowPricingModal(false)
  }
  const downgradeToFree = () => { setPlan("free"); setMonthlyLimit(10); localStorage.removeItem('archi-scan-plan') }
  const handlePayment = async () => { setShowUpgradeModal(true) }

  const canUseFeature = useCallback((feature: Feature) => {
    return PLAN_FEATURES[plan].includes(feature)
  }, [plan])

  const requireFeature = useCallback((feature: Feature) => {
    if (PLAN_FEATURES[plan].includes(feature)) return true
    // Pro 기능을 사용하려 할 때 업그레이드 안내
    import('sonner').then(({ toast }) => {
      toast.error(`${FEATURE_LABELS[feature]}은(는) Pro 플랜 전용 기능입니다`, {
        action: { label: '업그레이드', onClick: () => setShowPricingModal(true) },
        duration: 5000,
      })
    })
    return false
  }, [plan])

  return (
    <SubscriptionContext.Provider value={{
      plan, isProUser, isEnterprise, showUpgradeModal, setShowUpgradeModal, showPricingModal, setShowPricingModal,
      upgradeToPro, downgradeToFree, handlePayment, isPaymentLoading, refreshPlan,
      canAnalyze, monthlyUsage, monthlyLimit, checkAndTrackUsage, refreshUsage,
      canUseFeature, requireFeature,
    }}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription() {
  const context = useContext(SubscriptionContext)
  if (context === undefined) throw new Error("useSubscription must be used within a SubscriptionProvider")
  return context
}
