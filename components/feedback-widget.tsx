"use client"

import { useState, useEffect } from "react"
import { X, MessageSquarePlus } from "lucide-react"
import { toast } from "sonner"

const CATEGORIES = [
  { id: "general", label: "전반적 사용감", emoji: "💬" },
  { id: "rendering", label: "AI 렌더링", emoji: "🎨" },
  { id: "analysis", label: "분석 정확도", emoji: "📊" },
  { id: "report", label: "보고서/브로셔", emoji: "📄" },
  { id: "ui", label: "UI/사용성", emoji: "📱" },
  { id: "feature", label: "기능 요청", emoji: "💡" },
  { id: "bug", label: "버그 신고", emoji: "🐛" },
]

export function FeedbackWidget() {
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [category, setCategory] = useState("general")
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  // 세션당 1회만 피드백 프롬프트 표시 (사용 3회 이상 시)
  const [showPrompt, setShowPrompt] = useState(false)
  useEffect(() => {
    const dismissed = sessionStorage.getItem("feedback-dismissed")
    const usage = parseInt(localStorage.getItem("archi-scan-usage-count") || "0")
    if (!dismissed && usage >= 3) {
      const timer = setTimeout(() => setShowPrompt(true), 60000) // 1분 후
      return () => clearTimeout(timer)
    }
  }, [])

  const dismissPrompt = () => {
    setShowPrompt(false)
    sessionStorage.setItem("feedback-dismissed", "1")
  }

  const submit = async () => {
    if (rating === 0) { toast.error("평점을 선택해주세요"); return }
    setSending(true)
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, category, message, page: window.location.pathname }),
      })
      if (res.ok) {
        setSent(true)
        toast.success("소중한 피드백 감사합니다! 🙏")
        setTimeout(() => { setOpen(false); setSent(false); setRating(0); setMessage(""); setCategory("general") }, 2000)
        sessionStorage.setItem("feedback-dismissed", "1")
      } else {
        toast.error("피드백 전송 실패")
      }
    } catch { toast.error("네트워크 오류") }
    finally { setSending(false) }
  }

  return (
    <>
      {/* 피드백 프롬프트 (조건부) */}
      {showPrompt && !open && (
        <div className="fixed bottom-[120px] md:bottom-20 right-4 z-50 bg-card border border-primary/30 rounded-xl p-3 shadow-lg max-w-[220px] animate-in slide-in-from-right">
          <button onClick={dismissPrompt} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-muted flex items-center justify-center">
            <X className="h-3 w-3" />
          </button>
          <p className="text-xs font-medium mb-2">Archi-Scan은 어떠세요?</p>
          <button onClick={() => { setOpen(true); dismissPrompt() }} className="text-[10px] text-primary hover:underline">
            피드백 남기기 →
          </button>
        </div>
      )}

      {/* 피드백 버튼 */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-[72px] md:bottom-4 right-4 z-40 w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors"
        title="피드백"
      >
        <MessageSquarePlus className="h-4 w-4" />
      </button>

      {/* 피드백 모달 */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-card border rounded-t-2xl sm:rounded-2xl w-full max-w-sm p-5 space-y-4 animate-in slide-in-from-bottom" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">💬 피드백</h3>
              <button onClick={() => setOpen(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
            </div>

            {sent ? (
              <div className="text-center py-8">
                <span className="text-4xl">🎉</span>
                <p className="text-sm font-medium mt-3">감사합니다!</p>
                <p className="text-xs text-muted-foreground mt-1">피드백이 접수되었습니다</p>
              </div>
            ) : (
              <>
                {/* 별점 */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">만족도</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        onClick={() => setRating(n)}
                        onMouseEnter={() => setHoverRating(n)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="text-2xl transition-transform hover:scale-110"
                      >
                        {n <= (hoverRating || rating) ? "⭐" : "☆"}
                      </button>
                    ))}
                    <span className="text-xs text-muted-foreground ml-2 self-center">
                      {rating === 1 ? "불만족" : rating === 2 ? "아쉬움" : rating === 3 ? "보통" : rating === 4 ? "만족" : rating === 5 ? "매우 만족" : ""}
                    </span>
                  </div>
                </div>

                {/* 카테고리 */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">분야</p>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORIES.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setCategory(c.id)}
                        className={`px-2 py-1 rounded-lg text-[10px] transition-all ${
                          category === c.id ? "bg-primary/20 text-primary border border-primary/30 font-semibold" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {c.emoji} {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 메시지 */}
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="개선 사항이나 의견을 자유롭게 작성해주세요 (선택)"
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-background border text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />

                {/* 전송 */}
                <button
                  onClick={submit}
                  disabled={sending || rating === 0}
                  className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40"
                >
                  {sending ? "전송 중..." : "피드백 보내기"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
