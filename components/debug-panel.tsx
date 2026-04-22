"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, XCircle, Bug } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { IS_DEV_MODE } from "@/constants/archiscan-scenarios"

interface LayoutData {
  id?: string
  name: string
  floors?: number
  units?: number
  parking?: number
  buildingCoverage?: number
  far?: number
  gfa?: number
}

interface RegulationResult {
  maxCoverage?: number
  maxFar?: number
  maxGfa?: number
  recommendedFloors?: { min: number; max: number }
  requiredParking?: number
}

interface FeasibilityResult {
  planName?: string
  totalCost?: number
  expectedRevenue?: number
  expectedProfit?: number
  roi?: number
  revenueModel?: string
}

interface ReportData {
  planName?: string
  verdict?: string
  roi?: number
  totalCost?: number
  expectedRevenue?: number
  units?: number
  floors?: number
  grossFloorArea?: number
}

interface DebugPanelProps {
  // Input state
  address?: string
  siteArea?: number
  zoning?: string
  road?: string
  heightLimit?: number | string
  districtPlan?: string
  
  // Strategy state
  selectedStrategy?: string
  recommendedLayout?: LayoutData | null
  selectedLayout?: LayoutData | null
  
  // Regulation result
  regulationResult?: RegulationResult
  
  // Feasibility result
  feasibilityResult?: FeasibilityResult
  
  // Report data
  reportData?: ReportData
  
  // Scenario
  selectedScenarioId?: string
  
  // Floor plan reference
  floorPlanName?: string
  
  // Comparison reference
  comparisonCurrentPlan?: string
}

