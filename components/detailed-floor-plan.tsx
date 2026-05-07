"use client"

import React, { useState } from "react"
import { getCatalog, getTypes, getSizeSpec, getVariants, type RoomDef } from "@/lib/floorplan-templates"

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const WALL_EXT = 3, WALL_INT = 1.5

// 가구 렌더러
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

// 면적표
function AreaTable({ rooms, type, area }: { rooms: RoomDef[]; type: string; area: number }) {
  return (
    <div className="text-[11px] border border-border rounded-lg overflow-hidden">
      <div className="bg-primary/10 px-3 py-1.5 font-bold text-xs">{type} {area}㎡ 면적표</div>
      <table className="w-full">
        <thead><tr className="bg-secondary/50 text-[10px]"><th className="px-2 py-1 text-left">실명</th><th className="px-2 py-1 text-right">면적(㎡)</th></tr></thead>
        <tbody>
          {rooms.map((r,i) => {
            const a = Math.round(r.rw * r.rh / 10) / 10
            return <tr key={i} className="border-t border-border/30"><td className="px-2 py-0.5">{r.name}</td><td className="px-2 py-0.5 text-right font-mono">{a}</td></tr>
          })}
          <tr className="border-t border-border bg-emerald-500/10 font-bold">
            <td className="px-2 py-1">합계</td>
            <td className="px-2 py-1 text-right font-mono">{Math.round(rooms.reduce((s,r) => s + r.rw*r.rh/10, 0)*10)/10}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 메인 컴포넌트 — 96종 라이브러리 기반
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface Props {
  siteArea: number; buildingCoverage: number; floors: number; units: number; type?: string; layoutName?: string
}

export function DetailedFloorPlan({ siteArea, buildingCoverage, floors, units, type, layoutName }: Props) {
  const allTypes = getTypes()
  const [selectedType, setSelectedType] = useState('쓰리룸')
  const [selectedSize, setSelectedSize] = useState<'S'|'M'|'L'>('M')
  const [selectedVariant, setSelectedVariant] = useState('A')

  const variants = getVariants(selectedType, selectedSize)
  const current = variants.find(v => v.variant === selectedVariant) || variants[0]
  const spec = getSizeSpec(selectedType, selectedSize)
  const rooms = current?.generate(spec.w, spec.h, false) || []

  return (
    <div className="space-y-3">
      {/* 타입 선택 */}
      <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1">
        {allTypes.map(t => (
          <button key={t} onClick={() => { setSelectedType(t); setSelectedVariant('A') }}
            className={`shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-medium ${
              selectedType === t ? 'bg-primary text-primary-foreground' : 'bg-secondary/30 text-muted-foreground hover:bg-secondary/50'
            }`}>{t}</button>
        ))}
      </div>

      {/* 크기 + 변형 */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {(['S','M','L'] as const).map(s => (
            <button key={s} onClick={() => setSelectedSize(s)}
              className={`px-2 py-1 rounded text-[10px] font-medium ${selectedSize===s?'bg-primary/20 text-primary border border-primary/30':'bg-secondary/20 text-muted-foreground'}`}>
              {s} ({getSizeSpec(selectedType, s).area}㎡)
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {['A','B','C','D'].map(v => (
            <button key={v} onClick={() => setSelectedVariant(v)}
              className={`w-6 h-6 rounded text-[10px] font-bold ${selectedVariant===v?'bg-primary text-primary-foreground':'bg-secondary/30 text-muted-foreground'}`}>{v}</button>
          ))}
        </div>
      </div>

      {/* SVG 단위세대 상세 평면 */}
      <div className="rounded-xl border border-border bg-card p-3 overflow-x-auto">
        <svg viewBox={`0 0 ${spec.w + 50} ${spec.h + 50}`} className="w-full h-auto" style={{ minWidth: 280 }}>
          <g transform="translate(25, 25)">
            {/* 외벽 */}
            <rect x={0} y={0} width={spec.w} height={spec.h} fill="none" stroke="currentColor" strokeWidth={WALL_EXT} className="text-foreground"/>
            
            {/* 실 */}
            {rooms.map((room, i) => {
              const a = Math.round(room.rw * room.rh / 10) / 10
              return <g key={i}>
                <rect x={room.rx} y={room.ry} width={room.rw} height={room.rh}
                  fill={room.fill} stroke="currentColor" strokeWidth={WALL_INT} className="text-foreground"/>
                <text x={room.rx+room.rw/2} y={room.ry+room.rh/2-(room.furniture?3:0)}
                  fontSize={room.rw>30?5.5:4} textAnchor="middle" fill="#374151" fontWeight="600">{room.name}</text>
                <text x={room.rx+room.rw/2} y={room.ry+room.rh/2+(room.furniture?1:5)}
                  fontSize={room.rw>30?3.5:2.5} textAnchor="middle" fill="#9ca3af">{a}㎡</text>
                {room.furniture && <Furn type={room.furniture} x={room.rx} y={room.ry} w={room.rw} h={room.rh}/>}
              </g>
            })}

            {/* 치수선 */}
            <line x1={0} y1={-12} x2={spec.w} y2={-12} stroke="#94a3b8" strokeWidth=".5"/>
            <line x1={0} y1={-14} x2={0} y2={-10} stroke="#94a3b8" strokeWidth=".5"/>
            <line x1={spec.w} y1={-14} x2={spec.w} y2={-10} stroke="#94a3b8" strokeWidth=".5"/>
            <text x={spec.w/2} y={-16} fontSize="4.5" textAnchor="middle" fill="#64748b">{(spec.w*0.05).toFixed(1)}m</text>

            <line x1={-12} y1={0} x2={-12} y2={spec.h} stroke="#94a3b8" strokeWidth=".5"/>
            <text x={-16} y={spec.h/2} fontSize="4.5" textAnchor="middle" fill="#64748b" transform={`rotate(-90,-16,${spec.h/2})`}>{(spec.h*0.05).toFixed(1)}m</text>

            {/* 타입명 */}
            <text x={spec.w/2} y={spec.h+14} fontSize="6" textAnchor="middle" fill="currentColor" fontWeight="700" className="text-foreground">
              {selectedType} {selectedVariant}타입 (전용 {spec.area}㎡)
            </text>
          </g>
        </svg>
      </div>

      {/* 면적표 */}
      <AreaTable rooms={rooms} type={`${selectedType} ${selectedVariant}타입`} area={spec.area} />

      {/* 범례 */}
      <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground px-1">
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-[#f0fdf4] border border-[#86efac] rounded-sm inline-block"/>거실</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-[#fef3c7] border border-[#fbbf24] rounded-sm inline-block"/>주방</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-[#eff6ff] border border-[#93c5fd] rounded-sm inline-block"/>침실</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-[#e0f2fe] border border-[#38bdf8] rounded-sm inline-block"/>욕실</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-[#faf5ff] border border-[#a855f7] rounded-sm inline-block"/>드레스룸</span>
      </div>

      <p className="text-[9px] text-muted-foreground text-center">
        96종 라이브러리 · {selectedType} {selectedSize} {selectedVariant}타입 · 실시설계 시 건축사 검토 필요
      </p>
    </div>
  )
}
