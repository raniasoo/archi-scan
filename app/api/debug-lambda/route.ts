import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
const KEY    = 'FFEC486D-E635-345C-9BA6-5404A5AA191B'
const DOMAIN = 'v0-archi-scan-layout-generator.vercel.app'
const LAMBDA = 'https://m4wofqr3gdz5xkk4puw3gluzja0upsve.lambda-url.ap-northeast-2.on.aws/'

export async function GET() {
  const results: Record<string, unknown> = {}
  const JUSO_KEY = process.env.JUSO_API_KEY || ''
  results.jusoKeySet = !!JUSO_KEY

  // 1. JUSO API로 실제 좌표 조회
  let entX = 0, entY = 0
  try {
    const jusoUrl = `https://business.juso.go.kr/addrlink/addrLinkApi.do?confmKey=${JUSO_KEY}&keyword=${encodeURIComponent('서울특별시 강남구 테헤란로 152')}&resultType=json&countPerPage=5&currentPage=1&detail=Y`
    const jRes = await fetch(jusoUrl, { signal: AbortSignal.timeout(8000) })
    const jData = await jRes.json()
    const juso = jData?.results?.juso?.[0]
    results.juso_raw = juso  // 전체 필드 반환
    entX = parseFloat(juso?.entX || '0')
    entY = parseFloat(juso?.entY || '0')
    results.coords = { entX, entY }
  } catch(e: unknown) { results.juso = { error: String(e) } }

  if (entX && entY) {
    // 2. 실제 좌표로 PNU 조회
    try {
      const url = `https://api.vworld.kr/req/data?service=data&request=GetFeature&data=LP_PA_CBND_BUBUN&geomFilter=POINT(${entX}%20${entY})&columns=pnu&format=json&key=${KEY}&domain=${DOMAIN}`
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
      const json = await res.json()
      const pnu = json?.response?.result?.featureCollection?.features?.[0]?.properties?.pnu
      results.realPnu = pnu

      // 3. 실제 PNU로 Lambda 공시지가 조회
      if (pnu) {
        const lRes = await fetch(`${LAMBDA}?landprice=1&pnu=${pnu}&lng=${entX}&lat=${entY}`, { signal: AbortSignal.timeout(12000) })
        results.lambdaPrice = await lRes.json()
      }
    } catch(e: unknown) { results.pnuLookup = { error: String(e) } }
  }

  return NextResponse.json(results)
}
