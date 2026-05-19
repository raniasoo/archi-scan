"use client"

import { useMemo } from "react"
import { Mountain, Droplets, Activity, AlertTriangle, CheckCircle2, Landmark, FlaskConical, Building2 } from "lucide-react"

interface SiteAnalysisPanelProps {
  siteConditions: {
    slope?: number; slopeDirection?: string; soilCode?: string; elevation?: number
    seismicRisk?: string; floodRisk?: string; buildabilityScore?: number
  }
  address?: string
}

const SOIL_LABELS: Record<string, { name: string; color: string; icon: string }> = {
  ROCK: { name: '암반', color: '#6b7280', icon: '🪨' },
  GRAVEL: { name: '자갈층', color: '#d97706', icon: '⬤' },
  SAND: { name: '모래층', color: '#eab308', icon: '🟡' },
  CLAY: { name: '점토층', color: '#92400e', icon: '🟤' },
  SILT: { name: '실트층', color: '#78716c', icon: '⚠️' },
  FILL: { name: '매립토', color: '#ef4444', icon: '🔴' },
}

export function SiteAnalysisPanel({ siteConditions: sc, address }: SiteAnalysisPanelProps) {
  if (!sc.elevation && sc.elevation !== 0) return null

  const soil = SOIL_LABELS[sc.soilCode || 'SAND'] || SOIL_LABELS.SAND
  const score = sc.buildabilityScore ?? 100
  const slopeGrade = (sc.slope || 0) < 2 ? '평탄' : (sc.slope || 0) < 5 ? '완경사' : (sc.slope || 0) < 10 ? '경사' : (sc.slope || 0) < 20 ? '급경사' : '산악'
  
  // 기초 추천
  const foundation = sc.soilCode === 'FILL' || sc.soilCode === 'SILT' ? '파일기초' : sc.soilCode === 'CLAY' ? '매트기초+보강' : '매트기초'
  
  // GL 높이
  const glHeight = sc.floodRisk === 'very-high' ? 600 : sc.floodRisk === 'high' ? 500 : sc.floodRisk === 'medium' ? 300 : 150

  // 추가 비용
  const costImpact = useMemo(() => {
    let cost = 0
    if (sc.soilCode === 'FILL') cost += 25
    else if (sc.soilCode === 'SILT') cost += 18
    else if (sc.soilCode === 'CLAY') cost += 8
    if ((sc.slope || 0) > 15) cost += 15
    else if ((sc.slope || 0) > 10) cost += 8
    if (sc.floodRisk === 'very-high') cost += 12
    else if (sc.floodRisk === 'high') cost += 5
    return cost
  }, [sc])

  // 경고
  const warnings: string[] = []
  if ((sc.slope || 0) > 15) warnings.push(`급경사 ${sc.slope}% — 옹벽 필요, 테라스형 배치 권장`)
  if (sc.soilCode === 'FILL') warnings.push('매립지 추정 — 파일기초 필수, 부등침하 주의')
  if (sc.soilCode === 'SILT') warnings.push('연약지반 추정 — 지반보강 필요')
  if (sc.floodRisk === 'very-high') warnings.push('침수 극위험 — 필로티형 배치, GL+600mm 권장')
  else if (sc.floodRisk === 'high') warnings.push('침수 주의 — GL+500mm, 방수턱 설치 권장')
  if (sc.seismicRisk === 'high') warnings.push('지진구역 I — 내진 설계 강화 필요')

  const gradeColor = score >= 85 ? '#22c55e' : score >= 70 ? '#84cc16' : score >= 50 ? '#f59e0b' : '#ef4444'
  const gradeLabel = score >= 85 ? '최적' : score >= 70 ? '양호' : score >= 50 ? '보통' : '주의'

  return (
    <div className="rounded-xl border border-white/10 bg-gradient-to-br from-[#1a1f2e] to-[#141822] p-4 space-y-3">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mountain className="h-4 w-4 text-emerald-400" />
          <span className="text-sm font-semibold text-white/90">대지조건 분석</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: gradeColor + '20', color: gradeColor }}>
          {score}점 {gradeLabel}
        </div>
      </div>

      {/* 4칸 그리드 — 핵심 지표 */}
      <div className="grid grid-cols-2 gap-2">
        {/* 지형 */}
        <div className="rounded-lg bg-white/5 p-2.5 space-y-1">
          <div className="flex items-center gap-1 text-[10px] text-white/40">
            <Mountain className="h-3 w-3" /> 지형
          </div>
          <div className="text-lg font-bold text-white/90">{sc.elevation}m</div>
          <div className="text-[10px] text-white/50">경사 {sc.slope}% · {slopeGrade}</div>
        </div>

        {/* 토질 */}
        <div className="rounded-lg bg-white/5 p-2.5 space-y-1">
          <div className="flex items-center gap-1 text-[10px] text-white/40">
            <FlaskConical className="h-3 w-3" /> 토질
          </div>
          <div className="text-lg font-bold" style={{ color: soil.color }}>{soil.icon} {soil.name}</div>
          <div className="text-[10px] text-white/50">기초: {foundation}</div>
        </div>

        {/* 지진 */}
        <div className="rounded-lg bg-white/5 p-2.5 space-y-1">
          <div className="flex items-center gap-1 text-[10px] text-white/40">
            <Activity className="h-3 w-3" /> 지진
          </div>
          <div className={`text-lg font-bold ${sc.seismicRisk === 'high' ? 'text-red-400' : sc.seismicRisk === 'medium' ? 'text-yellow-400' : 'text-green-400'}`}>
            {sc.seismicRisk === 'high' ? '위험' : sc.seismicRisk === 'medium' ? '주의' : '안전'}
          </div>
          <div className="text-[10px] text-white/50">
            {address?.includes('경북') || address?.includes('부산') || address?.includes('경남') ? 'I구역' : 'II구역'}
          </div>
        </div>

        {/* 침수 */}
        <div className="rounded-lg bg-white/5 p-2.5 space-y-1">
          <div className="flex items-center gap-1 text-[10px] text-white/40">
            <Droplets className="h-3 w-3" /> 침수
          </div>
          <div className={`text-lg font-bold ${sc.floodRisk === 'very-high' ? 'text-red-400' : sc.floodRisk === 'high' ? 'text-orange-400' : sc.floodRisk === 'medium' ? 'text-yellow-400' : 'text-green-400'}`}>
            {sc.floodRisk === 'very-high' ? '극위험' : sc.floodRisk === 'high' ? '위험' : sc.floodRisk === 'medium' ? '주의' : '안전'}
          </div>
          <div className="text-[10px] text-white/50">GL+{glHeight}mm</div>
        </div>
      </div>

      {/* 설계 영향 요약 */}
      <div className="rounded-lg bg-white/5 p-2.5 space-y-1.5">
        <div className="flex items-center gap-1 text-[10px] text-white/40">
          <Building2 className="h-3 w-3" /> 설계 영향
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-[10px] text-white/40">건폐율 보정</div>
            <div className="text-sm font-bold text-white/80">
              {(sc.slope || 0) > 15 ? '×0.80' : (sc.slope || 0) > 10 ? '×0.88' : (sc.slope || 0) > 5 ? '×0.95' : '×1.00'}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-white/40">층수 보정</div>
            <div className="text-sm font-bold text-white/80">
              {sc.soilCode === 'FILL' ? '×0.60' : sc.soilCode === 'SILT' ? '×0.70' : sc.soilCode === 'CLAY' ? '×0.85' : '×1.00'}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-white/40">추가 비용</div>
            <div className={`text-sm font-bold ${costImpact > 15 ? 'text-red-400' : costImpact > 5 ? 'text-yellow-400' : 'text-green-400'}`}>
              +{costImpact}%
            </div>
          </div>
        </div>
      </div>

      {/* 경고 */}
      {warnings.length > 0 && (
        <div className="space-y-1.5">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-1.5 rounded-lg bg-red-500/10 px-2.5 py-1.5">
              <AlertTriangle className="h-3 w-3 text-red-400 mt-0.5 flex-shrink-0" />
              <span className="text-[11px] text-red-300">{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* 안전할 때 */}
      {warnings.length === 0 && (
        <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1.5">
          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
          <span className="text-[11px] text-emerald-300">대지 조건 양호 — 일반적인 설계로 충분합니다</span>
        </div>
      )}

      <div className="text-[9px] text-white/25 text-center">
        ※ 표고 기반 추정치입니다. 정확한 토질은 지반조사(시추)가 필요합니다.
      </div>
    </div>
  )
}
