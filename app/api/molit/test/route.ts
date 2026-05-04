import { NextResponse } from 'next/server'
import { lookupSiteData } from '@/lib/molit'
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get('address') || '서울특별시 종로구 평창12길 16-6'
  const result = await lookupSiteData(address)
  return NextResponse.json({
    address, success: result.success,
    zoneType: result.data?.zoneType, buildingName: result.data?.buildingName,
    siteArea: result.data?.siteArea, dataSource: result.data?.dataSource,
    apiStatus: result.diagnostics?.apiResponse?.status,
    error: result.error,
  })
}
