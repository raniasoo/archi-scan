import { NextResponse } from 'next/server'
import { lookupSiteData } from '@/lib/molit'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get('address') || '서울특별시 종로구 평창12길 16-6'
  try {
    const result = await lookupSiteData(address)
    return NextResponse.json({
      address,
      success: result.success,
      zoneType: result.data?.zoneType,
      buildingName: result.data?.buildingName,
      siteArea: result.data?.siteArea,
      dataSource: result.data?.dataSource,
      entX: result.data?.entX,
      entY: result.data?.entY,
      lookupPath: result.diagnostics?.lookupPath,
      jusoSuccess: result.diagnostics?.jusoResult?.success,
      apiStatus: result.diagnostics?.apiResponse?.status,
      apiMessage: result.diagnostics?.apiResponse?.message,
      error: result.error,
    })
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err), stack: err instanceof Error ? err.stack?.slice(0,300) : undefined })
  }
}
