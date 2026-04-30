/**
 * Subscription Plans & Usage Management
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
    maxReports: 5,
    features: [
      '월 5건 보고서 생성',
      '기본 배치안 4종',
      'HTML 보고서 다운로드',
      '국토부 자동조회',
    ],
  },
  pro: {
    tier: 'pro',
    name: '프로',
    nameEn: 'Pro',
    price: 29900,
    priceLabel: '₩29,900/월',
    maxProjects: 50,
    maxReports: -1, // 무제한
    recommended: true,
    features: [
      '무제한 보고서 생성',
      'AI 배치안 최적화',
      'PDF + Excel 다운로드',
      '클라우드 프로젝트 저장',
      '실거래가 트렌드 분석',
      '민감도 분석 차트',
      '다국어 보고서 (영문)',
      '우선 지원',
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
    features: [
      '프로 플랜 전체 기능',
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
