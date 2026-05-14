"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Users, Crown, CreditCard, BarChart3, TrendingUp,
  ArrowLeft, RefreshCw, Loader2, Search, Calendar,
  FileText, Sparkles, Building2, ChevronDown, ChevronUp,
  MessageSquare, CheckCircle2, Clock, Reply
} from "lucide-react"

interface Stats {
  totalUsers: number
  proUsers: number
  enterpriseUsers: number
  freeUsers: number
  todaySignups: number
  monthlySignups: number
  totalAnalyses: number
  totalReports: number
  totalRenders: number
  totalRevenue: number
  paymentCount: number
}

interface Profile {
  id: string
  email: string
  name: string
  avatar_url: string | null
  provider: string
  plan: string
  monthly_usage: number
  plan_expires_at: string | null
  created_at: string
  updated_at: string
}

interface LogEntry {
  id: string
  user_id: string
  action: string
  metadata: any
  created_at: string
}

interface Inquiry {
  id: string
  user_id: string | null
  name: string
  email: string
  category: string
  message: string
  status: string
  admin_note: string | null
  created_at: string
}

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [stats, setStats] = useState<Stats | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [recentLogs, setRecentLogs] = useState<LogEntry[]>([])
  const [paymentLogs, setPaymentLogs] = useState<LogEntry[]>([])
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [notices, setNotices] = useState<any[]>([])
  const [feedbackList, setFeedbackList] = useState<any[]>([])
  const [tab, setTab] = useState<"users" | "activity" | "payments" | "inquiries" | "notices" | "feedback">("users")
  const [search, setSearch] = useState("")
  const [expandedUser, setExpandedUser] = useState<string | null>(null)
  const [expandedInquiry, setExpandedInquiry] = useState<string | null>(null)
  const [replyNote, setReplyNote] = useState("")

  // ━━━ 관리자 로그인 ━━━
  const [adminAuth, setAdminAuth] = useState(false)
  const [adminId, setAdminId] = useState("")
  const [adminPw, setAdminPw] = useState("")
  const [loginError, setLoginError] = useState("")
  const [loginLoading, setLoginLoading] = useState(false)

  // 세션 복원
  useEffect(() => {
    const token = sessionStorage.getItem("admin_token")
    if (token) setAdminAuth(true)
  }, [])

  const handleAdminLogin = async () => {
    setLoginLoading(true); setLoginError("")
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: adminId, password: adminPw }),
      })
      const data = await res.json()
      if (data.success) {
        sessionStorage.setItem("admin_token", data.token)
        setAdminAuth(true)
      } else {
        setLoginError(data.error || "로그인 실패")
      }
    } catch { setLoginError("서버 연결 실패") }
    finally { setLoginLoading(false) }
  }

  const handleAdminLogout = () => {
    sessionStorage.removeItem("admin_token")
    setAdminAuth(false)
    setStats(null)
    setProfiles([])
  }

  // Admin API 요청 헬퍼 (토큰 자동 첨부)
  const adminFetch = (method: string, body: any) => {
    const token = sessionStorage.getItem("admin_token") || ""
    return fetch("/api/admin", {
      method,
      headers: { "Content-Type": "application/json", "X-Admin-Token": token },
      body: JSON.stringify(body),
    })
  }

  const fetchData = async () => {
    setLoading(true)
    setError("")
    try {
      const token = sessionStorage.getItem("admin_token") || ""
      const res = await fetch("/api/admin", { headers: { "X-Admin-Token": token } })
      if (res.status === 403) {
        setError("관리자 권한이 필요합니다")
        sessionStorage.removeItem("admin_token")
        setAdminAuth(false)
        setLoading(false)
        return
      }
      if (!res.ok) throw new Error("데이터 로드 실패")
      const data = await res.json()
      setStats(data.stats)
      setProfiles(data.profiles)
      setRecentLogs(data.recentLogs)
      setPaymentLogs(data.paymentLogs)
      setInquiries(data.inquiries || [])
      setNotices(data.notices || [])
      setFeedbackList(data.feedback || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (adminAuth) fetchData() }, [adminAuth])

  const filteredProfiles = profiles.filter(p =>
    !search || 
    p.email?.toLowerCase().includes(search.toLowerCase()) ||
    p.name?.toLowerCase().includes(search.toLowerCase())
  )

  const fmtDate = (d: string) => {
    if (!d) return "-"
    const dt = new Date(d)
    return `${dt.getMonth() + 1}/${dt.getDate()} ${dt.getHours()}:${String(dt.getMinutes()).padStart(2, "0")}`
  }

  const fmtFullDate = (d: string) => {
    if (!d) return "-"
    return new Date(d).toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" })
  }

  const actionLabel: Record<string, string> = {
    analysis: "분석",
    report: "보고서",
    ai_render: "AI렌더링",
    pdf_export: "PDF",
    payment: "결제",
  }

  // ━━━ 로그인 전: 로그인 폼 표시 ━━━
  if (!adminAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-5">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <Building2 className="h-10 w-10 text-primary mx-auto mb-3" />
            <h1 className="text-xl font-bold">Archi-Scan Admin</h1>
            <p className="text-sm text-muted-foreground mt-1">관리자 로그인</p>
          </div>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="관리자 ID"
              value={adminId}
              onChange={e => setAdminId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
              className="w-full px-4 py-3 rounded-lg bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="password"
              placeholder="비밀번호"
              value={adminPw}
              onChange={e => setAdminPw(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
              className="w-full px-4 py-3 rounded-lg bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {loginError && <p className="text-xs text-destructive">{loginError}</p>}
            <button
              onClick={handleAdminLogin}
              disabled={loginLoading || !adminId || !adminPw}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loginLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              로그인
            </button>
          </div>
          <button onClick={() => router.push("/")} className="w-full text-center text-xs text-muted-foreground hover:underline">
            ← 앱으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-5">
        <div className="text-center">
          <p className="text-lg font-semibold text-destructive mb-3">{error}</p>
          <button onClick={() => router.push("/")} className="text-sm text-muted-foreground hover:underline">
            ← 앱으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/")} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <span className="font-bold">Admin</span>
            </div>
          </div>
          <button onClick={fetchData} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <RefreshCw className="h-3.5 w-3.5" />
            새로고침
          </button>
          <button onClick={handleAdminLogout} className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 ml-3">
            로그아웃
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        {/* ━━━ 1. 플랜별 사용자 카드 ━━━ */}
        {stats && (
          <div className="grid grid-cols-4 gap-2">
            <div className="rounded-xl border bg-card p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground">전체</span>
                <Users className="h-3.5 w-3.5 text-blue-500" />
              </div>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </div>
            <div className="rounded-xl border bg-card p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground">무료</span>
              </div>
              <div className="text-2xl font-bold text-muted-foreground">{stats.freeUsers}</div>
            </div>
            <div className="rounded-xl border bg-card p-3 border-yellow-500/20">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-yellow-500">Pro</span>
                <Crown className="h-3.5 w-3.5 text-yellow-500" />
              </div>
              <div className="text-2xl font-bold text-yellow-500">{stats.proUsers - stats.enterpriseUsers}</div>
            </div>
            <div className="rounded-xl border bg-card p-3 border-violet-500/20">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-violet-400">Enterprise</span>
                <span className="text-sm">💎</span>
              </div>
              <div className="text-2xl font-bold text-violet-400">{stats.enterpriseUsers}</div>
            </div>
          </div>
        )}

        {/* ━━━ 2. 플랜 비율 바 ━━━ */}
        {stats && stats.totalUsers > 0 && (
          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] text-muted-foreground">플랜 분포</span>
              <div className="flex-1" />
              {stats.freeUsers > 0 && <span className="text-[9px] text-muted-foreground">무료 {Math.round(stats.freeUsers/stats.totalUsers*100)}%</span>}
              {(stats.proUsers - stats.enterpriseUsers) > 0 && <span className="text-[9px] text-yellow-500">Pro {Math.round((stats.proUsers - stats.enterpriseUsers)/stats.totalUsers*100)}%</span>}
              {stats.enterpriseUsers > 0 && <span className="text-[9px] text-violet-400">Ent {Math.round(stats.enterpriseUsers/stats.totalUsers*100)}%</span>}
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden flex">
              {stats.freeUsers > 0 && <div className="bg-gray-500 h-full" style={{ width: `${stats.freeUsers/stats.totalUsers*100}%` }} />}
              {(stats.proUsers - stats.enterpriseUsers) > 0 && <div className="bg-yellow-500 h-full" style={{ width: `${(stats.proUsers - stats.enterpriseUsers)/stats.totalUsers*100}%` }} />}
              {stats.enterpriseUsers > 0 && <div className="bg-violet-500 h-full" style={{ width: `${stats.enterpriseUsers/stats.totalUsers*100}%` }} />}
            </div>
          </div>
        )}

        {/* ━━━ 3. 활동 요약 (0값 축소) ━━━ */}
        {stats && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {[
              { label: "이달 가입", value: stats.monthlySignups, icon: "📅" },
              { label: "총 매출", value: `₩${stats.totalRevenue.toLocaleString()}`, icon: "💰" },
              { label: "분석", value: stats.totalAnalyses, icon: "🔍" },
              { label: "보고서", value: stats.totalReports, icon: "📄" },
              { label: "렌더링", value: stats.totalRenders, icon: "🎨" },
              { label: "오늘 가입", value: stats.todaySignups, icon: "🆕" },
            ].filter(s => s.value !== 0 && s.value !== "₩0").map((s) => (
              <div key={s.label} className="flex-shrink-0 rounded-lg border bg-card px-3 py-2 flex items-center gap-2">
                <span className="text-sm">{s.icon}</span>
                <div>
                  <div className="text-sm font-bold leading-tight">{s.value}</div>
                  <div className="text-[9px] text-muted-foreground">{s.label}</div>
                </div>
              </div>
            ))}
            {/* 모두 0이면 메시지 표시 */}
            {stats.totalAnalyses === 0 && stats.totalReports === 0 && stats.totalRenders === 0 && stats.monthlySignups === 0 && (
              <div className="text-xs text-muted-foreground py-2">아직 활동 데이터가 없습니다</div>
            )}
          </div>
        )}

        {/* ━━━ 4. 탭 — 아이콘 + 가로 스크롤 ━━━ */}
        <div className="flex gap-1 overflow-x-auto scrollbar-hide border-b">
          {([
            { key: "users", label: "사용자", icon: "👥" },
            { key: "activity", label: "활동", icon: "📊" },
            { key: "payments", label: "결제", icon: "💳" },
            { key: "inquiries", label: `문의${stats?.newInquiries ? ` (${stats.newInquiries})` : ""}`, icon: "💬" },
            { key: "notices", label: `공지 (${notices.length})`, icon: "📢" },
            { key: "feedback", label: `피드백 (${feedbackList.length})`, icon: "⭐" },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                tab === t.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="text-sm">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Users Tab */}
        {tab === "users" && (
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="이름 또는 이메일 검색..."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* User List */}
            <div className="border rounded-xl overflow-hidden">
              <div className="hidden md:grid grid-cols-[1fr_120px_80px_80px_100px] gap-3 px-4 py-2.5 bg-muted/50 text-xs font-medium text-muted-foreground">
                <span>사용자</span>
                <span>플랜</span>
                <span>사용량</span>
                <span>가입방식</span>
                <span>가입일</span>
              </div>
              {filteredProfiles.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">사용자 없음</div>
              ) : (
                filteredProfiles.map((p) => (
                  <div key={p.id}>
                    <div
                      className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_120px_80px_80px_100px] gap-3 px-4 py-3 border-t items-center cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => setExpandedUser(expandedUser === p.id ? null : p.id)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">
                          {(p.name || p.email || "?")[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{p.name || "-"}</div>
                          <div className="text-xs text-muted-foreground truncate">{p.email}</div>
                        </div>
                      </div>
                      <div className="hidden md:block">
                        {p.plan === "enterprise" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 text-xs font-medium">
                            💎 Enterprise
                          </span>
                        ) : p.plan === "pro" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 text-xs font-medium">
                            <Crown className="h-3 w-3" /> Pro
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">무료</span>
                        )}
                      </div>
                      <div className="hidden md:block text-sm">{p.monthly_usage || 0}회</div>
                      <div className="hidden md:block">
                        <span className="text-xs text-muted-foreground capitalize">{p.provider || "email"}</span>
                      </div>
                      <div className="hidden md:block text-xs text-muted-foreground">{fmtFullDate(p.created_at)}</div>
                      <div className="md:hidden">
                        {expandedUser === p.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </div>
                    {/* Mobile expanded details */}
                    {expandedUser === p.id && (
                      <div className="px-4 pb-3 pt-2 border-t bg-muted/10 space-y-3">
                        {/* Mobile info */}
                        <div className="md:hidden grid grid-cols-3 gap-2 text-xs">
                          <div><span className="text-muted-foreground">플랜:</span> <span className="font-medium">{p.plan === "enterprise" ? "Enterprise" : p.plan === "pro" ? "Pro" : "무료"}</span></div>
                          <div><span className="text-muted-foreground">사용량:</span> <span className="font-medium">{p.monthly_usage || 0}회</span></div>
                          <div><span className="text-muted-foreground">가입:</span> <span className="font-medium">{p.provider || "email"}</span></div>
                          <div className="col-span-3"><span className="text-muted-foreground">가입일:</span> <span className="font-medium">{fmtFullDate(p.created_at)}</span></div>
                        </div>
                        {/* Plan actions */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-muted-foreground mr-1">플랜 변경:</span>
                          {p.plan !== "free" && (
                            <button onClick={async () => {
                              if (!confirm(`${p.name || p.email}을(를) 무료로 변경하시겠습니까?`)) return
                              await adminFetch("PATCH", { type: "update_plan", userId: p.id, plan: "free" })
                              fetchData()
                            }} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80">
                              무료
                            </button>
                          )}
                          {p.plan !== "pro" && (
                            <button onClick={async () => {
                              if (!confirm(`${p.name || p.email}을(를) Pro로 변경하시겠습니까?`)) return
                              await adminFetch("PATCH", { type: "update_plan", userId: p.id, plan: "pro" })
                              fetchData()
                            }} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20">
                              <Crown className="h-3 w-3" /> Pro
                            </button>
                          )}
                          {p.plan !== "enterprise" && (
                            <button onClick={async () => {
                              if (!confirm(`${p.name || p.email}을(를) Enterprise로 변경하시겠습니까?`)) return
                              await adminFetch("PATCH", { type: "update_plan", userId: p.id, plan: "enterprise" })
                              fetchData()
                            }} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-violet-500/10 text-violet-400 hover:bg-violet-500/20">
                              💎 Enterprise
                            </button>
                          )}
                          <button
                            onClick={async () => {
                              if (!confirm(`${p.name || p.email}의 사용량을 초기화하시겠습니까?`)) return
                              await adminFetch("PATCH", { type: "reset_usage", userId: p.id })
                              fetchData()
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-600 hover:bg-blue-500/20"
                          >
                            사용량 초기화
                          </button>
                        </div>
                        <div className="text-[10px] text-muted-foreground/50 truncate">ID: {p.id}</div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="text-xs text-muted-foreground text-right">총 {filteredProfiles.length}명</div>
          </div>
        )}

        {/* Activity Tab */}
        {tab === "activity" && (
          <div className="border rounded-xl overflow-hidden">
            <div className="hidden md:grid grid-cols-[100px_1fr_120px_140px] gap-3 px-4 py-2.5 bg-muted/50 text-xs font-medium text-muted-foreground">
              <span>액션</span>
              <span>사용자</span>
              <span>상세</span>
              <span>시간</span>
            </div>
            {recentLogs.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">활동 로그 없음</div>
            ) : (
              recentLogs.slice(0, 50).map((log) => {
                const profile = profiles.find(p => p.id === log.user_id)
                return (
                  <div key={log.id} className="grid grid-cols-[80px_1fr_auto] md:grid-cols-[100px_1fr_120px_140px] gap-3 px-4 py-2.5 border-t items-center text-sm">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full w-fit ${
                      log.action === "payment" ? "bg-violet-500/10 text-violet-600" :
                      log.action === "analysis" ? "bg-blue-500/10 text-blue-600" :
                      log.action === "ai_render" ? "bg-orange-500/10 text-orange-600" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {actionLabel[log.action] || log.action}
                    </span>
                    <span className="text-xs truncate">{profile?.email || log.user_id.slice(0, 8)}</span>
                    <span className="hidden md:block text-xs text-muted-foreground truncate">
                      {log.metadata?.address || log.metadata?.method || "-"}
                    </span>
                    <span className="text-xs text-muted-foreground">{fmtDate(log.created_at)}</span>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Payments Tab */}
        {tab === "payments" && (
          <div className="space-y-3">
            {stats && (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border bg-card p-4">
                  <div className="text-xs text-muted-foreground mb-1">총 매출</div>
                  <div className="text-2xl font-bold">₩{stats.totalRevenue.toLocaleString()}</div>
                </div>
                <div className="rounded-xl border bg-card p-4">
                  <div className="text-xs text-muted-foreground mb-1">결제 건수</div>
                  <div className="text-2xl font-bold">{stats.paymentCount}건</div>
                </div>
              </div>
            )}

            <div className="border rounded-xl overflow-hidden">
              <div className="hidden md:grid grid-cols-[1fr_100px_100px_140px] gap-3 px-4 py-2.5 bg-muted/50 text-xs font-medium text-muted-foreground">
                <span>사용자</span>
                <span>금액</span>
                <span>결제수단</span>
                <span>시간</span>
              </div>
              {paymentLogs.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">결제 내역 없음</div>
              ) : (
                paymentLogs.map((log) => {
                  const profile = profiles.find(p => p.id === log.user_id)
                  return (
                    <div key={log.id} className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_100px_100px_140px] gap-3 px-4 py-3 border-t items-center">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{profile?.name || "-"}</div>
                        <div className="text-xs text-muted-foreground truncate">{profile?.email}</div>
                      </div>
                      <div className="text-sm font-semibold text-right md:text-left">
                        ₩{(log.metadata?.amount || 0).toLocaleString()}
                      </div>
                      <div className="hidden md:block text-xs text-muted-foreground">
                        {log.metadata?.method || "-"}
                      </div>
                      <div className="hidden md:block text-xs text-muted-foreground">
                        {fmtDate(log.created_at)}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* Inquiries Tab */}
        {tab === "inquiries" && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "전체", value: inquiries.length, color: "" },
                { label: "신규", value: inquiries.filter(i => i.status === "new").length, color: "text-blue-500" },
                { label: "답변 완료", value: inquiries.filter(i => i.status === "replied").length, color: "text-emerald-500" },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border bg-card p-3 text-center">
                  <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-[10px] text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="border rounded-xl overflow-hidden">
              {inquiries.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">접수된 문의 없음</div>
              ) : (
                inquiries.map((inq) => (
                  <div key={inq.id} className="border-t first:border-t-0">
                    <div
                      className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => setExpandedInquiry(expandedInquiry === inq.id ? null : inq.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                            inq.status === "new" ? "bg-blue-500/10 text-blue-500" :
                            inq.status === "read" ? "bg-yellow-500/10 text-yellow-600" :
                            inq.status === "replied" ? "bg-emerald-500/10 text-emerald-600" :
                            "bg-muted text-muted-foreground"
                          }`}>
                            {inq.status === "new" ? "신규" : inq.status === "read" ? "확인" : inq.status === "replied" ? "답변완료" : "종료"}
                          </span>
                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{inq.category}</span>
                        </div>
                        <div className="text-sm truncate">{inq.message}</div>
                        <div className="text-xs text-muted-foreground mt-1">{inq.name} · {inq.email} · {fmtDate(inq.created_at)}</div>
                      </div>
                      {expandedInquiry === inq.id ? <ChevronUp className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />}
                    </div>

                    {expandedInquiry === inq.id && (
                      <div className="px-4 pb-4 space-y-3 bg-muted/10">
                        {/* Full message */}
                        <div className="rounded-lg border bg-card p-3">
                          <div className="text-xs font-medium text-muted-foreground mb-1">문의 내용</div>
                          <div className="text-sm whitespace-pre-wrap">{inq.message}</div>
                        </div>

                        {/* Admin note */}
                        {inq.admin_note && (
                          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                            <div className="text-xs font-medium text-emerald-600 mb-1 flex items-center gap-1">
                              <Reply className="h-3 w-3" /> 관리자 메모
                            </div>
                            <div className="text-sm">{inq.admin_note}</div>
                          </div>
                        )}

                        {/* Reply input */}
                        <div>
                          <textarea
                            value={expandedInquiry === inq.id ? replyNote : ""}
                            onChange={(e) => setReplyNote(e.target.value)}
                            placeholder="관리자 메모 또는 답변 내용..."
                            rows={2}
                            className="w-full px-3 py-2 rounded-lg border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2">
                          {inq.status === "new" && (
                            <button
                              onClick={async () => {
                                await adminFetch("PATCH", { id: inq.id, status: "read" })
                                fetchData()
                              }}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20"
                            >
                              <Clock className="h-3 w-3" /> 확인 처리
                            </button>
                          )}
                          <button
                            onClick={async () => {
                              await adminFetch("PATCH", {
                                  id: inq.id,
                                  status: "replied",
                                  admin_note: replyNote || inq.admin_note,
                                })
                              setReplyNote("")
                              fetchData()
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                          >
                            <CheckCircle2 className="h-3 w-3" /> 답변 완료
                          </button>
                          {inq.status !== "closed" && (
                            <button
                              onClick={async () => {
                                await adminFetch("PATCH", { id: inq.id, status: "closed" })
                                fetchData()
                              }}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80"
                            >
                              종료
                            </button>
                          )}
                          <a
                            href={`mailto:${inq.email}?subject=Re: [Archi-Scan] ${inq.category} 문의&body=${encodeURIComponent(`안녕하세요, ${inq.name}님.\n\nArchi-Scan을 이용해 주셔서 감사합니다.\n문의하신 내용에 대해 답변 드립니다.\n\n---\n\n감사합니다.\nArchi-Scan 팀`)}`}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 ml-auto"
                          >
                            <Reply className="h-3 w-3" /> 이메일 답변
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Notices Tab */}
        {tab === "notices" && (
          <div className="space-y-4">
            {/* New Notice Form */}
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <h3 className="text-sm font-bold">📝 새 공지 작성</h3>
              <input
                id="notice-title"
                placeholder="제목"
                className="w-full px-3 py-2 rounded-lg bg-background border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <textarea
                id="notice-content"
                placeholder="내용"
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-background border text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
              <div className="flex gap-2 items-center">
                <select id="notice-type" className="px-3 py-2 rounded-lg bg-background border text-sm">
                  <option value="info">ℹ️ 안내</option>
                  <option value="update">🆕 업데이트</option>
                  <option value="maintenance">🔧 점검</option>
                  <option value="promo">🎉 프로모션</option>
                </select>
                <label className="flex items-center gap-1 text-xs">
                  <input type="checkbox" id="notice-pinned" /> 📌 고정
                </label>
                <button
                  onClick={async () => {
                    const title = (document.getElementById("notice-title") as HTMLInputElement)?.value
                    const content = (document.getElementById("notice-content") as HTMLTextAreaElement)?.value
                    const noticeType = (document.getElementById("notice-type") as HTMLSelectElement)?.value
                    const isPinned = (document.getElementById("notice-pinned") as HTMLInputElement)?.checked
                    if (!title || !content) return
                    await adminFetch("PATCH", { type: "notice_create", title, content, noticeType, isPinned })
                    ;(document.getElementById("notice-title") as HTMLInputElement).value = ""
                    ;(document.getElementById("notice-content") as HTMLTextAreaElement).value = ""
                    fetchData()
                  }}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
                >
                  등록
                </button>
              </div>
            </div>

            {/* Notice List */}
            <div className="rounded-xl border bg-card overflow-hidden">
              {notices.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">등록된 공지 없음</div>
              ) : (
                notices.map((n: any) => (
                  <div key={n.id} className={`px-4 py-3 border-b last:border-0 ${!n.is_active ? 'opacity-40' : ''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-sm">
                          {n.type === 'update' ? '🆕' : n.type === 'maintenance' ? '🔧' : n.type === 'promo' ? '🎉' : 'ℹ️'}
                        </span>
                        {n.is_pinned && <span className="text-[10px]">📌</span>}
                        <span className="text-sm font-medium truncate">{n.title}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${n.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                          {n.is_active ? '활성' : '비활성'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={async () => {
                            await adminFetch("PATCH", { type: "notice_toggle", noticeId: n.id })
                            fetchData()
                          }}
                          className="px-2 py-1 rounded text-[10px] bg-muted hover:bg-muted/80"
                        >
                          {n.is_active ? '숨기기' : '표시'}
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm('이 공지를 삭제하시겠습니까?')) return
                            await adminFetch("PATCH", { type: "notice_delete", noticeId: n.id })
                            fetchData()
                          }}
                          className="px-2 py-1 rounded text-[10px] text-red-400 bg-red-500/10 hover:bg-red-500/20"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.content}</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-1">{new Date(n.created_at).toLocaleDateString('ko-KR')}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Feedback Tab */}
        {tab === "feedback" && (
          <div className="space-y-4">
            {/* 평균 평점 */}
            {feedbackList.length > 0 && (
              <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
                <div className="text-3xl font-bold text-yellow-500">
                  {(feedbackList.reduce((s: number, f: any) => s + (f.rating || 0), 0) / feedbackList.length).toFixed(1)}
                </div>
                <div>
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(n => (
                      <span key={n} className="text-sm">{n <= Math.round(feedbackList.reduce((s: number, f: any) => s + (f.rating || 0), 0) / feedbackList.length) ? '⭐' : '☆'}</span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{feedbackList.length}건의 피드백</p>
                </div>
              </div>
            )}

            {/* 피드백 목록 */}
            <div className="rounded-xl border bg-card overflow-hidden">
              {feedbackList.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">접수된 피드백 없음</div>
              ) : (
                feedbackList.map((f: any) => (
                  <div key={f.id} className="px-4 py-3 border-b last:border-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{'⭐'.repeat(f.rating || 0)}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{f.category || 'general'}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{new Date(f.created_at).toLocaleDateString('ko-KR')}</span>
                    </div>
                    {f.message && <p className="text-xs mt-1.5">{f.message}</p>}
                    <p className="text-[10px] text-muted-foreground/50 mt-1">{f.email || f.name || '익명'}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
