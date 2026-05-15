/**
 * 회원 탈퇴 API
 * POST /api/auth/delete-account
 * 
 * 1. JWT 토큰으로 사용자 인증 확인
 * 2. 사용자의 모든 데이터 삭제 (projects, shared_snapshots, profiles, usage_logs, feedback)
 * 3. Supabase Auth 계정 삭제
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    // 1. 사용자 인증 확인
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 })
    }

    // 2. 확인 문구 검증
    const body = await req.json()
    if (body.confirmation !== '회원탈퇴') {
      return NextResponse.json({ error: '확인 문구가 일치하지 않습니다.' }, { status: 400 })
    }

    const userId = user.id
    console.log(`[DELETE-ACCOUNT] 회원 탈퇴 시작: ${userId} (${user.email})`)

    // 3. Admin 클라이언트로 데이터 삭제
    let adminClient
    try {
      adminClient = createAdminClient()
    } catch (e) {
      console.error('[DELETE-ACCOUNT] Admin client error:', e)
      return NextResponse.json({ 
        error: 'SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다. 관리자에게 문의하세요.' 
      }, { status: 500 })
    }

    const deletionLog: string[] = []

    // 사용자 데이터 삭제 (순서 중요: 참조 관계 고려)
    const tables = [
      { name: 'shared_snapshots', column: 'user_id' },
      { name: 'usage_logs', column: 'id' },
      { name: 'feedback', column: 'user_id' },
      { name: 'projects', column: 'user_id' },
      { name: 'reports', column: 'user_id' },
      { name: 'subscriptions', column: 'user_id' },
      { name: 'profiles', column: 'id' },
    ]

    for (const table of tables) {
      try {
        const { error, count } = await adminClient
          .from(table.name)
          .delete({ count: 'exact' })
          .eq(table.column, userId)
        
        if (error) {
          // 테이블이 없거나 컬럼이 없는 경우 무시 (아직 생성 안 된 테이블)
          console.warn(`[DELETE-ACCOUNT] ${table.name} 삭제 실패 (무시): ${error.message}`)
          deletionLog.push(`${table.name}: skip (${error.code})`)
        } else {
          deletionLog.push(`${table.name}: ${count || 0}건 삭제`)
        }
      } catch (e) {
        console.warn(`[DELETE-ACCOUNT] ${table.name} 예외 (무시):`, e)
        deletionLog.push(`${table.name}: error`)
      }
    }

    // 4. Supabase Auth 계정 삭제
    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(userId)
    
    if (deleteUserError) {
      console.error(`[DELETE-ACCOUNT] Auth 삭제 실패: ${deleteUserError.message}`)
      return NextResponse.json({ 
        error: `계정 삭제 중 오류: ${deleteUserError.message}`,
        deletionLog,
      }, { status: 500 })
    }

    deletionLog.push('auth: 계정 삭제 완료')
    console.log(`[DELETE-ACCOUNT] ✅ 완료: ${userId}`, deletionLog)

    return NextResponse.json({ 
      success: true, 
      message: '회원 탈퇴가 완료되었습니다. 이용해주셔서 감사합니다.',
      deletionLog,
    })

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[DELETE-ACCOUNT] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
