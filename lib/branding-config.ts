/**
 * Branding Configuration Module
 * Extension module for company logo and contact branding automation
 * 
 * EXTENSION MODULE - Does not modify frozen baseline
 */

// ============================================================================
// Branding Data Types
// ============================================================================

export interface BrandingConfig {
  // Company/Brand Identity
  brandName: string
  brandTagline?: string
  
  // Contact Person
  representativeName: string
  representativeTitle?: string
  
  // Contact Information
  phone: string
  email: string
  address: string
  website?: string
  
  // Logo (optional)
  logoUrl?: string
  logoBase64?: string
  logoWidth?: number // in mm for PDF
  logoHeight?: number // in mm for PDF
}

// ============================================================================
// Default Branding Values
// ============================================================================

export const DEFAULT_BRANDING: BrandingConfig = {
  brandName: 'Archi-Scan',
  brandTagline: '건축기획 분석 시스템',
  representativeName: '김수연',
  representativeTitle: '대표',
  phone: '010-4110-6486',
  email: 'any00815@gmail.com',
  address: '서울 종로구 평창길 180-4',
  website: undefined,
  logoUrl: undefined,
  logoBase64: undefined,
  logoWidth: 25,
  logoHeight: 10,
}

// ============================================================================
// Branding Storage (localStorage)
// ============================================================================

const BRANDING_STORAGE_KEY = 'archiscan_branding_config'

export function saveBrandingConfig(config: BrandingConfig): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(config))
  } catch (error) {
    console.error('Failed to save branding config:', error)
  }
}

export function loadBrandingConfig(): BrandingConfig {
  if (typeof window === 'undefined') return DEFAULT_BRANDING
  
  try {
    const stored = localStorage.getItem(BRANDING_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<BrandingConfig>
      return { ...DEFAULT_BRANDING, ...parsed }
    }
  } catch (error) {
    console.error('Failed to load branding config:', error)
  }
  
  return DEFAULT_BRANDING
}

export function resetBrandingConfig(): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.removeItem(BRANDING_STORAGE_KEY)
  } catch (error) {
    console.error('Failed to reset branding config:', error)
  }
}

// ============================================================================
// Branding Format Helpers
// ============================================================================

/**
 * Format full brand display name with tagline
 */
export function formatBrandFullName(config: BrandingConfig): string {
  if (config.brandTagline) {
    return `${config.brandName} | ${config.brandTagline}`
  }
  return config.brandName
}

/**
 * Format contact line for footer (single line)
 */
export function formatFooterContactLine(config: BrandingConfig): string {
  const parts: string[] = []
  
  if (config.representativeName) {
    const title = config.representativeTitle || ''
    parts.push(title ? `${config.representativeName} ${title}` : config.representativeName)
  }
  
  if (config.phone) {
    parts.push(config.phone)
  }
  
  if (config.email) {
    parts.push(config.email)
  }
  
  return parts.join(' · ')
}

/**
 * Format contact block for cover page (multi-line)
 */
export function formatCoverContactBlock(config: BrandingConfig): string[] {
  const lines: string[] = []
  
  // Brand name line
  lines.push(formatBrandFullName(config))
  
  // Representative line
  if (config.representativeName) {
    const title = config.representativeTitle || ''
    lines.push(title ? `${config.representativeName} ${title}` : config.representativeName)
  }
  
  // Contact line
  const contactParts: string[] = []
  if (config.phone) contactParts.push(`Tel. ${config.phone}`)
  if (config.email) contactParts.push(config.email)
  if (contactParts.length > 0) {
    lines.push(contactParts.join(' | '))
  }
  
  // Address line
  if (config.address) {
    lines.push(config.address)
  }
  
  // Website line (optional)
  if (config.website) {
    lines.push(config.website)
  }
  
  return lines
}

// ============================================================================
// Logo Utilities
// ============================================================================

/**
 * Convert image file to base64 for PDF embedding
 */
export async function imageFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Failed to read file as base64'))
      }
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/**
 * Load logo from URL and convert to base64
 */
export async function loadLogoAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result)
        } else {
          resolve(null)
        }
      }
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

/**
 * Validate logo dimensions for PDF
 */
export function validateLogoDimensions(
  width: number,
  height: number,
  maxWidth: number = 40,
  maxHeight: number = 15
): { width: number; height: number } {
  const aspectRatio = width / height
  
  let finalWidth = width
  let finalHeight = height
  
  if (finalWidth > maxWidth) {
    finalWidth = maxWidth
    finalHeight = maxWidth / aspectRatio
  }
  
  if (finalHeight > maxHeight) {
    finalHeight = maxHeight
    finalWidth = maxHeight * aspectRatio
  }
  
  return { width: finalWidth, height: finalHeight }
}
