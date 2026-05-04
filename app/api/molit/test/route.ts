// app/api/molit/test/route.ts - 디버그용 테스트 엔드포인트
import { NextResponse } from 'next/server'
import { normalizeAddress } from '@/lib/address-parser'

const JUSO_KEY = 'U01TX0FVVEgyMDI2MDUwNDIyMDk0NzExODA5OTM='

export async function GET() {
  const address = '서울특별시 종로구 평창12길 16-6'
  const normalized = normalizeAddress(address)
  
  const baseUrl = 'https://business.juso.go.kr/addrlink/addrLinkApi.do'
  const encodedKeyword = encodeURIComponent(normalized)
  const requestUrl = `${baseUrl}?confmKey=${JUSO_KEY}&keyword=${encodedKeyword}&resultType=json&countPerPage=10&currentPage=1`
  
  try {
    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    })
    const text = await response.text()
    const data = JSON.parse(text)
    
    return NextResponse.json({
      address,
      normalized,
      keyUsed: JUSO_KEY.substring(0, 10) + '...',
      httpStatus: response.status,
      errorCode: data?.results?.common?.errorCode,
      errorMessage: data?.results?.common?.errorMessage,
      totalCount: data?.results?.common?.totalCount,
      firstResult: data?.results?.juso?.[0]?.roadAddr,
    })
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err), address, normalized })
  }
}
