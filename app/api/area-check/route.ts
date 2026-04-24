/**
 * 공개 진단 API - 대지면적 필드 확인용
 * GET /api/area-check?address=서울특별시 강남구 테헤란로 152
 */
import { NextRequest, NextResponse } from 'next/server'
import { lookupSiteData } from '@/lib/molit'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const address = request.nextUrl.searchParams.get('address') || '서울특별시 강남구 테헤란로 152'

  try {
    const result = await lookupSiteData(address)

    return NextResponse.json({
      address,
      success: result.success,
      siteArea: result.data?.siteArea ?? null,
      buildingArea: result.data?.buildingArea ?? null,
      buildingCoverage: result.data?.buildingCoverage ?? null,
      floorAreaRatio: result.data?.floorAreaRatio ?? null,
      totalFloorArea: result.data?.totalFloorArea ?? null,
      buildingName: result.data?.buildingName ?? null,
      zoneType: result.data?.zoneType ?? null,
      dataSource: result.data?.dataSource ?? null,
      diagnostics: result.diagnostics ?? null,
      message: result.message ?? null,
    }, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    })
  } catch (e: unknown) {
    return NextResponse.json({
      error: String(e),
      address,
    }, { status: 500 })
  }
}
