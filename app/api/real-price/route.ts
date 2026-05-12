/**
 * 실거래가 조회 API
 * 국토부 아파트/연립다세대/오피스텔 실거래가 → 주변 시세 자동 반영
 * 
 * Query params:
 *   sigunguCd: 시군구 코드 5자리 (필수)
 *   type: 'apt' | 'villa' | 'officetel' | 'all' (기본: apt)
 */
import { NextResponse } from 'next/server'

const MOLIT_API_KEY = process.env.MOLIT_API_KEY || '384c065c489b613aa46ae60dbc3284d59c52d1cbb9ec32bfeba5d56d21444098'

// 유형별 API 엔드포인트
const API_ENDPOINTS: Record<string, { url: string; nameTag: string; label: string }> = {
  apt: {
    url: 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade',
    nameTag: 'aptNm',
    label: '아파트',
  },
  villa: {
    url: 'https://apis.data.go.kr/1613000/RTMSDataSvcRHTrade/getRTMSDataSvcRHTrade',
    nameTag: 'mhouseNm',
    label: '연립다세대',
  },
  officetel: {
    url: 'https://apis.data.go.kr/1613000/RTMSDataSvcOffiTrade/getRTMSDataSvcOffiTrade',
    nameTag: 'offiNm',
    label: '오피스텔',
  },
}

// 인메모리 캐시 (1시간 TTL)
const cache = new Map<string, { data: any; ts: number }>()
const CACHE_TTL = 60 * 60 * 1000 // 1시간

interface RealPriceResult {
  avgPricePerM2: number       // ㎡당 평균 거래가 (원)
  avgPricePerPyeong: number   // 평당 평균 거래가 (원)
  transactionCount: number     // 거래 건수
  recentMonth: string          // 조회 기준월
  district: string             // 시군구
  priceRange: { min: number; max: number } // 가격 범위
  suggestedSalePrice: number   // 추천 분양가 (㎡당)
  transactions: Array<{
    name: string
    area: number
    price: number
    pricePerM2: number
    floor: number
    dealDate: string
  }>
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sigunguCd = searchParams.get('sigunguCd') || ''
  const propertyType = searchParams.get('type') || 'apt' // apt, villa, officetel, all
  
  if (!sigunguCd || sigunguCd.length < 5) {
    return NextResponse.json({ error: '시군구 코드(5자리)가 필요합니다' }, { status: 400 })
  }
  
  if (!MOLIT_API_KEY) {
    return NextResponse.json({ error: 'MOLIT_API_KEY 미설정' }, { status: 500 })
  }

  const lawdCd = sigunguCd.slice(0, 5)
  const typesToFetch = propertyType === 'all' 
    ? ['apt', 'villa', 'officetel'] 
    : [propertyType]
  
