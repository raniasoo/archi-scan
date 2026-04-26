import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

const PNU = '1168010100107370000'
// VWORLD_API_KEY env var 사용 (land-price와 동일)
const VWORLD_KEY_ENV = process.env.VWORLD_API_KEY || 'FALLBACK'
const VWORLD_KEY_HARD = 'FFEC486D-E635-345C-9BA6-5404A5AA191B'
const DOMAIN = 'v0-archi-scan-layout-generator.vercel.app'

export async function GET() {
  const results: Record<string, unknown> = {
    envKeySet: !!process.env.VWORLD_API_KEY,
    envKeyFirst8: process.env.VWORLD_API_KEY?.slice(0, 8),
    hardKeyFirst8: VWORLD_KEY_HARD.slice(0, 8),
    keysMatch: VWORLD_KEY_ENV === VWORLD_KEY_HARD,
  }

  // 1. env 키로 LP_PA_CBND_BUBUN 조회
  try {
    const params = new URLSearchParams({
      service: 'data', request: 'GetFeature', data: 'LP_PA_CBND_BUBUN',
      key: VWORLD_KEY_ENV, domain: DOMAIN,
      attrFilter: `pnu:=:${PNU}`,
      geometry: 'false', attribute: 'true', format: 'json', size: '1',
    })
    const r = await fetch(`https://api.vworld.kr/req/data?${params}`, { signal: AbortSignal.timeout(10000) })
    const j = await r.json()
    const props = j?.response?.result?.featureCollection?.features?.[0]?.properties
    results.env_key_jiga = props?.jiga ?? j?.response?.status ?? 'no-features'
  } catch(e: unknown) { results.env_key = { error: String(e) } }

  // 2. 하드코딩 키로 LP_PA_CBND_BUBUN 조회 (항상 작동 확인됨)
  try {
    const params = new URLSearchParams({
      service: 'data', request: 'GetFeature', data: 'LP_PA_CBND_BUBUN',
      key: VWORLD_KEY_HARD, domain: DOMAIN,
      attrFilter: `pnu:=:${PNU}`,
      geometry: 'false', attribute: 'true', format: 'json', size: '1',
    })
    const r = await fetch(`https://api.vworld.kr/req/data?${params}`, { signal: AbortSignal.timeout(10000) })
    const j = await r.json()
    const props = j?.response?.result?.featureCollection?.features?.[0]?.properties
    results.hard_key_jiga = props?.jiga ?? 'no-features'
  } catch(e: unknown) { results.hard_key = { error: String(e) } }

  return NextResponse.json(results)
}
