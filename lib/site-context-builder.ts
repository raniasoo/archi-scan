// ============================================================
// 대지 종합 분석 → AI 렌더링 상세 컨텍스트 생성기
// 일반지적도 + 3D지적도 + 주변환경 + 위치 → 풍부한 프롬프트
// ============================================================

import type { TerrainAnalysis } from './terrain-analysis'
import type { SunAnalysisResult } from './sun-analysis'

export interface SiteContextForRender {
  siteShape: string           // 대지 형상 설명
  roadDirection: string       // 접도 방향
  terrainDescription: string  // 지형 상세 설명
  neighborhoodChar: string    // 동네 특성
  sunAndView: string          // 일조/조망 설명
  fullPrompt: string          // 통합 프롬프트 (영문)
}

interface SiteContextInput {
  address?: string
  siteArea?: number
  polygon?: [number, number][]  // [lng, lat][]
  centroid?: [number, number]   // [lng, lat]
  nearbyBuildings?: { name?: string; floors?: number; use?: string; direction?: string; distance?: number; height?: number }[]
  siteContext?: { buildingCount?: number; maxFloors?: number; avgFloors?: number }
  terrain?: TerrainAnalysis | null
  sunAnalysis?: SunAnalysisResult | null
  elevation?: number  // 해발고도
  floors?: number
  buildingHeight?: number
  // 신규: 방향별 요약 + 도로 + 그림자
  directions?: { north?: { desc?: string }; south?: { desc?: string }; east?: { desc?: string }; west?: { desc?: string } }
  roadSummary?: string
  shadowBlockers?: string[]
  nearbyRenderPrompt?: string  // API에서 생성한 주변건물 프롬프트
}

// ━━━ 1. 필지 형상 분석 ━━━
function analyzeParcelShape(polygon: [number, number][] | undefined, siteArea: number): { shape: string; aspectRatio: number; longAxis: string; roadSide: string; widthM: number; depthM: number } {
  if (!polygon || polygon.length < 3) {
    const w = Math.sqrt(siteArea * 1.25)
    const d = siteArea / w
    return { shape: 'rectangular', aspectRatio: w / d, longAxis: 'east-west', roadSide: 'south', widthM: Math.round(w), depthM: Math.round(d) }
  }

  // 경위도 → 미터
  const lats = polygon.map(c => c[1]), lngs = polygon.map(c => c[0])
  const cLat = (Math.min(...lats) + Math.max(...lats)) / 2
  const cLng = (Math.min(...lngs) + Math.max(...lngs)) / 2
  const LM = Math.cos(cLat * Math.PI / 180) * 111319

  const mCoords = polygon.map(([lng, lat]) => [
    (lng - cLng) * LM,
    (lat - cLat) * 111319
  ])

  // 바운딩 박스
  const xs = mCoords.map(c => c[0]), ys = mCoords.map(c => c[1])
  const w = Math.max(...xs) - Math.min(...xs)
  const d = Math.max(...ys) - Math.min(...ys)
  const ratio = w > 0 && d > 0 ? Math.max(w, d) / Math.min(w, d) : 1

  // 형상 판정
  let shape = 'rectangular'
  if (polygon.length === 3) shape = 'triangular'
  else if (polygon.length === 4 || polygon.length === 5) {
    if (ratio > 2.5) shape = 'narrow-rectangular'
    else if (ratio < 1.3) shape = 'square'
    else shape = 'rectangular'
  } else {
    shape = ratio > 2 ? 'irregular-elongated' : 'irregular'
  }

  // 긴 축 방향
  const longAxis = w > d ? 'east-west' : 'north-south'

  // 접도 방향 추정: 폴리곤에서 가장 남쪽 변이 도로
  let roadSide = 'south'
  const minY = Math.min(...ys)
  const southPoints = mCoords.filter(c => c[1] < minY + d * 0.2)
  if (southPoints.length >= 2) roadSide = 'south'
  else {
    const minX = Math.min(...xs)
    const westPoints = mCoords.filter(c => c[0] < minX + w * 0.2)
    if (westPoints.length >= 2) roadSide = 'west'
    else roadSide = 'east'
  }

  return { shape, aspectRatio: Math.round(ratio * 10) / 10, longAxis, roadSide, widthM: Math.round(w), depthM: Math.round(d) }
}

