import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

const VWORLD_KEY    = 'FFEC486D-E635-345C-9BA6-5404A5AA191B'
const VWORLD_DOMAIN = 'v0-archi-scan-layout-generator.vercel.app'

export async function GET() {
  const pnu = '1168010800108250002'  // 강남파이낸스센터 역삼동 825-2
  const year = 2024
  const results: Record<string, unknown> = { pnu, year }

  // NED getIndvdLandPrice 테스트
  try {
    const url = `https://api.vworld.kr/ned/data/getIndvdLandPrice?key=${VWORLD_KEY}&domain=${VWORLD_DOMAIN}&pnu=${pnu}&stdrYear=${year}&format=json`
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    const text = await res.text()
    results.ned_landprice = { status: res.status, body: text.slice(0, 600) }
  } catch(e: unknown) { results.ned_landprice = { error: String(e) } }

  // 다른 PNU 형식 시도 (앞 5자리 다를 수 있음)
  const pnu2 = '1168010800108250000'
  try {
    const url2 = `https://api.vworld.kr/ned/data/getIndvdLandPrice?key=${VWORLD_KEY}&domain=${VWORLD_DOMAIN}&pnu=${pnu2}&stdrYear=${year}&format=json`
    const res2 = await fetch(url2, { signal: AbortSignal.timeout(10000) })
    const text2 = await res2.text()
    results.ned_pnu2 = { status: res2.status, body: text2.slice(0, 400) }
  } catch(e: unknown) { results.ned_pnu2 = { error: String(e) } }

  // getLandCharacter 비교 (잘 되는 것)
  try {
    const url3 = `https://api.vworld.kr/ned/data/getLandCharacter?key=${VWORLD_KEY}&domain=${VWORLD_DOMAIN}&pnu=${pnu}&format=json`
    const res3 = await fetch(url3, { signal: AbortSignal.timeout(10000) })
    const text3 = await res3.text()
    results.ned_landchar = { status: res3.status, body: text3.slice(0, 400) }
  } catch(e: unknown) { results.ned_landchar = { error: String(e) } }

  return NextResponse.json(results)
}
