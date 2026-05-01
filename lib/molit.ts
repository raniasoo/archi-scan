/**
 * MOLIT (국토교통부) API Client
 * @version Phase 3.1 - CACHE INVALIDATION v205 - FORCED 43-char JUSO KEY
 * 
 * Server-side only - API key is never exposed to client
 * 
 * Supported APIs:
 * - 주소 검색 API (Juso.go.kr) - Road address to parcel resolution
 * - 건축물대장 기본개요 조회
 * - 토지대장 조회 (future)
 * 
 * Lookup Strategy (Phase 3):
 * 1. Address Resolution: Convert road address to legal-dong + parcel (번/지)
 * 2. Primary: Lookup with resolved parcel data
 * 3. Fallback: Try common bjdong codes for the district
 * 4. Broadened: Search with bun/ji = 0000 to find any building
 * 
 * Environment Variables Required:
 * - MOLIT_API_KEY: 공공데이터포털 서비스키 (data.go.kr)
 * - JUSO_API_KEY: 주소기반산업지원서비스 API키 (juso.go.kr) - Optional, uses MOLIT_API_KEY if not set
 */

import type {
  MolitApiResponse,
  MolitBuildingBasicItem,
  MolitLandItem,
  MolitAddressItem,
  MolitSiteData,
  MolitLookupResponse,
} from '@/types/molit'
import { parseAddress, normalizeAddress, normalizeSido } from './address-parser'

// ============================================
// Configuration
// ============================================

const MOLIT_API_BASE = 'https://apis.data.go.kr/1613000'
const JUSO_API_BASE = 'https://business.juso.go.kr/addrlink'

// API Endpoints
const ENDPOINTS = {
  // MOLIT Building Register (data.go.kr) - Current ledger (HubService)
  buildingBasic: '/BldRgstHubService/getBrBasisOulnInfo',           // 건축물대장 기본개요
  buildingTitle: '/BldRgstHubService/getBrTitleInfo',               // 건축물대장 표제부
  buildingRecapTitle: '/BldRgstHubService/getBrRecapTitleInfo',     // 건축물대장 총괄표제부
  buildingFloor: '/BldRgstHubService/getBrFlrOulnInfo',             // 건축물대장 층별개요
  buildingExpos: '/BldRgstHubService/getBrExposPubuseAreaInfo',     // 건축물대장 전유공용면적 (전유부)
  buildingJijuk: '/BldRgstHubService/getBrJijiguInfo',              // 건축물대장 지역지구구역
  buildingAtchJibun: '/BldRgstHubService/getBrAtchJibunInfo',       // 건축물대장 부속지번 (supplementary parcel)
  
  // MOLIT Building Register - Closed/Removed ledger (폐쇄/말소)
  closedBasic: '/BldRgstHubService/getBrExitBasisOulnInfo',         // 폐쇄 기본개요
  closedTitle: '/BldRgstHubService/getBrExitTitleInfo',             // 폐쇄 표제부
  closedRecapTitle: '/BldRgstHubService/getBrExitRecapTitleInfo',   // 폐쇄 총괄표제부
  
  // Land
  land: '/lndPrclServiceV1/getLndPrclByPNU',
  // Juso (juso.go.kr) - Address resolution
  jusoSearch: '/addrLinkApiJsonp.do',
}

// MOLIT endpoints to try in sequence - Current ledger first
const MOLIT_BUILDING_ENDPOINTS_CURRENT = [
  { key: 'buildingBasic', name: '기본개요', endpoint: ENDPOINTS.buildingBasic, family: 'current' },
  { key: 'buildingTitle', name: '표제부', endpoint: ENDPOINTS.buildingTitle, family: 'current' },
  { key: 'buildingRecapTitle', name: '총괄표제부', endpoint: ENDPOINTS.buildingRecapTitle, family: 'current' },
  { key: 'buildingFloor', name: '층별개요', endpoint: ENDPOINTS.buildingFloor, family: 'current' },
  { key: 'buildingExpos', name: '전유부', endpoint: ENDPOINTS.buildingExpos, family: 'current' },
]

// Closed/Removed ledger endpoints
const MOLIT_BUILDING_ENDPOINTS_CLOSED = [
  { key: 'closedBasic', name: '폐쇄-기본개요', endpoint: ENDPOINTS.closedBasic, family: 'closed' },
  { key: 'closedTitle', name: '폐쇄-표제부', endpoint: ENDPOINTS.closedTitle, family: 'closed' },
  { key: 'closedRecapTitle', name: '폐쇄-총괄표제부', endpoint: ENDPOINTS.closedRecapTitle, family: 'closed' },
]

// Supplementary parcel lookup endpoint
const MOLIT_ATCH_JIBUN_ENDPOINT = { 
  key: 'buildingAtchJibun', 
  name: '부속지번', 
  endpoint: ENDPOINTS.buildingAtchJibun, 
  family: 'supplementary' 
}

// ============================================
// API Key Management
// ============================================

// HARDCODED KEYS - Using actual issued keys
// MOLIT key: 64 chars from data.go.kr  
// JUSO key: 44 chars from juso.go.kr (dev key with 'dev' prefix)
const HARDCODED_MOLIT_KEY = '384c065c489b613aa46ae60dbc3284d59c52d1cbb9ec32bfeba5d56d21444098'
const HARDCODED_JUSO_KEY = 'devU01TX0FVVEgyMDI2MDQyMjIwMDgxNjExNzk4MjA='

function getApiKey(): string {
  // HARDCODED_MOLIT_KEY 고정 사용 (Vercel 환경변수 값과 무관하게 정상 작동 보장)
  return HARDCODED_MOLIT_KEY
}

function getJusoApiKey(): string {
  const envKey = process.env.JUSO_API_KEY
  // ENV 키가 있으면 무조건 사용 (juso-suggest와 동일한 로직)
  if (envKey && envKey.length > 5) {
    console.log(`[JUSO] getJusoApiKey: source=ENV, len=${envKey.length}`)
    return envKey
  }
  // ENV 미설정 시 하드코딩 키 fallback
  console.log(`[JUSO] getJusoApiKey: source=HARDCODED (ENV not set), len=${HARDCODED_JUSO_KEY.length}`)
  return HARDCODED_JUSO_KEY
}

// ============================================
// API Fetch Helpers
// ============================================

interface FetchOptions {
  endpoint: string
  params: Record<string, string | number>
  timeout?: number
}

interface FetchMolitResult<T> {
  data: T | null
  meta: {
    requestUrl: string
    httpStatus: number
    statusText?: string
    rawResponsePreview: string
    responseHeaders?: string
    parseError?: string
    upstreamError?: boolean
  }
}

async function fetchMolitApi<T>(options: FetchOptions): Promise<FetchMolitResult<T>> {
  const { endpoint, params, timeout = 10000 } = options
  const apiKey = getApiKey()
  
  const meta: FetchMolitResult<T>['meta'] = {
    requestUrl: '',
    httpStatus: 0,
    rawResponsePreview: '',
  }
  
  if (!apiKey) {
    console.error('[MOLIT] API key not available')
    meta.rawResponsePreview = 'ERROR: API key not configured'
    return { data: null, meta }
  }
  
  // 프록시 route와 동일한 방식으로 URL 직접 구성 (URLSearchParams 미사용)
  const sigunguCd = params.sigunguCd || ''
  const bjdongCd = params.bjdongCd || ''
  const bun = params.bun || '0000'
  const ji = params.ji || '0000'
  const platGbCd = params.platGbCd || ''
  const platGbPart = platGbCd ? `&platGbCd=${platGbCd}` : ''
  
  const finalUrl = `${MOLIT_API_BASE}${endpoint}?serviceKey=${apiKey}&sigunguCd=${sigunguCd}&bjdongCd=${bjdongCd}${platGbPart}&bun=${bun}&ji=${ji}&_type=json&numOfRows=10&pageNo=1`
  
  const maskedKey = apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 4)
  const debugUrl = finalUrl.replace(apiKey, maskedKey)
  meta.requestUrl = debugUrl
  console.log(`[MOLIT] Request URL: ${debugUrl}`)
  console.log(`[MOLIT] Params: sigunguCd=${sigunguCd}, bjdongCd=${bjdongCd}, platGbCd=${platGbCd || 'omitted'}, bun=${bun}, ji=${ji}`)
  
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    const response = await fetch(finalUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    })
    
    clearTimeout(timeoutId)
    
    meta.httpStatus = response.status
    console.log(`[MOLIT] HTTP Response: status=${response.status}, statusText=${response.statusText}`)
    
    // ALWAYS get raw response text first, even for errors
    const responseText = await response.text()
    meta.rawResponsePreview = responseText.substring(0, 1000) // Increased to 1000 chars
    
    // Capture response headers for debugging
    const headersObj: Record<string, string> = {}
    response.headers.forEach((value, key) => {
      headersObj[key] = value
    })
    meta.responseHeaders = JSON.stringify(headersObj)
    meta.statusText = response.statusText
    
    if (!response.ok) {
      console.error(`[MOLIT] Upstream error: ${response.status} ${response.statusText}`)
      console.error(`[MOLIT] Upstream body: ${responseText.substring(0, 500)}`)
      // Return with actual body content, not just status text
      meta.upstreamError = true
      return { data: null, meta }
    }
    console.log(`[MOLIT] Raw response length: ${responseText.length} chars`)
    console.log(`[MOLIT] Raw response (first 1000 chars): ${responseText.substring(0, 1000)}`)
    
    // Parse JSON
    let data: T
    try {
      data = JSON.parse(responseText) as T
    } catch (parseError) {
      console.error(`[MOLIT] JSON parse error: ${parseError}`)
      console.error(`[MOLIT] Response text that failed to parse: ${responseText.substring(0, 500)}`)
      meta.parseError = String(parseError)
      return { data: null, meta }
    }
    
    // Debug: Log parsed structure
    const anyData = data as Record<string, unknown>
    console.log(`[MOLIT] Parsed response keys: ${Object.keys(anyData).join(', ')}`)
    if (anyData.response) {
      const resp = anyData.response as Record<string, unknown>
      console.log(`[MOLIT] response keys: ${Object.keys(resp).join(', ')}`)
      if (resp.header) {
        console.log(`[MOLIT] response.header: ${JSON.stringify(resp.header)}`)
      }
      if (resp.body) {
        const body = resp.body as Record<string, unknown>
        console.log(`[MOLIT] response.body keys: ${Object.keys(body).join(', ')}`)
        console.log(`[MOLIT] response.body.totalCount: ${body.totalCount}`)
        if (body.items) {
          const items = body.items as Record<string, unknown>
          console.log(`[MOLIT] response.body.items keys: ${Object.keys(items).join(', ')}`)
          console.log(`[MOLIT] response.body.items.item type: ${Array.isArray(items.item) ? 'array' : typeof items.item}`)
          if (items.item) {
            const itemArr = Array.isArray(items.item) ? items.item : [items.item]
            console.log(`[MOLIT] items count: ${itemArr.length}`)
          }
        }
      }
    }
    
    return { data, meta }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error('[MOLIT] Request timeout')
        meta.rawResponsePreview = 'ERROR: Request timeout'
      } else {
        console.error('[MOLIT] Fetch error:', error.message)
        meta.rawResponsePreview = `ERROR: ${error.message}`
      }
    }
    return { data: null, meta }
  }
}

