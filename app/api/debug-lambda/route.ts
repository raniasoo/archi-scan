import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

const VWORLD_KEY = 'FFEC486D-E635-345C-9BA6-5404A5AA191B'
const VWORLD_DOMAIN = 'v0-archi-scan-layout-generator.vercel.app'
const VWORLD_BASE = 'https://api.vworld.kr/req/data'

export async function GET() {
  const results: Record<string, unknown> = {}

  // 1. 공시지가 직접 테스트 (PNU: 강남파이낸스센터)
  const pnu = '1168010800108250002'
  try {
    const params = new URLSearchParams({
      service: 'data', request: 'GetFeature', data: 'LT_C_LHPCLND',
      key: VWORLD_KEY, domain: VWORLD_DOMAIN,
      attrFilter: `pnu:=:${pnu}`,
      geometry: 'false', attribute: 'true', format: 'json', size: '10',
    })
    const res = await fetch(`${VWORLD_BASE}?${params}`, { signal: AbortSignal.timeout(10000) })
    const text = await res.text()
    results.landprice_vworld = { status: res.status, body: text.slice(0, 600) }
  } catch(e: unknown) { results.landprice_vworld = { error: String(e) } }

  // 2. LP_PA_CBND_BUBUN 폴리곤 테스트 (면적 필터로 가장 큰 필지)
  const lng = 127.0276, lat = 37.5096
  try {
    const d = 0.002
    const url = `${VWORLD_BASE}?service=data&request=GetFeature&data=LP_PA_CBND_BUBUN` +
      `&key=${VWORLD_KEY}&domain=${VWORLD_DOMAIN}&geometry=true&attribute=true` +
      `&page=1&size=10&crs=EPSG:4326` +
      `&geomFilter=BBOX(${lng-d},${lat-d},${lng+d},${lat+d})&format=json`
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    const text = await res.text()
    // 파싱해서 필지 수와 면적만 보여줌
    let summary: unknown = text.slice(0, 800)
    try {
      const json = JSON.parse(text)
      const features = json?.response?.result?.featureCollection?.features || []
      summary = features.map((f: Record<string,unknown>) => ({
        pnu: (f.properties as Record<string,unknown>)?.pnu,
        area: (f.properties as Record<string,unknown>)?.lndpclAr || (f.properties as Record<string,unknown>)?.pblntfArea,
        geomType: (f.geometry as Record<string,unknown>)?.type,
        coordCount: ((f.geometry as Record<string,unknown>)?.coordinates as unknown[][])?.length
      }))
    } catch {}
    results.parcel_bbox = { status: res.status, features: summary }
  } catch(e: unknown) { results.parcel_bbox = { error: String(e) } }

  return NextResponse.json(results)
}