// ━━━ 2. 동네 특성 추정 ━━━
function analyzeNeighborhood(input: SiteContextInput): string {
  const hints: string[] = []
  const addr = input.address || ''
  const elev = input.elevation || input.terrain?.maxElevation || 0
  const ctx = input.siteContext
  const nearby = input.nearbyBuildings || []

  // 주소 기반 분위기
  if (addr.includes('평창') || addr.includes('성북') || addr.includes('부암')) {
    hints.push('Upscale hillside residential neighborhood with mature trees')
  } else if (addr.includes('강남') || addr.includes('서초') || addr.includes('송파')) {
    hints.push('Modern urban district with high-rise buildings')
  } else if (addr.includes('홍대') || addr.includes('합정') || addr.includes('연남')) {
    hints.push('Trendy, artistic neighborhood with cafes and galleries')
  } else if (addr.includes('한남') || addr.includes('이태원')) {
    hints.push('International, upscale neighborhood')
  } else if (addr.includes('종로') || addr.includes('북촌') || addr.includes('서촌')) {
    hints.push('Historic district with traditional Korean architecture nearby')
  }

  // 표고 기반
  if (elev > 150) hints.push('Hillside location with potential mountain views')
  else if (elev > 80) hints.push('Elevated area above the city')
  else if (elev < 30) hints.push('Low-lying flat urban area')

  // 주변 건물 특성
  if (ctx) {
    if (ctx.avgFloors && ctx.avgFloors <= 3) hints.push('Low-rise residential area')
    else if (ctx.avgFloors && ctx.avgFloors >= 8) hints.push('High-rise urban area')

    if (ctx.buildingCount && ctx.buildingCount > 20) hints.push('Dense urban fabric')
    else if (ctx.buildingCount && ctx.buildingCount < 5) hints.push('Spacious, open surroundings')
  }

  // 주변 건물 용도
  const uses = nearby.map(b => b.use || '').filter(Boolean)
  if (uses.some(u => u.includes('근생') || u.includes('상가'))) hints.push('Mixed commercial-residential street')
  if (uses.some(u => u.includes('학교'))) hints.push('Near school zone')

  return hints.join('. ') || 'Typical Korean residential neighborhood'
}

// ━━━ 3. 지형 상세 설명 ━━━
function describeTerrainForRender(terrain: TerrainAnalysis | null | undefined, floors: number): string {
  if (!terrain || terrain.elevationDiff < 0.5) return 'Flat, level ground. Standard foundation.'

  const parts: string[] = []
  const diff = terrain.elevationDiff
  const slope = terrain.avgSlope

  if (diff < 2) {
    parts.push(`Gently sloping site (${diff}m elevation change, ${slope}% grade)`)
    parts.push('Minor grading needed, building sits on level pad')
  } else if (diff < 5) {
    parts.push(`Moderately sloped site (${diff}m elevation change, ${slope}% grade)`)
    parts.push(`The building should step with the terrain - ${terrain.slopeDirection.includes('남') ? 'north side taller, south side shorter' : 'visible grade change on the facade'}`)
    if (floors >= 3) parts.push('Lower floors on the downhill side may be partially exposed, creating a split-level effect')
    parts.push('Retaining wall or landscape terrace visible on the uphill edge')
  } else {
    parts.push(`Steep hillside site (${diff}m elevation change, ${slope}% grade)`)
    parts.push('Building MUST step dramatically with the terrain')
    parts.push(`From the uphill side the building appears ${Math.max(floors - 2, 1)}-story, from downhill it appears ${floors + 1}-story`)
    parts.push('Prominent retaining walls with stone or concrete finish')
    parts.push('Stepped landscaping terraces visible')
  }

  // 경사 방향별 건물 형태 힌트
  if (terrain.slopeDirection.includes('남향')) {
    parts.push('South-facing slope: excellent for natural light, building should cascade downward toward the south with each level having views')
  } else if (terrain.slopeDirection.includes('북향')) {
    parts.push('North-facing slope: building should maximize south-facing windows on each stepped level')
  }

  return parts.join('. ')
}

