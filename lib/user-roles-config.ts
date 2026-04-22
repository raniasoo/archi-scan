/**
 * User Roles, Permissions, and Approval Workflow Configuration
 * Extension Module - Does not modify frozen baseline
 * 
 * Supports:
 * - User roles: 관리자, 실무자, 열람자
 * - Approval workflow: draft, under_review, approved, archived
 * - Role-based permissions
 * - Future-ready for Supabase auth integration
 */

// ============================================
// USER ROLES
// ============================================

export type UserRole = 'admin' | 'editor' | 'viewer'

export interface UserRoleConfig {
  role: UserRole
  labelKo: string
  labelEn: string
  description: string
  color: string
}

export const USER_ROLES: Record<UserRole, UserRoleConfig> = {
  admin: {
    role: 'admin',
    labelKo: '관리자',
    labelEn: 'Administrator',
    description: '전체 권한 - 생성, 편집, 승인, 사용자 관리',
    color: 'bg-purple-500',
  },
  editor: {
    role: 'editor',
    labelKo: '실무자',
    labelEn: 'Editor',
    description: '작업 권한 - 생성, 편집, 버전 관리, 내보내기',
    color: 'bg-blue-500',
  },
  viewer: {
    role: 'viewer',
    labelKo: '열람자',
    labelEn: 'Viewer',
    description: '열람 전용 - 보고서 및 버전 열람만 가능',
    color: 'bg-slate-500',
  },
}

// ============================================
// PERMISSIONS
// ============================================

export type Permission = 
  | 'create_project'
  | 'edit_project'
  | 'delete_project'
  | 'save_version'
  | 'load_version'
  | 'compare_versions'
  | 'export_pdf'
  | 'export_excel'
  | 'export_json'
  | 'import_excel'
  | 'import_json'
  | 'submit_for_review'
  | 'approve_report'
  | 'return_for_revision'
  | 'archive_report'
  | 'manage_users'
  | 'view_report'
  | 'view_history'
  | 'add_site_visuals'
  | 'run_scenarios'

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'create_project',
    'edit_project',
    'delete_project',
    'save_version',
    'load_version',
    'compare_versions',
    'export_pdf',
    'export_excel',
    'export_json',
    'import_excel',
    'import_json',
    'submit_for_review',
    'approve_report',
    'return_for_revision',
    'archive_report',
    'manage_users',
    'view_report',
    'view_history',
    'add_site_visuals',
    'run_scenarios',
  ],
  editor: [
    'create_project',
    'edit_project',
    'save_version',
    'load_version',
    'compare_versions',
    'export_pdf',
    'export_excel',
    'export_json',
    'import_excel',
    'import_json',
    'submit_for_review',
    'view_report',
    'view_history',
    'add_site_visuals',
    'run_scenarios',
  ],
  viewer: [
    'load_version',
    'export_pdf',
    'view_report',
    'view_history',
  ],
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

export function getPermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? []
}

// ============================================
// APPROVAL WORKFLOW
// ============================================

export type ApprovalStatus = 'draft' | 'under_review' | 'approved' | 'archived'

export interface ApprovalStatusConfig {
  status: ApprovalStatus
  labelKo: string
  labelEn: string
  description: string
  color: string
  bgColor: string
  borderColor: string
}

export const APPROVAL_STATUSES: Record<ApprovalStatus, ApprovalStatusConfig> = {
  draft: {
    status: 'draft',
    labelKo: '초안',
    labelEn: 'Draft',
    description: '작성 중인 초안 상태',
    color: 'text-slate-600',
    bgColor: 'bg-slate-100',
    borderColor: 'border-slate-300',
  },
  under_review: {
    status: 'under_review',
    labelKo: '검토 중',
    labelEn: 'Under Review',
    description: '관리자 검토 대기 중',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
  },
  approved: {
    status: 'approved',
    labelKo: '승인 완료',
    labelEn: 'Approved',
    description: '관리자 승인 완료',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300',
  },
  archived: {
    status: 'archived',
    labelKo: '보관',
    labelEn: 'Archived',
    description: '보관 처리됨',
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
  },
}

