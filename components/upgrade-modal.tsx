"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Crown, Check, CreditCard, Lock, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react"
import { useSubscription } from "@/components/subscription-provider"

type Step = "info" | "payment" | "success"

interface UpgradeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UpgradeModal({ open, onOpenChange }: UpgradeModalProps) {
  const { upgradeToPro } = useSubscription()
  const [step, setStep] = useState<Step>("info")
  const [isProcessing, setIsProcessing] = useState(false)
  const [cardNumber, setCardNumber] = useState("")
  const [expiry, setExpiry] = useState("")
  const [cvc, setCvc] = useState("")

  const proFeatures = [
    "PDF 보고서 다운로드",
    "전문 사업성 분석",
    "무제한 배치안 생성",
    "우선 고객 지원",
    "인쇄용 보고서 출력",
  ]

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, "")
    const groups = cleaned.match(/.{1,4}/g)
    return groups ? groups.join(" ").substring(0, 19) : ""
  }

  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, "")
    if (cleaned.length >= 2) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`
    }
    return cleaned
  }

  const handleProcessPayment = () => {
    setIsProcessing(true)
    setTimeout(() => {
      setIsProcessing(false)
      setStep("success")
    }, 2000)
  }

  const handleComplete = () => {
    upgradeToPro()
    setStep("info")
    setCardNumber("")
    setExpiry("")
    setCvc("")
    onOpenChange(false)
  }

  const handleClose = () => {
    setStep("info")
    setCardNumber("")
    setExpiry("")
    setCvc("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {step === "info" && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500">
                  <Crown className="h-5 w-5 text-white" />
                </div>
                <div>
                  <DialogTitle>프로로 업그레이드</DialogTitle>
                  <DialogDescription>모든 기능을 잠금 해제하세요</DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-6">
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-3xl font-bold">29,000</span>
                    <span className="text-muted-foreground">원/월</span>
                  </div>
                  <ul className="space-y-2">
                    {proFeatures.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Button 
                onClick={() => setStep("payment")} 
                className="w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                size="lg"
              >
                <CreditCard className="h-4 w-4" />
                결제 진행
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                언제든지 구독을 취소할 수 있습니다
              </p>
            </div>
          </>
        )}

        {step === "payment" && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setStep("info")}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <DialogTitle>결제 정보</DialogTitle>
                  <DialogDescription>카드 정보를 입력하세요</DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="card">카드 번호</Label>
                <div className="relative">
                  <Input
                    id="card"
                    placeholder="1234 5678 9012 3456"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    className="pl-10"
                    maxLength={19}
                  />
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiry">유효기간</Label>
                  <Input
                    id="expiry"
                    placeholder="MM/YY"
                    value={expiry}
                    onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                    maxLength={5}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cvc">CVC</Label>
                  <Input
                    id="cvc"
                    placeholder="123"
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 3))}
                    maxLength={3}
                  />
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between text-sm">
                <span>프로 월간 구독</span>
                <span className="font-semibold">29,000원</span>
              </div>

              <Button 
                onClick={handleProcessPayment} 
                size="lg" 
                className="w-full"
                disabled={cardNumber.length < 19 || expiry.length < 5 || cvc.length < 3 || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    처리 중...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    29,000원 결제하기
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
                <Lock className="h-3 w-3" />
                SSL 암호화로 안전하게 보호됩니다
              </p>
            </div>
          </>
        )}

        {step === "success" && (
          <>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <DialogTitle className="mb-2">결제 완료</DialogTitle>
              <DialogDescription className="mb-6">
                프로 플랜으로 업그레이드되었습니다.<br />
                모든 프리미엄 기능을 이용하실 수 있습니다.
              </DialogDescription>
              <Button onClick={handleComplete} className="w-full" size="lg">
                시작하기
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