// ============================================
// Address Resolution API (Juso.go.kr)
// ============================================

/**
 * Resolved address data from Juso API
 */
interface ResolvedAddress {
  // Road address
  roadAddr: string
  roadAddrPart1: string
  // Legal address (법정동)
  jibunAddr: string
  // Administrative codes
  admCd: string           // 행정동코드 (10자리)
  rnMgtSn: string         // 도로관리번호
  // Building info
  bdMgtSn: string         // 건물관리번호 (25자리)
  bdNm?: string           // 건물명
  // Parsed codes from bdMgtSn
  sigunguCd: string       // 시군구코드 (5자리)
  bjdongCd: string        // 법정동코드 (5자리)
  bun: string             // 번 (4자리)
  ji: string              // 지 (4자리)
  // Lookup path
  lookupPath: 'juso-resolved'
  // 건물 입구 좌표 (WGS84) - detail=Y 응답에서 파싱
  entX?: number           // 경도 (longitude)
  entY?: number           // 위도 (latitude)
}

/**
 * Juso API resolution result with detailed status
 */
interface JusoResolutionResult {
  resolved: ResolvedAddress | null
  status: 'success' | 'no-results' | 'auth-error' | 'invalid-request' | 'network-error' | 'key-missing'
  message?: string
  totalCount?: number
  /** Raw response details for debugging */
  rawResponse?: {
    requestUrl: string
    httpStatus: number
    errorCode?: string
    errorMessage?: string
    roadAddr?: string
    jibunAddr?: string
    bdMgtSn?: string
  }
}

/**
 * Resolve road address to structured parcel data using Juso API
 * Uses the open API endpoint: https://business.juso.go.kr/addrlink/addrLinkApi.do
 */
async function resolveAddressWithJuso(address: string): Promise<JusoResolutionResult> {
  const apiKey = getJusoApiKey()
  
  if (!apiKey) {
    console.log('[JUSO] API key not available, skipping address resolution')
    return { 
      resolved: null, 
      status: 'key-missing', 
      message: 'JUSO_API_KEY 또는 MOLIT_API_KEY가 설정되지 않았습니다. 주의: Juso API는 juso.go.kr에서 별도 발급받은 키가 필요합니다.',
    }
  }
  
  try {
    // Juso API endpoint
    // IMPORTANT: This API requires a key from juso.go.kr, NOT data.go.kr
    // Get key at: https://business.juso.go.kr/addrlink/openApi/searchApi.do
    
    // CRITICAL: Do NOT use URLSearchParams for confmKey!
    // URLSearchParams encodes '=' to '%3D', which JUSO API rejects as invalid key.
    // Build URL string directly to avoid double-encoding.
    const baseUrl = 'https://business.juso.go.kr/addrlink/addrLinkApi.do'
    const encodedKeyword = encodeURIComponent(address)
    
    // confmKey is NOT encoded - use as-is (it contains '=' at the end which must stay as '=')
    const requestUrl = `${baseUrl}?confmKey=${apiKey}&keyword=${encodedKeyword}&resultType=json&countPerPage=10&currentPage=1&detail=Y`
    
    // Build masked URL for logging
    const maskedKey = apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 4)
    const logUrl = `${baseUrl}?confmKey=${maskedKey}&keyword=${encodedKeyword}&resultType=json&countPerPage=10&currentPage=1&detail=Y`
    
    console.log(`[JUSO] Request URL (key masked): ${logUrl}`)
    console.log(`[JUSO] Key length: ${apiKey.length}, ends with '=': ${apiKey.endsWith('=')}`)
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)
    
    const response = await fetch(requestUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    })
    
    clearTimeout(timeoutId)
    
    console.log(`[JUSO] HTTP response status: ${response.status}`)
    
    if (!response.ok) {
      console.error(`[JUSO] HTTP error: ${response.status} ${response.statusText}`)
      return { 
        resolved: null, 
        status: 'network-error', 
        message: `HTTP ${response.status}`,
        rawResponse: { requestUrl: logUrl, httpStatus: response.status },
      }
    }
    
    const text = await response.text()
    console.log(`[JUSO] Raw response length: ${text.length} chars`)
    console.log(`[JUSO] Raw response (first 500 chars): ${text.substring(0, 500)}`)
    
    let data: unknown
    try {
      data = JSON.parse(text)
    } catch (parseError) {
      console.error(`[JUSO] JSON parse error, response starts with: ${text.substring(0, 200)}`)
      return { 
        resolved: null, 
        status: 'invalid-request', 
        message: 'Response is not valid JSON',
        rawResponse: { requestUrl: logUrl, httpStatus: response.status },
      }
    }
    
    // Log raw response structure
    const typedData = data as { results?: { common?: { errorCode?: string; errorMessage?: string; totalCount?: string }; juso?: unknown[] } }
    const errorCode = typedData.results?.common?.errorCode
    const errorMessage = typedData.results?.common?.errorMessage
    const totalCount = parseInt(typedData.results?.common?.totalCount || '0', 10)
    
    console.log(`[JUSO] Response: errorCode=${errorCode}, errorMessage=${errorMessage}, totalCount=${totalCount}`)
    
    // Check for API errors
    if (errorCode !== '0') {
      // Common error codes:
      // -999: System error
      // E0001: confmKey error (invalid key) - Key is from data.go.kr, not juso.go.kr
      // E0005: Invalid request
      // E0006: Service access denied
      console.error(`[JUSO] API error: code=${errorCode}, message=${errorMessage}`)
      
      const isAuthError = errorCode === 'E0001' || errorCode === 'E0006'
      const authHint = isAuthError 
        ? '. 주의: Juso API는 juso.go.kr에서 발급받은 별도 키가 필요합니다 (data.go.kr 키와 다름)'
        : ''
      
      return { 
        resolved: null, 
        status: isAuthError ? 'auth-error' : 'invalid-request', 
        message: `${errorMessage || errorCode}${authHint}`,
        rawResponse: { 
          requestUrl: logUrl, 
          httpStatus: response.status,
          errorCode,
          errorMessage,
        },
      }
    }
    
    const jusoList = typedData.results?.juso as Array<Record<string, string>> | undefined
    if (!jusoList || jusoList.length === 0) {
      console.log('[JUSO] No address results found (empty juso array)')
      return { 
        resolved: null, 
        status: 'no-results', 
        message: '검색 결과가 없습니다', 
        totalCount: 0,
        rawResponse: { 
          requestUrl: logUrl, 
          httpStatus: response.status,
          errorCode,
          errorMessage,
        },
      }
    }
    
    const juso = jusoList[0]
    console.log(`[JUSO] First result: roadAddr="${juso.roadAddr}", jibunAddr="${juso.jibunAddr}", bdMgtSn="${juso.bdMgtSn}"`)
    
    if (!juso) {
      console.log('[JUSO] No address results found')
      return { 
        resolved: null, 
        status: 'no-results', 
        message: '검색 결과가 없습니다', 
        totalCount,
        rawResponse: { requestUrl: logUrl, httpStatus: response.status },
      }
    }
    
    // Parse building management number (건물관리번호) to extract codes
    // Format: 시군구코드(5) + 법정동코드(5) + 산여부(1) + 지번본번(4) + 지번부번(4) + 특수지코드(2) + 호수코드(4)
    const bdMgtSn = juso.bdMgtSn || ''
    
    let sigunguCd = ''
    let bjdongCd = ''
    let bun = '0000'
    let ji = '0000'
    
    let platGbCdFromBdMgtSn = '0'  // 기본값 대지
    if (bdMgtSn.length >= 19) {
      sigunguCd = bdMgtSn.substring(0, 5)
      bjdongCd = bdMgtSn.substring(5, 10)
      platGbCdFromBdMgtSn = bdMgtSn.substring(10, 11)  // 0=대지, 1=산
      bun = bdMgtSn.substring(11, 15)
      ji = bdMgtSn.substring(15, 19)
      
      console.log(`[JUSO] Parsed bdMgtSn: sigunguCd=${sigunguCd}, bjdongCd=${bjdongCd}, platGbCd=${platGbCdFromBdMgtSn}, bun=${bun}, ji=${ji}`)
    } else {
      console.log(`[JUSO] bdMgtSn too short or missing: "${bdMgtSn}" (length: ${bdMgtSn.length})`)
      return { 
        resolved: null, 
        status: 'invalid-request', 
        message: `건물관리번호 파싱 실패 (bdMgtSn: ${bdMgtSn})`, 
        totalCount,
        rawResponse: { 
          requestUrl: logUrl, 
          httpStatus: response.status,
          roadAddr: juso.roadAddr,
          jibunAddr: juso.jibunAddr,
          bdMgtSn,
        },
      }
    }
    
    const resolved: ResolvedAddress & { platGbCdFromBdMgtSn?: string } = {
      roadAddr: juso.roadAddr || '',
      roadAddrPart1: juso.roadAddrPart1 || '',
      jibunAddr: juso.jibunAddr || '',
      admCd: juso.admCd || '',
      rnMgtSn: juso.rnMgtSn || '',
      bdMgtSn,
      bdNm: juso.bdNm || undefined,
      sigunguCd,
      bjdongCd,
      bun,
      ji,
      lookupPath: 'juso-resolved',
      platGbCdFromBdMgtSn,
      // 건물 입구 좌표 (WGS84) - detail=Y 응답에 포함
      entX: juso.entX ? parseFloat(juso.entX) : undefined,
      entY: juso.entY ? parseFloat(juso.entY) : undefined,
    }
    
    console.log(`[JUSO] Address resolved successfully:`, {
      roadAddr: resolved.roadAddr,
      jibunAddr: resolved.jibunAddr,
      sigunguCd: resolved.sigunguCd,
      bjdongCd: resolved.bjdongCd,
      bun: resolved.bun,
      ji: resolved.ji,
    })
    
    return { 
      resolved, 
      status: 'success', 
      totalCount,
      rawResponse: {
        requestUrl: logUrl,
        httpStatus: response.status,
        errorCode,
        errorMessage,
        roadAddr: resolved.roadAddr,
        jibunAddr: resolved.jibunAddr,
        bdMgtSn,
      },
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[JUSO] Request timeout')
      return { resolved: null, status: 'network-error', message: '요청 시간 초과' }
    } else {
      console.error('[JUSO] Resolution failed:', error)
      return { resolved: null, status: 'network-error', message: error instanceof Error ? error.message : String(error) }
    }
  }
}

