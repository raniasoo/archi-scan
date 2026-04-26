import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
const KEY    = 'FFEC486D-E635-345C-9BA6-5404A5AA191B'
const DOMAIN = 'v0-archi-scan-layout-generator.vercel.app'

// 평창동 530-15 PNU
const PNU = '1111018300105300015'

export async function GET() {
  const results: Record<string, unknown> = { pnu: PNU }

  // LP_PA_CBND_BUBUN 폴리곤 전체 확인
  try {
    const params = new URLSearchParams({
      service: 'data', request: 'GetFeature', data: 'LP_PA_CBND_BUBUN',
      key: KEY, domain: DOMAIN, geometry: 'true', attribute: 'true',
      page: '1', size: '1', crs: 'EPSG:4326', format: 'json',
      attrFilter: `pnu:=:${PNU}`,
    })
    const r = await fetch(`https://api.vworld.kr/req/data?${params}`, { signal: AbortSignal.timeout(10000) })
    const j = await r.json()
    const feat = j?.response?.result?.featureCollection?.features?.[0]
    const geom = feat?.geometry

    let outerRing: unknown = null
    let pointCount = 0
    if (geom?.type === 'MultiPolygon') {
      outerRing = geom.coordinates?.[0]?.[0]  // first polygon outer ring
      pointCount = geom.coordinates?.[0]?.[0]?.length || 0
    } else if (geom?.type === 'Polygon') {
      outerRing = geom.coordinates?.[0]
      pointCount = geom.coordinates?.[0]?.length || 0
    }

    results.geomType = geom?.type
    results.pointCount = pointCount          // 실제 좌표점 개수
    results.first5pts = (outerRing as number[][])?.slice(0, 5)  // 처음 5개 좌표
    results.last3pts = (outerRing as number[][])?.slice(-3)     // 마지막 3개 좌표
    results.jiga = feat?.properties?.jiga
    results.jibun = feat?.properties?.jibun
  } catch(e: unknown) { results.error = String(e) }

  return NextResponse.json(results)
}
