"use client"

import { useState, useEffect, useRef } from "react"
import { trackQuickAnalysisStart, trackQuickAnalysisComplete } from "@/components/google-analytics"
import { Building2, Search, Loader2, TrendingUp, Clock, MapPin, ArrowRight, ChevronDown, FileText, Sparkles, ImageIcon, Mountain } from "lucide-react"
import { type TerrainAnalysis } from "@/lib/terrain-analysis"
import { analyzeSunAndView, type SunAnalysisResult } from "@/lib/sun-analysis"
import { buildSiteContextPrompt } from "@/lib/site-context-builder"
import { calculateFeasibility } from "@/lib/project-analysis-state"
import { getRegionalPricing, getZoneMultiplier } from "@/lib/regional-pricing"
import { useSubscription } from "@/components/subscription-provider"

interface QuickAnalysisProps {
  onDetailedAnalysis: (address: string, siteArea: number, data: any, renderImage?: string | null) => void
  strategy?: string
  userValues?: { profitVsQuality: number; privacyVsCommunity: number; efficiencyVsSpace: number; selectedPatterns: string[] }
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
  overlappingNames?: string[]
  farRatio?: number
  rawData: any
}

export function QuickAnalysis({ onDetailedAnalysis, strategy, userValues }: QuickAnalysisProps) {
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')
  const [result, setResult] = useState<QuickResult | null>(null)
  const { checkAndTrackUsage, canAnalyze, monthlyUsage, monthlyLimit, isProUser, setShowUpgradeModal } = useSubscription()
  const [error, setError] = useState<string | null>(null)
  const [showMore, setShowMore] = useState(false)

  // AI 렌더링 상태
  const [renderImage, setRenderImage] = useState<string | null>(null)
  const [renderLoading, setRenderLoading] = useState(false)
  
  const [siteContext, setSiteContext] = useState<any>(null)
  const [vworldState, setVworldState] = useState<any>(null)
  const [terrain, setTerrain] = useState<TerrainAnalysis | null>(null)
  const [sunAnalysis, setSunAnalysis] = useState<SunAnalysisResult | null>(null)

  // 결과가 나오면 AI 렌더링 자동 시작 (1회만, 3초 딜레이)
  const renderStarted = useRef(false)
  useEffect(() => {
    if (!result) { renderStarted.current = false; return }
    if (renderStarted.current) return
    renderStarted.current = true
    setRenderLoading(true)

    const timer = setTimeout(async () => {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await fetch('/api/ai-render', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: `${result.zoneName} ${result.bestLayout.floors}층 ${result.bestLayout.units}세대 주거건물, 대지면적 ${result.siteArea}㎡`,
              style: 'modern-luxury',
              cameraAngle: 'eye-level',
              sceneMode: 'afternoon',
              address: result.address,
              layoutName: result.bestLayout.name || 'AI 추천 배치안',
              floors: result.bestLayout.floors,
              units: result.bestLayout.units,
              siteArea: result.siteArea,
              buildingType: result.bestLayout.type,
              coverage: result.buildingCoverage,
              strategy: strategy || 'profitability',
              values: userValues ? {
                profitVsQuality: userValues.profitVsQuality,
                privacyVsCommunity: userValues.privacyVsCommunity,
                efficiencyVsSpace: userValues.efficiencyVsSpace,
              } : undefined,
              patterns: userValues?.selectedPatterns,
              surroundingContext: (() => {
                try {
                  const ctx = buildSiteContextPrompt({
                    address: result.address, siteArea: result.siteArea,
                    polygon: vworldState?.parcel?.polygon, centroid: vworldState?.parcel?.centroid,
                    nearbyBuildings: vworldState?.nearbyBuildings, siteContext: vworldState?.context,
                    terrain, sunAnalysis, elevation: terrain?.maxElevation,
                    floors: result.bestLayout.floors, buildingHeight: result.bestLayout.floors * 3.3,
                    directions: vworldState?.directions, roadSummary: vworldState?.roadSummary,
                    shadowBlockers: vworldState?.shadowBlockers, nearbyRenderPrompt: vworldState?.renderPrompt,
                  })
                  return ctx.fullPrompt || undefined
                } catch { return undefined }
              })(),
              satelliteUrl: vworldState?.satelliteUrl,
              cadastralMapUrl: vworldState?.cadastralMapUrl,
              streetViewUrls: vworldState?.streetViewUrls,
              sitePolygon: vworldState?.parcel?.polygon,
              regulation: {
                heightLimit: result.heightLimit, farRatio: result.farRatio,
                zoneName: result.zoneName, northShadow: true, northShadowAngle: 45,
                overlappingRegs: result.overlappingNames,
              },
              terrainInfo: terrain ? {
                slopeDirection: terrain.slopeDirection,
                elevationDiff: terrain.elevationDiff,
                avgSlope: terrain.avgSlope,
              } : undefined,
            }),
          })
          const data = await res.json()
          if (data.success && data.image) {
            setRenderImage(data.image)
            setRenderLoading(false)
            console.log('[QuickAnalysis] AI 렌더링 성공 ✅')
            return
          }
          console.warn(`[QuickAnalysis] AI 렌더링 attempt ${attempt + 1} 실패:`, data.error)
        } catch (e) {
          console.warn(`[QuickAnalysis] AI 렌더링 attempt ${attempt + 1} 에러:`, e)
        }
        if (attempt < 1) await new Promise(r => setTimeout(r, 3000))
      }
      setRenderLoading(false)
    }, 3000) // 3초 딜레이 — vworldState 로딩 대기

    return () => clearTimeout(timer)
  }, [result]) // eslint-disable-line react-hooks/exhaustive-deps

  const analyze = async () => {
    if (!address.trim()) return

    // 사용량 체크 (무료 5회 초과 시 차단)
    const allowed = await checkAndTrackUsage()
    if (!allowed) return

    setLoading(true)
    setError(null)
    setResult(null)
    trackQuickAnalysisStart()
    setRenderImage(null)

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

      // 1.5단계: 대지 위치 + 주변환경 조회 (VWORLD)
      const entX = molitData.data?.entX
      const entY = molitData.data?.entY
      let vworldData: any = null
      if (entX && entY) {
        setProgress('🗺️ 대지 위치·주변환경 조회 중...')
        try {
          const vRes = await fetch('/api/vworld-site', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat: entY, lng: entX }),
          })
          const vJson = await vRes.json()
          if (vJson.success) {
            vworldData = vJson
            setVworldState(vJson)
            setSiteContext(vJson.context)
          }
        } catch (e) {
          console.warn('[VWORLD] 조회 실패:', e)
        }
      }

      // 1.6단계: 표고 데이터 → 경사도 분석 (대지 화면과 동일 API)
      let terrainResult: TerrainAnalysis | null = null
      if (entX && entY) {
        try {
          setProgress('⛰️ 지형·경사도 분석 중...')
          const eRes = await fetch(`/api/elevation?lng=${entX}&lat=${entY}`)
          const eData = await eRes.json()
          if (eData.success && eData.slope) {
            // /api/elevation 응답 → TerrainAnalysis 형식으로 변환
            const s = eData.slope
            const gradeMap: Record<string, TerrainAnalysis['slopeGrade']> = { '평탄': 'flat', '완만': 'gentle', '보통 경사': 'moderate', '급경사': 'steep', '매우 급경사': 'very-steep' }
            const slopeGrade = gradeMap[eData.grade] || (s.average < 2 ? 'flat' : s.average < 5 ? 'gentle' : s.average < 10 ? 'moderate' : s.average < 15 ? 'steep' : 'very-steep')

            // 토공량/비용 (경사도 기반 추정)
            const avgE = (s.minElevation + s.maxElevation) / 2
            const cutFill = s.elevRange * siteArea * 0.3 // 간이 추정
            const earthworkVolume = Math.round(cutFill)
            const earthworkCost = Math.round(cutFill * 27500) // 평균 단가

            const foundationType =
              slopeGrade === 'flat' ? '일반 매트 기초' :
              slopeGrade === 'gentle' ? '일반 매트 기초 (레벨 조정)' :
              slopeGrade === 'moderate' ? '계단식 기초 또는 파일 기초' :
              slopeGrade === 'steep' ? '파일 기초 + 옹벽' :
              '심층 파일 기초 + 대규모 옹벽'

            const dirStr = s.slopeDirection || '남'
            const dirDesc: Record<string, string> = {
              '남': '남향 경사 (북고남저)', '남서': '남서향 경사', '서': '서향 경사 (동고서저)',
              '북서': '북서향 경사', '북': '북향 경사 (남고북저)', '북동': '북동향 경사',
              '동': '동향 경사 (서고동저)', '남동': '남동향 경사',
            }

            terrainResult = {
              minElevation: s.minElevation,
              maxElevation: s.maxElevation,
              elevationDiff: s.elevRange,
              avgSlope: s.average,
              maxSlope: s.max,
              slopeDirection: dirDesc[dirStr] || dirStr + '향 경사',
              slopeGrade,
              earthworkVolume,
              earthworkCost,
              foundationType,
              description: `${eData.grade}(고저차 ${s.elevRange}m, 평균 경사 ${s.average}%), ${dirDesc[dirStr] || dirStr}`,
              renderHint: s.elevRange < 2 ? 'Flat terrain' : `Sloped site (${s.elevRange}m change, ${s.average}% grade), ${dirStr}-facing slope`,
            }
            setTerrain(terrainResult)
          }
        } catch (e) {
          console.warn('[TERRAIN] 조회 실패:', e)
        }
      }

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
      const koreanToCode: Record<string, string> = {}
      for (const [code, info] of Object.entries(zoneMap)) {
        koreanToCode[info.name] = code
      }
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

      // 3.5단계: 일조/조망 분석
      let sunResult: SunAnalysisResult | null = null
      const buildingH = floors * 3.3
      const nearbyBldgs = vworldData?.nearbyBuildings || []
      if (nearbyBldgs.length > 0 || buildingH > 0) {
        setProgress('☀️ 일조·조망 분석 중...')
        sunResult = analyzeSunAndView(floors, buildingH, nearbyBldgs, entY || 37.55)
        setSunAnalysis(sunResult)
      }

      // 사업성 계산 — page.tsx effectiveSalesPrice와 동일한 우선순위
      // 1순위: 실거래가 API → 2순위: 지역 테이블 → 3순위: 500만 fallback
      setProgress('💰 사업성 분석 중...')
      const earthworkCost = terrainResult?.earthworkCost || 0
      const parkingCount = Math.ceil(totalUnits * 1.0)
      
      // 실거래가 조회 (sigunguCode 있으면)
      let realPriceSalesPrice = 0
      const sigunguCode = molitData.data?.sigunguCode
      if (sigunguCode && sigunguCode.length >= 5) {
        try {
          const rpRes = await fetch(`/api/real-price?sigunguCd=${sigunguCode.slice(0, 5)}`)
          const rpData = await rpRes.json()
          if (rpData.suggestedSalePrice > 0) {
            realPriceSalesPrice = rpData.suggestedSalePrice
            console.log(`[QuickAnalysis] 실거래가 반영: ${(realPriceSalesPrice/10000).toFixed(0)}만/㎡ (${rpData.transactionCount}건)`)
          }
        } catch (e) {
          console.warn('[QuickAnalysis] 실거래가 조회 실패:', e)
        }
      }
      
      // effectiveSalesPrice 동일 우선순위: 실거래가 > 지역테이블 > fallback
      const regional = getRegionalPricing(sigunguCode, address.trim())
      const dynamicSalesPrice = realPriceSalesPrice > 0
        ? realPriceSalesPrice
        : Math.round(regional.salesPricePerM2 * getZoneMultiplier(zoneCode))
      const dynamicConstCost = regional.constructionCostPerM2
      const feasibility = calculateFeasibility({
        siteArea,
        grossFloorArea: gfa,
        unitCount: totalUnits,
        floorCount: floors,
        parkingCount,
        buildingCount: siteArea > 1500 && totalUnits > 20 ? Math.max(2, Math.ceil(totalUnits / (6 * floors))) : 1,
        landPricePerM2: 5000000,
        salesPricePerM2: dynamicSalesPrice,
        constructionCostPerM2: dynamicConstCost,
      })
      // 토공비 반영
      const totalCost = feasibility.totalCost + earthworkCost
      const profit = feasibility.totalRevenue - totalCost
      const roi = totalCost > 0 ? (profit / totalCost * 100) : 0

      let verdict = '', verdictColor = '', verdictEmoji = ''
      if (roi >= 20) { verdict = '적극 추진 권장'; verdictColor = '#16a34a'; verdictEmoji = '🟢' }
      else if (roi >= 10) { verdict = '사업 추진 가능'; verdictColor = '#2563eb'; verdictEmoji = '🔵' }
      else if (roi >= 0) { verdict = '조건부 추진 검토'; verdictColor = '#d97706'; verdictEmoji = '🟡' }
      else { verdict = '추가 검토 필요'; verdictColor = '#dc2626'; verdictEmoji = '🔴' }

      trackQuickAnalysisComplete(Math.round(roi * 10) / 10)
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
        overlappingNames: overlapping.map((r: any) => r.name).filter(Boolean),
        farRatio: zone.far,
        rawData: {
          ...molitData.data,
          vworld: vworldData,
          
          parcelPolygon: vworldData?.parcel?.polygon,
          nearbyBuildings: vworldData?.nearbyBuildings,
          siteContext: vworldData?.context,
          roads: vworldData?.roads,
          directions: vworldData?.directions,
          shadowBlockers: vworldData?.shadowBlockers,
          roadSummary: vworldData?.roadSummary,
          terrain: terrainResult,
          sunAnalysis: sunResult,
          satelliteUrl: vworldData?.satelliteUrl,
          cadastralMapUrl: vworldData?.cadastralMapUrl,
          streetViewUrls: vworldData?.streetViewUrls,
          // 실거래가 데이터 → 상세분석 전환 시 page.tsx effectiveSalesPrice에 반영
          _marketPrice: realPriceSalesPrice > 0 ? { suggestedSalePrice: realPriceSalesPrice } : undefined,
          _dynamicSalesPrice: dynamicSalesPrice,
        },
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

              {!isProUser && monthlyLimit !== Infinity && (
                <div className={`text-center text-[10px] ${canAnalyze ? 'text-muted-foreground' : 'text-destructive font-medium'}`}>
                  {canAnalyze
                    ? `이번 달 ${monthlyUsage}/${monthlyLimit}회 사용`
                    : `무료 분석 ${monthlyLimit}회 소진 · Pro 업그레이드로 무제한 이용`
                  }
                </div>
              )}

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

              {/* AI 렌더링 이미지 */}
              {(renderLoading || renderImage) && (
                <div className="rounded-2xl overflow-hidden border border-border relative">
                  {renderImage ? (
                    <div className="relative">
                      <img
                        src={renderImage}
                        alt="AI 건축 렌더링"
                        className="w-full aspect-[16/9] object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="h-3 w-3 text-emerald-400" />
                          <span className="text-[10px] text-white/90 font-medium">AI 건축 렌더링</span>
                          <span className="text-[9px] text-white/50 ml-auto">Nano Banana</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full aspect-[16/9] bg-card flex flex-col items-center justify-center gap-3">
                      <div className="relative">
                        <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                        <Loader2 className="h-4 w-4 text-primary animate-spin absolute -bottom-1 -right-1" />
                      </div>
                      <div className="text-center">
                        <p className="text-[11px] text-muted-foreground">🎨 AI 건축 렌더링 생성 중...</p>
                        <p className="text-[9px] text-muted-foreground/60 mt-0.5">약 15~30초 소요</p>
                      </div>
                      <div className="w-32 h-1 bg-border/50 rounded-full overflow-hidden">
                        <div className="h-full bg-primary/60 rounded-full animate-pulse" style={{ width: '60%' }} />
                      </div>
                    </div>
                  )}
                </div>
              )}

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

              {/* 지형 분석 결과 */}
              {terrain && terrain.elevationDiff > 0.3 && (
                <div className="rounded-xl border border-border p-3 bg-card/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Mountain className="h-3.5 w-3.5 text-amber-500" />
                      <span className="text-xs font-semibold">지형 분석</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      terrain.slopeGrade === 'flat' ? 'bg-emerald-500/10 text-emerald-500' :
                      terrain.slopeGrade === 'gentle' ? 'bg-blue-500/10 text-blue-500' :
                      terrain.slopeGrade === 'moderate' ? 'bg-amber-500/10 text-amber-500' :
                      'bg-red-500/10 text-red-500'
                    }`}>
                      {terrain.slopeGrade === 'flat' ? '평탄' : terrain.slopeGrade === 'gentle' ? '완만' : terrain.slopeGrade === 'moderate' ? '보통 경사' : '급경사'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[9px] text-muted-foreground">고저차</p>
                      <p className="text-sm font-bold">{terrain.elevationDiff}m</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground">평균 경사</p>
                      <p className="text-sm font-bold">{terrain.avgSlope}%</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground">경사 방향</p>
                      <p className="text-[10px] font-bold">{terrain.slopeDirection}</p>
                    </div>
                  </div>
                  {terrain.earthworkCost > 0 && (
                    <div className="text-[10px] text-muted-foreground bg-secondary/30 rounded-lg p-2">
                      📊 예상 토공량 {terrain.earthworkVolume.toLocaleString()}㎥ · 토공비 약 {Math.round(terrain.earthworkCost / 10000).toLocaleString()}만원
                      <br/>🏗️ 추천 기초: {terrain.foundationType}
                    </div>
                  )}
                </div>
              )}

              {/* 일조/조망 분석 */}
              {sunAnalysis && (
                <div className="rounded-xl border border-border p-3 bg-card/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">☀️</span>
                      <span className="text-xs font-semibold">일조·조망 분석</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      sunAnalysis.sunlightGrade === 'excellent' ? 'bg-emerald-500/10 text-emerald-500' :
                      sunAnalysis.sunlightGrade === 'good' ? 'bg-blue-500/10 text-blue-500' :
                      sunAnalysis.sunlightGrade === 'fair' ? 'bg-amber-500/10 text-amber-500' :
                      'bg-red-500/10 text-red-500'
                    }`}>
                      {sunAnalysis.sunlightGrade === 'excellent' ? '매우 양호' : sunAnalysis.sunlightGrade === 'good' ? '양호' : sunAnalysis.sunlightGrade === 'fair' ? '보통' : '불량'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[9px] text-muted-foreground">동지 일조</p>
                      <p className="text-sm font-bold">{sunAnalysis.sunlightHours}h</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground">그림자</p>
                      <p className="text-sm font-bold">{sunAnalysis.shadowLength}m</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground">최적 조망</p>
                      <p className="text-sm font-bold">{sunAnalysis.viewDirection}</p>
                    </div>
                  </div>
                  {/* 4방향 조망 */}
                  <div className="grid grid-cols-4 gap-1 text-center">
                    {(['north','east','south','west'] as const).map(dir => {
                      const d = sunAnalysis.directions[dir]
                      const names: Record<string,string> = { north:'북', south:'남', east:'동', west:'서' }
                      return (
                        <div key={dir} className={`p-1.5 rounded text-[9px] ${d.blocked ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                          <p className="font-bold">{names[dir]}</p>
                          <p>{d.blocked ? '차폐' : '개방'}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 주변환경 요약 */}
              {siteContext && siteContext.buildingCount > 0 && (
                <div className="rounded-xl border border-border p-2.5 bg-card/50 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 text-primary" />
                    <span className="text-[10px] font-medium">주변환경</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    건물 {siteContext.buildingCount}동{siteContext.avgFloors > 0 ? ` · 평균 ${siteContext.avgFloors}층 · 최고 ${siteContext.maxFloors}층` : ''}
                  </span>
                </div>
              )}

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
                  <div className="flex justify-between"><span className="text-muted-foreground">높이제한</span><span className="font-semibold">{result.heightLimit > 0 ? `${result.heightLimit}m` : '제한 없음'}</span></div>
                  {result.overlappingCount > 0 && (
                    <div className="flex justify-between"><span className="text-muted-foreground">중첩 규제</span><span className="font-semibold text-amber-400">{result.overlappingCount}개 적용</span></div>
                  )}
                </div>
              )}

              {/* 액션 버튼 */}
              <div className="space-y-2">
                <button
                  onClick={() => onDetailedAnalysis(result.address, result.siteArea, {
                    ...result.rawData,
                    // Quick에서 계산된 법규 데이터 추가
                    _quickZoneCode: result.zoneType,
                    _quickZoneName: result.zoneName,
                    _quickCoverage: result.buildingCoverage,
                    _quickFAR: result.floorAreaRatio,
                    _quickHeight: result.heightLimit,
                    _quickOverlapping: result.overlappingCount,
                  }, renderImage)}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  상세 분석 · AI 배치안 · 보고서
                  <ArrowRight className="h-4 w-4" />
                </button>

                <button
                  onClick={() => { setResult(null); setAddress(''); setRenderImage(null) }}
                  className="w-full py-2.5 rounded-xl border border-border text-sm text-muted-foreground"
                >
                  다른 주소 분석
                </button>

                {/* 간이 보고서 즉시 다운로드 */}
                <button
                  onClick={() => {
                    const roi = result.bestLayout.roi
                    const imgTag = renderImage ? `<img src="${renderImage}" style="width:100%;border-radius:8px;margin:12px 0;" alt="AI 렌더링"/>` : ''
                    const overlaps = result.overlappingNames?.slice(0, 5).map((n: string) => `<li>${n}</li>`).join('') || '<li>해당 없음</li>'
                    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Archi-Scan 간이 보고서</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#1a1a1a;padding:40px;max-width:800px;margin:0 auto;font-size:13px;line-height:1.6}h1{font-size:20px;margin-bottom:4px}h2{font-size:15px;margin:20px 0 8px;padding-bottom:4px;border-bottom:2px solid #10b981;color:#065f46}.header{border-bottom:3px solid #10b981;padding-bottom:16px;margin-bottom:20px}.subtitle{color:#6b7280;font-size:12px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:12px 0}.card{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;text-align:center}.card .value{font-size:22px;font-weight:800;color:#065f46}.card .label{font-size:10px;color:#6b7280;margin-bottom:2px}.verdict{background:${result.verdictColor === 'emerald' ? '#ecfdf5' : result.verdictColor === 'amber' ? '#fffbeb' : '#fef2f2'};border-radius:8px;padding:12px;margin:12px 0;font-weight:600;font-size:14px}table{width:100%;border-collapse:collapse;margin:8px 0}th,td{border:1px solid #e5e7eb;padding:6px 10px;text-align:left;font-size:12px}th{background:#f9fafb;font-weight:600}.footer{margin-top:24px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af;text-align:center}ul{padding-left:20px;margin:4px 0}li{margin:2px 0;font-size:12px}@media print{body{padding:20px}@page{size:A4;margin:15mm}}</style></head><body>
<div class="header"><h1>🏗️ Archi-Scan 개발사업 간이 보고서</h1><p class="subtitle">${result.address} · ${result.siteArea.toLocaleString()}㎡ · ${new Date().toLocaleDateString('ko-KR')}</p></div>
${imgTag}
<div class="verdict">${result.verdictEmoji} ${result.verdict}</div>
<h2>📊 대지 개요</h2>
<div class="grid"><div class="card"><div class="label">대지면적</div><div class="value">${result.siteArea.toLocaleString()}㎡</div></div><div class="card"><div class="label">용도지역</div><div class="value" style="font-size:16px">${result.zoneName}</div></div><div class="card"><div class="label">건폐율</div><div class="value">${result.buildingCoverage}%</div></div><div class="card"><div class="label">용적률</div><div class="value">${result.floorAreaRatio}%</div></div></div>
<h2>🏢 AI 추천 배치안: ${result.bestLayout.name}</h2>
<table><tr><th>항목</th><th>수치</th></tr><tr><td>층수</td><td>${result.bestLayout.floors}층</td></tr><tr><td>세대수</td><td>${result.bestLayout.units}세대</td></tr><tr><td>건폐율</td><td>${result.bestLayout.coverage}%</td></tr><tr><td>총사업비</td><td>${(result.bestLayout.totalCost / 1e8).toFixed(1)}억원</td></tr><tr><td>예상수익</td><td>${(result.bestLayout.expectedProfit / 1e8).toFixed(1)}억원</td></tr><tr><td>ROI</td><td style="color:${roi >= 0 ? '#059669' : '#dc2626'};font-weight:700">${roi.toFixed(1)}%</td></tr></table>
<h2>⚖️ 법규 검토 요약</h2>
<table><tr><th>항목</th><th>기준</th></tr><tr><td>높이 제한</td><td>${result.heightLimit > 0 ? result.heightLimit + 'm' : '제한 없음'}</td></tr><tr><td>건폐율 한도</td><td>${result.buildingCoverage}%</td></tr><tr><td>용적률 한도</td><td>${result.floorAreaRatio}%</td></tr><tr><td>중첩 규제</td><td>${result.overlappingCount}건</td></tr></table>
${result.overlappingCount > 0 ? `<h2>🔍 중첩 규제 목록</h2><ul>${overlaps}</ul>` : ''}
<div class="footer"><p>이 보고서는 AI가 자동 생성한 간이 보고서입니다. 실제 사업 추진 시 전문가 검토가 필요합니다.</p><p>Archi-Scan | archiscan.kr | ${new Date().toLocaleString('ko-KR')}</p></div>
</body></html>`
                    const w = window.open('', '_blank')
                    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500) }
                  }}
                  className="w-full py-3 rounded-xl border-2 border-primary/30 bg-primary/5 text-primary font-bold text-sm flex items-center justify-center gap-2"
                >
                  📄 간이 보고서 즉시 다운로드
                </button>
              </div>

              <p className="text-[9px] text-muted-foreground text-center">
                간이 보고서는 즉시, 상세 보고서는 상세 분석 후 다운로드 가능합니다
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
