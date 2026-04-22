import { NextRequest, NextResponse } from 'next/server'

/**
 * Debug endpoint - directly call ONE MOLIT API endpoint
 * Supports two key modes:
 * - raw: Use original key as-is (URLSearchParams will auto-encode)
 * - encoded: Pre-encode the key, then use string concatenation to avoid double-encoding
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams
  
  const sigunguCd = searchParams.get('sigunguCd') || ''
  const bjdongCd = searchParams.get('bjdongCd') || ''
  const bun = searchParams.get('bun') || '0000'
  const ji = searchParams.get('ji') || '0000'
  const platGbCd = searchParams.get('platGbCd') || '0'
  const keyMode = searchParams.get('keyMode') || 'raw' // 'raw' or 'encoded'
  
  const apiKey = process.env.MOLIT_API_KEY
  
  if (!apiKey) {
    return NextResponse.json({
      error: 'MOLIT_API_KEY not configured',
      debug: {
        step: 'config-check',
        hasKey: false,
        keyMode,
      }
    }, { status: 500 })
  }
  
  // Key preview (first 6 + last 4)
  const keyPreview = apiKey.substring(0, 6) + '...' + apiKey.substring(apiKey.length - 4)
  const keyLength = apiKey.length
  const keyContainsEncoded = apiKey.includes('%') || apiKey.includes('+')
  
  let finalUrl: string
  let usedKey: string
  
  if (keyMode === 'encoded') {
    // Pre-encode the key and use string concatenation to avoid double-encoding
    const encodedKey = encodeURIComponent(apiKey)
    const encodedKeyPreview = encodedKey.substring(0, 10) + '...' + encodedKey.substring(encodedKey.length - 6)
    usedKey = encodedKeyPreview
    
    // Build URL manually with string concatenation
    const baseUrl = 'https://apis.data.go.kr/1613000/BldRgstService_v2/getBrBasisOulnInfo'
    const params = new URLSearchParams()
    params.set('_type', 'json')
    params.set('numOfRows', '10')
    params.set('pageNo', '1')
    params.set('sigunguCd', sigunguCd)
    params.set('bjdongCd', bjdongCd)
    params.set('bun', bun)
    params.set('ji', ji)
    if (platGbCd) {
      params.set('platGbCd', platGbCd)
    }
    
    // Manually append serviceKey to avoid double encoding
    finalUrl = `${baseUrl}?serviceKey=${encodedKey}&${params.toString()}`
  } else {
    // Raw mode: use URLSearchParams which auto-encodes
    usedKey = keyPreview
    
    const baseUrl = 'https://apis.data.go.kr/1613000/BldRgstService_v2/getBrBasisOulnInfo'
    const url = new URL(baseUrl)
    
    url.searchParams.set('serviceKey', apiKey)
    url.searchParams.set('_type', 'json')
    url.searchParams.set('numOfRows', '10')
    url.searchParams.set('pageNo', '1')
    url.searchParams.set('sigunguCd', sigunguCd)
    url.searchParams.set('bjdongCd', bjdongCd)
    url.searchParams.set('bun', bun)
    url.searchParams.set('ji', ji)
    if (platGbCd) {
      url.searchParams.set('platGbCd', platGbCd)
    }
    
    finalUrl = url.toString()
  }
  
  // Masked URL for display (hide full key)
  const maskedUrl = finalUrl.replace(apiKey, keyPreview).replace(encodeURIComponent(apiKey), `[ENCODED:${keyPreview}]`)
  
  console.log(`[DEBUG-SINGLE] keyMode=${keyMode}, keyPreview=${keyPreview}, keyLength=${keyLength}`)
  console.log('[DEBUG-SINGLE] Calling:', maskedUrl)
  
  try {
    const startTime = Date.now()
    const response = await fetch(finalUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    })
    const elapsed = Date.now() - startTime
    
    const rawText = await response.text()
    
    // Capture response headers
    const responseHeaders: Record<string, string> = {}
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value
    })
    
    console.log('[DEBUG-SINGLE] HTTP Status:', response.status, response.statusText)
    console.log('[DEBUG-SINGLE] Response length:', rawText.length)
    console.log('[DEBUG-SINGLE] Response (first 1000):', rawText.substring(0, 1000))
    
    // Try to parse JSON
    let parsed: unknown = null
    let parseError: string | null = null
    try {
      parsed = JSON.parse(rawText)
    } catch (e) {
      parseError = e instanceof Error ? e.message : String(e)
    }
    
    // Extract key info if parsed successfully
    let resultCode: string | undefined
    let resultMsg: string | undefined
    let totalCount: number | undefined
    let itemsLength: number | undefined
    
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>
      const resp = obj.response as Record<string, unknown> | undefined
      if (resp) {
        const header = resp.header as Record<string, unknown> | undefined
        const body = resp.body as Record<string, unknown> | undefined
        
        if (header) {
          resultCode = header.resultCode as string
          resultMsg = header.resultMsg as string
        }
        if (body) {
          totalCount = body.totalCount as number
          const items = body.items as Record<string, unknown> | undefined
          if (items?.item) {
            itemsLength = Array.isArray(items.item) ? items.item.length : 1
          }
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      debug: {
        step: 'completed',
        keyMode,
        keyPreview,
        keyLength,
        keyContainsEncoded,
        usedKeyPreview: usedKey,
        requestUrl: maskedUrl,
        httpStatus: response.status,
        statusText: response.statusText,
        responseLength: rawText.length,
        elapsedMs: elapsed,
        parseError,
        // Extracted values
        resultCode,
        resultMsg,
        totalCount,
        itemsLength,
        // Params sent
        params: { sigunguCd, bjdongCd, bun, ji, platGbCd },
        // Response headers
        responseHeaders,
      },
      rawResponse: rawText.substring(0, 3000),
      parsed: parsed,
    })
    
  } catch (fetchError) {
    const errorMsg = fetchError instanceof Error ? fetchError.message : String(fetchError)
    console.error('[DEBUG-SINGLE] Fetch error:', errorMsg)
    
    return NextResponse.json({
      error: 'Fetch failed',
      debug: {
        step: 'fetch',
        keyMode,
        keyPreview,
        keyLength,
        requestUrl: maskedUrl,
        errorMessage: errorMsg,
        params: { sigunguCd, bjdongCd, bun, ji, platGbCd },
      }
    }, { status: 500 })
  }
}
