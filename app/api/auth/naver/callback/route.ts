import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"

/**
 * 네이버 OAuth 콜백
 * 1. state 검증 (CSRF)
 * 2. authorization_code → access_token 교환
 * 3. 네이버 프로필 API 호출
 * 4. Supabase 유저 생성/로그인
 * 5. 메인 앱으로 리다이렉트
 */

interface NaverProfile {
  resultcode: string
  message: string
  response: {
    id: string
    email?: string
    name?: string
    nickname?: string
    profile_image?: string
    mobile?: string
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.archiscan.kr"

  // 에러 처리
  if (error) {
    console.error("[NAVER] OAuth error:", error, searchParams.get("error_description"))
    return NextResponse.redirect(`${siteUrl}/auth/login?error=naver_denied`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${siteUrl}/auth/login?error=naver_missing_params`)
  }

  // State 검증 (CSRF 방지)
  const cookieStore = await cookies()
  const savedState = cookieStore.get("naver_oauth_state")?.value

  if (!savedState || savedState !== state) {
    console.error("[NAVER] State mismatch:", { saved: savedState?.slice(0, 8), received: state?.slice(0, 8) })
    return NextResponse.redirect(`${siteUrl}/auth/login?error=naver_state_mismatch`)
  }

  // State 쿠키 삭제
  cookieStore.delete("naver_oauth_state")

  try {
    // ── 1. 토큰 교환 ──
    const tokenRes = await fetch("https://nid.naver.com/oauth2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: process.env.NAVER_CLIENT_ID!,
        client_secret: process.env.NAVER_CLIENT_SECRET!,
        code,
        state,
      }),
    })

    const tokenData = await tokenRes.json()

    if (tokenData.error) {
      console.error("[NAVER] Token error:", tokenData.error, tokenData.error_description)
      return NextResponse.redirect(`${siteUrl}/auth/login?error=naver_token_failed`)
    }

    const accessToken = tokenData.access_token

    // ── 2. 프로필 조회 ──
    const profileRes = await fetch("https://openapi.naver.com/v1/nid/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    const profileData: NaverProfile = await profileRes.json()

    if (profileData.resultcode !== "00") {
      console.error("[NAVER] Profile error:", profileData.message)
      return NextResponse.redirect(`${siteUrl}/auth/login?error=naver_profile_failed`)
    }

    const naverUser = profileData.response
    const email = naverUser.email || `naver_${naverUser.id}@naver.archiscan.kr`
    const name = naverUser.name || naverUser.nickname || "네이버 사용자"

    console.log("[NAVER] Profile fetched:", { id: naverUser.id, email, name })

    // ── 3. Supabase Admin으로 유저 생성/로그인 ──
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 기존 유저 확인 (이메일로)
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(
      (u) => u.email === email || u.user_metadata?.naver_id === naverUser.id
    )

    let userId: string

    if (existingUser) {
      // 기존 유저 → 메타데이터 업데이트
      userId = existingUser.id
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...existingUser.user_metadata,
          naver_id: naverUser.id,
          full_name: name,
          avatar_url: naverUser.profile_image,
          provider: "naver",
        },
      })
    } else {
      // 신규 유저 생성
      const tempPassword = `naver_${naverUser.id}_${Date.now()}_${Math.random().toString(36)}`
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true, // 네이버 인증 완료이므로 바로 확인
        user_metadata: {
          naver_id: naverUser.id,
          full_name: name,
          avatar_url: naverUser.profile_image,
          provider: "naver",
        },
      })

      if (createError) {
        console.error("[NAVER] User creation error:", createError.message)
        return NextResponse.redirect(`${siteUrl}/auth/login?error=naver_create_failed`)
      }

      userId = newUser.user!.id

      // profiles 테이블에도 생성
      await supabaseAdmin.from("profiles").upsert({
        id: userId,
        email,
        name,
        avatar_url: naverUser.profile_image,
        provider: "naver",
      })
    }

    // ── 4. Magic Link로 세션 생성 ──
    // generateLink로 세션 토큰을 생성하여 클라이언트에 전달
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    })

    if (linkError || !linkData) {
      console.error("[NAVER] Magic link error:", linkError?.message)
      return NextResponse.redirect(`${siteUrl}/auth/login?error=naver_session_failed`)
    }

    // Magic link의 token_hash와 type을 사용해 세션 교환
    const hashed_token = linkData.properties?.hashed_token
    if (!hashed_token) {
      console.error("[NAVER] No hashed_token in link data")
      return NextResponse.redirect(`${siteUrl}/auth/login?error=naver_token_missing`)
    }

    // Supabase의 verify endpoint로 리다이렉트하여 세션 생성
    const verifyUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/verify?token=${hashed_token}&type=magiclink&redirect_to=${encodeURIComponent(siteUrl + "/auth/callback")}`

    return NextResponse.redirect(verifyUrl)

  } catch (err: any) {
    console.error("[NAVER] Unexpected error:", err.message)
    return NextResponse.redirect(`${siteUrl}/auth/login?error=naver_unknown`)
  }
}
