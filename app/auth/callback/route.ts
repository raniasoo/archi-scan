import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error_param = searchParams.get('error')
  const error_description = searchParams.get('error_description')
  const next = searchParams.get('next') ?? '/'

  if (error_param) {
    console.error('[auth/callback] OAuth error:', error_param, error_description)
    return NextResponse.redirect(`${origin}/?auth_error=${error_param}`)
  }

  if (code) {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('[auth/callback] EXCHANGE_ERROR:', error.message, error.status)
        return NextResponse.redirect(`${origin}/?auth_error=exchange_failed`)
      }

      console.log('[auth/callback] SUCCESS user:', data.user?.email || data.user?.id)
      return NextResponse.redirect(`${origin}${next}`)
    } catch (e: any) {
      console.error('[auth/callback] CATCH_ERROR:', e?.message || String(e))
      return NextResponse.redirect(`${origin}/?auth_error=exception`)
    }
  }

  console.error('[auth/callback] NO_CODE')
  return NextResponse.redirect(`${origin}/?auth_error=no_code`)
}
