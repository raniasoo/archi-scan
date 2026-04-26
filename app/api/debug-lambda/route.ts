import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
const KEY    = 'FFEC486D-E635-345C-9BA6-5404A5AA191B'
const DOMAIN = 'v0-archi-scan-layout-generator.vercel.app'

export async function GET() {
  const BD_MGTSN = '1168010100107370000023659'
  const pnu = BD_MGTSN.slice(0, 19)  // 1168010100107370000
  const results: Record<string, unknown> = { pnu }

  // 직접 land-price API 호출 (bdMgtSn 포함)
  try {
    const res = await fetch('https://v0-archi-scan-layout-generator.vercel.app/api/land-price', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: '서울특별시 강남구 테헤란로 152',
        bdMgtSn: BD_MGTSN,
        siteArea: 13157,
      }),
      signal: AbortSignal.timeout(15000),
    })
    results.landPriceApi = await res.json()
  } catch(e: unknown) { results.landPriceApi = { error: String(e) } }

  // LP_PA_CBND_BUBUN 직접 테스트
  try {
    const params = new URLSearchParams({
      service: 'data', request: 'GetFeature', data: 'LP_PA_CBND_BUBUN',
      key: KEY, domain: DOMAIN,
      attrFilter: `pnu:=:${pnu}`,
      geometry: 'false', attribute: 'true', format: 'json', size: '1',
    })
    const r = await fetch(`https://api.vworld.kr/req/data?${params}`, { signal: AbortSignal.timeout(10000) })
    const j = await r.json()
    const props = j?.response?.result?.featureCollection?.features?.[0]?.properties
    results.direct_jiga = props?.jiga
    results.direct_props = props
  } catch(e: unknown) { results.direct = { error: String(e) } }

  return NextResponse.json(results)
}
