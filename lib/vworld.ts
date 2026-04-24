/**
 * Vworld API 클라이언트
 * 국토지리정보원 Vworld 오픈API - 연속지적도 필지 폴리곤 조회
 * https://www.vworld.kr/dev/v4dv_2ddataguide2_s002.do
 */

export interface VworldParcel {
  pnu: string           // 필지고유번호 (19자리)
  address: string       // 지번주소
  area: number          // 면적 (㎡)
  landUse?: string      // 지목
  coordinates: [number, number][]  // WGS84 [lng, lat] 배열 (폴리곤)
  centroid: [number, number]       // 중심점 [lng, lat]
  bbox: {
    minLng: number; minLat: number
    maxLng: number; maxLat: number
  }
}

export interface VworldResponse {
  success: boolean
  parcel?: VworldParcel
  error?: string
  rawCoords?: [number, number][]
}

const VWORLD_BASE = 'https://api.vworld.kr/req/data'

/**
 * WGS84 좌표 기반 필지 폴리곤 조회
 * Juso API에서 받은 좌표로 Vworld에서 지적도 폴리곤을 가져옵니다
 */
export async function fetchParcelPolygon(
  lng: number,
  lat: number,
  apiKey: string
): Promise<VworldResponse> {
  try {
    // Vworld 연속지적도 - 분할경계 데이터 (LP_PA_CBND_BUBUN)
    // 본번/부번 경계선으로 개별 필지 폴리곤 조회
    const params = new URLSearchParams({
      service: 'data',
      request: 'GetFeature',
      data: 'LP_PA_CBND_BUBUN',
      key: apiKey,
      domain: '', // 허용 도메인 (빈값=모두허용)
      attrFilter: '',
      geometry: 'true',
      attribute: 'true',
      page: '1',
      size: '1',
      crs: 'EPSG:4326',  // WGS84 좌표계로 반환
      geomFilter: `POINT(${lng} ${lat})`,  // 포인트 기반 필지 검색
      format: 'json',
    })

    const url = `${VWORLD_BASE}?${params.toString()}`
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      return { success: false, error: `Vworld HTTP ${res.status}` }
    }

    const json = await res.json()

    // Vworld 응답 파싱
    const status = json?.response?.status
    if (status !== 'OK') {
      return { success: false, error: `Vworld 응답 오류: ${status || 'unknown'}` }
    }

    const features = json?.response?.result?.featureCollection?.features
    if (!features || features.length === 0) {
      return { success: false, error: '해당 좌표의 지적 폴리곤 없음' }
    }

    const feature = features[0]
    const props = feature?.properties || {}
    const geometry = feature?.geometry

    if (!geometry || geometry.type !== 'Polygon') {
      return { success: false, error: '폴리곤 형식 오류' }
    }

    // 좌표 배열 추출 (외부 링만 사용)
    const rawCoords: [number, number][] = geometry.coordinates[0].map(
      (c: number[]) => [c[0], c[1]] as [number, number]
    )

    if (rawCoords.length < 3) {
      return { success: false, error: '좌표 데이터 불충분' }
    }

    // 중심점 계산
    const lngs = rawCoords.map(c => c[0])
    const lats = rawCoords.map(c => c[1])
    const centroid: [number, number] = [
      lngs.reduce((a, b) => a + b, 0) / lngs.length,
      lats.reduce((a, b) => a + b, 0) / lats.length,
    ]

    // 면적 계산 (속성값 우선, 없으면 좌표 기반 계산)
    const areaFromProps = parseFloat(props.SHAPE_AREA || props.area || '0')
    const area = areaFromProps > 0 ? areaFromProps : calcPolygonArea(rawCoords)

    const parcel: VworldParcel = {
      pnu: props.PNU || props.pnu || '',
      address: props.JIBUN || props.address || '',
      area: Math.round(area * 10) / 10,
      landUse: props.JIMOK_CD_NM || props.landuse || undefined,
      coordinates: rawCoords,
      centroid,
      bbox: {
        minLng: Math.min(...lngs),
        minLat: Math.min(...lats),
        maxLng: Math.max(...lngs),
        maxLat: Math.max(...lats),
      }
    }

    return { success: true, parcel, rawCoords }

  } catch (err) {
    return { success: false, error: String(err) }
  }
}

