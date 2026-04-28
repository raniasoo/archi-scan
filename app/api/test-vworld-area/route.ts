import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
export async function GET(req: NextRequest) {
  const bdMgtSn = req.nextUrl.searchParams.get('bdMgtSn') || '1168010600108910008028222'
  const pnu = bdMgtSn.slice(0, 19)
  const vwKey = 'FFEC486D-E635-345C-9BA6-5404A5AA191B'
  const vwDomain = 'v0-archi-scan-layout-generator.vercel.app'
  try {
    const params = new URLSearchParams({
      service: 'data', request: 'GetFeature', data: 'LP_PA_CBND_BUBUN',
      key: vwKey, domain: vwDomain, geometry: 'true', attribute: 'true',
      page: '1', size: '1', crs: 'EPSG:4326', format: 'json',
      attrFilter: `pnu:=:${pnu}`,
    })
    const res = await fetch(`https://api.vworld.kr/req/data?${params}`, { 
      signal: AbortSignal.timeout(10000),
      headers: { 'Referer': `https://${vwDomain}`, 'Origin': `https://${vwDomain}` }
    })
    const data = await res.json()
    const features = data?.response?.result?.featureCollection?.features || []
    const props = features[0]?.properties || {}
    const geom = features[0]?.geometry || {}
    let calcArea = 0
    if (geom.type === 'Polygon' && geom.coordinates?.[0]) {
      const coords = geom.coordinates[0]
      const lats = coords.map((c: number[]) => c[1])
      const cLat = (Math.min(...lats) + Math.max(...lats)) / 2
      let pa = 0
      for (let i = 0; i < coords.length - 1; i++) pa += (coords[i][0] - coords[i+1][0]) * (coords[i][1] + coords[i+1][1])
      calcArea = Math.round(Math.abs(pa / 2) * 111319 * 111319 * Math.cos(cLat * Math.PI / 180))
    }
    return NextResponse.json({
      bdMgtSn, pnu, vworldStatus: data?.response?.status,
      featuresCount: features.length,
      shapeArea: props.SHAPE_AREA || null,
      calculatedAreaM2: calcArea,
      addr: props.addr || null, pnuResult: props.pnu || null,
    })
  } catch (e) {
    return NextResponse.json({ bdMgtSn, pnu, error: String(e) })
  }
}
