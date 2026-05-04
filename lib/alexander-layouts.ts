/**
 * 알렉산더 패턴 기반 8가지 배치안 유형
 * 
 * "형태에서 출발"이 아니라 "사람의 경험에서 출발"하는 배치안 체계
 * 각 유형은 Alexander Pattern Language의 핵심 패턴에 근거
 */

export interface AlexanderLayoutType {
  id: string
  name: string
  subtitle: string
  icon: string
  patterns: { id: number; name: string; nameKo: string }[]
  philosophy: string
  
  // 배치 파라미터 기본값
  baseCoverage: number      // 기본 건폐율 (%)
  floorMultiplier: number   // 법정 최대 층수 대비 비율 (0~1)
  openSpaceRatio: number    // 외부공간 비율 (%)
  
  // 대지 조건 적합도 (0~10)
  suitability: {
    steepSlope: number      // 급경사 (8%+)
    mildSlope: number       // 완경사 (3~8%)
    flat: number            // 평탄 (0~3%)
    smallSite: number       // 소규모 (300㎡ 이하)
    mediumSite: number      // 중규모 (300~1000㎡)
    largeSite: number       // 대규모 (1000㎡+)
    roadFacing: number      // 도로 접면
    residential: number     // 주거지역
    commercial: number      // 상업허용
    highDensity: number     // 고밀도 허용
  }
  
  // 15개 속성 보너스
  propertyBonus: Record<string, number>
  
  // 설명 텍스트
  whenToUse: string
  livingQuality: string
}

