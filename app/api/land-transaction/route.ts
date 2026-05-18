import { NextRequest, NextResponse } from 'next/server'

/**
 * 토지 실거래 매매내역 API
 * 
 * 국토교통부_토지 매매 신고 자료 조회
 * https://apis.data.go.kr/1613000/RTMSDataSvcLandTrade
 * 
 * 기존 공시지가(land-price) + 실거래가(이 파일) = 정확한 토지가 추정
 */

const API_KEY = process.env.DATA_GO_KR_API_KEY || process.env.MOLIT_API_KEY || ''
const API_URL = 'https://apis.data.go.kr/1613000/RTMSDataSvcLandTrade/getRTMSDataSvcLandTrade'

// 서울시 구별 법정동코드 (앞 5자리)
const REGION_CODES: Record<string, string> = {
  '강남구': '11680', '서초구': '11650', '송파구': '11710', '강동구': '11740',
  '용산구': '11170', '성동구': '11200', '마포구': '11440', '광진구': '11215',
  '영등포구': '11560', '동작구': '11590', '서대문구': '11410', '종로구': '11110',
  '중구': '11140', '양천구': '11470', '노원구': '11350', '도봉구': '11320',
  '강북구': '11305', '성북구': '11290', '중랑구': '11260', '동대문구': '11230',
  '구로구': '11530', '금천구': '11545', '관악구': '11620', '은평구': '11380',
  '강서구': '11500',
  '해운대구': '26350', '수영구': '26410', '남구': '26290',
  '분당구': '41135', '수정구': '41131', '중원구': '41133',
  '수원시장안구': '41111', '용인시수지구': '41465', '고양시일산동구': '41285',
  '과천시': '41290', '하남시': '41450', '광명시': '41210',
}

// 토지 시세 fallback (만원/㎡, 2025 기준)
const FALLBACK_PRICES: Record<string, number> = {
  '강남구': 5500, '서초구': 4800, '송파구': 3800, '용산구': 4200,
  '성동구': 3200, '마포구': 3500, '광진구': 3000, '영등포구': 2800,
  '강동구': 3000, '동작구': 2500, '서대문구': 2200, '종로구': 3000,
  '중구': 2800, '양천구': 2500, '노원구': 1500, '도봉구': 1300,
  '강북구': 1400, '성북구': 1800, '중랑구': 1600, '동대문구': 1800,
  '구로구': 2000, '금천구': 1800, '관악구': 1800, '은평구': 1700,
  '강서구': 2000,
  '해운대구': 2200, '분당구': 3000, '수원시장안구': 1800,
  '과천시': 3500, '하남시': 2500, '광명시': 2200,
}

interface Transaction {
  amount: number        // 거래금액 (만원)
  area: number          // 거래면적 (㎡)
  pricePerM2: number    // ㎡당 (만원)
  date: string          // YYYY.MM.DD
  landUse: string       // 용도지역
  landType: string      // 지목
  dong: string          // 법정동
  jibun: string         // 지번
}

function extractDistrict(addr: string): string {
  const m = addr.match(/(\S+구)/)
  return m ? m[1] : ''
}

async function fetchTransactions(regionCode: string, dealYmd: string): Promise<Transaction[]> {
  if (!API_KEY) return []
  try {
    const url = `${API_URL}?serviceKey=${encodeURIComponent(API_KEY)}&LAWD_CD=${regionCode}&DEAL_YMD=${dealYmd}&pageNo=1&numOfRows=100`
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return []
    const xml = await res.text()

    const items: Transaction[] = []
    const re = /<item>([\s\S]*?)<\/item>/g
    let m
    while ((m = re.exec(xml)) !== null) {
      const s = m[1]
      const v = (tag: string) => { const x = s.match(new RegExp(`<${tag}>([^<]*)</${tag}`)); return x ? x[1].trim() : '' }
      // 영문 camelCase 태그명 (국토부 API 실제 응답)
      const amt = parseInt(v('dealAmount').replace(/,/g, '')) || 0
      const area = parseFloat(v('dealArea')) || 0
      if (amt > 0 && area > 0) {
        items.push({
          amount: amt, area, pricePerM2: Math.round(amt / area),
          date: `${v('dealYear')}.${v('dealMonth').padStart(2,'0')}.${v('dealDay').padStart(2,'0')}`,
          landUse: v('landUse'), landType: v('jimok'),
          dong: v('umdNm'), jibun: v('jibun'),
        })
      }
    }
    return items
  } catch (e) {
    console.warn('[LAND-TXN] fetch error:', e)
    return []
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { address, months = 6, sigunguCd } = body

    const district = extractDistrict(address || '')
    const regionCode = sigunguCd?.substring(0, 5) || REGION_CODES[district] || '11680'

    // 최근 N개월 조회
    const now = new Date()
    const all: Transaction[] = []

    for (let i = 0; i < Math.min(months, 12); i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
      const txns = await fetchTransactions(regionCode, ym)
      all.push(...txns)
      if (all.length >= 50) break // 충분한 데이터
    }

    if (all.length > 0) {
      // 실거래 데이터
      const prices = all.map(t => t.pricePerM2).sort((a, b) => a - b)
      const avg = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length)
      return NextResponse.json({
        success: true,
        source: 'realTransaction',
        district,
        regionCode,
        count: all.length,
        period: `최근 ${months}개월`,
        avgPricePerM2: avg,
        medianPricePerM2: prices[Math.floor(prices.length / 2)],
        minPricePerM2: prices[0],
        maxPricePerM2: prices[prices.length - 1],
        transactions: all.slice(0, 20).map(t => ({
          ...t,
          amountFormatted: `${(t.amount / 10000).toFixed(1)}억원`,
          areaFormatted: `${t.area.toFixed(1)}㎡`,
          priceFormatted: `${t.pricePerM2.toLocaleString()}만/㎡`,
        })),
        // 사업성 분석 연동용
        estimatedLandCostPerM2: avg,
        estimatedLandCostPerPyeong: Math.round(avg * 3.3058),
        confidence: 'high',
      })
    }

    // Fallback
    const fb = FALLBACK_PRICES[district] || 2000
    return NextResponse.json({
      success: true,
      source: 'fallback',
      district,
      regionCode,
      count: 0,
      period: '추정치 (실거래 데이터 없음)',
      avgPricePerM2: fb,
      medianPricePerM2: fb,
      minPricePerM2: Math.round(fb * 0.7),
      maxPricePerM2: Math.round(fb * 1.3),
      transactions: [],
      estimatedLandCostPerM2: fb,
      estimatedLandCostPerPyeong: Math.round(fb * 3.3058),
      confidence: 'low',
      note: 'API 키 미설정 또는 해당 지역 거래 데이터 없음. 구별 평균 추정치 사용.',
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
