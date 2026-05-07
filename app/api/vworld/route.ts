import { NextRequest, NextResponse } from 'next/server'

const VWORLD_KEY = process.env.VWORLD_API_KEY

// ━━━ 1. 좌표 기반 필지 경계 조회 (연속지적도) ━━━
async function fetchParcelBoundary(lat: number, lng: number): Promise<any> {
  // VWORLD 연속지적도 WFS — 좌표 주변 필지
  const buffer = 0.001 // ~100m
  const bbox = `${lng - buffer},${lat - buffer},${lng + buffer},${lat + buffer}`
  const url = `https://api.vworld.kr/req/wfs?service=WFS&version=2.0.0&request=GetFeature&typeName=LP_PA_CBND_BUBUN&srsName=EPSG:4326&bbox=${bbox},EPSG:4326&key=${VWORLD_KEY}&resultType=results&maxFeatures=5&output=application/json`

  const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
  if (!res.ok) throw new Error(`VWORLD WFS error: ${res.status}`)
  return res.json()
}

// ━━━ 2. 주변 건물 3D 데이터 조회 ━━━
async function fetchBuildings3D(lat: number, lng: number): Promise<any> {
  const buffer = 0.002 // ~200m
  const bbox = `${lng - buffer},${lat - buffer},${lng + buffer},${lat + buffer}`
  const url = `https://api.vworld.kr/req/wfs?service=WFS&version=2.0.0&request=GetFeature&typeName=LP_PA_CBND_BUBUN_3D&srsName=EPSG:4326&bbox=${bbox},EPSG:4326&key=${VWORLD_KEY}&resultType=results&maxFeatures=50&output=application/json`

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

// ━━━ 3. 위성영상 URL 생성 ━━━
function getSatelliteUrl(lat: number, lng: number, zoom: number = 18): string {
  return `https://api.vworld.kr/req/image?service=image&request=getmap&key=${VWORLD_KEY}&basemap=PHOTO&center=${lng},${lat}&zoom=${zoom}&size=600,400&format=png`
}

// ━━━ 4. 주변 건물 정보 조회 (VWORLD Data API) ━━━
async function fetchNearbyBuildings(lat: number, lng: number): Promise<any> {
  const buffer = 0.002
  const bbox = `${lng - buffer},${lat - buffer},${lng + buffer},${lat + buffer}`
  const url = `https://api.vworld.kr/req/data?service=data&request=GetFeature&data=LT_C_AISRESC&key=${VWORLD_KEY}&geomFilter=BOX(${bbox})&crs=EPSG:4326&size=30&format=json`

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!VWORLD_KEY) {
      return NextResponse.json({ error: 'VWORLD_API_KEY not configured' }, { status: 500 })
    }

    const { lat, lng, type } = await req.json()
    if (!lat || !lng) {
      return NextResponse.json({ error: 'lat/lng required' }, { status: 400 })
    }

    if (type === 'satellite') {
      // 위성사진 URL만 반환
      return NextResponse.json({
        success: true,
        satelliteUrl: getSatelliteUrl(lat, lng, 18),
        satelliteUrlWide: getSatelliteUrl(lat, lng, 16),
      })
    }

    // 필지 경계 + 주변 정보 동시 조회
    const [parcelData, buildingData] = await Promise.all([
      fetchParcelBoundary(lat, lng).catch(e => {
        console.error('[VWORLD] Parcel error:', e.message)
        return null
      }),
      fetchNearbyBuildings(lat, lng).catch(() => null),
    ])

    // 필지 폴리곤 추출
    let parcelPolygon: [number, number][] = []
    let parcelArea = 0
    let pnu = ''

    if (parcelData?.features?.length) {
      const feature = parcelData.features[0]
      const geom = feature.geometry
      if (geom?.type === 'Polygon' || geom?.type === 'MultiPolygon') {
        const coords = geom.type === 'MultiPolygon' 
          ? geom.coordinates[0][0] 
          : geom.coordinates[0]
        parcelPolygon = coords.map((c: number[]) => [c[1], c[0]] as [number, number]) // [lat, lng]
      }
      parcelArea = feature.properties?.area || 0
      pnu = feature.properties?.pnu || ''
    }

    // 주변 건물 정보 추출
    const nearbyBuildings: any[] = []
    if (buildingData?.response?.result?.featureCollection?.features) {
      for (const f of buildingData.response.result.featureCollection.features) {
        nearbyBuildings.push({
          name: f.properties?.bdNm || '',
          floors: f.properties?.grndFlrCnt || 0,
          height: f.properties?.heit || 0,
          use: f.properties?.mainPurpCdNm || '',
        })
      }
    }

    return NextResponse.json({
      success: true,
      parcel: {
        polygon: parcelPolygon,
        area: parcelArea,
        pnu,
        featureCount: parcelData?.features?.length || 0,
      },
      nearbyBuildings,
      satelliteUrl: getSatelliteUrl(lat, lng, 18),
      context: {
        buildingCount: nearbyBuildings.length,
        maxFloors: nearbyBuildings.reduce((m: number, b: any) => Math.max(m, b.floors), 0),
        avgFloors: nearbyBuildings.length > 0 
          ? Math.round(nearbyBuildings.reduce((s: number, b: any) => s + b.floors, 0) / nearbyBuildings.length) 
          : 0,
      },
    })

  } catch (error) {
    console.error('[VWORLD] Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'VWORLD API error' 
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ 
    configured: !!VWORLD_KEY,
    capabilities: ['parcel-boundary', 'satellite', 'nearby-buildings'],
  })
}
