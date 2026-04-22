"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FlaskConical, CheckCircle2, AlertTriangle, Building2, Layers, Car, TrendingUp } from "lucide-react"
import { ARCHISCAN_SCENARIOS, type ArchiScanScenario, IS_DEV_MODE } from "@/constants/archiscan-scenarios"
import { ARCHISCAN_COPY } from "@/constants/archiscan-copy"

interface ScenarioSelectorProps {
  onApplyScenario: (scenario: ArchiScanScenario) => void
  currentScenarioId?: string
  className?: string
}

export function ScenarioSelector({ onApplyScenario, currentScenarioId, className }: ScenarioSelectorProps) {
  const [selectedId, setSelectedId] = useState<string>(currentScenarioId || "")
  const [showConfirm, setShowConfirm] = useState(false)

  const selectedScenario = ARCHISCAN_SCENARIOS.find(s => s.id === selectedId)

  // 프로덕션에서는 숨김
  if (!IS_DEV_MODE) return null

  const handleSelect = (id: string) => {
    setSelectedId(id)
    setShowConfirm(true)
  }

  const handleApply = () => {
    if (selectedScenario) {
      onApplyScenario(selectedScenario)
      setShowConfirm(false)
    }
  }

  return (
    <Card className={`border-amber-500/30 bg-amber-500/5 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <FlaskConical className="h-4 w-4 text-amber-500" />
          <span className="text-foreground">테스트 시나리오 선택</span>
          <Badge variant="outline" className="ml-auto bg-amber-500/20 text-amber-500 border-amber-500/30 text-[10px]">
            DEV
          </Badge>
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">
          미리 정의된 검증용 조건을 불러와 빠르게 화면을 확인할 수 있습니다.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Scenario Dropdown */}
        <Select value={selectedId} onValueChange={handleSelect}>
          <SelectTrigger className="w-full text-xs h-9 bg-background">
            <SelectValue placeholder="시나리오를 선택하세요" />
          </SelectTrigger>
          <SelectContent>
            {ARCHISCAN_SCENARIOS.map((scenario) => (
              <SelectItem key={scenario.id} value={scenario.id} className="text-xs">
                {scenario.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Selected Scenario Summary */}
        {selectedScenario && (
          <div className="space-y-3">
            {/* Expected Results Preview */}
            <div className="p-3 rounded-lg bg-background/50 border border-border/50 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                <span className="text-[11px] font-medium text-foreground">예상 결과 미리보기</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">배치안:</span>
                  <span className="font-medium text-foreground">{selectedScenario.expected.selectedPlan}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Layers className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">층수:</span>
                  <span className="font-medium text-foreground">{selectedScenario.expected.floors}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">세대수:</span>
                  <span className="font-medium text-foreground">{selectedScenario.expected.units}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Car className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">주차:</span>
                  <span className="font-medium text-foreground">{selectedScenario.expected.parking}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">연면적:</span>
                  <span className="font-medium text-foreground">{selectedScenario.expected.totalFloorArea}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">ROI:</span>
                  <span className="font-medium text-primary">{selectedScenario.expected.roi}</span>
                </div>
              </div>

              {/* Verdict Badge */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[10px] text-muted-foreground">예상 판정:</span>
                <Badge 
                  variant="outline" 
                  className={
                    selectedScenario.expected.verdict === "사업 추진 가능" 
                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-[10px]"
                      : selectedScenario.expected.verdict === "조건부 가능"
                      ? "bg-amber-500/10 text-amber-500 border-amber-500/30 text-[10px]"
                      : "bg-red-500/10 text-red-500 border-red-500/30 text-[10px]"
                  }
                >
                  {selectedScenario.expected.verdict}
                </Badge>
              </div>
            </div>

            {/* Confirm Warning */}
            {showConfirm && (
              <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-[10px] text-amber-500">
                  시나리오를 적용하면 현재 입력값이 교체됩니다.
                </p>
              </div>
            )}

            {/* Apply Button */}
            <Button 
              onClick={handleApply} 
              size="sm" 
              className="w-full h-8 text-xs"
              variant={showConfirm ? "default" : "secondary"}
            >
              <FlaskConical className="h-3.5 w-3.5 mr-1.5" />
              이 시나리오 적용
            </Button>
          </div>
        )}

        {/* Input Summary (if selected) */}
        {selectedScenario && (
          <details className="text-[10px]">
            <summary className="text-muted-foreground cursor-pointer hover:text-foreground">
              입력값 상세 보기
            </summary>
            <div className="mt-2 p-2 rounded bg-background/30 space-y-1 text-muted-foreground">
              <div>주소: {selectedScenario.input.address}</div>
              <div>면적: {selectedScenario.input.siteArea}㎡</div>
              <div>용도지역: {selectedScenario.input.zoning}</div>
              <div>접도: {selectedScenario.input.road}</div>
              <div>높이제한: {selectedScenario.input.heightLimit}</div>
              <div>지구단위: {selectedScenario.input.districtPlan}</div>
              <div>전략: {selectedScenario.input.selectedStrategy}</div>
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  )
}

export default ScenarioSelector
