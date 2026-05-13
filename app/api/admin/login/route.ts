import { NextRequest, NextResponse } from "next/server"
import { createHash, randomBytes } from "crypto"

// ━━━ 관리자 인증 (환경변수 또는 기본값) ━━━
const ADMIN_ID = process.env.ADMIN_ID || "admin"
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "7777"

// 토큰 생성 (HMAC 기반)
function generateToken(): string {
  const payload = `admin:${Date.now()}:${randomBytes(16).toString("hex")}`
  const secret = process.env.ADMIN_SECRET || "archiscan-admin-secret-key"
  const hash = createHash("sha256").update(payload + secret).digest("hex")
  // base64 인코딩: payload.hash
  return Buffer.from(`${payload}.${hash}`).toString("base64")
}

// 토큰 검증
export function verifyAdminToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8")
    const lastDot = decoded.lastIndexOf(".")
    if (lastDot === -1) return false
    
    const payload = decoded.slice(0, lastDot)
    const hash = decoded.slice(lastDot + 1)
    
    const secret = process.env.ADMIN_SECRET || "archiscan-admin-secret-key"
    const expectedHash = createHash("sha256").update(payload + secret).digest("hex")
    
    if (hash !== expectedHash) return false
    
    // 토큰 유효기간: 24시간
    const parts = payload.split(":")
    const timestamp = parseInt(parts[1] || "0")
    const age = Date.now() - timestamp
    if (age > 24 * 60 * 60 * 1000) return false
    
    return true
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  try {
    const { id, password } = await req.json()
    
    if (id === ADMIN_ID && password === ADMIN_PASSWORD) {
      const token = generateToken()
      return NextResponse.json({ success: true, token })
    }
    
    return NextResponse.json({ success: false, error: "ID 또는 비밀번호가 잘못되었습니다" }, { status: 401 })
  } catch {
    return NextResponse.json({ success: false, error: "요청 처리 실패" }, { status: 500 })
  }
}
