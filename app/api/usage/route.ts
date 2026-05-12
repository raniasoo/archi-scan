import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const FREE_MONTHLY_LIMIT = 10
const PRO_MONTHLY_LIMIT = -1 // unlimited

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Get profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    if (!profile) {
      // Auto-create profile if missing
      const { data: newProfile } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0],
          avatar_url: user.user_metadata?.avatar_url,
          provider: user.app_metadata?.provider,
        })
        .select()
        .single()

      return NextResponse.json({
        plan: "free",
        monthly_usage: 0,
        monthly_limit: FREE_MONTHLY_LIMIT,
        can_analyze: true,
        profile: newProfile,
      })
    }

    // Check if usage needs reset
    if (profile.usage_reset_at && new Date(profile.usage_reset_at) <= new Date()) {
      await supabase
        .from("profiles")
        .update({
          monthly_usage: 0,
          usage_reset_at: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
        })
        .eq("id", user.id)
      profile.monthly_usage = 0
    }

    const limit = profile.plan === "pro" ? PRO_MONTHLY_LIMIT : FREE_MONTHLY_LIMIT
    const canAnalyze = limit === -1 || profile.monthly_usage < limit

    return NextResponse.json({
      plan: profile.plan || "free",
      monthly_usage: profile.monthly_usage || 0,
      monthly_limit: limit,
      can_analyze: canAnalyze,
      profile,
    })
  } catch (err: any) {
    console.error("[USAGE] GET error:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const action = body.action || "analysis" // 'analysis' | 'report' | 'ai_render' | 'pdf_export'

    // Get profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan, monthly_usage, usage_reset_at")
      .eq("id", user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // Check limit for analysis actions
    if (action === "analysis") {
      const limit = profile.plan === "pro" ? PRO_MONTHLY_LIMIT : FREE_MONTHLY_LIMIT
      if (limit !== -1 && (profile.monthly_usage || 0) >= limit) {
        return NextResponse.json({
          error: "월간 분석 횟수를 초과했습니다",
          code: "USAGE_LIMIT_EXCEEDED",
          monthly_usage: profile.monthly_usage,
          monthly_limit: limit,
        }, { status: 429 })
      }

      // Increment usage
      await supabase
        .from("profiles")
        .update({ monthly_usage: (profile.monthly_usage || 0) + 1 })
        .eq("id", user.id)
    }

    // Log usage
    await supabase
      .from("usage_logs")
      .insert({
        user_id: user.id,
        action,
        metadata: body.metadata || {},
      })

    return NextResponse.json({
      success: true,
      monthly_usage: (profile.monthly_usage || 0) + (action === "analysis" ? 1 : 0),
    })
  } catch (err: any) {
    console.error("[USAGE] POST error:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
