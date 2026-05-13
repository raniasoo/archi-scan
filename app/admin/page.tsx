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
  const [tab, setTab] = useState<"users" | "activity" | "payments" | "inquiries">("users")
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

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "전체 사용자", value: stats.totalUsers, icon: Users, color: "text-blue-500" },
              { label: "Pro 사용자", value: stats.proUsers, icon: Crown, color: "text-yellow-500" },
              { label: "이번 달 가입", value: stats.monthlySignups, icon: Calendar, color: "text-emerald-500" },
              { label: "총 매출", value: `₩${stats.totalRevenue.toLocaleString()}`, icon: CreditCard, color: "text-violet-500" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                </div>
                <div className="text-2xl font-bold">{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Secondary Stats */}
        {stats && (
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            {[
              { label: "무료 사용자", value: stats.freeUsers },
              { label: "오늘 가입", value: stats.todaySignups },
              { label: "분석 횟수", value: stats.totalAnalyses },
              { label: "보고서", value: stats.totalReports },
              { label: "AI 렌더링", value: stats.totalRenders },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border bg-card p-3 text-center">
                <div className="text-lg font-bold">{s.value}</div>
                <div className="text-[10px] text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b">
          {([
            { key: "users", label: "사용자", icon: Users },
            { key: "activity", label: "활동 로그", icon: BarChart3 },
            { key: "payments", label: "결제 내역", icon: CreditCard },
            { key: "inquiries", label: `문의 ${stats?.newInquiries ? `(${stats.newInquiries})` : ""}`, icon: MessageSquare },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="h-4 w-4" />
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
                        {p.plan === "pro" ? (
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
                          <div><span className="text-muted-foreground">플랜:</span> <span className="font-medium">{p.plan === "pro" ? "Pro" : "무료"}</span></div>
                          <div><span className="text-muted-foreground">사용량:</span> <span className="font-medium">{p.monthly_usage || 0}회</span></div>
                          <div><span className="text-muted-foreground">가입:</span> <span className="font-medium">{p.provider || "email"}</span></div>
                          <div className="col-span-3"><span className="text-muted-foreground">가입일:</span> <span className="font-medium">{fmtFullDate(p.created_at)}</span></div>
                        </div>
                        {/* Plan actions */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-muted-foreground mr-1">플랜 변경:</span>
                          {p.plan !== "pro" ? (
                            <button
                              onClick={async () => {
                                if (!confirm(`${p.name || p.email}을(를) Pro로 업그레이드하시겠습니까?`)) return
                                await fetch("/api/admin", {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ type: "update_plan", userId: p.id, plan: "pro" }),
                                })
                                fetchData()
                              }}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20"
                            >
                              <Crown className="h-3 w-3" /> Pro 업그레이드
                            </button>
                          ) : (
                            <button
                              onClick={async () => {
                                if (!confirm(`${p.name || p.email}을(를) 무료로 다운그레이드하시겠습니까?`)) return
                                await fetch("/api/admin", {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ type: "update_plan", userId: p.id, plan: "free" }),
                                })
                                fetchData()
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80"
                            >
                              무료로 변경
                            </button>
                          )}
                          <button
                            onClick={async () => {
                              if (!confirm(`${p.name || p.email}의 사용량을 초기화하시겠습니까?`)) return
                              await fetch("/api/admin", {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ type: "reset_usage", userId: p.id }),
                              })
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
                                await fetch("/api/admin", {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ id: inq.id, status: "read" }),
                                })
                                fetchData()
                              }}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20"
                            >
                              <Clock className="h-3 w-3" /> 확인 처리
                            </button>
                          )}
                          <button
                            onClick={async () => {
                              await fetch("/api/admin", {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  id: inq.id,
                                  status: "replied",
                                  admin_note: replyNote || inq.admin_note,
                                }),
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
                                await fetch("/api/admin", {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ id: inq.id, status: "closed" }),
                                })
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
      </main>
    </div>
  )
}
