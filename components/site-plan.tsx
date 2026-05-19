"use client"

import React from "react"
import { computePlacement, toSvgCoords, type PlacementResult } from "@/lib/layout-placement-engine"

interface SitePlanProps {
  siteArea: number
  buildingCoverage: number  // %
  floors: number
  units: number
  parking: number
  buildingCount?: number
  originalType?: string
  type: "tower" | "courtyard" | "lshape" | "linear" | "cluster"
  setbacks: { front: number; side: number; rear: number }
  landscapingRatio: number  // %
  roadWidth: number
  hasDistrictPlan: boolean
  layoutName?: string
  sitePolygon?: { coords: [number, number][]; centroid: [number, number] } | null
}

export function SitePlan({
  siteArea, buildingCoverage, floors, units, parking, buildingCount, originalType, type,
  setbacks, landscapingRatio, roadWidth, hasDistrictPlan,
  layoutName = "", sitePolygon,
}: SitePlanProps) {
  const W = 500, H = 520
  const PAD = 50

  // ━━━ Single Source of Truth: 배치 엔진 호출 ━━━
  const placement = computePlacement({
    sitePolygon,
    siteArea,
    buildingType: type,
    originalType: originalType || type,
    buildingCount,
    coverage: buildingCoverage,
    floors,
    setbacks,
    roadWidth,
  })

  // ━━━ 미터 좌표 → SVG 픽셀 좌표 변환 ━━━
  const svg = toSvgCoords(placement, W, H, PAD)
  const { siteX, siteY, siteW, siteH, svgScale, buildings: svgBuildings } = svg
  const hasRealShape = placement.site.isRealPolygon

  // 이격거리 (미터 → SVG)
  const sf = setbacks.front * svgScale
  const ss = setbacks.side * svgScale
  const sr = setbacks.rear * svgScale

  // 주차 영역
  const parkingW = siteW * 0.3
  const parkingH = siteH * 0.12
  const parkingX = siteX + siteW * 0.05
  const parkingY = siteY + siteH - sf - parkingH - 2

  // 조경 영역
  const landscapeArea = siteArea * landscapingRatio / 100
  const lsW = siteW * 0.2
  const lsH = landscapeArea > 0 ? Math.min(siteH * 0.15, landscapeArea * svgScale * svgScale / lsW) : 0

  // 출입구
  const entryX = siteX + siteW / 2
  const entryY = siteY + siteH

  // 도로
  const roadH = 18
  const roadY = siteY + siteH + 2

  // 건물 라벨
  const buildingLabel = type === 'tower' ? '타워동' : type === 'linear' ? '판상형' :
    type === 'lshape' ? 'ㄱ자형' : type === 'courtyard' ? 'ㅁ자형' : ''

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full bg-slate-950 rounded-lg border border-slate-800">
        <defs>
          <pattern id="sp-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.3" />
          </pattern>
          <pattern id="sp-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="#22c55e" strokeWidth="0.5" opacity="0.3" />
          </pattern>
          <pattern id="sp-parking-hatch" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="#64748b10" />
            <line x1="0" y1="4" x2="8" y2="4" stroke="#64748b" strokeWidth="0.3" opacity="0.3" />
          </pattern>
          <marker id="sp-arrow" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
            <path d="M0,0 L6,2 L0,4" fill="#94a3b8" />
          </marker>
        </defs>

        {/* 배경 그리드 */}
        <rect width={W} height={H} fill="url(#sp-grid)" />

        {/* 도로 */}
        <rect x={siteX - 10} y={roadY} width={siteW + 20} height={roadH} fill="#374151" rx="2" />
        <line x1={siteX - 10} y1={roadY + roadH / 2} x2={siteX + siteW + 10} y2={roadY + roadH / 2}
          stroke="#fbbf24" strokeWidth="1" strokeDasharray="8 4" />
        <text x={siteX + siteW + 14} y={roadY + roadH / 2 + 3} fontSize="7" fill="#94a3b8">
          도로 ({roadWidth}m)
        </text>

        {/* 대지 경계선 */}
        {hasRealShape ? (
          <polygon points={svg.sitePolygonPoints} fill="#0f172a" stroke="#3b82f6" strokeWidth="1.5" />
        ) : (
          <rect x={siteX} y={siteY} width={siteW} height={siteH}
            fill="#0f172a" stroke="#3b82f6" strokeWidth="1.5" />
        )}

        {/* 이격거리 영역 (해칭) */}
        <rect x={siteX} y={siteY + siteH - sf} width={siteW} height={sf}
          fill="#3b82f608" stroke="none" />
        <rect x={siteX} y={siteY} width={siteW} height={sr}
          fill="#3b82f608" stroke="none" />
        <rect x={siteX} y={siteY + sr} width={ss} height={siteH - sf - sr}
          fill="#3b82f608" stroke="none" />
        <rect x={siteX + siteW - ss} y={siteY + sr} width={ss} height={siteH - sf - sr}
          fill="#3b82f608" stroke="none" />

        {/* 건축가능영역 경계 — 배치 엔진에서 제공 */}
        <polygon points={svg.buildablePolygonPoints}
          fill="none" stroke="#22d3ee" strokeWidth="0.8" strokeDasharray="4 3" opacity="0.6" />

        {/* 조경 영역 */}
        {landscapeArea > 0 && (
          <>
            <rect x={siteX + siteW - lsW - ss} y={siteY + sr + 4} width={lsW} height={lsH}
              fill="url(#sp-hatch)" stroke="#22c55e" strokeWidth="0.6" rx="3" opacity="0.7" />
            <text x={siteX + siteW - lsW / 2 - ss} y={siteY + sr + lsH / 2 + 4 + 3}
              textAnchor="middle" fontSize="6" fill="#4ade80" opacity="0.9">조경</text>
            {[0, 1, 2].map(i => {
              const tx = siteX + siteW - lsW - ss + 8 + i * (lsW / 3)
              const ty = siteY + sr + 10
              return <circle key={i} cx={tx} cy={ty} r="4" fill="#166534" opacity="0.5" stroke="#22c55e" strokeWidth="0.4" />
            })}
          </>
        )}

        {/* 건물 — 배치 엔진의 SSOT 좌표 사용 */}
        {svgBuildings.map((s, i) => {
          const ot = (type === 'cluster' && originalType && originalType !== 'cluster') ? originalType : type
          if (ot === 'lshape') {
            const armW = s.w * 0.4, armH = s.h
            const legW = s.w, legH = s.h * 0.35
            return <g key={i}>
              <rect x={s.x} y={s.y} width={armW} height={armH} fill="#1e3a5f" stroke="#60a5fa" strokeWidth="1.2" opacity="0.9" />
              <rect x={s.x + armW} y={s.y + armH - legH} width={legW - armW} height={legH} fill="#1e3a5f" stroke="#60a5fa" strokeWidth="1.2" opacity="0.9" />
            </g>
          } else if (ot === 'courtyard') {
            const t = Math.min(s.w * 0.22, s.h * 0.22)
            return <g key={i}>
              <rect x={s.x} y={s.y} width={t} height={s.h} fill="#1e3a5f" stroke="#60a5fa" strokeWidth="1.2" opacity="0.9" />
              <rect x={s.x + s.w - t} y={s.y} width={t} height={s.h} fill="#1e3a5f" stroke="#60a5fa" strokeWidth="1.2" opacity="0.9" />
              <rect x={s.x} y={s.y + s.h - t} width={s.w} height={t} fill="#1e3a5f" stroke="#60a5fa" strokeWidth="1.2" opacity="0.9" />
              <rect x={s.x + t + 2} y={s.y} width={s.w - t * 2 - 4} height={s.h - t - 2} fill="#052e1620" stroke="#10b981" strokeWidth="0.5" strokeDasharray="2 1" rx="1" />
            </g>
          } else if (ot === 'linear') {
            const lh = s.h * 0.4
            return <rect key={i} x={s.x} y={s.y + (s.h - lh) / 2} width={s.w} height={lh} fill="#1e3a5f" stroke="#60a5fa" strokeWidth="1.2" opacity="0.9" />
          } else {
            return <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} fill="#1e3a5f" stroke="#60a5fa" strokeWidth="1.2" opacity="0.9" />
          }
        })}

        {/* 건물 라벨 */}
        {svgBuildings.length === 1 && (
          <text x={svgBuildings[0].x + svgBuildings[0].w / 2}
            y={svgBuildings[0].y + svgBuildings[0].h / 2 + 3}
            textAnchor="middle" fontSize="9" fill="#93c5fd" fontWeight="600">
            {buildingLabel}
          </text>
        )}
        {svgBuildings.length > 1 && svgBuildings.map((s, i) => (
          <text key={`lbl-${i}`} x={s.x + s.w / 2} y={s.y + s.h / 2 + 3}
            textAnchor="middle" fontSize="7" fill="#93c5fd">
            {type === "cluster" ? `동${String.fromCharCode(65 + i)}` : `동${i + 1}`}
          </text>
        ))}

        {/* 지하 주차 진입로 */}
        <rect x={parkingX} y={parkingY} width={parkingW} height={parkingH}
          fill="url(#sp-parking-hatch)" stroke="#64748b" strokeWidth="0.6" rx="2" />
        <text x={parkingX + parkingW / 2} y={parkingY + parkingH / 2 + 3}
          textAnchor="middle" fontSize="6" fill="#94a3b8">지하주차 진입</text>
        <line x1={parkingX + parkingW / 2} y1={parkingY + parkingH}
          x2={parkingX + parkingW / 2} y2={entryY - 2}
          stroke="#64748b" strokeWidth="0.6" strokeDasharray="2 2" markerEnd="url(#sp-arrow)" />

        {/* 출입구 */}
        <rect x={entryX - 8} y={siteY + siteH - 3} width={16} height={5}
          fill="#0ea5e9" stroke="#38bdf8" strokeWidth="0.8" rx="1" />
        <text x={entryX} y={siteY + siteH + 0.5} textAnchor="middle" fontSize="5" fill="white" fontWeight="600">출입구</text>

        {/* 치수선 — 대지 가로 */}
        <line x1={siteX} y1={siteY - 12} x2={siteX + siteW} y2={siteY - 12}
          stroke="#f87171" strokeWidth="0.5" />
        <line x1={siteX} y1={siteY - 16} x2={siteX} y2={siteY - 8} stroke="#f87171" strokeWidth="0.4" />
        <line x1={siteX + siteW} y1={siteY - 16} x2={siteX + siteW} y2={siteY - 8} stroke="#f87171" strokeWidth="0.4" />
        <text x={siteX + siteW / 2} y={siteY - 14} textAnchor="middle" fontSize="6" fill="#f87171">
          {placement.site.width.toFixed(1)}m
        </text>

        {/* 치수선 — 대지 세로 */}
        <line x1={siteX - 12} y1={siteY} x2={siteX - 12} y2={siteY + siteH}
          stroke="#f87171" strokeWidth="0.5" />
        <line x1={siteX - 16} y1={siteY} x2={siteX - 8} y2={siteY} stroke="#f87171" strokeWidth="0.4" />
        <line x1={siteX - 16} y1={siteY + siteH} x2={siteX - 8} y2={siteY + siteH} stroke="#f87171" strokeWidth="0.4" />
        <text x={siteX - 14} y={siteY + siteH / 2} textAnchor="middle" fontSize="6" fill="#f87171"
          transform={`rotate(-90, ${siteX - 14}, ${siteY + siteH / 2})`}>
          {placement.site.depth.toFixed(1)}m
        </text>

        {/* 이격거리 치수 */}
        <text x={siteX + siteW / 2} y={siteY + siteH - sf / 2 + 2}
          textAnchor="middle" fontSize="5" fill="#60a5fa" opacity="0.7">
          전면 {setbacks.front}m
        </text>
        <text x={siteX + siteW / 2} y={siteY + sr / 2 + 2}
          textAnchor="middle" fontSize="5" fill="#60a5fa" opacity="0.7">
          후면 {setbacks.rear}m
        </text>

        {/* 방위표 (N) */}
        <g transform={`translate(${W - 35}, ${PAD + 5})`}>
          <circle cx="0" cy="0" r="10" fill="none" stroke="#94a3b8" strokeWidth="0.5" />
          <polygon points="0,-9 -3,0 0,-3 3,0" fill="#f87171" />
          <polygon points="0,9 -3,0 0,3 3,0" fill="#475569" />
          <text x="0" y="-12" textAnchor="middle" fontSize="7" fill="#f87171" fontWeight="700">N</text>
        </g>

        {/* 범례 */}
        <g transform={`translate(${siteX}, ${siteY + siteH + roadH + 12})`}>
          <rect x="0" y="0" width="8" height="5" fill="#1e3a5f" stroke="#60a5fa" strokeWidth="0.6" />
          <text x="11" y="4" fontSize="5.5" fill="#94a3b8">건물</text>

          <rect x="50" y="0" width="8" height="5" fill="url(#sp-hatch)" stroke="#22c55e" strokeWidth="0.4" />
          <text x="61" y="4" fontSize="5.5" fill="#94a3b8">조경</text>

          <rect x="95" y="0" width="8" height="5" fill="url(#sp-parking-hatch)" stroke="#64748b" strokeWidth="0.4" />
          <text x="106" y="4" fontSize="5.5" fill="#94a3b8">주차</text>

          <line x1="145" y1="2.5" x2="153" y2="2.5" stroke="#22d3ee" strokeWidth="0.6" strokeDasharray="3 2" />
          <text x="156" y="4" fontSize="5.5" fill="#94a3b8">건축한계선</text>

          <line x1="205" y1="2.5" x2="213" y2="2.5" stroke="#3b82f6" strokeWidth="1" />
          <text x="216" y="4" fontSize="5.5" fill="#94a3b8">대지경계</text>
        </g>

        {/* 프로젝트 정보 */}
        <text x={W / 2} y={H - 6} textAnchor="middle" fontSize="6" fill="#64748b">
          {layoutName || buildingLabel} · 대지 {siteArea.toLocaleString()}㎡ · 건폐율 {buildingCoverage}% · {floors}층 {units}세대 · 주차 {parking}대
        </text>
      </svg>
    </div>
  )
}
