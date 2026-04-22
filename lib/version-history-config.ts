/**
 * Version History Module
 * 
 * This module provides version history and revision management as a separate extension
 * that does not modify the frozen report baseline.
 * 
 * Storage: localStorage (can be migrated to Supabase later)
 */

import type { ProjectSnapshot, SavedProject } from './project-storage'

// ============================================================================
// Types
// ============================================================================

export interface ProjectVersion {
  versionId: string
  versionNumber: number
  label: string // "v1", "v2", "v3"...
  createdAt: string
  revisionNote?: string
  snapshot: ProjectSnapshot
}

export interface VersionedProject extends SavedProject {
  versions: ProjectVersion[]
  currentVersionId: string
}

export interface VersionComparison {
  field: string
  fieldLabel: string
  category: 'basic' | 'regulation' | 'layout' | 'financial' | 'risk' | 'conclusion'
  oldValue: string | number | boolean | null
  newValue: string | number | boolean | null
  changed: boolean
  importance: 'high' | 'medium' | 'low'
}

export interface VersionComparisonResult {
  version1Label: string
  version2Label: string
  timestamp1: string
  timestamp2: string
  changes: VersionComparison[]
  totalChanges: number
  highImportanceChanges: number
}

// ============================================================================
// Constants
// ============================================================================

const VERSION_STORAGE_KEY = 'archiscan_project_versions'

// ============================================================================
// Utility Functions
// ============================================================================

