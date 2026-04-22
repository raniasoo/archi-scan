"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  Rocket,
  ClipboardCheck,
  FileText,
  Building2,
  Scale,
  LayoutGrid,
  Layers,
  Banknote
} from "lucide-react"
import { IS_DEV_MODE } from "@/constants/archiscan-scenarios"
import { ARCHISCAN_COPY } from "@/constants/archiscan-copy"

type CheckStatus = "pass" | "warn" | "fail" | "skip"

interface CheckItem {
  id: string
  label: string
  status: CheckStatus
  detail?: string
}

interface CheckSection {
  id: string
  title: string
  icon: React.ReactNode
  items: CheckItem[]
}

interface ReleaseChecklistPanelProps {
  // 입력 상태
  address?: string
  siteArea?: number
  zoning?: string
  road?: string
  heightLimit?: number
  districtPlan?: string
  
  // 전략/배치안 상태
  selectedStrategy?: string
  recommendedLayout?: {
    id: string
    name: string
    floors: number
    units: number
    parking: number
    buildingCoverage: number
    far: number
    gfa: number
  } | null
  selectedLayout?: {
    id: string
    name: string
    floors: number
    units: number
    parking: number
    buildingCoverage: number
    far: number
    gfa: number
  } | null
  
  // 법규 결과
  regulationResult?: {
    maxCoverage?: number
    maxFar?: number
    maxGfa?: number
    recommendedFloors?: { min: number; max: number }
    requiredParking?: number
  }
  
  // 평면도
  floorPlanName?: string
  
  // 사업성 결과
  feasibilityResult?: {
    planName?: string
    totalCost?: number
    expectedRevenue?: number
    expectedProfit?: number
    roi?: number
    gfa?: number
  }
  
  // 보고서 결과
  reportData?: {
    planName?: string
    verdict?: string
    roi?: number
    totalCost?: number
    expectedRevenue?: number
    units?: number
    floors?: number
    grossFloorArea?: number
  }
  
  // 시나리오
  scenarioId?: string
  
  className?: string
}

