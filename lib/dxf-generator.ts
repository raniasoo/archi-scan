/**
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