  // 캐시 확인
  const cacheKey = `${lawdCd}_${propertyType}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    console.log(`[real-price] 캐시 히트: ${cacheKey}`)
    return NextResponse.json(cached.data, { 
      headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' } 
    })
  }
  
  // 실거래 데이터는 1-2개월 지연 → 전월부터 6개월 조회
  const now = new Date()
  const months: string[] = []
  for (let i = 1; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const allTransactions: Array<{
    name: string; area: number; price: number; pricePerM2: number; floor: number; dealDate: string
  }> = []

  for (const dealYmd of months) {
    for (const pType of typesToFetch) {
      const endpoint = API_ENDPOINTS[pType]
      if (!endpoint) continue
      
      try {
        const params = new URLSearchParams({
          serviceKey: MOLIT_API_KEY,
          LAWD_CD: lawdCd,
          DEAL_YMD: dealYmd,
          pageNo: '1',
          numOfRows: '100',
        })
        
        const res = await fetch(
          `${endpoint.url}?${params}`,
          { signal: AbortSignal.timeout(10000) }
        )
        
        const text = await res.text()
        
        // 응답 디버깅 (첫 월 + 첫 유형만)
        if (dealYmd === months[0] && pType === typesToFetch[0]) {
          console.log(`[real-price] ${endpoint.label} HTTP ${res.status} | 응답 ${text.length}자 | 첫 300자: ${text.slice(0, 300).replace(/\n/g, ' ')}`)
        }
        
        // 에러 응답 체크
        if (text.includes('SERVICE_KEY_IS_NOT_REGISTERED') || text.includes('LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS')) {
          if (dealYmd === months[0]) console.warn(`[real-price] ${endpoint.label} API 키 미등록/한도초과`)
          continue
        }
        
        // XML 파싱 (간단한 정규식)
        const items = text.match(/<item>([\s\S]*?)<\/item>/g) || []
        
        for (const item of items) {
          const getValue = (tag: string) => {
            const m = item.match(new RegExp(`<${tag}>\\s*([^<]*?)\\s*</${tag}>`))
            return m ? m[1].trim() : ''
          }
          
          const areaStr = getValue('excluUseAr') || getValue('전용면적')
          const priceStr = (getValue('dealAmount') || getValue('거래금액')).replace(/,/g, '')
          const area = parseFloat(areaStr) || 0
          const price = parseInt(priceStr) * 10000 // 만원 → 원
          
          if (area > 0 && price > 0) {
            allTransactions.push({
              name: getValue(endpoint.nameTag) || getValue('아파트') || getValue('연립다세대') || getValue('단지명') || '—',
              area,
              price,
              pricePerM2: Math.round(price / area),
              floor: parseInt(getValue('floor') || getValue('층')) || 0,
              dealDate: `${dealYmd.slice(0,4)}.${dealYmd.slice(4)}.${getValue('dealDay') || getValue('일')}`,
            })
          }
        }
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e)
        console.warn(`[real-price] ${endpoint.label} ${dealYmd} 조회 실패: ${errMsg}`)
      }
    }
    // 충분한 데이터 확보 시 조기 종료 (20건 이상)
    if (allTransactions.length >= 20) break
  }

  if (allTransactions.length === 0) {
    return NextResponse.json({
      avgPricePerM2: 0,
      avgPricePerPyeong: 0,
      transactionCount: 0,
      recentMonth: months[0],
      district: lawdCd,
      priceRange: { min: 0, max: 0 },
      suggestedSalePrice: 0, // 데이터 없음 → 호출처에서 지역테이블 fallback 사용
      transactions: [],
      message: '최근 6개월 실거래 데이터가 없습니다. 지역별 시세 테이블을 사용합니다.',
    })
  }

  // 통계 계산
  const prices = allTransactions.map(t => t.pricePerM2).sort((a, b) => a - b)
  const q1 = prices[Math.floor(prices.length * 0.25)]
  const q3 = prices[Math.floor(prices.length * 0.75)]
  const iqr = q3 - q1
  const filtered = prices.filter(p => p >= q1 - 1.5 * iqr && p <= q3 + 1.5 * iqr)
  
  const avgPrice = Math.round(filtered.reduce((a, b) => a + b, 0) / filtered.length)
  const suggestedSalePrice = Math.round(avgPrice * 1.15 / 100000) * 100000 // 15% 프리미엄 + 10만원 단위 반올림

  const result: RealPriceResult = {
    avgPricePerM2: avgPrice,
    avgPricePerPyeong: Math.round(avgPrice * 3.3058),
    transactionCount: allTransactions.length,
    recentMonth: months[0],
    district: lawdCd,
    priceRange: { min: prices[0], max: prices[prices.length - 1] },
    suggestedSalePrice,
    transactions: allTransactions
      .sort((a, b) => b.pricePerM2 - a.pricePerM2)
      .slice(0, 10), // 상위 10건만
  }

  // 캐시 저장
  cache.set(cacheKey, { data: result, ts: Date.now() })
  // 캐시 크기 제한 (100개 초과 시 오래된 항목 삭제)
  if (cache.size > 100) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0]
    if (oldest) cache.delete(oldest[0])
  }

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' }
  })
}
