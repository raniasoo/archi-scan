import { NextRequest, NextResponse } from 'next/server'

// 토스페이먼츠 테스트 키 (가맹점 등록 후 실제 키로 교체)
const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY || 'test_sk_demo'
const TOSS_CLIENT_KEY = process.env.TOSS_CLIENT_KEY || 'test_ck_demo'
const IS_TEST_MODE = !process.env.TOSS_SECRET_KEY

export async function POST(req: NextRequest) {
  try {
    const { action, orderId, amount, paymentKey } = await req.json()

    if (action === 'prepare') {
      // 결제 준비: 클라이언트 키 반환
      const orderIdGenerated = `ARCHI-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      return NextResponse.json({
        clientKey: TOSS_CLIENT_KEY,
        orderId: orderIdGenerated,
        amount: 29900,
        orderName: 'Archi-Scan 프로 플랜 (월간)',
        customerName: 'Archi-Scan 사용자',
        isTestMode: IS_TEST_MODE,
      })
    }

    if (action === 'confirm') {
      // 결제 승인
      if (IS_TEST_MODE) {
        // 테스트 모드: 바로 성공 처리
        return NextResponse.json({
          success: true,
          isTestMode: true,
          message: '테스트 모드 결제 성공',
          plan: 'pro',
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
      }

      // 실제 결제 승인 (토스페이먼츠 API)
      const response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(TOSS_SECRET_KEY + ':').toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentKey, orderId, amount }),
      })

      const data = await response.json()

      if (response.ok) {
        return NextResponse.json({
          success: true,
          isTestMode: false,
          plan: 'pro',
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          transactionId: data.paymentKey,
        })
      } else {
        return NextResponse.json({ success: false, error: data.message }, { status: 400 })
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('[Payment] Error:', error)
    return NextResponse.json({ error: '결제 처리 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    isTestMode: IS_TEST_MODE,
    plans: {
      pro: { price: 29900, currency: 'KRW', interval: 'monthly' },
    },
  })
}
