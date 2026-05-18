/**
 * ControlNet 스타일 엣지맵 생성기
 * 
 * 건물 치수 → 건축 가이드 이미지 (SVG)
 * Gemini 참조 이미지로 전달하여 건물 형태 정확도 향상
 * 
 * 3가지 모드:
 *   1. footprint — 조감도용 건물 배치 (birds-eye)
 *   2. elevation — 정면도용 건물 입면 (eye-level)
 *   3. section — 단면도용 내부 구조 (section)
 */

import { getBuildingDimensionsInMeters } from './building-geometry'

interface EdgeMapParams {
  type: string
  coverage: number
  siteArea: number
  floors: number
  units?: number
  buildingCount?: number
  originalType?: string
  mode: 'footprint' | 'elevation' | 'section'
}

// ━━━ 조감도용 건물 배치 엣지맵 ━━━
function generateFootprintEdgeMap(params: EdgeMapParams): string {
  const { type, coverage, siteArea, floors, buildingCount, originalType } = params
  const geo = getBuildingDimensionsInMeters({
    type: type as any, coverage, siteArea, floors,
    buildingCount, originalType,
  })
  const blocks = geo.blocksInMeters
  if (!blocks.length) return ''

  const W = 400, H = 400, pad = 40
  const siteW = Math.sqrt(siteArea * 1.5)
  const siteH = siteArea / siteW
  const scale = Math.min((W - pad * 2) / siteW, (H - pad * 2) / siteH)
  const ox = (W - siteW * scale) / 2
  const oy = (H - siteH * scale) / 2

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`
  svg += `<rect width="${W}" height="${H}" fill="#000"/>`

  // 대지 경계
  svg += `<rect x="${ox}" y="${oy}" width="${siteW * scale}" height="${siteH * scale}" fill="none" stroke="#333" stroke-width="2" stroke-dasharray="8,4"/>`

  // 건물 블록 (흰색 = 건물, 검은색 = 배경)
  const totalBlockW = blocks.reduce((s, b) => s + b.widthM, 0)
  let bx = ox + (siteW * scale - totalBlockW * scale) / 2

  for (const block of blocks) {
    const bw = block.widthM * scale
    const bh = block.depthM * scale
    const by = oy + siteH * scale * 0.3 // 후면 배치

    // 건물 윤곽 (굵은 흰색)
    svg += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="#fff" stroke="#fff" stroke-width="3"/>`

    // 층 수 표시
    svg += `<text x="${bx + bw / 2}" y="${by + bh / 2 + 5}" text-anchor="middle" font-size="14" fill="#000" font-weight="bold">${floors}F</text>`

    bx += bw + 10
  }

  // 도로 (하단)
  svg += `<rect x="${ox}" y="${oy + siteH * scale - 5}" width="${siteW * scale}" height="20" fill="#444"/>`
  svg += `<line x1="${ox}" y1="${oy + siteH * scale + 5}" x2="${ox + siteW * scale}" y2="${oy + siteH * scale + 5}" stroke="#fff" stroke-width="1" stroke-dasharray="10,10"/>`

  // 방위
  svg += `<text x="${W / 2}" y="20" text-anchor="middle" font-size="12" fill="#666">N ↑</text>`

  svg += '</svg>'
  return svg
}