export function DebugPanel({
  address,
  siteArea,
  zoning,
  road,
  heightLimit,
  districtPlan,
  selectedStrategy,
  recommendedLayout,
  selectedLayout,
  regulationResult,
  feasibilityResult,
  reportData,
  selectedScenarioId,
  floorPlanName,
  comparisonCurrentPlan,
}: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  // Don't render in production
  if (!IS_DEV_MODE) return null
  
  // Validation checks
  const validations = [
    {
      label: "selectedLayout.name === report.planName",
      pass: selectedLayout?.name === reportData?.planName || (!selectedLayout && !reportData?.planName),
      left: selectedLayout?.name || "없음",
      right: reportData?.planName || "없음",
    },
    {
      label: "selectedLayout.units === report.units",
      pass: selectedLayout?.units === reportData?.units || (!selectedLayout?.units && !reportData?.units),
      left: String(selectedLayout?.units ?? "없음"),
      right: String(reportData?.units ?? "없음"),
    },
    {
      label: "selectedLayout.gfa === feasibility.grossFloorArea",
      pass: selectedLayout?.gfa === reportData?.grossFloorArea || (!selectedLayout?.gfa && !reportData?.grossFloorArea),
      left: String(selectedLayout?.gfa ?? "없음"),
      right: String(reportData?.grossFloorArea ?? "없음"),
    },
    {
      label: "selectedLayout.name === floorPlan.planName",
      pass: selectedLayout?.name === floorPlanName || (!selectedLayout && !floorPlanName),
      left: selectedLayout?.name || "없음",
      right: floorPlanName || "없음",
    },
    {
      label: "selectedLayout.name === comparison.currentAppliedPlan",
      pass: selectedLayout?.name === comparisonCurrentPlan || (!selectedLayout && !comparisonCurrentPlan),
      left: selectedLayout?.name || "없음",
      right: comparisonCurrentPlan || "없음",
    },
  ]
  
  const allPass = validations.every(v => v.pass)
  const failedCount = validations.filter(v => !v.pass).length
  
  const isRecommendedDifferent = recommendedLayout && selectedLayout && recommendedLayout.id !== selectedLayout.id
  
  const formatNumber = (n?: number) => n?.toLocaleString() ?? "-"
  const formatPercent = (n?: number) => n ? `${n}%` : "-"
  
  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full">
      {/* Toggle Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full justify-between ${allPass ? "border-emerald-500/50 bg-emerald-500/10" : "border-red-500/50 bg-red-500/10"}`}
      >
        <div className="flex items-center gap-2">
          <Bug className="h-4 w-4" />
          <span className="text-xs font-medium">개발용 디버그 패널</span>
        </div>
        <div className="flex items-center gap-2">
          {allPass ? (
            <Badge variant="outline" className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30 text-[10px]">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              정상
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-red-500/20 text-red-500 border-red-500/30 text-[10px]">
              <XCircle className="h-3 w-3 mr-1" />
              불일치 {failedCount}
            </Badge>
          )}
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </div>
      </Button>
      
      {/* Panel Content */}
      {isOpen && (
        <div className="mt-2 p-3 rounded-lg border border-border bg-card/95 backdrop-blur-sm shadow-xl max-h-[70vh] overflow-y-auto">
          {/* Scenario */}
          {selectedScenarioId && (
            <div className="mb-3 p-2 rounded bg-amber-500/10 border border-amber-500/30">
              <p className="text-[10px] text-amber-500 font-medium">적용 시나리오</p>
              <p className="text-xs font-mono text-foreground">{selectedScenarioId}</p>
            </div>
          )}
          
          {/* Validation Status */}
          <div className={`mb-3 p-2 rounded ${allPass ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-red-500/10 border border-red-500/30"}`}>
            <div className="flex items-center gap-2 mb-2">
              {allPass ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              )}
              <span className={`text-xs font-medium ${allPass ? "text-emerald-500" : "text-red-500"}`}>
                {allPass ? "상태 일치: 정상" : "상태 불일치: 확인 필요"}
              </span>
            </div>
            {!allPass && (
              <div className="space-y-1">
                {validations.filter(v => !v.pass).map((v, i) => (
                  <div key={i} className="text-[10px] font-mono text-red-400">
                    <span className="text-red-500">✗</span> {v.label}
                    <div className="ml-3 text-muted-foreground">
                      좌: {v.left} / 우: {v.right}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Recommended vs Selected Warning */}
          {isRecommendedDifferent && (
            <div className="mb-3 p-2 rounded bg-amber-500/10 border border-amber-500/30">
              <p className="text-[10px] text-amber-500">
                <AlertTriangle className="h-3 w-3 inline mr-1" />
                AI 추천안과 선택안 다름
              </p>
              <p className="text-[10px] font-mono text-muted-foreground">
                추천: {recommendedLayout?.name} / 선택: {selectedLayout?.name}
              </p>
            </div>
          )}
          
          {/* Section: Input */}
          <Section title="1. 입력 상태">
            <Row label="address" value={address || "-"} />
            <Row label="siteArea" value={`${formatNumber(siteArea)}㎡`} />
            <Row label="zoning" value={zoning || "-"} />
            <Row label="road" value={road || "-"} />
            <Row label="heightLimit" value={`${heightLimit || "-"}m`} />
            <Row label="districtPlan" value={districtPlan || "-"} />
          </Section>
          
          {/* Section: Strategy */}
          <Section title="2. 전략 상태">
            <Row label="selectedStrategy" value={selectedStrategy || "-"} />
            <Row label="recommendedLayout" value={recommendedLayout?.name || "-"} />
            <Row label="selectedLayout" value={selectedLayout?.name || "-"} highlight={!!selectedLayout} />
          </Section>
          
          {/* Section: Regulation */}
          <Section title="3. 법규 계산 결과">
            <Row label="maxCoverage" value={formatPercent(regulationResult?.maxCoverage)} />
            <Row label="maxFar" value={formatPercent(regulationResult?.maxFar)} />
            <Row label="maxGfa" value={`${formatNumber(regulationResult?.maxGfa)}㎡`} />
            <Row label="recommendedFloors" value={regulationResult?.recommendedFloors ? `${regulationResult.recommendedFloors.min}~${regulationResult.recommendedFloors.max}층` : "-"} />
            <Row label="requiredParking" value={`${formatNumber(regulationResult?.requiredParking)}대`} />
          </Section>
          
          {/* Section: Selected Layout */}
          <Section title="4. 현재 반영 배치안">
            <Row label="name" value={selectedLayout?.name || "-"} highlight />
            <Row label="floors" value={`${selectedLayout?.floors || "-"}층`} />
            <Row label="units" value={`${selectedLayout?.units || "-"}세대`} />
            <Row label="parking" value={`${selectedLayout?.parking || "-"}대`} />
            <Row label="buildingCoverage" value={formatPercent(selectedLayout?.buildingCoverage)} />
            <Row label="far" value={formatPercent(selectedLayout?.far)} />
            <Row label="gfa" value={`${formatNumber(selectedLayout?.gfa)}㎡`} />
          </Section>
          
          {/* Section: Feasibility */}
          <Section title="5. 사업성 결과">
            <Row label="planName" value={feasibilityResult?.planName || "-"} />
            <Row label="totalCost" value={`${formatNumber(feasibilityResult?.totalCost)}억원`} />
            <Row label="expectedRevenue" value={`${formatNumber(feasibilityResult?.expectedRevenue)}억원`} />
            <Row label="expectedProfit" value={`${formatNumber(feasibilityResult?.expectedProfit)}억원`} />
            <Row label="roi" value={formatPercent(feasibilityResult?.roi)} highlight />
            <Row label="revenueModel" value={feasibilityResult?.revenueModel || "-"} />
          </Section>
          
          {/* Section: Report */}
          <Section title="6. 보고서 결과">
            <Row label="planName" value={reportData?.planName || "-"} />
            <Row label="verdict" value={reportData?.verdict || "-"} highlight />
            <Row label="roi" value={formatPercent(reportData?.roi)} />
            <Row label="totalCost" value={`${formatNumber(reportData?.totalCost)}억원`} />
            <Row label="expectedRevenue" value={`${formatNumber(reportData?.expectedRevenue)}억원`} />
            <Row label="units" value={`${reportData?.units || "-"}세대`} />
            <Row label="floors" value={`${reportData?.floors || "-"}층`} />
          </Section>
          
          {/* Validation List */}
          <Section title="7. 일치 여부 체크">
            {validations.map((v, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px] font-mono py-0.5">
                {v.pass ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="h-3 w-3 text-red-500 shrink-0" />
                )}
                <span className={v.pass ? "text-muted-foreground" : "text-red-400"}>{v.label}</span>
              </div>
            ))}
          </Section>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <p className="text-[10px] font-medium text-primary mb-1">{title}</p>
      <div className="space-y-0.5 pl-2 border-l border-border/50">{children}</div>
    </div>
  )
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between text-[10px] font-mono">
      <span className="text-muted-foreground">{label}</span>
      <span className={highlight ? "text-primary font-medium" : "text-foreground"}>{value}</span>
    </div>
  )
}
