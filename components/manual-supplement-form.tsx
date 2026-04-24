"use client"

import { useState, useMemo, Component, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  CheckCircle2, 
  AlertTriangle, 
  Edit3, 
  Save, 
  ArrowRight, 
  Clock,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from "lucide-react"

// ============================================
// Safe Select Constants & Helpers
// ============================================

/**
 * SAFE SELECT PATTERN GUIDELINES:
 * 
 * 1. NEVER use SelectItem value="" - it will crash
 * 2. Use SelectValue placeholder="..." for placeholder text
 * 3. Use undefined as initial state for unselected values
 * 4. Use sentinel values like 'manual_check_required' for "확인 필요" option
 * 5. Always validate before save - convert undefined to sentinel or skip
 */

// Sentinel values for special states
export const SENTINEL_VALUES = {
  MANUAL_CHECK: 'manual_check_required',
  NOT_SELECTED: 'not_selected',
  UNKNOWN: 'unknown',
} as const

// Check if a value is a sentinel
export function isSentinelValue(value: string | undefined): boolean {
  if (!value) return true
  return Object.values(SENTINEL_VALUES).includes(value as typeof SENTINEL_VALUES[keyof typeof SENTINEL_VALUES])
}

// Format sentinel values for display
export function formatDisplayValue(
  value: string | undefined, 
  options?: { value: string; label: string }[]
): string {
  if (!value) return '미입력'
  if (value === SENTINEL_VALUES.MANUAL_CHECK) return '확인 필요'
  if (value === SENTINEL_VALUES.NOT_SELECTED) return '미선택'
  if (value === SENTINEL_VALUES.UNKNOWN) return '확인 필요'
  
  // Try to find label from options
  if (options) {
    const found = options.find(opt => opt.value === value)
    if (found) return found.label
  }
  
  return value
}

// Normalize value for storage (convert undefined to sentinel)
export function normalizeForStorage(value: string | undefined): string {
  if (!value || value.trim() === '') return SENTINEL_VALUES.MANUAL_CHECK
  return value
}

// Check if value is completed (not empty and not sentinel)
export function isValueCompleted(value: string | undefined): boolean {
  if (!value || value.trim() === '') return false
  return !isSentinelValue(value)
}

// ============================================
// Error Boundary
// ============================================

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

interface ErrorBoundaryProps {
  children: ReactNode
  onReset?: () => void
  onFallback?: () => void
}

class FormErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error) {
    console.error('[v0] ManualSupplementForm error:', error)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined })
    this.props.onReset?.()
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-400">
                  입력 항목을 불러오는 중 문제가 발생했습니다
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  다시 시도하거나 기본 입력으로 진행해주세요.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={this.handleReset}
                className="flex-1"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                다시 시도
              </Button>
              <Button 
                size="sm" 
                variant="default" 
                onClick={this.props.onFallback}
                className="flex-1"
              >
                기본 입력으로 진행
              </Button>
            </div>
          </CardContent>
        </Card>
      )
    }
    return this.props.children
  }
}

// ============================================
// Types
// ============================================

export interface SupplementField {
  id: string
  label: string
  type: 'select' | 'input' | 'number' | 'toggle' | 'textarea'
  required: boolean
  value: string
  options?: { value: string; label: string }[]
  unit?: string
  placeholder?: string
  helpText: string
}

export interface SupplementData {
  zoneType: string // 용도지역
  roadCondition: string // 접도 현황
  heightLimit: number | null // 높이 제한 (숫자)
  hasDistrictPlan: boolean // 지구단위계획 여부 (boolean으로 통일)
  districtPlanNotes: string // 지구단위계획 상세 내용
  additionalNotes: string // 기타 메모
  siteArea?: number // 대지면적 (옵션)
}

