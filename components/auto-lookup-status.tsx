"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  XCircle, 
  Loader2, 
  RefreshCw, 
  Edit3, 
  ArrowRight,
  HelpCircle,
  FileText
} from "lucide-react"
import { type AutoLookupStatus } from "@/types/auto-lookup"

// ============================================
// Status Configuration
// ============================================

interface StatusConfig {
  badge: string
  badgeColor: string
  icon: typeof CheckCircle2
  iconColor: string
  title: string
  description: string
  bgColor: string
  borderColor: string
}

const STATUS_CONFIG: Record<AutoLookupStatus, StatusConfig> = {
  'idle': {
    badge: '대기',
    badgeColor: 'bg-secondary text-secondary-foreground',
    icon: FileText,
    iconColor: 'text-muted-foreground',
    title: '자동조회 대기 중',
    description: '주소를 입력하고 자동조회 버튼을 클릭하세요.',
    bgColor: 'bg-secondary/20',
    borderColor: 'border-border',
  },
  'loading': {
    badge: '조회 중',
    badgeColor: 'bg-primary/20 text-primary',
    icon: Loader2,
    iconColor: 'text-primary animate-spin',
    title: '국토부 데이터 확인 중',
    description: '주소와 건축물 정보를 불러오고 있습니다.',
    bgColor: 'bg-primary/5',
    borderColor: 'border-primary/30',
  },
  'success': {
    badge: '성공',
    badgeColor: 'bg-emerald-500/20 text-emerald-400',
    icon: CheckCircle2,
    iconColor: 'text-emerald-500',
    title: '자동조회 완료',
    description: '국토부 건축물대장 정보를 성공적으로 조회했습니다.',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
  },
  'success-empty': {
    badge: '일부 확인 필요',
    badgeColor: 'bg-amber-500/20 text-amber-400',
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
    title: '자동조회 완료 (수동 확인 필요)',
    description: '자동조회는 완료되었지만 일부 항목은 직접 확인이 필요합니다.',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  'juso-failed': {
    badge: '주소 오류',
    badgeColor: 'bg-red-500/20 text-red-400',
    icon: XCircle,
    iconColor: 'text-red-500',
    title: '주소 정규화 실패',
    description: '주소를 정리하는 과정에서 문제가 발생했습니다.',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
  },
  'molit-failed': {
    badge: '조회 실패',
    badgeColor: 'bg-red-500/20 text-red-400',
    icon: XCircle,
    iconColor: 'text-red-500',
    title: '건축물대장 조회 실패',
    description: '건축물대장 조회 결과를 찾지 못했습니다.',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
  },
  'upstream-error': {
    badge: '응답 지연',
    badgeColor: 'bg-amber-500/20 text-amber-400',
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
    title: '외부 시스템 응답 지연',
    description: '국토부 연계 시스템 응답이 일시적으로 불안정합니다. 직접 확인 항목을 입력하면 계속 진행할 수 있습니다.',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  'parse-error': {
    badge: '파싱 오류',
    badgeColor: 'bg-red-500/20 text-red-400',
    icon: AlertCircle,
    iconColor: 'text-red-500',
    title: '데이터 해석 실패',
    description: '조회 데이터 정리 중 문제가 발생했습니다.',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
  },
  'env-missing': {
    badge: '설정 누락',
    badgeColor: 'bg-slate-500/20 text-slate-400',
    icon: AlertCircle,
    iconColor: 'text-slate-500',
    title: '자동조회 설정 필요',
    description: '자동조회 설정이 완료되지 않았습니다.',
    bgColor: 'bg-slate-500/10',
    borderColor: 'border-slate-500/30',
  },
  'host-mismatch': {
    badge: '환경 오류',
    badgeColor: 'bg-slate-500/20 text-slate-400',
    icon: AlertCircle,
    iconColor: 'text-slate-500',
    title: '환경 설정 오류',
    description: '현재 환경에서는 자동조회가 제한됩니다.',
    bgColor: 'bg-slate-500/10',
    borderColor: 'border-slate-500/30',
  },
}

// ============================================
// Loading Steps
// ============================================

const LOADING_STEPS = [
  { id: 'normalize', label: '주소 정규화 중', done: false },
  { id: 'juso', label: '주소 검증 중', done: false },
  { id: 'molit', label: '건축물대장 조회 중', done: false },
  { id: 'parse', label: '데이터 정리 중', done: false },
]

// ============================================
// Component Props
// ============================================

interface AutoLookupStatusCardProps {
  status: AutoLookupStatus
  onRetry?: () => void
  onManualInput?: () => void
  onProceed?: () => void
  isRetrying?: boolean
  /** Items that were auto-filled */
  autoFilledItems?: string[]
  /** Items that need manual verification */
  manualCheckItems?: string[]
  /** Compact mode for inline display */
  compact?: boolean
  /** Whether manual supplement has been completed */
  supplementCompleted?: boolean
}

// ============================================
// Main Component
// ============================================

export function AutoLookupStatusCard({
  status,
  onRetry,
  onManualInput,
  onProceed,
  isRetrying = false,
  autoFilledItems = [],
  manualCheckItems = [],
  compact = false,
  supplementCompleted = false,
}: AutoLookupStatusCardProps) {
  const config = STATUS_CONFIG[status]
  const Icon = config.icon
  
  // Don't show anything for idle state
  if (status === 'idle') return null
  
  // Hide card completely after supplement completion for ALL error/warning states
  // User has manually entered the required data, no need to show error banner
  const isErrorOrWarningState = [
    'upstream-error', 
    'molit-failed', 
    'parse-error', 
    'juso-failed', 
    'env-missing', 
    'success-empty',
    'host-mismatch'
  ].includes(status)
  if (supplementCompleted && isErrorOrWarningState) {
    // Return null to completely hide the error/warning banner after supplement is complete
    // The SupplementSummary card will show the user's input instead
    return null
  }
  
  // Compact inline version
  if (compact) {
    return (
      <div className={`flex items-center gap-2 p-2 rounded-lg border ${config.bgColor} ${config.borderColor}`}>
        <Icon className={`h-4 w-4 shrink-0 ${config.iconColor}`} />
        <span className="text-xs text-foreground">{config.title}</span>
        <Badge className={`ml-auto text-[10px] ${config.badgeColor}`}>{config.badge}</Badge>
      </div>
    )
  }
  
  // Loading state with steps
  if (status === 'loading') {
    return (
      <Card className={`border ${config.borderColor} ${config.bgColor}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-full ${config.bgColor}`}>
              <Loader2 className="h-5 w-5 text-primary animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge className={`text-[10px] ${config.badgeColor}`}>{config.badge}</Badge>
              </div>
              <h4 className="text-sm font-semibold text-foreground">{config.title}</h4>
              <p className="text-xs text-muted-foreground mt-1">{config.description}</p>
              
              {/* Loading Steps */}
              <div className="mt-3 space-y-1.5">
                {LOADING_STEPS.map((step, idx) => (
                  <div key={step.id} className="flex items-center gap-2 text-xs">
                    <div className={`h-1.5 w-1.5 rounded-full ${idx === 2 ? 'bg-primary animate-pulse' : idx < 2 ? 'bg-primary' : 'bg-muted'}`} />
                    <span className={idx <= 2 ? 'text-foreground' : 'text-muted-foreground'}>{step.label}</span>
                  </div>
                ))}
              </div>
              
              <p className="text-[10px] text-muted-foreground mt-3">
                보통 몇 초 내 완료됩니다. 실패 시 수동 입력으로 계속할 수 있습니다.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  // Success state
  if (status === 'success') {
    return (
      <Card className={`border ${config.borderColor} ${config.bgColor}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-full bg-emerald-500/20`}>
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge className={`text-[10px] ${config.badgeColor}`}>{config.badge}</Badge>
              </div>
              <h4 className="text-sm font-semibold text-foreground">{config.title}</h4>
              <p className="text-xs text-muted-foreground mt-1">{config.description}</p>
              
              {/* Auto-filled Items */}
              {autoFilledItems.length > 0 && (
                <div className="mt-3 p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-[10px] text-emerald-400 font-medium mb-1">자동 반영 항목</p>
                  <div className="flex flex-wrap gap-1">
                    {autoFilledItems.map((item) => (
                      <span key={item} className="inline-flex items-center gap-1 text-[10px] text-foreground">
                        <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Action Buttons */}
              {onProceed && (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={onProceed} className="flex-1 h-8 text-xs">
                    다음 단계로 진행
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  // Partial success state
  if (status === 'success-empty') {
    return (
      <Card className={`border ${config.borderColor} ${config.bgColor}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-full bg-amber-500/20`}>
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge className={`text-[10px] ${config.badgeColor}`}>{config.badge}</Badge>
              </div>
              <h4 className="text-sm font-semibold text-foreground">{config.title}</h4>
              <p className="text-xs text-muted-foreground mt-1">{config.description}</p>
              
              {/* Manual Check Items */}
              {manualCheckItems.length > 0 && (
                <div className="mt-3 p-2 rounded bg-amber-500/10 border border-amber-500/20">
                  <p className="text-[10px] text-amber-400 font-medium mb-1">수동 확인 필요 항목</p>
                  <div className="flex flex-wrap gap-1.5">
                    {manualCheckItems.map((item) => (
                      <span key={item} className="inline-flex items-center gap-1 text-[10px] text-foreground">
                        <AlertTriangle className="h-2.5 w-2.5 text-amber-500" />
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="mt-3 flex flex-col gap-2">
                {onManualInput && (
                  <Button size="sm" onClick={onManualInput} className="w-full h-8 text-xs">
                    <Edit3 className="h-3 w-3 mr-1" />
                    수동 보완하기
                  </Button>
                )}
                {onProceed && (
                  <Button size="sm" variant="outline" onClick={onProceed} className="w-full h-8 text-xs">
                    다음 단계로 진행
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  // Failure states
  const isFailure = ['juso-failed', 'molit-failed', 'upstream-error', 'parse-error', 'env-missing', 'host-mismatch'].includes(status)
  
  if (isFailure) {
    return (
      <Card className={`border ${config.borderColor} ${config.bgColor}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-full bg-red-500/20`}>
              <Icon className={`h-5 w-5 ${config.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge className={`text-[10px] ${config.badgeColor}`}>{config.badge}</Badge>
              </div>
              <h4 className="text-sm font-semibold text-foreground">{config.title}</h4>
              <p className="text-xs text-muted-foreground mt-1">{config.description}</p>
              
              {/* Manual Input Guidance */}
              <div className="mt-3 p-2 rounded bg-secondary/50 border border-border">
                <p className="text-[10px] text-muted-foreground">
                  자동조회가 원활하지 않을 경우, 직접 입력으로 계속 진행하실 수 있습니다.
                  기본 정보만 입력해도 배치안 비교와 평면도 검토는 가능합니다.
                </p>
              </div>
              
              {/* Action Buttons */}
              <div className="mt-3 flex flex-col gap-2">
                {onRetry && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={onRetry} 
                    disabled={isRetrying}
                    className="w-full h-8 text-xs"
                  >
                    {isRetrying ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3 mr-1" />
                    )}
                    다시 시도
                  </Button>
                )}
                {onManualInput && (
                  <Button size="sm" onClick={onManualInput} className="w-full h-8 text-xs">
                    <Edit3 className="h-3 w-3 mr-1" />
                    수동 입력으로 계속
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  return null
}

// ============================================
// Status Bar Component (Compact)
// ============================================

interface AutoLookupStatusBarProps {
  status: AutoLookupStatus
  currentStep?: string
}

export function AutoLookupStatusBar({ status, currentStep }: AutoLookupStatusBarProps) {
  const config = STATUS_CONFIG[status]
  const Icon = config.icon
  
  if (status === 'idle') return null
  
  return (
    <div className={`flex items-center justify-between p-2 rounded-lg border ${config.bgColor} ${config.borderColor}`}>
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 shrink-0 ${config.iconColor}`} />
        <span className="text-xs text-foreground">
          {status === 'loading' && currentStep ? currentStep : config.title}
        </span>
      </div>
      <Badge className={`text-[10px] ${config.badgeColor}`}>{config.badge}</Badge>
    </div>
  )
}

// ============================================
// Checklist Component
// ============================================

interface AutoLookupChecklistProps {
  autoFilledItems: string[]
  manualCheckItems: string[]
}

export function AutoLookupChecklist({ autoFilledItems, manualCheckItems }: AutoLookupChecklistProps) {
  if (autoFilledItems.length === 0 && manualCheckItems.length === 0) return null
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {autoFilledItems.length > 0 && (
        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-[10px] text-emerald-400 font-medium mb-1.5">자동 반영됨</p>
          <ul className="space-y-1">
            {autoFilledItems.map((item) => (
              <li key={item} className="flex items-center gap-1.5 text-[10px] text-foreground">
                <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
      {manualCheckItems.length > 0 && (
        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <p className="text-[10px] text-amber-400 font-medium mb-1.5">수동 확인 필요</p>
          <ul className="space-y-1">
            {manualCheckItems.map((item) => (
              <li key={item} className="flex items-center gap-1.5 text-[10px] text-foreground">
                <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
