import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
const VWORLD_KEY = 'FFEC486D-E635-345C-9BA6-5404A5AA191B'

export async function GET() {
  const PNU = '1111018300105300015'
  
  // fetchByVworldAttr 로직 직접 실행
  const url = `https://api.vworld.kr/ned/data/getLandUseAttr?key=${VWORLD_KEY}&domain=v0-archi-scan-layout-generator.vercel.app&pnu=${PNU}&cnflcAt=1&numOfRows=100&format=json`
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
  const text = await res.text()
  const json = JSON.parse(text)
  const list = json?.landUses?.field || []
  
  const zoneItem = list.find((item: Record<string,unknown>) => {
    const code = item?.prposAreaDstrcCode as string || ''
    if (code.startsWith('UQA1') || code.startsWith('UQA2') || 
        code.startsWith('UQA3') || code.startsWith('UQA4')) return true
    const name = item?.prposAreaDstrcCodeNm as string || ''
    return name.includes('주거') || name.includes('상업') || 
           name.includes('공업') || name.includes('녹지') || name.includes('관리')
  })
  
  return NextResponse.json({
    listLength: list.length,
    zoneItemFound: !!zoneItem,
    zoneCode: zoneItem?.prposAreaDstrcCode,
    zoneName: zoneItem?.prposAreaDstrcCodeNm,
    all: list.map((i: Record<string,unknown>) => ({ code: i.prposAreaDstrcCode, name: i.prposAreaDstrcCodeNm }))
  })
}
