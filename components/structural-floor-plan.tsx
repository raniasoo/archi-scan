"use client"

import { generateStructuralGrid, WALL_RC, WALL_PARTITION, COLUMN_SIZE, type StructuralGrid, type Room } from "@/lib/structural-grid"
import { getBuildingDimensionsInMeters } from "@/lib/building-geometry"
import { generateCompleteDXF, downloadDXF } from "@/lib/dxf-generator"
import { generateSchedules } from "@/lib/schedule-generator"
import { calculateStructure } from "@/lib/structural-calc"
import { generateMEPDesign } from "@/lib/mep-design"
import { generateIFC, downloadIFC } from "@/lib/ifc-generator"
import { generateDrawingSet } from "@/lib/drawing-set-generator"
import { generateBOQ } from "@/lib/boq-generator"
import { generateConstructionDetail } from "@/lib/construction-detail"
import { estimateSchedule } from "@/lib/schedule-estimator"
import dynamic from "next/dynamic"
import { useState } from "react"
const DrawingSetViewer = dynamic(() => import("@/components/drawing-set-viewer"), { ssr: false })

interface Props {
  type: string
  coverage: number
  siteArea: number
  floors: number
  units: number
  unitArea: number
}

const ROOM_COLORS: Record<string, string> = {
  living: '#22c55e',
  kitchen: '#f59e0b',
  dining: '#f59e0b',
  master: '#8b5cf6',
  bedroom2: '#6366f1',
  bedroom3: '#818cf8',
  bathroom_main: '#0ea5e9',
  bathroom_sub: '#06b6d4',
  entrance: '#64748b',
  corridor: '#475569',
  dressroom: '#d946ef',
  utility: '#78716c',
  storage: '#78716c',
  core: '#94a3b8',
  balcony: '#059669',
}

