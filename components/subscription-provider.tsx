"use client"

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"

type Plan = "free" | "pro"

interface SubscriptionContextType {
  plan: Plan
  isProUser: boolean
  showUpgradeModal: boolean
  setShowUpgradeModal: (show: boolean) => void
  showPricingModal: boolean
  setShowPricingModal: (show: boolean) => void
  upgradeToPro: () => void
  downgradeToFree: () => void
  handlePayment: () => Promise<void>
  isPaymentLoading: boolean
  refreshPlan: () => Promise<void>
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined)

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<Plan>("free")
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showPricingModal, setShowPricingModal] = useState(false)
  const [isPaymentLoading, setIsPaymentLoading] = useState(false)

  const supabase = createClient()

  // Supabase 프로필에서 플랜 상태 조회
  const refreshPlan = useCallback(async () => {
    try {
      // 1. localStorage 먼저 확인 (빠른 복원)
      const saved = localStorage.getItem('archi-scan-plan')
      if (saved) {
        const { plan: savedPlan, expiresAt } = JSON.parse(saved)
        if (savedPlan === 'pro' && new Date(expiresAt) > new Date()) {
          setPlan('pro')
        } else {
          localStorage.removeItem('archi-scan-plan')
        }
      }

      // 2. Supabase 프로필에서 실제 상태 확인
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('plan, plan_expires_at')
        .eq('id', user.id)
        .single()

      if (profile?.plan === 'pro') {
        const expired = profile.plan_expires_at && new Date(profile.plan_expires_at) < new Date()
        if (!expired) {
          setPlan('pro')
          localStorage.setItem('archi-scan-plan', JSON.stringify({
            plan: 'pro',
            expiresAt: profile.plan_expires_at,
          }))
        } else {
          setPlan('free')
          localStorage.removeItem('archi-scan-plan')
        }
      }
    } catch {}
  }, [])

  useEffect(() => { refreshPlan() }, [refreshPlan])

  const isProUser = plan === "pro"

  const upgradeToPro = () => {
    setPlan("pro")
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    localStorage.setItem('archi-scan-plan', JSON.stringify({ plan: 'pro', expiresAt }))
    setShowUpgradeModal(false)
    setShowPricingModal(false)
  }

  const downgradeToFree = () => {
    setPlan("free")
    localStorage.removeItem('archi-scan-plan')
  }

  const handlePayment = async () => {
    // 토스페이먼츠 결제는 UpgradeModal에서 직접 처리
    setShowUpgradeModal(true)
  }

  return (
    <SubscriptionContext.Provider
      value={{
        plan,
        isProUser,
        showUpgradeModal,
        setShowUpgradeModal,
        showPricingModal,
        setShowPricingModal,
        upgradeToPro,
        downgradeToFree,
        handlePayment,
        isPaymentLoading,
        refreshPlan,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription() {
  const context = useContext(SubscriptionContext)
  if (context === undefined) {
    throw new Error("useSubscription must be used within a SubscriptionProvider")
  }
  return context
}
