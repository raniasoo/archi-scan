"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Check, 
  Eye, 
  Shield, 
  Maximize2, 
  Car, 
  TrendingUp, 
  Home,
  Sparkles,
  ChevronRight,
  Building2,
  Layers,
  Users,
  AlertCircle,
  CheckCircle2,
  Info
} from "lucide-react"
import type { DesignStrategy } from "@/lib/design-strategy"
import { STRATEGY_INFO, STRATEGY_PARAMETERS } from "@/lib/design-strategy"
import { ARCHISCAN_COPY } from "@/constants/archiscan-copy"

// ============================================
// Types
// ============================================

interface SiteConditions {
  siteArea?: number
  zoneType?: string
  roadCondition?: string
  heightLimit?: string
  districtPlan?: string
}

// LegalSummary from centralized state
interface LegalSummary {
  zoningLabel: string
  zoneType: string
  bcrLimit: number
  farLimit: number
  heightLimitM: number
  floorLimit: number
  maxBuildingAreaM2: number
  maxGrossFloorAreaM2: number
  recommendedFloorCount: number
  requiredParkingCount: number
  estimatedUnits: number
  setbackRule: string
  districtPlanApplied: boolean
  districtPlanLabel: string
}

interface StrategySelectionProps {
  selected: DesignStrategy
  onChange: (strategy: DesignStrategy) => void
  onProceed?: () => void
  siteConditions?: SiteConditions
  // NEW: Centralized legal summary for accurate estimates
  legalSummary?: LegalSummary | null
}

// ============================================
// Constants
// ============================================

const STRATEGY_ICONS: Record<DesignStrategy, React.ReactNode> = {
  "view-priority": <Eye className="h-5 w-5" />,
  "privacy-priority": <Shield className="h-5 w-5" />,
  "area-maximize": <Maximize2 className="h-5 w-5" />,
  "parking-efficient": <Car className="h-5 w-5" />,
  "profitability": <TrendingUp className="h-5 w-5" />,
  "livability": <Home className="h-5 w-5" />,
}

// Strategy base parameters (without mock values)
const STRATEGY_BASE_PARAMS: Record<DesignStrategy, {
  farUsage: number // 용적률 활용도 (0~1)
  densityType: '저밀도' | '중저밀도' | '중밀도' | '중고밀도' | '고밀도'
  baseFitScore: number
  advantages: string[]
  checkpoints: string[]
}> = {
  "view-priority": {
    farUsage: 0.75,
    densityType: '중밀도',
    baseFitScore: 78,
    advantages: ["전 세대 조망 확보", "높은 개방감"],
    checkpoints: ["연면적 소폭 감소", "분양가 프리미엄 필요"],
  },
  "privacy-priority": {
    farUsage: 0.70,
    densityType: '중저밀도',
    baseFitScore: 72,
    advantages: ["세대 간 독립성", "시선 차단"],
    checkpoints: ["공용면적 증가", "코어 효율 검토 필요"],
  },
  "area-maximize": {
    farUsage: 0.95,
    densityType: '고밀도',
    baseFitScore: 92,
    advantages: ["연면적 극대화", "높은 수익성"],
    checkpoints: ["일조/이격 검토 필요", "코어 효율 대비 상품성 균형"],
  },
  "parking-efficient": {
    farUsage: 0.80,
    densityType: '중밀도',
    baseFitScore: 75,
    advantages: ["주차 동선 최적화", "보행 안전"],
    checkpoints: ["지하 공사비 검토", "경사지 대응 계획"],
  },
  "profitability": {
    farUsage: 0.90,
    densityType: '고밀도',
    baseFitScore: 88,
    advantages: ["세대수 극대화", "빠른 분양"],
    checkpoints: ["주거 품질 타협 가능", "민원 리스크 검토"],
  },
  "livability": {
    farUsage: 0.65,
    densityType: '저밀도',
    baseFitScore: 70,
    advantages: ["생활 편의 중심", "커뮤니티 공간"],
    checkpoints: ["분양가 상승 필요", "수익성 재검토"],
  },
}

/**
 * Calculate dynamic strategy metrics based on actual legal summary
 * This replaces hardcoded mock values with real calculations
 */
