import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
const KEY    = 'FFEC486D-E635-345C-9BA6-5404A5AA191B'
const DOMAIN = 'v0-archi-scan-layout-generator.vercel.app'
const BASE   = `https://api.vworld.kr/ned/data/getIndvdLandPrice?key=${KEY}&domain=${DOMAIN}&format=json`

async function test(label: string, reqLvl: string, reqLvl2?: string, year = 2023) {
  const url = reqLvl2
    ? `${BASE}&reqLvl=${reqLvl}&reqLvl2=${reqLvl2}&stdrYear=${year}`
    : `${BASE}&reqLvl=${reqLvl}&stdrYear=${year}`
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  const text = await res.text()
  return { label, totalCount: text.match(/"totalCount"\s*:\s*"(\d+)"/)?.[1], body: text.slice(0, 400) }
}

export async function GET() {
  const results = await Promise.all([
    // 825-2번지 (MOLIT 반환값) - 다양한 형식
    test('825-2_9자리_2023', '1168010800', '108250002', 2023),
    test('825-2_8자리_2023', '1168010800', '08250002', 2023),   // 산/일반 없이
    test('825-2_9자리_2022', '1168010800', '108250002', 2022),
    // 158-22번지 (Vworld 좌표 반환값)
    test('158-22_9자리_2023', '1168010800', '101580022', 2023),
    test('158-22_9자리_2022', '1168010800', '101580022', 2022),
    // 역삼동 전체 2023 (reqLvl2 없이)
    test('역삼동전체_2023', '1168010800', undefined, 2023),
    test('역삼동전체_2022', '1168010800', undefined, 2022),
  ])
  return NextResponse.json(Object.fromEntries(results.map(r => [r.label, { count: r.totalCount, body: r.body }])))
}
