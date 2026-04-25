import { NextRequest, NextResponse } from 'next/server'

const VWORLD_KEY    = process.env.VWORLD_API_KEY || 'FFEC486D-E635-345C-9BA6-5404A5AA191B'
const LURIS_KEY     = process.env.LAND_USE_KEY     // 토지이용계획정보 API 전용 키 (data.go.kr 신청)
                   || process.env.MOLIT_API_KEY    // fallback: 기존 건축물대장 키
                   || ''
const VWORLD_BASE   = 'https://api.vworld.kr/req/data'
// 국토부 토지이용계획정보 속성조회 (data.go.kr 국토교통부_토지이용계획정보)
const LURIS_ATTR    = 'https://apis.data.go.kr/1611000/nsdi/LandUseService/attr/getLandUsePlan'

// 용도지역 한글 → 코드 변환
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
  if (raw.includes('일반공업')) return 'industrial-general'
  if (raw.includes('자연녹지')) return 'green-natural'
  if (raw.includes('생산녹지')) return 'green-production'
  if (raw.includes('계획관리')) return 'management-planned'
  return ''
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

// ② Vworld 토지이용계획 WFS 레이어 — 좌표 기반
async function fetchByCoord(lng: number, lat: number): Promise<string | null> {
  // 토지이용계획 레이어 목록 (우선순위 순)
  const layers = ['LT_C_UQ111', 'LT_C_UD801']
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
  try {
    const params = new URLSearchParams({
      service:'data', request:'GetFeature', data:'LT_C_LHPCLND',
      key: VWORLD_KEY, attrFilter:`pnu:=:${pnu}`,
      geometry:'false', attribute:'true', format:'json', size:'5',
    })
    const res  = await fetch(`${VWORLD_BASE}?${params}`, { signal: AbortSignal.timeout(6000) })
    const json = await res.json()
    const features = json?.response?.result?.featureCollection?.features || json?.features || []
    if (!features.length) return null
    const p    = features[0]?.properties ?? {}
    const area = parseFloat(p?.pblntfArea ?? p?.lndpclAr ?? p?.area ?? '0')
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

  if (!zoneRaw && pnu) { zoneRaw = await fetchByLURIS(pnu); if (zoneRaw) source = 'luris' }
  if (!zoneRaw && entX && entY) { zoneRaw = await fetchByCoord(Number(entX), Number(entY)); if (zoneRaw) source = 'vworld-coord' }
  if (!zoneRaw && pnu) { zoneRaw = await fetchByPNU(pnu); if (zoneRaw) source = 'vworld-pnu' }
  if (pnu) siteArea = await fetchArea(pnu)

  const zoneCode = toCode(zoneRaw || '')
  console.log(`[zone-lookup/GET] "${zoneRaw}" → ${zoneCode} (${source}) PNU=${pnu}`)
  return NextResponse.json({ success: true, zoneType: zoneRaw||'', zoneCode, source, siteArea, pnu })
}

export async function POST(req: NextRequest) {
  const { sigunguCd, bjdongCd, bun, ji, address, entX, entY } = await req.json()

  let zoneRaw: string | null = null
  let source = 'none'
  let siteArea: number | null = null
  const pnu = (sigunguCd && bjdongCd)
    ? buildPNU(sigunguCd, bjdongCd, bun||'0000', ji||'0000')
    : null

  // ① LURIS — PNU 기반, 가장 정확 (MOLIT_API_KEY 등록 시)
  if (!zoneRaw && pnu) {
    zoneRaw = await fetchByLURIS(pnu)
    if (zoneRaw) source = 'luris'
  }

  // ② Vworld 좌표 기반 (entX/entY 있을 때)
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

  const zoneCode = toCode(zoneRaw || '')
  console.log(`[zone-lookup] "${zoneRaw}" → ${zoneCode} (${source})`)

  return NextResponse.json({
    success: true,
    zoneType: zoneRaw || '',
    zoneCode,
    source,
    siteArea,
    lurisAvailable: !!LURIS_KEY,   // UI에서 키 미등록 안내에 활용 가능
  })
}
