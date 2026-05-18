"use client"

/**
 * 일조/조망 시뮬레이션 패널
 * 태양 경로 다이어그램 + 면별 일조 시간 + 북측 사선 + 그림자 분석
 */

import { useMemo, useState } from 'react'
import { simulateSunlight, getSunlightGrade, type DaylightResult } from '@/lib/sunlight-simulator'

interface Props {
  buildingHeight: number
  floors: number
  lat?: number
  lng?: number
  setbackNorth?: number
}

export default function SunlightPanel({ buildingHeight, floors, lat, lng, setbackNorth = 3 }: Props) {
  const [mode, setMode] = useState<'today' | 'winter'>('today')
  const [hour, setHour] = useState(12)

  const result = useMemo(() =>
    simulateSunlight({ lat, lng, buildingHeight, floors, setbackNorth }),
    [lat, lng, buildingHeight, floors, setbackNorth]
  )

  const grade = getSunlightGrade(result.facades)
  const positions = mode === 'today' ? result.positions : result.winterSolstice.positions
  const currentPos = positions.reduce((best, p) =>
    Math.abs(p.hour - hour) < Math.abs(best.hour - hour) ? p : best, positions[0])

  // SVG 태양 경로 다이어그램 크기
  const svgW = 300, svgH = 160, cx = svgW / 2, cy = svgH - 20, radius = 120

  return (
    <div className="w-full space-y-3">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-yellow-400">☀️ 일조 시뮬레이션</span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: grade.color + '20', color: grade.color }}>
            {grade.grade}
          </span>
        </div>
        <div className="flex gap-1">
          {(['today', 'winter'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-2 py-0.5 rounded text-[9px] ${mode === m ? 'bg-yellow-500/20 text-yellow-300' : 'text-white/40'}`}>
              {m === 'today' ? '오늘' : '동지'}
            </button>
          ))}
        </div>
      </div>

      {/* 일출/일몰 정보 */}
      <div className="grid grid-cols-4 gap-1 text-center">
        {[
          { label: '일출', value: mode === 'today' ? result.sunrise : result.winterSolstice.sunrise, color: '#fb923c' },
          { label: '일몰', value: mode === 'today' ? result.sunset : result.winterSolstice.sunset, color: '#f87171' },
          { label: '일조', value: `${(mode === 'today' ? result.totalHours : result.winterSolstice.totalHours).toFixed(1)}h`, color: '#fbbf24' },
          { label: '남향', value: `${result.facades.south}h`, color: '#22c55e' },
        ].map((item, i) => (
          <div key={i} className="bg-white/5 rounded px-1 py-1">
            <div className="text-[8px] text-white/40">{item.label}</div>
            <div className="text-[11px] font-bold" style={{ color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* 태양 경로 다이어그램 */}
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" style={{ maxHeight: 160 }}>
        <rect width={svgW} height={svgH} fill="#0f172a" rx="4" />

        {/* 지평선 */}
        <line x1={10} y1={cy} x2={svgW - 10} y2={cy} stroke="#334155" strokeWidth="1" />
        <text x={15} y={cy - 3} fontSize="7" fill="#64748b">E</text>
        <text x={svgW - 20} y={cy - 3} fontSize="7" fill="#64748b">W</text>
        <text x={cx} y={cy - radius - 5} textAnchor="middle" fontSize="7" fill="#64748b">S</text>

        {/* 고도 원호 (30°, 60°) */}
        {[30, 60].map(deg => {
          const r = radius * (1 - deg / 90)
          return <path key={deg} d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2,2" />
        })}

        {/* 태양 경로 (위치 연결) */}
        {positions.length > 1 && (
          <path d={positions.map((p, i) => {
            const r = radius * (1 - p.altitude / 90)
            const angle = (p.azimuth - 90) * Math.PI / 180 // SVG 좌표계
            const x = cx + r * Math.cos(angle)
            const y = cy - r * Math.sin(angle) * 0.7 // Y축 압축
            return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
          }).join(' ')} fill="none" stroke="#fbbf24" strokeWidth="1.5" opacity="0.6" />
        )}

        {/* 시간 마커 */}
        {positions.filter(p => p.hour % 2 === 0).map((p, i) => {
          const r = radius * (1 - p.altitude / 90)
          const angle = (p.azimuth - 90) * Math.PI / 180
          const x = cx + r * Math.cos(angle)
          const y = cy - r * Math.sin(angle) * 0.7
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={2} fill="#fbbf24" />
              <text x={x} y={y - 5} textAnchor="middle" fontSize="6" fill="#fbbf24">{Math.round(p.hour)}h</text>
            </g>
          )
        })}

        {/* 현재 시간 태양 */}
        {currentPos && (() => {
          const r = radius * (1 - currentPos.altitude / 90)
          const angle = (currentPos.azimuth - 90) * Math.PI / 180
          const x = cx + r * Math.cos(angle)
          const y = cy - r * Math.sin(angle) * 0.7
          return (
            <g>
              <circle cx={x} cy={y} r={5} fill="#fbbf24" opacity="0.8" />
              <circle cx={x} cy={y} r={8} fill="none" stroke="#fbbf24" strokeWidth="0.5" opacity="0.4" />
              <text x={x} y={y + 14} textAnchor="middle" fontSize="7" fill="#fbbf24" fontWeight="bold">
                {currentPos.altitude.toFixed(0)}°
              </text>
            </g>
          )
        })()}

        {/* 건물 (중앙 하단) */}
        <rect x={cx - 8} y={cy - 20} width={16} height={20} fill="#475569" stroke="#94a3b8" strokeWidth="0.5" />
        <text x={cx} y={cy - 8} textAnchor="middle" fontSize="6" fill="#e2e8f0">{floors}F</text>

        {/* 그림자 */}
        {currentPos && currentPos.altitude > 0 && (() => {
          const shadowLen = Math.min(currentPos.shadowLength * 20, 80)
          const shadowDir = (currentPos.shadowAngle + 90) * Math.PI / 180
          const sx = cx + shadowLen * Math.cos(shadowDir) * 0.6
          const sy = cy + Math.abs(shadowLen * Math.sin(shadowDir)) * 0.3
          return (
            <polygon
              points={`${cx - 8},${cy} ${cx + 8},${cy} ${sx + 5},${sy} ${sx - 5},${sy}`}
              fill="#000" opacity="0.3" />
          )
        })()}
      </svg>

      {/* 시간 슬라이더 */}
      <div className="px-1">
        <input type="range" min={6} max={19} step={0.5} value={hour}
          onChange={e => setHour(Number(e.target.value))}
          className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-yellow-400 bg-white/10" />
        <div className="flex justify-between text-[8px] text-white/30">
          <span>6시</span>
          <span className="text-yellow-400 font-bold">{Math.floor(hour)}:{hour % 1 ? '30' : '00'} — 고도 {currentPos?.altitude || 0}° 그림자 ×{currentPos?.shadowLength?.toFixed(1) || 0}</span>
          <span>19시</span>
        </div>
      </div>

      {/* 면별 일조 시간 바 차트 */}
      <div className="space-y-1">
        <div className="text-[9px] text-white/50 font-medium">면별 일조 시간</div>
        {[
          { label: '남향', hours: result.facades.south, color: '#22c55e', max: 12 },
          { label: '동향', hours: result.facades.east, color: '#38bdf8', max: 12 },
          { label: '서향', hours: result.facades.west, color: '#fb923c', max: 12 },
          { label: '북향', hours: result.facades.north, color: '#94a3b8', max: 12 },
        ].map((f, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[9px] w-6" style={{ color: f.color }}>{f.label}</span>
            <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(f.hours / f.max * 100, 100)}%`, background: f.color }} />
            </div>
            <span className="text-[9px] w-8 text-right" style={{ color: f.color }}>{f.hours}h</span>
          </div>
        ))}
      </div>

      {/* 북측 사선 제한 */}
      <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-2">
        <div className="text-[9px] text-red-400 font-bold mb-1">🔺 북측 사선 제한</div>
        <div className="grid grid-cols-3 gap-1 text-center text-[9px]">
          <div>
            <div className="text-white/40">사선 각도</div>
            <div className="text-red-300 font-bold">{result.northShadow.angle}°</div>
          </div>
          <div>
            <div className="text-white/40">필요 이격</div>
            <div className="text-red-300 font-bold">{result.northShadow.setbackNeeded}m</div>
          </div>
          <div>
            <div className="text-white/40">허용 높이</div>
            <div className="text-red-300 font-bold">{result.northShadow.maxHeight}m</div>
          </div>
        </div>
        <div className="text-[8px] text-white/30 mt-1">
          건물 {buildingHeight.toFixed(1)}m, 북측 이격 {setbackNorth}m → {buildingHeight <= result.northShadow.maxHeight ? '✅ 적합' : '❌ 초과'}
        </div>
      </div>
    </div>
  )
}
