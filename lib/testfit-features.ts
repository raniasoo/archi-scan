/**
 * TestFit 수준 배치안 기능 4종
 * ① 세대 유닛 라이브러리
 * ② 주차 레이아웃 자동 생성
 * ③ 복합 개발 (상업+주거+호텔)
 * ④ 파라미터 슬라이더 (세대수/믹스/주차)
 */

// ━━━ ① 세대 유닛 라이브러리 ━━━

export interface UnitType {
  id: string
  name: string
  nameEn: string
  area: number          // 전용면적 (㎡)
  rooms: number         // 방 수
  baths: number         // 욕실 수
  width: number         // 폭 (m)
  depth: number         // 깊이 (m)
  minOccupants: number
  maxOccupants: number
  targetDemographic: string
  priceMultiplier: number  // 기본 분양가 대비 배율
}

export const UNIT_LIBRARY: UnitType[] = [
  // 원룸/스튜디오
  { id: 'ST-01', name: '스튜디오 A', nameEn: 'Studio A', area: 19, rooms: 0, baths: 1, width: 3.3, depth: 5.8, minOccupants: 1, maxOccupants: 1, targetDemographic: '1인가구/대학생', priceMultiplier: 1.15 },
  { id: 'ST-02', name: '스튜디오 B', nameEn: 'Studio B', area: 26, rooms: 0, baths: 1, width: 3.6, depth: 7.2, minOccupants: 1, maxOccupants: 2, targetDemographic: '1인가구/신입직장인', priceMultiplier: 1.10 },
  // 1룸 (투룸)
  { id: '1R-01', name: '1룸 소형', nameEn: '1BR Small', area: 33, rooms: 1, baths: 1, width: 5.4, depth: 6.1, minOccupants: 1, maxOccupants: 2, targetDemographic: '신혼/1인', priceMultiplier: 1.05 },
  { id: '1R-02', name: '1룸 표준', nameEn: '1BR Standard', area: 39, rooms: 1, baths: 1, width: 6.0, depth: 6.5, minOccupants: 1, maxOccupants: 2, targetDemographic: '신혼/커플', priceMultiplier: 1.00 },
  // 2룸
  { id: '2R-01', name: '2룸 소형', nameEn: '2BR Small', area: 49, rooms: 2, baths: 1, width: 6.6, depth: 7.4, minOccupants: 2, maxOccupants: 3, targetDemographic: '신혼/소가족', priceMultiplier: 1.00 },
  { id: '2R-02', name: '2룸 표준', nameEn: '2BR Standard', area: 59, rooms: 2, baths: 1, width: 7.2, depth: 8.2, minOccupants: 2, maxOccupants: 4, targetDemographic: '소가족', priceMultiplier: 0.98 },
  // 3룸 (국민 평형)
  { id: '3R-01', name: '3룸 국민', nameEn: '3BR National', area: 84, rooms: 3, baths: 2, width: 8.1, depth: 10.4, minOccupants: 3, maxOccupants: 5, targetDemographic: '가족', priceMultiplier: 0.95 },
  { id: '3R-02', name: '3룸 대형', nameEn: '3BR Large', area: 99, rooms: 3, baths: 2, width: 9.0, depth: 11.0, minOccupants: 3, maxOccupants: 5, targetDemographic: '중대가족', priceMultiplier: 0.93 },
  // 4룸
  { id: '4R-01', name: '4룸 프리미엄', nameEn: '4BR Premium', area: 120, rooms: 4, baths: 2, width: 10.2, depth: 11.8, minOccupants: 4, maxOccupants: 6, targetDemographic: '대가족', priceMultiplier: 0.90 },
  // 펜트하우스
  { id: 'PH-01', name: '펜트하우스', nameEn: 'Penthouse', area: 165, rooms: 4, baths: 3, width: 12.0, depth: 13.8, minOccupants: 2, maxOccupants: 6, targetDemographic: '고소득/VIP', priceMultiplier: 1.30 },
]

// ━━━ ② 주차 레이아웃 자동 생성 ━━━