// ============================================
// Building Register API
// ============================================

interface BuildingLookupParams {
  sigunguCd: string    // 시군구코드 (5자리)
  bjdongCd: string     // 법정동코드 (5자리)
  bun?: string         // 번 (4자리, 앞 0 채움)
  ji?: string          // 지 (4자리, 앞 0 채움)
}

interface BuildingLookupResult {
  data: MolitBuildingBasicItem | null
  apiStatus: 'success-with-data' | 'success-empty' | 'invalid-request' | 'auth-error' | 'network-error' | 'parse-error'
  message?: string
  totalCount?: number
  /** Debug info for diagnostics */
  debug?: {
    endpointName: string
    endpointKey: string
    requestUrl: string
    httpStatus?: number
    statusText?: string
    responseHeaders?: string
    resultCode?: string
    resultMsg?: string
    totalCount?: number
    itemsLength?: number
    rawResponsePreview?: string
    platGbCd?: string
  }
}

interface MultiEndpointResult {
  data: MolitBuildingBasicItem | null
  apiStatus: BuildingLookupResult['apiStatus']
  message?: string
  totalCount?: number
  /** Which endpoint succeeded (or last tried) */
  endpointUsed: string
  /** Results from all attempted endpoints */
  attemptedEndpoints: Array<{
    name: string
    status: string
    totalCount: number
    message?: string
  }>
}

async function fetchBuildingEndpoint(
  params: BuildingLookupParams,
  endpointConfig: { key: string; name: string; endpoint: string },
  platGbCd: string = '0'  // 0=대지, 1=산, undefined=생략
): Promise<BuildingLookupResult> {
  const apiKey = getApiKey()
  const maskedKey = apiKey ? apiKey.substring(0, 8) + '...' : 'NOT_SET'
  
  // Build request URL for logging
  const platGbPart = platGbCd !== '' ? `&platGbCd=${platGbCd}` : ''
  const requestUrl = `${MOLIT_API_BASE}${endpointConfig.endpoint}?serviceKey=${maskedKey}&sigunguCd=${params.sigunguCd}&bjdongCd=${params.bjdongCd}${platGbPart}&bun=${params.bun || '0000'}&ji=${params.ji || '0000'}&_type=json`
  
  console.log(`[MOLIT] Trying endpoint: ${endpointConfig.name} (${endpointConfig.key}) with platGbCd=${platGbCd || 'omitted'}`)
  console.log(`[MOLIT] Request URL: ${requestUrl}`)
  
  const debug: BuildingLookupResult['debug'] = {
    endpointName: endpointConfig.name,
    endpointKey: endpointConfig.key,
    requestUrl,
    platGbCd: platGbCd || 'omitted',
  }
  
  try {
    // Build params with optional platGbCd
    const apiParams: Record<string, string> = {
      sigunguCd: params.sigunguCd,
      bjdongCd: params.bjdongCd,
      bun: params.bun || '0000',
      ji: params.ji || '0000',
    }
    if (platGbCd !== '') {
      apiParams.platGbCd = platGbCd
    }
    
    const { data: response, meta } = await fetchMolitApi<MolitApiResponse<MolitBuildingBasicItem>>({
      endpoint: endpointConfig.endpoint,
      params: apiParams,
    })
    
    // Update debug with meta from API call
    debug.requestUrl = meta.requestUrl
    debug.httpStatus = meta.httpStatus
    debug.rawResponsePreview = meta.rawResponsePreview
    debug.statusText = meta.statusText
    debug.responseHeaders = meta.responseHeaders
    
    // Check for upstream error (non-200 HTTP status)
    if (meta.upstreamError) {
      console.log(`[MOLIT] ${endpointConfig.name} upstream error: HTTP ${meta.httpStatus}`)
      return { 
        data: null, 
        apiStatus: 'network-error' as const, 
        message: `Upstream HTTP ${meta.httpStatus}: ${meta.statusText}`, 
        debug 
      }
    }
    
    // Check for parse error
    if (meta.parseError) {
      debug.resultCode = 'PARSE_ERROR'
      debug.resultMsg = meta.parseError
      return { 
        data: null, 
        apiStatus: 'parse-error', 
        message: `JSON 파싱 오류: ${meta.parseError}`, 
        debug 
      }
    }
    
    // Only try to parse resultCode/resultMsg if we have a valid response
    const resultCode = response?.response?.header?.resultCode
    const resultMsg = response?.response?.header?.resultMsg
    
    if (resultCode !== undefined) {
      debug.resultCode = resultCode
      debug.resultMsg = resultMsg
    } else {
      debug.resultCode = 'PARSE_SKIPPED'
      debug.resultMsg = 'Response body not parseable or missing expected structure'
    }
    
    console.log(`[MOLIT] ${endpointConfig.name} response: resultCode=${resultCode}, resultMsg=${resultMsg}`)
    
    if (resultCode && resultCode !== '00') {
      console.log(`[MOLIT] ${endpointConfig.name} API error: ${resultCode} - ${resultMsg}`)
      
      // Common error codes
      if (resultCode === 'SERVICE_KEY_IS_NOT_REGISTERED_ERROR' || resultCode === '30') {
        return { data: null, apiStatus: 'auth-error', message: `인증키 오류: ${resultMsg}`, debug }
      }
      if (resultCode === 'NODATA_ERROR' || resultCode === '03') {
        return { data: null, apiStatus: 'success-empty', message: '데이터 없음', totalCount: 0, debug }
      }
      
      return { data: null, apiStatus: 'invalid-request', message: `API 오류: ${resultCode} - ${resultMsg}`, debug }
    }
    
    // Only parse totalCount/items if we have valid response structure
    if (!response?.response?.body) {
      debug.totalCount = undefined
      debug.itemsLength = undefined
      return { data: null, apiStatus: 'parse-error', message: 'Response body missing', debug }
    }
    
    const totalCount = response.response.body.totalCount || 0
    const items = response.response.body.items?.item
    const itemsLength = Array.isArray(items) ? items.length : (items ? 1 : 0)
    
    debug.totalCount = totalCount
    debug.itemsLength = itemsLength
    
    console.log(`[MOLIT] ${endpointConfig.name}: totalCount=${totalCount}, itemsLength=${itemsLength}`)
    
    if (!items) {
      console.log(`[MOLIT] ${endpointConfig.name} returned empty items`)
      return { data: null, apiStatus: 'success-empty', message: '조회 결과 없음', totalCount, debug }
    }
    
    const data = Array.isArray(items) ? items[0] : items
    
    console.log(`[MOLIT] ${endpointConfig.name} SUCCESS: Found building data`)
    return { data, apiStatus: 'success-with-data', totalCount, debug }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`[MOLIT] ${endpointConfig.name} error:`, errorMsg)
    
    if (errorMsg.includes('timeout') || errorMsg.includes('abort')) {
      return { data: null, apiStatus: 'network-error', message: '요청 시간 초과', debug }
    }
    if (errorMsg.includes('JSON') || errorMsg.includes('parse')) {
      return { data: null, apiStatus: 'parse-error', message: '응답 파싱 오류', debug }
    }
    
    return { data: null, apiStatus: 'network-error', message: errorMsg, debug }
  }
}

interface ExtendedMultiEndpointResult extends MultiEndpointResult {
  sentValues: { 
    sigunguCd: string
    bjdongCd: string
    bun: string
    ji: string
    bunLeadingZero: boolean
    jiLeadingZero: boolean 
  }
  /** Which endpoint family was used */
  familyUsed: 'current' | 'closed' | 'supplementary' | 'none'
  /** Supplementary parcel info if found */
  supplementaryParcels?: Array<{ bun: string; ji: string; regstrGbCd: string }>
}

/**
 * Try a list of endpoints with given params
 */
async function tryEndpointList(
  params: BuildingLookupParams,
  endpoints: Array<{ key: string; name: string; endpoint: string; family?: string }>,
  attemptedEndpoints: MultiEndpointResult['attemptedEndpoints'],
  platGbCd: string = '0'
): Promise<{ result: BuildingLookupResult | null; endpointUsed: string | null; family: string }> {
  for (const endpointConfig of endpoints) {
    const result = await fetchBuildingEndpoint(params, endpointConfig, platGbCd)
    
    attemptedEndpoints.push({
      name: `[${endpointConfig.family || 'current'}] ${endpointConfig.name}`,
      status: result.apiStatus,
      totalCount: result.totalCount || 0,
      message: result.message,
    })
    
    if (result.data) {
      console.log(`[MOLIT] Found data via ${endpointConfig.name} (${endpointConfig.family || 'current'})`)
      return { result, endpointUsed: endpointConfig.name, family: endpointConfig.family || 'current' }
    }
    
    if (result.apiStatus === 'auth-error') {
      return { result, endpointUsed: endpointConfig.name, family: endpointConfig.family || 'current' }
    }
    
    console.log(`[MOLIT] ${endpointConfig.name} returned 0 results, trying next...`)
  }
  
  return { result: null, endpointUsed: null, family: 'none' }
}

