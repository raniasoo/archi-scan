/**
 * Vworld 지적도 API 라우트
 * POST /api/vworld
 * 
 * 주소 → 좌표 변환 → 지적 폴리곤 조회
 * API 키는 서버 환경변수로 보호
 */
import { NextRequest, NextResponse } from 'next/server'
import { geocodeAddress, fetchParcelPolygon } from '@/lib/vworld'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { address, lng, lat } = await req.json()

    const apiKey = process.env.VWORLD_API_KEY
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
