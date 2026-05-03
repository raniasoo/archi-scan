"use client"

import { useEffect, useState } from "react"
import { Mountain, ArrowDown, AlertTriangle, ChevronDown, ChevronUp, Lightbulb } from "lucide-react"

interface SlopeAnalysisCardProps {
  lng: number
  lat: number
  className?: string
}

interface SlopeData {
  slope: {
    average: number
    max: number
    maxDirection: string
    slopeDirection: string
    elevRange: number
    minElevation: number
    maxElevation: number
  }
  grade: string
  gradeColor: string
  designImpact: string[]
  center: { elevation: number }
}

const DIRECTION_ARROWS: Record<string, string> = {
  '북': '↑', '남': '↓', '동': '→', '서': '←',
  '북동': '↗', '북서': '↖', '남동': '↘', '남서': '↙',
}

export function SlopeAnalysisCard({ lng, lat, className = "" }: SlopeAnalysisCardProps) {
  const [data, setData] = useState<SlopeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!lng || !lat) return
    setLoading(true)
    setError(false)
    fetch(`/api/elevation?lng=${lng}&lat=${lat}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setData(d)
        else setError(true)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [lng, lat])

  if (loading) {
    return (
      <div className={`rounded-xl border border-border/60 bg-card p-4 ${className}`}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Mountain className="h-4 w-4 animate-pulse" />
          <span>경사도 분석 중...</span>
        </div>
      </div>
    )
  }

  if (error || !data) return null

  return (
    <div className={`rounded-xl border border-border/60 bg-card overflow-hidden ${className}`}>
      {/* 헤더 */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-secondary/30 hover:bg-secondary/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Mountain className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">대지 경사도 분석</span>
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{ backgroundColor: data.gradeColor + '20', color: data.gradeColor }}
          >
            {data.grade} ({data.slope.average}%)
          </span>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {/* 요약 (항상 표시) */}
      <div className="px-4 py-3 border-t border-border/30">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-[10px] text-muted-foreground mb-0.5">평균 경사도</p>
            <p className="text-lg font-bold" style={{ color: data.gradeColor }}>
              {data.slope.average}%
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground mb-0.5">표고 (해발)</p>
            <p className="text-lg font-bold text-foreground">
              {Math.round(data.center.elevation)}m
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground mb-0.5">고저차</p>
            <p className="text-lg font-bold text-foreground">
              {data.slope.elevRange}m
            </p>
          </div>
        </div>

        {/* 경사 방향 */}
        <div className="flex items-center justify-center gap-2 mt-2 text-xs text-muted-foreground">
          <ArrowDown className="h-3 w-3" />
          <span>
            경사 방향: <span className="font-semibold text-foreground">
              {DIRECTION_ARROWS[data.slope.slopeDirection]} {data.slope.slopeDirection}
            </span>
            (최대 {data.slope.max}% {data.slope.maxDirection}방향)
          </span>
        </div>
      </div>

      {/* 상세 (확장 시) */}
      {expanded && (
        <div className="border-t border-border/30">
          {/* 표고 정보 */}
          <div className="px-4 py-3">
            <p className="text-[10px] font-semibold text-muted-foreground mb-2">표고 범위</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden relative">
                <div
                  className="h-full rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${data.gradeColor}40, ${data.gradeColor})`,
                    width: '100%',
                  }}
                />
              </div>
            </div>
            <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
              <span>최저 {data.slope.minElevation}m</span>
              <span>최고 {data.slope.maxElevation}m</span>
            </div>
          </div>

          {/* 설계 영향 */}
          <div className="px-4 py-3 bg-primary/5 border-t border-border/30">
            <div className="flex items-center gap-1.5 mb-2">
              <Lightbulb className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-semibold text-foreground">설계 시 고려사항</span>
            </div>
            <div className="space-y-1.5">
              {data.designImpact.map((impact, i) => (
                <div key={i} className="flex items-start gap-2">
                  {impact.includes('절감') || impact.includes('유리') || impact.includes('가능') || impact.includes('용이') ? (
                    <span className="text-emerald-500 text-[10px] mt-0.5">●</span>
                  ) : impact.includes('증가') || impact.includes('필수') || impact.includes('필요') || impact.includes('제한') || impact.includes('위험') ? (
                    <span className="text-amber-500 text-[10px] mt-0.5">●</span>
                  ) : (
                    <span className="text-blue-400 text-[10px] mt-0.5">●</span>
                  )}
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{impact}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 주의사항 */}
          {data.slope.average >= 8 && (
            <div className="px-4 py-2 bg-amber-500/5 border-t border-amber-500/20">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-400 leading-relaxed">
                  경사도 8% 이상 대지는 기초 공사비와 토목 비용이 증가합니다. 사업성 검토 시 추가 비용을 반드시 고려하세요.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
