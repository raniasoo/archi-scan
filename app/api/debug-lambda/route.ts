import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
const KEY    = 'FFEC486D-E635-345C-9BA6-5404A5AA191B'
const DOMAIN = 'v0-archi-scan-layout-generator.vercel.app'

export async function GET() {
  const results: Record<string, unknown> = {}
  const JUSO_KEY = process.env.JUSO_API_KEY || ''

  // 1. JUSO로 평창길 180-4 bdMgtSn 조회
  let bdMgtSn = ''
  try {
    const url = `https://business.juso.go.kr/addrlink/addrLinkApi.do?confmKey=${JUSO_KEY}&keyword=${encodeURIComponent('서울특별시 종로구 평창길 180-4')}&resultType=json&countPerPage=5&currentPage=1&detail=Y`
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) })
    const d = await r.json()
    const juso = d?.results?.juso?.[0]
    bdMgtSn = juso?.bdMgtSn || ''
    results.juso = { bdMgtSn, jibunAddr: juso?.jibunAddr, roadAddr: juso?.roadAddr, admCd: juso?.admCd }
  } catch(e: unknown) { results.juso = { error: String(e) } }

  if (bdMgtSn.length >= 19) {
    const pnu = bdMgtSn.slice(0, 19)
    results.pnu = pnu

    // 2. LP_PA_CBND_BUBUN으로 해당 PNU 정보 + 공시지가
    try {
      const params = new URLSearchParams({
        service: 'data', request: 'GetFeature', data: 'LP_PA_CBND_BUBUN',
        key: KEY, domain: DOMAIN,
        attrFilter: `pnu:=:${pnu}`,
        geometry: 'true', attribute: 'true', format: 'json', size: '1',
      })
      const r = await fetch(`https://api.vworld.kr/req/data?${params}`, { signal: AbortSignal.timeout(10000) })
      const j = await r.json()
      const feat = j?.response?.result?.featureCollection?.features?.[0]
      results.parcel = {
        props: feat?.properties,
        geomType: feat?.geometry?.type,
        coordsCount: feat?.geometry?.coordinates?.[0]?.length,
      }
    } catch(e: unknown) { results.parcel = { error: String(e) } }
  }

  return NextResponse.json(results)
}
