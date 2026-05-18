"use client"

import React from "react"
import type { DesignStrategy } from "@/lib/design-strategy"
import { getBuildingDimensionsInMeters } from "@/lib/building-geometry"

interface FloorPlanProps {
  type: "tower" | "courtyard" | "lshape" | "linear" | "cluster"
  floor: number
  totalFloors: number
  strategy?: DesignStrategy
  zoneType?: string
  units?: number
  gfa?: number
  buildingCount?: number
  siteArea?: number      // building-geometry 연동용
  coverage?: number      // building-geometry 연동용
  originalType?: string  // 클러스터 원본 타입
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 세대 내부 실 배치 헬퍼
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function UnitInterior({ x, y, w, h, label, area, color, mirror = false, compact = false }: {
  x: number; y: number; w: number; h: number
  label: string; area: number; color: string; mirror?: boolean; compact?: boolean
}) {
  // compact 임계값을 20으로 낮춤 (모바일에서도 상세 표시)
  if (compact || w < 20 || h < 20) {
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} fill={`${color}15`} stroke={color} strokeWidth="1" />
        <text x={x + w/2} y={y + h/2 - 3} fontSize="7" textAnchor="middle" fill={color} fontWeight="600">{label}</text>
        <text x={x + w/2} y={y + h/2 + 7} fontSize="6" textAnchor="middle" fill={color}>{area}㎡</text>
      </g>
    )
  }

  const WALL = 2  // 벽체 두께
  const ix = x + WALL, iy = y + WALL
  const innerW = w - WALL * 2, innerH = h - WALL * 2

  // 실 배분 비율
  const livingH = Math.round(innerH * 0.52)
  const kitchenW = Math.round(innerW * 0.32)
  const hallW = Math.round(innerW * 0.12)
  const roomH = innerH - livingH - WALL
  const roomY = iy + livingH + WALL
  const br1W = Math.round(innerW * 0.38)
  const br2W = Math.round(innerW * 0.34)
  const bathW = innerW - br1W - br2W - WALL * 2

  // 미러링 좌표
  const lx = mirror ? ix + kitchenW + WALL : ix
  const livingW = innerW - kitchenW - WALL
  const kx = mirror ? ix : ix + livingW + WALL
  const r1x = mirror ? ix + innerW - br1W : ix
  const r2x = mirror ? r1x - br2W - WALL : r1x + br1W + WALL
  const btx = mirror ? ix : r2x + br2W + WALL

  return (
    <g>
      {/* ━━━ 외벽 (두꺼운 벽체) ━━━ */}
      <rect x={x} y={y} width={w} height={h} fill="none" stroke="currentColor" strokeWidth={WALL + 0.5} className="text-foreground" />

      {/* ━━━ 발코니 (점선 테두리) ━━━ */}
      <rect x={x + 4} y={y - 6} width={w - 8} height={6} fill="none" stroke={color} strokeWidth="0.4" strokeDasharray="2 1" />
      <text x={x + w/2} y={y - 1.5} fontSize="3" textAnchor="middle" fill={color} opacity="0.4">발코니</text>

      {/* ━━━ 거실 ━━━ */}
      <rect x={lx} y={iy} width={livingW} height={livingH} fill={`${color}06`} stroke={color} strokeWidth={WALL * 0.6} />
      <text x={lx + livingW/2} y={iy + 9} fontSize="5.5" textAnchor="middle" fill={color} fontWeight="500">거실</text>
      {/* 소파 (ㄴ자) */}
      <rect x={lx + 3} y={iy + livingH - 14} width={Math.min(livingW * 0.45, 24)} height={6} rx="1" fill={`${color}18`} stroke={color} strokeWidth="0.3" />
      <rect x={lx + 3} y={iy + livingH - 14} width={4} height={10} rx="1" fill={`${color}18`} stroke={color} strokeWidth="0.3" />
      {/* TV 보드 */}
      <rect x={lx + livingW - 6} y={iy + livingH - 16} width={3} height={12} rx="0.5" fill={`${color}25`} stroke={color} strokeWidth="0.2" />
      {/* 다이닝 테이블 */}
      <rect x={lx + livingW * 0.35} y={iy + livingH * 0.3} width={livingW * 0.3} height={livingW * 0.18} rx="1" fill="none" stroke={color} strokeWidth="0.3" />
      {/* 창문 표시 (외벽에 작은 사각) */}
      {w > 50 && Array.from({ length: 3 }, (_, i) => (
        <rect key={`wn-${i}`} x={lx + 8 + i * (livingW - 16) / 2.5} y={y - WALL/2} width={8} height={WALL} fill="#38bdf8" opacity="0.5" />
      ))}

      {/* ━━━ 주방/식당 ━━━ */}
      <rect x={kx} y={iy} width={kitchenW} height={livingH} fill={`${color}10`} stroke={color} strokeWidth={WALL * 0.6} />
      <text x={kx + kitchenW/2} y={iy + 9} fontSize="4.5" textAnchor="middle" fill={color}>주방</text>
      {/* ㄱ자 싱크대 */}
      <rect x={kx + 2} y={iy + 2} width={kitchenW - 4} height={4} rx="0.5" fill={`${color}30`} stroke={color} strokeWidth="0.4" />
      <rect x={kx + 2} y={iy + 2} width={4} height={livingH * 0.5} rx="0.5" fill={`${color}30`} stroke={color} strokeWidth="0.4" />
      {/* 싱크 원 */}
      <circle cx={kx + kitchenW/2} cy={iy + 4} r="1.5" fill="none" stroke={color} strokeWidth="0.3" />
      {/* 가스레인지 */}
      {[0, 1].map(i => <circle key={`gs${i}`} cx={kx + kitchenW - 6 + i * 3.5} cy={iy + 4} r="1" fill="none" stroke={color} strokeWidth="0.25" />)}
      {/* 냉장고 */}
      <rect x={kx + 2} y={iy + livingH - 8} width={5} height={7} rx="0.5" fill={`${color}20`} stroke={color} strokeWidth="0.3" />

      {/* ━━━ 내벽 (거실-침실 사이) ━━━ */}
      <rect x={ix} y={roomY - WALL} width={innerW} height={WALL} fill="currentColor" className="text-foreground" opacity="0.7" />

      {/* ━━━ 방1 (안방) ━━━ */}
      <rect x={r1x} y={roomY} width={br1W} height={roomH} fill={`${color}05`} stroke={color} strokeWidth={WALL * 0.6} />
      <text x={r1x + br1W/2} y={roomY + 9} fontSize="5" textAnchor="middle" fill={color}>안방</text>
      {/* 더블 침대 */}
      <rect x={r1x + 3} y={roomY + 3} width={br1W * 0.55} height={roomH * 0.5} rx="1" fill={`${color}10`} stroke={color} strokeWidth="0.25" />
      {/* 베개 2개 */}
      <rect x={r1x + 4} y={roomY + 4} width={br1W * 0.22} height={3} rx="1" fill={`${color}18`} stroke={color} strokeWidth="0.2" />
      <rect x={r1x + 4 + br1W * 0.25} y={roomY + 4} width={br1W * 0.22} height={3} rx="1" fill={`${color}18`} stroke={color} strokeWidth="0.2" />
      {/* 붙박이장 */}
      <rect x={r1x + br1W - 5} y={roomY + 2} width={3} height={roomH - 4} rx="0.3" fill={`${color}12`} stroke={color} strokeWidth="0.2" />
      {/* 문 스윙 (쿼터 서클) */}
      <path d={`M ${r1x + br1W/2} ${roomY} A 8 8 0 0 ${mirror ? 0 : 1} ${r1x + br1W/2 + (mirror ? -8 : 8)} ${roomY + 8}`} fill="none" stroke={color} strokeWidth="0.3" strokeDasharray="1 1" />

      {/* ━━━ 방2 ━━━ */}
      <rect x={r2x} y={roomY} width={br2W} height={roomH} fill={`${color}05`} stroke={color} strokeWidth={WALL * 0.6} />
      <text x={r2x + br2W/2} y={roomY + 9} fontSize="4.5" textAnchor="middle" fill={color}>방2</text>
      {/* 싱글 침대 */}
      <rect x={r2x + 3} y={roomY + 3} width={br2W * 0.45} height={roomH * 0.45} rx="1" fill={`${color}10`} stroke={color} strokeWidth="0.2" />
      {/* 책상 */}
      <rect x={r2x + br2W - 6} y={roomY + roomH - 7} width={4} height={5} rx="0.3" fill="none" stroke={color} strokeWidth="0.25" />
      {/* 문 스윙 */}
      <path d={`M ${r2x + br2W/2} ${roomY} A 7 7 0 0 ${mirror ? 1 : 0} ${r2x + br2W/2 + (mirror ? 7 : -7)} ${roomY + 7}`} fill="none" stroke={color} strokeWidth="0.3" strokeDasharray="1 1" />

      {/* ━━━ 욕실 ━━━ */}
      <rect x={btx} y={roomY} width={bathW} height={roomH} fill="#0ea5e906" stroke="#0ea5e9" strokeWidth={WALL * 0.6} />
      <text x={btx + bathW/2} y={roomY + 8} fontSize="4" textAnchor="middle" fill="#0ea5e9">욕실</text>
      {/* 변기 */}
      <ellipse cx={btx + bathW/2} cy={roomY + roomH - 5} rx="2.5" ry="3" fill="#0ea5e910" stroke="#0ea5e9" strokeWidth="0.3" />
      <rect x={btx + bathW/2 - 2} y={roomY + roomH - 3} width={4} height={2.5} rx="1" fill="#0ea5e915" stroke="#0ea5e9" strokeWidth="0.2" />
      {/* 세면대 */}
      <rect x={btx + 2} y={roomY + 2} width={4} height={3} rx="0.5" fill="#0ea5e912" stroke="#0ea5e9" strokeWidth="0.25" />
      <circle cx={btx + 4} cy={roomY + 3.5} r="1" fill="none" stroke="#0ea5e9" strokeWidth="0.2" />
      {/* 샤워부스 */}
      {bathW > 12 && <rect x={btx + bathW - 7} y={roomY + 2} width={5} height={roomH * 0.5} rx="0.5" fill="#0ea5e908" stroke="#0ea5e9" strokeWidth="0.25" strokeDasharray="1.5 1" />}
      {/* 문 스윙 */}
      <path d={`M ${btx + bathW/2} ${roomY} A 5 5 0 0 1 ${btx + bathW/2 + 5} ${roomY + 5}`} fill="none" stroke="#0ea5e9" strokeWidth="0.3" strokeDasharray="1 1" />

      {/* ━━━ 현관 ━━━ */}
      <rect x={x + w/2 - 6} y={y + h - 3} width={12} height={3.5} fill={`${color}40`} rx="0.5" />
      <text x={x + w/2} y={y + h + 1} fontSize="3" textAnchor="middle" fill={color} opacity="0.6">현관</text>
      {/* 현관문 스윙 */}
      <path d={`M ${x + w/2 + 6} ${y + h} A 10 10 0 0 1 ${x + w/2 - 4} ${y + h + 10}`} fill="none" stroke={color} strokeWidth="0.3" strokeDasharray="1.5 1" />

      {/* ━━━ 라벨 ━━━ */}
      <text x={x + w/2} y={y + h + 12} fontSize="6.5" textAnchor="middle" fill={color} fontWeight="600">{label}</text>
      <text x={x + w/2} y={y + h + 19} fontSize="5" textAnchor="middle" fill={color} opacity="0.7">{area}㎡</text>
    </g>
  )
}

