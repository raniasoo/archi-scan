"use client"

import { createContext, useContext, useState, ReactNode } from "react"

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
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined)

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<Plan>("free")
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showPricingModal, setShowPricingModal] = useState(false)

  const isProUser = plan === "pro"

  const upgradeToPro = () => {
    setPlan("pro")
    setShowUpgradeModal(false)
    setShowPricingModal(false)
  }

  const downgradeToFree = () => {
    setPlan("free")
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
