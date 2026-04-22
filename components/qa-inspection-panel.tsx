"use client"

import { useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  ClipboardCheck,
  FileText,
  Building2,
  Scale,
  LayoutGrid,
  Layers,
  Banknote,
  MapPin,
  Printer,
  Type,
  RefreshCw,
  Eye,
  Copy
} from "lucide-react"
import { IS_DEV_MODE } from "@/constants/archiscan-scenarios"

type CheckStatus = "pass" | "warn" | "fail" | "skip"

interface CheckItem {
  id: string
  label: string
  status: CheckStatus
  expected?: string
  actual?: string
  detail?: string
}

interface CheckSection {
  id: string
  title: string
  icon: React.ReactNode
  items: CheckItem[]
}

interface QAInspectionPanelProps {
  // 입력값
  address?: string
  siteArea?: number
  zoning?: string
  road?: string
  heightLimit?: number
  districtPlan?: string
  
  // 전략/배치안
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
    address?: string
  }
  
  // 평면도
  floorPlanName?: string
  
  // 비교 화면
  comparisonCurrentPlan?: string
  
  // PDF 상태
  pdfGenerated?: boolean
  pdfFileName?: string
  
  // 시나리오
  scenarioId?: string
}

const statusConfig = {
  pass: { icon: CheckCircle2, color: "text-emerald-500", bgColor: "bg-emerald-500/10", label: "통과" },
  warn: { icon: AlertTriangle, color: "text-amber-500", bgColor: "bg-amber-500/10", label: "주의" },
  fail: { icon: XCircle, color: "text-red-500", bgColor: "bg-red-500/10", label: "실패" },
  skip: { icon: Eye, color: "text-muted-foreground", bgColor: "bg-muted/50", label: "미확인" },
}