function calculateStrategyMetrics(
  strategy: DesignStrategy,
  legalSummary?: LegalSummary | null
) {
  const base = STRATEGY_BASE_PARAMS[strategy]
  
  // If no legalSummary, use sensible defaults
  if (!legalSummary) {
    return {
      coverageRatio: `${Math.round(50 * (1 - base.farUsage * 0.1))}~${Math.round(60 * base.farUsage)}%`,
      expectedFloors: "3~6층",
      expectedUnits: base.densityType,
      unitCount: "10~25세대",
      densityType: base.densityType,
      fitScore: base.baseFitScore,
      advantages: base.advantages,
      checkpoints: base.checkpoints,
    }
  }
  
  // Calculate based on actual legal limits
  const effectiveFAR = legalSummary.farLimit * base.farUsage
  const siteArea = legalSummary.maxBuildingAreaM2 / (legalSummary.bcrLimit / 100)
  const estimatedGFA = (siteArea * effectiveFAR) / 100
  const avgUnitSize = 85
  const estimatedUnits = Math.floor(estimatedGFA / avgUnitSize)
  
  // Floor calculation based on BCR and GFA
  const buildingArea = (siteArea * legalSummary.bcrLimit) / 100
  const maxFloors = Math.min(
    legalSummary.floorLimit,
    Math.ceil(estimatedGFA / buildingArea)
  )
  const minFloors = Math.max(3, Math.ceil(maxFloors * 0.7))
  
  // Unit count range
  const minUnits = Math.max(6, Math.floor(estimatedUnits * 0.8))
  const maxUnits = estimatedUnits
  
  // Coverage ratio range
  const minCoverage = Math.round(legalSummary.bcrLimit * 0.75)
  const maxCoverage = legalSummary.bcrLimit
  
  // Ensure proper ordering (min ~ max) to prevent reverse display like "3~2층"
  const floorMin = Math.min(minFloors, maxFloors)
  const floorMax = Math.max(minFloors, maxFloors)
  const unitMin = Math.min(minUnits, maxUnits)
  const unitMax = Math.max(minUnits, maxUnits)
  const coverageMin = Math.min(minCoverage, maxCoverage)
  const coverageMax = Math.max(minCoverage, maxCoverage)
  
  return {
    coverageRatio: coverageMin === coverageMax ? `${coverageMin}%` : `${coverageMin}~${coverageMax}%`,
    expectedFloors: floorMin === floorMax ? `${floorMin}층` : `${floorMin}~${floorMax}층`,
    expectedUnits: base.densityType,
    unitCount: unitMin === unitMax ? `${unitMin}세대` : `${unitMin}~${unitMax}세대`,
    densityType: base.densityType,
    fitScore: base.baseFitScore,
    advantages: base.advantages,
    checkpoints: base.checkpoints,
  }
}

// AI recommendation reasons based on conditions
function getRecommendationReasons(strategy: DesignStrategy, conditions?: SiteConditions): string[] {
  const reasons: string[] = []
  
  if (strategy === "area-maximize") {
    reasons.push("대지 규모 대비 효율 확보가 유리합니다")
    if (conditions?.zoneType?.includes("주거")) {
      reasons.push("용도지역 용적률을 최대로 활용할 수 있습니다")
    }
    reasons.push("접도 조건상 대형 건물 배치가 가능합니다")
  } else if (strategy === "profitability") {
    reasons.push("높은 사업성이 기대되는 조건입니다")
    reasons.push("세대수 확보로 분양 경쟁력을 확보합니다")
  } else if (strategy === "view-priority") {
    reasons.push("조망 확보에 유리한 입지입니다")
    reasons.push("프리미엄 분양 전략에 적합합니다")
  }
  
  return reasons.length > 0 ? reasons : [
    "현재 대지 조건에 적합한 전략입니다",
    "법규 검토 결과 실현 가능성이 높습니다",
  ]
}

// Format zone type for display - UNIFIED mapping
function formatZoneType(value?: string): string {
  if (!value || value === 'manual_check_required' || value === 'unknown') return '확인 필요'
  const zoneMap: Record<string, string> = {
    'residential-1': '제1종 일반주거지역',
    'residential-2': '제2종 일반주거지역',
    'residential-3': '제3종 일반주거지역',
    'residential-exclusive-1': '제1종 전용주거지역',
    'residential-exclusive-2': '제2종 전용주거지역',
    'semi-residential': '준주거지역',
    'commercial-neighborhood': '근린상업지역',
    'commercial-general': '일반상업지역',
    'commercial-central': '중심상업지역',
    'industrial-general': '일반공업지역',
  }
  return zoneMap[value] || value
}

