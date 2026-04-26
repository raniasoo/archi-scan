import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
const KEY = 'FFEC486D-E635-345C-9BA6-5404A5AA191B'
const DOM = 'v0-archi-scan-layout-generator.vercel.app'
const LAT = 37.61269, LNG = 126.96799

// 연속지적도 관련 가능한 레이어명 목록
const LAYERS = [
  'LT_C_LSCT_INFO',    // 연속지적도 - 토지 
  'LT_C_ADEMD_INFO',   // 연속지적도 - 읍면동
  'AL_D010',           // 지적도 - 토지 경계
  'LP_BF_LSCT',        // 지적도 관련
  'LP_PA_CBND',        // 개별공시지가 (BUBUN 없이)
]

export async function GET() {
  const results: Record<string, unknown> = {}
  
  for (const layer of LAYERS) {
    try {
      const params = new URLSearchParams({
        service:'data', request:'GetFeature', data:layer,
        key:KEY, domain:DOM, geometry:'true', attribute:'true',
        page:'1', size:'1', crs:'EPSG:4326', format:'json',
        geomFilter:`POINT(${LNG}%20${LAT})`,
      })
      const r = await fetch(`https://api.vworld.kr/req/data?${params}`, {signal:AbortSignal.timeout(6000)})
      const j = await r.json()
      const status = j?.response?.status
      const feats = j?.response?.result?.featureCollection?.features||[]
      results[layer] = { status, count: feats.length, props: feats[0]?.properties||null }
    } catch(e:unknown) { results[layer] = {error:String(e).slice(0,50)} }
  }
  
  return NextResponse.json(results)
}
