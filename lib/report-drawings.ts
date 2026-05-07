// @version v2-png-fix-20260430
export const DRAWING_VERSION = "v2-png-20260430";
/**
 * PDF 보고서용 도면 SVG 문자열 생성기
 * HTML 템플릿에 PNG img 태그로 삽입 (모든 뷰어 호환)
 */

/** SVG → Canvas → PNG base64 <img> 태그 (async, 모든 뷰어 호환) */
export async function svgToPngImgTag(svgStr: string, width = 720, height = 600): Promise<string> {
  try {
    if (typeof document === 'undefined') throw new Error('No document')
    
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas not supported')
    
    // 배경 채우기 (SVG 투명 영역 방지)
    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(0, 0, width, height)
    
    // SVG에 명시적 width/height 주입 (Canvas 렌더링 필수)
    // style에서 width:100%와 max-width만 제거, background 등 보존
    let fixedSvg = svgStr
    
    // 1) width/height 속성 주입
    fixedSvg = fixedSvg.replace(/<svg\s/, `<svg width="${width}" height="${height}" `)
    
    // 2) style에서 상대 크기만 제거 (background, border 등은 유지)
    fixedSvg = fixedSvg.replace(/style="([^"]*)"/g, (match, styleContent) => {
      const cleaned = styleContent
        .split(';')
        .filter((s: string) => !s.includes('width') && !s.includes('max-width'))
        .join(';')
        .replace(/^;+|;+$/g, '')
      return cleaned ? `style="${cleaned}"` : ''
    })
    
    // viewBox가 없으면 추가
    if (!fixedSvg.includes('viewBox')) {
      fixedSvg = fixedSvg.replace('<svg ', `<svg viewBox="0 0 360 300" `)
    }
    
    // xmlns 확인
    if (!fixedSvg.includes('xmlns')) {
      fixedSvg = fixedSvg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')
    }
    
    const img = new Image()
    img.width = width
    img.height = height
    const svgBlob = new Blob([fixedSvg], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)
    
    const dataUrl: string = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        URL.revokeObjectURL(url)
        reject(new Error('SVG render timeout'))
      }, 5000)
      
      img.onload = () => {
        clearTimeout(timeout)
        try {
          ctx.drawImage(img, 0, 0, width, height)
          URL.revokeObjectURL(url)
          resolve(canvas.toDataURL('image/png'))
        } catch (e) {
          URL.revokeObjectURL(url)
          reject(e)
        }
      }
      img.onerror = (e) => {
        clearTimeout(timeout)
        URL.revokeObjectURL(url)
        reject(new Error('SVG render failed: ' + String(e)))
      }
      img.src = url
    })
    
    console.log('[v0] SVG→PNG 변환 성공, dataUrl 길이:', dataUrl.length)
    return `<img src="${dataUrl}" style="width:100%;max-width:360px;border-radius:6px;border:1px solid #e2e8f0;" />`
  } catch (err) {
    console.warn('[v0] SVG→PNG 변환 실패:', err)
    // Fallback: 도면 없이 텍스트 플레이스홀더
    return `<div style="width:100%;max-width:360px;height:200px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:11px;">도면은 앱에서 확인 가능합니다</div>`
  }
}

/** SVG → base64 SVG <img> 태그 (sync fallback) */
export function svgToImgTag(svgStr: string): string {
  const encoded = typeof btoa !== 'undefined'
    ? btoa(unescape(encodeURIComponent(svgStr)))
    : Buffer.from(svgStr).toString('base64')
  return `<img src="data:image/svg+xml;base64,${encoded}" style="width:100%;max-width:360px;border-radius:6px;" />`
}

interface DrawingInput {
  siteArea: number
  buildingCoverage: number
  floors: number
  units: number
  parking: number
  type: string
  roadWidth: number
  setbacks: { front: number; side: number; rear: number }
  heightLimit: number
  layoutName: string
  gfa: number
  sitePolygon?: { coords: [number, number][]; centroid: [number, number] } | null
}

