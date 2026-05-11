import { NextRequest, NextResponse } from 'next/server'
import { Resvg } from '@resvg/resvg-js'

const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY

// SVG → PNG 변환 (Gemini는 SVG 미지원, PNG만 가능)
function svgToPngBase64(svgString: string, width = 600): string {
  try {
    const resvg = new Resvg(svgString, { 
      fitTo: { mode: 'width' as const, value: width },
      font: { loadSystemFonts: false },
    })
    const pngData = resvg.render()
    const pngBuffer = pngData.asPng()
    return Buffer.from(pngBuffer).toString('base64')
  } catch (e) {
    console.error('[SVG→PNG] Conversion failed:', e)
    return '' // 실패 시 빈 문자열 → 이미지 생략
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!GOOGLE_AI_API_KEY) {
      return NextResponse.json({ error: 'GOOGLE_AI_API_KEY not configured' }, { status: 500 })
    }

    const { prompt, style, address, layoutName, floors, units, siteArea, buildingType, buildingCount: userBuildingCount, coverage, strategy, values, patterns, surroundingContext, cameraAngle, sceneMode, satelliteUrl, cadastralMapUrl, streetViewUrls, sitePolygon, material, multiAngle, regulation, terrainInfo, referenceImage } = await req.json()
    const ti = terrainInfo as { slopeDirection?: string; elevationDiff?: number; avgSlope?: number } | undefined

    if (!prompt) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
    }

    // 참조 이미지 수집 (위성사진 + 지적도 + 거리뷰)
    const refImages: { base64: string; mimeType: string; label: string }[] = []
    let polygonShapeDesc = ''
    
    // ━━━ 폴리곤 → SVG 지적도 이미지 생성 ━━━
    if (Array.isArray(sitePolygon) && sitePolygon.length >= 3) {
      try {
        const lats = sitePolygon.map((c: number[]) => c[1])
        const lngs = sitePolygon.map((c: number[]) => c[0])
        const cLat = (Math.min(...lats) + Math.max(...lats)) / 2
        const cLng = (Math.min(...lngs) + Math.max(...lngs)) / 2
        const LM = Math.cos(cLat * Math.PI / 180) * 111319

        // 경위도 → 미터 → SVG 좌표
        const mCoords = sitePolygon.map(([lng, lat]: number[]) => [
          (lng - cLng) * LM,
          -(lat - cLat) * 111319 // Y축 반전 (SVG는 아래가 +)
        ])
        const xs = mCoords.map((c: number[]) => c[0])
        const ys = mCoords.map((c: number[]) => c[1])
        const minX = Math.min(...xs), maxX = Math.max(...xs)
        const minY = Math.min(...ys), maxY = Math.max(...ys)
        const w = maxX - minX, h = maxY - minY
        const pad = Math.max(w, h) * 0.15
        const svgW = 600, svgH = 400
        const scale = Math.min((svgW - 60) / (w + pad * 2), (svgH - 60) / (h + pad * 2))
        const cx = svgW / 2, cy = svgH / 2
        const midX = (minX + maxX) / 2, midY = (minY + maxY) / 2

        const points = mCoords.map(([x, y]: number[]) =>
          `${cx + (x - midX) * scale},${cy + (y - midY) * scale}`
        ).join(' ')

        // 이격거리 경계 (안쪽 3m 축소)
        const setback = 3 * scale
        const innerPoints = mCoords.map(([x, y]: number[]) => {
          const dx = x - midX, dy = y - midY
          const dist = Math.sqrt(dx * dx + dy * dy)
          const shrink = dist > 0 ? Math.max(0, dist - 3) / dist : 1
          return `${cx + dx * shrink * scale},${cy + dy * shrink * scale}`
        }).join(' ')

        // 방위 표시 + 축척
        const scaleBarM = Math.round(w / 3 / 10) * 10 || 10
        const scaleBarPx = scaleBarM * scale

        // ★ 경사 방향 화살표 SVG 사전 계산
        let slopeSvg = ''
        if (ti && ti.slopeDirection && ti.elevationDiff && ti.elevationDiff >= 2) {
          const dir = String(ti.slopeDirection || '')
          let angle = 90 // default: south
          if (dir.includes('남서')) angle = 135
          else if (dir.includes('남동')) angle = 45
          else if (dir.includes('북서')) angle = 225
          else if (dir.includes('북동')) angle = 315
          else if (dir.includes('남')) angle = 90
          else if (dir.includes('북')) angle = 270
          else if (dir.includes('동')) angle = 0
          else if (dir.includes('서')) angle = 180

          const rad = angle * Math.PI / 180
          const arrowLen = 50
          const ax = cx, ay = cy
          const ex = Math.round(ax + Math.cos(rad) * arrowLen)
          const ey = Math.round(ay + Math.sin(rad) * arrowLen)
          const highX = Math.round(ax - Math.cos(rad) * (arrowLen + 20))
          const highY = Math.round(ay - Math.sin(rad) * (arrowLen + 20))
          const lowX = Math.round(ax + Math.cos(rad) * (arrowLen + 20))
          const lowY = Math.round(ay + Math.sin(rad) * (arrowLen + 20))

          slopeSvg = `
  <!-- 경사 방향 표시 (SLOPE DIRECTION) -->
  <defs><marker id="sa" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0,0 8,3 0,6" fill="#ef4444"/></marker></defs>
  <line x1="${ax}" y1="${ay}" x2="${ex}" y2="${ey}" stroke="#ef4444" stroke-width="3" marker-end="url(#sa)" opacity="0.8"/>
  <text x="${highX}" y="${highY}" text-anchor="middle" fill="#22c55e" font-size="11" font-weight="bold" font-family="sans-serif">▲ HIGH</text>
  <text x="${lowX}" y="${lowY}" text-anchor="middle" fill="#ef4444" font-size="11" font-weight="bold" font-family="sans-serif">▼ LOW</text>
  <text x="${ax}" y="${ay - 10}" text-anchor="middle" fill="#f59e0b" font-size="10" font-family="sans-serif">${ti.elevationDiff}m drop · ${ti.avgSlope || ''}%</text>
  <text x="${ax}" y="${ay + 20}" text-anchor="middle" fill="#f59e0b" font-size="9" font-family="sans-serif">SLOPE: ${dir}</text>`
        }

        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">
  <rect width="${svgW}" height="${svgH}" fill="#1a1a2e"/>
  <text x="${svgW/2}" y="25" text-anchor="middle" fill="#8b95a5" font-size="13" font-family="sans-serif">실제 지적도 기반 대지 형상 (${address || ''})</text>
  
  <!-- 필지 경계 -->
  <polygon points="${points}" fill="rgba(59,130,246,0.15)" stroke="#3b82f6" stroke-width="2.5" stroke-linejoin="round"/>
  
  <!-- 이격거리 경계 -->
  <polygon points="${innerPoints}" fill="none" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="8,4" opacity="0.7"/>
  
  <!-- 건축 가능 영역 -->
  <polygon points="${innerPoints}" fill="rgba(34,197,94,0.08)" stroke="none"/>
  
  <!-- 범례 -->
  <line x1="30" y1="${svgH-50}" x2="50" y2="${svgH-50}" stroke="#3b82f6" stroke-width="2.5"/>
  <text x="55" y="${svgH-46}" fill="#8b95a5" font-size="10" font-family="sans-serif">대지경계</text>
  <line x1="30" y1="${svgH-35}" x2="50" y2="${svgH-35}" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="5,3"/>
  <text x="55" y="${svgH-31}" fill="#8b95a5" font-size="10" font-family="sans-serif">이격거리 경계</text>
  <rect x="30" y="${svgH-25}" width="20" height="10" fill="rgba(34,197,94,0.3)" stroke="none"/>
  <text x="55" y="${svgH-17}" fill="#8b95a5" font-size="10" font-family="sans-serif">건축 가능 영역</text>
  
  <!-- 방위 -->
  <g transform="translate(${svgW-40},50)">
    <circle r="15" fill="rgba(255,255,255,0.1)" stroke="#555" stroke-width="1"/>
    <line x1="0" y1="10" x2="0" y2="-10" stroke="#ef4444" stroke-width="2"/>
    <polygon points="0,-12 -4,-4 4,-4" fill="#ef4444"/>
    <text x="0" y="-16" text-anchor="middle" fill="#ef4444" font-size="9" font-weight="bold" font-family="sans-serif">N</text>
  </g>
  
  <!-- 축척 -->
  <line x1="${svgW-40-scaleBarPx}" y1="${svgH-20}" x2="${svgW-40}" y2="${svgH-20}" stroke="#888" stroke-width="2"/>
  <text x="${svgW-40-scaleBarPx/2}" y="${svgH-25}" text-anchor="middle" fill="#888" font-size="9" font-family="sans-serif">${scaleBarM}m</text>
  
  <!-- 면적 -->
  <text x="${svgW/2}" y="${svgH-10}" text-anchor="middle" fill="#6b7280" font-size="11" font-family="sans-serif">필지면적: ${siteArea ? siteArea.toLocaleString() + '㎡' : '—'}</text>
  
  ${slopeSvg}
  
  <!-- ★ 건물 배치 다이어그램 (AI 렌더링 참조용) -->
  ${(() => {
    // 이격거리 안쪽 건축 가능 영역 좌표 계산
    const shrunkCoords = mCoords.map(([x, y]: number[]) => {
      const dx = x - midX, dy = y - midY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const shrink = dist > 0 ? Math.max(0, dist - 3) / dist : 1
      return [cx + dx * shrink * scale, cy + dy * shrink * scale]
    })
    const ixs = shrunkCoords.map((c: number[]) => c[0])
    const iys = shrunkCoords.map((c: number[]) => c[1])
    const icx = ixs.reduce((s: number, v: number) => s + v, 0) / ixs.length
    const icy = iys.reduce((s: number, v: number) => s + v, 0) / iys.length
    const iw = Math.max(...ixs) - Math.min(...ixs)
    const ih = Math.max(...iys) - Math.min(...iys)
    const f = floors || 3
    const bt = buildingType || 'tower'
    const bldgColor = 'rgba(255,165,0,0.5)'
    const bldgStroke = '#ff8c00'
    
    if (bt === 'lshape') {
      // ㄱ자형: 다동일 수 있음 (대규모 대지)
      const bldgCount = (units && floors && siteArea && siteArea > 1500 && units > 20) 
        ? Math.max(2, Math.ceil(units / (6 * (floors || 3))))
        : 1
      
      if (bldgCount <= 2) {
        // 1-2동: 큰 L자 하나 또는 대칭 두 개
        const wing1W = iw * 0.3, wing1H = ih * 0.7
        const wing2W = iw * 0.7, wing2H = ih * 0.3
        const ox = Math.min(...ixs) + iw * 0.1
        const oy = Math.min(...iys) + ih * 0.1
        return `
  <rect x="${ox}" y="${oy}" width="${wing1W}" height="${wing1H}" fill="${bldgColor}" stroke="${bldgStroke}" stroke-width="2" rx="2"/>
  <rect x="${ox}" y="${oy + wing1H - wing2H}" width="${wing2W}" height="${wing2H}" fill="${bldgColor}" stroke="${bldgStroke}" stroke-width="2" rx="2"/>
  <text x="${ox + wing1W/2}" y="${oy + wing1H/2}" text-anchor="middle" fill="#fff" font-size="14" font-weight="bold" font-family="sans-serif">${f}F</text>
  <text x="${ox + wing2W/2}" y="${oy + wing1H - wing2H/2}" text-anchor="middle" fill="#fff" font-size="11" font-family="sans-serif">ㄱ-SHAPE</text>`
      } else {
        // 3동 이상: 작은 L자 여러개 배치
        const cols = Math.min(bldgCount, 3)
        const rows = Math.ceil(bldgCount / cols)
        const cellW = iw * 0.75 / cols
        const cellH = ih * 0.7 / rows
        const startX = Math.min(...ixs) + iw * 0.12
        const startY = Math.min(...iys) + ih * 0.15
        let shapes = ''
        let drawn = 0
        for (let r = 0; r < rows && drawn < bldgCount; r++) {
          for (let c = 0; c < cols && drawn < bldgCount; c++) {
            const cx2 = startX + c * cellW + cellW * 0.1
            const cy2 = startY + r * cellH + cellH * 0.1
            const lw = cellW * 0.35, lh = cellH * 0.7, lw2 = cellW * 0.7, lh2 = cellH * 0.3
            shapes += '<rect x="' + cx2 + '" y="' + cy2 + '" width="' + lw + '" height="' + lh + '" fill="' + bldgColor + '" stroke="' + bldgStroke + '" stroke-width="1.5" rx="1"/>'
            shapes += '<rect x="' + cx2 + '" y="' + (cy2 + lh - lh2) + '" width="' + lw2 + '" height="' + lh2 + '" fill="' + bldgColor + '" stroke="' + bldgStroke + '" stroke-width="1.5" rx="1"/>'
            drawn++
          }
        }
        return shapes + '<text x="' + icx + '" y="' + icy + '" text-anchor="middle" fill="#fff" font-size="12" font-weight="bold" font-family="sans-serif">' + f + 'F × ' + bldgCount + ' ㄱ</text>'
      }
    } else if (bt === 'linear') {
      // 판상형: 2-3동의 긴 직사각형이 평행 배치
      const bldgCount = Math.max(2, Math.min(3, Math.ceil((units || 30) / ((floors || 3) * 12))))
      const bw = iw * 0.85
      const bh = ih * 0.15  // 얇은 직사각형
      const gap = (ih * 0.7 - bh * bldgCount) / (bldgCount - 1 || 1)
      const startY = Math.min(...iys) + ih * 0.15
      const ox = icx - bw/2
      let rects = ''
      for (let i = 0; i < bldgCount; i++) {
        const ry = startY + i * (bh + gap)
        rects += '<rect x="' + ox + '" y="' + ry + '" width="' + bw + '" height="' + bh + '" fill="' + bldgColor + '" stroke="' + bldgStroke + '" stroke-width="2" rx="2"/>'
      }
      return rects + '<text x="' + icx + '" y="' + (startY + (bldgCount * (bh + gap) - gap) / 2 + 4) + '" text-anchor="middle" fill="#fff" font-size="12" font-weight="bold" font-family="sans-serif">' + f + 'F × ' + bldgCount + ' LINEAR</text>'
    } else if (bt === 'courtyard') {
      const uw = iw * 0.7, uh = ih * 0.7, t = iw * 0.15
      const ox = icx - uw/2, oy = Math.min(...iys) + ih * 0.15
      return `
  <path d="M ${ox} ${oy} L ${ox+uw} ${oy} L ${ox+uw} ${oy+uh} L ${ox+uw-t} ${oy+uh} L ${ox+uw-t} ${oy+t} L ${ox+t} ${oy+t} L ${ox+t} ${oy+uh} L ${ox} ${oy+uh} Z" fill="${bldgColor}" stroke="${bldgStroke}" stroke-width="2"/>
  <text x="${icx}" y="${oy + t/2 + 4}" text-anchor="middle" fill="#fff" font-size="12" font-weight="bold" font-family="sans-serif">${f}F</text>
  <text x="${icx}" y="${icy}" text-anchor="middle" fill="#22c55e" font-size="10" font-family="sans-serif">COURTYARD</text>`
    } else if (bt === 'tower') {
      const bs = Math.min(iw, ih) * 0.4
      return `
  <rect x="${icx-bs/2}" y="${icy-bs/2}" width="${bs}" height="${bs}" fill="${bldgColor}" stroke="${bldgStroke}" stroke-width="2" rx="2"/>
  <text x="${icx}" y="${icy + 4}" text-anchor="middle" fill="#fff" font-size="14" font-weight="bold" font-family="sans-serif">${f}F</text>`
    } else {
      const cols = 3, rows = 2
      const gx = iw * 0.08, gy = ih * 0.08
      const bw = (iw * 0.8 - gx * (cols-1)) / cols
      const bh = (ih * 0.7 - gy * (rows-1)) / rows
      const startX = Math.min(...ixs) + iw * 0.1
      const startY = Math.min(...iys) + ih * 0.15
      let rects = ''
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
          const rx = startX + c * (bw + gx)
          const ry = startY + r * (bh + gy)
          rects += '<rect x="' + rx + '" y="' + ry + '" width="' + bw + '" height="' + bh + '" fill="' + bldgColor + '" stroke="' + bldgStroke + '" stroke-width="1.5" rx="2"/>'
        }
      return rects + '<text x="' + icx + '" y="' + icy + '" text-anchor="middle" fill="#fff" font-size="12" font-weight="bold" font-family="sans-serif">' + f + 'F × ' + (cols*rows) + '</text>'
    }
  })()}
  <text x="${svgW/2}" y="${svgH-58}" text-anchor="middle" fill="#ff8c00" font-size="10" font-family="sans-serif">BUILDING FOOTPRINT (${floors || 3}F, ${buildingType || 'cluster'})</text>
</svg>`

        const svgBase64 = Buffer.from(svg).toString('base64')
        // SVG → PNG 변환 (Gemini는 SVG 미지원)
        const cadastralPng = svgToPngBase64(svg, 600)
        if (cadastralPng) {
          refImages.push({ base64: cadastralPng, mimeType: 'image/png', label: 'cadastral-polygon' })
        } else {
          refImages.push({ base64: svgBase64, mimeType: 'image/svg+xml', label: 'cadastral-polygon' })
        }
        
        // ━━━ 높이 참조 SVG 생성 — 사람/나무/건물 비교 ━━━
        if (floors && floors <= 7) {
          const hF = floors
          const bldgH = hF * 3.3 // 건물 높이(m)
          const personH = 1.7    // 사람 높이(m)
          const treeH = Math.max(bldgH * 0.8, 6) // 나무 높이
          const maxH = Math.max(bldgH, treeH, personH) + 2
          const svgW2 = 500, svgH2 = 350
          const ground = svgH2 - 60
          const px = (m: number) => ground - (m / maxH) * (ground - 40) // m→y

          // 건물 그리기 (층별 구분선)
          const bTop = px(bldgH), bBot = ground
          const bLeft = 120, bRight = 320
          let bldgLines = ''
          for (let i = 1; i <= hF; i++) {
            const floorY = px(i * 3.3)
            const floorBotY = px((i - 1) * 3.3)
            bldgLines += `<rect x="${bLeft}" y="${floorY}" width="${bRight - bLeft}" height="${floorBotY - floorY - 1}" fill="${i === 1 ? '#8B6914' : '#4A90D9'}" stroke="#fff" stroke-width="1" rx="1"/>`
            bldgLines += `<text x="${bRight + 8}" y="${(floorY + floorBotY) / 2 + 4}" fill="#fff" font-size="12" font-family="sans-serif">${i}F</text>`
            // 창문
            for (let w = 0; w < 4; w++) {
              const wx = bLeft + 15 + w * 45
              bldgLines += `<rect x="${wx}" y="${floorY + 6}" width="25" height="${(floorBotY - floorY) * 0.5}" fill="rgba(255,255,200,0.3)" stroke="rgba(255,255,255,0.5)" stroke-width="0.5" rx="1"/>`
            }
          }

          // 사람 (왼쪽)
          const pBot = ground, pTop = px(personH)
          const personSvg = `<line x1="60" y1="${pTop + 10}" x2="60" y2="${pBot}" stroke="#FFD700" stroke-width="3"/>
  <circle cx="60" cy="${pTop + 4}" r="6" fill="#FFD700"/>
  <text x="60" y="${pBot + 15}" text-anchor="middle" fill="#FFD700" font-size="10" font-family="sans-serif">1.7m</text>`

          // 나무 (오른쪽)
          const tTop = px(treeH)
          const treeSvg = `<line x1="400" y1="${px(treeH * 0.3)}" x2="400" y2="${ground}" stroke="#8B4513" stroke-width="4"/>
  <circle cx="400" cy="${tTop + (px(treeH * 0.3) - tTop) / 2}" r="${(px(treeH * 0.3) - tTop) / 2 + 5}" fill="#228B22" opacity="0.8"/>
  <text x="400" y="${ground + 15}" text-anchor="middle" fill="#228B22" font-size="10" font-family="sans-serif">${treeH.toFixed(0)}m</text>`

          // 높이 치수선
          const dimSvg = `<line x1="90" y1="${bTop}" x2="90" y2="${bBot}" stroke="#FF4444" stroke-width="2"/>
  <line x1="85" y1="${bTop}" x2="95" y2="${bTop}" stroke="#FF4444" stroke-width="2"/>
  <line x1="85" y1="${bBot}" x2="95" y2="${bBot}" stroke="#FF4444" stroke-width="2"/>
  <text x="90" y="${(bTop + bBot) / 2 + 4}" text-anchor="middle" fill="#FF4444" font-size="14" font-weight="bold" font-family="sans-serif">${bldgH.toFixed(1)}m</text>`

          const heightSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW2}" height="${svgH2}" viewBox="0 0 ${svgW2} ${svgH2}">
  <rect width="${svgW2}" height="${svgH2}" fill="#1a1a2e"/>
  <text x="${svgW2/2}" y="25" text-anchor="middle" fill="#FF4444" font-size="16" font-weight="bold" font-family="sans-serif">★ EXACTLY ${hF} FLOORS = ${bldgH.toFixed(1)}m ★</text>
  <text x="${svgW2/2}" y="42" text-anchor="middle" fill="#aaa" font-size="11" font-family="sans-serif">The building MUST be this height. Compare with person (1.7m) and tree (${treeH.toFixed(0)}m).</text>
  <line x1="20" y1="${ground}" x2="${svgW2-20}" y2="${ground}" stroke="#555" stroke-width="1"/>
  ${bldgLines}
  ${personSvg}
  ${treeSvg}
  ${dimSvg}
  <text x="${(bLeft+bRight)/2}" y="${ground + 15}" text-anchor="middle" fill="#4A90D9" font-size="11" font-family="sans-serif">${hF}-STORY BUILDING</text>
  <text x="${svgW2/2}" y="${svgH2-8}" text-anchor="middle" fill="#FF4444" font-size="12" font-weight="bold" font-family="sans-serif">DO NOT generate more than ${hF} floors. The building is ${hF <= 3 ? 'SHORTER than nearby trees' : 'about the same height as trees'}.</text>
</svg>`
          const heightSvgBase64 = Buffer.from(heightSvg).toString('base64')
          const heightPng = svgToPngBase64(heightSvg, 500)
          if (heightPng) {
            refImages.push({ base64: heightPng, mimeType: 'image/png', label: 'height-reference' })
          } else {
            refImages.push({ base64: heightSvgBase64, mimeType: 'image/svg+xml', label: 'height-reference' })
          }
        }
        
        // ━━━ 건물 형태 참조 PNG (조감도 전용) ━━━
        // Gemini가 조감도에서 건물 풋프린트 형태를 정확히 따르도록
        const bt3 = buildingType || 'cluster'
        if (bt3 !== 'cluster' && bt3 !== 'tower') {
          const sw = 500, sh = 400
          const bldgCount2 = Math.min(4, Math.max(2, Math.ceil((units || 30) / ((floors || 3) * (bt3 === 'linear' ? 12 : bt3 === 'lshape' ? 6 : 10)))))
          
          let buildingShapes = ''
          const cols = bldgCount2 <= 2 ? 2 : 2
          const rows = Math.ceil(bldgCount2 / cols)
          const cellW = (sw - 80) / cols
          const cellH = (sh - 120) / rows
          
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols && (r * cols + c) < bldgCount2; c++) {
              const cx = 50 + c * cellW + cellW / 2
              const cy = 80 + r * cellH + cellH / 2
              const s = Math.min(cellW, cellH) * 0.35
              
              if (bt3 === 'lshape') {
                // ㄱ자형: 명확한 L자
                const wingW = s * 0.4  // 날개 두께
                const wingL = s * 1.2  // 날개 길이
                buildingShapes += `<path d="M ${cx - wingL/2} ${cy - wingL/2} L ${cx - wingL/2 + wingW} ${cy - wingL/2} L ${cx - wingL/2 + wingW} ${cy + wingL/2 - wingW} L ${cx + wingL/2} ${cy + wingL/2 - wingW} L ${cx + wingL/2} ${cy + wingL/2} L ${cx - wingL/2} ${cy + wingL/2} Z" fill="#FF6B00" stroke="#fff" stroke-width="3"/>`
                // 90° 각도 표시
                buildingShapes += `<path d="M ${cx - wingL/2 + wingW + 8} ${cy + wingL/2 - wingW} L ${cx - wingL/2 + wingW + 8} ${cy + wingL/2 - wingW - 8} L ${cx - wingL/2 + wingW} ${cy + wingL/2 - wingW - 8}" fill="none" stroke="#FFD700" stroke-width="2"/>`
                buildingShapes += `<text x="${cx - wingL/2 + wingW + 15}" y="${cy + wingL/2 - wingW - 12}" fill="#FFD700" font-size="10" font-family="sans-serif">90°</text>`
              } else if (bt3 === 'linear') {
                // 판상형: 넓고 긴 직사각형
                buildingShapes += `<rect x="${cx - s * 1.3}" y="${cy - s * 0.3}" width="${s * 2.6}" height="${s * 0.6}" fill="#FF6B00" stroke="#fff" stroke-width="3" rx="2"/>`
              } else if (bt3 === 'courtyard') {
                // 중정형: U자
                const u = s * 0.3
                buildingShapes += `<path d="M ${cx - s} ${cy - s * 0.8} L ${cx - s + u} ${cy - s * 0.8} L ${cx - s + u} ${cy + s * 0.5} L ${cx + s - u} ${cy + s * 0.5} L ${cx + s - u} ${cy - s * 0.8} L ${cx + s} ${cy - s * 0.8} L ${cx + s} ${cy + s * 0.8} L ${cx - s} ${cy + s * 0.8} Z" fill="#FF6B00" stroke="#fff" stroke-width="3"/>`
                // 중앙 정원 표시
                buildingShapes += `<rect x="${cx - s + u + 3}" y="${cy - s * 0.8 + 3}" width="${(s - u) * 2 - 6}" height="${s * 1.3 - 6}" fill="#228B22" opacity="0.4" rx="3"/>`
                buildingShapes += `<text x="${cx}" y="${cy - s * 0.1}" text-anchor="middle" fill="#fff" font-size="8" font-family="sans-serif">garden</text>`
              }
              
              // 동 번호
              buildingShapes += `<text x="${cx}" y="${cy + s * 1.2 + 12}" text-anchor="middle" fill="#aaa" font-size="10" font-family="sans-serif">동 ${String.fromCharCode(65 + r * cols + c)}</text>`
            }
          }
          
          const typeNameEn: Record<string, string> = { lshape: 'L-SHAPE (ㄱ)', linear: 'LINEAR SLAB', courtyard: 'U-SHAPE COURTYARD' }
          const typeNameKr: Record<string, string> = { lshape: 'ㄱ자형', linear: '판상형', courtyard: '중정형' }
          
          const shapeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${sw}" height="${sh}" viewBox="0 0 ${sw} ${sh}">
  <rect width="${sw}" height="${sh}" fill="#1a1a2e"/>
  <text x="${sw/2}" y="28" text-anchor="middle" fill="#FF6B00" font-size="18" font-weight="bold" font-family="sans-serif">★ BUILDING FOOTPRINT: ${typeNameEn[bt3] || bt3} ★</text>
  <text x="${sw/2}" y="48" text-anchor="middle" fill="#fff" font-size="13" font-family="sans-serif">EACH building MUST have this EXACT shape when viewed from ABOVE</text>
  <text x="${sw/2}" y="66" text-anchor="middle" fill="#aaa" font-size="11" font-family="sans-serif">${bldgCount2} buildings × ${floors || 3}F — The ORANGE shapes show the roof footprint</text>
  ${buildingShapes}
  <text x="${sw/2}" y="${sh - 20}" text-anchor="middle" fill="#FF4444" font-size="13" font-weight="bold" font-family="sans-serif">${bt3 === 'lshape' ? 'DO NOT generate rectangular boxes. EVERY building MUST be L-shaped (ㄱ).' : bt3 === 'linear' ? 'EVERY building must be a LONG horizontal bar, NOT a square.' : 'EVERY building must form a U around a central garden.'}</text>
  <text x="${sw/2}" y="${sh - 5}" text-anchor="middle" fill="#aaa" font-size="10" font-family="sans-serif">Compare your output with these shapes. If they don't match, regenerate.</text>
