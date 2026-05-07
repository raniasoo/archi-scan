"use client"

import React, { useState } from "react"
import { Loader2, Sparkles, RotateCcw, ZoomIn, ZoomOut } from "lucide-react"

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 타입 정의 (Claude API 응답 형식)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface FurnitureDef { type: string; x: number; y: number; w: number; h: number }
interface RoomDef { name: string; x: number; y: number; w: number; h: number; furniture?: FurnitureDef[] }
interface DoorDef { x: number; y: number; wall: 'top'|'bottom'|'left'|'right'; width: number; type?: 'swing'|'slide'|'entrance' }
interface WindowDef { x: number; y: number; wall: 'top'|'bottom'|'left'|'right'; width: number }
interface CoreElement { type: string; x: number; y: number; w: number; h: number }
interface UnitDef {
  id: string; type: string; exclusiveArea: number
  x: number; y: number; w: number; h: number
  rooms: RoomDef[]; doors?: DoorDef[]; windows?: WindowDef[]
}
interface FloorPlanData {
  floorPlan: {
    buildingWidth: number; buildingDepth: number; floorType?: string
    core: { x: number; y: number; w: number; h: number; elements?: CoreElement[] }
    units: UnitDef[]
  }
  summary?: { totalUnits?: number; unitMix?: Record<string,number>; coreArea?: number; totalExclusiveArea?: number; serviceRatio?: number }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 스케일 상수
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const PX_PER_M = 20 // 1m = 20px

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 실 색상 맵
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const ROOM_COLORS: Record<string, string> = {
  '현관': '#f1f5f9', '거실': '#f0fdf4', '주방': '#fef3c7', '주침실': '#eff6ff',
  '침실2': '#f0f9ff', '침실3': '#f5f3ff', '주욕실': '#e0f2fe', '보조욕실': '#e0f2fe',
  '욕실': '#e0f2fe', '욕실1': '#e0f2fe', '욕실2': '#e0f2fe',
  '드레스룸': '#faf5ff', '발코니': '#ecfdf5', '다용도실': '#fef9c3',
  '복도': '#f8fafc', '서재': '#fdf2f8', '팬트리': '#fff7ed',
}

function getRoomColor(name: string): string {
  for (const [key, color] of Object.entries(ROOM_COLORS)) {
    if (name.includes(key)) return color
  }
  return '#f8fafc'
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 가구 렌더러
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function FurnitureSVG({ f, scale }: { f: FurnitureDef; scale: number }) {
  const x = f.x * scale, y = f.y * scale, w = f.w * scale, h = f.h * scale
  const cx = x + w/2, cy = y + h/2
  
  switch (f.type) {
    case 'bed':
      return <g opacity="0.4"><rect x={x} y={y} width={w} height={h} rx={1} fill="#93c5fd" stroke="#60a5fa" strokeWidth="0.5" />
        <rect x={x+1} y={y+1} width={w-2} height={h*0.3} rx={0.5} fill="#bfdbfe" stroke="#60a5fa" strokeWidth="0.3" /></g>
    case 'sofa':
      return <g opacity="0.35"><rect x={x} y={y} width={w} height={h*0.7} rx={1} fill="#86efac" stroke="#4ade80" strokeWidth="0.5" />
        <rect x={x} y={y+h*0.7} width={w} height={h*0.3} rx={0.5} fill="#4ade80" stroke="#22c55e" strokeWidth="0.3" /></g>
    case 'dining':
      return <g opacity="0.3"><rect x={x} y={y} width={w} height={h} rx={1} fill="none" stroke="#a16207" strokeWidth="0.5" />
        {[0.25,0.75].map(px => [0,1].map(py => <circle key={`${px}-${py}`} cx={x+w*px} cy={y+(py===0?-1:h+1)*1} r={0.8} fill="none" stroke="#a16207" strokeWidth="0.3" />))}</g>
    case 'sink':
      return <g opacity="0.4"><rect x={x} y={y} width={w} height={h} rx={1} fill="#e0f2fe" stroke="#38bdf8" strokeWidth="0.5" />
        <circle cx={cx} cy={cy} r={Math.min(w,h)*0.2} fill="none" stroke="#0ea5e9" strokeWidth="0.3" /></g>
    case 'toilet':
      return <g opacity="0.4"><ellipse cx={cx} cy={cy+h*0.1} rx={w*0.35} ry={h*0.35} fill="#e0f2fe" stroke="#38bdf8" strokeWidth="0.5" />
        <rect x={cx-w*0.25} y={cy+h*0.3} width={w*0.5} height={h*0.15} rx={0.5} fill="#bae6fd" stroke="#38bdf8" strokeWidth="0.3" /></g>
    case 'tub':
      return <g opacity="0.35"><rect x={x} y={y} width={w} height={h} rx={2} fill="#bae6fd" stroke="#38bdf8" strokeWidth="0.5" />
        <circle cx={x+w*0.8} cy={y+2} r={0.8} fill="#0ea5e9" /></g>
    case 'washer':
      return <g opacity="0.35"><circle cx={cx} cy={cy} r={Math.min(w,h)*0.35} fill="#d1d5db" stroke="#6b7280" strokeWidth="0.5" />
        <circle cx={cx} cy={cy} r={Math.min(w,h)*0.2} fill="none" stroke="#6b7280" strokeWidth="0.3" /></g>
    case 'fridge':
      return <g opacity="0.3"><rect x={x} y={y} width={w} height={h} rx={0.5} fill="#94a3b8" stroke="#64748b" strokeWidth="0.4" /></g>
    case 'range':
      return <g opacity="0.3"><rect x={x} y={y} width={w} height={h} rx={0.5} fill="#fca5a5" stroke="#ef4444" strokeWidth="0.4" />
        {[0.3,0.7].map(px => <circle key={px} cx={x+w*px} cy={cy} r={Math.min(w,h)*0.15} fill="none" stroke="#dc2626" strokeWidth="0.3" />)}</g>
    case 'shoes':
      return <g opacity="0.3"><rect x={x} y={y} width={w} height={h} rx={0.5} fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.4" /></g>
    case 'closet':
      return <g opacity="0.25"><rect x={x} y={y} width={w} height={h} rx={0.5} fill="none" stroke="#a855f7" strokeWidth="0.5" strokeDasharray="2 1" /></g>
    case 'desk':
      return <g opacity="0.3"><rect x={x} y={y} width={w} height={h} rx={0.5} fill="none" stroke="#64748b" strokeWidth="0.5" />
        <circle cx={x+w*0.7} cy={cy} r={Math.min(w,h)*0.2} fill="none" stroke="#64748b" strokeWidth="0.3" /></g>
    default:
      return null
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 문 렌더러
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function DoorSVG({ d, unitX, unitY, scale }: { d: DoorDef; unitX: number; unitY: number; scale: number }) {
  const dx = (unitX + d.x) * scale, dy = (unitY + d.y) * scale
  const dw = d.width * scale
  const isSlide = d.type === 'slide'
  const isEntrance = d.type === 'entrance'
  
  if (d.wall === 'top' || d.wall === 'bottom') {
    const py = d.wall === 'top' ? dy : dy
    if (isSlide) {
      return <g><line x1={dx} y1={py} x2={dx+dw} y2={py} stroke="#ef4444" strokeWidth="1.5" />
        <line x1={dx+dw*0.3} y1={py-1} x2={dx+dw*0.7} y2={py-1} stroke="#ef4444" strokeWidth="0.5" /></g>
    }
    const r = dw
    const sweep = d.wall === 'top' ? 1 : 0
    return <g>
      <line x1={dx} y1={py} x2={dx+dw} y2={py} stroke={isEntrance ? '#2dd4bf' : '#f97316'} strokeWidth={isEntrance ? 2 : 1} />
      <path d={`M ${dx} ${py} A ${r} ${r} 0 0 ${sweep} ${dx+dw} ${py + (d.wall==='top'?dw:-dw)}`} fill="none" stroke="#f97316" strokeWidth="0.5" strokeDasharray="2 1" />
    </g>
  }
  // left/right walls
  const px = d.wall === 'left' ? dx : dx
  if (isSlide) {
    return <g><line x1={px} y1={dy} x2={px} y2={dy+dw} stroke="#ef4444" strokeWidth="1.5" /></g>
  }
  return <g>
    <line x1={px} y1={dy} x2={px} y2={dy+dw} stroke={isEntrance ? '#2dd4bf' : '#f97316'} strokeWidth={isEntrance ? 2 : 1} />
  </g>
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 창문 렌더러
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function WindowSVG({ w, unitX, unitY, scale }: { w: WindowDef; unitX: number; unitY: number; scale: number }) {
  const wx = (unitX + w.x) * scale, wy = (unitY + w.y) * scale
  const ww = w.width * scale
  if (w.wall === 'top' || w.wall === 'bottom') {
    return <g>
      <line x1={wx} y1={wy} x2={wx+ww} y2={wy} stroke="#0ea5e9" strokeWidth="2.5" />
      <line x1={wx} y1={wy-1.5} x2={wx+ww} y2={wy-1.5} stroke="#0ea5e9" strokeWidth="0.3" />
      <line x1={wx} y1={wy+1.5} x2={wx+ww} y2={wy+1.5} stroke="#0ea5e9" strokeWidth="0.3" />
    </g>
  }
  return <g>
    <line x1={wx} y1={wy} x2={wx} y2={wy+ww} stroke="#0ea5e9" strokeWidth="2.5" />
    <line x1={wx-1.5} y1={wy} x2={wx-1.5} y2={wy+ww} stroke="#0ea5e9" strokeWidth="0.3" />
    <line x1={wx+1.5} y1={wy} x2={wx+1.5} y2={wy+ww} stroke="#0ea5e9" strokeWidth="0.3" />
  </g>
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 메인 렌더러
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function FloorPlanSVG({ data, scale }: { data: FloorPlanData; scale: number }) {
  const fp = data.floorPlan
  const bW = fp.buildingWidth * scale
  const bD = fp.buildingDepth * scale
  const pad = 40

  return (
    <svg viewBox={`0 0 ${bW + pad * 2} ${bD + pad * 2 + 20}`} className="w-full" style={{ minWidth: 300, maxHeight: 500 }}>
      <g transform={`translate(${pad}, ${pad})`}>
        {/* 건물 외곽 */}
        <rect x={0} y={0} width={bW} height={bD} fill="none" stroke="currentColor" strokeWidth="3" className="text-foreground" />

        {/* 코어 */}
        {fp.core && (() => {
          const cx = fp.core.x * scale, cy = fp.core.y * scale
          const cw = fp.core.w * scale, ch = fp.core.h * scale
          return <g>
            <rect x={cx} y={cy} width={cw} height={ch} fill="#33415520" stroke="#475569" strokeWidth="1.5" rx="1" />
            {fp.core.elements?.map((el, i) => {
              const ex = el.x * scale, ey = el.y * scale, ew = el.w * scale, eh = el.h * scale
              const fills: Record<string,string> = { stair: '#475569', elevator: '#334155', corridor: '#94a3b810', pipe: '#64748b' }
              return <g key={i}>
                <rect x={ex} y={ey} width={ew} height={eh} fill={fills[el.type] || '#64748b'} rx="0.5" />
                <text x={ex+ew/2} y={ey+eh/2+1.5} fontSize="3.5" textAnchor="middle" fill={el.type === 'corridor' ? '#64748b' : 'white'}>
                  {el.type === 'stair' ? '계단' : el.type === 'elevator' ? 'EV' : el.type === 'corridor' ? '복도' : 'PS'}
                </text>
              </g>
            })}
            {!fp.core.elements?.length && <text x={cx+cw/2} y={cy+ch/2+2} fontSize="5" textAnchor="middle" fill="#475569" fontWeight="600">코어</text>}
          </g>
        })()}

        {/* 세대 */}
        {fp.units.map((unit, ui) => {
          const ux = unit.x * scale, uy = unit.y * scale
          const uw = unit.w * scale, uh = unit.h * scale
          const unitColor = ui % 2 === 0 ? '#10b981' : '#3b82f6'

          return <g key={unit.id}>
            {/* 세대 외곽 */}
            <rect x={ux} y={uy} width={uw} height={uh} fill="none" stroke="currentColor" strokeWidth="2" className="text-foreground" />

            {/* 실 */}
            {unit.rooms.map((room, ri) => {
              const rx = (unit.x + room.x) * scale, ry = (unit.y + room.y) * scale
              const rw = room.w * scale, rh = room.h * scale
              const area = Math.round(room.w * room.h * 10) / 10
              const isBal = room.name.includes('발코니')
              return <g key={ri}>
                <rect x={rx} y={ry} width={rw} height={rh}
                  fill={getRoomColor(room.name)} stroke="currentColor"
                  strokeWidth={isBal ? 0.5 : 1} className="text-foreground"
                  strokeDasharray={isBal ? '3 1.5' : undefined} />
                <text x={rx+rw/2} y={ry+rh/2-1} fontSize={rw > 30 ? 5 : 3.5} textAnchor="middle" fill="#374151" fontWeight="600">{room.name}</text>
                <text x={rx+rw/2} y={ry+rh/2+4} fontSize={rw > 30 ? 3.5 : 2.5} textAnchor="middle" fill="#9ca3af">{area}㎡</text>
                {/* 가구 */}
                {room.furniture?.map((f, fi) => (
                  <FurnitureSVG key={fi} f={{ ...f, x: unit.x + room.x + f.x, y: unit.y + room.y + f.y }} scale={scale} />
                ))}
              </g>
            })}

            {/* 문 */}
            {unit.doors?.map((d, di) => <DoorSVG key={di} d={d} unitX={unit.x} unitY={unit.y} scale={scale} />)}

            {/* 창 */}
            {unit.windows?.map((w, wi) => <WindowSVG key={wi} w={w} unitX={unit.x} unitY={unit.y} scale={scale} />)}

            {/* 세대 라벨 */}
            <text x={ux+uw/2} y={uy+uh+10} fontSize="5" textAnchor="middle" fill={unitColor} fontWeight="700">
              {unit.id}호 ({unit.type} · {unit.exclusiveArea}㎡)
            </text>
          </g>
        })}

        {/* 치수선 */}
        <g>
          <line x1={0} y1={-12} x2={bW} y2={-12} stroke="#94a3b8" strokeWidth="0.5" />
          <line x1={0} y1={-14} x2={0} y2={-10} stroke="#94a3b8" strokeWidth="0.5" />
          <line x1={bW} y1={-14} x2={bW} y2={-10} stroke="#94a3b8" strokeWidth="0.5" />
          <text x={bW/2} y={-16} fontSize="4.5" textAnchor="middle" fill="#64748b">{fp.buildingWidth}m</text>

          <line x1={-12} y1={0} x2={-12} y2={bD} stroke="#94a3b8" strokeWidth="0.5" />
          <line x1={-14} y1={0} x2={-10} y2={0} stroke="#94a3b8" strokeWidth="0.5" />
          <line x1={-14} y1={bD} x2={-10} y2={bD} stroke="#94a3b8" strokeWidth="0.5" />
          <text x={-18} y={bD/2} fontSize="4.5" textAnchor="middle" fill="#64748b" transform={`rotate(-90, -18, ${bD/2})`}>{fp.buildingDepth}m</text>
        </g>

        {/* 방위 */}
        <g transform={`translate(${bW+20}, 10)`}>
          <line x1={0} y1={12} x2={0} y2={-2} stroke="currentColor" strokeWidth="1" className="text-foreground" />
          <polygon points="0,-4 -3,2 3,2" fill="currentColor" className="text-foreground" />
          <text x={0} y={-6} fontSize="5" textAnchor="middle" fill="currentColor" fontWeight="700" className="text-foreground">N</text>
        </g>
      </g>
    </svg>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 면적표
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function AIAreaTable({ data }: { data: FloorPlanData }) {
  return (
    <div className="text-[11px] border border-border rounded-lg overflow-hidden">
      <div className="bg-primary/10 px-3 py-1.5 font-bold text-xs flex items-center gap-1.5">
        <Sparkles className="h-3 w-3 text-primary" />AI 생성 면적표
      </div>
      <table className="w-full">
        <thead><tr className="bg-secondary/50 text-[10px]">
          <th className="px-2 py-1 text-left">세대</th>
          <th className="px-2 py-1 text-left">타입</th>
          <th className="px-2 py-1 text-right">전용면적</th>
          <th className="px-2 py-1 text-right">실 수</th>
        </tr></thead>
        <tbody>
          {data.floorPlan.units.map(u => (
            <tr key={u.id} className="border-t border-border/30">
              <td className="px-2 py-0.5 font-semibold">{u.id}호</td>
              <td className="px-2 py-0.5">{u.type}</td>
              <td className="px-2 py-0.5 text-right font-mono">{u.exclusiveArea}㎡</td>
              <td className="px-2 py-0.5 text-right">{u.rooms.length}실</td>
            </tr>
          ))}
          {data.summary && (
            <tr className="border-t border-border bg-emerald-500/10 font-bold">
              <td className="px-2 py-1" colSpan={2}>합계 ({data.summary.totalUnits || data.floorPlan.units.length}세대)</td>
              <td className="px-2 py-1 text-right font-mono">{data.summary.totalExclusiveArea || data.floorPlan.units.reduce((s,u)=>s+u.exclusiveArea,0)}㎡</td>
              <td className="px-2 py-1 text-right">{data.summary.serviceRatio ? `${data.summary.serviceRatio}%` : '-'}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 메인 컴포넌트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface AIFloorPlanProps {
  siteArea: number
  buildingCoverage: number
  floors: number
  units: number
  type?: string
  layoutName?: string
  address?: string
  zoneType?: string
  heightLimit?: number
  setbacks?: { front?: number; side?: number; rear?: number }
}

export function AIFloorPlan(props: AIFloorPlanProps) {
  const { siteArea, buildingCoverage, floors, units, type, layoutName, address, zoneType, heightLimit, setbacks } = props
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<FloorPlanData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [scale, setScale] = useState(PX_PER_M)

  const footprintArea = siteArea * (buildingCoverage / 100)
  const bW = Math.round(Math.sqrt(footprintArea * 1.6) * 10) / 10
  const bD = Math.round(footprintArea / bW * 10) / 10
  const unitsPerFloor = Math.max(Math.ceil(units / Math.max(floors - 1, 1)), 2)

  const generate = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/generate-floorplan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site: {
            address: address || '서울특별시',
            siteArea,
            zoning: zoneType || '제2종일반주거지역',
            heightLimit: heightLimit || 21,
            setbacks: setbacks || { front: 3, side: 1.5, rear: 2 },
          },
          layout: {
            type: layoutName || type || '타워형',
            floors,
            units,
            buildingCoverage,
            far: Math.round(buildingCoverage * floors),
            footprint: { width: bW, depth: bD },
          },
          preferences: {
            unitTypes: unitsPerFloor <= 2 ? ['쓰리룸'] : ['투룸', '쓰리룸'],
            balconyExpansion: true,
            koreanStandard: true,
          },
        }),
      })
      const result = await res.json()
      if (result.success && result.data) {
        setData(result.data)
      } else {
        setError(result.error || 'AI 평면 생성에 실패했습니다')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '네트워크 오류')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {!data ? (
        <div className="text-center py-8 space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold mb-1">AI 평면 자동 생성</h3>
            <p className="text-[11px] text-muted-foreground">
              Claude AI가 대지 조건·법규·배치안을 분석하여<br />
              한국 주거 표준에 맞는 평면도를 자동 설계합니다
            </p>
          </div>
          <div className="text-[10px] text-muted-foreground space-y-0.5">
            <p>건물: {bW}m × {bD}m · 기준층 {unitsPerFloor}세대</p>
            <p>{zoneType || '제2종일반주거지역'} · {floors}층 · {units}세대</p>
          </div>
          <button
            onClick={generate}
            disabled={loading}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-emerald-600 text-white font-bold text-sm disabled:opacity-50 inline-flex items-center gap-2"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" />AI 평면 생성 중... (약 10~20초)</>
            ) : (
              <><Sparkles className="h-4 w-4" />AI 평면 생성하기</>
            )}
          </button>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      ) : (
        <>
          {/* 도구바 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-bold">AI 생성 평면도</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">Claude Sonnet 4</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setScale(s => Math.max(s - 4, 12))} className="p-1 rounded hover:bg-secondary/50"><ZoomOut className="h-3.5 w-3.5" /></button>
              <button onClick={() => setScale(s => Math.min(s + 4, 36))} className="p-1 rounded hover:bg-secondary/50"><ZoomIn className="h-3.5 w-3.5" /></button>
              <button onClick={() => { setData(null); setError(null) }} className="p-1 rounded hover:bg-secondary/50"><RotateCcw className="h-3.5 w-3.5" /></button>
            </div>
          </div>

          {/* SVG 평면도 */}
          <div className="rounded-xl border border-border bg-card p-2 overflow-x-auto">
            <FloorPlanSVG data={data} scale={scale} />
          </div>

          {/* 면적표 */}
          <AIAreaTable data={data} />

          {/* 범례 */}
          <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground px-1">
            <span className="flex items-center gap-1"><span className="w-3 h-1.5 bg-[#0ea5e9] rounded-sm inline-block" />창문</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#f97316] inline-block" />문</span>
            <span className="flex items-center gap-1"><span className="w-3 h-1 bg-[#ef4444] inline-block" />슬라이딩</span>
            <span className="flex items-center gap-1"><span className="w-3 h-1 bg-[#334155] rounded-sm inline-block" />코어</span>
          </div>

          <p className="text-[9px] text-muted-foreground text-center">
            ※ AI 생성 평면은 참고용이며, 실시설계 시 건축사 검토가 필요합니다
          </p>

          {/* 재생성 */}
          <button
            onClick={generate}
            disabled={loading}
            className="w-full py-2.5 rounded-xl border border-primary/30 text-primary text-xs font-medium flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
            다른 평면으로 재생성
          </button>
        </>
      )}
    </div>
  )
}
