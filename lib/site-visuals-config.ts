/**
 * Site Visuals Configuration Module
 * 
 * Extension module for site map and site photo insertion.
 * Does NOT modify the frozen report baseline - integrates via props only.
 * 
 * Supports:
 * - Site location map image
 * - Up to 3 site photos with captions
 * - Optional caption text for each image
 * - Backward compatible with existing data models
 */

// ============================================================================
// Types
// ============================================================================

export interface SiteImage {
  /** Image data URL (base64) or external URL */
  url: string
  /** Optional caption text */
  caption?: string
  /** Original filename if uploaded */
  filename?: string
  /** Upload timestamp */
  uploadedAt?: string
}

export interface SiteVisualsConfig {
  /** Site location map image */
  siteMap?: SiteImage
  /** Site photos (up to 3) */
  sitePhotos: SiteImage[]
}

// ============================================================================
// Defaults
// ============================================================================

export const EMPTY_SITE_VISUALS: SiteVisualsConfig = {
  siteMap: undefined,
  sitePhotos: [],
}

// ============================================================================
// Storage Keys
// ============================================================================

const SITE_VISUALS_STORAGE_KEY = 'archi-scan-site-visuals'

// ============================================================================
// Validation
// ============================================================================

export function isValidImageUrl(url: string): boolean {
  if (!url) return false
  // Accept data URLs (base64)
  if (url.startsWith('data:image/')) return true
  // Accept http/https URLs
  if (url.startsWith('http://') || url.startsWith('https://')) return true
  // Accept blob URLs
  if (url.startsWith('blob:')) return true
  return false
}

export function validateSiteVisuals(visuals: Partial<SiteVisualsConfig>): SiteVisualsConfig {
  const result: SiteVisualsConfig = {
    sitePhotos: [],
  }
  
  // Validate site map
  if (visuals.siteMap && isValidImageUrl(visuals.siteMap.url)) {
    result.siteMap = {
      url: visuals.siteMap.url,
      caption: visuals.siteMap.caption || '',
      filename: visuals.siteMap.filename,
      uploadedAt: visuals.siteMap.uploadedAt || new Date().toISOString(),
    }
  }
  
  // Validate site photos (max 3)
  if (visuals.sitePhotos && Array.isArray(visuals.sitePhotos)) {
    result.sitePhotos = visuals.sitePhotos
      .filter(photo => photo && isValidImageUrl(photo.url))
      .slice(0, 3)
      .map(photo => ({
        url: photo.url,
        caption: photo.caption || '',
        filename: photo.filename,
        uploadedAt: photo.uploadedAt || new Date().toISOString(),
      }))
  }
  
  return result
}

// ============================================================================
// Local Storage
// ============================================================================

export function saveSiteVisualsToStorage(visuals: SiteVisualsConfig): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(SITE_VISUALS_STORAGE_KEY, JSON.stringify(visuals))
  } catch (error) {
    console.error('Failed to save site visuals to storage:', error)
  }
}

export function loadSiteVisualsFromStorage(): SiteVisualsConfig {
  if (typeof window === 'undefined') return EMPTY_SITE_VISUALS
  try {
    const stored = localStorage.getItem(SITE_VISUALS_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return validateSiteVisuals(parsed)
    }
  } catch (error) {
    console.error('Failed to load site visuals from storage:', error)
  }
  return EMPTY_SITE_VISUALS
}

export function clearSiteVisualsFromStorage(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(SITE_VISUALS_STORAGE_KEY)
  } catch (error) {
    console.error('Failed to clear site visuals from storage:', error)
  }
}

// ============================================================================
// Image Processing
// ============================================================================

/**
 * Convert a File to a base64 data URL
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Resize an image to fit within max dimensions while preserving aspect ratio
 */
export async function resizeImage(
  dataUrl: string,
  maxWidth: number = 800,
  maxHeight: number = 600,
  quality: number = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      let width = img.width
      let height = img.height
      
      // Calculate new dimensions
      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }
      if (height > maxHeight) {
        width = (width * maxHeight) / height
        height = maxHeight
      }
      
      // Create canvas and draw resized image
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }
      ctx.drawImage(img, 0, 0, width, height)
      
      // Convert to data URL
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = dataUrl
  })
}

/**
 * Process an uploaded image file
 */
export async function processUploadedImage(
  file: File,
  maxWidth: number = 800,
  maxHeight: number = 600
): Promise<SiteImage> {
  const dataUrl = await fileToDataUrl(file)
  const resizedUrl = await resizeImage(dataUrl, maxWidth, maxHeight)
  
  return {
    url: resizedUrl,
    filename: file.name,
    uploadedAt: new Date().toISOString(),
  }
}

// ============================================================================
// Merge with Project Snapshot (Backward Compatibility)
// ============================================================================

export interface ProjectSnapshotWithVisuals {
  siteVisuals?: SiteVisualsConfig
  [key: string]: unknown
}

/**
 * Extract site visuals from a project snapshot (returns empty if not present)
 */
export function extractSiteVisuals(snapshot: ProjectSnapshotWithVisuals): SiteVisualsConfig {
  if (snapshot.siteVisuals) {
    return validateSiteVisuals(snapshot.siteVisuals)
  }
  return EMPTY_SITE_VISUALS
}

/**
 * Merge site visuals into a project snapshot
 */
export function mergeSiteVisuals<T extends ProjectSnapshotWithVisuals>(
  snapshot: T,
  visuals: SiteVisualsConfig
): T {
  return {
    ...snapshot,
    siteVisuals: visuals,
  }
}

// ============================================================================
// Check if visuals exist
// ============================================================================

export function hasAnyVisuals(visuals: SiteVisualsConfig | undefined): boolean {
  if (!visuals) return false
  return !!(visuals.siteMap?.url || (visuals.sitePhotos && visuals.sitePhotos.length > 0))
}

export function hasSiteMap(visuals: SiteVisualsConfig | undefined): boolean {
  return !!(visuals?.siteMap?.url)
}

export function hasSitePhotos(visuals: SiteVisualsConfig | undefined): boolean {
  return !!(visuals?.sitePhotos && visuals.sitePhotos.length > 0)
}
