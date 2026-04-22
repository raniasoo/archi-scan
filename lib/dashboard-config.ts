/**
 * Dashboard Configuration and Utilities
 * Extension Module: Dashboard and Project Management Overview
 * 
 * This module provides dashboard data aggregation, filtering, sorting,
 * and project management utilities without modifying the frozen baseline.
 */

import { type SavedProject, getAllProjects, deleteProject } from './project-storage'
import { type ProjectApprovalData, getApproval, type ApprovalStatus } from './user-roles-config'
import { type ProjectVersion, getProjectVersions } from './version-history-config'
import { type ProjectCollaboration, getProjectCollaboration, type ReviewComment, type ReviewRequest } from './collaboration-config'

// ============================================================================
// Types
// ============================================================================

export type SortField = 'updatedAt' | 'createdAt' | 'name' | 'roi' | 'profit' | 'siteArea'
export type SortOrder = 'asc' | 'desc'
export type StatusFilter = 'all' | ApprovalStatus

export interface DashboardFilters {
  status: StatusFilter
  search: string
  sortField: SortField
  sortOrder: SortOrder
  owner?: string
  reviewer?: string
}

export interface ProjectSummary {
  id: string
  name: string
  address: string
  siteArea: number
  selectedLayoutName: string
  selectedLayoutFloors: number
  selectedLayoutUnits: number
  roi: number
  profit: number
  totalInvestment: number
  status: ApprovalStatus
  owner?: string
  reviewer?: string
  createdAt: number
  updatedAt: number
  versionCount: number
  openCommentCount: number
  pendingReviewCount: number
  latestVersionLabel?: string
}

export interface DashboardStats {
  totalProjects: number
  draftCount: number
  underReviewCount: number
  approvedCount: number
  archivedCount: number
  totalOpenComments: number
  totalPendingReviews: number
  averageROI: number
  totalProfit: number
}

export interface RecentActivity {
  type: 'version' | 'comment' | 'review' | 'approval'
  projectId: string
  projectName: string
  description: string
  timestamp: number
  author?: string
}

// ============================================================================
// Default Filters
// ============================================================================

export const DEFAULT_FILTERS: DashboardFilters = {
  status: 'all',
  search: '',
  sortField: 'updatedAt',
  sortOrder: 'desc',
}

// ============================================================================
// Data Aggregation Functions
// ============================================================================

/**
 * Calculate financials consistently - same formula as report-summary.tsx
 * This ensures dashboard ROI matches report ROI exactly
 */
function calculateFinancials(siteArea: number, layout: { coverage: number; floors: number; units: number; parking?: number }) {
  if (!siteArea || !layout || !layout.coverage || !layout.floors || !layout.units) {
    return { roi: 0, profit: 0, totalInvestment: 0 }
  }
  const gfa = Math.round(siteArea * (layout.coverage / 100) * layout.floors)
  const heightPremium = layout.floors > 15 ? 1.15 : layout.floors > 10 ? 1.08 : 1.0
  const landCost = siteArea * 5000000 // unified: 5M per sqm
  const constructionCost = gfa * 2500000 * heightPremium // unified: 2.5M per sqm
  const softCost = constructionCost * 0.15 // unified: 15%
  const parkingCost = (layout.parking || Math.ceil(layout.units * 1.2)) * 30000000
  const totalInvestment = landCost + constructionCost + softCost + parkingCost
  const projectedRevenue = gfa * 8000000 // unified: 8M per sqm (area-based)
  const profit = projectedRevenue - totalInvestment
  const roi = totalInvestment > 0 ? (profit / totalInvestment * 100) : 0
  return { roi, profit, totalInvestment }
}

/**
 * Get project summary with all related data aggregated
 */
