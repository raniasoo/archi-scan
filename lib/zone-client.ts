// Vworld ned API 클라이언트 직접 호출 (브라우저에서 도메인 등록 필요)
const VWORLD_KEY = 'FFEC486D-E635-345C-9BA6-5404A5AA191B'
const VWORLD_DOMAIN = 'v0-archi-scan-layout-generator.vercel.app'  // https:// 없이 도메인만

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

export interface OverlappingRegulation {
  name: string           // e.g. "자연경관지구", "고도지구"
  category: string       // 용도지역, 용도지구, 구역, 기타
  coverageOverride?: number  // 건폐율 보정값 (이 규제가 적용 시)
  farOverride?: number       // 용적률 보정값
  heightLimit?: number       // 높이 제한 (m)
  floorLimit?: number        // 층수 제한
  severity: 'critical' | 'high' | 'medium' | 'info'
  description?: string
}

// 중첩 규제별 영향 매핑
const REGULATION_IMPACT: Record<string, Partial<OverlappingRegulation>> = {
  '자연경관지구': { category: '용도지구', coverageOverride: 30, heightLimit: 12, floorLimit: 3, severity: 'critical', description: '건폐율 30%, 3층 12m 이하 제한' },
  '경관지구': { category: '용도지구', coverageOverride: 40, severity: 'high', description: '경관 보존을 위한 건축 제한' },
  '미관지구': { category: '용도지구', severity: 'medium', description: '미관 유지를 위한 건축 심의 필요' },
  '고도지구': { category: '용도지구', heightLimit: 24, severity: 'high', description: '높이 24m 이하 제한' },
  '최고고도지구': { category: '용도지구', heightLimit: 20, severity: 'critical', description: '높이 20m 이하 제한' },
  '최저고도지구': { category: '용도지구', severity: 'medium', description: '최저 높이 기준 적용' },
  '방화지구': { category: '용도지구', severity: 'medium', description: '내화구조 의무, 공사비 상승 요인' },
  '보존지구': { category: '용도지구', coverageOverride: 20, severity: 'critical', description: '건폐율 20% 이하, 개발 극도 제한' },
  '역사문화환경보존지구': { category: '용도지구', severity: 'critical', description: '문화재 보호 심의 필수' },
  '시설보호지구': { category: '용도지구', severity: 'high', description: '시설 보호를 위한 건축 제한' },
  '대공방어협조구역': { category: '군사시설', severity: 'high', description: '군부대(수도방위사령부) 협의 필요' },
  '군사시설보호구역': { category: '군사시설', severity: 'high', description: '군부대 협의 및 허가 필요' },
  '비행안전구역': { category: '군사시설', heightLimit: 45, severity: 'high', description: '항공 안전을 위한 높이 제한' },
  '도시자연공원구역': { category: '구역', coverageOverride: 20, severity: 'critical', description: '공원 내 건축 극도 제한' },
  '개발제한구역': { category: '구역', severity: 'critical', description: '그린벨트 — 원칙적 개발 불가' },
  '상수원보호구역': { category: '구역', severity: 'critical', description: '오염 방지를 위한 건축 제한' },
  '학교환경위생정화구역': { category: '구역', severity: 'medium', description: '유해시설 입지 제한' },
  '문화재보호구역': { category: '구역', severity: 'critical', description: '문화재청 허가 필수' },
  '지구단위계획구역': { category: '구역', severity: 'info', description: '지구단위계획에 따른 별도 건축 기준' },
}

export function classifyRegulation(name: string): OverlappingRegulation {
  const base: OverlappingRegulation = { name, category: '기타', severity: 'info' }
  
  for (const [key, impact] of Object.entries(REGULATION_IMPACT)) {
    if (name.includes(key)) {
      return { ...base, ...impact, name }
    }
  }
  
  // 자동 분류
  if (name.includes('지역')) base.category = '용도지역'
  else if (name.includes('지구')) base.category = '용도지구'
  else if (name.includes('구역')) base.category = '구역'
  
  return base
}

export async function fetchZoneFromVworld(params: {
  sigunguCd?: string; bjdongCd?: string; bun?: string; ji?: string
  entX?: number; entY?: number
}): Promise<{ zoneType: string; zoneCode: string; source: string; overlappingRegulations?: OverlappingRegulation[] } | null> {
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

      // 1. 주 용도지역 추출
      const zoneItem = list.find(x =>
        ZONE_KEYS.some(k => (x?.prposAreaDstrcCodeNm || '').includes(k))
      )
      
      // 2. 모든 중첩 규제 추출
      const allRegulations: OverlappingRegulation[] = list
        .map(x => x?.prposAreaDstrcCodeNm || '')
        .filter((name: string) => name.length > 0)
        .map((name: string) => classifyRegulation(name))
      
      console.log('[zone-client] 중첩 규제:', allRegulations.length, '개 -', allRegulations.map(r => r.name).join(', '))

      if (zoneItem) {
        const zoneType = zoneItem.prposAreaDstrcCodeNm || ''
        const zoneCode = toCode(zoneType)
        if (zoneCode) {
          console.log('[zone-client] 성공:', zoneType, zoneCode, '+ 중첩 규제', allRegulations.length, '개')
          return { zoneType, zoneCode, source: 'vworld-ned-client', overlappingRegulations: allRegulations }
        }
      }
      
      // 용도지역 못 찾았지만 중첩 규제는 있는 경우
      if (allRegulations.length > 0) {
        return { zoneType: '', zoneCode: '', source: 'vworld-ned-client-partial', overlappingRegulations: allRegulations }
      }
    }
  } catch (e) {
    console.warn('[zone-client] ned 실패:', e)
  }

  return null
}
