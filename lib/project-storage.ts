/**
 * Project Save/Load Module
 * 
 * This module provides project save/load functionality as a separate extension
 * that does not modify the frozen report baseline.
 * 
 * Storage: localStorage (can be migrated to Supabase later)
 */

import type { FeasibilityReportData } from './report-data-schema'

// ============================================================================
// Types
// ============================================================================

export interface SavedProject {
  id: string
  name: string
  address: string
  siteArea: number
  createdAt: string
  updatedAt: string
  thumbnail?: string
  data: ProjectSnapshot
}

export interface ProjectSnapshot {
  // Basic Info
  address: string
  siteArea: number
  projectType: string
  dateStr: string
  docNumber: string
  
  // Site Analysis
  zoneType: string
  landUsePlan: string
  roadAccess: string
  
  // Regulation
  regulation: {
    zoneType: string
    coverageRatio: number
    floorAreaRatio: number
    maxHeight: string
    maxFloors: number
  }
  
  // Layouts
  layouts: Array<{
    id: number
    name: string
    type: string
    description: string
    coverage: number
    units: number
    floors: number
    parking: number
    features: string[]
    gfa?: number
    openSpace?: number
    scores?: {
      profitability: number
      livability: number
      regulatory: number
      efficiency: number
      overall: number
    }
    recommendation?: {
      isRecommended: boolean
      rank: number
      strategyMatch: number
      strengths: string[]
      weaknesses: string[]
      summary: string
    }
    reasoning?: {
      mainPoints: string[]
      details: string
      recommendation: string
    }
  }>
  
  // Selected Layout
  selectedLayoutId: number
  recommendedLayoutId: number
  
  // Financials (computed values for restoration)
  financials: {
    landCost: number
    constructionCost: number
    otherCosts: number
    totalInvestment: number
    projectedRevenue: number
    profit: number
    roi: number
  }
  
  // Risks
  risks: Array<{
    title: string
    items: string[]
  }>
  
  // Conclusion
  conclusionText: string
  recommendationType: 'positive' | 'conditional' | 'cautious'
}

export interface ProjectListItem {
  id: string
  name: string
  address: string
  siteArea: number
  updatedAt: string
  thumbnail?: string
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = 'archiscan_saved_projects'
const MAX_RECENT_PROJECTS = 10

// ============================================================================
// Storage Functions
// ============================================================================

function getStoredProjects(): SavedProject[] {
  if (typeof window === 'undefined') return []
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    return JSON.parse(stored)
  } catch {
    console.error('[v0] Failed to parse stored projects')
    return []
  }
}