export function getProjectSummary(project: SavedProject): ProjectSummary | null {
  // Safe guard: skip if project or data is missing/corrupted
  if (!project || !project.id) {
    return null
  }
  
  const snapshot = project.data || {}
  const approval = getApproval(project.id)
  const versionHistory = getProjectVersions(project.id)
  const collaboration = getProjectCollaboration(project.id)
  
  const openComments = collaboration?.comments?.filter(c => c.status === 'open').length || 0
  const pendingReviews = collaboration?.reviewRequests?.filter(r => r.status === 'pending').length || 0
  
  // Find selected layout info (with safe fallback for missing layouts)
  const layouts = snapshot.layouts || []
  const selectedLayout = layouts.find(
    l => l.id === snapshot.selectedLayoutId
  ) || layouts[0]
  
  // ALWAYS recalculate financials using same formula as report
  // This ensures ROI consistency between dashboard and report
  const siteArea = snapshot.siteArea || 0
  const calculatedFinancials = selectedLayout && siteArea > 0
    ? calculateFinancials(siteArea, selectedLayout)
    : { roi: 0, profit: 0, totalInvestment: 0 }
  
  return {
    id: project.id,
    name: project.name || '이름 없음',
    address: snapshot.address || '',
    siteArea: siteArea,
    selectedLayoutName: selectedLayout?.name || '미선택',
    selectedLayoutFloors: selectedLayout?.floors || 0,
    selectedLayoutUnits: selectedLayout?.units || 0,
    roi: calculatedFinancials.roi,
    profit: calculatedFinancials.profit,
    totalInvestment: calculatedFinancials.totalInvestment,
    status: approval?.approvalState?.currentStatus || 'draft',
    owner: approval?.ownerName,
    reviewer: approval?.approvalState?.submittedBy,
    createdAt: typeof project.createdAt === 'string' ? new Date(project.createdAt).getTime() : (project.createdAt || Date.now()),
    updatedAt: typeof project.updatedAt === 'string' ? new Date(project.updatedAt).getTime() : (project.updatedAt || Date.now()),
    versionCount: versionHistory?.length || 0,
    openCommentCount: openComments,
    pendingReviewCount: pendingReviews,
    latestVersionLabel: versionHistory?.[0]?.label,
  }
}

/**
 * Get all project summaries
 */
export function getAllProjectSummaries(): ProjectSummary[] {
  const projects = getAllProjects() || []
  return projects
    .map(getProjectSummary)
    .filter((summary): summary is ProjectSummary => summary !== null)
}

/**
 * Calculate dashboard statistics
 */
export function getDashboardStats(summaries: ProjectSummary[]): DashboardStats {
  // Safe array access - ensure summaries is always an array
  const safeSummaries = summaries ?? []
  
  const stats: DashboardStats = {
    totalProjects: safeSummaries.length,
    draftCount: 0,
    underReviewCount: 0,
    approvedCount: 0,
    archivedCount: 0,
    totalOpenComments: 0,
    totalPendingReviews: 0,
    averageROI: 0,
    totalProfit: 0,
  }
  
  let totalROI = 0
  
  safeSummaries.forEach(s => {
    if (!s) return // Skip null/undefined entries
    switch (s.status) {
      case 'draft': stats.draftCount++; break
      case 'under_review': stats.underReviewCount++; break
      case 'approved': stats.approvedCount++; break
      case 'archived': stats.archivedCount++; break
    }
    stats.totalOpenComments += s.openCommentCount || 0
    stats.totalPendingReviews += s.pendingReviewCount || 0
    totalROI += s.roi || 0
    stats.totalProfit += s.profit || 0
  })
  
  stats.averageROI = safeSummaries.length > 0 ? totalROI / safeSummaries.length : 0
  
  return stats
}

/**
 * Get recent activity across all projects
 */
export function getRecentActivity(limit: number = 10): RecentActivity[] {
  const activities: RecentActivity[] = []
  const projects = getAllProjects() || []
  
  projects.forEach(project => {
    // Skip invalid projects
    if (!project || !project.id) return
    
    const projectId = project.id
    const projectName = project.name || '이름 없음'
    
    // Version activities
    const versions = getProjectVersions(projectId)
    if (versions && versions.length > 0) {
      versions.forEach(v => {
        if (!v) return
        activities.push({
          type: 'version',
          projectId,
          projectName,
          description: `${v.label || 'v?'} 버전 저장${v.note ? `: ${v.note}` : ''}`,
          timestamp: v.savedAt || Date.now(),
          author: v.savedBy,
        })
      })
    }
    
    // Comment activities
    const collaboration = getProjectCollaboration(projectId)
    if (collaboration) {
      const comments = collaboration.comments || []
      comments.forEach(c => {
        if (!c) return
        const text = c.text || ''
        activities.push({
          type: 'comment',
          projectId,
          projectName,
          description: `코멘트: ${text.slice(0, 50)}${text.length > 50 ? '...' : ''}`,
          timestamp: c.createdAt || Date.now(),
          author: c.author,
        })
      })
      
      const reviewRequests = collaboration.reviewRequests || []
      reviewRequests.forEach(r => {
        if (!r) return
        activities.push({
          type: 'review',
          projectId,
          projectName,
          description: `리뷰 요청: ${r.assignedTo || '미지정'}`,
          timestamp: r.requestedAt || Date.now(),
          author: r.requestedBy,
        })
      })
    }
    
    // Approval activities
    const approval = getApproval(projectId)
    const history = approval?.history || []
    if (history.length > 0) {
      history.forEach(h => {
        if (!h) return
        activities.push({
          type: 'approval',
          projectId,
          projectName,
          description: `상태 변경: ${getStatusLabel(h.toStatus as ApprovalStatus)}`,
          timestamp: h.timestamp || Date.now(),
          author: h.changedBy,
        })
      })
    }
  })
  
  // Sort by timestamp desc and limit
  return activities
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit)
}

