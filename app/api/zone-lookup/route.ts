import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'  // Vworld /ned/ 접근을 위해 Edge IP 사용

const VWORLD_KEY    = process.env.VWORLD_API_KEY || 'FFEC486D-E635-345C-9BA6-5404A5AA191B'
// AWS Lambda 서울 리전 프록시 (한국 정부 API 차단 우회)
const LAMBDA_URL    = process.env.LAMBDA_ZONE_URL || 'https://m4wofqr3gdz5xkk4puw3gluzja0upsve.lambda-url.ap-northeast-2.on.aws/'
const LURIS_KEY     = process.env.LAND_USE_KEY     // 토지이용계획정보 API 전용 키 (data.go.kr 신청)
                   || process.env.MOLIT_API_KEY    // fallback: 기존 건축물대장 키
                   || ''
const VWORLD_BASE   = 'https://api.vworld.kr/req/data'
// 국토부 토지이용계획정보 속성조회 (data.go.kr 국토교통부_토지이용계획정보)
const LURIS_ATTR    = 'https://apis.data.go.kr/1611000/nsdi/LandUseService/attr/getLandUsePlan'


// 주소 기반 용도지역 추론 (모든 API 실패 시 최종 fallback)
function inferZoneFromAddress(address: string): string | null {
  if (!address) return null
  // 중심상업지역: 명동, 종로, 광화문 등 CBD
  if (address.includes('명동') || address.includes('광화문') || address.includes('세종대로') ||
      address.includes('을지로') || address.includes('충무로')) return '중심상업지역'
  // 일반상업지역: 대로변 + 상업구역
  if ((address.includes('대로') || address.includes('테헤란') || address.includes('강남대로') ||
       address.includes('서초대로') || address.includes('사당로') || address.includes('여의대로')) &&
      (address.includes('강남구') || address.includes('서초구') || address.includes('종로구') ||
       address.includes('중구') || address.includes('용산구') || address.includes('마포구') ||
       address.includes('영등포') || address.includes('송파구'))) return '일반상업지역'
  // 근린상업지역: 기타 상업지 추정
  if (address.includes('역') && (address.includes('로') || address.includes('대로'))) return '근린상업지역'
  return null
}

// 용도지역 한글 → 코드 변환
function toCode(raw: string): string {
  if (!raw) return ''
  // "도시지역"은 용도구역(상위개념)이므로 용도지역으로 처리 불가 → 빈값 반환
  if (raw.trim() === '도시지역' || raw.trim() === '관리지역' || raw.trim() === '농림지역' || raw.trim() === '자연환경보전지역') return ''
  if (raw.includes('제1종전용') || raw.includes('제1종 전용')) return 'residential-exclusive-1'
  if (raw.includes('제2종전용') || raw.includes('제2종 전용')) return 'residential-exclusive-2'
  if (raw.includes('제1종일반') || raw.includes('제1종 일반')) return 'residential-1'
  if (raw.includes('제2종일반') || raw.includes('제2종 일반')) return 'residential-2'
  if (raw.includes('제3종일반') || raw.includes('제3종 일반')) return 'residential-3'
  if (raw.includes('준주거'))   return 'semi-residential'
  if (raw.includes('근린상업')) return 'commercial-neighborhood'
  if (raw.includes('중심상업')) return 'commercial-central'
  if (raw.includes('일반상업')) return 'commercial-general'
  if (raw.includes('유통상업')) return 'commercial-distribution'
  if (raw.includes('전용공업')) return 'industrial-exclusive'
  if (raw.includes('일반공업')) return 'industrial-general'
  if (raw.includes('준공업'))   return 'industrial-semi'
  if (raw.includes('자연녹지')) return 'green-natural'
  if (raw.includes('생산녹지')) return 'green-production'
  if (raw.includes('보전녹지')) return 'green-conservation'
  if (raw.includes('계획관리')) return 'management-planned'
  if (raw.includes('생산관리')) return 'management-production'
  if (raw.includes('보전관리')) return 'management-conservation'
  return ''
}


