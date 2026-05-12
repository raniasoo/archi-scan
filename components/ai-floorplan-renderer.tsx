"use client"

import React, { useState, useMemo } from "react"
import { Sparkles, Maximize2, X, ArrowLeft, ChevronDown } from "lucide-react"
import { getCatalog, getTypes, getSizeSpec, getVariants, applyPatternModifiers, type RoomDef } from "@/lib/floorplan-templates"

const WALL_EXT = 3, WALL_INT = 1.5

// ━━━━━ 가구 렌더러 ━━━━━
function Furn({ type, x, y, w, h }: { type:string; x:number; y:number; w:number; h:number }) {
  const cx=x+w/2, cy=y+h/2
  switch(type) {
    case 'bed-master': return <g opacity=".45"><rect x={x+w*.08} y={y+h*.05} width={w*.84} height={h*.85} rx={2} fill="#93c5fd" stroke="#60a5fa" strokeWidth=".5"/><rect x={x+w*.12} y={y+h*.08} width={w*.36} height={h*.22} rx={1} fill="#bfdbfe" stroke="#60a5fa" strokeWidth=".3"/><rect x={x+w*.52} y={y+h*.08} width={w*.36} height={h*.22} rx={1} fill="#bfdbfe" stroke="#60a5fa" strokeWidth=".3"/></g>
    case 'bed-single': return <g opacity=".4"><rect x={x+w*.15} y={y+h*.1} width={w*.7} height={h*.75} rx={2} fill="#a5b4fc" stroke="#818cf8" strokeWidth=".5"/><rect x={x+w*.2} y={y+h*.12} width={w*.6} height={h*.2} rx={1} fill="#c7d2fe" stroke="#818cf8" strokeWidth=".3"/></g>
    case 'sofa': return <g opacity=".35"><rect x={cx-w*.3} y={cy+h*.08} width={w*.6} height={h*.18} rx={2} fill="#86efac" stroke="#4ade80" strokeWidth=".5"/><rect x={cx-w*.15} y={cy-h*.12} width={w*.3} height={h*.1} rx={1} fill="none" stroke="#94a3b8" strokeWidth=".4"/><rect x={cx-w*.2} y={cy-h*.28} width={w*.4} height={1.5} fill="#64748b" rx={.5}/></g>
    case 'kitchen': return <g opacity=".4"><rect x={x+2} y={y+2} width={w-4} height={7} rx={1} fill="#fbbf24" stroke="#f59e0b" strokeWidth=".5"/><rect x={x+w*.3} y={y+3} width={8} height={4} rx={1} fill="none" stroke="#d97706" strokeWidth=".4"/><circle cx={x+w*.3+4} cy={y+5} r={1} fill="#d97706"/><rect x={cx-8} y={cy+4} width={16} height={10} rx={1.5} fill="none" stroke="#a16207" strokeWidth=".4"/></g>
    case 'toilet': return <g opacity=".45"><ellipse cx={cx} cy={cy+h*.1} rx={3.5} ry={4.5} fill="#e0f2fe" stroke="#38bdf8" strokeWidth=".5"/><rect x={cx-2.5} y={cy+h*.1+4} width={5} height={2.5} rx={1} fill="#bae6fd" stroke="#38bdf8" strokeWidth=".3"/><rect x={x+2} y={y+2} width={9} height={5} rx={2} fill="#e0f2fe" stroke="#38bdf8" strokeWidth=".5"/></g>
    case 'bath': return <g opacity=".4"><rect x={x+w*.35} y={y+3} width={w*.6} height={h*.4} rx={3} fill="#bae6fd" stroke="#38bdf8" strokeWidth=".5"/><ellipse cx={x+10} cy={y+h*.6} rx={3.5} ry={4.5} fill="#e0f2fe" stroke="#38bdf8" strokeWidth=".5"/><rect x={x+2} y={y+2} width={10} height={6} rx={2} fill="#e0f2fe" stroke="#38bdf8" strokeWidth=".5"/></g>
    case 'closet': return <g opacity=".25"><rect x={x+2} y={y+2} width={w-4} height={h-4} rx={1} fill="none" stroke="#a855f7" strokeWidth=".5" strokeDasharray="2 1"/></g>
    case 'shoe': return <g opacity=".3"><rect x={x+2} y={y+2} width={w-4} height={6} rx={1} fill="#e2e8f0" stroke="#94a3b8" strokeWidth=".3"/></g>
    case 'desk': return <g opacity=".3"><rect x={x+w*.1} y={y+h*.15} width={w*.8} height={h*.35} rx={1} fill="none" stroke="#64748b" strokeWidth=".5"/></g>
    default: return null
  }
}

