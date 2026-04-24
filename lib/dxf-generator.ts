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
    layoutName, siteArea, units, floors: totalFloorCount, parking
  } = config

  // mm 단위 사용 (1m = 1000mm)
  // 기준 건물 크기: 사이트 면적 기반
  const scale = 1000 // 1:1000 스케일 → mm 단위

  // 대지 규모 추정 (정사각형 대지 기준)
  const siteW = Math.sqrt(siteArea) * scale  // mm
  const siteH = siteW

  // 건물 크기 (대지의 60% 건폐율 적용)
  const buildingRatio = 0.57 // 57% 건폐율
  const buildingW = siteW * buildingRatio
  const buildingH = siteH * buildingRatio

  // 중심 배치
  const siteX = 0
  const siteY = 0
  const buildingX = siteX + (siteW - buildingW) / 2
  const buildingY = siteY + (siteH - buildingH) / 2

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

  let entities = ''

  // ===== 대지 경계 =====
  entities += dxfRect(siteX, siteY, siteW, siteH, 'SITE_BOUNDARY')

  // ===== 건물 외곽 =====
  entities += dxfRect(buildingX, buildingY, buildingW, buildingH, 'BUILDING_OUTLINE')

  // ===== 이격거리 선 (건물 외곽에서 3m 이격) =====
  const setbackDist = 3 * scale
  entities += dxfRect(
    buildingX - setbackDist,
    buildingY - setbackDist,
    buildingW + setbackDist * 2,
    buildingH + setbackDist * 2,
    'SETBACK_LINE'
  )

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
