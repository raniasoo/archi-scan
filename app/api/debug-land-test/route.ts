import { NextRequest, NextResponse } from 'next/server'

/**
 * 토지 실거래 API 디버그 테스트 (GET)
 * 10개 샘플 주소로 자동 테스트
 * 
 * 호출: GET /api/debug-land-test
 */

const API_KEY = process.env.DATA_GO_KR_API_KEY || process.env.MOLIT_API_KEY || ''
const API_URL = 'https://apis.data.go.kr/1613000/RTMSDataSvcLandTrade/getRTMSDataSvcLandTrade'

const REGION_CODES: Record<string, string> = {
  '강남구': '11680', '서초구': '11650', '송파구': '11710', '용산구': '11170',
  '마포구': '11440', '성동구': '11200', '영등포구': '11560', '종로구': '11110',
  '노원구': '11350', '강서구': '11500',
}

const TEST_ADDRESSES = [
  { name: '강남구 역삼동', district: '강남구' },
  { name: '서초구 반포동', district: '서초구' },
  { name: '송파구 잠실동', district: '송파구' },
  { name: '용산구 한남동', district: '용산구' },
  { name: '마포구 합정동', district: '마포구' },
  { name: '성동구 성수동', district: '성동구' },
  { name: '영등포구 여의도동', district: '영등포구' },
  { name: '종로구 평창동', district: '종로구' },
  { name: '노원구 상계동', district: '노원구' },
  { name: '강서구 화곡동', district: '강서구' },
]

interface TxnResult {
  address: string
  regionCode: string
  count: number
  avgPricePerM2: number
  minPrice: number
  maxPrice: number
  source: string
  topTransactions: { amount: number; area: number; pricePerM2: number; dong: string; date: string }[]
  error?: string
}

async function testOneAddress(district: string): Promise<TxnResult> {
  const regionCode = REGION_CODES[district] || '11680'
  
  if (!API_KEY) {
    return {
      address: district, regionCode, count: 0,
      avgPricePerM2: 0, minPrice: 0, maxPrice: 0,
      source: 'NO_API_KEY', topTransactions: [],
      error: 'API 키 미설정'
    }
  }

  try {
    const now = new Date()
    const allTxns: any[] = []
    
    // 최근 3개월 조회
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
      const url = `${API_URL}?serviceKey=${encodeURIComponent(API_KEY)}&LAWD_CD=${regionCode}&DEAL_YMD=${ym}&pageNo=1&numOfRows=30`
      
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
      if (!res.ok) continue
      const xml = await res.text()
      
      // 에러 체크
      if (xml.includes('<returnAuthMsg>') && xml.includes('SERVICE_KEY')) {
        const errMsg = xml.match(/<returnAuthMsg>([^<]*)</)
        return {
          address: district, regionCode, count: 0,
          avgPricePerM2: 0, minPrice: 0, maxPrice: 0,
          source: 'AUTH_ERROR', topTransactions: [],
          error: `인증 오류: ${errMsg?.[1] || 'SERVICE_KEY_ERROR'}`
        }
      }

      const re = /<item>([\s\S]*?)<\/item>/g
      let m
      while ((m = re.exec(xml)) !== null) {
        const s = m[1]
        const v = (tag: string) => { const x = s.match(new RegExp(`<${tag}>([^<]*)</${tag}`)); return x ? x[1].trim() : '' }
        const amt = parseInt(v('거래금액').replace(/,/g, '')) || 0
        const area = parseFloat(v('거래면적')) || 0
        if (amt > 0 && area > 0) {
          allTxns.push({
            amount: amt, area, pricePerM2: Math.round(amt / area),
            dong: v('법정동'), date: `${v('년')}.${v('월').padStart(2,'0')}.${v('일').padStart(2,'0')}`,
            landUse: v('용도지역'), landType: v('지목'),
          })
        }
      }
      
      if (allTxns.length >= 20) break
    }

    if (allTxns.length === 0) {
      return {
        address: district, regionCode, count: 0,
        avgPricePerM2: 0, minPrice: 0, maxPrice: 0,
        source: 'NO_DATA', topTransactions: [],
        error: '해당 기간 거래 데이터 없음'
      }
    }

    const prices = allTxns.map(t => t.pricePerM2).sort((a: number, b: number) => a - b)
    const avg = Math.round(prices.reduce((s: number, p: number) => s + p, 0) / prices.length)

    return {
      address: district, regionCode,
      count: allTxns.length,
      avgPricePerM2: avg,
      minPrice: prices[0],
      maxPrice: prices[prices.length - 1],
      source: 'REAL_TRANSACTION',
      topTransactions: allTxns.slice(0, 5).map(t => ({
        amount: t.amount, area: t.area, pricePerM2: t.pricePerM2,
        dong: t.dong, date: t.date,
      })),
    }
  } catch (e: any) {
    return {
      address: district, regionCode, count: 0,
      avgPricePerM2: 0, minPrice: 0, maxPrice: 0,
      source: 'FETCH_ERROR', topTransactions: [],
      error: e.message,
    }
  }
}

export async function GET(req: NextRequest) {
  const startTime = Date.now()
  const results: TxnResult[] = []

  for (const test of TEST_ADDRESSES) {
    const result = await testOneAddress(test.district)
    result.address = test.name
    results.push(result)
  }

  const elapsed = Date.now() - startTime
  const successCount = results.filter(r => r.source === 'REAL_TRANSACTION').length

  return NextResponse.json({
    testDate: new Date().toISOString(),
    apiKeySet: API_KEY.length > 0,
    apiKeyPrefix: API_KEY.substring(0, 8) + '...',
    totalTests: results.length,
    successCount,
    failCount: results.length - successCount,
    elapsedMs: elapsed,
    results,
  }, { status: 200 })
}