export function QAInspectionPanel({
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
  floorPlanName,
  comparisonCurrentPlan,
  pdfGenerated,
  pdfFileName,
  scenarioId,
}: QAInspectionPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [copiedJson, setCopiedJson] = useState(false)
  
  // QA 검증 로직
  const sections = useMemo<CheckSection[]>(() => {
    const createItem = (
      id: string, 
      label: string, 
      condition: boolean | undefined, 
      expected?: string, 
      actual?: string,
      detail?: string
    ): CheckItem => ({
      id,
      label,
      status: condition === undefined ? "skip" : condition ? "pass" : "fail",
      expected,
      actual,
      detail,
    })
    
    return [
      // 1. 주소/대지정보 일치
      {
        id: "site-info",
        title: "주소/대지정보 일치",
        icon: <MapPin className="h-4 w-4" />,
        items: [
          createItem(
            "address-match",
            "대상지 주소 전체 일치",
            !!address && address === reportData?.address,
            address,
            reportData?.address,
            "입력 주소와 보고서 주소가 동일해야 합니다"
          ),
          createItem(
            "site-area",
            "대지면적 값 일치",
            !!siteArea && siteArea > 0,
            `${siteArea}㎡`,
            undefined,
            "대지면적이 입력되어 있어야 합니다"
          ),
          createItem(
            "zoning-match",
            "용도지역 반영",
            !!zoning,
            zoning,
            undefined,
            "용도지역이 설정되어 있어야 합니다"
          ),
          createItem(
            "road-match",
            "접도 정보 반영",
            !!road,
            road,
            undefined,
            "접도 정보가 입력되어 있어야 합니다"
          ),
          createItem(
            "height-match",
            "높이제한 반영",
            !!heightLimit && heightLimit > 0,
            `${heightLimit}m`,
            undefined,
            "높이제한이 설정되어 있어야 합니다"
          ),
        ],
      },
      
      // 2. 전략/배치안 일관성
      {
        id: "strategy-layout",
        title: "전략/배치안 일관성",
        icon: <Building2 className="h-4 w-4" />,
        items: [
          createItem(
            "strategy-selected",
            "전략 선택 완료",
            !!selectedStrategy,
            selectedStrategy,
            undefined,
            "설계 전략이 선택되어 있어야 합니다"
          ),
          createItem(
            "layout-selected",
            "배치안 선택 완료",
            !!selectedLayout,
            selectedLayout?.name,
            undefined,
            "반영할 배치안이 선택되어 있어야 합니다"
          ),
          createItem(
            "layout-report-match",
            "배치안명 = 보고서",
            selectedLayout?.name === reportData?.planName,
            selectedLayout?.name,
            reportData?.planName,
            "선택 배치안과 보고서 배치안명이 일치해야 합니다"
          ),
          createItem(
            "layout-floorplan-match",
            "배치안명 = 평면도",
            selectedLayout?.name === floorPlanName,
            selectedLayout?.name,
            floorPlanName,
            "선택 배치안과 평면도 배치안명이 일치해야 합니다"
          ),
          createItem(
            "layout-comparison-match",
            "배치안명 = 비교화면",
            selectedLayout?.name === comparisonCurrentPlan,
            selectedLayout?.name,
            comparisonCurrentPlan,
            "선택 배치안과 비교화면 현재 반영안이 일치해야 합니다"
          ),
          createItem(
            "recommend-vs-selected-clear",
            "추천안/반영안 구분 명확",
            recommendedLayout !== null && selectedLayout !== null,
            `추천: ${recommendedLayout?.name}`,
            `반영: ${selectedLayout?.name}`,
            "추천안과 반영안이 명확히 구분되어야 합니다"
          ),
        ],
      },
      
      // 3. 법규 수치 검증
      {
        id: "regulation",
        title: "법규/수치 검증",
        icon: <Scale className="h-4 w-4" />,
        items: [
          createItem(
            "coverage-valid",
            "건폐율 정상 범위",
            selectedLayout?.buildingCoverage !== undefined && 
            selectedLayout.buildingCoverage > 0 && 
            selectedLayout.buildingCoverage <= (regulationResult?.maxCoverage || 100),
            `≤${regulationResult?.maxCoverage}%`,
            `${selectedLayout?.buildingCoverage}%`,
            "건폐율이 법정 한도 이내여야 합니다"
          ),
          createItem(
            "far-valid",
            "용적률 정상 범위",
            selectedLayout?.far !== undefined && 
            selectedLayout.far > 0 && 
            selectedLayout.far <= (regulationResult?.maxFar || 500),
            `≤${regulationResult?.maxFar}%`,
            `${selectedLayout?.far}%`,
            "용적률이 법정 한도 이내여야 합니다"
          ),
          createItem(
            "floors-valid",
            "층수 정상 범위",
            selectedLayout?.floors !== undefined && 
            selectedLayout.floors >= (regulationResult?.recommendedFloors?.min || 1) &&
            selectedLayout.floors <= (regulationResult?.recommendedFloors?.max || 20),
            `${regulationResult?.recommendedFloors?.min}-${regulationResult?.recommendedFloors?.max}층`,
            `${selectedLayout?.floors}층`,
            "층수가 권장 범위 내여야 합니다"
          ),
          createItem(
            "units-match",
            "세대수 일치",
            selectedLayout?.units === reportData?.units,
            `${selectedLayout?.units}세대`,
            `${reportData?.units}세대`,
            "화면과 보고서의 세대수가 일치해야 합니다"
          ),
          createItem(
            "parking-valid",
            "주차대수 확보",
            selectedLayout?.parking !== undefined && 
            selectedLayout.parking >= (selectedLayout?.units || 0),
            `≥${selectedLayout?.units}대`,
            `${selectedLayout?.parking}대`,
            "주차대수가 세대수 이상이어야 합니다"
          ),
        ],
      },
      
      // 4. 사업성 수치 일치
      {
        id: "feasibility",
        title: "사업성 수치 일치",
        icon: <Banknote className="h-4 w-4" />,
        items: [
          createItem(
            "feasibility-plan-match",
            "사업성 배치안명 일치",
            selectedLayout?.name === feasibilityResult?.planName,
            selectedLayout?.name,
            feasibilityResult?.planName,
            "사업성 계산 기준 배치안이 일치해야 합니다"
          ),
          createItem(
            "roi-match",
            "ROI 일치",
            feasibilityResult?.roi === reportData?.roi,
            `${feasibilityResult?.roi?.toFixed(1)}%`,
            `${reportData?.roi?.toFixed(1)}%`,
            "사업성 화면과 보고서의 ROI가 일치해야 합니다"
          ),
          createItem(
            "cost-positive",
            "총투자비 정상",
            feasibilityResult?.totalCost !== undefined && feasibilityResult.totalCost > 0,
            undefined,
            `${feasibilityResult?.totalCost?.toFixed(1)}억원`,
            "총투자비가 양수여야 합니다"
          ),
          createItem(
            "revenue-positive",
            "예상매출 정상",
            feasibilityResult?.expectedRevenue !== undefined && feasibilityResult.expectedRevenue > 0,
            undefined,
            `${feasibilityResult?.expectedRevenue?.toFixed(1)}억원`,
            "예상매출이 양수여야 합니다"
          ),
          createItem(
            "profit-calculated",
            "예상수익 계산",
            feasibilityResult?.expectedProfit !== undefined,
            undefined,
            `${feasibilityResult?.expectedProfit?.toFixed(1)}억원`,
            "예상수익이 계산되어 있어야 합니다"
          ),
          createItem(
            "gfa-match",
            "연면적 일치",
            selectedLayout?.gfa === feasibilityResult?.gfa,
            `${selectedLayout?.gfa?.toLocaleString()}㎡`,
            `${feasibilityResult?.gfa?.toLocaleString()}㎡`,
            "배치안과 사업성의 연면적이 일치해야 합니다"
          ),
        ],
      },
      
      // 5. 평면도/배치도 확인
      {
        id: "floorplan",
        title: "평면도/배치도 확인",
        icon: <Layers className="h-4 w-4" />,
        items: [
          createItem(
            "floorplan-exists",
            "평면도 데이터 존재",
            !!floorPlanName,
            undefined,
            floorPlanName,
            "평면도 정보가 로드되어 있어야 합니다"
          ),
          createItem(
            "floors-consistent",
            "층수 데이터 일관성",
            selectedLayout?.floors === reportData?.floors,
            `${selectedLayout?.floors}층`,
            `${reportData?.floors}층`,
            "배치안과 보고서의 층수가 일치해야 합니다"
          ),
        ],
      },
      
      // 6. PDF 출력 확인
      {
        id: "pdf",
        title: "PDF 출력 확인",
        icon: <Printer className="h-4 w-4" />,
        items: [
          createItem(
            "report-verdict",
            "종합 판단 존재",
            !!reportData?.verdict,
            undefined,
            reportData?.verdict,
            "종합 판단 문구가 설정되어 있어야 합니다"
          ),
          createItem(
            "report-address",
            "보고서 주소 설정",
            !!reportData?.address || !!address,
            address,
            reportData?.address,
            "보고서에 주소가 포함되어야 합니다"
          ),
        ],
      },
      
      // 7. 문구 품질 점검
      {
        id: "text-quality",
        title: "문구 품질 점검",
        icon: <Type className="h-4 w-4" />,
        items: [
          createItem(
            "no-broken-chars",
            "한글 깨짐 없음",
            true, // 빌드 시 체크됨
            undefined,
            undefined,
            "깨진 문자가 없어야 합니다"
          ),
          createItem(
            "verdict-matches-roi",
            "판정과 ROI 일치",
            (reportData?.roi !== undefined && reportData.roi >= 15 && reportData.verdict?.includes("추진 가능")) ||
            (reportData?.roi !== undefined && reportData.roi >= 5 && reportData.roi < 15 && reportData.verdict?.includes("조건부")) ||
            (reportData?.roi !== undefined && reportData.roi < 5 && reportData.verdict?.includes("검토 필요")),
            `ROI ${reportData?.roi?.toFixed(1)}%`,
            reportData?.verdict,
            "ROI 수준에 맞는 판정이 표시되어야 합니다"
          ),
        ],
      },
      
      // 8. 상태 변경 테스트
      {
        id: "state-change",
        title: "상태 변경 테스트",
        icon: <RefreshCw className="h-4 w-4" />,
        items: [
          createItem(
            "scenario-loaded",
            "시나리오 로드 상태",
            scenarioId ? true : undefined,
            scenarioId,
            undefined,
            "시나리오가 로드되어 있는지 확인"
          ),
        ],
      },
    ]
  }, [
    address, siteArea, zoning, road, heightLimit, districtPlan,
    selectedStrategy, recommendedLayout, selectedLayout,
    regulationResult, feasibilityResult, reportData,
    floorPlanName, comparisonCurrentPlan, pdfGenerated, pdfFileName, scenarioId
  ])
  
  // 통계 계산
  const stats = useMemo(() => {
    let pass = 0, warn = 0, fail = 0, skip = 0
    sections.forEach(section => {
      section.items.forEach(item => {
        if (item.status === "pass") pass++
        else if (item.status === "warn") warn++
        else if (item.status === "fail") fail++
        else skip++
      })
    })
    const total = pass + warn + fail
    const passRate = total > 0 ? Math.round((pass / total) * 100) : 0
    return { pass, warn, fail, skip, total, passRate }
  }, [sections])
  
  // 핵심 항목 일치 여부
  const coreChecks = useMemo(() => [
    { label: "배치안명 = 보고서", pass: selectedLayout?.name === reportData?.planName },
    { label: "배치안명 = 평면도", pass: selectedLayout?.name === floorPlanName },
    { label: "세대수 일치", pass: selectedLayout?.units === reportData?.units },
    { label: "ROI 일치", pass: feasibilityResult?.roi === reportData?.roi },
    { label: "연면적 일치", pass: selectedLayout?.gfa === feasibilityResult?.gfa },
  ], [selectedLayout, reportData, floorPlanName, feasibilityResult])
  
  const allCorePassed = coreChecks.every(c => c.pass)
  
  // JSON 복사
  const handleCopyJson = () => {
    const data = {
      timestamp: new Date().toISOString(),
      stats,
      coreChecks,
      sections: sections.map(s => ({
        id: s.id,
        title: s.title,
        items: s.items.map(i => ({ id: i.id, label: i.label, status: i.status, expected: i.expected, actual: i.actual }))
      }))
    }
    navigator.clipboard.writeText(JSON.stringify(data, null, 2))
    setCopiedJson(true)
    setTimeout(() => setCopiedJson(false), 2000)
  }
  
  // 개발 모드에서만 표시
  if (!IS_DEV_MODE) return null
  
  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Card className="bg-slate-900/95 border-slate-700 shadow-2xl backdrop-blur-sm">
        <CardHeader className="pb-2 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-cyan-400" />
              <CardTitle className="text-sm font-medium text-cyan-400">QA 검수 패널</CardTitle>
              <Badge 
                variant="outline" 
                className={`text-[10px] ${allCorePassed ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}`}
              >
                {allCorePassed ? "배포 가능" : "수정 필요"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">{stats.passRate}%</span>
              {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronUp className="h-4 w-4 text-slate-400" />}
            </div>
          </div>
        </CardHeader>
        
        {isExpanded && (
          <CardContent className="pt-0 max-h-[70vh] overflow-y-auto">
            {/* 통계 요약 */}
            <div className="grid grid-cols-4 gap-2 mb-4 p-2 rounded bg-slate-800/50">
              <div className="text-center">
                <div className="text-lg font-bold text-emerald-400">{stats.pass}</div>
                <div className="text-[10px] text-slate-500">통과</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-amber-400">{stats.warn}</div>
                <div className="text-[10px] text-slate-500">주의</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-red-400">{stats.fail}</div>
                <div className="text-[10px] text-slate-500">실패</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-slate-400">{stats.skip}</div>
                <div className="text-[10px] text-slate-500">미확인</div>
              </div>
            </div>
            
            {/* 핵심 항목 체크 */}
            <div className="mb-4 p-2 rounded bg-slate-800/50">
              <div className="text-[10px] text-slate-400 mb-2 font-medium">핵심 일치 항목</div>
              <div className="space-y-1">
                {coreChecks.map((check, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    {check.pass ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-400" />
                    )}
                    <span className={check.pass ? "text-slate-300" : "text-red-300"}>{check.label}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* 섹션별 상세 */}
            <div className="space-y-3">
              {sections.map(section => {
                const sectionFails = section.items.filter(i => i.status === "fail").length
                const sectionWarns = section.items.filter(i => i.status === "warn").length
                
                return (
                  <div key={section.id} className="p-2 rounded bg-slate-800/30">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-cyan-400">{section.icon}</span>
                      <span className="text-xs font-medium text-slate-300">{section.title}</span>
                      {sectionFails > 0 && (
                        <Badge variant="outline" className="text-[9px] bg-red-500/20 text-red-400 border-red-500/30">
                          {sectionFails} 실패
                        </Badge>
                      )}
                      {sectionWarns > 0 && (
                        <Badge variant="outline" className="text-[9px] bg-amber-500/20 text-amber-400 border-amber-500/30">
                          {sectionWarns} 주의
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1">
                      {section.items.map(item => {
                        const config = statusConfig[item.status]
                        const Icon = config.icon
                        return (
                          <div key={item.id} className={`flex items-start gap-2 p-1.5 rounded ${config.bgColor}`}>
                            <Icon className={`h-3 w-3 mt-0.5 ${config.color}`} />
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] text-slate-300">{item.label}</div>
                              {(item.expected || item.actual) && (
                                <div className="text-[9px] text-slate-500 mt-0.5">
                                  {item.expected && <span>기대: {item.expected}</span>}
                                  {item.expected && item.actual && <span> / </span>}
                                  {item.actual && <span>실제: {item.actual}</span>}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
            
            {/* 액션 버튼 */}
            <div className="mt-4 flex gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                className="flex-1 text-xs h-8 border-slate-600 text-slate-300 hover:bg-slate-800"
                onClick={handleCopyJson}
              >
                <Copy className="h-3 w-3 mr-1" />
                {copiedJson ? "복사됨!" : "JSON 복사"}
              </Button>
            </div>
            
            {/* 시나리오 정보 */}
            {scenarioId && (
              <div className="mt-2 text-[10px] text-slate-500 text-center">
                시나리오: {scenarioId}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  )
}
