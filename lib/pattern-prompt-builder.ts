// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Phase 3: 253패턴 → AI 프롬프트 맥락별 최적화
// 외관/인테리어/조감도/입구 별로 관련 패턴만 선별
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { type PatternMatchResult } from './pattern-matcher'

type RenderContext = 'exterior' | 'interior' | 'birds-eye' | 'entrance' | 'landscape'

// 패턴 ID → 맥락 매핑 (어떤 앵글에서 가장 관련 있는지)
const CONTEXT_MAP: Record<number, RenderContext[]> = {
  // 외관 전용
  110: ['exterior', 'entrance'], 112: ['exterior', 'entrance'], 117: ['exterior'],
  122: ['exterior'], 160: ['exterior'], 164: ['exterior'], 165: ['exterior'],
  166: ['exterior'], 167: ['exterior'], 207: ['exterior'], 221: ['exterior'],
  223: ['exterior'], 225: ['exterior'], 236: ['exterior'], 238: ['exterior'],
  245: ['exterior', 'landscape'], 246: ['exterior', 'landscape'], 250: ['exterior', 'interior'],
  
  // 인테리어 전용
  127: ['interior'], 128: ['interior'], 130: ['interior'], 131: ['interior'],
  132: ['interior'], 135: ['interior'], 139: ['interior'], 179: ['interior'],
  180: ['interior'], 181: ['interior'], 182: ['interior'], 185: ['interior'],
  188: ['interior'], 190: ['interior'], 191: ['interior'], 197: ['interior'],
  199: ['interior'], 200: ['interior'], 233: ['interior'], 235: ['interior'],
  237: ['interior'], 251: ['interior'], 252: ['interior'], 253: ['interior'],
  
  // 조감도 전용
  95: ['birds-eye'], 97: ['birds-eye', 'landscape'], 105: ['birds-eye', 'landscape'],
  106: ['birds-eye'], 107: ['birds-eye'], 114: ['birds-eye'], 115: ['birds-eye'],
  116: ['birds-eye'], 118: ['birds-eye'], 169: ['birds-eye', 'landscape'],
  
  // 입구 전용
  242: ['entrance'], 243: ['entrance'], 173: ['entrance', 'landscape'],
  
  // 조경/외부공간
  60: ['landscape', 'birds-eye'], 67: ['landscape'], 68: ['landscape'],
  69: ['landscape'], 170: ['landscape'], 171: ['landscape'], 172: ['landscape'],
  176: ['landscape'], 177: ['landscape'], 247: ['landscape'],
}

/**
 * 렌더링 맥락에 맞는 패턴 프롬프트를 생성합니다.
 * 전체 매칭 결과에서 맥락에 관련된 패턴만 필터링합니다.
 */
export function buildContextualPatternPrompt(
  result: PatternMatchResult,
  context: RenderContext,
  maxPrompts: number = 10
): string {
  if (result.patterns.length === 0) return ''

  // 맥락에 관련된 패턴 우선 정렬
  const contextPatterns = result.patterns
    .filter(p => p.render_prompt)
    .map(p => {
      const contexts = CONTEXT_MAP[p.id] || ['exterior', 'birds-eye'] // 기본: 외관
      const relevance = contexts.includes(context) ? 1.0 : 0.3
      return { ...p, contextRelevance: relevance }
    })
    .sort((a, b) => b.contextRelevance - a.contextRelevance || b.korea_relevance - a.korea_relevance)
    .slice(0, maxPrompts)

  const contextLabel = {
    'exterior': '외관 (Eye-Level)',
    'interior': '인테리어',
    'birds-eye': '조감도 (Bird-Eye)',
    'entrance': '입구 (Entrance)',
    'landscape': '조경/외부공간',
  }[context]

  return `═══ ALEXANDER PATTERNS for ${contextLabel} (${result.matched} total, ${contextPatterns.length} selected) ═══
${contextPatterns.map((p, i) => `${i+1}. ${p.render_prompt}`).join('\n')}
These create LIVING STRUCTURE — architecture that feels alive and deeply human.`
}

/**
 * cameraAngle을 RenderContext로 변환합니다.
 */
export function angleToContext(cameraAngle?: string): RenderContext {
  if (!cameraAngle) return 'exterior'
  if (cameraAngle === 'interior') return 'interior'
  if (cameraAngle === 'birds-eye' || cameraAngle === 'bird-eye') return 'birds-eye'
  if (cameraAngle === 'entrance') return 'entrance'
  return 'exterior'
}