</svg>`
          
          const shapePng = svgToPngBase64(shapeSvg, 500)
          if (shapePng) {
            refImages.push({ base64: shapePng, mimeType: 'image/png', label: 'shape-reference' })
          }
        }
        const widthM = Math.round(w) // 미터 단위 폭
        const heightM = Math.round(h) // 미터 단위 깊이
        const aspectRatio = widthM > 0 && heightM > 0 ? (widthM / heightM).toFixed(1) : '1.0'
        const vertexCount = sitePolygon.length
        let shapeDesc = 'irregular polygon'
        if (vertexCount === 4) shapeDesc = parseFloat(aspectRatio) > 1.3 ? 'elongated rectangle' : parseFloat(aspectRatio) < 0.7 ? 'narrow deep rectangle' : 'roughly square'
        else if (vertexCount === 3) shapeDesc = 'triangle'
        else if (vertexCount === 5) shapeDesc = 'pentagon'
        else if (vertexCount >= 6) shapeDesc = `irregular ${vertexCount}-sided polygon`
        polygonShapeDesc = `Site shape: ${shapeDesc}, approximately ${widthM}m wide × ${heightM}m deep (aspect ratio ${aspectRatio}). ${vertexCount} vertices. Buildings MUST be arranged to fit within this ${shapeDesc} boundary — do NOT place buildings outside the lot line.`
        
        console.log(`[GEMINI] cadastral-polygon SVG generated: ${Math.round(svg.length / 1024)}KB ✅`)
      } catch (e) {
        console.warn('[GEMINI] SVG cadastral generation failed:', e)
      }
    }

    async function fetchImage(url: string, label: string) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
        if (res.ok) {
          const buf = await res.arrayBuffer()
          // 최소 1KB 이상인 실제 이미지만 사용
          if (buf.byteLength > 1024) {
            const b64 = Buffer.from(buf).toString('base64')
            console.log(`[GEMINI] ${label} loaded: ${Math.round(buf.byteLength / 1024)}KB ✅`)
            refImages.push({ base64: b64, mimeType: 'image/jpeg', label })
          } else {
            console.warn(`[GEMINI] ${label} too small (${buf.byteLength}B), skipping`)
          }
        }
      } catch (e) {
        console.warn(`[GEMINI] ${label} fetch failed:`, e)
      }
    }
    
    // 병렬로 이미지 수집 — 카메라앵글에 따라 다른 참조 이미지 사용
    // eye-level: 거리뷰(눈높이) 우선, 위성사진 제외 (위에서 내려다본 사진은 눈높이에 부적합)
    // bird-eye: 위성사진 우선, 거리뷰 제외 (눈높이 사진은 조감도에 부적합)
    const isEyeLevel = cameraAngle === 'eye-level' || !cameraAngle
    const isBirdEye = cameraAngle === 'bird-eye'
    const directions = ['north', 'east', 'south', 'west']
    await Promise.all([
      // 위성사진: 조감도일 때만 사용
      (!isEyeLevel && satelliteUrl) ? fetchImage(satelliteUrl, 'satellite') : Promise.resolve(),
      // 도로지도: 항상 사용 (작을 수 있어 skip될 수도 있음)
      cadastralMapUrl ? fetchImage(cadastralMapUrl, 'cadastral') : Promise.resolve(),
      // 거리뷰: 눈높이일 때만 사용 (최대 2장으로 제한하여 속도 개선)
      ...(isEyeLevel && Array.isArray(streetViewUrls) ? streetViewUrls.slice(0, 2).map((url: string, i: number) =>
        fetchImage(url, `street-view-${directions[i]}`)
      ) : []),
    ])
    
    // 이전 렌더링 참조 이미지 (AI Hub에서 '참조 사용' 선택 시)
    if (referenceImage && typeof referenceImage === 'string' && referenceImage.startsWith('data:image/')) {
      try {
        const match = referenceImage.match(/^data:(image\/[^;]+);base64,(.+)$/)
        if (match) {
          refImages.unshift({ base64: match[2], mimeType: match[1], label: 'previous-render-reference' })
          console.log('[GEMINI] Previous render reference image added')
        }
      } catch { /* ignore */ }
    }
    
    console.log(`[GEMINI] Reference images: ${refImages.length} loaded (${refImages.map(r => r.label).join(', ')})`)

    // #9: 멀티앵글 — 3장 일괄 생성 (첫 이미지를 참조로 일관성 확보)
    if (multiAngle) {
      // ★ 눈높이를 먼저 생성 (거리뷰만 참조 → 확실한 정면 시점)
      // → 조감도/입구가 이를 참조 → 건물 일관성 유지 + 시점만 변경
      const angles = [
        { angle: 'eye-level', scene: sceneMode || 'afternoon' },
        { angle: 'birds-eye', scene: sceneMode || 'afternoon' },
        { angle: 'entrance', scene: sceneMode || 'afternoon' },
      ]
      const images: { angle: string; image: string | null; error?: string }[] = []
      let firstImageBase64: string | null = null
      let firstImageMime: string = 'image/png'
      
      for (let ai = 0; ai < angles.length; ai++) {
        const a = angles[ai]
        const aPrompt = buildArchitecturePrompt({
          prompt, style, address, layoutName, floors, units, siteArea, buildingType, coverage, strategy, values, patterns, surroundingContext, cameraAngle: a.angle, sceneMode: a.scene, material, userBuildingCount, regulation
        })
        
        const parts: any[] = []
        
        // ★ 앵글별 참조 전략
        if (ai === 0) {
          // 1번 눈높이: 독립 생성 (거리뷰만 참조, 위성사진 제외)
          parts.push({ text: aPrompt })
        } else if (firstImageBase64) {
          // ★ 2,3번: 참조 이미지 순서 변경 — 눈높이 이미지를 마지막에 배치
          // 이유: Gemini는 마지막에 본 이미지에 가장 강하게 영향받음
          // Before: [눈높이] → [위성/지적도/거리뷰] → 생성 (눈높이가 희석됨)
          // After: [프롬프트] → [위성만] → [눈높이 + "이 건물 복사"] → 생성

          // Step 1: 프롬프트 먼저
          parts.push({ text: aPrompt })

          // Step 2: 사이트 참조 이미지 (조감도: 위성만, 입구: 없음)
          if (a.angle === 'birds-eye') {
            // 조감도는 위성사진만 (거리뷰/지적도는 건물 외형을 흐림)
            const satOnly = refImages.filter(r => r.label === 'satellite')
            for (const img of satOnly) {
              parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } })
            }
            if (satOnly.length > 0) {
              parts.push({ text: `The satellite image above shows the ACTUAL SITE from above. Use it ONLY for understanding the terrain, roads, and surrounding context — NOT for building design.` })
            }
          }

          // Step 3: 눈높이 이미지를 마지막에 — 가장 강한 컨텍스트
          parts.push({ inlineData: { mimeType: firstImageMime, data: firstImageBase64 } })
          if (a.angle === 'birds-eye') {
            parts.push({ text: `⚠️ CRITICAL — BUILDING IDENTITY LOCK:
The image DIRECTLY ABOVE is the EXACT building you MUST reproduce. This is non-negotiable.

COPY THESE EXACTLY from the image above:
- The exact number, shape, and arrangement of buildings
- Wall materials (stone/concrete/wood panels visible in the image)
- Window sizes, shapes, and patterns
- Roof style (flat/pitched as shown)
- Color scheme (exact same colors)
- Facade composition (the specific mix of materials)

ONLY CHANGE: Camera position — move to a drone at 50m altitude, 45° angle looking down.
The buildings must be RECOGNIZABLE as the same ones from the street-level image.
If the result looks like a DIFFERENT complex, you have failed.` })
          } else {
            parts.push({ text: `⚠️ CRITICAL — BUILDING IDENTITY LOCK:
The image DIRECTLY ABOVE is the EXACT building you MUST reproduce. This is non-negotiable.

COPY THESE EXACTLY from the image above:
- Wall materials and colors
- Window style and patterns
- Entrance design elements
- Facade composition

ONLY CHANGE: Camera distance — move to 3 meters from the main entrance door, 1.5m height.
Show a CLOSE-UP of the entrance area of THIS EXACT building.
The entrance must use the SAME materials and style visible in the street-level image.` })
          }
        } else {
          // 1번 이미지 실패 시 — 독립 생성 (참조 없이)
          console.warn(`[GEMINI] Multi-angle: first image failed, generating ${a.angle} independently`)
          parts.push({ text: aPrompt })
        }
        
        // 참조 이미지 — 1번(눈높이)은 거리뷰 참조 제거
        // 이유: 경사지(평창동 등)의 Google 거리뷰가 높은 위치에서 촬영되어
        //       Gemini가 그 elevated 시점을 복제 → 정면이 조감도처럼 나옴
        // 해결: 프롬프트의 카메라 지시만으로 1.6m 시점 강제
        // 2,3번: 참조 이미지는 위 else if (firstImageBase64) 블록에서 이미 처리됨

        try {
          const r = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GOOGLE_AI_API_KEY}`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ["TEXT", "IMAGE"] } }) }
          )
          if (r.ok) {
            const d = await r.json()
            const imgPart = d?.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'))
            if (imgPart) {
              images.push({ angle: a.angle, image: `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}` })
              // ★ 첫 번째 이미지 저장 → 후속 렌더링 참조용
              if (ai === 0) {
                firstImageBase64 = imgPart.inlineData.data
                firstImageMime = imgPart.inlineData.mimeType
              }
            } else {
              images.push({ angle: a.angle, image: null })
            }
          } else {
            images.push({ angle: a.angle, image: null, error: `${r.status}` })
          }
        } catch (e) {
          images.push({ angle: a.angle, image: null, error: 'timeout' })
        }
        // rate limit 대응 (프롬프트 길어졌으므로 1.5초)
        await new Promise(r => setTimeout(r, 1500))
      }
      
      return NextResponse.json({ success: true, multiAngle: true, images, model: 'gemini-2.5-flash-image' })
    }

    const architecturePrompt = buildArchitecturePrompt({
      prompt, style, address, layoutName, floors, units, siteArea, buildingType, coverage, strategy, values, patterns, surroundingContext, cameraAngle, sceneMode, material, userBuildingCount, regulation, polygonShapeDesc
    })

    // Gemini API 호출 — 모델 fallback 체인
    const models = [
      'gemini-2.5-flash-image',
      'gemini-3.1-flash-image-preview',
      'gemini-3-pro-image-preview',
    ]
    
    let data: any = null
    let lastError = ''
    
    // 참조 이미지 크기 제한 (Gemini API 요청 크기 제한)
    // SVG는 이미 Gemini 전달에서 제외되지만 크기 계산에서도 제외
    const geminiImages = refImages.filter(r => r.mimeType !== 'image/svg+xml')
    const totalRefSize = geminiImages.reduce((s, r) => s + r.base64.length, 0)
    if (totalRefSize > 3 * 1024 * 1024) { // 3MB 초과 (base64 오버헤드 고려)
      // 거리뷰부터 제거
      const streetViews = geminiImages.filter(r => r.label.startsWith('street-view'))
      if (streetViews.length > 2) {
        // 4방향 → 2방향으로 축소
        const toRemove = streetViews.slice(2).map(r => r.label)
        const before = refImages.length
        for (const label of toRemove) {
          const idx = refImages.findIndex(r => r.label === label)
          if (idx >= 0) refImages.splice(idx, 1)
        }
        console.log(`[GEMINI] Ref images too large (${Math.round(totalRefSize / 1024)}KB), reduced street views: ${before} → ${refImages.length}`)
      } else {
        // 거리뷰 전체 제거
        const filtered = refImages.filter(r => !r.label.startsWith('street-view'))
        console.log(`[GEMINI] Ref images too large (${Math.round(totalRefSize / 1024)}KB), removed street views: ${refImages.length} → ${filtered.length}`)
        refImages.length = 0
        refImages.push(...filtered)
      }
    }
    
    for (const model of models) {
      try {
        console.log(`[GEMINI] Trying model: ${model}, refImages: ${refImages.length}, totalSize: ${Math.round(refImages.reduce((s, r) => s + r.base64.length, 0) / 1024)}KB`)
        
        // #7: 위성사진을 멀티모달로 전달
        const parts: any[] = [{ text: architecturePrompt }]
        // 참조 이미지 (위성사진 + 지적도) → Gemini 멀티모달
        // ⚠️ Gemini는 SVG 미지원 → PNG/JPEG만 전달
        if (refImages.length > 0) {
          for (const img of refImages) {
            if (img.mimeType === 'image/svg+xml') continue // SVG 제외
            parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } })
          }
          parts.push({ text: `REFERENCE IMAGES (${refImages.length}):
${refImages.map((r, i) => `Image ${i+1}: ${r.label === 'satellite' ? 'SATELLITE/AERIAL PHOTO — shows the actual site from above. Match the real surrounding buildings (their roofs, colors, heights), roads, vegetation, and terrain slope visible here.' : r.label === 'cadastral' ? 'CADASTRAL MAP — shows the exact lot boundary shape.' : r.label === 'cadastral-polygon' ? 'BUILDING LAYOUT DIAGRAM — Shows the exact lot boundary (blue), setback line (orange dashed), AND the BUILDING FOOTPRINTS (orange filled shapes). The ORANGE SHAPES show EXACTLY where and what shape the buildings must be. The rendered buildings MUST match these orange footprint shapes — same position, same shape (L-shaped, linear, U-shaped, etc.), same number of buildings. This is the MOST IMPORTANT reference image.' : r.label.startsWith('street-view') ? `STREET VIEW (${r.label.replace('street-view-', '')} direction) — This is an eye-level photo of the ACTUAL neighborhood. Match the building styles, materials, colors, road width, vegetation, and atmosphere shown here. The new building should look like it belongs in THIS neighborhood.` : r.label === 'previous-render-reference' ? 'PREVIOUS RENDERING — Use as STYLE REFERENCE: match architectural style, materials, colors. Generate similar look from requested angle.' : r.label === 'height-reference' ? `★★★ HEIGHT REFERENCE DIAGRAM — This diagram shows the EXACT correct height of the building. The building has EXACTLY ${floors || 3} floors and is ${((floors || 3) * 3.3).toFixed(1)}m tall. Compare with the person (1.7m) and tree. The building is ${(floors || 3) <= 3 ? 'SHORTER than nearby trees — it is a LOW building' : 'about the same height as trees'}. DO NOT generate a taller building. COUNT THE FLOORS in this diagram and match them EXACTLY.` : r.label === 'shape-reference' ? `★★★ BUILDING SHAPE REFERENCE — THIS IS THE MOST CRITICAL IMAGE. The ORANGE shapes show the EXACT footprint of each building as seen from ABOVE (bird's eye). Your rendered buildings MUST match these shapes EXACTLY. ${buildingType === 'lshape' ? 'Each building is L-SHAPED (ㄱ자형) — two wings meeting at 90°. If your buildings look like simple rectangles from above, they are WRONG.' : buildingType === 'linear' ? 'Each building is a LONG HORIZONTAL BAR. If your buildings look square from above, they are WRONG.' : buildingType === 'courtyard' ? 'Each building forms a U-SHAPE around a central garden. The garden MUST be visible from above.' : ''} Check your output against this reference before finalizing.` : r.label}`).join('\n')}
The rendering MUST reflect what is shown in these reference images. Do NOT ignore them.` })
        }
        
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_AI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts }],
              generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
            }),
          }
        )
        
        if (response.ok) {
          data = await response.json()
          console.log(`[GEMINI] Success with model: ${model}`)
          break
        } else {
          const errBody = await response.text().catch(() => 'no body')
          lastError = `${model}: ${response.status} - ${errBody.slice(0, 200)}`
          console.error(`[GEMINI-ERR] ${model} status=${response.status} body=${errBody.slice(0, 500)}`)
          // 429 rate limit → 2초 대기 후 다음 모델
          if (response.status === 429) await new Promise(r => setTimeout(r, 2000))
        }
      } catch (e) {
        lastError = `${model}: ${e instanceof Error ? e.message : 'error'}`
        console.warn(`[GEMINI] ${model} error:`, e)
      }
    }
    
    if (!data) {
      const is429 = lastError.includes('429')
      return NextResponse.json({ 
        error: is429 
          ? '⏳ AI 이미지 생성 일일 한도에 도달했습니다. 잠시 후 다시 시도해주세요.'
          : `Gemini 모델 오류: ${lastError}`,
      }, { status: is429 ? 429 : 500 })
    }
    
    // 응답에서 이미지와 텍스트 추출
    const parts = data?.candidates?.[0]?.content?.parts || []
    
    let imageData: string | null = null
    let description = ''

    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        imageData = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
      }
      if (part.text) {
        description += part.text
      }
    }

    return NextResponse.json({
      success: true,
      image: imageData,
      description,
      model: 'gemini-2.5-flash-image (Nano Banana)',
      prompt: architecturePrompt,
    })

  } catch (error) {
    console.error('[GEMINI] Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

function buildArchitecturePrompt(params: {
  prompt: string
  style?: string
  address?: string
  layoutName?: string
  floors?: number
  units?: number
  siteArea?: number
  buildingType?: string
  coverage?: number
  strategy?: string
  values?: { profitVsQuality?: number; privacyVsCommunity?: number; efficiencyVsSpace?: number }
  patterns?: string[]
  surroundingContext?: string
  cameraAngle?: string
  sceneMode?: string
  material?: { type?: string; color?: string; accent?: string }
  userBuildingCount?: number  // 사용자가 수동 입력한 동수
  polygonShapeDesc?: string
  // 법규 검토 데이터
  regulation?: {
    heightLimit?: number       // 높이제한 (m)
    farRatio?: number          // 용적률 (%)
    setbackFront?: number      // 전면 이격 (m)
    setbackSide?: number       // 측면 이격 (m)
    setbackRear?: number       // 후면 이격 (m)
    northShadow?: boolean      // 북측사선제한
    northShadowAngle?: number  // 사선 각도 (°)
    overlappingRegs?: string[] // 중첩규제 이름 목록
    zoneName?: string          // 용도지역 이름
  }
}): string {
  const { prompt, style, address, layoutName, floors, units, siteArea, buildingType, coverage, strategy, values, patterns, surroundingContext, cameraAngle, sceneMode, material, userBuildingCount, regulation, polygonShapeDesc } = params

  const styleMap: Record<string, string> = {
    'modern-luxury': '모던 럭셔리 스타일, 유리 커튼월, 알루미늄 패널, 고급 석재 마감',
    'eco-green': '친환경 녹색 건축, 수직 정원, 옥상 녹화, 태양광 패널, 자연 소재',
    'korean-modern': '한국 모던 건축, 전통 처마선, 한옥 디테일, 현대적 재해석',
    'minimalism': '미니멀리즘, 깔끔한 라인, 화이트 콘크리트, 단순한 형태',
    'minimalist': '미니멀리즘, 깔끔한 라인, 화이트 콘크리트, 단순한 형태',
    'urban-complex': '도시 복합 개발, 저층 상가+고층 주거, 보행 데크, 커뮤니티 공간',
    'urban-mixed': '도시 복합 개발, 저층 상가+고층 주거, 보행 데크, 커뮤니티 공간',
    'premium-resi': '프리미엄 주거, 테라스 발코니, 조경 중정, 커뮤니티 시설',
    'khanok-modern': '한옥 현대화, 전통 기와지붕 + 현대 유리/철골, 노출 목재 보, 내부 마당, 돌 기단, 미닫이문, 한국 전통과 현대 건축의 조화',
    'kvilla': '한국 다세대주택 빌라, 3~4층 워크업, 필로티 주차, 발코니 빨래 건조대, 외부 계단, 옥상 물탱크, 현실적 한국 주거 동네',
    'kapartment': '한국 아파트 단지, 균일한 직사각형 타워, 동 번호 표시, 지하주차 입구, 조경 공용공간, 어린이 놀이터, 단지 내 보행로',
    'kcommercial': '한국 상가주택, 1층 상가(간판+차양), 상층 주거(발코니), 좁은 가로면, 한국 근린상업 거리 분위기',
    'kluxury': '한국 고급 단독주택, 자연석+목재 외관, 성숙한 수목 정원, 철제 대문, 프리미엄 마감재, 고급 주택가, 고급 세단',
  }

  const styleDesc = style ? (styleMap[style] || style) : '현대적 고급 주거'

  const f = floors || 3
  const u = units || 6
  const footprint = siteArea && coverage ? Math.round(siteArea * coverage / 100) : 200
  const bW = Math.round(Math.sqrt(footprint * 1.5))
  const bD = Math.round(footprint / bW)

  // 건물 규모별 형태
  let buildingForm = ''
  let isComplex = false  // 다동 단지 여부
  let buildingCount = 1
  
  if (f <= 2 && u <= 4) {
    buildingForm = `A low-rise detached house, ${f} stories, compact and elegant. Footprint ~${bW}m × ${bD}m. Residential entrance with garden.`
  } else if (f <= 5 && u <= 20) {
    buildingForm = `A low-rise multi-family villa, EXACTLY ${f} stories tall (${Math.round(f * 3.3)}m), ${u} units. Footprint ~${bW}m × ${bD}m. Ground floor: entrance hall + parking. Upper: residential. DO NOT make taller than ${f} floors. DO NOT generate round or cylindrical buildings.`
  } else if (f <= 5 && u > 20 && siteArea && siteArea > 1500) {
    // ★ 저층 + 많은 세대 + 넓은 대지 — 타입별 건물 수 차별화
    isComplex = true
    const bt2 = buildingType || 'cluster'
    
    // 타입별 1동당 최대 세대수 (층당)
    const unitsPerFloorPerBldg: Record<string, number> = {
      linear: 12,    // 판상형: 복도식으로 1층에 10-14세대
      lshape: 6,     // ㄱ자형: L날개 양쪽 각 3세대
      courtyard: 10, // 중정형: U자 3면 각 3-4세대
      tower: 4,      // 타워형: 코어 주변 4세대
      cluster: 4,    // 클러스터: 소규모 동
    }
    const maxPerFloor = unitsPerFloorPerBldg[bt2] || 4
    const maxPerBldg = maxPerFloor * f
    buildingCount = Math.max(2, Math.ceil(u / maxPerBldg))
    // 사용자가 수동 입력한 동수가 있으면 우선 적용
    if (userBuildingCount && userBuildingCount >= 1) {
      buildingCount = userBuildingCount
    }
    
    const eachFootprint = Math.round(footprint / buildingCount)
    // 판상형은 세로보다 가로가 3배 이상 긴 비율
    const linearRatio = bt2 === 'linear' ? 3.5 : 1.4
    const eachW = Math.round(Math.sqrt(eachFootprint * linearRatio))
    const eachD = Math.round(eachFootprint / eachW)
    
    // 원래 건축 타입에 따른 건물 배치 설명
    const typeDesc: Record<string, string> = {
      linear: `★★★ LAYOUT TYPE: 판상형 (PARALLEL SLAB BUILDINGS) ★★★
This is a KOREAN-STYLE LINEAR APARTMENT COMPLEX with ${buildingCount} LONG SLAB buildings.

EACH BUILDING SHAPE:
- Very LONG and NARROW — approximately ${eachW}m long × ${eachD}m wide
- The length is ${(eachW/eachD).toFixed(1)}× the depth — clearly elongated, NOT square
- All units face SOUTH with continuous balconies on the SOUTH facade
- The NORTH side has an enclosed corridor connecting all units

SITE ARRANGEMENT:
- All ${buildingCount} buildings are arranged PARALLEL to each other, running EAST-WEST
- Equal spacing (~15-20m) between buildings for sunlight
- This looks like a typical Korean apartment complex (아파트 단지) from above
- From bird's eye view: ${buildingCount} horizontal bars side by side

DO NOT generate square or tower-shaped buildings.
DO NOT generate buildings arranged in a cluster/village pattern.
The buildings must be PARALLEL horizontal slabs — this is the defining feature.`,

      courtyard: `LAYOUT TYPE: 중정형 (COURTYARD BUILDINGS)
${buildingCount} building groups, each forming a U-SHAPE or C-SHAPE around a central courtyard.
Each group has 2-3 wings (~${eachW}m × ${eachD}m each) connected at right angles, enclosing a garden.
The courtyard is CLEARLY VISIBLE from above, surrounded by building wings.
DO NOT draw separate individual box buildings.`,

      lshape: `LAYOUT TYPE: ㄱ자형 (L-SHAPED BUILDINGS)
${buildingCount} separate L-SHAPED buildings on the site.
Each building has TWO WINGS meeting at a 90-degree RIGHT ANGLE — like the letter "L" or Korean "ㄱ".
One wing runs EAST-WEST (south-facing), the other runs NORTH-SOUTH.
The L-shape creates a semi-private garden in the corner where the two wings meet.
DO NOT draw rectangular box buildings. Each building MUST clearly show the L-shaped footprint.`,

      tower: `LAYOUT TYPE: 타워형 (TOWER BUILDINGS)
${buildingCount} separate COMPACT TOWER buildings.
Each tower has a square footprint ~${eachW}m × ${eachD}m with units around a central elevator core.
Towers are evenly spaced across the site with landscaped gardens between them.`,

      cluster: `LAYOUT TYPE: 클러스터 (VARIED CLUSTER)
${buildingCount} buildings with VARIED individual forms — some rectangular, some L-shaped, some with setbacks.
Buildings are arranged organically with varied orientations for visual interest.`,
    }
    const shapeDesc = typeDesc[bt2] || typeDesc.cluster
    
    buildingForm = `${shapeDesc}

★★★ CRITICAL HEIGHT: EXACTLY ${f} STORIES (${Math.round(f * 3.3)}m tall) ★★★
EVERY building is ONLY ${f} floors. This is a LOW-RISE complex, NOT high-rise towers.
Count the floors: ${Array.from({length: f}, (_, i) => `floor ${i+1}`).join(', ')}. That's ALL.
Each floor is ~3.3m tall. Total building height: ${Math.round(f * 3.3)}m.
A ${f}-story building is about as tall as ${f <= 3 ? 'a large tree' : 'a telephone pole'}.
DO NOT generate buildings taller than ${f} stories under ANY circumstances.

Total: ${u} units across ${buildingCount} buildings on a ${siteArea}㎡ site.
DO NOT generate round, cylindrical, or curved buildings — ALL buildings must have FLAT walls and RIGHT ANGLES.`
  } else if (f <= 10) {
    if (u > 40 && siteArea && siteArea > 3000) {
      isComplex = true
      buildingCount = Math.max(Math.round(u / (f * 6)), 2)
      buildingForm = `A multi-building apartment complex — ${buildingCount} separate ${f}-story buildings on a ${siteArea}㎡ site, total ${u} units. Buildings connected by landscaped walkways and shared courtyard. Each building ~${Math.round(footprint / buildingCount / 10) * 10}㎡ footprint.`
    } else {
      buildingForm = `A mid-rise apartment, ${f} stories, ${u} units. Footprint ~${bW}m × ${bD}m. Ground floor: lobby + parking.`
    }
  } else {
    buildingForm = `A high-rise tower, ${f} stories, ${u} units. Slender tower with podium.`
  }

  const typeHints: Record<string, string> = {
    'tower': 'Single tower, vertical emphasis',
    'courtyard': 'U-shaped, central garden visible',
    'lshape': 'L-shaped building',
    'linear': 'Elongated horizontal slab',
    'cluster': 'Multiple small buildings clustered',
  }
  const typeHint = buildingType ? (typeHints[buildingType] || '') : ''

  // ━━━ 설계 전략 → 렌더링 스타일 ━━━
  const strategyStyles: Record<string, string> = {
    'profitability': 'Efficient, dense, maximized floor area. Clean modern facade with regular grid windows.',
    'livability': 'Warm, inviting, with generous balconies, community gardens, and playground visible. Family-friendly atmosphere.',
    'view-priority': 'Open views emphasized, large windows, stepped terraces, panoramic balconies. Premium glass facade.',
    'privacy-priority': 'Screened balconies, staggered units, vegetation buffers between units. Private feel.',
    'area-maximize': 'Maximum building volume, flush facade, minimal setbacks. Dense but modern.',
    'parking-efficient': 'Ground level parking visible, efficient layout, practical design.',
  }
  const strategyStyle = strategy ? (strategyStyles[strategy] || '') : ''

  // ━━━ 가치관 슬라이더 → 분위기 ━━━
  let atmosphereHints: string[] = []
  if (values) {
    if (values.profitVsQuality !== undefined) {
      if (values.profitVsQuality > 70) atmosphereHints.push('Emphasis on quality of life: lush landscaping, wide walkways, playground, rooftop garden')
      else if (values.profitVsQuality < 30) atmosphereHints.push('Efficient and modern: clean lines, maximized usable space')
    }
    if (values.privacyVsCommunity !== undefined) {
      if (values.privacyVsCommunity > 70) atmosphereHints.push('Strong community feel: shared courtyard, outdoor seating areas, gathering spaces')
      else if (values.privacyVsCommunity < 30) atmosphereHints.push('Privacy-focused: screened balconies, hedges between units, minimal shared space')
    }
    if (values.efficiencyVsSpace !== undefined) {
      if (values.efficiencyVsSpace > 70) atmosphereHints.push('Spacious feeling: generous setbacks, open green areas, wide corridors')
      else if (values.efficiencyVsSpace < 30) atmosphereHints.push('Compact and efficient: tight footprint, vertical emphasis')
    }
  }

  // ━━━ 재질/색상 ━━━
  const materialDescs: Record<string, string> = {
    'glass-curtain': 'Glass curtain wall facade, reflective blue-tinted glass panels with slim aluminum mullions',
    'exposed-concrete': 'Exposed concrete (béton brut), raw concrete texture with formwork patterns visible',
    'brick': 'Brick facade, warm-toned clay bricks in running bond pattern',
    'stone': 'Natural stone cladding, honed granite or limestone panels',
    'metal-panel': 'Metal panel cladding, brushed aluminum or zinc panels with clean joints',
    'wood-louver': 'Wood louver screen facade, natural timber slats creating rhythm and shadow',
    'stucco': 'White stucco finish, smooth rendered walls with clean edges',
    'composite': 'Mixed materials — stone base, glass middle floors, metal panel top',
  }
  let materialHint = ''
  if (material?.type) {
    materialHint = materialDescs[material.type] || material.type
    if (material.color) materialHint += `. Primary color: ${material.color}`
    if (material.accent) materialHint += `. Accent material/color: ${material.accent}`
  }

  // ━━━ 카메라 앵글 ━━━
  const angleDesc: Record<string, string> = {
    'eye-level': `CAMERA POSITION: Standing on the sidewalk DIRECTLY IN FRONT of the building entrance, camera at exactly 1.6m height (adult eye level). The camera is at THE SAME ELEVATION as the building's ground floor — NOT on a hill above it.
COMPOSITION: 3/4 angle view showing the FULL building from ground to roof. The building fills 60-70% of the frame vertically. The building facade is the dominant element.
HORIZON LINE: At 1/3 from bottom — the lower third shows the street/sidewalk/landscaping, the upper two-thirds show the building facade and SKY.
PERSPECTIVE: Strong one-point perspective with vanishing point at building center. Vertical lines of the building are perfectly straight (no tilt). You are looking HORIZONTALLY or slightly UP at the building.
WHAT YOU CAN SEE: The front facade, windows, entrance door, balconies from the front. Sky above the roofline. The ground/pavement at the base of the building.
WHAT YOU CANNOT SEE: The ROOF surface (you are below it). Rooftop gardens from above. The top of trees. The backs of neighboring buildings. The building from above.
MANDATORY: The camera is ON THE GROUND at the same level as the building entrance. You can see the base of the building meeting the ground. Sky is visible ABOVE the roof. The roofline is a SILHOUETTE against the sky — you cannot see what's on top of the roof.
FORBIDDEN: Do NOT render from above, from a drone, from a hill, or from any elevated position. Do NOT look down at the building. If you can see the ROOFTOP SURFACE (garden, equipment, flat roof), the camera is TOO HIGH — lower it to ground level.`,
    'birds-eye': `CAMERA POSITION: Drone hovering at 50m altitude, looking DOWN at the building at a 45° angle from the southeast.
COMPOSITION: The ROOF of the building is the dominant element — you can see rooftop features (mechanical equipment, garden, solar panels). The building occupies 40-50% of the frame.
WHAT MUST BE VISIBLE: Rooftops, the building footprint shape, parking lot layout, landscaping from above, driveways, neighboring buildings' roofs, shadows cast on the ground.
HORIZON LINE: At 2/3 from bottom or higher — mostly looking DOWN at the ground plane.
PERSPECTIVE: Axonometric-like with mild perspective. The ground plane is clearly visible as a surface you look DOWN upon.
MANDATORY: The camera is IN THE SKY looking DOWN. You see the TOP of the building, not its front facade. Trees are seen from above (canopy shapes). Cars in parking are seen from above.
FORBIDDEN: Do NOT render from street level. Do NOT show the building as if standing in front of it. The ground must be visible as a plane BELOW the camera.`,
    'entrance': `CAMERA POSITION: Standing 3 meters from the main entrance door, camera at 1.5m height, facing the entrance straight-on.
COMPOSITION: The entrance door/lobby fills 70-80% of the frame. Only 1-2 floors are visible. Ground-floor details are the focus.
WHAT MUST BE VISIBLE: Entrance canopy/awning structure, door material and hardware, house number/address plate, intercom panel, entrance lighting fixtures, ground paving material transition (from sidewalk to entrance), planting boxes or greenery near the door, mailbox area.
SCALE REFERENCE: A person (or their shadow) near the entrance to show door height (~2.4m).
MANDATORY: This is a CLOSE-UP architectural detail shot. The entrance area fills most of the frame. Upper floors are cropped or barely visible.
FORBIDDEN: Do NOT show the full building. Do NOT pull the camera back to show the entire facade. This is NOT a building portrait — it is an entrance detail shot.`,
  }
  const cameraDesc = angleDesc[cameraAngle || 'eye-level'] || angleDesc['eye-level']

  // ━━━ 계절/시간대 ━━━
  const sceneDesc: Record<string, string> = {
    'afternoon': 'Warm afternoon sunlight (3-4 PM), clear sky, long gentle shadows. Golden warm tone.',
    'golden': 'Golden hour / twilight (6-7 PM), dramatic warm orange sky, building silhouette with warm interior lights beginning to glow. Romantic atmosphere.',
    'night': 'Nighttime scene, building exterior illuminated by architectural lighting. Warm interior lights visible through windows. Cool blue sky, street lights.',
    'spring': 'Spring season, cherry blossoms or magnolia blooming near the building. Fresh green leaves. Bright, cheerful atmosphere.',
    'summer': 'Lush summer greenery, deep green mature trees providing shade. Vibrant landscaping. Bright daylight.',
    'winter': 'Winter scene, bare tree branches, possible light snow on the ground and roof edges. Warm interior lights contrast with cool exterior. Cozy atmosphere.',
  }
  const sceneText = sceneDesc[sceneMode || 'afternoon'] || sceneDesc['afternoon']
  const patternElements: Record<string, string> = {
    // 단지·외부
    'courtyard': 'Include a visible courtyard/playground where children can play',
    'neighbors': 'Show semi-public gathering area where neighbors naturally meet',
    'accessible-green': 'Show green park or garden directly accessible from the building',
    'walk-safe': 'Show safe pedestrian paths clearly separated from vehicles',
    'shop-street': 'Ground floor has inviting cafe/retail storefronts with outdoor seating',
    'tree-view': 'Show mature trees near windows, visible greenery from units',
    'small-parking': 'Parking is hidden underground or behind landscaping, not visible from front',
    'connected-play': 'Include adventure playground with natural materials for children',
    'garden-wall': 'Replace walls with hedges, small gardens, or planting beds',
    'outdoor-room': 'Show outdoor seating area with shade structure',
    'main-entrance': 'Prominent, welcoming building entrance with architectural detail',
    'local-sports': 'Include visible outdoor exercise area or sports court',
    'fruit-trees': 'Show fruit-bearing trees in the landscaping',
    // 건물·동선
    'south-light': 'South-facing windows with warm sunlight streaming in',
    'quiet-entry': 'Gradual transition from public street to private entrance',
    'rooftop': 'Show rooftop garden or terrace with sky views',
    'balcony': 'Generous 2m deep balconies with plants on each unit',
    'building-edge': 'Active ground floor with display windows and awnings',
    'ceiling-height': 'Emphasize tall ceiling heights, especially on ground floor',
    'visible-roof': 'Show a distinctive roof form (pitched, green roof, or terrace)',
    'cascade-roof': 'Building steps down to match neighboring building heights',
    // 실·생활
    'two-light': 'Corner units with windows on two sides, bright interiors visible',
    'window-place': 'Window seats or reading nooks visible from outside',
    'private-terrace': 'Each unit has a small private terrace or garden',
    'earth-connect': 'Ground floor units connect directly to garden/earth',
  }
  const patternHints = (patterns || []).map(p => patternElements[p]).filter(Boolean)

  return `Generate a photorealistic architectural exterior rendering.

BUILDING FORM:
${buildingForm}
${typeHint ? `Layout: ${typeHint}` : ''}
${regulation ? `
LEGAL CONSTRAINTS (MUST comply — these are Korean building law requirements):
- Zone: ${regulation.zoneName || 'Residential'}
${regulation.heightLimit ? `- Height limit: ${regulation.heightLimit}m — the building MUST look shorter than ${regulation.heightLimit}m (about ${Math.round(regulation.heightLimit / 3.3)} floors max)` : ''}
${regulation.setbackFront ? `- Front setback: ${regulation.setbackFront}m from road — show landscaping/walkway in front` : ''}
${regulation.setbackSide ? `- Side setback: ${regulation.setbackSide}m from neighbors — visible gap between buildings` : ''}
${regulation.setbackRear ? `- Rear setback: ${regulation.setbackRear}m from back boundary` : ''}
${regulation.northShadow ? `- North shadow restriction (${regulation.northShadowAngle || 45}°) — upper floors MUST step back on the NORTH side, creating a cascading/terraced form toward the north. This is a distinctive feature of Korean residential buildings.` : ''}
${regulation.overlappingRegs?.length ? `- Special zones: ${regulation.overlappingRegs.map(String).join(', ')}${regulation.overlappingRegs.some((r: any) => String(r).includes('경관') || String(r).includes('자연')) ? ' — building should use NATURAL materials (stone, wood, earth tones) and have a modest, harmonious appearance that blends with the natural landscape' : ''}${regulation.overlappingRegs.some((r: any) => String(r).includes('고도')) ? ' — strict height control area, building must appear LOW and unobtrusive' : ''}` : ''}` : ''}

DESIGN DIRECTION:
${strategyStyle || 'Modern residential design'}
${materialHint ? `\nMATERIALS AND FINISH:\n${materialHint}` : ''}
${atmosphereHints.length > 0 ? `\nATMOSPHERE:\n${atmosphereHints.map(h => `- ${h}`).join('\n')}` : ''}
${patternHints.length > 0 ? `\nMUST INCLUDE THESE ELEMENTS:\n${patternHints.map(h => `- ${h}`).join('\n')}` : ''}

CONTEXT:
- Location: ${address || 'Seoul, South Korea'}
- Project: ${layoutName || '주거 건물'}
- Style: ${styleDesc}
${surroundingContext ? `\nSITE-SPECIFIC CONTEXT (IMPORTANT — render must reflect this):\n${surroundingContext}\n${polygonShapeDesc ? `\nLOT BOUNDARY SHAPE: ${polygonShapeDesc}\nCRITICAL: The building footprints must be arranged to fit WITHIN the actual lot boundary shape shown in the cadastral reference image. Do NOT draw a generic rectangular site — use the ACTUAL irregular shape from the reference.` : ''}\n\nThe rendering MUST show the building responding to its actual site conditions described above.` : (polygonShapeDesc ? `\nSITE BOUNDARY: ${polygonShapeDesc}\nCRITICAL: Arrange buildings to fit within this lot boundary shape.` : '')}

BUILDING IDENTITY (must remain IDENTICAL across all camera angles):
- Exact form: ${buildingForm}
- Building type: ${typeHint || 'residential'}
- Facade color: ${material?.type?.includes('stone') ? 'warm stone beige/cream' : material?.type?.includes('glass') ? 'reflective glass with dark metal frames' : material?.type?.includes('wood') ? 'natural wood tone with white accents' : 'white/light gray concrete with accent panels'}
- Roof: ${f <= 3 ? 'flat roof with rooftop garden or parapet' : f <= 5 ? 'flat roof with mechanical penthouse' : 'flat roof tower cap'}
- Window pattern: ${f <= 3 ? 'large residential windows, balcony doors' : 'regular grid of windows with balcony railings'}
- Ground floor: ${f <= 2 ? 'garden entrance with low wall' : 'pilotis or lobby entrance with canopy'}

CRITICAL REQUIREMENTS:
${isComplex 
  ? (cameraAngle === 'eye-level' || !cameraAngle 
    ? `- This is a multi-building residential complex, but you are photographing it from STREET LEVEL (1.6m).
- From this low angle, you can clearly see only 1-2 buildings in the FOREGROUND. They fill most of the frame.
${buildingType === 'linear' ? `- The building in view is a LONG HORIZONTAL SLAB (판상형). It extends far to the left and right — the facade is very WIDE. It is NOT a compact tower.` : ''}
${buildingType === 'lshape' ? `- The building in view is L-SHAPED (ㄱ자형). You can see one wing going forward and another wing going to the side.` : ''}
- You are standing on the street or sidewalk, looking HORIZONTALLY at the nearest building's facade.
- The foreground building has EXACTLY ${f} floors. You can count each floor from bottom to top.
- ${f <= 3 ? `★ HEIGHT CHECK: The building is ONLY ${f} stories (${Math.round(f * 3.3)}m). It is SHORTER than the trees next to it. A person standing on the roof is close to the treetops. This is a LOW building — like a large villa or townhouse, NOT an apartment tower.` : `★ HEIGHT CHECK: The building has exactly ${f} visible floor levels (${Math.round(f * 3.3)}m tall).`}
- Show the building entrance, windows, balconies, and materials at close range.
- The SKY is visible above the building roofline. You CANNOT see the roof surface.
- This is a STREET PHOTOGRAPH taken by a person walking, NOT an architectural model photo or aerial survey.`
    : `- This is a MULTI-BUILDING COMPLEX with ${buildingCount} separate ${f}-story buildings. Show MULTIPLE distinct buildings, NOT one large structure.
- Each building MUST have EXACTLY ${f} floors. They should look like a cohesive village/community.
- ${f <= 3 ? `★ HEIGHT: From above, the buildings are LOW — their roofs are at the SAME HEIGHT or LOWER than the surrounding trees. The trees partially HIDE the buildings. This is key to recognizing ${f}-story buildings from a drone view.` : `★ HEIGHT: Each building is ${f} floors (${Math.round(f * 3.3)}m). They are about the same height as the trees around them.`}
- Show spaces BETWEEN buildings: gardens, walkways, small courtyards, parking areas.
${buildingType === 'linear' ? `- ★★★ ARRANGEMENT: All buildings are LONG HORIZONTAL SLABS arranged PARALLEL to each other, running EAST-WEST. From above it looks like ${buildingCount} horizontal bars. This is a Korean 판상형 아파트 complex. DO NOT arrange them in a cluster or random pattern.` : ''}
${buildingType === 'lshape' ? `- ★★★ BUILDING SHAPE: Each building is L-SHAPED (ㄱ자형) when viewed from ABOVE.
  FROM THE SKY, each building looks like the letter "L" or Korean character "ㄱ":
  - One wing runs EAST-WEST (horizontal)
  - Another wing runs NORTH-SOUTH (vertical)  
  - The two wings meet at a 90° corner
  - The inside corner creates a small private garden/courtyard
  DO NOT generate simple rectangular box buildings. The L-shape MUST be clearly visible from this bird's-eye angle.
  Check the BUILDING LAYOUT DIAGRAM reference image — the ORANGE SHAPES show the exact L-footprint.` : ''}
${buildingType === 'courtyard' ? `- ★★★ BUILDING SHAPE: Each building group forms a U-SHAPE or C-SHAPE (중정형) when viewed from ABOVE.
  FROM THE SKY, each building group looks like the letter "U" or "C":
  - Three wings arranged around a CENTRAL GARDEN/COURTYARD
  - The courtyard is CLEARLY VISIBLE as an open green space in the center
  - The wings enclose and protect the garden from wind
  DO NOT generate separate individual buildings. Show the U-shape with enclosed courtyard clearly from above.` : ''}
- The complex should feel like walking through a small residential neighborhood.`)
  : `- The building MUST have EXACTLY ${f} floors. Count them: ${Array.from({length: f}, (_, i) => `floor ${i+1}`).join(', ')}. This is non-negotiable.
- ${f <= 2 ? 'This is a LOW-RISE building, maximum 2 stories tall. Do NOT make it taller.' : f <= 5 ? `This is a LOW to MID-RISE building with exactly ${f} visible floor levels.` : `This is a ${f}-story building. Each floor must be clearly visible and countable.`}`}
- Photorealistic 3D architectural rendering
- CAMERA: ${cameraDesc}
- SCENE: ${sceneText}
- 16:9 aspect ratio

AVOID (do NOT include):
- ★★★ ABSOLUTELY NO extra floors beyond ${f} stories. If you drew ${f + 1} or more floors, DELETE and REDRAW.
- Buildings taller than ${Math.round(f * 3.3)}m. ${f <= 3 ? `A ${f}-story building is SHORT — shorter than most trees. It looks like a large house, NOT an apartment tower.` : `A ${f}-story building is about ${Math.round(f * 3.3)}m — roughly the height of ${f <= 5 ? 'a telephone pole' : 'a medium tree'}.`}
- ${f <= 3 ? 'ANY building that looks like 4+ stories. If a person on the roof cannot safely jump to the ground, it is TOO TALL.' : `ANY building that looks like ${f + 2}+ stories.`}
- High-rise or mid-rise apartment towers (this is a ${f <= 3 ? 'LOW-RISE' : 'LOW to MID-RISE'} project)
${isComplex && (cameraAngle === 'eye-level' || !cameraAngle) ? '- Aerial or elevated viewpoint (you are ON THE GROUND)\n- Visible roof surfaces from above (the roof is a silhouette against the sky)\n- Showing all buildings equally (focus on 1-2 in foreground)\n- Architectural model perspective (this is a real street photograph)' : ''}
${isComplex && cameraAngle === 'birds-eye' ? '- One single monolithic building (MUST show multiple separate buildings)\n- Identical-looking buildings (each should have slight variation)' : ''}
- Distorted or unrealistic proportions
- Text, watermarks, or labels on the image
- Floating elements or physically impossible structures
- Cars or people that look artificial

${cameraAngle === 'birds-eye' ? `FINAL COMPOSITION CHECK — BIRDS-EYE:
Before generating, verify: Am I looking DOWN from the sky? Can I see the ROOF? Is the ground plane visible BELOW? Are there EXACTLY ${f} floors on each building (count the floor levels on the visible facades)? ${f <= 3 ? `Are the buildings LOW enough that trees partially obscure them?` : ''} If any answer is NO, re-compose.` 
: cameraAngle === 'entrance' ? `FINAL COMPOSITION CHECK — ENTRANCE CLOSE-UP:
Before generating, verify: Does the entrance door fill most of the frame? Are only 1-2 floors visible? Can I see door hardware details? If the full building is visible, ZOOM IN closer.`
: `FINAL COMPOSITION CHECK — EYE-LEVEL:
Before generating, verify: Is the camera at 1.6m (ground level)? Can I count EXACTLY ${f} floor levels on the building facade? ${f <= 3 ? `Is the building roofline BELOW or at the same height as nearby trees?` : ''} Is sky visible ABOVE the roofline? Can I see the ROOF SURFACE from above? If YES to the last question, the camera is TOO HIGH — move it DOWN to street level.`}

${prompt}

Generate ONE high-quality photorealistic image.`
}

// GET: API 상태 확인
export async function GET() {
  return NextResponse.json({
    configured: !!GOOGLE_AI_API_KEY,
    model: 'nano-banana (gemini fallback chain)',
    capabilities: ['image-generation', 'text'],
    service: 'Nano Banana (Gemini)',
  })
}
