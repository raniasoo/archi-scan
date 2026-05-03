import { NextRequest, NextResponse } from 'next/server'

const VWORLD_KEY = 'FFEC486D-E635-345C-9BA6-5404A5AA191B'
const VWORLD_DOMAIN = 'v0-archi-scan-layout-generator.vercel.app'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET',
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const layer = searchParams.get('layer') || 'Base'
  const z = searchParams.get('z') || '17'
  const x = searchParams.get('x') || '0'
  const y = searchParams.get('y') || '0'

  const format = layer === 'Satellite' ? 'image/jpeg' : 'image/png'
  const ext = layer === 'Satellite' ? 'jpeg' : 'png'

  const xyzLayers: Record<string, string> = {
    'Base': 'Base', 'Satellite': 'Satellite', 'Hybrid': 'Hybrid',
    'lt_c_cadastral': 'lt_c_cadastral',
  }
  const xyzLayerName = xyzLayers[layer] || layer
  const xyzUrl = `https://xdworld.vworld.kr/2d/${xyzLayerName}/service/${z}/${x}/${y}.${ext}`

  try {
    const r = await fetch(xyzUrl, {
      headers: { 'Referer': `https://${VWORLD_DOMAIN}`, 'User-Agent': 'ArchiScan/1.0' },
    })
    if (r.ok) {
      const ct = r.headers.get('content-type')
      if (ct && (ct.includes('image') || ct.includes('png') || ct.includes('jpeg'))) {
        const buf = await r.arrayBuffer()
        if (buf.byteLength > 100) {
          return new NextResponse(buf, {
            headers: { 'Content-Type': format, 'Cache-Control': 'public, max-age=86400, s-maxage=86400', ...CORS },
          })
        }
      }
    }
  } catch {}

  try {
    const wmtsUrl = `https://api.vworld.kr/req/wmts/get?service=WMTS&request=GetTile&version=1.0.0&layer=${layer}&style=default&tilematrixset=EPSG:3857&TileMatrix=${z}&TileRow=${y}&TileCol=${x}&format=${format}&key=${VWORLD_KEY}&domain=${VWORLD_DOMAIN}`
    const r = await fetch(wmtsUrl, {
      headers: { 'Referer': `https://${VWORLD_DOMAIN}`, 'Origin': `https://${VWORLD_DOMAIN}` },
    })
    if (r.ok) {
      const ct = r.headers.get('content-type')
      if (ct && ct.includes('image')) {
        const buf = await r.arrayBuffer()
        if (buf.byteLength > 100) {
          return new NextResponse(buf, {
            headers: { 'Content-Type': format, 'Cache-Control': 'public, max-age=86400, s-maxage=86400', ...CORS },
          })
        }
      }
    }
  } catch {}

  const emptyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAABccqhmAAAAFElEQVR42u3BAQ0AAAgDoJvc6FrDNwAAAAlwSFlzAAAWJQAAFiUBSVIk8AAAAAd0SU1FB+YFAgAAAABJRU5ErkJggg==', 'base64')
  return new NextResponse(emptyPng, {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600', ...CORS },
  })
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: { ...CORS, 'Access-Control-Allow-Headers': 'Content-Type' } })
}