// ===== 배치도 SVG =====
export function generateSitePlanSvg(d: DrawingInput): string {
  const W = 360, H = 300, PAD = 35
  
  // 실제 필지 형상 변환
  const hasPolygon = d.sitePolygon && d.sitePolygon.coords.length > 2
  let siteW: number, siteH: number, siteX: number, siteY: number, scale: number
  let polyPoints = ''

  if (hasPolygon) {
    const [cLng, cLat] = d.sitePolygon!.centroid
    const LM = Math.cos(cLat * Math.PI / 180) * 111319
    const mCoords = d.sitePolygon!.coords.map(([lng, lat]) => [(lng - cLng) * LM, -(lat - cLat) * 111319])
    const xs = mCoords.map(c => c[0]), ys = mCoords.map(c => c[1])
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys)
    const rW = maxX - minX || 1, rH = maxY - minY || 1
    scale = Math.min((W - PAD * 2) / rW, (H - PAD * 2 - 30) / rH)
    siteW = rW * scale; siteH = rH * scale
    siteX = (W - siteW) / 2; siteY = PAD
    polyPoints = mCoords.map(([mx, my]) => `${siteX + (mx - minX) * scale},${siteY + (my - minY) * scale}`).join(' ')
  } else {
    const siteRealW = Math.sqrt(d.siteArea * 1.25)
    const siteRealH = d.siteArea / siteRealW
    scale = Math.min((W - PAD * 2) / siteRealW, (H - PAD * 2 - 30) / siteRealH)
    siteW = siteRealW * scale; siteH = siteRealH * scale
    siteX = (W - siteW) / 2; siteY = PAD
  }

  const sf = d.setbacks.front * scale, ss = d.setbacks.side * scale, sr = d.setbacks.rear * scale
  const bldZoneX = siteX + ss, bldZoneY = siteY + sr
  const bldZoneW = siteW - ss * 2, bldZoneH = siteH - sf - sr
  const bW = bldZoneW * 0.8, bH = bldZoneH * 0.65
  const bX = bldZoneX + (bldZoneW - bW) / 2, bY = bldZoneY + (bldZoneH - bH) / 2
  const siteRealW = Math.sqrt(d.siteArea * 1.25), siteRealH = d.siteArea / siteRealW

  const siteSvg = hasPolygon
    ? `<polygon points="${polyPoints}" fill="#f1f5f9" stroke="#3b82f6" stroke-width="1.5"/>`
    : `<rect x="${siteX}" y="${siteY}" width="${siteW}" height="${siteH}" fill="#f1f5f9" stroke="#3b82f6" stroke-width="1.5"/>`

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:360px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0;">
  <style>text{font-family:sans-serif;}</style>
  <!-- 대지 -->
  ${siteSvg}
  <!-- 이격거리선 -->
  <rect x="${bldZoneX}" y="${bldZoneY}" width="${bldZoneW}" height="${bldZoneH}" fill="none" stroke="#22d3ee" stroke-width="0.7" stroke-dasharray="4 3" opacity="0.6"/>
  <!-- 건물 -->
  <rect x="${bX}" y="${bY}" width="${bW}" height="${bH}" fill="#dbeafe" stroke="#2563eb" stroke-width="1.2"/>
  <text x="${bX + bW / 2}" y="${bY + bH / 2 + 3}" text-anchor="middle" font-size="8" fill="#1e40af" font-weight="600">${d.layoutName}</text>
  <!-- 주차 진입 -->
  <rect x="${siteX + 4}" y="${siteY + siteH - sf - 12}" width="${siteW * 0.25}" height="10" fill="#f1f5f9" stroke="#94a3b8" stroke-width="0.5" rx="2"/>
  <text x="${siteX + 4 + siteW * 0.125}" y="${siteY + siteH - sf - 5}" text-anchor="middle" font-size="5" fill="#64748b">지하주차</text>
  <!-- 출입구 -->
  <rect x="${siteX + siteW / 2 - 6}" y="${siteY + siteH - 3}" width="12" height="4" fill="#0ea5e9" rx="1"/>
  <text x="${siteX + siteW / 2}" y="${siteY + siteH + 0.5}" text-anchor="middle" font-size="4" fill="white" font-weight="600">출입</text>
  <!-- 도로 -->
  <rect x="${siteX - 5}" y="${siteY + siteH + 3}" width="${siteW + 10}" height="12" fill="#e2e8f0" rx="1"/>
  <text x="${siteX + siteW / 2}" y="${siteY + siteH + 11}" text-anchor="middle" font-size="5" fill="#64748b">도로 (${d.roadWidth}m)</text>
  <!-- 치수 -->
  <line x1="${siteX}" y1="${siteY - 8}" x2="${siteX + siteW}" y2="${siteY - 8}" stroke="#ef4444" stroke-width="0.4"/>
  <text x="${siteX + siteW / 2}" y="${siteY - 10}" text-anchor="middle" font-size="5" fill="#ef4444">${siteRealW.toFixed(1)}m</text>
  <text x="${siteX - 8}" y="${siteY + siteH / 2}" text-anchor="middle" font-size="5" fill="#ef4444" transform="rotate(-90,${siteX - 8},${siteY + siteH / 2})">${siteRealH.toFixed(1)}m</text>
  <!-- 이격 치수 -->
  <text x="${siteX + siteW / 2}" y="${siteY + siteH - sf / 2 + 2}" text-anchor="middle" font-size="4.5" fill="#0891b2" opacity="0.7">전면 ${d.setbacks.front}m</text>
  <text x="${siteX + siteW / 2}" y="${siteY + sr / 2 + 2}" text-anchor="middle" font-size="4.5" fill="#0891b2" opacity="0.7">후면 ${d.setbacks.rear}m</text>
  <!-- 방위 -->
  <g transform="translate(${W - 22},${PAD})">
    <circle r="7" fill="none" stroke="#94a3b8" stroke-width="0.4"/>
    <polygon points="0,-6 -2,0 0,-2 2,0" fill="#ef4444"/>
    <text x="0" y="-9" text-anchor="middle" font-size="5" fill="#ef4444" font-weight="700">N</text>
  </g>
  <!-- 범례 -->
  <g transform="translate(${siteX},${H - 12})">
    <rect width="6" height="4" fill="#dbeafe" stroke="#2563eb" stroke-width="0.4"/><text x="8" y="3" font-size="4" fill="#64748b">건물</text>
    <line x1="35" y1="2" x2="42" y2="2" stroke="#22d3ee" stroke-width="0.5" stroke-dasharray="3 2"/><text x="44" y="3" font-size="4" fill="#64748b">건축한계선</text>
    <rect x="80" width="6" height="4" fill="#f1f5f9" stroke="#94a3b8" stroke-width="0.3"/><text x="88" y="3" font-size="4" fill="#64748b">주차</text>
  </g>