// ━━━━━ 코어 ━━━━━
function Core({ x, y, w, h }: { x:number;y:number;w:number;h:number }) {
  const evW = w*.35
  return <g>
    <rect x={x} y={y} width={w} height={h} fill="#47556920" stroke="#475569" strokeWidth={1.5} rx={1}/>
    <rect x={x+2} y={y+2} width={evW} height={h-4} fill="#334155" rx={1}/>
    <text x={x+2+evW/2} y={y+h/2+1.5} fontSize="4.5" textAnchor="middle" fill="white" fontWeight="500">EV1</text>
    <rect x={x+evW+3} y={y+2} width={evW} height={h-4} fill="#334155" rx={1}/>
    <text x={x+evW+3+evW/2} y={y+h/2+1.5} fontSize="4.5" textAnchor="middle" fill="white" fontWeight="500">EV2</text>
    <rect x={x+evW*2+4} y={y+2} width={w-evW*2-6} height={h-4} fill="#475569" rx={1}/>
    <text x={x+evW*2+4+(w-evW*2-6)/2} y={y+h/2+1.5} fontSize="4" textAnchor="middle" fill="white">계단</text>
  </g>
}

// ━━━━━ 타입 ━━━━━
interface UnitLayout { id: string; type: string; size: 'S'|'M'|'L'; variant: string; x: number; y: number; w: number; h: number; rooms: RoomDef[] }

function buildFloor(unitConfigs: {type:string; size:'S'|'M'|'L'; variant:string}[], buildingType?: string): { bW:number; bD:number; coreX:number; coreW:number; units: UnitLayout[]; isLShape?: boolean } {
  const coreW = 30
  
  // ㄱ자형: L자 배치
  if (buildingType === 'lshape') {
    const wing1Count = Math.ceil(unitConfigs.length * 0.4) // 동향 날개 (세로)
    const wing2Count = unitConfigs.length - wing1Count      // 남향 날개 (가로)
    const units: UnitLayout[] = []
    
    // Wing 1 (세로 날개) — 유닛을 세로로 배치
    let wy = 0
    for (let i = 0; i < wing1Count; i++) {
      const { type, size, variant } = unitConfigs[i]
      const spec = getSizeSpec(type, size)
      const tpls = getVariants(type, size)
      const tpl = tpls.find(t => t.variant === variant) || tpls[0]
      units.push({ id: String.fromCharCode(65+i), type, size, variant, x: 0, y: wy, w: spec.h, h: spec.w, rooms: tpl.generate(spec.h, spec.w, false) })
      wy += spec.w
    }
    const wing1W = units[0]?.w || 60
    const wing1H = wy
    
    // Core at junction
    const coreY = wing1H
    
    // Wing 2 (가로 날개) — 코어 뒤에 가로로 배치
    let wx = 0
    for (let i = wing1Count; i < unitConfigs.length; i++) {
      const { type, size, variant } = unitConfigs[i]
      const spec = getSizeSpec(type, size)
      const tpls = getVariants(type, size)
      const tpl = tpls.find(t => t.variant === variant) || tpls[0]
      units.push({ id: String.fromCharCode(65+i), type, size, variant, x: wx, y: coreY + coreW, w: spec.w, h: spec.h, rooms: tpl.generate(spec.w, spec.h, false) })
      wx += spec.w
    }
    const wing2H = units[wing1Count]?.h || 60
    
    const totalW = Math.max(wing1W, wx)
    const totalH = wing1H + coreW + wing2H
    return { bW: totalW, bD: totalH, coreX: 0, coreW, units, isLShape: true }
  }
  
  // 기본: 일자 배치 (기존 로직)
  const leftCount = Math.ceil(unitConfigs.length / 2)
  const units: UnitLayout[] = []
  let lx = 0
  for (let i = 0; i < leftCount; i++) {
    const { type, size, variant } = unitConfigs[i]
    const spec = getSizeSpec(type, size)
    const tpls = getVariants(type, size)
    const tpl = tpls.find(t => t.variant === variant) || tpls[0]
    units.push({ id: String.fromCharCode(65+i), type, size, variant, x: lx, y: 0, w: spec.w, h: spec.h, rooms: tpl.generate(spec.w, spec.h, false) })
    lx += spec.w
  }
  const maxH = Math.max(...units.map(u => u.h))
  units.forEach(u => { if (u.h < maxH) { u.rooms = getVariants(u.type, u.size).find(t=>t.variant===u.variant)?.generate(u.w, maxH, false) || u.rooms; u.h = maxH } })
  let rx = lx + coreW
  for (let i = leftCount; i < unitConfigs.length; i++) {
    const { type, size, variant } = unitConfigs[i]
    const spec = getSizeSpec(type, size)
    const tpls = getVariants(type, size)
    const tpl = tpls.find(t => t.variant === variant) || tpls[0]
    units.push({ id: String.fromCharCode(65+i), type, size, variant, x: rx, y: 0, w: spec.w, h: maxH, rooms: tpl.generate(spec.w, maxH, true) })
    rx += spec.w
  }
  return { bW: rx, bD: maxH, coreX: lx, coreW, units }
}

