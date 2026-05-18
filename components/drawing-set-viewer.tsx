"use client"

/**
 * 도면 세트 미리보기 뷰어
 * 
 * DXF/IFC 도면을 앱 안에서 SVG로 미리보기
 * 시트 네비게이션 + 줌 + 개별 다운로드
 */

import { useState } from "react"
import type { StructuralGrid, Room } from "@/lib/structural-grid"
import type { StructuralCalc } from "@/lib/structural-calc"
import type { MEPDesign } from "@/lib/mep-design"
import { generateSchedules, type WindowSpec, type FinishSpec } from "@/lib/schedule-generator"

interface Props {
  grid: StructuralGrid
  calc: StructuralCalc
  mep: MEPDesign
  floors: number
  project: string
  onClose: () => void
}

// ━━━ 시트 정의 ━━━
type SheetType = 'index' | 'floor' | 'elevation' | 'section' | 'window' | 'finish' | 'structural' | 'electrical' | 'mechanical' | 'fire'

interface Sheet {
  no: string
  title: string
  type: SheetType
  floor?: number
}

// ━━━ 방 색상 ━━━
const COLORS: Record<string, string> = {
  entrance: '#94a3b8', kitchen: '#34d399', living: '#60a5fa', master: '#a78bfa',
  bedroom2: '#c084fc', bedroom3: '#e879f9', bathroom_main: '#22d3ee', bathroom_sub: '#67e8f9',
  dressroom: '#f0abfc', core: '#64748b', storage: '#fb923c', utility: '#fbbf24',
  corridor: '#475569',
}

