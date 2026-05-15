"use client"

import { useState } from "react"

interface NearbyAnalysisResult {
  success: boolean
  address: string
  summary: {
    totalBuildings: number
    residentialCount: number
    commercialCount: number
    maxFloors: number
    avgFloors: number
    maxHeight: number
    highRiseCount: number
    midRiseCount: number
    lowRiseCount: number
    amenityTypes: string[]
    mainRoads: string[]
  }
  buildings: { name: string; use: string; floors: number; height: number; dist: number; dir: string }[]
  amenities: { name: string; type: string; dist: number; dir: string }[]
  roads: { name: string; type: string; dist: number; dir: string }[]
  analysis: {
    marketPosition: string
    competitiveAdvantage: string
    risks: string[]
    opportunities: string[]
    comparableProjects: { name: string; type: string; floors: number; distance: number; relevance: string }[]
    recommendation: string
    priceEstimate: string
    neighborhoodScore: {
      transportation: number
      education: number
      commercial: number
      greenSpace: number
      development: number
    }
  }
}

interface Props {
  lat: number
  lng: number
  address: string
  buildingType: string
  floors: number
  units: number
  siteArea: number
  gfa: number
  strategy: string
  onResult?: (result: NearbyAnalysisResult) => void
}

export type { NearbyAnalysisResult }