// ━━━━━ 실 렌더러 (공용) ━━━━━
function RoomsSVG({ rooms, ox, oy }: { rooms: RoomDef[]; ox: number; oy: number }) {
  return <>{rooms.map((room, i) => {
    const rx = ox + room.rx, ry = oy + room.ry, a = Math.round(room.rw * room.rh / 10) / 10
    return <g key={i}>
      <rect x={rx} y={ry} width={room.rw} height={room.rh} fill={room.fill} stroke="currentColor" strokeWidth={WALL_INT} className="text-foreground"/>
      <text x={rx+room.rw/2} y={ry+room.rh/2-(room.furniture?3:0)} fontSize={room.rw>30?5.5:4} textAnchor="middle" fill="#374151" fontWeight="600">{room.name}</text>
      <text x={rx+room.rw/2} y={ry+room.rh/2+(room.furniture?1:5)} fontSize={room.rw>30?3.5:2.5} textAnchor="middle" fill="#9ca3af">{a}㎡</text>
      {room.furniture && <Furn type={room.furniture} x={rx} y={ry} w={room.rw} h={room.rh}/>}
    </g>
  })}</>
}

// ━━━━━ 기준층 전체 뷰 ━━━━━
function FloorView({ layout, onUnitClick }: { layout: ReturnType<typeof buildFloor>; onUnitClick: (u: UnitLayout) => void }) {
  const { bW, bD, coreX, coreW, units, isLShape } = layout
  const pad = 35, colors = ['#10b981','#3b82f6','#8b5cf6','#f59e0b']
  return (
    <svg viewBox={`0 0 ${bW+pad*2} ${bD+pad*2+16}`} className="w-full h-auto" style={{minWidth:300}}>
      <g transform={`translate(${pad},${pad})`}>
        {isLShape ? (
          <>
            {/* ㄱ자형 외곽선 — L형 경로 */}
            <path d={`M 0 0 L ${units[0]?.w || bW*0.4} 0 L ${units[0]?.w || bW*0.4} ${coreX || bD*0.5} L ${bW} ${coreX || bD*0.5} L ${bW} ${bD} L 0 ${bD} Z`}
              fill="none" stroke="currentColor" strokeWidth={WALL_EXT} className="text-foreground"/>
            {/* 코어 (ㄱ 꺾이는 지점) */}
            <Core x={0} y={coreX || bD*0.4} w={units[0]?.w || 30} h={coreW}/>
            <text x={(units[0]?.w || 30)/2} y={(coreX || bD*0.4) + coreW/2 + 2} fontSize="4" textAnchor="middle" fill="#64748b">코어</text>
          </>
        ) : (
          <>
            <rect x={0} y={0} width={bW} height={bD} fill="none" stroke="currentColor" strokeWidth={WALL_EXT} className="text-foreground"/>
            <Core x={coreX} y={bD*.15} w={coreW} h={bD*.7}/>
            <rect x={coreX} y={0} width={coreW} height={bD*.15} fill="#f1f5f910" stroke="#64748b" strokeWidth={.3}/>
            <text x={coreX+coreW/2} y={bD*.08+1} fontSize="3.5" textAnchor="middle" fill="#64748b">복도</text>
            <rect x={coreX} y={bD*.85} width={coreW} height={bD*.15} fill="#f1f5f910" stroke="#64748b" strokeWidth={.3}/>
            <text x={coreX+coreW/2} y={bD*.92+1} fontSize="3.5" textAnchor="middle" fill="#64748b">복도</text>
          </>
        )}
        {units.map((unit, ui) => {
          const color = colors[ui % colors.length]
          return <g key={unit.id} className="cursor-pointer" onClick={() => onUnitClick(unit)}>
            <rect x={unit.x} y={unit.y} width={unit.w} height={unit.h} fill="none" stroke="currentColor" strokeWidth={2} className="text-foreground"/>
            <RoomsSVG rooms={unit.rooms} ox={unit.x} oy={unit.y} />
            {/* 클릭 힌트 오버레이 */}
            <rect x={unit.x} y={unit.y} width={unit.w} height={unit.h} fill="transparent" stroke="none" className="hover:fill-primary/5"/>
            <text x={unit.x+unit.w/2} y={unit.y+unit.h+10} fontSize="5" textAnchor="middle" fill={color} fontWeight="700">
              {unit.id}호 ({unit.type} · {getSizeSpec(unit.type, unit.size).area}㎡) ▸
            </text>
          </g>
        })}
        <line x1={0} y1={-14} x2={bW} y2={-14} stroke="#94a3b8" strokeWidth=".5"/>
        <text x={bW/2} y={-18} fontSize="4.5" textAnchor="middle" fill="#64748b">{(bW*.1).toFixed(0)}m</text>
        <g transform={`translate(${bW+16},8)`}><line x1={0} y1={10} x2={0} y2={-2} stroke="currentColor" strokeWidth={1} className="text-foreground"/><polygon points="0,-4 -2.5,1.5 2.5,1.5" fill="currentColor" className="text-foreground"/><text x={0} y={-6} fontSize="5" textAnchor="middle" fill="currentColor" fontWeight="700" className="text-foreground">N</text></g>
      </g>
    </svg>
  )
}

