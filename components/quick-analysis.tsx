"use client"

import { useState } from "react"
import { Building2, Search, Loader2, TrendingUp, Clock, MapPin, ArrowRight, ChevronDown, FileText, Sparkles } from "lucide-react"

interface QuickAnalysisProps {
  onDetailedAnalysis: (address: string, siteArea: number, data: any) => void
}

interface QuickResult {
  address: string
  siteArea: number
  zoneType: string
  zoneName: string
  buildingCoverage: number
  floorAreaRatio: number
  heightLimit: number
  bestLayout: { name: string; floors: number; units: number; coverage: number; roi: number; totalCost: number; expectedProfit: number }
  verdict: string
  verdictColor: string
  verdictEmoji: string
  overlappingCount: number
  rawData: any
}

export function QuickAnalysis({ onDetailedAnalysis }: QuickAnalysisProps) {
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')
  const [result, setResult] = useState<QuickResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showMore, setShowMore] = useState(false)

  const analyze = async () => {
    if (!address.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // 1단계: 국토부 조회
      setProgress('🏛 국토부 데이터 조회 중...')
      const molitRes = await fetch('/api/molit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: address.trim() }),
      })
      const molitData = await molitRes.json()

      if (!molitData.success) {
        setError('주소를 찾을 수 없습니다. 정확한 도로명 주소를 입력해주세요.')
        return
      }

      const siteArea = molitData.data?.siteArea || molitData.data?.platArea || 660
      const rawZoneType = molitData.data?.zoneType || 'residential-2'
      const overlapping = molitData.data?.overlappingRegulations || []

      // 2단계: 법규 확인
      setProgress('⚖️ 건축 법규 분석 중...')
      const zoneMap: Record<string, { name: string; coverage: number; far: number; height: number }> = {
        'residential-1': { name: '제1종일반주거지역', coverage: 60, far: 200, height: 12 },
        'residential-2': { name: '제2종일반주거지역', coverage: 60, far: 250, height: 21 },
        'residential-3': { name: '제3종일반주거지역', coverage: 50, far: 300, height: 40 },
        'semi-residential': { name: '준주거지역', coverage: 70, far: 500, height: 40 },
        'commercial-neighborhood': { name: '근린상업지역', coverage: 70, far: 900, height: 60 },
        'commercial-general': { name: '일반상업지역', coverage: 80, far: 1300, height: 80 },
        'commercial-central': { name: '중심상업지역', coverage: 90, far: 1500, height: 100 },
        'residential-exclusive-1': { name: '제1종전용주거지역', coverage: 50, far: 100, height: 10 },
        'residential-exclusive-2': { name: '제2종전용주거지역', coverage: 50, far: 150, height: 12 },
      }
      // 한글 용도지역명 → 영문코드 역매핑 (MOLIT API는 한글로 반환)
      const koreanToCode: Record<string, string> = {}
      for (const [code, info] of Object.entries(zoneMap)) {
        koreanToCode[info.name] = code
      }
      // 부분매칭: "제1종일반주거지역" 또는 "제1종 일반주거지역" 등 공백 유무 대응
      const normalizedZone = rawZoneType.replace(/\s+/g, '')
      const zoneCode = koreanToCode[normalizedZone] || koreanToCode[rawZoneType] || rawZoneType
      const zone = zoneMap[zoneCode] || zoneMap['residential-2']

      // 3단계: 배치안 + 사업성 자동 계산
      setProgress('📐 AI 배치안 생성 중...')
      await new Promise(r => setTimeout(r, 500))

      const effectiveCoverage = Math.min(zone.coverage, molitData.data?.buildingCoverage || zone.coverage)
      const buildingArea = siteArea * (effectiveCoverage / 100)
      const maxFloors = Math.min(Math.floor(zone.far / effectiveCoverage), Math.floor(zone.height / 3.3))
      const floors = Math.max(maxFloors, 2)
      const gfa = buildingArea * floors
      const unitArea = 84
      const unitsPerFloor = Math.floor(buildingArea * 0.65 / unitArea)
      const totalUnits = unitsPerFloor * Math.max(floors - 1, 1)

      // 사업성 계산
      setProgress('💰 사업성 분석 중...')
      const constructionCostPerM2 = 2800000
      const totalCost = gfa * constructionCostPerM2 + siteArea * 5000000
      const salesPricePerM2 = 8000000
      const totalRevenue = gfa * 0.85 * salesPricePerM2
      const profit = totalRevenue - totalCost
      const roi = totalCost > 0 ? (profit / totalCost * 100) : 0

      let verdict = '', verdictColor = '', verdictEmoji = ''
      if (roi >= 20) { verdict = '적극 추진 권장'; verdictColor = '#16a34a'; verdictEmoji = '🟢' }
      else if (roi >= 10) { verdict = '사업 추진 가능'; verdictColor = '#2563eb'; verdictEmoji = '🔵' }
      else if (roi >= 0) { verdict = '조건부 추진 검토'; verdictColor = '#d97706'; verdictEmoji = '🟡' }
      else { verdict = '추가 검토 필요'; verdictColor = '#dc2626'; verdictEmoji = '🔴' }

      setResult({
        address: address.trim(),
        siteArea,
        zoneType: zoneCode,
        zoneName: zone.name,
        buildingCoverage: effectiveCoverage,
        floorAreaRatio: Math.round(gfa / siteArea * 100),
        heightLimit: zone.height,
        bestLayout: {
          name: 'AI 추천 배치안',
          floors,
          units: totalUnits,
          coverage: effectiveCoverage,
          roi: Math.round(roi * 10) / 10,
          totalCost: Math.round(totalCost / 100000000 * 10) / 10,
          expectedProfit: Math.round(profit / 100000000 * 10) / 10,
        },
        verdict, verdictColor, verdictEmoji,
        overlappingCount: overlapping.length,
        rawData: molitData.data,
      })

    } catch (e) {
      setError(e instanceof Error ? e.message : '분석 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
      setProgress('')
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 헤더 */}
      <div className="border-b border-border/50 bg-background/95 backdrop-blur px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <span className="font-bold text-sm">Archi-Scan</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">AI 건축 분석</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-2xl mx-auto w-full">
        {!result ? (
          <>
            {/* 입력 화면 */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-black mb-2">건축 사업성, 주소 하나로</h1>
              <p className="text-sm text-muted-foreground">도로명 주소를 입력하면 30초 만에 분석 결과를 알려드립니다</p>
            </div>

            <div className="w-full space-y-3">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && analyze()}
                  placeholder="예: 서울특별시 종로구 평창12길 16-6"
                  className="w-full pl-9 pr-4 py-3.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  disabled={loading}
                />
              </div>

              <button
                onClick={analyze}
                disabled={loading || !address.trim()}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-emerald-600 text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />{progress}</>
                ) : (
                  <><Search className="h-4 w-4" />사업성 분석하기</>
                )}
              </button>

              {error && (
                <p className="text-xs text-red-400 text-center">{error}</p>
              )}
            </div>

            <p className="text-[10px] text-muted-foreground mt-6 text-center">
              국토부 건축물대장 · VWorld · AI 자동 분석 · 30초 소요
            </p>
          </>
        ) : (
          <>
            {/* 결과 카드 */}
            <div className="w-full space-y-4">
              {/* 주소 + 판정 */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">분석 대상</p>
                    <p className="text-sm font-bold">{result.address}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {result.zoneName} · {result.siteArea.toLocaleString()}㎡
                      {result.overlappingCount > 0 && ` · 중첩규제 ${result.overlappingCount}개`}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl">{result.verdictEmoji}</span>
                  </div>
                </div>

                {/* 판정 */}
                <div className="rounded-xl p-4 text-center mb-4" style={{ backgroundColor: result.verdictColor + '15', border: `2px solid ${result.verdictColor}40` }}>
                  <p className="text-[10px] text-muted-foreground mb-1">종합 판정</p>
                  <p className="text-lg font-black" style={{ color: result.verdictColor }}>{result.verdict}</p>
                </div>

                {/* 핵심 수치 3개 */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-3 rounded-xl bg-card border border-border/50">
                    <p className="text-[9px] text-muted-foreground">예상 수익</p>
                    <p className={`text-lg font-black ${result.bestLayout.expectedProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {result.bestLayout.expectedProfit >= 0 ? '+' : ''}{result.bestLayout.expectedProfit}억
                    </p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-card border border-border/50">
                    <p className="text-[9px] text-muted-foreground">ROI</p>
                    <p className={`text-lg font-black ${result.bestLayout.roi >= 10 ? 'text-emerald-400' : result.bestLayout.roi >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
                      {result.bestLayout.roi}%
                    </p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-card border border-border/50">
                    <p className="text-[9px] text-muted-foreground">총사업비</p>
                    <p className="text-lg font-black text-foreground">{result.bestLayout.totalCost}억</p>
                  </div>
                </div>
              </div>

              {/* 더 보기 */}
              <button onClick={() => setShowMore(!showMore)} className="w-full flex items-center justify-center gap-1 py-2 text-xs text-muted-foreground">
                {showMore ? '접기' : '건축 개요 보기'}
                <ChevronDown className={`h-3 w-3 transition-transform ${showMore ? 'rotate-180' : ''}`} />
              </button>

              {showMore && (
                <div className="rounded-xl border border-border bg-card p-4 space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">규모</span><span className="font-semibold">지상 {result.bestLayout.floors}층, {result.bestLayout.units}세대</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">건폐율</span><span className="font-semibold">{result.buildingCoverage}%</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">용적률</span><span className="font-semibold">{result.floorAreaRatio}%</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">높이제한</span><span className="font-semibold">{result.heightLimit}m</span></div>
                  {result.overlappingCount > 0 && (
                    <div className="flex justify-between"><span className="text-muted-foreground">중첩 규제</span><span className="font-semibold text-amber-400">{result.overlappingCount}개 적용</span></div>
                  )}
                </div>
              )}

              {/* 액션 버튼 */}
              <div className="space-y-2">
                <button
                  onClick={() => onDetailedAnalysis(result.address, result.siteArea, result.rawData)}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  상세 분석 · AI 배치안 · 보고서
                  <ArrowRight className="h-4 w-4" />
                </button>

                <button
                  onClick={() => { setResult(null); setAddress('') }}
                  className="w-full py-2.5 rounded-xl border border-border text-sm text-muted-foreground"
                >
                  다른 주소 분석
                </button>
              </div>

              <p className="text-[9px] text-muted-foreground text-center">
                상세 분석에서 AI 렌더링, 설계 상담, 사업 제안서, PDF 보고서를 이용할 수 있습니다
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
