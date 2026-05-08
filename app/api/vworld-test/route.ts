import { NextRequest, NextResponse } from 'next/server'

const VWORLD_KEY = process.env.VWORLD_API_KEY

export async function GET(req: NextRequest) {
  if (!VWORLD_KEY) return NextResponse.json({ error: 'VWORLD_API_KEY not set' })
  
  const lat = 37.60785, lng = 126.96790
  
  const GOOGLE_KEY = process.env.GOOGLE_MAPS_KEY
  
  const urls: Record<string, string> = {
    esri_satellite: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${lng-0.002},${lat-0.002},${lng+0.002},${lat+0.002}&bboxSR=4326&imageSR=4326&size=600,400&format=png&f=image`,
    ...(GOOGLE_KEY ? {
      streetview_meta: `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&key=${GOOGLE_KEY}`,
      streetview_north: `https://maps.googleapis.com/maps/api/streetview?size=600x400&location=${lat},${lng}&heading=0&pitch=0&fov=90&key=${GOOGLE_KEY}`,
      streetview_south: `https://maps.googleapis.com/maps/api/streetview?size=600x400&location=${lat},${lng}&heading=180&pitch=0&fov=90&key=${GOOGLE_KEY}`,
    } : {}),
  }
  
  const results: any = { keyPrefix: VWORLD_KEY?.substring(0, 8) + '...', googleKey: GOOGLE_KEY ? GOOGLE_KEY.substring(0, 10) + '...' : 'NOT SET', tested: new Date().toISOString() }
  
  for (const [name, url] of Object.entries(urls)) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
      const buf = await res.arrayBuffer()
      const ct = res.headers.get('content-type') || ''
      const bodyText = ct.includes('json') || ct.includes('text') || ct.includes('xml')
        ? Buffer.from(buf).toString('utf8').substring(0, 200) : null
      results[name] = {
        status: res.status,
        sizeBytes: buf.byteLength,
        sizeKB: Math.round(buf.byteLength / 1024),
        contentType: ct,
        isImage: ct.includes('image'),
        bodyPreview: bodyText,
      }
    } catch (e: any) {
      results[name] = { error: e.message }
    }
  }
  
  return NextResponse.json(results)
}