export default function StructuralFloorPlan({ type, coverage, siteArea, floors, units, unitArea }: Props) {
  const [showViewer, setShowViewer] = useState(false)
  
  // 건물 치수 계산
  const geo = getBuildingDimensionsInMeters({ type: type as any, coverage, siteArea, floors })
  const bm = geo.blocksInMeters
  if (!bm || bm.length === 0) return <div className="text-muted-foreground text-sm p-4">건물 데이터 없음</div>

  // 첫 번째 블록의 치수 사용 (가장 큰 블록)
  const mainBlock = bm.reduce((a, b) => (a.widthM * a.depthM > b.widthM * b.depthM ? a : b))
  const grid = generateStructuralGrid({
    widthM: mainBlock.widthM,
    depthM: mainBlock.depthM,
    unitAreaM2: unitArea || (siteArea * coverage / 100),
    floors,
  })

  // SVG 좌표 계산
  const margin = 50  // 치수선 공간
  const px = 18      // 1m = 18px
  const corridorPx = 1.2 * px // 복도 높이 (1.2m)
  const svgW = grid.totalWidthM * px + margin * 2
  const svgH = grid.totalDepthM * px + margin * 2 + 30 + corridorPx

  const ox = margin   // 원점 X
  const oy = margin   // 원점 Y
  const gW = grid.totalWidthM * px
  const gH = grid.totalDepthM * px + corridorPx

  return (
    <div className="w-full">
      {/* 정보 헤더 + 액션 */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-primary">🏗️ 구조 그리드</span>
          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
            {grid.bayWidthM}m × {grid.bayDepthM}m · {grid.baysX}×{grid.baysY} bay
          </span>
          <span className="text-[10px] bg-violet-500/10 text-violet-400 px-1.5 py-0.5 rounded">
            Alexander {grid.score}점
          </span>
        </div>
        <div className="flex gap-1">
          <button onClick={() => {
            const dxf = generateCompleteDXF({
              type, coverage, siteArea, floors, units, unitArea,
              layoutName: `${type} ${floors}층`,
            })
            downloadDXF(dxf, `structural-${type}-${floors}F.dxf`)
          }} className="px-2 py-1 rounded-lg text-[10px] font-medium bg-blue-500/10 text-blue-400 hover:bg-blue-500/20">
            📐 DXF
          </button>
          <button onClick={() => {
            const calc = calculateStructure(grid, floors, siteArea)
            const ifcData = generateIFC({
              grid, calc, floors, floorHeight: 3.3,
              projectName: `${type} ${floors}층`,
              address: '',
            })
            downloadIFC(ifcData, `archi-scan-${type}-${floors}F.ifc`)
          }} className="px-2 py-1 rounded-lg text-[10px] font-medium bg-purple-500/10 text-purple-400 hover:bg-purple-500/20">
            🏛️ IFC
          </button>
          <button onClick={async () => {
            const calc = calculateStructure(grid, floors, siteArea)
            const mep = generateMEPDesign(grid)
            const sheets = generateDrawingSet({
              grid, calc, mep, floors, floorHeight: 3300,
              project: `${type} ${floors}층`,
              address: '',
            })
            const JSZip = (await import('jszip')).default
            const zip = new JSZip()
            for (const s of sheets) zip.file(s.filename, s.content)
            const blob = await zip.generateAsync({ type: 'blob' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url; a.download = `ArchiScan-DrawingSet-${sheets.length}sheets.zip`; a.click()
            URL.revokeObjectURL(url)
          }} className="px-2 py-1 rounded-lg text-[10px] font-medium bg-teal-500/10 text-teal-400 hover:bg-teal-500/20">
            📦 도면세트
          </button>
          <button onClick={() => setShowViewer(true)} className="px-2 py-1 rounded-lg text-[10px] font-medium bg-amber-500/10 text-amber-400 hover:bg-amber-500/20">
            👁️ 미리보기
          </button>
        </div>
      </div>

      {/* 도면 세트 미리보기 뷰어 */}
      {showViewer && (() => {
        const calc = calculateStructure(grid, floors, siteArea)
        const mep = generateMEPDesign(grid)
        return <DrawingSetViewer grid={grid} calc={calc} mep={mep} floors={floors} project={`${type} ${floors}층`} onClose={() => setShowViewer(false)} />
      })()}

      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          {/* 그리드 패턴 */}
          <pattern id="sg-grid" width={px * 1} height={px * 1} patternUnits="userSpaceOnUse">
            <rect width={px} height={px} fill="none" stroke="#1e293b" strokeWidth="0.2" />
          </pattern>
          {/* 해칭 (습식 공간) */}
          <pattern id="sg-wet" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="4" stroke="#0ea5e9" strokeWidth="0.5" opacity="0.3" />
          </pattern>
        </defs>

        {/* 배경 */}
        <rect x={ox - 2} y={oy - 2} width={gW + 4} height={gH + 4} fill="#0f172a" rx="2" />

        {/* 1m 그리드 (연한) */}
        <rect x={ox} y={oy} width={gW} height={gH} fill="url(#sg-grid)" />

        {/* ━━━ 구조 그리드 라인 (빨간 점선) ━━━ */}
        {Array.from({ length: grid.baysX + 1 }, (_, i) => {
          const x = ox + i * grid.bayWidthM * px
          return <line key={`gx-${i}`} x1={x} y1={oy - 8} x2={x} y2={oy + gH + 8}
            stroke="#ef4444" strokeWidth="0.5" strokeDasharray="3 2" opacity="0.6" />
        })}
        {Array.from({ length: grid.baysY + 1 }, (_, i) => {
          const y = oy + i * grid.bayDepthM * px
          return <line key={`gy-${i}`} x1={ox - 8} y1={y} x2={ox + gW + 8} y2={y}
            stroke="#ef4444" strokeWidth="0.5" strokeDasharray="3 2" opacity="0.6" />
        })}

        {/* 그리드 번호 (A, B, C... / 1, 2, 3...) */}
        {Array.from({ length: grid.baysX + 1 }, (_, i) => (
          <text key={`gl-${i}`} x={ox + i * grid.bayWidthM * px} y={oy - 14}
            textAnchor="middle" fontSize="7" fill="#ef4444" fontWeight="600">
            {String.fromCharCode(65 + i)}
          </text>
        ))}
        {Array.from({ length: grid.baysY + 1 }, (_, i) => (
          <text key={`gn-${i}`} x={ox - 14} y={oy + i * grid.bayDepthM * px + 3}
            textAnchor="middle" fontSize="7" fill="#ef4444" fontWeight="600">
            {i + 1}
          </text>
        ))}

        {/* ━━━ 복도 (공적→사적 전이 공간) ━━━ */}
        {(() => {
          const corridorH = 1.2 * px // 복도 폭 1.2m
          const corridorY = oy + grid.bayDepthM * px * 1 // row 0 아래
          return (
            <g>
              {/* 복도 배경 */}
              <rect x={ox} y={corridorY} width={gW} height={corridorH} fill="#1e293b" stroke="#334155" strokeWidth="0.5" />
              {/* 복도 패턴 (중앙 점선) */}
              <line x1={ox + 5} y1={corridorY + corridorH / 2} x2={ox + gW - 5} y2={corridorY + corridorH / 2} stroke="#475569" strokeWidth="0.5" strokeDasharray="3,3" />
              {/* 복도 라벨 */}
              <text x={ox + gW / 2} y={corridorY + corridorH / 2 + 2.5} textAnchor="middle" fontSize="5" fill="#94a3b8" fontWeight="500">복도 / 홀</text>
              {/* 복도 치수 */}
              <text x={ox - 6} y={corridorY + corridorH / 2 + 2} textAnchor="end" fontSize="4" fill="#64748b">1.2m</text>
            </g>
          )
        })()}

        {/* ━━━ 방 영역 ━━━ */}
        {grid.rooms.map((room, i) => {
          const corridorOffset = room.gridY >= 1 ? 1.2 * px : 0 // 사적 영역은 복도만큼 아래로
          const rx = ox + room.gridX * grid.bayWidthM * px
          const ry = oy + room.gridY * grid.bayDepthM * px + corridorOffset
          const rw = room.spanX * grid.bayWidthM * px
          const rh = room.spanY * grid.bayDepthM * px
          const color = ROOM_COLORS[room.type] || '#475569'
          const wallW = room.wallType === 'rc' ? WALL_RC * px : WALL_PARTITION * px

          return (
            <g key={`room-${i}`}>
              {/* 방 배경 */}
              <rect x={rx + wallW} y={ry + wallW} width={rw - wallW * 2} height={rh - wallW * 2}
                fill={`${color}08`} />
              {/* 습식 해칭 */}
              {room.isWet && <rect x={rx + wallW} y={ry + wallW} width={rw - wallW * 2} height={rh - wallW * 2}
                fill="url(#sg-wet)" />}
              {/* 벽체 */}
              <rect x={rx} y={ry} width={rw} height={rh}
                fill="none" stroke={room.wallType === 'rc' ? '#94a3b8' : '#475569'}
                strokeWidth={wallW} />
              {/* 방 라벨 */}
              <text x={rx + rw / 2} y={ry + rh / 2 - 4} textAnchor="middle"
                fontSize="7" fill={color} fontWeight="600">{room.label}</text>
              <text x={rx + rw / 2} y={ry + rh / 2 + 6} textAnchor="middle"
                fontSize="5.5" fill={color} opacity="0.7">{room.area.toFixed(1)}㎡</text>

              {/* 문 (건축 도면 스타일: 벽 개구부 + 스윙호) */}
              {room.hasDoor && (() => {
                const doorLen = Math.min(rw, rh) * 0.35 // 문 크기 = 방 크기의 35%
                const doorT = 2.5 // 문 두께
                let cx: number, cy: number, arcPath: string, gapRect: any
                
                switch (room.doorSide) {
                  case 'top':
                    cx = rx + rw * 0.35; cy = ry
                    gapRect = { x: cx, y: cy - doorT / 2, w: doorLen, h: doorT }
                    arcPath = `M${cx},${cy} L${cx},${cy - doorLen} A${doorLen},${doorLen} 0 0,1 ${cx + doorLen},${cy}`
                    break
                  case 'bottom':
                    cx = rx + rw * 0.35; cy = ry + rh
                    gapRect = { x: cx, y: cy - doorT / 2, w: doorLen, h: doorT }
                    arcPath = `M${cx},${cy} L${cx},${cy + doorLen} A${doorLen},${doorLen} 0 0,0 ${cx + doorLen},${cy}`
                    break
                  case 'left':
                    cx = rx; cy = ry + rh * 0.35
                    gapRect = { x: cx - doorT / 2, y: cy, w: doorT, h: doorLen }
                    arcPath = `M${cx},${cy} L${cx - doorLen},${cy} A${doorLen},${doorLen} 0 0,0 ${cx},${cy + doorLen}`
                    break
                  case 'right':
                  default:
                    cx = rx + rw; cy = ry + rh * 0.35
                    gapRect = { x: cx - doorT / 2, y: cy, w: doorT, h: doorLen }
                    arcPath = `M${cx},${cy} L${cx + doorLen},${cy} A${doorLen},${doorLen} 0 0,1 ${cx},${cy + doorLen}`
                    break
                }
                return (
                  <g>
                    {/* 벽 개구부 (흰색으로 벽 끊기) */}
                    <rect x={gapRect.x} y={gapRect.y} width={gapRect.w} height={gapRect.h} fill="#0f1729" />
                    {/* 문짝 (노란 선) */}
                    <line x1={cx} y1={cy} 
                      x2={room.doorSide === 'top' || room.doorSide === 'bottom' ? cx + doorLen : cx}
                      y2={room.doorSide === 'left' || room.doorSide === 'right' ? cy + doorLen : cy}
                      stroke="#fbbf24" strokeWidth="1.5" />
                    {/* 스윙 호 (점선) */}
                    <path d={arcPath} fill="none" stroke="#fbbf24" strokeWidth="0.8" strokeDasharray="2,2" opacity="0.7" />
                  </g>
                )
              })()}

              {/* 창문 */}
              {room.hasWindow && room.windowSides.map((side, wi) => {
                const winLen = Math.min(rw, rh) * 0.6
                let wx: number, wy: number, ww: number, wh: number
                switch (side) {
                  case 'top': wx = rx + rw / 2 - winLen / 2; wy = ry; ww = winLen; wh = 2; break
                  case 'bottom': wx = rx + rw / 2 - winLen / 2; wy = ry + rh - 2; ww = winLen; wh = 2; break
                  case 'left': wx = rx; wy = ry + rh / 2 - winLen / 2; ww = 2; wh = winLen; break
                  case 'right': wx = rx + rw - 2; wy = ry + rh / 2 - winLen / 2; ww = 2; wh = winLen; break
                }
                return <rect key={`win-${wi}`} x={wx!} y={wy!} width={ww!} height={wh!}
                  fill="#38bdf8" opacity="0.5" />
              })}
            </g>
          )
        })}

        {/* ━━━ 기둥 (검은 사각형) ━━━ */}
        {grid.columns.map((col, i) => {
          const cx = ox + col.x * grid.bayWidthM * px
          const cy = oy + col.y * grid.bayDepthM * px
          const cs = COLUMN_SIZE * px / 2
          return <rect key={`col-${i}`} x={cx - cs} y={cy - cs} width={cs * 2} height={cs * 2}
            fill="#1e293b" stroke="#64748b" strokeWidth="0.5" />
        })}

        {/* ━━━ 치수선 (상단 + 좌측) ━━━ */}
        {/* 상단 치수 */}
        {Array.from({ length: grid.baysX }, (_, i) => {
          const x1 = ox + i * grid.bayWidthM * px
          const x2 = x1 + grid.bayWidthM * px
          const y = oy - 22
          return (
            <g key={`dx-${i}`}>
              <line x1={x1} y1={y} x2={x2} y2={y} stroke="#94a3b8" strokeWidth="0.5" />
              <line x1={x1} y1={y - 3} x2={x1} y2={y + 3} stroke="#94a3b8" strokeWidth="0.5" />
              <line x1={x2} y1={y - 3} x2={x2} y2={y + 3} stroke="#94a3b8" strokeWidth="0.5" />
              <text x={(x1 + x2) / 2} y={y - 4} textAnchor="middle" fontSize="5.5" fill="#94a3b8">
                {grid.bayWidthM.toFixed(1)}m
              </text>
            </g>
          )
        })}
        {/* 상단 전체 치수 */}
        <line x1={ox} y1={oy - 35} x2={ox + gW} y2={oy - 35} stroke="#e2e8f0" strokeWidth="0.6" />
        <line x1={ox} y1={oy - 38} x2={ox} y2={oy - 32} stroke="#e2e8f0" strokeWidth="0.6" />
        <line x1={ox + gW} y1={oy - 38} x2={ox + gW} y2={oy - 32} stroke="#e2e8f0" strokeWidth="0.6" />
        <text x={ox + gW / 2} y={oy - 38} textAnchor="middle" fontSize="6.5" fill="#e2e8f0" fontWeight="600">
          {grid.totalWidthM.toFixed(1)}m
        </text>

        {/* 좌측 치수 */}
        {Array.from({ length: grid.baysY }, (_, i) => {
          const y1 = oy + i * grid.bayDepthM * px
          const y2 = y1 + grid.bayDepthM * px
          const x = ox - 24
          return (
            <g key={`dy-${i}`}>
              <line x1={x} y1={y1} x2={x} y2={y2} stroke="#94a3b8" strokeWidth="0.5" />
              <line x1={x - 3} y1={y1} x2={x + 3} y2={y1} stroke="#94a3b8" strokeWidth="0.5" />
              <line x1={x - 3} y1={y2} x2={x + 3} y2={y2} stroke="#94a3b8" strokeWidth="0.5" />
              <text x={x - 5} y={(y1 + y2) / 2 + 2} textAnchor="end" fontSize="5.5" fill="#94a3b8">
                {grid.bayDepthM.toFixed(1)}m
              </text>
            </g>
          )
        })}
        {/* 좌측 전체 치수 */}
        <line x1={ox - 38} y1={oy} x2={ox - 38} y2={oy + gH} stroke="#e2e8f0" strokeWidth="0.6" />
        <line x1={ox - 41} y1={oy} x2={ox - 35} y2={oy} stroke="#e2e8f0" strokeWidth="0.6" />
        <line x1={ox - 41} y1={oy + gH} x2={ox - 35} y2={oy + gH} stroke="#e2e8f0" strokeWidth="0.6" />
        <text x={ox - 44} y={oy + gH / 2} textAnchor="middle" fontSize="6.5" fill="#e2e8f0" fontWeight="600"
          transform={`rotate(-90, ${ox - 44}, ${oy + gH / 2})`}>
          {grid.totalDepthM.toFixed(1)}m
        </text>

        {/* ━━━ 방위 ━━━ */}
        <g transform={`translate(${ox + gW + 15}, ${oy + 15})`}>
          <line x1="0" y1="10" x2="0" y2="-5" stroke="#ef4444" strokeWidth="1" />
          <polygon points="-3,0 3,0 0,-7" fill="#ef4444" />
          <text x="0" y="-9" textAnchor="middle" fontSize="6" fill="#ef4444" fontWeight="700">N</text>
        </g>

        {/* ━━━ 범례 ━━━ */}
        <g transform={`translate(${ox}, ${oy + gH + 12})`}>
          {[
            { color: '#ef4444', label: '구조 그리드', dash: true },
            { color: '#94a3b8', label: 'RC벽 200mm', dash: false },
            { color: '#475569', label: '경량벽 100mm', dash: false },
            { color: '#38bdf8', label: '창문', dash: false },
            { color: '#fbbf24', label: '문', dash: false },
          ].map((item, i) => (
            <g key={i} transform={`translate(${i * (gW / 5)}, 0)`}>
              <line x1="0" y1="4" x2="10" y2="4" stroke={item.color} strokeWidth="1.5"
                strokeDasharray={item.dash ? '2 1' : 'none'} />
              <text x="13" y="7" fontSize="4.5" fill="#94a3b8">{item.label}</text>
            </g>
          ))}
        </g>

        {/* Alexander 패턴 표시 */}
        <text x={ox + gW} y={oy + gH + 12} textAnchor="end" fontSize="4" fill="#8b5cf6" opacity="0.7">
          Christopher Alexander 패턴 {grid.patterns.length}개 적용
        </text>
      </svg>

      {/* 적용된 패턴 목록 */}
      <div className="mt-2 flex flex-wrap gap-1 px-1">
        {grid.patterns.map((p, i) => (
          <span key={i} className="text-[10px] bg-violet-500/10 text-violet-400 px-1.5 py-0.5 rounded">
            {p}
          </span>
        ))}
      </div>

      {/* Phase 4: 창호·마감 스케줄 */}
      {(() => {
        const sch = generateSchedules(grid)
        return (
          <div className="mt-3 space-y-2 px-1">
            {/* 창호 스케줄 */}
            <details className="group">
              <summary className="text-[10px] font-semibold text-blue-400 cursor-pointer">🪟 창호 스케줄 ({sch.windows.length}종)</summary>
              <div className="mt-1 overflow-x-auto">
                <table className="w-full text-[9px] text-muted-foreground">
                  <thead><tr className="border-b border-white/10">
                    <th className="py-1 px-1 text-left">NO</th><th className="px-1 text-left">타입</th>
                    <th className="px-1">W×H</th><th className="px-1">재료</th><th className="px-1">유리</th><th className="px-1">수량</th>
                  </tr></thead>
                  <tbody>{sch.windows.map(w => (
                    <tr key={w.id} className="border-b border-white/5">
                      <td className="py-0.5 px-1 text-blue-300">{w.id}</td><td className="px-1">{w.type}</td>
                      <td className="px-1 text-center">{w.width}×{w.height}</td><td className="px-1">{w.material}</td>
                      <td className="px-1">{w.glass}</td><td className="px-1 text-center">{w.count}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </details>
            
            {/* 문 스케줄 */}
            <details className="group">
              <summary className="text-[10px] font-semibold text-amber-400 cursor-pointer">🚪 문 스케줄 ({sch.doors.length}종)</summary>
              <div className="mt-1 overflow-x-auto">
                <table className="w-full text-[9px] text-muted-foreground">
                  <thead><tr className="border-b border-white/10">
                    <th className="py-1 px-1 text-left">NO</th><th className="px-1 text-left">타입</th>
                    <th className="px-1">W×H</th><th className="px-1">재료</th><th className="px-1">방화</th><th className="px-1">수량</th>
                  </tr></thead>
                  <tbody>{sch.doors.map(d => (
                    <tr key={d.id} className="border-b border-white/5">
                      <td className="py-0.5 px-1 text-amber-300">{d.id}</td><td className="px-1">{d.type}</td>
                      <td className="px-1 text-center">{d.width}×{d.height}</td><td className="px-1">{d.material}</td>
                      <td className="px-1">{d.fireRating}</td><td className="px-1 text-center">{d.count}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </details>
            
            {/* 마감표 */}
            <details className="group">
              <summary className="text-[10px] font-semibold text-emerald-400 cursor-pointer">🎨 마감표 ({sch.finishes.length}실)</summary>
              <div className="mt-1 overflow-x-auto">
                <table className="w-full text-[9px] text-muted-foreground">
                  <thead><tr className="border-b border-white/10">
                    <th className="py-1 px-1 text-left">실명</th><th className="px-1 text-left">바닥</th>
                    <th className="px-1 text-left">벽</th><th className="px-1 text-left">천장</th><th className="px-1">CH</th>
                  </tr></thead>
                  <tbody>{sch.finishes.map((f, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td className="py-0.5 px-1 text-emerald-300">{f.room}</td><td className="px-1">{f.floor}</td>
                      <td className="px-1">{f.wall}</td><td className="px-1">{f.ceiling}</td>
                      <td className="px-1 text-center">{f.ceilingHeight}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </details>
          </div>
        )
      })()}

      {/* Phase 5: 구조 계산 */}
      {(() => {
        const calc = calculateStructure(grid, floors, siteArea)
        return (
          <div className="mt-3 space-y-2 px-1">
            <details className="group">
              <summary className="text-[10px] font-semibold text-red-400 cursor-pointer">🏗️ 구조 계산 (Fck {calc.summary.fck}MPa / Fy {calc.summary.fy}MPa)</summary>
              <div className="mt-1 space-y-2">
                {/* 기둥 */}
                <div className="overflow-x-auto">
                  <div className="text-[9px] text-red-300 font-semibold mb-0.5">기둥 (Column)</div>
                  <table className="w-full text-[9px] text-muted-foreground">
                    <thead><tr className="border-b border-white/10">
                      <th className="py-0.5 px-1 text-left">NO</th><th className="px-1">단면</th>
                      <th className="px-1">주근</th><th className="px-1">띠근</th><th className="px-1">위치</th><th className="px-1">축하중비</th>
                    </tr></thead>
                    <tbody>{calc.columns.map(c => (
                      <tr key={c.id} className="border-b border-white/5">
                        <td className="py-0.5 px-1 text-red-300">{c.id}</td>
                        <td className="px-1 text-center">{c.width}×{c.depth}</td>
                        <td className="px-1">{c.mainBar}</td><td className="px-1">{c.tieBar}</td>
                        <td className="px-1">{c.location}</td>
                        <td className="px-1 text-center">{(c.loadRatio*100).toFixed(0)}%</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
                {/* 보 */}
                <div className="overflow-x-auto">
                  <div className="text-[9px] text-orange-300 font-semibold mb-0.5">보 (Beam)</div>
                  <table className="w-full text-[9px] text-muted-foreground">
                    <thead><tr className="border-b border-white/10">
                      <th className="py-0.5 px-1 text-left">NO</th><th className="px-1">단면</th>
                      <th className="px-1">상부근</th><th className="px-1">하부근</th><th className="px-1">전단근</th><th className="px-1">경간</th>
                    </tr></thead>
                    <tbody>{calc.beams.map(b => (
                      <tr key={b.id} className="border-b border-white/5">
                        <td className="py-0.5 px-1 text-orange-300">{b.id}</td>
                        <td className="px-1 text-center">{b.width}×{b.depth}</td>
                        <td className="px-1">{b.topBar}</td><td className="px-1">{b.bottomBar}</td>
                        <td className="px-1">{b.stirrup}</td>
                        <td className="px-1 text-center">{(b.span/1000).toFixed(1)}m</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
                {/* 슬래브 + 기초 */}
                <div className="grid grid-cols-2 gap-2 text-[9px] text-muted-foreground">
                  <div className="bg-white/5 rounded p-1.5">
                    <div className="text-cyan-300 font-semibold mb-0.5">슬래브 (Slab)</div>
                    <div>{calc.slab.type} · {calc.slab.thickness}mm</div>
                    <div>상부 {calc.slab.topMesh}</div>
                    <div>하부 {calc.slab.bottomMesh}</div>
                  </div>
                  <div className="bg-white/5 rounded p-1.5">
                    <div className="text-yellow-300 font-semibold mb-0.5">기초 (Foundation)</div>
                    <div>{calc.foundation.type} · {calc.foundation.thickness}mm</div>
                    <div>근입 {calc.foundation.depth}mm</div>
                    <div>하부 {calc.foundation.bottomBar}</div>
                  </div>
                </div>
              </div>
            </details>
          </div>
        )
      })()}

      {/* Phase 6: MEP 상세 */}
      {(() => {
        const mep = generateMEPDesign(grid)
        return (
          <div className="mt-3 space-y-2 px-1">
            <details className="group">
              <summary className="text-[10px] font-semibold text-cyan-400 cursor-pointer">⚡ MEP 상세 (전기 {mep.summary.outlets}구 · 소방 {mep.summary.sprinklers}SP · PS {mep.summary.psCount}개)</summary>
              <div className="mt-1 grid grid-cols-2 gap-2 text-[9px] text-muted-foreground">
                <div className="bg-yellow-500/5 rounded p-1.5">
                  <div className="text-yellow-300 font-semibold mb-0.5">⚡ 전기</div>
                  <div>회로: {mep.summary.circuits}개</div>
                  <div>콘센트: {mep.summary.outlets}구</div>
                  <div>스위치: {mep.summary.switches}개</div>
                  <div>TV/LAN: {mep.electrical.filter(e => e.type === 'tv' || e.type === 'data').length}개</div>
                </div>
                <div className="bg-blue-500/5 rounded p-1.5">
                  <div className="text-blue-300 font-semibold mb-0.5">🔧 급배수</div>
                  <div>PS: {mep.summary.psCount}개소</div>
                  <div>급수: {mep.plumbing.filter(p => p.type === 'cold').length}경로</div>
                  <div>온수: {mep.plumbing.filter(p => p.type === 'hot').length}경로</div>
                  <div>배수: {mep.plumbing.filter(p => p.type === 'drain').length}경로</div>
                </div>
                <div className="bg-green-500/5 rounded p-1.5">
                  <div className="text-green-300 font-semibold mb-0.5">🌀 환기</div>
                  <div>급기: {mep.hvac.filter(h => h.type === 'diffuser').length}개소</div>
                  <div>배기: {mep.hvac.filter(h => h.type === 'exhaust').length}개소</div>
                  <div>덕트: {mep.summary.ductLength}m</div>
                </div>
                <div className="bg-red-500/5 rounded p-1.5">
                  <div className="text-red-300 font-semibold mb-0.5">🧯 소방</div>
                  <div>감지기: {mep.summary.detectors}개</div>
                  <div>스프링클러: {mep.summary.sprinklers}개</div>
                  <div>소화기: {mep.fire.filter(f => f.type === 'extinguisher').length}개</div>
                  <div>유도등: {mep.fire.filter(f => f.type === 'exit_sign').length}개</div>
                </div>
              </div>
            </details>
          </div>
        )
      })()}

      {/* ━━━ BOQ 물량 산출 ━━━ */}
      {(() => {
        const sch2 = generateSchedules(grid)
        const calc2 = calculateStructure(grid, floors, siteArea)
        const boq = generateBOQ({ grid, calc: calc2, windows: sch2.windows, doors: sch2.doors, finishes: sch2.finishes, floors, siteArea })
        return (
          <div className="mt-2 px-1">
            <details>
              <summary className="text-[10px] font-semibold text-emerald-400 cursor-pointer">📦 BOQ 물량 산출 (총 {boq.totalCostBillion}억원 · {boq.items.length}항목 · {(boq.costPerM2/10000).toFixed(0)}만/㎡)</summary>
              <div className="mt-1 space-y-1 text-[9px] text-slate-400">
                {['구조', '건축', '설비', '간접비'].map(cat => (
                  <div key={cat}>
                    <div className="text-[9px] font-bold text-emerald-300 mb-0.5">{cat === '구조' ? '🏗️' : cat === '건축' ? '🧱' : cat === '설비' ? '⚡' : '📋'} {cat} ({(boq.items.filter(it => it.category === cat).reduce((s, it) => s + it.totalPrice, 0) / 1e8).toFixed(1)}억)</div>
                    {boq.items.filter(it => it.category === cat && it.quantity > 0).map((it, i) => (
                      <div key={i} className="flex justify-between pl-2">
                        <span>{it.item}</span>
                        <span className="text-emerald-400/70">{it.quantity.toLocaleString()}{it.unit}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </details>
          </div>
        )
      })()}

      {/* ━━━ 실시설계 상세 ━━━ */}
      {(() => {
        const detail = generateConstructionDetail({ floors, type })
        return (
          <div className="mt-2 px-1">
            <details>
              <summary className="text-[10px] font-semibold text-orange-400 cursor-pointer">🧱 실시설계 상세 (벽체{detail.wallSections.length} 방수{detail.waterproofing.length} 단열{detail.insulation.length} 배근{detail.rebarDetails.length})</summary>
              <div className="mt-1 space-y-1 text-[9px] text-slate-400">
                {detail.wallSections.map((w, i) => (
                  <div key={i} className="pl-1"><span className="text-orange-300">{w.id}</span> {w.name} {w.totalThickness}mm U={w.uValue}</div>
                ))}
                <div className="text-orange-300/70 text-[8px]">방수: {detail.waterproofing.map(w => w.location).join(' · ')}</div>
                <div className="text-orange-300/70 text-[8px]">단열: {detail.insulation.map(i => `${i.location} ${i.thickness}mm`).join(' · ')}</div>
                <div className="text-orange-300/70 text-[8px]">배근: {detail.rebarDetails.map(r => `${r.member}:${r.mainBar}`).join(' · ')}</div>
              </div>
            </details>
          </div>
        )
      })()}

      {/* ━━━ 공정표 ━━━ */}
      {(() => {
        const schedule = estimateSchedule({ floors, siteArea, type })
        const colors: Record<string, string> = { design: '#818cf8', permit: '#fbbf24', construction: '#34d399', completion: '#f87171' }
        return (
          <div className="mt-2 px-1 mb-2">
            <details>
              <summary className="text-[10px] font-semibold text-violet-400 cursor-pointer">📅 공정표 ({schedule.totalMonths}개월 = 설계{schedule.designPeriod}+인허가{schedule.permitPeriod}+공사{schedule.constructionPeriod}+준공{schedule.completionPeriod})</summary>
              <div className="mt-1 space-y-0.5 text-[9px]">
                {schedule.phases.map((p, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <span className="w-16 truncate text-slate-500 text-[8px]">{p.name}</span>
                    <div className="flex-1 h-2.5 bg-white/5 rounded relative">
                      <div className="absolute h-full rounded" style={{ left: `${p.start/schedule.totalDays*100}%`, width: `${Math.max(p.duration/schedule.totalDays*100, 2)}%`, background: colors[p.category] }} />
                    </div>
                    <span className="w-6 text-right text-slate-500 text-[8px]">{Math.round(p.duration/30)}m</span>
                  </div>
                ))}
              </div>
            </details>
          </div>
        )
      })()}
    </div>
  )
}