// ============================================
// APPROVAL HISTORY
// ============================================

export interface ApprovalAction {
  id: string
  action: 'submit' | 'approve' | 'return' | 'archive' | 'unarchive'
  fromStatus: ApprovalStatus
  toStatus: ApprovalStatus
  timestamp: string
  userId: string
  userName: string
  userRole: UserRole
  note?: string
}

export interface ApprovalState {
  currentStatus: ApprovalStatus
  history: ApprovalAction[]
  lastUpdated: string
  submittedBy?: string
  submittedAt?: string
  approvedBy?: string
  approvedAt?: string
  approvalNote?: string
}

export const EMPTY_APPROVAL_STATE: ApprovalState = {
  currentStatus: 'draft',
  history: [],
  lastUpdated: new Date().toISOString(),
}

// ============================================
// WORKFLOW TRANSITIONS
// ============================================

export interface WorkflowTransition {
  from: ApprovalStatus
  to: ApprovalStatus
  action: 'submit' | 'approve' | 'return' | 'archive' | 'unarchive'
  requiredRole: UserRole[]
  labelKo: string
  description: string
}

export const WORKFLOW_TRANSITIONS: WorkflowTransition[] = [
  {
    from: 'draft',
    to: 'under_review',
    action: 'submit',
    requiredRole: ['admin', 'editor'],
    labelKo: '검토 요청',
    description: '관리자에게 승인 검토를 요청합니다',
  },
  {
    from: 'under_review',
    to: 'approved',
    action: 'approve',
    requiredRole: ['admin'],
    labelKo: '승인',
    description: '보고서를 승인 처리합니다',
  },
  {
    from: 'under_review',
    to: 'draft',
    action: 'return',
    requiredRole: ['admin'],
    labelKo: '반려',
    description: '수정이 필요하여 초안 상태로 반려합니다',
  },
  {
    from: 'approved',
    to: 'archived',
    action: 'archive',
    requiredRole: ['admin'],
    labelKo: '보관',
    description: '승인된 보고서를 보관 처리합니다',
  },
  {
    from: 'archived',
    to: 'approved',
    action: 'unarchive',
    requiredRole: ['admin'],
    labelKo: '보관 해제',
    description: '보관된 보고서를 다시 활성화합니다',
  },
  {
    from: 'draft',
    to: 'archived',
    action: 'archive',
    requiredRole: ['admin'],
    labelKo: '보관',
    description: '초안을 보관 처리합니다',
  },
]

export function getAvailableTransitions(
  currentStatus: ApprovalStatus,
  userRole: UserRole
): WorkflowTransition[] {
  return WORKFLOW_TRANSITIONS.filter(
    (t) => t.from === currentStatus && t.requiredRole.includes(userRole)
  )
}

export function canTransition(
  from: ApprovalStatus,
  to: ApprovalStatus,
  userRole: UserRole
): boolean {
  return WORKFLOW_TRANSITIONS.some(
    (t) => t.from === from && t.to === to && t.requiredRole.includes(userRole)
  )
}

// ============================================
// USER CONTEXT
// ============================================

export interface CurrentUser {
  id: string
  name: string
  email?: string
  role: UserRole
  avatarUrl?: string
}

export const DEFAULT_USER: CurrentUser = {
  id: 'local-user',
  name: '로컬 사용자',
  role: 'admin', // Default to admin for local development
}

// ============================================
// PROJECT WITH APPROVAL
// ============================================

export interface ProjectApprovalData {
  approvalState: ApprovalState
  ownerId: string
  ownerName: string
  sharedWith?: Array<{
    userId: string
    userName: string
    role: UserRole
  }>
}

export const EMPTY_PROJECT_APPROVAL: ProjectApprovalData = {
  approvalState: EMPTY_APPROVAL_STATE,
  ownerId: DEFAULT_USER.id,
  ownerName: DEFAULT_USER.name,
}

