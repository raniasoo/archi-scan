"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Check, Crown } from "lucide-react"
import { useSubscription } from "@/components/subscription-provider"

interface PricingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PricingModal({ open, onOpenChange }: PricingModalProps) {
  const { isProUser, handlePayment, isPaymentLoading } = useSubscription()

  const handleSelectPro = async () => {
    await handlePayment()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>요금제 선택</DialogTitle>
          <DialogDescription>
            프로젝트에 맞는 요금제를 선택하세요
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-4 py-4">
          {/* Free Plan */}
          <Card className={`relative ${!isProUser ? "border-primary" : ""}`}>
            {!isProUser && (
              <div className="absolute -top-3 left-4">
                <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                  현재 플랜
                </span>
              </div>
            )}
            <CardHeader>
              <CardTitle>무료</CardTitle>
              <CardDescription>기본 기능 체험</CardDescription>
              <div className="pt-2">
                <span className="text-3xl font-bold">0</span>
                <span className="text-muted-foreground">원/월</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  배치안 3개 생성
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  평면도 미리보기
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  기본 사업성 분석
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <span className="h-4 w-4 flex items-center justify-center">-</span>
                  PDF 보고서 다운로드
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <span className="h-4 w-4 flex items-center justify-center">-</span>
                  인쇄용 보고서
                </li>
              </ul>
              <Button 
                variant="outline" 
                className="w-full mt-6"
                disabled
              >
                현재 이용 중
              </Button>
            </CardContent>
          </Card>

          {/* Pro Plan */}
          <Card className={`relative border-amber-500/50 bg-gradient-to-b from-amber-500/5 to-transparent ${isProUser ? "border-primary" : ""}`}>
            {isProUser && (
              <div className="absolute -top-3 left-4">
                <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                  현재 플랜
                </span>
              </div>
            )}
            <div className="absolute -top-3 right-4">
              <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                <Crown className="h-3 w-3" />
                추천
              </span>
            </div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                프로
                <Crown className="h-4 w-4 text-amber-500" />
              </CardTitle>
              <CardDescription>전문가를 위한 모든 기능</CardDescription>
              <div className="pt-2">
                <span className="text-3xl font-bold">29,000</span>
                <span className="text-muted-foreground">원/월</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-amber-500" />
                  무제한 배치안 생성
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-amber-500" />
                  상세 평면도 분석
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-amber-500" />
                  전문 사업성 분석
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <Check className="h-4 w-4 text-amber-500" />
                  PDF 보고서 다운로드
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <Check className="h-4 w-4 text-amber-500" />
                  인쇄용 보고서 출력
                </li>
              </ul>
              {isProUser ? (
                <Button 
                  variant="outline" 
                  className="w-full mt-6"
                  disabled
                >
                  현재 이용 중
                </Button>
              ) : (
                <Button 
                  onClick={handleSelectPro}
                  disabled={isPaymentLoading}
                  className="w-full mt-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                >
                  {isPaymentLoading ? '처리 중...' : '프로로 업그레이드'}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
