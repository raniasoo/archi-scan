import { NextRequest, NextResponse } from 'next/server'

const VWORLD_KEY = process.env.VWORLD_API_KEY || 'FFEC486D-E635-345C-9BA6-5404A5AA191B'
const MOLIT_KEY  = process.env.MOLIT_API_KEY || ''
const VWORLD_BASE = 'https://api.vworld.kr/req/data'

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
  const platGb = (bun.startsWith('산') || ji.startsWith('산')) ? '2' : '1'
  const cleanBun = bun.replace('산','').replace(/\D/g,'').padStart(4,'0')
  const cleanJi  = ji.replace('산','').replace(/\D/g,'').padStart(4,'0')
  return `${sigunguCd.slice(0,5).padEnd(5,'0')}${bjdongCd.slice(0,5).padEnd(5,'0')}${platGb}${cleanBun}${cleanJi}`
}

// ① 좌표 기반 — Vworld LT_C_UQ111 용도지역 레이어 (가장 정확)
async function fetchByCoord(lng: number, lat: number): Promise<string | null> {
  try {
    const d = 0.0003
    const bbox = `${lng-d},${lat-d},${lng+d},${lat+d}`
    const params = new URLSearchParams({
      service:'data', request:'GetFeature', data:'LT_C_UQ111',
      key: VWORLD_KEY, bbox, bbox_crs:'EPSG:4326', crs:'EPSG:4326',
      geometry:'false', attribute:'true', format:'json', size:'3',
    })
    const res  = await fetch(`${VWORLD_BASE}?${params}`, { signal: AbortSignal.timeout(6000) })
    const json = await res.json()
    const features = json?.response?.result?.featureCollection?.features || json?.features || []
    if (!features.length) return null
    const p = features[0]?.properties ?? {}
    const zone = p?.uprsnm ?? p?.prposArea1 ?? p?.uq111
    console.log('[zone/coord] LT_C_UQ111:', zone)
    return zone || null
  } catch (e) {
    console.warn('[zone/coord] 실패:', e)
    return null
  }
}

// ② PNU 기반 — Vworld 토지이용계획 레이어
async function fetchByPNUVworld(pnu: string): Promise<string | null> {
  // LT_C_UD801: 용도지역지구 통합
  for (const data of ['LT_C_UD801', 'LT_C_LANDINFOENS']) {
    try {
      const params = new URLSearchParams({
        service:'data', request:'GetFeature', data,
        key: VWORLD_KEY, attrFilter:`pnu:=:${pnu}`,
        geometry:'false', attribute:'true', format:'json', size:'3',
      })
      const res  = await fetch(`${VWORLD_BASE}?${params}`, { signal: AbortSignal.timeout(6000) })
      const json = await res.json()
      const features = json?.response?.result?.featureCollection?.features || json?.features || []
      if (!features.length) continue
      const p = features[0]?.properties ?? {}
      const zone = p?.prposArea ?? p?.uprsnm ?? p?.lndcgrCodeNm
      console.log(`[zone/pnu] ${data}:`, zone)
      if (zone) return zone
    } catch {}
  }
  return null
}

// ③ MOLIT LURIS 토지이용규제 (MOLIT_API_KEY 있을 때)
async function fetchByLURIS(pnu: string): Promise<string | null> {
  if (!MOLIT_KEY) return null
  try {
    const url = `https://apis.data.go.kr/1611000/nsdi/LandUseService/attr/getLandUsePlan?serviceKey=${encodeURIComponent(MOLIT_KEY)}&pnu=${pnu}&returnType=json`
    const res  = await fetch(url, { signal: AbortSignal.timeout(6000) })
    const text = await res.text()
    const m = text.match(/<prposArea1>(.*?)<\/prposArea1>/)
    if (m?.[1]) return m[1]
    if (!text.startsWith('<')) {
      const json = JSON.parse(text)
      return json?.features?.[0]?.properties?.prposArea1 ?? null
    }
  } catch {}
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
    const p = features[0]?.properties ?? {}
    const area = parseFloat(p?.pblntfArea ?? p?.lndpclAr ?? p?.area ?? '0')
    return area > 0 ? area : null
  } catch {}
  return null
}

export async function GET() {
  return NextResponse.json({ status: 'ok', vworld: !!VWORLD_KEY, luris: !!MOLIT_KEY })
}

export async function POST(req: NextRequest) {
  const { sigunguCd, bjdongCd, bun, ji, address, entX, entY } = await req.json()

  let zoneRaw: string | null = null
  let source  = 'none'
  let siteArea: number | null = null
  const pnu = (sigunguCd && bjdongCd) ? buildPNU(sigunguCd, bjdongCd, bun||'0000', ji||'0000') : null

  // ① 좌표 기반 (entX/entY 있을 때)
  if (entX && entY && !zoneRaw) {
    zoneRaw = await fetchByCoord(Number(entX), Number(entY))
    if (zoneRaw) source = 'vworld-coord'
  }

  // ② PNU 기반 Vworld
  if (!zoneRaw && pnu) {
    zoneRaw = await fetchByPNUVworld(pnu)
    if (zoneRaw) source = 'vworld-pnu'
  }

  // ③ LURIS
  if (!zoneRaw && pnu) {
    zoneRaw = await fetchByLURIS(pnu)
    if (zoneRaw) source = 'luris'
  }

  // 면적 병행 조회
  if (pnu) siteArea = await fetchArea(pnu)

  const zoneCode = toCode(zoneRaw || '')
  console.log(`[zone-lookup] ${zoneRaw} → ${zoneCode} (${source})`)

  return NextResponse.json({
    success: true,
    zoneType: zoneRaw || '',
    zoneCode,
    source,
    siteArea,
  })
}