// ============================================================================
// Filtering and Sorting
// ============================================================================

/**
 * Apply filters to project summaries
 */
export function filterProjects(
  summaries: ProjectSummary[],
  filters: DashboardFilters
): ProjectSummary[] {
  // Safe array access
  const safeSummaries = summaries ?? []
  let filtered = [...safeSummaries]
  
  // Status filter
  if (filters.status !== 'all') {
    filtered = filtered.filter(s => s.status === filters.status)
  }
  
  // Search filter (with safe access)
  if (filters.search?.trim()) {
    const search = filters.search.toLowerCase().trim()
    filtered = filtered.filter(s =>
      (s.name || '').toLowerCase().includes(search) ||
      (s.address || '').toLowerCase().includes(search)
    )
  }
  
  // Owner filter
  if (filters.owner) {
    filtered = filtered.filter(s => s.owner === filters.owner)
  }
  
  // Reviewer filter
  if (filters.reviewer) {
    filtered = filtered.filter(s => s.reviewer === filters.reviewer)
  }
  
  return filtered
}

/**
 * Sort project summaries
 */
export function sortProjects(
  summaries: ProjectSummary[],
  sortField: SortField,
  sortOrder: SortOrder
): ProjectSummary[] {
  // Safe array access
  const safeSummaries = summaries ?? []
  const sorted = [...safeSummaries]
  
  sorted.sort((a, b) => {
    let comparison = 0
    
    switch (sortField) {
      case 'updatedAt':
        comparison = a.updatedAt - b.updatedAt
        break
      case 'createdAt':
        comparison = a.createdAt - b.createdAt
        break
      case 'name':
        comparison = a.name.localeCompare(b.name, 'ko')
        break
      case 'roi':
        comparison = a.roi - b.roi
        break
      case 'profit':
        comparison = a.profit - b.profit
        break
      case 'siteArea':
        comparison = a.siteArea - b.siteArea
        break
    }
    
    return sortOrder === 'asc' ? comparison : -comparison
  })
  
  return sorted
}

/**
 * Apply both filter and sort
 */
export function filterAndSortProjects(
  summaries: ProjectSummary[],
  filters: DashboardFilters
): ProjectSummary[] {
  const filtered = filterProjects(summaries, filters)
  return sortProjects(filtered, filters.sortField, filters.sortOrder)
}

// ============================================================================
// Helpers
// ============================================================================

export function getStatusLabel(status: ApprovalStatus): string {
  switch (status) {
    case 'draft': return '초안'
    case 'under_review': return '검토 중'
    case 'approved': return '승인됨'
    case 'archived': return '보관됨'
    default: return status
  }
}

export function getStatusColor(status: ApprovalStatus): string {
  switch (status) {
    case 'draft': return 'bg-slate-100 text-slate-700'
    case 'under_review': return 'bg-amber-100 text-amber-700'
    case 'approved': return 'bg-emerald-100 text-emerald-700'
    case 'archived': return 'bg-gray-100 text-gray-500'
    default: return 'bg-slate-100 text-slate-700'
  }
}

export function formatKRWCompact(value: number): string {
  if (value >= 100000000) {
    return `${(value / 100000000).toFixed(1)}억`
  } else if (value >= 10000) {
    return `${(value / 10000).toFixed(0)}만`
  }
  return value.toLocaleString()
}

