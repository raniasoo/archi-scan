import { NextRequest, NextResponse } from 'next/server'

// Force dynamic to always check env vars at request time
export const dynamic = 'force-dynamic'
export const revalidate = 0

// ACTUAL KEY - juso.go.kr에서 발급받은 실제 dev 키 (44자)
const FALLBACK_JUSO_KEY = 'U01TX0FVVEgyMDI2MDUwNDIyMDk0NzExODA5OTM='

/**
 * JUSO Single Debug Endpoint
 * Tests JUSO API with detailed debugging info
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const keyword = searchParams.get('keyword') || '세종로 1'
  
  // Get host info from request
  const requestUrlObj = new URL(request.url)
  const currentHost = requestUrlObj.host
  const currentOrigin = requestUrlObj.origin
  const registeredHost = 't-generator.vercel.app'
  const isHostMatch = currentHost === registeredHost || currentHost.includes('t-generator')
  
  // Host debugging info
  const hostDebug = {
    currentHost,
    currentOrigin,
    registeredHost,
    isHostMatch,
    hostMismatchWarning: !isHostMatch 
      ? `WARNING: 현재 호스트(${currentHost})가 JUSO 등록 URL(${registeredHost})과 다릅니다. JUSO API는 등록된 URL에서만 작동할 수 있습니다.`
      : null,
    vercelEnv: process.env.VERCEL_ENV || 'unknown',
    vercelUrl: process.env.VERCEL_URL || 'unknown',
  }
  
  // FORCE hardcoded key - env var has OLD 40-char key, need NEW 43-char key
  const jusoKeyFromEnvRaw = process.env.JUSO_API_KEY
  const jusoKeyFromEnv = FALLBACK_JUSO_KEY // FORCE hardcoded, ignore env
  const molitKeyFromEnv = process.env.MOLIT_API_KEY
  
  // Check which env file might be providing the value
  const envDebug = {
    jusoKeyFromProcessEnv: !!jusoKeyFromEnvRaw,
    usingFallback: !jusoKeyFromEnvRaw,
    jusoKeyLength: jusoKeyFromEnv.length,
    jusoKeyPreview: jusoKeyFromEnv.substring(0, 6) + '...' + jusoKeyFromEnv.substring(jusoKeyFromEnv.length - 4),
    jusoKeyFull: jusoKeyFromEnv, // TEMPORARY: Show full key for debugging
    molitKeyExists: !!molitKeyFromEnv,
    // Check if the key looks like the old dev key
    isOldDevKey: jusoKeyFromEnv.startsWith('devU01TX'),
    isNewKey: jusoKeyFromEnv.startsWith('U01TX0') && !jusoKeyFromEnv.startsWith('devU01TX'),
    keyEndsWithEquals: jusoKeyFromEnv.endsWith('='),
  }
  
  // Build request URL - MUST use confmKey parameter
  // CRITICAL: Do NOT use URLSearchParams for confmKey!
  // URLSearchParams encodes '=' to '%3D', which JUSO API rejects.
  const baseUrl = 'https://business.juso.go.kr/addrlink/addrLinkApi.do'
  const encodedKeyword = encodeURIComponent(keyword)
  
  // confmKey is NOT encoded - use as-is (contains '=' at end)
  const jusoRequestUrl = `${baseUrl}?confmKey=${jusoKeyFromEnv}&keyword=${encodedKeyword}&resultType=json&countPerPage=5&currentPage=1`
  
  // Create masked URL for display
  const maskedKey = jusoKeyFromEnv.substring(0, 6) + '...' + jusoKeyFromEnv.substring(jusoKeyFromEnv.length - 4)
  const displayUrl = `${baseUrl}?confmKey=${maskedKey}&keyword=${encodedKeyword}&resultType=json&countPerPage=5&currentPage=1`
  
  const debugInfo = {
    timestamp: new Date().toISOString(),
    hostDebug,
    envDebug,
    request: {
      baseUrl,
      paramName: 'confmKey', // MUST be confmKey for juso.go.kr
      keyPreview: maskedKey,
      keyLength: jusoKeyFromEnv.length,
      keyword,
      encodedKeyword,
      fullUrlPreview: displayUrl,
      // TEMPORARY: Show actual URL for debugging (includes full key)
      actualRequestUrl: jusoRequestUrl,
      urlBreakdown: {
        protocol: 'https',
        host: 'business.juso.go.kr',
        path: '/addrlink/addrLinkApi.do',
        params: {
          confmKey: `${jusoKeyFromEnv} (length: ${jusoKeyFromEnv.length})`,
          keyword: encodedKeyword,
          resultType: 'json',
          countPerPage: '5',
          currentPage: '1',
        }
      }
    },
    response: {} as Record<string, unknown>,
  }
  
  try {
    console.log('[JUSO Debug] Calling:', displayUrl)
    
    const response = await fetch(jusoRequestUrl)
    const responseText = await response.text()
    
    debugInfo.response = {
      httpStatus: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      rawBodyPreview: responseText.substring(0, 2000),
      rawBodyLength: responseText.length,
    }
    
    // Try to parse JSON
    try {
      const json = JSON.parse(responseText)
      const results = json.results
      
      debugInfo.response = {
        ...debugInfo.response,
        parsed: true,
        common: results?.common,
        errorCode: results?.common?.errorCode,
        errorMessage: results?.common?.errorMessage,
        totalCount: results?.common?.totalCount,
        jusoCount: results?.juso?.length || 0,
      }
      
      // Check for specific error codes
      if (results?.common?.errorCode === 'E0001') {
        // Production에서도 오류 발생 시 - 키 자체 문제
        const isProduction = isHostMatch
        
        const causes = isProduction ? [
          '1. [가장 유력] JUSO 승인키가 아직 활성화되지 않음 - juso.go.kr에서 승인 상태 확인 필요',
          '2. 하드코딩된 키 값이 실제 발급 키와 다름 - 아래 keyPreview와 실제 승인키 비교 필요',
          '3. JUSO 신청서의 도메인/URL 설정 오류',
          '4. 키가 만료되었거나 비활성화됨',
        ] : [
          '1. HOST MISMATCH: v0 preview에서 테스트 중 - Production에서 테스트 필요',
          '2. 키 값 자체 불일치 가능성',
        ]
        
        debugInfo.response = {
          ...debugInfo.response,
          diagnosis: isProduction 
            ? 'KEY_VALUE_OR_APPROVAL_ERROR - Production에서도 거절됨. 키 값 불일치 또는 JUSO 승인 설정 문제'
            : 'HOST_MISMATCH - Preview 환경에서 테스트 중',
          isProduction,
          hostMismatch: !isHostMatch,
          possibleCauses: causes,
          keyVerification: {
            message: '아래 keyPreview를 juso.go.kr 발급 키와 비교하세요',
            hardcodedKeyPreview: maskedKey,
            hardcodedKeyLength: jusoKeyFromEnv.length,
            hardcodedKeyFull: jusoKeyFromEnv,
            expectedFormat: 'U01TX0FVVEg + 날짜시간 + = (총 43자)',
          },
          recommendation: isProduction
            ? '1. juso.go.kr에서 실제 발급된 키 확인, 2. 하드코딩된 키와 비교, 3. 승인 상태 확인'
            : `Production URL(https://${registeredHost})에서 테스트하세요.`,
        }
      }
      
    } catch {
      debugInfo.response = {
        ...debugInfo.response,
        parsed: false,
        parseError: 'Response is not valid JSON',
      }
    }
    
    return NextResponse.json({
      success: true,
      debugInfo,
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      debugInfo,
    })
  }
}
