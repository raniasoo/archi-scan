import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
const LAMBDA = 'https://m4wofqr3gdz5xkk4puw3gluzja0upsve.lambda-url.ap-northeast-2.on.aws/'
const pnu    = '1168010800108250002'

export async function GET() {
  const results: Record<string, unknown> = { pnu }
  try {
    const res = await fetch(`${LAMBDA}?landprice=1&pnu=${pnu}`, { signal: AbortSignal.timeout(12000) })
    results.lambda_landprice = await res.json()
  } catch(e: unknown) { results.lambda_landprice = { error: String(e) } }
  return NextResponse.json(results)
}