function setStoredProjects(projects: SavedProject[]): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
  } catch (error) {
    console.error('[v0] Failed to save projects to localStorage:', error)
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Generate a unique project ID
 */
export function generateProjectId(): string {
  return `proj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Ensure snapshot has all required fields with safe defaults
 */
function sanitizeSnapshot(snapshot: ProjectSnapshot): ProjectSnapshot {
  return {
    // Basic Info - required
    address: snapshot.address || '주소 미지정',
    siteArea: snapshot.siteArea || 0,
    projectType: snapshot.projectType || '공동주택 신축사업',
    dateStr: snapshot.dateStr || new Date().toLocaleDateString('ko-KR'),
    docNumber: snapshot.docNumber || `AS-${Date.now()}`,
    
    // Site Analysis - with defaults
    zoneType: snapshot.zoneType || '제2종일반주거지역',
    landUsePlan: snapshot.landUsePlan || '도시지역',
    roadAccess: snapshot.roadAccess || '도로 접함',
    
    // Regulation - with defaults
    regulation: {
      zoneType: snapshot.regulation?.zoneType || '제2종일반주거지역',
      coverageRatio: snapshot.regulation?.coverageRatio || 60,
      floorAreaRatio: snapshot.regulation?.floorAreaRatio || 200,
      maxHeight: snapshot.regulation?.maxHeight || '없음',
      maxFloors: snapshot.regulation?.maxFloors || 15,
    },
    
    // Layouts - ensure array
    layouts: Array.isArray(snapshot.layouts) ? snapshot.layouts : [],
    
    // Selected Layout - with fallback
    selectedLayoutId: snapshot.selectedLayoutId ?? (snapshot.layouts?.[0]?.id || 1),
    recommendedLayoutId: snapshot.recommendedLayoutId ?? snapshot.selectedLayoutId ?? 1,
    
    // Financials - with defaults
    financials: {
      landCost: snapshot.financials?.landCost || 0,
      constructionCost: snapshot.financials?.constructionCost || 0,
      otherCosts: snapshot.financials?.otherCosts || 0,
      totalInvestment: snapshot.financials?.totalInvestment || 0,
      projectedRevenue: snapshot.financials?.projectedRevenue || 0,
      profit: snapshot.financials?.profit || 0,
      roi: snapshot.financials?.roi || 0,
    },
    
    // Risks - ensure array
    risks: Array.isArray(snapshot.risks) ? snapshot.risks : [],
    
    // Conclusion - with defaults
    conclusionText: snapshot.conclusionText || '',
    recommendationType: snapshot.recommendationType || 'conditional',
  }
}

/**
 * Save a project snapshot with validation and defensive handling
 */
export function saveProject(
  snapshot: ProjectSnapshot,
  existingId?: string,
  customName?: string
): SavedProject {
  // Validate input
  if (!snapshot) {
    throw new Error('Cannot save null/undefined snapshot')
  }
  
  // Sanitize snapshot to ensure all fields exist
  const sanitizedSnapshot = sanitizeSnapshot(snapshot)
  
  const projects = getStoredProjects()
  const now = new Date().toISOString()
  
  // Check if updating existing project
  const existingIndex = existingId 
    ? projects.findIndex(p => p.id === existingId)
    : -1
  
  const project: SavedProject = {
    id: existingId || generateProjectId(),
    name: customName || `${sanitizedSnapshot.address} 사업성검토`,
    address: sanitizedSnapshot.address,
    siteArea: sanitizedSnapshot.siteArea,
    createdAt: existingIndex >= 0 ? projects[existingIndex].createdAt : now,
    updatedAt: now,
    data: sanitizedSnapshot,
  }
  
  if (existingIndex >= 0) {
    // Update existing - preserve createdAt
    project.createdAt = projects[existingIndex].createdAt
    projects[existingIndex] = project
  } else {
    // Add new (at beginning)
    projects.unshift(project)
    
    // Keep only recent projects
    if (projects.length > MAX_RECENT_PROJECTS) {
      projects.splice(MAX_RECENT_PROJECTS)
    }
  }
  
  setStoredProjects(projects)
  return project
}

/**
 * Load a project by ID with defensive handling
 */
export function loadProject(id: string): SavedProject | null {
  if (!id) return null
  
  const projects = getStoredProjects()
  const project = projects.find(p => p.id === id)
  
  if (!project) return null
  
  // Ensure project has valid data structure
  if (!project.data) {
    console.warn(`[v0] Project ${id} has no data, returning null`)
    return null
  }
  
  // Sanitize the snapshot data before returning
  project.data = sanitizeSnapshot(project.data)
  
  return project
}

/**
 * Get all saved projects (full data)
 */
export function getAllProjects(): SavedProject[] {
  return getStoredProjects()
}

/**
 * Delete a project by ID
 */
export function deleteProject(id: string): boolean {
  const projects = getStoredProjects()
  const index = projects.findIndex(p => p.id === id)
  
  if (index >= 0) {
    projects.splice(index, 1)
    setStoredProjects(projects)
    return true
  }
  
  return false
}

/**
 * Get list of recent projects (summary only)
 */
export function getRecentProjects(): ProjectListItem[] {
  const projects = getStoredProjects()
  
  return projects.map(p => ({
    id: p.id,
    name: p.name,
    address: p.address,
    siteArea: p.siteArea,
    updatedAt: p.updatedAt,
    thumbnail: p.thumbnail,
  }))
}

/**
 * Check if any saved projects exist
 */
export function hasRecentProjects(): boolean {
  return getStoredProjects().length > 0
}

/**
 * Clear all saved projects
 */
export function clearAllProjects(): void {
  setStoredProjects([])
}

/**
 * Export project as JSON file
 */
export function exportProjectAsJson(project: SavedProject): void {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${project.name.replace(/\s/g, '_')}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Import project from JSON file
 */
export async function importProjectFromJson(file: File): Promise<SavedProject> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const project = JSON.parse(content) as SavedProject
        
        // Validate minimal required structure (relaxed for backward compatibility)
        if (!project.data) {
          throw new Error('Invalid project file: missing data field')
        }
        
        // Ensure layouts array exists (backward compatibility)
        if (!project.data.layouts) {
          project.data.layouts = []
        }
        
        // Ensure address has a fallback
        if (!project.data.address) {
          project.data.address = '주소 미지정'
        }
        
        // Assign new ID to avoid conflicts
        project.id = generateProjectId()
        project.updatedAt = new Date().toISOString()
        
        // Save to storage
        const projects = getStoredProjects()
        projects.unshift(project)
        
        if (projects.length > MAX_RECENT_PROJECTS) {
          projects.splice(MAX_RECENT_PROJECTS)
        }
        
        setStoredProjects(projects)
        resolve(project)
      } catch (error) {
        reject(new Error('Failed to parse project file'))
      }
    }
    
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

/**
 * Rename a project
 */
export function renameProject(id: string, newName: string): boolean {
  const projects = getStoredProjects()
  const project = projects.find(p => p.id === id)
  
  if (project) {
    project.name = newName
    project.updatedAt = new Date().toISOString()
    setStoredProjects(projects)
    return true
  }
  
  return false
}

/**
 * Duplicate a project with full deep copy to preserve data integrity
 */
export function duplicateProject(id: string): SavedProject | null {
  const project = loadProject(id)
  
  if (!project || !project.data) {
    console.warn(`[v0] Cannot duplicate project ${id}: not found or no data`)
    return null
  }
  
  const now = new Date().toISOString()
  
  // Deep copy the data object to avoid reference issues
  const duplicatedData = JSON.parse(JSON.stringify(project.data))
  
  const duplicate: SavedProject = {
    id: generateProjectId(),
    name: `${project.name || '이름 없음'} (복사본)`,
    address: project.address || duplicatedData.address || '',
    siteArea: project.siteArea || duplicatedData.siteArea || 0,
    createdAt: now,
    updatedAt: now,
    thumbnail: project.thumbnail,
    data: duplicatedData,
  }
  
  const projects = getStoredProjects()
  projects.unshift(duplicate)
  
  if (projects.length > MAX_RECENT_PROJECTS) {
    projects.splice(MAX_RECENT_PROJECTS)
  }
  
  setStoredProjects(projects)
  return duplicate
}
