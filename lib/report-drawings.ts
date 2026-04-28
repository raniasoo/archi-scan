/**
 * PDF 보고서용 도면 SVG 문자열 생성기
 * HTML 템플릿에 인라인 SVG로 삽입
 */

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
}

// ===== 배치도 SVG =====
export function generateSitePlanSvg(d: DrawingInput): string {
  const W = 360, H = 300, PAD = 35
  const siteRealW = Math.sqrt(d.siteArea * 1.25)
  const siteRealH = d.siteArea / siteRealW
  const scale = Math.min((W - PAD * 2) / siteRealW, (H - PAD * 2 - 30) / siteRealH)
  const siteW = siteRealW * scale, siteH = siteRealH * scale
  const siteX = (W - siteW) / 2, siteY = PAD
  const sf = d.setbacks.front * scale, ss = d.setbacks.side * scale, sr = d.setbacks.rear * scale
  const bldZoneX = siteX + ss, bldZoneY = siteY + sr
  const bldZoneW = siteW - ss * 2, bldZoneH = siteH - sf - sr
  const bW = bldZoneW * 0.8, bH = bldZoneH * 0.65
  const bX = bldZoneX + (bldZoneW - bW) / 2, bY = bldZoneY + (bldZoneH - bH) / 2

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:360px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0;">
  <style>text{font-family:sans-serif;}</style>
  <!-- 대지 -->
  <rect x="${siteX}" y="${siteY}" width="${siteW}" height="${siteH}" fill="#f1f5f9" stroke="#3b82f6" stroke-width="1.5"/>
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
