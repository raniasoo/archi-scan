/**
 * Collaboration and Sharing Configuration Module
 * 
 * Extension module for project sharing, review comments, and collaboration workflow.
 * Designed for future Supabase multi-user sync.
 * 
 * FROZEN BASELINE RULE: This module does NOT modify the locked report structure,
 * PDF layout, wording, Excel schema, or any other frozen modules.
 */

import { v4 as uuidv4 } from 'uuid'

// ============================================================================
// Types
// ============================================================================

export type ShareAccessLevel = 'edit' | 'read_only' | 'client_view'

export type CommentStatus = 'open' | 'resolved'

export type ReviewRequestStatus = 'pending' | 'in_progress' | 'completed' | 'declined'

export interface ShareLink {
  id: string
  projectId: string
  accessLevel: ShareAccessLevel
  createdAt: string
  createdBy: string
  expiresAt?: string
  isActive: boolean
  accessCount: number
  lastAccessedAt?: string
  label?: string
}

export interface ReviewComment {
  id: string
  projectId: string
  versionId?: string
  authorId: string
  authorName: string
  authorRole: string
  createdAt: string
  updatedAt?: string
  text: string
  status: CommentStatus
  resolvedAt?: string
  resolvedBy?: string
  section?: string // Optional: which section the comment refers to
  parentId?: string // For threaded replies
}

export interface ReviewRequest {
  id: string
  projectId: string
  versionId?: string
  requesterId: string
  requesterName: string
  reviewerId: string
  reviewerName: string
  status: ReviewRequestStatus
  createdAt: string
  dueDate?: string
  message?: string
  responseNote?: string
  completedAt?: string
}

export interface ProjectCollaboration {
  projectId: string
  ownerId: string
  ownerName: string
  shareLinks: ShareLink[]
  comments: ReviewComment[]
  reviewRequests: ReviewRequest[]
  collaborators: CollaboratorInfo[]
  lastActivityAt: string
}

export interface CollaboratorInfo {
  userId: string
  userName: string
  role: string
  accessLevel: ShareAccessLevel
  addedAt: string
  addedBy: string
  lastAccessAt?: string
}

// ============================================================================
// Constants
// ============================================================================

export const ACCESS_LEVEL_LABELS: Record<ShareAccessLevel, string> = {
  edit: '편집 가능',
  read_only: '읽기 전용 (내부)',
  client_view: '클라이언트 공유',
}

export const ACCESS_LEVEL_DESCRIPTIONS: Record<ShareAccessLevel, string> = {
  edit: '프로젝트를 편집하고 버전을 저장할 수 있습니다',
  read_only: '내부 팀원이 보고서를 열람할 수 있습니다',
  client_view: '클라이언트가 최종 보고서만 열람할 수 있습니다',
}

export const COMMENT_STATUS_LABELS: Record<CommentStatus, string> = {
  open: '미해결',
  resolved: '해결됨',
}

export const REVIEW_STATUS_LABELS: Record<ReviewRequestStatus, string> = {
  pending: '검토 대기',
  in_progress: '검토 중',
  completed: '검토 완료',
  declined: '거절됨',
}

export const REVIEW_STATUS_COLORS: Record<ReviewRequestStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  declined: 'bg-red-100 text-red-800 border-red-200',
}

const STORAGE_KEY = 'archi-scan-collaboration'

// ============================================================================
// Empty/Default Values
// ============================================================================

export const EMPTY_COLLABORATION: ProjectCollaboration = {
  projectId: '',
  ownerId: '',
  ownerName: '',
  shareLinks: [],
  comments: [],
  reviewRequests: [],
  collaborators: [],
  lastActivityAt: new Date().toISOString(),
}

// ============================================================================
// Storage Functions
// ============================================================================

function getAllCollaborations(): Record<string, ProjectCollaboration> {
  if (typeof window === 'undefined') return {}
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

function saveAllCollaborations(data: Record<string, ProjectCollaboration>): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.error('Failed to save collaboration data:', e)
  }
}

export function getProjectCollaboration(projectId: string): ProjectCollaboration | null {
  const all = getAllCollaborations()
  return all[projectId] || null
}

export function saveProjectCollaboration(collab: ProjectCollaboration): void {
  const all = getAllCollaborations()
  all[collab.projectId] = {
    ...collab,
    lastActivityAt: new Date().toISOString(),
  }
  saveAllCollaborations(all)
}

