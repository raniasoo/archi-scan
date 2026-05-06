"use client"

import { useState, useMemo } from "react"
import { Calculator, Users, Building2, TrendingDown, TrendingUp } from "lucide-react"

interface ContributionSimulatorProps {
  totalProjectCost: number    // 총사업비 (억원)
  totalUnits: number          // 신축 총 세대수
  salePricePerM2: number      // 분양가 (원/㎡)
  avgUnitArea: number         // 평균 세대면적 (㎡)
}

export function ContributionSimulator({ totalProjectCost, totalUnits, salePricePerM2, avgUnitArea }: ContributionSimulatorProps) {
  const [existingUnits, setExistingUnits] = useState(72)
  const [generalSaleUnits, setGeneralSaleUnits] = useState(() => Math.max(Math.round(totalUnits * 0.15), 0))

  const result = useMemo(() => {
    if (existingUnits <= 0 || totalProjectCost <= 0) return null

    const costInWon = totalProjectCost * 100000000 // 억원 → 원
    const generalSaleRevenue = generalSaleUnits * salePricePerM2 * avgUnitArea
    const ownerBurdenTotal = Math.max(costInWon - generalSaleRevenue, 0)
    const perUnitContribution = ownerBurdenTotal / existingUnits
    const contributionInEok = perUnitContribution / 100000000

    // 시세 대비 분담금 비율 (50평형 기준 시세)
    const estimatedMarketValue = salePricePerM2 * avgUnitArea * 1.2 // 시세는 분양가보다 약 20% 높다고 가정
    const burdenRatio = estimatedMarketValue > 0 ? (perUnitContribution / estimatedMarketValue * 100) : 0

    return {
      generalSaleRevenue: generalSaleRevenue / 100000000,
      ownerBurdenTotal: ownerBurdenTotal / 100000000,
      perUnitContribution: contributionInEok,
      burdenRatio,
      isHigh: burdenRatio > 30,
      isMedium: burdenRatio > 15 && burdenRatio <= 30,
    }
  }, [existingUnits, generalSaleUnits, totalProjectCost, salePricePerM2, avgUnitArea])

  if (!result) return null

  return (
    <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-6 w-6 rounded-full bg-purple-500/20 flex items-center justify-center">
          <Calculator className="h-3.5 w-3.5 text-purple-400" />
        </div>
        <h3 className="text-sm font-bold">분담금 시뮬레이션</h3>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">재건축</span>
      </div>

      {/* 입력 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-[10px] text-muted-foreground block mb-1">기존 세대수</label>
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3 text-muted-foreground" />
            <input
              type="number"
              value={existingUnits}
              onChange={e => setExistingUnits(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full bg-background border border-border rounded px-2 py-1.5 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground block mb-1">일반분양 세대수</label>
          <div className="flex items-center gap-1">
            <Building2 className="h-3 w-3 text-muted-foreground" />
            <input
              type="number"
              value={generalSaleUnits}
              onChange={e => setGeneralSaleUnits(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full bg-background border border-border rounded px-2 py-1.5 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
        </div>
      </div>

      {/* 결과 */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-card/50 rounded-lg p-3 text-center border border-border/50">
          <p className="text-[10px] text-muted-foreground mb-1">일반분양 수입</p>
          <p className="text-sm font-bold text-emerald-400">
            <TrendingUp className="h-3 w-3 inline mr-0.5" />
            {result.generalSaleRevenue.toFixed(1)}억
          </p>
        </div>
        <div className="bg-card/50 rounded-lg p-3 text-center border border-border/50">
          <p className="text-[10px] text-muted-foreground mb-1">조합원 부담 총액</p>
          <p className="text-sm font-bold text-amber-400">
            <TrendingDown className="h-3 w-3 inline mr-0.5" />
            {result.ownerBurdenTotal.toFixed(1)}억
          </p>
        </div>
      </div>

      {/* 핵심 수치 */}
      <div className={`rounded-lg p-4 text-center border-2 ${
        result.isHigh ? 'bg-red-500/10 border-red-500/30' : 
        result.isMedium ? 'bg-amber-500/10 border-amber-500/30' : 
        'bg-emerald-500/10 border-emerald-500/30'
      }`}>
        <p className="text-[10px] text-muted-foreground mb-1">세대당 예상 분담금</p>
        <p className={`text-2xl font-black ${
          result.isHigh ? 'text-red-400' : 
          result.isMedium ? 'text-amber-400' : 
          'text-emerald-400'
        }`}>
          {result.perUnitContribution.toFixed(1)}억원
        </p>
        <p className={`text-[10px] mt-1 ${
          result.isHigh ? 'text-red-400/70' : 
          result.isMedium ? 'text-amber-400/70' : 
          'text-emerald-400/70'
        }`}>
          시세 대비 {result.burdenRatio.toFixed(1)}% 부담
          {result.isHigh && ' · ⚠️ 높은 부담'}
          {result.isMedium && ' · 보통 수준'}
          {!result.isHigh && !result.isMedium && ' · 적정 수준'}
        </p>
      </div>

      <p className="text-[9px] text-muted-foreground mt-2 text-center">
        총사업비 {totalProjectCost.toFixed(1)}억 기준 · 분양가 {(salePricePerM2/10000).toFixed(0)}만원/㎡ · 세대면적 {avgUnitArea}㎡
      </p>
    </div>
  )
}