// ━━━ 정면도용 입면 엣지맵 ━━━
function generateElevationEdgeMap(params: EdgeMapParams): string {
  const { type, coverage, siteArea, floors } = params
  const geo = getBuildingDimensionsInMeters({ type: type as any, coverage, siteArea, floors })
  const blocks = geo.blocksInMeters
  if (!blocks.length) return ''

  const mainBlock = blocks.reduce((a, b) => (a.widthM * a.depthM > b.widthM * b.depthM ? a : b))
  const bldW = mainBlock.widthM
  const bldH = floors * 3.3

  const W = 400, H = 400, pad = 40
  const scale = Math.min((W - pad * 2) / bldW, (H - pad * 2) / (bldH + 5))
  const ox = (W - bldW * scale) / 2
  const baseY = H - pad - 20

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`
  svg += `<rect width="${W}" height="${H}" fill="#000"/>`

  // 지반선
  svg += `<line x1="0" y1="${baseY}" x2="${W}" y2="${baseY}" stroke="#666" stroke-width="2"/>`

  // 건물 외곽
  svg += `<rect x="${ox}" y="${baseY - bldH * scale}" width="${bldW * scale}" height="${bldH * scale}" fill="none" stroke="#fff" stroke-width="3"/>`

  // 층 구분선
  for (let f = 1; f < floors; f++) {
    const y = baseY - f * 3.3 * scale
    svg += `<line x1="${ox}" y1="${y}" x2="${ox + bldW * scale}" y2="${y}" stroke="#fff" stroke-width="1"/>`
  }

  // 창문 (각 층에 정규 배치)
  const numWin = Math.min(Math.floor(bldW / 2.5), 6)
  const winW = bldW * scale * 0.12
  const winH = 3.3 * scale * 0.45
  const gap = bldW * scale / (numWin + 1)

  for (let f = 0; f < floors; f++) {
    const floorY = baseY - (f + 1) * 3.3 * scale
    for (let w = 0; w < numWin; w++) {
      const wx = ox + gap * (w + 1) - winW / 2
      const wy = floorY + 3.3 * scale * 0.2
      svg += `<rect x="${wx}" y="${wy}" width="${winW}" height="${winH}" fill="none" stroke="#fff" stroke-width="1.5"/>`
    }
  }

  // 입구
  const doorW = bldW * scale * 0.1
  const doorH = 3.3 * scale * 0.7
  svg += `<rect x="${ox + bldW * scale / 2 - doorW / 2}" y="${baseY - doorH}" width="${doorW}" height="${doorH}" fill="none" stroke="#fff" stroke-width="2"/>`

  // 층 수 라벨
  for (let f = 0; f < floors; f++) {
    svg += `<text x="${ox + bldW * scale + 10}" y="${baseY - f * 3.3 * scale - 3.3 * scale / 2 + 4}" font-size="10" fill="#666">${f + 1}F</text>`
  }

  svg += '</svg>'
  return svg
}

// ━━━ 단면도용 엣지맵 ━━━
function generateSectionEdgeMap(params: EdgeMapParams): string {
  const { type, coverage, siteArea, floors } = params
  const geo = getBuildingDimensionsInMeters({ type: type as any, coverage, siteArea, floors })
  const blocks = geo.blocksInMeters
  if (!blocks.length) return ''

  const mainBlock = blocks.reduce((a, b) => (a.widthM * a.depthM > b.widthM * b.depthM ? a : b))
  const bldW = mainBlock.widthM
  const bldH = floors * 3.3

  const W = 400, H = 400, pad = 40
  const scale = Math.min((W - pad * 2) / bldW, (H - pad * 2) / (bldH + 3))
  const ox = (W - bldW * scale) / 2
  const baseY = H - pad - 20

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`
  svg += `<rect width="${W}" height="${H}" fill="#000"/>`

  // 지반
  svg += `<rect x="${ox - 10}" y="${baseY}" width="${bldW * scale + 20}" height="10" fill="#333"/>`

  // 외벽 (좌/우 굵은선)
  svg += `<line x1="${ox}" y1="${baseY}" x2="${ox}" y2="${baseY - bldH * scale}" stroke="#fff" stroke-width="4"/>`
  svg += `<line x1="${ox + 3}" y1="${baseY}" x2="${ox + 3}" y2="${baseY - bldH * scale}" stroke="#fff" stroke-width="1"/>`
  svg += `<line x1="${ox + bldW * scale}" y1="${baseY}" x2="${ox + bldW * scale}" y2="${baseY - bldH * scale}" stroke="#fff" stroke-width="4"/>`
  svg += `<line x1="${ox + bldW * scale - 3}" y1="${baseY}" x2="${ox + bldW * scale - 3}" y2="${baseY - bldH * scale}" stroke="#fff" stroke-width="1"/>`

  // 슬래브 (각 층)
  for (let f = 0; f <= floors; f++) {
    const y = baseY - f * 3.3 * scale
    svg += `<rect x="${ox}" y="${y - 2}" width="${bldW * scale}" height="4" fill="#fff"/>`
  }

  // 내벽 (기둥 위치에 수직선)
  const numCols = Math.floor(bldW / 3) + 1
  for (let c = 1; c < numCols; c++) {
    const cx = ox + (c / numCols) * bldW * scale
    svg += `<line x1="${cx}" y1="${baseY}" x2="${cx}" y2="${baseY - bldH * scale}" stroke="#fff" stroke-width="1" stroke-dasharray="4,4"/>`
  }

  svg += '</svg>'
  return svg
}

// ━━━ 메인: 엣지맵 생성 ━━━
export function generateEdgeMap(params: EdgeMapParams): string {
  switch (params.mode) {
    case 'footprint': return generateFootprintEdgeMap(params)
    case 'elevation': return generateElevationEdgeMap(params)
    case 'section': return generateSectionEdgeMap(params)
    default: return generateElevationEdgeMap(params)
  }
}

// 카메라 앵글에 따라 적절한 엣지맵 모드 선택
export function getEdgeMapMode(cameraAngle?: string): 'footprint' | 'elevation' | 'section' {
  switch (cameraAngle) {
    case 'birds-eye': return 'footprint'
    case 'eye-level': return 'elevation'
    case 'entrance': return 'elevation'
    case 'interior': return 'section'
    default: return 'elevation'
  }
}