export function initializeCollaboration(
  projectId: string,
  ownerId: string,
  ownerName: string
): ProjectCollaboration {
  const existing = getProjectCollaboration(projectId)
  if (existing) return existing
  
  const collab: ProjectCollaboration = {
    ...EMPTY_COLLABORATION,
    projectId,
    ownerId,
    ownerName,
    lastActivityAt: new Date().toISOString(),
  }
  saveProjectCollaboration(collab)
  return collab
}

// ============================================================================
// Share Link Functions
// ============================================================================

export function generateShareLink(
  projectId: string,
  accessLevel: ShareAccessLevel,
  createdBy: string,
  label?: string,
  expiresInDays?: number
): ShareLink {
  const link: ShareLink = {
    id: uuidv4(),
    projectId,
    accessLevel,
    createdAt: new Date().toISOString(),
    createdBy,
    isActive: true,
    accessCount: 0,
    label,
    expiresAt: expiresInDays 
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : undefined,
  }
  
  const collab = getProjectCollaboration(projectId)
  if (collab) {
    collab.shareLinks.push(link)
    saveProjectCollaboration(collab)
  }
  
  return link
}

export function getShareLinkUrl(linkId: string): string {
  // In production, this would be a real URL
  // For now, return a simulated share URL
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/share/${linkId}`
  }
  return `/share/${linkId}`
}

export function deactivateShareLink(projectId: string, linkId: string): void {
  const collab = getProjectCollaboration(projectId)
  if (collab) {
    const link = collab.shareLinks.find(l => l.id === linkId)
    if (link) {
      link.isActive = false
      saveProjectCollaboration(collab)
    }
  }
}

export function deleteShareLink(projectId: string, linkId: string): void {
  const collab = getProjectCollaboration(projectId)
  if (collab) {
    collab.shareLinks = collab.shareLinks.filter(l => l.id !== linkId)
    saveProjectCollaboration(collab)
  }
}

export function isShareLinkValid(link: ShareLink): boolean {
  if (!link.isActive) return false
  if (link.expiresAt && new Date(link.expiresAt) < new Date()) return false
  return true
}

// ============================================================================
// Comment Functions
// ============================================================================

export function addComment(
  projectId: string,
  authorId: string,
  authorName: string,
  authorRole: string,
  text: string,
  section?: string,
  parentId?: string,
  versionId?: string
): ReviewComment {
  const comment: ReviewComment = {
    id: uuidv4(),
    projectId,
    versionId,
    authorId,
    authorName,
    authorRole,
    createdAt: new Date().toISOString(),
    text,
    status: 'open',
    section,
    parentId,
  }
  
  const collab = getProjectCollaboration(projectId)
  if (collab) {
    collab.comments.push(comment)
    saveProjectCollaboration(collab)
  }
  
  return comment
}

export function updateComment(
  projectId: string,
  commentId: string,
  text: string
): ReviewComment | null {
  const collab = getProjectCollaboration(projectId)
  if (collab) {
    const comment = collab.comments.find(c => c.id === commentId)
    if (comment) {
      comment.text = text
      comment.updatedAt = new Date().toISOString()
      saveProjectCollaboration(collab)
      return comment
    }
  }
  return null
}

export function resolveComment(
  projectId: string,
  commentId: string,
  resolvedBy: string
): ReviewComment | null {
  const collab = getProjectCollaboration(projectId)
  if (collab) {
    const comment = collab.comments.find(c => c.id === commentId)
    if (comment) {
      comment.status = 'resolved'
      comment.resolvedAt = new Date().toISOString()
      comment.resolvedBy = resolvedBy
      saveProjectCollaboration(collab)
      return comment
    }
  }
  return null
}

export function reopenComment(projectId: string, commentId: string): ReviewComment | null {
  const collab = getProjectCollaboration(projectId)
  if (collab) {
    const comment = collab.comments.find(c => c.id === commentId)
    if (comment) {
      comment.status = 'open'
      comment.resolvedAt = undefined
      comment.resolvedBy = undefined
      saveProjectCollaboration(collab)
      return comment
    }
  }
  return null
}

export function deleteComment(projectId: string, commentId: string): void {
  const collab = getProjectCollaboration(projectId)
  if (collab) {
    collab.comments = collab.comments.filter(c => c.id !== commentId)
    saveProjectCollaboration(collab)
  }
}

export function getOpenCommentCount(projectId: string): number {
  const collab = getProjectCollaboration(projectId)
  if (!collab) return 0
  return collab.comments.filter(c => c.status === 'open').length
}

// ============================================================================
// Review Request Functions
// ============================================================================

export function createReviewRequest(
  projectId: string,
  requesterId: string,
  requesterName: string,
  reviewerId: string,
  reviewerName: string,
  message?: string,
  dueDate?: string,
  versionId?: string
): ReviewRequest {
  const request: ReviewRequest = {
    id: uuidv4(),
    projectId,
    versionId,
    requesterId,
    requesterName,
    reviewerId,
    reviewerName,
    status: 'pending',
    createdAt: new Date().toISOString(),
    message,
    dueDate,
  }
  
  const collab = getProjectCollaboration(projectId)
  if (collab) {
    collab.reviewRequests.push(request)
    saveProjectCollaboration(collab)
  }
  
  return request
}

export function startReview(projectId: string, requestId: string): ReviewRequest | null {
  const collab = getProjectCollaboration(projectId)
  if (collab) {
    const request = collab.reviewRequests.find(r => r.id === requestId)
    if (request && request.status === 'pending') {
      request.status = 'in_progress'
      saveProjectCollaboration(collab)
      return request
    }
  }
  return null
}

export function completeReview(
  projectId: string,
  requestId: string,
  responseNote?: string
): ReviewRequest | null {
  const collab = getProjectCollaboration(projectId)
  if (collab) {
    const request = collab.reviewRequests.find(r => r.id === requestId)
    if (request) {
      request.status = 'completed'
      request.completedAt = new Date().toISOString()
      request.responseNote = responseNote
      saveProjectCollaboration(collab)
      return request
    }
  }
  return null
}

export function declineReview(
  projectId: string,
  requestId: string,
  responseNote?: string
): ReviewRequest | null {
  const collab = getProjectCollaboration(projectId)
  if (collab) {
    const request = collab.reviewRequests.find(r => r.id === requestId)
    if (request) {
      request.status = 'declined'
      request.completedAt = new Date().toISOString()
      request.responseNote = responseNote
      saveProjectCollaboration(collab)
      return request
    }
  }
  return null
}

export function getPendingReviewRequests(projectId: string): ReviewRequest[] {
  const collab = getProjectCollaboration(projectId)
  if (!collab) return []
  return collab.reviewRequests.filter(r => r.status === 'pending' || r.status === 'in_progress')
}

// ============================================================================
// Collaborator Functions
// ============================================================================

export function addCollaborator(
  projectId: string,
  userId: string,
  userName: string,
  role: string,
  accessLevel: ShareAccessLevel,
  addedBy: string
): CollaboratorInfo {
  const collaborator: CollaboratorInfo = {
    userId,
    userName,
    role,
    accessLevel,
    addedAt: new Date().toISOString(),
    addedBy,
  }
  
  const collab = getProjectCollaboration(projectId)
  if (collab) {
    // Remove existing entry if any
    collab.collaborators = collab.collaborators.filter(c => c.userId !== userId)
    collab.collaborators.push(collaborator)
    saveProjectCollaboration(collab)
  }
  
  return collaborator
}

export function removeCollaborator(projectId: string, userId: string): void {
  const collab = getProjectCollaboration(projectId)
  if (collab) {
    collab.collaborators = collab.collaborators.filter(c => c.userId !== userId)
    saveProjectCollaboration(collab)
  }
}

export function updateCollaboratorAccess(
  projectId: string,
  userId: string,
  accessLevel: ShareAccessLevel
): CollaboratorInfo | null {
  const collab = getProjectCollaboration(projectId)
  if (collab) {
    const collaborator = collab.collaborators.find(c => c.userId === userId)
    if (collaborator) {
      collaborator.accessLevel = accessLevel
      saveProjectCollaboration(collab)
      return collaborator
    }
  }
  return null
}

// ============================================================================
// Helper Functions
// ============================================================================

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 1) return '방금 전'
  if (diffMins < 60) return `${diffMins}분 전`
  if (diffHours < 24) return `${diffHours}시간 전`
  if (diffDays < 7) return `${diffDays}일 전`
  return date.toLocaleDateString('ko-KR')
}

export function canUserEdit(accessLevel: ShareAccessLevel): boolean {
  return accessLevel === 'edit'
}

export function canUserComment(accessLevel: ShareAccessLevel): boolean {
  return accessLevel === 'edit' || accessLevel === 'read_only'
}

// ============================================================================
// Export for JSON Backup
// ============================================================================

export function exportCollaborationData(projectId: string): string | null {
  const collab = getProjectCollaboration(projectId)
  if (!collab) return null
  return JSON.stringify(collab, null, 2)
}

export function importCollaborationData(
  projectId: string,
  jsonData: string
): ProjectCollaboration | null {
  try {
    const data = JSON.parse(jsonData) as ProjectCollaboration
    // Ensure projectId matches
    data.projectId = projectId
    saveProjectCollaboration(data)
    return data
  } catch {
    return null
  }
}
