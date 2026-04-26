import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
const VWORLD_KEY    = 'FFEC486D-E635-345C-9BA6-5404A5AA191B'
const VWORLD_DOMAIN = 'v0-archi-scan-layout-generator.vercel.app'
const BASE = `https://api.vworld.kr/ned/data/getIndvdLandPrice?key=${VWORLD_KEY}&domain=${VWORLD_DOMAIN}`
const reqLvl = '1168010800'   // 역삼동
const reqLvl2 = '108250002'  // 825-2

export async function GET() {
  const results: Record<string, unknown> = {}
  for (const year of [2025, 2024, 2023, 2022]) {
    try {
      const url = `${BASE}&reqLvl=${reqLvl}&reqLvl2=${reqLvl2}&stdrYear=${year}&format=json`
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
      const text = await res.text()
      results[`year_${year}`] = text.slice(0, 300)
    } catch(e: unknown) { results[`year_${year}`] = String(e) }
  }
  // reqLvl만 (역삼동 전체) 2023년
  try {
    const url = `${BASE}&reqLvl=${reqLvl}&stdrYear=2023&format=json`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    results.dong_2023 = (await res.text()).slice(0, 400)
  } catch(e: unknown) { results.dong_2023 = String(e) }
  return NextResponse.json(results)
}
