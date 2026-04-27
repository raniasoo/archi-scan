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

// GET: 디버그 - ?pnu=xxx 또는 ?sigunguCd=&bjdongCd=&bun=&ji= 로 조회
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  let pnu = sp.get('pnu') || ''
  if (!pnu) {
    const s = sp.get('sigunguCd')||'11110'
    const b = sp.get('bjdongCd')||'18300'
    const bn = (sp.get('bun')||'0180').padStart(4,'0')
    const ji = (sp.get('ji')||'0004').padStart(4,'0')
    pnu = `${s.slice(0,5)}${b.slice(0,5)}1${bn}${ji}`
  }
  try {
    const useUrl = `https://api.vworld.kr/ned/data/getLandUseAttr?key=${KEY}&domain=${DOM}&pnu=${pnu}&cnflcAt=1&numOfRows=100&format=json`
    const useRes = await fetch(useUrl, { signal: AbortSignal.timeout(5000) })
    const useJson = await useRes.json()
    return NextResponse.json({ pnu, domain: DOM, getLandUseAttr: useJson })
  } catch(e) {
    return NextResponse.json({ pnu, error: String(e) })
  }
}

export async function POST(req: NextRequest) {
  const { sigunguCd, bjdongCd, bun, ji } = await req.json()
  if (!sigunguCd || !bjdongCd) return NextResponse.json({ success: false, zoneCode: '' })
  const cleanBun = (bun||'0000').replace(/\D/g,'').padStart(4,'0')
  const cleanJi  = (ji||'0000').replace(/\D/g,'').padStart(4,'0')
  const pnu = `${sigunguCd.slice(0,5)}${bjdongCd.slice(0,5)}1${cleanBun}${cleanJi}`
  
  let zoneType = ''
  let hasDistrict = false
  let allItems: {code:string,name:string}[] = []

  try {
    const url = `https://api.vworld.kr/ned/data/getLandUseAttr?key=${KEY}&domain=${DOM}&pnu=${pnu}&cnflcAt=1&numOfRows=100&format=json`
    console.log(`[vworld-zone] PNU=${pnu}`)
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (res.ok) {
      const j = await res.json()
      const list: Record<string,string>[] = j?.landUses?.field || []
      allItems = list.map(i=>({code:i.prposAreaDstrcCode||'',name:i.prposAreaDstrcCodeNm||''}))
      // 용도지역 코드 정밀 매칭 (UQA1xx만 = 주거지역)
      // UQA111=제1종전용, UQA112=제2종전용, UQA113=제1종일반, UQA114=제2종일반, UQA115=제3종일반, UQA116=준주거
      // UQA2xx=상업, UQA3xx=공업, UQA4xx=녹지
      const zoneItem = list.find(item => {
        const code = item?.prposAreaDstrcCode || ''
        // 용도지역 코드(UQA1~4)만 정확히 매칭
        return /^UQA[1-4]\d{2}$/.test(code)
      })
      
      hasDistrict = list.some(item => 
        (item?.prposAreaDstrcCode||'').startsWith('UQQ3') || 
        (item?.prposAreaDstrcCodeNm||'').includes('지구단위계획')
      )
      zoneType = zoneItem?.prposAreaDstrcCodeNm || ''
      console.log(`[vworld-zone] SELECTED code="${zoneItem?.prposAreaDstrcCode}" zone="${zoneType}"`)
    }
  } catch (e) {
    console.log(`[vworld-zone] error: ${e}`)
  }

  const zoneCode = toCode(zoneType)
  return NextResponse.json({ success: true, pnu, zoneType, zoneCode, heightLimit: HEIGHT[zoneCode]||null, coverageRatio: BCR[zoneCode]||null, floorAreaRatio: FAR[zoneCode]||null, hasDistrictPlan: hasDistrict, source: zoneType ? 'vworld-ned' : 'none', _debug: { input: { sigunguCd, bjdongCd, bun, ji }, allItems } })
}