/**
 * Fetch supplementary parcel list to find representative parcel
 */
async function fetchSupplementaryParcels(params: BuildingLookupParams): Promise<Array<{ bun: string; ji: string; regstrGbCd: string; regstrGbCdNm: string }>> {
  console.log(`[MOLIT] Fetching supplementary parcels (부속지번)...`)
  
  const result = await fetchBuildingEndpoint(params, MOLIT_ATCH_JIBUN_ENDPOINT)
  
  if (!result.data) {
    console.log(`[MOLIT] No supplementary parcels found`)
    return []
  }
  
  // The result might be a single item or array
  const items = Array.isArray(result.data) ? result.data : [result.data]
  const parcels = items.map((item: MolitBuildingBasicItem) => ({
    bun: String((item as unknown as Record<string, unknown>).bun || '').padStart(4, '0'),
    ji: String((item as unknown as Record<string, unknown>).ji || '').padStart(4, '0'),
    regstrGbCd: String((item as unknown as Record<string, unknown>).regstrGbCd || ''),
    regstrGbCdNm: String((item as unknown as Record<string, unknown>).regstrGbCdNm || ''),
  }))
  
  console.log(`[MOLIT] Found ${parcels.length} supplementary parcels:`, parcels)
  return parcels
}

/**
 * Try multiple MOLIT building register endpoints in sequence
 * Order: Current ledger -> Closed ledger -> Supplementary parcel lookup
 */
async function fetchBuildingMultiEndpoint(params: BuildingLookupParams, platGbCd: string = '0'): Promise<ExtendedMultiEndpointResult> {
  const attemptedEndpoints: MultiEndpointResult['attemptedEndpoints'] = []
  
  // Debug: Track sent values
  const sentValues = {
    sigunguCd: params.sigunguCd,
    bjdongCd: params.bjdongCd,
    bun: params.bun || '0000',
    ji: params.ji || '0000',
    bunLeadingZero: (params.bun || '0000').startsWith('0'),
    jiLeadingZero: (params.ji || '0000').startsWith('0'),
  }
  
  console.log(`[MOLIT] Multi-attempt: sigunguCd=${params.sigunguCd}, bjdongCd=${params.bjdongCd}, bun=${params.bun}, ji=${params.ji}, platGbCd=${platGbCd}`)
  
  const basicEndpoint = MOLIT_BUILDING_ENDPOINTS_CURRENT[0]   // getBrBasisOulnInfo  (기본개요)
  const titleEndpoint = MOLIT_BUILDING_ENDPOINTS_CURRENT[1]   // getBrTitleInfo       (표제부)
  const recapEndpoint = MOLIT_BUILDING_ENDPOINTS_CURRENT[2]   // getBrRecapTitleInfo  (총괄표제부)
  
  // ========================================
  // Phase 1: platGbCd 순환 시도 (0→1→생략)
  //   - platGbCd=0  대지(일반) 
  //   - platGbCd=1  산 (bdMgtSn에서 추출된 경우 포함)
  //   - platGbCd='' 생략 (전체)
  // ========================================
  const platGbCdCandidates: string[] = ['0']
  if (platGbCd === '1') platGbCdCandidates.push('1') // bdMgtSn이 산으로 판단한 경우도 시도
  platGbCdCandidates.push('') // 생략 항상 마지막에
  
  for (const pgCd of platGbCdCandidates) {
    // 기본개요 시도
    const r1 = await tryEndpointList(params, [basicEndpoint], attemptedEndpoints, pgCd)
    if (r1.result?.apiStatus === 'auth-error') {
      return { data: null, apiStatus: 'auth-error', message: r1.result.message, totalCount: 0, endpointUsed: 'auth-error', attemptedEndpoints, sentValues, familyUsed: 'none' }
    }
    if (r1.result?.data) {
      const d = r1.result.data
      const hasArea = !!(d.platArea || d.archArea || d.bcRat || d.totArea || d.vlRat)
      if (hasArea) {
        // 면적 있으면 바로 반환
        return { data: d, apiStatus: r1.result.apiStatus, message: r1.result.message, totalCount: r1.result.totalCount, endpointUsed: r1.endpointUsed || 'unknown', attemptedEndpoints, sentValues, familyUsed: 'current' }
      }
      // 면적 없으면 표제부로 보강 시도
      console.log('[MOLIT] 기본개요 면적 없음 → 표제부 추가 조회')
      const r2b = await tryEndpointList(params, [titleEndpoint], attemptedEndpoints, pgCd)
      if (r2b.result?.data) {
        const d2 = r2b.result.data
        // 표제부 면적으로 기본개요 데이터 보강
        const merged = {
          ...d,
          platArea: d.platArea || d2.platArea,
          archArea: d.archArea || d2.archArea,
          bcRat: d.bcRat || d2.bcRat,
          totArea: d.totArea || d2.totArea,
          vlRat: d.vlRat || d2.vlRat,
        }
        console.log(`[MOLIT] 표제부 보강 결과 - platArea:${merged.platArea}, archArea:${merged.archArea}, bcRat:${merged.bcRat}`)
        return { data: merged, apiStatus: r1.result.apiStatus, message: r1.result.message, totalCount: r1.result.totalCount, endpointUsed: `${r1.endpointUsed}+표제부`, attemptedEndpoints, sentValues, familyUsed: 'current' }
      }
      // 표제부도 안 되면 기본개요 데이터라도 반환
      return { data: d, apiStatus: r1.result.apiStatus, message: r1.result.message, totalCount: r1.result.totalCount, endpointUsed: r1.endpointUsed || 'unknown', attemptedEndpoints, sentValues, familyUsed: 'current' }
    }
    
    // 표제부 시도
    const r2 = await tryEndpointList(params, [titleEndpoint], attemptedEndpoints, pgCd)
    if (r2.result?.data) {
      return { data: r2.result.data, apiStatus: r2.result.apiStatus, message: r2.result.message, totalCount: r2.result.totalCount, endpointUsed: r2.endpointUsed || 'unknown', attemptedEndpoints, sentValues, familyUsed: 'current' }
    }
    
    // 총괄표제부 시도
    const r3 = await tryEndpointList(params, [recapEndpoint], attemptedEndpoints, pgCd)
    if (r3.result?.data) {
      return { data: r3.result.data, apiStatus: r3.result.apiStatus, message: r3.result.message, totalCount: r3.result.totalCount, endpointUsed: r3.endpointUsed || 'unknown', attemptedEndpoints, sentValues, familyUsed: 'current' }
    }
  }
  
  // ========================================
  // Phase 3: Check supplementary parcels
  // ========================================
  console.log(`[MOLIT] Phase 3: Checking supplementary parcels (부속지번)...`)
  const supplementaryParcels = await fetchSupplementaryParcels(params)
  
  attemptedEndpoints.push({
    name: '[supplementary] 부속지번',
    status: supplementaryParcels.length > 0 ? 'success-with-data' : 'success-empty',
    totalCount: supplementaryParcels.length,
    message: supplementaryParcels.length > 0 
      ? `대표지번: ${supplementaryParcels.map(p => `${p.bun}-${p.ji}`).join(', ')}`
      : '부속지번 없음',
  })
  
  // If we found supplementary parcels, try the first one with the current ledger
  if (supplementaryParcels.length > 0) {
    const firstParcel = supplementaryParcels[0]
    console.log(`[MOLIT] Found supplementary parcel, retrying with bun=${firstParcel.bun}, ji=${firstParcel.ji}`)
    
    const retryParams = { ...params, bun: firstParcel.bun, ji: firstParcel.ji }
    const retryResult = await tryEndpointList(retryParams, MOLIT_BUILDING_ENDPOINTS_CURRENT.slice(0, 3), attemptedEndpoints, platGbCd)
    
    if (retryResult.result?.data) {
      return {
        data: retryResult.result.data,
        apiStatus: retryResult.result.apiStatus,
        message: `부속지번으로 조회: ${firstParcel.bun}-${firstParcel.ji}`,
        totalCount: retryResult.result.totalCount,
        endpointUsed: `${retryResult.endpointUsed}(부속지번)`,
        attemptedEndpoints,
        sentValues,
        familyUsed: 'supplementary',
        supplementaryParcels,
      }
    }
  }
  
  // ========================================
  // All failed
  // ========================================
  return {
    data: null,
    apiStatus: 'success-empty',
    message: `모든 건축물대장 API에서 조회 결과 없음 (현재대장 ${MOLIT_BUILDING_ENDPOINTS_CURRENT.length}개, 폐쇄대장 ${MOLIT_BUILDING_ENDPOINTS_CLOSED.length}개 시도)`,
    totalCount: 0,
    endpointUsed: 'none',
    attemptedEndpoints,
    sentValues,
    familyUsed: 'none',
    supplementaryParcels: supplementaryParcels.length > 0 ? supplementaryParcels : undefined,
  }
}

// ============================================
// Data Mapping
// ============================================

/**
 * Map raw building data to normalized site data
 */

// 지역지구 API로 용도지역 조회하는 독립 함수
async function fetchZoneType(sigunguCd: string, bjdongCd: string, bun: string, ji: string, molitKey: string): Promise<string | undefined> {
  try {
    const jijiguUrl = `https://apis.data.go.kr/1613000${MOLIT_ENDPOINTS.buildingJijuk}?serviceKey=${encodeURIComponent(molitKey)}&sigunguCd=${sigunguCd}&bjdongCd=${bjdongCd}&bun=${bun}&ji=${ji}&numOfRows=20&pageNo=1&resultType=json`
    console.log('[MOLIT] 지역지구 조회 시도...')
    const jijiguRes = await fetch(jijiguUrl, { signal: AbortSignal.timeout(5000) })
    if (jijiguRes.ok) {
      const jijiguJson = await jijiguRes.json()
      const items = jijiguJson?.response?.body?.items?.item
      if (items) {
        const arr = Array.isArray(items) ? items : [items]
        const zoneItem = arr.find((it: Record<string, string>) => 
          (it.jijiguGbCdNm || '').includes('용도지역') || (it.jijiguGbCdNm || '').includes('용도')
        )
        if (zoneItem?.jijiguCdNm) {
          console.log(`[MOLIT] 용도지역 발견: ${zoneItem.jijiguCdNm}`)
          return zoneItem.jijiguCdNm
        }
        // 첫 번째 항목에서 시도
        const first = arr[0]
        if (first?.jijiguCdNm && (first.jijiguCdNm.includes('주거') || first.jijiguCdNm.includes('상업') || first.jijiguCdNm.includes('공업') || first.jijiguCdNm.includes('녹지'))) {
          console.log(`[MOLIT] 용도지역 (첫 항목): ${first.jijiguCdNm}`)
          return first.jijiguCdNm
        }
      }
    }
  } catch (e) {
    console.warn('[MOLIT] 지역지구 조회 실패 (무시):', e)
  }
  return undefined
}

