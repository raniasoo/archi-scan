"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { LogIn, LogOut, User, ChevronDown, Mail, X, Eye, EyeOff } from "lucide-react"

export function AuthButton() {
  const { user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut } = useAuth()
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
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setShowLoginModal(true)}>
          <LogIn className="h-3.5 w-3.5" />로그인
        </Button>

        {showLoginModal && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowLoginModal(false)}>
            <div className="bg-background w-full max-w-sm rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="font-bold text-sm">{isSignUp ? "회원가입" : "로그인"}</h3>
                <button onClick={() => setShowLoginModal(false)} className="p-1 rounded hover:bg-muted"><X className="h-4 w-4" /></button>
              </div>

              <div className="px-5 py-4 space-y-3">
                <button
                  onClick={signInWithGoogle}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  Google로 계속하기
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
          </div>
        )}
      </>
    )
  }

  const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "사용자"
  const avatar = user.user_metadata?.avatar_url

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs hover:bg-muted transition-colors"
      >
        {avatar ? (
          <img src={avatar} alt="" className="h-5 w-5 rounded-full" />
        ) : (
          <User className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <span className="max-w-[80px] truncate">{displayName}</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-lg border border-border bg-background shadow-lg p-1">
            <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border mb-1">
              {user.email}
            </div>
            <button
              onClick={() => { signOut(); setShowMenu(false) }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors"
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
