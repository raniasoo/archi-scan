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
function analyzeParcelShape(polygon: [number, number][] | undefined, siteArea: number): { shape: string; shapeDesc: string; aspectRatio: number; longAxis: string; roadSide: string; widthM: number; depthM: number } {
  if (!polygon || polygon.length < 3) {
    const w = Math.sqrt(siteArea * 1.25)
    const d = siteArea / w
    return { shape: 'rectangular', shapeDesc: 'Rectangular lot', aspectRatio: w / d, longAxis: 'east-west', roadSide: 'south', widthM: Math.round(w), depthM: Math.round(d) }
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
  const vertexCount = polygon.length

  // 형상 판정 (정점 수 + 비율 + 면적비로 판단)
  const bboxArea = w * d
  const fillRatio = siteArea / bboxArea // 바운딩 박스 대비 실제 면적 비율

  let shape = 'rectangular'
  let shapeDesc = 'Rectangular lot'

  if (vertexCount === 3) {
    shape = 'triangular'
    shapeDesc = 'Triangular lot with one pointed end'
  } else if (vertexCount <= 5) {
    if (ratio > 2.5) { shape = 'narrow-rectangular'; shapeDesc = 'Long narrow rectangular lot' }
    else if (ratio < 1.3) { shape = 'square'; shapeDesc = 'Nearly square lot' }
    else { shape = 'rectangular'; shapeDesc = 'Rectangular lot' }
  } else if (vertexCount >= 10) {
    // 많은 정점 = 곡선형/비정형
    if (fillRatio > 0.75 && ratio > 1.8) {
      shape = 'elongated-oval'
      shapeDesc = 'Elongated oval-shaped lot with curved boundaries, organic form'
    } else if (fillRatio > 0.75) {
      shape = 'oval'
      shapeDesc = 'Oval-shaped lot with soft curved edges'
    } else if (ratio > 2) {
      shape = 'irregular-elongated'
      shapeDesc = 'Irregular elongated lot with uneven boundaries'
    } else {
      shape = 'irregular'
      shapeDesc = 'Irregularly shaped lot with curved and angular edges'
    }
  } else {
    // 6~9 정점
    if (ratio > 2) { shape = 'irregular-elongated'; shapeDesc = 'Irregularly shaped elongated lot' }
    else { shape = 'irregular'; shapeDesc = 'Irregularly shaped lot' }
  }

  // 긴 축 방향
  const longAxis = w > d ? 'east-west' : 'north-south'

  // 접도 방향 추정
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

  return { shape, shapeDesc, aspectRatio: Math.round(ratio * 10) / 10, longAxis, roadSide, widthM: Math.round(w), depthM: Math.round(d) }
}

// ━━━ 2. 동네 특성 추정 ━━━
function analyzeNeighborhood(input: SiteContextInput): string {
  const hints: string[] = []
  const addr = input.address || ''
  const elev = input.elevation || input.terrain?.maxElevation || 0
  const ctx = input.siteContext
  const nearby = input.nearbyBuildings || []

  // 주소 기반 분위기
  if (addr.includes('평창') || addr.includes('부암')) {
    hints.push('UPSCALE HILLSIDE VILLA NEIGHBORHOOD (평창동/부암동 style): 2-3 story luxury villas and detached houses with stone/stucco walls, SURROUNDED BY DENSE GREEN MOUNTAINS AND MATURE TREES. Narrow winding roads going uphill. Stone retaining walls. Private gardens with tall hedges. Very quiet, exclusive residential area at the foot of Bukaksan mountain. NO high-rise buildings anywhere nearby — only low-rise luxury homes.')
  } else if (addr.includes('성북')) {
    hints.push('Upscale hillside residential neighborhood (성북동 style): luxury villas, stone walls, traditional-style houses mixed with modern villas, surrounded by trees and hills')
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
  if (elev > 150) hints.push('Hillside location with mountain views, surrounded by green hills and trees')
  else if (elev > 80) hints.push('Elevated area on a hillside, with sloping terrain and natural vegetation')
  else if (elev < 30) hints.push('Low-lying flat urban area')

  // 주변 건물 특성
  if (ctx) {
    if (ctx.avgFloors && ctx.avgFloors <= 3) {
      hints.push('Dense low-rise residential area with 2-3 story Korean villas (빌라) featuring red/brown pitched roofs, narrow streets, and compact parking')
    } else if (ctx.avgFloors && ctx.avgFloors <= 5) {
      hints.push('Mid-rise residential area with 4-5 story apartments and walkup buildings')
    } else if (ctx.avgFloors && ctx.avgFloors >= 8) {
      hints.push('High-rise urban area with apartment towers')
    }
    
    if (!ctx.avgFloors || ctx.avgFloors === 0) {
      // 층수 데이터가 없을 때 — 위치 기반 추정
      if (elev > 60 || addr.includes('평창') || addr.includes('성북') || addr.includes('정릉')) {
        hints.push('Hillside residential neighborhood with small Korean villas and houses, narrow winding roads, terraced lots')
      } else {
        hints.push('Residential neighborhood with typical Korean low-rise buildings')
      }
    }

    if (ctx.buildingCount && ctx.buildingCount > 15) hints.push('Dense urban fabric with buildings close together')
    else if (ctx.buildingCount && ctx.buildingCount > 5) hints.push('Moderate density residential area')
    else if (ctx.buildingCount && ctx.buildingCount < 3) hints.push('Spacious, open surroundings with few neighbors')
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
    parts.push('Minor grading needed, building sits on a level pad')
  } else if (diff < 8) {
    parts.push(`Sloping hillside site (${diff}m elevation change across the lot, ${slope}% average grade)`)
    parts.push('The building should be designed to work WITH the natural slope — use split-level design or step the building down the hill')
    parts.push('Show the natural ground slope in the rendering, with the building partially embedded into the hillside')
    if (terrain.slopeDirection.includes('남')) parts.push('The slope faces south — excellent for daylight, with the building stepping down toward the viewer')
  } else if (diff < 20) {
    parts.push(`Steep hillside site (${diff}m total elevation change, ${slope}% average grade)`)
    parts.push('The building MUST cascade down the slope following the terrain contours')
    parts.push(`From the uphill side the building appears shorter, from the downhill side it appears taller — this is a multi-level hillside building`)
    parts.push('Show prominent retaining walls, terraced landscaping, and stepped building mass')
    parts.push('The natural hillside with trees and vegetation should be visible around the building')
  } else {
    // ★ 극급경사: 20m 이상 고저차 (평창동 46m 같은 경우)
    parts.push(`EXTREMELY STEEP mountainside site — ${diff}m total elevation change (equivalent to a ${Math.round(diff / 3)}+ story building height difference!) with ${slope}% average grade`)
    parts.push('THIS IS A DRAMATIC HILLSIDE. The ground level changes DRAMATICALLY from one end of the site to the other.')
    parts.push(`Buildings MUST be placed at VERY DIFFERENT elevation levels, like terraced rice paddies on a mountain — the highest building and the lowest building have a ${diff}m height difference between their ground levels`)
    parts.push('Each building sits on its own TERRACED PLATFORM with tall stone/concrete RETAINING WALLS between levels')
    parts.push('Show STEEP ACCESS ROADS, stairs connecting different levels, and significant grade changes between each building')
    parts.push('The hillside should be clearly visible — lush green mountain terrain with mature trees surrounding the buildings')
    parts.push('From eye level, some buildings are ABOVE you on the hillside and some are BELOW — this creates a dramatic cascading village effect')
    parts.push('Show exposed foundations, pilotis, or cantilevers where buildings meet the steep slope')
  }

  // 경사 방향별 건물 형태 힌트
  if (terrain.slopeDirection.includes('남서') || terrain.slopeDirection.includes('남향')) {
    parts.push(`${terrain.slopeDirection} slope: the terrain goes DOWNHILL toward the south/southwest. Buildings step DOWN in that direction. Upper buildings are further NORTH on higher ground, lower buildings are further SOUTH on lower ground. Excellent for natural light on all levels.`)
  } else if (terrain.slopeDirection.includes('북향')) {
    parts.push('North-facing slope: building should maximize south-facing windows on each stepped level')
  } else if (terrain.slopeDirection) {
    parts.push(`Slope direction: ${terrain.slopeDirection}. Buildings step down following this direction.`)
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
  const siteShape = `${parcel.shapeDesc} (approximately ${parcel.widthM}m × ${parcel.depthM}m, ratio ${parcel.aspectRatio}:1). Long axis runs ${parcel.longAxis}. The building footprint MUST follow this ${parcel.shape.includes('oval') || parcel.shape.includes('irregular') ? 'organic, curved' : 'angular'} site boundary — do NOT draw a standard rectangular building on a clearly non-rectangular site.`

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

  // ━━━ 주변환경 렌더링 강제 (가장 중요) ━━━
  const isUpscaleHillside = neighborhood.includes('UPSCALE') || neighborhood.includes('luxury') || neighborhood.includes('평창') || neighborhood.includes('성북')
  const isLowRiseVilla = neighborhood.includes('villa') || neighborhood.includes('빌라') || neighborhood.includes('low-rise') || neighborhood.includes('hillside')
  const isHighRise = neighborhood.includes('apartment') || neighborhood.includes('high-rise')

  const contextInstruction = `
CRITICAL RENDERING CONTEXT (MUST FOLLOW):
The building does NOT exist in isolation. It is surrounded by an existing Korean neighborhood.
You MUST show neighboring buildings in the rendering background and sides:
${isUpscaleHillside
  ? `- This is an UPSCALE HILLSIDE neighborhood: show 2-3 story LUXURY villas/houses with clean stucco or stone finishes, private gardens with tall hedges
- DENSE GREEN MOUNTAINS and mature trees MUST be visible in the background — this is at the foot of a mountain
- Show narrow winding UPHILL roads with stone retaining walls
- NO cheap-looking buildings, NO red corrugated roofs — these are LUXURY homes with flat or gently pitched roofs in neutral colors
- The new building should look PREMIUM and HARMONIOUS with this quiet, exclusive neighborhood
- Show the natural hillside terrain — the ground slopes significantly`
  : isLowRiseVilla
  ? `- Show 2-3 story Korean villas/houses with DISTINCTIVE RED or BROWN PITCHED ROOFS on both sides and behind the new building
- Show narrow Korean residential streets with parked cars
- Show concrete block walls, small gardens, and typical Korean residential landscaping
- The new building should look like it FITS INTO this existing neighborhood, not like it was dropped from space`
  : isHighRise
  ? `- Show neighboring apartment buildings in the background
- Show urban streetscape with sidewalks and street trees`
  : `- Show existing neighboring buildings appropriate to the area
- The building should blend with its surroundings`}
- Show the actual TERRAIN SLOPE if the site is sloped — the ground should NOT be flat
- Include mature trees and natural vegetation around the site
- The sky and lighting should feel like a REAL photograph taken on-site, not a studio rendering`

  sections.push(contextInstruction)

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
