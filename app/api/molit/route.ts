/**
 * MOLIT API Route
 * @version STABLE-v203 | Phase 1 Integration + Env Debug
 * 
 * POST /api/molit
 * 
 * Server-side endpoint for MOLIT data lookup.
 * Keeps API key secure on server.
 */

import { NextRequest, NextResponse } from 'next/server'
import { lookupSiteData, isMolitConfigured, isJusoConfigured } from '@/lib/molit'

// Force dynamic rendering to always check env vars at request time
export const dynamic = 'force-dynamic'
import type { MolitLookupRequest, MolitLookupResponse, MolitDiagnostics } from '@/types/molit'

/**
 * Validate address completeness for real MOLIT lookup
 * Requires at least: city + district + dong/road + number
 */
function validateAddressCompleteness(address: string): { valid: boolean; message?: string } {
  const trimmed = address.trim()
  
  // Minimum length check
  if (trimmed.length < 10) {
    return { valid: false, message: '주소가 너무 짧습니다. 더 상세한 주소를 입력해주세요.' }
  }
  
  // Check for basic address components
  const hasCity = /서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주/.test(trimmed)
  const hasDistrict = /[가-힣]+구|[가-힣]+시|[가-힣]+군/.test(trimmed)
  const hasDongOrRoad = /[가-힣]+동|[가-힣]+로|[가-힣]+길/.test(trimmed)
  const hasNumber = /\d+/.test(trimmed)
  
  if (!hasCity) {
    return { valid: false, message: '시/도를 포함한 전체 주소를 입력해주세요.' }
  }
  
  if (!hasDistrict) {
    return { valid: false, message: '구/시/군을 포함한 전체 주소를 입력해주세요.' }
  }
  
  if (!hasDongOrRoad) {
    return { valid: false, message: '동/로/길을 포함한 상세 주소를 입력해주세요.' }
  }
  
  if (!hasNumber) {
    return { valid: false, message: '번지 또는 건물번호를 포함해주세요. (예: 123-45 또는 152)' }
  }
  
  return { valid: true }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse request body
    const body = await request.json() as MolitLookupRequest
    
    if (!body.address || typeof body.address !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: '주소를 입력해주세요.',
        },
        { status: 400 }
      )
    }
    
    const isConfigured = isMolitConfigured()
    const isJusoConfiguredFlag = isJusoConfigured()
    
    // Log env status for debugging
    console.log('[v0] MOLIT API route env check:', {
      molitConfigured: isConfigured,
      jusoConfigured: isJusoConfiguredFlag,
      molitKeyLength: process.env.MOLIT_API_KEY?.length || 0,
      jusoKeyLength: process.env.JUSO_API_KEY?.length || 0,
      timestamp: new Date().toISOString(),
    })
    
    // Validate address completeness for real lookup
    const validation = validateAddressCompleteness(body.address)
    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        error: validation.message,
        isDemo: !isConfigured,
      })
    }
    
    // Build diagnostics for config status - show actual env state
    const molitKeyRaw = process.env.MOLIT_API_KEY
    const jusoKeyRaw = process.env.JUSO_API_KEY
    
    const demoDiagnostics: MolitDiagnostics = {
      lookupPath: 'none',
      config: {
        molitApiKey: isConfigured,
        jusoApiKey: isJusoConfiguredFlag,
      },
      envDebug: {
        molitKeyLength: molitKeyRaw?.length || 0,
        jusoKeyLength: jusoKeyRaw?.length || 0,
        molitKeyPreview: molitKeyRaw 
          ? molitKeyRaw.substring(0, 6) + '...' + molitKeyRaw.substring(molitKeyRaw.length - 4)
          : 'NOT_SET',
        jusoKeyPreview: jusoKeyRaw
          ? jusoKeyRaw.substring(0, 6) + '...' + jusoKeyRaw.substring(jusoKeyRaw.length - 4)
          : 'NOT_SET',
      },
      apiResponse: { 
        status: 'not-called', 
        message: isConfigured 
          ? 'API key found - proceeding to real lookup' 
          : 'ENV_MISSING - MOLIT_API_KEY not found in process.env' 
      },
    }
    
    // Check if API is configured
    if (!isConfigured) {
      // Return mock/demo data for testing without API key
      // Clearly marked as demo data
      return NextResponse.json({
        success: true,
        isDemo: true,
        diagnostics: demoDiagnostics,
        data: {
          address: body.address,
          roadAddress: body.address,
          siteArea: 1500,
          buildingName: '[데모] 샘플 빌딩',
          mainPurpose: '공동주택',
          groundFloors: 15,
          basementFloors: 2,
          householdCount: 120,
          buildingCoverage: 55,
          floorAreaRatio: 250,
          zoneType: '제2종일반주거지역',
          dataSource: 'demo',
          fetchedAt: new Date().toISOString(),
        },
      })
    }
    
    // Check for manual parcel override (include rawMode and platGbCd flags)
    const manualParcelRaw = body.manualParcel as { 
      sigunguCd?: string
      bjdongCd?: string
      bun?: string
      ji?: string
      rawMode?: boolean
      platGbCd?: string
    } | undefined
    
    const manualParcel = (manualParcelRaw?.sigunguCd && manualParcelRaw?.bjdongCd) ? {
      sigunguCd: manualParcelRaw.sigunguCd,
      bjdongCd: manualParcelRaw.bjdongCd,
      bun: manualParcelRaw.bun || '0000',
      ji: manualParcelRaw.ji || '0000',
      rawMode: manualParcelRaw.rawMode,
      platGbCd: manualParcelRaw.platGbCd,
    } : undefined
    
    // Log the manual parcel to verify rawMode and platGbCd are passed
    if (manualParcel) {
      console.log('[API] Manual parcel received:', JSON.stringify(manualParcel))
      console.log('[API] platGbCd:', manualParcel.platGbCd, 'rawMode:', manualParcel.rawMode)
    }
    
    // Perform real lookup with optional manual parcel
    const result = await lookupSiteData(body.address, manualParcel)
    
    console.log('[MOLIT-DEBUG] zoneType:', result?.data?.zoneType, '| siteArea:', result?.data?.siteArea, '| address:', body.address)
    
    return NextResponse.json({ ...result, isDemo: false })
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    
    console.error('[API] MOLIT lookup error:', errorMessage)
    if (errorStack) {
      console.error('[API] Stack:', errorStack)
    }
    
    // Return detailed error for debugging
    return NextResponse.json(
      {
        success: false,
        error: `서버 오류: ${errorMessage}`,
        diagnostics: {
          lookupPath: 'none',
          config: {
            molitApiKey: !!process.env.MOLIT_API_KEY,
            jusoApiKey: !!process.env.JUSO_API_KEY,
          },
          apiResponse: {
            status: 'network-error',
            message: errorMessage,
          },
          stoppedAt: 'api-route',
        },
      },
      { status: 500 }
    )
  }
}

// Health check
export async function GET(request: NextRequest): Promise<NextResponse> {
  const testAddr = request.nextUrl.searchParams.get('test')
  
  // ?test=주소 파라미터가 있으면 실제 조회 테스트
  if (testAddr && testAddr.length > 3) {
    try {
      const { lookupSiteData } = await import('@/lib/molit')
      const result = await lookupSiteData(testAddr)
      return NextResponse.json({
        status: 'test',
        address: testAddr,
        success: result.success,
        error: result.error,
        zoneType: result.data?.zoneType || null,
        siteArea: result.data?.siteArea || null,
        buildingName: result.data?.buildingName || null,
        mainPurpose: result.data?.mainPurpose || null,
        groundFloors: result.data?.groundFloors || null,
        buildingCoverage: result.data?.buildingCoverage || null,
        floorAreaRatio: result.data?.floorAreaRatio || null,
        diagnostics: result.diagnostics,
      })
    } catch (e) {
      return NextResponse.json({ status: 'test-error', error: String(e) })
    }
  }

  return NextResponse.json({
    status: 'ok',
    configured: isMolitConfigured(),
    message: isMolitConfigured() 
      ? 'MOLIT API is configured' 
      : 'MOLIT API key not set. Using demo mode.',
  })
}
