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

export async function GET() {
  const apiKey = getVworldApiKey()
  const rawKey = process.env.VWORLD_API_KEY
  return NextResponse.json({
    vworldApiKey: `설정됨 (${apiKey.length}자, ${apiKey.substring(0, 8)}...)`,
    configured: true,
    source: rawKey && rawKey.trim() === apiKey ? 'env' : 'fallback',
    envRaw: rawKey ? `${rawKey.length}자` : '없음',
    timestamp: new Date().toISOString(),
  })
}

export async function POST(req: NextRequest) {
  try {
    const { address, lng, lat } = await req.json()

    const apiKey = getVworldApiKey()
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'VWORLD_API_KEY 환경변수 미설정',
        demo: true,
        demoParcel: getDemoParcel(address),
      }, { status: 200 })
    }

    let coordLng = lng
    let coordLat = lat

    // 좌표가 없으면 주소로 geocoding
    if (!coordLng || !coordLat) {
      if (!address) {
        return NextResponse.json({ success: false, error: '주소 또는 좌표 필요' }, { status: 400 })
      }
      const geoResult = await geocodeAddress(address, apiKey)
      if (!geoResult.success) {
        return NextResponse.json({
          success: false,
          error: `좌표 변환 실패: ${geoResult.error}`,
          demo: true,
          demoParcel: getDemoParcel(address),
        })
      }
      coordLng = geoResult.lng!
      coordLat = geoResult.lat!
    }

    // 지적 폴리곤 조회
    const parcelResult = await fetchParcelPolygon(coordLng, coordLat, apiKey)

    if (!parcelResult.success) {
      return NextResponse.json({
        success: false,
        error: parcelResult.error,
        coordinates: { lng: coordLng, lat: coordLat },
        demo: true,
        demoParcel: getDemoParcel(address),
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
function getDemoParcel(address?: string) {
  // 서울 강남 기준 가상 폴리곤 (약 660㎡ 직사각형)
  const centerLng = 127.0276
  const centerLat = 37.4979
  const w = 0.0002  // 약 18m
  const h = 0.00035 // 약 39m

  return {
    pnu: 'DEMO',
    address: address || '서울특별시 강남구 테헤란로 152',
    area: 660,
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