export function formatDateRelative(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  if (hours < 24) return `${hours}시간 전`
  if (days < 7) return `${days}일 전`
  
  return new Date(timestamp).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ============================================================================
// Project Actions
// ============================================================================

/**
 * Duplicate a project with full deep copy to preserve all data integrity
 */
export function duplicateProjectFull(projectId: string): SavedProject | null {
  const projects = getAllProjects()
  const original = projects.find(p => p.id === projectId)
  
  if (!original || !original.data) return null
  
  const now = new Date().toISOString()
  
  // Deep copy the entire data object to avoid reference issues
  const duplicatedData = JSON.parse(JSON.stringify(original.data))
  
  const duplicated: SavedProject = {
    id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    name: `${original.name || '이름 없음'} (복사본)`,
    address: original.address || duplicatedData.address || '',
    siteArea: original.siteArea || duplicatedData.siteArea || 0,
    createdAt: now,
    updatedAt: now,
    thumbnail: original.thumbnail,
    data: duplicatedData,
  }
  
  // Save to localStorage using the same key as project-storage.ts
  if (typeof window !== 'undefined') {
    try {
      const STORAGE_KEY = 'archiscan_saved_projects'
      const stored = localStorage.getItem(STORAGE_KEY)
      const allProjects: SavedProject[] = stored ? JSON.parse(stored) : []
      allProjects.unshift(duplicated)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allProjects))
    } catch (error) {
      console.error('[v0] Failed to save duplicated project:', error)
      return null
    }
  }
  
  return duplicated
}

/**
 * Archive/unarchive a project
 */
export function toggleArchiveProject(projectId: string): boolean {
  if (typeof window === 'undefined') return false
  
  const APPROVAL_STORAGE_KEY = 'archi-scan-project-approvals'
  const stored = localStorage.getItem(APPROVAL_STORAGE_KEY)
  const approvals: Record<string, ProjectApprovalData> = stored ? JSON.parse(stored) : {}
  
  const now = new Date().toISOString()
  
  if (!approvals[projectId]) {
    // Create new approval with archived status
    approvals[projectId] = {
      approvalState: {
        currentStatus: 'archived',
        history: [{
          action: 'archived',
          timestamp: now,
          userId: 'system',
          userName: '시스템',
          note: '프로젝트 보관됨',
        }],
        lastUpdated: now,
      },
      ownerId: 'system',
      ownerName: '시스템',
    }
  } else {
    // Toggle existing approval status
    const currentStatus = approvals[projectId].approvalState?.currentStatus || 'draft'
    const newStatus = currentStatus === 'archived' ? 'draft' : 'archived'
    
    if (!approvals[projectId].approvalState) {
      approvals[projectId].approvalState = {
        currentStatus: newStatus,
        history: [],
        lastUpdated: now,
      }
    } else {
      approvals[projectId].approvalState.currentStatus = newStatus
      approvals[projectId].approvalState.lastUpdated = now
    }
    
    approvals[projectId].approvalState.history.push({
      action: newStatus === 'archived' ? 'archived' : 'unarchived',
      timestamp: now,
      userId: 'system',
      userName: '시스템',
      note: newStatus === 'archived' ? '프로젝트 보관됨' : '프로젝트 보관 해제됨',
    })
  }
  
  localStorage.setItem(APPROVAL_STORAGE_KEY, JSON.stringify(approvals))
  return true
}

/**
 * Delete a project completely (including all related data)
 */
export function deleteProjectComplete(projectId: string): boolean {
  if (typeof window === 'undefined') return false
  
  // Delete main project
  deleteProject(projectId)
  
  // Delete version history
  const VERSION_KEY = 'archi_scan_version_histories'
  const versionStored = localStorage.getItem(VERSION_KEY)
  if (versionStored) {
    const histories: Record<string, ProjectVersion[]> = JSON.parse(versionStored)
    delete histories[projectId]
    localStorage.setItem(VERSION_KEY, JSON.stringify(histories))
  }
  
  // Delete approval data
  const APPROVAL_KEY = 'archi_scan_project_approvals'
  const approvalStored = localStorage.getItem(APPROVAL_KEY)
  if (approvalStored) {
    const approvals: Record<string, ProjectApprovalData> = JSON.parse(approvalStored)
    delete approvals[projectId]
    localStorage.setItem(APPROVAL_KEY, JSON.stringify(approvals))
  }
  
  // Delete collaboration data
  const COLLAB_KEY = 'archi_scan_project_collaborations'
  const collabStored = localStorage.getItem(COLLAB_KEY)
  if (collabStored) {
    const collabs: Record<string, any> = JSON.parse(collabStored)
    delete collabs[projectId]
    localStorage.setItem(COLLAB_KEY, JSON.stringify(collabs))
  }
  
  return true
}
