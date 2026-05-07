"use client"

import React, { useState } from "react"

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 설계 상수
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const WALL_EXT = 3    // 외벽 두께 (SVG 단위)
const WALL_INT = 1.5  // 내벽 두께
const SCALE = 1       // 1 SVG unit ≒ 실제 비율

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 유닛 타입 정의
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface RoomDef {
  id: string
  label: string
  x: number; y: number; w: number; h: number
  fill: string
  furniture?: 'bed-master' | 'bed-single' | 'sofa' | 'kitchen' | 'toilet' | 'bath' | 'closet' | 'table' | 'washer' | 'shoe'
  areaM2?: number
}

interface DoorDef {
  x: number; y: number; dir: 'right' | 'left' | 'up' | 'down'; size?: number; slide?: boolean
}

interface WindowDef {
  x: number; y: number; len: number; orient: 'h' | 'v'
}

interface UnitTypeDef {
  name: string
  totalArea: number // 전용면적 ㎡
  width: number
  height: number
  rooms: RoomDef[]
  doors: DoorDef[]
  windows: WindowDef[]
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 84㎡ 3LDK
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const UNIT_84: UnitTypeDef = {
  name: '84A타입', totalArea: 84, width: 200, height: 160,
  rooms: [
    { id: 'lr', label: '거실', x: 4, y: 4, w: 82, h: 60, fill: '#f0fdf4', areaM2: 22.5, furniture: 'sofa' },
    { id: 'kd', label: '주방/식당', x: 88, y: 4, w: 52, h: 60, fill: '#fef3c7', areaM2: 14.2, furniture: 'kitchen' },
    { id: 'mr', label: '안방', x: 4, y: 68, w: 60, h: 52, fill: '#eff6ff', areaM2: 14.3, furniture: 'bed-master' },
    { id: 'mb', label: '안방 욕실', x: 4, y: 122, w: 34, h: 34, fill: '#e0f2fe', areaM2: 5.4, furniture: 'bath' },
    { id: 'dr', label: '드레스룸', x: 40, y: 122, w: 24, h: 34, fill: '#faf5ff', areaM2: 3.7, furniture: 'closet' },
    { id: 'r2', label: '침실2', x: 68, y: 68, w: 44, h: 42, fill: '#f0f9ff', areaM2: 8.5, furniture: 'bed-single' },
    { id: 'r3', label: '침실3', x: 68, y: 112, w: 44, h: 44, fill: '#f0f9ff', areaM2: 8.9, furniture: 'bed-single' },
    { id: 'bt', label: '욕실', x: 114, y: 68, w: 28, h: 34, fill: '#e0f2fe', areaM2: 4.4, furniture: 'toilet' },
    { id: 'ent', label: '현관', x: 142, y: 4, w: 28, h: 40, fill: '#f1f5f9', areaM2: 5.1, furniture: 'shoe' },
    { id: 'hall', label: '복도', x: 114, y: 104, w: 28, h: 52, fill: '#f8fafc', areaM2: 6.7 },
    { id: 'ut', label: '다용도', x: 142, y: 46, w: 28, h: 24, fill: '#fef9c3', areaM2: 3.1, furniture: 'washer' },
    { id: 'bal1', label: '발코니', x: 4, y: -10, w: 136, h: 12, fill: '#ecfdf5', areaM2: 7.5 },
    { id: 'bal2', label: '발코니', x: -10, y: 68, w: 12, h: 88, fill: '#ecfdf5', areaM2: 4.8 },
  ],
  doors: [
    { x: 84, y: 30, dir: 'right' },       // 거실↔주방
    { x: 30, y: 66, dir: 'down' },         // 거실→안방
    { x: 20, y: 120, dir: 'down', size: 12, slide: true }, // 안방→안방욕실
    { x: 46, y: 120, dir: 'down', size: 10, slide: true }, // 안방→드레스룸
    { x: 90, y: 66, dir: 'down' },         // →침실2
    { x: 90, y: 110, dir: 'down' },        // →침실3
    { x: 114, y: 80, dir: 'left' },        // →욕실
    { x: 142, y: 20, dir: 'left' },        // →현관 (현관문)
    { x: 142, y: 54, dir: 'left' },        // →다용도
  ],
  windows: [
    { x: 20, y: 3, len: 40, orient: 'h' },   // 거실 창
    { x: 96, y: 3, len: 30, orient: 'h' },    // 주방 창
    { x: 12, y: 67, len: 35, orient: 'v' },   // 안방 창 (좌측)
    { x: 3, y: 80, len: 30, orient: 'v' },   // 안방 발코니
    { x: 80, y: 67, len: 20, orient: 'v' },   // 침실2 창 (상단)
    { x: 80, y: 130, len: 20, orient: 'v' },  // 침실3 창
  ],
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 59㎡ 2LDK
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const UNIT_59: UnitTypeDef = {
  name: '59A타입', totalArea: 59, width: 160, height: 130,
  rooms: [
    { id: 'lr', label: '거실', x: 4, y: 4, w: 70, h: 50, fill: '#f0fdf4', areaM2: 16.1, furniture: 'sofa' },
    { id: 'kd', label: '주방/식당', x: 76, y: 4, w: 42, h: 50, fill: '#fef3c7', areaM2: 9.6, furniture: 'kitchen' },
    { id: 'mr', label: '안방', x: 4, y: 58, w: 50, h: 42, fill: '#eff6ff', areaM2: 9.6, furniture: 'bed-master' },
    { id: 'r2', label: '침실2', x: 58, y: 58, w: 38, h: 42, fill: '#f0f9ff', areaM2: 7.3, furniture: 'bed-single' },
    { id: 'bt', label: '욕실', x: 98, y: 58, w: 22, h: 30, fill: '#e0f2fe', areaM2: 3.0, furniture: 'toilet' },
    { id: 'ent', label: '현관', x: 120, y: 4, w: 24, h: 34, fill: '#f1f5f9', areaM2: 3.7, furniture: 'shoe' },
    { id: 'hall', label: '복도', x: 98, y: 90, w: 22, h: 36, fill: '#f8fafc', areaM2: 3.6 },
    { id: 'bal1', label: '발코니', x: 4, y: 102, w: 92, h: 10, fill: '#ecfdf5', areaM2: 4.2 },
    { id: 'ut', label: '다용도', x: 120, y: 40, w: 24, h: 18, fill: '#fef9c3', areaM2: 2.0, furniture: 'washer' },
  ],
  doors: [
    { x: 74, y: 24, dir: 'right' },
    { x: 24, y: 56, dir: 'down' },
    { x: 72, y: 56, dir: 'down' },
    { x: 98, y: 70, dir: 'left' },
    { x: 120, y: 16, dir: 'left' },
    { x: 120, y: 46, dir: 'left' },
  ],
  windows: [
    { x: 16, y: 3, len: 34, orient: 'h' },
    { x: 86, y: 3, len: 24, orient: 'h' },
    { x: 16, y: 101, len: 28, orient: 'h' },
    { x: 64, y: 101, len: 24, orient: 'h' },
  ],
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 가구/설비 렌더러
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function Furniture({ type, x, y, w, h }: { type: string; x: number; y: number; w: number; h: number }) {
  const cx = x + w / 2, cy = y + h / 2
  switch (type) {
    case 'bed-master':
      return (<g opacity="0.5">
        <rect x={x + w * 0.1} y={y + h * 0.05} width={w * 0.8} height={h * 0.85} rx="2" fill="#93c5fd" stroke="#60a5fa" strokeWidth="0.5" />
        <rect x={x + w * 0.15} y={y + h * 0.08} width={w * 0.35} height={h * 0.25} rx="1" fill="#bfdbfe" stroke="#60a5fa" strokeWidth="0.3" />
        <rect x={x + w * 0.52} y={y + h * 0.08} width={w * 0.35} height={h * 0.25} rx="1" fill="#bfdbfe" stroke="#60a5fa" strokeWidth="0.3" />
        <line x1={x + w * 0.12} y1={y + h * 0.6} x2={x + w * 0.88} y2={y + h * 0.6} stroke="#60a5fa" strokeWidth="0.3" />
      </g>)
    case 'bed-single':
      return (<g opacity="0.5">
        <rect x={x + w * 0.15} y={y + h * 0.1} width={w * 0.7} height={h * 0.8} rx="2" fill="#a5b4fc" stroke="#818cf8" strokeWidth="0.5" />
        <rect x={x + w * 0.2} y={y + h * 0.12} width={w * 0.6} height={h * 0.22} rx="1" fill="#c7d2fe" stroke="#818cf8" strokeWidth="0.3" />
      </g>)
    case 'sofa':
      return (<g opacity="0.4">
        <rect x={cx - w * 0.35} y={cy + h * 0.05} width={w * 0.7} height={h * 0.2} rx="2" fill="#86efac" stroke="#4ade80" strokeWidth="0.5" />
        <rect x={cx - w * 0.35} y={cy + h * 0.22} width={w * 0.7} height={h * 0.08} rx="1" fill="#4ade80" stroke="#22c55e" strokeWidth="0.3" />
        {/* TV */}
        <rect x={cx - w * 0.2} y={cy - h * 0.3} width={w * 0.4} height={2} fill="#64748b" rx="0.5" />
        {/* 테이블 */}
        <rect x={cx - w * 0.15} y={cy - h * 0.05} width={w * 0.3} height={h * 0.12} rx="1" fill="none" stroke="#94a3b8" strokeWidth="0.5" />
      </g>)
    case 'kitchen':
      return (<g opacity="0.45">
        {/* 싱크대 카운터 */}
        <rect x={x + 3} y={y + 3} width={w - 6} height={8} rx="1" fill="#fbbf24" stroke="#f59e0b" strokeWidth="0.5" />
        {/* 싱크 */}
        <rect x={x + w * 0.3} y={y + 4} width={10} height={5} rx="1" fill="none" stroke="#d97706" strokeWidth="0.5" />
        <circle cx={x + w * 0.3 + 5} cy={y + 6.5} r="1" fill="#d97706" />
        {/* 레인지 */}
        <rect x={x + w * 0.65} y={y + 4} width={8} height={5} rx="0.5" fill="#ef4444" stroke="#dc2626" strokeWidth="0.3" />
        <circle cx={x + w * 0.65 + 2} cy={y + 6} r="1" fill="none" stroke="#dc2626" strokeWidth="0.3" />
        <circle cx={x + w * 0.65 + 6} cy={y + 6} r="1" fill="none" stroke="#dc2626" strokeWidth="0.3" />
        {/* 냉장고 */}
        <rect x={x + 4} y={y + 4} width={7} height={5} rx="0.5" fill="#94a3b8" stroke="#64748b" strokeWidth="0.4" />
        {/* 식탁 */}
        <rect x={cx - 10} y={cy + 2} width={20} height={12} rx="1.5" fill="none" stroke="#a16207" strokeWidth="0.5" />
        <circle cx={cx - 5} cy={cy - 1} r="2" fill="none" stroke="#a16207" strokeWidth="0.3" />
        <circle cx={cx + 5} cy={cy - 1} r="2" fill="none" stroke="#a16207" strokeWidth="0.3" />
        <circle cx={cx - 5} cy={cy + 17} r="2" fill="none" stroke="#a16207" strokeWidth="0.3" />
        <circle cx={cx + 5} cy={cy + 17} r="2" fill="none" stroke="#a16207" strokeWidth="0.3" />
      </g>)
    case 'toilet':
      return (<g opacity="0.5">
        {/* 변기 */}
        <ellipse cx={cx} cy={cy + h * 0.15} rx={4} ry={5} fill="#e0f2fe" stroke="#38bdf8" strokeWidth="0.5" />
        <rect x={cx - 3} y={cy + h * 0.15 + 4} width={6} height={3} rx="1" fill="#bae6fd" stroke="#38bdf8" strokeWidth="0.3" />
        {/* 세면대 */}
        <rect x={x + 3} y={y + 3} width={10} height={6} rx="2" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="0.5" />
        <circle cx={x + 8} cy={y + 6} r="1.2" fill="none" stroke="#0ea5e9" strokeWidth="0.3" />
      </g>)
    case 'bath':
      return (<g opacity="0.5">
        {/* 욕조 */}
        <rect x={x + w * 0.4} y={y + 4} width={w * 0.55} height={h * 0.45} rx="3" fill="#bae6fd" stroke="#38bdf8" strokeWidth="0.5" />
        {/* 변기 */}
        <ellipse cx={x + 12} cy={y + h * 0.55} rx={4} ry={5} fill="#e0f2fe" stroke="#38bdf8" strokeWidth="0.5" />
        <rect x={x + 9} y={y + h * 0.55 + 4} width={6} height={3} rx="1" fill="#bae6fd" stroke="#38bdf8" strokeWidth="0.3" />
        {/* 세면대 */}
        <rect x={x + 3} y={y + 3} width={12} height={7} rx="2" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="0.5" />
        <circle cx={x + 9} cy={y + 6.5} r="1.5" fill="none" stroke="#0ea5e9" strokeWidth="0.3" />
        {/* 샤워기 */}
        <circle cx={x + w * 0.67} cy={y + 6} r="1" fill="#0ea5e9" />
      </g>)
    case 'closet':
      return (<g opacity="0.35">
        <rect x={x + 3} y={y + 3} width={w - 6} height={h - 6} rx="1" fill="none" stroke="#a855f7" strokeWidth="0.5" strokeDasharray="2 1" />
        <line x1={x + 3} y1={cy} x2={x + w - 3} y2={cy} stroke="#a855f7" strokeWidth="0.3" />
        <text x={cx} y={cy + 1} fontSize="4" textAnchor="middle" fill="#a855f7">옷장</text>
      </g>)
    case 'washer':
      return (<g opacity="0.4">
        <circle cx={cx} cy={cy} r={Math.min(w, h) * 0.25} fill="#d1d5db" stroke="#6b7280" strokeWidth="0.5" />
        <circle cx={cx} cy={cy} r={Math.min(w, h) * 0.15} fill="none" stroke="#6b7280" strokeWidth="0.3" />
      </g>)
    case 'shoe':
      return (<g opacity="0.35">
        <rect x={x + 2} y={y + 2} width={w - 4} height={8} rx="1" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.4" />
        <text x={cx} y={y + 8} fontSize="3.5" textAnchor="middle" fill="#64748b">신발장</text>
      </g>)
    default:
      return null
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 문 렌더러
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function Door({ def }: { def: DoorDef }) {
  const { x, y, dir, size = 14, slide } = def
  if (slide) {
    // 슬라이딩 도어
    const isH = dir === 'right' || dir === 'left'
    return (<g>
      {isH ? (
        <>
          <line x1={x} y1={y} x2={x + size} y2={y} stroke="#ef4444" strokeWidth="1.5" />
          <line x1={x + size * 0.3} y1={y - 1} x2={x + size * 0.7} y2={y - 1} stroke="#ef4444" strokeWidth="0.5" />
          <line x1={x + size * 0.3} y1={y + 1} x2={x + size * 0.7} y2={y + 1} stroke="#ef4444" strokeWidth="0.5" />
        </>
      ) : (
        <>
          <line x1={x} y1={y} x2={x} y2={y + size} stroke="#ef4444" strokeWidth="1.5" />
          <line x1={x - 1} y1={y + size * 0.3} x2={x - 1} y2={y + size * 0.7} stroke="#ef4444" strokeWidth="0.5" />
          <line x1={x + 1} y1={y + size * 0.3} x2={x + 1} y2={y + size * 0.7} stroke="#ef4444" strokeWidth="0.5" />
        </>
      )}
    </g>)
  }
  // 여닫이 문 — 호 그리기
  const r = size
  let path = ''
  switch (dir) {
    case 'right': path = `M ${x} ${y} L ${x + r} ${y} A ${r} ${r} 0 0 1 ${x} ${y + r}`; break
    case 'left': path = `M ${x} ${y} L ${x - r} ${y} A ${r} ${r} 0 0 0 ${x} ${y + r}`; break
    case 'down': path = `M ${x} ${y} L ${x} ${y + r} A ${r} ${r} 0 0 0 ${x + r} ${y}`; break
    case 'up': path = `M ${x} ${y} L ${x} ${y - r} A ${r} ${r} 0 0 1 ${x + r} ${y}`; break
  }
  return (<g>
    <path d={path} fill="none" stroke="#f97316" strokeWidth="0.6" strokeDasharray="2 1" />
    <line x1={x} y1={y} x2={dir === 'right' ? x + r : dir === 'left' ? x - r : x} y2={dir === 'down' ? y + r : dir === 'up' ? y - r : y} stroke="#f97316" strokeWidth="1" />
  </g>)
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 창문 렌더러
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function Window({ def }: { def: WindowDef }) {
  const { x, y, len, orient } = def
  if (orient === 'h') {
    return (<g>
      <line x1={x} y1={y} x2={x + len} y2={y} stroke="#0ea5e9" strokeWidth="2.5" />
      <line x1={x} y1={y - 1.5} x2={x + len} y2={y - 1.5} stroke="#0ea5e9" strokeWidth="0.3" />
      <line x1={x} y1={y + 1.5} x2={x + len} y2={y + 1.5} stroke="#0ea5e9" strokeWidth="0.3" />
    </g>)
  }
  return (<g>
    <line x1={x} y1={y} x2={x} y2={y + len} stroke="#0ea5e9" strokeWidth="2.5" />
    <line x1={x - 1.5} y1={y} x2={x - 1.5} y2={y + len} stroke="#0ea5e9" strokeWidth="0.3" />
    <line x1={x + 1.5} y1={y} x2={x + 1.5} y2={y + len} stroke="#0ea5e9" strokeWidth="0.3" />
  </g>)
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 치수선
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function DimLine({ x1, y1, x2, y2, label, offset = 8 }: { x1: number; y1: number; x2: number; y2: number; label: string; offset?: number }) {
  const isH = Math.abs(y1 - y2) < 2
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
  if (isH) {
    const dy = y1 - offset
    return (<g>
      <line x1={x1} y1={y1} x2={x1} y2={dy - 2} stroke="#94a3b8" strokeWidth="0.3" />
      <line x1={x2} y1={y1} x2={x2} y2={dy - 2} stroke="#94a3b8" strokeWidth="0.3" />
      <line x1={x1} y1={dy} x2={x2} y2={dy} stroke="#94a3b8" strokeWidth="0.5" />
      <line x1={x1} y1={dy - 1.5} x2={x1} y2={dy + 1.5} stroke="#94a3b8" strokeWidth="0.5" />
      <line x1={x2} y1={dy - 1.5} x2={x2} y2={dy + 1.5} stroke="#94a3b8" strokeWidth="0.5" />
      <text x={mx} y={dy - 2} fontSize="4.5" textAnchor="middle" fill="#64748b">{label}</text>
    </g>)
  }
  const dx = x1 - offset
  return (<g>
    <line x1={x1} y1={y1} x2={dx - 2} y2={y1} stroke="#94a3b8" strokeWidth="0.3" />
    <line x1={x1} y1={y2} x2={dx - 2} y2={y2} stroke="#94a3b8" strokeWidth="0.3" />
    <line x1={dx} y1={y1} x2={dx} y2={y2} stroke="#94a3b8" strokeWidth="0.5" />
    <line x1={dx - 1.5} y1={y1} x2={dx + 1.5} y2={y1} stroke="#94a3b8" strokeWidth="0.5" />
    <line x1={dx - 1.5} y1={y2} x2={dx + 1.5} y2={y2} stroke="#94a3b8" strokeWidth="0.5" />
    <text x={dx - 4} y={my + 1.5} fontSize="4.5" textAnchor="middle" fill="#64748b" transform={`rotate(-90, ${dx - 4}, ${my})`}>{label}</text>
  </g>)
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 단위세대 상세 평면도
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function UnitDetailPlan({ unit, offsetX = 30, offsetY = 30 }: { unit: UnitTypeDef; offsetX?: number; offsetY?: number }) {
  return (
    <g transform={`translate(${offsetX}, ${offsetY})`}>
      {/* 외벽 */}
      <rect x={0} y={0} width={unit.width} height={unit.height}
        fill="none" stroke="currentColor" strokeWidth={WALL_EXT} className="text-foreground" />

      {/* 실 배경 + 내벽 */}
      {unit.rooms.map(room => (
        <g key={room.id}>
          <rect x={room.x} y={room.y} width={room.w} height={room.h}
            fill={room.fill} stroke="currentColor" strokeWidth={room.id.includes('bal') ? 0.8 : WALL_INT} className="text-foreground" 
            strokeDasharray={room.id.includes('bal') ? '3 1.5' : undefined} />
          {/* 실 라벨 */}
          <text x={room.x + room.w / 2} y={room.y + room.h / 2 - (room.furniture ? 4 : 0)} 
            fontSize="5.5" textAnchor="middle" fill="#374151" fontWeight="600">
            {room.label}
          </text>
          {room.areaM2 && (
            <text x={room.x + room.w / 2} y={room.y + room.h / 2 + (room.furniture ? -0.5 : 5)} 
              fontSize="4" textAnchor="middle" fill="#6b7280">
              {room.areaM2}㎡
            </text>
          )}
          {/* 가구 */}
          {room.furniture && (
            <Furniture type={room.furniture} x={room.x} y={room.y} w={room.w} h={room.h} />
          )}
        </g>
      ))}

      {/* 창문 */}
      {unit.windows.map((w, i) => <Window key={i} def={w} />)}

      {/* 문 */}
      {unit.doors.map((d, i) => <Door key={i} def={d} />)}

      {/* 치수선 */}
      <DimLine x1={0} y1={0} x2={unit.width} y2={0} label={`${(unit.width * 0.05).toFixed(1)}m`} offset={18} />
      <DimLine x1={0} y1={0} x2={0} y2={unit.height} label={`${(unit.height * 0.05).toFixed(1)}m`} offset={20} />

      {/* 타입명 */}
      <text x={unit.width / 2} y={unit.height + 14} fontSize="7" textAnchor="middle" fill="currentColor" fontWeight="700" className="text-foreground">
        {unit.name} (전용 {unit.totalArea}㎡)
      </text>
    </g>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 층별 배치 평면도
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function FloorLayoutPlan({ floor, totalFloors, unitsPerFloor, unitType, buildingWidth, buildingDepth }: {
  floor: number; totalFloors: number; unitsPerFloor: number; unitType: UnitTypeDef
  buildingWidth: number; buildingDepth: number
}) {
  const isGF = floor === 1
  const ox = 40, oy = 30
  const corridorH = 14
  const unitW = Math.floor((buildingWidth - 10) / Math.max(unitsPerFloor, 2))
  const unitH = Math.floor((buildingDepth - corridorH) / 2)
  const coreW = 30

  return (
    <g transform={`translate(${ox}, ${oy})`}>
      {/* 건물 외곽 */}
      <rect x={0} y={0} width={buildingWidth} height={buildingDepth}
        fill="none" stroke="currentColor" strokeWidth={WALL_EXT} className="text-foreground" />

      {/* 복도 */}
      <rect x={2} y={unitH} width={buildingWidth - 4} height={corridorH}
        fill="#f1f5f9" stroke="currentColor" strokeWidth={0.5} className="text-foreground" />
      <text x={buildingWidth / 2} y={unitH + corridorH / 2 + 1.5} fontSize="4.5" textAnchor="middle" fill="#64748b" fontWeight="500">복도</text>
      {/* 복도 점선 */}
      <line x1={10} y1={unitH + corridorH / 2} x2={buildingWidth - 10} y2={unitH + corridorH / 2} stroke="#94a3b8" strokeWidth="0.3" strokeDasharray="3 2" />

      {/* 코어 */}
      <g>
        <rect x={buildingWidth / 2 - coreW / 2} y={unitH + 1} width={coreW} height={corridorH - 2}
          fill="#334155" stroke="#1e293b" strokeWidth="1" rx="1" />
        <rect x={buildingWidth / 2 - coreW / 2 + 2} y={unitH + 2.5} width={10} height={corridorH - 5} fill="#475569" rx="0.5" />
        <text x={buildingWidth / 2 - coreW / 2 + 7} y={unitH + corridorH / 2 + 1} fontSize="3.5" textAnchor="middle" fill="white">EV</text>
        <rect x={buildingWidth / 2 - coreW / 2 + 14} y={unitH + 2.5} width={10} height={corridorH - 5} fill="#475569" rx="0.5" />
        <text x={buildingWidth / 2 - coreW / 2 + 19} y={unitH + corridorH / 2 + 1} fontSize="3.5" textAnchor="middle" fill="white">EV</text>
        {/* 계단 */}
        <rect x={buildingWidth / 2 + coreW / 2 - 8} y={unitH + 2} width={6} height={corridorH - 4} fill="#64748b" rx="0.5" />
        {Array.from({ length: 4 }, (_, i) => (
          <line key={i} x1={buildingWidth / 2 + coreW / 2 - 7} y1={unitH + 3 + i * 2.2} x2={buildingWidth / 2 + coreW / 2 - 3} y2={unitH + 3 + i * 2.2} stroke="#94a3b8" strokeWidth="0.3" />
        ))}
      </g>

      {isGF ? (
        <>
          {/* 1층: 로비 + 상가/부대시설 */}
          <rect x={buildingWidth / 2 - 25} y={3} width={50} height={unitH - 4} fill="#06b6d410" stroke="#06b6d4" strokeWidth="1" rx="2" />
          <text x={buildingWidth / 2} y={unitH / 2 + 2} fontSize="7" textAnchor="middle" fill="#06b6d4" fontWeight="600">로비 / 현관홀</text>
          
          <rect x={4} y={3} width={buildingWidth / 2 - 32} height={unitH - 4} fill="#f59e0b10" stroke="#f59e0b" strokeWidth="0.8" rx="1" />
          <text x={(buildingWidth / 2 - 28) / 2 + 4} y={unitH / 2 + 2} fontSize="5.5" textAnchor="middle" fill="#d97706">근린생활시설</text>

          <rect x={buildingWidth / 2 + 28} y={3} width={buildingWidth / 2 - 32} height={unitH - 4} fill="#8b5cf610" stroke="#8b5cf6" strokeWidth="0.8" rx="1" />
          <text x={buildingWidth / 2 + 28 + (buildingWidth / 2 - 32) / 2} y={unitH / 2 + 2} fontSize="5.5" textAnchor="middle" fill="#7c3aed">관리사무소</text>

          {/* 주차장 */}
          <rect x={4} y={unitH + corridorH + 2} width={buildingWidth - 8} height={buildingDepth - unitH - corridorH - 5} fill="#64748b08" stroke="#64748b" strokeWidth="0.8" strokeDasharray="4 2" rx="1" />
          <text x={buildingWidth / 2} y={unitH + corridorH + (buildingDepth - unitH - corridorH) / 2 + 2} fontSize="7" textAnchor="middle" fill="#64748b">주차장 / 기계실</text>
          {/* 주차선 */}
          {Array.from({ length: Math.floor((buildingWidth - 20) / 18) }, (_, i) => (
            <rect key={i} x={10 + i * 18} y={unitH + corridorH + 6} width={14} height={24} fill="none" stroke="#64748b" strokeWidth="0.3" rx="0.5" />
          ))}
          {/* 주출입구 */}
          <rect x={buildingWidth / 2 - 12} y={buildingDepth - 3} width={24} height={4} fill="#2dd4bf" rx="1" />
          <text x={buildingWidth / 2} y={buildingDepth + 6} fontSize="4.5" textAnchor="middle" fill="#2dd4bf">주출입구</text>
        </>
      ) : (
        <>
          {/* 기준층: 세대 배치 */}
          {Array.from({ length: Math.min(unitsPerFloor, 6) }, (_, i) => {
            const topN = Math.ceil(Math.min(unitsPerFloor, 6) / 2)
            const botN = Math.min(unitsPerFloor, 6) - topN
            const isTop = i < topN
            const idx = isTop ? i : i - topN
            const n = isTop ? topN : botN
            const uw = Math.floor((buildingWidth - 8) / n)
            const ux = 4 + idx * uw
            const uy = isTop ? 3 : unitH + corridorH + 1
            const uh = isTop ? unitH - 4 : buildingDepth - unitH - corridorH - 4
            const color = isTop ? '#10b981' : '#3b82f6'
            const mirror = idx % 2 === 1
            
            return (
              <g key={i}>
                <rect x={ux} y={uy} width={uw - 3} height={uh} fill={`${color}08`} stroke={color} strokeWidth="0.8" />
                {/* 미니 실 배치 */}
                {(() => {
                  const iw = uw - 7, ih = uh - 4
                  const sx = ux + 2, sy = uy + 2
                  const lrW = Math.floor(iw * 0.55), kdW = iw - lrW - 1
                  const topH = Math.floor(ih * 0.5)
                  const brW = Math.floor(iw * 0.45), btW = iw - brW - 1
                  return (<g opacity="0.6">
                    <rect x={mirror ? sx + kdW + 1 : sx} y={sy} width={lrW} height={topH} fill={`${color}10`} stroke={color} strokeWidth="0.3" />
                    <text x={(mirror ? sx + kdW + 1 : sx) + lrW / 2} y={sy + topH / 2 + 1} fontSize="3.5" textAnchor="middle" fill={color}>거실</text>
                    <rect x={mirror ? sx : sx + lrW + 1} y={sy} width={kdW} height={topH} fill="#fef3c720" stroke={color} strokeWidth="0.3" />
                    <text x={(mirror ? sx : sx + lrW + 1) + kdW / 2} y={sy + topH / 2 + 1} fontSize="3.5" textAnchor="middle" fill={color}>주방</text>
                    <rect x={sx} y={sy + topH + 1} width={brW} height={ih - topH - 1} fill={`${color}06`} stroke={color} strokeWidth="0.3" />
                    <text x={sx + brW / 2} y={sy + topH + (ih - topH) / 2 + 1} fontSize="3.5" textAnchor="middle" fill={color}>침실</text>
                    <rect x={sx + brW + 1} y={sy + topH + 1} width={btW} height={ih - topH - 1} fill="#e0f2fe40" stroke={color} strokeWidth="0.3" />
                    <text x={sx + brW + 1 + btW / 2} y={sy + topH + (ih - topH) / 2 + 1} fontSize="3" textAnchor="middle" fill={color}>욕실</text>
                  </g>)
                })()}
                <text x={ux + (uw - 3) / 2} y={uy + uh + 6} fontSize="4.5" textAnchor="middle" fill={color} fontWeight="600">
                  {String.fromCharCode(65 + i)}호 ({unitType.totalArea}㎡)
                </text>
              </g>
            )
          })}
        </>
      )}

      {/* 치수선 */}
      <DimLine x1={0} y1={0} x2={buildingWidth} y2={0} label={`${(buildingWidth * 0.1).toFixed(1)}m`} offset={18} />
      <DimLine x1={0} y1={0} x2={0} y2={buildingDepth} label={`${(buildingDepth * 0.1).toFixed(1)}m`} offset={28} />

      {/* 방위 */}
      <g transform={`translate(${buildingWidth + 20}, 10)`}>
        <line x1={0} y1={12} x2={0} y2={-2} stroke="currentColor" strokeWidth="1" className="text-foreground" />
        <polygon points="0,-4 -3,2 3,2" fill="currentColor" className="text-foreground" />
        <text x={0} y={-6} fontSize="5" textAnchor="middle" fill="currentColor" fontWeight="700" className="text-foreground">N</text>
      </g>

      {/* 층 표시 */}
      <text x={buildingWidth / 2} y={buildingDepth + 16} fontSize="7" textAnchor="middle" fill="currentColor" fontWeight="700" className="text-foreground">
        {floor}층 {isGF ? '(로비/상가/주차)' : floor === totalFloors ? '(최상층)' : '(기준층)'} 평면도
      </text>
    </g>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 면적표
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function AreaTable({ unit }: { unit: UnitTypeDef }) {
  const mainRooms = unit.rooms.filter(r => !r.id.includes('bal') && !r.id.includes('hall'))
  const balcony = unit.rooms.filter(r => r.id.includes('bal'))
  const totalMain = mainRooms.reduce((s, r) => s + (r.areaM2 || 0), 0)
  const totalBal = balcony.reduce((s, r) => s + (r.areaM2 || 0), 0)

  return (
    <div className="text-[11px] border border-border rounded-lg overflow-hidden">
      <div className="bg-primary/10 px-3 py-1.5 font-bold text-xs">{unit.name} 면적표</div>
      <table className="w-full">
        <thead>
          <tr className="bg-secondary/50 text-[10px]">
            <th className="px-2 py-1 text-left">실명</th>
            <th className="px-2 py-1 text-right">면적(㎡)</th>
          </tr>
        </thead>
        <tbody>
          {mainRooms.map(r => (
            <tr key={r.id} className="border-t border-border/30">
              <td className="px-2 py-0.5">{r.label}</td>
              <td className="px-2 py-0.5 text-right font-mono">{r.areaM2?.toFixed(1)}</td>
            </tr>
          ))}
          <tr className="border-t border-border bg-primary/5 font-semibold">
            <td className="px-2 py-1">전용면적 합계</td>
            <td className="px-2 py-1 text-right font-mono">{totalMain.toFixed(1)}</td>
          </tr>
          {balcony.map(r => (
            <tr key={r.id} className="border-t border-border/30 text-muted-foreground">
              <td className="px-2 py-0.5">{r.label}</td>
              <td className="px-2 py-0.5 text-right font-mono">{r.areaM2?.toFixed(1)}</td>
            </tr>
          ))}
          <tr className="border-t border-border bg-emerald-500/10 font-bold">
            <td className="px-2 py-1">총 면적 (발코니 포함)</td>
            <td className="px-2 py-1 text-right font-mono">{(totalMain + totalBal).toFixed(1)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 메인 컴포넌트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface DetailedFloorPlanProps {
  siteArea: number
  buildingCoverage: number
  floors: number
  units: number
  type?: string
  layoutName?: string
}

export function DetailedFloorPlan({ siteArea, buildingCoverage, floors, units, type, layoutName }: DetailedFloorPlanProps) {
  const [viewMode, setViewMode] = useState<'unit-84' | 'unit-59' | 'floor'>('unit-84')
  const [selectedFloor, setSelectedFloor] = useState(2)

  const buildingArea = siteArea * (buildingCoverage / 100)
  const aspectRatio = 1.6
  const bW = Math.round(Math.sqrt(buildingArea * aspectRatio) * 2.8)
  const bD = Math.round(bW / aspectRatio)
  const unitsPerFloor = Math.max(Math.ceil(units / Math.max(floors - 1, 1)), 2)

  const unitType = viewMode === 'unit-59' ? UNIT_59 : UNIT_84

  return (
    <div className="space-y-4">
      {/* 뷰 모드 탭 */}
      <div className="flex gap-1 bg-secondary/30 rounded-lg p-1">
        {[
          { id: 'unit-84' as const, label: '84㎡ 상세', sub: '3LDK' },
          { id: 'unit-59' as const, label: '59㎡ 상세', sub: '2LDK' },
          { id: 'floor' as const, label: '층별 배치도', sub: `${floors}층` },
        ].map(tab => (
          <button key={tab.id} onClick={() => setViewMode(tab.id)}
            className={`flex-1 py-2 px-2 rounded-md text-xs font-medium transition-colors ${
              viewMode === tab.id 
                ? 'bg-primary text-primary-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}>
            <div>{tab.label}</div>
            <div className={`text-[9px] ${viewMode === tab.id ? 'text-primary-foreground/70' : 'text-muted-foreground/70'}`}>{tab.sub}</div>
          </button>
        ))}
      </div>

      {/* SVG 평면도 */}
      {viewMode === 'floor' ? (
        <>
          {/* 층 선택 */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {Array.from({ length: floors }, (_, i) => i + 1).map(f => (
              <button key={f} onClick={() => setSelectedFloor(f)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap ${
                  selectedFloor === f ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground'
                }`}>
                {f}층{f === 1 ? ' 로비' : f === floors ? ' 최상층' : ''}
              </button>
            ))}
          </div>
          <div className="rounded-xl border border-border bg-card p-2 overflow-x-auto">
            <svg viewBox={`0 0 ${bW + 80} ${bD + 60}`} className="w-full" style={{ minWidth: 320, maxHeight: 400 }}>
              <FloorLayoutPlan
                floor={selectedFloor}
                totalFloors={floors}
                unitsPerFloor={unitsPerFloor}
                unitType={UNIT_84}
                buildingWidth={bW}
                buildingDepth={bD}
              />
            </svg>
          </div>
        </>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-card p-2 overflow-x-auto">
            <svg viewBox={`0 0 ${unitType.width + 60} ${unitType.height + 60}`} className="w-full" style={{ minWidth: 320, maxHeight: 450 }}>
              <UnitDetailPlan unit={unitType} />
            </svg>
          </div>
          {/* 면적표 */}
          <AreaTable unit={unitType} />
        </>
      )}

      {/* 범례 */}
      <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground px-1">
        <span className="flex items-center gap-1"><span className="w-3 h-1.5 bg-[#0ea5e9] rounded-sm inline-block" />창문</span>
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#f97316] inline-block" />문(스윙)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-1 bg-[#ef4444] inline-block" />슬라이딩문</span>
        <span className="flex items-center gap-1"><span className="w-3 h-1 bg-[#334155] rounded-sm inline-block" />코어(EV/계단)</span>
      </div>

      <p className="text-[9px] text-muted-foreground text-center">
        ※ 본 도면은 AI 기본설계 수준이며, 실시설계 시 구조·설비 검토가 필요합니다
      </p>
    </div>
  )
}
