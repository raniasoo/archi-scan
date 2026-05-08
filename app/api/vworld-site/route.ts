import { NextRequest, NextResponse } from 'next/server'

const VWORLD_KEY = process.env.VWORLD_API_KEY
const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_KEY

function getSatelliteUrl(lat: number, lng: number, zoom: number = 18): string {
  // ESRI World Imagery (무료, API 키 불필요)
  const delta = 0.002
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${lng - delta},${lat - delta},${lng + delta},${lat + delta}&bboxSR=4326&imageSR=4326&size=600,400&format=png&f=image`
}

function getCadastralMapUrl(lat: number, lng: number, zoom: number = 18): string {
  // ESRI World Street Map (무료, API 키 불필요) + 지적도 대체
  const delta = 0.0015
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/export?bbox=${lng - delta},${lat - delta},${lng + delta},${lat + delta}&bboxSR=4326&imageSR=4326&size=600,400&format=png&f=image`
}

// 거리뷰 URL 생성 (Google Street View Static API)
function getStreetViewUrls(lat: number, lng: number): string[] {
  if (!GOOGLE_MAPS_KEY) return []
  return [0, 90, 180, 270].map(heading =>
    `https://maps.googleapis.com/maps/api/streetview?size=600x400&location=${lat},${lng}&heading=${heading}&pitch=0&fov=90&key=${GOOGLE_MAPS_KEY}`
  )
}

async function fetchParcelWFS(lat: number, lng: number): Promise<any> {
  const buffer = 0.001
  const bbox = `${lng - buffer},${lat - buffer},${lng + buffer},${lat + buffer}`
  const url = `https://api.vworld.kr/req/wfs?service=WFS&version=2.0.0&request=GetFeature&typeName=LP_PA_CBND_BUBUN&srsName=EPSG:4326&bbox=${bbox},EPSG:4326&key=${VWORLD_KEY}&resultType=results&maxFeatures=5&output=application/json`
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
  if (!res.ok) return null
  return res.json()
}

// ━━━ 주변 건물 + 도로 조회 (Overpass API — OSM) ━━━
async function fetchNearbyContext(lat: number, lng: number): Promise<{
  buildings: { lat: number; lng: number; floors: number; height: number; name: string; use: string; distance: number; direction: string; bearing: number }[]
  roads: { name: string; width: number; direction: string; distance: number }[]
}> {
  try {
    // 반경 100m 내 건물 + 도로
    const query = `[out:json][timeout:12];
(
  way(around:100,${lat},${lng})[building];
  way(around:80,${lat},${lng})[highway~"^(primary|secondary|tertiary|residential|unclassified)$"];
);out center tags;`

    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST', body: query,
      headers: { 'Content-Type': 'text/plain', 'User-Agent': 'ArchiScan/1.0' },
      signal: AbortSignal.timeout(12000),
    })
    const data = await res.json()
    const elements = data?.elements || []

    const LM = Math.cos(lat * Math.PI / 180) * 111319
    const buildings: any[] = []
    const roads: any[] = []

    for (const el of elements) {
      const cLat = el.center?.lat || el.lat
      const cLng = el.center?.lon || el.lon
      if (!cLat || !cLng) continue

      // 거리 (m)
      const dx = (cLng - lng) * LM
      const dy = (cLat - lat) * 111319
      const dist = Math.round(Math.sqrt(dx * dx + dy * dy))

      // 방향 (8방위)
      const bearing = Math.round((Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360)
      const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
      const direction = dirs[Math.round(bearing / 45) % 8]

      if (el.tags?.building) {
        const floors = parseInt(el.tags['building:levels'] || '0') || 0
        const height = parseFloat(el.tags['height'] || '0') || (floors > 0 ? floors * 3.3 : 0)
        buildings.push({
          lat: cLat, lng: cLng, floors, height: Math.round(height * 10) / 10,
          name: el.tags.name || '', use: el.tags['building'] || '',
          distance: dist, direction, bearing,
        })
      } else if (el.tags?.highway) {
        const widthStr = el.tags.width || el.tags.lanes
        let width = 6 // 기본
        if (widthStr) width = parseFloat(widthStr) || 6
        else if (el.tags.highway === 'primary') width = 12
        else if (el.tags.highway === 'secondary') width = 8
        else if (el.tags.highway === 'tertiary') width = 6
        else if (el.tags.highway === 'residential') width = 4

        roads.push({
          name: el.tags.name || el.tags.highway || '',
          width, direction, distance: dist,
        })
      }
    }

    // 거리순 정렬
    buildings.sort((a, b) => a.distance - b.distance)
    roads.sort((a, b) => a.distance - b.distance)

    return { buildings: buildings.slice(0, 20), roads: roads.slice(0, 5) }
  } catch (e) {
    console.warn('[OVERPASS] Error:', e)
    return { buildings: [], roads: [] }
  }
}

