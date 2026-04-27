import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

const KEY = 'FFEC486D-E635-345C-9BA6-5404A5AA191B'
const DOM = 'v0-archi-scan-layout-generator.vercel.app'

function toCode(raw: string): string {
  if (!raw) return ''
  if (raw.includes('제1종전용') || raw.includes('제1종 전용')) return 'residential-exclusive-1'
  if (raw.includes('제2종전용') || raw.includes('제2종 전용')) return 'residential-exclusive-2'
  if (raw.includes('제1종일반') || raw.includes('제1종 일반')) return 'residential-1'
  if (raw.includes('제2종일반') || raw.includes('제2종 일반')) return 'residential-2'
  if (raw.includes('제3종일반') || raw.includes('제3종 일반')) return 'residential-3'
  if (raw.includes('준주거'))   return 'semi-residential'
  if (raw.includes('근린상업')) return 'commercial-neighborhood'
  if (raw.includes('중심상업')) return 'commercial-central'
  if (raw.includes('일반상업')) return 'commercial-general'
  if (raw.includes('전용공업')) return 'industrial-exclusive'
  if (raw.includes('일반공업')) return 'industrial-general'
  if (raw.includes('준공업'))   return 'industrial-semi'
  if (raw.includes('자연녹지')) return 'green-natural'
  if (raw.includes('생산녹지')) return 'green-production'
  if (raw.includes('보전녹지')) return 'green-conservation'
  return ''
}
const HEIGHT: Record<string,number> = {
  'residential-exclusive-1':9,'residential-exclusive-2':12,
  'residential-1':12,'residential-2':20,'residential-3':30,
  'semi-residential':45,'commercial-neighborhood':45,'commercial-central':200,
  'commercial-general':60,'industrial-exclusive':30,'industrial-general':30,
  'industrial-semi':30,'green-natural':20,'green-production':20,'green-conservation':20,
}
const BCR: Record<string,number> = {
  'residential-exclusive-1':50,'residential-exclusive-2':50,
  'residential-1':60,'residential-2':60,'residential-3':50,'semi-residential':70,
  'commercial-neighborhood':70,'commercial-central':90,'commercial-general':80,
  'industrial-general':70,'green-natural':20,
}
const FAR: Record<string,number> = {
  'residential-exclusive-1':100,'residential-exclusive-2':150,
  'residential-1':200,'residential-2':250,'residential-3':300,'semi-residential':500,
  'commercial-neighborhood':900,'commercial-central':1500,'commercial-general':1300,
  'industrial-general':400,'green-natural':100,
}

export async function POST(req: NextRequest) {
  const { sigunguCd, bjdongCd, bun, ji } = await req.json()
  if (!sigunguCd || !bjdongCd) return NextResponse.json({ success: false, zoneCode: '' })
  const cleanBun = (bun||'0000').replace(/\D/g,'').padStart(4,'0')
  const cleanJi  = (ji||'0000').replace(/\D/g,'').padStart(4,'0')
  const pnu = `${sigunguCd.slice(0,5)}${bjdongCd.slice(0,5)}1${cleanBun}${cleanJi}`
  try {
    const url = `https://api.vworld.kr/ned/data/getLandUseAttr?key=${KEY}&domain=${DOM}&pnu=${pnu}&cnflcAt=1&numOfRows=100&format=json`
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`)
    const j = await res.json()
    const list: Record<string,string>[] = j?.landUses?.field || []
    const zoneItem = list.find(item => {
      const code = item?.prposAreaDstrcCode || ''
      if (code.startsWith('UQA1')||code.startsWith('UQA2')||code.startsWith('UQA3')||code.startsWith('UQA4')) return true
      const name = item?.prposAreaDstrcCodeNm || ''
      return name.includes('주거')||name.includes('상업')||name.includes('공업')||name.includes('녹지')
    })
    const hasDistrict = list.some(item => (item?.prposAreaDstrcCode||'').startsWith('UQQ3') || (item?.prposAreaDstrcCodeNm||'').includes('지구단위계획'))
    const zoneType = zoneItem?.prposAreaDstrcCodeNm || ''
    const zoneCode = toCode(zoneType)
    return NextResponse.json({ success: true, pnu, zoneType, zoneCode, heightLimit: HEIGHT[zoneCode]||null, coverageRatio: BCR[zoneCode]||null, floorAreaRatio: FAR[zoneCode]||null, hasDistrictPlan: hasDistrict, source: 'vworld-ned' })
  } catch(e: unknown) {
    return NextResponse.json({ success: false, zoneCode: '', zoneType: '', error: String(e) })
  }
}
