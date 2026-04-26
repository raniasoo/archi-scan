import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function GET() {
  const results: Record<string,unknown> = {}

  // Nominatim 지번 주소 검색
  const addrs = [
    '서울특별시 종로구 평창동 530-15',
    '서울 평창동 530-15',
    '서울 종로구 평창동 530',
  ]
  for (const q of addrs) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&countrycodes=kr&limit=3&polygon_geojson=1`
      const r = await fetch(url, { headers:{'User-Agent':'ArchiScan/1.0'}, signal:AbortSignal.timeout(8000) })
      const d = await r.json()
      results[q] = d.map((x:Record<string,unknown>) => ({
        display_name: x.display_name,
        type: x.type,
        osm_type: x.osm_type,
        lat: x.lat, lon: x.lon,
        geojson_type: (x.geojson as Record<string,unknown>)?.type,
        coords_len: ((x.geojson as Record<string,unknown>)?.coordinates as unknown[])?.length,
      }))
    } catch(e:unknown) { results[q] = { error:String(e) } }
  }

  return NextResponse.json(results)
}
