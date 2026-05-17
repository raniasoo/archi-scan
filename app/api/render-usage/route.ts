import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ gemini: 0, controlNet: 0, month: '' })
    const { data: p } = await supabase.from("profiles").select("render_gemini, render_controlnet, render_month").eq("id", user.id).single()
    if (!p) return NextResponse.json({ gemini: 0, controlNet: 0, month: '' })
    const cm = new Date().toISOString().slice(0, 7)
    if (p.render_month !== cm) {
      await supabase.from("profiles").update({ render_gemini: 0, render_controlnet: 0, render_month: cm }).eq("id", user.id)
      return NextResponse.json({ gemini: 0, controlNet: 0, month: cm })
    }
    return NextResponse.json({ gemini: p.render_gemini || 0, controlNet: p.render_controlnet || 0, month: p.render_month || '' })
  } catch { return NextResponse.json({ gemini: 0, controlNet: 0, month: '' }) }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "login" }, { status: 401 })
    const { engine } = await req.json()
    const col = engine === 'controlNet' ? 'render_controlnet' : 'render_gemini'
    const cm = new Date().toISOString().slice(0, 7)
    const { data: p } = await supabase.from("profiles").select("render_gemini, render_controlnet, render_month").eq("id", user.id).single()
    if (!p) return NextResponse.json({ error: "no profile" }, { status: 404 })
    const isNew = p.render_month !== cm
    const upd: Record<string, any> = { render_month: cm }
    if (isNew) { upd.render_gemini = engine === 'controlNet' ? 0 : 1; upd.render_controlnet = engine === 'controlNet' ? 1 : 0 }
    else { upd[col] = ((p as any)[col] || 0) + 1 }
    await supabase.from("profiles").update(upd).eq("id", user.id)
    return NextResponse.json({ success: true, gemini: upd.render_gemini ?? p.render_gemini ?? 0, controlNet: upd.render_controlnet ?? p.render_controlnet ?? 0 })
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }) }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { userId } = await req.json()
    const { error } = await supabase.from("profiles").update({
      render_gemini: 0, render_controlnet: 0, render_month: new Date().toISOString().slice(0, 7),
    }).eq("id", userId || user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }) }
}
