import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
const VWORLD_KEY = 'FFEC486D-E635-345C-9BA6-5404A5AA191B'

export async function GET() {
  const PNU = '1111018300105300015'
  const vwUrl = `https://api.vworld.kr/ned/data/getLandUseAttr?key=${VWORLD_KEY}&domain=v0-archi-scan-layout-generator.vercel.app&pnu=${PNU}&cnflcAt=1&numOfRows=100&format=json`
  const r = await fetch(vwUrl, { signal: AbortSignal.timeout(10000) })
  const text = await r.text()
  // 전체 응답 파싱
  const json = JSON.parse(text)
  const fields = json?.landUses?.field || []
  // 모든 prposAreaDstrcCodeNm 추출
  const allZones = fields.map((f: Record<string,unknown>) => ({
    code: f.prposAreaDstrcCode,
    name: f.prposAreaDstrcCodeNm,
  }))
  return NextResponse.json({ total: fields.length, allZones })
}
