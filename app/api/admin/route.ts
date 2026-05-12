import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// 간단한 관리자 이메일 체크 (추후 roles 테이블로 확장 가능)
const ADMIN_EMAILS = [
  "any00815@gmail.com",
  "any01004@kakao.com",
  "any001004@gmail.com",
  "dev@archiscan.app",
]

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !ADMIN_EMAILS.includes(user.email || "")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // 1. 전체 프로필 목록
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })

    // 2. 최근 사용 로그 (최근 100건)
    const { data: recentLogs } = await supabase
      .from("usage_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)

    // 3. 결제 로그
    const { data: paymentLogs } = await supabase
      .from("usage_logs")
      .select("*")
      .eq("action", "payment")
      .order("created_at", { ascending: false })
      .limit(50)

    // 4. 문의 목록
    const { data: inquiries } = await supabase
      .from("inquiries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)

    // 5. 통계 계산
    const allProfiles = profiles || []
    const totalUsers = allProfiles.length
    const proUsers = allProfiles.filter(p => p.plan === "pro").length
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
    })
  } catch (err: any) {
    console.error("[ADMIN] Error:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// 문의 상태 업데이트
export async function PATCH(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !ADMIN_EMAILS.includes(user.email || "")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { id, status, admin_note } = await req.json()

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

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("[ADMIN] PATCH error:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
