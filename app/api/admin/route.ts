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

    // 4. 통계 계산
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
      },
      profiles: allProfiles,
      recentLogs: recentLogs || [],
      paymentLogs: paymentLogs || [],
    })
  } catch (err: any) {
    console.error("[ADMIN] Error:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
