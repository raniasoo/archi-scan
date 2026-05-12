"use client"

import { Badge } from "@/components/ui/badge"
import { Scale, MapPin, Ruler, Building2, Car, Layers } from "lucide-react"
import { 
  formatZoneType as formatZoneTypeCommon, 
  formatDistrictPlan,
  ZONE_TYPE_LABELS 
} from "@/lib/project-analysis-state"

// Source type for value origin tracking
export type ValueSource = 'auto' | 'manual' | 'assumed' | 'calculated'

interface SourceLabelProps {
  source: ValueSource
}

function SourceLabel({ source }: SourceLabelProps) {
  const config = {
    auto: { label: '자동', className: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' },
    manual: { label: '수동', className: 'bg-primary/20 text-primary border-primary/30' },
    assumed: { label: '기본', className: 'bg-secondary text-muted-foreground border-border' },
    calculated: { label: '산출', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  }
  const { label, className } = config[source]
  return (
    <span className={`text-[8px] px-1 py-0 rounded border ${className}`}>
      {label}
    </span>
  )
}

export interface BaselineValues {
  siteArea?: number
  zoneType?: string
  zoneTypeLabel?: string
  roadCondition?: string
  heightLimit?: number
  districtPlan?: boolean | string // Support both boolean and legacy string
  parkingRatio?: number
  // Source tracking
  sources?: {
    siteArea?: ValueSource
    zoneType?: ValueSource
    roadCondition?: ValueSource
    heightLimit?: ValueSource
    districtPlan?: ValueSource
    parkingRatio?: ValueSource
  }
}

interface BaselineValuesBarProps {
  values: BaselineValues
  /** Compact single-line mode */
  compact?: boolean
  /** Show source labels */
  showSources?: boolean
  /** Custom title */
  title?: string
}

// Use common format function with optional label override
function formatZoneType(zoneType?: string, label?: string): string {
  if (label) return label
  return formatZoneTypeCommon(zoneType)
}

export function BaselineValuesBar({ 
  values, 
  compact = false,
  showSources = true,
  title = "현재 적용 기준값"
}: BaselineValuesBarProps) {
  const { siteArea, zoneType, zoneTypeLabel, roadCondition, heightLimit, districtPlan, parkingRatio, sources } = values

  // Compact inline mode
  if (compact) {
    const parts = [
      siteArea ? `${siteArea.toLocaleString()}㎡` : null,
      formatZoneType(zoneType, zoneTypeLabel),
      roadCondition || null,
      heightLimit && heightLimit > 0 ? `높이 ${heightLimit}m` : null,
      districtPlan != null ? `지구단위 ${formatDistrictPlan(districtPlan === 'yes' || districtPlan === true)}` : null,
    ].filter(Boolean)

    return (
      <div className="flex items-center gap-2 p-2 rounded-lg border border-border/50 bg-secondary/20">
        <Scale className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <p className="text-[11px] text-muted-foreground leading-relaxed truncate">
          {parts.join(' · ')}
        </p>
      </div>
    )
  }

  // Full grid mode
  return (
    <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
      <div className="flex items-center gap-2 mb-2.5">
        <Scale className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-medium text-foreground">{title}</span>
        <Badge variant="outline" className="ml-auto text-[9px] px-1.5 py-0">
          최종적용
        </Badge>
      </div>
      
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {/* Site Area */}
        <div className="p-2 rounded bg-background/50 border border-border/30">
          <div className="flex items-center gap-1 mb-0.5">
            <MapPin className="h-2.5 w-2.5 text-muted-foreground" />
            <span className="text-[9px] text-muted-foreground">대지면적</span>
            {showSources && sources?.siteArea && <SourceLabel source={sources.siteArea} />}
          </div>
          <span className="text-[11px] font-semibold text-foreground">
            {siteArea ? `${siteArea.toLocaleString()}㎡` : '미입력'}
          </span>
        </div>

        {/* Zone Type */}
        <div className="p-2 rounded bg-background/50 border border-border/30">
          <div className="flex items-center gap-1 mb-0.5">
            <Building2 className="h-2.5 w-2.5 text-muted-foreground" />
            <span className="text-[9px] text-muted-foreground">용도지역</span>
            {showSources && sources?.zoneType && <SourceLabel source={sources.zoneType} />}
          </div>
          <span className="text-[11px] font-semibold text-foreground leading-tight">
            {formatZoneType(zoneType, zoneTypeLabel)}
          </span>
        </div>

        {/* Road Condition */}
        <div className="p-2 rounded bg-background/50 border border-border/30">
          <div className="flex items-center gap-1 mb-0.5">
            <Ruler className="h-2.5 w-2.5 text-muted-foreground" />
            <span className="text-[9px] text-muted-foreground">접도</span>
            {showSources && sources?.roadCondition && <SourceLabel source={sources.roadCondition} />}
          </div>
          <span className="text-[11px] font-semibold text-foreground">
            {roadCondition || '미입력'}
          </span>
        </div>

        {/* Height Limit */}
        <div className="p-2 rounded bg-background/50 border border-border/30">
          <div className="flex items-center gap-1 mb-0.5">
            <Layers className="h-2.5 w-2.5 text-muted-foreground" />
            <span className="text-[9px] text-muted-foreground">높이제한</span>
            {showSources && sources?.heightLimit && <SourceLabel source={sources.heightLimit} />}
          </div>
          <span className="text-[11px] font-semibold text-foreground">
            {heightLimit && heightLimit > 0 ? `${heightLimit}m` : '미입력'}
          </span>
        </div>

        {/* District Plan */}
        <div className="p-2 rounded bg-background/50 border border-border/30">
          <div className="flex items-center gap-1 mb-0.5">
            <Building2 className="h-2.5 w-2.5 text-muted-foreground" />
            <span className="text-[9px] text-muted-foreground">지구단위</span>
            {showSources && sources?.districtPlan && <SourceLabel source={sources.districtPlan} />}
          </div>
          <span className="text-[11px] font-semibold text-foreground">
            {formatDistrictPlan(districtPlan === 'yes' || districtPlan === true ? true : districtPlan === 'no' || districtPlan === false ? false : null)}
          </span>
        </div>

        {/* Parking Ratio */}
        <div className="p-2 rounded bg-background/50 border border-border/30">
          <div className="flex items-center gap-1 mb-0.5">
            <Car className="h-2.5 w-2.5 text-muted-foreground" />
            <span className="text-[9px] text-muted-foreground">주차기준</span>
            {showSources && sources?.parkingRatio && <SourceLabel source={sources.parkingRatio} />}
          </div>
          <span className="text-[11px] font-semibold text-foreground">
            {parkingRatio ? `${parkingRatio}대/세대` : '미입력'}
          </span>
        </div>
      </div>
    </div>
  )
}

// Export source label for reuse
export { SourceLabel }
