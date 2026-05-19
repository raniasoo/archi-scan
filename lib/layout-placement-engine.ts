/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Layout Placement Engine — Single Source of Truth (Gensler Architecture)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * 모든 뷰(배치도 SVG, 3D, AI 프롬프트, DXF, PDF 보고서)가
 * 이 엔진의 출력을 참조합니다.
 *
 * 흐름:
 *   폴리곤 → [배치 엔진] → 건물 좌표 배열
 *                           ↓
 *                ┌──────────┼──────────┐
 *                ↓          ↓          ↓
 *             배치도SVG    3D 뷰    AI 프롬프트
 *                ↓          ↓          ↓
 *             기본평면    교차검증   AI 렌더링
 *
 * 좌표계:
 *   원점 = 대지 중심 (centroid)
 *   X축 = 동(+) / 서(-)
 *   Z축 = 북(+) / 남(-)
 *   단위 = 미터 (m)
 */

import { getBuildingGeometry, getClusterBlocks, type BuildingBlock } from './building-geometry'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** 배치 엔진 입력 */
export interface PlacementInput {
  /** 지적도 폴리곤 (경위도 좌표) */
  sitePolygon?: { coords: [number, number][]; centroid: [number, number] } | null
  /** 대지면적 (㎡) */
  siteArea: number
  /** 배치 유형 */
  buildingType: string
  /** 클러스터 변환 전 원래 타입 */
  originalType?: string
  /** 건물 동수 */
  buildingCount?: number
  /** 건폐율 (%) */
  coverage: number
  /** 층수 */
  floors: number
  /** 층고 (m, 기본 3.3) */
  floorHeight?: number
  /** 이격거리 (m) */
  setbacks: { front: number; side: number; rear: number }
  /** 접도 폭 (m) */
  roadWidth?: number
  /** 접도 방향 (기본 south) */
  roadSide?: 'south' | 'north' | 'east' | 'west'
}

/** 배치된 단일 건물 블록 */
export interface PlacedBuilding {
  /** 건물 ID (A동, B동, ...) */
  id: string
  /** 라벨 (표시용) */
  label: string
  
  // ━━━ 절대 좌표 (미터, 대지 중심 원점) ━━━
  /** 중심 X (m, 동+) */
  centerX: number
  /** 중심 Z (m, 북+) */
  centerZ: number
  /** 폭 (m, 동서 방향) */
  width: number
  /** 깊이 (m, 남북 방향) */
  depth: number
  /** 건물 높이 (m) */
  height: number
  /** 층수 */
  floors: number
  /** 건축면적 (㎡) */
  footprint: number
  /** 회전각 (도, 시계 방향) */
  rotation: number
  
  // ━━━ 정규화 좌표 (대지 한 변 대비 비율, -0.5 ~ 0.5) ━━━
  /** 정규화 중심 X */
  nx: number
  /** 정규화 중심 Z */
  nz: number
  /** 정규화 폭 */
  nw: number
  /** 정규화 깊이 */
  nd: number
}

/** 대지 형상 (미터 좌표) */
export interface SiteBounds {
  /** 대지 폭 (m, 동서) */
  width: number
  /** 대지 깊이 (m, 남북) */
  depth: number
  /** 대지면적 (㎡) */
  area: number
  /** 미터 좌표 폴리곤 (대지 중심 원점) */
  polygon: { x: number; z: number }[]
  /** 대지가 실제 폴리곤인지 직사각형 추정인지 */
  isRealPolygon: boolean
}

/** 건축가능영역 */
export interface BuildableZone {
  /** 바운딩 박스: 좌하단 X (m) */
  x: number
  /** 바운딩 박스: 좌하단 Z (m) */
  z: number
  /** 바운딩 박스: 폭 (m) */
  width: number
  /** 바운딩 박스: 깊이 (m) */
  depth: number
  /** 인셋 폴리곤 (미터) */
  polygon: { x: number; z: number }[]
}

