/**
 * Korean Address Parser
 * @version STABLE-v194 | Phase 1 Integration
 * 
 * Parses Korean addresses (road-name and jibun formats) for API lookups
 */

import type { ParsedAddress } from '@/types/molit'

/**
 * Common Korean administrative unit suffixes
 */
const SIDO_SUFFIXES = ['특별시', '광역시', '특별자치시', '특별자치도', '도']
const SIGUNGU_SUFFIXES = ['시', '군', '구']
const EUPMYEONDONG_SUFFIXES = ['읍', '면', '동', '가', '리']

/**
 * Normalize sido names to canonical form
 * e.g., "서울시" -> "서울특별시", "서울" -> "서울특별시"
 */
const SIDO_ALIASES: Record<string, string> = {
  '서울': '서울특별시',
  '서울시': '서울특별시',
  '서울특별시': '서울특별시',
  '부산': '부산광역시',
  '부산시': '부산광역시',
  '부산광역시': '부산광역시',
  '대구': '대구광역시',
  '대구시': '대구광역시',
  '대구광역시': '대구광역시',
  '인천': '인천광역시',
  '인천시': '인천광역시',
  '인천광역시': '인천광역시',
  '광주': '광주광역시',
  '광주시': '광주광역시',
  '광주광역시': '광주광역시',
  '대전': '대전광역시',
  '대전시': '대전광역시',
  '대전광역시': '대전광역시',
  '울산': '울산광역시',
  '울산시': '울산광역시',
  '울산광역시': '울산광역시',
  '세종': '세종특별자치시',
  '세종시': '세종특별자치시',
  '세종특별자치시': '세종특별자치시',
  '경기': '경기도',
  '경기도': '경기도',
  '강원': '강원도',
  '강원도': '강원도',
  '충북': '충청북도',
  '충청북도': '충청북도',
  '충남': '충청남도',
  '충청남도': '충청남도',
  '전북': '전라북도',
  '전라북도': '전라북도',
  '전남': '전라남도',
  '전라남도': '전라남도',
  '경북': '경상북도',
  '경상북도': '경상북도',
  '경남': '경상남도',
  '경상남도': '경상남도',
  '제주': '제주특별자치도',
  '제주도': '제주특별자치도',
  '제주특별자치도': '제주특별자치도',
}

/**
 * Normalize sido name to canonical form
 */
export function normalizeSido(sido: string): string {
  // First check direct alias match
  const direct = SIDO_ALIASES[sido]
  if (direct) return direct
  
  // Try to extract base name and look up
  for (const suffix of SIDO_SUFFIXES) {
    if (sido.endsWith(suffix)) {
      const base = sido.replace(suffix, '')
      const aliasKey = base
      if (SIDO_ALIASES[aliasKey]) {
        return SIDO_ALIASES[aliasKey]
      }
    }
  }
  
  return sido
}

/**
 * Detect address type (road-name vs jibun)
 */
export function detectAddressType(address: string): 'road' | 'jibun' | 'unknown' {
  if (!address || address.trim().length === 0) {
    return 'unknown'
  }
  
  const trimmed = address.trim()
  
  // Road address patterns: contains "로" or "길" followed by number
  // e.g., "테헤란로 123", "강남대로 456길 78"
  if (/[로길]\s*\d+/.test(trimmed) || /\d+[로길]/.test(trimmed)) {
    return 'road'
  }
  
  // Jibun address patterns: contains "번지" or number-number pattern after dong
  // e.g., "역삼동 123-45", "역삼동 123번지"
  if (/번지/.test(trimmed) || /[동리]\s*\d+(-\d+)?$/.test(trimmed)) {
    return 'jibun'
  }
  
  // Check for mountain land (산)
  if (/산\s*\d+/.test(trimmed)) {
    return 'jibun'
  }
  
  return 'unknown'
}

/**
 * Parse Korean address into components
 */
