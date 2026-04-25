import { NextRequest, NextResponse } from 'next/server'

const VWORLD_KEY = process.env.VWORLD_API_KEY || 'FFEC486D-E635-345C-9BA6-5404A5AA191B'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const minx = searchParams.get('minx') || ''
  const miny = searchParams.get('miny') || ''
  const maxx = searchParams.get('maxx') || ''
  const maxy = searchParams.get('maxy') || ''
  const width = searchParams.get('w') || '400'
  const height = searchParams.get('h') || '400'
  const layer = searchParams.get('layer') || 'lt_c_lhpclnd'

  if (!minx || !miny || !maxx || !maxy) {
    return new NextResponse('bbox required', { status: 400 })
  }

  // 배경지도 + 지적도 레이어 합성
  const wmsUrl = `https://api.vworld.kr/req/wms?SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1` +
    `&LAYERS=${layer}&SRS=EPSG:4326` +
    `&BBOX=${minx},${miny},${maxx},${maxy}` +
    `&WIDTH=${width}&HEIGHT=${height}` +
    `&FORMAT=image/png&TRANSPARENT=true` +
    `&key=${VWORLD_KEY}`

  try {
    const res = await fetch(wmsUrl, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return new NextResponse('map fetch failed', { status: 502 })
    const buffer = await res.arrayBuffer()
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      }
    })
  } catch {
    return new NextResponse('timeout', { status: 504 })
  }
}