export function generateVersionId(): string {
  return `ver_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

export function formatVersionLabel(versionNumber: number): string {
  return `v${versionNumber}`
}

export function formatVersionDate(isoDate: string): string {
  try {
    const date = new Date(isoDate)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return isoDate
  }
}

// ============================================================================
// Version Storage Functions
// ============================================================================

function getVersionStorage(): Record<string, ProjectVersion[]> {
  if (typeof window === 'undefined') return {}
  
  try {
    const stored = localStorage.getItem(VERSION_STORAGE_KEY)
    if (!stored) return {}
    return JSON.parse(stored)
  } catch {
    console.error('[v0] Failed to parse version storage')
    return {}
  }
}

function setVersionStorage(data: Record<string, ProjectVersion[]>): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(VERSION_STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    console.error('[v0] Failed to save version storage:', error)
  }
}

// ============================================================================
// Version CRUD Operations
// ============================================================================

/**
 * Get all versions for a project
 */
export function getProjectVersions(projectId: string): ProjectVersion[] {
  const storage = getVersionStorage()
  return storage[projectId] || []
}

/**
 * Check if a project has version history
 */
export function hasVersionHistory(projectId: string): boolean {
  const versions = getProjectVersions(projectId)
  return versions.length > 0
}

/**
 * Get the latest version number for a project
 */
export function getLatestVersionNumber(projectId: string): number {
  const versions = getProjectVersions(projectId)
  if (versions.length === 0) return 0
  return Math.max(...versions.map(v => v.versionNumber))
}

/**
 * Save a new version for a project
 */
export function saveNewVersion(
  projectId: string,
  snapshot: ProjectSnapshot,
  revisionNote?: string
): ProjectVersion {
  const storage = getVersionStorage()
  const existingVersions = storage[projectId] || []
  const nextNumber = getLatestVersionNumber(projectId) + 1
  
  const newVersion: ProjectVersion = {
    versionId: generateVersionId(),
    versionNumber: nextNumber,
    label: formatVersionLabel(nextNumber),
    createdAt: new Date().toISOString(),
    revisionNote,
    snapshot,
  }
  
  storage[projectId] = [...existingVersions, newVersion]
  setVersionStorage(storage)
  
  return newVersion
}

/**
 * Load a specific version
 */
export function loadVersion(projectId: string, versionId: string): ProjectVersion | null {
  const versions = getProjectVersions(projectId)
  return versions.find(v => v.versionId === versionId) || null
}

/**
 * Delete a specific version
 */
export function deleteVersion(projectId: string, versionId: string): boolean {
  const storage = getVersionStorage()
  const versions = storage[projectId] || []
  
  const filtered = versions.filter(v => v.versionId !== versionId)
  
  // Renumber remaining versions
  const renumbered = filtered.map((v, idx) => ({
    ...v,
    versionNumber: idx + 1,
    label: formatVersionLabel(idx + 1),
  }))
  
  storage[projectId] = renumbered
  setVersionStorage(storage)
  
  return filtered.length < versions.length
}

/**
 * Duplicate a version
 */
export function duplicateVersion(
  projectId: string, 
  versionId: string,
  newNote?: string
): ProjectVersion | null {
  const sourceVersion = loadVersion(projectId, versionId)
  if (!sourceVersion) return null
  
  return saveNewVersion(
    projectId,
    sourceVersion.snapshot,
    newNote || `${sourceVersion.label}에서 복제됨`
  )
}

/**
 * Update version revision note
 */
export function updateVersionNote(
  projectId: string,
  versionId: string,
  newNote: string
): boolean {
  const storage = getVersionStorage()
  const versions = storage[projectId] || []
  
  const idx = versions.findIndex(v => v.versionId === versionId)
  if (idx === -1) return false
  
  versions[idx] = { ...versions[idx], revisionNote: newNote }
  storage[projectId] = versions
  setVersionStorage(storage)
  
  return true
}

/**
 * Delete all versions for a project
 */
export function deleteAllVersions(projectId: string): void {
  const storage = getVersionStorage()
  delete storage[projectId]
  setVersionStorage(storage)
}

/**
 * Initialize version history for existing project without versions
 */
export function initializeVersionHistory(
  projectId: string,
  snapshot: ProjectSnapshot
): ProjectVersion {
  // Check if versions already exist
  const existing = getProjectVersions(projectId)
  if (existing.length > 0) {
    return existing[existing.length - 1] // Return latest
  }
  
  // Create initial version
  return saveNewVersion(projectId, snapshot, '초기 버전')
}

// ============================================================================
// Version Comparison
// ============================================================================

/**
 * Compare two versions and return differences
 */
export function compareVersions(
  version1: ProjectVersion,
  version2: ProjectVersion
): VersionComparisonResult {
  const changes: VersionComparison[] = []
  const s1 = version1.snapshot
  const s2 = version2.snapshot
  
  // Basic Info
  addComparison(changes, 'address', '대상지 주소', 'basic', s1.address, s2.address, 'high')
  addComparison(changes, 'siteArea', '대지면적 (㎡)', 'basic', s1.siteArea, s2.siteArea, 'high')
  addComparison(changes, 'projectType', '사업유형', 'basic', s1.projectType, s2.projectType, 'medium')
  addComparison(changes, 'zoneType', '용도지역', 'basic', s1.zoneType, s2.zoneType, 'high')
  
  // Regulation
  addComparison(changes, 'coverageRatio', '건폐율 (%)', 'regulation', s1.regulation.coverageRatio, s2.regulation.coverageRatio, 'high')
  addComparison(changes, 'floorAreaRatio', '용적률 (%)', 'regulation', s1.regulation.floorAreaRatio, s2.regulation.floorAreaRatio, 'high')
  addComparison(changes, 'maxHeight', '최고높이', 'regulation', s1.regulation.maxHeight, s2.regulation.maxHeight, 'medium')
  addComparison(changes, 'maxFloors', '최고층수', 'regulation', s1.regulation.maxFloors, s2.regulation.maxFloors, 'medium')
  
  // Layout Selection
  addComparison(changes, 'selectedLayoutId', '선택 배치안 ID', 'layout', s1.selectedLayoutId, s2.selectedLayoutId, 'high')
  addComparison(changes, 'recommendedLayoutId', '추천 배치안 ID', 'layout', s1.recommendedLayoutId, s2.recommendedLayoutId, 'high')
  // Safe layouts access
  const layouts1 = s1.layouts || []
  const layouts2 = s2.layouts || []
  addComparison(changes, 'layoutCount', '배치안 수', 'layout', layouts1.length, layouts2.length, 'medium')
  
  // Get selected layout names
  const selectedLayout1 = layouts1.find(l => l.id === s1.selectedLayoutId)
  const selectedLayout2 = layouts2.find(l => l.id === s2.selectedLayoutId)
  addComparison(changes, 'selectedLayoutName', '선택 배치안', 'layout', selectedLayout1?.name || '', selectedLayout2?.name || '', 'high')
  
  // Financials
  addComparison(changes, 'landCost', '토지비 (억원)', 'financial', Math.round(s1.financials.landCost / 100000000), Math.round(s2.financials.landCost / 100000000), 'high')
  addComparison(changes, 'constructionCost', '공사비 (억원)', 'financial', Math.round(s1.financials.constructionCost / 100000000), Math.round(s2.financials.constructionCost / 100000000), 'high')
  addComparison(changes, 'totalInvestment', '총 사업비 (억원)', 'financial', Math.round(s1.financials.totalInvestment / 100000000), Math.round(s2.financials.totalInvestment / 100000000), 'high')
  addComparison(changes, 'projectedRevenue', '분양수입 (억원)', 'financial', Math.round(s1.financials.projectedRevenue / 100000000), Math.round(s2.financials.projectedRevenue / 100000000), 'high')
  addComparison(changes, 'profit', '예상 이익 (억원)', 'financial', Math.round(s1.financials.profit / 100000000), Math.round(s2.financials.profit / 100000000), 'high')
  addComparison(changes, 'roi', 'ROI (%)', 'financial', Math.round(s1.financials.roi * 10) / 10, Math.round(s2.financials.roi * 10) / 10, 'high')
  
  // Risks
  addComparison(changes, 'riskCount', '리스크 항목 수', 'risk', s1.risks.length, s2.risks.length, 'low')
  
  // Conclusion
  addComparison(changes, 'recommendationType', '권고 유형', 'conclusion', s1.recommendationType, s2.recommendationType, 'high')
  addComparison(changes, 'conclusionText', '결론 내용', 'conclusion', 
    s1.conclusionText.substring(0, 50) + '...', 
    s2.conclusionText.substring(0, 50) + '...', 
    'medium'
  )
  
  const changedItems = changes.filter(c => c.changed)
  
  return {
    version1Label: version1.label,
    version2Label: version2.label,
    timestamp1: version1.createdAt,
    timestamp2: version2.createdAt,
    changes: changedItems,
    totalChanges: changedItems.length,
    highImportanceChanges: changedItems.filter(c => c.importance === 'high').length,
  }
}

function addComparison(
  changes: VersionComparison[],
  field: string,
  fieldLabel: string,
  category: VersionComparison['category'],
  oldValue: string | number | boolean | null | undefined,
  newValue: string | number | boolean | null | undefined,
  importance: VersionComparison['importance']
): void {
  const old = oldValue ?? null
  const curr = newValue ?? null
  const changed = JSON.stringify(old) !== JSON.stringify(curr)
  
  changes.push({
    field,
    fieldLabel,
    category,
    oldValue: old,
    newValue: curr,
    changed,
    importance,
  })
}

/**
 * Get summary of version comparison
 */
export function getComparisonSummary(result: VersionComparisonResult): string {
  if (result.totalChanges === 0) {
    return '변경 사항 없음'
  }
  
  const parts: string[] = []
  
  const byCategory = result.changes.reduce((acc, c) => {
    acc[c.category] = (acc[c.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  if (byCategory.basic) parts.push(`기본정보 ${byCategory.basic}건`)
  if (byCategory.regulation) parts.push(`법규 ${byCategory.regulation}건`)
  if (byCategory.layout) parts.push(`배치안 ${byCategory.layout}건`)
  if (byCategory.financial) parts.push(`사업성 ${byCategory.financial}건`)
  if (byCategory.conclusion) parts.push(`결론 ${byCategory.conclusion}건`)
  
  return `총 ${result.totalChanges}건 변경 (${parts.join(', ')})`
}

// ============================================================================
// Export for JSON backup
// ============================================================================

export interface VersionHistoryExport {
  projectId: string
  versions: ProjectVersion[]
  exportedAt: string
}

export function exportVersionHistory(projectId: string): VersionHistoryExport | null {
  const versions = getProjectVersions(projectId)
  if (versions.length === 0) return null
  
  return {
    projectId,
    versions,
    exportedAt: new Date().toISOString(),
  }
}

export function importVersionHistory(data: VersionHistoryExport): boolean {
  try {
    if (!data.projectId || !Array.isArray(data.versions)) {
      return false
    }
    
    const storage = getVersionStorage()
    
    // Merge with existing versions, avoiding duplicates by versionId
    const existing = storage[data.projectId] || []
    const existingIds = new Set(existing.map(v => v.versionId))
    const newVersions = data.versions.filter(v => !existingIds.has(v.versionId))
    
    storage[data.projectId] = [...existing, ...newVersions].sort(
      (a, b) => a.versionNumber - b.versionNumber
    )
    
    setVersionStorage(storage)
    return true
  } catch {
    return false
  }
}
