import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
const VWORLD_KEY    = 'FFEC486D-E635-345C-9BA6-5404A5AA191B'
const VWORLD_DOMAIN = 'v0-archi-scan-layout-generator.vercel.app'

export async function GET() {
  // 강남파이낸스센터 PNU: 1168010800108250002
  const reqLvl  = '1168010800'  // 앞 10자리
  const reqLvl2 = '108250002'   // 뒤 9자리
  const results: Record<string, unknown> = { reqLvl, reqLvl2 }

  // reqLvl 단독 테스트
  try {
    const url = `https://api.vworld.kr/ned/data/getIndvdLandPrice?key=${VWORLD_KEY}&domain=${VWORLD_DOMAIN}&reqLvl=${reqLvl}&stdrYear=2024&format=json`
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    results.only_reqLvl = { status: res.status, body: (await res.text()).slice(0, 500) }
  } catch(e: unknown) { results.only_reqLvl = { error: String(e) } }

  // reqLvl + reqLvl2 테스트
  try {
    const url = `https://api.vworld.kr/ned/data/getIndvdLandPrice?key=${VWORLD_KEY}&domain=${VWORLD_DOMAIN}&reqLvl=${reqLvl}&reqLvl2=${reqLvl2}&stdrYear=2024&format=json`
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    results.with_reqLvl2 = { status: res.status, body: (await res.text()).slice(0, 500) }
  } catch(e: unknown) { results.with_reqLvl2 = { error: String(e) } }

  return NextResponse.json(results)
}
