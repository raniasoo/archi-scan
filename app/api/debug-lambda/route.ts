import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function GET() {
  // /api/vworld에 bdMgtSn 포함해서 직접 POST 테스트
  const res = await fetch('https://v0-archi-scan-layout-generator.vercel.app/api/vworld', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      address: '서울특별시 종로구 평창길 180-4',
      siteArea: 698,
      entX: 0, entY: 0,
      bdMgtSn: '1168010100107370000023659',  // 틀린 값
    }),
    signal: AbortSignal.timeout(15000),
  })
  const d1 = await res.json()

  // 올바른 bdMgtSn으로 테스트
  const res2 = await fetch('https://v0-archi-scan-layout-generator.vercel.app/api/vworld', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      address: '서울특별시 종로구 평창길 180-4',
      siteArea: 698,
      entX: 0, entY: 0,
      bdMgtSn: '1111018300105300015023302',  // 올바른 bdMgtSn
    }),
    signal: AbortSignal.timeout(15000),
  })
  const d2 = await res2.json()

  return NextResponse.json({
    wrong_bdMgtSn: { source: d1?.parcel?.source, coordsLen: d1?.parcel?.coordinates?.length },
    correct_bdMgtSn: { source: d2?.parcel?.source, coordsLen: d2?.parcel?.coordinates?.length, pnu: d2?.parcel?.pnu },
  })
}
