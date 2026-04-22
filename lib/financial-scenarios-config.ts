/**
 * Financial Scenarios Configuration Module
 * 
 * Extension module for financial scenario comparison.
 * Provides scenario presets, calculation logic, and data model.
 * Does not modify the frozen baseline report structure.
 */

// ============================================================================
// Data Model
// ============================================================================

export interface ScenarioAdjustments {
  salePriceChange: number      // % change (-20 to +20)
  constructionCostChange: number // % change (-20 to +20)
  landCostChange: number       // % change (-20 to +20)
  otherCostChange: number      // % change (-20 to +20)
}

export interface ScenarioResult {
  name: string
  adjustments: ScenarioAdjustments
  landCost: number
  constructionCost: number
  otherCost: number
  totalCost: number
  totalRevenue: number
  profit: number
  roi: number
  breakEvenRate: number
}

export interface FinancialScenariosConfig {
  enabled: boolean
  scenarios: ScenarioResult[]
  baseValues: {
    landCost: number
    constructionCost: number
    otherCost: number
    totalCost: number
    totalRevenue: number
    profit: number
    roi: number
  }
}

// ============================================================================
// Preset Scenarios
// ============================================================================

export const SCENARIO_PRESETS: Record<string, { name: string; adjustments: ScenarioAdjustments }> = {
  base: {
    name: '기준 시나리오',
    adjustments: {
      salePriceChange: 0,
      constructionCostChange: 0,
      landCostChange: 0,
      otherCostChange: 0,
    },
  },
  conservative: {
    name: '보수적 시나리오',
    adjustments: {
      salePriceChange: -10,
      constructionCostChange: 10,
      landCostChange: 5,
      otherCostChange: 10,
    },
  },
  optimistic: {
    name: '낙관적 시나리오',
    adjustments: {
      salePriceChange: 10,
      constructionCostChange: -5,
      landCostChange: 0,
      otherCostChange: -5,
    },
  },
  worstCase: {
    name: '최악 시나리오',
    adjustments: {
      salePriceChange: -15,
      constructionCostChange: 15,
      landCostChange: 10,
      otherCostChange: 15,
    },
  },
  bestCase: {
    name: '최선 시나리오',
    adjustments: {
      salePriceChange: 15,
      constructionCostChange: -10,
      landCostChange: -5,
      otherCostChange: -10,
    },
  },
}

// Default adjustments for custom scenarios
export const DEFAULT_ADJUSTMENTS: ScenarioAdjustments = {
  salePriceChange: 0,
  constructionCostChange: 0,
  landCostChange: 0,
  otherCostChange: 0,
}

// ============================================================================
// Empty Config (default state)
// ============================================================================

export const EMPTY_SCENARIOS_CONFIG: FinancialScenariosConfig = {
  enabled: false,
  scenarios: [],
  baseValues: {
    landCost: 0,
    constructionCost: 0,
    otherCost: 0,
    totalCost: 0,
    totalRevenue: 0,
    profit: 0,
    roi: 0,
  },
}

// ============================================================================
// Calculation Functions
// ============================================================================

export interface BaseFinancials {
  landCost: number
  constructionCost: number
  softCost: number
  totalInvestment: number
  projectedRevenue: number
  profit: number
  roi: number
  breakEvenRate: number
}

/**
 * Calculate scenario result based on base financials and adjustments
 * 
 * For 기준 시나리오 (all adjustments = 0), values MUST exactly match baseFinancials
 */
export function calculateScenario(
  name: string,
  baseFinancials: BaseFinancials,
  adjustments: ScenarioAdjustments
): ScenarioResult {
  // Check if this is the baseline scenario (all adjustments are 0)
  const isBaseline = 
    adjustments.salePriceChange === 0 &&
    adjustments.constructionCostChange === 0 &&
    adjustments.landCostChange === 0 &&
    adjustments.otherCostChange === 0
  
  if (isBaseline) {
    // For baseline, use exact values from baseFinancials to ensure consistency
    return {
      name,
      adjustments,
      landCost: baseFinancials.landCost,
      constructionCost: baseFinancials.constructionCost,
      otherCost: baseFinancials.softCost,
      totalCost: baseFinancials.totalInvestment,
      totalRevenue: baseFinancials.projectedRevenue,
      profit: baseFinancials.profit,
      roi: baseFinancials.roi,
      breakEvenRate: baseFinancials.breakEvenRate,
    }
  }
  
  // For non-baseline scenarios, apply percentage adjustments
  const landCost = baseFinancials.landCost * (1 + adjustments.landCostChange / 100)
  const constructionCost = baseFinancials.constructionCost * (1 + adjustments.constructionCostChange / 100)
  const otherCost = baseFinancials.softCost * (1 + adjustments.otherCostChange / 100)
  
  // Calculate totalCost based on the ratio of base components to totalInvestment
  // This preserves any additional costs included in totalInvestment
  const baseComponentSum = baseFinancials.landCost + baseFinancials.constructionCost + baseFinancials.softCost
  const adjustedComponentSum = landCost + constructionCost + otherCost
  
  // Apply the same ratio of adjustment to totalInvestment
  const costRatio = baseComponentSum > 0 ? adjustedComponentSum / baseComponentSum : 1
  const totalCost = baseFinancials.totalInvestment * costRatio
  
  const totalRevenue = baseFinancials.projectedRevenue * (1 + adjustments.salePriceChange / 100)
  
  const profit = totalRevenue - totalCost
  const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0
  const breakEvenRate = totalRevenue > 0 ? (totalCost / totalRevenue) * 100 : 100
  
  return {
    name,
    adjustments,
    landCost,
    constructionCost,
    otherCost,
    totalCost,
    totalRevenue,
    profit,
    roi,
    breakEvenRate,
  }
}