// 용도지역별 법정 높이 기본값 (m) - 건축법 시행령 기준
const HEIGHT_BY_ZONE: Record<string, number> = {
  'residential-exclusive-1': 9,  'residential-exclusive-2': 12,
  'residential-1': 12,           'residential-2': 20,
  'residential-3': 30,           'semi-residential': 45,
  'commercial-neighborhood': 45, 'commercial-central': 200,
  'commercial-general': 60,      'industrial-exclusive': 30,
  'industrial-general': 30,      'industrial-semi': 30,
  'green-natural': 20,           'green-production': 20,
  'green-conservation': 20,      'management-planned': 20,
  'management-production': 20,   'management-conservation': 20,
}

// 건폐율 기본값 (%)
const COVERAGE_BY_ZONE: Record<string, number> = {
  'residential-exclusive-1': 50, 'residential-exclusive-2': 50,
  'residential-1': 60,           'residential-2': 60,
  'residential-3': 50,           'semi-residential': 70,
  'commercial-neighborhood': 70, 'commercial-central': 90,
  'commercial-general': 80,      'industrial-general': 70,
  'green-natural': 20,
}

// 용적률 기본값 (%)
const FAR_BY_ZONE: Record<string, number> = {
  'residential-exclusive-1': 100, 'residential-exclusive-2': 150,
  'residential-1': 200,           'residential-2': 250,
  'residential-3': 300,           'semi-residential': 500,
  'commercial-neighborhood': 900, 'commercial-central': 1500,
  'commercial-general': 1300,     'industrial-general': 400,
  'green-natural': 100,
}

function buildPNU(sigunguCd: string, bjdongCd: string, bun: string, ji: string): string {
  const platGb   = (bun.startsWith('산') || ji.startsWith('산')) ? '2' : '1'
  const cleanBun = bun.replace('산','').replace(/\D/g,'').padStart(4,'0')
  const cleanJi  = ji.replace('산','').replace(/\D/g,'').padStart(4,'0')
  return `${sigunguCd.slice(0,5).padEnd(5,'0')}${bjdongCd.slice(0,5).padEnd(5,'0')}${platGb}${cleanBun}${cleanJi}`
}

// ① 국토부 LURIS 토지이용계획 속성조회 (가장 정확 — MOLIT_API_KEY 필요)
async function fetchByLURIS(pnu: string): Promise<string | null> {
  if (!LURIS_KEY) return null
  try {
    const url = `${LURIS_ATTR}?serviceKey=${encodeURIComponent(LURIS_KEY)}&pnu=${pnu}&returnType=json`
    const res  = await fetch(url, { signal: AbortSignal.timeout(7000) })
    const text = await res.text()
    console.log(`[LURIS] status=${res.status} text(200)=${text.slice(0,200)}`)

    // XML 응답 처리
    if (text.trim().startsWith('<')) {
      const m = text.match(/<prposArea1Nm>(.*?)<\/prposArea1Nm>/)
             || text.match(/<prposArea1>(.*?)<\/prposArea1>/)
      if (m?.[1]) { console.log('[LURIS]', m[1]); return m[1] }
      return null
    }

    // JSON 응답 처리
    const json = JSON.parse(text)
    const features = json?.features
                  || json?.response?.result?.featureCollection?.features
                  || json?.LandUse?.field
                  || []
    if (Array.isArray(features) && features.length > 0) {
      const p = features[0]?.properties ?? features[0]
      const zone = p?.prposArea1Nm ?? p?.prposArea1
      if (zone) { console.log('[LURIS]', zone); return zone }
    }
  } catch (e) {
    console.warn('[LURIS] 실패:', e)
  }
  return null
}

