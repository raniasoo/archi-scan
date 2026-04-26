import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
const KEY    = 'FFEC486D-E635-345C-9BA6-5404A5AA191B'
const DOMAIN = 'v0-archi-scan-layout-generator.vercel.app'
const pnu    = '1168010800108250002'  // 역삼동 825-2

export async function GET() {
  const results: Record<string, unknown> = {}

  // getLandCharacter - 공시지가 포함 여부 확인
  try {
    const url = `https://api.vworld.kr/ned/data/getLandCharacter?key=${KEY}&domain=${DOMAIN}&pnu=${pnu}&format=json`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    const text = await res.text()
    results.getLandChar_full = text.slice(0, 800)
  } catch(e: unknown) { results.getLandChar = String(e) }

  // getLandPrice (다른 엔드포인트 이름 시도)
  try {
    const url = `https://api.vworld.kr/ned/data/getLandPrice?key=${KEY}&domain=${DOMAIN}&pnu=${pnu}&format=json`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    results.getLandPrice = (await res.text()).slice(0, 400)
  } catch(e: unknown) { results.getLandPrice = String(e) }

  // getPblntfPclnd
  try {
    const url = `https://api.vworld.kr/ned/data/getPblntfPclnd?key=${KEY}&domain=${DOMAIN}&pnu=${pnu}&format=json`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    results.getPblntfPclnd = (await res.text()).slice(0, 400)
  } catch(e: unknown) { results.getPblntfPclnd = String(e) }

  return NextResponse.json(results)
}
