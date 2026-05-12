import { NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { cookies } from "next/headers"

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID || "rSgB5a0sDgfvMxzDZtE7"

export async function GET() {
  const state = randomBytes(32).toString("hex")

  const cookieStore = await cookies()
  cookieStore.set("naver_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  })

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.archiscan.kr"
  const callbackUrl = `${siteUrl}/api/auth/naver/callback`

  const params = new URLSearchParams({
    response_type: "code",
    client_id: NAVER_CLIENT_ID,
    redirect_uri: callbackUrl,
    state,
  })

  return NextResponse.redirect(`https://nid.naver.com/oauth2.0/authorize?${params.toString()}`)
}