export const ALEXANDER_LAYOUT_TYPES: AlexanderLayoutType[] = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1. 높은 전망의 집
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: "panorama-tower",
    name: "높은 전망의 집",
    subtitle: "도시를 내려다보는 수직 생활",
    icon: "🏔️",
    patterns: [
      { id: 62, name: "High Places", nameKo: "높은 장소" },
      { id: 96, name: "Number of Stories", nameKo: "층수" },
      { id: 134, name: "Zen View", nameKo: "선의 조망" },
      { id: 192, name: "Windows Overlooking Life", nameKo: "삶을 내려다보는 창" },
    ],
    philosophy: "알렉산더는 '높은 장소에서 세상을 내려다보는 경험은 인간에게 근원적인 안정감을 준다'고 했다. 이 배치안은 수직적 생활 속에서 도시의 풍경을 일상으로 끌어들인다.",
    baseCoverage: 40,
    floorMultiplier: 1.0,
    openSpaceRatio: 60,
    suitability: { steepSlope: 4, mildSlope: 6, flat: 8, smallSite: 7, mediumSite: 8, largeSite: 6, roadFacing: 7, residential: 6, commercial: 9, highDensity: 10 },
    propertyBonus: { "Contrast": 2, "Levels of Scale": 1 },
    whenToUse: "조망이 우수하거나 고밀도 개발이 필요한 대지",
    livingQuality: "높은 곳에서의 도시 조망, 효율적 토지 사용, 단 저층부 활성화 필요",
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2. 남향 빛의 집
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: "sunlight-plate",
    name: "남향 빛의 집",
    subtitle: "모든 방에 햇살이 드는 삶",
    icon: "☀️",
    patterns: [
      { id: 105, name: "South Facing Outdoors", nameKo: "남향 외부공간" },
      { id: 107, name: "Wings of Light", nameKo: "빛의 날개" },
      { id: 128, name: "Indoor Sunlight", nameKo: "실내 햇살" },
      { id: 159, name: "Light on Two Sides", nameKo: "방의 양면 채광" },
      { id: 138, name: "Sleeping to the East", nameKo: "동쪽으로 잠자기" },
    ],
    philosophy: "알렉산더는 '모든 방에 최소 2시간의 직사광선이 들어와야 한다'고 했다. 빛의 날개(#107)처럼 건물 폭을 6.5m 이내로 좁게 하면 모든 공간에 자연광이 스며든다.",
    baseCoverage: 45,
    floorMultiplier: 0.8,
    openSpaceRatio: 55,
    suitability: { steepSlope: 5, mildSlope: 7, flat: 9, smallSite: 5, mediumSite: 9, largeSite: 8, roadFacing: 8, residential: 10, commercial: 5, highDensity: 6 },
    propertyBonus: { "Gradients": 2, "Not-Separateness": 1, "Echoes": 1 },
    whenToUse: "남향 확보가 가능한 평탄한 대지, 주거 중심 지역",
    livingQuality: "모든 세대 남향 채광, 양면 통풍, 균일한 주거 품질",
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3. 살아있는 안마당
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: "living-courtyard",
    name: "살아있는 안마당",
    subtitle: "하늘이 보이는 마당을 중심으로",
    icon: "🏡",
    patterns: [
      { id: 115, name: "Courtyards Which Live", nameKo: "살아있는 중정" },
      { id: 106, name: "Positive Outdoor Space", nameKo: "긍정적 외부공간" },
      { id: 114, name: "Hierarchy of Open Space", nameKo: "오픈스페이스의 위계" },
      { id: 129, name: "Common Areas at Heart", nameKo: "중심의 공용 공간" },
      { id: 171, name: "Tree Places", nameKo: "나무가 있는 곳" },
    ],
    philosophy: "알렉산더는 '중정이 사방으로 완전히 닫히면 죽은 공간이 된다. 한쪽이 열려야 살아있다'고 했다. 이 배치안의 안마당은 하늘을 향해 열려 있고, 나무 아래에서 이웃을 만나는 장소이다.",
    baseCoverage: 50,
    floorMultiplier: 0.6,
    openSpaceRatio: 50,
    suitability: { steepSlope: 3, mildSlope: 7, flat: 9, smallSite: 4, mediumSite: 9, largeSite: 10, roadFacing: 7, residential: 10, commercial: 7, highDensity: 7 },
    propertyBonus: { "Strong Centers": 3, "Positive Space": 3, "The Void": 2, "Deep Interlock and Ambiguity": 2 },
    whenToUse: "중규모 이상 대지에서 커뮤니티를 형성하고 싶을 때",
    livingQuality: "공동체의 중심이 되는 마당, 아이들의 놀이, 이웃과의 자연스러운 만남",
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4. 전이 공간의 집
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: "transition-house",
    name: "전이 공간의 집",
    subtitle: "바깥에서 안으로 천천히",
    icon: "🚪",
    patterns: [
      { id: 112, name: "Entrance Transition", nameKo: "진입 전이공간" },
      { id: 127, name: "Intimacy Gradient", nameKo: "친밀도 구배" },
      { id: 36, name: "Degrees of Publicness", nameKo: "공공성의 단계" },
      { id: 140, name: "Private Terrace on Street", nameKo: "길에 면한 사적 테라스" },
      { id: 130, name: "Entrance Room", nameKo: "현관" },
    ],
    philosophy: "알렉산더는 '바깥에서 안으로 들어갈 때 점진적인 전이가 없으면 사람은 불안해한다'고 했다. 거리→전정→현관→거실→침실로 이어지는 친밀도의 구배가 깊은 안정감을 만든다.",
    baseCoverage: 45,
    floorMultiplier: 0.75,
    openSpaceRatio: 55,
    suitability: { steepSlope: 5, mildSlope: 8, flat: 8, smallSite: 7, mediumSite: 8, largeSite: 7, roadFacing: 9, residential: 9, commercial: 6, highDensity: 5 },
    propertyBonus: { "Gradients": 3, "Boundaries": 3, "Deep Interlock and Ambiguity": 2 },
    whenToUse: "도로에 직접 면한 대지, 프라이버시가 중요한 주거",
    livingQuality: "바깥에서 안으로의 점진적 전이, 깊은 안정감, 사적 공간의 보호",
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 5. 이웃의 마을 (신규)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: "village-cluster",
    name: "이웃의 마을",
    subtitle: "8~12세대가 만드는 작은 마을",
    icon: "🏘️",
    patterns: [
      { id: 37, name: "House Cluster", nameKo: "주택 군집" },
      { id: 67, name: "Common Land", nameKo: "공유지" },
      { id: 95, name: "Building Complex", nameKo: "건물 복합체" },
      { id: 14, name: "Identifiable Neighborhood", nameKo: "인식 가능한 동네" },
      { id: 35, name: "Household Mix", nameKo: "가구 혼합" },
    ],
    philosophy: "알렉산더는 '하나의 큰 건물보다 작은 건물들의 복합체가 더 살아있다'고 했다. 8~12세대가 공유 마당을 중심으로 군집을 이루면 '인식 가능한 동네'가 된다. 이것이 사람이 소속감을 느끼는 최소 단위이다.",
    baseCoverage: 35,
    floorMultiplier: 0.4,
    openSpaceRatio: 65,
    suitability: { steepSlope: 6, mildSlope: 8, flat: 8, smallSite: 3, mediumSite: 7, largeSite: 10, roadFacing: 6, residential: 10, commercial: 3, highDensity: 4 },
    propertyBonus: { "Levels of Scale": 3, "Strong Centers": 2, "Alternating Repetition": 3, "Not-Separateness": 2 },
    whenToUse: "대규모 대지에서 커뮤니티를 만들고 싶을 때, 제1종 전용주거",
    livingQuality: "작은 마을의 친밀감, 공유 마당에서의 이웃 관계, 아이들의 안전한 놀이",
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 6. 가로를 살리는 집 (신규)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: "street-row",
    name: "가로를 살리는 집",
    subtitle: "거리가 살아나는 연립",
    icon: "🏪",
    patterns: [
      { id: 38, name: "Row Houses", nameKo: "연립 주택" },
      { id: 87, name: "Individually Owned Shops", nameKo: "개인 상점" },
      { id: 88, name: "Street Cafe", nameKo: "거리 카페" },
      { id: 100, name: "Pedestrian Street", nameKo: "보행자 거리" },
      { id: 122, name: "Building Fronts", nameKo: "건물 전면" },
      { id: 165, name: "Opening to the Street", nameKo: "거리로의 개방" },
    ],
    philosophy: "알렉산더는 '연립주택이 가로를 활성화한다'고 했다. 1층의 작은 상점, 거리 카페, 보행자 도로가 만드는 '활기 있는 거리'는 도시의 가장 중요한 공공 공간이다.",
    baseCoverage: 55,
    floorMultiplier: 0.5,
    openSpaceRatio: 45,
    suitability: { steepSlope: 3, mildSlope: 6, flat: 9, smallSite: 6, mediumSite: 9, largeSite: 8, roadFacing: 10, residential: 7, commercial: 10, highDensity: 7 },
    propertyBonus: { "Echoes": 2, "Alternating Repetition": 3, "Boundaries": 2, "Strong Centers": 1 },
    whenToUse: "도로변 대지, 근린생활시설 허용 지역, 상업+주거 복합",
    livingQuality: "1층 상점의 활기, 걸어서 모든 것이 해결되는 동네, 거리 문화",
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 7. 땅을 따르는 집 (신규)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: "terrain-steps",
    name: "땅을 따르는 집",
    subtitle: "경사를 거스르지 않는 지혜",
    icon: "⛰️",
    patterns: [
      { id: 39, name: "Housing Hill", nameKo: "주거 언덕" },
      { id: 169, name: "Terraced Slope", nameKo: "계단식 경사" },
      { id: 168, name: "Connection to the Earth", nameKo: "대지와의 연결" },
      { id: 104, name: "Site Repair", nameKo: "부지 보수" },
      { id: 118, name: "Roof Garden", nameKo: "옥상 정원" },
    ],
    philosophy: "알렉산더는 '건물을 대지의 가장 나쁜 부분에 짓고, 가장 좋은 부분은 정원으로 보존하라'고 했다. 경사지에서 땅을 깎지 않고 순응하면, 아래층의 옥상이 윗층의 정원이 되는 풍요로운 공간이 만들어진다.",
    baseCoverage: 40,
    floorMultiplier: 0.5,
    openSpaceRatio: 60,
    suitability: { steepSlope: 10, mildSlope: 9, flat: 3, smallSite: 6, mediumSite: 8, largeSite: 9, roadFacing: 6, residential: 9, commercial: 4, highDensity: 5 },
    propertyBonus: { "Not-Separateness": 3, "Gradients": 3, "Good Shape": 2, "Roughness": 2 },
    whenToUse: "경사도 8% 이상인 대지, 산지 주거",
    livingQuality: "대지에 순응하는 자연스러운 형태, 계단식 정원, 각 세대의 독립적 조망",
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 8. 자연 속의 집 (신규)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: "garden-house",
    name: "자연 속의 집",
    subtitle: "정원이 집을 감싸는 삶",
    icon: "🌳",
    patterns: [
      { id: 104, name: "Site Repair", nameKo: "부지 보수" },
      { id: 111, name: "Half-Hidden Garden", nameKo: "반쯤 숨겨진 정원" },
      { id: 170, name: "Fruit Trees", nameKo: "과일나무" },
      { id: 171, name: "Tree Places", nameKo: "나무가 있는 곳" },
      { id: 172, name: "Garden Growing Wild", nameKo: "자연스러운 정원" },
      { id: 177, name: "Vegetable Garden", nameKo: "텃밭" },
    ],
    philosophy: "알렉산더는 '정원은 자연스럽게 자라야 한다. 기하학적으로 다듬어진 정원은 죽은 정원이다'고 했다. 건폐율 25% 이하로 건물을 최소화하고, 과일나무와 텃밭이 집을 감싸면 일상이 자연과 하나가 된다.",
    baseCoverage: 25,
    floorMultiplier: 0.35,
    openSpaceRatio: 75,
    suitability: { steepSlope: 5, mildSlope: 7, flat: 8, smallSite: 8, mediumSite: 7, largeSite: 9, roadFacing: 5, residential: 10, commercial: 2, highDensity: 2 },
    propertyBonus: { "The Void": 3, "Not-Separateness": 3, "Roughness": 3, "Simplicity and Inner Calm": 2 },
    whenToUse: "넓은 대지에서 거주 품질을 극대화하고 싶을 때, 제1종 전용주거",
    livingQuality: "정원에 둘러싸인 삶, 계절의 변화, 텃밭과 과일나무, 새소리",
  },
]

