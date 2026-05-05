import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error_param = searchParams.get('error')
  const error_description = searchParams.get('error_description')
  const next = searchParams.get('next') ?? '/'

  console.log('[auth/callback]', { code: code ? 'present' : 'missing', error_param, error_description, origin })

  if (error_param) {
    console.error('[auth/callback] OAuth error:', error_param, error_description)
    return NextResponse.redirect(`${origin}/?auth_error=${error_param}`)
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      console.log('[auth/callback] Session created successfully')
      return NextResponse.redirect(`${origin}${next}`)
    }
    console.error('[auth/callback] Exchange failed:', error.message)
  }

  return NextResponse.redirect(`${origin}/?auth_error=true`)
}