/** 배치 엔진 최종 출력 */
export interface PlacementResult {
  /** 배치된 건물 배열 (SSOT) */
  buildings: PlacedBuilding[]
  
  /** 대지 형상 */
  site: SiteBounds
  
  /** 건축가능영역 */
  buildableZone: BuildableZone
  
  /** 파생 지표 */
  metrics: {
    /** 총 건축면적 (㎡) */
    totalFootprint: number
    /** 실제 건폐율 (%) */
    actualCoverage: number
    /** 건물 동수 */
    buildingCount: number
    /** 유효 건물 타입 */
    effectiveType: string
    /** 원래 건물 타입 (클러스터 변환 전) */
    originalType: string
    /** 건물 높이 (m) */
    buildingHeight: number
    /** 연면적 (㎡) */
    gfa: number
  }
  
  /** 배치 스케일 (대지 내 맞춤 비율, 0~1) */
  buildScale: number
  
  /** AI 프롬프트용 건물 설명 문자열 */
  promptDescription: string
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main Engine
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 중앙 배치 엔진 — Single Source of Truth
 * 
 * 모든 뷰(SVG 배치도, 3D, AI 프롬프트, DXF, PDF)가
 * 이 함수의 결과를 사용합니다.
 */
export function computePlacement(input: PlacementInput): PlacementResult {
  const {
    sitePolygon,
    siteArea,
    buildingType,
    originalType: origType,
    buildingCount: userBldgCount,
    coverage,
    floors,
    floorHeight = 3.3,
    setbacks,
    roadWidth = 8,
    roadSide = 'south',
  } = input

  // ━━━ 1. 대지 형상 계산 ━━━
  const site = computeSiteBounds(sitePolygon, siteArea)
  
  // ━━━ 2. 건축가능영역 (이격거리 적용) ━━━
  const buildableZone = computeBuildableZone(site, setbacks)
  
  // ━━━ 3. 다동 배치 판단 ━━━
  const effectiveBldgCount = userBldgCount || computeAutoCount(
    siteArea, floors, buildingType, origType, 0 /* units not known yet */
  )
  
  // ━━━ 4. building-geometry에서 블록 정의 가져오기 ━━━
  const siteAR = site.width / Math.max(site.depth, 1)
  const geo = getBuildingGeometry({
    type: buildingType,
    coverage,
    siteArea,
    floors,
    buildingCount: effectiveBldgCount,
    originalType: origType || buildingType,
    floorHeight,
    siteAspectRatio: siteAR,
  })
  
  // ━━━ 5. 블록을 건축가능영역에 맞춰 배치 ━━━
  const S = geo.siteWidth // √siteArea
  const buildingHeight = floors * floorHeight
  
  // 모든 블록의 바운딩 박스 (미터)
  const allBlocksSpanX = Math.max(
    ...geo.blocks.map(b => Math.abs(b.x) + b.w / 2),
    0.01
  ) * S * 2
  const allBlocksSpanZ = Math.max(
    ...geo.blocks.map(b => Math.abs(b.z) + b.d / 2),
    0.01
  ) * S * 2
  
  // buildScale: 건축가능영역에 맞춤 (3D에서도 이 값 사용)
  const buildScale = Math.min(
    1.0,
    Math.min(
      buildableZone.width / Math.max(allBlocksSpanX, 1),
      buildableZone.depth / Math.max(allBlocksSpanZ, 1)
    ) * 0.92
  )
  
  // 건축가능영역 중심에 배치
  const zoneCenterX = buildableZone.x + buildableZone.width / 2
  const zoneCenterZ = buildableZone.z + buildableZone.depth / 2
  
  // 도로 방향에 따른 미세 오프셋 (후면 밀착 경향)
  const rearBias = Math.min(buildableZone.depth * 0.05, 2) // 최대 2m
  let offsetX = 0, offsetZ = 0
  switch (roadSide) {
    case 'south': offsetZ = rearBias; break   // 북쪽으로 밀착
    case 'north': offsetZ = -rearBias; break
    case 'east':  offsetX = -rearBias; break
    case 'west':  offsetX = rearBias; break
  }
  
  // ━━━ 6. PlacedBuilding 배열 생성 ━━━
  const buildings: PlacedBuilding[] = geo.blocks.map((blk, idx) => {
    const widthM = S * blk.w * buildScale
    const depthM = S * blk.d * buildScale
    const centerX = S * blk.x * buildScale + offsetX
    const centerZ = S * blk.z * buildScale + offsetZ
    const footprint = widthM * depthM
    
    return {
      id: `${String.fromCharCode(65 + idx)}`,
      label: blk.label || `${String.fromCharCode(65 + idx)}동`,
      centerX,
      centerZ,
      width: widthM,
      depth: depthM,
      height: buildingHeight,
      floors,
      footprint,
      rotation: 0,
      nx: blk.x,
      nz: blk.z,
      nw: blk.w,
      nd: blk.d,
    }
  })
  
  // ━━━ 7. 파생 지표 ━━━
  const totalFootprint = buildings.reduce((sum, b) => sum + b.footprint, 0)
  const actualCoverage = (totalFootprint / siteArea) * 100
  const effectiveType = effectiveBldgCount > 1 ? 'cluster' : buildingType
  const originalType = origType || buildingType
  const gfa = totalFootprint * floors
  
  // ━━━ 8. AI 프롬프트용 설명 ━━━
  const promptDescription = buildPromptDescription(
    buildings, site, buildingType, originalType, floors, buildingHeight
  )
  
  return {
    buildings,
    site,
    buildableZone,
    metrics: {
      totalFootprint,
      actualCoverage,
      buildingCount: buildings.length,
      effectiveType,
      originalType,
      buildingHeight,
      gfa,
    },
    buildScale,
    promptDescription,
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 대지 형상 계산
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** 경위도 폴리곤 → 미터 좌표 (centroid 원점) */
function computeSiteBounds(
  sitePolygon: PlacementInput['sitePolygon'],
  siteArea: number
): SiteBounds {
  if (sitePolygon && sitePolygon.coords.length > 2) {
    const [cLng, cLat] = sitePolygon.centroid
    const LM = Math.cos(cLat * Math.PI / 180) * 111319
    const meterCoords = sitePolygon.coords.map(([lng, lat]) => ({
      x: (lng - cLng) * LM,
      z: (lat - cLat) * 111319,
    }))
    
    const xs = meterCoords.map(p => p.x)
    const zs = meterCoords.map(p => p.z)
    const minX = Math.min(...xs), maxX = Math.max(...xs)
    const minZ = Math.min(...zs), maxZ = Math.max(...zs)
    const width = maxX - minX || 1
    const depth = maxZ - minZ || 1
    
    // 중심을 0,0으로 보정
    const cx = (minX + maxX) / 2
    const cz = (minZ + maxZ) / 2
    const centered = meterCoords.map(p => ({
      x: p.x - cx,
      z: p.z - cz,
    }))
    
    return {
      width,
      depth,
      area: siteArea,
      polygon: centered,
      isRealPolygon: true,
    }
  }
  
  // 직사각형 추정 (가로:세로 = 1.25:1)
  const siteRealW = Math.sqrt(siteArea * 1.25)
  const siteRealH = siteArea / siteRealW
  return {
    width: siteRealW,
    depth: siteRealH,
    area: siteArea,
    polygon: [
      { x: -siteRealW / 2, z: -siteRealH / 2 },
      { x:  siteRealW / 2, z: -siteRealH / 2 },
      { x:  siteRealW / 2, z:  siteRealH / 2 },
      { x: -siteRealW / 2, z:  siteRealH / 2 },
    ],
    isRealPolygon: false,
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 건축가능영역 (인셋 폴리곤)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** 이격거리를 적용한 건축가능영역 계산 */
function computeBuildableZone(
  site: SiteBounds,
  setbacks: { front: number; side: number; rear: number }
): BuildableZone {
  const avgSetback = (setbacks.front + setbacks.side + setbacks.rear) / 3
  
  if (site.isRealPolygon && site.polygon.length > 2) {
    // 폴리곤 인셋: centroid 방향으로 축소
    const cx = site.polygon.reduce((s, p) => s + p.x, 0) / site.polygon.length
    const cz = site.polygon.reduce((s, p) => s + p.z, 0) / site.polygon.length
    
    const maxDim = Math.max(site.width, site.depth)
    const insetRatio = 1 - (avgSetback * 2) / maxDim
    const safeRatio = Math.max(0.6, Math.min(0.95, insetRatio))
    
    const insetPoly = site.polygon.map(p => ({
      x: cx + (p.x - cx) * safeRatio,
      z: cz + (p.z - cz) * safeRatio,
    }))
    
    // 바운딩 박스
    const ixs = insetPoly.map(p => p.x)
    const izs = insetPoly.map(p => p.z)
    const minX = Math.min(...ixs)
    const minZ = Math.min(...izs)
    const bw = Math.max(...ixs) - minX
    const bd = Math.max(...izs) - minZ
    
    return {
      x: minX,
      z: minZ,
      width: bw,
      depth: bd,
      polygon: insetPoly,
    }
  }
  
  // 직사각형: 이격거리 직접 적용
  const bw = site.width - setbacks.side * 2
  const bd = site.depth - setbacks.front - setbacks.rear
  return {
    x: -bw / 2,
    z: -bd / 2 + (setbacks.rear - setbacks.front) / 2,
    width: bw,
    depth: bd,
    polygon: [
      { x: -bw / 2, z: -bd / 2 },
      { x:  bw / 2, z: -bd / 2 },
      { x:  bw / 2, z:  bd / 2 },
      { x: -bw / 2, z:  bd / 2 },
    ],
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 스캔라인 내접 사각형 (비정형 필지용)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** 폴리곤 내에서 특정 Z 좌표에서의 좌우 경계 반환 */
export function getPolygonWidthAtZ(
  polygon: { x: number; z: number }[],
  scanZ: number
): { left: number; right: number } | null {
  const xs: number[] = []
  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i]
    const p2 = polygon[(i + 1) % polygon.length]
    if ((p1.z <= scanZ && p2.z >= scanZ) || (p2.z <= scanZ && p1.z >= scanZ)) {
      const t = Math.abs(p2.z - p1.z) < 0.01 ? 0.5 : (scanZ - p1.z) / (p2.z - p1.z)
      xs.push(p1.x + t * (p2.x - p1.x))
    }
  }
  if (xs.length < 2) return null
  return { left: Math.min(...xs), right: Math.max(...xs) }
}

/** 폴리곤 내 최대 내접 사각형 (scanline 기반) */
export function findInscribedRect(
  polygon: { x: number; z: number }[]
): { cx: number; cz: number; width: number; depth: number } {
  const zs = polygon.map(p => p.z)
  const minZ = Math.min(...zs), maxZ = Math.max(...zs)
  const range = maxZ - minZ
  
  let bestArea = 0
  let best = { cx: 0, cz: 0, width: 0, depth: 0 }
  
  const steps = 20
  for (let i = 1; i < steps; i++) {
    for (let j = i + 1; j < steps; j++) {
      const z1 = minZ + (i / steps) * range
      const z2 = minZ + (j / steps) * range
      const b1 = getPolygonWidthAtZ(polygon, z1)
      const b2 = getPolygonWidthAtZ(polygon, z2)
      if (!b1 || !b2) continue
      
      const left = Math.max(b1.left, b2.left)
      const right = Math.min(b1.right, b2.right)
      const w = right - left
      const d = z2 - z1
      
      if (w > 0 && d > 0 && w * d > bestArea) {
        bestArea = w * d
        best = { cx: (left + right) / 2, cz: (z1 + z2) / 2, width: w, depth: d }
      }
    }
  }
  
  return best
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 다동 배치 자동 판단
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function computeAutoCount(
  siteArea: number,
  floors: number,
  buildingType: string,
  originalType: string | undefined,
  units: number
): number {
  if (buildingType === 'cluster') return 4  // 기본 4동
  if (floors <= 5 && siteArea > 1500) {
    // 저층 대규모: 자동 다동 배치
    const perFloor: Record<string, number> = {
      linear: 12, lshape: 6, courtyard: 10, tower: 4, cluster: 4,
    }
    const uf = perFloor[originalType || buildingType] || 4
    if (units > 0) {
      return Math.max(2, Math.ceil(units / (uf * floors)))
    }
    return Math.max(2, Math.ceil(siteArea / 1000))
  }
  return 1
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AI 프롬프트용 건물 설명
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function buildPromptDescription(
  buildings: PlacedBuilding[],
  site: SiteBounds,
  buildingType: string,
  originalType: string,
  floors: number,
  height: number
): string {
  const typeNames: Record<string, string> = {
    tower: 'tower-type apartment',
    linear: 'linear slab apartment',
    lshape: 'L-shaped apartment',
    courtyard: 'courtyard-type (ㄷ-shaped) apartment',
    cluster: 'multi-building cluster',
    piloti: 'piloti-style building',
    officetel: 'officetel tower',
    terrace: 'terraced building',
  }
  
  const typeName = typeNames[originalType] || typeNames[buildingType] || 'apartment building'
  const count = buildings.length
  
  if (count === 1) {
    const b = buildings[0]
    return `A single ${floors}-story ${typeName} (${b.width.toFixed(1)}m × ${b.depth.toFixed(1)}m, ${height.toFixed(1)}m tall) centered on a ${site.width.toFixed(0)}m × ${site.depth.toFixed(0)}m site.`
  }
  
  const bDesc = buildings.map(b =>
    `${b.label}: ${b.width.toFixed(1)}m × ${b.depth.toFixed(1)}m at (${b.centerX.toFixed(1)}m, ${b.centerZ.toFixed(1)}m)`
  ).join('; ')
  
  return `${count} ${typeName} buildings, each ${floors} stories (${height.toFixed(1)}m tall), arranged on a ${site.width.toFixed(0)}m × ${site.depth.toFixed(0)}m site. Positions: ${bDesc}.`
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 뷰 변환 헬퍼 — 각 소비자가 사용
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 미터 좌표 → SVG 픽셀 좌표 변환
 * (site-plan.tsx, report-drawings.ts에서 사용)
 */
export function toSvgCoords(
  placement: PlacementResult,
  svgWidth: number,
  svgHeight: number,
  padding: number
): {
  siteX: number; siteY: number; siteW: number; siteH: number
  svgScale: number
  buildings: {
    x: number; y: number; w: number; h: number; label: string
  }[]
  sitePolygonPoints: string
  buildablePolygonPoints: string
} {
  const { site, buildableZone, buildings } = placement
  
  // SVG 스케일
  const svgScale = Math.min(
    (svgWidth - padding * 2) / site.width,
    (svgHeight - padding * 2 - 40) / site.depth
  )
  const siteW = site.width * svgScale
  const siteH = site.depth * svgScale
  const siteX = (svgWidth - siteW) / 2
  const siteY = padding
  
  // 대지 중심 (SVG 좌표계)
  const svgCenterX = siteX + siteW / 2
  const svgCenterY = siteY + siteH / 2
  
  // 미터→SVG 변환 (Y축 반전: 북(+Z) = SVG 위(작은Y))
  const mToSvgX = (mx: number) => svgCenterX + mx * svgScale
  const mToSvgY = (mz: number) => svgCenterY - mz * svgScale
  
  // 대지 폴리곤 SVG points
  const sitePolygonPoints = site.polygon.map(p =>
    `${mToSvgX(p.x)},${mToSvgY(p.z)}`
  ).join(' ')
  
  // 건축가능영역 폴리곤 SVG points
  const buildablePolygonPoints = buildableZone.polygon.map(p =>
    `${mToSvgX(p.x)},${mToSvgY(p.z)}`
  ).join(' ')
  
  // 건물 SVG 좌표
  const svgBuildings = buildings.map(b => ({
    x: mToSvgX(b.centerX - b.width / 2),
    y: mToSvgY(b.centerZ + b.depth / 2),
    w: b.width * svgScale,
    h: b.depth * svgScale,
    label: b.label,
  }))
  
  return {
    siteX, siteY, siteW, siteH,
    svgScale,
    buildings: svgBuildings,
    sitePolygonPoints,
    buildablePolygonPoints,
  }
}

/**
 * 미터 좌표 → Three.js 좌표 변환
 * (building-volume-3d.tsx에서 사용)
 * Three.js: Y=높이, X=동서, Z=남북(카메라 방향)
 */
export function toThreeCoords(
  building: PlacedBuilding
): {
  position: [number, number, number]
  size: [number, number, number]
} {
  return {
    // Three.js에서 Y가 높이
    position: [building.centerX, building.height / 2, -building.centerZ],
    size: [building.width, building.height, building.depth],
  }
}

/**
 * 미터 좌표 → DXF 좌표 변환
 * DXF: mm 단위, Y=북(+), X=동(+)
 */
export function toDxfCoords(
  building: PlacedBuilding
): {
  x: number; y: number // mm, 좌하단
  w: number; h: number // mm
} {
  return {
    x: (building.centerX - building.width / 2) * 1000,
    y: (building.centerZ - building.depth / 2) * 1000,
    w: building.width * 1000,
    h: building.depth * 1000,
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 기존 시스템 호환 브릿지
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 기존 LayoutOption + regulation → PlacementInput 변환
 * page.tsx에서 바로 사용 가능
 */
export function fromLayoutOption(
  layout: {
    type: string
    coverage: number
    floors: number
    buildingCount?: number
    _originalType?: string
  },
  siteArea: number,
  regulation?: {
    setbackFront?: number
    setbackSide?: number
    setbackRear?: number
    roadWidth?: number
  },
  sitePolygon?: { coords: [number, number][]; centroid: [number, number] } | null
): PlacementInput {
  return {
    sitePolygon,
    siteArea,
    buildingType: layout.type,
    originalType: layout._originalType || layout.type,
    buildingCount: layout.buildingCount,
    coverage: layout.coverage,
    floors: layout.floors,
    setbacks: {
      front: regulation?.setbackFront ?? 1,
      side: regulation?.setbackSide ?? 1,
      rear: regulation?.setbackRear ?? 1.5,
    },
    roadWidth: regulation?.roadWidth ?? 8,
  }
}

/**
 * PlacementResult → 기존 BuildingGeometry 호환 형식 변환
 * getBuildingDimensionsInMeters 대체용
 */
export function toGeometryCompat(result: PlacementResult): {
  blocksInMeters: {
    widthM: number; depthM: number
    centerXM: number; centerZM: number
    areaM2: number
    label?: string
    w: number; d: number; x: number; z: number
  }[]
  siteWidthM: number
  buildingHeightM: number
  totalFootprint: number
  buildScale: number
  blocks: { x: number; z: number; w: number; d: number; label?: string }[]
} {
  return {
    blocksInMeters: result.buildings.map(b => ({
      widthM: b.width,
      depthM: b.depth,
      centerXM: b.centerX,
      centerZM: b.centerZ,
      areaM2: b.footprint,
      label: b.label,
      w: b.nw,
      d: b.nd,
      x: b.nx,
      z: b.nz,
    })),
    siteWidthM: Math.sqrt(result.site.area),
    buildingHeightM: result.metrics.buildingHeight,
    totalFootprint: result.metrics.totalFootprint,
    buildScale: result.buildScale,
    blocks: result.buildings.map(b => ({
      x: b.nx,
      z: b.nz,
      w: b.nw,
      d: b.nd,
      label: b.label,
    })),
  }
}
