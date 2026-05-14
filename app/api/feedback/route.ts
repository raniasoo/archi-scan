import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { rating, category, message, page } = await req.json()
    
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: '평점을 선택해주세요' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('feedback').insert({
      user_id: user?.id || null,
      rating,
      category: category || 'general',
      message: message || '',
      page: page || '/',
    })

    if (error) {
      console.error('[FEEDBACK]', error)
      return NextResponse.json({ error: '피드백 저장 실패' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '처리 실패' }, { status: 500 })
  }
}
