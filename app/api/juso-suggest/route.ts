import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get('q')
  if (!keyword || keyword.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const jusoKey = 'U01TX0FVVEgyMDI2MDUwNDIyMDk0NzExODA5OTM='
  if (!jusoKey) {
    return NextResponse.json({ results: [], error: 'JUSO_API_KEY not configured' })
  }

  try {
    const encodedKeyword = encodeURIComponent(keyword)
    const url = `https://business.juso.go.kr/addrlink/addrLinkApi.do?confmKey=${jusoKey}&keyword=${encodedKeyword}&resultType=json&countPerPage=5&currentPage=1`
    
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    const data = await res.json()
    
    const jusoList = data?.results?.juso || []
    const results = jusoList.map((j: any) => ({
      roadAddr: j.roadAddr || '',
      jibunAddr: j.jibunAddr || '',
      zipNo: j.zipNo || '',
      bdNm: j.bdNm || '',
      siNm: j.siNm || '',
      sggNm: j.sggNm || '',
      emdNm: j.emdNm || '',
    }))

    return NextResponse.json({ results })
  } catch (e) {
    return NextResponse.json({ results: [], error: String(e) })
  }
}