// ① Vworld 토지이용계획속성조회 (ned API) - PNU 기반 정식 엔드포인트
async function fetchByVworldAttr(pnu: string): Promise<string | null> {
  // ned/data/getLandUseAttr: 계획구역 내 토지 이용계획 속성정보 조회
  const domain = 'v0-archi-scan-layout-generator.vercel.app'
  const url = `https://api.vworld.kr/ned/data/getLandUseAttr?key=${VWORLD_KEY}&domain=${domain}&pnu=${pnu}&cnflcAt=1&numOfRows=100&format=json`
  try {
    const res  = await fetch(url, { signal: AbortSignal.timeout(7000) })
    const text = await res.text()
    if (res.status !== 200) {
      console.error(`[Vworld-attr] ERROR status=${res.status} url=${url.slice(0,200)} response=${text.slice(0,800)}`)
      return null
    }
    console.log(`[Vworld-attr] status=${res.status} pnu=${pnu} text=${text.slice(0,500)}`)
    if (!text.startsWith('{') && !text.startsWith('[')) return null
    const json = JSON.parse(text)
    // 응답 구조: { result: { prposAreaList: [{ prposAreaDstrcCodeNm, ... }] } }
    const list = json?.result?.prposAreaList
              || json?.landUseAttr?.prposAreaList
              || json?.prposAreaList
              || []
    if (Array.isArray(list) && list.length > 0) {
      // 용도지역 (prposAreaDstrcCodeNm이 용도지역지구명)
      const zoneItem = list.find((item: any) => 
        item?.prposAreaDstrcCodeNm?.includes('주거') || 
        item?.prposAreaDstrcCodeNm?.includes('상업') || 
        item?.prposAreaDstrcCodeNm?.includes('공업') || 
        item?.prposAreaDstrcCodeNm?.includes('녹지') ||
        item?.prposAreaDstrcCodeNm?.includes('관리')
      ) || list[0]
      const zone = zoneItem?.prposAreaDstrcCodeNm ?? zoneItem?.prposAreaNm
      if (zone) { console.log('[Vworld-attr]', zone); return zone }
    }
  } catch (e: any) { console.warn('[Vworld-attr] 실패:', e?.message, e?.stack?.slice(0,200)) }
  return null
}

// ① Lambda 서울 프록시 (가장 확실 — 한국 IP로 호출)
async function fetchByLambdaCoord(lng: number, lat: number): Promise<string | null> {
  try {
    const res = await fetch(`${LAMBDA_URL}?coord=1&lng=${lng}&lat=${lat}`, { signal: AbortSignal.timeout(7000) })
    const data = await res.json()
    return data?.zoneType || null
  } catch { return null }
}

async function fetchByLambda(pnu: string): Promise<string | null> {
  if (!LAMBDA_URL) return null
  try {
    const res  = await fetch(LAMBDA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pnu }),
      signal: AbortSignal.timeout(10000),
    })
    const json = await res.json() as any
    console.log(`[lambda] status=${res.status} zone=${json.zoneType} source=${json.source}`)
    return json.zoneType || null
  } catch (e: any) { console.warn('[lambda] 실패:', e.message) }
  return null
}

// ② 토지이음 HTML 파싱 — PNU 기반 (서버 호출 가능)
async function fetchByEum(pnu: string): Promise<string | null> {
  try {
    const url = `https://www.eum.go.kr/web/ar/lu/luLandDet.jsp?pnu=${pnu}&isNoScr=script&mode=search`
    const res  = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ArchiScan/1.0)' }
    })
    const html = await res.text()
    console.log(`[eum] status=${res.status} pnu=${pnu} html(200)=${html.slice(0,200)}`)

    // 용도지역 파싱: "제2종일반주거지역" 등 패턴 추출
    const patterns = [
      /제1종전용주거지역|제2종전용주거지역|제1종일반주거지역|제2종일반주거지역|제3종일반주거지역/,
      /준주거지역|근린상업지역|중심상업지역|일반상업지역|일반공업지역/,
      /자연녹지지역|생산녹지지역|보전녹지지역|계획관리지역|생산관리지역|보전관리지역/,
    ]
    for (const pattern of patterns) {
      const m = html.match(pattern)
      if (m) { console.log('[eum] 용도지역:', m[0]); return m[0] }
    }
  } catch (e) { console.warn('[eum] 실패:', e) }
  return null
}

// ③ Vworld 토지이용계획 WFS 레이어 — 좌표 기반
async function fetchByCoord(lng: number, lat: number): Promise<string | null> {
  // dt_d154: Vworld WMS 레퍼런스에서 확인된 토지이용계획 레이어명
  const layers = ['dt_d154', 'LT_C_UQ111', 'LT_C_UD801']
  const d = 0.0002
  const bbox = `${lng-d},${lat-d},${lng+d},${lat+d}`

  for (const layer of layers) {
    try {
      const params = new URLSearchParams({
        service:'data', request:'GetFeature', data: layer,
        key: VWORLD_KEY, bbox, bbox_crs:'EPSG:4326', crs:'EPSG:4326',
        geometry:'false', attribute:'true', format:'json', size:'5',
      })
      const res  = await fetch(`${VWORLD_BASE}?${params}`, { signal: AbortSignal.timeout(6000) })
      const json = await res.json()
      const features = json?.response?.result?.featureCollection?.features
                    || json?.features || []
      if (!features.length) continue
      const p = features[0]?.properties ?? {}
      const zone = p?.uprsnm ?? p?.prposArea1Nm ?? p?.prposArea1 ?? p?.uq111
      if (zone) { console.log(`[Vworld/${layer}]`, zone); return zone }
    } catch {}
  }
  return null
}

