"use client"

import { useState, useEffect, useRef } from "react"
import { trackUpgradeModalOpen, trackPaymentStart } from "@/components/google-analytics"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Crown, Check, Loader2, CreditCard, Shield } from "lucide-react"
import { useSubscription } from "@/components/subscription-provider"
import { useAuth } from "@/hooks/use-auth"

interface UpgradeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const PRO_FEATURES = [
  "무제한 사업성 분석",
  "PDF + 엑셀 보고서 다운로드",
  "AI 포토리얼 렌더링",
  "실거래가 트렌드 분석",
  "클라우드 프로젝트 저장",
  "우선 기술지원",
]

export function UpgradeModal({ open, onOpenChange }: UpgradeModalProps) {
  const { isProUser } = useSubscription()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => { if (open) trackUpgradeModalOpen('usage_limit') }, [open])

  const handleTossPayment = async () => {
    if (!user) {
      window.location.href = "/auth/login"
      return
    }
    trackPaymentStart()
    setIsLoading(true)

    try {
      // 1. 결제 준비 — 서버에서 주문 정보 생성
      const prepareRes = await fetch("/api/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "prepare" }),
      })
      const prepareData = await prepareRes.json()

      if (!prepareData.clientKey) {
        throw new Error("결제 준비에 실패했습니다")
      }

      // 2. 토스페이먼츠 SDK 로드
      const { clientKey, orderId, amount, orderName, customerName, customerEmail } = prepareData

      // SDK가 이미 로드되어 있는지 확인
      if (!(window as any).TossPayments) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script")
          script.src = "https://js.tosspayments.com/v2/standard"
          script.onload = () => resolve()
          script.onerror = () => reject(new Error("토스페이먼츠 SDK 로드 실패"))
          document.head.appendChild(script)
        })
      }

      // 3. 결제 요청
      const tossPayments = (window as any).TossPayments(clientKey)
      const payment = tossPayments.payment({ customerKey: user.id })

      await payment.requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: amount },
        orderId,
        orderName,
        customerName,
        customerEmail,
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
        card: {
          useEscrow: false,
          flowMode: "DEFAULT",
          useCardPoint: false,
          useAppCardOnly: false,
        },
      })
    } catch (err: any) {
      // 사용자가 결제창을 닫은 경우
      if (err?.code === "USER_CANCEL" || err?.message?.includes("cancel")) {
        console.log("[PAYMENT] User cancelled")
      } else {
        console.error("[PAYMENT] Error:", err)
        alert(err.message || "결제 중 오류가 발생했습니다")
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (isProUser) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            Pro 플랜으로 업그레이드
          </DialogTitle>
          <DialogDescription>
            무제한 분석과 프리미엄 기능을 이용하세요
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 가격 */}
          <div className="text-center py-4 rounded-xl bg-gradient-to-r from-primary/10 to-emerald-500/10 border border-primary/20">
            <div className="text-3xl font-extrabold">₩29,000<span className="text-sm font-normal text-muted-foreground">/월</span></div>
            <p className="text-xs text-muted-foreground mt-1">언제든 해지 가능</p>
          </div>

          {/* 기능 목록 */}
          <div className="space-y-2.5">
            {PRO_FEATURES.map((f) => (
              <div key={f} className="flex items-center gap-2.5 text-sm">
                <Check className="h-4 w-4 text-primary flex-shrink-0" />
                <span>{f}</span>
              </div>
            ))}
          </div>

          {/* 결제 버튼 */}
          <Button
            onClick={handleTossPayment}
            disabled={isLoading}
            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-emerald-600 hover:opacity-90"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : (
              <CreditCard className="h-5 w-5 mr-2" />
            )}
            {isLoading ? "결제 준비 중..." : "₩29,000 결제하기"}
          </Button>

          {/* 보안 안내 */}
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
            <Shield className="h-3 w-3" />
            토스페이먼츠 보안 결제 · SSL 암호화
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
