import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
const MOLIT_KEY = process.env.MOLIT_API_KEY || ''
const VWORLD_KEY = 'FFEC486D-E635-345C-9BA6-5404A5AA191B'

export async function GET() {
  const PNU = '1111018300105300015'

  // LURIS 직접 테스트
  const lurisUrl = `https://apis.data.go.kr/1611000/nsdi/LandUseService/attr/getLandUsePlan?serviceKey=${encodeURIComponent(MOLIT_KEY)}&pnu=${PNU}&returnType=json`
  let lurisResult: unknown = null
  try {
    const r = await fetch(lurisUrl, { signal: AbortSignal.timeout(8000) })
    const text = await r.text()
    lurisResult = { status: r.status, text: text.slice(0, 500) }
  } catch(e: unknown) { lurisResult = { error: String(e) } }

  // Vworld ned 직접 테스트
  const vwUrl = `https://api.vworld.kr/ned/data/getLandUseAttr?key=${VWORLD_KEY}&domain=v0-archi-scan-layout-generator.vercel.app&pnu=${PNU}&cnflcAt=1&numOfRows=100&format=json`
  let vwResult: unknown = null
  try {
    const r = await fetch(vwUrl, { signal: AbortSignal.timeout(8000) })
    const text = await r.text()
    vwResult = { status: r.status, text: text.slice(0, 500) }
  } catch(e: unknown) { vwResult = { error: String(e) } }

  return NextResponse.json({ PNU, MOLIT_KEY_SET: !!MOLIT_KEY, lurisResult, vwResult })
}
