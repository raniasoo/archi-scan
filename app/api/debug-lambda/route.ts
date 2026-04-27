import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function GET() {
  // zone-lookup API 직접 테스트 (평창동 530-15)
  const res = await fetch('https://v0-archi-scan-layout-generator.vercel.app/api/zone-lookup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sigunguCd: '11110',
      bjdongCd: '18300',
      bun: '0530',
      ji: '0015',
      address: '서울특별시 종로구 평창길 180-4',
      entX: 126.96799,
      entY: 37.61265,
    }),
  })
  const d = await res.json()
  return NextResponse.json({ status: res.status, result: d })
}
