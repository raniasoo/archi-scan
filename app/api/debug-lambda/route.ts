import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
const LAMBDA = 'https://m4wofqr3gdz5xkk4puw3gluzja0upsve.lambda-url.ap-northeast-2.on.aws/'
// 강남파이낸스센터 좌표 + MOLIT PNU
const pnu = '1168010800108250002'
const lng = 127.0276, lat = 37.5096

export async function GET() {
  const results: Record<string, unknown> = { pnu, lng, lat }
  // 좌표 포함해서 Lambda v11 호출
  try {
    const res = await fetch(`${LAMBDA}?landprice=1&pnu=${pnu}&lng=${lng}&lat=${lat}`, { signal: AbortSignal.timeout(15000) })
    results.lambda_v11 = await res.json()
  } catch(e: unknown) { results.lambda_v11 = { error: String(e) } }
  return NextResponse.json(results)
}
