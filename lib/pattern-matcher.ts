// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 알렉산더 253패턴 자동 매칭 엔진
// Supabase DB에서 프로젝트 조건에 맞는 패턴을 자동 선별
// → AI 렌더링 프롬프트에 주입
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export interface ProjectConditions {
  type: string          // tower / courtyard / lshape / linear / cluster
  floors: number
  units: number
  siteArea: number
  coverage: number
  zone?: string         // 용도지역
  strategy?: string     // quality / parking-efficient 등
  userPatterns?: string[] // 사용자가 직접 선택한 패턴
}

export interface MatchedPattern {
  id: number
  name_en: string
  name_kr: string
  scale: string
  render_prompt: string | null
  korea_relevance: number
  related_properties: string[]
  match_reason: string  // 왜 선택되었는지
}

export interface PatternMatchResult {
  total: number              // 253
  matched: number            // 매칭된 수
  patterns: MatchedPattern[]
  renderPrompts: string[]    // AI 렌더링에 바로 사용 가능한 프롬프트 목록
  propertyScores: Record<string, number>  // 15속성별 관련 패턴 수
  summary: string            // 한줄 요약
}

/**
 * 프로젝트 조건에 맞는 알렉산더 패턴을 자동 선별합니다.
 * Supabase에서 253개를 조회하고 조건 필터링을 적용합니다.
 */
export async function matchPatterns(conditions: ProjectConditions): Promise<PatternMatchResult> {
  const { type, floors, units, siteArea, coverage, zone, strategy, userPatterns = [] } = conditions
  const openSpace = 100 - coverage

  // Supabase에서 전체 패턴 조회
  const { data: allPatterns, error } = await supabase
    .from('alexander_patterns')
    .select('id, name_en, name_kr, scale, category, render_prompt, korea_relevance, applicable_types, min_floors, max_floors, min_site_area, related_properties')
    .order('korea_relevance', { ascending: false })

  if (error || !allPatterns) {
    console.error('[PATTERN-MATCHER] DB error:', error)
    return { total: 253, matched: 0, patterns: [], renderPrompts: [], propertyScores: {}, summary: 'DB 연결 실패' }
  }

  const matched: MatchedPattern[] = []

  for (const p of allPatterns) {
    let matchReason = ''

    // 1. 한국 관련도 0.4 미만은 제외
    if (p.korea_relevance < 0.4) continue

    // 2. 층수 조건
    if (p.min_floors && floors < p.min_floors) continue
    if (p.max_floors && floors > p.max_floors) continue

    // 3. 대지면적 조건
    if (p.min_site_area && siteArea < p.min_site_area) continue

    // 4. 배치안 타입 매칭
    const types = p.applicable_types || []
    if (types.length > 0 && !types.includes(type)) {
      // 타입이 지정되어 있지만 현재 타입이 없으면 건너뜀
      // 단, 관련도가 0.8 이상이면 포함 (범용 패턴)
      if (p.korea_relevance < 0.8) continue
      matchReason = '범용 고관련 패턴'
    } else if (types.length > 0 && types.includes(type)) {
      matchReason = `${type}형 전용 패턴`
    }

    // 5. 스케일별 추가 필터
    if (p.scale === 'town') {
      // 도시 패턴: 관련도 0.5 이상만
      if (p.korea_relevance < 0.5) continue
      if (!matchReason) matchReason = '도시/맥락 패턴'
    }
    if (p.scale === 'building') {
      if (!matchReason) matchReason = '건물 설계 패턴'
    }
    if (p.scale === 'construction') {
      if (!matchReason) matchReason = '시공/재질 패턴'
    }

    // 6. 조건별 보너스 매칭
    if (p.category === '조경' && openSpace > 35) matchReason = `여유공간 ${openSpace}% → 조경 패턴`
    if (p.category === '입구' && (type === 'courtyard' || type === 'lshape')) matchReason = '중정/ㄱ자 입구 패턴'
    if (p.category === '채광' && floors <= 5) matchReason = '저층 채광 패턴'
    if (p.category === '커뮤니티' && units >= 10) matchReason = '다세대 커뮤니티 패턴'

    if (!matchReason) matchReason = `관련도 ${p.korea_relevance}`

    matched.push({
      id: p.id,
      name_en: p.name_en,
      name_kr: p.name_kr,
      scale: p.scale,
      render_prompt: p.render_prompt,
      korea_relevance: p.korea_relevance,
      related_properties: p.related_properties || [],
      match_reason: matchReason,
    })
  }

  // 렌더링 프롬프트 추출 (null이 아닌 것만)
  const renderPrompts = matched
    .filter(p => p.render_prompt)
    .sort((a, b) => b.korea_relevance - a.korea_relevance)
    .map(p => p.render_prompt!)

  // 15속성별 관련 패턴 수 집계
  const propertyScores: Record<string, number> = {}
  const PROPS = ['Levels of Scale','Strong Centers','Boundaries','Alternating Repetition',
    'Positive Space','Good Shape','Local Symmetries','Deep Interlock and Ambiguity',
    'Contrast','Gradients','Roughness','Echoes','The Void',
    'Simplicity and Inner Calm','Not-Separateness']
  for (const prop of PROPS) propertyScores[prop] = 0
  for (const p of matched) {
    for (const prop of (p.related_properties || [])) {
      if (prop in propertyScores) propertyScores[prop]++
      // 축약형도 매칭
      const full = PROPS.find(fp => fp.startsWith(prop))
      if (full && full in propertyScores) propertyScores[full]++
    }
  }

  const typeKR: Record<string,string> = { tower:'타워형', linear:'판상형', lshape:'ㄱ자형', courtyard:'중정형', cluster:'클러스터형' }
  const summary = `${typeKR[type] || type} ${floors}층 ${units}세대 → 253개 중 ${matched.length}개 패턴 매칭 (도시 ${matched.filter(p=>p.scale==='town').length} + 건물 ${matched.filter(p=>p.scale==='building').length} + 시공 ${matched.filter(p=>p.scale==='construction').length})`

  return {
    total: allPatterns.length,
    matched: matched.length,
    patterns: matched,
    renderPrompts,
    propertyScores,
    summary,
  }
}

/**
 * 매칭된 패턴에서 AI 렌더링용 프롬프트 문단을 생성합니다.
 * 최대 15개 프롬프트를 선별하여 하나의 텍스트로 합칩니다.
 */
export function buildPatternPrompt(result: PatternMatchResult, maxPrompts: number = 15): string {
  if (result.renderPrompts.length === 0) return ''
  
  const selected = result.renderPrompts.slice(0, maxPrompts)
  return `═══ CHRISTOPHER ALEXANDER PATTERNS (${result.matched} patterns matched) ═══
Apply these architectural qualities from A Pattern Language:
${selected.map((p, i) => `${i+1}. ${p}`).join('\n')}

These patterns create LIVING STRUCTURE — buildings that feel alive, warm, and deeply human.`
}
