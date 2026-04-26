import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
const LAMBDA = 'https://m4wofqr3gdz5xkk4puw3gluzja0upsve.lambda-url.ap-northeast-2.on.aws/'

export async function GET() {
  const testLng = 127.0276, testLat = 37.5096  // 테헤란로 152
  const results: Record<string, unknown> = {}
  
  // parcel 테스트
  try {
    const r = await fetch(`${LAMBDA}?parcel=1&lng=${testLng}&lat=${testLat}`, { signal: AbortSignal.timeout(12000) })
    results.parcel = await r.json()
  } catch(e: unknown) { results.parcel = { error: String(e) } }

  // landprice 테스트 (테헤란로 152 PNU)
  const testPnu = '1168010600101380000'
  try {
    const r = await fetch(`${LAMBDA}?landprice=1&pnu=${testPnu}`, { signal: AbortSignal.timeout(12000) })
    results.landprice = await r.json()
  } catch(e: unknown) { results.landprice = { error: String(e) } }

  // zone 테스트
  try {
    const r = await fetch(`${LAMBDA}?lng=${testLng}&lat=${testLat}`, { signal: AbortSignal.timeout(12000) })
    results.zone = await r.json()
  } catch(e: unknown) { results.zone = { error: String(e) } }

  return NextResponse.json(results, { headers: { 'Content-Type': 'application/json' } })
}
