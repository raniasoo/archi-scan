"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Building2, ArrowLeft, Send, Loader2,
  CheckCircle2, Mail, User, MessageSquare
} from "lucide-react"

const CATEGORIES = [
  { value: "일반", label: "일반 문의" },
  { value: "결제", label: "결제 / 환불" },
  { value: "기능", label: "기능 요청" },
  { value: "버그", label: "버그 신고" },
  { value: "제휴", label: "제휴 / 협업" },
]

export default function ContactPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [category, setCategory] = useState("일반")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async () => {
    if (!email) { setError("이메일을 입력해 주세요"); return }
    if (!message) { setError("문의 내용을 입력해 주세요"); return }
    setError("")
    setLoading(true)

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, category, message }),
      })
      const data = await res.json()
      if (data.success) {
        setSent(true)
      } else {
        setError(data.error || "문의 접수에 실패했습니다")
      }
    } catch {
      setError("네트워크 오류가 발생했습니다")
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-5">
        <div className="max-w-sm w-full text-center">
          <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">문의가 접수되었습니다</h1>
          <p className="text-sm text-muted-foreground mb-6">
            빠른 시일 내에 {email}로 답변 드리겠습니다
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm"
          >
            <ArrowLeft className="h-4 w-4" /> 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="max-w-lg mx-auto flex items-center gap-3 px-5 h-14">
          <Link href="/landing" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
              <Building2 className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm">Archi-Scan</span>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 py-10">
        <h1 className="text-2xl font-bold mb-1">문의하기</h1>
        <p className="text-sm text-muted-foreground mb-8">궁금한 점이나 건의사항을 남겨주세요. 빠르게 답변 드리겠습니다.</p>

        <div className="space-y-4">
          {/* 이름 */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">이름 (선택)</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="홍길동"
                className="w-full pl-10 pr-4 py-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* 이메일 */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">이메일 <span className="text-destructive">*</span></label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* 문의 유형 */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">문의 유형</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCategory(c.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    category === c.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* 문의 내용 */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">문의 내용 <span className="text-destructive">*</span></label>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="문의 내용을 자유롭게 작성해 주세요"
                rows={5}
                className="w-full pl-10 pr-4 py-3 rounded-xl border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* 에러 */}
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          {/* 제출 */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {loading ? "접수 중..." : "문의 보내기"}
          </button>

          <p className="text-xs text-muted-foreground text-center">
            또는 <a href="mailto:contact@archiscan.kr" className="text-primary hover:underline">contact@archiscan.kr</a>로 직접 이메일을 보내실 수 있습니다
          </p>
        </div>
      </main>
    </div>
  )
}
