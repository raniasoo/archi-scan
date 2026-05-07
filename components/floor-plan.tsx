"use client"

import React from "react"
import type { DesignStrategy } from "@/lib/design-strategy"

interface FloorPlanProps {
  type: "tower" | "courtyard" | "lshape" | "linear" | "cluster"
  floor: number
  totalFloors: number
  strategy?: DesignStrategy
  zoneType?: string
  units?: number
  gfa?: number
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 세대 내부 실 배치 헬퍼
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function UnitInterior({ x, y, w, h, label, area, color, mirror = false, compact = false }: {
  x: number; y: number; w: number; h: number
  label: string; area: number; color: string; mirror?: boolean; compact?: boolean
}) {
  if (compact || w < 35 || h < 35) {
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} fill={`${color}15`} stroke={color} strokeWidth="1" />
        <text x={x + w/2} y={y + h/2 - 3} fontSize="7" textAnchor="middle" fill={color} fontWeight="600">{label}</text>
        <text x={x + w/2} y={y + h/2 + 7} fontSize="6" textAnchor="middle" fill={color}>{area}㎡</text>
      </g>
    )
  }

  const pad = 1.5
  const innerW = w - pad * 2
  const innerH = h - pad * 2
  const ix = x + pad
  const iy = y + pad
  const livingH = Math.round(innerH * 0.55)
  const kitchenW = Math.round(innerW * 0.35)
  const roomH = innerH - livingH - 1
  const roomY = iy + livingH + 1
  const br1W = Math.round(innerW * 0.4)
  const br2W = Math.round(innerW * 0.35)
  const bathW = innerW - br1W - br2W - 2

  const lx = mirror ? ix + innerW - (innerW - kitchenW - 1) : ix
  const kx = mirror ? ix : ix + innerW - kitchenW
  const r1x = mirror ? ix + innerW - br1W : ix
  const r2x = mirror ? ix + innerW - br1W - br2W - 1 : ix + br1W + 1
  const btx = mirror ? ix : ix + br1W + br2W + 2

  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="none" stroke="currentColor" strokeWidth="2" className="text-foreground" />
      {/* 발코니 */}
      <rect x={x + 2} y={y - 5} width={w - 4} height={5} fill="none" stroke={color} strokeWidth="0.5" strokeDasharray="2 1" />
      <text x={x + w/2} y={y - 1} fontSize="3.5" textAnchor="middle" fill={color} opacity="0.5">발코니</text>
      {/* 거실 */}
      <rect x={lx} y={iy} width={innerW - kitchenW - 1} height={livingH} fill={`${color}08`} stroke={color} strokeWidth="0.5" />
      <text x={lx + (innerW - kitchenW - 1)/2} y={iy + livingH/2} fontSize="6" textAnchor="middle" fill={color} fontWeight="500">거실</text>
      <rect x={lx + 3} y={iy + livingH - 10} width={Math.min(innerW * 0.3, 22)} height={5} rx="1" fill={`${color}20`} stroke={color} strokeWidth="0.3" />
      {/* 주방 */}
      <rect x={kx} y={iy} width={kitchenW} height={livingH} fill={`${color}12`} stroke={color} strokeWidth="0.5" />
      <text x={kx + kitchenW/2} y={iy + livingH/2} fontSize="5" textAnchor="middle" fill={color}>주방</text>
      <rect x={kx + 2} y={iy + 3} width={kitchenW - 4} height={4} rx="1" fill={`${color}30`} stroke={color} strokeWidth="0.3" />
      {/* 방1 */}
      <rect x={r1x} y={roomY} width={br1W} height={roomH} fill={`${color}06`} stroke={color} strokeWidth="0.5" />
      <text x={r1x + br1W/2} y={roomY + roomH/2} fontSize="5" textAnchor="middle" fill={color}>방1</text>
      <rect x={r1x + 3} y={roomY + 3} width={br1W * 0.55} height={roomH * 0.45} rx="1" fill={`${color}12`} stroke={color} strokeWidth="0.2" />
      {/* 방2 */}
      <rect x={r2x} y={roomY} width={br2W} height={roomH} fill={`${color}06`} stroke={color} strokeWidth="0.5" />
      <text x={r2x + br2W/2} y={roomY + roomH/2} fontSize="5" textAnchor="middle" fill={color}>방2</text>
      {/* 욕실 */}
      <rect x={btx} y={roomY} width={bathW} height={roomH} fill="#0ea5e908" stroke="#0ea5e9" strokeWidth="0.5" />
      <text x={btx + bathW/2} y={roomY + roomH/2 - 1} fontSize="4" textAnchor="middle" fill="#0ea5e9">욕실</text>
      <circle cx={btx + bathW/2} cy={roomY + roomH/2 + 5} r="2" fill="#0ea5e920" stroke="#0ea5e9" strokeWidth="0.3" />
      {/* 현관 */}
      <rect x={x + w/2 - 5} y={y + h - 2} width={10} height={3} fill={color} rx="0.5" />
      {/* 라벨 */}
      <text x={x + w/2} y={y + h + 9} fontSize="6.5" textAnchor="middle" fill={color} fontWeight="600">{label} ({area}㎡)</text>
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

