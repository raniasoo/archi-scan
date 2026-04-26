import { NextRequest, NextResponse } from 'next/server'

const LAND_PRICE_API_KEY = process.env.LAND_PRICE_API_KEY || ''
const VWORLD_API_KEY = process.env.VWORLD_API_KEY || 'FFEC486D-E635-345C-9BA6-5404A5AA191B'

const VWORLD_BASE = 'https://api.vworld.kr/req/data'
const NSDI_BASE = 'https://apis.data.go.kr/1611000/nsdi/IndvdLandPriceService/attr/IndvdLandPrice'

// 법정동 단위 정밀 추정 (공시지가 수준)
const DONG_FALLBACK: Record<string, number> = {
  // 강남구 주요 동
  '역삼동': 67000000, '삼성동': 65000000, '논현동': 55000000, '청담동': 70000000,
  '압구정동': 80000000, '신사동': 60000000, '도곡동': 50000000, '대치동': 55000000,
  '개포동': 45000000, '일원동': 35000000, '수서동': 30000000,
  // 서초구
  '서초동': 55000000, '반포동': 60000000, '잠원동': 55000000, '방배동': 40000000,
  '양재동': 35000000, '우면동': 25000000,
  // 송파구
  '잠실동': 40000000, '신천동': 38000000, '가락동': 28000000, '문정동': 25000000,
  // 용산구
  '한남동': 50000000, '이태원동': 35000000, '이촌동': 40000000,
  // 중구
  '명동': 90000000, '을지로': 45000000, '충무로': 40000000, '소공동': 80000000,
  // 종로구
  '종로': 45000000, '광화문': 50000000, '인사동': 35000000,
}

const DISTRICT_FALLBACK: Record<string, number> = {
  '강남구': 55000000, '서초구': 45000000, '송파구': 30000000, '강동구': 18000000,
  '용산구': 35000000, '중구': 35000000, '종로구': 28000000,
  '마포구': 18000000, '서대문구': 13000000, '은평구': 11000000,
  '성동구': 16000000, '광진구': 15000000, '동대문구': 12000000, '중랑구': 10000000,
  '성북구': 11000000, '강북구': 9000000, '도봉구': 9000000, '노원구': 10000000,
  '영등포구': 16000000, '양천구': 14000000, '강서구': 12000000,
  '구로구': 11000000, '금천구': 10000000, '관악구': 10000000, '동작구': 14000000,
  '과천시': 25000000, '하남시': 16000000, '광명시': 14000000,
  '성남시': 18000000, '분당구': 22000000, '수정구': 12000000, '중원구': 14000000,
  '안양시': 12000000, '수원시': 10000000, '용인시': 11000000, '고양시': 10000000,
  '화성시': 8000000, '평택시': 7000000, '김포시': 10000000, '파주시': 6000000,
}

function extractDistrictPrice(address: string): number {
  // 법정동 단위 먼저 체크 (더 정확)
  for (const [dong, price] of Object.entries(DONG_FALLBACK)) {
    if (address.includes(dong)) return price
  }
  for (const [district, price] of Object.entries(DISTRICT_FALLBACK)) {
    if (address.includes(district)) return price
  }
  if (address.includes('서울')) return 7000000
  if (address.includes('경기')) return 3000000
  if (address.includes('인천')) return 3500000
  if (address.includes('부산')) return 3000000
  if (address.includes('대구')) return 2500000
  return 2000000
}

function buildPNU(sigunguCd: string, bjdongCd: string, bun: string, ji: string): string {
  const platGb = (bun.startsWith('산') || ji.startsWith('산')) ? '2' : '1'
  const cleanBun = bun.replace('산', '').replace(/\D/g, '').padStart(4, '0')
  const cleanJi = ji.replace('산', '').replace(/\D/g, '').padStart(4, '0')
  return `${sigunguCd.slice(0,5).padEnd(5,'0')}${bjdongCd.slice(0,5).padEnd(5,'0')}${platGb}${cleanBun}${cleanJi}`
}

