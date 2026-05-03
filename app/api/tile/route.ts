import { NextRequest, NextResponse } from 'next/server'

const VWORLD_KEY = 'FFEC486D-E635-345C-9BA6-5404A5AA191B'
const VWORLD_DOMAIN = 'v0-archi-scan-layout-generator.vercel.app'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const layer = searchParams.get('layer') || 'Base'
  const z = searchParams.get('z') || '17'
  const x = searchParams.get('x') || '0'
  const y = searchParams.get('y') || '0'

  const format = layer === 'Satellite' ? 'image/jpeg' : 'image/png'

  const tileUrl = `https://api.vworld.kr/req/wmts/get?service=WMTS&request=GetTile&version=1.0.0&layer=${layer}&style=default&tilematrixset=EPSG:3857&TileMatrix=${z}&TileRow=${y}&TileCol=${x}&format=${format}&key=${VWORLD_KEY}&domain=${VWORLD_DOMAIN}`

  try {
    const res = await fetch(tileUrl, {
      headers: {
        'Referer': `https://${VWORLD_DOMAIN}`,
        'Origin': `https://${VWORLD_DOMAIN}`,
      },
    })

    if (!res.ok) {
      // 빈 투명 PNG 반환 (타일 로딩 실패 시)
      const emptyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAAlwSFlzAAAWJQAAFiUBSVIk8AAAAA0lEQVQI12P4z8BQDwAEgAF/QualzQAAAABJRU5ErkJggg==', 'base64')
      return new NextResponse(emptyPng, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=3600',
        },
      })
    }

    const buffer = await res.arrayBuffer()
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': format,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    })
  } catch {
    // 빈 투명 타일 반환
    const emptyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAAlwSFlzAAAWJQAAFiUBSVIk8AAAAA0lEQVQI12P4z8BQDwAEgAF/QualzQAAAABJRU5ErkJggg==', 'base64')
    return new NextResponse(emptyPng, {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' },
    })
  }
}
