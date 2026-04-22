"use client"

import { Badge } from "@/components/ui/badge"
import { Crown } from "lucide-react"
import { useSubscription } from "@/components/subscription-provider"

export function UserBadge() {
  const { isProUser, setShowPricingModal } = useSubscription()

  if (isProUser) {
    return (
      <Badge 
        variant="outline" 
        className="gap-1 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30 text-amber-600"
      >
        <Crown className="h-3 w-3" />
        프로
      </Badge>
    )
  }

  return (
    <Badge 
      variant="outline" 
      className="gap-1 cursor-pointer hover:bg-secondary transition-colors"
      onClick={() => setShowPricingModal(true)}
    >
      무료
    </Badge>
  )
}
