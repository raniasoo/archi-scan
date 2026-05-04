import { NextResponse } from 'next/server'
import { lookupSiteData } from '@/lib/molit'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get('address') || '서울특별시 종로구 평창12길 16-6'
  
  try {
    const result = await lookupSiteData(address)
    return NextResponse.json({
      inputAddress: address,
      success: result.success,
      error: result.error,
      hasData: !!result.data,
      zoneType: result.data?.zoneType,
      buildingName: result.data?.buildingName,
      siteArea: result.data?.siteArea,
      dataSource: result.data?.dataSource,
      entX: result.data?.entX,
      entY: result.data?.entY,
      lookupPath: result.diagnostics?.lookupPath,
      jusoSuccess: result.diagnostics?.jusoResult?.success,
      apiResponseStatus: result.diagnostics?.apiResponse?.status,
      apiResponseMessage: result.diagnostics?.apiResponse?.message,
      attemptsCount: result.diagnostics?.attemptsCount,
    })
  } catch (err: unknown) {
    return NextResponse.json({ 
      error: String(err), 
      stack: err instanceof Error ? err.stack : undefined,
      inputAddress: address 
    })
  }
}
