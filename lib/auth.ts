import type { NextAuthOptions } from "next-auth"
import KakaoProvider from "next-auth/providers/kakao"

export const authOptions: NextAuthOptions = {
  debug: true,
  providers: [
    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID!,
      clientSecret: process.env.KAKAO_CLIENT_SECRET!,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  logger: {
    error(code, metadata) {
      console.error("[NEXTAUTH_FULL_ERROR]", JSON.stringify({ code, error: String((metadata as any)?.error), message: (metadata as any)?.error?.message, stack: (metadata as any)?.error?.stack?.substring(0, 500) }))
    },
  },
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
