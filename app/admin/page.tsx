"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Users, Crown, CreditCard, BarChart3, TrendingUp,
  ArrowLeft, RefreshCw, Loader2, Search, Calendar,
  FileText, Sparkles, Building2, ChevronDown, ChevronUp
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

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [stats, setStats] = useState<Stats | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [recentLogs, setRecentLogs] = useState<LogEntry[]>([])
  const [paymentLogs, setPaymentLogs] = useState<LogEntry[]>([])
  const [tab, setTab] = useState<"users" | "activity" | "payments">("users")
  const [search, setSearch] = useState("")
  const [expandedUser, setExpandedUser] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/admin")
      if (res.status === 403) {
        setError("관리자 권한이 필요합니다")
        setLoading(false)
        return
      }
      if (!res.ok) throw new Error("데이터 로드 실패")
      const data = await res.json()
      setStats(data.stats)
      setProfiles(data.profiles)
      setRecentLogs(data.recentLogs)
      setPaymentLogs(data.paymentLogs)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

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
                      <div className="md:hidden px-4 pb-3 pt-0 grid grid-cols-3 gap-2 text-xs border-t bg-muted/20">
                        <div>
                          <span className="text-muted-foreground">플랜:</span>{" "}
                          <span className="font-medium">{p.plan === "pro" ? "Pro" : "무료"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">사용량:</span>{" "}
                          <span className="font-medium">{p.monthly_usage || 0}회</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">가입:</span>{" "}
                          <span className="font-medium">{p.provider || "email"}</span>
                        </div>
                        <div className="col-span-3">
                          <span className="text-muted-foreground">가입일:</span>{" "}
                          <span className="font-medium">{fmtFullDate(p.created_at)}</span>
                        </div>
                        <div className="col-span-3 text-[10px] text-muted-foreground/50 truncate">ID: {p.id}</div>
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
      </main>
    </div>
  )
}