export function ReleaseChecklistPanel({
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
  floorPlanName,
  feasibilityResult,
  reportData,
  scenarioId,
  className = "",
}: ReleaseChecklistPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  // 개발 모드가 아니면 렌더링하지 않음
  if (!IS_DEV_MODE) return null

  // 체크 항목 생성
  const createCheckSections = (): CheckSection[] => {
    const sections: CheckSection[] = []
    
    // 1. 입력값 반영
    const inputItems: CheckItem[] = [
      {
        id: "input-address",
        label: "대상지 주소 입력됨",
        status: address && address.length > 0 ? "pass" : "fail",
        detail: address || "미입력",
      },
      {
        id: "input-area",
        label: "대지면적 입력됨",
        status: siteArea && siteArea > 0 ? "pass" : "fail",
        detail: siteArea ? `${siteArea.toLocaleString()}㎡` : "미입력",
      },
      {
        id: "input-zoning",
        label: "용도지역 입력됨",
        status: zoning ? "pass" : "warn",
        detail: zoning || "미입력",
      },
      {
        id: "input-road",
        label: "접도 현황 입력됨",
        status: road ? "pass" : "warn",
        detail: road || "미입력",
      },
      {
        id: "input-height",
        label: "높이제한 입력됨",
        status: heightLimit ? "pass" : "warn",
        detail: heightLimit ? `${heightLimit}m` : "미입력",
      },
    ]
    sections.push({
      id: "input",
      title: "입력값 반영",
      icon: <FileText className="h-4 w-4" />,
      items: inputItems,
    })
    
    // 2. 전략/배치안 상태
    const strategyItems: CheckItem[] = [
      {
        id: "strategy-selected",
        label: "전략 선택됨",
        status: selectedStrategy ? "pass" : "fail",
        detail: selectedStrategy || "미선택",
      },
      {
        id: "strategy-recommended",
        label: "AI 추천안 생성됨",
        status: recommendedLayout ? "pass" : "skip",
        detail: recommendedLayout?.name || "미생성",
      },
      {
        id: "strategy-applied",
        label: "반영 배치안 선택됨",
        status: selectedLayout ? "pass" : "fail",
        detail: selectedLayout?.name || "미선택",
      },
      {
        id: "strategy-distinct",
        label: "추천안/반영안 구분 명확",
        status: recommendedLayout && selectedLayout 
          ? (recommendedLayout.id !== selectedLayout.id ? "warn" : "pass")
          : "skip",
        detail: recommendedLayout && selectedLayout && recommendedLayout.id !== selectedLayout.id 
          ? "다른 배치안 선택됨" 
          : "동일",
      },
    ]
    sections.push({
      id: "strategy",
      title: "전략/배치안 상태",
      icon: <Building2 className="h-4 w-4" />,
      items: strategyItems,
    })
    
    // 3. 법규 검토
    const regulationItems: CheckItem[] = [
      {
        id: "reg-coverage",
        label: "건폐율 계산됨",
        status: regulationResult?.maxCoverage ? "pass" : "skip",
        detail: regulationResult?.maxCoverage ? `${regulationResult.maxCoverage}%` : "-",
      },
      {
        id: "reg-far",
        label: "용적률 계산됨",
        status: regulationResult?.maxFar ? "pass" : "skip",
        detail: regulationResult?.maxFar ? `${regulationResult.maxFar}%` : "-",
      },
      {
        id: "reg-gfa",
        label: "최대 연면적 계산됨",
        status: regulationResult?.maxGfa ? "pass" : "skip",
        detail: regulationResult?.maxGfa ? `${regulationResult.maxGfa.toLocaleString()}㎡` : "-",
      },
      {
        id: "reg-floors",
        label: "권장 층수 계산됨",
        status: regulationResult?.recommendedFloors ? "pass" : "skip",
        detail: regulationResult?.recommendedFloors 
          ? `${regulationResult.recommendedFloors.min}~${regulationResult.recommendedFloors.max}층` 
          : "-",
      },
    ]
    sections.push({
      id: "regulation",
      title: "법규 검토",
      icon: <Scale className="h-4 w-4" />,
      items: regulationItems,
    })
    
    // 4. 배치안 비교
    const comparisonItems: CheckItem[] = [
      {
        id: "comp-layout-match",
        label: "배치안 카드 강조 상태 일치",
        status: selectedLayout ? "pass" : "skip",
        detail: selectedLayout?.name || "-",
      },
      {
        id: "comp-values",
        label: "비교표 수치 정상",
        status: selectedLayout && selectedLayout.floors > 0 && selectedLayout.units > 0 ? "pass" : "warn",
        detail: selectedLayout 
          ? `${selectedLayout.floors}층 / ${selectedLayout.units}세대 / ${selectedLayout.parking}대`
          : "-",
      },
    ]
    sections.push({
      id: "comparison",
      title: "배치안 비교",
      icon: <LayoutGrid className="h-4 w-4" />,
      items: comparisonItems,
    })
    
    // 5. 평면도 검토
    const floorPlanItems: CheckItem[] = [
      {
        id: "floor-name-match",
        label: "평면도 배치안명 일치",
        status: !selectedLayout || !floorPlanName 
          ? "skip"
          : selectedLayout.name === floorPlanName 
            ? "pass" 
            : "fail",
        detail: floorPlanName || "-",
      },
    ]
    sections.push({
      id: "floorplan",
      title: "평면도 검토",
      icon: <Layers className="h-4 w-4" />,
      items: floorPlanItems,
    })
    
    // 6. 사업성 검토
    const feasibilityItems: CheckItem[] = [
      {
        id: "feas-name-match",
        label: "사업성 배치안명 일치",
        status: !selectedLayout || !feasibilityResult?.planName
          ? "skip"
          : selectedLayout.name === feasibilityResult.planName
            ? "pass"
            : "fail",
        detail: feasibilityResult?.planName || "-",
      },
      {
        id: "feas-roi",
        label: "ROI 계산됨",
        status: feasibilityResult?.roi !== undefined ? "pass" : "skip",
        detail: feasibilityResult?.roi !== undefined ? `${feasibilityResult.roi.toFixed(1)}%` : "-",
      },
      {
        id: "feas-cost",
        label: "총 투자비 계산됨",
        status: feasibilityResult?.totalCost ? "pass" : "skip",
        detail: feasibilityResult?.totalCost ? `${feasibilityResult.totalCost.toFixed(1)}억원` : "-",
      },
      {
        id: "feas-gfa-match",
        label: "연면적 일치",
        status: !selectedLayout || !feasibilityResult?.gfa
          ? "skip"
          : Math.abs((selectedLayout.gfa || 0) - (feasibilityResult.gfa || 0)) < 1
            ? "pass"
            : "fail",
        detail: feasibilityResult?.gfa ? `${feasibilityResult.gfa.toLocaleString()}㎡` : "-",
      },
    ]
    sections.push({
      id: "feasibility",
      title: "사업성 검토",
      icon: <Banknote className="h-4 w-4" />,
      items: feasibilityItems,
    })
    
    // 7. 최종 보고서
    const reportItems: CheckItem[] = [
      {
        id: "report-name-match",
        label: "보고서 배치안명 일치",
        status: !selectedLayout || !reportData?.planName
          ? "skip"
          : selectedLayout.name === reportData.planName
            ? "pass"
            : "fail",
        detail: reportData?.planName || "-",
      },
      {
        id: "report-units-match",
        label: "보고서 세대수 일치",
        status: !selectedLayout || !reportData?.units
          ? "skip"
          : selectedLayout.units === reportData.units
            ? "pass"
            : "fail",
        detail: reportData?.units ? `${reportData.units}세대` : "-",
      },
      {
        id: "report-roi-match",
        label: "보고서 ROI 일치",
        status: !feasibilityResult?.roi || !reportData?.roi
          ? "skip"
          : Math.abs(feasibilityResult.roi - reportData.roi) < 0.1
            ? "pass"
            : "fail",
        detail: reportData?.roi !== undefined ? `${reportData.roi.toFixed(1)}%` : "-",
      },
      {
        id: "report-verdict",
        label: "종합 판단 표시됨",
        status: reportData?.verdict ? "pass" : "skip",
        detail: reportData?.verdict || "-",
      },
    ]
    sections.push({
      id: "report",
      title: "최종 보고서",
      icon: <ClipboardCheck className="h-4 w-4" />,
      items: reportItems,
    })
    
    return sections
  }

  const sections = createCheckSections()
  
  // 전체 통계 계산
  const allItems = sections.flatMap(s => s.items)
  const passCount = allItems.filter(i => i.status === "pass").length
  const warnCount = allItems.filter(i => i.status === "warn").length
  const failCount = allItems.filter(i => i.status === "fail").length
  const skipCount = allItems.filter(i => i.status === "skip").length
  const totalChecked = passCount + warnCount + failCount
  
  // 핵심 일치 항목 검증
  const criticalChecks = [
    { id: "layout-report", pass: selectedLayout?.name === reportData?.planName, label: "배치안명 = 보고서" },
    { id: "layout-floorplan", pass: selectedLayout?.name === floorPlanName, label: "배치안명 = 평면도" },
    { id: "units-report", pass: selectedLayout?.units === reportData?.units, label: "세대수 = 보고서" },
    { id: "roi-match", pass: Math.abs((feasibilityResult?.roi || 0) - (reportData?.roi || 0)) < 0.1, label: "ROI 일치" },
  ]
  const criticalPass = criticalChecks.filter(c => c.pass).length
  const criticalTotal = criticalChecks.length
  
  // 배포 가능 여부 판정
  const isDeployable = failCount === 0 && criticalPass === criticalTotal
  
  // 상태 아이콘
  const StatusIcon = ({ status }: { status: CheckStatus }) => {
    switch (status) {
      case "pass": return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
      case "warn": return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
      case "fail": return <XCircle className="h-3.5 w-3.5 text-red-500" />
      case "skip": return <div className="h-3.5 w-3.5 rounded-full bg-muted" />
    }
  }

  return (
    <div className={`fixed bottom-4 left-4 z-40 max-w-sm ${className}`}>
      <Card className="border-purple-500/30 bg-background/95 backdrop-blur-sm shadow-lg">
        <CardHeader className="py-2 px-3 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-[10px]">
                RELEASE
              </Badge>
              <CardTitle className="text-xs font-medium text-purple-400">배포 전 최종 점검</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {/* 전체 상태 배지 */}
              {isDeployable ? (
                <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30 text-[10px] gap-1">
                  <Rocket className="h-3 w-3" />
                  배포 가능
                </Badge>
              ) : (
                <Badge className="bg-red-500/20 text-red-500 border-red-500/30 text-[10px] gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  수정 필요
                </Badge>
              )}
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          {/* 요약 통계 */}
          <div className="flex items-center gap-3 mt-1 text-[10px]">
            <span className="text-emerald-500">통과 {passCount}</span>
            <span className="text-amber-500">주의 {warnCount}</span>
            <span className="text-red-500">실패 {failCount}</span>
            <span className="text-muted-foreground">생략 {skipCount}</span>
          </div>
        </CardHeader>
        
        {isExpanded && (
          <CardContent className="py-2 px-3 max-h-[60vh] overflow-y-auto space-y-3">
            {/* 시나리오 ID */}
            {scenarioId && (
              <div className="text-[10px] text-muted-foreground bg-secondary/30 p-2 rounded">
                시나리오: {scenarioId}
              </div>
            )}
            
            {/* 핵심 일치 항목 */}
            <div className="p-2 rounded bg-secondary/30 border border-border/50">
              <p className="text-[10px] font-medium text-foreground mb-2">핵심 일치 검증 ({criticalPass}/{criticalTotal})</p>
              <div className="space-y-1">
                {criticalChecks.map(check => (
                  <div key={check.id} className="flex items-center gap-2 text-[10px]">
                    {check.pass ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-500" />
                    )}
                    <span className={check.pass ? "text-muted-foreground" : "text-red-400"}>
                      {check.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* 섹션별 체크리스트 */}
            {sections.map(section => {
              const sectionFails = section.items.filter(i => i.status === "fail").length
              const sectionWarns = section.items.filter(i => i.status === "warn").length
              
              return (
                <div key={section.id} className="space-y-1">
                  <div className="flex items-center gap-2 text-[11px] font-medium text-foreground">
                    {section.icon}
                    <span>{section.title}</span>
                    {sectionFails > 0 && (
                      <Badge variant="outline" className="text-[9px] h-4 bg-red-500/10 text-red-500 border-red-500/30">
                        {sectionFails} 실패
                      </Badge>
                    )}
                    {sectionWarns > 0 && sectionFails === 0 && (
                      <Badge variant="outline" className="text-[9px] h-4 bg-amber-500/10 text-amber-500 border-amber-500/30">
                        {sectionWarns} 주의
                      </Badge>
                    )}
                  </div>
                  <div className="pl-6 space-y-1">
                    {section.items.map(item => (
                      <div key={item.id} className="flex items-center gap-2 text-[10px]">
                        <StatusIcon status={item.status} />
                        <span className="text-muted-foreground flex-1">{item.label}</span>
                        <span className={`font-mono truncate max-w-[100px] ${
                          item.status === "fail" ? "text-red-400" : 
                          item.status === "warn" ? "text-amber-400" : 
                          "text-foreground"
                        }`}>
                          {item.detail}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
            
            {/* 체크 결과 배열 (개발자용) */}
            <details className="text-[10px]">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                체크 결과 배열 보기
              </summary>
              <pre className="mt-1 p-2 bg-secondary/50 rounded text-[9px] overflow-x-auto">
                {JSON.stringify(
                  allItems.map(i => ({ id: i.id, status: i.status })),
                  null,
                  2
                )}
              </pre>
            </details>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