export interface ParkingLayout {
  type: 'surface' | 'underground' | 'structure' | 'piloti'
  totalSpaces: number
  regularSpaces: number
  compactSpaces: number
  disabledSpaces: number
  evSpaces: number
  motorcycleSpaces: number
  width: number          // 주차장 전체 폭 (m)
  depth: number          // 주차장 전체 깊이 (m)
  levels: number         // 지하 층수 또는 구조물 층수
  rampType: string       // 경사로 유형
  aisleWidth: number     // 통로 폭 (m)
  spaceWidth: number     // 주차면 폭 (m)
  spaceDepth: number     // 주차면 깊이 (m)
  costPerSpace: number   // 주차면 당 비용 (원)
  totalCost: number      // 주차장 총 비용 (원)
  area: number           // 주차장 면적 (㎡)
}

export function generateParkingLayout(params: {
  requiredSpaces: number
  siteArea: number
  buildingFootprint: number
  floors: number
  floodRisk?: string
}): ParkingLayout {
  const { requiredSpaces, siteArea, buildingFootprint, floors, floodRisk = 'low' } = params
  
  const openSpace = siteArea - buildingFootprint
  const surfaceCapacity = Math.floor(openSpace / 25) // 25㎡/대 (통로 포함)
  
  // 주차 유형 결정
  let type: ParkingLayout['type']
  let levels = 1
  
  if (floodRisk === 'very-high' || floodRisk === 'high') {
    type = 'piloti' // 침수 위험 → 1층 필로티 주차
  } else if (requiredSpaces <= surfaceCapacity && floors <= 5) {
    type = 'surface' // 지상 노면 주차
  } else if (requiredSpaces <= surfaceCapacity * 2) {
    type = 'underground' // 지하 1층
    levels = 1
  } else {
    type = 'underground' // 지하 2층+
    levels = Math.ceil(requiredSpaces / Math.max(1, Math.floor(siteArea * 0.8 / 30)))
    levels = Math.min(levels, 4)
  }
  
  const spaceW = 2.5, spaceD = 5.0, aisleW = 6.0
  
  // 특수 주차면
  const disabled = Math.max(1, Math.ceil(requiredSpaces * 0.02))  // 장애인 2%
  const ev = Math.max(1, Math.ceil(requiredSpaces * 0.05))        // 전기차 5%
  const motorcycle = Math.ceil(requiredSpaces * 0.03)             // 이륜차 3%
  const compact = Math.ceil(requiredSpaces * 0.1)                 // 소형차 10%
  const regular = requiredSpaces - disabled - ev - compact
  
  // 면적/비용 계산
  const areaPerSpace = type === 'underground' ? 35 : type === 'structure' ? 30 : 25
  const area = requiredSpaces * areaPerSpace
  const costPerSpace = type === 'underground' ? 25000000 : type === 'structure' ? 18000000 : type === 'piloti' ? 15000000 : 5000000
  
  // 전체 크기
  const rows = Math.ceil(requiredSpaces / (type === 'underground' ? levels : 1) / 2)
  const layoutW = Math.max(rows * (spaceW + 0.3) * 2 + aisleW, 15)
  const layoutD = Math.max(spaceD * 2 + aisleW + 3, 15)
  
  return {
    type, totalSpaces: requiredSpaces,
    regularSpaces: regular, compactSpaces: compact,
    disabledSpaces: disabled, evSpaces: ev, motorcycleSpaces: motorcycle,
    width: Math.round(layoutW * 10) / 10,
    depth: Math.round(layoutD * 10) / 10,
    levels,
    rampType: type === 'underground' ? (levels > 1 ? '나선형 경사로' : '직선 경사로') : type === 'structure' ? '나선형 경사로' : '없음',
    aisleWidth: aisleW, spaceWidth: spaceW, spaceDepth: spaceD,
    costPerSpace, totalCost: requiredSpaces * costPerSpace,
    area: Math.round(area),
  }
}

// ━━━ ③ 복합 개발 (Mixed-Use) ━━━

export interface MixedUseProgram {
  uses: {
    type: 'residential' | 'retail' | 'office' | 'hotel' | 'community' | 'parking'
    nameKo: string
    floorRange: [number, number]  // 시작~끝 층
    area: number                   // 면적 (㎡)
    areaRatio: number              // 전체 대비 비율 (%)
    revenuePerM2: number           // ㎡당 수입 (원)
    units?: number                 // 세대/실 수
  }[]
  totalGFA: number
  totalRevenue: number
  mixDescription: string
}

