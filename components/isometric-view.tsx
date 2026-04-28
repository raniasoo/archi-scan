"use client"

import React from "react"

interface IsometricViewProps {
  siteArea: number
  buildingCoverage: number
  floors: number
  units: number
  type: "tower" | "courtyard" | "lshape" | "linear" | "cluster"
  layoutName?: string
  zoneType?: string
}

// 2D → 아이소메트릭 변환 (30도 축측투영)
function toIso(x: number, y: number, z: number): [number, number] {
  const isoX = (x - y) * Math.cos(Math.PI / 6)
  const isoY = (x + y) * Math.sin(Math.PI / 6) - z
  return [isoX, isoY]
}

// 아이소메트릭 면 (polygon points 생성)
function isoFace(corners: [number, number, number][]): string {
  return corners.map(c => {
    const [ix, iy] = toIso(c[0], c[1], c[2])
    return `${ix},${iy}`
  }).join(' ')
}

// 창문 한 개
function IsoWindow({ face, bx, by, bw, bd, z, col, cols, floorH }: {
  face: 'left' | 'right'; bx: number; by: number; bw: number; bd: number
  z: number; col: number; cols: number; floorH: number
}) {
  const mx = 0.12, winW = (1 - mx * 2) / cols, gap = 0.02
  const wx = mx + col * (winW + gap)
  const wz = z + floorH * 0.15, winH = floorH * 0.7

  let corners: [number, number, number][]
  if (face === 'left') {
    const y1 = by + bd * wx, y2 = by + bd * (wx + winW - gap)
    corners = [[bx, y1, wz], [bx, y2, wz], [bx, y2, wz + winH], [bx, y1, wz + winH]]
  } else {
    const x1 = bx + bw * wx, x2 = bx + bw * (wx + winW - gap)
    corners = [[x1, by, wz], [x2, by, wz], [x2, by, wz + winH], [x1, by, wz + winH]]
  }
  return <polygon points={isoFace(corners)} fill="#7dd3fc" opacity="0.35" stroke="#38bdf8" strokeWidth="0.15" />
}

// 나무
function IsoTree({ x, y, size = 1 }: { x: number; y: number; size?: number }) {
  const [sx, sy] = toIso(x, y, 0)
  const s = size * 4
  return (
    <g>
      <ellipse cx={sx + 2} cy={sy + 1} rx={s * 0.8} ry={s * 0.3} fill="#000" opacity="0.1" />
      <line x1={sx} y1={sy} x2={sx} y2={sy - s * 1.2} stroke="#854d0e" strokeWidth={size * 1.2} />
      <ellipse cx={sx} cy={sy - s * 1.8} rx={s * 1.1} ry={s * 0.9} fill="#15803d" opacity="0.7" />
      <ellipse cx={sx - s * 0.3} cy={sy - s * 2} rx={s * 0.7} ry={s * 0.6} fill="#16a34a" opacity="0.6" />
    </g>
  )
}