// ③ Vworld PNU 기반
async function fetchByPNU(pnu: string): Promise<string | null> {
  const layers = ['LT_C_UD801', 'LT_C_LANDINFOENS']
  for (const layer of layers) {
    try {
      const params = new URLSearchParams({
        service:'data', request:'GetFeature', data: layer,
        key: VWORLD_KEY, attrFilter:`pnu:=:${pnu}`,
        geometry:'false', attribute:'true', format:'json', size:'3',
      })
      const res  = await fetch(`${VWORLD_BASE}?${params}`, { signal: AbortSignal.timeout(6000) })
      const json = await res.json()
      const features = json?.response?.result?.featureCollection?.features
                    || json?.features || []
      if (!features.length) continue
      const p = features[0]?.properties ?? {}
      const zone = p?.prposArea ?? p?.uprsnm ?? p?.lndcgrCodeNm
      if (zone) { console.log(`[Vworld-PNU/${layer}]`, zone); return zone }
    } catch {}
  }
  return null
}

// 필지 면적 조회
async function fetchArea(pnu: string): Promise<number | null> {
  // Lambda(서울)를 통해 Vworld WFS 필지 면적 조회
  try {
    const res = await fetch(`${LAMBDA_URL}?area=1&pnu=${pnu}`, { signal: AbortSignal.timeout(7000) })
    const data = await res.json()
    if (data.siteArea && data.siteArea > 0) return data.siteArea
  } catch {}
  // fallback: Vworld 직접 (미국서버 차단될 수 있음)
  try {
    const params = new URLSearchParams({
      service:'data', request:'GetFeature', data:'LP_PA_CBND_BUBUN',
      key: VWORLD_KEY, attrFilter:`pnu:LIKE:${pnu.slice(0,15)}`,
      geometry:'false', attribute:'true', format:'json', size:'5',
    })
    const res  = await fetch(`${VWORLD_BASE}?${params}`, { signal: AbortSignal.timeout(6000) })
    const json = await res.json()
    const features = json?.response?.result?.featureCollection?.features || json?.features || []
    if (!features.length) return null
    const p    = features[0]?.properties ?? {}
    const area = parseFloat(p?.pblntfArea ?? p?.lndpclAr ?? p?.area ?? p?.AREA ?? '0')
    return area > 0 ? area : null
  } catch {}
  return null
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sigunguCd = searchParams.get('sigunguCd')
  const bjdongCd  = searchParams.get('bjdongCd')
  const bun       = searchParams.get('bun') || '0000'
  const ji        = searchParams.get('ji') || '0000'
  const address   = searchParams.get('address') || ''
  const entX      = searchParams.get('entX')
  const entY      = searchParams.get('entY')

  if (!sigunguCd && !entX) {
    return NextResponse.json({ status: 'ok', luris: !!LURIS_KEY, vworld: !!VWORLD_KEY })
  }

  let zoneRaw: string | null = null
  let source = 'none'
  let siteArea: number | null = null
  const pnu = (sigunguCd && bjdongCd) ? buildPNU(sigunguCd, bjdongCd, bun, ji) : null

  if (!zoneRaw && pnu) { zoneRaw = await fetchByLambda(pnu); if (zoneRaw) source = 'lambda' }
  if (!zoneRaw && entX && entY) { zoneRaw = await fetchByLambdaCoord(Number(entX), Number(entY)); if (zoneRaw) source = 'lambda-coord' }
  if (!zoneRaw && pnu) { zoneRaw = await fetchByEum(pnu); if (zoneRaw) source = 'eum' }
  if (!zoneRaw && pnu) { zoneRaw = await fetchByVworldAttr(pnu); if (zoneRaw) source = 'vworld-attr' }
  if (!zoneRaw && pnu) { zoneRaw = await fetchByLURIS(pnu); if (zoneRaw) source = 'luris' }
  if (!zoneRaw && entX && entY) { zoneRaw = await fetchByCoord(Number(entX), Number(entY)); if (zoneRaw) source = 'vworld-coord' }
  if (!zoneRaw && pnu) { zoneRaw = await fetchByPNU(pnu); if (zoneRaw) source = 'vworld-pnu' }
  if (pnu) siteArea = await fetchArea(pnu)

  const zoneCode = toCode(zoneRaw || '')
  console.log(`[zone-lookup/GET] "${zoneRaw}" → ${zoneCode} (${source}) PNU=${pnu}`)
  const heightLimitG = HEIGHT_BY_ZONE[zoneCode] ?? null
  return NextResponse.json({ success: true, zoneType: zoneRaw||'', zoneCode, source, siteArea, pnu, heightLimit: heightLimitG, coverageRatio: COVERAGE_BY_ZONE[zoneCode]??null, floorAreaRatio: FAR_BY_ZONE[zoneCode]??null })
}

