"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  FileText, 
  MapPin, 
  Scale, 
  Target, 
  Building2, 
  Layers, 
  TrendingUp,
  AlertTriangle,
  CheckCircle2
} from "lucide-react"

interface ReportSection {
  title: string
  status: 'complete' | 'partial' | 'missing'
  summary?: string
}

interface ReportPreviewSummaryProps {
  sections: {
    siteInfo?: { address: string; area: number }
    baselineValues?: { zoneType: string; roadCondition: string; heightLimit?: number }
    strategy?: { name: string; description: string }
    regulation?: { coverage: number; far: number; floors: number }
    floorPlan?: { units: number; parking: number }
    feasibility?: { roi: number; judgment: string }
    risks?: string[]
  }
}

export function ReportPreviewSummary({ sections }: ReportPreviewSummaryProps) {
  const reportSections: ReportSection[] = [
    {
      title: '대상지 정보',
      status: sections.siteInfo ? 'complete' : 'missing',
      summary: sections.siteInfo 
        ? `${sections.siteInfo.address} / ${sections.siteInfo.area.toLocaleString()}㎡`
        : undefined,
    },
    {
      title: '적용 기준값',
      status: sections.baselineValues ? 'complete' : 'partial',
      summary: sections.baselineValues
        ? `${sections.baselineValues.zoneType} · ${sections.baselineValues.roadCondition}${sections.baselineValues.heightLimit ? ` · ${sections.baselineValues.heightLimit}m` : ''}`
        : '일부 항목 확인 필요',
    },
    {
      title: '선택 전략',
      status: sections.strategy ? 'complete' : 'missing',
      summary: sections.strategy?.name,
    },
    {
      title: '법규 검토',
      status: sections.regulation ? 'complete' : 'partial',
      summary: sections.regulation
        ? `건폐율 ${sections.regulation.coverage}% · 용적률 ${sections.regulation.far}% · ${sections.regulation.floors}층`
        : undefined,
    },
    {
      title: '평면도 요약',
      status: sections.floorPlan ? 'complete' : 'partial',
      summary: sections.floorPlan
        ? `${sections.floorPlan.units}세대 · 주차 ${sections.floorPlan.parking}대`
        : undefined,
    },
    {
      title: '사업성 결과',
      status: sections.feasibility ? 'complete' : 'partial',
      summary: sections.feasibility
        ? `${sections.feasibility.judgment} (ROI ${sections.feasibility.roi.toFixed(1)}%)`
        : undefined,
    },
    {
      title: '리스크 및 추가 검토',
      status: sections.risks && sections.risks.length > 0 ? 'complete' : 'partial',
      summary: sections.risks && sections.risks.length > 0
        ? `${sections.risks.length}개 항목`
        : '추가 검토 항목 없음',
    },
  ]

  const completedCount = reportSections.filter(s => s.status === 'complete').length
  const totalCount = reportSections.length

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <span className="text-base font-semibold">보고서에 포함될 핵심 내용</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {completedCount}/{totalCount} 완료
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {reportSections.map((section, idx) => {
            const Icon = section.status === 'complete' 
              ? CheckCircle2 
              : section.status === 'partial' 
                ? AlertTriangle 
                : AlertTriangle
            const iconClass = section.status === 'complete'
              ? 'text-emerald-500'
              : section.status === 'partial'
                ? 'text-amber-500'
                : 'text-red-500'

            return (
              <div 
                key={idx}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-background/50 border border-border/30"
              >
                <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground">{section.title}</span>
                    {section.status !== 'complete' && (
                      <Badge 
                        variant="outline" 
                        className={`text-[9px] px-1 py-0 ${
                          section.status === 'partial' 
                            ? 'border-amber-500/30 text-amber-500' 
                            : 'border-red-500/30 text-red-500'
                        }`}
                      >
                        {section.status === 'partial' ? '일부' : '미완료'}
                      </Badge>
                    )}
                  </div>
                  {section.summary && (
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {section.summary}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-3 pt-3 border-t border-border/50">
          <p className="text-[10px] text-muted-foreground text-center">
            모든 항목이 완료되면 최종 보고서를 생성할 수 있습니다
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
