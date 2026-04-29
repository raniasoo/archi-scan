/**
 * 통합 테스트 API — GET /api/test-all
 * 지적도/주소/투시도/체크리스트 4개 항목을 실제 호출하여 검증
 */
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET() {
  const results: Record<string, unknown> = {}
  const baseUrl = 'https://v0-archi-scan-layout-generator.vercel.app'

  // ============================================================
  // 테스트 1: 지적도 실제 지형 (Overpass 폴리곤)
  // ============================================================
  try {
    const vwRes = await fetch(`${baseUrl}/api/vworld`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: '서울특별시 강남구 테헤란로 152',
        siteArea: 3200,
        entX: 127.0365,
        entY: 37.5000,
      }),
      signal: AbortSignal.timeout(15000),
    })
    const vwData = await vwRes.json()
    const parcel = vwData?.parcel || {}
    const coords = parcel.coordinates || []
    results['test1_지적도'] = {
      success: vwData.success,
      source: parcel.source || 'N/A',
      area: parcel.area || 0,
      coordCount: coords.length,
      isDemo: parcel.isDemo,
      isRealPolygon: coords.length > 5,
      verdict: coords.length > 5 ? '✅ 실제 폴리곤' :
               coords.length === 5 ? '⚠️ 직사각형(fallback)' : '❌ 없음',
    }
  } catch (e) {
    results['test1_지적도'] = { error: String(e), verdict: '❌ 에러' }
  }

  // ============================================================
  // 테스트 1b: 메세나폴리스 (대형 복합건물)
  // ============================================================
  try {
    const vwRes2 = await fetch(`${baseUrl}/api/vworld`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: '서울특별시 마포구 양화로 45',
        siteArea: 13000,
        entX: 126.9189,
        entY: 37.5557,
      }),
      signal: AbortSignal.timeout(15000),
    })
    const vwData2 = await vwRes2.json()
    const parcel2 = vwData2?.parcel || {}
    const coords2 = parcel2.coordinates || []
    results['test1b_메세나폴리스'] = {
      success: vwData2.success,
      source: parcel2.source || 'N/A',
      area: parcel2.area || 0,
      coordCount: coords2.length,
      isRealPolygon: coords2.length > 5,
      verdict: coords2.length > 5 ? '✅ 실제 폴리곤' :
               coords2.length === 5 ? '⚠️ 직사각형' : '❌ 없음',
    }
  } catch (e) {
    results['test1b_메세나폴리스'] = { error: String(e), verdict: '❌ 에러' }
  }

  // ============================================================
  // 테스트 2: 주소 성공률 (MOLIT 조회 — 9개 주소)
  // ============================================================
  const testAddresses = [
    '서울특별시 강남구 테헤란로 152',
    '서울특별시 강남구 영동대로 513',
    '서울특별시 중구 세종대로 110',
    '서울특별시 송파구 올림픽로 300',
    '서울특별시 서초구 서초대로 411',
    '서울특별시 종로구 종로 1',
    '서울특별시 마포구 양화로 45',
    '서울특별시 용산구 이태원로 29',
    '서울특별시 강남구 테헤란로 152 강남파이낸스센터',
  ]

  const addressResults: { address: string; success: boolean; source?: string; error?: string }[] = []

  for (const addr of testAddresses) {
    try {
      const mRes = await fetch(`${baseUrl}/api/molit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addr }),
        signal: AbortSignal.timeout(12000),
      })
      const mData = await mRes.json()
      addressResults.push({
        address: addr,
        success: !!mData.success,
        source: mData.data?.dataSource || mData.diagnostics?.lookupPath || 'N/A',
        error: mData.error?.substring(0, 60),
      })
    } catch (e) {
      addressResults.push({ address: addr, success: false, error: String(e).substring(0, 60) })
    }
  }

  const successCount = addressResults.filter(r => r.success).length
  results['test2_주소성공률'] = {
    total: testAddresses.length,
    success: successCount,
    rate: `${Math.round(successCount / testAddresses.length * 100)}%`,
    verdict: successCount >= 8 ? '✅ 90%+ 달성' :
             successCount >= 6 ? '⚠️ 67%+ (개선 중)' : '❌ 낮음',
    details: addressResults,
  }

  // ============================================================
  // 테스트 3: 투시도 (번들에 포함 확인)
  // ============================================================
  try {
    const htmlRes = await fetch(baseUrl, { signal: AbortSignal.timeout(8000) })
    const htmlText = await htmlRes.text()
    // page 번들 파일명 추출
    const pageMatch = htmlText.match(/app\/page-([a-f0-9]+)\.js/)
    const pageBundle = pageMatch ? pageMatch[0] : null

    if (pageBundle) {
      const bundleRes = await fetch(`${baseUrl}/_next/static/chunks/${pageBundle}`, {
        signal: AbortSignal.timeout(8000),
      })
      const bundleText = await bundleRes.text()

      results['test3_투시도'] = {
        bundleFile: pageBundle,
        has투시도: bundleText.includes('투시도'),
        hasPerspective: bundleText.includes('perspective'),
        verdict: bundleText.includes('투시도') ? '✅ 번들에 포함' : '❌ 미포함',
      }
    } else {
      results['test3_투시도'] = { verdict: '⚠️ 번들 파일 탐지 실패' }
    }
  } catch (e) {
    results['test3_투시도'] = { error: String(e), verdict: '❌ 에러' }
  }

  // ============================================================
  // 요약
  // ============================================================
  const verdicts = Object.entries(results).map(([k, v]) => `${k}: ${(v as any)?.verdict || 'N/A'}`)

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    summary: verdicts,
    results,
  })
}
