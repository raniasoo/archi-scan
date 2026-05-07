"use client"

import React, { useState, useMemo } from "react"
import { Sparkles, Maximize2, X } from "lucide-react"
import { getCatalog, getTypes, getSizeSpec, getVariants, type RoomDef } from "@/lib/floorplan-templates"

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const WALL_EXT = 3, WALL_INT = 1.5

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function Furn({ type, x, y, w, h }: { type: string; x: number; y: number; w: number; h: number }) {
  const cx = x+w/2, cy = y+h/2
  switch(type) {
    case 'bed-master': return <g opacity="0.4"><rect x={x+w*.08} y={y+h*.05} width={w*.84} height={h*.85} rx={2} fill="#93c5fd" stroke="#60a5fa" strokeWidth=".5"/><rect x={x+w*.12} y={y+h*.08} width={w*.36} height={h*.22} rx={1} fill="#bfdbfe" stroke="#60a5fa" strokeWidth=".3"/><rect x={x+w*.52} y={y+h*.08} width={w*.36} height={h*.22} rx={1} fill="#bfdbfe" stroke="#60a5fa" strokeWidth=".3"/></g>
    case 'bed-single': return <g opacity="0.4"><rect x={x+w*.15} y={y+h*.1} width={w*.7} height={h*.75} rx={2} fill="#a5b4fc" stroke="#818cf8" strokeWidth=".5"/><rect x={x+w*.2} y={y+h*.12} width={w*.6} height={h*.2} rx={1} fill="#c7d2fe" stroke="#818cf8" strokeWidth=".3"/></g>
    case 'sofa': return <g opacity="0.35"><rect x={cx-w*.3} y={cy+h*.08} width={w*.6} height={h*.18} rx={2} fill="#86efac" stroke="#4ade80" strokeWidth=".5"/><rect x={cx-w*.15} y={cy-h*.12} width={w*.3} height={h*.1} rx={1} fill="none" stroke="#94a3b8" strokeWidth=".4"/><rect x={cx-w*.2} y={cy-h*.28} width={w*.4} height={1.5} fill="#64748b" rx={.5}/></g>
    case 'kitchen': return <g opacity="0.4"><rect x={x+2} y={y+2} width={w-4} height={7} rx={1} fill="#fbbf24" stroke="#f59e0b" strokeWidth=".5"/><rect x={cx-8} y={cy+4} width={16} height={10} rx={1.5} fill="none" stroke="#a16207" strokeWidth=".4"/></g>
    case 'toilet': return <g opacity="0.4"><ellipse cx={cx} cy={cy+h*.1} rx={3.5} ry={4.5} fill="#e0f2fe" stroke="#38bdf8" strokeWidth=".5"/><rect x={x+2} y={y+2} width={9} height={5} rx={2} fill="#e0f2fe" stroke="#38bdf8" strokeWidth=".5"/></g>
    case 'bath': return <g opacity="0.4"><rect x={x+w*.35} y={y+3} width={w*.6} height={h*.4} rx={3} fill="#bae6fd" stroke="#38bdf8" strokeWidth=".5"/><ellipse cx={x+10} cy={y+h*.6} rx={3.5} ry={4.5} fill="#e0f2fe" stroke="#38bdf8" strokeWidth=".5"/><rect x={x+2} y={y+2} width={10} height={6} rx={2} fill="#e0f2fe" stroke="#38bdf8" strokeWidth=".5"/></g>
    case 'closet': return <g opacity="0.25"><rect x={x+2} y={y+2} width={w-4} height={h-4} rx={1} fill="none" stroke="#a855f7" strokeWidth=".5" strokeDasharray="2 1"/></g>
    case 'shoe': return <g opacity="0.3"><rect x={x+2} y={y+2} width={w-4} height={6} rx={1} fill="#e2e8f0" stroke="#94a3b8" strokeWidth=".3"/></g>
    case 'desk': return <g opacity="0.3"><rect x={x+w*.1} y={y+h*.15} width={w*.8} height={h*.35} rx={1} fill="none" stroke="#64748b" strokeWidth=".5"/></g>
    default: return null
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface UnitLayout { id: string; type: string; x: number; y: number; w: number; h: number; rooms: RoomDef[] }

function buildFloor(unitTypes: {type:string; size:'S'|'M'|'L'; variant:string}[]): { bW:number; bD:number; coreX:number; coreW:number; units: UnitLayout[] } {
  const coreW = 30
  const leftCount = Math.ceil(unitTypes.length / 2)
  const units: UnitLayout[] = []
  
  let lx = 0
  for (let i = 0; i < leftCount; i++) {
    const { type, size, variant } = unitTypes[i]
    const spec = getSizeSpec(type, size)
    const tpls = getVariants(type, size)
    const tpl = tpls.find(t => t.variant === variant) || tpls[0]
    const rooms = tpl.generate(spec.w, spec.h, false)
    units.push({ id: String.fromCharCode(65+i), type, x: lx, y: 0, w: spec.w, h: spec.h, rooms })
    lx += spec.w
  }

  const maxH = Math.max(...units.map(u => u.h))
  units.forEach(u => { u.h = maxH }) // 높이 통일

  let rx = lx + coreW
  for (let i = leftCount; i < unitTypes.length; i++) {
    const { type, size, variant } = unitTypes[i]
    const spec = getSizeSpec(type, size)
    const tpls = getVariants(type, size)
    const tpl = tpls.find(t => t.variant === variant) || tpls[0]
    const rooms = tpl.generate(spec.w, maxH, true) // mirror
    units.push({ id: String.fromCharCode(65+i), type, x: rx, y: 0, w: spec.w, h: maxH, rooms })
    rx += spec.w
  }

  return { bW: rx, bD: maxH, coreX: lx, coreW, units }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function FloorSVG({ layout }: { layout: ReturnType<typeof buildFloor> }) {
  const { bW, bD, coreX, coreW, units } = layout
  const pad = 35
  const colors = ['#10b981','#3b82f6','#8b5cf6','#f59e0b']
  return (
    <svg viewBox={`0 0 ${bW+pad*2} ${bD+pad*2+16}`} className="w-full h-auto" style={{minWidth:300}}>
      <g transform={`translate(${pad},${pad})`}>
        <rect x={0} y={0} width={bW} height={bD} fill="none" stroke="currentColor" strokeWidth={WALL_EXT} className="text-foreground"/>
        <Core x={coreX} y={bD*.15} w={coreW} h={bD*.7}/>
        <rect x={coreX} y={0} width={coreW} height={bD*.15} fill="#f1f5f910" stroke="#64748b" strokeWidth={.3}/>
        <text x={coreX+coreW/2} y={bD*.08+1} fontSize="3.5" textAnchor="middle" fill="#64748b">복도</text>
        <rect x={coreX} y={bD*.85} width={coreW} height={bD*.15} fill="#f1f5f910" stroke="#64748b" strokeWidth={.3}/>
        <text x={coreX+coreW/2} y={bD*.92+1} fontSize="3.5" textAnchor="middle" fill="#64748b">복도</text>

        {units.map((unit,ui) => {
          const color = colors[ui%colors.length]
          return <g key={unit.id}>
            <rect x={unit.x} y={unit.y} width={unit.w} height={unit.h} fill="none" stroke="currentColor" strokeWidth={2} className="text-foreground"/>
            {unit.rooms.map((room,ri) => {
              const rx=unit.x+room.rx, ry=unit.y+room.ry, area=Math.round(room.rw*room.rh/10)/10
              return <g key={ri}>
                <rect x={rx} y={ry} width={room.rw} height={room.rh} fill={room.fill} stroke="currentColor" strokeWidth={WALL_INT} className="text-foreground"/>
                <text x={rx+room.rw/2} y={ry+room.rh/2-(room.furniture?3:0)} fontSize={room.rw>30?5.5:4} textAnchor="middle" fill="#374151" fontWeight="600">{room.name}</text>
                <text x={rx+room.rw/2} y={ry+room.rh/2+(room.furniture?1:5)} fontSize={room.rw>30?3.5:2.5} textAnchor="middle" fill="#9ca3af">{area}㎡</text>
                {room.furniture && <Furn type={room.furniture} x={rx} y={ry} w={room.rw} h={room.rh}/>}
              </g>
            })}
            <text x={unit.x+unit.w/2} y={unit.y+unit.h+10} fontSize="5" textAnchor="middle" fill={color} fontWeight="700">
              {unit.id}호 ({unit.type} · {getSizeSpec(unit.type,'M').area}㎡)
            </text>
          </g>
        })}

        {/* 치수/방위 */}
        <line x1={0} y1={-14} x2={bW} y2={-14} stroke="#94a3b8" strokeWidth=".5"/>
        <text x={bW/2} y={-18} fontSize="4.5" textAnchor="middle" fill="#64748b">{(bW*.1).toFixed(0)}m</text>
        <g transform={`translate(${bW+16},8)`}><line x1={0} y1={10} x2={0} y2={-2} stroke="currentColor" strokeWidth={1} className="text-foreground"/><polygon points="0,-4 -2.5,1.5 2.5,1.5" fill="currentColor" className="text-foreground"/><text x={0} y={-6} fontSize="5" textAnchor="middle" fill="currentColor" fontWeight="700" className="text-foreground">N</text></g>
      </g>
    </svg>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export interface AIFloorPlanProps {
  siteArea: number; buildingCoverage: number; floors: number; units: number
  type?: string; layoutName?: string; address?: string; zoneType?: string
  heightLimit?: number; setbacks?: { front?: number; side?: number; rear?: number }
}

export function AIFloorPlan(props: AIFloorPlanProps) {
  const { floors, units, zoneType } = props
  const [fullscreen, setFullscreen] = useState(false)
  const [selectedType, setSelectedType] = useState('투룸+쓰리룸')
  const [variantIdx, setVariantIdx] = useState(0)

  const ZONE_NAMES: Record<string,string> = {
    'residential-1':'제1종일반주거지역','residential-2':'제2종일반주거지역','residential-3':'제3종일반주거지역',
    'semi-residential':'준주거지역','commercial-neighborhood':'근린상업지역','commercial-general':'일반상업지역',
  }
  const zoneName = (zoneType && ZONE_NAMES[zoneType]) || zoneType || '제2종일반주거지역'

  const unitsPerFloor = Math.min(Math.max(Math.ceil(units / Math.max(floors-1,1)),2),4)
  const catalog = getCatalog()
  const allTypes = getTypes()

  // 세대 믹스 프리셋
  const mixPresets: Record<string, {type:string;size:'S'|'M'|'L';variant:string}[]> = {
    '투룸+쓰리룸': unitsPerFloor === 2 
      ? [{type:'투룸',size:'M',variant:'A'},{type:'쓰리룸',size:'M',variant:'A'}]
      : [{type:'투룸',size:'M',variant:'A'},{type:'쓰리룸',size:'M',variant:'A'},{type:'쓰리룸',size:'M',variant:'B'},{type:'투룸',size:'M',variant:'B'}].slice(0,unitsPerFloor),
    '원룸 중심': Array.from({length:unitsPerFloor},(_,i)=>({type:'원룸',size:('SML'[i%3]) as 'S'|'M'|'L',variant:'ABCD'[i%4]})),
    '투룸 중심': Array.from({length:unitsPerFloor},(_,i)=>({type:'투룸',size:'M' as const,variant:'ABCD'[i%4]})),
    '쓰리룸 중심': Array.from({length:unitsPerFloor},(_,i)=>({type:'쓰리룸',size:'M' as const,variant:'ABCD'[i%4]})),
    '쓰리룸+': Array.from({length:Math.min(unitsPerFloor,2)},(_,i)=>({type:'쓰리룸+',size:'M' as const,variant:'ABCD'[i%4]})),
    '포룸': Array.from({length:Math.min(unitsPerFloor,2)},(_,i)=>({type:'포룸',size:'M' as const,variant:'ABCD'[i%4]})),
    '복층': Array.from({length:Math.min(unitsPerFloor,2)},(_,i)=>({type:'복층',size:'M' as const,variant:'ABCD'[i%4]})),
  }

  const currentMix = mixPresets[selectedType] || mixPresets['투룸+쓰리룸']
  // 변형 적용
  const mixWithVariant = currentMix.map((m,i) => ({...m, variant: 'ABCD'[(i + variantIdx) % 4]}))

  const layout = useMemo(() => buildFloor(mixWithVariant), [selectedType, variantIdx, unitsPerFloor])

  const totalTemplates = catalog.length

  return (
    <div className="space-y-3">
      {fullscreen && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-bold">AI 평면도 · {selectedType}</span>
            <button onClick={()=>setFullscreen(false)} className="p-2 rounded-lg hover:bg-secondary/50"><X className="h-4 w-4"/></button>
          </div>
          <div className="flex-1 overflow-auto p-4 flex items-center justify-center"><FloorSVG layout={layout}/></div>
        </div>
      )}

      {/* 타입 선택 */}
      <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1">
        {Object.keys(mixPresets).map(k => (
          <button key={k} onClick={()=>{setSelectedType(k);setVariantIdx(0)}}
            className={`shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-medium ${selectedType===k?'bg-primary text-primary-foreground':'bg-secondary/30 text-muted-foreground'}`}>
            {k}
          </button>
        ))}
      </div>

      {/* 변형 선택 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary"/>
          <span className="text-xs font-bold">평면도</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{totalTemplates}종 라이브러리</span>
        </div>
        <div className="flex gap-1">
          {['A','B','C','D'].map((v,i) => (
            <button key={v} onClick={()=>setVariantIdx(i)}
              className={`w-6 h-6 rounded text-[10px] font-bold ${variantIdx===i?'bg-primary text-primary-foreground':'bg-secondary/30 text-muted-foreground'}`}>{v}</button>
          ))}
          <button onClick={()=>setFullscreen(true)} className="p-1 rounded hover:bg-secondary/50 ml-1"><Maximize2 className="h-3.5 w-3.5"/></button>
        </div>
      </div>

      {/* SVG */}
      <div className="rounded-xl border border-border bg-card p-2 overflow-x-auto cursor-pointer" onClick={()=>setFullscreen(true)}>
        <FloorSVG layout={layout}/>
        <p className="text-[9px] text-center text-muted-foreground/50 mt-1">탭하여 전체화면</p>
      </div>

      {/* 면적표 */}
      <div className="text-[11px] border border-border rounded-lg overflow-hidden">
        <div className="bg-primary/10 px-3 py-1.5 font-bold text-xs flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-primary"/>면적표
        </div>
        <table className="w-full">
          <thead><tr className="bg-secondary/50 text-[10px]"><th className="px-2 py-1 text-left">세대</th><th className="px-2 py-1 text-left">타입</th><th className="px-2 py-1 text-right">전용면적</th><th className="px-2 py-1 text-right">실 수</th></tr></thead>
          <tbody>
            {layout.units.map(u => <tr key={u.id} className="border-t border-border/30"><td className="px-2 py-0.5 font-semibold">{u.id}호</td><td className="px-2 py-0.5">{u.type}</td><td className="px-2 py-0.5 text-right font-mono">{getSizeSpec(u.type,'M').area}㎡</td><td className="px-2 py-0.5 text-right">{u.rooms.length}실</td></tr>)}
            <tr className="border-t border-border bg-emerald-500/10 font-bold"><td className="px-2 py-1" colSpan={2}>합계 ({layout.units.length}세대)</td><td className="px-2 py-1 text-right font-mono">{layout.units.reduce((s,u)=>s+getSizeSpec(u.type,'M').area,0)}㎡</td><td className="px-2 py-1 text-right">-</td></tr>
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground px-1">
        <span className="flex items-center gap-1"><span className="w-3 h-1 bg-[#334155] rounded-sm inline-block"/>코어</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-[#f0fdf4] border border-[#86efac] rounded-sm inline-block"/>거실</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-[#fef3c7] border border-[#fbbf24] rounded-sm inline-block"/>주방</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-[#eff6ff] border border-[#93c5fd] rounded-sm inline-block"/>침실</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-[#e0f2fe] border border-[#38bdf8] rounded-sm inline-block"/>욕실</span>
      </div>

      <p className="text-[9px] text-muted-foreground text-center">{zoneName} · {floors}층 · {units}세대 · 실시설계 시 건축사 검토 필요</p>
    </div>
  )
}
