import type { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"

export const authOptions: NextAuthOptions = {
  providers: [
    // 카카오 로그인
    {
      id: "kakao",
      name: "Kakao",
      type: "oauth",
      clientId: process.env.KAKAO_CLIENT_ID!,
      clientSecret: process.env.KAKAO_CLIENT_SECRET!,
      authorization: {
        url: "https://kauth.kakao.com/oauth/authorize",
        params: { scope: "" },
      },
      token: "https://kauth.kakao.com/oauth/token",
      userinfo: "https://kapi.kakao.com/v2/user/me",
      profile(profile) {
        return {
          id: String(profile.id),
          name: profile.kakao_account?.profile?.nickname || profile.properties?.nickname || "사용자",
          image: profile.kakao_account?.profile?.profile_image_url || profile.properties?.profile_image || null,
          email: profile.kakao_account?.email || null,
        }
      },
    },
    // 네이버 로그인
    ...(process.env.NAVER_CLIENT_ID ? [{
      id: "naver",
      name: "Naver",
      type: "oauth" as const,
      clientId: process.env.NAVER_CLIENT_ID!,
      clientSecret: process.env.NAVER_CLIENT_SECRET!,
      authorization: {
        url: "https://nid.naver.com/oauth2.0/authorize",
        params: { response_type: "code" },
      },
      token: "https://nid.naver.com/oauth2.0/token",
      userinfo: "https://openapi.naver.com/v1/nid/me",
      profile(profile: any) {
        return {
          id: profile.response.id,
          name: profile.response.nickname || profile.response.name || "사용자",
          email: profile.response.email || null,
          image: profile.response.profile_image || null,
        }
      },
    }] : []),
    // 구글 로그인
    ...(process.env.GOOGLE_CLIENT_ID ? [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      })
    ] : []),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token
        token.provider = account.provider
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub
        (session.user as any).provider = token.provider
      }
      return session
    },
  },
}
