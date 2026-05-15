/**
 * Subscription Plans & Usage Management
 * 렌더링 횟수 제한 포함 (Gemini / ControlNet)
 */

export type PlanTier = 'free' | 'pro' | 'enterprise'

export interface Plan {
  tier: PlanTier
  name: string
  nameEn: string
  price: number // 월 원화
  priceLabel: string
  maxProjects: number
  maxReports: number
  // ★ 렌더링 횟수 제한 (월간, -1 = 무제한)
  maxGeminiRenders: number
  maxControlNetRenders: number
  features: string[]
  recommended?: boolean
}

export const PLANS: Record<PlanTier, Plan> = {
  free: {
    tier: 'free',
    name: '무료',
    nameEn: 'Free',
    price: 0,
    priceLabel: '₩0',
    maxProjects: 3,
    maxReports: 10,
    maxGeminiRenders: 5,
    maxControlNetRenders: 3,
    features: [
      '월 5회 사업성 분석',
      '기본 배치안 4종',
      'HTML 보고서',
      '국토부 자동조회',
      'Gemini 렌더링 월 5회',
      'ControlNet 렌더링 월 3회',
    ],
  },
  pro: {
    tier: 'pro',
    name: '프로',
    nameEn: 'Pro',
    price: 29000,
    priceLabel: '₩29,000/월',
    maxProjects: -1,
    maxReports: -1,
    maxGeminiRenders: 20,
    maxControlNetRenders: 10,
    recommended: true,
    features: [
      '무제한 사업성 분석',
      'AI 배치안 최적화',
      'PDF + Excel 보고서',
      'Gemini 렌더링 월 20회',
      'ControlNet 정밀 렌더링 월 10회',
      '실거래가 트렌드 분석',
      '클라우드 프로젝트 저장',
      '우선 기술지원',
    ],
  },
  enterprise: {
    tier: 'enterprise',
    name: '엔터프라이즈',
    nameEn: 'Enterprise',
    price: 0,
    priceLabel: '별도 문의',
    maxProjects: -1,
    maxReports: -1,
    maxGeminiRenders: -1,
    maxControlNetRenders: 50,
    features: [
      '프로 플랜 전체 기능',
      'Gemini 렌더링 무제한',
      'ControlNet 정밀 렌더링 월 50회',
      '팀 공유 및 권한 관리',
      '커스텀 브랜딩',
      '전용 기술 지원',
      'API 연동',
      'SLA 보장',
    ],
  },
}

export function getPlan(tier: PlanTier): Plan {
  return PLANS[tier] || PLANS.free
}

export function canCreateReport(tier: PlanTier, currentCount: number): boolean {
  const plan = getPlan(tier)
  if (plan.maxReports === -1) return true
  return currentCount < plan.maxReports
}

export function canCreateProject(tier: PlanTier, currentCount: number): boolean {
  const plan = getPlan(tier)
  if (plan.maxProjects === -1) return true
  return currentCount < plan.maxProjects
}

export function getUsagePercent(tier: PlanTier, currentCount: number): number {
  const plan = getPlan(tier)
  if (plan.maxReports === -1) return 0
  return Math.min(100, Math.round((currentCount / plan.maxReports) * 100))
}

// ★ 렌더링 횟수 체크
export function canUseGeminiRender(tier: PlanTier, currentCount: number): boolean {
  const plan = getPlan(tier)
  if (plan.maxGeminiRenders === -1) return true
  return currentCount < plan.maxGeminiRenders
}

export function canUseControlNetRender(tier: PlanTier, currentCount: number): boolean {
  const plan = getPlan(tier)
  if (plan.maxControlNetRenders === -1) return true
  return currentCount < plan.maxControlNetRenders
}

export function getRenderLimits(tier: PlanTier): { gemini: number; controlNet: number } {
  const plan = getPlan(tier)
  return { gemini: plan.maxGeminiRenders, controlNet: plan.maxControlNetRenders }
}

export function getRenderUsageLabel(limit: number, used: number): string {
  if (limit === -1) return `${used}회 사용 (무제한)`
  return `${used}/${limit}회`
}
