// Vworld ned API 클라이언트 직접 호출 (브라우저에서 도메인 등록 필요)
const VWORLD_KEY = 'FFEC486D-E635-345C-9BA6-5404A5AA191B'
const VWORLD_DOMAIN = 'archiscan.kr'  // https:// 없이 도메인만

const ZONE_CODE_MAP: Record<string, string> = {
  '제1종전용주거지역': 'residential-exclusive-1', '제2종전용주거지역': 'residential-exclusive-2',
  '제1종일반주거지역': 'residential-1', '제2종일반주거지역': 'residential-2',
  '제3종일반주거지역': 'residential-3', '준주거지역': 'semi-residential',
  '근린상업지역': 'commercial-neighborhood', '중심상업지역': 'commercial-central',
  '일반상업지역': 'commercial-general', '유통상업지역': 'commercial-distribution',
  '전용공업지역': 'industrial-exclusive', '일반공업지역': 'industrial-general', '준공업지역': 'industrial-semi',
  '자연녹지지역': 'green-natural', '생산녹지지역': 'green-production', '보전녹지지역': 'green-conservation',
  '계획관리지역': 'management-planned', '생산관리지역': 'management-production', '보전관리지역': 'management-conservation',
}

function buildPNU(sigunguCd: string, bjdongCd: string, bun: string, ji: string): string {
  const platGb = (bun.startsWith('산') || ji.startsWith('산')) ? '2' : '1'
  const cleanBun = bun.replace('산', '').replace(/\D/g, '').padStart(4, '0')
  const cleanJi  = ji.replace('산', '').replace(/\D/g, '').padStart(4, '0')
  return `${sigunguCd.slice(0,5).padEnd(5,'0')}${bjdongCd.slice(0,5).padEnd(5,'0')}${platGb}${cleanBun}${cleanJi}`
}

export function toCode(raw: string): string {
  if (!raw) return ''
  for (const [kor, code] of Object.entries(ZONE_CODE_MAP)) {
    if (raw.includes(kor.replace('지역', '').replace('지구', ''))) return code
  }
  return ZONE_CODE_MAP[raw] || ''
}

const ZONE_KEYS = [
  '제1종전용','제2종전용','제1종일반','제2종일반','제3종일반',
  '준주거','근린상업','중심상업','일반상업','유통상업',
  '전용공업','일반공업','준공업',
  '자연녹지','생산녹지','보전녹지',
  '계획관리','생산관리','보전관리','농림','자연환경보전',
]

export async function fetchZoneFromVworld(params: {
  sigunguCd?: string; bjdongCd?: string; bun?: string; ji?: string
  entX?: number; entY?: number
}): Promise<{ zoneType: string; zoneCode: string; source: string } | null> {
  const { sigunguCd, bjdongCd, bun, ji } = params
  if (!sigunguCd || !bjdongCd) return null

  const pnu = buildPNU(sigunguCd, bjdongCd, bun || '0000', ji || '0000')

  try {
    // cnflcAt 제거 → 전체 토지이용계획 조회 (cnflcAt=1은 저촉항목만 반환해서 용도지역 누락)
    const url = `https://api.vworld.kr/ned/data/getLandUseAttr?key=${VWORLD_KEY}&domain=${VWORLD_DOMAIN}&pnu=${pnu}&numOfRows=50&format=json`
    const res  = await fetch(url, { signal: AbortSignal.timeout(8000) })
    const text = await res.text()
    console.log('[zone-client] ned status:', res.status, 'text:', text.slice(0, 300))

    if (res.ok && text.startsWith('{')) {
      const json = JSON.parse(text)
      // 올바른 응답 경로: landUses.field
      const list: any[] = json?.landUses?.field || json?.result?.prposAreaList || json?.prposAreaList || []
      console.log('[zone-client] list.length:', list.length, 'zones:', list.map(x => x?.prposAreaDstrcCodeNm).filter(Boolean))

      const zoneItem = list.find(x =>
        ZONE_KEYS.some(k => (x?.prposAreaDstrcCodeNm || '').includes(k))
      )
      if (zoneItem) {
        const zoneType = zoneItem.prposAreaDstrcCodeNm || ''
        const zoneCode = toCode(zoneType)
        if (zoneCode) {
          console.log('[zone-client] 성공:', zoneType, zoneCode)
          return { zoneType, zoneCode, source: 'vworld-ned-client' }
        }
      }
    }
  } catch (e) {
    console.warn('[zone-client] ned 실패:', e)
  }

  return null
}
