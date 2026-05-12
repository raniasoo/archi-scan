import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 토스페이먼츠 키 (테스트 키 → 라이브 전환 시 교체)
const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY || 'test_sk_zXLkKEypNArWmo50nX3lmeaxYG5R'
const TOSS_CLIENT_KEY = process.env.TOSS_CLIENT_KEY || 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq'

const PRO_PRICE = 29000

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    // ── 결제 준비: 클라이언트 키 + 주문번호 반환 ──
    if (action === 'prepare') {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      const orderId = `ARCHI-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const customerName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Archi-Scan 사용자'
      const customerEmail = user?.email || ''

      return NextResponse.json({
        clientKey: TOSS_CLIENT_KEY,
        orderId,
        amount: PRO_PRICE,
        orderName: 'Archi-Scan Pro 플랜 (월간)',
        customerName,
        customerEmail,
      })
    }

    // ── 결제 승인 ──
    if (action === 'confirm') {
      const { paymentKey, orderId, amount } = body

      if (!paymentKey || !orderId || !amount) {
        return NextResponse.json({ error: '필수 파라미터가 누락되었습니다' }, { status: 400 })
      }

      if (Number(amount) !== PRO_PRICE) {
        return NextResponse.json({ error: '결제 금액이 올바르지 않습니다' }, { status: 400 })
      }

      // 토스페이먼츠 결제 승인 API
      const tossRes = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(TOSS_SECRET_KEY + ':').toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }),
      })

      const tossData = await tossRes.json()

      if (!tossRes.ok) {
        console.error('[PAYMENT] Toss confirm failed:', tossData)
        return NextResponse.json({ 
          success: false, 
          error: tossData.message || '결제 승인에 실패했습니다' 
        }, { status: 400 })
      }

      // 결제 성공 → Supabase 프로필 Pro 업그레이드
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        
        await supabase.from('profiles').upsert({
          id: user.id,
          plan: 'pro',
          plan_expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        })

        // 결제 로그
        await supabase.from('usage_logs').insert({
          user_id: user.id,
          action: 'payment',
          metadata: {
            paymentKey: tossData.paymentKey,
            orderId: tossData.orderId,
            amount: tossData.totalAmount,
            method: tossData.method,
            approvedAt: tossData.approvedAt,
          },
        })
      }

      return NextResponse.json({
        success: true,
        plan: 'pro',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        paymentKey: tossData.paymentKey,
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('[PAYMENT] Error:', error.message)
    return NextResponse.json({ error: '결제 처리 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    clientKey: TOSS_CLIENT_KEY,
    plans: { pro: { price: PRO_PRICE, currency: 'KRW', interval: 'monthly' } },
  })
}
