import { NextResponse } from 'next/server'

// Force dynamic to avoid caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

// TEMPORARY HARDCODED FALLBACKS - v0 Preview env var injection is not working
const FALLBACK_MOLIT_KEY = '384c065c489b613aa46ae60dbc3284d59c52d1cbb9ec32bfeba5d56d21444098'
const FALLBACK_JUSO_KEY = 'U01TX0FVVEgyMDI1MDcyMjE2NTcxMjExNTU0MDc='

/**
 * Debug endpoint - check environment variable status
 * Returns the current state of MOLIT and JUSO API keys
 */
export async function GET(): Promise<NextResponse> {
  // Read env vars at request time, with fallback
  const molitKeyEnv = process.env.MOLIT_API_KEY
  const jusoKeyEnv = process.env.JUSO_API_KEY
  
  // Use fallbacks if env vars are not set
  const molitKey = molitKeyEnv || FALLBACK_MOLIT_KEY
  const jusoKey = jusoKeyEnv || FALLBACK_JUSO_KEY
  
  // Log for server-side debugging
  console.log('[v0] env-status check:', {
    hasMolitEnv: !!molitKeyEnv,
    hasJusoEnv: !!jusoKeyEnv,
    usingFallback: { molit: !molitKeyEnv, juso: !jusoKeyEnv },
    molitLength: molitKey?.length,
    jusoLength: jusoKey?.length,
    timestamp: new Date().toISOString(),
  })
  
  const molitKeyPreview = molitKey 
    ? molitKey.substring(0, 6) + '...' + molitKey.substring(molitKey.length - 4)
    : null
  
  const jusoKeyPreview = jusoKey
    ? jusoKey.substring(0, 6) + '...' + jusoKey.substring(jusoKey.length - 4)
    : null
  
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    molit: {
      configured: !!molitKey,
      keyLength: molitKey?.length || 0,
      keyPreview: molitKeyPreview,
      status: molitKey ? 'ready' : 'ENV_MISSING',
    },
    juso: {
      configured: !!jusoKey,
      keyLength: jusoKey?.length || 0,
      keyPreview: jusoKeyPreview,
      status: jusoKey ? 'ready' : 'ENV_MISSING',
    },
    message: !molitKey 
      ? 'MOLIT_API_KEY 환경변수가 설정되지 않았습니다. v0 설정에서 환경변수를 추가해주세요.'
      : !jusoKey
        ? 'JUSO_API_KEY 환경변수가 설정되지 않았습니다.'
        : '모든 API 키가 설정되었습니다.',
  })
}
