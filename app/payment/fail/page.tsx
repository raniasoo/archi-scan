"use client"

import { Suspense, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { XCircle, Loader2 } from "lucide-react"
import { trackPaymentFail } from "@/components/google-analytics"

function PaymentFailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const code = searchParams.get("code") || ""
  const message = searchParams.get("message") || "결제가 취소되었거나 실패했습니다"

  useEffect(() => { trackPaymentFail(code || 'user_cancelled') }, [code])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-5">
      <div className="max-w-sm w-full text-center">
        <XCircle className="h-14 w-14 text-red-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold mb-2">결제 실패</h1>
        <p className="text-sm text-muted-foreground mb-2">{message}</p>
        {code && <p className="text-xs text-muted-foreground/50 mb-6">오류 코드: {code}</p>}
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 bg-muted text-foreground rounded-xl font-semibold text-sm"
          >
            돌아가기
          </button>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm"
          >
            다시 시도
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PaymentFailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <PaymentFailContent />
    </Suspense>
  )
}
