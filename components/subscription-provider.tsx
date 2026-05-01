"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

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
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined)

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<Plan>("free")
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showPricingModal, setShowPricingModal] = useState(false)
  const [isPaymentLoading, setIsPaymentLoading] = useState(false)

  // localStorage에서 구독 상태 복원
  useEffect(() => {
    try {
      const saved = localStorage.getItem('archi-scan-plan')
      if (saved) {
        const { plan: savedPlan, expiresAt } = JSON.parse(saved)
        if (savedPlan === 'pro' && new Date(expiresAt) > new Date()) {
          setPlan('pro')
        }
      }
    } catch {}
  }, [])

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
    setIsPaymentLoading(true)
    try {
      // 결제 API 호출 (테스트 모드)
      const res = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm' }),
      })
      const data = await res.json()
      if (data.success) {
        upgradeToPro()
        return
      }
      throw new Error(data.error || '결제 실패')
    } catch (error) {
      console.error('Payment error:', error)
      alert('결제 처리 중 오류가 발생했습니다.')
    } finally {
      setIsPaymentLoading(false)
    }
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
