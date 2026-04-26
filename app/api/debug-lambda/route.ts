import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
const KEY = 'FFEC486D-E635-345C-9BA6-5404A5AA191B'
const DOM = 'v0-archi-scan-layout-generator.vercel.app'

// 카카오맵에서 확인한 평창동 530-15 중심 좌표 (조금 더 정확하게)
const LAT = 37.61265, LNG = 126.96799

export async function GET() {
  const results: Record<string, unknown> = {}

  // 방법1: geomFilter POINT로 LP_PA_CBND_BUBUN 조회 (attrFilter 대신)
  try {
    const params = new URLSearchParams({
      service: 'data', request: 'GetFeature', data: 'LP_PA_CBND_BUBUN',
      key: KEY, domain: DOM, geometry: 'true', attribute: 'true',
      page: '1', size: '5', crs: 'EPSG:4326', format: 'json',
      geomFilter: `POINT(${LNG} ${LAT})`,
    })
    const r = await fetch(`https://api.vworld.kr/req/data?${params}`, { signal: AbortSignal.timeout(10000) })
    const j = await r.json()
    const feats = j?.response?.result?.featureCollection?.features || []
    results.byPoint = {
      count: feats.length,
      items: feats.map((f: Record<string,unknown>) => {
        const p = f?.properties as Record<string,unknown>
        const geom = f?.geometry as Record<string,unknown>
        let ring: number[][] = []
        if (geom?.type === 'MultiPolygon') ring = (geom.coordinates as number[][][][])?.[0]?.[0] || []
        else if (geom?.type === 'Polygon') ring = (geom.coordinates as number[][][])?.[0] || []
        return { jibun: p?.jibun, pnu: p?.pnu, points: ring.length, coords: ring }
      })
    }
  } catch(e: unknown) { results.byPoint = { error: String(e) } }

  // 방법2: bbox로 주변 필지 전체 조회 (530-15 주변 10개)
  try {
    // 카카오맵 15번 중심 기준 bbox
    const bbox = `${LNG-0.001},${LAT-0.001},${LNG+0.001},${LAT+0.001}`
    const params = new URLSearchParams({
      service: 'data', request: 'GetFeature', data: 'LP_PA_CBND_BUBUN',
      key: KEY, domain: DOM, geometry: 'true', attribute: 'true',
      page: '1', size: '10', crs: 'EPSG:4326', format: 'json',
      bbox,
    })
    const r = await fetch(`https://api.vworld.kr/req/data?${params}`, { signal: AbortSignal.timeout(10000) })
    const j = await r.json()
    const feats = j?.response?.result?.featureCollection?.features || []
    results.byBbox = {
      count: feats.length,
      jibuns: feats.map((f: Record<string,unknown>) => (f?.properties as Record<string,unknown>)?.jibun)
    }
  } catch(e: unknown) { results.byBbox = { error: String(e) } }

  return NextResponse.json(results)
}