export function FloorPlan({ type, floor, totalFloors, strategy = "profitability", zoneType, units = 0, gfa = 0 }: FloorPlanProps) {
  const isGF = floor === 1
  const isTop = floor === totalFloors

  // 용도지역 + 규모 → 건물 용도 세분화
  const bUse: 'house' | 'villa' | 'apartment' | 'commercial' = (() => {
    if (!zoneType) {
      // 용도지역 없으면 규모로 판단
      if (totalFloors <= 3 && (units || 0) <= 4) return 'house'
      if (totalFloors <= 5 && (units || 0) <= 20) return 'villa'
      return 'apartment'
    }
    // 전용주거 → 단독주택
    if (zoneType.includes('exclusive-1')) return 'house'
    if (zoneType.includes('exclusive-2')) return 'villa'
    // 상업/준주거 → 상가복합
    if (zoneType.includes('commercial') || zoneType === 'semi-residential') return 'commercial'
    // 일반주거 → 규모로 세분화
    if (zoneType === 'residential-1') {
      if (totalFloors <= 3 && (units || 0) <= 6) return 'house'
      return 'villa'
    }
    if (zoneType === 'residential-2') {
      if (totalFloors <= 3 && (units || 0) <= 4) return 'house'
      if (totalFloors <= 5 && (units || 0) <= 20) return 'villa'
      return 'apartment'
    }
    // 제3종 이상 → 아파트
    return 'apartment'
  })()

  const allowComm = bUse === 'apartment' || bUse === 'commercial'
  const gfL = allowComm ? '상가' : '세대'
  const gfC = allowComm ? '#f59e0b' : '#22c55e'
  const gfF = allowComm ? '#f59e0b15' : '#22c55e15'

  const tU = units || 10
  const residentialFloors = Math.max(totalFloors - 1, 1) // 1층 제외
  const upU = Math.max(Math.ceil(tU / residentialFloors), 1) // 층당 세대수
  const gfU = totalFloors > 1 ? Math.min(Math.max(Math.floor(upU * 0.6), 2), upU) : tU // 1층은 적게
  const curU = isGF ? gfU : upU
  const tGFA = gfa || (tU * 59)
  const uA = Math.round(tGFA / Math.max(tU, 1))

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

  const desc = isGF 
    ? bUse === 'house' ? `1층 (거실+주방+현관)` 
    : bUse === 'villa' ? `1층 (${gfU}세대+현관홀+주차)` 
    : bUse === 'commercial' ? `1층 (${gfU}상가+코어+주차)` 
    : `1층 (${gfU}${gfL}+로비)` 
    : isTop ? `${floor}층 (최상층)` : `${floor}층 (기준층 ${curU}세대)`
  const sL = strategy === "view-priority" ? "조망형" : strategy === "privacy-priority" ? "프라이버시형" : strategy === "area-maximize" ? "면적형" : strategy === "parking-efficient" ? "주차형" : strategy === "profitability" ? "사업성형" : "실거주형"

  return (
    <svg viewBox="0 0 300 220" className="w-full h-full" preserveAspectRatio="xMidYMid meet" style={{ display: 'block', maxWidth: '100%', maxHeight: '100%' }}>
      <defs>
        <pattern id="fp-grid" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.15" className="text-border" />
        </pattern>
      </defs>
      <rect x="0" y="0" width="300" height="220" fill="url(#fp-grid)" />

      {/* TOWER */}
      {type === "tower" && !isGF && (() => {
        const n = Math.min(curU, 4), ox = 25, oy = 10, bW = 250, bH = 170
        const cW = 50, cH = 28, cX = ox + bW/2 - cW/2, cY = oy + bH/2 - cH/2
        const corrH = 14, corrY = cY + cH
        return (<g>
          <rect x={ox} y={oy} width={bW} height={bH} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-foreground" />
          <rect x={ox + 5} y={corrY} width={bW - 10} height={corrH} fill="#64748b10" stroke="#64748b" strokeWidth="0.5" strokeDasharray="2 1" />
          <text x={ox + bW/2} y={corrY + corrH/2 + 2} fontSize="5" textAnchor="middle" fill="#94a3b8">복도</text>
          <CoreBlock x={cX} y={cY} w={cW} h={cH} />
          {n >= 2 ? (<>
            <UnitInterior x={ox + 5} y={oy + 5} w={(bW - 14)/2} h={cY - oy - 8} label="A호" area={uA} color={c.p} />
            <UnitInterior x={ox + 5 + (bW - 14)/2 + 4} y={oy + 5} w={(bW - 14)/2} h={cY - oy - 8} label="B호" area={uA} color={c.p} mirror />
          </>) : (<UnitInterior x={ox + 5} y={oy + 5} w={bW - 10} h={cY - oy - 8} label="A호" area={uA} color={c.p} />)}
          {n >= 4 ? (<>
            <UnitInterior x={ox + 5} y={corrY + corrH + 3} w={(bW - 14)/2} h={oy + bH - corrY - corrH - 8} label="C호" area={uA} color={c.p} />
            <UnitInterior x={ox + 5 + (bW - 14)/2 + 4} y={corrY + corrH + 3} w={(bW - 14)/2} h={oy + bH - corrY - corrH - 8} label="D호" area={uA} color={c.p} mirror />
          </>) : n >= 3 ? (<UnitInterior x={ox + 5} y={corrY + corrH + 3} w={bW - 10} h={oy + bH - corrY - corrH - 8} label="C호" area={uA} color={c.p} />) : null}
          {n > 4 && <text x={ox + bW/2} y={oy + bH - 3} fontSize="6" textAnchor="middle" fill={c.p}>+ {curU - 4}세대</text>}
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
      {type === "courtyard" && !isGF && (() => {
        const ox = 15, oy = 8, bW = 270, bH = 175, n = Math.min(curU, 6)
        const topN = Math.ceil(n / 2), botN = n - topN, uH = 48
        const courtY = oy + uH + 12, courtH = bH - uH * 2 - 24
        const tw = Math.floor((bW - 10) / topN), bw = botN > 0 ? Math.floor((bW - 10) / botN) : 0
        return (<g>
          <rect x={ox} y={oy} width={bW} height={bH} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-foreground" />
          {Array.from({ length: topN }, (_, i) => (<UnitInterior key={`t${i}`} x={ox + 5 + i * tw} y={oy + 3} w={tw - 4} h={uH} label={`${String.fromCharCode(65 + i)}호`} area={uA} color={c.p} mirror={i % 2 === 1} compact={tw < 55} />))}
          <rect x={ox + 30} y={courtY} width={bW - 60} height={courtH} fill="#22c55e08" stroke="#22c55e" strokeWidth="1" rx="2" />
          <circle cx={ox + bW/2 - 30} cy={courtY + courtH/2} r="8" fill="#22c55e15" stroke="#22c55e" strokeWidth="0.5" />
          <circle cx={ox + bW/2 + 30} cy={courtY + courtH/2} r="8" fill="#22c55e15" stroke="#22c55e" strokeWidth="0.5" />
          <text x={ox + bW/2} y={courtY + courtH/2 + 2} fontSize="8" textAnchor="middle" fill="#22c55e" fontWeight="500">중정</text>
          <CoreBlock x={ox + 3} y={courtY + 5} w={24} h={courtH - 10} />
          {Array.from({ length: botN }, (_, i) => (<UnitInterior key={`b${i}`} x={ox + 5 + i * bw} y={courtY + courtH + 5} w={bw - 4} h={uH} label={`${String.fromCharCode(65 + topN + i)}호`} area={uA} color={c.p} mirror={i % 2 === 0} compact={bw < 55} />))}
        </g>)
      })()}

      {type === "courtyard" && isGF && (() => {
        const ox = 15, oy = 8, bW = 270, bH = 175

        if (bUse === 'house') return (<g>
          <rect x={ox} y={oy} width={bW} height={bH} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-foreground" />
          <rect x={ox+5} y={oy+5} width={bW*0.5-5} height={70} fill="#f0fdf4" stroke="#22c55e" strokeWidth="1" rx="1" />
          <text x={ox+bW*0.25} y={oy+40} fontSize="8" textAnchor="middle" fill="#22c55e" fontWeight="600">거실</text>
          <rect x={ox+bW*0.5} y={oy+5} width={bW*0.5-5} height={70} fill="#fef3c7" stroke="#f59e0b" strokeWidth="1" rx="1" />
          <text x={ox+bW*0.75} y={oy+40} fontSize="8" textAnchor="middle" fill="#d97706" fontWeight="600">주방/식당</text>
          <rect x={ox+35} y={oy+85} width={bW-70} height={45} fill="#22c55e08" stroke="#22c55e" strokeWidth="1" rx="2" />
          <text x={ox+bW/2} y={oy+110} fontSize="8" textAnchor="middle" fill="#22c55e">정원 / 마당</text>
          <rect x={ox+5} y={oy+140} width={bW*0.4} height={30} fill="#eff6ff" stroke="#3b82f6" strokeWidth="1" rx="1" />
          <text x={ox+5+bW*0.2} y={oy+157} fontSize="7" textAnchor="middle" fill="#3b82f6">안방</text>
          <rect x={ox+5+bW*0.4+3} y={oy+140} width={bW*0.25} height={30} fill="#e0f2fe" stroke="#0ea5e9" strokeWidth="1" rx="1" />
          <text x={ox+5+bW*0.4+3+bW*0.125} y={oy+157} fontSize="7" textAnchor="middle" fill="#0ea5e9">욕실</text>
          <rect x={ox+5+bW*0.65+6} y={oy+140} width={bW*0.35-16} height={30} fill="#f1f5f9" stroke="#64748b" strokeWidth="1" rx="1" />
          <text x={ox+bW*0.83} y={oy+157} fontSize="7" textAnchor="middle" fill="#64748b">현관</text>
          <rect x={ox+bW/2-10} y={oy+bH-4} width={20} height={5} fill="#2dd4bf" rx="1" />
        </g>)

        if (bUse === 'villa') {
          const n = Math.min(gfU, 3), uw = Math.floor((bW-10)/n)
          return (<g>
            <rect x={ox} y={oy} width={bW} height={bH} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-foreground" />
            {Array.from({length:n},(_,i) => <UnitInterior key={i} x={ox+5+i*uw} y={oy+5} w={uw-4} h={65} label={`${String.fromCharCode(65+i)}호`} area={uA} color={c.p} mirror={i%2===1} compact={uw<55} />)}
            <rect x={ox+35} y={oy+78} width={bW-70} height={40} fill="#22c55e08" stroke="#22c55e" strokeWidth="1" rx="2" />
            <text x={ox+bW/2} y={oy+100} fontSize="8" textAnchor="middle" fill="#22c55e">중정 / 조경</text>
            <CoreBlock x={ox+5} y={oy+82} w={26} h={30} />
            <rect x={ox+5} y={oy+125} width={bW-10} height={40} fill="#64748b08" stroke="#64748b" strokeWidth="0.8" strokeDasharray="3 2" rx="2" />
            <text x={ox+bW/2} y={oy+148} fontSize="7" textAnchor="middle" fill="#64748b">주차장</text>
            <rect x={ox+bW/2-10} y={oy+bH-4} width={20} height={5} fill="#2dd4bf" rx="1" />
          </g>)
        }

        // 아파트/상업 (기존 레이아웃)
        const gN = Math.min(gfU, 4), sw = Math.floor((bW - 10) / (gN + 1)), li = Math.floor(gN / 2)
        return (<g>
          <rect x={ox} y={oy} width={bW} height={bH} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-foreground" />
          {Array.from({ length: gN + 1 }, (_, i) => { const sx = ox + 5 + i * sw; if (i === li) return <g key="l"><rect x={sx} y={oy + 5} width={sw - 4} height={35} fill="#06b6d415" stroke="#06b6d4" strokeWidth="1.5" rx="1" /><text x={sx + (sw-4)/2} y={oy + 25} fontSize="7" textAnchor="middle" fill="#06b6d4" fontWeight="600">로비</text></g>; return <g key={`g${i}`}><rect x={sx} y={oy + 5} width={sw - 4} height={35} fill={gfF} stroke={gfC} strokeWidth="1" rx="1" /><text x={sx + (sw-4)/2} y={oy + 25} fontSize="7" textAnchor="middle" fill={gfC}>{gfL}</text></g> })}
          <rect x={ox + 35} y={oy + 48} width={bW - 70} height={65} fill="#22c55e08" stroke="#22c55e" strokeWidth="1" rx="2" />
          <text x={ox + bW/2} y={oy + 82} fontSize="9" textAnchor="middle" fill="#22c55e">중정 / 조경</text>
          <CoreBlock x={ox + 5} y={oy + 55} w={26} h={50} />
          <rect x={ox + 5} y={oy + 120} width={80} height={45} fill="#8b5cf610" stroke="#8b5cf6" strokeWidth="0.8" rx="1" /><text x={ox + 45} y={oy + 145} fontSize="7" textAnchor="middle" fill="#8b5cf6">관리실</text>
          <rect x={ox + 90} y={oy + 120} width={80} height={45} fill="#64748b10" stroke="#64748b" strokeWidth="0.8" rx="1" /><text x={ox + 130} y={oy + 145} fontSize="7" textAnchor="middle" fill="#64748b">기계실</text>
          <rect x={ox + 175} y={oy + 120} width={90} height={45} fill="#ec489910" stroke="#ec4899" strokeWidth="0.8" rx="1" /><text x={ox + 220} y={oy + 145} fontSize="7" textAnchor="middle" fill="#ec4899">커뮤니티</text>
          <rect x={ox + bW/2 - 10} y={oy + bH - 4} width={20} height={5} fill="#2dd4bf" rx="1" />
        </g>)
      })()}

      {/* L-SHAPE */}
      {type === "lshape" && (() => {
        const ox = 20, oy = 8
        return (<g>
          <rect x={ox} y={oy} width={80} height={130} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-foreground" />
          <rect x={ox} y={oy + 130} width={260} height={50} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-foreground" />
          {isGF ? (<>
            {bUse === 'house' ? (<>
              <rect x={ox+5} y={oy+5} width={70} height={60} fill="#f0fdf4" stroke="#22c55e" strokeWidth="1" rx="1" /><text x={ox+40} y={oy+38} fontSize="7" textAnchor="middle" fill="#22c55e" fontWeight="600">거실</text>
              <rect x={ox+5} y={oy+70} width={70} height={55} fill="#fef3c7" stroke="#f59e0b" strokeWidth="1" rx="1" /><text x={ox+40} y={oy+100} fontSize="7" textAnchor="middle" fill="#d97706">주방</text>
              <CoreBlock x={ox+5} y={oy+135} w={35} h={40} />
              <rect x={ox+45} y={oy+135} width={100} height={40} fill="#eff6ff" stroke="#3b82f6" strokeWidth="1" rx="1" /><text x={ox+95} y={oy+158} fontSize="7" textAnchor="middle" fill="#3b82f6">침실</text>
              <rect x={ox+150} y={oy+135} width={105} height={40} fill="#64748b08" stroke="#64748b" strokeWidth="0.8" strokeDasharray="3" rx="1" /><text x={ox+200} y={oy+158} fontSize="7" textAnchor="middle" fill="#64748b">마당</text>
              <rect x={ox+30} y={oy+175} width={20} height={5} fill="#2dd4bf" rx="1" />
            </>) : (<>
            {Array.from({ length: Math.min(gfU, 3) }, (_, i) => { const sh = Math.floor(120 / Math.min(gfU, 3)); return <g key={`v${i}`}><rect x={ox + 5} y={oy + 5 + i * sh} width={70} height={sh - 5} fill={bUse==='villa'?'#22c55e15':gfF} stroke={bUse==='villa'?'#22c55e':gfC} strokeWidth="1" rx="1" /><text x={ox + 40} y={oy + 5 + i * sh + (sh-5)/2 + 3} fontSize="7" textAnchor="middle" fill={bUse==='villa'?'#22c55e':gfC}>{bUse==='villa'?`${String.fromCharCode(65+i)}호`:gfL}</text></g> })}
            <CoreBlock x={ox + 5} y={oy + 135} w={35} h={40} />
            <rect x={ox + 45} y={oy + 135} width={210} height={40} fill="#64748b08" stroke="#64748b" strokeWidth="0.8" strokeDasharray="3" rx="1" />
            <text x={ox + 150} y={oy + 158} fontSize="8" textAnchor="middle" fill="#64748b">주차장</text>
            <rect x={ox + 30} y={oy + 175} width={20} height={5} fill="#2dd4bf" rx="1" />
          </>)}
          </>) : (<>
            {(() => { const vN = Math.ceil(curU / 2), vh = Math.floor(120 / Math.max(vN, 1)); return Array.from({ length: Math.min(vN, 3) }, (_, i) => (<UnitInterior key={`v${i}`} x={ox + 3} y={oy + 3 + i * vh} w={74} h={vh - 4} label={`${String.fromCharCode(65 + i)}호`} area={uA} color={c.p} compact={vh < 35} />)) })()}
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
            {(() => { const n = Math.min(curU, 5), uw = Math.floor((bW - 10) / n); return Array.from({ length: n }, (_, i) => (<UnitInterior key={i} x={ox + 5 + i * uw} y={oy + 5} w={uw - 4} h={85} label={`${String.fromCharCode(65 + i)}호`} area={uA} color={c.p} mirror={i % 2 === 1} compact={uw < 45} />)) })()}
            {curU > 5 && <text x={ox + bW/2} y={oy + 98} fontSize="6" textAnchor="middle" fill={c.p}>+ {curU - 5}세대</text>}
            <rect x={ox + 5} y={oy + 95} width={bW - 10} height={28} fill="#64748b10" stroke="#64748b" strokeWidth="0.5" />
            <CoreBlock x={ox + bW/2 - 25} y={oy + 98} w={50} h={22} />
          </>)}
        </g>)
      })()}

      {/* CLUSTER */}
      {type === "cluster" && (() => {
        const ox = 20, oy = 10
        return (<g>
          <rect x={ox} y={oy} width={100} height={70} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-foreground" />
          <rect x={ox + 160} y={oy} width={100} height={70} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-foreground" />
          {isGF ? (<>
            <rect x={ox + 5} y={oy + 5} width={90} height={30} fill={gfF} stroke={gfC} strokeWidth="1" rx="1" /><text x={ox + 50} y={oy + 23} fontSize="7" textAnchor="middle" fill={gfC}>{gfL}</text>
            <rect x={ox + 5} y={oy + 40} width={40} height={25} fill="#06b6d415" stroke="#06b6d4" strokeWidth="1" rx="1" /><text x={ox + 25} y={oy + 55} fontSize="6" textAnchor="middle" fill="#06b6d4">로비</text>
            <rect x={ox + 165} y={oy + 5} width={90} height={30} fill={gfF} stroke={gfC} strokeWidth="1" rx="1" /><text x={ox + 210} y={oy + 23} fontSize="7" textAnchor="middle" fill={gfC}>{gfL}</text>
            <rect x={ox + 165} y={oy + 40} width={40} height={25} fill="#06b6d415" stroke="#06b6d4" strokeWidth="1" rx="1" /><text x={ox + 185} y={oy + 55} fontSize="6" textAnchor="middle" fill="#06b6d4">로비</text>
          </>) : (<>
            <UnitInterior x={ox + 3} y={oy + 3} w={46} h={64} label="A호" area={uA} color={c.p} compact />
            <UnitInterior x={ox + 52} y={oy + 3} w={46} h={64} label="B호" area={uA} color={c.p} compact />
            <UnitInterior x={ox + 163} y={oy + 3} w={46} h={64} label="C호" area={uA} color={c.p} compact />
            <UnitInterior x={ox + 212} y={oy + 3} w={46} h={64} label="D호" area={uA} color={c.p} compact />
          </>)}
          <rect x={ox + 40} y={oy + 85} width={180} height={70} fill="#22c55e08" stroke="#22c55e" strokeWidth="1" strokeDasharray="3" rx="2" />
          <text x={ox + 130} y={oy + 122} fontSize="9" textAnchor="middle" fill="#22c55e">중앙 정원</text>
          <rect x={ox} y={oy + 90} width={35} height={60} fill="none" stroke="currentColor" strokeWidth="2" className="text-foreground" />
          <rect x={ox + 225} y={oy + 90} width={35} height={60} fill="none" stroke="currentColor" strokeWidth="2" className="text-foreground" />
          {!isGF && (<><UnitInterior x={ox + 2} y={oy + 92} w={31} h={56} label="E" area={uA} color={c.p} compact /><UnitInterior x={ox + 227} y={oy + 92} w={31} h={56} label="F" area={uA} color={c.p} compact /></>)}
          {isGF && <rect x={ox + 120} y={oy + 155} width={20} height={5} fill="#2dd4bf" rx="1" />}
        </g>)
      })()}

      <text x="10" y="215" fontSize="9" fill="currentColor" className="text-foreground" fontWeight="500">{desc}</text>
      <text x="290" y="215" fontSize="7" textAnchor="end" fill={c.p}>{sL}</text>
    </svg>
  )
}
