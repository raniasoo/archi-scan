/**
import { getBuildingDimensionsInMeters } from "@/lib/building-geometry"
import { type PlacementResult, toGeometryCompat } from "@/lib/layout-placement-engine"
 * DXF (Drawing Exchange Format) Generator for Archi-Scan
 * AutoCAD 호환 DXF R12 포맷 생성
 */

interface DXFLayer {
  name: string
  color: number // AutoCAD color index (1=red,2=yellow,3=green,4=cyan,5=blue,7=white)
}

interface FloorPlanConfig {
  type: 'tower' | 'courtyard' | 'lshape' | 'linear' | 'cluster'
  floor: number
  totalFloors: number
  strategy?: string
  layoutName: string
  siteArea: number
  units: number
  floors: number
  parking: number
  // 실제 지적도 폴리곤 (WGS84 [lng, lat][])
  sitePolygon?: {
    coords: [number, number][]   // [[lng, lat], ...]
    centroid: [number, number]   // [lng, lat]
  }
}

// DXF 숫자 포맷 (소수점 4자리)
function fmt(n: number): string {
  return n.toFixed(4)
}

// DXF 헤더 생성
function dxfHeader(): string {
  return `  0\nSECTION\n  2\nHEADER\n  9\n$ACADVER\n  1\nAC1009\n  9\n$INSBASE\n 10\n0.0000\n 20\n0.0000\n 30\n0.0000\n  9\n$EXTMIN\n 10\n0.0000\n 20\n0.0000\n 30\n0.0000\n  9\n$EXTMAX\n 10\n50000.0000\n 20\n35000.0000\n 30\n0.0000\n  9\n$LUNITS\n 70\n2\n  9\n$LUPREC\n 70\n2\n  0\nENDSEC\n`
}

// DXF 레이어 테이블 생성
function dxfLayers(layers: DXFLayer[]): string {
  let out = `  0\nSECTION\n  2\nTABLES\n  0\nTABLE\n  2\nLAYER\n 70\n${layers.length}\n`
  for (const layer of layers) {
    out += `  0\nLAYER\n  2\n${layer.name}\n 70\n0\n 62\n${layer.color}\n  6\nCONTINUOUS\n`
  }
  out += `  0\nENDTAB\n  0\nENDSEC\n`
  return out
}

// LINE 엔티티
function dxfLine(x1: number, y1: number, x2: number, y2: number, layer: string): string {
  return `  0\nLINE\n  8\n${layer}\n 10\n${fmt(x1)}\n 20\n${fmt(y1)}\n 30\n0.0000\n 11\n${fmt(x2)}\n 21\n${fmt(y2)}\n 31\n0.0000\n`
}

// POLYLINE (닫힌 사각형)
function dxfRect(x: number, y: number, w: number, h: number, layer: string): string {
  return (
    dxfLine(x, y, x + w, y, layer) +
    dxfLine(x + w, y, x + w, y + h, layer) +
    dxfLine(x + w, y + h, x, y + h, layer) +
    dxfLine(x, y + h, x, y, layer)
  )
}

// TEXT 엔티티
function dxfText(x: number, y: number, text: string, height: number, layer: string): string {
  return `  0\nTEXT\n  8\n${layer}\n 10\n${fmt(x)}\n 20\n${fmt(y)}\n 30\n0.0000\n 40\n${fmt(height)}\n  1\n${text}\n`
}

