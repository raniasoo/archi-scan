import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
const LAMBDA = 'https://m4wofqr3gdz5xkk4puw3gluzja0upsve.lambda-url.ap-northeast-2.on.aws/'
const KEY    = 'FFEC486D-E635-345C-9BA6-5404A5AA191B'
const DOMAIN = 'v0-archi-scan-layout-generator.vercel.app'

// bdMgtSn "1168010100107370000023659" 분해:
// 법정동코드(10): 1168010100 + 산구분(1): 1 + 본번(4): 0737 + 부번(4): 0000 + 건물번호(6): 023659
const PNU_CORRECT = '1168010100107370000'  // 법정동코드 1168010100 사용

export async function GET() {
  const results: Record<string, unknown> = { pnu: PNU_CORRECT }

  // 1. 올바른 PNU로 Lambda 공시지가
  try {
    const r = await fetch(`${LAMBDA}?landprice=1&pnu=${PNU_CORRECT}`, { signal: AbortSignal.timeout(12000) })
    results.lambda_price = await r.json()
  } catch(e: unknown) { results.lambda_price = { error: String(e) } }

  // 2. getLandUseAttr으로 확인 (Vercel에서 직접)
  try {
    const url = `https://api.vworld.kr/ned/data/getLandUseAttr?key=${KEY}&domain=${DOMAIN}&pnu=${PNU_CORRECT}&cnflcAt=1&numOfRows=5&format=json`
    const r = await fetch(url, { signal: AbortSignal.timeout(10000) })
    results.landUse = { status: r.status, body: (await r.text()).slice(0, 500) }
  } catch(e: unknown) { results.landUse = { error: String(e) } }

  // 3. LP_PA_CBND_BUBUN으로 이 PNU가 유효한지 확인
  try {
    const url = `https://api.vworld.kr/req/data?service=data&request=GetFeature&data=LP_PA_CBND_BUBUN&attrFilter=pnu:=:${PNU_CORRECT}&geometry=false&attribute=true&format=json&key=${KEY}&domain=${DOMAIN}`
    const r = await fetch(url, { signal: AbortSignal.timeout(10000) })
    const j = await r.json()
    const features = j?.response?.result?.featureCollection?.features || []
    results.pnu_valid = { count: features.length, props: features[0]?.properties }
  } catch(e: unknown) { results.pnu_valid = { error: String(e) } }

  return NextResponse.json(results)
}