export async function POST(req: NextRequest) {
  const { sigunguCd, bjdongCd, bun, ji, address, entX, entY } = await req.json()
  console.log(`[zone-lookup/POST] sigunguCd=${sigunguCd} bjdongCd=${bjdongCd} bun=${bun} ji=${ji} entX=${entX} entY=${entY}`)

  let zoneRaw: string | null = null
  let source = 'none'
  let siteArea: number | null = null
  const pnu = (sigunguCd && bjdongCd)
    ? buildPNU(sigunguCd, bjdongCd, bun||'0000', ji||'0000')
    : null

  // 0순위: Lambda 서울 프록시 (한국 IP, 차단 없음)
  if (!zoneRaw && pnu) {
    zoneRaw = await fetchByLambda(pnu)
    if (zoneRaw) source = 'lambda'
  }

  // ① LURIS — PNU 기반, 가장 정확 (MOLIT_API_KEY 등록 시)
  if (!zoneRaw && pnu) {
    zoneRaw = await fetchByLURIS(pnu)
    if (zoneRaw) source = 'luris'
  }

  // ② Lambda 좌표 기반 (서울 서버 → Vworld 차단 없음)
  if (!zoneRaw && entX && entY) {
    zoneRaw = await fetchByLambdaCoord(Number(entX), Number(entY))
    if (zoneRaw) source = 'lambda-coord'
  }
  // ③ Vworld 좌표 기반 직접 (fallback)
  if (!zoneRaw && entX && entY) {
    zoneRaw = await fetchByCoord(Number(entX), Number(entY))
    if (zoneRaw) source = 'vworld-coord'
  }

  // ③ Vworld PNU 기반
  if (!zoneRaw && pnu) {
    zoneRaw = await fetchByPNU(pnu)
    if (zoneRaw) source = 'vworld-pnu'
  }

  // 면적 병행 조회
  if (pnu) siteArea = await fetchArea(pnu)

  // "도시지역" 등 상위개념 용도구역이면 더 정확한 값 재시도
  if (zoneRaw && toCode(zoneRaw) === '') {
    console.log(`[zone-lookup] "${zoneRaw}" → 용도구역(상위개념), 재조회 시도`)
    const retry = await fetchByLambdaCoord(Number(entX), Number(entY))
    if (retry && toCode(retry) !== '') { zoneRaw = retry; source = 'lambda-coord-retry' }
    else zoneRaw = null  // 빈값으로 초기화해서 주소 추론으로 fallback
  }
  // 최종 fallback: 주소 기반 추론
  if (!zoneRaw && address) {
    const inferred = inferZoneFromAddress(address)
    if (inferred) { zoneRaw = inferred; source = 'address-inferred' }
  }
  const zoneCode = toCode(zoneRaw || '')
  console.log(`[zone-lookup] "${zoneRaw}" → ${zoneCode} (${source})`)

  const heightLimit = HEIGHT_BY_ZONE[zoneCode] ?? null
  const coverageRatio = COVERAGE_BY_ZONE[zoneCode] ?? null
  const floorAreaRatio = FAR_BY_ZONE[zoneCode] ?? null

  return NextResponse.json({
    success: true,
    zoneType: zoneRaw || '',
    zoneCode,
    source,
    siteArea,
    heightLimit,
    coverageRatio,
    floorAreaRatio,
    lurisAvailable: !!LURIS_KEY,
  })
}