export default function DrawingSetViewer({ grid, calc, mep, floors, project, onClose }: Props) {
  const allSheets: Sheet[] = [
    { no: 'A-001', title: '도면 목록', type: 'index' },
    ...Array.from({ length: Math.min(floors, 3) }, (_, f) => ({
      no: `A-${101 + f}`, title: `${f + 1}층 평면도`, type: 'floor' as SheetType, floor: f + 1,
    })),
    ...(floors > 3 ? [{ no: `A-${100 + floors}`, title: `${floors}층 최상층`, type: 'floor' as SheetType, floor: floors }] : []),
    { no: 'A-201', title: '정면도', type: 'elevation' },
    { no: 'A-301', title: '단면도 A-A', type: 'section' },
    { no: 'A-501', title: '창호 상세도', type: 'window' },
    { no: 'A-601', title: '실내 마감표', type: 'finish' },
    { no: 'S-100', title: '구조 평면도', type: 'structural' },
    { no: 'E-100', title: '전기설비', type: 'electrical' },
    { no: 'M-100', title: '기계설비', type: 'mechanical' },
    { no: 'F-100', title: '소방설비', type: 'fire' },
  ]

  const [current, setCurrent] = useState(1) // 1층 평면도부터
  const sheet = allSheets[current]
  const sch = generateSchedules(grid)

  const bayW = grid.bayWidthM
  const bayD = grid.bayDepthM
  const W = grid.totalWidthM
  const D = grid.totalDepthM

  // ━━━ 시트별 SVG 렌더링 ━━━
  function renderSheet(s: Sheet): JSX.Element {
    const vW = 320, vH = 360, m = 30

    switch (s.type) {
      case 'index':
        return (
          <svg viewBox={`0 0 ${vW} ${vH}`} className="w-full h-full">
            <rect width={vW} height={vH} fill="#0f172a" />
            <text x={vW/2} y={30} textAnchor="middle" fontSize="12" fill="#e2e8f0" fontWeight="bold">도면 목록 (DRAWING INDEX)</text>
            <line x1={20} y1={38} x2={vW-20} y2={38} stroke="#334155" />
            {allSheets.map((sh, i) => (
              <text key={i} x={30} y={55 + i * 22} fontSize="9" fill={i === current ? '#22d3ee' : '#94a3b8'}>
                {sh.no}  {sh.title}
              </text>
            ))}
          </svg>
        )

      case 'floor':
        return renderFloorPlan(vW, vH, m)

      case 'elevation':
        return renderElevation(vW, vH, m)

      case 'section':
        return renderSection(vW, vH, m)

      case 'window':
        return renderWindowDetail(vW, vH, m, sch.windows)

      case 'finish':
        return renderFinishTable(vW, vH, sch.finishes)

      case 'structural':
        return renderStructuralPlan(vW, vH, m)

      case 'electrical':
        return renderMEP(vW, vH, m, 'E')

      case 'mechanical':
        return renderMEP(vW, vH, m, 'M')

      case 'fire':
        return renderMEP(vW, vH, m, 'F')

      default:
        return <svg viewBox="0 0 320 360"><rect width="320" height="360" fill="#0f172a" /><text x="160" y="180" textAnchor="middle" fill="#94a3b8">준비 중</text></svg>
    }
  }

  // ━━━ 평면도 ━━━
  function renderFloorPlan(vW: number, vH: number, m: number): JSX.Element {
    const scale = Math.min((vW - m * 2) / W, (vH - m * 2 - 30) / (D + 1.5))
    const ox = m + ((vW - m * 2) - W * scale) / 2
    const oy = m + 20
    const corrH = 1.2 * scale

    return (
      <svg viewBox={`0 0 ${vW} ${vH}`} className="w-full h-full">
        <rect width={vW} height={vH} fill="#0f172a" />
        <text x={vW/2} y={16} textAnchor="middle" fontSize="10" fill="#e2e8f0" fontWeight="bold">{sheet.title}</text>

        {/* 그리드 */}
        {Array.from({ length: grid.baysX + 1 }, (_, i) => (
          <line key={`gx${i}`} x1={ox + i * bayW * scale} y1={oy - 5} x2={ox + i * bayW * scale} y2={oy + D * scale + corrH + 5} stroke="#1e3a5f" strokeWidth="0.5" strokeDasharray="2,2" />
        ))}

        {/* 복도 */}
        <rect x={ox} y={oy + bayD * scale} width={W * scale} height={corrH} fill="#1e293b" stroke="#334155" strokeWidth="0.5" />
        <text x={ox + W * scale / 2} y={oy + bayD * scale + corrH / 2 + 3} textAnchor="middle" fontSize="5" fill="#64748b">복도</text>

        {/* 방 */}
        {grid.rooms.map((room, i) => {
          const corr = room.gridY >= 1 ? corrH : 0
          const rx = ox + room.gridX * bayW * scale
          const ry = oy + room.gridY * bayD * scale + corr
          const rw = room.spanX * bayW * scale
          const rh = room.spanY * bayD * scale
          const color = COLORS[room.type] || '#475569'
          return (
            <g key={i}>
              <rect x={rx} y={ry} width={rw} height={rh} fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1" />
              <text x={rx + rw / 2} y={ry + rh / 2 - 2} textAnchor="middle" fontSize="6" fill={color} fontWeight="600">{room.label}</text>
              <text x={rx + rw / 2} y={ry + rh / 2 + 7} textAnchor="middle" fontSize="5" fill={color} opacity="0.7">{room.area.toFixed(1)}㎡</text>
            </g>
          )
        })}

        {/* 치수 */}
        <text x={ox + W * scale / 2} y={oy - 10} textAnchor="middle" fontSize="6" fill="#64748b">{W.toFixed(1)}m</text>
        <text x={ox - 10} y={oy + (D * scale + corrH) / 2} textAnchor="middle" fontSize="6" fill="#64748b" transform={`rotate(-90, ${ox - 10}, ${oy + (D * scale + corrH) / 2})`}>{(D + 1.2).toFixed(1)}m</text>
      </svg>
    )
  }

  // ━━━ 입면도 ━━━
  function renderElevation(vW: number, vH: number, m: number): JSX.Element {
    const bldH = floors * 3.3
    const scale = Math.min((vW - m * 2) / W, (vH - m * 2 - 30) / bldH)
    const ox = m + ((vW - m * 2) - W * scale) / 2
    const baseY = vH - m - 20

    return (
      <svg viewBox={`0 0 ${vW} ${vH}`} className="w-full h-full">
        <rect width={vW} height={vH} fill="#0f172a" />
        <text x={vW/2} y={16} textAnchor="middle" fontSize="10" fill="#e2e8f0" fontWeight="bold">정면도 (ELEVATION)</text>

        {/* 지반선 */}
        <line x1={ox - 15} y1={baseY} x2={ox + W * scale + 15} y2={baseY} stroke="#475569" strokeWidth="1.5" />
        <text x={ox - 20} y={baseY + 4} textAnchor="end" fontSize="5" fill="#64748b">GL</text>

        {/* 건물 외곽 */}
        <rect x={ox} y={baseY - bldH * scale} width={W * scale} height={bldH * scale} fill="none" stroke="#e2e8f0" strokeWidth="1.5" />

        {/* 층 구분 + 창문 */}
        {Array.from({ length: floors }, (_, f) => {
          const floorY = baseY - (f + 1) * 3.3 * scale
          const numWin = Math.min(grid.baysX, 4)
          const gap = W * scale / (numWin + 1)
          return (
            <g key={f}>
              {f > 0 && <line x1={ox} y1={baseY - f * 3.3 * scale} x2={ox + W * scale} y2={baseY - f * 3.3 * scale} stroke="#334155" strokeWidth="0.5" />}
              {Array.from({ length: numWin }, (_, w) => (
                <rect key={w} x={ox + gap * (w + 1) - 8} y={floorY + 4} width={16} height={12} fill="none" stroke="#38bdf8" strokeWidth="0.8" />
              ))}
              <text x={ox + W * scale + 8} y={baseY - f * 3.3 * scale - 3.3 * scale / 2 + 3} fontSize="5" fill="#64748b">{f + 1}F</text>
            </g>
          )
        })}

        {/* 입구 */}
        <rect x={ox + W * scale * 0.35} y={baseY - 12} width={W * scale * 0.15} height={12} fill="#334155" stroke="#e2e8f0" strokeWidth="0.8" />
        <text x={ox + W * scale * 0.425} y={baseY - 3} textAnchor="middle" fontSize="4" fill="#94a3b8">입구</text>

        {/* 치수 */}
        <text x={ox + W * scale / 2} y={baseY + 14} textAnchor="middle" fontSize="6" fill="#64748b">{W.toFixed(1)}m</text>
        <text x={ox + W * scale + 22} y={baseY - bldH * scale / 2} fontSize="6" fill="#64748b">{(bldH).toFixed(1)}m</text>
      </svg>
    )
  }

  // ━━━ 단면도 ━━━
  function renderSection(vW: number, vH: number, m: number): JSX.Element {
    const bldH = floors * 3.3
    const scale = Math.min((vW - m * 2) / W, (vH - m * 2 - 40) / (bldH + 2))
    const ox = m + ((vW - m * 2) - W * scale) / 2
    const baseY = vH - m - 20

    return (
      <svg viewBox={`0 0 ${vW} ${vH}`} className="w-full h-full">
        <rect width={vW} height={vH} fill="#0f172a" />
        <text x={vW/2} y={16} textAnchor="middle" fontSize="10" fill="#e2e8f0" fontWeight="bold">단면도 (SECTION A-A)</text>

        {/* 지반 */}
        <rect x={ox - 10} y={baseY} width={W * scale + 20} height={8} fill="#1e293b" stroke="#475569" strokeWidth="0.5" />
        <text x={ox - 15} y={baseY + 4} textAnchor="end" fontSize="5" fill="#64748b">GL</text>

        {/* 기초 */}
        <rect x={ox - 3} y={baseY + 8} width={W * scale + 6} height={calc.foundation.thickness / 1000 * scale} fill="#334155" stroke="#475569" strokeWidth="0.5" />
        <text x={ox + W * scale / 2} y={baseY + 8 + calc.foundation.thickness / 2000 * scale + 3} textAnchor="middle" fontSize="4" fill="#94a3b8">기초 {calc.foundation.type}</text>

        {/* 각 층 */}
        {Array.from({ length: floors + 1 }, (_, f) => {
          const y = baseY - f * 3.3 * scale
          return (
            <g key={f}>
              <rect x={ox} y={y - 1} width={W * scale} height={2} fill="#475569" />
              {f < floors && (
                <>
                  {/* 외벽 */}
                  <line x1={ox} y1={y} x2={ox} y2={y - 3.3 * scale} stroke="#e2e8f0" strokeWidth="2" />
                  <line x1={ox + 2} y1={y} x2={ox + 2} y2={y - 3.3 * scale} stroke="#e2e8f0" strokeWidth="0.5" />
                  <line x1={ox + W * scale} y1={y} x2={ox + W * scale} y2={y - 3.3 * scale} stroke="#e2e8f0" strokeWidth="2" />
                  <line x1={ox + W * scale - 2} y1={y} x2={ox + W * scale - 2} y2={y - 3.3 * scale} stroke="#e2e8f0" strokeWidth="0.5" />
                  <text x={ox + W * scale + 8} y={y - 3.3 * scale / 2 + 3} fontSize="5" fill="#64748b">{f + 1}F</text>
                  <text x={ox + W * scale + 8} y={y - 3.3 * scale / 2 + 10} fontSize="4" fill="#475569">CH={((3.3 - calc.slab.thickness / 1000) * 1000).toFixed(0)}</text>
                </>
              )}
            </g>
          )
        })}
      </svg>
    )
  }

  // ━━━ 창호 상세 ━━━
  function renderWindowDetail(vW: number, vH: number, m: number, windows: WindowSpec[]): JSX.Element {
    return (
      <svg viewBox={`0 0 ${vW} ${vH}`} className="w-full h-full">
        <rect width={vW} height={vH} fill="#0f172a" />
        <text x={vW/2} y={16} textAnchor="middle" fontSize="10" fill="#e2e8f0" fontWeight="bold">창호 상세도 (WINDOW DETAIL)</text>
        {windows.map((w, i) => {
          const x = 20 + (i % 3) * 100, y = 35 + Math.floor(i / 3) * 140
          const sc = 0.04
          return (
            <g key={i}>
              <rect x={x} y={y} width={w.width * sc} height={w.height * sc} fill="none" stroke="#38bdf8" strokeWidth="1" />
              <line x1={x + w.width * sc / 2} y1={y} x2={x + w.width * sc / 2} y2={y + w.height * sc} stroke="#38bdf8" strokeWidth="0.5" />
              <line x1={x} y1={y + w.height * sc * 0.6} x2={x + w.width * sc} y2={y + w.height * sc * 0.6} stroke="#38bdf8" strokeWidth="0.5" />
              <text x={x + w.width * sc / 2} y={y + w.height * sc + 12} textAnchor="middle" fontSize="7" fill="#22d3ee" fontWeight="bold">{w.id}</text>
              <text x={x + w.width * sc / 2} y={y + w.height * sc + 22} textAnchor="middle" fontSize="5" fill="#94a3b8">{w.type}</text>
              <text x={x + w.width * sc / 2} y={y + w.height * sc + 30} textAnchor="middle" fontSize="4.5" fill="#64748b">{w.width}×{w.height}</text>
              <text x={x + w.width * sc / 2} y={y + w.height * sc + 38} textAnchor="middle" fontSize="4" fill="#475569">{w.material}</text>
            </g>
          )
        })}
      </svg>
    )
  }

  // ━━━ 마감표 ━━━
  function renderFinishTable(vW: number, vH: number, finishes: FinishSpec[]): JSX.Element {
    return (
      <svg viewBox={`0 0 ${vW} ${vH}`} className="w-full h-full">
        <rect width={vW} height={vH} fill="#0f172a" />
        <text x={vW/2} y={16} textAnchor="middle" fontSize="10" fill="#e2e8f0" fontWeight="bold">실내 마감표 (FINISH SCHEDULE)</text>
        {/* 헤더 */}
        {['실명', '바닥', '벽', '천장', 'CH'].map((h, i) => (
          <text key={i} x={10 + i * 62} y={36} fontSize="6" fill="#94a3b8" fontWeight="bold">{h}</text>
        ))}
        <line x1={5} y1={40} x2={vW - 5} y2={40} stroke="#334155" />
        {/* 데이터 */}
        {finishes.map((f, i) => {
          const y = 52 + i * 26
          const color = COLORS[f.roomType] || '#94a3b8'
          return (
            <g key={i}>
              <text x={10} y={y} fontSize="5.5" fill={color} fontWeight="600">{f.room}</text>
              <text x={72} y={y} fontSize="4.5" fill="#94a3b8">{f.floor.substring(0, 10)}</text>
              <text x={134} y={y} fontSize="4.5" fill="#94a3b8">{f.wall.substring(0, 10)}</text>
              <text x={196} y={y} fontSize="4.5" fill="#94a3b8">{f.ceiling.substring(0, 8)}</text>
              <text x={258} y={y} fontSize="4.5" fill="#94a3b8">{f.ceilingHeight}</text>
              <line x1={5} y1={y + 6} x2={vW - 5} y2={y + 6} stroke="#1e293b" />
            </g>
          )
        })}
      </svg>
    )
  }

  // ━━━ 구조 평면도 ━━━
  function renderStructuralPlan(vW: number, vH: number, m: number): JSX.Element {
    const scale = Math.min((vW - m * 2) / W, (vH - m * 2 - 60) / D)
    const ox = m + ((vW - m * 2) - W * scale) / 2
    const oy = m + 20

    return (
      <svg viewBox={`0 0 ${vW} ${vH}`} className="w-full h-full">
        <rect width={vW} height={vH} fill="#0f172a" />
        <text x={vW/2} y={16} textAnchor="middle" fontSize="10" fill="#e2e8f0" fontWeight="bold">구조 평면도 (STRUCTURAL)</text>
        {/* 그리드 + 보 */}
        {Array.from({ length: grid.baysX + 1 }, (_, i) => (
          <g key={`gx${i}`}>
            <line x1={ox + i * bayW * scale} y1={oy} x2={ox + i * bayW * scale} y2={oy + D * scale} stroke="#1e3a5f" strokeWidth="0.5" />
            <line x1={ox + i * bayW * scale - 1.5} y1={oy} x2={ox + i * bayW * scale - 1.5} y2={oy + D * scale} stroke="#22c55e" strokeWidth="0.3" opacity="0.5" />
            <line x1={ox + i * bayW * scale + 1.5} y1={oy} x2={ox + i * bayW * scale + 1.5} y2={oy + D * scale} stroke="#22c55e" strokeWidth="0.3" opacity="0.5" />
          </g>
        ))}
        {Array.from({ length: grid.baysY + 1 }, (_, i) => (
          <g key={`gy${i}`}>
            <line x1={ox} y1={oy + i * bayD * scale} x2={ox + W * scale} y2={oy + i * bayD * scale} stroke="#1e3a5f" strokeWidth="0.5" />
            <line x1={ox} y1={oy + i * bayD * scale - 1.5} x2={ox + W * scale} y2={oy + i * bayD * scale - 1.5} stroke="#22c55e" strokeWidth="0.3" opacity="0.5" />
            <line x1={ox} y1={oy + i * bayD * scale + 1.5} x2={ox + W * scale} y2={oy + i * bayD * scale + 1.5} stroke="#22c55e" strokeWidth="0.3" opacity="0.5" />
          </g>
        ))}
        {/* 기둥 */}
        {grid.columns.map((col, i) => {
          const cs = Math.max(3, (calc.columns[0]?.width || 400) / 1000 * scale)
          return (
            <g key={i}>
              <rect x={ox + col.x * bayW * scale - cs/2} y={oy + col.y * bayD * scale - cs/2} width={cs} height={cs} fill="#475569" stroke="#e2e8f0" strokeWidth="0.8" />
              <line x1={ox + col.x * bayW * scale - cs/2} y1={oy + col.y * bayD * scale - cs/2} x2={ox + col.x * bayW * scale + cs/2} y2={oy + col.y * bayD * scale + cs/2} stroke="#e2e8f0" strokeWidth="0.3" />
            </g>
          )
        })}
        {/* 스케줄 */}
        {calc.columns.map((c, i) => (
          <text key={i} x={10} y={oy + D * scale + 20 + i * 12} fontSize="5" fill="#94a3b8">{c.id}: {c.width}×{c.depth} {c.mainBar}</text>
        ))}
        {calc.beams.map((b, i) => (
          <text key={i} x={10} y={oy + D * scale + 20 + calc.columns.length * 12 + i * 12} fontSize="5" fill="#22c55e">{b.id}: {b.width}×{b.depth} {b.direction}</text>
        ))}
      </svg>
    )
  }

  // ━━━ MEP 평면도 ━━━
  function renderMEP(vW: number, vH: number, m: number, type: 'E' | 'M' | 'F'): JSX.Element {
    const scale = Math.min((vW - m * 2) / W, (vH - m * 2 - 30) / D)
    const ox = m + ((vW - m * 2) - W * scale) / 2
    const oy = m + 20
    const titles = { E: '전기설비', M: '기계설비', F: '소방설비' }
    const colors = { E: '#fbbf24', M: '#38bdf8', F: '#ef4444' }

    return (
      <svg viewBox={`0 0 ${vW} ${vH}`} className="w-full h-full">
        <rect width={vW} height={vH} fill="#0f172a" />
        <text x={vW/2} y={16} textAnchor="middle" fontSize="10" fill="#e2e8f0" fontWeight="bold">{titles[type]} ({type}-100)</text>
        {/* 배경 그리드 */}
        {grid.rooms.map((room, i) => {
          const rx = ox + room.gridX * bayW * scale, ry = oy + room.gridY * bayD * scale
          const rw = room.spanX * bayW * scale, rh = room.spanY * bayD * scale
          return (
            <g key={i}>
              <rect x={rx} y={ry} width={rw} height={rh} fill="none" stroke="#1e293b" strokeWidth="0.5" />
              <text x={rx + rw/2} y={ry + rh/2 + 2} textAnchor="middle" fontSize="4" fill="#334155">{room.label}</text>
            </g>
          )
        })}
        {/* 설비 심볼 */}
        {type === 'E' && mep.electrical.map((item, i) => (
          <g key={i}>
            <circle cx={ox + item.x * W * scale} cy={oy + item.y * D * scale} r={item.type === 'panel' ? 4 : 2.5}
              fill="none" stroke={colors.E} strokeWidth={item.type === 'panel' ? 1.2 : 0.8} />
            <text x={ox + item.x * W * scale} y={oy + item.y * D * scale + 7} textAnchor="middle" fontSize="3" fill={colors.E}>{item.label}</text>
          </g>
        ))}
        {type === 'M' && mep.plumbing.map((item, i) => {
          if (!item.endX) return (
            <rect key={i} x={ox + item.x * W * scale - 3} y={oy + item.y * D * scale - 3} width={6} height={6} fill={colors.M} fillOpacity="0.3" stroke={colors.M} strokeWidth="0.8" />
          )
          return (
            <line key={i} x1={ox + item.x * W * scale} y1={oy + item.y * D * scale}
              x2={ox + (item.endX || 0) * W * scale} y2={oy + (item.endY || 0) * D * scale}
              stroke={item.type === 'hot' ? '#ef4444' : item.type === 'drain' ? '#22c55e' : colors.M} strokeWidth="0.8" />
          )
        })}
        {type === 'F' && mep.fire.map((item, i) => {
          const sym = item.type === 'sprinkler' ? '⊕' : item.type === 'detector' ? '◇' : '▲'
          return (
            <text key={i} x={ox + item.x * W * scale} y={oy + item.y * D * scale} textAnchor="middle" fontSize="6" fill={colors.F}>{sym}</text>
          )
        })}
      </svg>
    )
  }

  // ━━━ UI ━━━
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-[#0f172a]">
        <div className="text-sm font-bold text-white">📐 도면 세트 미리보기 ({allSheets.length}장)</div>
        <button onClick={onClose} className="text-white/60 hover:text-white text-lg">✕</button>
      </div>

      {/* 시트 탭 */}
      <div className="flex overflow-x-auto gap-1 px-2 py-1.5 bg-[#0f172a] border-b border-white/5">
        {allSheets.map((s, i) => (
          <button key={i} onClick={() => setCurrent(i)}
            className={`shrink-0 px-2 py-1 rounded text-[9px] font-medium transition-all ${i === current ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'text-white/40 hover:text-white/60'}`}>
            {s.no}
          </button>
        ))}
      </div>

      {/* 도면 미리보기 */}
      <div className="flex-1 overflow-auto p-3 flex items-center justify-center">
        <div className="w-full max-w-md bg-[#0a0f1a] rounded-xl border border-white/10 shadow-2xl overflow-hidden">
          {/* 도면 제목 */}
          <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between">
            <span className="text-[10px] text-teal-400 font-bold">{sheet.no}</span>
            <span className="text-[10px] text-white/70">{sheet.title}</span>
          </div>
          {/* SVG 렌더링 */}
          <div className="aspect-[9/10]">
            {renderSheet(sheet)}
          </div>
        </div>
      </div>

      {/* 하단: 이전/다음 + 다운로드 */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-white/10 bg-[#0f172a]">
        <button onClick={() => setCurrent(Math.max(0, current - 1))} disabled={current === 0}
          className="px-3 py-1 rounded text-xs text-white/60 hover:text-white disabled:opacity-30">← 이전</button>
        <span className="text-[10px] text-white/40">{current + 1} / {allSheets.length}</span>
        <button onClick={() => setCurrent(Math.min(allSheets.length - 1, current + 1))} disabled={current === allSheets.length - 1}
          className="px-3 py-1 rounded text-xs text-white/60 hover:text-white disabled:opacity-30">다음 →</button>
      </div>
    </div>
  )
}
