"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import {
  Building2, Mail, Eye, EyeOff, ArrowLeft,
  Loader2, CheckCircle2, AlertCircle
} from "lucide-react"
import { trackLogin, trackSignUp } from "@/components/google-analytics"

function LoginForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const isSignUpMode = searchParams.get("signup") === "1"

  const [mode, setMode] = useState<"login" | "signup">(isSignUpMode ? "signup" : "login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const supabase = createClient()

  // ★ 인앱 브라우저 감지
  const [isInAppBrowser, setIsInAppBrowser] = useState(false)
  const [inAppBrowserName, setInAppBrowserName] = useState('')
  
  useEffect(() => {
    const ua = navigator.userAgent || ''
    const checks: [RegExp, string][] = [
      [/KAKAOTALK/i, '카카오톡'],
      [/NAVER\(inapp/i, '네이버'],
      [/Instagram/i, 'Instagram'],
      [/FBAV|FBAN|FB_IAB/i, 'Facebook'],
      [/Line\//i, 'LINE'],
      [/SamsungBrowser\/.*CrossApp/i, '삼성 인터넷'],
      [/wv\).*Version\/[\d.]+.*Chrome/i, 'WebView'],
    ]
    for (const [regex, name] of checks) {
      if (regex.test(ua)) {
        setIsInAppBrowser(true)
        setInAppBrowserName(name)
        break
      }
    }
  }, [])

  // Check if already logged in
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.push("/")
    })
    // URL 에러 파라미터 처리 (네이버 콜백 등)
    const urlError = searchParams.get("error")
    if (urlError) {
      const errorMessages: Record<string, string> = {
        naver_denied: "네이버 로그인이 취소되었습니다",
        naver_token_failed: "네이버 인증에 실패했습니다. 다시 시도해 주세요",
        naver_create_failed: "계정 생성에 실패했습니다. 다시 시도해 주세요",
        naver_state_mismatch: "보안 검증에 실패했습니다. 다시 시도해 주세요",
        naver_missing_params: "인증 정보가 누락되었습니다",
        naver_session_failed: "세션 생성에 실패했습니다",
        naver_confirm_needed: "가입 완료! 이메일 확인 후 다시 로그인해 주세요",
        naver_profile_failed: "네이버 프로필 조회에 실패했습니다",
      }
      setError(errorMessages[urlError] || "로그인 중 오류가 발생했습니다")
    }
  }, [])

  const handleSocialLogin = async (provider: "kakao" | "google") => {
    // ★ Google은 인앱 브라우저에서 차단됨
    if (provider === 'google' && isInAppBrowser) {
      const currentUrl = window.location.href
      // 외부 브라우저로 열기 시도
      if (/Android/i.test(navigator.userAgent)) {
        window.open(`intent://${currentUrl.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`)
      } else {
        // iOS: 외부 브라우저 강제 열기 불가 → 안내
        setError(`${inAppBrowserName || '인앱'} 브라우저에서는 Google 로그인이 차단됩니다. 주소를 복사하여 Chrome 또는 Safari에서 열어주세요.`)
      }
      return
    }
    setSocialLoading(provider)
    setError("")
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
      trackLogin(provider)
    } catch (err: any) {
      setError(err.message || "소셜 로그인 중 오류가 발생했습니다")
      setSocialLoading(null)
    }
  }

  const handleNaverLogin = async () => {
    setSocialLoading("naver")
    setError("")
    // 네이버는 Supabase 기본 제공이 아니므로 커스텀 OAuth 라우트 사용
    trackLogin("naver")
    window.location.href = "/api/auth/naver"
  }

  const handleEmailSubmit = async () => {
    if (!email || !password) {
      setError("이메일과 비밀번호를 입력해 주세요")
      return
    }
    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다")
      return
    }
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })
        if (error) throw error
        trackSignUp("email")
        setSuccess("확인 이메일을 발송했습니다. 메일함을 확인해 주세요.")
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          if (error.message === "Invalid login credentials") {
            throw new Error("이메일 또는 비밀번호가 올바르지 않습니다")
          }
          throw error
        }
        trackLogin("email")
        router.push("/")
      }
    } catch (err: any) {
      setError(err.message || "오류가 발생했습니다")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
      {/* BG */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 right-1/4 w-[500px] h-[500px] bg-teal-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-20 left-1/4 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-5 h-16 max-w-lg mx-auto w-full">
        <Link href="/landing" className="flex items-center gap-2 text-white/50 hover:text-white/80 transition text-sm">
          <ArrowLeft className="h-4 w-4" />
          홈으로
        </Link>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center">
            <Building2 className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-sm">Archi-Scan</span>
        </div>
      </nav>

      {/* Form */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-5 pb-10">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-extrabold mb-2">
              {mode === "login" ? "로그인" : "무료 가입"}
            </h1>
            <p className="text-sm text-white/40">
              {mode === "login"
                ? "계정에 로그인하세요"
                : "30초 만에 가입하고 무료 분석을 시작하세요"}
            </p>
          </div>

          {/* ★ 인앱 브라우저 경고 */}
          {isInAppBrowser && (
            <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <p className="text-xs font-semibold text-amber-400 mb-1">⚠️ {inAppBrowserName} 앱 내 브라우저 감지</p>
              <p className="text-[11px] text-amber-300/70 leading-relaxed">
                Google 로그인은 인앱 브라우저에서 차단됩니다. 
                <strong className="text-amber-300"> Chrome 또는 Safari</strong>에서 열어주세요.
              </p>
              <button
                onClick={() => {
                  const url = window.location.href
                  if (/Android/i.test(navigator.userAgent)) {
                    window.open(`intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`)
                  } else {
                    navigator.clipboard?.writeText(url)
                    setSuccess('주소가 복사되었습니다. Safari에 붙여넣기 해주세요.')
                  }
                }}
                className="mt-2 w-full py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-medium rounded-lg transition-colors"
              >
                {/Android/i.test(navigator.userAgent || '') ? '🌐 Chrome으로 열기' : '📋 주소 복사하기'}
              </button>
            </div>
          )}

          {/* Social buttons */}
          <div className="space-y-3 mb-6">
            {/* Kakao */}
            <button
              onClick={() => handleSocialLogin("kakao")}
              disabled={!!socialLoading}
              className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-semibold text-sm transition-all bg-[#FEE500] text-[#191919] hover:bg-[#FDD835] disabled:opacity-50"
            >
              {socialLoading === "kakao" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                  <path d="M12 3c5.8 0 10.5 3.66 10.5 8.17 0 4.52-4.7 8.18-10.5 8.18-.88 0-1.73-.08-2.55-.24l-4.17 2.84.93-4.42C4.15 15.84 1.5 13.23 1.5 11.17 1.5 6.66 6.2 3 12 3z" />
                </svg>
              )}
              카카오로 {mode === "login" ? "로그인" : "시작하기"}
            </button>

            {/* Naver */}
            <button
              onClick={handleNaverLogin}
              disabled={!!socialLoading}
              className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-semibold text-sm transition-all bg-[#03C75A] text-white hover:bg-[#02b351] disabled:opacity-50"
            >
              {socialLoading === "naver" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                  <path d="M16.27 3v8.18L7.73 3H3v18h4.73v-8.18L16.27 21H21V3h-4.73z" />
                </svg>
              )}
              네이버로 {mode === "login" ? "로그인" : "시작하기"}
            </button>

            {/* Google */}
            <button
              onClick={() => handleSocialLogin("google")}
              disabled={!!socialLoading}
              className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-semibold text-sm transition-all bg-white/10 text-white border border-white/10 hover:bg-white/15 disabled:opacity-50"
            >
              {socialLoading === "google" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg viewBox="0 0 24 24" className="h-5 w-5">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              Google로 {mode === "login" ? "로그인" : "시작하기"}
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-white/30">또는 이메일로</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Email form */}
          <div className="space-y-3 mb-4">
            <div>
              <label className="text-xs text-white/40 mb-1.5 block">이메일</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 transition"
                  onKeyDown={(e) => e.key === "Enter" && handleEmailSubmit()}
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1.5 block">비밀번호</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6자 이상"
                  className="w-full pl-4 pr-10 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 transition"
                  onKeyDown={(e) => e.key === "Enter" && handleEmailSubmit()}
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Error / Success */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 mb-4">
              <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mb-4">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
              <p className="text-xs text-emerald-400">{success}</p>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleEmailSubmit}
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-teal-400 to-emerald-500 text-white shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "login" ? "로그인" : "가입하기"}
          </button>

          {/* Toggle mode */}
          <p className="text-center text-xs text-white/40 mt-5">
            {mode === "login" ? (
              <>
                계정이 없으신가요?{" "}
                <button onClick={() => { setMode("signup"); setError(""); setSuccess("") }} className="text-teal-400 hover:underline font-medium">
                  무료 가입
                </button>
              </>
            ) : (
              <>
                이미 계정이 있으신가요?{" "}
                <button onClick={() => { setMode("login"); setError(""); setSuccess("") }} className="text-teal-400 hover:underline font-medium">
                  로그인
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-teal-400" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
