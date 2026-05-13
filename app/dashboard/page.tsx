"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { getCloudProjects, deleteCloudProject, type CloudProject } from "@/lib/cloud-storage"
import { getRecentProjects, type ProjectListItem } from "@/lib/project-storage"
import {
  Building2, FolderOpen, TrendingUp, Clock, Plus, ArrowRight, Trash2,
  LogOut, ChevronRight, BarChart3, MapPin, User as UserIcon, Share2, FileText,
  MessageSquare, Send, Loader2, CheckCircle2, BookOpen
} from "lucide-react"
import { trackContactSubmit } from "@/components/google-analytics"
import { useSubscription } from "@/components/subscription-provider"

interface UserInfo {
  id: string
  email: string
  name: string
  avatar: string
}

interface Inquiry {
  id: string
  category: string
  message: string
  status: string
  created_at: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [cloudProjects, setCloudProjects] = useState<CloudProject[]>([])
  const [localProjects, setLocalProjects] = useState<ProjectListItem[]>([])
  const [activeTab, setActiveTab] = useState<'cloud' | 'local' | 'contact'>('cloud')
  const [deleting, setDeleting] = useState<string | null>(null)

  // 문의 상태
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [contactCategory, setContactCategory] = useState("일반")
  const [contactMessage, setContactMessage] = useState("")
  const [contactSending, setContactSending] = useState(false)
  const [contactSent, setContactSent] = useState(false)
  const { plan, monthlyUsage, monthlyLimit, isProUser, setShowPricingModal } = useSubscription()

