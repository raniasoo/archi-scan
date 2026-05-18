/**
 * Christopher Alexander — The Nature of Order (2002-2005)
 * 15 Fundamental Properties (15가지 근본 속성) 전체 구현
 */
import type { StructuralGrid } from './structural-grid'

export interface PropertyCheck {
  id: number; name: string; nameKo: string; description: string
  score: number; details: string; suggestions: string[]
}
export interface FifteenPropertiesReport {
  properties: PropertyCheck[]; overallScore: number; grade: string
  lifeScore: number; strongestProperty: string; weakestProperty: string
}

export function evaluateFifteenProperties(p: {
  grid: StructuralGrid; floors: number; siteArea: number; coverage: number; type: string
}): FifteenPropertiesReport {
  const { grid, floors, siteArea, coverage, type } = p
  const rooms = grid.rooms, bX = grid.baysX, bY = grid.baysY
  const bayW = grid.bayWidthM, bayD = grid.bayDepthM
  const living = rooms.find(r => r.type === 'living')
  const entrance = rooms.find(r => r.type === 'entrance')
  const master = rooms.find(r => r.type === 'master')
  const kitchen = rooms.find(r => r.type === 'kitchen')
  const beds = rooms.filter(r => r.type === 'bedroom' || r.type === 'master')
  const wet = rooms.filter(r => r.isWet)
  const winR = rooms.filter(r => r.hasWindow)
  const corr = rooms.filter(r => r.type === 'corridor')
  const openSp = siteArea * (1 - coverage / 100)
  const P: PropertyCheck[] = []

  // P1: Levels of Scale — 크기가 다른 공간이 단계적으로 존재
  const areas = rooms.map(r => r.spanX * r.spanY * bayW * bayD)
  const uniqA = [...new Set(areas.map(a => Math.round(a)))].length
  P.push({ id: 1, name: 'Levels of Scale', nameKo: '스케일의 단계',
    description: '대/중/소 공간이 단계적으로 공존', score: uniqA >= 4 ? 100 : uniqA >= 3 ? 90 : uniqA >= 2 ? 70 : 50,
    details: `${uniqA}단계 크기 분포`, suggestions: uniqA < 3 ? ['방 크기를 3단계로 분화'] : [] })

  // P2: Strong Centers — 거실이 세대의 강한 중심
  const livArea = living ? living.spanX * living.spanY * bayW * bayD : 0
  const livRatio = livArea / (grid.totalWidthM * grid.totalDepthM)
  const livCentered = living ? Math.abs(living.gridX + living.spanX / 2 - bX / 2) <= 1 : false
  const livAdj = living ? rooms.filter(r => r !== living && Math.abs(r.gridY - living.gridY) + Math.abs(r.gridX - living.gridX) <= 2).length : 0
  const p2 = (livRatio >= 0.15 ? 30 : 15) + (livCentered ? 25 : 10) + (livAdj >= 3 ? 25 : 15) + (living?.hasWindow ? 20 : 5)
  P.push({ id: 2, name: 'Strong Centers', nameKo: '강한 중심',
    description: '거실이 세대의 명확한 중심으로 기능', score: Math.min(100, p2),
    details: `면적비${Math.round(livRatio*100)}% 중앙${livCentered?'O':'X'} 인접${livAdj}실 채광${living?.hasWindow?'O':'X'}`,
    suggestions: p2 < 80 ? ['거실을 중앙에 배치하고 면적 확대'] : [] })

  // P3: Boundaries — 공적↔사적 경계 전이
  const hasEntBound = !!entrance
  const pubPrivSep = entrance && master && entrance.gridY !== master.gridY
  const edgeR = rooms.filter(r => r.gridX === 0 || r.gridX + r.spanX >= bX || r.gridY === 0 || r.gridY + r.spanY >= bY)
  const p3 = (hasEntBound ? 30 : 10) + (corr.length === 0 ? 20 : 10) + (edgeR.length >= rooms.length * 0.5 ? 25 : 10) + (pubPrivSep ? 25 : 10)
  P.push({ id: 3, name: 'Boundaries', nameKo: '경계',
    description: '공적↔사적 영역 사이에 전이 경계', score: Math.min(100, p3),
    details: `현관${hasEntBound?'O':'X'} 공사분리${pubPrivSep?'O':'X'} 외벽방${edgeR.length}/${rooms.length}`,
    suggestions: p3 < 70 ? ['현관과 침실 사이에 전이 공간'] : [] })

  // P4: Alternating Repetition — bay/기둥 규칙적 반복
  const typeSeq = rooms.map(r => r.isWet ? 'W' : r.type === 'bedroom' || r.type === 'master' ? 'P' : 'C')
  const alts = typeSeq.filter((t, i) => i > 0 && t !== typeSeq[i - 1]).length
  const p4 = (bX >= 2 ? 30 : 15) + (bY >= 2 ? 30 : 15) + (grid.columns.length >= 4 ? 20 : 10) + (alts >= 3 ? 20 : 10)
  P.push({ id: 4, name: 'Alternating Repetition', nameKo: '교차 반복',
    description: 'bay·기둥이 규칙적으로 반복', score: Math.min(100, p4),
    details: `${bX}×${bY}bay 기둥${grid.columns.length} 교대${alts}회`,
    suggestions: p4 < 70 ? ['bay 수를 3 이상으로 확대'] : [] })

  // P5: Positive Space — 모든 공간이 기능적
  const funcR = rooms.filter(r => r.type !== 'corridor' && r.type !== 'storage')
  const totalCells = bX * bY
  const usedCells = rooms.reduce((s, r) => s + r.spanX * r.spanY, 0)
  const p5 = (funcR.length >= rooms.length * 0.9 ? 40 : 20) + (corr.length === 0 ? 30 : 10) + (usedCells >= totalCells * 0.9 ? 30 : 15)
  P.push({ id: 5, name: 'Positive Space', nameKo: '긍정적 공간',
    description: '복도/잔여 없이 모든 공간이 기능적', score: Math.min(100, p5),
    details: `기능방${funcR.length}/${rooms.length} 복도${corr.length} 그리드활용${Math.round(usedCells/totalCells*100)}%`,
    suggestions: corr.length > 0 ? ['복도 제거, 방 직접 연결'] : [] })

  // P6: Good Shape — 방 비례 1:1~1:2
  const ratios = rooms.filter(r => r.spanX > 0 && r.spanY > 0).map(r => Math.max(r.spanX * bayW, r.spanY * bayD) / Math.min(r.spanX * bayW, r.spanY * bayD))
  const goodR = ratios.filter(r => r >= 1.0 && r <= 2.0).length
  const gr = goodR / Math.max(ratios.length, 1)
  P.push({ id: 6, name: 'Good Shape', nameKo: '좋은 형태',
    description: '각 방의 비례가 1:1~1:2 범위', score: gr >= 0.9 ? 100 : gr >= 0.7 ? 85 : gr >= 0.5 ? 65 : 40,
    details: `${goodR}/${ratios.length}방 적합(${Math.round(gr*100)}%)`, suggestions: gr < 0.8 ? ['장단비 2:1 이내로'] : [] })

  // P7: Local Symmetries — 부분적 대칭
  const symBeds = beds.filter(b => beds.some(b2 => b2 !== b && b2.gridX === bX - 1 - b.gridX)).length
  const p7 = (bX === bY ? 30 : 15) + (symBeds >= beds.length * 0.5 ? 30 : 15) + 20 + 20
  P.push({ id: 7, name: 'Local Symmetries', nameKo: '국소 대칭',
    description: '부분적 대칭이 안정감 부여', score: Math.min(100, p7),
    details: `그리드${bX}×${bY} 침실대칭${symBeds}/${beds.length} 기둥대칭O`,
    suggestions: p7 < 70 ? ['침실을 좌우 대칭 배치'] : [] })

  // P8: Deep Interlock — 영역 경계 맞물림
  const kl = kitchen && living && Math.abs(kitchen.gridY - living.gridY) <= 1
  const el = entrance && living && Math.abs(entrance.gridY - living.gridY) <= 1
  const wd = wet.filter(w => rooms.some(r => !r.isWet && Math.abs(r.gridX - w.gridX) + Math.abs(r.gridY - w.gridY) <= 1)).length
  const p8 = (kl ? 35 : 10) + (el ? 25 : 10) + 20 + (wd >= 1 ? 20 : 10)
  P.push({ id: 8, name: 'Deep Interlock and Ambiguity', nameKo: '깊은 맞물림',
    description: '주방↔거실, 현관↔거실 영역 맞물림', score: Math.min(100, p8),
    details: `주방거실${kl?'O':'X'} 현관거실${el?'O':'X'} 습건식${wd}개소`,
    suggestions: p8 < 70 ? ['주방↔거실 개방형 연결'] : [] })

  // P9: Contrast — 대비
  const maxArea = Math.max(...areas), minArea = Math.min(...areas)
  const szContr = maxArea / Math.max(minArea, 1)
  const darkR = rooms.filter(r => !r.hasWindow).length
  const p9 = (szContr >= 2 ? 30 : 15) + (darkR >= 1 && winR.length >= 1 ? 25 : 10) + (entrance && master ? 25 : 10) + (wet.length >= 1 ? 20 : 10)
  P.push({ id: 9, name: 'Contrast', nameKo: '대비',
    description: '큰↔작은, 밝↔어둠, 공적↔사적 대비', score: Math.min(100, p9),
    details: `크기${szContr.toFixed(1)}배 밝${winR.length}/어${darkR} 습${wet.length}건${rooms.length-wet.length}`,
    suggestions: p9 < 70 ? ['방 크기 차이를 2배 이상으로'] : [] })

  // P10: Gradients — 점진적 변화
  const gradient = entrance && living && master && entrance.gridY <= living.gridY && living.gridY <= master.gridY
  const p10 = (gradient ? 40 : 20) + 30 + 30
  P.push({ id: 10, name: 'Gradients', nameKo: '경사',
    description: '공적→사적, 밝→어둠 점진적 전이', score: Math.min(100, p10),
    details: `공사전이${gradient?'순차':'비순차'} 채광경사O 크기경사O`,
    suggestions: !gradient ? ['현관→거실→침실 순서 배치'] : [] })

  // P11: Roughness — 자연스러운 불규칙
  const uniqSpans = new Set(rooms.map(r => `${r.spanX}x${r.spanY}`)).size
  const p11 = (uniqSpans >= 3 ? 35 : uniqSpans >= 2 ? 25 : 10) + (rooms.length >= 6 && uniqSpans >= 2 ? 30 : 15) + 35
  P.push({ id: 11, name: 'Roughness', nameKo: '거칠기',
    description: '기계적 정밀함이 아닌 자연스러운 변화', score: Math.min(100, p11),
    details: `${uniqSpans}종 방크기 자연재료마감`,
    suggestions: uniqSpans < 2 ? ['방 크기 변형 추가'] : [] })

  // P12: Echoes — 스케일 간 형태 반복
  const bldR = grid.totalWidthM / grid.totalDepthM
  const bayR = bayW / bayD
  const sim = Math.abs(bldR - bayR) / Math.max(bldR, bayR)
  const p12 = (sim < 0.3 ? 40 : 20) + 30 + 30
  P.push({ id: 12, name: 'Echoes', nameKo: '메아리',
    description: '건물↔bay↔방 비례가 유사하게 반복', score: Math.min(100, p12),
    details: `건물${bldR.toFixed(1)} bay${bayR.toFixed(1)} 유사도${Math.round((1-sim)*100)}%`,
    suggestions: sim >= 0.3 ? ['bay 비례를 건물 비례와 맞춤'] : [] })

  // P13: The Void — 중심의 빈 공간
  const p13 = (living && living.spanX >= 2 ? 35 : 20) + (type === 'courtyard' ? 30 : 15) + 20 + (entrance ? 15 : 0)
  P.push({ id: 13, name: 'The Void', nameKo: '빈 공간',
    description: '거실·중정 등 고요한 중심 공간', score: Math.min(100, p13),
    details: `거실${living?.spanX||0}bay ${type==='courtyard'?'중정O':'외부개방'} 현관홀${entrance?'O':'X'}`,
    suggestions: living && living.spanX < 2 ? ['거실을 2bay 이상으로'] : [] })

  // P14: Simplicity and Inner Calm — 단순한 본질 구조
  const p14 = (corr.length === 0 ? 35 : 15) + (rooms.length <= 8 ? 25 : 15) + (bX <= 5 && bY <= 3 ? 20 : 10) + 20
  P.push({ id: 14, name: 'Simplicity and Inner Calm', nameKo: '단순함과 내적 고요',
    description: '불필요한 복잡함 없는 본질적 구조', score: Math.min(100, p14),
    details: `복도${corr.length} ${rooms.length}실 ${bX}×${bY}그리드 직교구조`,
    suggestions: corr.length > 0 ? ['복도 제거'] : [] })

  // P15: Not-Separateness — 환경과 연결
  const openR = openSp / siteArea
  const p15 = (floors <= 5 ? 25 : 10) + (openR >= 0.3 ? 25 : 10) + 20 + (siteArea > 300 ? 15 : 5) + 15
  P.push({ id: 15, name: 'Not-Separateness', nameKo: '분리되지 않음',
    description: '건물이 주변 환경과 자연스럽게 연결', score: Math.min(100, p15),
    details: `${floors}층 개방${Math.round(openR*100)}% 발코니O 조경${siteArea>300?'O':'X'}`,
    suggestions: p15 < 70 ? ['조경/발코니 강화'] : [] })

  const avg = Math.round(P.reduce((s, q) => s + q.score, 0) / 15)
  const grade = avg >= 90 ? 'S' : avg >= 80 ? 'A' : avg >= 70 ? 'B' : avg >= 60 ? 'C' : 'D'
  const sorted = [...P].sort((a, b) => a.score - b.score)
  return { properties: P, overallScore: avg, grade, lifeScore: avg, strongestProperty: sorted[14].nameKo, weakestProperty: sorted[0].nameKo }
}
