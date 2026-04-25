import { NextRequest, NextResponse } from 'next/server'

const VWORLD_KEY = process.env.VWORLD_API_KEY || 'FFEC486D-E635-345C-9BA6-5404A5AA191B'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'wmts'

  if (type === 'wmts') {
    // Vworld WMTS 타일 (z/x/y 슬리피맵 표준)
    const z = searchParams.get('z') || '17'
    const x = searchParams.get('x') || '0'
    const y = searchParams.get('y') || '0'

    // Vworld WMTS: .../Base/GoogleMapsCompatible/{TileMatrix}/{TileRow}/{TileCol}
    // TileRow = y (북→남), TileCol = x (서→동)
    const url = `https://api.vworld.kr/req/wmts/1.0.0/Base/GoogleMapsCompatible/${z}/${y}/${x}.png?key=${VWORLD_KEY}`

    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) })
      if (!res.ok) {
        // Fallback: OSM 타일
        const osmRes = await fetch(`https://tile.openstreetmap.org/${z}/${x}/${y}.png`, {
          signal: AbortSignal.timeout(6000),
          headers: { 'User-Agent': 'ArchiScan/1.0' }
        })
        if (!osmRes.ok) return new NextResponse('tile fetch failed', { status: 502 })
        const buf = await osmRes.arrayBuffer()
        return new NextResponse(buf, {
          headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' }
        })
      }
      const buffer = await res.arrayBuffer()
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=86400',
          'Access-Control-Allow-Origin': '*',
        }
      })
    } catch {
      return new NextResponse('timeout', { status: 504 })
    }
  }

  // WMS 방식 (bbox 기반)
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
