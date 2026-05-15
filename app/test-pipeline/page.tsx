"use client"
import { useState } from "react"
import { captureBuilding3D } from "@/lib/offscreen-3d-capture"
import { getBuildingGeometry } from "@/lib/building-geometry"

const SAMPLES = [
  { addr:"서울 종로구 평창길 180",    zone:"1종전주", sa:593,  cv:50, fl:2, u:1,   t:'courtyard', bc:1, style:'premium' },
  { addr:"서울 강남구 역삼동 737",    zone:"일반상업", sa:3200, cv:50, fl:12, u:120, t:'tower',     bc:1, style:'modern-luxury' },
  { addr:"서울 마포구 상수동 72",     zone:"2종일주", sa:450,  cv:55, fl:3, u:8,   t:'lshape',    bc:1, style:'eco-friendly' },
  { addr:"서울 서초구 반포동 20-7",   zone:"3종일주", sa:1200, cv:50, fl:5, u:20,  t:'courtyard', bc:1, style:'korean-modern' },
  { addr:"서울 성동구 성수동 685",    zone:"준공업",  sa:2500, cv:55, fl:5, u:72,  t:'cluster',   bc:3, style:'urban-complex', ot:'linear' },
  { addr:"서울 용산구 한남동 683",    zone:"1종일주", sa:350,  cv:50, fl:3, u:4,   t:'tower',     bc:1, style:'premium' },
  { addr:"경기 성남시 판교동 680",    zone:"2종일주", sa:800,  cv:55, fl:4, u:12,  t:'linear',    bc:1, style:'minimal' },
  { addr:"서울 송파구 잠실동 40-1",   zone:"일반상업", sa:5000, cv:55, fl:10,u:200, t:'tower',     bc:1, style:'modern-luxury' },
  { addr:"서울 종로구 삼청동 35",     zone:"1종전주", sa:280,  cv:50, fl:2, u:1,   t:'tower',     bc:1, style:'hanok-modern' },
  { addr:"서울 영등포구 여의도동 45",  zone:"준주거",  sa:1800, cv:55, fl:7, u:52,  t:'cluster',   bc:2, style:'urban-complex', ot:'tower' },
]

type Result = {
  addr: string; status: 'pending'|'capturing'|'rendering'|'scoring'|'done'|'error'
  geoMatch?: number; captureCount?: number; renderImage?: string
  score?: number; floorsDetected?: number; shapeMatch?: string; error?: string
  duration?: number
}