// 층별 평면도 DXF 생성
export function generateFloorPlanDXF(config: FloorPlanConfig): string {
  const {
    type, floor, totalFloors, strategy = 'profitability',
    layoutName, siteArea, units, floors: totalFloorCount, parking, sitePolygon
  } = config

  // mm 단위 사용 (1m = 1000mm), 1:1000 스케일
  const scale = 1000

  let siteW: number, siteH: number, siteX: number, siteY: number
  let sitePolyPoints: [number, number][] | null = null

  if (sitePolygon && sitePolygon.coords.length >= 3) {
    // ===== 실제 지적도 폴리곤 기반 =====
    const { coords, centroid } = sitePolygon
    const [cLng, cLat] = centroid
    const LAT_M = 111319
    const LNG_M = 111319 * Math.cos(cLat * Math.PI / 180)

    // WGS84 → 미터 → mm (1:1000)
    const pts = coords.map(([lng, lat]) => [
      (lng - cLng) * LNG_M * scale,
      (lat - cLat) * LAT_M * scale,
    ] as [number, number])

    const minX = Math.min(...pts.map(p => p[0]))
    const minY = Math.min(...pts.map(p => p[1]))
    // 원점 이동 (좌하단 기준)
    sitePolyPoints = pts.map(([x, y]) => [x - minX, y - minY] as [number, number])
    siteW = Math.max(...sitePolyPoints.map(p => p[0]))
    siteH = Math.max(...sitePolyPoints.map(p => p[1]))
    siteX = 0
    siteY = 0
  } else {
    // ===== 면적 기반 정방형 근사 (폴리곤 없을 때) =====
    siteW = Math.sqrt(siteArea) * scale
    siteH = siteW
    siteX = 0
    siteY = 0
  }

  const isGroundFloor = floor === 1
  const isTopFloor = floor === totalFloors

  // 레이어 정의
  const layers: DXFLayer[] = [
    { name: '0', color: 7 },
    { name: 'SITE_BOUNDARY', color: 2 },     // 노랑 - 대지경계
    { name: 'BUILDING_OUTLINE', color: 5 },   // 파랑 - 건물외곽
    { name: 'SETBACK_LINE', color: 3 },        // 초록 - 이격거리
    { name: 'UNITS', color: 4 },              // 청록 - 세대
    { name: 'CORE', color: 1 },               // 빨강 - 코어/계단
    { name: 'LOBBY_COMMERCIAL', color: 6 },   // 마젠타 - 로비/상가
    { name: 'PARKING', color: 8 },            // 회색 - 주차
    { name: 'DIMENSION', color: 7 },          // 흰색 - 치수
    { name: 'TEXT', color: 7 },               // 흰색 - 텍스트
    { name: 'GRID', color: 9 },               // 회청 - 그리드
  ]

  // 건물 크기 (건폐율 적용)
  const buildingRatio = 0.57
  const buildingW = siteW * buildingRatio
  const buildingH = siteH * buildingRatio
  const buildingX = siteX + (siteW - buildingW) / 2
  const buildingY = siteY + (siteH - buildingH) / 2

  let entities = ''

  // ===== 대지 경계 (실제 폴리곤 또는 정방형) =====
  if (sitePolyPoints && sitePolyPoints.length >= 3) {
    // 실제 폴리곤 POLYLINE
    let poly = `  0\nPOLYLINE\n  8\nSITE_BOUNDARY\n 66\n1\n 70\n1\n`
    for (const [x, y] of sitePolyPoints) {
      poly += `  0\nVERTEX\n  8\nSITE_BOUNDARY\n 10\n${fmt(x)}\n 20\n${fmt(y)}\n 30\n0.0000\n`
    }
    poly += `  0\nSEQEND\n`
    entities += poly

    // 이격거리: 각 꼭짓점을 중심점 방향으로 3m(3000mm) inset
    const cx = sitePolyPoints.reduce((s, p) => s + p[0], 0) / sitePolyPoints.length
    const cy = sitePolyPoints.reduce((s, p) => s + p[1], 0) / sitePolyPoints.length
    const inset = 3 * scale
    const insetPts = sitePolyPoints.map(([x, y]) => {
      const dx = x - cx, dy = y - cy
      const dist = Math.sqrt(dx*dx + dy*dy)
      if (dist < 1) return [x, y] as [number, number]
      const ratio = Math.max(0, (dist - inset) / dist)
      return [cx + dx * ratio, cy + dy * ratio] as [number, number]
    })
    let setbackPoly = `  0\nPOLYLINE\n  8\nSETBACK_LINE\n 66\n1\n 70\n1\n`
    for (const [x, y] of insetPts) {
      setbackPoly += `  0\nVERTEX\n  8\nSETBACK_LINE\n 10\n${fmt(x)}\n 20\n${fmt(y)}\n 30\n0.0000\n`
    }
    setbackPoly += `  0\nSEQEND\n`
    entities += setbackPoly

    // 건물외곽: inset 폴리곤의 bounding box 기준
    const insetMinX = Math.min(...insetPts.map(p => p[0]))
    const insetMinY = Math.min(...insetPts.map(p => p[1]))
    const insetMaxX = Math.max(...insetPts.map(p => p[0]))
    const insetMaxY = Math.max(...insetPts.map(p => p[1]))
    const bW = insetMaxX - insetMinX
    const bH = insetMaxY - insetMinY
    const bX = insetMinX + bW * (1 - buildingRatio) / 2
    const bY = insetMinY + bH * (1 - buildingRatio) / 2
    const bBuildW = bW * buildingRatio
    const bBuildH = bH * buildingRatio
    entities += dxfRect(bX, bY, bBuildW, bBuildH, 'BUILDING_OUTLINE')
    entities += dxfText(bX + bBuildW * 0.05, bY + bBuildH * 0.5, `${layoutName.toUpperCase()} - ${floor}F/${totalFloors}F`, 600, 'TEXT')
  } else {
    // 정방형 폴리곤
    entities += dxfRect(siteX, siteY, siteW, siteH, 'SITE_BOUNDARY')
    entities += dxfRect(buildingX, buildingY, buildingW, buildingH, 'BUILDING_OUTLINE')
    const setbackDist = 3 * scale
    entities += dxfRect(buildingX - setbackDist, buildingY - setbackDist, buildingW + setbackDist * 2, buildingH + setbackDist * 2, 'SETBACK_LINE')
  }

  // ===== 층별 내부 구성 =====
  if (isGroundFloor) {
    // 1층: 로비 + 상가 + 주차
    const lobbyW = buildingW * 0.2
    const shopW = buildingW * 0.35
    const parkingH = buildingH * 0.35

    // 로비
    entities += dxfRect(buildingX + shopW, buildingY + buildingH * 0.65, lobbyW, buildingH * 0.35, 'LOBBY_COMMERCIAL')
    entities += dxfText(buildingX + shopW + lobbyW * 0.1, buildingY + buildingH * 0.8, `LOBBY`, 500, 'TEXT')

    // 상가 좌
    entities += dxfRect(buildingX, buildingY + buildingH * 0.65, shopW, buildingH * 0.35, 'LOBBY_COMMERCIAL')
    entities += dxfText(buildingX + shopW * 0.1, buildingY + buildingH * 0.8, `SHOP-1`, 500, 'TEXT')

    // 상가 우
    entities += dxfRect(buildingX + shopW + lobbyW, buildingY + buildingH * 0.65, shopW, buildingH * 0.35, 'LOBBY_COMMERCIAL')
    entities += dxfText(buildingX + shopW + lobbyW + shopW * 0.1, buildingY + buildingH * 0.8, `SHOP-2`, 500, 'TEXT')

    // 주차
    entities += dxfRect(buildingX, buildingY, buildingW, parkingH, 'PARKING')
    entities += dxfText(buildingX + buildingW * 0.1, buildingY + parkingH * 0.5, `PARKING (${parking}UNITS)`, 600, 'TEXT')

    // 주차 라인
    const carW = 2.5 * scale
    const carH = 5 * scale
    let carX = buildingX + carW
    while (carX + carW < buildingX + buildingW - carW) {
      entities += dxfLine(carX, buildingY, carX, buildingY + parkingH, 'PARKING')
      carX += carW
    }
  } else {
    // 표준층: 세대 배치
    let unitCount = 4
    if (strategy === 'view-priority' || strategy === 'privacy-priority') unitCount = 2
    else if (strategy === 'area-maximize' || strategy === 'profitability') unitCount = 6

    const coreW = buildingW * 0.12
    const coreX = buildingX + (buildingW - coreW) / 2

    // 코어 (엘리베이터/계단)
    entities += dxfRect(coreX, buildingY, coreW, buildingH, 'CORE')
    entities += dxfText(coreX + coreW * 0.05, buildingY + buildingH * 0.5, `CORE/EV`, 400, 'TEXT')

    // 세대 좌측
    const leftUnits = Math.floor(unitCount / 2)
    const rightUnits = unitCount - leftUnits
    const leftW = coreX - buildingX
    const rightW = buildingX + buildingW - (coreX + coreW)
    const unitH = buildingH / Math.max(leftUnits, rightUnits)

    // 좌측 세대
    for (let i = 0; i < leftUnits; i++) {
      const ux = buildingX
      const uy = buildingY + i * unitH
      const uw = leftW
      const uh = unitH
      entities += dxfRect(ux, uy, uw, uh, 'UNITS')
      const unitLabel = isTopFloor ? `PH-${String.fromCharCode(65 + i)}` : `${floor}${String.fromCharCode(65 + i)}`
      entities += dxfText(ux + uw * 0.1, uy + uh * 0.5, unitLabel, 500, 'TEXT')

      // 발코니 (전략별 적용)
      if (strategy !== 'area-maximize' && strategy !== 'profitability') {
        const balconyH = 1.5 * scale
        entities += dxfRect(ux, uy + uh - balconyH, uw, balconyH, 'UNITS')
        entities += dxfText(ux + uw * 0.1, uy + uh - balconyH * 0.6, `BALCONY`, 300, 'TEXT')
      }
    }

    // 우측 세대
    for (let i = 0; i < rightUnits; i++) {
      const ux = coreX + coreW
      const uy = buildingY + i * (buildingH / rightUnits)
      const uw = rightW
      const uh = buildingH / rightUnits
      entities += dxfRect(ux, uy, uw, uh, 'UNITS')
      const unitLabel = isTopFloor ? `PH-${String.fromCharCode(65 + leftUnits + i)}` : `${floor}${String.fromCharCode(65 + leftUnits + i)}`
      entities += dxfText(ux + uw * 0.1, uy + uh * 0.5, unitLabel, 500, 'TEXT')
    }
  }

  // ===== 치수 표기 =====
  const dimOffset = 3000
  // 건물 너비
  entities += dxfLine(buildingX, buildingY - dimOffset, buildingX + buildingW, buildingY - dimOffset, 'DIMENSION')
  entities += dxfLine(buildingX, buildingY - dimOffset * 0.5, buildingX, buildingY - dimOffset * 1.5, 'DIMENSION')
  entities += dxfLine(buildingX + buildingW, buildingY - dimOffset * 0.5, buildingX + buildingW, buildingY - dimOffset * 1.5, 'DIMENSION')
  entities += dxfText(buildingX + buildingW / 2 - 1000, buildingY - dimOffset * 1.2, `${(buildingW / scale).toFixed(1)}M`, 600, 'DIMENSION')

  // 건물 높이
  entities += dxfLine(buildingX - dimOffset, buildingY, buildingX - dimOffset, buildingY + buildingH, 'DIMENSION')
  entities += dxfLine(buildingX - dimOffset * 0.5, buildingY, buildingX - dimOffset * 1.5, buildingY, 'DIMENSION')
  entities += dxfLine(buildingX - dimOffset * 0.5, buildingY + buildingH, buildingX - dimOffset * 1.5, buildingY + buildingH, 'DIMENSION')
  entities += dxfText(buildingX - dimOffset * 1.3, buildingY + buildingH / 2, `${(buildingH / scale).toFixed(1)}M`, 600, 'DIMENSION')

  // 대지 너비
  entities += dxfLine(siteX, siteY - dimOffset * 2, siteX + siteW, siteY - dimOffset * 2, 'DIMENSION')
  entities += dxfText(siteX + siteW / 2 - 1000, siteY - dimOffset * 2.5, `SITE ${(siteArea).toLocaleString()}sqm`, 700, 'DIMENSION')

  // ===== 제목 블록 =====
  const titleX = siteX + siteW + 5000
  const titleY = siteY + siteH - 10000

  entities += dxfRect(titleX, siteY, 30000, siteH, 'TEXT')
  entities += dxfLine(titleX, siteY + siteH - 8000, titleX + 30000, siteY + siteH - 8000, 'TEXT')
  entities += dxfText(titleX + 1000, siteY + siteH - 4000, `ARCHI-SCAN`, 1500, 'TEXT')
  entities += dxfText(titleX + 1000, siteY + siteH - 6000, `FLOOR PLAN - ${floor}F/${totalFloors}F`, 1000, 'TEXT')
  entities += dxfLine(titleX, siteY + siteH - 14000, titleX + 30000, siteY + siteH - 14000, 'TEXT')
  entities += dxfText(titleX + 1000, siteY + siteH - 11000, `LAYOUT: ${layoutName}`, 700, 'TEXT')
  entities += dxfText(titleX + 1000, siteY + siteH - 12500, `UNITS: ${units} / FLOORS: ${totalFloorCount}F`, 700, 'TEXT')
  entities += dxfText(titleX + 1000, siteY + siteH - 14000, `SCALE: 1:1000`, 700, 'TEXT')

  // 최종 DXF 조합
  const header = dxfHeader()
  const tables = dxfLayers(layers)
  const entitiesSection = `  0\nSECTION\n  2\nENTITIES\n${entities}  0\nENDSEC\n`
  const eof = `  0\nEOF\n`

  return header + tables + entitiesSection + eof
}

