"use client"

import React, { useState, useMemo } from "react"
import { Loader2, Sparkles, RotateCcw, ZoomIn, ZoomOut, Maximize2, X } from "lucide-react"

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 설계 상수 (한국 주거 표준)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const WALL_EXT = 3
const WALL_INT = 1.5

interface RoomT { name: string; rx: number; ry: number; rw: number; rh: number; fill: string; furniture?: string }

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 투룸 템플릿 (전용 59㎡)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function twoRoomTemplate(uw: number, uh: number, mirror: boolean): RoomT[] {
  const livingW = uw * 0.55, kitchenW = uw - livingW
  const topH = uh * 0.52, botH = uh - topH
  const brW = uw * 0.42, br2W = uw * 0.32, bathW = uw - brW - br2W
  const entH = botH * 0.4, hallH = botH - entH

  const rooms: RoomT[] = [
    { name: '거실', rx: 0, ry: 0, rw: livingW, rh: topH, fill: '#f0fdf4', furniture: 'sofa' },
    { name: '주방/식당', rx: livingW, ry: 0, rw: kitchenW, rh: topH, fill: '#fef3c7', furniture: 'kitchen' },
    { name: '안방', rx: 0, ry: topH, rw: brW, rh: botH, fill: '#eff6ff', furniture: 'bed-master' },
    { name: '침실2', rx: brW, ry: topH, rw: br2W, rh: botH, fill: '#f0f9ff', furniture: 'bed-single' },
    { name: '욕실', rx: brW + br2W, ry: topH, rw: bathW, rh: entH, fill: '#e0f2fe', furniture: 'toilet' },
    { name: '현관', rx: brW + br2W, ry: topH + entH, rw: bathW, rh: hallH, fill: '#f1f5f9', furniture: 'shoe' },
  ]
  if (mirror) {
    return rooms.map(r => ({ ...r, rx: uw - r.rx - r.rw }))
  }
  return rooms
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 쓰리룸 템플릿 (전용 84㎡)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function threeRoomTemplate(uw: number, uh: number, mirror: boolean): RoomT[] {
  const livingW = uw * 0.52, kitchenW = uw - livingW
  const topH = uh * 0.42
  const midH = uh * 0.33, botH = uh - topH - midH
  const mrW = uw * 0.38, r2W = uw * 0.32, bathW = uw - mrW - r2W
  const r3W = uw * 0.35, drW = uw * 0.25, b2W = uw * 0.2, hallW = uw - r3W - drW - b2W

  const rooms: RoomT[] = [
    { name: '거실', rx: 0, ry: 0, rw: livingW, rh: topH, fill: '#f0fdf4', furniture: 'sofa' },
    { name: '주방/식당', rx: livingW, ry: 0, rw: kitchenW, rh: topH, fill: '#fef3c7', furniture: 'kitchen' },
    { name: '안방', rx: 0, ry: topH, rw: mrW, rh: midH, fill: '#eff6ff', furniture: 'bed-master' },
    { name: '침실2', rx: mrW, ry: topH, rw: r2W, rh: midH, fill: '#f0f9ff', furniture: 'bed-single' },
    { name: '주욕실', rx: mrW + r2W, ry: topH, rw: bathW, rh: midH, fill: '#e0f2fe', furniture: 'bath' },
    { name: '침실3', rx: 0, ry: topH + midH, rw: r3W, rh: botH, fill: '#f5f3ff', furniture: 'bed-single' },
    { name: '드레스룸', rx: r3W, ry: topH + midH, rw: drW, rh: botH, fill: '#faf5ff', furniture: 'closet' },
    { name: '보조욕실', rx: r3W + drW, ry: topH + midH, rw: b2W, rh: botH, fill: '#e0f2fe', furniture: 'toilet' },
    { name: '현관', rx: r3W + drW + b2W, ry: topH + midH, rw: hallW, rh: botH, fill: '#f1f5f9', furniture: 'shoe' },
  ]
  if (mirror) {
    return rooms.map(r => ({ ...r, rx: uw - r.rx - r.rw }))
  }
  return rooms
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 가구 렌더러
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function Furn({ type, x, y, w, h }: { type: string; x: number; y: number; w: number; h: number }) {
  const cx = x + w / 2, cy = y + h / 2
  switch (type) {
    case 'bed-master':
      return <g opacity="0.45"><rect x={x+w*0.08} y={y+h*0.05} width={w*0.84} height={h*0.85} rx={2} fill="#93c5fd" stroke="#60a5fa" strokeWidth="0.5" />
        <rect x={x+w*0.12} y={y+h*0.08} width={w*0.36} height={h*0.22} rx={1} fill="#bfdbfe" stroke="#60a5fa" strokeWidth="0.3" />
        <rect x={x+w*0.52} y={y+h*0.08} width={w*0.36} height={h*0.22} rx={1} fill="#bfdbfe" stroke="#60a5fa" strokeWidth="0.3" /></g>
    case 'bed-single':
      return <g opacity="0.4"><rect x={x+w*0.15} y={y+h*0.1} width={w*0.7} height={h*0.75} rx={2} fill="#a5b4fc" stroke="#818cf8" strokeWidth="0.5" />
        <rect x={x+w*0.2} y={y+h*0.12} width={w*0.6} height={h*0.2} rx={1} fill="#c7d2fe" stroke="#818cf8" strokeWidth="0.3" /></g>
    case 'sofa':
      return <g opacity="0.35"><rect x={cx-w*0.3} y={cy+h*0.08} width={w*0.6} height={h*0.18} rx={2} fill="#86efac" stroke="#4ade80" strokeWidth="0.5" />
        <rect x={cx-w*0.15} y={cy-h*0.15} width={w*0.3} height={h*0.1} rx={1} fill="none" stroke="#94a3b8" strokeWidth="0.4" />
        <rect x={cx-w*0.2} y={cy-h*0.3} width={w*0.4} height={1.5} fill="#64748b" rx={0.5} /></g>
    case 'kitchen':
      return <g opacity="0.4"><rect x={x+2} y={y+2} width={w-4} height={7} rx={1} fill="#fbbf24" stroke="#f59e0b" strokeWidth="0.5" />
        <rect x={x+w*0.3} y={y+3} width={8} height={4} rx={1} fill="none" stroke="#d97706" strokeWidth="0.4" />
        <circle cx={x+w*0.3+4} cy={y+5} r={1} fill="#d97706" />
        <rect x={cx-8} y={cy+4} width={16} height={10} rx={1.5} fill="none" stroke="#a16207" strokeWidth="0.4" /></g>
    case 'toilet':
      return <g opacity="0.45"><ellipse cx={cx} cy={cy+h*0.1} rx={3.5} ry={4.5} fill="#e0f2fe" stroke="#38bdf8" strokeWidth="0.5" />
        <rect x={cx-2.5} y={cy+h*0.1+4} width={5} height={2.5} rx={1} fill="#bae6fd" stroke="#38bdf8" strokeWidth="0.3" />
        <rect x={x+2} y={y+2} width={9} height={5} rx={2} fill="#e0f2fe" stroke="#38bdf8" strokeWidth="0.5" /></g>
    case 'bath':
      return <g opacity="0.4"><rect x={x+w*0.35} y={y+3} width={w*0.6} height={h*0.4} rx={3} fill="#bae6fd" stroke="#38bdf8" strokeWidth="0.5" />
        <ellipse cx={x+10} cy={y+h*0.6} rx={3.5} ry={4.5} fill="#e0f2fe" stroke="#38bdf8" strokeWidth="0.5" />
        <rect x={x+2} y={y+2} width={10} height={6} rx={2} fill="#e0f2fe" stroke="#38bdf8" strokeWidth="0.5" /></g>
    case 'closet':
      return <g opacity="0.25"><rect x={x+2} y={y+2} width={w-4} height={h-4} rx={1} fill="none" stroke="#a855f7" strokeWidth="0.5" strokeDasharray="2 1" />
        <line x1={x+2} y1={cy} x2={x+w-2} y2={cy} stroke="#a855f7" strokeWidth="0.3" /></g>
    case 'shoe':
      return <g opacity="0.3"><rect x={x+2} y={y+2} width={w-4} height={6} rx={1} fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.3" /></g>
    default: return null
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 코어 렌더러
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function Core({ x, y, w, h, scale }: { x: number; y: number; w: number; h: number; scale: number }) {
  const evW = w * 0.35, stairW = w - evW * 2 - 4
  return <g>
    <rect x={x} y={y} width={w} height={h} fill="#47556920" stroke="#475569" strokeWidth={1.5} rx={1} />
    <rect x={x+2} y={y+2} width={evW} height={h-4} fill="#334155" rx={1} />
    <text x={x+2+evW/2} y={y+h/2+1.5} fontSize="4.5" textAnchor="middle" fill="white" fontWeight="500">EV1</text>
    <rect x={x+evW+3} y={y+2} width={evW} height={h-4} fill="#334155" rx={1} />
    <text x={x+evW+3+evW/2} y={y+h/2+1.5} fontSize="4.5" textAnchor="middle" fill="white" fontWeight="500">EV2</text>
    <rect x={x+evW*2+4} y={y+2} width={stairW} height={h-4} fill="#475569" rx={1} />
    <text x={x+evW*2+4+stairW/2} y={y+h/2+1.5} fontSize="4" textAnchor="middle" fill="white">계단</text>
    {Array.from({length:Math.floor((h-6)/3)},(_,i) => <line key={i} x1={x+evW*2+5} y1={y+3+i*3} x2={x+w-2} y2={y+3+i*3} stroke="#94a3b8" strokeWidth="0.3" />)}
  </g>
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 층 평면도 생성 (템플릿 기반)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface UnitLayout { id: string; type: '투룸'|'쓰리룸'; x: number; y: number; w: number; h: number; rooms: RoomT[]; mirror: boolean }

function generateFloorLayout(unitsPerFloor: number, unitMix: string[]): { bW: number; bD: number; coreX: number; coreW: number; coreH: number; units: UnitLayout[] } {
  const coreW = 30 // px
  const coreH_ratio = 0.6 // 코어는 건물 깊이의 60%
  const unitH = 120 // 세대 깊이 (px)
  
  // 좌우 세대 배분
  const leftCount = Math.ceil(unitsPerFloor / 2)
  const rightCount = unitsPerFloor - leftCount

  // 세대 폭 계산
  const unitW_two = 90 // 투룸 폭
  const unitW_three = 110 // 쓰리룸 폭

  // 유닛 배치 생성
  const units: UnitLayout[] = []
  let leftX = 0
  let rightX = 0

  // 세대 타입 결정
  const types: ('투룸'|'쓰리룸')[] = []
  for (let i = 0; i < unitsPerFloor; i++) {
    if (unitMix.includes('쓰리룸') && (i === 1 || i === 2)) types.push('쓰리룸')
    else types.push('투룸')
  }

  // 좌측 세대
  let lx = 0
  for (let i = 0; i < leftCount; i++) {
    const t = types[i]
    const uw = t === '쓰리룸' ? unitW_three : unitW_two
    units.push({
      id: String.fromCharCode(65 + i), type: t,
      x: lx, y: 0, w: uw, h: unitH,
      rooms: t === '쓰리룸' ? threeRoomTemplate(uw, unitH, false) : twoRoomTemplate(uw, unitH, false),
      mirror: false,
    })
    lx += uw
  }

  const leftTotalW = lx
  const coreX = leftTotalW

  // 우측 세대
  let rx = leftTotalW + coreW
  for (let i = 0; i < rightCount; i++) {
    const t = types[leftCount + i]
    const uw = t === '쓰리룸' ? unitW_three : unitW_two
    units.push({
      id: String.fromCharCode(65 + leftCount + i), type: t,
      x: rx, y: 0, w: uw, h: unitH,
      rooms: t === '쓰리룸' ? threeRoomTemplate(uw, unitH, true) : twoRoomTemplate(uw, unitH, true),
      mirror: true,
    })
    rx += uw
  }

  const bW = rx
  return { bW, bD: unitH, coreX, coreW, coreH: unitH, units }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SVG 렌더러
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function FloorPlanSVG({ layout, scale }: { layout: ReturnType<typeof generateFloorLayout>; scale: number }) {
  const { bW, bD, coreX, coreW, coreH, units } = layout
  const pad = 35

  const unitColors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b']

  return (
    <svg viewBox={`0 0 ${bW + pad*2} ${bD + pad*2 + 16}`} className="w-full h-auto" style={{ minWidth: 300 }}>
      <g transform={`translate(${pad},${pad})`}>
        {/* 건물 외곽 */}
        <rect x={0} y={0} width={bW} height={bD} fill="none" stroke="currentColor" strokeWidth={WALL_EXT} className="text-foreground" />

        {/* 코어 */}
        <Core x={coreX} y={bD * 0.15} w={coreW} h={bD * 0.7} scale={1} />
        {/* 복도 */}
        <rect x={coreX} y={0} width={coreW} height={bD*0.15} fill="#f1f5f910" stroke="#64748b" strokeWidth={0.3} />
        <text x={coreX+coreW/2} y={bD*0.08+1} fontSize="3.5" textAnchor="middle" fill="#64748b">복도</text>
        <rect x={coreX} y={bD*0.85} width={coreW} height={bD*0.15} fill="#f1f5f910" stroke="#64748b" strokeWidth={0.3} />
        <text x={coreX+coreW/2} y={bD*0.92+1} fontSize="3.5" textAnchor="middle" fill="#64748b">복도</text>

        {/* 세대 */}
        {units.map((unit, ui) => {
          const color = unitColors[ui % unitColors.length]
          const area = Math.round(unit.w * unit.h / 20) // 근사 전용면적
          return <g key={unit.id}>
            {/* 세대 외곽 */}
            <rect x={unit.x} y={unit.y} width={unit.w} height={unit.h} fill="none" stroke="currentColor" strokeWidth={2} className="text-foreground" />

            {/* 실 */}
            {unit.rooms.map((room, ri) => {
              const rx = unit.x + room.rx, ry = unit.y + room.ry
              const isBal = room.name.includes('발코니')
              const roomArea = Math.round(room.rw * room.rh / 10) / 10
              return <g key={ri}>
                <rect x={rx} y={ry} width={room.rw} height={room.rh}
                  fill={room.fill} stroke="currentColor" strokeWidth={isBal ? 0.5 : WALL_INT}
                  className="text-foreground" strokeDasharray={isBal ? '3 1.5' : undefined} />
                <text x={rx+room.rw/2} y={ry+room.rh/2 - (room.furniture ? 3 : 0)} fontSize={room.rw > 30 ? 5.5 : 4} textAnchor="middle" fill="#374151" fontWeight="600">{room.name}</text>
                <text x={rx+room.rw/2} y={ry+room.rh/2 + (room.furniture ? 1 : 5)} fontSize={room.rw > 30 ? 3.5 : 2.5} textAnchor="middle" fill="#9ca3af">{roomArea}㎡</text>
                {room.furniture && <Furn type={room.furniture} x={rx} y={ry} w={room.rw} h={room.rh} />}
              </g>
            })}

            {/* 세대 라벨 */}
            <text x={unit.x + unit.w / 2} y={unit.y + unit.h + 10} fontSize="5" textAnchor="middle" fill={color} fontWeight="700">
              {unit.id}호 ({unit.type} · {area}㎡)
            </text>
          </g>
        })}

        {/* 치수선 */}
        <line x1={0} y1={-14} x2={bW} y2={-14} stroke="#94a3b8" strokeWidth="0.5" />
        <line x1={0} y1={-16} x2={0} y2={-12} stroke="#94a3b8" strokeWidth="0.5" />
        <line x1={bW} y1={-16} x2={bW} y2={-12} stroke="#94a3b8" strokeWidth="0.5" />
        <text x={bW/2} y={-18} fontSize="4.5" textAnchor="middle" fill="#64748b">{(bW*0.1).toFixed(0)}m</text>

        <line x1={-14} y1={0} x2={-14} y2={bD} stroke="#94a3b8" strokeWidth="0.5" />
        <line x1={-16} y1={0} x2={-12} y2={0} stroke="#94a3b8" strokeWidth="0.5" />
        <line x1={-16} y1={bD} x2={-12} y2={bD} stroke="#94a3b8" strokeWidth="0.5" />
        <text x={-20} y={bD/2} fontSize="4.5" textAnchor="middle" fill="#64748b" transform={`rotate(-90,-20,${bD/2})`}>{(bD*0.1).toFixed(0)}m</text>

        {/* 방위 */}
        <g transform={`translate(${bW+16},8)`}>
          <line x1={0} y1={10} x2={0} y2={-2} stroke="currentColor" strokeWidth={1} className="text-foreground" />
          <polygon points="0,-4 -2.5,1.5 2.5,1.5" fill="currentColor" className="text-foreground" />
          <text x={0} y={-6} fontSize="5" textAnchor="middle" fill="currentColor" fontWeight="700" className="text-foreground">N</text>
        </g>
      </g>
    </svg>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 면적표
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function AreaTable({ units }: { units: UnitLayout[] }) {
  const total = units.reduce((s, u) => s + Math.round(u.w * u.h / 20), 0)
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
          {units.map(u => (
            <tr key={u.id} className="border-t border-border/30">
              <td className="px-2 py-0.5 font-semibold">{u.id}호</td>
              <td className="px-2 py-0.5">{u.type}</td>
              <td className="px-2 py-0.5 text-right font-mono">{Math.round(u.w * u.h / 20)}㎡</td>
              <td className="px-2 py-0.5 text-right">{u.rooms.length}실</td>
            </tr>
          ))}
          <tr className="border-t border-border bg-emerald-500/10 font-bold">
            <td className="px-2 py-1" colSpan={2}>합계 ({units.length}세대)</td>
            <td className="px-2 py-1 text-right font-mono">{total}㎡</td>
            <td className="px-2 py-1 text-right">-</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 메인 컴포넌트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface AIFloorPlanProps {
  siteArea: number; buildingCoverage: number; floors: number; units: number
  type?: string; layoutName?: string; address?: string; zoneType?: string
  heightLimit?: number; setbacks?: { front?: number; side?: number; rear?: number }
}

export function AIFloorPlan(props: AIFloorPlanProps) {
  const { siteArea, buildingCoverage, floors, units, type, layoutName, address, zoneType } = props
  const [fullscreen, setFullscreen] = useState(false)
  const [mixIndex, setMixIndex] = useState(0)

  const ZONE_NAMES: Record<string, string> = {
    'residential-1': '제1종일반주거지역', 'residential-2': '제2종일반주거지역',
    'residential-3': '제3종일반주거지역', 'semi-residential': '준주거지역',
    'commercial-neighborhood': '근린상업지역', 'commercial-general': '일반상업지역',
  }
  const zoneName = (zoneType && ZONE_NAMES[zoneType]) || zoneType || '제2종일반주거지역'

  const rawUnitsPerFloor = Math.max(Math.ceil(units / Math.max(floors - 1, 1)), 2)
  const unitsPerFloor = Math.min(rawUnitsPerFloor, 4)

  // 세대 믹스 옵션
  const mixOptions = [
    ['투룸', '쓰리룸'],
    ['쓰리룸', '쓰리룸'],
    ['투룸', '투룸'],
  ]

  const layout = useMemo(() => 
    generateFloorLayout(unitsPerFloor, mixOptions[mixIndex]),
    [unitsPerFloor, mixIndex]
  )

  return (
    <div className="space-y-4">
      {/* 전체화면 */}
      {fullscreen && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold">AI 평면도</span>
            </div>
            <button onClick={() => setFullscreen(false)} className="p-2 rounded-lg hover:bg-secondary/50"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
            <FloorPlanSVG layout={layout} scale={1} />
          </div>
        </div>
      )}

      {/* 세대 믹스 선택 */}
      <div className="flex gap-1.5">
        {mixOptions.map((mix, i) => (
          <button key={i} onClick={() => setMixIndex(i)}
            className={`flex-1 py-2 px-2 rounded-lg text-[11px] font-medium ${
              mixIndex === i ? 'bg-primary text-primary-foreground' : 'bg-secondary/30 text-muted-foreground hover:bg-secondary/50'
            }`}>
            {mix[0] === mix[1] ? `${mix[0]} 중심` : `${mix[0]}+${mix[1]} 믹스`}
          </button>
        ))}
      </div>

      {/* 도구바 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-bold">AI 평면도</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">기준층 {unitsPerFloor}세대</span>
        </div>
        <button onClick={() => setFullscreen(true)} className="p-1 rounded hover:bg-secondary/50"><Maximize2 className="h-3.5 w-3.5" /></button>
      </div>

      {/* SVG */}
      <div className="rounded-xl border border-border bg-card p-2 overflow-x-auto cursor-pointer" onClick={() => setFullscreen(true)}>
        <FloorPlanSVG layout={layout} scale={1} />
        <p className="text-[9px] text-center text-muted-foreground/50 mt-1">탭하여 전체화면</p>
      </div>

      {/* 면적표 */}
      <AreaTable units={layout.units} />

      {/* 범례 */}
      <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground px-1">
        <span className="flex items-center gap-1"><span className="w-3 h-1.5 bg-[#0ea5e9] rounded-sm inline-block" />창문</span>
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#f97316] inline-block" />문</span>
        <span className="flex items-center gap-1"><span className="w-3 h-1 bg-[#334155] rounded-sm inline-block" />코어</span>
      </div>

      <p className="text-[9px] text-muted-foreground text-center">
        {zoneName} · {floors}층 · {units}세대 기준 · 실시설계 시 건축사 검토 필요
      </p>
    </div>
  )
}
