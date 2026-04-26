import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

const KEY    = 'FFEC486D-E635-345C-9BA6-5404A5AA191B'
const DOMAIN = 'v0-archi-scan-layout-generator.vercel.app'
// 좌표로 찾은 실제 PNU
const PNU = '1168010800101580022'

export async function GET() {
  const results: Record<string, unknown> = { pnu: PNU }

  // getLandUseAttr - Vercel에서 직접 작동 확인됨, 공시지가 포함 여부 확인
  try {
    const url = `https://api.vworld.kr/ned/data/getLandUseAttr?key=${KEY}&domain=${DOMAIN}&pnu=${PNU}&cnflcAt=1&numOfRows=100&format=json`
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    const text = await res.text()
    results.getLandUseAttr = { status: res.status, body: text.slice(0, 1000) }
  } catch(e: unknown) { results.getLandUseAttr = { error: String(e) } }

  // getLandUseAttr MOLIT PNU로도 테스트
  try {
    const pnu2 = '1168010800108250002'
    const url2 = `https://api.vworld.kr/ned/data/getLandUseAttr?key=${KEY}&domain=${DOMAIN}&pnu=${pnu2}&cnflcAt=1&numOfRows=100&format=json`
    const res2 = await fetch(url2, { signal: AbortSignal.timeout(10000) })
    const text2 = await res2.text()
    results.getLandUseAttr_825 = { status: res2.status, body: text2.slice(0, 600) }
  } catch(e: unknown) { results.getLandUseAttr_825 = { error: String(e) } }

  return NextResponse.json(results)
}