// Format road condition for display - UNIFIED mapping
function formatRoadCondition(value?: string): string {
  if (!value || value === 'manual_check_required' || value === 'unknown') return '확인 필요'
  const roadMap: Record<string, string> = {
    'under-4m': '4m 미만 도로',
    '4m-plus': '4m 이상 도로',
    '6m-plus': '6m 이상 도로',
    '8m-plus': '8m 이상 도로',
    '12m-plus': '12m 이상 도로',
    'corner': '코너 (2면 접도)',
    'three-side': '3면 접도',
  }
  return roadMap[value] || value
}

// Format district plan for display
function formatDistrictPlan(value?: string): string {
  if (!value || value === 'manual_check_required' || value === 'unknown') return '확인 필요'
  if (value === 'yes') return '적용'
  if (value === 'no') return '해당 없음'
  return value
}

// ============================================
// Sub Components
// ============================================

// Inline conditions summary bar (compact)
function InlineConditionsSummary({ conditions }: { conditions?: SiteConditions }) {
  if (!conditions) return null
  
  const parts = [
    conditions.siteArea ? `${conditions.siteArea.toLocaleString()}㎡` : null,
    formatZoneType(conditions.zoneType),
    formatRoadCondition(conditions.roadCondition),
    conditions.heightLimit ? `높이 ${conditions.heightLimit}m` : null,
    `지구단위 ${formatDistrictPlan(conditions.districtPlan)}`,
  ].filter(Boolean)
  
  return (
    <div className="flex items-start gap-2 p-2.5 rounded-lg border border-border/50 bg-secondary/30">
      <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
      <p className="text-[11px] text-muted-foreground leading-relaxed break-words">
        {parts.join(' · ')}
      </p>
    </div>
  )
}

