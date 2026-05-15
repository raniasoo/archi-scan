"use client"
import { getBuildingDimensionsInMeters } from "@/lib/building-geometry"
import { getPatternVisuals } from "@/lib/alexander-patterns"

import React from "react"

interface SectionViewProps {
  siteArea: number
  buildingCoverage: number
  floors: number
  units: number
  parking: number
  heightLimit: number
  buildingCount?: number
  originalType?: string
  type: "tower" | "courtyard" | "lshape" | "linear" | "cluster"
  layoutName?: string
  roadWidth: number
  hasDistrictPlan: boolean
}

export function SectionView({
  siteArea, buildingCoverage, floors, units, buildingCount, originalType, parking, heightLimit,
  type, layoutName, roadWidth, hasDistrictPlan,
}: SectionViewProps) {
  const W = 500, H = 380
  const PAD = 40
  const groundY = H * 0.6  // 지반선 위치

  // 건물 크기 계산
  const floorHeight = 3.3   // 기준층 층고 (m)
  const gfHeight = 4.5      // 1층 층고 (m)
  const basementHeight = 3.2 // 지하 층고 (m)
  const basementFloors = Math.max(1, Math.ceil(parking / (siteArea * buildingCoverage / 100 / 30)))
  const geo = getBuildingDimensionsInMeters({ type, coverage: buildingCoverage, siteArea, floors, buildingCount, originalType })
  const pv = getPatternVisuals({ type, floors, units, coverage: buildingCoverage, siteArea, buildingCount })

  const totalHeight = gfHeight + (floors - 1) * floorHeight
  const basementTotalH = basementFloors * basementHeight

  // 스케일 (가용 영역에 맞추기)
  const aboveGroundH = groundY - PAD - 30
  const belowGroundH = H - groundY - PAD - 30
  const vScale = Math.min(aboveGroundH / totalHeight, belowGroundH / basementTotalH)
  const hScale = (W - PAD * 2 - 80) / (Math.sqrt(siteArea) * 1.2)

  // 대지 폭
  const siteRealW = Math.sqrt(siteArea * 1.25)
  const siteSvgW = Math.min(W - PAD * 2 - 80, siteRealW * hScale)
  const siteX = (W - siteSvgW) / 2

  // 건물 폭
  const bldRatio = Math.sqrt(geo.totalFootprint / siteArea) * 0.85
  let bldW = siteSvgW * bldRatio
  // 클러스터: 개별 동 크기 (AI 렌더링 일치)
  if (type === 'cluster') {
    const bc = buildingCount || Math.max(3, Math.round(Math.sqrt(units / 4)))
    bldW = bldW / Math.sqrt(bc) * 1.1
  }
  const bldX = siteX + (siteSvgW - bldW) / 2

  // 높이 → SVG
  const toY = (meters: number) => groundY - meters * vScale

  // 지하 높이 → SVG
  const toBY = (meters: number) => groundY + meters * vScale

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full bg-slate-950 rounded-lg border border-slate-800">
        <defs>
          <pattern id="sec-earth" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="#1c1917" />
            <circle cx="2" cy="3" r="0.5" fill="#78716c" opacity="0.3" />
            <circle cx="6" cy="7" r="0.4" fill="#78716c" opacity="0.2" />
          </pattern>
          <pattern id="sec-concrete" width="4" height="4" patternUnits="userSpaceOnUse">
            <rect width="4" height="4" fill="#374151" />
            <line x1="0" y1="2" x2="4" y2="2" stroke="#4b5563" strokeWidth="0.2" />
          </pattern>
        </defs>

        {/* 하늘 */}
        <rect x="0" y="0" width={W} height={groundY} fill="#0c1526" />

        {/* 지하 (땅) */}
        <rect x="0" y={groundY} width={W} height={H - groundY} fill="url(#sec-earth)" />

        {/* 지반선 */}
        <line x1={PAD} y1={groundY} x2={W - PAD} y2={groundY}
          stroke="#a3a3a3" strokeWidth="1.5" />
        <text x={PAD - 2} y={groundY + 4} textAnchor="end" fontSize="6" fill="#a3a3a3">GL</text>

        {/* 대지 경계선 */}
        <line x1={siteX} y1={groundY - 10} x2={siteX} y2={groundY + 10}
          stroke="#3b82f6" strokeWidth="1" strokeDasharray="3 2" />
        <line x1={siteX + siteSvgW} y1={groundY - 10} x2={siteX + siteSvgW} y2={groundY + 10}
          stroke="#3b82f6" strokeWidth="1" strokeDasharray="3 2" />

        {/* 도로 */}
        <rect x={siteX + siteSvgW + 4} y={groundY - 2} width={30} height={4}
          fill="#374151" stroke="#64748b" strokeWidth="0.5" />
        <text x={siteX + siteSvgW + 19} y={groundY + 10} textAnchor="middle" fontSize="5" fill="#94a3b8">
          도로 {roadWidth}m
        </text>

        {/* 지상 건물 */}
        <rect x={bldX} y={toY(totalHeight)} width={bldW} height={totalHeight * vScale}
          fill="#1e3a5f" stroke="#60a5fa" strokeWidth="1" />

        {/* 층별 구분선 */}
        {Array.from({ length: floors }, (_, i) => {
          const flH = i === 0 ? gfHeight : gfHeight + i * floorHeight
          const y = toY(flH)
          return (
            <g key={`floor-${i}`}>
              <line x1={bldX} y1={y} x2={bldX + bldW} y2={y}
                stroke="#4b6a8a" strokeWidth="0.4" />
              <text x={bldX + bldW + 4} y={y + 3} fontSize="5" fill="#94a3b8">
                {i + 1}F
              </text>
            </g>
          )
        })}

        {/* 1층 강조 (로비/상가) */}
        <rect x={bldX} y={toY(gfHeight)} width={bldW} height={gfHeight * vScale}
          fill="#f59e0b15" stroke="#f59e0b" strokeWidth="0.5" />
        <text x={bldX + bldW / 2} y={toY(gfHeight / 2) + 2}
          textAnchor="middle" fontSize="5.5" fill="#fbbf24">로비/상가</text>

        {/* 옥상 */}
        <rect x={bldX + bldW * 0.3} y={toY(totalHeight + 2)} width={bldW * 0.4} height={2 * vScale}
          fill="#374151" stroke="#64748b" strokeWidth="0.5" />
        <text x={bldX + bldW / 2} y={toY(totalHeight + 1) + 2}
          textAnchor="middle" fontSize="4.5" fill="#94a3b8">기계실</text>

        {/* 지하주차장 */}
        {Array.from({ length: basementFloors }, (_, i) => {
          const y1 = toBY(i * basementHeight)
          const h = basementHeight * vScale
          return (
            <g key={`b-${i}`}>
              <rect x={bldX - 8} y={y1} width={bldW + 16} height={h}
                fill="url(#sec-concrete)" stroke="#64748b" strokeWidth="0.5" />
              <text x={bldX + bldW / 2} y={y1 + h / 2 + 2}
                textAnchor="middle" fontSize="5" fill="#94a3b8">
                B{i + 1}F 주차장
              </text>
              <text x={bldX - 12} y={y1 + h / 2 + 2}
                textAnchor="end" fontSize="5" fill="#94a3b8">
                B{i + 1}
              </text>
            </g>
          )
        })}

        {/* 높이 치수 — 건물 전체 */}
        <line x1={bldX - 20} y1={groundY} x2={bldX - 20} y2={toY(totalHeight)}
          stroke="#f87171" strokeWidth="0.5" />
        <line x1={bldX - 24} y1={groundY} x2={bldX - 16} y2={groundY}
          stroke="#f87171" strokeWidth="0.4" />
        <line x1={bldX - 24} y1={toY(totalHeight)} x2={bldX - 16} y2={toY(totalHeight)}
          stroke="#f87171" strokeWidth="0.4" />
        <text x={bldX - 22} y={toY(totalHeight / 2) + 2}
          textAnchor="middle" fontSize="6" fill="#f87171"
          transform={`rotate(-90, ${bldX - 22}, ${toY(totalHeight / 2)})`}>
          {totalHeight.toFixed(1)}m
        </text>

        {/* 높이 치수 — 지하 */}
        <line x1={bldX - 20} y1={groundY} x2={bldX - 20} y2={toBY(basementTotalH)}
          stroke="#f87171" strokeWidth="0.5" />
        <line x1={bldX - 24} y1={toBY(basementTotalH)} x2={bldX - 16} y2={toBY(basementTotalH)}
          stroke="#f87171" strokeWidth="0.4" />
        <text x={bldX - 22} y={toBY(basementTotalH / 2) + 2}
          textAnchor="middle" fontSize="5" fill="#f87171"
          transform={`rotate(-90, ${bldX - 22}, ${toBY(basementTotalH / 2)})`}>
          B{basementFloors}F ({(basementTotalH).toFixed(1)}m)
        </text>

        {/* 높이 제한선 */}
        {heightLimit > 0 && heightLimit < 200 && (
          <>
            <line x1={PAD + 20} y1={toY(heightLimit)} x2={W - PAD - 20} y2={toY(heightLimit)}
              stroke="#ef4444" strokeWidth="0.8" strokeDasharray="6 3" opacity="0.7" />
            <text x={W - PAD - 18} y={toY(heightLimit) - 3}
              fontSize="6" fill="#ef4444" opacity="0.8">
              높이제한 {heightLimit}m
            </text>
          </>
        )}

        {/* 층고 표시 (우측) */}
        <text x={bldX + bldW + 25} y={toY(gfHeight / 2) + 2}
          fontSize="5" fill="#fbbf24">1F: {gfHeight}m</text>
        <text x={bldX + bldW + 25} y={toY(gfHeight + floorHeight / 2) + 2}
          fontSize="5" fill="#94a3b8">기준층: {floorHeight}m</text>

        {/* 건물 폭 치수 */}
        <line x1={bldX} y1={toBY(basementTotalH + 8)} x2={bldX + bldW} y2={toBY(basementTotalH + 8)}
          stroke="#f87171" strokeWidth="0.5" />
        <line x1={bldX} y1={toBY(basementTotalH + 5)} x2={bldX} y2={toBY(basementTotalH + 11)}
          stroke="#f87171" strokeWidth="0.4" />
        <line x1={bldX + bldW} y1={toBY(basementTotalH + 5)} x2={bldX + bldW} y2={toBY(basementTotalH + 11)}
          stroke="#f87171" strokeWidth="0.4" />
        <text x={bldX + bldW / 2} y={toBY(basementTotalH + 12)}
          textAnchor="middle" fontSize="5.5" fill="#f87171">
          {(bldW / hScale).toFixed(1)}m
        </text>

        {/* 정보 */}
        <text x={W / 2} y={H - 6} textAnchor="middle" fontSize="6" fill="#64748b">
          {layoutName || type} {type === 'cluster' ? '동A ' : ''}단면도 · 지상 {floors}층 ({totalHeight.toFixed(1)}m) + 지하 {basementFloors}층 · 주차 {parking}대
        </text>
      </svg>
    </div>
  )
}