// 코어 (EV 2대 + 계단실)
function CoreBlock({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const evW = Math.round(w * 0.35)
  const stairW = w - evW * 2 - 4
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="#47556920" stroke="#475569" strokeWidth="1.5" rx="1" />
      <rect x={x + 2} y={y + 2} width={evW} height={h - 4} fill="#334155" rx="1" />
      <text x={x + 2 + evW/2} y={y + h/2 + 1} fontSize="5" textAnchor="middle" fill="white" fontWeight="500">EV1</text>
      <rect x={x + evW + 3} y={y + 2} width={evW} height={h - 4} fill="#334155" rx="1" />
      <text x={x + evW + 3 + evW/2} y={y + h/2 + 1} fontSize="5" textAnchor="middle" fill="white" fontWeight="500">EV2</text>
      <rect x={x + evW * 2 + 4} y={y + 2} width={stairW} height={h - 4} fill="#475569" rx="1" />
      {Array.from({ length: Math.floor((h - 6) / 3) }, (_, i) => (
        <line key={i} x1={x + evW * 2 + 5} y1={y + 3 + i * 3} x2={x + w - 2} y2={y + 3 + i * 3} stroke="#94a3b8" strokeWidth="0.3" />
      ))}
      <text x={x + evW * 2 + 4 + stairW/2} y={y + h/2 + 1} fontSize="4.5" textAnchor="middle" fill="white">계단</text>
    </g>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 메인 컴포넌트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function FloorPlan({ type, floor, totalFloors, strategy = "profitability", zoneType, units = 0, gfa = 0, buildingCount, siteArea, coverage, originalType }: FloorPlanProps) {
  const isGF = floor === 1
  const isTop = floor === totalFloors

  // ━━━ building-geometry 연동: 실제 건물 비율 계산 ━━━
  const geoRatio = (() => {
    if (!siteArea || !coverage) return null
    try {
      const geo = getBuildingDimensionsInMeters({
        type, coverage, siteArea, floors: totalFloors,
        buildingCount, originalType,
      })
      if (geo.blocks.length === 1) {
        return geo.blocks[0].w / geo.blocks[0].d  // w:d 비율
      }
      // 복합 블록: 바운딩 박스 비율
      const minX = Math.min(...geo.blocks.map(b => b.x - b.w / 2))
      const maxX = Math.max(...geo.blocks.map(b => b.x + b.w / 2))
      const minZ = Math.min(...geo.blocks.map(b => b.z - b.d / 2))
      const maxZ = Math.max(...geo.blocks.map(b => b.z + b.d / 2))
      return (maxX - minX) / Math.max(maxZ - minZ, 0.01)
    } catch { return null }
  })()

  // 클러스터: 동당 세대수로 계산
  const bc = buildingCount && buildingCount > 1 ? buildingCount : 1
  const buildingUnits = Math.ceil((units || 0) / bc)

  // 용도지역 + 규모 → 건물 용도 세분화
  const bUse: 'house' | 'villa' | 'apartment' | 'commercial' = (() => {
    const u = buildingUnits || 0
    if (!zoneType) {
      if (totalFloors <= 3 && u <= 2) return 'house'
      if (totalFloors <= 5 && u <= 20) return 'villa'
      return 'apartment'
    }
    // 상업/준주거 → 상가복합
    if (zoneType.includes('commercial') || zoneType === 'semi-residential') return 'commercial'
    // 전용주거 — 세대수로 세분화 (13세대는 villa)
    if (zoneType.includes('exclusive-1')) {
      if (u <= 2) return 'house'
      return 'villa'
    }
    if (zoneType.includes('exclusive-2')) {
      if (u <= 2) return 'house'
      if (u <= 20) return 'villa'
      return 'apartment'
    }
    // 일반주거 → 규모로 세분화
    if (zoneType === 'residential-1') {
      if (totalFloors <= 3 && u <= 2) return 'house'
      return 'villa'
    }
    if (zoneType === 'residential-2') {
      if (totalFloors <= 3 && u <= 2) return 'house'
      if (totalFloors <= 5 && u <= 20) return 'villa'
      return 'apartment'
    }
    return 'apartment'
  })()

  const allowComm = bUse === 'apartment' || bUse === 'commercial'
  const gfL = allowComm ? '상가' : '세대'
  const gfC = allowComm ? '#f59e0b' : '#22c55e'
  const gfF = allowComm ? '#f59e0b15' : '#22c55e15'

  const tU = buildingUnits || 10
  const residentialFloors = Math.max(totalFloors - 1, 1) // 1층 제외
  const upU = Math.max(Math.ceil(tU / residentialFloors), 1) // 층당 세대수
  const gfU = totalFloors > 1 ? Math.min(Math.max(Math.floor(upU * 0.6), 2), upU) : tU // 1층은 적게
  const curU = isGF ? gfU : upU
  const tGFA = (gfa || (tU * 59)) / bc
  const uA = Math.round(tGFA / Math.max(tU, 1))
  // 다중 블록에서 블록당 면적 (중정형 등에서 1세대가 3블록에 걸칠 때)
  const blockCount = (() => { try { const { getBuildingDimensionsInMeters } = require('@/lib/building-geometry'); return getBuildingDimensionsInMeters({ type, coverage, siteArea, floors: totalFloors }).blocksInMeters.length } catch { return 1 } })()
  const blockArea = blockCount > 1 && tU <= blockCount ? Math.round(uA / blockCount) : uA

  const gc = () => {
    switch (strategy) {
      case "view-priority": return { p: "#0ea5e9", s: "#0ea5e920" }
      case "privacy-priority": return { p: "#8b5cf6", s: "#8b5cf620" }
      case "area-maximize": return { p: "#f59e0b", s: "#f59e0b20" }
      case "parking-efficient": return { p: "#64748b", s: "#64748b20" }
      case "profitability": return { p: "#22c55e", s: "#22c55e20" }
      case "livability": return { p: "#ec4899", s: "#ec489920" }
      default: return { p: "#3b82f6", s: "#3b82f620" }
    }
  }
  const c = gc()

  const clusterPrefix = bc > 1 ? '동A ' : ''
  const desc = isGF 
    ? bUse === 'house' ? `${clusterPrefix}1층 (거실+주방+현관)` 
    : bUse === 'villa' ? `${clusterPrefix}1층 (${gfU}세대+현관홀+주차)` 
    : bUse === 'commercial' ? `${clusterPrefix}1층 (${gfU}상가+코어+주차)` 
    : `${clusterPrefix}1층 (${gfU}${gfL}+로비)` 
    : isTop ? `${clusterPrefix}${floor}층 (최상층)` : `${clusterPrefix}${floor}층 (기준층 ${curU}세대)`
  const sL = strategy === "view-priority" ? "조망형" : strategy === "privacy-priority" ? "프라이버시형" : strategy === "area-maximize" ? "면적형" : strategy === "parking-efficient" ? "주차형" : strategy === "profitability" ? "사업성형" : "실거주형"

  // ━━━ SVG viewBox를 building-geometry 비율에 맞게 조정 ━━━
  // 기본 viewBox는 300×220 (약 1.36:1)
  // geoRatio가 이보다 크면 가로로 넓히고, 작으면 세로로 늘림
  const baseRatio = 300 / 220  // ≈ 1.36
  const effectiveRatio = geoRatio || baseRatio
  let vbW = 300, vbH = 220
  if (effectiveRatio > baseRatio * 1.1) {
    // 가로로 더 넓은 건물 → viewBox 높이 축소
    vbH = Math.round(300 / effectiveRatio)
  } else if (effectiveRatio < baseRatio * 0.7) {
    // 세로로 더 긴 건물 → viewBox 너비 축소
    vbW = Math.round(220 * effectiveRatio)
  }

  return (
    <svg viewBox={`0 0 ${vbW} ${vbH}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet" style={{ display: 'block', maxWidth: '100%', maxHeight: '100%' }}>
      <defs>
        <pattern id="fp-grid" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.15" className="text-border" />
        </pattern>
      </defs>
      <rect x="0" y="0" width={vbW} height={vbH} fill="url(#fp-grid)" />

      {/* TOWER */}
      {type === "tower" && !isGF && (() => {
        // building-geometry 비율 적용: 3D와 동일한 가로:세로
        const maxW = 250, maxH = 170, ox = 25, oy = 10
        const ratio = geoRatio || 1.2
        let bW: number, bH: number
        if (ratio >= 1) {
          bW = maxW; bH = Math.round(maxW / ratio)
          if (bH > maxH) { bH = maxH; bW = Math.round(maxH * ratio) }
        } else {
          bH = maxH; bW = Math.round(maxH * ratio)
          if (bW > maxW) { bW = maxW; bH = Math.round(maxW / ratio) }
        }
        const adjOx = ox + (maxW - bW) / 2
        const adjOy = oy + (maxH - bH) / 2
        // 이하 모든 좌표에 adjusted offset 적용
        const bx = adjOx, by = adjOy
        const n = Math.min(curU, 4)
        const cW = 50, cH = 28, cX = bx + bW/2 - cW/2, cY = by + bH/2 - cH/2
        const corrH = 14, corrY = cY + cH
        return (<g>
          <rect x={bx} y={by} width={bW} height={bH} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-foreground" />
          <rect x={bx + 5} y={corrY} width={bW - 10} height={corrH} fill="#64748b10" stroke="#64748b" strokeWidth="0.5" strokeDasharray="2 1" />
          <text x={bx + bW/2} y={corrY + corrH/2 + 2} fontSize="5" textAnchor="middle" fill="#94a3b8">복도</text>
          <CoreBlock x={cX} y={cY} w={cW} h={cH} />
          {n >= 2 ? (<>
            <UnitInterior x={bx + 5} y={by + 5} w={(bW - 14)/2} h={cY - by - 8} label="A호" area={uA} color={c.p} />
            <UnitInterior x={bx + 5 + (bW - 14)/2 + 4} y={by + 5} w={(bW - 14)/2} h={cY - by - 8} label="B호" area={uA} color={c.p} mirror />
          </>) : (<UnitInterior x={bx + 5} y={by + 5} w={bW - 10} h={cY - by - 8} label="A호" area={uA} color={c.p} />)}
          {n >= 4 ? (<>
            <UnitInterior x={bx + 5} y={corrY + corrH + 3} w={(bW - 14)/2} h={by + bH - corrY - corrH - 8} label="C호" area={uA} color={c.p} />
            <UnitInterior x={bx + 5 + (bW - 14)/2 + 4} y={corrY + corrH + 3} w={(bW - 14)/2} h={by + bH - corrY - corrH - 8} label="D호" area={uA} color={c.p} mirror />
          </>) : n >= 3 ? (<UnitInterior x={bx + 5} y={corrY + corrH + 3} w={bW - 10} h={by + bH - corrY - corrH - 8} label="C호" area={uA} color={c.p} />) : null}
          {n > 4 && <text x={bx + bW/2} y={by + bH - 3} fontSize="6" textAnchor="middle" fill={c.p}>+ {curU - 4}세대</text>}
        </g>)
      })()}

      {type === "tower" && isGF && (() => {
        const ox = 25, oy = 10, bW = 250, bH = 170

        // 단독주택: 거실+주방+안방+욕실+현관
        if (bUse === 'house') return (<g>
          <rect x={ox} y={oy} width={bW} height={bH} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-foreground" />
          <rect x={ox+5} y={oy+5} width={bW*0.55-5} height={bH*0.55} fill="#f0fdf4" stroke="#22c55e" strokeWidth="1" rx="1" />
          <text x={ox+bW*0.275} y={oy+bH*0.28+3} fontSize="8" textAnchor="middle" fill="#22c55e" fontWeight="600">거실</text>
          <rect x={ox+bW*0.55} y={oy+5} width={bW*0.45-5} height={bH*0.55} fill="#fef3c7" stroke="#f59e0b" strokeWidth="1" rx="1" />
          <text x={ox+bW*0.775} y={oy+bH*0.28+3} fontSize="8" textAnchor="middle" fill="#d97706" fontWeight="600">주방/식당</text>
          <rect x={ox+5} y={oy+bH*0.55+5} width={bW*0.4} height={bH*0.45-10} fill="#eff6ff" stroke="#3b82f6" strokeWidth="1" rx="1" />
          <text x={ox+5+bW*0.2} y={oy+bH*0.77} fontSize="8" textAnchor="middle" fill="#3b82f6" fontWeight="600">안방</text>
          <rect x={ox+bW*0.4+8} y={oy+bH*0.55+5} width={bW*0.28} height={bH*0.45-10} fill="#e0f2fe" stroke="#0ea5e9" strokeWidth="1" rx="1" />
          <text x={ox+bW*0.4+8+bW*0.14} y={oy+bH*0.77} fontSize="7" textAnchor="middle" fill="#0ea5e9">욕실</text>
          <rect x={ox+bW*0.68+10} y={oy+bH*0.55+5} width={bW*0.32-15} height={bH*0.22} fill="#f1f5f9" stroke="#64748b" strokeWidth="1" rx="1" />
          <text x={ox+bW*0.84} y={oy+bH*0.66} fontSize="7" textAnchor="middle" fill="#64748b">현관</text>
          <rect x={ox+bW*0.68+10} y={oy+bH*0.55+5+bH*0.22+3} width={bW*0.32-15} height={bH*0.23-13} fill="#f5f3ff" stroke="#8b5cf6" strokeWidth="1" rx="1" />
          <text x={ox+bW*0.84} y={oy+bH*0.88} fontSize="6" textAnchor="middle" fill="#8b5cf6">다용도</text>
          <rect x={ox+bW/2-10} y={oy+bH-4} width={20} height={5} fill="#2dd4bf" rx="1" />
          <text x={ox+bW/2} y={oy+bH+8} fontSize="6" textAnchor="middle" fill="#2dd4bf">현관</text>
        </g>)

        // 빌라/다세대: 세대+현관홀+주차
        if (bUse === 'villa') {
          const n = Math.min(gfU, 3)
          const uw = Math.floor((bW - 10) / n)
          return (<g>
            <rect x={ox} y={oy} width={bW} height={bH} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-foreground" />
            {Array.from({ length: n }, (_, i) => (
              <UnitInterior key={i} x={ox+5+i*uw} y={oy+5} w={uw-4} h={80} label={`${String.fromCharCode(65+i)}호`} area={uA} color={c.p} mirror={i%2===1} compact={uw<55} />
            ))}
            <CoreBlock x={ox+bW/2-25} y={oy+92} w={50} h={22} />
            <rect x={ox+5} y={oy+120} width={bW-10} height={40} fill="#64748b08" stroke="#64748b" strokeWidth="0.8" strokeDasharray="3 2" rx="2" />
            <text x={ox+bW/2} y={oy+143} fontSize="7" textAnchor="middle" fill="#64748b">주차장</text>
            <rect x={ox+bW/2-10} y={oy+bH-4} width={20} height={5} fill="#2dd4bf" rx="1" />
          </g>)
        }

        // 상업형: 상가(대)+코어+주차
        if (bUse === 'commercial') {
          const gN = Math.min(gfU, 4)
          const sw = Math.floor((bW - 10) / gN)
          return (<g>
            <rect x={ox} y={oy} width={bW} height={bH} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-foreground" />
            {Array.from({ length: gN }, (_, i) => {
              const sx = ox+5+i*sw
              return <g key={i}><rect x={sx} y={oy+5} width={sw-4} height={70} fill="#f59e0b15" stroke="#f59e0b" strokeWidth="1" rx="1" /><text x={sx+(sw-4)/2} y={oy+40} fontSize="8" textAnchor="middle" fill="#d97706" fontWeight="600">상가 {i+1}</text></g>
            })}
            <CoreBlock x={ox+bW/2-25} y={oy+82} w={50} h={25} />
            <rect x={ox+5} y={oy+115} width={bW-10} height={45} fill="#64748b08" stroke="#64748b" strokeWidth="0.8" strokeDasharray="3 2" rx="2" />
            <text x={ox+bW/2} y={oy+140} fontSize="7" textAnchor="middle" fill="#64748b">주차장</text>
            <rect x={ox+bW/2-10} y={oy+bH-4} width={20} height={5} fill="#2dd4bf" rx="1" />
            <text x={ox+bW/2} y={oy+bH+8} fontSize="6" textAnchor="middle" fill="#2dd4bf">주출입구</text>
          </g>)
        }

        // 아파트 (기본): 로비+상가+코어+주차
        const gN = Math.min(gfU, 4)
        const sw = Math.floor((bW - 10) / (gN + 1)), li = Math.floor(gN / 2)
        return (<g>
          <rect x={ox} y={oy} width={bW} height={bH} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-foreground" />
          {Array.from({ length: gN + 1 }, (_, i) => {
            const sx = ox + 5 + i * sw, sw2 = sw - 4
            if (i === li) return (<g key="l"><rect x={sx} y={oy + 5} width={sw2} height={50} fill="#06b6d415" stroke="#06b6d4" strokeWidth="1.5" rx="1" /><text x={sx + sw2/2} y={oy + 28} fontSize="8" textAnchor="middle" fill="#06b6d4" fontWeight="600">로비</text><rect x={sx + sw2/2 - 6} y={oy + 50} width={12} height={3} fill="#06b6d4" rx="0.5" /></g>)
            return (<g key={`g${i}`}><rect x={sx} y={oy + 5} width={sw2} height={50} fill={gfF} stroke={gfC} strokeWidth="1" rx="1" /><text x={sx + sw2/2} y={oy + 30} fontSize="7" textAnchor="middle" fill={gfC} fontWeight="500">{gfL}</text></g>)
          })}
          <CoreBlock x={ox + bW/2 - 25} y={oy + 62} w={50} h={25} />
          <rect x={ox + 5} y={oy + 95} width={bW - 10} height={55} fill="#64748b08" stroke="#64748b" strokeWidth="0.8" strokeDasharray="3 2" rx="2" />
          {Array.from({ length: 5 }, (_, i) => (<g key={`p${i}`}><rect x={ox + 15 + i * 45} y={oy + 105} width={35} height={18} fill="none" stroke="#64748b" strokeWidth="0.4" /><text x={ox + 32 + i * 45} y={oy + 117} fontSize="4" textAnchor="middle" fill="#94a3b8">P{i+1}</text></g>))}
          <text x={ox + bW/2} y={oy + 145} fontSize="7" textAnchor="middle" fill="#64748b">주차장</text>
          <rect x={ox + bW/2 - 10} y={oy + bH - 4} width={20} height={5} fill="#2dd4bf" rx="1" />
          <text x={ox + bW/2} y={oy + bH + 8} fontSize="6" textAnchor="middle" fill="#2dd4bf">주출입구</text>
        </g>)
      })()}

      {/* COURTYARD */}
      {/* L-SHAPE — building-geometry 블록 데이터 기반 */}
      {type === "lshape" && (() => {
        // building-geometry에서 실제 블록 좌표 가져오기
        const geo = (siteArea && coverage) ? getBuildingDimensionsInMeters({
          type: 'lshape', coverage, siteArea, floors: totalFloors, buildingCount, originalType
        }) : null
        
        const pad = 15
        const availW = vbW - pad * 2, availH = vbH - pad * 2
        
        if (geo && geo.blocksInMeters && geo.blocksInMeters.length >= 2) {
          // 실제 블록 데이터로 그리기
          const bm = geo.blocksInMeters
          const minX = Math.min(...bm.map(b => b.centerXM - b.widthM / 2))
          const maxX = Math.max(...bm.map(b => b.centerXM + b.widthM / 2))
          const minZ = Math.min(...bm.map(b => b.centerZM - b.depthM / 2))
          const maxZ = Math.max(...bm.map(b => b.centerZM + b.depthM / 2))
          const totalW = maxX - minX, totalD = maxZ - minZ
          const scale = Math.min(availW / totalW, availH / totalD) * 0.85
          const offX = pad + (availW - totalW * scale) / 2
          const offZ = pad + (availH - totalD * scale) / 2
          
          const toSvg = (cx: number, cz: number, w: number, d: number) => ({
            x: offX + (cx - w / 2 - minX) * scale,
            y: offZ + (cz - d / 2 - minZ) * scale,
            w: w * scale, h: d * scale,
          })
          
          return (<g>
            {bm.map((b, i) => {
              const r = toSvg(b.centerXM, b.centerZM, b.widthM, b.depthM)
              return (<g key={i}>
                <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-foreground" />
                {isGF ? (<g>
                  <rect x={r.x + 3} y={r.y + 3} width={r.w - 6} height={r.h - 6} fill={gfF} stroke={gfC} strokeWidth="1" rx="1" />
                  {/* 1F 상세: 상가 유닛 구분 */}
                  {r.w > r.h ? (
                    // 가로 블록 — 상가 유닛 나눔
                    Array.from({ length: Math.min(3, Math.floor(r.w / 25)) }, (_, si) => {
                      const uw = (r.w - 8) / Math.min(3, Math.floor(r.w / 25))
                      return (<g key={`shop-${si}`}>
                        <rect x={r.x + 4 + si * uw} y={r.y + 4} width={uw - 2} height={r.h - 8} fill={`${gfC}08`} stroke={gfC} strokeWidth="0.4" strokeDasharray="2 1" />
                        <text x={r.x + 4 + si * uw + (uw - 2) / 2} y={r.y + r.h / 2} fontSize="5" textAnchor="middle" fill={gfC}>{gfL}{si + 1}</text>
                        {/* 쇼윈도 마크 */}
                        <rect x={r.x + 6 + si * uw} y={r.y + r.h - 5} width={uw - 6} height={2} fill={gfC} opacity="0.3" rx="0.5" />
                      </g>)
                    })
                  ) : (
                    // 세로 블록 — 로비 + 출입구
                    <g>
                      <rect x={r.x + 4} y={r.y + 4} width={r.w - 8} height={r.h * 0.4} fill="#06b6d410" stroke="#06b6d4" strokeWidth="0.5" rx="1" />
                      <text x={r.x + r.w / 2} y={r.y + r.h * 0.2 + 2} fontSize="5.5" textAnchor="middle" fill="#06b6d4" fontWeight="500">로비</text>
                      {/* 로비 데스크 */}
                      <rect x={r.x + r.w / 2 - 5} y={r.y + r.h * 0.3} width={10} height={3} rx="1" fill="#06b6d420" stroke="#06b6d4" strokeWidth="0.3" />
                      {/* 우편함 */}
                      {r.w > 30 && <rect x={r.x + 6} y={r.y + 6} width={4} height={8} fill="#06b6d415" stroke="#06b6d4" strokeWidth="0.2" rx="0.5" />}
                      {/* 하단 상가 */}
                      <rect x={r.x + 4} y={r.y + r.h * 0.45} width={r.w - 8} height={r.h * 0.5} fill={`${gfC}08`} stroke={gfC} strokeWidth="0.4" />
                      <text x={r.x + r.w / 2} y={r.y + r.h * 0.72} fontSize="5" textAnchor="middle" fill={gfC}>{gfL}</text>
                      {/* 출입구 */}
                      <rect x={r.x + r.w / 2 - 5} y={r.y + r.h - 4} width={10} height={4} fill="#2dd4bf40" rx="0.5" />
                    </g>
                  )}
                </g>) : (
                  (() => {
                    // 날개 방향에 따라 세대 배치
                    const isVert = r.h > r.w
                    const nUnits = Math.ceil(curU / bm.length)
                    if (isVert) {
                      const uh = (r.h - 6) / Math.max(nUnits, 1)
                      return Array.from({ length: Math.min(nUnits, 4) }, (_, j) => (
                        <UnitInterior key={j} x={r.x + 3} y={r.y + 3 + j * uh} w={r.w - 6} h={uh - 3}
                          label={`${String.fromCharCode(65 + i * 4 + j)}호`} area={blockArea} color={c.p} compact={uh < 20} />
                      ))
                    } else {
                      const uw = (r.w - 6) / Math.max(nUnits, 1)
                      return Array.from({ length: Math.min(nUnits, 4) }, (_, j) => (
                        <UnitInterior key={j} x={r.x + 3 + j * uw} y={r.y + 3} w={uw - 3} h={r.h - 6}
                          label={`${String.fromCharCode(65 + i * 4 + j)}호`} area={blockArea} color={c.p} compact={uw < 20} />
                      ))
                    }
                  })()
                )}
                {isGF && i === 0 && <text x={r.x + r.w / 2} y={r.y - 3} fontSize="5" textAnchor="middle" fill={gfC} opacity="0.6">세대동</text>}
              </g>)
            })}
            {/* 코어 — 교차점 위치 */}
            <CoreBlock x={offX + (bm[0].centerXM - bm[0].widthM / 2 - minX) * scale} y={offZ + (bm[1].centerZM - bm[1].depthM / 2 - minZ) * scale} w={Math.min(30, bm[0].widthM * scale * 0.8)} h={Math.min(25, bm[1].depthM * scale * 0.8)} />
          </g>)
        }
        
        // fallback: 기존 하드코딩
        const ox = 20, oy = 8
        return (<g>
          <rect x={ox} y={oy} width={80} height={130} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-foreground" />
          <rect x={ox} y={oy + 130} width={260} height={50} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-foreground" />
          {isGF ? (<>
            <CoreBlock x={ox + 5} y={oy + 135} w={35} h={40} />
            <rect x={ox + 45} y={oy + 135} width={210} height={40} fill="#64748b08" stroke="#64748b" strokeWidth="0.8" strokeDasharray="3" rx="1" />
            <text x={ox + 150} y={oy + 158} fontSize="8" textAnchor="middle" fill="#64748b">주차장</text>
          </>) : (<>
            {(() => { const vN = Math.ceil(curU / 2), vh = Math.floor(120 / Math.max(vN, 1)); return Array.from({ length: Math.min(vN, 3) }, (_, i) => (<UnitInterior key={`v${i}`} x={ox + 3} y={oy + 3 + i * vh} w={74} h={vh - 4} label={`${String.fromCharCode(65 + i)}호`} area={uA} color={c.p} compact={vh < 20} />)) })()}
            <CoreBlock x={ox + 5} y={oy + 135} w={35} h={40} />
            {(() => { const vN = Math.ceil(curU / 2), hN = curU - vN, hw = Math.floor(210 / Math.max(hN, 1)); return Array.from({ length: Math.min(hN, 4) }, (_, i) => (<UnitInterior key={`h${i}`} x={ox + 45 + i * hw} y={oy + 135} w={hw - 4} h={40} label={`${String.fromCharCode(65 + vN + i)}호`} area={uA} color={c.p} compact />)) })()}
          </>)}
        </g>)
      })()}

      {/* LINEAR */}
      {type === "linear" && (() => {
        const ox = 10, oy = 30, bW = 280, bH = 130
        return (<g>
          <rect x={ox} y={oy} width={bW} height={bH} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-foreground" />
          {isGF ? (<>
            {Array.from({ length: Math.min(gfU + 1, 6) }, (_, i) => { const sw = Math.floor((bW - 10) / Math.min(gfU + 1, 6)), li = Math.floor(gfU / 2); if (i === li) return <g key="l"><rect x={ox + 5 + i * sw} y={oy + 5} width={sw - 4} height={45} fill="#06b6d415" stroke="#06b6d4" strokeWidth="1.5" rx="1" /><text x={ox + 5 + i * sw + (sw-4)/2} y={oy + 30} fontSize="7" textAnchor="middle" fill="#06b6d4" fontWeight="600">로비</text></g>; return <g key={`g${i}`}><rect x={ox + 5 + i * sw} y={oy + 5} width={sw - 4} height={45} fill={gfF} stroke={gfC} strokeWidth="1" rx="1" /><text x={ox + 5 + i * sw + (sw-4)/2} y={oy + 30} fontSize="7" textAnchor="middle" fill={gfC}>{gfL}</text></g> })}
            <rect x={ox + 5} y={oy + 55} width={bW - 10} height={65} fill="#64748b08" stroke="#64748b" strokeWidth="0.8" strokeDasharray="3" rx="1" />
            <text x={ox + bW/2} y={oy + 92} fontSize="8" textAnchor="middle" fill="#64748b">주차장</text>
            <rect x={ox + bW/2 - 10} y={oy + bH - 4} width={20} height={5} fill="#2dd4bf" rx="1" />
          </>) : (<>
            {(() => { const n = Math.min(curU, 5), uw = Math.floor((bW - 10) / n); return Array.from({ length: n }, (_, i) => (<UnitInterior key={i} x={ox + 5 + i * uw} y={oy + 5} w={uw - 4} h={85} label={`${String.fromCharCode(65 + i)}호`} area={uA} color={c.p} mirror={i % 2 === 1} compact={uw < 25} />)) })()}
            {curU > 5 && <text x={ox + bW/2} y={oy + 98} fontSize="6" textAnchor="middle" fill={c.p}>+ {curU - 5}세대</text>}
            <rect x={ox + 5} y={oy + 95} width={bW - 10} height={28} fill="#64748b10" stroke="#64748b" strokeWidth="0.5" />
            <CoreBlock x={ox + bW/2 - 25} y={oy + 98} w={50} h={22} />
          </>)}
        </g>)
      })()}

      {/* CLUSTER — building-geometry 블록 데이터 기반 */}
      {(type === "cluster" || type === "courtyard") && (() => {
        const geo = (siteArea && coverage) ? getBuildingDimensionsInMeters({
          type, coverage, siteArea, floors: totalFloors, buildingCount, originalType
        }) : null
        
        const pad = 15
        const availW = vbW - pad * 2, availH = vbH - pad * 2
        
        if (geo && geo.blocksInMeters && geo.blocksInMeters.length >= 1) {
          const bm = geo.blocksInMeters
          const minX = Math.min(...bm.map(b => b.centerXM - b.widthM / 2))
          const maxX = Math.max(...bm.map(b => b.centerXM + b.widthM / 2))
          const minZ = Math.min(...bm.map(b => b.centerZM - b.depthM / 2))
          const maxZ = Math.max(...bm.map(b => b.centerZM + b.depthM / 2))
          const totalW = maxX - minX, totalD = maxZ - minZ
          const scale = Math.min(availW / Math.max(totalW, 1), availH / Math.max(totalD, 1)) * 0.85
          const offX = pad + (availW - totalW * scale) / 2
          const offZ = pad + (availH - totalD * scale) / 2
          
          const toSvg = (cx: number, cz: number, w: number, d: number) => ({
            x: offX + (cx - w / 2 - minX) * scale,
            y: offZ + (cz - d / 2 - minZ) * scale,
            w: w * scale, h: d * scale,
          })
          
          const unitsPerBlock = Math.max(1, Math.ceil(curU / bm.length))
          
          return (<g>
            {bm.map((b, i) => {
              const r = toSvg(b.centerXM, b.centerZM, b.widthM, b.depthM)
              const isVert = r.h > r.w * 1.3
              return (<g key={i}>
                <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-foreground" />
                {isGF ? (
                  <><rect x={r.x + 3} y={r.y + 3} width={r.w - 6} height={r.h - 6} fill={gfF} stroke={gfC} strokeWidth="1" rx="1" />
                  <text x={r.x + r.w/2} y={r.y + r.h/2 + 3} fontSize="7" textAnchor="middle" fill={gfC}>{b.label || `${String.fromCharCode(65+i)}동`}</text></>
                ) : (
                  (() => {
                    const n = Math.min(unitsPerBlock, isVert ? 3 : 4)
                    if (isVert) {
                      const uh = (r.h - 6) / n
                      return Array.from({ length: n }, (_, j) => (
                        <UnitInterior key={j} x={r.x + 3} y={r.y + 3 + j * uh} w={r.w - 6} h={uh - 3}
                          label={`${String.fromCharCode(65 + i * n + j)}호`} area={blockArea} color={c.p} compact={uh < 20 || r.w - 6 < 20} />
                      ))
                    }
                    const uw = (r.w - 6) / n
                    return Array.from({ length: n }, (_, j) => (
                      <UnitInterior key={j} x={r.x + 3 + j * uw} y={r.y + 3} w={uw - 3} h={r.h - 6}
                        label={`${String.fromCharCode(65 + i * n + j)}호`} area={blockArea} color={c.p} compact={uw < 20 || r.h - 6 < 20} />
                    ))
                  })()
                )}
              </g>)
            })}
            {/* 중앙 정원/마당 (ㄷ자/클러스터) */}
            {type === "courtyard" && bm.length >= 3 && (() => {
              const r0 = toSvg(bm[0].centerXM, bm[0].centerZM, bm[0].widthM, bm[0].depthM)
              const gardenY = r0.y + r0.h + 2
              const gardenH = (offZ + totalD * scale) - gardenY - 5
              return gardenH > 10 ? (
                <rect x={r0.x + 5} y={gardenY} width={r0.w - 10} height={gardenH} fill="#22c55e08" stroke="#22c55e" strokeWidth="1" strokeDasharray="3" rx="2" />
              ) : null
            })()}
          </g>)
        }
        
        // fallback: 기존 하드코딩 (siteArea/coverage 없을 때)
        if (type === "courtyard") {
          const ox = 15, oy = 10
          return (<g>
            <rect x={ox} y={oy} width={260} height={40} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-foreground" />
            <rect x={ox} y={oy + 45} width={40} height={100} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-foreground" />
            <rect x={ox + 220} y={oy + 45} width={40} height={100} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-foreground" />
            <rect x={ox + 50} y={oy + 55} width={160} height={80} fill="#22c55e08" stroke="#22c55e" strokeWidth="1" strokeDasharray="3" rx="2" />
            <text x={ox + 130} y={oy + 100} fontSize="9" textAnchor="middle" fill="#22c55e">중앙 마당</text>
          </g>)
        }
        // cluster fallback
        const ox = 20, oy = 10
        return (<g>
          <rect x={ox} y={oy} width={100} height={70} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-foreground" />
          <rect x={ox + 160} y={oy} width={100} height={70} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-foreground" />
          {!isGF && (<>
            <UnitInterior x={ox + 3} y={oy + 3} w={46} h={64} label="A호" area={uA} color={c.p} compact />
            <UnitInterior x={ox + 52} y={oy + 3} w={46} h={64} label="B호" area={uA} color={c.p} compact />
            <UnitInterior x={ox + 163} y={oy + 3} w={46} h={64} label="C호" area={uA} color={c.p} compact />
            <UnitInterior x={ox + 212} y={oy + 3} w={46} h={64} label="D호" area={uA} color={c.p} compact />
          </>)}
          <rect x={ox + 40} y={oy + 85} width={180} height={70} fill="#22c55e08" stroke="#22c55e" strokeWidth="1" strokeDasharray="3" rx="2" />
          <text x={ox + 130} y={oy + 122} fontSize="9" textAnchor="middle" fill="#22c55e">중앙 정원</text>
        </g>)
      })()}

      <text x="10" y={vbH - 5} fontSize="9" fill="currentColor" className="text-foreground" fontWeight="500">{desc}</text>
      <text x={vbW - 10} y={vbH - 5} fontSize="7" textAnchor="end" fill={c.p}>{sL}</text>
    </svg>
  )
}
