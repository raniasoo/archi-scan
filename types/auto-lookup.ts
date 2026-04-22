/**
 * Auto-Lookup Status Types
 * @version v1.0 - Standardized status enum for JUSO/MOLIT lookup
 * 
 * Used for:
 * - UI state management
 * - Error classification
 * - Logging consistency
 * - Fallback UX decisions
 */

// ============================================
// Status Enum
// ============================================

/**
 * Standardized auto-lookup status values
 * These values are used consistently across UI, API, and logs
 */
export type AutoLookupStatus = 
  | 'idle'           // 초기 상태, 조회 전
  | 'loading'        // 조회 중
  | 'success'        // 정상 응답 + 유효 데이터 존재
  | 'success-empty'  // 정상 응답 + 데이터 0건
  | 'juso-failed'    // 주소 정규화/JUSO 단계 실패
  | 'molit-failed'   // MOLIT resultCode/resultMsg 기준 실패
  | 'upstream-error' // HTTP 자체가 실패 (500, timeout 등)
  | 'parse-error'    // 응답은 왔지만 JSON 파싱 실패
  | 'env-missing'    // API 키 등 환경값 누락
  | 'host-mismatch'  // 허용 호스트/배포 환경 문제

/**
 * All possible status values as array (for validation)
 */
export const AUTO_LOOKUP_STATUSES: AutoLookupStatus[] = [
  'idle',
  'loading',
  'success',
  'success-empty',
  'juso-failed',
  'molit-failed',
  'upstream-error',
  'parse-error',
  'env-missing',
  'host-mismatch',
]

// ============================================
// Status Messages (Korean)
// ============================================

/**
 * User-facing messages for each status
 * These are shown in the UI to guide users
 */
export const AUTO_LOOKUP_MESSAGES: Record<AutoLookupStatus, string> = {
  'idle': '',
  'loading': '건축물 정보를 조회하고 있습니다...',
  'success': '건축물 정보를 성공적으로 조회했습니다.',
  'success-empty': '자동조회는 완료되었지만 확인 가능한 건축 정보가 없어 수동 검토가 필요합니다.',
  'juso-failed': '주소 정규화 과정에서 문제가 발생했습니다. 주소를 다시 확인해주세요.',
  'molit-failed': '건축물대장 조회에서 유효한 결과를 찾지 못했습니다.',
  'upstream-error': '외부 시스템 응답이 불안정하여 자동조회를 완료하지 못했습니다.',
  'parse-error': '조회 응답은 수신했지만 데이터를 해석하는 과정에서 문제가 발생했습니다.',
  'env-missing': '자동조회 설정값이 누락되어 조회를 진행할 수 없습니다.',
  'host-mismatch': '현재 접속 환경에서는 자동조회 호출이 허용되지 않습니다.',
}

/**
 * Short labels for badge/chip display
 */
export const AUTO_LOOKUP_LABELS: Record<AutoLookupStatus, string> = {
  'idle': '대기',
  'loading': '조회 중',
  'success': '조회 완료',
  'success-empty': '결과 없음',
  'juso-failed': '주소 오류',
  'molit-failed': 'MOLIT 실패',
  'upstream-error': '서버 오류',
  'parse-error': '파싱 오류',
  'env-missing': '설정 누락',
  'host-mismatch': '환경 오류',
}

// ============================================
// Status Classification
// ============================================

/**
 * Check if status indicates a failure that needs fallback
 */
export function isFailureStatus(status: AutoLookupStatus): boolean {
  return [
    'juso-failed',
    'molit-failed',
    'upstream-error',
    'parse-error',
    'env-missing',
    'host-mismatch',
  ].includes(status)
}

/**
 * Check if status allows continuing to next step
 * Even success-empty allows continuation with manual input
 */
export function canProceed(status: AutoLookupStatus): boolean {
  return status === 'success' || status === 'success-empty' || isFailureStatus(status)
}

/**
 * Check if status should show fallback buttons
 */
export function shouldShowFallback(status: AutoLookupStatus): boolean {
  return status === 'success-empty' || isFailureStatus(status)
}

// ============================================
// MOLIT Log Entry Type
// ============================================

/**
 * Standardized MOLIT API log entry
 * Used for consistent logging across all endpoints
 */
export interface MolitLogEntry {
  /** Timestamp of the log */
  timestamp: string
  /** Endpoint name (e.g., '기본개요', '표제부') */
  endpoint: string
  /** Full request URL (with masked API key) */
  requestUrl: string
  /** Request parameters */
  requestParams: {
    sigunguCd: string
    bjdongCd: string
    bun: string
    ji: string
    platGbCd?: string
  }
  /** Upstream HTTP status code */
  httpStatus: number
  /** MOLIT API resultCode */
  resultCode: string | null
  /** MOLIT API resultMsg */
  resultMsg: string | null
  /** Total count from response */
  totalCount: number | null
  /** Number of items in response */
  itemsLength: number
  /** Raw response preview (first 500 chars) */
  rawResponsePreview: string
  /** Whether parsing succeeded */
  parseSuccess: boolean
  /** Final classified status */
  classifiedAs: AutoLookupStatus
  /** Optional error message */
  errorMessage?: string
}

/**
 * Create a log entry with current timestamp
 */
export function createMolitLogEntry(
  endpoint: string,
  partial: Omit<MolitLogEntry, 'timestamp' | 'endpoint'>
): MolitLogEntry {
  return {
    timestamp: new Date().toISOString(),
    endpoint,
    ...partial,
  }
}

/**
 * Format log entry for console output
 */
export function formatMolitLog(entry: MolitLogEntry): string {
  const lines = [
    `[MOLIT] ========== ${entry.endpoint} ==========`,
    `[MOLIT] timestamp=${entry.timestamp}`,
    `[MOLIT] requestUrl=${entry.requestUrl}`,
    `[MOLIT] params=${JSON.stringify(entry.requestParams)}`,
    `[MOLIT] httpStatus=${entry.httpStatus}`,
    `[MOLIT] resultCode=${entry.resultCode ?? 'null'}`,
    `[MOLIT] resultMsg=${entry.resultMsg ?? 'null'}`,
    `[MOLIT] totalCount=${entry.totalCount ?? 'null'}`,
    `[MOLIT] itemsLength=${entry.itemsLength}`,
    `[MOLIT] parseSuccess=${entry.parseSuccess}`,
    `[MOLIT] classifiedAs=${entry.classifiedAs}`,
  ]
  
  if (entry.errorMessage) {
    lines.push(`[MOLIT] error=${entry.errorMessage}`)
  }
  
  // Only include raw response preview in non-production
  if (process.env.NODE_ENV !== 'production') {
    lines.push(`[MOLIT] rawPreview=${entry.rawResponsePreview.substring(0, 200)}...`)
  }
  
  return lines.join('\n')
}
