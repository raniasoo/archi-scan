"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { CheckCircle2, Loader2, XCircle } from "lucide-react"

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<"confirming" | "success" | "error">("confirming")
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    const paymentKey = searchParams.get("paymentKey")
    const orderId = searchParams.get("orderId")
    const amount = searchParams.get("amount")

    if (!paymentKey || !orderId || !amount) {
      setStatus("error")
      setErrorMsg("결제 정보가 누락되었습니다")
      return
    }

    // 결제 승인 요청
    fetch("/api/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirm", paymentKey, orderId, amount }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStatus("success")
          // 구독 상태 localStorage에도 저장 (subscription-provider 호환)
          localStorage.setItem(
            "archi-scan-plan",
            JSON.stringify({ plan: "pro", expiresAt: data.expiresAt })
          )
          // 3초 후 메인 앱으로
          setTimeout(() => router.push("/"), 3000)
        } else {
          setStatus("error")
          setErrorMsg(data.error || "결제 승인에 실패했습니다")
        }
      })
      .catch(() => {
        setStatus("error")
        setErrorMsg("결제 확인 중 오류가 발생했습니다")
      })
  }, [])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-5">
      <div className="max-w-sm w-full text-center">
        {status === "confirming" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">결제 확인 중...</h1>
            <p className="text-sm text-muted-foreground">잠시만 기다려 주세요</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Pro 플랜 활성화 완료! 🎉</h1>
            <p className="text-sm text-muted-foreground mb-6">
              무제한 분석, PDF 보고서, AI 렌더링을 바로 사용하세요
            </p>
            <button
              onClick={() => router.push("/")}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition"
            >
              앱으로 돌아가기
            </button>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="h-14 w-14 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">결제 실패</h1>
            <p className="text-sm text-muted-foreground mb-6">{errorMsg}</p>
            <button
              onClick={() => router.push("/")}
              className="px-6 py-3 bg-muted text-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition"
            >
              돌아가기
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  )
}