function mapBuildingToSiteData(building: MolitBuildingBasicItem): MolitSiteData {
  // Calculate total parking
  const parkingCount = 
    (building.indrMechUtcnt || 0) +
    (building.oudrMechUtcnt || 0) +
    (building.indrAutoUtcnt || 0) +
    (building.oudrAutoUtcnt || 0)

  // 대지면적 역산 로그
  console.log(`[MOLIT] Area fields - platArea:${building.platArea}, archArea:${building.archArea}, bcRat:${building.bcRat}, totArea:${building.totArea}, vlRat:${building.vlRat}`)
  const estimatedSiteArea = building.platArea ||
    (building.archArea && building.bcRat && building.bcRat > 0
      ? Math.round(building.archArea / (building.bcRat / 100))
      : building.totArea && building.vlRat && building.vlRat > 0
        ? Math.round(building.totArea / (building.vlRat / 100))
        : undefined)
  console.log(`[MOLIT] siteArea resolved: ${estimatedSiteArea}㎡ (source: ${building.platArea ? 'direct' : building.archArea && building.bcRat ? 'bcRat-calc' : 'vlRat-calc'})`)
  
  return {
    // Address
    address: building.platPlc || undefined,
    roadAddress: building.newPlatPlc || undefined,
    
    // Location codes
    sigunguCode: building.sigunguCd,
    bjdongCode: building.bjdongCd,
    bun: building.bun,
    ji: building.ji,
    
    // Building info
    buildingName: building.bldNm || undefined,
    mainPurpose: building.mainPurpsCdNm || building.etcPurps || undefined,
    
    // Area info - platArea가 없으면 archArea ÷ (bcRat/100) 로 역산
    siteArea: estimatedSiteArea,
    buildingArea: building.archArea || undefined,
    totalFloorArea: building.totArea || undefined,
    
    // Coverage/FAR
    buildingCoverage: building.bcRat || undefined,
    floorAreaRatio: building.vlRat || undefined,
    
    // Floors
    groundFloors: building.grndFlrCnt || undefined,
    basementFloors: building.ugrndFlrCnt || undefined,
    
    // Units
    householdCount: building.hhldCnt || undefined,
    unitCount: building.hoCnt || undefined,
    
    // Parking
    parkingCount: parkingCount > 0 ? parkingCount : undefined,
    
    // Zoning
    zoneType: building.jiyukCdNm || undefined,
    district: building.jiguCdNm || undefined,
    area: building.guyukCdNm || undefined,
    
    // Meta
    dataSource: 'building',
    fetchedAt: new Date().toISOString(),
  }
}

// ============================================
// Sigungu/Bjdong Code Lookup (Hardcoded Sample)
// ============================================

/**
 * Full sigungu codes for Seoul and major areas
 * Format: "시도 시군구" -> "5자리 시군구코드"
 */
const SIGUNGU_CODES: Record<string, string> = {
  // Seoul (서울특별시) - All 25 districts
  '서울특별시 종로구': '11110',
  '서울특별시 중구': '11140',
  '서울특별시 용산구': '11170',
  '서울특별시 성동구': '11200',
  '서울특별시 광진구': '11215',
  '서울특별시 동대문구': '11230',
  '서울특별시 중랑구': '11260',
  '서울특별시 성북구': '11290',
  '서울특별시 강북구': '11305',
  '서울특별시 도봉구': '11320',
  '서울특별시 노원구': '11350',
  '서울특별시 은평구': '11380',
  '서울특별시 서대문구': '11410',
  '서울특별시 마포구': '11440',
  '서울특별시 양천구': '11470',
  '서울특별시 강서구': '11500',
  '서울특별시 구로구': '11530',
  '서울특별시 금천구': '11545',
  '서울특별시 영등포구': '11560',
  '서울특별시 동작구': '11590',
  '서울특별시 관악구': '11620',
  '서울특별시 서초구': '11650',
  '서울특별시 강남구': '11680',
  '서울특별시 송파구': '11710',
  '서울특별시 강동구': '11740',
  // Gyeonggi-do major cities
  '경기도 수원시 장안구': '41111',
  '경기도 수원시 권선구': '41113',
  '경기도 수원시 팔달구': '41115',
  '경기도 수원시 영통구': '41117',
  '경기도 성남시 수정구': '41131',
  '경기도 성남시 중원구': '41133',
  '경기도 성남시 분당구': '41135',
  '경기도 용인시 처인구': '41461',
  '경기도 용인시 기흥구': '41463',
  '경기도 용인시 수지구': '41465',
  '경기도 고양시 덕양구': '41281',
  '경기도 고양시 일산동구': '41285',
  '경기도 고양시 일산서구': '41287',
  '경기도 안양시 만안구': '41171',
  '경기도 안양시 동안구': '41173',
  '경기도 부천시': '41190',
  '경기도 광명시': '41210',
  '경기도 평택시': '41220',
  '경기도 안산시 상록구': '41271',
  '경기도 안산시 단원구': '41273',
  '경기도 화성시': '41590',
  '경기도 파주시': '41480',
  '경기도 시흥시': '41390',
  '경기도 김포시': '41570',
  '경기도 광주시': '41610',
  '경기도 하남시': '41450',
  '경기도 남양주시': '41360',
  '경기도 구리시': '41310',
  '경기도 오산시': '41370',
  '경기도 이천시': '41500',
  '경기도 의정부시': '41150',
  // Busan
  '부산광역시 중구': '26110',
  '부산광역시 서구': '26140',
  '부산광역시 동구': '26170',
  '부산광역시 영도구': '26200',
  '부산광역시 부산진구': '26230',
  '부산광역시 동래구': '26260',
  '부산광역시 남구': '26290',
  '부산광역시 북구': '26320',
  '부산광역시 해운대구': '26350',
  '부산광역시 사하구': '26380',
  '부산광역시 금정구': '26410',
  '부산광역시 강서구': '26440',
  '부산광역시 연제구': '26470',
  '부산광역시 수영구': '26500',
  '부산광역시 사상구': '26530',
  '부산광역시 기장군': '26710',
  // Incheon
  '인천광역시 중구': '28110',
  '인천광역시 동구': '28140',
  '인천광역시 미추홀구': '28177',
  '인천광역시 연수구': '28185',
  '인천광역시 남동구': '28200',
  '인천광역시 부평구': '28237',
  '인천광역시 계양구': '28245',
  '인천광역시 서구': '28260',
  '인천광역시 강화군': '28710',
  '인천광역시 옹진군': '28720',
  // Daegu
  '대구광역시 중구': '27110',
  '대구광역시 동구': '27140',
  '대구광역시 서구': '27170',
  '대구광역시 남구': '27200',
  '대구광역시 북구': '27230',
  '대구광역시 수성구': '27260',
  '대구광역시 달서구': '27290',
  '대구광역시 달성군': '27710',
}

/**
 * Common bjdong codes to try for each sigungu when exact match fails
 * These are the most common dong codes within each district
 */
const COMMON_BJDONG_BY_SIGUNGU: Record<string, string[]> = {
  '11680': ['10100', '10200', '10300', '10400', '10500', '10600', '10700', '10800'], // 강남구
  '11650': ['10100', '10200', '10300', '10400', '10500'], // 서초구
  '11710': ['10100', '10200', '10300', '10400', '10500', '10600', '10700', '10800'], // 송파구
  '11740': ['10100', '10200', '10300', '10400', '10500'], // 강동구
  '11440': ['10100', '10200', '10300', '10400', '10500', '10800'], // 마포구
  '11170': ['10100', '10200', '10300'], // 용산구
  '11200': ['10100', '10200', '10300'], // 성동구
  '11215': ['10100', '10200', '10300'], // 광진구
  '11140': ['10100', '10200', '10300'], // 중구
  '11110': ['10100', '10200', '10300'], // 종로구
  '11560': ['10100', '10200', '10300', '10400', '10500'], // 영등포구
  '11590': ['10100', '10200', '10300'], // 동작구
  '11620': ['10100', '10200', '10300', '10400'], // 관악구
  '11530': ['10100', '10200', '10300'], // 구로구
  '11545': ['10100', '10200'], // 금천구
  '11500': ['10100', '10200', '10300', '10400', '10500'], // 강서구
  '11470': ['10100', '10200', '10300'], // 양천구
  '11410': ['10100', '10200', '10300'], // 서대문구
  '11380': ['10100', '10200', '10300', '10400'], // 은평구
  '11350': ['10100', '10200', '10300', '10400', '10500'], // 노원구
  '11320': ['10100', '10200', '10300'], // 도봉구
  '11305': ['10100', '10200', '10300'], // 강북구
  '11290': ['10100', '10200', '10300', '10400'], // 성북구
  '11260': ['10100', '10200', '10300'], // 중랑구
  '11230': ['10100', '10200', '10300', '10400'], // 동대문구
}

/**
 * Sample bjdong codes for common areas
 * Note: For road addresses without explicit dong, we use default '10100'
 */
