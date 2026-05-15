import { createClient } from '@supabase/supabase-js'

/**
 * Supabase Admin Client (Service Role)
 * 서버 사이드에서만 사용 — 회원 탈퇴, 관리자 기능 등
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured')
  }
  
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}
