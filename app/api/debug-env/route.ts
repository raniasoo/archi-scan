import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const molitKey = process.env.MOLIT_API_KEY || ''
  const jusoKey = process.env.JUSO_API_KEY || ''

  // MOLIT API 테스트
  let molitStatus = 'not-tested'
  let molitBody = ''
  try {
    const url = `https://apis.data.go.kr/1613000/BldRgstService_v2/getBrBasisOulnInfo?serviceKey=${molitKey}&sigunguCd=11680&bjdongCd=10100&bun=0513&ji=0000&_type=json&numOfRows=1&pageNo=1`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    molitBody = (await res.text()).substring(0, 300)
    molitStatus = `${res.status}`
  } catch (e) {
    molitStatus = `error: ${e instanceof Error ? e.message : String(e)}`
  }

  // JUSO API 테스트
  let jusoStatus = 'not-tested'
  let jusoBody = ''
  try {
    const url = `https://business.juso.go.kr/addrlink/addrLinkApi.do?confmKey=${jusoKey}&keyword=%EC%84%9C%EC%9A%B8%20%EC%A2%85%EB%A1%9C%EA%B5%AC&resultType=json&countPerPage=1&currentPage=1`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    jusoBody = (await res.text()).substring(0, 300)
    jusoStatus = `${res.status}`
  } catch (e) {
    jusoStatus = `error: ${e instanceof Error ? e.message : String(e)}`
  }

  return NextResponse.json({
    env: {
      MOLIT_API_KEY: molitKey ? `set(${molitKey.length}chars, ${molitKey.substring(0,8)}...)` : 'NOT_SET',
      JUSO_API_KEY: jusoKey ? `set(${jusoKey.length}chars, ${jusoKey.substring(0,8)}...)` : 'NOT_SET',
    },
    molit: { status: molitStatus, body: molitBody },
    juso: { status: jusoStatus, body: jusoBody },
  })
}