  useEffect(() => {
    // URL 파라미터로 탭 설정
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('tab') === 'contact') setActiveTab('contact')
    }

    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/')
        return
      }
      setUser({
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '사용자',
        avatar: user.user_metadata?.avatar_url || '',
      })
      setLoading(false)
    })

    // 프로젝트 로드
    getCloudProjects(20).then(setCloudProjects)
    try { setLocalProjects(getRecentProjects(20)) } catch {}

    // 내 문의 로드
    const loadInquiries = async () => {
      const sb = createClient()
      const { data } = await sb.from("inquiries").select("id,category,message,status,created_at").order("created_at", { ascending: false }).limit(20)
      if (data) setInquiries(data)
    }
    loadInquiries()
  }, [router])

  const handleSendInquiry = async () => {
    if (!contactMessage.trim() || !user) return
    setContactSending(true)
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: user.name, email: user.email, category: contactCategory, message: contactMessage }),
      })
      const data = await res.json()
      if (data.success) {
        setContactSent(true)
        trackContactSubmit(contactCategory)
        setContactMessage("")
        // 목록 갱신
        const sb = createClient()
        const { data: updated } = await sb.from("inquiries").select("id,category,message,status,created_at").order("created_at", { ascending: false }).limit(20)
        if (updated) setInquiries(updated)
        setTimeout(() => setContactSent(false), 3000)
      }
    } catch {}
    setContactSending(false)
  }

  const handleDeleteCloud = async (id: string) => {
    if (!confirm('이 프로젝트를 삭제할까요?')) return
    setDeleting(id)
    const ok = await deleteCloudProject(id)
    if (ok) setCloudProjects(prev => prev.filter(p => p.id !== id))
    setDeleting(null)
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const allProjects = activeTab === 'cloud' ? cloudProjects : localProjects
  const totalProjects = cloudProjects.length + localProjects.length

  // 통계 계산
  const avgRoi = cloudProjects.length > 0
    ? cloudProjects.reduce((sum, p) => {
        const roi = p.snapshotData?.feasibility?.roi ?? p.snapshotData?.roi ?? 0
        return sum + roi
      }, 0) / cloudProjects.length
    : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center animate-pulse">
            <Building2 className="h-8 w-8 text-primary-foreground" />
          </div>
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-primary text-sm">Archi-Scan</span>
          </a>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/')}
              className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-1"
            >
              <Plus className="h-3 w-3" /> 새 분석
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
              title="로그아웃"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* ━━━ 프로필 + 플랜 배지 ━━━ */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="w-12 h-12 rounded-full border-2 border-primary/30" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <UserIcon className="h-5 w-5 text-primary" />
              </div>
            )}
            <div>
              <h1 className="text-base font-bold text-foreground">{user?.name}</h1>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => setShowPricingModal(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              plan === 'enterprise' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
              plan === 'pro' ? 'bg-primary/20 text-primary border border-primary/30' :
              'bg-muted text-muted-foreground border border-border hover:bg-primary/10 hover:text-primary hover:border-primary/30'
            }`}
          >
            {plan === 'enterprise' ? '✦ Enterprise' : plan === 'pro' ? '★ Pro' : '무료 플랜 · 업그레이드'}
          </button>
        </div>

        {/* ━━━ 사용량 프로그레스 바 ━━━ */}
        <div className="bg-card rounded-xl p-4 border border-border/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground">이번 달 사용량</span>
            <span className="text-xs font-bold text-foreground">
              {monthlyLimit === Infinity ? `${monthlyUsage}회 사용` : `${monthlyUsage} / ${monthlyLimit}회`}
            </span>
          </div>
          {monthlyLimit !== Infinity ? (
            <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  monthlyUsage / monthlyLimit > 0.8 ? 'bg-red-500' :
                  monthlyUsage / monthlyLimit > 0.5 ? 'bg-amber-500' : 'bg-primary'
                }`}
                style={{ width: `${Math.min(100, (monthlyUsage / monthlyLimit) * 100)}%` }}
              />
            </div>
          ) : (
            <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
              <div className="h-full rounded-full bg-primary/40 w-full" />
            </div>
          )}
          {monthlyLimit !== Infinity && monthlyUsage / monthlyLimit > 0.7 && (
            <p className="text-[10px] text-amber-400 mt-1.5">
              {monthlyLimit - monthlyUsage}회 남음 · {plan === 'pro' ? 'Enterprise' : 'Pro'}로 업그레이드하면 더 많은 분석 가능
            </p>
          )}
        </div>

        {/* ━━━ 통계 카드 ━━━ */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card rounded-xl p-3.5 border border-border/50">
            <div className="flex items-center gap-1.5 mb-1">
              <FolderOpen className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] text-muted-foreground">프로젝트</span>
            </div>
            <p className="text-xl font-bold text-foreground">{totalProjects}</p>
          </div>
          <div className="bg-card rounded-xl p-3.5 border border-border/50">
            <div className="flex items-center gap-1.5 mb-1">
              <BarChart3 className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-[10px] text-muted-foreground">평균 ROI</span>
            </div>
            <p className="text-xl font-bold text-foreground">{avgRoi > 0 ? `${avgRoi.toFixed(1)}%` : '-'}</p>
          </div>
          <div className="bg-card rounded-xl p-3.5 border border-border/50">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-[10px] text-muted-foreground">클라우드</span>
            </div>
            <p className="text-xl font-bold text-foreground">{cloudProjects.length}</p>
          </div>
        </div>

        {/* ━━━ ROI 트렌드 (프로젝트 2개 이상) ━━━ */}
        {cloudProjects.length >= 2 && (() => {
          const roiData = cloudProjects.slice(0, 6).map(p => ({
            name: p.address?.split(' ').slice(-1)[0] || '?',
            roi: p.snapshotData?.feasibility?.roi ?? p.snapshotData?.roi ?? 0,
          })).reverse()
          const maxRoi = Math.max(...roiData.map(d => d.roi), 1)
          return (
            <div className="bg-card rounded-xl p-4 border border-border/50">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">최근 분석 ROI 비교</span>
              </div>
              <div className="flex items-end gap-2 h-20">
                {roiData.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[9px] font-bold text-foreground">{d.roi > 0 ? `${d.roi.toFixed(0)}%` : '-'}</span>
                    <div
                      className={`w-full rounded-t-md transition-all ${
                        d.roi > 15 ? 'bg-emerald-500/60' : d.roi > 0 ? 'bg-amber-500/60' : 'bg-red-500/40'
                      }`}
                      style={{ height: `${Math.max(4, (d.roi / maxRoi) * 56)}px` }}
                    />
                    <span className="text-[8px] text-muted-foreground truncate w-full text-center">{d.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* ━━━ 빠른 액션 ━━━ */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-3 p-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl hover:from-primary/20 hover:to-primary/10 transition-all text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                <Plus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">새 프로젝트</p>
                <p className="text-xs text-muted-foreground">주소 입력으로 시작</p>
              </div>
            </button>
            <button
              onClick={() => router.push('/guide')}
              className="flex items-center gap-3 p-4 bg-card border border-border/50 rounded-xl hover:bg-secondary/30 transition-all text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <BookOpen className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">사용 가이드</p>
                <p className="text-xs text-muted-foreground">단계별 사용법</p>
              </div>
            </button>
          </div>

          {/* 빠른 재분석 — 최근 주소 3개 */}
          {cloudProjects.length > 0 && (
            <div className="bg-card rounded-xl p-3 border border-border/50">
              <p className="text-[10px] font-semibold text-muted-foreground mb-2">⚡ 빠른 재분석</p>
              <div className="flex flex-wrap gap-2">
                {cloudProjects.slice(0, 3).map(p => (
                  <button
                    key={p.id}
                    onClick={() => { localStorage.setItem('archi-scan-reanalyze', p.address); router.push('/') }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/50 hover:bg-secondary text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <MapPin className="h-3 w-3" />
                    <span className="truncate max-w-[140px]">{p.address?.split(' ').slice(-2).join(' ') || p.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 프로젝트 목록 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">내 프로젝트</h2>
            <div className="flex gap-1 bg-secondary/50 rounded-lg p-0.5">
              <button
                onClick={() => setActiveTab('cloud')}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  activeTab === 'cloud' ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                클라우드 ({cloudProjects.length})
              </button>
              <button
                onClick={() => setActiveTab('local')}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  activeTab === 'local' ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                로컬 ({localProjects.length})
              </button>
              <button
                onClick={() => setActiveTab('contact')}
                className={`px-3 py-1 text-xs rounded-md transition-colors flex items-center gap-1 ${
                  activeTab === 'contact' ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <MessageSquare className="h-3 w-3" /> 문의
              </button>
            </div>
          </div>

          {activeTab !== 'contact' && (allProjects.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-xl border border-border/50">
              <FolderOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                {activeTab === 'cloud' ? '클라우드에 저장된 프로젝트가 없습니다' : '로컬에 저장된 프로젝트가 없습니다'}
              </p>
              <button
                onClick={() => router.push('/')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" /> 첫 프로젝트 시작
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {(activeTab === 'cloud' ? cloudProjects : []).map((p) => {
                const roi = p.snapshotData?.feasibility?.roi ?? p.snapshotData?.roi
                const layoutName = p.snapshotData?.layout?.name || p.snapshotData?.layoutName
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border/50 hover:border-primary/30 transition-colors group"
                  >
                    <button
                      onClick={() => router.push('/')}
                      className="flex-1 text-left min-w-0"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin className="h-3 w-3 text-primary shrink-0" />
                        <span className="text-sm font-medium text-foreground truncate">{p.name}</span>
                        {roi !== undefined && (
                          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded shrink-0 ${
                            roi > 15 ? 'bg-emerald-500/10 text-emerald-400' : roi > 5 ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'
                          }`}>
                            ROI {roi.toFixed(1)}%
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="truncate">{p.address}</span>
                        {p.siteArea && <span>· {p.siteArea.toLocaleString()}㎡</span>}
                        {layoutName && <span className="hidden sm:inline">· {layoutName}</span>}
                      </div>
                      <div className="text-[10px] text-muted-foreground/60 mt-1">
                        <Clock className="h-2.5 w-2.5 inline mr-1" />
                        {new Date(p.updatedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                    </button>
                    <button
                      onClick={() => handleDeleteCloud(p.id)}
                      disabled={deleting === p.id}
                      className="shrink-0 p-2 rounded-lg text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                      title="삭제"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )
              })}

              {(activeTab === 'local' ? localProjects : []).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border/50 hover:border-primary/30 transition-colors"
                >
                  <button
                    onClick={() => router.push('/')}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium text-foreground truncate">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="truncate">{p.address}</span>
                      {p.siteArea && <span>· {p.siteArea.toLocaleString()}㎡</span>}
                    </div>
                    <div className="text-[10px] text-muted-foreground/60 mt-1">
                      <Clock className="h-2.5 w-2.5 inline mr-1" />
                      {new Date(p.updatedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </div>
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* 문의 탭 */}
        {activeTab === 'contact' && (
          <div className="space-y-4">
            {/* 문의 작성 */}
            <div className="bg-card rounded-xl border border-border/50 p-4 space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Send className="h-4 w-4 text-primary" /> 새 문의
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {["일반", "결제", "기능", "버그", "제휴"].map((c) => (
                  <button
                    key={c}
                    onClick={() => setContactCategory(c)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      contactCategory === c ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <textarea
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="궁금한 점이나 건의사항을 작성해 주세요"
                rows={3}
                className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">{user?.email}로 답변 드립니다</span>
                <button
                  onClick={handleSendInquiry}
                  disabled={contactSending || !contactMessage.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition disabled:opacity-40"
                >
                  {contactSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
                   contactSent ? <CheckCircle2 className="h-3.5 w-3.5" /> :
                   <Send className="h-3.5 w-3.5" />}
                  {contactSent ? "접수 완료!" : "보내기"}
                </button>
              </div>
            </div>

            {/* 내 문의 내역 */}
            <div>
              <h3 className="text-sm font-semibold mb-2">내 문의 내역</h3>
              {inquiries.length === 0 ? (
                <div className="text-center py-8 bg-card rounded-xl border border-border/50 text-sm text-muted-foreground">
                  아직 문의 내역이 없습니다
                </div>
              ) : (
                <div className="space-y-2">
                  {inquiries.map((inq) => (
                    <div key={inq.id} className="bg-card rounded-xl border border-border/50 p-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                          inq.status === "new" ? "bg-blue-500/10 text-blue-500" :
                          inq.status === "read" ? "bg-yellow-500/10 text-yellow-600" :
                          inq.status === "replied" ? "bg-emerald-500/10 text-emerald-600" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {inq.status === "new" ? "접수" : inq.status === "read" ? "확인 중" : inq.status === "replied" ? "답변 완료" : "종료"}
                        </span>
                        <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{inq.category}</span>
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {new Date(inq.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground line-clamp-2">{inq.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
