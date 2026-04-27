import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function GET() {
  // /api/vworld-zone POST 직접 테스트
  const res = await fetch('https://v0-archi-scan-layout-generator.vercel.app/api/vworld-zone', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sigunguCd: '11110', bjdongCd: '18300', bun: '0530', ji: '0015' }),
  })
  const d = await res.json()
  return NextResponse.json({ status: res.status, result: d })
}