// ============================================
// STORAGE UTILITIES
// ============================================

const APPROVAL_STORAGE_KEY = 'archi-scan-project-approvals'
const USER_STORAGE_KEY = 'archi-scan-current-user'

export function getStoredApprovals(): Record<string, ProjectApprovalData> {
  if (typeof window === 'undefined') return {}
  try {
    const stored = localStorage.getItem(APPROVAL_STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

export function saveApproval(projectId: string, approval: ProjectApprovalData): void {
  if (typeof window === 'undefined') return
  try {
    const approvals = getStoredApprovals()
    approvals[projectId] = approval
    localStorage.setItem(APPROVAL_STORAGE_KEY, JSON.stringify(approvals))
  } catch (e) {
    console.error('Failed to save approval:', e)
  }
}

export function getApproval(projectId: string): ProjectApprovalData | null {
  const approvals = getStoredApprovals()
  return approvals[projectId] || null
}

export function deleteApproval(projectId: string): void {
  if (typeof window === 'undefined') return
  try {
    const approvals = getStoredApprovals()
    delete approvals[projectId]
    localStorage.setItem(APPROVAL_STORAGE_KEY, JSON.stringify(approvals))
  } catch (e) {
    console.error('Failed to delete approval:', e)
  }
}

// User storage
export function getStoredUser(): CurrentUser {
  if (typeof window === 'undefined') return DEFAULT_USER
  try {
    const stored = localStorage.getItem(USER_STORAGE_KEY)
    return stored ? JSON.parse(stored) : DEFAULT_USER
  } catch {
    return DEFAULT_USER
  }
}

export function saveUser(user: CurrentUser): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
  } catch (e) {
    console.error('Failed to save user:', e)
  }
}

// ============================================
// WORKFLOW ACTIONS
// ============================================

export function executeTransition(
  projectId: string,
  transition: WorkflowTransition,
  user: CurrentUser,
  note?: string
): ProjectApprovalData {
  const existing = getApproval(projectId) || { ...EMPTY_PROJECT_APPROVAL }
  
  const action: ApprovalAction = {
    id: `action-${Date.now()}`,
    action: transition.action,
    fromStatus: transition.from,
    toStatus: transition.to,
    timestamp: new Date().toISOString(),
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    note,
  }
  
  const newState: ApprovalState = {
    ...existing.approvalState,
    currentStatus: transition.to,
    history: [...existing.approvalState.history, action],
    lastUpdated: new Date().toISOString(),
  }
  
  // Update specific fields based on action
  if (transition.action === 'submit') {
    newState.submittedBy = user.name
    newState.submittedAt = new Date().toISOString()
  } else if (transition.action === 'approve') {
    newState.approvedBy = user.name
    newState.approvedAt = new Date().toISOString()
    newState.approvalNote = note
  }
  
  const updatedApproval: ProjectApprovalData = {
    ...existing,
    approvalState: newState,
  }
  
  saveApproval(projectId, updatedApproval)
  return updatedApproval
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export function formatApprovalStatus(status: ApprovalStatus): string {
  return APPROVAL_STATUSES[status]?.labelKo || status
}

export function formatUserRole(role: UserRole): string {
  return USER_ROLES[role]?.labelKo || role
}

export function isEditingAllowed(status: ApprovalStatus, role: UserRole): boolean {
  // Only draft status allows editing, and only for admin/editor
  if (status !== 'draft') return false
  return hasPermission(role, 'edit_project')
}

export function canExport(role: UserRole): boolean {
  return hasPermission(role, 'export_pdf')
}

export function canManageVersions(role: UserRole): boolean {
  return hasPermission(role, 'save_version')
}

export function canSubmitForReview(status: ApprovalStatus, role: UserRole): boolean {
  if (status !== 'draft') return false
  return hasPermission(role, 'submit_for_review')
}

export function canApprove(status: ApprovalStatus, role: UserRole): boolean {
  if (status !== 'under_review') return false
  return hasPermission(role, 'approve_report')
}
