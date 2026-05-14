import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { verifyAdminToken } from "./login/route"

// 간단한 관리자 이메일 체크 (추후 roles 테이블로 확장 가능)
const ADMIN_EMAILS = [
  "any00815@gmail.com",
  "any01004@kakao.com",
  "any001004@gmail.com",
  "dev@archiscan.app",
]

export async function GET(req: NextRequest) {
  try {
    // ━━━ 인증: Admin Token 또는 Supabase 세션 ━━━
    const adminToken = req.headers.get("X-Admin-Token") || ""
    let isAuthorized = false

    // 1차: Admin Token 확인
    if (adminToken && verifyAdminToken(adminToken)) {
      isAuthorized = true
    }

    // 2차: Supabase 세션 + 이메일 확인 (fallback)
    if (!isAuthorized) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user && ADMIN_EMAILS.includes(user.email || "")) {
        isAuthorized = true
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const supabase = await createClient()

    // ━━━ 데이터 조회: RPC 함수로 RLS 우회 (Admin 토큰 로그인 대응) ━━━
    let profiles: any[] = []
    let recentLogs: any[] = []
    let paymentLogs: any[] = []
    let inquiries: any[] = []

    // 1차: RPC 함수 시도 (RLS 우회 — Admin 토큰 로그인 시 필수)
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_admin_data', { admin_secret: 'archiscan-admin-2026' })
    
    if (!rpcError && rpcData && !rpcData.error) {
      profiles = rpcData.profiles || []
      recentLogs = rpcData.usage_logs || []
      paymentLogs = rpcData.payment_logs || []
      inquiries = rpcData.inquiries || []
    } else {
      // 2차 fallback: 직접 쿼리 (Supabase 세션 로그인 시 — RLS 적용됨)
      const { data: p } = await supabase.from("profiles").select("*").order("created_at", { ascending: false })
      const { data: u } = await supabase.from("usage_logs").select("*").order("created_at", { ascending: false }).limit(100)
      const { data: pl } = await supabase.from("usage_logs").select("*").eq("action", "payment").order("created_at", { ascending: false }).limit(50)
      const { data: i } = await supabase.from("inquiries").select("*").order("created_at", { ascending: false }).limit(100)
      profiles = p || []
      recentLogs = u || []
      paymentLogs = pl || []
      inquiries = i || []
    }

    // 5. 통계 계산
    const allProfiles = profiles || []
    const totalUsers = allProfiles.length
    const proUsers = allProfiles.filter(p => p.plan === "pro" || p.plan === "enterprise").length
    const enterpriseUsers = allProfiles.filter(p => p.plan === "enterprise").length
    const freeUsers = totalUsers - proUsers

    // 오늘 가입
    const today = new Date().toISOString().split("T")[0]
    const todaySignups = allProfiles.filter(p =>
      p.created_at?.startsWith(today)
    ).length

    // 이번 달 가입
    const thisMonth = new Date().toISOString().slice(0, 7)
    const monthlySignups = allProfiles.filter(p =>
      p.created_at?.startsWith(thisMonth)
    ).length

    // 총 분석 횟수
    const totalAnalyses = (recentLogs || []).filter(l => l.action === "analysis").length
    const totalReports = (recentLogs || []).filter(l => l.action === "report").length
    const totalRenders = (recentLogs || []).filter(l => l.action === "ai_render").length

    // 총 결제 금액
    const totalRevenue = (paymentLogs || []).reduce((sum, l) => {
      return sum + (l.metadata?.amount || 0)
    }, 0)

    return NextResponse.json({
      stats: {
        totalUsers,
        proUsers,
        enterpriseUsers,
        freeUsers,
        todaySignups,
        monthlySignups,
        totalAnalyses,
        totalReports,
        totalRenders,
        totalRevenue,
        paymentCount: (paymentLogs || []).length,
        inquiryCount: (inquiries || []).length,
        newInquiries: (inquiries || []).filter(i => i.status === "new").length,
      },
      profiles: allProfiles,
      recentLogs: recentLogs || [],
      paymentLogs: paymentLogs || [],
      inquiries: inquiries || [],
      notices: (rpcData?.notices || []),
      feedback: (rpcData?.feedback || []),
    })
  } catch (err: any) {
    console.error("[ADMIN] Error:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// 문의 상태 업데이트 + 사용자 플랜 변경
export async function PATCH(req: NextRequest) {
  try {
    // ━━━ 인증: Admin Token 또는 Supabase 세션 ━━━
    const adminToken = req.headers.get("X-Admin-Token") || ""
    let isAuthorized = false
    if (adminToken && verifyAdminToken(adminToken)) isAuthorized = true
    
    if (!isAuthorized) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user && ADMIN_EMAILS.includes(user.email || "")) isAuthorized = true
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const supabase = await createClient()
    const body = await req.json()
    const { type } = body

    // ── 사용자 플랜 변경 ──
    if (type === "update_plan") {
      const { userId, plan } = body
      if (!userId || !plan) {
        return NextResponse.json({ error: "userId and plan are required" }, { status: 400 })
      }

      const expiresAt = plan === "pro" ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null

      // RPC로 RLS 우회
      const { data, error } = await supabase.rpc('admin_update_profile', {
        admin_secret: 'archiscan-admin-2026',
        target_user_id: userId,
        new_plan: plan,
        new_plan_expires: expiresAt,
      })

      if (error) return NextResponse.json({ error: error.message }, { status: 400 })

      // 로그 기록
      await supabase.rpc('admin_insert_log', {
        admin_secret: 'archiscan-admin-2026',
        target_user_id: userId,
        log_action: 'admin_plan_change',
        log_metadata: { plan },
      })

      return NextResponse.json({ success: true })
    }

    // ── 사용량 초기화 ──
    if (type === "reset_usage") {
      const { userId } = body
      if (!userId) {
        return NextResponse.json({ error: "userId is required" }, { status: 400 })
      }

      const { error } = await supabase.rpc('admin_update_profile', {
        admin_secret: 'archiscan-admin-2026',
        target_user_id: userId,
        reset_usage: true,
      })

      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ success: true })
    }

    // ── 공지사항 관리 ──
    if (type === "notice_create" || type === "notice_update" || type === "notice_delete" || type === "notice_toggle") {
      const action = type.replace("notice_", "")
      const { data, error } = await supabase.rpc('admin_manage_notice', {
        admin_secret: 'archiscan-admin-2026',
        action,
        notice_id: body.noticeId || null,
        notice_title: body.title || null,
        notice_content: body.content || null,
        notice_type: body.noticeType || 'info',
        notice_active: body.isActive ?? true,
        notice_pinned: body.isPinned ?? false,
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json(data || { success: true })
    }

    // ── 문의 상태 업데이트 ──
    const { id, status, admin_note } = body
    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 })
    }

    const updates: any = {}
    if (status) updates.status = status
    if (admin_note !== undefined) updates.admin_note = admin_note

    const { error } = await supabase
      .from("inquiries")
      .update(updates)
      .eq("id", id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("[ADMIN] PATCH error:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