// DXF 파일 다운로드 (브라우저)
export function downloadDXF(dxfContent: string, filename: string): void {
  const blob = new Blob([dxfContent], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ===== SVG 미리보기 생성 (앱 내 뷰어용) =====
export function generateFloorPlanSVGPreview(config: FloorPlanConfig): string {
  const { type, floor, totalFloors, strategy = 'profitability', layoutName, siteArea, units, floors: totalFloorCount, parking } = config

  const W = 400, H = 400, PAD = 20
  const avail = W - PAD * 2

  const siteRatio = Math.sqrt(siteArea)
  const scaleF = avail / siteRatio
  const siteW = siteRatio * scaleF
  const siteH = siteRatio * scaleF

  const bRatio = 0.57
  const bW = siteW * bRatio
  const bH = siteH * bRatio
  const bX = PAD + (siteW - bW) / 2
  const bY = PAD + (siteH - bH) / 2

  const isGround = floor === 1
  const isTop = floor === totalFloors

  let rooms = ''

  if (isGround) {
    // 1층: 상가A / 로비 / 상가B + 하단 관리실·기계실·커뮤니티
    const shopAW = bW * 0.3; const lobbyW = bW * 0.2; const shopBW = bW - shopAW - lobbyW
    const topH = bH * 0.28; const botH = bH * 0.22
    rooms += `<rect x="${bX}" y="${bY}" width="${shopAW}" height="${topH}" fill="#d97706" opacity="0.7" stroke="#f59e0b" strokeWidth="1"/>
    <text x="${bX + shopAW/2}" y="${bY + topH/2 + 5}" textAnchor="middle" fontSize="10" fill="white">상가 A</text>`
    rooms += `<rect x="${bX+shopAW}" y="${bY}" width="${lobbyW}" height="${topH}" fill="#0e7490" opacity="0.7" stroke="#22d3ee" strokeWidth="1"/>
    <text x="${bX+shopAW+lobbyW/2}" y="${bY + topH/2 + 5}" textAnchor="middle" fontSize="9" fill="white">로비</text>`
    rooms += `<rect x="${bX+shopAW+lobbyW}" y="${bY}" width="${shopBW}" height="${topH}" fill="#d97706" opacity="0.7" stroke="#f59e0b" strokeWidth="1"/>
    <text x="${bX+shopAW+lobbyW+shopBW/2}" y="${bY + topH/2 + 5}" textAnchor="middle" fontSize="10" fill="white">상가 B</text>`
    // 중정
    const courtW = bW * 0.5; const courtH = bH - topH - botH
    const courtX = bX + (bW - courtW) / 2; const courtY = bY + topH
    rooms += `<rect x="${bX}" y="${courtY}" width="${bW}" height="${courtH}" fill="#134e4a" opacity="0.6" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4 2"/>`
    rooms += `<rect x="${courtX}" y="${courtY}" width="${courtW}" height="${courtH}" fill="#10b981" opacity="0.2" stroke="#10b981" strokeWidth="1"/>`
    rooms += `<text x="${bX+bW/2}" y="${courtY+courtH/2+5}" textAnchor="middle" fontSize="10" fill="#6ee7b7">중정 / 조경</text>`
    // 하단
    const mgW = bW * 0.28; const mechW = bW * 0.28; const comW = bW - mgW - mechW
    rooms += `<rect x="${bX}" y="${bY+bH-botH}" width="${mgW}" height="${botH}" fill="#7c3aed" opacity="0.7" stroke="#a78bfa" strokeWidth="1"/>
    <text x="${bX+mgW/2}" y="${bY+bH-botH+botH/2+5}" textAnchor="middle" fontSize="9" fill="white">관리실</text>`
    rooms += `<rect x="${bX+mgW}" y="${bY+bH-botH}" width="${mechW}" height="${botH}" fill="#374151" opacity="0.8" stroke="#6b7280" strokeWidth="1"/>
    <text x="${bX+mgW+mechW/2}" y="${bY+bH-botH+botH/2+5}" textAnchor="middle" fontSize="9" fill="white">기계실</text>`
    rooms += `<rect x="${bX+mgW+mechW}" y="${bY+bH-botH}" width="${comW}" height="${botH}" fill="#be185d" opacity="0.7" stroke="#f472b6" strokeWidth="1"/>
    <text x="${bX+mgW+mechW+comW/2}" y="${bY+bH-botH+botH/2+5}" textAnchor="middle" fontSize="9" fill="white">커뮤니티</text>`
  } else if (isTop) {
    // 옥상층
    rooms += `<rect x="${bX}" y="${bY}" width="${bW}" height="${bH}" fill="#1e293b" opacity="0.5" stroke="#475569" strokeWidth="1" strokeDasharray="6 3"/>`
    rooms += `<text x="${bX+bW/2}" y="${bY+bH/2+5}" textAnchor="middle" fontSize="13" fill="#94a3b8">옥상 / 기계실층</text>`
  } else {
    // 기준층: 세대 배치
    const cols = type === 'lshape' ? 2 : 3
    const rows = Math.ceil(units / (cols * totalFloorCount)) + 1
    const unitW = bW / (cols + 1); const unitH = bH / (rows + 1)
    const coreW = bW * 0.12; const coreH = bH * 0.15
    const coreX = bX + bW/2 - coreW/2; const coreY = bY + bH/2 - coreH/2
    // 세대
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const ux = bX + c * (unitW + 4) + 4; const uy = bY + r * (unitH + 4) + 4
        if (ux + unitW > coreX - 4 && ux < coreX + coreW + 4 && uy + unitH > coreY - 4 && uy < coreY + coreH + 4) continue
        rooms += `<rect x="${ux}" y="${uy}" width="${unitW-2}" height="${unitH-2}" fill="#1e3a5f" opacity="0.8" stroke="#3b82f6" strokeWidth="1"/>
        <text x="${ux+(unitW-2)/2}" y="${uy+(unitH-2)/2+4}" textAnchor="middle" fontSize="8" fill="#93c5fd">${String.fromCharCode(65 + c)}타입</text>`
      }
    }
    // 코어
    rooms += `<rect x="${coreX}" y="${coreY}" width="${coreW}" height="${coreH}" fill="#7f1d1d" opacity="0.8" stroke="#ef4444" strokeWidth="1.5"/>
    <text x="${coreX+coreW/2}" y="${coreY+coreH/2+4}" textAnchor="middle" fontSize="8" fill="#fca5a5">코어</text>`
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" style="background:#0f172a;display:block;width:100%;height:100%">
  <defs><pattern id="pg" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5"/></pattern></defs>
  <rect width="${W}" height="${H}" fill="url(#pg)"/>
  <rect x="${PAD}" y="${PAD}" width="${siteW}" height="${siteH}" fill="#3b82f610" stroke="#3b82f6" strokeWidth="2"/>
  ${rooms}
  <rect x="${bX}" y="${bY}" width="${bW}" height="${bH}" fill="none" stroke="#22d3ee" strokeWidth="1.5" strokeDasharray="4 2"/>
  <text x="${W/2}" y="${H-6}" textAnchor="middle" fontSize="9" fill="#64748b">${layoutName} · ${floor}층/${totalFloors}층 · ${units}세대</text>
</svg>`
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Phase 2: 구조 그리드 DXF 내보내기 (AutoCAD 품질)
// Phase 3: MEP 통합 (PS, 덕트, 분전함)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { generateStructuralGrid, WALL_RC, WALL_PARTITION, COLUMN_SIZE, type StructuralGrid } from './structural-grid'
// getBuildingDimensionsInMeters already imported at top; PlacementResult from layout-placement-engine

// CIRCLE 엔티티
function dxfCircle(cx: number, cy: number, radius: number, layer: string): string {
  return `  0\nCIRCLE\n  8\n${layer}\n 10\n${fmt(cx)}\n 20\n${fmt(cy)}\n 30\n0.0000\n 40\n${fmt(radius)}\n`
}

// SOLID (채움 사각형)
function dxfSolid(x: number, y: number, w: number, h: number, layer: string): string {
  return `  0\nSOLID\n  8\n${layer}\n 10\n${fmt(x)}\n 20\n${fmt(y)}\n 30\n0.0\n 11\n${fmt(x+w)}\n 21\n${fmt(y)}\n 31\n0.0\n 12\n${fmt(x)}\n 22\n${fmt(y+h)}\n 32\n0.0\n 13\n${fmt(x+w)}\n 23\n${fmt(y+h)}\n 33\n0.0\n`
}

// 치수선 (간단한 LINE + TEXT)
function dxfDimLine(x1: number, y1: number, x2: number, y2: number, text: string, offset: number, layer: string): string {
  const isHoriz = Math.abs(y2 - y1) < 0.01
  let out = ''
  if (isHoriz) {
    out += dxfLine(x1, y1 + offset, x2, y2 + offset, layer)
    out += dxfLine(x1, y1 + offset - 200, x1, y1 + offset + 200, layer)
    out += dxfLine(x2, y2 + offset - 200, x2, y2 + offset + 200, layer)
    out += dxfText((x1+x2)/2, y1 + offset + 100, text, 150, layer)
  } else {
    out += dxfLine(x1 + offset, y1, x2 + offset, y2, layer)
    out += dxfLine(x1 + offset - 200, y1, x1 + offset + 200, y1, layer)
    out += dxfLine(x2 + offset - 200, y2, x2 + offset + 200, y2, layer)
    out += dxfText(x1 + offset + 100, (y1+y2)/2, text, 150, layer)
  }
  return out
}

/**
 * Phase 2: 구조 그리드 기반 AutoCAD DXF 생성
 * Phase 3: MEP 통합 (PS/덕트/분전함)
 */
export function generateStructuralDXF(params: {
  type: string; coverage: number; siteArea: number; floors: number
  units: number; unitArea: number; layoutName: string; address?: string
  /** SSOT: 배치 엔진 결과 (있으면 이것을 사용) */
  placement?: PlacementResult
}): string {
  const { type, coverage, siteArea, floors, units, unitArea, layoutName, address, placement } = params

  // 건물 치수 — 배치 엔진 SSOT 우선, 없으면 기존 방식
  const geo = placement
    ? toGeometryCompat(placement)
    : getBuildingDimensionsInMeters({ type: type as any, coverage, siteArea, floors })
  const bm = geo.blocksInMeters
  if (!bm || bm.length === 0) return ''
  const mainBlock = bm.reduce((a, b) => (a.widthM * a.depthM > b.widthM * b.depthM ? a : b))

  // 구조 그리드 생성
  const grid = generateStructuralGrid({
    widthM: mainBlock.widthM, depthM: mainBlock.depthM,
    unitAreaM2: unitArea, floors,
  })

  // DXF 단위: mm (1m = 1000mm)
  const scale = 1000
  const totalW = grid.totalWidthM * scale
  const totalD = grid.totalDepthM * scale
  const bayW = grid.bayWidthM * scale
  const bayD = grid.bayDepthM * scale
  const wallRC = WALL_RC * scale
  const wallPart = WALL_PARTITION * scale
  const colSize = COLUMN_SIZE * scale

  // ━━━ 레이어 정의 ━━━
  const layers: DXFLayer[] = [
    { name: 'A-GRID', color: 1 },          // 구조 그리드 (빨강)
    { name: 'A-COLS', color: 7 },           // 기둥 (흰색)
    { name: 'A-WALL-RC', color: 7 },        // RC벽 (흰색)
    { name: 'A-WALL-PART', color: 3 },      // 경량벽 (녹색)
    { name: 'A-ROOM-LABEL', color: 2 },     // 방 라벨 (노랑)
    { name: 'A-ROOM-AREA', color: 4 },      // 방 면적 (청록)
    { name: 'A-DIMS', color: 4 },           // 치수선 (청록)
    { name: 'A-DOOR', color: 2 },           // 문 (노랑)
    { name: 'A-WINDOW', color: 5 },         // 창문 (파랑)
    { name: 'A-TITLE', color: 7 },          // 타이틀 블록 (흰색)
    { name: 'M-PS', color: 1 },             // PS (빨강) — MEP
    { name: 'M-DUCT', color: 3 },           // 덕트 (녹색) — MEP
    { name: 'M-ELEC', color: 2 },           // 전기 (노랑) — MEP
    { name: 'M-PLUMBING', color: 5 },       // 급배수 (파랑) — MEP
    { name: 'A-HATCH', color: 8 },            // 해칭 (회색) — 습식 공간
    { name: 'A-WALL-EXT', color: 7 },         // 외벽 (흰색, 굵은선)
  ]

  let entities = ''

  // ━━━ 구조 그리드 라인 (A-GRID) ━━━
  for (let i = 0; i <= grid.baysX; i++) {
    const x = i * bayW
    entities += dxfLine(x, -500, x, totalD + 500, 'A-GRID')
    entities += dxfText(x, totalD + 800, String.fromCharCode(65 + i), 300, 'A-GRID')
  }
  for (let i = 0; i <= grid.baysY; i++) {
    const y = totalD - i * bayD
    entities += dxfLine(-500, y, totalW + 500, y, 'A-GRID')
    entities += dxfText(-1200, y, String(i + 1), 300, 'A-GRID')
  }

  // ━━━ 기둥 (A-COLS) — 400×400mm 채움 ━━━
  for (const col of grid.columns) {
    const cx = col.x * bayW
    const cy = totalD - col.y * bayD
    entities += dxfSolid(cx - colSize/2, cy - colSize/2, colSize, colSize, 'A-COLS')
    entities += dxfRect(cx - colSize/2, cy - colSize/2, colSize, colSize, 'A-COLS')
  }

  // ━━━ 방 (벽체 + 라벨 + 면적) ━━━
  for (const room of grid.rooms) {
    const rx = room.gridX * bayW
    const ry = totalD - (room.gridY + room.spanY) * bayD
    const rw = room.spanX * bayW
    const rh = room.spanY * bayD
    const wallLayer = room.wallType === 'rc' ? 'A-WALL-RC' : 'A-WALL-PART'
    const wallT = room.wallType === 'rc' ? wallRC : wallPart

    // 외벽 (두께 있는 이중선)
    entities += dxfRect(rx, ry, rw, rh, wallLayer)
    if (wallT > 50) {
      entities += dxfRect(rx + wallT, ry + wallT, rw - wallT * 2, rh - wallT * 2, wallLayer)
    }

    // 방 라벨 (중앙)
    entities += dxfText(rx + rw / 2 - 400, ry + rh / 2 + 100, room.label, 200, 'A-ROOM-LABEL')
    entities += dxfText(rx + rw / 2 - 400, ry + rh / 2 - 300, `${room.area.toFixed(1)}m2`, 150, 'A-ROOM-AREA')

    // 문 (Arc 또는 Line)
    if (room.hasDoor) {
      const doorW = 900 // 900mm 문
      let dx: number, dy: number
      switch (room.doorSide) {
        case 'top': dx = rx + rw/2 - doorW/2; dy = ry + rh; break
        case 'bottom': dx = rx + rw/2 - doorW/2; dy = ry; break
        case 'left': dx = rx; dy = ry + rh/2 - doorW/2; break
        default: dx = rx + rw; dy = ry + rh/2 - doorW/2; break
      }
      if (room.doorSide === 'top' || room.doorSide === 'bottom') {
        entities += dxfLine(dx, dy, dx + doorW, dy, 'A-DOOR')
        // 문 스윙 호 (간단한 라인으로)
        entities += dxfLine(dx, dy, dx + doorW * 0.7, dy + (room.doorSide === 'top' ? -doorW * 0.7 : doorW * 0.7), 'A-DOOR')
      } else {
        entities += dxfLine(dx, dy, dx, dy + doorW, 'A-DOOR')
        entities += dxfLine(dx, dy, dx + (room.doorSide === 'right' ? -doorW * 0.7 : doorW * 0.7), dy + doorW * 0.7, 'A-DOOR')
      }
    }

    // 창문 (이중선)
    for (const side of room.windowSides) {
      const winLen = Math.min(rw, rh) * 0.6
      let wx: number, wy: number
      switch (side) {
        case 'top': wx = rx + rw/2 - winLen/2; wy = ry + rh; 
          entities += dxfLine(wx, wy, wx + winLen, wy, 'A-WINDOW')
          entities += dxfLine(wx, wy - 50, wx + winLen, wy - 50, 'A-WINDOW')
          break
        case 'bottom': wx = rx + rw/2 - winLen/2; wy = ry;
          entities += dxfLine(wx, wy, wx + winLen, wy, 'A-WINDOW')
          entities += dxfLine(wx, wy + 50, wx + winLen, wy + 50, 'A-WINDOW')
          break
        case 'left': wx = rx; wy = ry + rh/2 - winLen/2;
          entities += dxfLine(wx, wy, wx, wy + winLen, 'A-WINDOW')
          entities += dxfLine(wx + 50, wy, wx + 50, wy + winLen, 'A-WINDOW')
          break
        case 'right': wx = rx + rw; wy = ry + rh/2 - winLen/2;
          entities += dxfLine(wx, wy, wx, wy + winLen, 'A-WINDOW')
          entities += dxfLine(wx - 50, wy, wx - 50, wy + winLen, 'A-WINDOW')
          break
      }
    }
  }

  // ━━━ 치수선 (A-DIMS) ━━━
  // 상단 bay 치수
  for (let i = 0; i < grid.baysX; i++) {
    entities += dxfDimLine(i * bayW, totalD, (i+1) * bayW, totalD, `${grid.bayWidthM.toFixed(1)}m`, 1500, 'A-DIMS')
  }
  // 전체 폭
  entities += dxfDimLine(0, totalD, totalW, totalD, `${grid.totalWidthM.toFixed(1)}m`, 2500, 'A-DIMS')
  // 좌측 bay 치수
  for (let i = 0; i < grid.baysY; i++) {
    entities += dxfDimLine(0, totalD - i * bayD, 0, totalD - (i+1) * bayD, `${grid.bayDepthM.toFixed(1)}m`, -1500, 'A-DIMS')
  }
  // 전체 깊이
  entities += dxfDimLine(0, totalD, 0, 0, `${grid.totalDepthM.toFixed(1)}m`, -2500, 'A-DIMS')

  // ━━━ Phase 3: MEP (Mechanical/Electrical/Plumbing) ━━━

  // PS (Pipe Shaft) — 욕실/주방 근처 수직 배관 샤프트
  const wetRooms = grid.rooms.filter(r => r.isWet)
  for (const wet of wetRooms) {
    const psX = wet.gridX * bayW + (wet.spanX * bayW) - 400
    const psY = totalD - (wet.gridY + wet.spanY) * bayD + 200
    const psSize = 300 // 300mm PS
    entities += dxfRect(psX, psY, psSize, psSize, 'M-PS')
    entities += dxfLine(psX, psY, psX + psSize, psY + psSize, 'M-PS') // X 표시
    entities += dxfLine(psX + psSize, psY, psX, psY + psSize, 'M-PS')
    entities += dxfText(psX - 100, psY - 200, 'PS', 100, 'M-PS')
  }

  // 덕트 공간 — 주방 상부 (환기)
  const kitchenRoom = grid.rooms.find(r => r.type === 'kitchen')
  if (kitchenRoom) {
    const dX = kitchenRoom.gridX * bayW + 200
    const dY = totalD - (kitchenRoom.gridY + 1) * bayD + bayD - 500
    entities += dxfRect(dX, dY, bayW * kitchenRoom.spanX - 400, 300, 'M-DUCT')
    entities += dxfText(dX + 100, dY + 50, 'DUCT 300x300', 80, 'M-DUCT')
  }

  // 분전함 — 현관 근처
  const entrRoom = grid.rooms.find(r => r.type === 'entrance')
  if (entrRoom) {
    const eX = entrRoom.gridX * bayW + 200
    const eY = totalD - (entrRoom.gridY + 1) * bayD + 200
    entities += dxfRect(eX, eY, 400, 600, 'M-ELEC')
    entities += dxfText(eX + 50, eY + 200, 'MDB', 100, 'M-ELEC')
  }

  // 급수 라인 — PS → 주방/욕실 (점선)
  for (const wet of wetRooms) {
    const wx = wet.gridX * bayW + wet.spanX * bayW / 2
    const wy = totalD - (wet.gridY + 0.5) * bayD
    // PS까지 연결
    entities += dxfLine(wx, wy, wx + bayW * 0.3, wy, 'M-PLUMBING')
    entities += dxfLine(wx + bayW * 0.3, wy, wx + bayW * 0.3, wy + bayD * 0.4, 'M-PLUMBING')
  }

  // ━━━ 습식 공간 해칭 (45도 대각선 패턴) ━━━
  for (const wet of wetRooms) {
    const hx = wet.gridX * bayW
    const hy = totalD - (wet.gridY + wet.spanY) * bayD
    const hw = wet.spanX * bayW
    const hh = wet.spanY * bayD
    const hatchSpacing = 150 // 150mm 간격
    for (let d = 0; d < hw + hh; d += hatchSpacing) {
      const x1 = hx + Math.min(d, hw)
      const y1 = hy + Math.max(0, d - hw)
      const x2 = hx + Math.max(0, d - hh)
      const y2 = hy + Math.min(d, hh)
      entities += dxfLine(x1, y1, x2, y2, 'A-HATCH')
    }
  }

  // ━━━ 외벽 (굵은 이중선 — A-WALL-EXT 레이어) ━━━
  // 상하좌우 외벽 200mm
  entities += dxfLine(0, 0, totalW, 0, 'A-WALL-EXT')
  entities += dxfLine(0, wallRC, totalW, wallRC, 'A-WALL-EXT')
  entities += dxfLine(0, totalD, totalW, totalD, 'A-WALL-EXT')
  entities += dxfLine(0, totalD - wallRC, totalW, totalD - wallRC, 'A-WALL-EXT')
  entities += dxfLine(0, 0, 0, totalD, 'A-WALL-EXT')
  entities += dxfLine(wallRC, 0, wallRC, totalD, 'A-WALL-EXT')
  entities += dxfLine(totalW, 0, totalW, totalD, 'A-WALL-EXT')
  entities += dxfLine(totalW - wallRC, 0, totalW - wallRC, totalD, 'A-WALL-EXT')

  // ━━━ 타이틀 블록 ━━━
  const titleX = 0, titleY = -2000
  entities += dxfRect(titleX, titleY, totalW, 1800, 'A-TITLE')
  entities += dxfText(titleX + 200, titleY + 1200, `ARCHI-SCAN | ${layoutName}`, 250, 'A-TITLE')
  entities += dxfText(titleX + 200, titleY + 800, address || '주소 미입력', 150, 'A-TITLE')
  entities += dxfText(titleX + 200, titleY + 400, `${grid.baysX}x${grid.baysY} BAY (${grid.bayWidthM}m x ${grid.bayDepthM}m) | Alexander ${grid.score}점 | ${grid.rooms.length}실`, 120, 'A-TITLE')
  entities += dxfText(titleX + totalW - 3000, titleY + 800, `SCALE 1:100`, 150, 'A-TITLE')
  entities += dxfText(titleX + totalW - 3000, titleY + 400, `DATE: ${new Date().toISOString().slice(0,10)}`, 120, 'A-TITLE')

  // ━━━ DXF 조립 ━━━
  const header = dxfHeader()
  const tables = dxfLayers(layers)
  const entSection = `  0\nSECTION\n  2\nENTITIES\n${entities}  0\nENDSEC\n`
  const eof = `  0\nEOF\n`

  return header + tables + entSection + eof
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Phase 4: 창호·마감 스케줄 DXF 테이블
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { generateSchedules, type WindowSpec, type DoorSpec, type FinishSpec } from './schedule-generator'

/** 스케줄 테이블을 DXF 텍스트로 생성 (타이틀 블록 아래에 배치) */
function dxfScheduleTable(
  windows: WindowSpec[], doors: DoorSpec[], finishes: FinishSpec[],
  startX: number, startY: number
): string {
  let out = ''
  const rowH = 400, colW = 2500, headerH = 500
  let y = startY
  
  // ━━━ 창호 스케줄 ━━━
  out += dxfText(startX, y, '[ WINDOW SCHEDULE ]', 300, 'A-TITLE')
  y -= headerH
  // 헤더
  const wHeaders = ['NO', 'TYPE', 'W×H (mm)', 'MATERIAL', 'GLASS', 'QTY', 'ROOMS']
  wHeaders.forEach((h, i) => { out += dxfText(startX + i * colW, y, h, 180, 'A-DIMS') })
  y -= rowH
  out += dxfLine(startX, y + 350, startX + colW * wHeaders.length, y + 350, 'A-DIMS')
  
  for (const w of windows) {
    const cols = [w.id, w.type, `${w.width}×${w.height}`, w.material, w.glass, String(w.count), w.rooms.join(',')]
    cols.forEach((c, i) => { out += dxfText(startX + i * colW, y, c, 150, 'A-WINDOW') })
    y -= rowH
  }
  
  y -= headerH
  
  // ━━━ 문 스케줄 ━━━
  out += dxfText(startX, y, '[ DOOR SCHEDULE ]', 300, 'A-TITLE')
  y -= headerH
  const dHeaders = ['NO', 'TYPE', 'W×H (mm)', 'MATERIAL', 'HARDWARE', 'FIRE', 'QTY']
  dHeaders.forEach((h, i) => { out += dxfText(startX + i * colW, y, h, 180, 'A-DIMS') })
  y -= rowH
  out += dxfLine(startX, y + 350, startX + colW * dHeaders.length, y + 350, 'A-DIMS')
  
  for (const d of doors) {
    const cols = [d.id, d.type, `${d.width}×${d.height}`, d.material, d.hardware, d.fireRating, String(d.count)]
    cols.forEach((c, i) => { out += dxfText(startX + i * colW, y, c, 150, 'A-DOOR') })
    y -= rowH
  }
  
  y -= headerH
  
  // ━━━ 마감표 ━━━
  out += dxfText(startX, y, '[ FINISH SCHEDULE ]', 300, 'A-TITLE')
  y -= headerH
  const fHeaders = ['ROOM', 'FLOOR', 'WALL', 'CEILING', 'BASE', 'CH(mm)']
  fHeaders.forEach((h, i) => { out += dxfText(startX + i * colW, y, h, 180, 'A-DIMS') })
  y -= rowH
  out += dxfLine(startX, y + 350, startX + colW * fHeaders.length, y + 350, 'A-DIMS')
  
  for (const f of finishes) {
    const cols = [f.room, f.floor, f.wall, f.ceiling, f.baseboard, String(f.ceilingHeight)]
    cols.forEach((c, i) => { out += dxfText(startX + i * colW, y, c, 120, 'A-ROOM-LABEL') })
    y -= rowH
  }
  
  return out
}

/** Phase 4 통합: 구조 DXF + 스케줄 테이블 */
export function generateFullDXF(params: {
  type: string; coverage: number; siteArea: number; floors: number
  units: number; unitArea: number; layoutName: string; address?: string
  placement?: PlacementResult
}): string {
  // 기본 구조 DXF (Phase 2+3)
  const baseDXF = generateStructuralDXF(params)
  if (!baseDXF) return ''
  
  // 구조 그리드 데이터 재생성 (스케줄용) — SSOT 우선
  const geo = params.placement
    ? toGeometryCompat(params.placement)
    : getBuildingDimensionsInMeters({ type: params.type as any, coverage: params.coverage, siteArea: params.siteArea, floors: params.floors })
  const bm = geo.blocksInMeters
  if (!bm || bm.length === 0) return baseDXF
  
  const mainBlock = bm.reduce((a: any, b: any) => (a.widthM * a.depthM > b.widthM * b.depthM ? a : b))
  const { generateStructuralGrid: genGrid } = require('./structural-grid')
  const grid = genGrid({ widthM: mainBlock.widthM, depthM: mainBlock.depthM, unitAreaM2: params.unitArea, floors: params.floors })
  
  // 스케줄 생성
  const schedules = generateSchedules(grid)
  
  // 스케줄 테이블 DXF (타이틀 블록 아래)
  const totalW = grid.totalWidthM * 1000
  const scheduleEntities = dxfScheduleTable(
    schedules.windows, schedules.doors, schedules.finishes,
    0, -4000  // 타이틀 블록 아래 2000mm
  )
  
  // 기존 DXF의 ENDSEC 전에 스케줄 삽입
  return baseDXF.replace('  0\nENDSEC\n  0\nEOF', scheduleEntities + '  0\nENDSEC\n  0\nEOF')
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Phase 5: 구조 계산 DXF 테이블
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { calculateStructure, type StructuralCalc } from './structural-calc'

/** 구조 계산 결과를 DXF 텍스트로 생성 */
function dxfStructuralTable(calc: StructuralCalc, startX: number, startY: number): string {
  let out = ''
  const rowH = 400, colW = 2500
  let y = startY
  
  // ━━━ 구조 개요 ━━━
  out += dxfText(startX, y, '[ STRUCTURAL SUMMARY ]', 300, 'A-TITLE')
  y -= 500
  out += dxfText(startX, y, `Fck=${calc.summary.fck}MPa  Fy=${calc.summary.fy}MPa  Total=${Math.round(calc.summary.totalWeight)}kN  Soil=${calc.summary.soilPressure}kN/m2`, 150, 'A-DIMS')
  y -= 600
  
  // ━━━ 기둥 스케줄 ━━━
  out += dxfText(startX, y, '[ COLUMN SCHEDULE ]', 300, 'A-TITLE')
  y -= 500
  const cHeaders = ['NO', 'SIZE(mm)', 'MAIN BAR', 'TIE BAR', 'LOCATION', 'LOAD RATIO']
  cHeaders.forEach((h, i) => { out += dxfText(startX + i * colW, y, h, 180, 'A-DIMS') })
  y -= rowH
  out += dxfLine(startX, y + 350, startX + colW * cHeaders.length, y + 350, 'A-DIMS')
  
  for (const c of calc.columns) {
    const cols = [c.id, `${c.width}×${c.depth}`, c.mainBar, c.tieBar, c.location, `${(c.loadRatio*100).toFixed(0)}%`]
    cols.forEach((v, i) => { out += dxfText(startX + i * colW, y, v, 150, 'A-COLS') })
    y -= rowH
  }
  y -= 400
  
  // ━━━ 보 스케줄 ━━━
  out += dxfText(startX, y, '[ BEAM SCHEDULE ]', 300, 'A-TITLE')
  y -= 500
  const bHeaders = ['NO', 'SIZE(mm)', 'TOP BAR', 'BOT BAR', 'STIRRUP', 'SPAN', 'DIR']
  bHeaders.forEach((h, i) => { out += dxfText(startX + i * colW, y, h, 180, 'A-DIMS') })
  y -= rowH
  out += dxfLine(startX, y + 350, startX + colW * bHeaders.length, y + 350, 'A-DIMS')
  
  for (const b of calc.beams) {
    const cols = [b.id, `${b.width}×${b.depth}`, b.topBar, b.bottomBar, b.stirrup, `${b.span}`, b.direction]
    cols.forEach((v, i) => { out += dxfText(startX + i * colW, y, v, 150, 'A-COLS') })
    y -= rowH
  }
  y -= 400
  
  // ━━━ 슬래브 + 기초 ━━━
  out += dxfText(startX, y, '[ SLAB ]', 300, 'A-TITLE')
  y -= 500
  out += dxfText(startX, y, `Type=${calc.slab.type}  THK=${calc.slab.thickness}mm  Top=${calc.slab.topMesh}  Bot=${calc.slab.bottomMesh}`, 150, 'A-DIMS')
  y -= 600
  
  out += dxfText(startX, y, '[ FOUNDATION ]', 300, 'A-TITLE')
  y -= 500
  out += dxfText(startX, y, `Type=${calc.foundation.type}  THK=${calc.foundation.thickness}mm  Depth=${calc.foundation.depth}mm`, 150, 'A-DIMS')
  y -= 400
  out += dxfText(startX, y, `Bot=${calc.foundation.bottomBar}  Top=${calc.foundation.topBar}`, 150, 'A-DIMS')
  
  return out
}

/** Phase 5 통합: Phase 2+3+4+5 DXF */
export function generateCompleteDXF(params: {
  type: string; coverage: number; siteArea: number; floors: number
  units: number; unitArea: number; layoutName: string; address?: string
  placement?: PlacementResult
}): string {
  const fullDXF = generateFullDXF(params)
  if (!fullDXF) return ''
  
  try {
    // SSOT 우선
    const geo = params.placement
      ? toGeometryCompat(params.placement)
      : getBuildingDimensionsInMeters({ type: params.type as any, coverage: params.coverage, siteArea: params.siteArea, floors: params.floors })
    const bm = geo.blocksInMeters
    if (!bm || bm.length === 0) return fullDXF
    
    const mainBlock = bm.reduce((a: any, b: any) => (a.widthM * a.depthM > b.widthM * b.depthM ? a : b))
    const { generateStructuralGrid: genGrid } = require('./structural-grid')
    const grid = genGrid({ widthM: mainBlock.widthM, depthM: mainBlock.depthM, unitAreaM2: params.unitArea, floors: params.floors })
    
    const calc = calculateStructure(grid, params.floors, params.siteArea)
    const structEntities = dxfStructuralTable(calc, 0, -12000)
    
    return fullDXF.replace('  0\nENDSEC\n  0\nEOF', structEntities + '  0\nENDSEC\n  0\nEOF')
  } catch { return fullDXF }
}