export default function TestPipeline() {
  const [results, setResults] = useState<Result[]>(SAMPLES.map(s => ({ addr: s.addr, status: 'pending' })))
  const [running, setRunning] = useState(false)
  const [currentIdx, setCurrentIdx] = useState(-1)

  const runTest = async (idx: number) => {
    const s = SAMPLES[idx]
    const startTime = Date.now()
    const update = (patch: Partial<Result>) => {
      setResults(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r))
    }

    try {
      // ① 건물 치수 검증
      update({ status: 'capturing' })
      const geo = getBuildingGeometry({
        type: s.t, coverage: s.cv, siteArea: s.sa, floors: s.fl,
        buildingCount: s.bc, originalType: s.ot,
      })
      const layoutFP = s.sa * s.cv / 100
      const geoMatch = Math.round(Math.min(geo.totalFootprint/layoutFP, layoutFP/geo.totalFootprint) * 100)

      // ② 오프스크린 Three.js 5방향 캡처
      const captures = await captureBuilding3D({
        type: s.t, coverage: s.cv, siteArea: s.sa, floors: s.fl,
        units: s.u, buildingCount: s.bc, originalType: s.ot,
      })
      update({ captureCount: captures.length, geoMatch })

      // ③ AI 렌더링 (3d-to-photo 전체 파이프라인)
      update({ status: 'rendering' })
      const res = await fetch('/api/3d-to-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          multiAngle: captures,
          layoutName: s.addr.split(' ').pop(),
          floors: s.fl, units: s.u, type: s.t,
          buildingCount: s.bc, address: s.addr,
          stylePrompt: '', styleName: '모던',
        }),
      })
      const data = await res.json()
      
      if (data.success && data.image) {
        update({
          status: 'done',
          renderImage: data.image,
          score: data.score,
          floorsDetected: data.floorsDetected,
          shapeMatch: data.shapeMatch,
          duration: Math.round((Date.now() - startTime) / 1000),
        })
      } else {
        update({ status: 'error', error: data.error || 'No image returned', duration: Math.round((Date.now() - startTime) / 1000) })
      }
    } catch (e: any) {
      update({ status: 'error', error: e.message, duration: Math.round((Date.now() - startTime) / 1000) })
    }
  }

  const runAll = async () => {
    setRunning(true)
    for (let i = 0; i < SAMPLES.length; i++) {
      setCurrentIdx(i)
      await runTest(i)
      // 1초 간격 (API 부하 방지)
      if (i < SAMPLES.length - 1) await new Promise(r => setTimeout(r, 1000))
    }
    setCurrentIdx(-1)
    setRunning(false)
  }

  const avgScore = results.filter(r => r.score).reduce((s, r) => s + (r.score || 0), 0) / Math.max(results.filter(r => r.score).length, 1)
  const avgGeo = results.filter(r => r.geoMatch).reduce((s, r) => s + (r.geoMatch || 0), 0) / Math.max(results.filter(r => r.geoMatch).length, 1)
  const doneCount = results.filter(r => r.status === 'done').length
  const errorCount = results.filter(r => r.status === 'error').length

  const TYPE_KR: Record<string, string> = { tower:'타워', linear:'판상', lshape:'ㄱ자', courtyard:'중정', cluster:'클러스터' }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">🧪 Archi-Scan 파이프라인 자동 테스트</h1>
        <p className="text-sm text-white/50 mb-4">10개 주소 × 전체 파이프라인 (배치안→Three.js→5방향캡처→AI렌더링→자동점수)</p>
        
        {/* 종합 대시보드 */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
            <div className="text-3xl font-bold text-emerald-400">{doneCount}/10</div>
            <div className="text-xs text-white/40 mt-1">완료</div>
          </div>
          <div className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
            <div className="text-3xl font-bold text-blue-400">{avgGeo ? Math.round(avgGeo) : '—'}%</div>
            <div className="text-xs text-white/40 mt-1">건축면적 일치</div>
          </div>
          <div className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
            <div className="text-3xl font-bold text-amber-400">{avgScore ? Math.round(avgScore) : '—'}점</div>
            <div className="text-xs text-white/40 mt-1">AI 렌더링 점수</div>
          </div>
          <div className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
            <div className="text-3xl font-bold text-red-400">{errorCount}</div>
            <div className="text-xs text-white/40 mt-1">에러</div>
          </div>
        </div>

        {/* 실행 버튼 */}
        <button onClick={runAll} disabled={running}
          className={`w-full py-3 rounded-xl font-bold text-lg mb-6 transition-all ${running ? 'bg-white/10 text-white/30 cursor-not-allowed' : 'bg-gradient-to-r from-teal-400 to-emerald-500 text-white hover:scale-[1.01]'}`}>
          {running ? `⏳ 테스트 중... (${currentIdx + 1}/10)` : '🚀 10개 주소 전체 테스트 시작'}
        </button>

        {/* 결과 목록 */}
        <div className="space-y-3">
          {SAMPLES.map((s, i) => {
            const r = results[i]
            return (
              <div key={i} className={`rounded-xl border p-4 transition-all ${
                r.status === 'done' ? 'border-emerald-500/30 bg-emerald-500/5' :
                r.status === 'error' ? 'border-red-500/30 bg-red-500/5' :
                r.status !== 'pending' ? 'border-blue-500/30 bg-blue-500/5' :
                'border-white/10 bg-white/[0.02]'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{i+1}. {s.addr}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-white/50">
                        {TYPE_KR[s.t]} {s.fl}층 {s.u}세대
                      </span>
                    </div>
                    <div className="text-xs text-white/40 mt-1">
                      {r.status === 'pending' && '⏸ 대기 중'}
                      {r.status === 'capturing' && '🧊 Three.js 5방향 캡처 중...'}
                      {r.status === 'rendering' && '🎨 AI 3장 생성 + 자동 선별 중...'}
                      {r.status === 'done' && `✅ ${r.duration}초 | 건축면적 ${r.geoMatch}% | 캡처 ${r.captureCount}장 | AI점수 ${r.score}점 (${r.floorsDetected}층감지, 형태:${r.shapeMatch})`}
                      {r.status === 'error' && `❌ ${r.error?.slice(0, 80)}`}
                    </div>
                  </div>
                  {r.renderImage && (
                    <img src={r.renderImage} alt="" className="w-24 h-24 rounded-lg object-cover ml-3 border border-white/10" />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
