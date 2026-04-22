"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { 
  Building2, 
  Ruler, 
  Car, 
  Triangle, 
  ArrowLeftRight,
  MapPin,
  FileText,
  ChevronDown,
  ChevronUp
} from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  ZoningRegulation,
  ZoneType,
  RoadCondition,
  SetbackType,
  ZONE_TYPE_LABELS,
  ROAD_CONDITION_LABELS,
  SETBACK_TYPE_LABELS,
  ZONE_DEFAULTS,
} from "@/lib/regulation-types"

interface RegulationInputProps {
  regulation: ZoningRegulation
  onChange: (regulation: ZoningRegulation) => void
  /** Start collapsed by default */
  defaultCollapsed?: boolean
}

export function RegulationInput({ regulation, onChange, defaultCollapsed = true }: RegulationInputProps) {
  const [isExpanded, setIsExpanded] = useState(!defaultCollapsed)
  const [showAdvanced, setShowAdvanced] = useState(false)
  
  const handleZoneTypeChange = (value: ZoneType) => {
    const defaults = ZONE_DEFAULTS[value]
    onChange({
      ...regulation,
      ...defaults,
      zoneType: value,
    })
  }
  
  const handleChange = <K extends keyof ZoningRegulation>(
    key: K,
    value: ZoningRegulation[K]
  ) => {
    onChange({ ...regulation, [key]: value })
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full text-left"
        >
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              법규 검토 상세 입력
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              {isExpanded ? '기본값을 직접 수정할 수 있습니다' : '직접 수정하려면 클릭하세요'}
            </CardDescription>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </button>
      </CardHeader>
      {isExpanded && (
      <CardContent className="flex flex-col gap-5 pt-0">
        {/* 용도지역 */}
        <div className="flex flex-col gap-2">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <MapPin className="h-4 w-4 text-primary" />
            용도지역
          </Label>
          <Select
            value={regulation.zoneType}
            onValueChange={(v) => handleZoneTypeChange(v as ZoneType)}
          >
            <SelectTrigger className="bg-secondary/50">
              <SelectValue placeholder="용도지역 선택" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ZONE_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {regulation.zoneType === "custom" && (
            <Input
              placeholder="용도지역 직접 입력"
              value={regulation.zoneTypeCustom || ""}
              onChange={(e) => handleChange("zoneTypeCustom", e.target.value)}
              className="mt-2 bg-secondary/50"
            />
          )}
        </div>

        <Separator />

        {/* 건폐율 / 용적률 */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Ruler className="h-4 w-4 text-primary" />
              건폐율 (%)
            </Label>
            <Input
              type="number"
              value={regulation.maxCoverageRatio}
              onChange={(e) => handleChange("maxCoverageRatio", Number(e.target.value))}
              className="bg-secondary/50"
              min={0}
              max={100}
            />
            <p className="text-xs text-muted-foreground">대지면적 대비 건축면적 비율</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Ruler className="h-4 w-4 text-primary" />
              용적률 (%)
            </Label>
            <Input
              type="number"
              value={regulation.maxFloorAreaRatio}
              onChange={(e) => handleChange("maxFloorAreaRatio", Number(e.target.value))}
              className="bg-secondary/50"
              min={0}
              max={2000}
            />
            <p className="text-xs text-muted-foreground">대지면적 대비 연면적 비율</p>
          </div>
        </div>

        {/* 높이제한 */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Building2 className="h-4 w-4 text-primary" />
              높이 제한 (m)
            </Label>
            <Input
              type="number"
              value={regulation.maxHeight}
              onChange={(e) => handleChange("maxHeight", Number(e.target.value))}
              className="bg-secondary/50"
              min={0}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Building2 className="h-4 w-4 text-primary" />
              최대 층수
            </Label>
            <Input
              type="number"
              value={regulation.maxFloors}
              onChange={(e) => handleChange("maxFloors", Number(e.target.value))}
              className="bg-secondary/50"
              min={1}
            />
          </div>
        </div>

        {/* 도로 조건 */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <ArrowLeftRight className="h-4 w-4 text-primary" />
              접도 폭 (m)
            </Label>
            <Input
              type="number"
              value={regulation.roadWidth}
              onChange={(e) => handleChange("roadWidth", Number(e.target.value))}
              className="bg-secondary/50"
              min={0}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <ArrowLeftRight className="h-4 w-4 text-primary" />
              도로 조건
            </Label>
            <Select
              value={regulation.roadCondition}
              onValueChange={(v) => handleChange("roadCondition", v as RoadCondition)}
            >
              <SelectTrigger className="bg-secondary/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ROAD_CONDITION_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 주차 기준 */}
        <div className="flex flex-col gap-2">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Car className="h-4 w-4 text-primary" />
            주차 기준 (세대당 대수)
          </Label>
          <Input
            type="number"
            value={regulation.parkingRatio}
            onChange={(e) => handleChange("parkingRatio", Number(e.target.value))}
            className="bg-secondary/50"
            min={0}
            step={0.1}
          />
          <p className="text-xs text-muted-foreground">예: 1.0 = 세대당 1대, 1.5 = 세대당 1.5대</p>
        </div>

        {/* 고급 설정 토글 */}
        <Button
          variant="ghost"
          className="w-full justify-between"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <span className="flex items-center gap-2">
            <Triangle className="h-4 w-4" />
            사선 제한 및 이격거리 설정
          </span>
          {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>

        {showAdvanced && (
          <div className="flex flex-col gap-4 p-4 bg-secondary/30 rounded-lg">
            {/* 사선 제한 */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium">사선 제한 유형</Label>
                <Select
                  value={regulation.setbackType}
                  onValueChange={(v) => handleChange("setbackType", v as SetbackType)}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SETBACK_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {regulation.setbackType !== "none" && (
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-medium">사선 각도 (도)</Label>
                  <Input
                    type="number"
                    value={regulation.setbackAngle}
                    onChange={(e) => handleChange("setbackAngle", Number(e.target.value))}
                    className="bg-background"
                    min={0}
                    max={90}
                  />
                </div>
              )}
            </div>

            {/* 이격거리 */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium">전면 이격 (m)</Label>
                <Input
                  type="number"
                  value={regulation.setbackFront}
                  onChange={(e) => handleChange("setbackFront", Number(e.target.value))}
                  className="bg-background"
                  min={0}
                  step={0.5}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium">측면 이격 (m)</Label>
                <Input
                  type="number"
                  value={regulation.setbackSide}
                  onChange={(e) => handleChange("setbackSide", Number(e.target.value))}
                  className="bg-background"
                  min={0}
                  step={0.5}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium">후면 이격 (m)</Label>
                <Input
                  type="number"
                  value={regulation.setbackRear}
                  onChange={(e) => handleChange("setbackRear", Number(e.target.value))}
                  className="bg-background"
                  min={0}
                  step={0.5}
                />
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* 기타 규제사항 */}
        <div className="flex flex-col gap-2">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <FileText className="h-4 w-4 text-primary" />
            기타 규제사항
          </Label>
          <Textarea
            placeholder="추가적인 규제 사항이 있으면 입력하세요 (예: 지구단위계획 지침, 문화재보호구역 등)"
            value={regulation.additionalNotes}
            onChange={(e) => handleChange("additionalNotes", e.target.value)}
            className="bg-secondary/50 min-h-[80px]"
          />
        </div>
      </CardContent>
      )}
    </Card>
  )
}