const BJDONG_CODES: Record<string, string> = {
  // 강남구
  '강남구 역삼동': '10100',
  '강남구 삼성동': '10200',
  '강남구 대치동': '10300',
  '강남구 청담동': '10400',
  '강남구 압구정동': '10500',
  '강남구 논현동': '10600',
  '강남구 신사동': '10700',
  '강남구 도곡동': '10800',
  '강남구 개포동': '10900',
  '강남구 세곡동': '11000',
  '강남구 일원동': '11100',
  '강남구 수서동': '11200',
  // 서초구
  '서초구 서초동': '10100',
  '서초구 잠원동': '10200',
  '서초구 반포동': '10300',
  '서초구 방배동': '10400',
  '서초구 양재동': '10500',
  '서초구 내곡동': '10600',
  // 송파구
  '송파구 잠실동': '10100',
  '송파구 신천동': '10200',
  '송파구 풍납동': '10300',
  '송파구 송파동': '10400',
  '송파구 문정동': '10500',
  '송파구 가락동': '10600',
  '송파구 오금동': '10700',
  '송파구 방이동': '10800',
  // 마포구
  '마포구 합정동': '10100',
  '마포구 망원동': '10200',
  '마포구 연남동': '10300',
  '마포구 서교동': '10400',
  '마포구 상암동': '10800',
  '마포구 공덕동': '10500',
  // 용산구
  '용산구 이태원동': '10100',
  '용산구 한남동': '10200',
  '용산구 용산동': '10300',
  // 성동구
  '성동구 성수동': '10100',
  '성동구 왕십리동': '10200',
  // 분당구 (경기)
  '분당구 정자동': '10100',
  '분당구 수내동': '10200',
  '분당구 서현동': '10300',
  '분당구 판교동': '10400',
}

interface CodeLookupResult {
  sigunguCd?: string
  bjdongCd?: string
  debug: {
    parsedSido?: string
    parsedSigungu?: string
    parsedEupmyeondong?: string
    parsedRoadName?: string
    lookupKey?: string
  }
}

function lookupCodes(address: string): CodeLookupResult {
  const parsed = parseAddress(address)
  
  const debug: CodeLookupResult['debug'] = {
    parsedSido: parsed.sido,
    parsedSigungu: parsed.sigungu,
    parsedEupmyeondong: parsed.eupmyeondong,
    parsedRoadName: parsed.roadName,
  }
  
  let sigunguCd: string | undefined
  let bjdongCd: string | undefined
  
  // Try to find sigungu code
  if (parsed.sido && parsed.sigungu) {
    // Normalize sido to canonical form
    const normalizedSido = normalizeSido(parsed.sido)
    const sigunguKey = `${normalizedSido} ${parsed.sigungu}`
    debug.lookupKey = sigunguKey
    sigunguCd = SIGUNGU_CODES[sigunguKey]
    
    console.log(`[MOLIT] Sigungu lookup: "${sigunguKey}" -> ${sigunguCd || 'NOT FOUND'}`)
  }
  
  // Try to find bjdong code
  if (parsed.sigungu && parsed.eupmyeondong) {
    const bjdongKey = `${parsed.sigungu} ${parsed.eupmyeondong}`
    bjdongCd = BJDONG_CODES[bjdongKey]
    console.log(`[MOLIT] Bjdong lookup: "${bjdongKey}" -> ${bjdongCd || 'NOT FOUND'}`)
  }
  
  // For road addresses without explicit dong, use default bjdong code '10100'
  // This is a workaround - ideally we'd use the road address API
  if (sigunguCd && !bjdongCd && parsed.type === 'road') {
    bjdongCd = '10100' // Default to first dong in the district
    console.log(`[MOLIT] Using default bjdong '10100' for road address`)
  }
  
  console.log(`[MOLIT] Code lookup result:`, { sigunguCd, bjdongCd, debug })
  
  return { sigunguCd, bjdongCd, debug }
}

// ============================================
// Multi-Attempt Lookup Strategy
// ============================================

interface LookupAttempt {
  sigunguCd: string
  bjdongCd: string
  bun: string
  ji: string
  attemptType: 'primary' | 'bjdong-fallback' | 'broadened'
}

/**
 * Generate lookup attempts in priority order
 */
function generateLookupAttempts(
  sigunguCd: string,
  primaryBjdongCd: string,
  bun: string,
  ji: string
): LookupAttempt[] {
  const attempts: LookupAttempt[] = []
  
  // 1. Primary attempt with exact params
  attempts.push({
    sigunguCd,
    bjdongCd: primaryBjdongCd,
    bun,
    ji,
    attemptType: 'primary',
  })
  
  // 2. Try with ji = 0000 (main parcel only)
  if (ji !== '0000') {
    attempts.push({
      sigunguCd,
      bjdongCd: primaryBjdongCd,
      bun,
      ji: '0000',
      attemptType: 'primary',
    })
  }
  
  // 3. Try common bjdong codes for this sigungu
  const commonBjdongs = COMMON_BJDONG_BY_SIGUNGU[sigunguCd] || []
  for (const bjdongCd of commonBjdongs) {
    if (bjdongCd !== primaryBjdongCd) {
      attempts.push({
        sigunguCd,
        bjdongCd,
        bun,
        ji: '0000',
        attemptType: 'bjdong-fallback',
      })
    }
  }
  
  // 4. Broadened search with bun/ji = 0000 (any building in the dong)
  attempts.push({
    sigunguCd,
    bjdongCd: primaryBjdongCd,
    bun: '0000',
    ji: '0000',
    attemptType: 'broadened',
  })
  
  return attempts
}

// ============================================
// Main Lookup Function
// ============================================

/** Manual parcel override for retry */
interface ManualParcelOverride {
  sigunguCd: string
  bjdongCd: string
  bun: string
  ji: string
  /** If true, send raw bun/ji without zero-padding */
  rawMode?: boolean
  /** platGbCd: '0'=대지, '1'=산, ''=생략 */
  platGbCd?: string
}

/**
 * Lookup site data from MOLIT APIs
 * This is the main entry point for address lookups
 * 
 * Phase 3: Address resolution + multi-attempt strategy with diagnostics
 * 
 * @param address - The address to lookup
 * @param manualParcel - Optional manual parcel override for retry
 */