// AI Recommended strategy card
function RecommendedStrategyCard({ 
  strategy, 
  isSelected,
  onSelect,
  conditions,
  legalSummary
}: { 
  strategy: DesignStrategy
  isSelected: boolean
  onSelect: () => void
  conditions?: SiteConditions
  legalSummary?: LegalSummary | null
}) {
  const info = STRATEGY_INFO[strategy]
  // Use dynamic calculation instead of static STRATEGY_METRICS
  const metrics = calculateStrategyMetrics(strategy, legalSummary)
  const reasons = getRecommendationReasons(strategy, conditions)
  const Icon = STRATEGY_ICONS[strategy]
  
  return (
    <div 
      className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
        isSelected 
          ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
          : 'border-primary/40 bg-primary/5 hover:border-primary/60'
      }`}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/20">
            <Sparkles className="h-3 w-3 text-primary" />
            <span className="text-[10px] font-semibold text-primary">AI 추천</span>
          </div>
          <Badge className="text-[10px] bg-primary/20 text-primary border-0">
            적합도 {metrics.fitScore}%
          </Badge>
        </div>
        {isSelected && (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
            <Check className="h-4 w-4 text-primary-foreground" />
          </div>
        )}
      </div>
      
      {/* Strategy name and description */}
      <div className="flex items-start gap-3 mb-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shrink-0">
          {Icon}
        </div>
        <div>
          <h3 className="text-base font-bold text-foreground">{info.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{info.description}</p>
        </div>
      </div>
      
      {/* Recommendation reasons */}
      <div className="mb-4 p-3 rounded-lg bg-background/50 border border-border/50">
        <p className="text-[10px] font-medium text-muted-foreground mb-2">추천 이유</p>
        <ul className="space-y-1.5">
          {reasons.map((reason, idx) => (
            <li key={idx} className="flex items-start gap-2 text-xs text-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </div>
      
      {/* Metrics grid - 2x2 on mobile, 4 columns on desktop */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[9px] text-muted-foreground">초기 추정값 (배치안 생성 시 확정)</span>
          <Badge variant="outline" className="text-[8px] px-1 py-0">예상</Badge>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          <div className="text-center p-2 rounded bg-background/50 border border-border/30">
            <Building2 className="h-3 w-3 mx-auto mb-0.5 text-muted-foreground" />
            <span className="text-[9px] text-muted-foreground block">예상 건폐율</span>
            <span className="text-[11px] font-semibold text-foreground">{metrics.coverageRatio}</span>
          </div>
          <div className="text-center p-2 rounded bg-background/50 border border-border/30">
            <Layers className="h-3 w-3 mx-auto mb-0.5 text-muted-foreground" />
            <span className="text-[9px] text-muted-foreground block">예상 층수</span>
            <span className="text-[11px] font-semibold text-foreground">{metrics.expectedFloors}</span>
          </div>
          <div className="text-center p-2 rounded bg-background/50 border border-border/30">
            <Users className="h-3 w-3 mx-auto mb-0.5 text-muted-foreground" />
            <span className="text-[9px] text-muted-foreground block">예상 세대</span>
            <span className="text-[11px] font-semibold text-foreground">{metrics.unitCount}</span>
          </div>
          <div className="text-center p-2 rounded bg-background/50 border border-border/30">
            <TrendingUp className="h-3 w-3 mx-auto mb-0.5 text-muted-foreground" />
            <span className="text-[9px] text-muted-foreground block">예상 밀도</span>
            <span className="text-[11px] font-semibold text-foreground">{metrics.densityType}</span>
          </div>
        </div>
        <p className="text-[9px] text-muted-foreground mt-1.5 text-center">※ 법규 및 배치 검토 전 초기 추정값입니다</p>
      </div>
      
      {/* Advantages & Checkpoints */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
          <span className="text-[10px] font-medium text-emerald-400 block mb-1">장점</span>
          {metrics.advantages.map((adv, idx) => (
            <p key={idx} className="text-[10px] text-foreground leading-relaxed">{adv}</p>
          ))}
        </div>
        <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20">
          <span className="text-[10px] font-medium text-amber-400 block mb-1">체크포인트</span>
          {metrics.checkpoints.map((cp, idx) => (
            <p key={idx} className="text-[10px] text-foreground leading-relaxed">{cp}</p>
          ))}
        </div>
      </div>
      
      {/* Select button */}
      <Button 
        variant={isSelected ? "default" : "outline"} 
        size="sm" 
        className="w-full mt-4"
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
      >
        {isSelected ? (
          <>
            <Check className="h-4 w-4 mr-1" />
            선택됨
          </>
        ) : (
          "이 전략 선택"
        )}
      </Button>
    </div>
  )
}

// Alternative strategy card (compact but complete)
function AlternativeStrategyCard({ 
  strategy, 
  isSelected,
  onSelect,
  legalSummary
}: { 
  strategy: DesignStrategy
  isSelected: boolean
  onSelect: () => void
  legalSummary?: LegalSummary | null
}) {
  const info = STRATEGY_INFO[strategy]
  // Use dynamic calculation instead of static STRATEGY_METRICS
  const metrics = calculateStrategyMetrics(strategy, legalSummary)
  const Icon = STRATEGY_ICONS[strategy]
  
  return (
    <button
      onClick={onSelect}
      className={`relative flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition-all hover:border-primary/50 hover:bg-secondary/30 ${
        isSelected
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : "border-border"
      }`}
    >
      {/* Selected badge */}
      {isSelected && (
        <Badge className="absolute right-2 top-2 text-[9px] px-1.5 py-0 bg-primary">
          선택됨
        </Badge>
      )}
      
      {/* Header */}
      <div className="flex items-center gap-2 w-full pr-14">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${
          isSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
        }`}>
          {Icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-semibold truncate ${isSelected ? "text-primary" : "text-foreground"}`}>
            {info.name}
          </h3>
          <p className="text-[10px] text-muted-foreground line-clamp-1">{info.description}</p>
        </div>
      </div>
      
      {/* Key metrics row - 초기 추정값 */}
      <div className="grid grid-cols-3 gap-1.5 w-full text-[10px]">
        <div className="p-1.5 rounded bg-background/50 text-center">
          <span className="text-muted-foreground block text-[9px]">예상 층수</span>
          <span className="font-medium text-foreground">{metrics.expectedFloors}</span>
        </div>
        <div className="p-1.5 rounded bg-background/50 text-center">
          <span className="text-muted-foreground block text-[9px]">예상 세대</span>
          <span className="font-medium text-foreground">{metrics.unitCount}</span>
        </div>
        <div className="p-1.5 rounded bg-background/50 text-center">
          <span className="text-muted-foreground block text-[9px]">적합도</span>
          <span className={`font-semibold ${isSelected ? 'text-primary' : 'text-foreground'}`}>{metrics.fitScore}%</span>
        </div>
      </div>
      
      {/* Advantage & Checkpoint */}
      <div className="flex flex-col gap-1 w-full text-[10px]">
        <div className="flex items-start gap-1.5">
          <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
          <span className="text-foreground line-clamp-1">{metrics.advantages[0]}</span>
        </div>
        <div className="flex items-start gap-1.5">
          <AlertCircle className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
          <span className="text-muted-foreground line-clamp-1">{metrics.checkpoints[0]}</span>
        </div>
      </div>
    </button>
  )
}

// ============================================
// Main Component
// ============================================

export function StrategySelection({
  selected,
  onChange,
  onProceed,
  siteConditions,
  legalSummary
  }: StrategySelectionProps) {
  // Determine AI recommended strategy (area-maximize as default recommendation)
  const recommendedStrategy: DesignStrategy = "area-maximize"
  
  // Get all strategies except recommended
  const otherStrategies = Object.keys(STRATEGY_INFO).filter(
    s => s !== recommendedStrategy
  ) as DesignStrategy[]

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">설계 전략 선택</CardTitle>
        <CardDescription>
          입력한 대지 조건과 보완 정보를 바탕으로 추천 전략을 제안합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Inline site conditions summary bar */}
        <InlineConditionsSummary conditions={siteConditions} />
        
        {/* AI Recommended Strategy */}
        <div>
          <RecommendedStrategyCard
            strategy={recommendedStrategy}
            isSelected={selected === recommendedStrategy}
            onSelect={() => onChange(recommendedStrategy)}
            conditions={siteConditions}
            legalSummary={legalSummary}
          />
        </div>
        
        {/* Other strategies section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-medium text-muted-foreground">다른 전략 비교</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {otherStrategies.map((strategy) => (
              <AlternativeStrategyCard
                key={strategy}
                strategy={strategy}
                isSelected={selected === strategy}
                onSelect={() => onChange(strategy)}
                legalSummary={legalSummary}
              />
            ))}
          </div>
        </div>

        {/* Selected Strategy Details */}
        {selected !== recommendedStrategy && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
                {STRATEGY_ICONS[selected]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-foreground">
                    {STRATEGY_INFO[selected].name}
                  </h4>
                  <Badge className="text-[10px]">선택됨</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {STRATEGY_INFO[selected].description}
                </p>
                
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-foreground mb-1.5">우선 고려 사항</p>
                    <ul className="space-y-1">
                      {STRATEGY_INFO[selected].priorities.map((priority) => (
                        <li key={priority} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <div className="h-1 w-1 rounded-full bg-primary" />
                          {priority}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground mb-1.5">트레이드오프</p>
                    <ul className="space-y-1">
                      {STRATEGY_INFO[selected].tradeoffs.map((tradeoff) => (
                        <li key={tradeoff} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <div className="h-1 w-1 rounded-full bg-amber-500" />
                          {tradeoff}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Strategy Guidance Note */}
        <div className="p-3 rounded-lg bg-secondary/30 border border-border/50">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            ※ 전략은 배치안 생성 방향을 정하는 단계입니다. 실제 계산과 보고서는 이후 선택한 배치안을 기준으로 반영됩니다.
          </p>
        </div>
        
        {/* Proceed CTA */}
        {onProceed && (
          <div className="pt-2">
            <Button 
              onClick={onProceed} 
              className="w-full h-12 text-base font-semibold"
              size="lg"
            >
              이 전략으로 배치안 생성
              <ChevronRight className="h-5 w-5 ml-1" />
            </Button>
            <p className="text-[10px] text-center text-muted-foreground mt-2">
              전략 선택 후 여러 배치안을 비교하고, 실제 반영할 배치안을 선택합니다
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