</svg>`
}

// ===== 단면도 SVG =====
export function generateSectionSvg(d: DrawingInput): string {
  const W = 360, H = 240
  const groundY = H * 0.55
  const floorH = 3.3, gfH = 4.5, bsmtH = 3.2
  const totalH = gfH + (d.floors - 1) * floorH
  const bsmtFloors = Math.max(1, Math.ceil(d.parking / (d.siteArea * d.buildingCoverage / 100 / 30)))
  const bsmtTotalH = bsmtFloors * bsmtH

  const aboveH = groundY - 30
  const belowH = H - groundY - 30
  const vScale = Math.min(aboveH / totalH, belowH / bsmtTotalH) * 0.9
  const bldW = W * 0.4
  const bldX = (W - bldW) / 2
  const toY = (m: number) => groundY - m * vScale
  const toBY = (m: number) => groundY + m * vScale

  let floorLines = ''
  for (let i = 0; i < d.floors; i++) {
    const fh = i === 0 ? gfH : gfH + i * floorH
    const y = toY(fh)
    floorLines += `<line x1="${bldX}" y1="${y}" x2="${bldX + bldW}" y2="${y}" stroke="#94a3b8" stroke-width="0.3"/>
    <text x="${bldX + bldW + 3}" y="${y + 2}" font-size="4.5" fill="#64748b">${i + 1}F</text>`
  }

  let bsmtRects = ''
  for (let i = 0; i < bsmtFloors; i++) {
    const y = toBY(i * bsmtH), h = bsmtH * vScale
    bsmtRects += `<rect x="${bldX - 5}" y="${y}" width="${bldW + 10}" height="${h}" fill="#e2e8f0" stroke="#94a3b8" stroke-width="0.4"/>
    <text x="${bldX + bldW / 2}" y="${y + h / 2 + 2}" text-anchor="middle" font-size="5" fill="#64748b">B${i + 1}F 주차장</text>`
  }

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:360px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0;">
  <style>text{font-family:sans-serif;}</style>
  <!-- 지반선 -->
  <line x1="20" y1="${groundY}" x2="${W - 20}" y2="${groundY}" stroke="#78716c" stroke-width="1.5"/>
  <text x="16" y="${groundY + 3}" text-anchor="end" font-size="5" fill="#78716c">GL</text>
  <!-- 건물 -->
  <rect x="${bldX}" y="${toY(totalH)}" width="${bldW}" height="${totalH * vScale}" fill="#dbeafe" stroke="#2563eb" stroke-width="1"/>
  <!-- 1층 강조 -->
  <rect x="${bldX}" y="${toY(gfH)}" width="${bldW}" height="${gfH * vScale}" fill="#fef3c7" stroke="#f59e0b" stroke-width="0.5"/>
  <text x="${bldX + bldW / 2}" y="${toY(gfH / 2) + 2}" text-anchor="middle" font-size="5" fill="#92400e">로비/상가</text>
  <!-- 층선 -->
  ${floorLines}
  <!-- 옥상 기계실 -->
  <rect x="${bldX + bldW * 0.35}" y="${toY(totalH + 2)}" width="${bldW * 0.3}" height="${2 * vScale}" fill="#e2e8f0" stroke="#94a3b8" stroke-width="0.4"/>
  <text x="${bldX + bldW / 2}" y="${toY(totalH + 1) + 1}" text-anchor="middle" font-size="3.5" fill="#64748b">기계실</text>
  <!-- 지하 -->
  ${bsmtRects}
  <!-- 높이 치수 -->
  <line x1="${bldX - 12}" y1="${groundY}" x2="${bldX - 12}" y2="${toY(totalH)}" stroke="#ef4444" stroke-width="0.4"/>
  <line x1="${bldX - 15}" y1="${groundY}" x2="${bldX - 9}" y2="${groundY}" stroke="#ef4444" stroke-width="0.3"/>
  <line x1="${bldX - 15}" y1="${toY(totalH)}" x2="${bldX - 9}" y2="${toY(totalH)}" stroke="#ef4444" stroke-width="0.3"/>
  <text x="${bldX - 14}" y="${toY(totalH / 2) + 2}" text-anchor="middle" font-size="5" fill="#ef4444" transform="rotate(-90,${bldX - 14},${toY(totalH / 2)})">${totalH.toFixed(1)}m</text>
  ${d.heightLimit > 0 && d.heightLimit < 200 ? `<line x1="30" y1="${toY(d.heightLimit)}" x2="${W - 30}" y2="${toY(d.heightLimit)}" stroke="#ef4444" stroke-width="0.6" stroke-dasharray="5 3" opacity="0.6"/>
  <text x="${W - 28}" y="${toY(d.heightLimit) - 2}" font-size="4.5" fill="#ef4444">높이제한 ${d.heightLimit}m</text>` : ''}
  <!-- 도로 -->
  <rect x="${bldX + bldW + 8}" y="${groundY - 2}" width="20" height="4" fill="#e2e8f0" stroke="#94a3b8" stroke-width="0.3"/>
  <text x="${bldX + bldW + 18}" y="${groundY + 8}" text-anchor="middle" font-size="4" fill="#64748b">도로 ${d.roadWidth}m</text>
  <!-- 층고 표시 -->
  <text x="${bldX + bldW + 20}" y="${toY(gfH / 2) + 1}" font-size="4" fill="#92400e">1F: ${gfH}m</text>
  <text x="${bldX + bldW + 20}" y="${toY(gfH + floorH / 2) + 1}" font-size="4" fill="#64748b">기준층: ${floorH}m</text>
  <!-- 정보 -->
  <text x="${W / 2}" y="${H - 5}" text-anchor="middle" font-size="5" fill="#94a3b8">지상 ${d.floors}층 (${totalH.toFixed(1)}m) + 지하 ${bsmtFloors}층 · 주차 ${d.parking}대</text>
</svg>`
}

