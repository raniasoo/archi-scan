"use client"

import React, { useState } from "react"

interface ElevationViewProps {
  siteArea: number
  buildingCoverage: number
  floors: number
  units: number
  type: "tower" | "courtyard" | "lshape" | "linear" | "cluster"
  layoutName?: string
  roadWidth: number
  heightLimit: number
}

export function ElevationView({
  siteArea, buildingCoverage, floors, units, type, layoutName,
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

  // 건물 폭 (배치 유형별)
  const siteRealW = Math.sqrt(siteArea * 1.25)
  const bldRatio = Math.sqrt(buildingCoverage / 100) * 0.85
  const bldRealW = siteRealW * bldRatio
  const bldRealD = (siteArea / siteRealW) * bldRatio

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

        {/* 건물 본체 */}
        <rect x={bldX} y={bldTopY} width={bldW} height={bldH}
          fill="url(#elev-bld)" stroke="#475569" strokeWidth="0.8" />

        {/* 1층 (상가/로비) */}
        <rect x={bldX} y={groundY - gfH * vScale} width={bldW} height={gfH * vScale}
          fill="url(#elev-gf)" stroke="#92400e" strokeWidth="0.5" />

        {/* 1층 쇼윈도 */}
        {Array.from({ length: Math.max(2, Math.min(8, winCols - 1)) }, (_, c) => {
          const n = Math.max(2, Math.min(8, winCols - 1))
          const sw = (bldW - winMargin * 2) / n * 0.75
          const sgap = ((bldW - winMargin * 2) - sw * n) / Math.max(n - 1, 1)
          const sx = bldX + winMargin + c * (sw + sgap)
          const sy = groundY - gfH * vScale * 0.85
          const sh = gfH * vScale * 0.65
          return (
            <rect key={`gw-${c}`} x={sx} y={sy} width={sw} height={sh}
              fill="#fbbf24" opacity="0.2" stroke="#f59e0b" strokeWidth="0.3" rx="0.5" />
          )
        })}

        {/* 출입구 */}
        <rect x={bldX + bldW / 2 - 8} y={groundY - gfH * vScale * 0.85} width={16} height={gfH * vScale * 0.8}
          fill="#1e293b" stroke="#64748b" strokeWidth="0.5" rx="1" />
        <text x={bldX + bldW / 2} y={groundY - gfH * vScale * 0.3}
          textAnchor="middle" fontSize="5" fill="#94a3b8">출입구</text>

        {/* 캐노피 */}
        <rect x={bldX + bldW / 2 - 14} y={groundY - gfH * vScale - 2} width={28} height={2.5}
          fill="#475569" stroke="#64748b" strokeWidth="0.3" rx="0.5" />

        {/* 기준층 창문 */}
        {Array.from({ length: floors - 1 }, (_, f) => {
          const fz = gfH + f * floorH
          const fy = groundY - fz * vScale - floorH * vScale * 0.85
          const fh = floorH * vScale * 0.6
          return Array.from({ length: winCols }, (_, c) => {
            const wx = bldX + winMargin + c * (winW + winGap)
            return (
              <rect key={`w-${f}-${c}`} x={wx} y={fy} width={winW} height={fh}
                fill="#7dd3fc" opacity="0.2" stroke="#38bdf8" strokeWidth="0.2" rx="0.3" />
            )
          })
        })}

        {/* 층 구분선 */}
        {Array.from({ length: floors }, (_, f) => {
          const fz = f === 0 ? gfH : gfH + f * floorH
          const y = groundY - fz * vScale
          return (
            <line key={`fl-${f}`} x1={bldX} y1={y} x2={bldX + bldW} y2={y}
              stroke="#475569" strokeWidth="0.3" opacity="0.3" />
          )
        })}

        {/* 옥상 기계실 */}
        <rect x={bldX + bldW * 0.35} y={bldTopY - mechH * vScale} width={bldW * 0.3} height={mechH * vScale}
          fill="#374151" stroke="#4b5563" strokeWidth="0.5" />

        {/* 옥상 난간 */}
        <line x1={bldX} y1={bldTopY} x2={bldX + bldW} y2={bldTopY}
          stroke="#64748b" strokeWidth="1.2" />
        {Array.from({ length: Math.ceil(bldW / 8) }, (_, i) => (
          <line key={`rail-${i}`} x1={bldX + i * 8 + 2} y1={bldTopY}
            x2={bldX + i * 8 + 2} y2={bldTopY - 2}
            stroke="#64748b" strokeWidth="0.4" />
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
          {layoutName || type} {face === "front" ? "정면도" : "측면도"} · {floors}층 · {totalH.toFixed(1)}m
        </text>
      </svg>
    </div>
  )
}