// ━━━ 4. 일조/조망 상세 설명 ━━━
function describeSunViewForRender(sun: SunAnalysisResult | null | undefined): string {
  if (!sun) return ''
  const parts: string[] = []

  if (sun.southOpen) {
    parts.push('Good southern exposure - warm sunlight on the main facade')
    parts.push('South-facing balconies and large windows should be prominent')
  } else {
    parts.push('Southern exposure partially blocked - design should compensate with upper floor setbacks')
  }

  // 최적 조망 방향
  parts.push(`Best views toward ${sun.viewDirection.replace('측', '')} - main living spaces and balconies should face this direction`)

  // 4방향 개방/차폐
  const openDirs = (['north', 'south', 'east', 'west'] as const)
    .filter(d => !sun.directions[d].blocked)
    .map(d => ({ north: 'north', south: 'south', east: 'east', west: 'west' }[d]))
  
  if (openDirs.length > 0) {
    parts.push(`Open views toward: ${openDirs.join(', ')}`)
  }

  const blockedDirs = (['north', 'south', 'east', 'west'] as const)
    .filter(d => sun.directions[d].blocked)
  
  if (blockedDirs.length > 0) {
    const tallest = blockedDirs.reduce((max, d) => Math.max(max, sun.directions[d].maxHeight), 0)
    parts.push(`Neighboring buildings up to ${Math.round(tallest)}m on blocked sides - show these as context`)
  }

  return parts.join('. ')
}

// ━━━ 통합 프롬프트 생성 ━━━
export function buildSiteContextPrompt(input: SiteContextInput): SiteContextForRender {
  const parcel = analyzeParcelShape(input.polygon, input.siteArea || 660)
  const neighborhood = analyzeNeighborhood(input)
  const terrainDesc = describeTerrainForRender(input.terrain, input.floors || 2)
  const sunViewDesc = describeSunViewForRender(input.sunAnalysis)

  // 대지 형상 설명
  const shapeNames: Record<string, string> = {
    'square': 'Nearly square lot',
    'rectangular': 'Rectangular lot',
    'narrow-rectangular': 'Long narrow lot',
    'triangular': 'Triangular lot',
    'irregular': 'Irregular-shaped lot',
    'irregular-elongated': 'Irregular elongated lot',
  }
  const siteShape = `${shapeNames[parcel.shape] || 'Rectangular lot'} (approximately ${parcel.widthM}m × ${parcel.depthM}m, ratio ${parcel.aspectRatio}:1). Long axis runs ${parcel.longAxis}.`

  const roadDirection = `Road faces the ${parcel.roadSide} side. Main building entrance and facade should face ${parcel.roadSide}.`

  // 통합 프롬프트
  const sections: string[] = []
  
  sections.push(`SITE SHAPE AND ORIENTATION:
${siteShape}
${roadDirection}`)

  if (terrainDesc && terrainDesc !== 'Flat, level ground. Standard foundation.') {
    sections.push(`TERRAIN AND TOPOGRAPHY:
${terrainDesc}`)
  }

  if (neighborhood) {
    sections.push(`NEIGHBORHOOD CHARACTER:
${neighborhood}`)
  }

  if (sunViewDesc) {
    sections.push(`SUNLIGHT AND VIEWS:
${sunViewDesc}`)
  }

  // 주변건물 상세 (API에서 생성된 프롬프트)
  if (input.nearbyRenderPrompt) {
    sections.push(input.nearbyRenderPrompt)
  } else if (input.directions) {
    // fallback: 방향별 요약
    const dirParts = ['NEIGHBORING BUILDINGS:']
    if (input.directions.north?.desc) dirParts.push(`  North: ${input.directions.north.desc}`)
    if (input.directions.south?.desc) dirParts.push(`  South: ${input.directions.south.desc}`)
    if (input.directions.east?.desc) dirParts.push(`  East: ${input.directions.east.desc}`)
    if (input.directions.west?.desc) dirParts.push(`  West: ${input.directions.west.desc}`)
    if (input.roadSummary) dirParts.push(`  Roads: ${input.roadSummary}`)
    if (input.shadowBlockers?.length) {
      dirParts.push(`  ⚠️ Shadow blocking: ${input.shadowBlockers.join('; ')}`)
    }
    sections.push(dirParts.join('\n'))
  }

  const fullPrompt = sections.join('\n\n')

  return {
    siteShape,
    roadDirection,
    terrainDescription: terrainDesc,
    neighborhoodChar: neighborhood,
    sunAndView: sunViewDesc,
    fullPrompt,
  }
}