export function generateMixedUse(params: {
  siteArea: number; totalFloors: number; coverage: number; zoneType: string
}): MixedUseProgram {
  const { siteArea, totalFloors, coverage, zoneType } = params
  const footprint = siteArea * coverage / 100
  const totalGFA = footprint * totalFloors
  const uses: MixedUseProgram['uses'] = []
  
  const isCommercial = zoneType.includes('상업') || zoneType.includes('준주거')
  const isResidential = zoneType.includes('주거')
  
  if (isCommercial) {
    // 상업지역: 1~2층 상가 + 3층~ 주거 또는 오피스
    uses.push({
      type: 'retail', nameKo: '근린생활시설 (상가)',
      floorRange: [1, Math.min(2, totalFloors)],
      area: footprint * Math.min(2, totalFloors),
      areaRatio: 0, revenuePerM2: 20000000, // 2,000만/㎡ (분양)
    })
    if (totalFloors >= 3) {
      const residentialFloors = totalFloors - 2
      uses.push({
        type: 'residential', nameKo: '공동주택 (아파트/오피스텔)',
        floorRange: [3, totalFloors],
        area: footprint * residentialFloors,
        areaRatio: 0, revenuePerM2: 12000000,
        units: Math.round(footprint * residentialFloors * 0.65 / 59),
      })
    }
  } else if (isResidential) {
    // 주거지역: 1층 근생 + 2층~ 주거
    if (totalFloors >= 3) {
      uses.push({
        type: 'retail', nameKo: '근린생활시설',
        floorRange: [1, 1],
        area: footprint,
        areaRatio: 0, revenuePerM2: 15000000,
      })
      uses.push({
        type: 'residential', nameKo: '공동주택',
        floorRange: [2, totalFloors],
        area: footprint * (totalFloors - 1),
        areaRatio: 0, revenuePerM2: 10000000,
        units: Math.round(footprint * (totalFloors - 1) * 0.65 / 84),
      })
    } else {
      uses.push({
        type: 'residential', nameKo: '주택',
        floorRange: [1, totalFloors],
        area: totalGFA,
        areaRatio: 0, revenuePerM2: 8000000,
        units: Math.max(1, Math.round(totalGFA * 0.65 / 84)),
      })
    }
  } else {
    // 기타: 전체 주거
    uses.push({
      type: 'residential', nameKo: '주택',
      floorRange: [1, totalFloors],
      area: totalGFA,
      areaRatio: 0, revenuePerM2: 8000000,
      units: Math.max(1, Math.round(totalGFA * 0.65 / 84)),
    })
  }
  
  // 커뮤니티 시설 (50세대 이상)
  const totalUnits = uses.filter(u => u.type === 'residential').reduce((s, u) => s + (u.units || 0), 0)
  if (totalUnits >= 50) {
    uses.push({
      type: 'community', nameKo: '주민공동시설',
      floorRange: [1, 1],
      area: Math.min(footprint * 0.1, 200),
      areaRatio: 0, revenuePerM2: 0,
    })
  }
  
  // 비율 계산
  const total = uses.reduce((s, u) => s + u.area, 0)
  uses.forEach(u => u.areaRatio = Math.round(u.area / total * 100))
  
  const totalRevenue = uses.reduce((s, u) => s + u.area * u.revenuePerM2 * 0.65, 0) // 65% 전용률
  
  const mixParts = uses.map(u => `${u.nameKo} ${u.areaRatio}%`).join(' + ')
  
  return { uses, totalGFA: Math.round(total), totalRevenue: Math.round(totalRevenue), mixDescription: mixParts }
}

// ━━━ ④ 파라미터 슬라이더 (세대 믹스) ━━━

export interface UnitMixConfig {
  studio: number      // 스튜디오 비율 (%)
  oneRoom: number     // 1룸 비율 (%)
  twoRoom: number     // 2룸 비율 (%)
  threeRoom: number   // 3룸 비율 (%)
  fourRoom: number    // 4룸 비율 (%)
  penthouse: number   // 펜트하우스 비율 (%)
}