// ═══════════════════════════════════════════
// 대지 조건 분석 → 최적 유형 4개 추천
// ═══════════════════════════════════════════

interface SiteCondition {
  siteArea: number       // ㎡
  slopePercent?: number  // %
  zoneType?: string
  roadWidth?: number     // m
  maxFloors?: number
}

export function recommendLayoutTypes(
  condition: SiteCondition
): AlexanderLayoutType[] {
  const scores = ALEXANDER_LAYOUT_TYPES.map(type => {
    let score = 0
    
    // 대지 면적
    if (condition.siteArea <= 300) score += type.suitability.smallSite
    else if (condition.siteArea <= 1000) score += type.suitability.mediumSite
    else score += type.suitability.largeSite
    
    // 경사도
    const slope = condition.slopePercent ?? 5
    if (slope >= 8) score += type.suitability.steepSlope
    else if (slope >= 3) score += type.suitability.mildSlope
    else score += type.suitability.flat
    
    // 용도지역
    const zone = condition.zoneType || ''
    if (zone.includes('상업') || zone.includes('commercial') || zone.includes('준주거'))
      score += type.suitability.commercial
    else if (zone.includes('전용') || zone.includes('exclusive'))
      score += type.suitability.residential
    else
      score += Math.round((type.suitability.residential + type.suitability.commercial) / 2)
    
    // 고밀도 허용 여부
    if (condition.maxFloors && condition.maxFloors > 5)
      score += type.suitability.highDensity
    
    // 도로 접면
    if (condition.roadWidth && condition.roadWidth >= 8)
      score += type.suitability.roadFacing
    
    return { type, score }
  })
  
  // 점수 높은 순으로 정렬 → 상위 4개 반환
  scores.sort((a, b) => b.score - a.score)
  return scores.slice(0, 4).map(s => s.type)
}

// 유형별 배치안 이름 생성
export function getAlexanderLayoutName(type: AlexanderLayoutType, strategy?: string): string {
  return type.name
}

// 유형별 설명 생성 (패턴 참조 포함)
export function getAlexanderLayoutDescription(type: AlexanderLayoutType): string {
  const patternRefs = type.patterns.slice(0, 3).map(p => `#${p.id} ${p.nameKo}`).join(', ')
  return `${type.subtitle} — ${patternRefs} 기반`
}
