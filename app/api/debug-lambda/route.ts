import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
const KEY    = 'FFEC486D-E635-345C-9BA6-5404A5AA191B'
const DOMAIN = 'v0-archi-scan-layout-generator.vercel.app'
const PNU    = '1111018300105300015'

export async function GET() {
  const results: Record<string, unknown> = {}

  // LP_PA_CBND (BUBUN 아닌 전체 필지 경계) 시도
  for (const layer of ['LP_PA_CBND', 'LT_C_LSCT_INFO', 'LT_C_ADSGG_INFO']) {
    try {
      const params = new URLSearchParams({
        service: 'data', request: 'GetFeature', data: layer,
        key: KEY, domain: DOMAIN, geometry: 'true', attribute: 'true',
        page: '1', size: '1', crs: 'EPSG:4326', format: 'json',
        attrFilter: `pnu:=:${PNU}`,
      })
      const r = await fetch(`https://api.vworld.kr/req/data?${params}`, { signal: AbortSignal.timeout(8000) })
      const j = await r.json()
      const status = j?.response?.status
      const features = j?.response?.result?.featureCollection?.features || []
      const feat = features[0]
      const geom = feat?.geometry
      let ring = null
      if (geom?.type === 'MultiPolygon') ring = geom.coordinates?.[0]?.[0]
      else if (geom?.type === 'Polygon') ring = geom.coordinates?.[0]
      results[layer] = {
        status, features: features.length,
        geomType: geom?.type, pointCount: ring?.length || 0,
        jibun: feat?.properties?.jibun || feat?.properties?.bjd_nm || feat?.properties?.addr,
      }
    } catch(e: unknown) { results[layer] = { error: String(e) } }
  }

  return NextResponse.json(results)
}