export async function lookupSiteData(
  address: string, 
  manualParcel?: ManualParcelOverride
): Promise<MolitLookupResponse> {
  const normalizedAddress = normalizeAddress(address)
  
  // Initialize diagnostics
  const diagnostics: MolitLookupResponse['diagnostics'] = {
    lookupPath: manualParcel ? 'local-parsed' : 'none',
    config: {
      molitApiKey: !!process.env.MOLIT_API_KEY,
      jusoApiKey: !!process.env.JUSO_API_KEY,  // Requires SEPARATE key from juso.go.kr
    },
    apiResponse: { status: 'not-called' },
    attemptsCount: 0,
  }
  
  if (!normalizedAddress) {
    return {
      success: false,
      error: '주소를 입력해주세요.',
      diagnostics,
    }
  }
  
  console.log(`[MOLIT] Phase 3 lookup starting for: "${normalizedAddress}"`)
  console.log(`[MOLIT] Config: MOLIT_API_KEY=${diagnostics.config.molitApiKey}, JUSO_API_KEY=${diagnostics.config.jusoApiKey}`)
  
  let sigunguCd: string
  let bjdongCd: string
  let bun: string
  let ji: string
  let lookupPath: 'juso-resolved' | 'local-parsed' | 'juso-failed' | 'manual-override'
  
  // platGbCd from manual override (default '0')
  let platGbCd = '0'
  
  // ========================================
  // Step 0: Check for manual parcel override (skip Juso)
  // ========================================
  if (manualParcel) {
    console.log(`[MOLIT] Using manual parcel override:`, manualParcel)
    
    // Safely handle potentially undefined values
    sigunguCd = manualParcel.sigunguCd || ''
    bjdongCd = manualParcel.bjdongCd || ''
    
    // Check if rawMode is set - if true, use values as-is without padding
    const rawMode = manualParcel.rawMode === true
    const rawBun = manualParcel.bun || '0000'
    const rawJi = manualParcel.ji || '0000'
    
    // Get platGbCd from manual parcel (default '0')
    platGbCd = manualParcel.platGbCd !== undefined ? manualParcel.platGbCd : '0'
    
    if (rawMode) {
      // Raw mode: use exact values without padding
      bun = rawBun
      ji = rawJi
      console.log(`[MOLIT] Raw mode enabled - using exact values`)
    } else {
      // Normal mode: pad to 4 digits
      bun = rawBun.padStart(4, '0')
      ji = rawJi.padStart(4, '0')
    }
    
    lookupPath = 'manual-override'
    
    diagnostics.lookupPath = 'manual-override'
    diagnostics.requestParams = { sigunguCd, bjdongCd, bun, ji }
    diagnostics.stoppedAt = 'molit'
    diagnostics.manualOverride = { 
      bun, 
      ji,
      rawBun,
      rawJi,
      rawMode,
    }
    
    console.log(`[MOLIT] Manual override values: bun=${bun}, ji=${ji}, rawMode=${rawMode}, platGbCd=${platGbCd || 'omitted'}`)
    
    // Skip Juso resolution, go directly to MOLIT lookup
  } else {
    // ========================================
    // Step 1: Try address resolution via Juso API
    // ========================================
    const jusoResult = await resolveAddressWithJuso(normalizedAddress)
    
    // Store Juso diagnostics with raw response
    diagnostics.jusoResult = {
      success: jusoResult.status === 'success',
      error: jusoResult.status !== 'success' ? `${jusoResult.status}: ${jusoResult.message || 'unknown'}` : undefined,
      rawResponse: jusoResult.rawResponse ? {
        requestUrl: jusoResult.rawResponse.requestUrl,
        httpStatus: jusoResult.rawResponse.httpStatus,
        errorCode: jusoResult.rawResponse.errorCode,
        errorMessage: jusoResult.rawResponse.errorMessage,
        roadAddr: jusoResult.rawResponse.roadAddr,
      } : undefined,
    }
    
    if (jusoResult.resolved) {
      // Use resolved parcel data from Juso API
      sigunguCd = jusoResult.resolved.sigunguCd
      bjdongCd = jusoResult.resolved.bjdongCd
      bun = jusoResult.resolved.bun
      ji = jusoResult.resolved.ji
      lookupPath = 'juso-resolved'
      
      // bdMgtSn에서 platGbCd 추출 (0=대지, 1=산)
      const resolvedAny = jusoResult.resolved as unknown as Record<string, unknown>
      if (resolvedAny['platGbCdFromBdMgtSn'] !== undefined) {
        platGbCd = String(resolvedAny['platGbCdFromBdMgtSn'])
        console.log(`[MOLIT] platGbCd extracted from bdMgtSn: ${platGbCd}`)
      }
      
      diagnostics.lookupPath = 'juso-resolved'
      diagnostics.jusoResult.jibunAddr = jusoResult.resolved.jibunAddr
      diagnostics.jusoResult.bdMgtSn = jusoResult.resolved.bdMgtSn
      diagnostics.jusoResult.extractedCodes = { sigunguCd, bjdongCd, bun, ji }
      // JUSO 좌표 포함 (Vworld 폴백용)
      if (jusoResult.resolved.entX) diagnostics.jusoResult.entX = jusoResult.resolved.entX
      if (jusoResult.resolved.entY) diagnostics.jusoResult.entY = jusoResult.resolved.entY
      if (jusoResult.resolved.roadAddr) diagnostics.jusoResult.roadAddr = jusoResult.resolved.roadAddr
      diagnostics.stoppedAt = 'molit' // Will proceed to MOLIT
      
      console.log(`[MOLIT] Using Juso-resolved data: sigunguCd=${sigunguCd}, bjdongCd=${bjdongCd}, bun=${bun}, ji=${ji}, platGbCd=${platGbCd}`)
    } else {
      // ========================================
      // Step 2: Juso failed — retry with shorter address variants
      // ========================================
      console.log(`[MOLIT] Juso resolution failed: ${jusoResult.status} - ${jusoResult.message}`)
      
      const parsed = parseAddress(normalizedAddress)
      
      // For road addresses: try shorter variants before giving up
      if (parsed.type === 'road' && jusoResult.status === 'no-results') {
        console.log(`[MOLIT] Road address no-results — trying shorter variants`)
        
        // Generate address variants for retry
        const variants: string[] = []
        
        // Variant 1: Remove building name / extra text after the number
        const numMatch = normalizedAddress.match(/^(.+\s+\d+(-\d+)?)\s+.+$/)
        if (numMatch) variants.push(numMatch[1])
        
        // Variant 2: "시군구 + 도로명 + 번호" only (drop 시도)
        const shortMatch = normalizedAddress.match(/([가-힣]+[구군시]\s+[가-힣]+(?:대로|로|길)\s*\d+(-\d+)?)/)
        if (shortMatch) variants.push(shortMatch[1])
        
        // Variant 3: Remove sub-number (152-3 → 152)
        const noSub = normalizedAddress.replace(/(\d+)-\d+/, '$1')
        if (noSub !== normalizedAddress) variants.push(noSub)
        
        // Deduplicate and filter
        const uniqueVariants = [...new Set(variants)].filter(v => v !== normalizedAddress && v.length >= 8)
        
        for (const variant of uniqueVariants) {
          console.log(`[MOLIT] Juso retry with: "${variant}"`)
          const retryResult = await resolveAddressWithJuso(variant)
          if (retryResult.resolved) {
            console.log(`[MOLIT] Juso retry SUCCESS: "${variant}"`)
            sigunguCd = retryResult.resolved.sigunguCd
            bjdongCd = retryResult.resolved.bjdongCd
            bun = retryResult.resolved.bun
            ji = retryResult.resolved.ji
            lookupPath = 'juso-resolved'
            
            const resolvedAny = retryResult.resolved as unknown as Record<string, unknown>
            if (resolvedAny['platGbCdFromBdMgtSn'] !== undefined) {
              platGbCd = String(resolvedAny['platGbCdFromBdMgtSn'])
            }
            
            diagnostics.lookupPath = 'juso-resolved'
            diagnostics.jusoResult = {
              success: true,
              jibunAddr: retryResult.resolved.jibunAddr,
              bdMgtSn: retryResult.resolved.bdMgtSn,
              extractedCodes: { sigunguCd, bjdongCd, bun, ji },
              retryVariant: variant,
            }
            if (retryResult.resolved.entX) diagnostics.jusoResult.entX = retryResult.resolved.entX
            if (retryResult.resolved.entY) diagnostics.jusoResult.entY = retryResult.resolved.entY
            if (retryResult.resolved.roadAddr) diagnostics.jusoResult.roadAddr = retryResult.resolved.roadAddr
            diagnostics.stoppedAt = 'molit'
            break
          }
        }
        
        // If all retries failed, stop
        if (lookupPath !== 'juso-resolved') {
          console.log(`[MOLIT] All Juso retries failed - STOPPING`)
          diagnostics.lookupPath = 'juso-failed'
          diagnostics.stoppedAt = 'juso'
          diagnostics.apiResponse = { status: 'not-called', message: 'MOLIT 호출 중단 - Juso 주소 변환 실패 (재시도 포함)' }
          
          return {
            success: false,
            error: '입력하신 주소를 찾을 수 없습니다. 주소를 확인 후 다시 시도해주세요.',
            diagnostics,
            data: {
              address: normalizedAddress,
              dataSource: 'address',
              fetchedAt: new Date().toISOString(),
            },
          }
        }
      } else if (parsed.type === 'road') {
        console.log(`[MOLIT] Road address detected but Juso failed (${jusoResult.status}) - STOPPING at stage=juso`)
        
        diagnostics.lookupPath = 'juso-failed'
        diagnostics.stoppedAt = 'juso'
        diagnostics.apiResponse = { status: 'not-called', message: 'MOLIT 호출 중단 - Juso 주소 변환 실패' }
        
        // Determine error message based on Juso failure reason
        let errorMsg = 'Juso 주소 변환에 실패하여 건축물대장 조회를 수행할 수 없습니다.'
        if (jusoResult.status === 'auth-error') {
          errorMsg = `Juso API 인증 오류: ${jusoResult.message}. JUSO_API_KEY를 juso.go.kr에서 발급받아 설정해주세요.`
        } else if (jusoResult.status === 'key-missing') {
          errorMsg = 'Juso API 키가 설정되지 않았습니다. JUSO_API_KEY 환경변수를 설정해주세요.'
        }
        
        return {
          success: false,
          error: errorMsg,
          diagnostics,
          data: {
            address: normalizedAddress,
            dataSource: 'address',
            fetchedAt: new Date().toISOString(),
          },
        }
      } else {
        // Jibun address - can use local parsing
        const codes = lookupCodes(normalizedAddress)
        
        if (!codes.sigunguCd || !codes.bjdongCd) {
          let errorMsg = '해당 지역의 코드를 찾을 수 없습니다.'
          if (!codes.sigunguCd) {
            errorMsg = codes.debug.parsedSigungu 
              ? `"${codes.debug.parsedSido || ''} ${codes.debug.parsedSigungu || ''}" 지역은 아직 지원되지 않습니다.`
              : '시/도, 구/군 정보를 인식할 수 없습니다. 전체 주소를 입력해주세요.'
          }
          
          console.log(`[MOLIT] Code lookup failed:`, codes.debug)
          
          return {
            success: false,
            error: errorMsg,
            diagnostics,
            data: {
              address: normalizedAddress,
              dataSource: 'address',
              fetchedAt: new Date().toISOString(),
            },
          }
        }
        
        sigunguCd = codes.sigunguCd
        bjdongCd = codes.bjdongCd
        lookupPath = 'local-parsed'
        diagnostics.lookupPath = 'local-parsed'
        
        // Extract bun/ji from jibun address
        bun = '0000'
        ji = '0000'
        
        if (parsed.jibunMain) {
          bun = String(parsed.jibunMain).padStart(4, '0')
          if (parsed.jibunSub) {
            ji = String(parsed.jibunSub).padStart(4, '0')
          }
        }
      }
    }
  }
  
  // Set request params in diagnostics (these are the Juso-resolved parcel values)
  diagnostics.requestParams = { sigunguCd, bjdongCd, bun, ji }
  
  console.log(`[MOLIT] Starting multi-endpoint lookup (${lookupPath})`)
  console.log(`[MOLIT] Parcel params: sigunguCd=${sigunguCd}, bjdongCd=${bjdongCd}, bun=${bun}, ji=${ji}`)
  
  try {
    // Try multiple MOLIT building register endpoints in sequence
    const result = await fetchBuildingMultiEndpoint({
      sigunguCd,
      bjdongCd,
      bun,
      ji,
    }, platGbCd)
    
    // Store endpoint results in diagnostics
    // Map attemptedEndpoints to a more UI-friendly format
    const endpointsForUI = result.attemptedEndpoints.map((ep: { 
      name?: string; 
      status?: string; 
      totalCount?: number; 
      message?: string;
      debug?: { 
        httpStatus?: number; 
        resultCode?: string; 
        resultMsg?: string;
        itemsLength?: number;
        rawResponsePreview?: string;
      } 
    }) => ({
      name: ep.name,
      status: ep.status,
      httpStatus: ep.debug?.httpStatus,
      resultCode: ep.debug?.resultCode,
      resultMsg: ep.debug?.resultMsg,
      totalCount: ep.totalCount,
      itemCount: ep.debug?.itemsLength,
      rawPreview: ep.debug?.rawResponsePreview?.substring(0, 300),
    }))
    
    diagnostics.molitEndpoints = {
      endpointUsed: result.endpointUsed,
      familyUsed: result.familyUsed,
      attempted: result.attemptedEndpoints,
      sentValues: result.sentValues,
      supplementaryParcels: result.supplementaryParcels,
    }
    diagnostics.attemptsCount = result.attemptedEndpoints.length
    
    if (result.data) {
      console.log(`[MOLIT] Building data found via ${result.endpointUsed}:`, result.data.bldNm || '(no name)')
      
      const siteData = mapBuildingToSiteData(result.data)
      siteData.dataSource = 'building'
      
      // 지역지구 API로 용도지역 조회
      if (!siteData.zoneType) {
        const zoneResult = await fetchZoneType(sigunguCd, bjdongCd, bun, ji, molitKey)
        if (zoneResult) siteData.zoneType = zoneResult
      }
      // JUSO에서 받은 건물 입구 좌표 추가 (diagnostics 통해 접근, 스코프 안전)
      const diagJuso = diagnostics.jusoResult as Record<string, unknown> | undefined
      if (diagJuso?.entX) siteData.entX = diagJuso.entX as number
      if (diagJuso?.entY) siteData.entY = diagJuso.entY as number
      if (diagJuso?.bdMgtSn) siteData.bdMgtSn = diagJuso.bdMgtSn as string
      // 필지 코드 추가 (zone-lookup용) - siteData에 없으면 vworld-zone 호출 불가
      if (!siteData.sigunguCd) siteData.sigunguCd = sigunguCd
      if (!siteData.bjdongCd) siteData.bjdongCd = bjdongCd
      if (!siteData.bun) siteData.bun = bun
      if (!siteData.ji) siteData.ji = ji
      
      diagnostics.apiResponse = {
        status: 'success-with-data',
        totalCount: result.totalCount,
      }
      diagnostics.stoppedAt = 'complete'
      
      // Vworld PNU fallback: MOLIT 데이터 있지만 siteArea 없는 경우
      if ((!siteData.siteArea || siteData.siteArea <= 0) && siteData.bdMgtSn) {
        console.log('[MOLIT] siteArea 없음 → Vworld PNU fallback 시도')
        const vwArea = await fetchVworldPnuArea(siteData.bdMgtSn)
        if (vwArea && vwArea.area > 0) {
          siteData.siteArea = vwArea.area
          console.log(`[MOLIT] Vworld PNU 대지면적 보완: ${vwArea.area}㎡`)
        }
      }
      
      return {
        success: true,
        data: siteData,
        diagnostics,
        rawData: {
          building: result.data,
        },
      }
    }
    
    // All endpoints returned empty
    console.log(`[MOLIT] All endpoints returned empty (path: ${lookupPath})`)
    
    // Fallback 1: ji가 '0000'이 아니면 ji='0000'으로 재시도
    if (ji !== '0000') {
      console.log(`[MOLIT] Retry with ji=0000 (was ${ji})`)
      const retryResult = await fetchBuildingMultiEndpoint({ sigunguCd, bjdongCd, bun, ji: '0000' }, platGbCd)
      if (retryResult.data) {
        const siteData = extractSiteData(retryResult.data, normalizedAddress)
        siteData.dataSource = 'building'
        // 지역지구 API로 용도지역 조회 (재시도 경로)
        if (!siteData.zoneType) {
          const zoneResult = await fetchZoneType(sigunguCd, bjdongCd, bun, ji !== '0000' ? ji : '0000', molitKey)
          if (zoneResult) siteData.zoneType = zoneResult
        }
        if (!siteData.sigunguCd) siteData.sigunguCd = sigunguCd
        if (!siteData.bjdongCd) siteData.bjdongCd = bjdongCd
        if (!siteData.bun) siteData.bun = bun
        if (!siteData.ji) siteData.ji = '0000'
        const diagJ = diagnostics.jusoResult as Record<string, unknown> | undefined
        if (diagJ?.entX) siteData.entX = diagJ.entX as number
        if (diagJ?.entY) siteData.entY = diagJ.entY as number
        if (diagJ?.bdMgtSn) siteData.bdMgtSn = diagJ.bdMgtSn as string
        diagnostics.apiResponse = { status: 'success-with-data', totalCount: retryResult.totalCount, message: 'ji=0000 재시도 성공' }
        diagnostics.stoppedAt = 'complete'
        if ((!siteData.siteArea || siteData.siteArea <= 0) && siteData.bdMgtSn) {
          const vwA = await fetchVworldPnuArea(siteData.bdMgtSn)
          if (vwA && vwA.area > 0) siteData.siteArea = vwA.area
        }
        return { success: true, data: siteData, diagnostics, rawData: { building: retryResult.data } }
      }
    }
    
    diagnostics.apiResponse = {
      status: result.apiStatus,
      message: result.message,
      totalCount: result.totalCount,
    }
    
    // Vworld PNU fallback: MOLIT 0건이지만 bdMgtSn 있으면 대지면적 보완
    const diagJusoEmpty = diagnostics.jusoResult as Record<string, unknown> | undefined
    const emptyBdMgtSn = (diagJusoEmpty?.bdMgtSn as string) || ''
    let vworldSiteArea: number | undefined
    if (emptyBdMgtSn.length >= 19) {
      console.log('[MOLIT] MOLIT 0건 → Vworld PNU fallback 시도:', emptyBdMgtSn)
      const vwArea = await fetchVworldPnuArea(emptyBdMgtSn)
      if (vwArea && vwArea.area > 0) {
        vworldSiteArea = vwArea.area
        console.log(`[MOLIT] Vworld PNU 대지면적 보완 성공: ${vwArea.area}㎡`)
      }
    }
    
    return {
      success: !!vworldSiteArea,
      error: vworldSiteArea 
        ? undefined
        : '해당 주소로 조회 가능한 건축물대장 정보를 찾지 못했습니다. 주소를 더 정확히 입력하거나 다른 주소로 다시 시도해주세요.',
      diagnostics,
      data: {
        address: normalizedAddress,
        roadAddress: (diagJusoEmpty?.roadAddr as string) || (diagJusoEmpty?.rawResponse as any)?.roadAddr,
        sigunguCode: sigunguCd,
        bjdongCode: bjdongCd,
        bun,
        ji,
        siteArea: vworldSiteArea,
        bdMgtSn: emptyBdMgtSn || undefined,
        entX: (diagJusoEmpty?.entX as number) || undefined,
        entY: (diagJusoEmpty?.entY as number) || undefined,
        dataSource: 'address' as const,
        fetchedAt: new Date().toISOString(),
      },
    }
  } catch (error) {
    console.error('[MOLIT] API call error:', error)
    diagnostics.apiResponse = {
      status: 'network-error',
      message: error instanceof Error ? error.message : String(error),
    }
    return {
      success: false,
      error: '건축물대장 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      diagnostics,
    }
  }
}

