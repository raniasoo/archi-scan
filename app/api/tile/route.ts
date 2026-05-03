import { NextRequest, NextResponse } from 'next/server'

const VWORLD_KEY = 'FFEC486D-E635-345C-9BA6-5404A5AA191B'
const VWORLD_DOMAIN = 'v0-archi-scan-layout-generator.vercel.app'

// VWorld 타일 프록시 (WMTS + XYZ 모두 시도)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const layer = searchParams.get('layer') || 'Base'
  const z = searchParams.get('z') || '17'
  const x = searchParams.get('x') || '0'
  const y = searchParams.get('y') || '0'

  const format = layer === 'Satellite' ? 'image/jpeg' : 'image/png'
  const ext = layer === 'Satellite' ? 'jpeg' : 'png'

  // 1) XYZ 타일 먼저 시도 (인증 불필요, 더 빠름)
  const xyzLayers: Record<string, string> = {
    'Base': 'Base',
    'Satellite': 'Satellite', 
    'Hybrid': 'Hybrid',
    'lt_c_cadastral': 'lt_c_cadastral',
  }
  
  const xyzLayerName = xyzLayers[layer] || layer
  const xyzUrl = `https://xdworld.vworld.kr/2d/${xyzLayerName}/service/${z}/${x}/${y}.${ext}`

  try {
    const xyzRes = await fetch(xyzUrl, {
      headers: {
        'Referer': `https://${VWORLD_DOMAIN}`,
        'User-Agent': 'ArchiScan/1.0',
      },
    })
    
    if (xyzRes.ok) {
      const contentType = xyzRes.headers.get('content-type')
      if (contentType && (contentType.includes('image') || contentType.includes('png') || contentType.includes('jpeg'))) {
        const buffer = await xyzRes.arrayBuffer()
        if (buffer.byteLength > 100) { // 유효한 타일 (빈 타일은 100바이트 미만)
          return new NextResponse(buffer, {
            headers: {
              'Content-Type': format,
              'Cache-Control': 'public, max-age=86400, s-maxage=86400',
            },
          })
        }
      }
    }
  } catch {}

  // 2) WMTS 타일 fallback (인증 필요)
  try {
    const wmtsUrl = `https://api.vworld.kr/req/wmts/get?service=WMTS&request=GetTile&version=1.0.0&layer=${layer}&style=default&tilematrixset=EPSG:3857&TileMatrix=${z}&TileRow=${y}&TileCol=${x}&format=${format}&key=${VWORLD_KEY}&domain=${VWORLD_DOMAIN}`
    
    const wmtsRes = await fetch(wmtsUrl, {
      headers: {
        'Referer': `https://${VWORLD_DOMAIN}`,
        'Origin': `https://${VWORLD_DOMAIN}`,
      },
    })

    if (wmtsRes.ok) {
      const contentType = wmtsRes.headers.get('content-type')
      if (contentType && contentType.includes('image')) {
        const buffer = await wmtsRes.arrayBuffer()
        if (buffer.byteLength > 100) {
          return new NextResponse(buffer, {
            headers: {
              'Content-Type': format,
              'Cache-Control': 'public, max-age=86400, s-maxage=86400',
            },
          })
        }
      }
    }
  } catch {}

  // 3) 모두 실패 시 투명 타일 반환
  const emptyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAABccqhmAAAAFElEQVR42u3BAQ0AAAgDoJvc6FrDNwAAAAlwSFlzAAAWJQAAFiUBSVIk8AAAAAd0SU1FB+YFAgAAAABJRU5ErkJggg==', 'base64')
  return new NextResponse(emptyPng, {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' },
  })
}
