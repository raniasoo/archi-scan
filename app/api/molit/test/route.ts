import { NextResponse } from 'next/server'
import { lookupSiteData } from '@/lib/molit'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get('address') || '서울특별시 종로구 평창12길 16-6 (평창동, 평창삼호빌라)'
  
  try {
    const result = await lookupSiteData(address)
    return NextResponse.json({
      inputAddress: address,
      success: result.success,
      buildingName: result.data?.buildingName,
      siteArea: result.data?.siteArea,
      zoneType: result.data?.zoneType,
      dataSource: result.data?.dataSource,
      entX: result.data?.entX,
      entY: result.data?.entY,
      lookupPath: result.diagnostics?.lookupPath,
      jusoSuccess: result.diagnostics?.jusoResult?.success,
      jusoError: result.diagnostics?.jusoResult?.error,
      error: result.error,
      hasData: !!result.data,
    })
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err), inputAddress: address })
  }
}
