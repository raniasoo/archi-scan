"use client"
import { getBuildingDimensionsInMeters } from "@/lib/building-geometry"
import { getPatternVisuals } from "@/lib/alexander-patterns"

import React, { useState } from "react"

interface ElevationViewProps {
  siteArea: number
  buildingCoverage: number
  floors: number
  units: number
  buildingCount?: number
  originalType?: string
  type: "tower" | "courtyard" | "lshape" | "linear" | "cluster"
  layoutName?: string
  roadWidth: number
  heightLimit: number
}

export function ElevationView({
  siteArea, buildingCoverage, floors, units, buildingCount, originalType, type, layoutName,
  roadWidth, heightLimit,
}: ElevationViewProps) {
  const [face, setFace] = useState<"front" | "side">("front")
  const W = 500, H = 380
  const groundY = H - 60
  const PAD = 50

  // 건물 크기 계산
  const floorH = 3.3
  const gfH = 4.5
  const totalH = gfH + (floors - 1) * floorH
  const mechH = 3

  // 스케일
  const maxBldH = groundY - PAD - 30
  const vScale = maxBldH / (totalH + mechH + 4)

  // 건물 폭 — building-geometry 전체 블록 바운딩 박스 사용
  const geo = getBuildingDimensionsInMeters({ type, coverage: buildingCoverage, siteArea, floors, buildingCount, originalType })
  const pv = getPatternVisuals({ type, floors, units, coverage: buildingCoverage, siteArea, buildingCount })
  const effectiveBldgCount = geo.effectiveBuildingCount
  
  // ━━━ 다중 블록: 바운딩 박스로 전체 건물 폭/깊이 계산 ━━━
  const bm = geo.blocksInMeters
  let bldRealW: number, bldRealD: number
  
  if (bm.length > 1) {
    const minX = Math.min(...bm.map(b => b.centerXM - b.widthM / 2))
    const maxX = Math.max(...bm.map(b => b.centerXM + b.widthM / 2))
    const minZ = Math.min(...bm.map(b => b.centerZM - b.depthM / 2))
    const maxZ = Math.max(...bm.map(b => b.centerZM + b.depthM / 2))
    bldRealW = Math.round(maxX - minX)
    bldRealD = Math.round(maxZ - minZ)
  } else {
    const firstBlock = bm[0]
    bldRealW = Math.round(firstBlock?.widthM || 10)
    bldRealD = Math.round(firstBlock?.depthM || 10)
  }

  const faceW = face === "front" ? bldRealW : bldRealD
  const hScale = Math.min((W - PAD * 2 - 40) / faceW, vScale)
  const bldW = faceW * hScale
  const bldH = totalH * vScale
  const bldX = (W - bldW) / 2
  const bldTopY = groundY - bldH

  // 창문 패턴
  const winCols = Math.max(3, Math.min(12, Math.round(bldW / 18)))
  const winMargin = bldW * 0.08
  const winTotalW = bldW - winMargin * 2
  const winW = (winTotalW / winCols) * 0.7
  const winGap = (winTotalW - winW * winCols) / Math.max(winCols - 1, 1)

  return (
    <div className="w-full">
      {/* 정면/측면 토글 */}
      <div className="flex justify-center gap-1 mb-2">
        {(["front", "side"] as const).map(f => (
          <button key={f} onClick={() => setFace(f)}
            className={`px-3 py-1 text-[10px] font-medium rounded transition-colors ${
              face === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}>
            {f === "front" ? "정면도" : "측면도"}
          </button>
        ))}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full bg-slate-950 rounded-lg border border-slate-800">
        <defs>
          <linearGradient id="elev-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0a0f1e" />
            <stop offset="70%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>
          <linearGradient id="elev-bld" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          <linearGradient id="elev-gf" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#78350f" />
            <stop offset="100%" stopColor="#451a03" />
          </linearGradient>
        </defs>

        {/* 배경 */}
        <rect width={W} height={H} fill="url(#elev-sky)" />

        {/* 지면 */}
        <rect x="0" y={groundY} width={W} height={H - groundY} fill="#1c1917" />
        <line x1="0" y1={groundY} x2={W} y2={groundY} stroke="#78716c" strokeWidth="1" />

        {/* 도로 */}
        <rect x={bldX - 20} y={groundY} width={bldW + 40} height={10} fill="#374151" rx="1" />
        <line x1={bldX - 20} y1={groundY + 5} x2={bldX + bldW + 20} y2={groundY + 5}
          stroke="#fbbf24" strokeWidth="0.5" strokeDasharray="6 3" opacity="0.4" />

        {/* 건물 본체 — 다중 블록 프로필 */}
        {bm.length > 1 ? (
          bm.map((b, i) => {
            const minX = Math.min(...bm.map(bb => face === 'front' ? bb.centerXM - bb.widthM / 2 : bb.centerZM - bb.depthM / 2))
            const blockFaceW = face === 'front' ? b.widthM : b.depthM
            const blockFaceX = face === 'front' ? (b.centerXM - b.widthM / 2) : (b.centerZM - b.depthM / 2)
            const bx = bldX + (blockFaceX - minX) * hScale
            const bw = blockFaceW * hScale
            return (<g key={`blk-${i}`}>
              <rect x={bx} y={bldTopY} width={bw} height={bldH} fill="url(#elev-bld)" stroke="#475569" strokeWidth="0.8" />
              {/* 재료 표현 — 상부 타일 패턴 */}
              {Array.from({ length: Math.floor(bw / 6) }, (_, j) => (
                <line key={`tile-${i}-${j}`} x1={bx + j * 6} y1={bldTopY} x2={bx + j * 6} y2={bldTopY + bldH - gfH * vScale} stroke="#4b5563" strokeWidth="0.15" opacity="0.3" />
              ))}
            </g>)
          })
        ) : (<g>
          <rect x={bldX} y={bldTopY} width={bldW} height={bldH} fill="url(#elev-bld)" stroke="#475569" strokeWidth="0.8" />
          {/* 외벽 재료 — 세로 줄눈 패턴 */}
          {Array.from({ length: Math.floor(bldW / 8) }, (_, j) => (
            <line key={`tile-${j}`} x1={bldX + j * 8 + 4} y1={bldTopY} x2={bldX + j * 8 + 4} y2={bldTopY + bldH - gfH * vScale} stroke="#4b5563" strokeWidth="0.15" opacity="0.25" />
          ))}
        </g>)}

        {/* 1층 (상가/로비) — 석재 마감 표현 */}
        <rect x={bldX} y={groundY - gfH * vScale} width={bldW} height={gfH * vScale}
          fill="url(#elev-gf)" stroke="#92400e" strokeWidth="0.8" />
        {/* 1층 석재 줄눈 */}
        {Array.from({ length: Math.floor(gfH * vScale / 4) }, (_, r) => (
          <line key={`stone-${r}`} x1={bldX} y1={groundY - gfH * vScale + r * 4 + 2} x2={bldX + bldW} y2={groundY - gfH * vScale + r * 4 + 2} stroke="#a16207" strokeWidth="0.15" opacity="0.4" />
        ))}

        {/* 1층 쇼윈도 (대형 유리) */}
        {Array.from({ length: Math.max(2, Math.min(8, winCols - 1)) }, (_, c) => {
          const n = Math.max(2, Math.min(8, winCols - 1))
          const sw = (bldW - winMargin * 2) / n * 0.75
          const sgap = ((bldW - winMargin * 2) - sw * n) / Math.max(n - 1, 1)
          const sx = bldX + winMargin + c * (sw + sgap)
          const sy = groundY - gfH * vScale * 0.85
          const sh = gfH * vScale * 0.65
          return (<g key={`gw-${c}`}>
            <rect x={sx} y={sy} width={sw} height={sh} fill="#fbbf24" opacity="0.15" stroke="#f59e0b" strokeWidth="0.4" rx="0.5" />
            {/* 유리 반사 효과 */}
            <line x1={sx + 2} y1={sy + 2} x2={sx + sw * 0.3} y2={sy + sh - 2} stroke="#fbbf24" strokeWidth="0.2" opacity="0.3" />
          </g>)
        })}

        {/* 출입구 — 유리 자동문 + 사이드라이트 */}
        <rect x={bldX + bldW / 2 - 12} y={groundY - gfH * vScale * 0.9} width={24} height={gfH * vScale * 0.85}
          fill="#0c1929" stroke="#64748b" strokeWidth="0.5" rx="0.5" />
        {/* 유리 패널 2장 */}
        <rect x={bldX + bldW / 2 - 5} y={groundY - gfH * vScale * 0.85} width={4.5} height={gfH * vScale * 0.75}
          fill="#1e3a5f" stroke="#38bdf8" strokeWidth="0.3" rx="0.3" opacity="0.6" />
        <rect x={bldX + bldW / 2 + 0.5} y={groundY - gfH * vScale * 0.85} width={4.5} height={gfH * vScale * 0.75}
          fill="#1e3a5f" stroke="#38bdf8" strokeWidth="0.3" rx="0.3" opacity="0.6" />
        <text x={bldX + bldW / 2} y={groundY - gfH * vScale * 0.2}
          textAnchor="middle" fontSize="4.5" fill="#94a3b8" fontWeight="500">ENTRANCE</text>

        {/* 캐노피 (넓은 차양) */}
        <rect x={bldX + bldW / 2 - 18} y={groundY - gfH * vScale - 3} width={36} height={3}
          fill="#374151" stroke="#64748b" strokeWidth="0.4" rx="0.5" />
        {/* 캐노피 하부 조명 */}
        {Array.from({ length: 3 }, (_, i) => (
          <circle key={`cl-${i}`} cx={bldX + bldW / 2 - 10 + i * 10} cy={groundY - gfH * vScale - 1} r="0.8" fill="#fbbf24" opacity="0.6" />
        ))}

        {/* ━━━ 기준층 발코니 + 창문 (층별 차별화) ━━━ */}
        {Array.from({ length: floors - 1 }, (_, f) => {
          const fz = gfH + f * floorH
          const fy = groundY - fz * vScale - floorH * vScale * 0.85
          const fh = floorH * vScale * 0.55
          const isTopFloor = f === floors - 2
          return (<g key={`floor-${f}`}>
            {Array.from({ length: winCols }, (_, c) => {
              const wx = bldX + winMargin + c * (winW + winGap)
              const isCorner = c === 0 || c === winCols - 1
              const ww = isCorner ? winW * 1.1 : winW
              const wh = isTopFloor ? fh * 1.15 : fh  // 최상층 더 큰 창
              return (<g key={`w-${f}-${c}`}>
                {/* 창문 */}
                <rect x={wx} y={fy} width={ww} height={wh}
                  fill="#7dd3fc" opacity={0.15 + f * 0.01} stroke="#38bdf8" strokeWidth="0.3" rx="0.3" />
                {/* 창틀 중앙 세로선 */}
                <line x1={wx + ww/2} y1={fy} x2={wx + ww/2} y2={fy + wh} stroke="#38bdf8" strokeWidth="0.15" opacity="0.4" />
              </g>)
            })}
            {/* 발코니 슬래브 (돌출) */}
            <rect x={bldX - 2} y={fy + fh + 1} width={bldW + 4} height={1.5}
              fill="#475569" stroke="#64748b" strokeWidth="0.2" />
            {/* 발코니 난간 (유리) */}
            <line x1={bldX - 2} y1={fy + fh + 1} x2={bldX - 2} y2={fy + fh - 2} stroke="#94a3b8" strokeWidth="0.3" opacity="0.5" />
            <line x1={bldX + bldW + 2} y1={fy + fh + 1} x2={bldX + bldW + 2} y2={fy + fh - 2} stroke="#94a3b8" strokeWidth="0.3" opacity="0.5" />
          </g>)
        })}

        {/* 층 구분선 */}
        {Array.from({ length: floors }, (_, f) => {
          const fz = f === 0 ? gfH : gfH + f * floorH
          return <line key={`fl-${f}`} x1={bldX} y1={groundY - fz * vScale} x2={bldX + bldW} y2={groundY - fz * vScale}
            stroke="#475569" strokeWidth="0.3" opacity="0.3" />
        })}

        {/* 옥상 기계실 */}
        <rect x={bldX + bldW * 0.35} y={bldTopY - mechH * vScale} width={bldW * 0.3} height={mechH * vScale}
          fill="#374151" stroke="#4b5563" strokeWidth="0.5" />
        {/* 실외기 (옥상) */}
        {Array.from({ length: 3 }, (_, i) => (
          <rect key={`ac-${i}`} x={bldX + bldW * 0.7 + i * 8} y={bldTopY - 4} width={5} height={4}
            fill="#4b5563" stroke="#64748b" strokeWidth="0.3" rx="0.3" />
        ))}

        {/* 옥상 난간 (유리 + 금속 포스트) */}
        <line x1={bldX} y1={bldTopY} x2={bldX + bldW} y2={bldTopY} stroke="#64748b" strokeWidth="1.2" />
        {Array.from({ length: Math.ceil(bldW / 10) }, (_, i) => (
          <line key={`rail-${i}`} x1={bldX + i * 10 + 2} y1={bldTopY}
            x2={bldX + i * 10 + 2} y2={bldTopY - 3.5}
            stroke="#94a3b8" strokeWidth="0.5" />
        ))}
        {/* 옥상 유리 난간 */}
        <rect x={bldX} y={bldTopY - 3.5} width={bldW} height={3.5}
          fill="#38bdf8" opacity="0.05" stroke="#64748b" strokeWidth="0.2" />

        {/* ━━━ 조경 (좌우 나무) ━━━ */}
        {[bldX - 20, bldX + bldW + 8].map((tx, ti) => (
          <g key={`tree-${ti}`}>
            <rect x={tx + 3} y={groundY - 18} width={2} height={18} fill="#3f2d1c" rx="0.5" />
            <circle cx={tx + 4} cy={groundY - 22} r="8" fill="#166534" opacity="0.7" />
            <circle cx={tx + 1} cy={groundY - 18} r="6" fill="#15803d" opacity="0.6" />
            <circle cx={tx + 7} cy={groundY - 19} r="5" fill="#166534" opacity="0.5" />
          </g>
        ))}
        {/* 관목 */}
        {[bldX - 8, bldX + bldW + 2].map((sx, si) => (
          <ellipse key={`shrub-${si}`} cx={sx} cy={groundY - 2} rx="5" ry="3" fill="#15803d" opacity="0.4" />
        ))}

        {/* 높이 치수 (좌측) */}
        <line x1={bldX - 15} y1={groundY} x2={bldX - 15} y2={bldTopY}
          stroke="#f87171" strokeWidth="0.5" />
        <line x1={bldX - 19} y1={groundY} x2={bldX - 11} y2={groundY}
          stroke="#f87171" strokeWidth="0.4" />
        <line x1={bldX - 19} y1={bldTopY} x2={bldX - 11} y2={bldTopY}
          stroke="#f87171" strokeWidth="0.4" />
        <text x={bldX - 17} y={bldTopY + bldH / 2 + 2}
          textAnchor="middle" fontSize="6" fill="#f87171"
          transform={`rotate(-90, ${bldX - 17}, ${bldTopY + bldH / 2})`}>
          {totalH.toFixed(1)}m
        </text>

        {/* 층수 (우측) */}
        {[0, Math.floor(floors / 2), floors - 1].map(f => {
          const fz = f === 0 ? gfH / 2 : gfH + (f - 0.5) * floorH
          const y = groundY - fz * vScale
          return (
            <text key={`fn-${f}`} x={bldX + bldW + 8} y={y + 2} fontSize="5" fill="#94a3b8">
              {f + 1}F
            </text>
          )
        })}

        {/* 폭 치수 (하단) */}
        <line x1={bldX} y1={groundY + 16} x2={bldX + bldW} y2={groundY + 16}
          stroke="#f87171" strokeWidth="0.5" />
        <line x1={bldX} y1={groundY + 13} x2={bldX} y2={groundY + 19}
          stroke="#f87171" strokeWidth="0.4" />
        <line x1={bldX + bldW} y1={groundY + 13} x2={bldX + bldW} y2={groundY + 19}
          stroke="#f87171" strokeWidth="0.4" />
        <text x={bldX + bldW / 2} y={groundY + 24}
          textAnchor="middle" fontSize="6" fill="#f87171">
          {faceW.toFixed(1)}m
        </text>

        {/* 높이 제한선 */}
        {heightLimit > 0 && heightLimit < 200 && (
          <>
            <line x1={PAD} y1={groundY - heightLimit * vScale}
              x2={W - PAD} y2={groundY - heightLimit * vScale}
              stroke="#ef4444" strokeWidth="0.6" strokeDasharray="5 3" opacity="0.5" />
            <text x={W - PAD + 2} y={groundY - heightLimit * vScale + 3}
              fontSize="5" fill="#ef4444" opacity="0.7">
              높이제한 {heightLimit}m
            </text>
          </>
        )}

        {/* 정보 */}
        <text x={W / 2} y={H - 6} textAnchor="middle" fontSize="6" fill="#64748b">
          {layoutName || type} {type === 'cluster' ? '동A ' : ''}{face === "front" ? "정면도" : "측면도"} · {floors}층 · {totalH.toFixed(1)}m
        </text>
      </svg>
    </div>
  )
}
