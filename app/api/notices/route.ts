import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// 활성 공지사항 조회 (공개 — 로그인 불필요)
export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("notices")
      .select("id, title, content, type, is_pinned, created_at")
      .eq("is_active", true)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(10)

    if (error) {
      return NextResponse.json({ notices: [] })
    }

    return NextResponse.json({ notices: data || [] })
  } catch {
    return NextResponse.json({ notices: [] })
  }
}