/**
* Check if MOLIT API is configured
*/

// ============================================
// Vworld PNU Fallback (MOLIT 0건 또는 siteArea null 시)
// ============================================
const VWORLD_KEY = 'FFEC486D-E635-345C-9BA6-5404A5AA191B'
const VWORLD_DOMAIN = 'v0-archi-scan-layout-generator.vercel.app'

async function fetchVworldPnuArea(bdMgtSn: string): Promise<{ area: number; address?: string } | null> {
  if (!bdMgtSn || bdMgtSn.length < 19) return null
  // bdMgtSn 대지구분: 0=대지, 1=산 → PNU 대지구분: 1=대지, 2=산
  const sigBjd = bdMgtSn.slice(0, 10) // 시군구+법정동
  const platGbCd = bdMgtSn.charAt(10) // 0=대지, 1=산
  const pnuPlatGb = platGbCd === '1' ? '2' : '1' // 변환
  const bunJi = bdMgtSn.slice(11, 19) // 본번+부번
  const pnu = `${sigBjd}${pnuPlatGb}${bunJi}`
  console.log(`[MOLIT-VWORLD] bdMgtSn=${bdMgtSn.slice(0,19)} → PNU=${pnu} (platGbCd ${platGbCd}→${pnuPlatGb})`)
  
  // 1차: 변환된 PNU로 시도
  const result = await fetchVworldPnuAreaByPnu(pnu)
  if (result) return result
  
  // 2차: 원본 그대로 시도 (일부 API에서 0도 허용)
  const rawPnu = bdMgtSn.slice(0, 19)
  if (rawPnu !== pnu) {
    console.log(`[MOLIT-VWORLD] 1차 실패 → 원본 PNU ${rawPnu}로 재시도`)
    return await fetchVworldPnuAreaByPnu(rawPnu)
  }
  return null
}

async function fetchVworldPnuAreaByPnu(pnu: string): Promise<{ area: number; address?: string } | null> {
  try {
    const params = new URLSearchParams({
      service: 'data', request: 'GetFeature', data: 'LP_PA_CBND_BUBUN',
      key: VWORLD_KEY, domain: VWORLD_DOMAIN, geometry: 'true', attribute: 'true',
      page: '1', size: '1', crs: 'EPSG:4326', format: 'json',
      attrFilter: `pnu:=:${pnu}`,
    })
    const res = await fetch(`https://api.vworld.kr/req/data?${params}`, {
      signal: AbortSignal.timeout(8000),
      headers: { 'Referer': `https://${VWORLD_DOMAIN}`, 'Origin': `https://${VWORLD_DOMAIN}` },
    })
    const data = await res.json()
    const features = data?.response?.result?.featureCollection?.features || []
    if (!features.length) return null
    const geom = features[0]?.geometry
    const props = features[0]?.properties || {}
    // 면적 계산 (Shoelace formula)
    const rawCoords = geom?.type === 'Polygon' ? geom.coordinates?.[0]
      : geom?.type === 'MultiPolygon' ? geom.coordinates?.[0]?.[0] : null
    if (!rawCoords || rawCoords.length < 3) return null
    const lats = rawCoords.map((c: number[]) => c[1])
    const cLat = (Math.min(...lats) + Math.max(...lats)) / 2
    let pa = 0
    for (let i = 0; i < rawCoords.length - 1; i++) {
      pa += (rawCoords[i][0] - rawCoords[i+1][0]) * (rawCoords[i][1] + rawCoords[i+1][1])
    }
    const areaM2 = Math.abs(pa / 2) * 111319 * 111319 * Math.cos(cLat * Math.PI / 180)
    console.log(`[MOLIT-VWORLD] PNU ${pnu} 면적: ${Math.round(areaM2)}㎡ (${props.addr || ''})`)
    return { area: Math.round(areaM2), address: props.addr }
  } catch (e) {
    console.warn('[MOLIT-VWORLD] PNU 면적 조회 실패:', e)
    return null
  }
}

export function isMolitConfigured(): boolean {
  // Use hardcoded key as fallback if env var is not set
  return !!(process.env.MOLIT_API_KEY || HARDCODED_MOLIT_KEY)
}

/**
  * Check if Juso API is configured (for address resolution)
  * Requires separate JUSO_API_KEY from juso.go.kr
  */
export function isJusoConfigured(): boolean {
  // Use hardcoded key as fallback if env var is not set
  return !!(process.env.JUSO_API_KEY || HARDCODED_JUSO_KEY)
}
