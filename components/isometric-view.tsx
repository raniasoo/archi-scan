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

// 아이소메트릭 박스 (상면, 좌면, 우면)
function IsoBox({ x, y, z, w, d, h, topColor, leftColor, rightColor, stroke = "#475569", opacity = 1 }: {
  x: number; y: number; z: number; w: number; d: number; h: number
  topColor: string; leftColor: string; rightColor: string
  stroke?: string; opacity?: number
}) {
  // 8 꼭짓점 → 아이소메트릭 투영
  const p = {
    ftl: toIso(x, y, z + h),         // front-top-left
    ftr: toIso(x + w, y, z + h),     // front-top-right
    fbr: toIso(x + w, y, z),         // front-bottom-right
    fbl: toIso(x, y, z),             // front-bottom-left
    btl: toIso(x, y + d, z + h),     // back-top-left
    btr: toIso(x + w, y + d, z + h), // back-top-right
    bbr: toIso(x + w, y + d, z),     // back-bottom-right
  }

  // 상면
  const top = `${p.ftl[0]},${p.ftl[1]} ${p.ftr[0]},${p.ftr[1]} ${p.btr[0]},${p.btr[1]} ${p.btl[0]},${p.btl[1]}`
  // 좌면 (전면)
  const left = `${p.ftl[0]},${p.ftl[1]} ${p.btl[0]},${p.btl[1]} ${p.btl[0]},${p.btl[1] + h} ${p.ftl[0]},${p.ftl[1] + h}`
  // 실제 좌면
  const leftFace = `${p.fbl[0]},${p.fbl[1]} ${p.ftl[0]},${p.ftl[1]} ${p.btl[0]},${p.btl[1]} ${p.btl[0]},${p.btl[1] + h}`
  // 우면
  const right = `${p.fbl[0]},${p.fbl[1]} ${p.fbr[0]},${p.fbr[1]} ${p.ftr[0]},${p.ftr[1]} ${p.ftl[0]},${p.ftl[1]}`

  return (
    <g opacity={opacity}>
      {/* 상면 */}
      <polygon points={top} fill={topColor} stroke={stroke} strokeWidth="0.8" />
      {/* 좌면 */}
      <polygon points={`${p.ftl[0]},${p.ftl[1]} ${p.btl[0]},${p.btl[1]} ${p.btl[0] + (p.bbr[0] - p.btr[0]) * 0},${p.btl[1] + h * 0 + (p.bbr[1] - p.btr[1])} ${p.fbl[0]},${p.fbl[1]}`}
        fill={leftColor} stroke={stroke} strokeWidth="0.8" />
      {/* 우면 */}
      <polygon points={right} fill={rightColor} stroke={stroke} strokeWidth="0.8" />
    </g>
  )
}

