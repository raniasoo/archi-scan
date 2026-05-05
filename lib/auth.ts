import type { NextAuthOptions } from "next-auth"

const SITE_URL = process.env.NEXTAUTH_URL || "https://archiscan.kr"

export const authOptions: NextAuthOptions = {
  providers: [
    {
      id: "kakao",
      name: "Kakao",
      type: "oauth",
      clientId: process.env.KAKAO_CLIENT_ID!,
      clientSecret: process.env.KAKAO_CLIENT_SECRET!,
      authorization: {
        url: "https://kauth.kakao.com/oauth/authorize",
        params: {
          scope: "profile_nickname profile_image",
          redirect_uri: `${SITE_URL}/api/auth/callback/kakao`,
        },
      },
      token: {
        url: "https://kauth.kakao.com/oauth/token",
        params: {
          redirect_uri: `${SITE_URL}/api/auth/callback/kakao`,
        },
      },
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