export function parseAddress(address: string): ParsedAddress {
  if (!address || address.trim().length === 0) {
    return { type: 'unknown' }
  }
  
  const trimmed = address.trim()
  const type = detectAddressType(trimmed)
  
  const result: ParsedAddress = { type }
  
  // Split by spaces and common delimiters
  const parts = trimmed.split(/[\s,]+/).filter(Boolean)
  
  let currentIndex = 0
  
  // Extract sido (시/도) - handle both "서울특별시" and "서울시" and "서울"
  for (const suffix of SIDO_SUFFIXES) {
    const sidoIndex = parts.findIndex(p => p.endsWith(suffix))
    if (sidoIndex !== -1 && sidoIndex <= 1) {
      const rawSido = parts.slice(0, sidoIndex + 1).join(' ')
      result.sido = normalizeSido(rawSido)
      currentIndex = sidoIndex + 1
      break
    }
  }
  
  // If no suffix found, check if first part is a known sido alias (e.g., "서울", "경기")
  if (!result.sido && parts.length > 0) {
    const normalized = normalizeSido(parts[0])
    if (normalized !== parts[0]) {
      result.sido = normalized
      currentIndex = 1
    }
  }
  
  // Extract sigungu (시/군/구)
  for (let i = currentIndex; i < Math.min(currentIndex + 3, parts.length); i++) {
    for (const suffix of SIGUNGU_SUFFIXES) {
      if (parts[i].endsWith(suffix) && parts[i].length > 1) {
        result.sigungu = parts[i]
        currentIndex = i + 1
        break
      }
    }
    if (result.sigungu) break
  }
  
  // For road addresses, extract road name and building number directly
  if (type === 'road') {
    // Parse road address - look for 로/길 pattern
    parseRoadAddress(parts, currentIndex, result)
  } else {
    // Extract eupmyeondong (읍/면/동) for jibun addresses
    for (let i = currentIndex; i < Math.min(currentIndex + 2, parts.length); i++) {
      const part = parts[i]
      if (part.endsWith('동') || part.endsWith('읍') || part.endsWith('면') || part.endsWith('리')) {
        result.eupmyeondong = part
        currentIndex = i + 1
        break
      }
    }
    // Parse jibun address
    parseJibunAddress(parts, currentIndex, result)
  }
  
  // Extract building name (in parentheses)
  const buildingMatch = trimmed.match(/\(([^)]+)\)/)
  if (buildingMatch) {
    const buildingParts = buildingMatch[1].split(',').map(s => s.trim())
    if (buildingParts.length > 0) {
      result.buildingName = buildingParts[0]
    }
  }
  
  return result
}

/**
 * Parse road address specific parts
 */
function parseRoadAddress(parts: string[], startIndex: number, result: ParsedAddress): void {
  const remaining = parts.slice(startIndex).join(' ')
  
  // Find road name (ends with 로 or 길)
  const roadMatch = remaining.match(/([가-힣]+(?:대로|로|길))/)
  if (roadMatch) {
    result.roadName = roadMatch[1]
  }
  
  // Find building number (after road name)
  const buildingNumMatch = remaining.match(/(?:로|길)\s*(\d+)(?:-(\d+))?/)
  if (buildingNumMatch) {
    result.buildingMainNumber = parseInt(buildingNumMatch[1], 10)
    if (buildingNumMatch[2]) {
      result.buildingSubNumber = parseInt(buildingNumMatch[2], 10)
    }
  }
  
  // Check for basement
  result.isBasement = remaining.includes('지하')
}

/**
 * Parse jibun address specific parts
 */
function parseJibunAddress(parts: string[], startIndex: number, result: ParsedAddress): void {
  const remaining = parts.slice(startIndex).join(' ')
  
  // Check for mountain land
  result.isMountain = remaining.includes('산')
  
  // Find jibun numbers (e.g., "123-45" or "123번지" or "산 123")
  const jibunMatch = remaining.match(/(?:산\s*)?(\d+)(?:-(\d+))?(?:번지)?/)
  if (jibunMatch) {
    result.jibunMain = parseInt(jibunMatch[1], 10)
    if (jibunMatch[2]) {
      result.jibunSub = parseInt(jibunMatch[2], 10)
    }
  }
}

/**
 * Format parsed address back to string
 */
export function formatParsedAddress(parsed: ParsedAddress): string {
  const parts: string[] = []
  
  if (parsed.sido) parts.push(parsed.sido)
  if (parsed.sigungu) parts.push(parsed.sigungu)
  if (parsed.eupmyeondong) parts.push(parsed.eupmyeondong)
  
  if (parsed.type === 'road') {
    if (parsed.roadName) parts.push(parsed.roadName)
    if (parsed.buildingMainNumber !== undefined) {
      let num = parsed.buildingMainNumber.toString()
      if (parsed.buildingSubNumber !== undefined) {
        num += `-${parsed.buildingSubNumber}`
      }
      parts.push(num)
    }
  } else if (parsed.type === 'jibun') {
    if (parsed.isMountain) parts.push('산')
    if (parsed.jibunMain !== undefined) {
      let jibun = parsed.jibunMain.toString()
      if (parsed.jibunSub !== undefined) {
        jibun += `-${parsed.jibunSub}`
      }
      parts.push(jibun)
    }
  }
  
  if (parsed.buildingName) {
    parts.push(`(${parsed.buildingName})`)
  }
  
  return parts.join(' ')
}

/**
 * Extract sigungu code from address (approximate)
 * Note: Actual codes should come from API lookup
 */
export function extractSigunguHint(address: string): { sido?: string; sigungu?: string } {
  const parsed = parseAddress(address)
  return {
    sido: parsed.sido,
    sigungu: parsed.sigungu,
  }
}

/**
 * Normalize address for API lookup
 */
export function normalizeAddress(address: string): string {
  return address
    .trim()
    .replace(/\s+/g, ' ')           // Multiple spaces to single
    .replace(/,\s*/g, ' ')          // Commas to spaces
    .replace(/\([^)]*\)/g, '')      // Remove complete parenthetical (평창동, 삼호빌라)
    .replace(/\([^)]*$/g, '')       // Remove unclosed parenthetical (평창동
    .replace(/\s*번지\s*/g, ' ')    // Remove 번지
    .trim()
}
