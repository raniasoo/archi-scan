import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  try {
    const { name, email, category, message } = await req.json()

    if (!email || !message) {
      return NextResponse.json({ error: "이메일과 문의 내용은 필수입니다" }, { status: 400 })
    }

    const supabase = await createClient()

    // 로그인 유저 정보 (선택)
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from("inquiries").insert({
      user_id: user?.id || null,
      name: name || "익명",
      email,
      category: category || "일반",
      message,
    })

    if (error) {
      // 테이블이 없으면 usage_logs에 fallback 저장
      console.error("[CONTACT] Insert error:", error.message)
      await supabase.from("usage_logs").insert({
        user_id: user?.id || null,
        action: "inquiry",
        metadata: { name, email, category, message },
      })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("[CONTACT] Error:", err.message)
    return NextResponse.json({ error: "문의 접수 중 오류가 발생했습니다" }, { status: 500 })
  }
}
