import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"

// www.archiscan.kr로 통일 (archiscan.kr → www 리다이렉트 환경)
process.env.NEXTAUTH_URL = "https://www.archiscan.kr"

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