export interface UnitMixResult {
  units: { type: UnitType; count: number; totalArea: number }[]
  totalUnits: number
  totalExclusiveArea: number
  avgUnitArea: number
  estimatedRevenue: number
  demographics: string
}

export function calculateUnitMix(params: {
  totalExclusiveArea: number    // 총 전용면적 (㎡)
  mix: UnitMixConfig
  basePricePerM2: number        // 기본 분양가 (원/㎡)
}): UnitMixResult {
  const { totalExclusiveArea, mix, basePricePerM2 } = params
  
  const typeMap: Record<string, UnitType> = {
    studio: UNIT_LIBRARY[1],    // ST-02 (26㎡)
    oneRoom: UNIT_LIBRARY[3],   // 1R-02 (39㎡)
    twoRoom: UNIT_LIBRARY[5],   // 2R-02 (59㎡)
    threeRoom: UNIT_LIBRARY[6], // 3R-01 (84㎡)
    fourRoom: UNIT_LIBRARY[8],  // 4R-01 (120㎡)
    penthouse: UNIT_LIBRARY[9], // PH-01 (165㎡)
  }
  
  const mixEntries = [
    { key: 'studio', pct: mix.studio },
    { key: 'oneRoom', pct: mix.oneRoom },
    { key: 'twoRoom', pct: mix.twoRoom },
    { key: 'threeRoom', pct: mix.threeRoom },
    { key: 'fourRoom', pct: mix.fourRoom },
    { key: 'penthouse', pct: mix.penthouse },
  ].filter(e => e.pct > 0)
  
  const units: UnitMixResult['units'] = []
  let usedArea = 0
  
  for (const entry of mixEntries) {
    const unitType = typeMap[entry.key]
    if (!unitType) continue
    const areaForType = totalExclusiveArea * entry.pct / 100
    const count = Math.max(0, Math.round(areaForType / unitType.area))
    const actualArea = count * unitType.area
    units.push({ type: unitType, count, totalArea: actualArea })
    usedArea += actualArea
  }
  
  const totalUnits = units.reduce((s, u) => s + u.count, 0)
  const avgArea = totalUnits > 0 ? Math.round(usedArea / totalUnits) : 0
  
  const revenue = units.reduce((s, u) => s + u.totalArea * basePricePerM2 * u.type.priceMultiplier, 0)
  
  // 인구 구성 추정
  const demoMap: Record<string, number> = {}
  for (const u of units) {
    const demo = u.type.targetDemographic
    demoMap[demo] = (demoMap[demo] || 0) + u.count
  }
  const demographics = Object.entries(demoMap).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}세대`).join(', ')
  
  return { units, totalUnits, totalExclusiveArea: Math.round(usedArea), avgUnitArea: avgArea, estimatedRevenue: Math.round(revenue), demographics }
}

// 기본 세대 믹스 프리셋
export const UNIT_MIX_PRESETS: Record<string, { name: string; mix: UnitMixConfig }> = {
  'young-single': { name: '청년/1인 특화', mix: { studio: 40, oneRoom: 35, twoRoom: 20, threeRoom: 5, fourRoom: 0, penthouse: 0 } },
  'newlywed': { name: '신혼부부 특화', mix: { studio: 10, oneRoom: 30, twoRoom: 40, threeRoom: 15, fourRoom: 5, penthouse: 0 } },
  'family': { name: '가족 특화', mix: { studio: 0, oneRoom: 10, twoRoom: 25, threeRoom: 45, fourRoom: 15, penthouse: 5 } },
  'premium': { name: '프리미엄', mix: { studio: 0, oneRoom: 0, twoRoom: 15, threeRoom: 40, fourRoom: 30, penthouse: 15 } },
  'mixed': { name: '균형 혼합', mix: { studio: 10, oneRoom: 20, twoRoom: 30, threeRoom: 30, fourRoom: 8, penthouse: 2 } },
  'rental': { name: '임대 수익형', mix: { studio: 50, oneRoom: 30, twoRoom: 15, threeRoom: 5, fourRoom: 0, penthouse: 0 } },
}
