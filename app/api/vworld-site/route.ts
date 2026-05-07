import { NextRequest, NextResponse } from 'next/server'

const VWORLD_KEY = process.env.VWORLD_API_KEY

function getSatelliteUrl(lat: number, lng: number, zoom: number = 18): string {
  return `https://api.vworld.kr/req/image?service=image&request=getmap&key=${VWORLD_KEY}&basemap=PHOTO&center=${lng},${lat}&zoom=${zoom}&size=600,400&format=png`
}

async function fetchParcelWFS(lat: number, lng: number): Promise<any> {
  const buffer = 0.001
  const bbox = `${lng - buffer},${lat - buffer},${lng + buffer},${lat + buffer}`
  const url = `https://api.vworld.kr/req/wfs?service=WFS&version=2.0.0&request=GetFeature&typeName=LP_PA_CBND_BUBUN&srsName=EPSG:4326&bbox=${bbox},EPSG:4326&key=${VWORLD_KEY}&resultType=results&maxFeatures=5&output=application/json`
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
  if (!res.ok) return null
  return res.json()
}

async function fetchNearbyBuildings(lat: number, lng: number): Promise<any> {
  const buffer = 0.002
  const url = `https://api.vworld.kr/req/data?service=data&request=GetFeature&data=LT_C_AISRESC&key=${VWORLD_KEY}&geomFilter=BOX(${lng-buffer},${lat-buffer},${lng+buffer},${lat+buffer})&crs=EPSG:4326&size=30&format=json`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

export async function POST(req: NextRequest) {
  try {
    if (!VWORLD_KEY) {
      return NextResponse.json({ error: 'VWORLD_API_KEY not configured' }, { status: 500 })
    }
    const { lat, lng } = await req.json()
    if (!lat || !lng) {
      return NextResponse.json({ error: 'lat/lng required' }, { status: 400 })
    }

    const [parcelData, buildingData] = await Promise.all([
      fetchParcelWFS(lat, lng).catch(() => null),
      fetchNearbyBuildings(lat, lng).catch(() => null),
    ])

    let parcelPolygon: [number, number][] = []
    if (parcelData?.features?.length) {
      const geom = parcelData.features[0].geometry
      if (geom?.type === 'Polygon') parcelPolygon = geom.coordinates[0].map((c: number[]) => [c[1], c[0]])
      else if (geom?.type === 'MultiPolygon') parcelPolygon = geom.coordinates[0][0].map((c: number[]) => [c[1], c[0]])
    }

    const nearbyBuildings: any[] = []
    if (buildingData?.response?.result?.featureCollection?.features) {
      for (const f of buildingData.response.result.featureCollection.features) {
        nearbyBuildings.push({
          name: f.properties?.bdNm || '',
          floors: f.properties?.grndFlrCnt || 0,
          use: f.properties?.mainPurpCdNm || '',
        })
      }
    }

    return NextResponse.json({
      success: true,
      parcel: { polygon: parcelPolygon, count: parcelData?.features?.length || 0 },
      nearbyBuildings,
      satelliteUrl: getSatelliteUrl(lat, lng, 18),
      context: {
        buildingCount: nearbyBuildings.length,
        maxFloors: nearbyBuildings.reduce((m: number, b: any) => Math.max(m, b.floors || 0), 0),
        avgFloors: nearbyBuildings.length > 0 ? Math.round(nearbyBuildings.reduce((s: number, b: any) => s + (b.floors || 0), 0) / nearbyBuildings.length) : 0,
      },
    })
  } catch (error) {
    console.error('[VWORLD-SITE] Error:', error)
    return NextResponse.json({ error: 'VWORLD API error' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ configured: !!VWORLD_KEY })
}
