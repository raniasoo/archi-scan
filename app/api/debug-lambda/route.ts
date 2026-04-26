import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
const KEY = 'FFEC486D-E635-345C-9BA6-5404A5AA191B'
const DOM = 'v0-archi-scan-layout-generator.vercel.app'

// 평창동 530-15 중심 좌표 (LP_PA_CBND_BUBUN 폴리곤 기반)
const LAT = 37.61269, LNG = 126.96799

export async function GET() {
  const results: Record<string, unknown> = {}

  // 1. Vworld WFS GetCapabilities에서 지적도 관련 레이어 찾기
  try {
    const url = `https://api.vworld.kr/req/wfs?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetCapabilities&key=${KEY}`
    const r = await fetch(url, { signal: AbortSignal.timeout(10000) })
    const text = await r.text()
    // 지적도 관련 레이어명 추출
    const matches = text.match(/Name[^>]*>([^<]*[Ll][Pp][^<]*)</g) || []
    const names = matches.map(m => m.replace(/<[^>]+>/g, '').trim()).filter(Boolean)
    results.cadastral_layers = names.slice(0, 30)
    results.total_found = names.length
  } catch(e: unknown) { results.error = String(e) }

  // 2. LP_PA_CBND (BUBUN 없는 버전) - 좌표로 조회
  try {
    const params = new URLSearchParams({
      service:'data', request:'GetFeature', data:'LP_PA_CBND',
      key:KEY, domain:DOM, geometry:'true', attribute:'true',
      page:'1', size:'3', crs:'EPSG:4326', format:'json',
      geomFilter:`POINT(${LNG}%20${LAT})`,
    })
    const r = await fetch(`https://api.vworld.kr/req/data?${params}`, {signal:AbortSignal.timeout(8000)})
    const j = await r.json()
    const feats = j?.response?.result?.featureCollection?.features || []
    results.LP_PA_CBND_coord = { status: j?.response?.status, count: feats.length, 
      sample: feats[0]?.properties }
  } catch(e:unknown) { results.LP_PA_CBND_coord = {error:String(e)} }

  return NextResponse.json(results)
}