interface ManualSupplementFormProps {
  /** Items that were auto-filled */
  autoFilledItems: string[]
  /** Initial supplement data (from auto-lookup partial results) */
  initialData?: Partial<SupplementData>
  /** Callback when form is saved */
  onSave: (data: SupplementData) => void
  /** Callback when user wants to proceed without completing all fields */
  onSkip: () => void
  /** Callback when user cancels */
  onCancel?: () => void
  /** Whether form is being saved */
  isSaving?: boolean
}

// ============================================
// Field Configurations
// ============================================

const ZONE_TYPE_OPTIONS = [
  { value: 'residential-1', label: '제1종 일반주거지역' },
  { value: 'residential-2', label: '제2종 일반주거지역' },
  { value: 'residential-3', label: '제3종 일반주거지역' },
  { value: 'residential-exclusive-1', label: '제1종 전용주거지역' },
  { value: 'residential-exclusive-2', label: '제2종 전용주거지역' },
  { value: 'semi-residential', label: '준주거지역' },
  { value: 'commercial-neighborhood', label: '근린상업지역' },
  { value: 'commercial-general', label: '일반상업지역' },
  { value: 'commercial-central', label: '중심상업지역' },
  { value: 'industrial-general', label: '일반공업지역' },
  { value: 'green-natural', label: '자연녹지지역' },
  { value: 'green-production', label: '생산녹지지역' },
  { value: 'management-planned', label: '계획관리지역' },
  { value: 'unknown', label: '확인 필요' },
]

const ROAD_CONDITION_OPTIONS = [
  { value: 'under-4m', label: '4m 미만 도로 접함' },
  { value: '4m-plus', label: '4m 이상 도로 접함' },
  { value: '6m-plus', label: '6m 이상 도로 접함' },
  { value: '8m-plus', label: '8m 이상 도로 접함' },
  { value: '12m-plus', label: '12m 이상 도로 접함' },
  { value: 'corner', label: '코너 (2면 접도)' },
  { value: 'three-side', label: '3면 접도' },
  { value: 'cul-de-sac', label: '막다른 도로' },
  { value: 'private-road', label: '사도 접함' },
  { value: 'no-road', label: '도로 미접' },
  { value: 'unknown', label: '확인 필요' },
]

const DISTRICT_PLAN_OPTIONS = [
  { value: 'yes', label: '예 - 지구단위계획 적용' },
  { value: 'no', label: '아니오 - 해당 없음' },
  { value: 'partial', label: '일부 적용' },
  { value: 'unknown', label: '확인 필요' },
]

// ============================================
// Main Component
// ============================================

