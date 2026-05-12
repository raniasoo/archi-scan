import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { createHash } from "crypto"

/**
 * 네이버 OAuth 콜백
 * service_role 키 없이 동작: 네이버 ID → 결정론적 비밀번호 → signUp/signIn
 */

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID || "rSgB5a0sDgfvMxzDZtE7"
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET || "foiiOPedy9"
const NAVER_PASSWORD_SALT = "archiscan-naver-bridge-v1-$2026$"

function makeNaverPassword(naverId: string): string {
  return createHash("sha256").update(`${NAVER_PASSWORD_SALT}:${naverId}`).digest("hex")
}

interface NaverProfile {
  resultcode: string
  message: string
  response: {
    id: string
    email?: string
    name?: string
    nickname?: string
    profile_image?: string
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.archiscan.kr"

  if (error || !code || !state) {
    return NextResponse.redirect(`${siteUrl}/auth/login?error=naver_denied`)
  }

  // CSRF 검증
  const cookieStore = await cookies()
  const savedState = cookieStore.get("naver_oauth_state")?.value
  if (!savedState || savedState !== state) {
    return NextResponse.redirect(`${siteUrl}/auth/login?error=naver_state_mismatch`)
  }
  cookieStore.delete("naver_oauth_state")

  try {
    // ── 1. 토큰 교환 ──
    const tokenRes = await fetch("https://nid.naver.com/oauth2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: NAVER_CLIENT_ID,
        client_secret: NAVER_CLIENT_SECRET,
        code,
        state,
      }),
    })
    const tokenData = await tokenRes.json()
    if (tokenData.error) {
      console.error("[NAVER] Token error:", tokenData.error)
      return NextResponse.redirect(`${siteUrl}/auth/login?error=naver_token_failed`)
    }

    // ── 2. 프로필 조회 ──
    const profileRes = await fetch("https://openapi.naver.com/v1/nid/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const profileData: NaverProfile = await profileRes.json()
    if (profileData.resultcode !== "00") {
      console.error("[NAVER] Profile error:", profileData.message)
      return NextResponse.redirect(`${siteUrl}/auth/login?error=naver_profile_failed`)
    }

    const naver = profileData.response
    const email = naver.email || `naver_${naver.id}@naver.archiscan.kr`
    const password = makeNaverPassword(naver.id)
    const name = naver.name || naver.nickname || "네이버 사용자"

    console.log("[NAVER] Login:", { id: naver.id, email, name })

    // ── 3. Supabase 세션 생성 (쿠키 기반) ──
    let supabaseResponse = NextResponse.redirect(`${siteUrl}/`)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              supabaseResponse.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    // 먼저 로그인 시도
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      // 로그인 실패 → 회원가입 시도
      console.log("[NAVER] SignIn failed, trying signUp:", signInError.message)

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            avatar_url: naver.profile_image,
            provider: "naver",
            naver_id: naver.id,
          },
        },
      })

      if (signUpError) {
        console.error("[NAVER] SignUp error:", signUpError.message)
        return NextResponse.redirect(`${siteUrl}/auth/login?error=naver_create_failed`)
      }

      // 가입 후 자동 로그인 (email confirm 비활성화 시 바로 세션 생성됨)
      // confirm이 필요한 경우 다시 signIn
      const { error: retryError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (retryError) {
        console.log("[NAVER] Post-signup signIn failed:", retryError.message)
        // 이메일 확인이 필요한 경우 → 사용자에게 안내
        return NextResponse.redirect(`${siteUrl}/auth/login?error=naver_confirm_needed`)
      }
    }

    console.log("[NAVER] Session created, redirecting to app")
    return supabaseResponse

  } catch (err: any) {
    console.error("[NAVER] Unexpected error:", err.message)
    return NextResponse.redirect(`${siteUrl}/auth/login?error=naver_unknown`)
  }
}
