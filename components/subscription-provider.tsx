"use client"

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"

type Plan = "free" | "pro" | "enterprise"

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
      if (trackData.monthly_usage >= (checkData.monthly_limit ?? 10)) setCanAnalyze(false)
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

  return (
    <SubscriptionContext.Provider value={{
      plan, isProUser, isEnterprise, showUpgradeModal, setShowUpgradeModal, showPricingModal, setShowPricingModal,
      upgradeToPro, downgradeToFree, handlePayment, isPaymentLoading, refreshPlan,
      canAnalyze, monthlyUsage, monthlyLimit, checkAndTrackUsage, refreshUsage,
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