/**
 * Generate default scenarios (base, conservative, optimistic)
 */
export function generateDefaultScenarios(baseFinancials: BaseFinancials): ScenarioResult[] {
  return [
    calculateScenario(SCENARIO_PRESETS.base.name, baseFinancials, SCENARIO_PRESETS.base.adjustments),
    calculateScenario(SCENARIO_PRESETS.conservative.name, baseFinancials, SCENARIO_PRESETS.conservative.adjustments),
    calculateScenario(SCENARIO_PRESETS.optimistic.name, baseFinancials, SCENARIO_PRESETS.optimistic.adjustments),
  ]
}

/**
 * Generate all available scenarios
 */
export function generateAllScenarios(baseFinancials: BaseFinancials): ScenarioResult[] {
  return Object.values(SCENARIO_PRESETS).map(preset =>
    calculateScenario(preset.name, baseFinancials, preset.adjustments)
  )
}

/**
 * Create config from base financials
 */
export function createScenariosConfig(
  baseFinancials: BaseFinancials,
  enabled: boolean = true,
  includeAllScenarios: boolean = false
): FinancialScenariosConfig {
  return {
    enabled,
    scenarios: includeAllScenarios 
      ? generateAllScenarios(baseFinancials)
      : generateDefaultScenarios(baseFinancials),
    baseValues: {
      landCost: baseFinancials.landCost,
      constructionCost: baseFinancials.constructionCost,
      otherCost: baseFinancials.softCost,
      totalCost: baseFinancials.totalInvestment,
      totalRevenue: baseFinancials.projectedRevenue,
      profit: baseFinancials.profit,
      roi: baseFinancials.roi,
    },
  }
}

// ============================================================================
// Validation and Helper Functions
// ============================================================================

/**
 * Check if scenarios are available
 */
export function hasScenarios(config: FinancialScenariosConfig | undefined): boolean {
  return !!config && config.enabled && config.scenarios.length > 0
}

/**
 * Format percentage with sign
 */
export function formatPercentageChange(value: number): string {
  if (value === 0) return '±0%'
  return value > 0 ? `+${value}%` : `${value}%`
}

/**
 * Get scenario summary for display
 */
export function getScenarioSummary(scenario: ScenarioResult): string {
  const parts: string[] = []
  if (scenario.adjustments.salePriceChange !== 0) {
    parts.push(`분양가 ${formatPercentageChange(scenario.adjustments.salePriceChange)}`)
  }
  if (scenario.adjustments.constructionCostChange !== 0) {
    parts.push(`공사비 ${formatPercentageChange(scenario.adjustments.constructionCostChange)}`)
  }
  if (scenario.adjustments.landCostChange !== 0) {
    parts.push(`토지비 ${formatPercentageChange(scenario.adjustments.landCostChange)}`)
  }
  if (scenario.adjustments.otherCostChange !== 0) {
    parts.push(`기타 ${formatPercentageChange(scenario.adjustments.otherCostChange)}`)
  }
  return parts.length > 0 ? parts.join(', ') : '기준값 적용'
}

/**
 * Get ROI status color class
 */
export function getROIStatusClass(roi: number): {
  bgClass: string
  textClass: string
  status: string
} {
  if (roi > 20) {
    return {
      bgClass: 'bg-green-100 dark:bg-green-900/30',
      textClass: 'text-green-700 dark:text-green-400',
      status: '양호',
    }
  } else if (roi > 12) {
    return {
      bgClass: 'bg-blue-100 dark:bg-blue-900/30',
      textClass: 'text-blue-700 dark:text-blue-400',
      status: '적정',
    }
  } else if (roi > 5) {
    return {
      bgClass: 'bg-amber-100 dark:bg-amber-900/30',
      textClass: 'text-amber-700 dark:text-amber-400',
      status: '주의',
    }
  } else {
    return {
      bgClass: 'bg-red-100 dark:bg-red-900/30',
      textClass: 'text-red-700 dark:text-red-400',
      status: '위험',
    }
  }
}

// ============================================================================
// Storage Functions (for project save/load compatibility)
// ============================================================================

const SCENARIOS_STORAGE_KEY = 'archi-scan-scenarios-config'

export function saveScenariosConfig(config: FinancialScenariosConfig): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(SCENARIOS_STORAGE_KEY, JSON.stringify(config))
  } catch (e) {
    console.warn('Failed to save scenarios config:', e)
  }
}

export function loadScenariosConfig(): FinancialScenariosConfig | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(SCENARIOS_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.warn('Failed to load scenarios config:', e)
  }
  return null
}

export function clearScenariosConfig(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(SCENARIOS_STORAGE_KEY)
  } catch (e) {
    console.warn('Failed to clear scenarios config:', e)
  }
}
