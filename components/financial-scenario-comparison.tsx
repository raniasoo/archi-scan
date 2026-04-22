"use client"
// @version STABLE-v194 | @checkpoint release-candidate | 2026-04-10

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Calculator,
  Settings,
  RefreshCw,
  ChevronRight,
  Info,
} from "lucide-react"
import {
  type FinancialScenariosConfig,
  type ScenarioResult,
  type BaseFinancials,
  type ScenarioAdjustments,
  SCENARIO_PRESETS,
  EMPTY_SCENARIOS_CONFIG,
  calculateScenario,
  createScenariosConfig,
  hasScenarios,
  formatPercentageChange,
  getScenarioSummary,
  getROIStatusClass,
} from "@/lib/financial-scenarios-config"

// ============================================================================
// Helper Functions
// ============================================================================

function formatKRW(value: number): string {
  if (value >= 100000000) {
    return `${(value / 100000000).toFixed(1)}억원`
  }
  if (value >= 10000) {
    return `${(value / 10000).toFixed(0)}만원`
  }
  return `${value.toLocaleString()}원`
}

// ============================================================================
// Component Props
// ============================================================================

interface FinancialScenarioComparisonProps {
  baseFinancials: BaseFinancials
  config: FinancialScenariosConfig
  onChange: (config: FinancialScenariosConfig) => void
}

// ============================================================================
// Main Component
// ============================================================================