// 사람 실루엣
function IsoPerson({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  const [sx, sy] = toIso(x, y, 0)
  const h = 3.5 * scale
  return (
    <g>
      <line x1={sx} y1={sy} x2={sx} y2={sy - h * 0.65} stroke="#64748b" strokeWidth={1.2 * scale} strokeLinecap="round" />
      <circle cx={sx} cy={sy - h * 0.8} r={h * 0.15} fill="#94a3b8" />
      <ellipse cx={sx + 1} cy={sy + 0.3} rx={1.5 * scale} ry={0.5 * scale} fill="#000" opacity="0.08" />
    </g>
  )
}

// 차량
function IsoCar({ x, y, color = "#475569" }: { x: number; y: number; color?: string }) {
  return (
    <g>
      <polygon points={isoFace([[x, y, 0], [x + 4, y, 0], [x + 4, y + 1.8, 0], [x, y + 1.8, 0]])}
        fill={color} opacity="0.6" stroke="#334155" strokeWidth="0.3" />
      <polygon points={isoFace([[x + 0.8, y + 0.2, 1.2], [x + 3.2, y + 0.2, 1.2], [x + 3.2, y + 1.6, 1.2], [x + 0.8, y + 1.6, 1.2]])}
        fill={color} opacity="0.4" stroke="#334155" strokeWidth="0.2" />
    </g>
  )
}

export function IsometricView({ siteArea, buildingCoverage, floors, units, type, layoutName, zoneType }: IsometricViewProps) {
  const W = 520, H = 440
  const cx = W / 2, cy = H * 0.62

  const baseSize = Math.min(80, Math.sqrt(siteArea) * 0.8)
  const siteW = baseSize, siteD = baseSize * 0.8
  const floorH = Math.min(12, 120 / Math.max(floors, 3))
  const buildH = floors * floorH
  const bldRatio = Math.sqrt(buildingCoverage / 100) * 0.9

  const getBlocks = () => {
    const bW = siteW * bldRatio, bD = siteD * bldRatio
    switch (type) {
      case "tower":
        return [{ x: -bW / 2, y: -bD / 2, w: bW, d: bD, h: buildH, label: "타워동" }]
      case "courtyard": {
        const t = bD * 0.25
        return [
          { x: -bW / 2, y: -bD / 2, w: bW, d: t, h: buildH, label: "" },
          { x: -bW / 2, y: bD / 2 - t, w: bW, d: t, h: buildH, label: "" },
          { x: -bW / 2, y: -bD / 2 + t, w: bW * 0.2, d: bD - t * 2, h: buildH, label: "" },
          { x: bW / 2 - bW * 0.2, y: -bD / 2 + t, w: bW * 0.2, d: bD - t * 2, h: buildH, label: "" },
        ]
      }
      case "lshape": {
        const armW = bW * 0.4
        return [
          { x: -bW / 2, y: -bD / 2, w: armW, d: bD, h: buildH, label: "A동" },
          { x: -bW / 2 + armW, y: bD * 0.1, w: bW - armW, d: bD * 0.4, h: buildH * 0.85, label: "B동" },
        ]
      }
      case "linear":
        return [{ x: -bW / 2, y: -bD * 0.2, w: bW, d: bD * 0.4, h: buildH, label: "판상동" }]
      case "cluster": {
        const gap = bW * 0.08, blockW = (bW - gap) / 2
        return [
          { x: -bW / 2, y: -bD / 2, w: blockW, d: bD * 0.9, h: buildH, label: "A동" },
          { x: -bW / 2 + blockW + gap, y: -bD * 0.35, w: blockW, d: bD * 0.9, h: buildH * 0.9, label: "B동" },
        ]
      }
      default:
        return [{ x: -bW / 2, y: -bD / 2, w: bW, d: bD, h: buildH, label: type }]
    }
  }

  const blocks = getBlocks()
  const sitePoints = [
    toIso(-siteW / 2, -siteD / 2, 0), toIso(siteW / 2, -siteD / 2, 0),
    toIso(siteW / 2, siteD / 2, 0), toIso(-siteW / 2, siteD / 2, 0),
  ].map(p => `${p[0]},${p[1]}`).join(' ')

  const roadW = siteW * 1.4, roadD = 12
  const roadPoints = [
    toIso(-roadW / 2, siteD / 2 + 2, 0), toIso(roadW / 2, siteD / 2 + 2, 0),
    toIso(roadW / 2, siteD / 2 + 2 + roadD, 0), toIso(-roadW / 2, siteD / 2 + 2 + roadD, 0),
  ].map(p => `${p[0]},${p[1]}`).join(' ')
  const sidewalkPoints = [
    toIso(-siteW / 2 - 3, siteD / 2, 0), toIso(siteW / 2 + 3, siteD / 2, 0),
    toIso(siteW / 2 + 3, siteD / 2 + 2, 0), toIso(-siteW / 2 - 3, siteD / 2 + 2, 0),
  ].map(p => `${p[0]},${p[1]}`).join(' ')
  const roadCenterY = siteD / 2 + 2 + roadD / 2

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full bg-slate-950 rounded-lg border border-slate-800">
        <defs>
          <linearGradient id="iso-sky2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0a0f1e" /><stop offset="60%" stopColor="#0f172a" /><stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          <linearGradient id="iso-fl" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#0f1d30" />
          </linearGradient>
          <linearGradient id="iso-fr" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" /><stop offset="100%" stopColor="#1e3a5f" />
          </linearGradient>
          <linearGradient id="iso-gl" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#78350f" /><stop offset="100%" stopColor="#451a03" />
          </linearGradient>
          <linearGradient id="iso-gr" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#92400e" /><stop offset="100%" stopColor="#78350f" />
          </linearGradient>
          <pattern id="iso-grass" width="6" height="6" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill="#14532d" opacity="0.3" />
            <line x1="1" y1="5" x2="1.5" y2="3" stroke="#22c55e" strokeWidth="0.3" opacity="0.2" />
            <line x1="4" y1="6" x2="4.3" y2="4" stroke="#22c55e" strokeWidth="0.3" opacity="0.15" />
          </pattern>
        </defs>

        <rect width={W} height={H} fill="url(#iso-sky2)" />

        <g transform={`translate(${cx}, ${cy})`}>
          {/* 도로 */}
          <polygon points={roadPoints} fill="#1f2937" stroke="#374151" strokeWidth="0.5" />
          {Array.from({ length: 8 }, (_, i) => {
            const lx1 = -roadW / 2 + 8 + i * (roadW / 8), lx2 = lx1 + roadW / 16
            const p1 = toIso(lx1, roadCenterY, 0), p2 = toIso(lx2, roadCenterY, 0)
            return <line key={`rd-${i}`} x1={p1[0]} y1={p1[1]} x2={p2[0]} y2={p2[1]} stroke="#fbbf24" strokeWidth="0.6" opacity="0.5" />
          })}

          {/* 인도 */}
          <polygon points={sidewalkPoints} fill="#374151" stroke="#4b5563" strokeWidth="0.3" opacity="0.7" />

          {/* 대지 */}
          <polygon points={sitePoints} fill="url(#iso-grass)" stroke="#3b82f6" strokeWidth="1" opacity="0.7" />

          {/* 그림자 */}
          {blocks.map((b, i) => {
            const so = Math.min(10, buildH * 0.08 + 4)
            const sh = [toIso(b.x + so, b.y + so, 0), toIso(b.x + b.w + so, b.y + so, 0), toIso(b.x + b.w + so, b.y + b.d + so, 0), toIso(b.x + so, b.y + b.d + so, 0)]
            return <polygon key={`sh-${i}`} points={sh.map(p => `${p[0]},${p[1]}`).join(' ')} fill="#000" opacity="0.12" />
          })}

          {/* 건물 */}
          {blocks.map((b, bi) => {
            const gfH = floorH * 1.2
            return (
              <g key={`bl-${bi}`}>
                {/* 1F 좌면 */}
                <polygon points={isoFace([[b.x, b.y + b.d, 0], [b.x, b.y + b.d, gfH], [b.x, b.y, gfH], [b.x, b.y, 0]])} fill="url(#iso-gl)" stroke="#92400e" strokeWidth="0.4" />
                {/* 1F 우면 */}
                <polygon points={isoFace([[b.x, b.y, 0], [b.x, b.y, gfH], [b.x + b.w, b.y, gfH], [b.x + b.w, b.y, 0]])} fill="url(#iso-gr)" stroke="#92400e" strokeWidth="0.4" />

                {/* 1F 쇼윈도 좌 */}
                {Array.from({ length: Math.max(1, Math.round(b.d / 15)) }, (_, c) => {
                  const n = Math.max(1, Math.round(b.d / 15)), frac = 1 / n
                  const y1 = b.y + b.d * (0.08 + c * frac), y2 = b.y + b.d * (0.08 + c * frac + frac * 0.75)
                  return <polygon key={`gwl-${bi}-${c}`} points={isoFace([[b.x, y1, gfH * 0.15], [b.x, y2, gfH * 0.15], [b.x, y2, gfH * 0.85], [b.x, y1, gfH * 0.85]])} fill="#fbbf24" opacity="0.2" stroke="#f59e0b" strokeWidth="0.2" />
                })}
                {/* 1F 쇼윈도 우 */}
                {Array.from({ length: Math.max(1, Math.round(b.w / 12)) }, (_, c) => {
                  const n = Math.max(1, Math.round(b.w / 12)), frac = 1 / n
                  const x1 = b.x + b.w * (0.08 + c * frac), x2 = b.x + b.w * (0.08 + c * frac + frac * 0.75)
                  return <polygon key={`gwr-${bi}-${c}`} points={isoFace([[x1, b.y, gfH * 0.15], [x2, b.y, gfH * 0.15], [x2, b.y, gfH * 0.85], [x1, b.y, gfH * 0.85]])} fill="#fbbf24" opacity="0.25" stroke="#f59e0b" strokeWidth="0.2" />
                })}
                {/* 캐노피 */}
                <polygon points={isoFace([[b.x - 1.5, b.y - 1.5, gfH], [b.x + b.w * 0.4, b.y - 1.5, gfH], [b.x + b.w * 0.4, b.y, gfH], [b.x, b.y, gfH]])} fill="#334155" stroke="#475569" strokeWidth="0.3" opacity="0.7" />

                {/* 기준층 좌면 */}
                <polygon points={isoFace([[b.x, b.y + b.d, gfH], [b.x, b.y + b.d, b.h], [b.x, b.y, b.h], [b.x, b.y, gfH]])} fill="url(#iso-fl)" stroke="#334155" strokeWidth="0.5" />
                {/* 기준층 우면 */}
                <polygon points={isoFace([[b.x, b.y, gfH], [b.x, b.y, b.h], [b.x + b.w, b.y, b.h], [b.x + b.w, b.y, gfH]])} fill="url(#iso-fr)" stroke="#334155" strokeWidth="0.5" />
                {/* 상면 */}
                <polygon points={isoFace([[b.x, b.y, b.h], [b.x, b.y + b.d, b.h], [b.x + b.w, b.y + b.d, b.h], [b.x + b.w, b.y, b.h]])} fill="#3b82f6" stroke="#475569" strokeWidth="0.5" opacity="0.5" />

                {/* 창문 좌면 */}
                {Array.from({ length: Math.min(floors - 1, 20) }, (_, f) => {
                  const z = gfH + f * floorH, cols = Math.max(2, Math.min(5, Math.round(b.d / 14)))
                  return Array.from({ length: cols }, (_, c) => (
                    <IsoWindow key={`wl-${bi}-${f}-${c}`} face="left" bx={b.x} by={b.y} bw={b.w} bd={b.d} z={z} col={c} cols={cols} floorH={floorH} />
                  ))
                })}
                {/* 창문 우면 */}
                {Array.from({ length: Math.min(floors - 1, 20) }, (_, f) => {
                  const z = gfH + f * floorH, cols = Math.max(2, Math.min(7, Math.round(b.w / 10)))
                  return Array.from({ length: cols }, (_, c) => (
                    <IsoWindow key={`wr-${bi}-${f}-${c}`} face="right" bx={b.x} by={b.y} bw={b.w} bd={b.d} z={z} col={c} cols={cols} floorH={floorH} />
                  ))
                })}

                {/* 층 구분선 */}
                {Array.from({ length: Math.min(floors - 1, 20) }, (_, f) => {
                  const z = gfH + (f + 1) * floorH
                  if (z > b.h) return null
                  return (
                    <g key={`fl-${bi}-${f}`}>
                      <line x1={toIso(b.x, b.y + b.d, z)[0]} y1={toIso(b.x, b.y + b.d, z)[1]} x2={toIso(b.x, b.y, z)[0]} y2={toIso(b.x, b.y, z)[1]} stroke="#475569" strokeWidth="0.25" opacity="0.35" />
                      <line x1={toIso(b.x, b.y, z)[0]} y1={toIso(b.x, b.y, z)[1]} x2={toIso(b.x + b.w, b.y, z)[0]} y2={toIso(b.x + b.w, b.y, z)[1]} stroke="#475569" strokeWidth="0.25" opacity="0.35" />
                    </g>
                  )
                })}

                {/* 옥상 기계실 */}
                {(() => {
                  const mH = floorH * 0.4
                  return (
                    <>
                      <polygon points={isoFace([[b.x + b.w * 0.35, b.y + b.d * 0.7, b.h], [b.x + b.w * 0.35, b.y + b.d * 0.7, b.h + mH], [b.x + b.w * 0.35, b.y + b.d * 0.3, b.h + mH], [b.x + b.w * 0.35, b.y + b.d * 0.3, b.h]])} fill="#374151" stroke="#4b5563" strokeWidth="0.3" opacity="0.7" />
                      <polygon points={isoFace([[b.x + b.w * 0.35, b.y + b.d * 0.3, b.h], [b.x + b.w * 0.35, b.y + b.d * 0.3, b.h + mH], [b.x + b.w * 0.65, b.y + b.d * 0.3, b.h + mH], [b.x + b.w * 0.65, b.y + b.d * 0.3, b.h]])} fill="#4b5563" stroke="#64748b" strokeWidth="0.3" opacity="0.7" />
                      <polygon points={isoFace([[b.x + b.w * 0.35, b.y + b.d * 0.3, b.h + mH], [b.x + b.w * 0.35, b.y + b.d * 0.7, b.h + mH], [b.x + b.w * 0.65, b.y + b.d * 0.7, b.h + mH], [b.x + b.w * 0.65, b.y + b.d * 0.3, b.h + mH]])} fill="#64748b" stroke="#94a3b8" strokeWidth="0.3" opacity="0.5" />
                    </>
                  )
                })()}

                {/* 옥상 녹화 */}
                <polygon points={isoFace([[b.x + b.w * 0.05, b.y + b.d * 0.05, b.h], [b.x + b.w * 0.05, b.y + b.d * 0.25, b.h], [b.x + b.w * 0.3, b.y + b.d * 0.25, b.h], [b.x + b.w * 0.3, b.y + b.d * 0.05, b.h]])} fill="#15803d" stroke="#22c55e" strokeWidth="0.2" opacity="0.35" />

                {/* 라벨 */}
                {b.label && (
                  <text x={toIso(b.x + b.w / 2, b.y + b.d / 2, b.h + floorH * 0.7)[0]} y={toIso(b.x + b.w / 2, b.y + b.d / 2, b.h + floorH * 0.7)[1]} textAnchor="middle" fontSize="8" fill="#93c5fd" fontWeight="600">{b.label}</text>
                )}
              </g>
            )
          })}

          {/* 나무 */}
          <IsoTree x={-siteW / 2 + 5} y={-siteD / 2 + 5} size={1.2} />
          <IsoTree x={siteW / 2 - 6} y={-siteD / 2 + 4} size={1} />
          <IsoTree x={siteW / 2 - 4} y={siteD / 2 - 6} size={1.1} />
          <IsoTree x={-siteW / 2 + 8} y={siteD / 2 - 5} size={0.9} />
          <IsoTree x={-siteW / 3} y={siteD / 2 + 1} size={0.8} />
          <IsoTree x={siteW / 4} y={siteD / 2 + 1} size={0.8} />

          {/* 사람 */}
          <IsoPerson x={(blocks[0]?.x || -20) - 3} y={(blocks[0]?.y || 0) + (blocks[0]?.d || 20) + 2} scale={1} />
          <IsoPerson x={(blocks[0]?.x || -18) - 1} y={(blocks[0]?.y || 0) + (blocks[0]?.d || 20) + 3} scale={0.9} />
          <IsoPerson x={(blocks[0]?.x || -10) + 5} y={(blocks[0]?.y || 0) + (blocks[0]?.d || 20) + 1.5} scale={1} />

          {/* 차량 */}
          <IsoCar x={siteW / 2 - 8} y={siteD / 2 + 5} color="#64748b" />
          <IsoCar x={-siteW / 4} y={siteD / 2 + 8} color="#475569" />

          {/* 치수 */}
          {blocks.length > 0 && (() => {
            const b = blocks[0]
            const bottom = toIso(b.x + b.w + 6, b.y - 2, 0), top = toIso(b.x + b.w + 6, b.y - 2, b.h)
            return (
              <>
                <line x1={bottom[0]} y1={bottom[1]} x2={top[0]} y2={top[1]} stroke="#f87171" strokeWidth="0.5" opacity="0.7" />
                <line x1={bottom[0] - 3} y1={bottom[1]} x2={bottom[0] + 3} y2={bottom[1]} stroke="#f87171" strokeWidth="0.4" opacity="0.7" />
                <line x1={top[0] - 3} y1={top[1]} x2={top[0] + 3} y2={top[1]} stroke="#f87171" strokeWidth="0.4" opacity="0.7" />
                <text x={top[0] + 10} y={(top[1] + bottom[1]) / 2} fontSize="7" fill="#f87171">{floors}층</text>
                <text x={top[0] + 10} y={(top[1] + bottom[1]) / 2 + 10} fontSize="6" fill="#94a3b8">{(floors * 3.3).toFixed(1)}m</text>
              </>
            )
          })()}

          {/* 1F 라벨 */}
          {blocks.length > 0 && (() => {
            const b = blocks[0], lbl = toIso(b.x - 3, b.y + b.d / 2, floorH * 0.6)
            return <text x={lbl[0] - 6} y={lbl[1]} fontSize="5.5" fill="#fbbf24" opacity="0.8">1F 상가</text>
          })()}
        </g>

        {/* 방위표 */}
        <g transform={`translate(${W - 35}, 30)`}>
          <circle cx="0" cy="0" r="10" fill="none" stroke="#475569" strokeWidth="0.5" />
          <polygon points="0,-9 -2.5,0 0,-3 2.5,0" fill="#f87171" opacity="0.8" />
          <polygon points="0,9 -2.5,0 0,3 2.5,0" fill="#475569" opacity="0.5" />
          <text x="0" y="-13" textAnchor="middle" fontSize="7" fill="#f87171" fontWeight="700">N</text>
        </g>

        <text x={W / 2} y={H - 8} textAnchor="middle" fontSize="7" fill="#64748b">
          {layoutName || type} · {floors}층 · {units}세대 · 건폐율 {buildingCoverage}% · 대지 {siteArea.toLocaleString()}㎡
        </text>
      </svg>
    </div>
  )
}