// ===== 아이소메트릭 뷰 SVG =====
export function generateIsometricSvg(d: DrawingInput): string {
  const W = 360, H = 300
  const cx = W / 2, baseY = H * 0.75
  const floorH = 3.3, gfH = 4.5
  const totalH = gfH + (d.floors - 1) * floorH
  const rawBldW = Math.sqrt(d.siteArea * d.buildingCoverage / 100) * 0.6
  const bldW = Math.max(60, rawBldW) // 최소 60px 보장
  const bldD = bldW * 0.7
  const vScale = Math.min((baseY - 30) / totalH, 12)
  const hScale = Math.min((W - 30) / (bldW + bldD), 7)
  const isoW = bldW * hScale, isoD = bldD * hScale * 0.5
  const bldH = totalH * vScale

  const isoX = (x: number, y: number) => cx + (x - y) * 0.5
  const isoY = (x: number, y: number, z: number) => baseY + (x + y) * 0.3 - z

  // 건물 꼭짓점
  const bx0 = -isoW/2, bx1 = isoW/2, by0 = -isoD/2, by1 = isoD/2

  // 3면 (좌, 우, 상단)
  const leftFace = `${isoX(bx0,by0)},${isoY(bx0,by0,0)} ${isoX(bx0,by1)},${isoY(bx0,by1,0)} ${isoX(bx0,by1)},${isoY(bx0,by1,bldH)} ${isoX(bx0,by0)},${isoY(bx0,by0,bldH)}`
  const rightFace = `${isoX(bx0,by1)},${isoY(bx0,by1,0)} ${isoX(bx1,by1)},${isoY(bx1,by1,0)} ${isoX(bx1,by1)},${isoY(bx1,by1,bldH)} ${isoX(bx0,by1)},${isoY(bx0,by1,bldH)}`
  const topFace = `${isoX(bx0,by0)},${isoY(bx0,by0,bldH)} ${isoX(bx1,by0)},${isoY(bx1,by0,bldH)} ${isoX(bx1,by1)},${isoY(bx1,by1,bldH)} ${isoX(bx0,by1)},${isoY(bx0,by1,bldH)}`

  // 1층 높이
  const gfhPx = gfH * vScale

  // 창문 패턴
  let windows = ''
  const winRows = Math.min(d.floors - 1, 12)
  for (let i = 0; i < winRows; i++) {
    const z = gfhPx + i * floorH * vScale + floorH * vScale * 0.3
    const wh = floorH * vScale * 0.4
    for (let j = 0; j < 4; j++) {
      const t = 0.15 + j * 0.2
      // 좌측면 창문
      const wx = bx0, wy = by0 + (by1-by0) * t
      windows += `<rect x="${isoX(wx,wy)-2}" y="${isoY(wx,wy,z+wh)-1}" width="4" height="${wh*0.6}" fill="#bae6fd" opacity="0.5" rx="0.5"/>`
      // 우측면 창문
      const rwx = bx0 + (bx1-bx0) * t, rwy = by1
      windows += `<rect x="${isoX(rwx,rwy)-2}" y="${isoY(rwx,rwy,z+wh)-1}" width="4" height="${wh*0.6}" fill="#93c5fd" opacity="0.4" rx="0.5"/>`
    }
  }

  // 대지
  const siteR = Math.max(isoW, isoD) * 0.8
  const site = `${isoX(-siteR,-siteR*0.6)},${isoY(-siteR,-siteR*0.6,0)} ${isoX(siteR,-siteR*0.6)},${isoY(siteR,-siteR*0.6,0)} ${isoX(siteR,siteR*0.6)},${isoY(siteR,siteR*0.6,0)} ${isoX(-siteR,siteR*0.6)},${isoY(-siteR,siteR*0.6,0)}`

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:360px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0;">
  <style>text{font-family:sans-serif;}</style>
  <!-- 대지 -->
  <polygon points="${site}" fill="#e8f5e9" stroke="#81c784" stroke-width="0.5" opacity="0.5"/>
  <!-- 건물 좌측면 -->
  <polygon points="${leftFace}" fill="#bbdefb" stroke="#1565c0" stroke-width="0.8"/>
  <!-- 건물 우측면 -->
  <polygon points="${rightFace}" fill="#90caf9" stroke="#1565c0" stroke-width="0.8"/>
  <!-- 건물 상단면 -->
  <polygon points="${topFace}" fill="#e3f2fd" stroke="#1565c0" stroke-width="0.6"/>
  <!-- 1층 강조 (좌측) -->
  <polygon points="${isoX(bx0,by0)},${isoY(bx0,by0,0)} ${isoX(bx0,by1)},${isoY(bx0,by1,0)} ${isoX(bx0,by1)},${isoY(bx0,by1,gfhPx)} ${isoX(bx0,by0)},${isoY(bx0,by0,gfhPx)}" fill="#fff3e0" stroke="#f57c00" stroke-width="0.5" opacity="0.7"/>
  <!-- 창문 -->
  ${windows}
  <!-- 높이 치수 -->
  <line x1="${isoX(bx1,by0)+5}" y1="${isoY(bx1,by0,0)}" x2="${isoX(bx1,by0)+5}" y2="${isoY(bx1,by0,bldH)}" stroke="#ef4444" stroke-width="0.4"/>
  <text x="${isoX(bx1,by0)+12}" y="${isoY(bx1,by0,bldH/2)}" font-size="5" fill="#ef4444">${totalH.toFixed(1)}m</text>
  <!-- 방위 -->
  <g transform="translate(${W-25},25)">
    <polygon points="0,-7 -2,0 0,-2 2,0" fill="#ef4444"/>
    <text x="0" y="-9" text-anchor="middle" font-size="5" fill="#ef4444" font-weight="700">N</text>
  </g>
  <!-- 라벨 -->
  <text x="${cx}" y="${H-8}" text-anchor="middle" font-size="5" fill="#94a3b8">${d.layoutName} · ${d.floors}층 · ${d.units}세대</text>
</svg>`
}

// ===== 입면도 SVG =====
export function generateElevationSvg(d: DrawingInput): string {
  const W = 360, H = 280
  const groundY = H * 0.75
  const floorH = 3.3, gfH = 4.5
  const totalH = gfH + (d.floors - 1) * floorH
  const vScale = (groundY - 40) / Math.max(totalH, 20) * 0.85
  const bldW = W * 0.5, bldH = totalH * vScale
  const bldX = (W - bldW) / 2, bldY = groundY - bldH

  // 층별 창문
  let floorDetails = ''
  for (let i = 0; i < d.floors; i++) {
    const fh = i === 0 ? gfH : gfH + i * floorH
    const y = groundY - fh * vScale
    const rowH = (i === 0 ? gfH : floorH) * vScale
    
    // 층선
    floorDetails += `<line x1="${bldX}" y1="${y}" x2="${bldX+bldW}" y2="${y}" stroke="#cbd5e1" stroke-width="0.3"/>`
    
    if (i === 0) {
      // 1층: 상가 입구
      const doorW = bldW * 0.12, doorH = rowH * 0.8
      for (let j = 0; j < 4; j++) {
        const dx = bldX + bldW * (0.1 + j * 0.22)
        floorDetails += `<rect x="${dx}" y="${y + rowH * 0.1}" width="${doorW}" height="${doorH}" fill="#fef3c7" stroke="#d97706" stroke-width="0.4" rx="1"/>`
      }
      floorDetails += `<text x="${bldX+bldW/2}" y="${y+rowH/2+2}" text-anchor="middle" font-size="4.5" fill="#92400e">근린생활시설</text>`
    } else {
      // 주거층: 창문 그리드
      const winW = bldW * 0.08, winH = rowH * 0.5
      const cols = Math.min(6, Math.ceil(d.units / d.floors / 2))
      for (let j = 0; j < cols; j++) {
        const wx = bldX + bldW * (0.08 + j * (0.84 / cols))
        floorDetails += `<rect x="${wx}" y="${y + rowH * 0.2}" width="${winW}" height="${winH}" fill="#bfdbfe" stroke="#60a5fa" stroke-width="0.3" rx="0.5"/>`
      }
    }
  }

  // 옥상
  const roofY = bldY - 3 * vScale
  const mechW = bldW * 0.25, mechH = 2.5 * vScale
  
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:360px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0;">
  <style>text{font-family:sans-serif;}</style>
  <!-- 하늘 그라데이션 -->
  <defs><linearGradient id="elev-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#e0f2fe"/><stop offset="100%" stop-color="#f8fafc"/></linearGradient></defs>
  <rect width="${W}" height="${groundY}" fill="url(#elev-sky)"/>
  <!-- 지반선 -->
  <line x1="15" y1="${groundY}" x2="${W-15}" y2="${groundY}" stroke="#78716c" stroke-width="1.5"/>
  <text x="12" y="${groundY+3}" text-anchor="end" font-size="4.5" fill="#78716c">GL</text>
  <!-- 건물 외벽 -->
  <rect x="${bldX}" y="${bldY}" width="${bldW}" height="${bldH}" fill="#f1f5f9" stroke="#475569" stroke-width="1"/>
  <!-- 층별 디테일 -->
  ${floorDetails}
  <!-- 옥상 기계실 -->
  <rect x="${bldX+bldW/2-mechW/2}" y="${bldY-mechH}" width="${mechW}" height="${mechH}" fill="#e2e8f0" stroke="#94a3b8" stroke-width="0.5"/>
  <text x="${bldX+bldW/2}" y="${bldY-mechH/2+2}" text-anchor="middle" font-size="3.5" fill="#64748b">기계실</text>
  <!-- 옥상 난간 -->
  <line x1="${bldX}" y1="${bldY}" x2="${bldX}" y2="${bldY-2}" stroke="#94a3b8" stroke-width="0.5"/>
  <line x1="${bldX+bldW}" y1="${bldY}" x2="${bldX+bldW}" y2="${bldY-2}" stroke="#94a3b8" stroke-width="0.5"/>
  <line x1="${bldX}" y1="${bldY-2}" x2="${bldX+bldW}" y2="${bldY-2}" stroke="#94a3b8" stroke-width="0.5"/>
  <!-- 높이 치수 -->
  <line x1="${bldX-10}" y1="${groundY}" x2="${bldX-10}" y2="${bldY}" stroke="#ef4444" stroke-width="0.4"/>
  <line x1="${bldX-13}" y1="${groundY}" x2="${bldX-7}" y2="${groundY}" stroke="#ef4444" stroke-width="0.3"/>
  <line x1="${bldX-13}" y1="${bldY}" x2="${bldX-7}" y2="${bldY}" stroke="#ef4444" stroke-width="0.3"/>
  <text x="${bldX-12}" y="${(groundY+bldY)/2}" text-anchor="middle" font-size="5" fill="#ef4444" transform="rotate(-90,${bldX-12},${(groundY+bldY)/2})">${totalH.toFixed(1)}m</text>
  <!-- 폭 치수 -->
  <line x1="${bldX}" y1="${groundY+8}" x2="${bldX+bldW}" y2="${groundY+8}" stroke="#3b82f6" stroke-width="0.4"/>
  <text x="${bldX+bldW/2}" y="${groundY+14}" text-anchor="middle" font-size="5" fill="#3b82f6">${Math.sqrt(d.siteArea * d.buildingCoverage/100).toFixed(1)}m</text>
  ${d.heightLimit > 0 && d.heightLimit < 200 ? `
  <!-- 높이 제한 -->
  <line x1="30" y1="${groundY - d.heightLimit * vScale}" x2="${W-30}" y2="${groundY - d.heightLimit * vScale}" stroke="#ef4444" stroke-width="0.5" stroke-dasharray="4 3" opacity="0.5"/>
  <text x="${W-28}" y="${groundY - d.heightLimit * vScale - 2}" font-size="4" fill="#ef4444">높이제한 ${d.heightLimit}m</text>` : ''}
  <!-- 정보 -->
  <text x="${W/2}" y="${H-8}" text-anchor="middle" font-size="5" fill="#94a3b8">정면도 · ${d.layoutName} · 지상 ${d.floors}층</text>
</svg>`
}

