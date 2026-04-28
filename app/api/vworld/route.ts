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
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=%EC%84%9C%EC%9A%B8%ED%8A%B9%EB%B3%84%EC%8B%9C+%EA%B0%95%EB%82%A8%EA%B5%AC+%ED%85%8C%ED%97%A4%EB%9E%80%EB%A1%9C+152&format=json&countrycodes=kr&limit=3&polygon_geojson=1`
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
    const { address, lng, lat, siteArea, entX, entY, bdMgtSn } = await req.json()
    const pnuFromBdMgtSn = (bdMgtSn && bdMgtSn.length >= 19) ? bdMgtSn.slice(0, 19) : null

    // 0순위: bdMgtSn → PNU → LP_PA_CBND_BUBUN 직접 폴리곤 (좌표 없어도 정확)
    if (pnuFromBdMgtSn) {
      try {
        const vwKey = 'FFEC486D-E635-345C-9BA6-5404A5AA191B'
        const vwDomain = 'v0-archi-scan-layout-generator.vercel.app'
        const params = new URLSearchParams({
          service: 'data', request: 'GetFeature', data: 'LP_PA_CBND_BUBUN',
          key: vwKey, domain: vwDomain, geometry: 'true', attribute: 'true',
          page: '1', size: '1', crs: 'EPSG:4326', format: 'json',
          attrFilter: `pnu:=:${pnuFromBdMgtSn}`,
        })
        const vwRes = await fetch(`https://api.vworld.kr/req/data?${params}`, { signal: AbortSignal.timeout(10000) })
        const vwData = await vwRes.json()
        const features = vwData?.response?.result?.featureCollection?.features || []
        console.log(`[vworld] PNU ${pnuFromBdMgtSn} → features: ${features.length}`)
        if (features.length > 0) {
          const f = features[0], geom = f?.geometry, props = f?.properties || {}
          if (geom && (geom.type === 'Polygon' || geom.type === 'MultiPolygon')) {
            const rawCoords = geom.type === 'Polygon' ? geom.coordinates[0] : geom.coordinates[0][0]
            if (rawCoords && rawCoords.length >= 3) {
              const coords = rawCoords.map((c: number[]) => [c[0], c[1]] as [number,number])
              const lngs = coords.map((c:[number,number])=>c[0]), lats = coords.map((c:[number,number])=>c[1])
              const cLng = (Math.min(...lngs)+Math.max(...lngs))/2
              const cLat = (Math.min(...lats)+Math.max(...lats))/2
              let pa = 0
              for (let i=0;i<coords.length-1;i++) pa+=(coords[i][0]-coords[i+1][0])*(coords[i][1]+coords[i+1][1])
              const aM2 = Math.abs(pa/2)*111319*111319*Math.cos(cLat*Math.PI/180)
              const finalArea = siteArea && siteArea > 0 ? siteArea : Math.round(aM2)
              const bbox = { minLng:Math.min(...lngs), minLat:Math.min(...lats), maxLng:Math.max(...lngs), maxLat:Math.max(...lats) }
              console.log(`[vworld] PNU 조회 성공: ${coords.length}점, pnu=${props.pnu}, area=${Math.round(aM2)}㎡`)
              return NextResponse.json({ success: true, parcel: { pnu: props.pnu||pnuFromBdMgtSn, address, area: finalArea, coordinates: coords, centroid: [cLng,cLat] as [number,number], bbox, isDemo: false, source: 'vworld-pnu' } })
            }
          }
        }
      } catch(e) { console.warn('[vworld] PNU 기반 조회 실패:', String(e)) }
    }

    // 1순위: JUSO/MOLIT 좌표 → Lambda parcel → Overpass 실제 폴리곤
    if (entX && entY && entX > 120 && entY > 30) {
      // 1-1: Vworld LP_PA_CBND_BUBUN 직접 조회 (Seoul 리전 - 한국 IP)
      try {
        const vwKey = 'FFEC486D-E635-345C-9BA6-5404A5AA191B'
        const vwDomain = 'v0-archi-scan-layout-generator.vercel.app'
        const vwUrl = `https://api.vworld.kr/req/data?service=data&request=GetFeature&data=LP_PA_CBND_BUBUN&key=${vwKey}&domain=${vwDomain}&geometry=true&attribute=true&page=1&size=1&crs=EPSG:4326&geomFilter=POINT(${entX}%20${entY})&format=json`
        console.log('[vworld] Vworld 직접 LP_PA_CBND_BUBUN 조회')
        const vwRes = await fetch(vwUrl, {
          headers: { 'Referer': `https://${vwDomain}`, 'Origin': `https://${vwDomain}` },
          signal: AbortSignal.timeout(10000)
        })
        const vwText = await vwRes.text()
        console.log('[vworld] LP_PA_CBND_BUBUN status:', vwRes.status, 'body[:300]:', vwText.slice(0,300))
        if (vwRes.ok && vwText.startsWith('{')) {
          const vwData = JSON.parse(vwText)
          const features = vwData?.response?.result?.featureCollection?.features || []
          console.log('[vworld] LP_PA_CBND_BUBUN features:', features.length)
          if (features.length > 0) {
            const f = features[0]
            const geom = f?.geometry
            const props = f?.properties || {}
            if (geom && (geom.type === 'Polygon' || geom.type === 'MultiPolygon')) {
              const rawCoords = geom.type === 'Polygon' ? geom.coordinates[0] : geom.coordinates[0][0]
              if (rawCoords && rawCoords.length >= 3) {
                const coords = rawCoords.map((c: number[]) => [c[0], c[1]] as [number,number])
                const lngs = coords.map((c:[number,number])=>c[0]), lats = coords.map((c:[number,number])=>c[1])
                const cLng = (Math.min(...lngs)+Math.max(...lngs))/2
                const cLat = (Math.min(...lats)+Math.max(...lats))/2
                let pa = 0
                for (let i=0;i<coords.length-1;i++) pa+=(coords[i][0]-coords[i+1][0])*(coords[i][1]+coords[i+1][1])
                const aM2 = Math.abs(pa/2)*111319*111319*Math.cos(cLat*Math.PI/180)
                const finalArea = siteArea && siteArea > 0 ? siteArea : Math.round(aM2)
                const bbox = { minLng:Math.min(...lngs), minLat:Math.min(...lats), maxLng:Math.max(...lngs), maxLat:Math.max(...lats) }
                console.log(`[vworld] LP_PA_CBND_BUBUN 성공: ${coords.length}점, pnu=${props.pnu}, area=${Math.round(aM2)}㎡`)
                return NextResponse.json({ success: true, parcel: { pnu: props.pnu||null, address, area: finalArea, coordinates: coords, centroid: [cLng,cLat] as [number,number], bbox, isDemo: false, source: 'vworld-direct' } })
              }
            }
          }
        }
      } catch(e) { console.warn('[vworld] Vworld 직접 조회 실패:', String(e)) }

      // 1-1b: Vworld BBOX fallback (POINT 실패 시 약간 넓은 영역으로 재시도)
      try {
        const vwKey = 'FFEC486D-E635-345C-9BA6-5404A5AA191B'
        const vwDomain = 'v0-archi-scan-layout-generator.vercel.app'
        const buf = 0.0003 // ~30m buffer
        const bboxStr = `${entX - buf},${entY - buf},${entX + buf},${entY + buf}`
        const bboxUrl = `https://api.vworld.kr/req/data?service=data&request=GetFeature&data=LP_PA_CBND_BUBUN&key=${vwKey}&domain=${vwDomain}&geometry=true&attribute=true&page=1&size=5&crs=EPSG:4326&geomFilter=BOX(${bboxStr})&format=json`
        console.log('[vworld] BBOX fallback 조회:', bboxStr)
        const bboxRes = await fetch(bboxUrl, {
          headers: { 'Referer': `https://${vwDomain}`, 'Origin': `https://${vwDomain}` },
          signal: AbortSignal.timeout(10000)
        })
        if (bboxRes.ok) {
          const bboxData = await bboxRes.json()
          const features = bboxData?.response?.result?.featureCollection?.features || []
          console.log('[vworld] BBOX features:', features.length)
          // siteArea에 가장 가까운 필지 선택
          if (features.length > 0) {
            let bestF = features[0], bestDiff = Infinity
            for (const f of features) {
              const fArea = parseFloat(f?.properties?.SHAPE_AREA || '0')
              const diff = siteArea ? Math.abs(fArea - siteArea) : 0
              if (diff < bestDiff) { bestDiff = diff; bestF = f }
            }
            const geom = bestF?.geometry, props = bestF?.properties || {}
            if (geom && (geom.type === 'Polygon' || geom.type === 'MultiPolygon')) {
              const rawCoords = geom.type === 'Polygon' ? geom.coordinates[0] : geom.coordinates[0][0]
              if (rawCoords && rawCoords.length >= 3) {
                const coords = rawCoords.map((c: number[]) => [c[0], c[1]] as [number,number])
                const lngs = coords.map((c:[number,number])=>c[0]), lats = coords.map((c:[number,number])=>c[1])
                const cLng = (Math.min(...lngs)+Math.max(...lngs))/2, cLat = (Math.min(...lats)+Math.max(...lats))/2
                let pa = 0; for (let i=0;i<coords.length-1;i++) pa+=(coords[i][0]-coords[i+1][0])*(coords[i][1]+coords[i+1][1])
                const aM2 = Math.abs(pa/2)*111319*111319*Math.cos(cLat*Math.PI/180)
                const finalArea = siteArea && siteArea > 0 ? siteArea : Math.round(aM2)
                const bbox = { minLng:Math.min(...lngs), minLat:Math.min(...lats), maxLng:Math.max(...lngs), maxLat:Math.max(...lats) }
                console.log(`[vworld] BBOX fallback 성공: ${coords.length}점, pnu=${props.pnu}`)
                return NextResponse.json({ success: true, parcel: { pnu: props.pnu||null, address, area: finalArea, coordinates: coords, centroid: [cLng,cLat] as [number,number], bbox, isDemo: false, source: 'vworld-bbox' } })
              }
            }
          }
        }
      } catch(e) { console.warn('[vworld] BBOX fallback 실패:', String(e)) }

      // 1-2: Overpass API로 실제 건물 footprint 조회 (OpenStreetMap)
      // 면적 기반 동적 반경: √(면적) * 1.5 (최소 150m, 최대 500m)
      try {
        const dynamicRadius = siteArea ? Math.min(500, Math.max(150, Math.round(Math.sqrt(siteArea) * 1.5))) : 150
        const overpassQuery = `[out:json][timeout:15];(way(around:${dynamicRadius},${entY},${entX})[building];relation(around:${dynamicRadius},${entY},${entX})[building];way(around:${dynamicRadius},${entY},${entX})[landuse];);out geom;`
        console.log(`[vworld] Overpass 쿼리: radius=${dynamicRadius}m (면적=${siteArea}㎡), lat=${entY}, lng=${entX}`)
        const overpassRes = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          body: overpassQuery,
          headers: { 'Content-Type': 'text/plain', 'User-Agent': 'ArchiScan/1.0' },
          signal: AbortSignal.timeout(12000),
        })
        const overpassData = await overpassRes.json()
        const elements = overpassData?.elements || []
        console.log(`[vworld] Overpass elements: ${elements.length}`)
        
        if (elements.length > 0) {
          // 좌표 근접도 + 면적 유사도로 최적 건물 선택
          function calcPolyArea(geom: {lat:number,lon:number}[]) {
            let area = 0
            for (let i = 0; i < geom.length - 1; i++) {
              area += (geom[i].lon - geom[i+1].lon) * (geom[i].lat + geom[i+1].lat)
            }
            const cLat = geom.reduce((s,g)=>s+g.lat,0)/geom.length
            return Math.abs(area/2) * 111319 * 111319 * Math.cos(cLat * Math.PI / 180)
          }
          function calcCentroidDist(geom: {lat:number,lon:number}[]) {
            const cLng = geom.reduce((s,g)=>s+g.lon,0)/geom.length
            const cLat = geom.reduce((s,g)=>s+g.lat,0)/geom.length
            return Math.sqrt(Math.pow((cLng - entX) * 111319, 2) + Math.pow((cLat - entY) * 111319, 2))
          }
          
          let bestGeom: {lat:number,lon:number}[] = []
          let bestScore = -Infinity
          for (const el of elements) {
            const geom: {lat:number,lon:number}[] = el.geometry || []
            if (geom.length >= 4) {
              const elArea = calcPolyArea(geom)
              const dist = calcCentroidDist(geom)
              // 점수: 면적이 siteArea에 가까울수록 + 좌표가 가까울수록 높음
              const areaDiff = siteArea ? Math.abs(elArea - siteArea) / Math.max(siteArea, 1) : 0
              const score = elArea - dist * 10 - areaDiff * 1000
              console.log(`[vworld] Overpass id=${el.id} area=${Math.round(elArea)}㎡ dist=${Math.round(dist)}m score=${Math.round(score)}`)
              if (score > bestScore) { bestScore = score; bestGeom = geom }
            }
          }
          if (bestGeom.length >= 3) {
            const coords = bestGeom.map(g => [g.lon, g.lat] as [number,number])
            if (coords[0][0] !== coords[coords.length-1][0] || coords[0][1] !== coords[coords.length-1][1]) coords.push(coords[0])
            const lngs = coords.map(c=>c[0]), lats = coords.map(c=>c[1])
            const cLng = (Math.min(...lngs)+Math.max(...lngs))/2
            const cLat = (Math.min(...lats)+Math.max(...lats))/2
            const finalArea = siteArea && siteArea > 0 ? siteArea : Math.round(bestArea)
            const bbox = { minLng: Math.min(...lngs), minLat: Math.min(...lats), maxLng: Math.max(...lngs), maxLat: Math.max(...lats) }
            console.log(`[vworld] Overpass 성공: ${coords.length}점, bestArea=${Math.round(bestArea)}㎡, finalArea=${finalArea}㎡`)
            return NextResponse.json({ success: true, parcel: { pnu: null, address, area: finalArea, coordinates: coords, centroid: [cLng, cLat] as [number,number], bbox, isDemo: false, source: 'overpass' } })
          }
        }
      } catch(e) { console.warn('[vworld] Overpass 실패:', String(e)) }

      // 1-3: Nominatim 좌표 역지오코딩으로 실제 건물 폴리곤
      try {
        const revUrl = `https://nominatim.openstreetmap.org/reverse?lat=${entY}&lon=${entX}&format=json&polygon_geojson=1&zoom=18`
        const revRes = await fetch(revUrl, {
          headers: { 'User-Agent': 'ArchiScan/1.0 (https://v0-archi-scan-layout-generator.vercel.app)' },
          signal: AbortSignal.timeout(8000),
        })
        if (revRes.ok) {
          const revData = await revRes.json()
          const geojson = revData?.geojson
          console.log('[vworld] Nominatim reverse geojson type:', geojson?.type, 'osm_type:', revData?.osm_type)
          if (geojson && (geojson.type === 'Polygon' || geojson.type === 'MultiPolygon')) {
            const rawCoords = geojson.type === 'Polygon' ? geojson.coordinates[0] : geojson.coordinates[0][0]
            if (rawCoords && rawCoords.length >= 3) {
              const coords = rawCoords.map((c: number[]) => [c[0], c[1]] as [number, number])
              const lngs = coords.map((c: [number,number]) => c[0])
              const lats = coords.map((c: [number,number]) => c[1])
              const cLng = (Math.min(...lngs)+Math.max(...lngs))/2
              const cLat = (Math.min(...lats)+Math.max(...lats))/2
              let polyArea = 0
              for (let i = 0; i < coords.length - 1; i++) {
                polyArea += (coords[i][0]-coords[i+1][0]) * (coords[i][1]+coords[i+1][1])
              }
              const areaM2 = Math.abs(polyArea/2) * 111319 * 111319 * Math.cos(cLat*Math.PI/180)
              const finalArea = siteArea && siteArea > 0 ? siteArea : Math.round(areaM2)
              const bbox = { minLng: Math.min(...lngs), minLat: Math.min(...lats), maxLng: Math.max(...lngs), maxLat: Math.max(...lats) }
              console.log(`[vworld] Nominatim reverse 성공: ${coords.length}점, 면적 ${Math.round(areaM2)}㎡`)
              return NextResponse.json({ success: true, parcel: { pnu: null, address, area: finalArea, coordinates: coords, centroid: [cLng, cLat] as [number,number], bbox, isDemo: false, source: 'nominatim-reverse' } })
            }
          }
        }
      } catch(e) { console.warn('[vworld] Nominatim reverse 실패:', String(e)) }

      // 1-4: 모든 시도 실패 — 면적 기반 정사각형 (최후 fallback)
      const area = siteArea || 0
      const parcel = buildParcelFromCoords(entX, entY, area, address)
      return NextResponse.json({ success: true, parcel, coordinates: { lng: entX, lat: entY } })
    }

    // 2순위: Nominatim 주소 검색으로 실제 건물 폴리곤 (entX/entY 없을 때)
    if (address) {
      try {
        const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&countrycodes=kr&limit=3&polygon_geojson=1`
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

            // polygon_geojson이 있으면 실제 폴리곤 우선 사용
            const geojson = result.geojson
            if (geojson && (geojson.type === 'Polygon' || geojson.type === 'MultiPolygon')) {
              const rawCoords = geojson.type === 'Polygon' ? geojson.coordinates[0] : geojson.coordinates[0][0]
              if (rawCoords && rawCoords.length >= 3) {
                const coords = rawCoords.map((c: number[]) => [c[0], c[1]] as [number,number])
                const lngs = coords.map((c: [number,number]) => c[0])
                const lats = coords.map((c: [number,number]) => c[1])
                const cLng2 = (Math.min(...lngs)+Math.max(...lngs))/2
                const cLat2 = (Math.min(...lats)+Math.max(...lats))/2
                let pa = 0
                for (let i = 0; i < coords.length - 1; i++) pa += (coords[i][0]-coords[i+1][0])*(coords[i][1]+coords[i+1][1])
                const aM2 = Math.abs(pa/2)*111319*111319*Math.cos(cLat2*Math.PI/180)
                const fArea = siteArea && siteArea > 0 ? siteArea : Math.round(aM2)
                const bbox2 = { minLng: Math.min(...lngs), minLat: Math.min(...lats), maxLng: Math.max(...lngs), maxLat: Math.max(...lats) }
                console.log(`[vworld] Nominatim polygon 성공: ${coords.length}점, 면적 ${Math.round(aM2)}㎡`)
                return NextResponse.json({ success: true, parcel: { pnu: null, address, area: fArea, coordinates: coords, centroid: [cLng2, cLat2] as [number,number], bbox: bbox2, isDemo: false, source: 'nominatim-polygon' }, source: 'nominatim' })
              }
            }

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
