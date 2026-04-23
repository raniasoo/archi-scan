import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  
  const endpoint = searchParams.get('endpoint') || ''
  const serviceKey = searchParams.get('serviceKey') || ''
  const sigunguCd = searchParams.get('sigunguCd') || ''
  const bjdongCd = searchParams.get('bjdongCd') || ''
  const bun = searchParams.get('bun') || '0000'
  const ji = searchParams.get('ji') || '0000'
  const platGbCd = searchParams.get('platGbCd') || ''
  
  const platGbPart = platGbCd ? `&platGbCd=${platGbCd}` : ''
  const molitUrl = `https://apis.data.go.kr/1613000${endpoint}?serviceKey=${serviceKey}&sigunguCd=${sigunguCd}&bjdongCd=${bjdongCd}${platGbPart}&bun=${bun}&ji=${ji}&_type=json&numOfRows=10&pageNo=1`
  
  console.log('[MOLIT-PROXY] Calling:', molitUrl.replace(serviceKey, serviceKey.substring(0,8)+'...'))
  
  try {
    const response = await fetch(molitUrl, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    })
    const data = await response.text()
    console.log('[MOLIT-PROXY] Response status:', response.status, 'body:', data.substring(0, 200))
    
    return new NextResponse(data, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[MOLIT-PROXY] Error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
