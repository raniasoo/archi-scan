"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import {
  Building2,
  Ruler,
  Car,
  Layers,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  ListChecks,
  FileWarning,
  Scale,
} from "lucide-react"
import {
  ZoningRegulation,
  RegulationAnalysis as RegulationAnalysisType,
  analyzeRegulations,
  ZONE_TYPE_LABELS,
  SETBACK_TYPE_LABELS,
} from "@/lib/regulation-types"
import { ARCHISCAN_COPY } from "@/constants/archiscan-copy"

// Source type for value origin tracking
type ValueSource = 'auto' | 'manual' | 'assumed'

interface SourceLabelProps {
  source: ValueSource
}

function SourceLabel({ source }: SourceLabelProps) {
  const config = {
    auto: { label: '자동조회', className: 'bg-emerald-500/20 text-emerald-500' },
    manual: { label: '수동보완', className: 'bg-primary/20 text-primary' },
    assumed: { label: '기본값', className: 'bg-secondary text-muted-foreground' },
  }
  const { label, className } = config[source]
  return (
    <span className={`text-[9px] px-1 py-0.5 rounded ${className}`}>
      {label}
    </span>
  )
}

interface RegulationAnalysisProps {
  siteArea: number
  regulation: ZoningRegulation
  /** Optional: track where each value came from */
  valueSources?: {
    zoneType?: ValueSource
    roadCondition?: ValueSource
    heightLimit?: ValueSource
    districtPlan?: ValueSource
  }
}

function formatArea(value: number): string {
  return `${value.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}㎡`
}

function formatPyeong(sqm: number): string {
  return `${(sqm / 3.3058).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}평`
}

