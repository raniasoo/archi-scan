import { NextResponse } from 'next/server'
import { sendWelcomeEmail } from '@/lib/email'

// GET: RESEND_API_KEY 설정 여부 확인 (테스트용)
export async function GET() {
  const hasKey = !!process.env.RESEND_API_KEY
  const keyPrefix = process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.slice(0, 6) + '...' : 'NOT SET'
  return NextResponse.json({ 
    resendKeySet: hasKey, 
    keyPrefix,
    status: hasKey ? '✅ RESEND_API_KEY 설정됨' : '❌ RESEND_API_KEY 미설정 — Vercel 환경변수에 추가 필요'
  })
}

export async function POST(request: Request) {
  try {
    const { email, userName } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'email required' }, { status: 400 })
    }

    // 중복 발송 방지: 쿠키/헤더 체크는 클라이언트에서 처리
    const result = await sendWelcomeEmail({ to: email, userName })

    if (result.success) {
      return NextResponse.json({ success: true, id: result.id })
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }
  } catch (error) {
    console.error('[WELCOME-EMAIL] API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'unknown error' },
      { status: 500 }
    )
  }
}