async function fetchFromVworld(pnu: string, entX?: number, entY?: number): Promise<number | null> {
  // LP_PA_CBND_BUBUN에 jiga(공시지가) 필드 직접 조회 (Vercel icn1에서 작동)
  // 하드코딩 키 사용 (env var가 다른 값으로 설정되어도 안전)
  const VWORLD_KEY = 'FFEC486D-E635-345C-9BA6-5404A5AA191B'
  const VWORLD_DOMAIN = 'v0-archi-scan-layout-generator.vercel.app'
  
  // PNU로 직접 조회
  if (pnu && pnu.length >= 19) {
    try {
      const params = new URLSearchParams({
        service: 'data', request: 'GetFeature', data: 'LP_PA_CBND_BUBUN',
        key: VWORLD_KEY, domain: VWORLD_DOMAIN,
        attrFilter: `pnu:=:${pnu}`,
        geometry: 'false', attribute: 'true', format: 'json', size: '1',
      })
      const res = await fetch(`https://api.vworld.kr/req/data?${params}`, { signal: AbortSignal.timeout(10000) })
      const data = await res.json()
      const props = data?.response?.result?.featureCollection?.features?.[0]?.properties
      console.log(`[LandPrice/LP_PA] pnu=${pnu} jiga=${props?.jiga} gosi_year=${props?.gosi_year}`)
      if (props?.jiga) {
        const price = parseInt(props.jiga.toString().replace(/[^0-9]/g, ''))
        if (price > 0) return price
      }
    } catch (e: any) { console.warn('[LandPrice/LP_PA]', e.message) }
  }
  
  // 좌표로 주변 필지 검색 후 jiga 조회
  if (entX && entY) {
    try {
      const params = new URLSearchParams({
        service: 'data', request: 'GetFeature', data: 'LP_PA_CBND_BUBUN',
        key: VWORLD_KEY, domain: VWORLD_DOMAIN,
        geomFilter: `POINT(${entX} ${entY})`,
        geometry: 'false', attribute: 'true', format: 'json', size: '1',
      })
      const res = await fetch(`https://api.vworld.kr/req/data?${params}`, { signal: AbortSignal.timeout(10000) })
      const data = await res.json()
      const props = data?.response?.result?.featureCollection?.features?.[0]?.properties
      console.log(`[LandPrice/LP_PA/coord] jiga=${props?.jiga}`)
      if (props?.jiga) {
        const price = parseInt(props.jiga.toString().replace(/[^0-9]/g, ''))
        if (price > 0) return price
      }
    } catch (e: any) { console.warn('[LandPrice/LP_PA/coord]', e.message) }
  }
  
  return null
}

async function fetchFromNsdi(pnu: string, year: number, apiKey: string): Promise<number | null> {
  const url = `${NSDI_BASE}?serviceKey=${encodeURIComponent(apiKey)}&pnu=${pnu}&stdrYear=${year}&returnType=json`
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  const text = await res.text()
  if (text.trim().startsWith('<')) {
    const m = text.match(/<(?:indvdLandPc|pblntfPclnd)>([\d,]+)<\//)
    if (m) { const p = parseInt(m[1].replace(/,/g,'')); return p > 0 ? p : null }
    return null
  }
  const data = JSON.parse(text)
  const features = data?.features || data?.result?.featureCollection?.features || []
  if (!features.length) return null
  const props = features[0]?.properties ?? features[0]
  const price = parseInt((props?.indvdLandPc ?? props?.pblntfPclnd ?? '0').toString().replace(/,/g,''))
  return price > 0 ? price : null
}

export async function GET() {
  return NextResponse.json({ status: 'ok', vworld: !!VWORLD_API_KEY, nsdi: !!LAND_PRICE_API_KEY })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { sigunguCd, bjdongCd, bun, ji, address, stdrYear, entX, entY, bdMgtSn } = body
  const year = stdrYear || (new Date().getFullYear() - 1)

  if (!sigunguCd || !bjdongCd) {
    // bdMgtSn이 있으면 PNU 직접 구성 가능 → 조기 리턴 건너뜀
    if (!bdMgtSn || bdMgtSn.length < 19) {
      return NextResponse.json({
        success: true, isDemo: true, source: 'district-average', stdrYear: year,
        landPricePerM2: extractDistrictPrice(address || ''),
        message: '필지 코드 없음 — 지역 추정값 적용',
      })
    }
  }

  // bdMgtSn이 있으면 직접 사용 (가장 정확한 PNU)
  const pnu = (bdMgtSn && bdMgtSn.length >= 19)
    ? bdMgtSn.slice(0, 19)
    : buildPNU(sigunguCd, bjdongCd, bun || '0000', ji || '0000')
  console.log(`[LandPrice] pnu=${pnu} (from ${bdMgtSn ? 'bdMgtSn' : 'sigunguCd/bjdongCd'})`)
  console.log(`[LandPrice] PNU=${pnu}, year=${year}`)

  // 0순위: Vworld 직접 호출 (Seoul 리전 - 한국 IP)
  try {
    const price = await fetchFromVworld(pnu, entX, entY)
    if (price) {
      console.log(`[LandPrice/Vworld] price=${price}`)
      return NextResponse.json({ success: true, landPricePerM2: price, pnu, source: 'api', stdrYear: year, via: 'vworld' })
    }
  } catch (e: any) { console.warn('[LandPrice/Vworld]', e.message) }

  // 2순위: NSDI
  if (LAND_PRICE_API_KEY) {
    try {
      const price = await fetchFromNsdi(pnu, year, LAND_PRICE_API_KEY)
      if (price) return NextResponse.json({ success: true, landPricePerM2: price, pnu, source: 'api', stdrYear: year, via: 'nsdi' })
      const price2 = await fetchFromNsdi(pnu, year - 1, LAND_PRICE_API_KEY)
      if (price2) return NextResponse.json({ success: true, landPricePerM2: price2, pnu, source: 'api', stdrYear: year-1, via: 'nsdi' })
    } catch (e: any) { console.warn('[LandPrice/NSDI]', e.message) }
  }

  return NextResponse.json({
    success: true, isDemo: true, pnu, source: 'district-average', stdrYear: year,
    landPricePerM2: extractDistrictPrice(address || ''),
    message: '공시지가 API 조회 실패 — 지역 추정값 적용',
  })
}
