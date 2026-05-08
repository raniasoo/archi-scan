"use client"

import React from "react"

interface SitePlanProps {
  siteArea: number
  buildingCoverage: number  // %
  floors: number
  units: number
  parking: number
  type: "tower" | "courtyard" | "lshape" | "linear" | "cluster"
  setbacks: { front: number; side: number; rear: number }
  landscapingRatio: number  // %
  roadWidth: number
  hasDistrictPlan: boolean
  layoutName?: string
  sitePolygon?: { coords: [number, number][]; centroid: [number, number] } | null
}

export function SitePlan({
  siteArea, buildingCoverage, floors, units, parking, type,
  setbacks, landscapingRatio, roadWidth, hasDistrictPlan,
  layoutName = "", sitePolygon,
}: SitePlanProps) {
  const W = 500, H = 520
  const PAD = 50

  // ━━━ 실제 필지 형상 변환 (sitePolygon → SVG 좌표) ━━━
  const hasRealShape = sitePolygon && sitePolygon.coords.length > 2
  let polyPoints = '' // SVG polygon points
  let siteW: number, siteH: number, siteX: number, siteY: number, svgScale: number
  let siteRealW = Math.sqrt(siteArea * 1.25)
  let siteRealH = siteArea / siteRealW

  if (hasRealShape) {
    // 경위도 → 미터 변환 (centroid 기준)
    const [cLng, cLat] = sitePolygon!.centroid
    const LM = Math.cos(cLat * Math.PI / 180) * 111319
    const meterCoords = sitePolygon!.coords.map(([lng, lat]) => [
      (lng - cLng) * LM,
      -(lat - cLat) * 111319 // Y축 반전 (SVG는 아래가 +)
    ])

    // 바운딩 박스
    const xs = meterCoords.map(c => c[0])
    const ys = meterCoords.map(c => c[1])
    const minX = Math.min(...xs), maxX = Math.max(...xs)
    const minY = Math.min(...ys), maxY = Math.max(...ys)
    const realW = maxX - minX || 1
    const realH = maxY - minY || 1
    siteRealW = realW
    siteRealH = realH

    // SVG 스케일링
    svgScale = Math.min((W - PAD * 2) / realW, (H - PAD * 2 - 40) / realH)
    siteW = realW * svgScale
    siteH = realH * svgScale
    siteX = (W - siteW) / 2
    siteY = PAD

    // 폴리곤 포인트 변환
    polyPoints = meterCoords.map(([mx, my]) => {
      const px = siteX + (mx - minX) * svgScale
      const py = siteY + (my - minY) * svgScale
      return `${px},${py}`
    }).join(' ')
  } else {
    // 기존 사각형 방식 (siteRealW/siteRealH는 위에서 초기화됨)
    svgScale = Math.min((W - PAD * 2) / siteRealW, (H - PAD * 2 - 40) / siteRealH)
    siteW = siteRealW * svgScale
    siteH = siteRealH * svgScale
    siteX = (W - siteW) / 2
    siteY = PAD
  }

  // 이격거리 (미터 → SVG)
  const sf = setbacks.front * svgScale
  const ss = setbacks.side * svgScale
  const sr = setbacks.rear * svgScale

  // 건축가능영역
  const bldZoneX = siteX + ss
  const bldZoneY = siteY + sr  // 후면=상단
  const bldZoneW = siteW - ss * 2
  const bldZoneH = siteH - sf - sr

  // 건물 크기
  const buildingArea = siteArea * buildingCoverage / 100
  const bldRatio = Math.sqrt(buildingArea / siteArea)

  // 배치 유형별 건물 형태
  const getBuildingShape = () => {
    const bW = bldZoneW * 0.85
    const bH = bldZoneH * 0.7
    const bX = bldZoneX + (bldZoneW - bW) / 2
    const bY = bldZoneY + (bldZoneH - bH) / 2

    switch (type) {
      case "tower":
        return { shapes: [{ x: bX + bW * 0.15, y: bY + bH * 0.1, w: bW * 0.7, h: bH * 0.8 }], label: "타워동" }
      case "courtyard": {
        const t = bH * 0.22
        return {
          shapes: [
            { x: bX, y: bY, w: bW, h: t },                    // 상단
            { x: bX, y: bY + bH - t, w: bW, h: t },            // 하단
            { x: bX, y: bY + t, w: bW * 0.2, h: bH - t * 2 },  // 좌
            { x: bX + bW * 0.8, y: bY + t, w: bW * 0.2, h: bH - t * 2 }, // 우
          ],
          label: "ㅁ자형", courtyard: { x: bX + bW * 0.2, y: bY + t, w: bW * 0.6, h: bH - t * 2 }
        }
      }
      case "lshape": {
        const armW = bW * 0.4
        return {
          shapes: [
            { x: bX, y: bY, w: armW, h: bH },                 // 수직동
            { x: bX + armW, y: bY + bH * 0.6, w: bW - armW, h: bH * 0.4 }, // 수평동
          ],
          label: "ㄱ자형"
        }
      }
      case "linear":
        return {
          shapes: [{ x: bX, y: bY + bH * 0.25, w: bW, h: bH * 0.5 }],
          label: "판상형"
        }
      case "cluster": {
        // AI 렌더링과 일치: 4~6동 분산 배치
        const cols = 3, rows = 2
        const gapX = bW * 0.06, gapY = bH * 0.06
        const blockW = (bW - gapX * (cols - 1)) / cols
        const blockH = (bH - gapY * (rows - 1)) / rows
        const shapes: { x: number; y: number; w: number; h: number }[] = []
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const offsetX = (r % 2 === 1) ? blockW * 0.15 : 0 // 엇갈림 배치
            shapes.push({
              x: bX + c * (blockW + gapX) + offsetX,
              y: bY + r * (blockH + gapY),
              w: blockW * 0.92,
              h: blockH * 0.88,
            })
          }
        }
        return { shapes, label: "클러스터" }
      }
      default:
        return { shapes: [{ x: bX, y: bY, w: bW, h: bH }], label: type }
    }
  }

  const building = getBuildingShape()

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
          <polygon points={polyPoints} fill="#0f172a" stroke="#3b82f6" strokeWidth="1.5" />
        ) : (
          <rect x={siteX} y={siteY} width={siteW} height={siteH}
            fill="#0f172a" stroke="#3b82f6" strokeWidth="1.5" />
        )}

        {/* 이격거리 영역 (해칭) */}
        {/* 전면(하단) */}
        <rect x={siteX} y={siteY + siteH - sf} width={siteW} height={sf}
          fill="#3b82f608" stroke="none" />
        {/* 후면(상단) */}
        <rect x={siteX} y={siteY} width={siteW} height={sr}
          fill="#3b82f608" stroke="none" />
        {/* 좌측 */}
        <rect x={siteX} y={siteY + sr} width={ss} height={siteH - sf - sr}
          fill="#3b82f608" stroke="none" />
        {/* 우측 */}
        <rect x={siteX + siteW - ss} y={siteY + sr} width={ss} height={siteH - sf - sr}
          fill="#3b82f608" stroke="none" />

        {/* 건축가능영역 경계 */}
        <rect x={bldZoneX} y={bldZoneY} width={bldZoneW} height={bldZoneH}
          fill="none" stroke="#22d3ee" strokeWidth="0.8" strokeDasharray="4 3" opacity="0.6" />

        {/* 조경 영역 */}
        {landscapeArea > 0 && (
          <>
            <rect x={siteX + siteW - lsW - ss} y={siteY + sr + 4} width={lsW} height={lsH}
              fill="url(#sp-hatch)" stroke="#22c55e" strokeWidth="0.6" rx="3" opacity="0.7" />
            <text x={siteX + siteW - lsW / 2 - ss} y={siteY + sr + lsH / 2 + 4 + 3}
              textAnchor="middle" fontSize="6" fill="#4ade80" opacity="0.9">조경</text>
            {/* 나무 심볼 */}
            {[0, 1, 2].map(i => {
              const tx = siteX + siteW - lsW - ss + 8 + i * (lsW / 3)
              const ty = siteY + sr + 10
              return <circle key={i} cx={tx} cy={ty} r="4" fill="#166534" opacity="0.5" stroke="#22c55e" strokeWidth="0.4" />
            })}
          </>
        )}

        {/* 건물 */}
        {building.shapes.map((s, i) => (
          <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h}
            fill="#1e3a5f" stroke="#60a5fa" strokeWidth="1.2" opacity="0.9" />
        ))}

        {/* 중정 (courtyard) */}
        {'courtyard' in building && building.courtyard && (
          <rect x={building.courtyard.x} y={building.courtyard.y}
            width={building.courtyard.w} height={building.courtyard.h}
            fill="#052e1630" stroke="#10b981" strokeWidth="0.6" strokeDasharray="3 2" />
        )}

        {/* 건물 라벨 */}
        {building.shapes.length === 1 && (
          <text x={building.shapes[0].x + building.shapes[0].w / 2}
            y={building.shapes[0].y + building.shapes[0].h / 2 + 3}
            textAnchor="middle" fontSize="9" fill="#93c5fd" fontWeight="600">
            {building.label}
          </text>
        )}
        {building.shapes.length > 1 && building.shapes.map((s, i) => (
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
        {/* 주차 동선 화살표 */}
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
          {siteRealW.toFixed(1)}m
        </text>

        {/* 치수선 — 대지 세로 */}
        <line x1={siteX - 12} y1={siteY} x2={siteX - 12} y2={siteY + siteH}
          stroke="#f87171" strokeWidth="0.5" />
        <line x1={siteX - 16} y1={siteY} x2={siteX - 8} y2={siteY} stroke="#f87171" strokeWidth="0.4" />
        <line x1={siteX - 16} y1={siteY + siteH} x2={siteX - 8} y2={siteY + siteH} stroke="#f87171" strokeWidth="0.4" />
        <text x={siteX - 14} y={siteY + siteH / 2} textAnchor="middle" fontSize="6" fill="#f87171"
          transform={`rotate(-90, ${siteX - 14}, ${siteY + siteH / 2})`}>
          {siteRealH.toFixed(1)}m
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
          {layoutName || building.label} · 대지 {siteArea.toLocaleString()}㎡ · 건폐율 {buildingCoverage}% · {floors}층 {units}세대 · 주차 {parking}대
        </text>
      </svg>
    </div>
  )
}
