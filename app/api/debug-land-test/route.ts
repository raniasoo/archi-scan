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
  { name: '마포구 합정동', district: '마포구' },
  { name: '노원구 상계동', district: '노원구' },
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
    let firstXmlSample = ''
    
    // 최근 6개월 조회 (실거래 데이터 지연 대응)
    for (let i = 1; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
      const url = `${API_URL}?serviceKey=${encodeURIComponent(API_KEY)}&LAWD_CD=${regionCode}&DEAL_YMD=${ym}&pageNo=1&numOfRows=30`
      
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
      if (!res.ok) continue
      const xml = await res.text()
      
      // 에러 체크 + 원문 디버그
      if (xml.includes('SERVICE_KEY') || xml.includes('SERVICE ERROR') || xml.includes('<errMsg>')) {
        return {
          address: district, regionCode, count: 0,
          avgPricePerM2: 0, minPrice: 0, maxPrice: 0,
          source: 'AUTH_ERROR', topTransactions: [],
          error: `API오류 ym=${ym} xml=${xml.substring(0, 400)}`
        }
      }

      // totalCount 확인
      const tcMatch = xml.match(/<totalCount>(\d+)</)
      const tc = tcMatch ? parseInt(tcMatch[1]) : -1
      if (tc === 0 && allTxns.length === 0) continue  // 이 달 데이터 없음 → 다음 달
      
      // 첫 번째 XML 샘플 저장 (디버그)
      if (allTxns.length === 0 && !firstXmlSample) firstXmlSample = xml.substring(0, 500)

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
      // 마지막 조회 URL 디버그
      const d = new Date(now.getFullYear(), now.getMonth() - 6, 1)
      const lastYm = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
      return {
        address: district, regionCode, count: 0,
        avgPricePerM2: 0, minPrice: 0, maxPrice: 0,
        source: 'NO_DATA', topTransactions: [],
        error: `12개월 조회 결과 0건 (code=${regionCode}, lastYm=${lastYm}) xmlSample=${firstXmlSample.substring(0, 200)}`
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