export function FinancialScenarioComparison({
  baseFinancials,
  config,
  onChange,
}: FinancialScenarioComparisonProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState<number>(0)
  const [customAdjustments, setCustomAdjustments] = useState<ScenarioAdjustments>({
    salePriceChange: 0,
    constructionCostChange: 0,
    landCostChange: 0,
    otherCostChange: 0,
  })

  // Generate scenarios - ALWAYS recalculate from baseFinancials to ensure correctness
  const scenarios = useMemo(() => {
    if (!config.enabled) return []
    
    // Recalculate all scenarios with current baseFinancials
    // This ensures values are always correct regardless of stored config
    return config.scenarios.map(scenario => {
      return calculateScenario(
        scenario.name,
        baseFinancials,
        scenario.adjustments
      )
    })
  }, [config.enabled, config.scenarios, baseFinancials])

  // Handle toggle
  const handleToggle = (enabled: boolean) => {
    if (enabled) {
      onChange(createScenariosConfig(baseFinancials, true, false))
    } else {
      onChange({ ...EMPTY_SCENARIOS_CONFIG, enabled: false })
    }
  }

  // Handle reset to default scenarios
  const handleReset = () => {
    onChange(createScenariosConfig(baseFinancials, true, false))
  }

  // Handle add all scenarios
  const handleAddAllScenarios = () => {
    onChange(createScenariosConfig(baseFinancials, true, true))
  }

  // Handle custom scenario
  const handleAddCustomScenario = () => {
    const customScenario = calculateScenario(
      '사용자 정의 시나리오',
      baseFinancials,
      customAdjustments
    )
    onChange({
      ...config,
      scenarios: [...config.scenarios, customScenario],
    })
    setIsSettingsOpen(false)
    setCustomAdjustments({
      salePriceChange: 0,
      constructionCostChange: 0,
      landCostChange: 0,
      otherCostChange: 0,
    })
  }

  // Sort scenarios by ROI for visual comparison
  const sortedScenarios = useMemo(() => {
    return [...scenarios].sort((a, b) => b.roi - a.roi)
  }, [scenarios])

  // Get min/max ROI for visualization - handle negative values properly
  const roiRange = useMemo(() => {
    if (scenarios.length === 0) return { min: 0, max: 0, absMax: 0 }
    const rois = scenarios.map(s => s.roi)
    const min = Math.min(...rois)
    const max = Math.max(...rois)
    // absMax is the largest absolute value for consistent scaling
    const absMax = Math.max(Math.abs(min), Math.abs(max), 1) // minimum 1 to avoid division by zero
    return { min, max, absMax }
  }, [scenarios])

  if (!config.enabled) {
    return (
      <Card className="print:shadow-none print:border-gray-200">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">시나리오 분석</p>
                <p className="text-sm text-muted-foreground">
                  다양한 시장 상황에 따른 사업성 변화를 비교합니다
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => handleToggle(true)}>
              분석 시작
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="print:shadow-none print:border-gray-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            시나리오 분석
          </CardTitle>
          <div className="flex items-center gap-2 print:hidden">
            <Button variant="ghost" size="sm" onClick={handleReset}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              초기화
            </Button>
            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-3.5 w-3.5 mr-1" />
                  설정
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>시나리오 설정</DialogTitle>
                  <DialogDescription>
                    분석할 시나리오를 추가하거나 사용자 정의 시나리오를 생성합니다.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  {/* Preset Buttons */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">프리셋 시나리오</Label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAddAllScenarios}
                      >
                        전체 시나리오 추가
                      </Button>
                    </div>
                  </div>

                  {/* Custom Scenario */}
                  <div className="space-y-4 pt-4 border-t">
                    <Label className="text-sm font-medium">사용자 정의 시나리오</Label>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">분양가 변동</Label>
                          <span className="text-xs font-mono">
                            {formatPercentageChange(customAdjustments.salePriceChange)}
                          </span>
                        </div>
                        <Slider
                          value={[customAdjustments.salePriceChange]}
                          onValueChange={([v]) => setCustomAdjustments(prev => ({ ...prev, salePriceChange: v }))}
                          min={-20}
                          max={20}
                          step={1}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">공사비 변동</Label>
                          <span className="text-xs font-mono">
                            {formatPercentageChange(customAdjustments.constructionCostChange)}
                          </span>
                        </div>
                        <Slider
                          value={[customAdjustments.constructionCostChange]}
                          onValueChange={([v]) => setCustomAdjustments(prev => ({ ...prev, constructionCostChange: v }))}
                          min={-20}
                          max={20}
                          step={1}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">토지비 변동</Label>
                          <span className="text-xs font-mono">
                            {formatPercentageChange(customAdjustments.landCostChange)}
                          </span>
                        </div>
                        <Slider
                          value={[customAdjustments.landCostChange]}
                          onValueChange={([v]) => setCustomAdjustments(prev => ({ ...prev, landCostChange: v }))}
                          min={-20}
                          max={20}
                          step={1}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">기타비용 변동</Label>
                          <span className="text-xs font-mono">
                            {formatPercentageChange(customAdjustments.otherCostChange)}
                          </span>
                        </div>
                        <Slider
                          value={[customAdjustments.otherCostChange]}
                          onValueChange={([v]) => setCustomAdjustments(prev => ({ ...prev, otherCostChange: v }))}
                          min={-20}
                          max={20}
                          step={1}
                        />
                      </div>
                    </div>
                    
                    <Button onClick={handleAddCustomScenario} className="w-full">
                      <Calculator className="h-4 w-4 mr-2" />
                      사용자 정의 시나리오 추가
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="ghost" size="sm" onClick={() => handleToggle(false)}>
              끄기
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Comparison Table */}
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[140px]">시나리오</TableHead>
                <TableHead className="text-right">총 사업비</TableHead>
                <TableHead className="text-right">총 분양수입</TableHead>
                <TableHead className="text-right">예상 이익</TableHead>
                <TableHead className="text-right w-[100px]">ROI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedScenarios.map((scenario, idx) => {
                const roiStatus = getROIStatusClass(scenario.roi)
                const isBase = scenario.name === '기준 시나리오'
                const isSelected = selectedScenarioIndex === idx
                
                return (
                  <TableRow 
                    key={idx}
                    onClick={() => setSelectedScenarioIndex(idx)}
                    className={`cursor-pointer transition-colors active:bg-primary/20 ${
                      isSelected 
                        ? 'bg-primary/15 ring-1 ring-primary/50' 
                        : isBase 
                          ? 'bg-primary/5 hover:bg-primary/10' 
                          : 'hover:bg-muted/50'
                    }`}
                  >
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className={`font-medium text-sm ${isBase ? 'text-primary' : ''}`}>
                          {scenario.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {getScenarioSummary(scenario)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatKRW(scenario.totalCost)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatKRW(scenario.totalRevenue)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`font-mono text-sm ${scenario.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {scenario.profit >= 0 ? '+' : ''}{formatKRW(scenario.profit)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="secondary"
                        className={`${roiStatus.bgClass} ${roiStatus.textClass} font-mono`}
                      >
                        {scenario.roi.toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {/* Visual ROI Comparison */}
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs font-medium text-muted-foreground mb-3">ROI 비교</p>
          <div className="space-y-2">
            {sortedScenarios.map((scenario, idx) => {
              const roiStatus = getROIStatusClass(scenario.roi)
              // Normalize using absolute max so negative values scale correctly
              // Map ROI to 0-100% where: -absMax -> 0%, 0 -> 50%, +absMax -> 100%
              const normalizedPosition = ((scenario.roi / roiRange.absMax) + 1) / 2 * 100
              const barWidth = Math.max(Math.min(normalizedPosition, 100), 5) // clamp between 5-100%
              
              const isSelected = selectedScenarioIndex === idx
              const handleSelect = (e: React.MouseEvent | React.TouchEvent) => {
                e.preventDefault()
                e.stopPropagation()
                setSelectedScenarioIndex(idx)
              }
              
              // Determine bar color based on ROI value
              const barColor = scenario.roi > 20 ? 'bg-green-500' :
                scenario.roi > 12 ? 'bg-blue-500' :
                scenario.roi > 5 ? 'bg-amber-500' :
                scenario.roi > 0 ? 'bg-orange-500' : 'bg-red-500'
              
              return (
                <button 
                  type="button"
                  key={idx} 
                  onClick={handleSelect}
                  onTouchEnd={handleSelect}
                  className={`flex items-center gap-3 p-2 w-full rounded-lg cursor-pointer transition-colors touch-manipulation select-none ${
                    isSelected 
                      ? 'bg-primary/15 ring-2 ring-primary/50' 
                      : 'bg-muted/30 hover:bg-muted/50 active:bg-primary/20'
                  }`}
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <span className={`text-xs w-28 sm:w-32 truncate text-left ${isSelected ? 'font-medium text-primary' : ''}`}>
                    {scenario.name}
                  </span>
                  <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden pointer-events-none relative">
                    {/* Center line marker at 0% ROI */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border z-10" />
                    {/* Bar starts from center (50%) and extends left for negative, right for positive */}
                    <div
                      className={`absolute h-full rounded-full transition-all pointer-events-none ${barColor}`}
                      style={{
                        left: scenario.roi >= 0 ? '50%' : `${barWidth}%`,
                        width: scenario.roi >= 0 
                          ? `${(scenario.roi / roiRange.absMax) * 50}%`
                          : `${50 - barWidth}%`,
                      }}
                    />
                  </div>
                  <span className={`text-xs font-mono w-14 text-right pointer-events-none ${roiStatus.textClass}`}>
                    {scenario.roi.toFixed(1)}%
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Selected Scenario Detail */}
        {sortedScenarios.length > 0 && sortedScenarios[selectedScenarioIndex] && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-3">선택된 시나리오 상세</p>
            <div className="rounded-lg bg-primary/5 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-primary">{sortedScenarios[selectedScenarioIndex].name}</span>
                <Badge
                  variant="secondary"
                  className={`${getROIStatusClass(sortedScenarios[selectedScenarioIndex].roi).bgClass} ${getROIStatusClass(sortedScenarios[selectedScenarioIndex].roi).textClass} font-mono`}
                >
                  ROI {sortedScenarios[selectedScenarioIndex].roi.toFixed(1)}%
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">총 사업비</p>
                  <p className="font-mono">{formatKRW(sortedScenarios[selectedScenarioIndex].totalCost)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">총 분양수입</p>
                  <p className="font-mono">{formatKRW(sortedScenarios[selectedScenarioIndex].totalRevenue)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">예상 이익</p>
                  <p className={`font-mono ${sortedScenarios[selectedScenarioIndex].profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {sortedScenarios[selectedScenarioIndex].profit >= 0 ? '+' : ''}{formatKRW(sortedScenarios[selectedScenarioIndex].profit)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">조건 요약</p>
                  <p className="text-xs">{getScenarioSummary(sortedScenarios[selectedScenarioIndex])}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Summary Note */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <p>
              시나리오 분석은 시장 변동성에 따른 사업성 민감도를 검토하기 위한 참고 자료입니다.
              실제 사업 추진 시에는 정밀 사업수지 분석이 필요합니다.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Export Type
// ============================================================================

export type { FinancialScenariosConfig, ScenarioResult, BaseFinancials }