export function ManualSupplementForm({
  autoFilledItems,
  initialData,
  onSave,
  onSkip,
  onCancel,
  isSaving = false,
}: ManualSupplementFormProps) {
  // IMPORTANT: Form state initialization from savedSupplementData ONLY
  // initialData is the single source of truth (savedSupplementData from parent)
  // Do NOT mix with legalSummary, baseline, or display labels
  
  // Convert initialData.heightLimit (number | null) to string for form input
  const initialHeightStr = initialData?.heightLimit != null 
    ? String(initialData.heightLimit) 
    : ''
  
  // Convert initialData.hasDistrictPlan (boolean) to form value ('yes' | 'no' | undefined)
  const initialDistrictPlanValue = initialData?.hasDistrictPlan === true 
    ? 'yes' 
    : initialData?.hasDistrictPlan === false 
      ? 'no' 
      : undefined
  
  // Form state - initialized ONLY from savedSupplementData (initialData)
  const [zoneType, setZoneType] = useState<string | undefined>(initialData?.zoneType || undefined)
  const [roadCondition, setRoadCondition] = useState<string | undefined>(initialData?.roadCondition || undefined)
  const [heightLimit, setHeightLimit] = useState<string>(initialHeightStr)
  const [districtPlan, setDistrictPlan] = useState<string | undefined>(initialDistrictPlanValue)
  const [additionalNotes, setAdditionalNotes] = useState<string>(initialData?.additionalNotes || '')
  
  // UI state
  const [showAutoFilled, setShowAutoFilled] = useState(false)
  const [showSkipWarning, setShowSkipWarning] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [hasError, setHasError] = useState(false)
  
  // Calculate completion stats using helper functions
  const completedCount = useMemo(() => {
    let count = 0
    if (isValueCompleted(zoneType)) count++
    if (isValueCompleted(roadCondition)) count++
    // heightLimit is a string in form state, but check safely
    if (heightLimit && String(heightLimit).trim() !== '') count++
    if (isValueCompleted(districtPlan)) count++
    return count
  }, [zoneType, roadCondition, heightLimit, districtPlan])
  
  const totalRequired = 4
  const completionPercent = Math.round((completedCount / totalRequired) * 100)
  const allRequiredFilled = completedCount === totalRequired
  
// Handle save - normalize values for storage
  const handleSave = () => {
  try {
  // Parse height limit as number
  const heightLimitNum = heightLimit ? parseFloat(heightLimit) : null
  
  // Parse district plan as boolean
  const hasDistrictPlanBool = districtPlan === 'yes' || districtPlan === '예'
  
  const data: SupplementData = {
  zoneType: normalizeForStorage(zoneType),
  roadCondition: normalizeForStorage(roadCondition),
  heightLimit: heightLimitNum,
  hasDistrictPlan: hasDistrictPlanBool,
  districtPlanNotes: hasDistrictPlanBool ? (additionalNotes || '지구단위계획 적용') : '',
  additionalNotes: additionalNotes || '',
  }
  
  console.log('[v0] ManualSupplementForm saving data:', data)
  onSave(data)
      setSaveSuccess(true)
      setHasError(false)
    } catch {
      setHasError(true)
    }
  }
  
  // Handle skip confirmation
  const handleSkipClick = () => {
    if (completedCount < totalRequired) {
      setShowSkipWarning(true)
    } else {
      onSkip()
    }
  }
  
  return (
    <FormErrorBoundary onFallback={onSkip}>
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-primary" />
              수동 보완 입력
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              자동조회 결과를 바탕으로 기본 정보는 반영되었습니다.
              아래 항목만 확인하면 다음 단계로 진행할 수 있습니다.
            </p>
          </div>
          <Badge variant="outline" className="text-[10px] shrink-0">
            {completedCount}/{totalRequired} 완료
          </Badge>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
            <span>보완 입력 진행률</span>
            <span className={completionPercent === 100 ? 'text-emerald-400' : 'text-amber-400'}>
              {completionPercent}%
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${
                completionPercent === 100 ? 'bg-emerald-500' : 'bg-primary'
              }`}
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Auto-filled Items Summary (Collapsible) */}
        {autoFilledItems.length > 0 && (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAutoFilled(!showAutoFilled)}
              className="w-full flex items-center justify-between p-2 hover:bg-emerald-500/10 transition-colors"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-xs text-emerald-400 font-medium">
                  자동 반영 완료 ({autoFilledItems.length}개 항목)
                </span>
              </div>
              {showAutoFilled ? (
                <ChevronUp className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-emerald-500" />
              )}
            </button>
            {showAutoFilled && (
              <div className="px-2 pb-2 border-t border-emerald-500/20">
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {autoFilledItems.map((item) => (
                    <span 
                      key={item} 
                      className="inline-flex items-center gap-1 text-[10px] text-foreground bg-emerald-500/10 px-1.5 py-0.5 rounded"
                    >
                      <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Manual Check Required Header */}
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-xs text-amber-400 font-medium">직접 확인 필요 항목</span>
        </div>
        
        {/* Form Fields */}
        <div className="space-y-4">
          {/* 용도지역 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-foreground flex items-center gap-1.5">
                용도지역
                {zoneType && zoneType !== 'unknown' ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                ) : (
                  <span className="text-[10px] text-amber-500">*필수</span>
                )}
              </Label>
            </div>
            <Select 
              value={zoneType} 
              onValueChange={(value) => { setZoneType(value); setSaveSuccess(false); }}
            >
              <SelectTrigger className="h-9 text-xs bg-background">
                <SelectValue placeholder="용도지역 선택" />
              </SelectTrigger>
              <SelectContent>
                {ZONE_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <HelpCircle className="h-3 w-3" />
              건폐율, 용적률 검토에 필요합니다.
            </p>
          </div>
          
          {/* 접도 현황 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-foreground flex items-center gap-1.5">
                접도 현황
                {roadCondition && roadCondition !== 'unknown' ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                ) : (
                  <span className="text-[10px] text-amber-500">*필수</span>
                )}
              </Label>
            </div>
            <Select 
              value={roadCondition} 
              onValueChange={(value) => { setRoadCondition(value); setSaveSuccess(false); }}
            >
              <SelectTrigger className="h-9 text-xs bg-background">
                <SelectValue placeholder="접도 현황 선택" />
              </SelectTrigger>
              <SelectContent>
                {ROAD_CONDITION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <HelpCircle className="h-3 w-3" />
              진입 가능성과 인허가 검토에 필요합니다.
            </p>
          </div>
          
          {/* 높이 제한 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-foreground flex items-center gap-1.5">
                높이 제한
                {heightLimit && String(heightLimit).trim() !== '' ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                ) : (
                  <span className="text-[10px] text-amber-500">*필수</span>
                )}
              </Label>
            </div>
            <div className="flex gap-2">
              <Input
                type="number"
                value={heightLimit}
                onChange={(e) => { setHeightLimit(e.target.value); setSaveSuccess(false); }}
                placeholder="예: 20"
                className="h-9 text-xs bg-background flex-1"
              />
              <span className="flex items-center text-xs text-muted-foreground px-2 bg-secondary rounded">
                m
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <HelpCircle className="h-3 w-3" />
              층수 계획과 사선 검토에 필요합니다.
            </p>
          </div>
          
          {/* 지구단위계획 여부 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-foreground flex items-center gap-1.5">
                지구단위계획 여부
                {districtPlan && districtPlan !== 'unknown' ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                ) : (
                  <span className="text-[10px] text-amber-500">*필수</span>
                )}
              </Label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DISTRICT_PLAN_OPTIONS.slice(0, 2).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setDistrictPlan(opt.value); setSaveSuccess(false); }}
                  className={`h-9 px-3 text-xs rounded-md border transition-all ${
                    districtPlan === opt.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-border hover:border-primary/50'
                  }`}
                >
                  {opt.value === 'yes' ? '예' : '아니오'}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <HelpCircle className="h-3 w-3" />
              추가 규제 여부 확인에 필요합니다.
            </p>
          </div>
          
          {/* 기타 메모 (Optional) */}
          <div className="space-y-1.5">
            <Label className="text-xs text-foreground flex items-center gap-1.5">
              기타 메모
              <span className="text-[10px] text-muted-foreground">(선택)</span>
            </Label>
            <Textarea
              value={additionalNotes}
              onChange={(e) => { setAdditionalNotes(e.target.value); setSaveSuccess(false); }}
              placeholder="추가 확인이 필요한 사항이나 특이사항을 입력하세요"
              className="h-16 text-xs bg-background resize-none"
            />
          </div>
        </div>
        
        {/* Error Fallback */}
        {hasError && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-red-400">입력 항목을 불러오는 중 문제가 발생했습니다</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  다시 시도하거나 기본 입력으로 진행해주세요.
                </p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setHasError(false)}
                  className="h-6 text-[10px] px-2 mt-2"
                >
                  다시 시도
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Save Success Message */}
        {saveSuccess && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-emerald-400">보완 입력이 저장되었습니다</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  입력한 값은 배치안 비교, 평면도 검토, 보고서 생성에 반영됩니다.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Skip Warning */}
        {showSkipWarning && !allRequiredFilled && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-amber-400">일부 항목이 비어 있습니다</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  일부 항목은 비어 있어도 배치안 비교는 가능하지만, 검토 정확도는 낮아질 수 있습니다.
                </p>
                <div className="flex gap-2 mt-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setShowSkipWarning(false)}
                    className="h-7 text-[10px] px-2"
                  >
                    다시 확인
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={onSkip}
                    className="h-7 text-[10px] px-2 bg-amber-600 hover:bg-amber-700"
                  >
                    그대로 진행
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-2">
          <Button 
            onClick={handleSave}
            disabled={isSaving || !allRequiredFilled}
            className="w-full h-10 text-sm"
          >
            {isSaving ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                저장 중...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                저장하고 다음 단계로
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
          
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="h-8 text-xs"
            >
              <Save className="h-3 w-3 mr-1" />
              임시 저장
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleSkipClick}
              className="h-8 text-xs text-muted-foreground"
            >
              <Clock className="h-3 w-3 mr-1" />
              나중에 입력
            </Button>
          </div>
          
          {onCancel && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onCancel}
              className="h-7 text-xs text-muted-foreground"
            >
              취소
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
    </FormErrorBoundary>
  )
}

// ============================================
// Compact Summary Component
// ============================================

interface SupplementSummaryProps {
  data: SupplementData
  onEdit: () => void
  addressOverride?: string  // 주소로 roadCondition 오버라이드
}

export function SupplementSummary({ data, onEdit, addressOverride }: SupplementSummaryProps) {
  const getZoneLabel = (value: string) => formatDisplayValue(value, ZONE_TYPE_OPTIONS)
  
  // 주소가 있으면 주소에서 roadCondition 직접 계산 (더 신뢰도 높음)
  const effectiveRoadCondition = addressOverride
    ? (addressOverride.includes('대로') ? '12m-plus' :
       addressOverride.includes('로') ? '8m-plus' :
       addressOverride.includes('길') ? '4m-plus' :
       data.roadCondition)
    : data.roadCondition
  const getRoadLabel = (value: string) => formatDisplayValue(value, ROAD_CONDITION_OPTIONS)
  
  // Format hasDistrictPlan (boolean) to display string
  const getDistrictPlanLabel = (hasDistrict: boolean | undefined): string => {
    if (hasDistrict === true) return '있음'
    if (hasDistrict === false) return '없음'
    return '미입력'
  }
  
  return (
    <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          보완 입력 완료
        </span>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onEdit}
          className="h-7 text-[11px] px-2.5 border-border/60"
        >
          <Edit3 className="h-3 w-3 mr-1" />
          수정
        </Button>
      </div>
      
      {/* Mobile-optimized 2x2 card grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 rounded bg-background/50 border border-border/50">
          <span className="text-[10px] text-muted-foreground block mb-0.5">용도지역</span>
          <span className="text-xs text-foreground font-medium leading-tight block">{getZoneLabel(data.zoneType)}</span>
        </div>
        <div className="p-2 rounded bg-background/50 border border-border/50">
          <span className="text-[10px] text-muted-foreground block mb-0.5">접도</span>
          <span className="text-xs text-foreground font-medium leading-tight block">{getRoadLabel(effectiveRoadCondition)}</span>
        </div>
        <div className="p-2 rounded bg-background/50 border border-border/50">
          <span className="text-[10px] text-muted-foreground block mb-0.5">높이제한</span>
          <span className="text-xs text-foreground font-medium">{data.heightLimit ? `${data.heightLimit}m` : '미입력'}</span>
        </div>
        <div className="p-2 rounded bg-background/50 border border-border/50">
          <span className="text-[10px] text-muted-foreground block mb-0.5">지구단위</span>
          <span className="text-xs text-foreground font-medium">{getDistrictPlanLabel(data.hasDistrictPlan)}</span>
        </div>
      </div>
      
      <p className="text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border/50">
        배치안 비교·평면도 검토·보고서에 반영됩니다.
      </p>
    </div>
  )
}
