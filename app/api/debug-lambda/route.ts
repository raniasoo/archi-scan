import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function GET() {
  // land-price API POST 직접 호출해서 isDemo 값 확인
  const res = await fetch('https://v0-archi-scan-layout-generator.vercel.app/api/land-price', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      address: '서울특별시 강남구 테헤란로 152',
      bdMgtSn: '1168010100107370000023659',
      siteArea: 13157,
    }),
    signal: AbortSignal.timeout(15000),
  })
  const data = await res.json()
  return NextResponse.json({
    landPricePerM2: data.landPricePerM2,
    isDemo: data.isDemo,
    source: data.source,
    stdrYear: data.stdrYear,
    via: data.via,
  })
}
