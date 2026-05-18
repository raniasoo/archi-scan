/**
 * 공정표/일정 자동 추정 엔진
 * 사전기획 단계에서 전체 사업 일정을 자동 산출
 */

export interface SchedulePhase {
  name: string
  duration: number   // 일수
  start: number      // 시작일 (0=착공)
  end: number        // 종료일
  category: 'design' | 'permit' | 'construction' | 'completion'
}

export interface ProjectSchedule {
  phases: SchedulePhase[]
  totalDays: number
  totalMonths: number
  designPeriod: number     // 설계 기간 (월)
  permitPeriod: number     // 인허가 기간 (월)
  constructionPeriod: number // 공사 기간 (월)
  completionPeriod: number   // 준공 기간 (월)
}

export function estimateSchedule(params: {
  floors: number
  siteArea: number
  type: string
  gfa?: number
}): ProjectSchedule {
  const { floors, siteArea, type } = params
  const gfa = params.gfa || siteArea * (floors <= 5 ? 0.5 : 0.6) * floors
  const isLarge = gfa > 3000 || floors > 10
  const isMedium = gfa > 1000 || floors > 5

  const phases: SchedulePhase[] = []
  let day = 0

  const add = (name: string, months: number, cat: SchedulePhase['category']) => {
    const dur = Math.round(months * 30)
    phases.push({ name, duration: dur, start: day, end: day + dur, category: cat })
    day += dur
  }

  // 설계 단계
  add('사전기획/타당성', isLarge ? 1.5 : 1, 'design')
  add('기본설계', isLarge ? 2.5 : isMedium ? 2 : 1.5, 'design')
  add('실시설계', isLarge ? 3 : isMedium ? 2.5 : 2, 'design')

  // 인허가
  add('건축허가 신청/접수', 0.5, 'permit')
  add('건축허가 심의', isLarge ? 2 : 1.5, 'permit')
  add('착공신고', 0.5, 'permit')

  // 공사
  add('가설/토공사', isLarge ? 1.5 : 1, 'construction')
  add('기초공사', isLarge ? 2 : 1.5, 'construction')
  add('골조공사', Math.max(floors * (isLarge ? 0.7 : 0.5), 2), 'construction')
  add('방수/단열', isLarge ? 1.5 : 1, 'construction')
  add('설비(MEP)', isLarge ? 3 : isMedium ? 2 : 1.5, 'construction')
  add('마감공사', isLarge ? 4 : isMedium ? 3 : 2, 'construction')
  add('조경/외구', 1, 'construction')

  // 준공
  add('사용승인 검사', 1, 'completion')
  add('하자보수/입주', 1, 'completion')

  const byCategory = (cat: SchedulePhase['category']) =>
    Math.round(phases.filter(p => p.category === cat).reduce((s, p) => s + p.duration, 0) / 30 * 10) / 10

  return {
    phases,
    totalDays: day,
    totalMonths: Math.round(day / 30 * 10) / 10,
    designPeriod: byCategory('design'),
    permitPeriod: byCategory('permit'),
    constructionPeriod: byCategory('construction'),
    completionPeriod: byCategory('completion'),
  }
}