// ━━━━━ 세대 상세 뷰 ━━━━━
function UnitDetailView({ unit, onBack }: { unit: UnitLayout; onBack: () => void }) {
  const spec = getSizeSpec(unit.type, unit.size)
  const pad = 30
  return (
    <div className="space-y-3">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-primary font-medium">
        <ArrowLeft className="h-3.5 w-3.5"/>기준층 전체로 돌아가기
      </button>
      <div className="rounded-xl border border-border bg-card p-3 overflow-x-auto">
        <svg viewBox={`0 0 ${unit.w+pad*2} ${unit.h+pad*2+16}`} className="w-full h-auto" style={{minWidth:280}}>
          <g transform={`translate(${pad},${pad})`}>
            <rect x={0} y={0} width={unit.w} height={unit.h} fill="none" stroke="currentColor" strokeWidth={WALL_EXT} className="text-foreground"/>
            <RoomsSVG rooms={unit.rooms} ox={0} oy={0}/>
            {/* 치수선 */}
            <line x1={0} y1={-12} x2={unit.w} y2={-12} stroke="#94a3b8" strokeWidth=".5"/>
            <line x1={0} y1={-14} x2={0} y2={-10} stroke="#94a3b8" strokeWidth=".5"/>
            <line x1={unit.w} y1={-14} x2={unit.w} y2={-10} stroke="#94a3b8" strokeWidth=".5"/>
            <text x={unit.w/2} y={-16} fontSize="4.5" textAnchor="middle" fill="#64748b">{(unit.w*.05).toFixed(1)}m</text>
            <line x1={-12} y1={0} x2={-12} y2={unit.h} stroke="#94a3b8" strokeWidth=".5"/>
            <line x1={-14} y1={0} x2={-12} y2={0} stroke="#94a3b8" strokeWidth=".5"/>
            <line x1={-14} y1={unit.h} x2={-12} y2={unit.h} stroke="#94a3b8" strokeWidth=".5"/>
            <text x={-16} y={unit.h/2} fontSize="4.5" textAnchor="middle" fill="#64748b" transform={`rotate(-90,-16,${unit.h/2})`}>{(unit.h*.05).toFixed(1)}m</text>
            <text x={unit.w/2} y={unit.h+14} fontSize="6" textAnchor="middle" fill="currentColor" fontWeight="700" className="text-foreground">
              {unit.id}호 · {unit.type} {unit.variant}타입 (전용 {spec.area}㎡)
            </text>
          </g>
        </svg>
      </div>
      {/* 면적표 */}
      <div className="text-[11px] border border-border rounded-lg overflow-hidden">
        <div className="bg-primary/10 px-3 py-1.5 font-bold text-xs">{unit.id}호 {unit.type} 면적표</div>
        <table className="w-full">
          <thead><tr className="bg-secondary/50 text-[10px]"><th className="px-2 py-1 text-left">실명</th><th className="px-2 py-1 text-right">면적(㎡)</th></tr></thead>
          <tbody>
            {unit.rooms.map((r,i) => <tr key={i} className="border-t border-border/30"><td className="px-2 py-0.5">{r.name}</td><td className="px-2 py-0.5 text-right font-mono">{(Math.round(r.rw*r.rh/10*10)/10).toFixed(1)}</td></tr>)}
            <tr className="border-t border-border bg-emerald-500/10 font-bold"><td className="px-2 py-1">합계</td><td className="px-2 py-1 text-right font-mono">{(Math.round(unit.rooms.reduce((s,r)=>s+r.rw*r.rh/10,0)*10)/10).toFixed(1)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ━━━━━ 메인 컴포넌트 (통합) ━━━━━
export interface AIFloorPlanProps {
  siteArea: number; buildingCoverage: number; floors: number; units: number
  type?: string; layoutName?: string; address?: string; zoneType?: string
  heightLimit?: number; setbacks?: { front?: number; side?: number; rear?: number }
  buildingUse?: 'house' | 'villa' | 'apartment' | 'commercial'
  buildingCount?: number  // 클러스터 동수
  selectedPatterns?: string[]
}

export function AIFloorPlan(props: AIFloorPlanProps) {
  const { siteArea, buildingCoverage, floors, units, zoneType, buildingUse, buildingCount, selectedPatterns } = props
  const [fullscreen, setFullscreen] = useState(false)
  const [variantIdx, setVariantIdx] = useState(0)
  const [selectedUnit, setSelectedUnit] = useState<UnitLayout | null>(null)

  const ZONE_NAMES: Record<string,string> = {
    'residential-1':'제1종일반주거지역','residential-2':'제2종일반주거지역','residential-3':'제3종일반주거지역',
    'semi-residential':'준주거지역','commercial-neighborhood':'근린상업지역','commercial-general':'일반상업지역',
  }
  const zoneName = (zoneType && ZONE_NAMES[zoneType]) || zoneType || '제2종일반주거지역'
  // 클러스터: 동당 세대수로 계산 (전체 세대수 ÷ 동수)
  const bc = buildingCount && buildingCount > 1 ? buildingCount : 1
  const unitsPerBuilding = Math.ceil(units / bc)
  // 층당 세대수 — buildingUse에 따라 1층 비주거 고려
  const residentialFloors = (buildingUse === 'villa' || buildingUse === 'apartment') && floors > 1
    ? Math.max(floors - 1, 1) // 1층 = 로비/주차 (비주거)
    : Math.max(floors, 1)     // house/commercial = 전 층 사용
  const unitsPerFloor = Math.min(Math.max(Math.ceil(unitsPerBuilding / residentialFloors), 2), 8)
  const catalog = getCatalog()

  // ━━━ 세대당 면적 자동 계산 (동당 면적 기준) ━━━
  const coreArea = 15
  const footprint = (siteArea * ((buildingCoverage || 50) / 100)) / bc
  const areaPerUnit = Math.round((footprint - coreArea) / Math.max(unitsPerFloor, 1))

  function bestType(area: number): { type: string; size: 'S'|'M'|'L' } {
    if (area >= 130) return { type: '포룸', size: 'L' }
    if (area >= 115) return { type: '포룸', size: 'M' }
    if (area >= 100) return { type: '쓰리룸+', size: 'L' }
    if (area >= 84)  return { type: '쓰리룸+', size: 'M' }
    if (area >= 72)  return { type: '쓰리룸', size: 'L' }
    if (area >= 59)  return { type: '쓰리룸', size: 'M' }
    if (area >= 52)  return { type: '투룸+', size: 'L' }
    if (area >= 46)  return { type: '투룸+', size: 'M' }
    if (area >= 42)  return { type: '투룸', size: 'L' }
    if (area >= 33)  return { type: '투룸', size: 'M' }
    if (area >= 28)  return { type: '1.5룸', size: 'L' }
    if (area >= 24)  return { type: '1.5룸', size: 'M' }
    if (area >= 20)  return { type: '원룸', size: 'L' }
    return { type: '원룸', size: 'M' }
  }

  const auto = bestType(areaPerUnit)
  const autoSpec = getSizeSpec(auto.type, auto.size)
  const autoLabel = `✨ 자동 (${auto.type} ${autoSpec.area}㎡)`
  const autoPreset = Array.from({length: unitsPerFloor}, (_, i) => ({
    type: auto.type, size: auto.size, variant: 'ABCD'[i % 4],
  }))

  // 자동 + 수동 프리셋
  const mixPresets: Record<string, {type:string;size:'S'|'M'|'L';variant:string}[]> = {
    [autoLabel]: autoPreset,
    ...(buildingUse === 'house' ? {
      '쓰리룸+': Array.from({length:Math.min(unitsPerFloor,2)},(_,i)=>({type:'쓰리룸+',size:'M' as const,variant:'ABCD'[i%4]})),
      '포룸': Array.from({length:Math.min(unitsPerFloor,2)},(_,i)=>({type:'포룸',size:'M' as const,variant:'ABCD'[i%4]})),
    } : buildingUse === 'commercial' ? {
      '원룸+투룸': [{type:'원룸',size:'M' as const,variant:'A'},{type:'투룸',size:'S' as const,variant:'A'},{type:'원룸',size:'M' as const,variant:'B'},{type:'투룸',size:'S' as const,variant:'B'}].slice(0,unitsPerFloor),
      '원룸 중심': Array.from({length:unitsPerFloor},(_,i)=>({type:'원룸',size:'M' as const,variant:'ABCD'[i%4]})),
    } : {
      '투룸+쓰리룸': Array.from({length:unitsPerFloor},(_,i)=>({type:i%2===0?'투룸':'쓰리룸',size:'M' as 'M',variant:'ABCD'[i%4]})),
      '쓰리룸 중심': Array.from({length:unitsPerFloor},(_,i)=>({type:'쓰리룸',size:'M' as const,variant:'ABCD'[i%4]})),
      '투룸 중심': Array.from({length:unitsPerFloor},(_,i)=>({type:'투룸',size:'M' as const,variant:'ABCD'[i%4]})),
    }),
  }

  const [selectedMix, setSelectedMix] = useState(autoLabel)

  const firstKey = Object.keys(mixPresets)[0] || autoLabel
  const currentMix = (mixPresets[selectedMix] || mixPresets[firstKey] || autoPreset).map((m,i) => ({...m, variant: 'ABCD'[(i+variantIdx)%4]}))
  const layout = useMemo(() => {
    const base = buildFloor(currentMix, props.type)
    // 패턴 선택이 있으면 각 세대의 실 배치에 반영
    if (selectedPatterns?.length) {
      base.units = base.units.map(u => ({
        ...u,
        rooms: applyPatternModifiers(u.rooms, selectedPatterns),
      }))
    }
    return base
  }, [selectedMix, variantIdx, unitsPerFloor, areaPerUnit, selectedPatterns])

  return (
    <div className="space-y-3">
      {/* 전체화면 */}
      {fullscreen && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-bold">{selectedUnit ? `${selectedUnit.id}호 상세` : `기준층 · ${selectedMix}`}</span>
            <button onClick={()=>{setFullscreen(false);setSelectedUnit(null)}} className="p-2 rounded-lg hover:bg-secondary/50"><X className="h-4 w-4"/></button>
          </div>
          <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
            {selectedUnit 
              ? <UnitDetailView unit={selectedUnit} onBack={() => setSelectedUnit(null)}/>
              : <FloorView layout={layout} onUnitClick={u => setSelectedUnit(u)}/>
            }
          </div>
        </div>
      )}

      {/* 세대 상세 뷰 */}
      {selectedUnit && !fullscreen ? (
        <UnitDetailView unit={selectedUnit} onBack={() => setSelectedUnit(null)}/>
      ) : !selectedUnit ? (
        <>
          {/* 세대 믹스 */}
          <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1">
            {Object.keys(mixPresets).map(k => (
              <button key={k} onClick={()=>{setSelectedMix(k);setVariantIdx(0);setSelectedUnit(null)}}
                className={`shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-medium ${selectedMix===k?'bg-primary text-primary-foreground':'bg-secondary/30 text-muted-foreground'}`}>
                {k}
              </button>
            ))}
          </div>

          {/* 헤더 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary"/>
              <span className="text-xs font-bold">{bc > 1 ? '동A ' : ''}기준층 평면도</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{catalog.length}종</span>
            </div>
            <div className="flex gap-1">
              {['A','B','C','D'].map((v,i) => (
                <button key={v} onClick={()=>setVariantIdx(i)}
                  className={`w-6 h-6 rounded text-[10px] font-bold ${variantIdx===i?'bg-primary text-primary-foreground':'bg-secondary/30 text-muted-foreground'}`}>{v}</button>
              ))}
              <button onClick={()=>setFullscreen(true)} className="p-1 rounded hover:bg-secondary/50 ml-1"><Maximize2 className="h-3.5 w-3.5"/></button>
            </div>
          </div>

          {/* 기준층 SVG */}
          <div className="rounded-xl border border-border bg-card p-2 overflow-x-auto">
            <FloorView layout={layout} onUnitClick={u => setSelectedUnit(u)}/>
            <p className="text-[9px] text-center text-muted-foreground/50 mt-1">세대를 탭하여 상세 보기</p>
          </div>

          {/* 간략 면적표 */}
          <div className="text-[11px] border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead><tr className="bg-secondary/50 text-[10px]"><th className="px-2 py-1 text-left">세대</th><th className="px-2 py-1 text-left">타입</th><th className="px-2 py-1 text-right">면적</th><th className="px-2 py-1 text-right">실</th></tr></thead>
              <tbody>
                {layout.units.map(u => <tr key={u.id} className="border-t border-border/30 cursor-pointer hover:bg-secondary/20" onClick={()=>setSelectedUnit(u)}><td className="px-2 py-0.5 font-semibold text-primary">{u.id}호 ▸</td><td className="px-2 py-0.5">{u.type}</td><td className="px-2 py-0.5 text-right font-mono">{getSizeSpec(u.type,u.size).area}㎡</td><td className="px-2 py-0.5 text-right">{u.rooms.length}</td></tr>)}
                <tr className="border-t border-border bg-emerald-500/10 font-bold"><td className="px-2 py-1" colSpan={2}>합계 ({layout.units.length}세대)</td><td className="px-2 py-1 text-right font-mono">{layout.units.reduce((s,u)=>s+getSizeSpec(u.type,u.size).area,0)}㎡</td><td></td></tr>
              </tbody>
            </table>
          </div>

          <p className="text-[9px] text-muted-foreground text-center">{zoneName} · {floors}층 · {units}세대 · 세대 탭 → 상세 · 실시설계 시 건축사 검토 필요</p>
        </>
      ) : null}
    </div>
  )
}

// 상세 평면도도 동일 컴포넌트로 export (호환성)
export { AIFloorPlan as DetailedFloorPlan }
