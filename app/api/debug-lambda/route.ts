import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
const KEY    = 'FFEC486D-E635-345C-9BA6-5404A5AA191B'
const DOMAIN = 'v0-archi-scan-layout-generator.vercel.app'
const PNU    = '1168010800101580022'  // 좌표로 찾은 유효한 PNU

export async function GET() {
  const results: Record<string, unknown> = {}

  // 1. getIndvdLandPrice에 pnu 파라미터로 직접 시도
  try {
    const url = `https://api.vworld.kr/ned/data/getIndvdLandPrice?key=${KEY}&domain=${DOMAIN}&pnu=${PNU}&format=json`
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    results.indvd_pnu = { status: res.status, body: (await res.text()).slice(0, 500) }
  } catch(e: unknown) { results.indvd_pnu = { error: String(e) } }

  // 2. getIndvdLandPrice에 reqLvl + 유효한 PNU에서 추출한 reqLvl2
  const reqLvl  = PNU.slice(0, 10)  // 1168010800
  const reqLvl2 = PNU.slice(10)     // 101580022
  try {
    const url = `https://api.vworld.kr/ned/data/getIndvdLandPrice?key=${KEY}&domain=${DOMAIN}&reqLvl=${reqLvl}&reqLvl2=${reqLvl2}&stdrYear=2023&format=json`
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    results.indvd_reqLvl_2023 = { status: res.status, body: (await res.text()).slice(0, 500) }
  } catch(e: unknown) { results.indvd_reqLvl_2023 = { error: String(e) } }

  // 3. eum.go.kr 토지이음 HTML (공시지가 포함)
  try {
    const url = `https://www.eum.go.kr/web/ar/lu/luLandDet.jsp?pnu=${PNU}&isNoScr=script&mode=search`
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10000) })
    const html = await res.text()
    // 공시지가 패턴 찾기
    const priceMatch = html.match(/개별공시지가[^0-9]*([0-9,]+)\s*원/)
      || html.match(/공시지가[^0-9]*([0-9,]+)/)
      || html.match(/indvdLandPc[^0-9]*([0-9,]+)/)
    results.eum = { status: res.status, priceMatch: priceMatch?.[1], htmlSnippet: html.slice(0, 300) }
  } catch(e: unknown) { results.eum = { error: String(e) } }

  return NextResponse.json(results)
}