// ===== 투시도 SVG =====
export function generatePerspectiveSvg(d: DrawingInput): string {
  const W = 360, H = 300
  const vpX = W/2, vpY = 60, groundY = 260
  const floorH = Math.max(15, Math.min(30, 120 / Math.max(d.floors, 2)))
  const totalH = d.floors * floorH
  const buildingArea = d.siteArea * (d.buildingCoverage / 100)
  const sideM = Math.sqrt(buildingArea)
  const bw = Math.max(140, Math.min(sideM * 2.5, 240))
  const bd = Math.max(30, Math.min(sideM * 0.8, 60))
  const bx = vpX - bw / 2, bDepth = 15

  function toP(x3d: number, y3d: number, z3d: number): [number, number] {
    const depth = Math.max(0.3, 1 - y3d * 0.008)
    const px = vpX + (x3d - vpX) * depth * 0.8
    const pz = groundY - z3d * depth * 0.8
    const py = pz + (vpY - pz) * (1 - depth) * 0.3
    return [vpX + (px - vpX), py]
  }
  function pFace(cs: [number,number,number][]): string {
    return cs.map(c => { const [a,b] = toP(c[0],c[1],c[2]); return `${a.toFixed(1)},${b.toFixed(1)}` }).join(' ')
  }

  // 창문 생성
  const cols = Math.max(2, Math.min(7, Math.floor(bw / 14)))
  const winW = bw * 0.65 / cols, winGap = bw * 0.35 / (cols + 1)
  let windows = ''
  for (let f = 0; f < d.floors; f++) {
    const z = f * floorH + floorH * 0.15, wh = floorH * (f === 0 ? 0.75 : 0.6)
    for (let c = 0; c < cols; c++) {
      const wx = bx + winGap + c * (winW + winGap)
      windows += `<polygon points="${pFace([[wx,bDepth,z],[wx+winW,bDepth,z],[wx+winW,bDepth,z+wh],[wx,bDepth,z+wh]])}" fill="#93c5fd" opacity="0.7" stroke="#2563eb" stroke-width="0.3"/>`
    }
  }

  // 입구
  const doorW = bw * 0.1, doorH = floorH * 0.85, doorX = bx + bw/2 - doorW/2
  const door = `<polygon points="${pFace([[doorX,bDepth,0],[doorX+doorW,bDepth,0],[doorX+doorW,bDepth,doorH],[doorX,bDepth,doorH]])}" fill="#fbbf24" opacity="0.5" stroke="#f59e0b" stroke-width="0.5"/>`

  // 높이 치수 (실제 미터 단위)
  const realFloorH = 3.3, realGfH = 4.5
  const realTotalH = realGfH + (d.floors - 1) * realFloorH
  const [dbx,dby] = toP(bx-12,bDepth,0), [dtx,dty] = toP(bx-12,bDepth,totalH)

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" style="width:100%;max-width:360px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0;">
  <defs><linearGradient id="skyp" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#e0f2fe"/><stop offset="60%" stop-color="#f0f9ff"/><stop offset="100%" stop-color="#f8fafc"/></linearGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#skyp)"/>
  <!-- 지면 -->
  <polygon points="${pFace([[0,-15,0],[W,-15,0],[W,80,0],[0,80,0]])}" fill="#e2e8f0"/>
  <!-- 도로 -->
  <polygon points="${pFace([[20,-12,0],[W-20,-12,0],[W-20,-4,0],[20,-4,0]])}" fill="#94a3b8" stroke="#64748b" stroke-width="0.5"/>
  <!-- 대지 경계 -->
  <polygon points="${pFace([[bx-8,bDepth-4,0],[bx+bw+8,bDepth-4,0],[bx+bw+8,bDepth+bd+8,0],[bx-8,bDepth+bd+8,0]])}" fill="#dbeafe" stroke="#3b82f6" stroke-width="0.6" stroke-dasharray="3 2" opacity="0.5"/>
  <!-- 그림자 -->
  <polygon points="${pFace([[bx-2,bDepth-2,0],[bx+bw+4,bDepth-2,0],[bx+bw+6,bDepth+bd+3,0],[bx-1,bDepth+bd+3,0]])}" fill="#94a3b8" opacity="0.15"/>
  <!-- 건물 전면 -->
  <polygon points="${pFace([[bx,bDepth,0],[bx+bw,bDepth,0],[bx+bw,bDepth,totalH],[bx,bDepth,totalH]])}" fill="#cbd5e1" stroke="#64748b" stroke-width="0.8"/>
  <!-- 건물 우측 -->
  <polygon points="${pFace([[bx+bw,bDepth,0],[bx+bw,bDepth+bd,0],[bx+bw,bDepth+bd,totalH],[bx+bw,bDepth,totalH]])}" fill="#94a3b8" stroke="#64748b" stroke-width="0.5"/>
  <!-- 건물 옥상 -->
  <polygon points="${pFace([[bx,bDepth,totalH],[bx+bw,bDepth,totalH],[bx+bw,bDepth+bd,totalH],[bx,bDepth+bd,totalH]])}" fill="#e2e8f0" stroke="#94a3b8" stroke-width="0.5"/>
  ${windows}
  ${door}
  <!-- 높이 치수 -->
  <line x1="${dbx}" y1="${dby}" x2="${dtx}" y2="${dty}" stroke="#ea580c" stroke-width="0.6"/>
  <text x="${dtx-6}" y="${(dby+dty)/2}" text-anchor="end" font-size="5.5" fill="#ea580c" font-weight="bold">${realTotalH.toFixed(1)}m</text>
  <text x="${dtx-6}" y="${(dby+dty)/2+7}" text-anchor="end" font-size="4.5" fill="#64748b">${d.floors}F</text>
  <!-- 방위 -->
  <circle cx="${W-25}" cy="22" r="10" fill="#f8fafc" stroke="#94a3b8" stroke-width="0.8"/>
  <text x="${W-25}" y="18" text-anchor="middle" font-size="7" fill="#2563eb" font-weight="bold">N</text>
  <!-- 정보 -->
  <text x="${vpX}" y="18" text-anchor="middle" font-size="6" fill="#1e293b" font-weight="bold">${d.layoutName || '투시도'}</text>
  <text x="${vpX}" y="${H-8}" text-anchor="middle" font-size="5" fill="#64748b">투시도 · ${d.layoutName} · ${d.floors}F · ${d.units}세대</text>
</svg>`
}

// ===== 기준층 평면도 SVG =====
export function generateFloorPlanSvg(d: DrawingInput): string {
  // 동적 import 대신 인라인 구현 (report-drawings는 순수 함수)
  const W = 400, H = 280, PAD = 30
  const coreW = 24
  const unitsPerFloor = Math.min(Math.max(Math.ceil(d.units / Math.max(d.floors - 1, 1)), 2), 4)
  const leftCount = Math.ceil(unitsPerFloor / 2)
  const rightCount = unitsPerFloor - leftCount

  // 건물 크기 계산
  const unitW = (W - PAD * 2 - coreW) / unitsPerFloor
  const bldgW = W - PAD * 2
  const bldgH = H - PAD * 2 - 16
  const coreX = leftCount * unitW

  // 색상
  const roomColors: Record<string, string> = {
    '거실': '#dcfce7', '주방': '#fef3c7', '안방': '#dbeafe', '침실': '#e0e7ff',
    '욕실': '#cffafe', '현관': '#f1f5f9', '드레스룸': '#f3e8ff',
  }

  // 실 배치 (투룸/쓰리룸 자동 결정)
  function unitRooms(uw: number, uh: number, isThreeRoom: boolean): { name: string; x: number; y: number; w: number; h: number; color: string }[] {
    if (isThreeRoom) {
      const topH = uh * 0.42, midH = uh * 0.33, botH = uh - topH - midH
      return [
        { name: '거실', x: 0, y: 0, w: uw * 0.52, h: topH, color: roomColors['거실'] },
        { name: '주방', x: uw * 0.52, y: 0, w: uw * 0.48, h: topH, color: roomColors['주방'] },
        { name: '안방', x: 0, y: topH, w: uw * 0.38, h: midH, color: roomColors['안방'] },
        { name: '침실2', x: uw * 0.38, y: topH, w: uw * 0.32, h: midH, color: roomColors['침실'] },
        { name: '욕실', x: uw * 0.7, y: topH, w: uw * 0.3, h: midH, color: roomColors['욕실'] },
        { name: '침실3', x: 0, y: topH + midH, w: uw * 0.35, h: botH, color: roomColors['침실'] },
        { name: 'DR', x: uw * 0.35, y: topH + midH, w: uw * 0.22, h: botH, color: roomColors['드레스룸'] },
        { name: '욕실2', x: uw * 0.57, y: topH + midH, w: uw * 0.2, h: botH, color: roomColors['욕실'] },
        { name: '현관', x: uw * 0.77, y: topH + midH, w: uw * 0.23, h: botH, color: roomColors['현관'] },
      ]
    }
    const topH = uh * 0.52, botH = uh - topH
    return [
      { name: '거실', x: 0, y: 0, w: uw * 0.55, h: topH, color: roomColors['거실'] },
      { name: '주방', x: uw * 0.55, y: 0, w: uw * 0.45, h: topH, color: roomColors['주방'] },
      { name: '안방', x: 0, y: topH, w: uw * 0.42, h: botH, color: roomColors['안방'] },
      { name: '침실2', x: uw * 0.42, y: topH, w: uw * 0.32, h: botH, color: roomColors['침실'] },
      { name: '욕실', x: uw * 0.74, y: topH, w: uw * 0.26, h: botH * 0.55, color: roomColors['욕실'] },
      { name: '현관', x: uw * 0.74, y: topH + botH * 0.55, w: uw * 0.26, h: botH * 0.45, color: roomColors['현관'] },
    ]
  }

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${W}px;background:#f8fafc;border-radius:8px;font-family:system-ui,sans-serif">`

  // 건물 외곽
  svg += `<rect x="${PAD}" y="${PAD}" width="${bldgW}" height="${bldgH}" fill="none" stroke="#1e293b" stroke-width="2.5" rx="1"/>`

  // 코어
  const coreActualX = PAD + coreX
  svg += `<rect x="${coreActualX}" y="${PAD + bldgH * 0.15}" width="${coreW}" height="${bldgH * 0.7}" fill="#33415530" stroke="#475569" stroke-width="1" rx="1"/>`
  svg += `<rect x="${coreActualX + 2}" y="${PAD + bldgH * 0.18}" width="${coreW * 0.35}" height="${bldgH * 0.64}" fill="#334155" rx="1"/>`
  svg += `<text x="${coreActualX + 2 + coreW * 0.175}" y="${PAD + bldgH * 0.5}" font-size="4" text-anchor="middle" fill="white" font-weight="500">EV</text>`
  svg += `<rect x="${coreActualX + coreW * 0.4}" y="${PAD + bldgH * 0.18}" width="${coreW * 0.55}" height="${bldgH * 0.64}" fill="#475569" rx="1"/>`
  svg += `<text x="${coreActualX + coreW * 0.67}" y="${PAD + bldgH * 0.5}" font-size="4" text-anchor="middle" fill="white">계단</text>`
  // 복도
  svg += `<rect x="${coreActualX}" y="${PAD}" width="${coreW}" height="${bldgH * 0.15}" fill="#f1f5f908" stroke="#94a3b8" stroke-width="0.3"/>`
  svg += `<rect x="${coreActualX}" y="${PAD + bldgH * 0.85}" width="${coreW}" height="${bldgH * 0.15}" fill="#f1f5f908" stroke="#94a3b8" stroke-width="0.3"/>`

  const unitColors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b']

  // 세대
  for (let i = 0; i < unitsPerFloor; i++) {
    const isLeft = i < leftCount
    const idx = isLeft ? i : i - leftCount
    const ux = isLeft ? PAD + idx * unitW : PAD + leftCount * unitW + coreW + (i - leftCount) * unitW
    const isThreeRoom = (i === 1 || i === 2) && unitsPerFloor >= 3
    const rooms = unitRooms(unitW, bldgH, isThreeRoom)
    const mirror = !isLeft
    const color = unitColors[i % unitColors.length]
    const label = String.fromCharCode(65 + i)
    const area = isThreeRoom ? 84 : 59

    // 세대 외곽
    svg += `<rect x="${ux}" y="${PAD}" width="${unitW}" height="${bldgH}" fill="none" stroke="#1e293b" stroke-width="1.5"/>`

    // 실
    for (const room of rooms) {
      const rx = mirror ? ux + unitW - room.x - room.w : ux + room.x
      const ry = PAD + room.y
      svg += `<rect x="${rx}" y="${ry}" width="${room.w}" height="${room.h}" fill="${room.color}" stroke="#64748b" stroke-width="0.6"/>`
      svg += `<text x="${rx + room.w / 2}" y="${ry + room.h / 2 + 1.5}" font-size="${room.w > 25 ? 5 : 3.5}" text-anchor="middle" fill="#374151" font-weight="500">${room.name}</text>`
    }

    // 라벨
    svg += `<text x="${ux + unitW / 2}" y="${PAD + bldgH + 11}" font-size="5.5" text-anchor="middle" fill="${color}" font-weight="700">${label}호 (${isThreeRoom ? '쓰리룸' : '투룸'} ${area}㎡)</text>`
  }

  // 치수
  svg += `<line x1="${PAD}" y1="${PAD - 10}" x2="${PAD + bldgW}" y2="${PAD - 10}" stroke="#94a3b8" stroke-width="0.5"/>`
  svg += `<text x="${PAD + bldgW / 2}" y="${PAD - 14}" font-size="5" text-anchor="middle" fill="#64748b">${Math.round(bldgW * 0.08)}m</text>`

  // 방위
  svg += `<line x1="${PAD + bldgW + 14}" y1="${PAD + 12}" x2="${PAD + bldgW + 14}" y2="${PAD}" stroke="#1e293b" stroke-width="1"/>`
  svg += `<polygon points="${PAD + bldgW + 14},${PAD - 3} ${PAD + bldgW + 11.5},${PAD + 2} ${PAD + bldgW + 16.5},${PAD + 2}" fill="#1e293b"/>`
  svg += `<text x="${PAD + bldgW + 14}" y="${PAD - 5}" font-size="5" text-anchor="middle" fill="#1e293b" font-weight="700">N</text>`

  // 제목
  svg += `<text x="${W / 2}" y="${H - 4}" font-size="6" text-anchor="middle" fill="#64748b">기준층 평면도 · ${unitsPerFloor}세대 · ${d.layoutName}</text>`

  svg += `</svg>`
  return svg
}