export default function NearbyAnalysisCard({ lat, lng, address, buildingType, floors, units, siteArea, gfa, strategy, onResult }: Props) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<NearbyAnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  const fetchAnalysis = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/nearby-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng, address, buildingType, floors, units, siteArea, gfa, strategy }),
      })
      const data = await res.json()
      if (data.success) {
        setResult(data)
        onResult?.(data)
      } else {
        setError(data.error || '분석 실패')
      }
    } catch (e: any) {
      setError(e.message || '네트워크 오류')
    } finally {
      setLoading(false)
    }
  }

  const ns = result?.analysis?.neighborhoodScore
  const scoreLabels = [
    { key: 'transportation', label: '교통', icon: '🚇', color: '#0d9488' },
    { key: 'education', label: '교육', icon: '🎓', color: '#7c3aed' },
    { key: 'commercial', label: '상업', icon: '🏪', color: '#ea580c' },
    { key: 'greenSpace', label: '녹지', icon: '🌳', color: '#16a34a' },
    { key: 'development', label: '개발', icon: '🏗️', color: '#2563eb' },
  ]

  if (!result) {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏙️</span>
            <div>
              <h3 className="text-sm font-bold text-slate-800">주변 프로젝트 분석</h3>
              <p className="text-[10px] text-slate-500">AI 기반 주변 시장 분석 · 반경 300m</p>
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-600 mb-3">
          Gemini AI가 반경 300m 내 건물·편의시설·도로를 분석하여 시장 포지셔닝, 경쟁 우위, 리스크/기회, 분양가 추정을 제공합니다.
        </p>
        <button
          onClick={fetchAnalysis}
          disabled={loading || !lat || !lng}
          className="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="animate-spin">⏳</span>
              <span>주변 분석 중... (10~20초)</span>
            </>
          ) : (
            <>
              <span>🔍</span>
              <span>주변 프로젝트 분석 시작</span>
            </>
          )}
        </button>
        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      </div>
    )
  }

  const a = result.analysis
  const s = result.summary

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏙️</span>
            <div>
              <h3 className="text-sm font-bold text-white">주변 프로젝트 분석</h3>
              <p className="text-[10px] text-blue-200">반경 300m · 건물 {s.totalBuildings}개 · AI 분석 완료</p>
            </div>
          </div>
          <button onClick={() => setExpanded(!expanded)} className="text-white/70 hover:text-white text-xs">
            {expanded ? '접기 ▲' : '더보기 ▼'}
          </button>
        </div>
      </div>

      {/* 입지 점수 5개 */}
      <div className="px-4 py-3 border-b border-slate-100">
        <p className="text-[10px] font-semibold text-slate-500 mb-2">입지 경쟁력 점수</p>
        <div className="grid grid-cols-5 gap-2">
          {scoreLabels.map(sl => {
            const score = ns?.[sl.key as keyof typeof ns] || 0
            return (
              <div key={sl.key} className="text-center">
                <p className="text-sm mb-0.5">{sl.icon}</p>
                <p className="text-[9px] text-slate-500">{sl.label}</p>
                <p className="text-lg font-bold" style={{ color: sl.color }}>{score}</p>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-0.5">
                  <div className="h-full rounded-full transition-all" style={{ width: `${score * 10}%`, background: sl.color }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 시장 포지셔닝 */}
      <div className="px-4 py-3 border-b border-slate-100">
        <p className="text-[10px] font-semibold text-slate-500 mb-1">📊 시장 포지셔닝</p>
        <p className="text-xs text-slate-700 leading-relaxed">{a.marketPosition}</p>
      </div>

      {/* 경쟁 우위 */}
      <div className="px-4 py-3 border-b border-slate-100">
        <p className="text-[10px] font-semibold text-slate-500 mb-1">🏆 경쟁 우위</p>
        <p className="text-xs text-slate-700 leading-relaxed">{a.competitiveAdvantage}</p>
      </div>

      {/* 리스크 / 기회 */}
      <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100">
        <div className="px-4 py-3">
          <p className="text-[10px] font-semibold text-red-500 mb-1.5">⚠️ 리스크</p>
          {a.risks?.map((r, i) => (
            <p key={i} className="text-[11px] text-slate-600 mb-1 flex gap-1">
              <span className="text-red-400 flex-shrink-0">•</span> {r}
            </p>
          ))}
        </div>
        <div className="px-4 py-3">
          <p className="text-[10px] font-semibold text-emerald-600 mb-1.5">💡 기회</p>
          {a.opportunities?.map((o, i) => (
            <p key={i} className="text-[11px] text-slate-600 mb-1 flex gap-1">
              <span className="text-emerald-400 flex-shrink-0">•</span> {o}
            </p>
          ))}
        </div>
      </div>

      {/* 분양가 추정 */}
      {a.priceEstimate && (
        <div className="px-4 py-3 border-b border-slate-100 bg-amber-50/50">
          <p className="text-[10px] font-semibold text-amber-700 mb-1">💰 시세 및 분양가 추정</p>
          <p className="text-xs text-slate-700 leading-relaxed">{a.priceEstimate}</p>
        </div>
      )}

      {/* 종합 제안 */}
      <div className="px-4 py-3 border-b border-slate-100 bg-blue-50/50">
        <p className="text-[10px] font-semibold text-blue-700 mb-1">🎯 종합 제안</p>
        <p className="text-xs text-slate-700 leading-relaxed">{a.recommendation}</p>
      </div>

      {/* 확장 영역 */}
      {expanded && (
        <>
          {/* 비교 대상 프로젝트 */}
          {a.comparableProjects?.length > 0 && (
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-[10px] font-semibold text-slate-500 mb-2">🏢 비교 대상 프로젝트</p>
              {a.comparableProjects.map((cp, i) => (
                <div key={i} className="flex items-start gap-2 mb-2 last:mb-0 p-2 bg-slate-50 rounded-lg">
                  <span className="text-lg">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800">{cp.name}</p>
                    <p className="text-[10px] text-slate-500">{cp.type} · {cp.floors}층 · {cp.distance}m</p>
                    <p className="text-[10px] text-slate-600 mt-0.5">{cp.relevance}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 주변 건물 통계 */}
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-[10px] font-semibold text-slate-500 mb-2">📈 주변 건물 통계 (300m)</p>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2 bg-slate-50 rounded-lg">
                <p className="text-lg font-bold text-slate-800">{s.totalBuildings}</p>
                <p className="text-[9px] text-slate-500">총 건물</p>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg">
                <p className="text-lg font-bold text-blue-600">{s.avgFloors}</p>
                <p className="text-[9px] text-slate-500">평균 층수</p>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg">
                <p className="text-lg font-bold text-amber-600">{s.maxFloors}</p>
                <p className="text-[9px] text-slate-500">최고 층수</p>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg">
                <p className="text-lg font-bold text-emerald-600">{s.residentialCount}</p>
                <p className="text-[9px] text-slate-500">주거 건물</p>
              </div>
            </div>
          </div>

          {/* 주변 편의시설 */}
          {result.amenities.length > 0 && (
            <div className="px-4 py-3">
              <p className="text-[10px] font-semibold text-slate-500 mb-1.5">🏪 주변 편의시설</p>
              <div className="flex flex-wrap gap-1.5">
                {result.amenities.slice(0, 8).map((a, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                    {a.name || a.type} ({a.dist}m)
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* 재분석 버튼 */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex justify-end">
        <button
          onClick={fetchAnalysis}
          disabled={loading}
          className="text-[10px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
        >
          {loading ? '분석 중...' : '🔄 재분석'}
        </button>
      </div>
    </div>
  )
}
