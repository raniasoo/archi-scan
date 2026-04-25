// Vworld ned API 클라이언트 직접 호출 (서버에서 차단되므로 브라우저에서 직접 호출)
const VWORLD_KEY = 'FFEC486D-E635-345C-9BA6-5404A5AA191B'
const VWORLD_DOMAIN = 'v0-archi-scan-layout-generator.vercel.app'

const ZONE_CODE_MAP: Record<string, string> = {
  '제1종전용주거지역': 'residential-exclusive-1', '제2종전용주거지역': 'residential-exclusive-2',
  '제1종일반주거지역': 'residential-1', '제2종일반주거지역': 'residential-2',
  '제3종일반주거지역': 'residential-3', '준주거지역': 'semi-residential',
  '근린상업지역': 'commercial-neighborhood', '중심상업지역': 'commercial-central',
  '일반상업지역': 'commercial-general', '일반공업지역': 'industrial-general',
  '자연녹지지역': 'green-natural', '생산녹지지역': 'green-production',
  '계획관리지역': 'management-planned',
}

function buildPNU(sigunguCd: string, bjdongCd: string, bun: string, ji: string): string {
  const platGb = (bun.startsWith('산') || ji.startsWith('산')) ? '2' : '1'
  const cleanBun = bun.replace('산', '').replace(/\D/g, '').padStart(4, '0')
  const cleanJi  = ji.replace('산', '').replace(/\D/g, '').padStart(4, '0')
  return `${sigunguCd.slice(0,5).padEnd(5,'0')}${bjdongCd.slice(0,5).padEnd(5,'0')}${platGb}${cleanBun}${cleanJi}`
}

function toCode(raw: string): string {
  for (const [kor, code] of Object.entries(ZONE_CODE_MAP)) {
    if (raw.includes(kor.replace('지역', '').replace('지구', ''))) return code
  }
  return ZONE_CODE_MAP[raw] || ''
}

export async function fetchZoneFromVworld(params: {
  sigunguCd?: string; bjdongCd?: string; bun?: string; ji?: string
  entX?: number; entY?: number
}): Promise<{ zoneType: string; zoneCode: string; source: string } | null> {
  const { sigunguCd, bjdongCd, bun, ji, entX, entY } = params

  if (!sigunguCd || !bjdongCd) return null

  const pnu = buildPNU(sigunguCd, bjdongCd, bun || '0000', ji || '0000')

  try {
    // Vworld 토지이용계획속성조회 — 브라우저에서 직접 호출 (도메인 체크 통과)
    const url = `https://api.vworld.kr/ned/data/getLandUseAttr?key=${VWORLD_KEY}&domain=${VWORLD_DOMAIN}&pnu=${pnu}&cnflcAt=1&numOfRows=100&format=json`
    const res  = await fetch(url, { signal: AbortSignal.timeout(8000) })
    const text = await res.text()
    console.log('[zone-client] ned status:', res.status, 'text:', text.slice(0, 300))

    if (res.ok && text.startsWith('{')) {
      const json = JSON.parse(text)
      const list = json?.result?.prposAreaList || json?.prposAreaList || []
      if (Array.isArray(list) && list.length > 0) {
        const item = list.find((x: any) =>
          Object.keys(ZONE_CODE_MAP).some(k => (x?.prposAreaDstrcCodeNm || '').includes(k.replace('지역','')))
        ) || list[0]
        const zoneType = item?.prposAreaDstrcCodeNm || ''
        const zoneCode = toCode(zoneType)
        if (zoneCode) return { zoneType, zoneCode, source: 'vworld-ned-client' }
      }
    }
  } catch (e) {
    console.warn('[zone-client] ned 실패:', e)
  }

  return null
}