export function IsometricView({ siteArea, buildingCoverage, floors, units, type, layoutName, zoneType }: IsometricViewProps) {
  const W = 500, H = 400
  const cx = W / 2, cy = H * 0.65

  // 대지 크기 (스케일링)
  const baseSize = Math.min(80, Math.sqrt(siteArea) * 0.8)
  const siteW = baseSize
  const siteD = baseSize * 0.8

  // 건물 높이 (층수 기반)
  const floorH = Math.min(12, 120 / Math.max(floors, 3))
  const buildH = floors * floorH

  // 건물 크기 (건폐율 기반)
  const bldRatio = Math.sqrt(buildingCoverage / 100) * 0.9

  // 배치 유형별 건물 블록
  const getBlocks = () => {
    const bW = siteW * bldRatio
    const bD = siteD * bldRatio
    const offsetX = (siteW - bW) / 2
    const offsetY = (siteD - bD) / 2

    switch (type) {
      case "tower":
        return [{ x: -bW / 2, y: -bD / 2, w: bW, d: bD, h: buildH, label: "타워" }]
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
        const gap = bW * 0.08
        const blockW = (bW - gap) / 2
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

  // 색상
  const floorColors = {
    top: "#60a5fa",
    left: "#1e3a5f",
    right: "#2563eb",
  }

  // 대지 아이소메트릭 좌표
  const siteCorners = [
    toIso(-siteW / 2, -siteD / 2, 0),
    toIso(siteW / 2, -siteD / 2, 0),
    toIso(siteW / 2, siteD / 2, 0),
    toIso(-siteW / 2, siteD / 2, 0),
  ]
  const sitePoints = siteCorners.map(p => `${p[0]},${p[1]}`).join(' ')

  // 층 표시 라인 (우측면)
  const floorLines = []
  if (blocks.length > 0) {
    const b = blocks[0]
    for (let f = 1; f <= floors; f++) {
      const z = f * floorH
      const start = toIso(b.x + b.w, b.y, z)
      const end = toIso(b.x + b.w, b.y + b.d, z)
      floorLines.push({ y1: start, y2: end, floor: f })
    }
  }

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full bg-slate-950 rounded-lg border border-slate-800">
        <defs>
          <linearGradient id="iso-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0c1526" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
        </defs>

        {/* 배경 */}
        <rect width={W} height={H} fill="url(#iso-sky)" />

        <g transform={`translate(${cx}, ${cy})`}>
          {/* 대지 */}
          <polygon points={sitePoints}
            fill="#16283e" stroke="#3b82f6" strokeWidth="1" opacity="0.6" />

          {/* 그림자 */}
          {blocks.map((b, i) => {
            const shadowOffset = 8
            const sh = [
              toIso(b.x + shadowOffset, b.y + shadowOffset, 0),
              toIso(b.x + b.w + shadowOffset, b.y + shadowOffset, 0),
              toIso(b.x + b.w + shadowOffset, b.y + b.d + shadowOffset, 0),
              toIso(b.x + shadowOffset, b.y + b.d + shadowOffset, 0),
            ]
            return (
              <polygon key={`shadow-${i}`}
                points={sh.map(p => `${p[0]},${p[1]}`).join(' ')}
                fill="#000" opacity="0.15" />
            )
          })}

          {/* 건물 블록 — 층별 그리드 */}
          {blocks.map((b, bi) => (
            <g key={`block-${bi}`}>
              {/* 메인 박스 — 좌면 */}
              <polygon
                points={[
                  toIso(b.x, b.y + b.d, 0),
                  toIso(b.x, b.y + b.d, b.h),
                  toIso(b.x, b.y, b.h),
                  toIso(b.x, b.y, 0),
                ].map(p => `${p[0]},${p[1]}`).join(' ')}
                fill={floorColors.left} stroke="#475569" strokeWidth="0.5" />
              {/* 우면 */}
              <polygon
                points={[
                  toIso(b.x, b.y, 0),
                  toIso(b.x, b.y, b.h),
                  toIso(b.x + b.w, b.y, b.h),
                  toIso(b.x + b.w, b.y, 0),
                ].map(p => `${p[0]},${p[1]}`).join(' ')}
                fill={floorColors.right} stroke="#475569" strokeWidth="0.5" />
              {/* 상면 */}
              <polygon
                points={[
                  toIso(b.x, b.y, b.h),
                  toIso(b.x, b.y + b.d, b.h),
                  toIso(b.x + b.w, b.y + b.d, b.h),
                  toIso(b.x + b.w, b.y, b.h),
                ].map(p => `${p[0]},${p[1]}`).join(' ')}
                fill={floorColors.top} stroke="#475569" strokeWidth="0.5" opacity="0.8" />

              {/* 층별 수평선 (좌면) */}
              {Array.from({ length: floors - 1 }, (_, f) => {
                const z = (f + 1) * floorH
                const l1 = toIso(b.x, b.y + b.d, z)
                const l2 = toIso(b.x, b.y, z)
                return <line key={`fl-${bi}-${f}`} x1={l1[0]} y1={l1[1]} x2={l2[0]} y2={l2[1]}
                  stroke="#4b6a8a" strokeWidth="0.3" opacity="0.5" />
              })}

              {/* 층별 수평선 (우면) */}
              {Array.from({ length: floors - 1 }, (_, f) => {
                const z = (f + 1) * floorH
                const l1 = toIso(b.x, b.y, z)
                const l2 = toIso(b.x + b.w, b.y, z)
                return <line key={`fr-${bi}-${f}`} x1={l1[0]} y1={l1[1]} x2={l2[0]} y2={l2[1]}
                  stroke="#3b5998" strokeWidth="0.3" opacity="0.5" />
              })}

              {/* 블록 라벨 */}
              {b.label && (
                <text
                  x={toIso(b.x + b.w / 2, b.y + b.d / 2, b.h + 6)[0]}
                  y={toIso(b.x + b.w / 2, b.y + b.d / 2, b.h + 6)[1]}
                  textAnchor="middle" fontSize="8" fill="#93c5fd" fontWeight="600">
                  {b.label}
                </text>
              )}
            </g>
          ))}

          {/* 층수 표시 (우측) */}
          {blocks.length > 0 && (() => {
            const b = blocks[0]
            const bottom = toIso(b.x + b.w + 5, b.y, 0)
            const top = toIso(b.x + b.w + 5, b.y, b.h)
            return (
              <>
                <line x1={bottom[0]} y1={bottom[1]} x2={top[0]} y2={top[1]}
                  stroke="#f87171" strokeWidth="0.5" />
                <line x1={bottom[0] - 3} y1={bottom[1]} x2={bottom[0] + 3} y2={bottom[1]}
                  stroke="#f87171" strokeWidth="0.4" />
                <line x1={top[0] - 3} y1={top[1]} x2={top[0] + 3} y2={top[1]}
                  stroke="#f87171" strokeWidth="0.4" />
                <text x={top[0] + 8} y={(top[1] + bottom[1]) / 2 + 3}
                  fontSize="7" fill="#f87171">{floors}층</text>
                <text x={top[0] + 8} y={(top[1] + bottom[1]) / 2 + 12}
                  fontSize="6" fill="#94a3b8">{(floors * 3.3).toFixed(1)}m</text>
              </>
            )
          })()}
        </g>

        {/* 정보 */}
        <text x={W / 2} y={H - 8} textAnchor="middle" fontSize="7" fill="#64748b">
          {layoutName || type} · {floors}층 · {units}세대 · 건폐율 {buildingCoverage}%
        </text>
      </svg>
    </div>
  )
}
