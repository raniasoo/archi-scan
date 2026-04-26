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
  const testNominatim = req.nextUrl.searchParams.get('test') === 'nominatim'
  
  // Nominatim 테스트
  if (testNominatim) {
    try {
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=%EC%84%9C%EC%9A%B8%ED%8A%B9%EB%B3%84%EC%8B%9C+%EA%B0%95%EB%82%A8%EA%B5%AC+%ED%85%8C%ED%97%A4%EB%9E%80%EB%A1%9C+152&format=json&countrycodes=kr&limit=1`
      const res = await fetch(nominatimUrl, { 
        headers: { 'User-Agent': 'ArchiScan/1.0 (https://v0-archi-scan-layout-generator.vercel.app)' },
        signal: AbortSignal.timeout(8000)
      })
      const text = await res.text()
      return NextResponse.json({ nominatimStatus: res.status, body: text.substring(0, 500) })
    } catch (e) {
      return NextResponse.json({ nominatimError: String(e) })
    }
  }

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
    const { address, lng, lat, siteArea, entX, entY } = await req.json()

    // 1순위: JUSO/MOLIT에서 받은 실제 좌표가 있으면 사용
    if (entX && entY && entX > 120 && entY > 30) {
      console.log('[vworld] Using provided coordinates:', entX, entY)
      const area = siteArea || 0
      const parcel = buildParcelFromCoords(entX, entY, area, address)
      return NextResponse.json({ success: true, parcel, coordinates: { lng: entX, lat: entY } })
    }

    // 2순위: Nominatim으로 실제 건물 boundingbox 조회 (Vercel 서버에서 접근 가능)
    if (address) {
      try {
        const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&countrycodes=kr&limit=1`
        const nominatimRes = await fetch(nominatimUrl, {
          headers: { 'User-Agent': 'ArchiScan/1.0 (https://v0-archi-scan-layout-generator.vercel.app)' },
          signal: AbortSignal.timeout(8000),
        })
        if (nominatimRes.ok) {
          const nominatimData = await nominatimRes.json()
          if (nominatimData?.length > 0) {
            const result = nominatimData[0]
            const centerLng = parseFloat(result.lon)
            const centerLat = parseFloat(result.lat)
            const bbox = result.boundingbox // [minLat, maxLat, minLng, maxLng]
            
            let coordinates: [number, number][]
            let area = siteArea || 0

            if (bbox && bbox.length === 4) {
              // 실제 boundingbox로 폴리곤 생성
              const minLat = parseFloat(bbox[0])
              const maxLat = parseFloat(bbox[1])
              const minLng = parseFloat(bbox[2])
              const maxLng = parseFloat(bbox[3])
              
              // 면적 계산 (m²) - 위도 기반
              const widthM = (maxLng - minLng) * 111319 * Math.cos(centerLat * Math.PI / 180)
              const heightM = (maxLat - minLat) * 111319
              const calcArea = Math.round(widthM * heightM)
              if (calcArea > 100 && calcArea < 1000000) area = calcArea

              coordinates = [
                [minLng, minLat],
                [maxLng, minLat],
                [maxLng, maxLat],
                [minLng, maxLat],
                [minLng, minLat],
              ]
            } else {
              // boundingbox 없으면 면적 기반 폴리곤
              const parcel = buildParcelFromCoords(centerLng, centerLat, area, address)
              coordinates = parcel.coordinates
            }

            const lngs = coordinates.map(c => c[0])
            const lats = coordinates.map(c => c[1])
            
            const parcel = {
              pnu: `NOM:${centerLng.toFixed(5)},${centerLat.toFixed(5)}`,
              address: result.display_name || address,
              area: siteArea || area,  // MOLIT 면적 우선
              landUse: '대',
              isDemo: false,
              coordinates,
              centroid: [centerLng, centerLat] as [number, number],
              bbox: {
                minLng: Math.min(...lngs), minLat: Math.min(...lats),
                maxLng: Math.max(...lngs), maxLat: Math.max(...lats),
              }
            }
            
            console.log('[vworld] Nominatim success:', centerLng, centerLat, 'area:', parcel.area)
            return NextResponse.json({ success: true, parcel, source: 'nominatim' })
          }
        }
      } catch (nominatimErr) {
        console.log('[vworld] Nominatim failed:', String(nominatimErr))
      }
    }

    // 3순위: Vworld (해외 IP 차단 가능성 있음)
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
 * 실제 좌표 기반으로 필지 폴리곤 생성
 * Vworld 접속 불가 시 JUSO/MOLIT 좌표로 정확한 위치에 폴리곤 생성
 */
function buildParcelFromCoords(lng: number, lat: number, area: number, address?: string) {
  // 면적 기반 가로/세로 비율 계산 (황금비 1:1.618)
  const sideM = Math.sqrt(area / 1.618)
  const heightM = area / sideM

  // WGS84 좌표 변환 (m → 도)
  const latRad = lat * Math.PI / 180
  const dLng = (sideM / 2) / (111319 * Math.cos(latRad))
  const dLat = (heightM / 2) / 111319

  const coords: [number, number][] = [
    [lng - dLng, lat - dLat],
    [lng + dLng, lat - dLat],
    [lng + dLng, lat + dLat],
    [lng - dLng, lat + dLat],
    [lng - dLng, lat - dLat],
  ]

  return {
    pnu: `COORD:${lng.toFixed(5)},${lat.toFixed(5)}`,
    address: address || '',
    area: Math.round(area * 10) / 10,
    landUse: '대',
    isDemo: false,  // 실제 좌표 기반이므로 데모 아님
    coordinates: coords,
    centroid: [lng, lat] as [number, number],
    bbox: {
      minLng: lng - dLng, minLat: lat - dLat,
      maxLng: lng + dLng, maxLat: lat + dLat,
    }
  }
}


function getDemoParcel(address?: string, siteArea?: number) {
  const area = siteArea && siteArea > 0 ? siteArea : 0
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