/**
 * 주소 → 좌표 변환 (Vworld Geocoding API)
 */
export async function geocodeAddress(
  address: string,
  apiKey: string
): Promise<{ success: boolean; lng?: number; lat?: number; error?: string }> {
  try {
    const params = new URLSearchParams({
      service: 'address',
      request: 'getcoord',
      version: '2.0',
      crs: 'EPSG:4326',
      address,
      type: 'road',  // 도로명주소 우선
      format: 'json',
      key: apiKey,
    })

    const res = await fetch(`https://api.vworld.kr/req/address?${params}`, {
      signal: AbortSignal.timeout(8000),
    })

    const json = await res.json()
    const status = json?.response?.status
    if (status !== 'OK') {
      // 도로명 실패 시 지번으로 재시도
      const params2 = new URLSearchParams({
        service: 'address',
        request: 'getcoord',
        version: '2.0',
        crs: 'EPSG:4326',
        address,
        type: 'parcel',
        format: 'json',
        key: apiKey,
      })
      const res2 = await fetch(`https://api.vworld.kr/req/address?${params2}`, {
        signal: AbortSignal.timeout(8000),
      })
      const json2 = await res2.json()
      if (json2?.response?.status !== 'OK') {
        return { success: false, error: '좌표 변환 실패' }
      }
      const pt2 = json2.response.result.point
      return { success: true, lng: parseFloat(pt2.x), lat: parseFloat(pt2.y) }
    }

    const point = json.response.result.point
    return { success: true, lng: parseFloat(point.x), lat: parseFloat(point.y) }

  } catch (err) {
    return { success: false, error: String(err) }
  }
}

/**
 * 구면 다각형 면적 계산 (Shoelace formula, 근사값)
 * WGS84 좌표 → 제곱미터
 */
function calcPolygonArea(coords: [number, number][]): number {
  const R = 6371000 // 지구 반지름 (m)
  let area = 0
  const n = coords.length

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    const xi = coords[i][0] * Math.PI / 180
    const yi = coords[i][1] * Math.PI / 180
    const xj = coords[j][0] * Math.PI / 180
    const yj = coords[j][1] * Math.PI / 180
    area += xi * yj
    area -= xj * yi
  }

  return Math.abs(area / 2) * R * R
}

/**
 * WGS84 폴리곤 → SVG 좌표 변환
 * 대지 형상을 SVG viewBox에 맞게 변환
 */
export function polygonToSVG(
  coords: [number, number][],
  viewWidth: number,
  viewHeight: number,
  padding = 20
): {
  points: [number, number][]
  scale: number
  offsetX: number
  offsetY: number
} {
  const lngs = coords.map(c => c[0])
  const lats = coords.map(c => c[1])

  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)

  const geoW = maxLng - minLng
  const geoH = maxLat - minLat

  const availW = viewWidth - padding * 2
  const availH = viewHeight - padding * 2

  // 위경도 비율 보정 (위도에 따른 경도 왜곡)
  const latRad = ((minLat + maxLat) / 2) * Math.PI / 180
  const lngScale = Math.cos(latRad)

  const scaleX = geoW > 0 ? availW / (geoW * lngScale) : 1
  const scaleY = geoH > 0 ? availH / geoH : 1
  const scale = Math.min(scaleX, scaleY)

  const scaledW = geoW * lngScale * scale
  const scaledH = geoH * scale

  const offsetX = padding + (availW - scaledW) / 2
  const offsetY = padding + (availH - scaledH) / 2

  const points: [number, number][] = coords.map(([lng, lat]) => [
    offsetX + (lng - minLng) * lngScale * scale,
    offsetY + scaledH - (lat - minLat) * scale,  // Y축 반전 (SVG는 상단이 0)
  ])

  return { points, scale, offsetX, offsetY }
}
