import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

const KEY = 'FFEC486D-E635-345C-9BA6-5404A5AA191B'
const DOM = 'v0-archi-scan-layout-generator.vercel.app'
const LURIS_URL = 'https://apis.data.go.kr/1611000/nsdi/LandUseService/attr/getLandUsePlan'
const LURIS_KEY = process.env.MOLIT_API_KEY || '384c065c489b613aa46ae60dbc3284d59c52d1cbb9ec32bfeba5d56d21444098'

function toCode(raw: string): string {
  if (!raw) return ''
  if (raw.includes('제1종전용') || raw.includes('제1종 전용')) return 'residential-exclusive-1'
  if (raw.includes('제2종전용') || raw.includes('제2종 전용')) return 'residential-exclusive-2'
  if (raw.includes('제1종일반') || raw.includes('제1종 일반')) return 'residential-1'
  if (raw.includes('제2종일반') || raw.includes('제2종 일반')) return 'residential-2'
  if (raw.includes('제3종일반') || raw.includes('제3종 일반')) return 'residential-3'
  if (raw.includes('준주거'))   return 'semi-residential'
  if (raw.includes('일반주거')) return 'residential-2'   // fallback
  if (raw.includes('전용주거')) return 'residential-exclusive-1' // fallback
  if (raw.includes('주거'))    return 'residential-2'   // 최종 주거 fallback
  if (raw.includes('근린상업')) return 'commercial-neighborhood'
  if (raw.includes('중심상업')) return 'commercial-central'
  if (raw.includes('일반상업')) return 'commercial-general'
  if (raw.includes('유통상업')) return 'commercial-general'
  if (raw.includes('상업'))    return 'commercial-general'
  if (raw.includes('전용공업')) return 'industrial-exclusive'
  if (raw.includes('일반공업')) return 'industrial-general'
  if (raw.includes('준공업'))   return 'industrial-semi'
  if (raw.includes('공업'))    return 'industrial-general'
  if (raw.includes('자연녹지')) return 'green-natural'
  if (raw.includes('생산녹지')) return 'green-production'
  if (raw.includes('보전녹지')) return 'green-conservation'
  if (raw.includes('녹지'))    return 'green-natural'
  if (raw.includes('계획관리')) return 'management-planned'
  if (raw.includes('생산관리')) return 'management-planned'
  if (raw.includes('보전관리')) return 'management-planned'
  if (raw.includes('농림'))    return 'management-planned'
  if (raw.includes('관리'))    return 'management-planned'
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

// 1순위: LURIS 국토부 토지이용계획정보 (가장 정확)
async function fetchLURIS(pnu: string): Promise<string | null> {
  if (!LURIS_KEY) return null
  try {
    const url = `${LURIS_URL}?serviceKey=${encodeURIComponent(LURIS_KEY)}&pnu=${pnu}&returnType=json`
    const res = await fetch(url, { signal: AbortSignal.timeout(7000) })
    const text = await res.text()
    console.log(`[LURIS] s=${res.status} len=${text.length}`)
    // 500 에러 시 즉시 null (VWorld fallback으로)
    if (res.status >= 500) {
      console.log(`[LURIS] 서버 에러 ${res.status}, VWorld fallback 전환`)
      return null
    }
    if (text.trim().startsWith('<')) {
      const m = text.match(/<prposArea1Nm>(.*?)<\/prposArea1Nm>/) || text.match(/<prposArea1>(.*?)<\/prposArea1>/)
      if (m?.[1]) return m[1]
      return null
    }
    const json = JSON.parse(text)
    const features = json?.features || json?.response?.result?.featureCollection?.features || json?.LandUse?.field || []
    if (Array.isArray(features) && features.length > 0) {
      const p = features[0]?.properties ?? features[0]
      return p?.prposArea1Nm ?? p?.prposArea1 ?? p?.prposAreaDstrcCodeNm ?? null
    }
  } catch (e) { console.log(`[LURIS] err: ${e}`) }
  return null
}

// 2순위: Vworld getLandUseAttr
async function fetchVworld(pnu: string): Promise<{zoneType: string, hasDistrict: boolean, allItems: {code:string,name:string}[]}> {
  const result = { zoneType: '', hasDistrict: false, allItems: [] as {code:string,name:string}[] }
  try {
    const url = `https://api.vworld.kr/ned/data/getLandUseAttr?key=${KEY}&domain=${DOM}&pnu=${pnu}&cnflcAt=1&numOfRows=100&format=json`
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: {
        'Referer': `https://${DOM}`,
        'Origin': `https://${DOM}`,
      }
    })
    console.log(`[Vworld NED] s=${res.status} pnu=${pnu}`)
    if (!res.ok) {
      console.log(`[Vworld NED] HTTP ${res.status}`)
      return result
    }
    const j = await res.json()
    const list: Record<string,string>[] = j?.landUses?.field || []
    console.log(`[Vworld NED] items=${list.length}`)
    result.allItems = list.map(i=>({code:i.prposAreaDstrcCode||'',name:i.prposAreaDstrcCodeNm||''}))
    const zoneItem = list.find(item => /^UQA[1-4]\d{2}$/.test(item?.prposAreaDstrcCode || ''))
    result.hasDistrict = list.some(item => (item?.prposAreaDstrcCode||'').startsWith('UQQ3') || (item?.prposAreaDstrcCodeNm||'').includes('지구단위계획'))
    result.zoneType = zoneItem?.prposAreaDstrcCodeNm || ''
  } catch (e) { console.log(`[Vworld NED] err: ${e}`) }
  return result
}

