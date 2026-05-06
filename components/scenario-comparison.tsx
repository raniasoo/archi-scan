"use client"

import { useState } from "react"
import { ChevronDown, Star, Clock, Wallet, AlertTriangle, CheckCircle2 } from "lucide-react"

interface ScenarioComparisonProps {
  siteArea: number
  totalUnits: number
  floors: number
  buildingCoverage: number
  totalProjectCost: number   // 원
  roi: number
  buildingAge?: number       // 준공 후 경과 연수
}

interface Scenario {
  id: string
  name: string
  emoji: string
  description: string
  newUnits: string
  generalSale: string
  contribution: string
  duration: string
  risk: 'low' | 'medium' | 'high'
  recommended: boolean
  pros: string[]
  cons: string[]
}

export function ScenarioComparison({ siteArea, totalUnits, floors, buildingCoverage, totalProjectCost, roi, buildingAge }: ScenarioComparisonProps) {
  const [expanded, setExpanded] = useState(false)

  const costInEok = totalProjectCost / 100000000
  const isOldEnough = (buildingAge || 0) >= 30
  const isSmallScale = totalUnits <= 200 && siteArea < 10000
  const isLowROI = roi < 10

  const scenarios: Scenario[] = [
    {
      id: 'reconstruction',
      name: '소규모재건축',
      emoji: '🏗',
      description: '기존 건물을 철거하고 신축',
      newUnits: `${Math.round(totalUnits * 1.15)}~${Math.round(totalUnits * 1.3)}세대`,
      generalSale: `${Math.max(Math.round(totalUnits * 0.15), 5)}~${Math.round(totalUnits * 0.25)}세대`,
      contribution: `${(costInEok * 0.6 / Math.max(totalUnits, 1)).toFixed(1)}~${(costInEok * 0.8 / Math.max(totalUnits, 1)).toFixed(1)}억`,
      duration: '7~9년',
      risk: 'medium',
      recommended: roi > 15 && isOldEnough,
      pros: [
        isSmallScale ? '안전진단 면제 (소규모 특례)' : '대규모 가치 상승',
        '자산가치 최대화 가능',
        '최신 설비·단열·주차 확보',
      ],
      cons: [
        '분담금 부담 큼',
        `사업기간 장기 (7~9년)`,
        '조합원 80% 동의 필요',
      ],
    },
    {
      id: 'remodeling',
      name: '리모델링',
      emoji: '🔧',
      description: '기존 골조 유지 + 증축',
      newUnits: `증축 ${Math.round(totalUnits * 0.15)}세대`,
      generalSale: `${Math.round(totalUnits * 0.1)}~${Math.round(totalUnits * 0.15)}세대`,
      contribution: `${(costInEok * 0.3 / Math.max(totalUnits, 1)).toFixed(1)}~${(costInEok * 0.4 / Math.max(totalUnits, 1)).toFixed(1)}억`,
      duration: '5~6년',
      risk: 'low',
      recommended: isLowROI || !isOldEnough,
      pros: [
        '분담금 부담 최소화 (재건축의 50%)',
        '사업기간 단축',
        '기존 골조 활용 → 공사비 절감',
        '규제 완화 불필요',
      ],
      cons: [
        '구조적 한계 (기존 골조)',
        '증축 규모 15% 이내 제한',
        '주차장 확보 어려움',
      ],
    },
    {
      id: 'bulk-sale',
      name: '단지 통매각',
      emoji: '💰',
      description: '디벨로퍼에게 일괄 매각',
      newUnits: '매수자 결정',
      generalSale: '해당 없음',
      contribution: '없음 (즉시 현금화)',
      duration: '3~4년',
      risk: 'low',
      recommended: false,
      pros: [
        '즉시 현금화 가능',
        '분담금 부담 제로',
        '사업 리스크 매수자 이전',
      ],
      cons: [
        '매각가 협상이 관건',
        '전체 조합원 합의 필요',
        '시세 대비 할인 매각 가능성',
      ],
    },
  ]

  const recommended = scenarios.find(s => s.recommended)
  const riskColor = { low: 'text-emerald-400', medium: 'text-amber-400', high: 'text-red-400' }
  const riskLabel = { low: '낮음', medium: '중간', high: '높음' }

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-cyan-500/20 flex items-center justify-center text-sm">📊</div>
          <h3 className="text-sm font-bold">사업 시나리오 비교</h3>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400">재건축 · 리모델링 · 통매각</span>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="mt-4 space-y-3">
          {scenarios.map(s => (
            <div key={s.id} className={`rounded-lg border p-3 ${
              s.recommended ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-border/50 bg-card/30'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{s.emoji}</span>
                  <span className="text-sm font-bold">{s.name}</span>
                  {s.recommended && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold flex items-center gap-0.5">
                      <Star className="h-2.5 w-2.5" /> 추천
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-medium ${riskColor[s.risk]}`}>
                  위험도 {riskLabel[s.risk]}
                </span>
              </div>

              <p className="text-[11px] text-muted-foreground mb-2">{s.description}</p>

              <div className="grid grid-cols-2 gap-2 text-[11px] mb-2">
                <div className="flex items-center gap-1.5">
                  <Wallet className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">분담금:</span>
                  <span className="font-semibold">{s.contribution}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">기간:</span>
                  <span className="font-semibold">{s.duration}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  {s.pros.slice(0, 2).map((p, i) => (
                    <div key={i} className="flex items-start gap-1 py-0.5">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-emerald-300/80">{p}</span>
                    </div>
                  ))}
                </div>
                <div>
                  {s.cons.slice(0, 2).map((c, i) => (
                    <div key={i} className="flex items-start gap-1 py-0.5">
                      <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />
                      <span className="text-amber-300/80">{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {recommended && (
            <div className="text-center pt-2">
              <p className="text-[10px] text-muted-foreground">
                현재 조건(ROI {roi.toFixed(1)}%, {totalUnits}세대{buildingAge ? `, ${buildingAge}년차` : ''}) 기준 <strong className="text-emerald-400">{recommended.emoji} {recommended.name}</strong> 추천
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
