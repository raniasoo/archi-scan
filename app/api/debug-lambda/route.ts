import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
const LAMBDA = 'https://m4wofqr3gdz5xkk4puw3gluzja0upsve.lambda-url.ap-northeast-2.on.aws/'
const KEY    = 'FFEC486D-E635-345C-9BA6-5404A5AA191B'
const DOMAIN = 'v0-archi-scan-layout-generator.vercel.app'

// 강남파이낸스센터: JUSO→역삼동 737, admCd=1168010100
// PNU = 11680(강남구) + 10800(역삼동법정동) + 1 + 0737 + 0000
const PNU_737 = '1168010800107370000'
// 이전 좌표 기반 PNU
const PNU_158 = '1168010800101580022'

export async function GET() {
  const results: Record<string, unknown> = {}

  // 1. 역삼동 737 PNU로 Lambda 공시지가
  try {
    const r = await fetch(`${LAMBDA}?landprice=1&pnu=${PNU_737}`, { signal: AbortSignal.timeout(12000) })
    results.price_737 = await r.json()
  } catch(e: unknown) { results.price_737 = { error: String(e) } }

  // 2. 역삼동 158-22 PNU로 Lambda 공시지가
  try {
    const r = await fetch(`${LAMBDA}?landprice=1&pnu=${PNU_158}`, { signal: AbortSignal.timeout(12000) })
    results.price_158 = await r.json()
  } catch(e: unknown) { results.price_158 = { error: String(e) } }

  // 3. getLandUseAttr으로 역삼동 737 PNU 직접 확인 (Vercel에서 작동)
  try {
    const url = `https://api.vworld.kr/ned/data/getLandUseAttr?key=${KEY}&domain=${DOMAIN}&pnu=${PNU_737}&cnflcAt=1&numOfRows=10&format=json`
    const r = await fetch(url, { signal: AbortSignal.timeout(10000) })
    results.landUse_737 = { status: r.status, body: (await r.text()).slice(0, 600) }
  } catch(e: unknown) { results.landUse_737 = { error: String(e) } }

  return NextResponse.json(results)
}