// 3순위: Vworld WFS 토지이용계획 (NED 실패 시 대안)
async function fetchVworldWFS(pnu: string): Promise<string> {
  try {
    const url = `https://api.vworld.kr/req/wfs?service=WFS&version=2.0.0&request=GetFeature&typeName=lt_c_luris&srsName=EPSG:4326&key=${KEY}&domain=${DOM}&pnu=${pnu}&outputType=json&maxFeatures=10`
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: {
        'Referer': `https://${DOM}`,
        'Origin': `https://${DOM}`,
      }
    })
    if (!res.ok) return ''
    const j = await res.json()
    const features = j?.features || []
    for (const f of features) {
      const name = f?.properties?.prposArea1Nm || f?.properties?.prposAreaDstrcCodeNm || ''
      if (name && toCode(name)) {
        console.log(`[Vworld WFS] found: ${name}`)
        return name
      }
    }
  } catch (e) { console.log(`[Vworld WFS] err: ${e}`) }
  return ''
}

// GET: 디버그
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  let pnu = sp.get('pnu') || ''
  if (!pnu) {
    const s = sp.get('sigunguCd')||'11110', b = sp.get('bjdongCd')||'18300'
    const bn = (sp.get('bun')||'0180').padStart(4,'0'), ji = (sp.get('ji')||'0004').padStart(4,'0')
    pnu = `${s.slice(0,5)}${b.slice(0,5)}1${bn}${ji}`
  }
  const luris = await fetchLURIS(pnu)
  const vworld = await fetchVworld(pnu)
  const wfs = (!luris && !vworld.zoneType) ? await fetchVworldWFS(pnu) : null
  return NextResponse.json({ pnu, luris, vworld, wfs })
}

export async function POST(req: NextRequest) {
  const { sigunguCd, bjdongCd, bun, ji } = await req.json()
  if (!sigunguCd || !bjdongCd) return NextResponse.json({ success: false, zoneCode: '' })
  const cleanBun = (bun||'0000').replace(/\D/g,'').padStart(4,'0')
  const cleanJi  = (ji||'0000').replace(/\D/g,'').padStart(4,'0')
  const pnu = `${sigunguCd.slice(0,5)}${bjdongCd.slice(0,5)}1${cleanBun}${cleanJi}`
  console.log(`[zone] PNU=${pnu} b=${cleanBun} j=${cleanJi}`)

  let zoneType = '', hasDistrict = false, source = 'none'

  // 1순위: LURIS
  const lurisZone = await fetchLURIS(pnu)
  if (lurisZone && toCode(lurisZone)) {
    zoneType = lurisZone
    source = 'luris'
  }

  // 2순위: Vworld NED
  const vw = await fetchVworld(pnu)
  if (!zoneType && vw.zoneType) {
    zoneType = vw.zoneType
    source = 'vworld-ned'
  }
  hasDistrict = vw.hasDistrict

  // 3순위: Vworld WFS (LURIS + NED 모두 실패 시)
  if (!zoneType) {
    const wfsZone = await fetchVworldWFS(pnu)
    if (wfsZone && toCode(wfsZone)) {
      zoneType = wfsZone
      source = 'vworld-wfs'
    }
  }

  if (lurisZone && vw.zoneType && lurisZone !== vw.zoneType) {
    console.log(`[zone] DIFF luris="${lurisZone}" vworld="${vw.zoneType}"`)
  }
  console.log(`[zone] RESULT="${zoneType}" src=${source}`)

  const zoneCode = toCode(zoneType)
  return NextResponse.json({
    success: true, pnu, zoneType, zoneCode,
    heightLimit: HEIGHT[zoneCode]||null, coverageRatio: BCR[zoneCode]||null, floorAreaRatio: FAR[zoneCode]||null,
    hasDistrictPlan: hasDistrict, source,
    _debug: { input: { sigunguCd, bjdongCd, bun, ji }, luris: lurisZone, vworld: vw.zoneType, wfs: zoneType !== vw.zoneType && source === 'vworld-wfs' ? zoneType : null, allItems: vw.allItems }
  })
}
// trigger rebuild 1777307958
