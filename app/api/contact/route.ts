import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || ""
    
    let name: string, email: string, category: string, message: string
    const fileUrls: string[] = []

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData()
      name = (formData.get("name") as string) || ""
      email = (formData.get("email") as string) || ""
      category = (formData.get("category") as string) || "일반"
      message = (formData.get("message") as string) || ""
      
      const files = formData.getAll("files") as File[]
      
      if (files.length > 0) {
        const supabaseForStorage = await createClient()
        const timestamp = Date.now()
        
        for (const file of files) {
          if (file.size > 10 * 1024 * 1024) continue
          const ext = file.name.split('.').pop() || 'bin'
          const safeName = `inquiry/${timestamp}_${Math.random().toString(36).slice(2, 8)}.${ext}`
          const buffer = Buffer.from(await file.arrayBuffer())
          
          const { data, error } = await supabaseForStorage.storage
            .from('attachments')
            .upload(safeName, buffer, { contentType: file.type, upsert: false })
          
          if (data?.path) {
            const { data: urlData } = supabaseForStorage.storage
              .from('attachments').getPublicUrl(data.path)
            fileUrls.push(urlData.publicUrl)
          } else if (error) {
            console.warn(`[CONTACT] File upload failed: ${error.message}`)
          }
        }
      }
    } else {
      const body = await req.json()
      name = body.name || ""
      email = body.email || ""
      category = body.category || "일반"
      message = body.message || ""
    }

    if (!email || !message) {
      return NextResponse.json({ error: "이메일과 문의 내용은 필수입니다" }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const insertData: Record<string, unknown> = {
      user_id: user?.id || null,
      name: name || "익명",
      email,
      category: category || "일반",
      message,
    }
    if (fileUrls.length > 0) insertData.attachments = fileUrls

    const { error } = await supabase.from("inquiries").insert(insertData)

    if (error) {
      console.error("[CONTACT] Insert error:", error.message)
      await supabase.from("usage_logs").insert({
        user_id: user?.id || null,
        action: "inquiry",
        metadata: { name, email, category, message, attachments: fileUrls },
      })
    }

    return NextResponse.json({ success: true, attachments: fileUrls.length })
  } catch (err: any) {
    console.error("[CONTACT] Error:", err.message)
    return NextResponse.json({ error: "문의 접수 중 오류가 발생했습니다" }, { status: 500 })
  }
}
