import { NextRequest, NextResponse } from 'next/server'

const VWORLD_KEY = 'FFEC486D-E635-345C-9BA6-5404A5AA191B'
const VWORLD_DOMAIN = 'v0-archi-scan-layout-generator.vercel.app'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const address = searchParams.get('address')

  if (!address) {
    return NextResponse.json({ error: 'address 파라미터 필요' }, { status: 400 })
  }

  try {
    const params = new URLSearchParams({
      service: 'address',
      request: 'getcoord',
      version: '2.0',
      crs: 'epsg:4326',
      refine: 'true',
      simple: 'false',
      format: 'json',
      type: 'road',
      key: VWORLD_KEY,
      address,
    })

    const res = await fetch(`https://api.vworld.kr/req/address?${params}`, {
      headers: {
        'Referer': `https://${VWORLD_DOMAIN}`,
        'Origin': `https://${VWORLD_DOMAIN}`,
      },
    })

    const data = await res.json()
    
    if (data?.response?.status === 'OK' && data?.response?.result?.point) {
      const point = data.response.result.point
      return NextResponse.json({
        success: true,
        lng: parseFloat(point.x),
        lat: parseFloat(point.y),
        address,
      }, {
        headers: { 'Cache-Control': 'public, max-age=86400' }
      })
    }

    // PARCEL 타입으로 재시도
    params.set('type', 'PARCEL')
    const res2 = await fetch(`https://api.vworld.kr/req/address?${params}`, {
      headers: {
        'Referer': `https://${VWORLD_DOMAIN}`,
        'Origin': `https://${VWORLD_DOMAIN}`,
      },
    })
    const data2 = await res2.json()
    
    if (data2?.response?.status === 'OK' && data2?.response?.result?.point) {
      const point = data2.response.result.point
      return NextResponse.json({
        success: true,
        lng: parseFloat(point.x),
        lat: parseFloat(point.y),
        address,
      })
    }

    return NextResponse.json({ success: false, error: '좌표 변환 실패' })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) })
  }
}
