/**
 * Vworld 지적도 API 라우트
 * POST /api/vworld - 지적도 폴리곤 조회
 * GET  /api/vworld - 키 설정 상태 확인
 */
import { NextRequest, NextResponse } from 'next/server'
import { geocodeAddress, fetchParcelPolygon } from '@/lib/vworld'

export const dynamic = 'force-dynamic'

// Vworld API 키 유효성 검사 (UUID 형식: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX, 36자)
const VWORLD_FALLBACK_KEY = 'FFEC486D-E635-345C-9BA6-5404A5AA191B'
function getVworldApiKey(): string {
  const rawKey = process.env.VWORLD_API_KEY
  if (!rawKey) return VWORLD_FALLBACK_KEY
  const trimmed = rawKey.trim()
  // UUID 형식 검사 (36자, 하이픈 포함)
  const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)
  if (!isValidUUID) {
    console.warn('[vworld] VWORLD_API_KEY 형식 불일치 — fallback 키 사용')
    return VWORLD_FALLBACK_KEY
  }
  return trimmed
}

export async function GET(req: NextRequest) {
  const apiKey = getVworldApiKey()
  const url = req.nextUrl.searchParams.get('url')
  
  // 직접 URL 테스트 모드
  if (url) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
      const text = await res.text()
      return NextResponse.json({ status: res.status, body: text.substring(0, 500) })
    } catch (e) {
      return NextResponse.json({ error: String(e) })
    }
  }

  // 기본: geocoding 테스트
  const testAddress = '서울특별시 강남구 테헤란로 152'
  const geoParams = new URLSearchParams({
    service: 'address', request: 'getcoord', version: '2.0',
    crs: 'EPSG:4326', address: testAddress, type: 'road', format: 'json',
    key: apiKey, domain: 'v0-archi-scan-layout-generator.vercel.app',
  })
  
  try {
    console.log('[vworld-diag] Testing geocode API...')
    const res = await fetch(`https://api.vworld.kr/req/address?${geoParams}`, {
      headers: {
        'Referer': 'https://v0-archi-scan-layout-generator.vercel.app',
        'Origin': 'https://v0-archi-scan-layout-generator.vercel.app',
      },
      signal: AbortSignal.timeout(8000),
    })
    const text = await res.text()
    console.log('[vworld-diag] geocode response:', text.substring(0, 300))
    return NextResponse.json({
      apiKey: `${apiKey.substring(0, 8)}... (${apiKey.length}자)`,
      source: process.env.VWORLD_API_KEY ? 'env' : 'fallback',
      geocodeStatus: res.status,
      geocodeBody: text.substring(0, 500),
      timestamp: new Date().toISOString(),
    })
  } catch (e) {
    console.log('[vworld-diag] geocode error:', String(e))
    return NextResponse.json({
      apiKey: `${apiKey.substring(0, 8)}... (${apiKey.length}자)`,
      error: String(e),
      timestamp: new Date().toISOString(),
    })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { address, lng, lat, siteArea } = await req.json()

    const apiKey = getVworldApiKey()
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'VWORLD_API_KEY 환경변수 미설정',
        demo: true,
        demoParcel: getDemoParcel(address, siteArea),
      }, { status: 200 })
    }

    let coordLng = lng
    let coordLat = lat

    // 좌표가 없으면 주소로 geocoding
    if (!coordLng || !coordLat) {
      if (!address) {
        return NextResponse.json({ success: false, error: '주소 또는 좌표 필요' }, { status: 400 })
      }
      console.log('[vworld] geocoding address:', address)
      const geoResult = await geocodeAddress(address, apiKey)
      console.log('[vworld] geocode result:', JSON.stringify(geoResult))
      if (!geoResult.success) {
        console.log('[vworld] geocode failed, using demo')
        return NextResponse.json({
          success: false,
          error: `좌표 변환 실패: ${geoResult.error}`,
          demo: true,
          demoParcel: getDemoParcel(address, siteArea),
        })
      }
      coordLng = geoResult.lng!
      coordLat = geoResult.lat!
    }

    console.log('[vworld] fetching parcel for:', coordLng, coordLat)
    // 지적 폴리곤 조회
    const parcelResult = await fetchParcelPolygon(coordLng, coordLat, apiKey)
    console.log('[vworld] parcel result success:', parcelResult.success, 'error:', parcelResult.error)

    if (!parcelResult.success) {
      return NextResponse.json({
        success: false,
        error: parcelResult.error,
        coordinates: { lng: coordLng, lat: coordLat },
        demo: true,
        demoParcel: getDemoParcel(address, siteArea),
      })
    }

    return NextResponse.json({
      success: true,
      parcel: parcelResult.parcel,
      coordinates: { lng: coordLng, lat: coordLat },
    })

  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}

/**
 * API 키 없을 때 데모 데이터 (직사각형 가상 필지)
 */
function getDemoParcel(address?: string, siteArea?: number) {
  const area = siteArea && siteArea > 0 ? siteArea : 660
  // 면적에 맞는 가상 직사각형 (황금비 1:1.6 근사)
  const centerLng = 127.0276
  const centerLat = 37.4979
  // 1도 ≈ 111319m 기준, 면적을 m²로 변환해서 위경도 차이 계산
  const sideM = Math.sqrt(area / 1.6) // 너비 (m)
  const heightM = area / sideM        // 높이 (m)
  const w = (sideM / 2) / 111319 * Math.cos(centerLat * Math.PI / 180)
  const h = (heightM / 2) / 111319

  return {
    pnu: 'DEMO',
    address: address || '서울특별시 강남구 테헤란로 152',
    area,
    landUse: '대',
    isDemo: true,
    coordinates: [
      [centerLng - w, centerLat - h],
      [centerLng + w, centerLat - h],
      [centerLng + w, centerLat + h],
      [centerLng - w, centerLat + h],
      [centerLng - w, centerLat - h],
    ] as [number, number][],
    centroid: [centerLng, centerLat] as [number, number],
    bbox: {
      minLng: centerLng - w, minLat: centerLat - h,
      maxLng: centerLng + w, maxLat: centerLat + h,
    }
  }
}