// ━━━ 방향별 건물 요약 생성 ━━━
function summarizeByDirection(
  buildings: { direction: string; floors: number; height: number; distance: number; name: string }[],
  roads: { direction: string; width: number; name: string; distance: number }[],
  siteLat: number
): {
  north: { maxHeight: number; count: number; closest: number; desc: string }
  south: { maxHeight: number; count: number; closest: number; desc: string }
  east: { maxHeight: number; count: number; closest: number; desc: string }
  west: { maxHeight: number; count: number; closest: number; desc: string }
  roadSummary: string
  shadowBlockers: string[]
  renderPrompt: string
} {
  const dirMap: Record<string, string> = { N: 'north', NE: 'north', NW: 'north', S: 'south', SE: 'south', SW: 'south', E: 'east', W: 'west' }
  const grouped: Record<string, typeof buildings> = { north: [], south: [], east: [], west: [] }

  for (const b of buildings) {
    const key = dirMap[b.direction] || 'north'
    grouped[key].push(b)
  }

  const summarize = (dir: string) => {
    const list = grouped[dir]
    if (!list.length) return { maxHeight: 0, count: 0, closest: 999, desc: 'Open (no buildings)' }
    const maxH = Math.max(...list.map(b => b.height || b.floors * 3.3))
    const closest = Math.min(...list.map(b => b.distance))
    const tallest = list.find(b => (b.height || b.floors * 3.3) === maxH)
    return {
      maxHeight: Math.round(maxH), count: list.length, closest,
      desc: `${list.length} building(s), tallest ${Math.round(maxH)}m (${tallest?.floors || '?'}F) at ${closest}m`,
    }
  }

  const north = summarize('north')
  const south = summarize('south')
  const east = summarize('east')
  const west = summarize('west')

  // 도로 요약
  const roadParts: string[] = []
  for (const r of roads) {
    const dir = dirMap[r.direction] || r.direction
    roadParts.push(`${r.width}m road on the ${dir} side${r.name ? ` (${r.name})` : ''}`)
  }
  const roadSummary = roadParts.length ? roadParts.join(', ') : 'Road information not available'

  // 일조 방해 건물 (남쪽에 높은 건물)
  const shadowBlockers: string[] = []
  const winterSunAngle = 90 - siteLat - 23.44 // 동지 ~29°
  for (const b of grouped.south) {
    const h = b.height || b.floors * 3.3
    if (h <= 0) continue
    const shadowReach = h / Math.tan(winterSunAngle * Math.PI / 180)
    if (shadowReach > b.distance * 0.7) {
      shadowBlockers.push(`${b.name || 'Building'} (${Math.round(h)}m, ${b.distance}m south) — shadow reaches ${Math.round(shadowReach)}m at winter solstice`)
    }
  }

  // 렌더링 프롬프트
  const parts: string[] = [
    'NEIGHBORING BUILDINGS (within 100m):',
    `  North: ${north.desc}`,
    `  South: ${south.desc}`,
    `  East: ${east.desc}`,
    `  West: ${west.desc}`,
    `  Roads: ${roadSummary}`,
  ]
  if (shadowBlockers.length) {
    parts.push(`  ⚠️ SHADOW BLOCKING: ${shadowBlockers.join('; ')}`)
    parts.push('  The rendering should show these neighboring buildings casting shadows.')
  }
  parts.push('Show the actual neighboring buildings at their correct heights and positions in the rendering background.')

  return { north, south, east, west, roadSummary, shadowBlockers, renderPrompt: parts.join('\n') }
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

    const [parcelData, nearbyCtx] = await Promise.all([
      fetchParcelWFS(lat, lng).catch(() => null),
      fetchNearbyContext(lat, lng),
    ])

    let parcelPolygon: [number, number][] = []
    if (parcelData?.features?.length) {
      const geom = parcelData.features[0].geometry
      if (geom?.type === 'Polygon') parcelPolygon = geom.coordinates[0].map((c: number[]) => [c[1], c[0]])
      else if (geom?.type === 'MultiPolygon') parcelPolygon = geom.coordinates[0][0].map((c: number[]) => [c[1], c[0]])
    }

    const dirSummary = summarizeByDirection(nearbyCtx.buildings, nearbyCtx.roads, lat)

    return NextResponse.json({
      success: true,
      parcel: { polygon: parcelPolygon, count: parcelData?.features?.length || 0 },
      nearbyBuildings: nearbyCtx.buildings,
      roads: nearbyCtx.roads,
      satelliteUrl: getSatelliteUrl(lat, lng, 18),
      cadastralMapUrl: getCadastralMapUrl(lat, lng, 18),
      streetViewUrls: getStreetViewUrls(lat, lng),
      directions: {
        north: dirSummary.north,
        south: dirSummary.south,
        east: dirSummary.east,
        west: dirSummary.west,
      },
      shadowBlockers: dirSummary.shadowBlockers,
      roadSummary: dirSummary.roadSummary,
      renderPrompt: dirSummary.renderPrompt,
      context: {
        buildingCount: nearbyCtx.buildings.length,
        maxFloors: nearbyCtx.buildings.reduce((m, b) => Math.max(m, b.floors || 0), 0),
        avgFloors: nearbyCtx.buildings.length > 0 ? Math.round(nearbyCtx.buildings.reduce((s, b) => s + (b.floors || 0), 0) / nearbyCtx.buildings.length) : 0,
        roadCount: nearbyCtx.roads.length,
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