export function RegulationAnalysisPanel({ siteArea, regulation, valueSources }: RegulationAnalysisProps) {
  const analysis = analyzeRegulations(siteArea, regulation)
  
  const utilizationRate = (analysis.effectiveSiteArea / siteArea) * 100

  return (
    <div className="flex flex-col gap-4">
      {/* 현재 적용 기준값 요약 바 */}
      <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
        <div className="flex items-center gap-2 mb-2">
          <Scale className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium text-foreground">현재 적용 기준값</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
          <span className="flex items-center gap-1">
            <span className="text-muted-foreground">용도지역:</span>
            <span className="font-medium text-foreground">
              {regulation?.zoneType === "custom" 
                ? regulation?.zoneTypeCustom || "직접 입력"
                : ZONE_TYPE_LABELS[regulation?.zoneType]}
            </span>
            {valueSources?.zoneType && <SourceLabel source={valueSources.zoneType} />}
          </span>
          <span className="text-muted-foreground/50">|</span>
          <span className="flex items-center gap-1">
            <span className="text-muted-foreground">접도:</span>
            <span className="font-medium text-foreground">{regulation?.roadWidth}m 이상</span>
            {valueSources?.roadCondition && <SourceLabel source={valueSources.roadCondition} />}
          </span>
          <span className="text-muted-foreground/50">|</span>
          <span className="flex items-center gap-1">
            <span className="text-muted-foreground">높이:</span>
            <span className="font-medium text-foreground">{regulation?.maxHeight}m</span>
            {valueSources?.heightLimit && <SourceLabel source={valueSources.heightLimit} />}
          </span>
          <span className="text-muted-foreground/50">|</span>
          <span className="flex items-center gap-1">
            <span className="text-muted-foreground">지구단위:</span>
            <span className="font-medium text-foreground">
              {regulation?.additionalNotes?.includes('지구단위') ? '있음' : '없음'}
            </span>
            {valueSources?.districtPlan && <SourceLabel source={valueSources.districtPlan} />}
          </span>
        </div>
      </div>

      {/* 법규 기준 요약 */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Scale className="h-4 w-4 text-primary" />
            {ARCHISCAN_COPY.codeReview.summaryTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-secondary/50 p-2.5">
              <p className="text-[10px] text-muted-foreground mb-0.5">용도지역</p>
              <p className="font-semibold text-foreground text-xs leading-tight">
                {regulation?.zoneType === "custom" 
                  ? regulation?.zoneTypeCustom || "직접 입력"
                  : ZONE_TYPE_LABELS[regulation?.zoneType]}
              </p>
            </div>
            <div className="rounded-lg bg-secondary/50 p-2.5">
              <p className="text-[10px] text-muted-foreground mb-0.5">건폐율 / 용적률</p>
              <p className="font-semibold text-foreground text-xs">
                {regulation?.maxCoverageRatio ?? 60}% / {regulation?.maxFloorAreaRatio ?? 200}%
              </p>
            </div>
            <div className="rounded-lg bg-secondary/50 p-2.5">
              <p className="text-[10px] text-muted-foreground mb-0.5">높이 / 층수</p>
              <p className="font-semibold text-foreground text-xs">
                {regulation?.maxHeight}m / {regulation?.maxFloors}층
              </p>
            </div>
            <div className="rounded-lg bg-secondary/50 p-2.5">
              <p className="text-[10px] text-muted-foreground mb-0.5">사선 제한</p>
              <p className="font-semibold text-foreground text-xs">
                {SETBACK_TYPE_LABELS[regulation?.setbackType]}
                {regulation?.setbackType !== "none" && ` (${regulation?.setbackAngle}°)`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 규모 검토 결과 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">최대 건축면적</p>
                <p className="text-lg font-bold text-foreground">{formatArea(analysis.maxBuildingArea)}</p>
                <p className="text-xs text-muted-foreground">{formatPyeong(analysis.maxBuildingArea)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/10">
                <Ruler className="h-5 w-5 text-chart-2" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">최대 연면적</p>
                <p className="text-lg font-bold text-foreground">{formatArea(analysis.maxGrossFloorArea)}</p>
                <p className="text-xs text-muted-foreground">{formatPyeong(analysis.maxGrossFloorArea)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-3/10">
                <Layers className="h-5 w-5 text-chart-3" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">권장 층수</p>
                <p className="text-lg font-bold text-foreground">
                  {(() => {
                    const minF = Math.min(analysis.recommendedMinFloors, analysis.recommendedMaxFloors)
                    const maxF = Math.max(analysis.recommendedMinFloors, analysis.recommendedMaxFloors)
                    return minF === maxF ? `${minF}층` : `${minF}~${maxF}층`
                  })()}
                </p>
                <p className="text-xs text-muted-foreground">예상 {analysis.estimatedUnits}세대</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-4/10">
                <Car className="h-5 w-5 text-chart-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">필요 주차</p>
                <p className="text-lg font-bold text-foreground">{analysis.requiredParking}대</p>
                <p className="text-xs text-muted-foreground">세대당 {regulation?.parkingRatio}대</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 유효 대지면적 */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{ARCHISCAN_COPY.codeReview.effectiveSiteAnalysis}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">원래 대지면적</span>
            <span className="font-medium text-foreground">{formatArea(siteArea)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">이격거리 적용 후</span>
            <span className="font-medium text-foreground">{formatArea(analysis.effectiveSiteArea)}</span>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">활용률</span>
              <span className={`font-medium ${utilizationRate > 70 ? "text-green-500" : utilizationRate > 50 ? "text-yellow-500" : "text-destructive"}`}>
                {utilizationRate.toFixed(1)}%
              </span>
            </div>
            <Progress value={utilizationRate} className="h-2" />
          </div>
          <div className="text-xs text-muted-foreground bg-secondary/30 rounded p-2">
            전면 {regulation?.setbackFront}m + 측면 {regulation?.setbackSide}m×2 + 후면 {regulation?.setbackRear}m 이격 적용
          </div>
        </CardContent>
      </Card>

      {/* 법규상 유의사항 - Enhanced Risk Cards */}
      {analysis.warnings.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileWarning className="h-4 w-4 text-yellow-500" />
              주요 리스크 및 유의사항
              <Badge variant="outline" className="ml-auto text-xs">
                {analysis.warnings.length}건
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {analysis.warnings.map((warning, index) => (
              <div
                key={index}
                className={`rounded-lg border p-3 ${
                  warning.type === "error"
                    ? "bg-destructive/10 border-destructive/30"
                    : warning.type === "warning"
                    ? "bg-yellow-500/10 border-yellow-500/30"
                    : "bg-blue-500/10 border-blue-500/30"
                }`}
              >
                <div className="flex items-start gap-3">
                  {warning.type === "error" ? (
                    <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  ) : warning.type === "warning" ? (
                    <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                  ) : (
                    <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className={`font-semibold text-sm ${
                        warning.type === "error"
                          ? "text-destructive"
                          : warning.type === "warning"
                          ? "text-yellow-600 dark:text-yellow-400"
                          : "text-blue-600 dark:text-blue-400"
                      }`}>
                        {warning.title}
                      </p>
                      {warning.type === "error" && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                          필수 검토
                        </Badge>
                      )}
                      {warning.type === "warning" && (
                        <Badge className="text-[10px] px-1.5 py-0 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30">
                          주의
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{warning.description}</p>
                    {/* Action suggestion based on warning type */}
                    <p className="text-[11px] text-foreground mt-2 pt-2 border-t border-border/50 flex items-center gap-1">
                      <span className="text-muted-foreground">대응:</span>
                      {warning.type === "error" 
                        ? "인허가 전 반드시 전문가 검토 필요"
                        : warning.type === "warning"
                        ? "사업성 검토 시 조정 필요"
                        : "설계 단계에서 반영 권장"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 추가 검토 필요 항목 */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="h-4 w-4 text-primary" />
            추가 검토 필요 항목
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2">
            {analysis.reviewItems.map((item, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 종합 판단 */}
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Scale className="h-4 w-4 text-primary" />
            종합 판단
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">개발 밀도</p>
                <Badge variant={regulation?.maxFloorAreaRatio ?? 200 > 300 ? "destructive" : regulation?.maxFloorAreaRatio ?? 200 > 200 ? "secondary" : "default"}>
                  {regulation?.maxFloorAreaRatio ?? 200 > 300 ? "고밀도" : regulation?.maxFloorAreaRatio ?? 200 > 200 ? "중밀도" : "저밀도"}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">사업 규모</p>
                <Badge variant="outline">
                  {analysis.estimatedUnits > 100 ? "대규모" : analysis.estimatedUnits > 50 ? "중규모" : "소규모"}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">규제 리스크</p>
                <Badge variant={analysis.warnings.filter(w => w.type === "error").length > 0 ? "destructive" : analysis.warnings.length > 2 ? "secondary" : "default"}>
                  {analysis.warnings.filter(w => w.type === "error").length > 0 ? "높음" : analysis.warnings.length > 2 ? "중간" : "낮음"}
                </Badge>
              </div>
            </div>
            <Separator />
            <p className="text-sm text-muted-foreground">
              {analysis.warnings.filter(w => w.type === "error").length > 0
                ? "법규 검토 결과, 사업 추진 전 반드시 해결해야 할 주요 규제 사항이 발견되었습니다. 전문가 상담을 권고합니다."
                : analysis.warnings.length > 2
                ? "법규 검토 결과, 몇 가지 유의사항이 있으나 사업 추진이 가능할 것으로 판단됩니다. 세부 사항에 대해 추가 확인이 필요합니다."
                : "법규 검토 결과, 특별한 규제 리스크 없이 사업 추진이 가능할 것으로 판단됩니다. 다만, 인허가 과정에서 추가 조건이 부과될 수 있습니다."}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
