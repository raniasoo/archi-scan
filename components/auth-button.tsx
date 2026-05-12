"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { LogIn, LogOut, User, ChevronDown, Mail, X, Eye, EyeOff, LayoutDashboard, BookOpen } from "lucide-react"

export function AuthButton() {
  const { user, loading, signInWithGoogle, signInWithKakao, signInWithNaver, signInWithEmail, signUpWithEmail, signOut } = useAuth()
  const [showMenu, setShowMenu] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [submitting, setSubmitting] = useState(false)

  if (loading) return null

  const handleSubmit = async () => {
    if (!email || !password) { setError("이메일과 비밀번호를 입력하세요"); return }
    if (password.length < 6) { setError("비밀번호는 6자 이상이어야 합니다"); return }
    setError(""); setSuccess(""); setSubmitting(true)
    try {
      if (isSignUp) {
        const { error: err } = await signUpWithEmail(email, password)
        if (err) { setError(err.message); setSubmitting(false); return }
        setSuccess("확인 이메일을 발송했습니다. 메일함을 확인해 주세요.")
      } else {
        const { error: err } = await signInWithEmail(email, password)
        if (err) { setError(err.message === "Invalid login credentials" ? "이메일 또는 비밀번호가 올바르지 않습니다" : err.message); setSubmitting(false); return }
        setShowLoginModal(false); setEmail(""); setPassword("")
      }
    } catch { setError("로그인 중 오류가 발생했습니다") }
    setSubmitting(false)
  }

  if (!user) {
    return (
      <>
        <button 
          onClick={() => setShowLoginModal(true)}
          className="flex items-center gap-1.5 rounded-lg border border-primary/50 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors touch-manipulation min-h-[40px]"
        >
          <LogIn className="h-4 w-4" />로그인
        </button>

        {showLoginModal && typeof document !== 'undefined' && createPortal(
          <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 pt-16 sm:pt-4 overflow-y-auto" onClick={() => setShowLoginModal(false)}>
            <div className="bg-background w-full max-w-sm rounded-2xl shadow-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="font-bold text-sm">{isSignUp ? "회원가입" : "로그인"}</h3>
                <button onClick={() => setShowLoginModal(false)} className="p-1 rounded hover:bg-muted"><X className="h-4 w-4" /></button>
              </div>

              <div className="px-5 py-4 space-y-3">
                <button
                  onClick={signInWithGoogle}
                  className="flex items-center justify-center gap-2.5 w-full py-3 rounded-lg border-2 border-border text-sm font-semibold hover:bg-muted transition-colors touch-manipulation min-h-[48px]"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  Google로 계속하기
                </button>

                <button
                  onClick={signInWithKakao}
                  className="flex items-center justify-center gap-2.5 w-full py-3 rounded-lg bg-[#FEE500] text-[#191919] text-sm font-semibold hover:bg-[#FDD835] transition-colors touch-manipulation min-h-[48px]"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path fillRule="evenodd" clipRule="evenodd" d="M9 0.6C4.03 0.6 0 3.713 0 7.537c0 2.466 1.642 4.632 4.108 5.858l-1.05 3.848c-.093.34.295.614.589.416L7.76 14.97c.407.054.822.083 1.24.083 4.97 0 9-3.113 9-6.937S13.97.6 9 .6" fill="#191919"/>
                  </svg>
                  카카오로 계속하기
                </button>

                <button
                  onClick={signInWithNaver}
                  className="flex items-center justify-center gap-2.5 w-full py-3 rounded-lg bg-[#03C75A] text-white text-sm font-semibold hover:bg-[#02b351] transition-colors touch-manipulation min-h-[48px]"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                    <path d="M16.27 3v8.18L7.73 3H3v18h4.73v-8.18L16.27 21H21V3h-4.73z" />
                  </svg>
                  네이버로 계속하기
                </button>

                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[10px] text-muted-foreground">또는</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block">이메일</label>
                  <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 focus-within:border-primary">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <input
                      type="email" placeholder="name@example.com" value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/50"
                      onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block">비밀번호</label>
                  <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 focus-within:border-primary">
                    <input
                      type={showPassword ? "text" : "password"} placeholder="6자 이상" value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/50"
                      onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    />
                    <button onClick={() => setShowPassword(!showPassword)} className="text-muted-foreground">
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {error && <p className="text-[11px] text-red-500">{error}</p>}
                {success && <p className="text-[11px] text-emerald-500">{success}</p>}

                <Button className="w-full text-xs" size="sm" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? "처리 중..." : isSignUp ? "가입하기" : "로그인"}
                </Button>

                <p className="text-[10px] text-center text-muted-foreground">
                  {isSignUp ? "이미 계정이 있으신가요?" : "계정이 없으신가요?"}{" "}
                  <button onClick={() => { setIsSignUp(!isSignUp); setError(""); setSuccess("") }} className="text-primary font-medium">
                    {isSignUp ? "로그인" : "회원가입"}
                  </button>
                </p>
              </div>
            </div>
          </div>,
          document.body
        )}
      </>
    )
  }

  const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "사용자"
  const avatar = user.user_metadata?.avatar_url

  return (
    <div className="relative z-[50]">
      <button
        onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu) }}
        className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs hover:bg-muted transition-colors min-h-[40px] min-w-[40px] touch-manipulation"
      >
        {avatar ? (
          <img src={avatar} alt="" className="h-5 w-5 rounded-full" />
        ) : (
          <User className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="max-w-[80px] truncate">{displayName}</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setShowMenu(false)} onTouchEnd={(e) => { e.preventDefault(); setShowMenu(false) }} />
          <div className="absolute right-0 top-full mt-1 z-[70] w-48 rounded-lg border border-border bg-background shadow-lg p-1">
            <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border mb-1">
              {user.email}
            </div>
            <a
              href="/dashboard"
              className="flex w-full items-center gap-2 rounded-md px-3 py-3 text-sm text-foreground hover:bg-secondary transition-colors touch-manipulation min-h-[44px]"
              onClick={() => setShowMenu(false)}
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              내 대시보드
            </a>
            <a
              href="/guide"
              className="flex w-full items-center gap-2 rounded-md px-3 py-3 text-sm text-foreground hover:bg-secondary transition-colors touch-manipulation min-h-[44px]"
              onClick={() => setShowMenu(false)}
            >
              <BookOpen className="h-3.5 w-3.5" />
              사용 가이드
            </a>
            <a
              href="/dashboard?tab=contact"
              className="flex w-full items-center gap-2 rounded-md px-3 py-3 text-sm text-foreground hover:bg-secondary transition-colors touch-manipulation min-h-[44px]"
              onClick={() => setShowMenu(false)}
            >
              <Mail className="h-3.5 w-3.5" />
              문의하기
            </a>
            <button
              onClick={async (e) => { 
                e.stopPropagation()
                setShowMenu(false)
                await signOut()
                window.location.reload()
              }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-3 text-sm text-destructive hover:bg-destructive/10 transition-colors touch-manipulation min-h-[44px]"
            >
              <LogOut className="h-3.5 w-3.5" />
              로그아웃
            </button>
          </div>
        </>
      )}
    </div>
  )
}
