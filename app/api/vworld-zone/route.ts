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

// GET: 테스트용 - ?pnu=xxx 로 직접 조회
export async function GET(req: NextRequest) {
  const pnu = req.nextUrl.searchParams.get('pnu') || '1111018300101800004'
  try {
    // getLandCharacter
    const charUrl = `https://api.vworld.kr/ned/data/getLandCharacter?key=${KEY}&domain=${DOM}&pnu=${pnu}&format=json`
    const charRes = await fetch(charUrl, { signal: AbortSignal.timeout(5000) })
    const charText = await charRes.text()
    
    // getLandUseAttr 
    const useUrl = `https://api.vworld.kr/ned/data/getLandUseAttr?key=${KEY}&domain=${DOM}&pnu=${pnu}&cnflcAt=1&numOfRows=100&format=json`
    const useRes = await fetch(useUrl, { signal: AbortSignal.timeout(5000) })
    const useText = await useRes.text()
    
    return NextResponse.json({
      pnu,
      getLandCharacter: JSON.parse(charText),
      getLandUseAttr: JSON.parse(useText),
    })
  } catch(e) {
    return NextResponse.json({ error: String(e) })
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

  // 1순위: getLandCharacter - lndcgrCodeNm 필드가 직접 용도지역을 반환
  try {
    const charUrl = `https://api.vworld.kr/ned/data/getLandCharacter?key=${KEY}&domain=${DOM}&pnu=${pnu}&format=json`
    console.log(`[vworld-zone] 1) getLandCharacter PNU=${pnu}`)
    const charRes = await fetch(charUrl, { signal: AbortSignal.timeout(5000) })
    if (charRes.ok) {
      const charJson = await charRes.json()
      const charList = charJson?.landCharacteristics?.field || charJson?.landCharacter?.field || charJson?.field || []
      if (charList.length > 0) {
        const item = charList[0]
        zoneType = item?.lndcgrCodeNm || item?.prposArea1Nm || ''
        console.log(`[vworld-zone] getLandCharacter result: "${zoneType}"`)
      }
    }
  } catch (e) {
    console.log(`[vworld-zone] getLandCharacter failed: ${e}`)
  }

  // 2순위: getLandUseAttr (getLandCharacter 실패 시)
  if (!zoneType) {
    try {
      const url = `https://api.vworld.kr/ned/data/getLandUseAttr?key=${KEY}&domain=${DOM}&pnu=${pnu}&cnflcAt=1&numOfRows=100&format=json`
      console.log(`[vworld-zone] 2) getLandUseAttr fallback PNU=${pnu}`)
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
      if (res.ok) {
        const j = await res.json()
        const list: Record<string,string>[] = j?.landUses?.field || []
        console.log(`[vworld-zone] getLandUseAttr items=${JSON.stringify(list.map(i=>({code:i.prposAreaDstrcCode,name:i.prposAreaDstrcCodeNm})))}`)
        const zoneItem = list.find(item => {
          const code = item?.prposAreaDstrcCode || ''
          if (code.startsWith('UQA1')||code.startsWith('UQA2')||code.startsWith('UQA3')||code.startsWith('UQA4')) return true
          const name = item?.prposAreaDstrcCodeNm || ''
          return name.includes('주거')||name.includes('상업')||name.includes('공업')||name.includes('녹지')
        })
        hasDistrict = list.some(item => (item?.prposAreaDstrcCode||'').startsWith('UQQ3') || (item?.prposAreaDstrcCodeNm||'').includes('지구단위계획'))
        zoneType = zoneItem?.prposAreaDstrcCodeNm || ''
      }
    } catch (e) {
      console.log(`[vworld-zone] getLandUseAttr failed: ${e}`)
    }
  }

  const zoneCode = toCode(zoneType)
  console.log(`[vworld-zone] FINAL zone="${zoneType}" code="${zoneCode}"`)
  return NextResponse.json({ success: true, pnu, zoneType, zoneCode, heightLimit: HEIGHT[zoneCode]||null, coverageRatio: BCR[zoneCode]||null, floorAreaRatio: FAR[zoneCode]||null, hasDistrictPlan: hasDistrict, source: zoneType ? 'vworld-ned' : 'none' })
}
