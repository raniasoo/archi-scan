"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Building2, MapPin, Ruler, TrendingUp, FileText, ArrowRight } from "lucide-react"

interface ShareData {
  address: string
  siteArea: number
  zoneType: string
  layoutName: string
  snapshotData: any
  viewCount: number
  createdAt: string
}

export default function SharePage() {
  const params = useParams()
  const id = params?.id as string
  const [data, setData] = useState<ShareData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    fetch(`/api/share?id=${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setData(d)
        else setError(d.error || '프로젝트를 찾을 수 없습니다')
      })
      .catch(() => setError('데이터 로드 실패'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center animate-pulse">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <p className="text-slate-400">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-slate-500" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">프로젝트를 찾을 수 없습니다</h1>
          <p className="text-slate-400 mb-6">{error || '링크가 만료되었거나 존재하지 않습니다'}</p>
          <a href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-500 transition-colors">
            Archi-Scan 시작하기 <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    )
  }

  const snap = data.snapshotData
  const roi = snap?.feasibility?.roi ?? snap?.roi
  const totalCost = snap?.feasibility?.totalProjectCost ?? snap?.totalProjectCost
  const expectedProfit = snap?.feasibility?.expectedProfit ?? snap?.expectedProfit
  const floors = snap?.floors ?? snap?.layout?.floors
  const units = snap?.units ?? snap?.layout?.units
  const coverage = snap?.coverage ?? snap?.layout?.coverage
  const far = snap?.far ?? snap?.floorAreaRatio

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* 헤더 */}
      <header className="border-b border-slate-800 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-teal-400">Archi-Scan</span>
          </a>
          <span className="text-xs text-slate-500">공유된 프로젝트</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* 프로젝트 제목 */}
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
            <MapPin className="h-4 w-4" />
            <span>대상지</span>
          </div>
          <h1 className="text-xl font-bold">{data.address}</h1>
          {data.layoutName && (
            <p className="text-teal-400 mt-1 text-sm font-medium">{data.layoutName}</p>
          )}
        </div>

        {/* 핵심 지표 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
            <p className="text-xs text-slate-400 mb-1">대지면적</p>
            <p className="text-lg font-bold">{data.siteArea?.toLocaleString()} ㎡</p>
          </div>
          <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
            <p className="text-xs text-slate-400 mb-1">용도지역</p>
            <p className="text-lg font-bold">{data.zoneType || '-'}</p>
          </div>
          {floors && (
            <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
              <p className="text-xs text-slate-400 mb-1">규모</p>
              <p className="text-lg font-bold">지상 {floors}층 · {units}세대</p>
            </div>
          )}
          {coverage && (
            <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
              <p className="text-xs text-slate-400 mb-1">건폐율/용적률</p>
              <p className="text-lg font-bold">{coverage}% / {far}%</p>
            </div>
          )}
        </div>

        {/* ROI */}
        {roi !== undefined && (
          <div className={`rounded-xl p-5 border ${roi > 15 ? 'bg-emerald-950/30 border-emerald-800' : roi > 5 ? 'bg-amber-950/30 border-amber-800' : 'bg-red-950/30 border-red-800'}`}>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-5 w-5" />
              <span className="font-semibold">사업성 분석</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-slate-400 mb-1">ROI</p>
                <p className={`text-2xl font-bold ${roi > 15 ? 'text-emerald-400' : roi > 5 ? 'text-amber-400' : 'text-red-400'}`}>{roi?.toFixed(1)}%</p>
              </div>
              {totalCost && (
                <div>
                  <p className="text-xs text-slate-400 mb-1">총사업비</p>
                  <p className="text-lg font-bold">{(totalCost / 100000000).toFixed(1)}억</p>
                </div>
              )}
              {expectedProfit && (
                <div>
                  <p className="text-xs text-slate-400 mb-1">예상수익</p>
                  <p className="text-lg font-bold">{(expectedProfit / 100000000).toFixed(1)}억</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="text-center pt-4">
          <a
            href="/"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-teal-600 to-teal-500 text-white rounded-xl font-semibold hover:from-teal-500 hover:to-teal-400 transition-all shadow-lg shadow-teal-500/20"
          >
            나도 분석해보기 <ArrowRight className="h-5 w-5" />
          </a>
          <p className="text-xs text-slate-500 mt-3">
            조회수 {data.viewCount}회 · {new Date(data.createdAt).toLocaleDateString('ko-KR')} 생성
          </p>
        </div>
      </main>
    </div>
  )
}
