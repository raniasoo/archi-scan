"use client"

import { useState, useCallback, useEffect } from "react"

interface SliderParam {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit: string
  color: string
}

interface ParameterSlidersProps {
  coverage: number
  floors: number
  units: number
  setbackFront: number
  setbackSide: number
  siteArea: number
  type: string
  onChange: (params: {
    coverage: number
    floors: number
    units: number
    setbackFront: number
    setbackSide: number
  }) => void
}

export default function ParameterSliders({
  coverage: initCov, floors: initFloors, units: initUnits,
  setbackFront: initFront, setbackSide: initSide,
  siteArea, type, onChange
}: ParameterSlidersProps) {
  const [cov, setCov] = useState(initCov)
  const [floors, setFloors] = useState(initFloors)
  const [units, setUnits] = useState(initUnits)
  const [front, setFront] = useState(initFront)
  const [side, setSide] = useState(initSide)
  const [expanded, setExpanded] = useState(false)

  // 파라미터 변경 시 상위로 전달
  const emit = useCallback(() => {
    onChange({ coverage: cov, floors, units, setbackFront: front, setbackSide: side })
  }, [cov, floors, units, front, side, onChange])

  useEffect(() => { emit() }, [cov, floors, units, front, side])

  // 실시간 계산
  const buildingArea = Math.round(siteArea * cov / 100)
  const gfa = buildingArea * floors
  const far = Math.round(gfa / siteArea * 100)
  const unitArea = units > 0 ? Math.round(gfa / units) : 0

  const sliders: SliderParam[] = [
    { label: '건폐율', value: cov, min: 20, max: 70, step: 1, unit: '%', color: '#14b8a6' },
    { label: '층수', value: floors, min: 1, max: 20, step: 1, unit: '층', color: '#8b5cf6' },
    { label: '세대수', value: units, min: 1, max: 200, step: 1, unit: '세대', color: '#f59e0b' },
    { label: '전면이격', value: front, min: 1, max: 10, step: 0.5, unit: 'm', color: '#ef4444' },
    { label: '측면이격', value: side, min: 0.5, max: 6, step: 0.5, unit: 'm', color: '#3b82f6' },
  ]

  const setters = [setCov, setFloors, setUnits, setFront, setSide]

  return (
    <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl overflow-hidden">
      {/* 헤더 */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-700/30 transition"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">🎛️</span>
          <span className="text-xs font-bold text-white/90">파라미터 조절</span>
          <span className="text-[10px] text-teal-400/70 bg-teal-500/10 px-1.5 py-0.5 rounded">실시간</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-white/50">
          <span>건폐 {cov}%</span>
          <span>용적 {far}%</span>
          <span>GFA {gfa}㎡</span>
          <span className={`transition-transform ${expanded ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-slate-700/50">
          {/* 실시간 계산 결과 */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-slate-900/50 rounded-lg p-2">
              <p className="text-[9px] text-white/40">건축면적</p>
              <p className="text-sm font-bold text-teal-400">{buildingArea}㎡</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-2">
              <p className="text-[9px] text-white/40">연면적</p>
              <p className="text-sm font-bold text-violet-400">{gfa.toLocaleString()}㎡</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-2">
              <p className="text-[9px] text-white/40">용적률</p>
              <p className="text-sm font-bold text-amber-400">{far}%</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-2">
              <p className="text-[9px] text-white/40">세대 면적</p>
              <p className="text-sm font-bold text-blue-400">{unitArea}㎡</p>
            </div>
          </div>

          {/* 슬라이더 */}
          {sliders.map((s, i) => (
            <div key={s.label} className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-semibold text-white/60">{s.label}</label>
                <span className="text-xs font-bold" style={{ color: s.color }}>
                  {s.value}{s.unit}
                </span>
              </div>
              <input
                type="range"
                min={s.min} max={s.max} step={s.step}
                value={s.value}
                onChange={(e) => setters[i](parseFloat(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, ${s.color} ${((s.value - s.min) / (s.max - s.min)) * 100}%, rgba(255,255,255,0.1) ${((s.value - s.min) / (s.max - s.min)) * 100}%)`,
                }}
              />
              <div className="flex justify-between text-[8px] text-white/30">
                <span>{s.min}{s.unit}</span>
                <span>{s.max}{s.unit}</span>
              </div>
            </div>
          ))}

          {/* 리셋 */}
          <button
            onClick={() => { setCov(initCov); setFloors(initFloors); setUnits(initUnits); setFront(initFront); setSide(initSide) }}
            className="w-full py-1.5 text-[10px] text-white/40 hover:text-white/70 border border-slate-700/50 rounded-lg hover:bg-slate-700/30 transition"
          >
            ↩ 원래 값으로 리셋
          </button>
        </div>
      )}
    </div>
  )
}
