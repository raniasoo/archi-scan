import { NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { cookies } from "next/headers"

/**
 * 네이버 OAuth 시작
 * 1. state 생성 → 쿠키에 저장 (CSRF 방지)
 * 2. 네이버 인증 URL로 리다이렉트
 */
export async function GET() {
  const clientId = process.env.NAVER_CLIENT_ID
  if (!clientId) {
    return NextResponse.json(
      { error: "NAVER_CLIENT_ID 환경변수가 설정되지 않았습니다" },
      { status: 500 }
    )
  }

  // CSRF 방지용 state 토큰
  const state = randomBytes(32).toString("hex")

  // 쿠키에 state 저장 (callback에서 검증)
  const cookieStore = await cookies()
  cookieStore.set("naver_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10분
    path: "/",
  })

  const callbackUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.archiscan.kr"}/api/auth/naver/callback`

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: callbackUrl,
    state,
  })

  const naverAuthUrl = `https://nid.naver.com/oauth2.0/authorize?${params.toString()}`

  return NextResponse.redirect(naverAuthUrl)
}
