import { NextResponse } from 'next/server'
import { sendWelcomeEmail } from '@/lib/email'

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
