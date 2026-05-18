"use client"

import { generateStructuralGrid, WALL_RC, WALL_PARTITION, COLUMN_SIZE, type StructuralGrid, type Room } from "@/lib/structural-grid"
import { getBuildingDimensionsInMeters } from "@/lib/building-geometry"
import { generateFullDXF, downloadDXF } from "@/lib/dxf-generator"
import { generateSchedules } from "@/lib/schedule-generator"

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
  const svgW = grid.totalWidthM * px + margin * 2
  const svgH = grid.totalDepthM * px + margin * 2 + 30  // 하단 정보 공간

  const ox = margin   // 원점 X
  const oy = margin   // 원점 Y
  const gW = grid.totalWidthM * px
  const gH = grid.totalDepthM * px

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
        <button onClick={() => {
          const dxf = generateFullDXF({
            type, coverage, siteArea, floors, units, unitArea,
            layoutName: `${type} ${floors}층`,
          })
          downloadDXF(dxf, `structural-${type}-${floors}F.dxf`)
        }} className="px-2 py-1 rounded-lg text-[10px] font-medium bg-blue-500/10 text-blue-400 hover:bg-blue-500/20">
          📐 AutoCAD DXF
        </button>
      </div>

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

        {/* ━━━ 방 영역 ━━━ */}
        {grid.rooms.map((room, i) => {
          const rx = ox + room.gridX * grid.bayWidthM * px
          const ry = oy + room.gridY * grid.bayDepthM * px
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

              {/* 문 */}
              {room.hasDoor && (() => {
                const doorW = 6
                let dx: number, dy: number, dw: number, dh: number
                switch (room.doorSide) {
                  case 'top': dx = rx + rw / 2 - doorW; dy = ry - 1; dw = doorW * 2; dh = 2; break
                  case 'bottom': dx = rx + rw / 2 - doorW; dy = ry + rh - 1; dw = doorW * 2; dh = 2; break
                  case 'left': dx = rx - 1; dy = ry + rh / 2 - doorW; dw = 2; dh = doorW * 2; break
                  case 'right': dx = rx + rw - 1; dy = ry + rh / 2 - doorW; dw = 2; dh = doorW * 2; break
                }
                return <rect x={dx!} y={dy!} width={dw!} height={dh!} fill="#fbbf24" opacity="0.6" rx="0.5" />
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
    </div>
  )
}
