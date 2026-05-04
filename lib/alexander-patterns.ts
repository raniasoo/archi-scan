/**
 * Christopher Alexander's 253 Patterns from "A Pattern Language" (1977)
 * 건축설계앱 Archi-Scan에 맞게 구조화
 * 
 * 스케일: town(1-94), building(95-204), construction(205-253)
 * 관련도: 0~1 (건축설계앱에서의 활용도)
 */

export interface AlexanderPattern {
  id: number
  name: string
  nameKo: string
  scale: 'town' | 'building' | 'construction'
  category: string
  categoryKo: string
  relevance: number // 0~1 앱 관련도
  brief: string
  designEffect?: {
    coverage?: number    // 건폐율 영향 (-10 ~ +10)
    floors?: number      // 층수 영향
    openSpace?: number   // 외부공간 비율 영향
    community?: number   // 커뮤니티성 (-5 ~ +5)
    privacy?: number     // 프라이버시 (-5 ~ +5)
    nature?: number      // 자연친화 (-5 ~ +5)
    efficiency?: number  // 효율성 (-5 ~ +5)
  }
}

export const ALEXANDER_PATTERNS: AlexanderPattern[] = [
  // ═══════════════════════════════════════════
  // TOWNS (1-94)
  // ═══════════════════════════════════════════
  { id: 1, name: "Independent Regions", nameKo: "독립적 지역", scale: "town", category: "regional", categoryKo: "지역 구조", relevance: 0.1, brief: "세계는 독립적이고 자치적인 지역들로 나뉘어야 한다" },
  { id: 2, name: "Distribution of Towns", nameKo: "도시의 분포", scale: "town", category: "regional", categoryKo: "지역 구조", relevance: 0.1, brief: "도시가 균등하게 분포되어야 한다" },
  { id: 3, name: "City Country Fingers", nameKo: "도시와 전원의 교차", scale: "town", category: "regional", categoryKo: "지역 구조", relevance: 0.2, brief: "도시와 전원이 손가락처럼 교차해야 한다" },
  { id: 4, name: "Agricultural Valleys", nameKo: "농업 계곡", scale: "town", category: "regional", categoryKo: "지역 구조", relevance: 0.1, brief: "비옥한 계곡은 농업용으로 보존해야 한다" },
  { id: 5, name: "Lace of Country Streets", nameKo: "전원 도로의 레이스", scale: "town", category: "regional", categoryKo: "지역 구조", relevance: 0.1, brief: "시골 도로는 좁고 구불구불해야 한다" },
  { id: 6, name: "Country Towns", nameKo: "시골 마을", scale: "town", category: "regional", categoryKo: "지역 구조", relevance: 0.1, brief: "500~10,000명 규모의 작은 마을이 필요하다" },
  { id: 7, name: "The Countryside", nameKo: "시골", scale: "town", category: "regional", categoryKo: "지역 구조", relevance: 0.1, brief: "시골 지역의 보존이 필요하다" },
  { id: 8, name: "Mosaic of Subcultures", nameKo: "하위문화의 모자이크", scale: "town", category: "community", categoryKo: "커뮤니티", relevance: 0.3, brief: "다양한 하위문화가 공존하는 도시" },
  { id: 9, name: "Scattered Work", nameKo: "분산된 일터", scale: "town", category: "community", categoryKo: "커뮤니티", relevance: 0.3, brief: "직장이 주거지역에 분산되어야 한다" },
  { id: 10, name: "Magic of the City", nameKo: "도시의 마법", scale: "town", category: "community", categoryKo: "커뮤니티", relevance: 0.2, brief: "도시는 특별한 매력을 가져야 한다" },
  { id: 11, name: "Local Transport Areas", nameKo: "근거리 교통 구역", scale: "town", category: "transport", categoryKo: "교통", relevance: 0.3, brief: "자동차 없이 이동 가능한 구역" },
  { id: 12, name: "Community of 7000", nameKo: "7000명의 커뮤니티", scale: "town", category: "community", categoryKo: "커뮤니티", relevance: 0.4, brief: "5,000~10,000명이 하나의 정치적 커뮤니티" },
  { id: 13, name: "Subculture Boundary", nameKo: "하위문화 경계", scale: "town", category: "community", categoryKo: "커뮤니티", relevance: 0.3, brief: "각 하위문화 사이에 명확한 경계가 있어야 한다" },
  { id: 14, name: "Identifiable Neighborhood", nameKo: "인식 가능한 동네", scale: "town", category: "community", categoryKo: "커뮤니티", relevance: 0.5, brief: "사람들이 소속감을 느끼는 동네 규모는 300~500가구", designEffect: { community: 3 } },
  { id: 15, name: "Neighborhood Boundary", nameKo: "동네 경계", scale: "town", category: "community", categoryKo: "커뮤니티", relevance: 0.4, brief: "동네의 경계가 명확해야 한다" },
  { id: 16, name: "Web of Public Transportation", nameKo: "대중교통 네트워크", scale: "town", category: "transport", categoryKo: "교통", relevance: 0.3, brief: "대중교통이 도시 전체를 연결해야 한다" },
  { id: 17, name: "Ring Roads", nameKo: "순환 도로", scale: "town", category: "transport", categoryKo: "교통", relevance: 0.2, brief: "도시 중심을 보호하는 순환도로" },
  { id: 18, name: "Network of Learning", nameKo: "학습 네트워크", scale: "town", category: "education", categoryKo: "교육", relevance: 0.2, brief: "분산된 학습 기회" },
  { id: 19, name: "Web of Shopping", nameKo: "쇼핑 네트워크", scale: "town", category: "commerce", categoryKo: "상업", relevance: 0.4, brief: "상점이 걸어서 갈 수 있는 거리에 분포" },
  { id: 20, name: "Mini-Buses", nameKo: "소형 버스", scale: "town", category: "transport", categoryKo: "교통", relevance: 0.1, brief: "마을 내 소형 셔틀 운행" },
  { id: 21, name: "Four-Story Limit", nameKo: "4층 제한", scale: "town", category: "density", categoryKo: "밀도", relevance: 0.8, brief: "건물은 4층을 넘지 않아야 한다. 고층 건물은 인간 소외를 만든다", designEffect: { floors: -2 } },
  { id: 22, name: "Nine Per Cent Parking", nameKo: "9% 주차", scale: "town", category: "transport", categoryKo: "교통", relevance: 0.7, brief: "주차장은 전체 면적의 9%를 넘지 않아야 한다", designEffect: { efficiency: -2 } },
  { id: 23, name: "Parallel Roads", nameKo: "평행 도로", scale: "town", category: "transport", categoryKo: "교통", relevance: 0.3, brief: "주요 도로에 평행한 보조 도로" },
  { id: 24, name: "Sacred Sites", nameKo: "신성한 장소", scale: "town", category: "culture", categoryKo: "문화", relevance: 0.3, brief: "역사적·정서적 의미가 있는 장소를 보존" },
  { id: 25, name: "Access to Water", nameKo: "물에의 접근", scale: "town", category: "nature", categoryKo: "자연", relevance: 0.4, brief: "물가에 접근할 수 있어야 한다", designEffect: { nature: 2 } },
  { id: 26, name: "Life Cycle", nameKo: "삶의 순환", scale: "town", category: "community", categoryKo: "커뮤니티", relevance: 0.3, brief: "모든 연령대가 함께 사는 동네" },
  { id: 27, name: "Men and Women", nameKo: "남성과 여성", scale: "town", category: "community", categoryKo: "커뮤니티", relevance: 0.2, brief: "성별 균형이 있는 커뮤니티" },
  { id: 28, name: "Eccentric Nucleus", nameKo: "편심 핵", scale: "town", category: "urban", categoryKo: "도시 구조", relevance: 0.3, brief: "커뮤니티의 중심이 기하학적 중심에서 벗어나야 한다" },
  { id: 29, name: "Density Rings", nameKo: "밀도 링", scale: "town", category: "density", categoryKo: "밀도", relevance: 0.5, brief: "중심에서 멀어질수록 밀도가 낮아져야 한다", designEffect: { coverage: -3 } },
  { id: 30, name: "Activity Nodes", nameKo: "활동 노드", scale: "town", category: "urban", categoryKo: "도시 구조", relevance: 0.5, brief: "사람들이 자연스럽게 모이는 지점", designEffect: { community: 2 } },
  { id: 31, name: "Promenade", nameKo: "산책로", scale: "town", category: "public-space", categoryKo: "공공 공간", relevance: 0.5, brief: "걸으며 사람들을 만나는 산책로", designEffect: { community: 2, nature: 1 } },
  { id: 32, name: "Shopping Street", nameKo: "상가 거리", scale: "town", category: "commerce", categoryKo: "상업", relevance: 0.5, brief: "걸어서 쇼핑할 수 있는 거리", designEffect: { community: 2 } },
  { id: 33, name: "Night Life", nameKo: "야간 생활", scale: "town", category: "culture", categoryKo: "문화", relevance: 0.3, brief: "밤에도 활기 있는 거리" },
  { id: 34, name: "Interchange", nameKo: "환승", scale: "town", category: "transport", categoryKo: "교통", relevance: 0.2, brief: "교통 수단 간 환승이 쉬워야 한다" },
  { id: 35, name: "Household Mix", nameKo: "가구 혼합", scale: "town", category: "community", categoryKo: "커뮤니티", relevance: 0.6, brief: "다양한 가구 유형이 섞여야 한다", designEffect: { community: 3 } },
  { id: 36, name: "Degrees of Publicness", nameKo: "공공성의 단계", scale: "town", category: "public-space", categoryKo: "공공 공간", relevance: 0.8, brief: "공적 공간에서 사적 공간으로의 자연스러운 전이", designEffect: { privacy: 3, community: 2 } },
  { id: 37, name: "House Cluster", nameKo: "주택 군집", scale: "town", category: "housing", categoryKo: "주거", relevance: 0.8, brief: "8~12가구가 하나의 군집을 이루어야 한다", designEffect: { community: 4 } },
  { id: 38, name: "Row Houses", nameKo: "연립 주택", scale: "town", category: "housing", categoryKo: "주거", relevance: 0.7, brief: "연립주택은 가로를 활성화한다", designEffect: { community: 2 } },
  { id: 39, name: "Housing Hill", nameKo: "주거 언덕", scale: "town", category: "housing", categoryKo: "주거", relevance: 0.6, brief: "경사지에서 계단식 주거", designEffect: { nature: 2 } },
  { id: 40, name: "Old People Everywhere", nameKo: "어디에나 노인", scale: "town", category: "community", categoryKo: "커뮤니티", relevance: 0.4, brief: "노인이 고립되지 않는 동네" },
  { id: 41, name: "Work Community", nameKo: "직장 커뮤니티", scale: "town", category: "community", categoryKo: "커뮤니티", relevance: 0.3, brief: "일터에서도 커뮤니티가 형성되어야 한다" },
  { id: 42, name: "Industrial Ribbon", nameKo: "산업 리본", scale: "town", category: "urban", categoryKo: "도시 구조", relevance: 0.2, brief: "산업시설이 띠 형태로 배치" },
  { id: 43, name: "University as Marketplace", nameKo: "시장으로서의 대학", scale: "town", category: "education", categoryKo: "교육", relevance: 0.2, brief: "대학이 지역에 개방되어야 한다" },
  { id: 44, name: "Local Town Hall", nameKo: "동네 시청", scale: "town", category: "governance", categoryKo: "행정", relevance: 0.3, brief: "각 동네에 소규모 행정 공간" },
  { id: 45, name: "Necklace of Community Projects", nameKo: "커뮤니티 프로젝트의 목걸이", scale: "town", category: "community", categoryKo: "커뮤니티", relevance: 0.4, brief: "커뮤니티 시설이 연결되어야 한다" },
  { id: 46, name: "Market of Many Shops", nameKo: "많은 상점의 시장", scale: "town", category: "commerce", categoryKo: "상업", relevance: 0.4, brief: "소규모 독립 상점이 모인 시장" },
  { id: 47, name: "Health Center", nameKo: "건강 센터", scale: "town", category: "health", categoryKo: "건강", relevance: 0.3, brief: "걸어서 갈 수 있는 건강 시설" },
  { id: 48, name: "Housing in Between", nameKo: "사이의 주거", scale: "town", category: "housing", categoryKo: "주거", relevance: 0.5, brief: "상업과 주거가 섞여야 한다" },
  { id: 49, name: "Looped Local Roads", nameKo: "루프형 동네 도로", scale: "town", category: "transport", categoryKo: "교통", relevance: 0.4, brief: "통과 교통을 막는 루프형 도로" },
  { id: 50, name: "T Junctions", nameKo: "T자 교차로", scale: "town", category: "transport", categoryKo: "교통", relevance: 0.3, brief: "십자 교차로보다 T자가 안전하다" },
  { id: 51, name: "Green Streets", nameKo: "녹색 거리", scale: "town", category: "nature", categoryKo: "자연", relevance: 0.5, brief: "가로수가 있는 거리", designEffect: { nature: 3 } },
  { id: 52, name: "Network of Paths and Cars", nameKo: "보행로와 차로의 네트워크", scale: "town", category: "transport", categoryKo: "교통", relevance: 0.6, brief: "보행자와 차량의 동선 분리", designEffect: { privacy: 2 } },
  { id: 53, name: "Main Gateways", nameKo: "주요 관문", scale: "town", category: "urban", categoryKo: "도시 구조", relevance: 0.4, brief: "도시/동네의 입구를 표시하는 관문" },
  { id: 54, name: "Road Crossing", nameKo: "도로 횡단", scale: "town", category: "transport", categoryKo: "교통", relevance: 0.3, brief: "안전하고 편리한 횡단 시설" },
  { id: 55, name: "Raised Walk", nameKo: "높은 보행로", scale: "town", category: "transport", categoryKo: "교통", relevance: 0.3, brief: "차로보다 높은 보행자 도로" },
  { id: 56, name: "Bike Paths and Racks", nameKo: "자전거 도로와 거치대", scale: "town", category: "transport", categoryKo: "교통", relevance: 0.4, brief: "자전거 인프라" },
  { id: 57, name: "Children in the City", nameKo: "도시의 아이들", scale: "town", category: "community", categoryKo: "커뮤니티", relevance: 0.5, brief: "아이들이 안전하게 놀 수 있는 도시", designEffect: { community: 2 } },
  { id: 58, name: "Carnival", nameKo: "축제", scale: "town", category: "culture", categoryKo: "문화", relevance: 0.2, brief: "축제와 행사를 위한 공간" },
  { id: 59, name: "Quiet Backs", nameKo: "조용한 뒷길", scale: "town", category: "public-space", categoryKo: "공공 공간", relevance: 0.6, brief: "번화가 뒤편의 조용한 공간", designEffect: { privacy: 3 } },
  { id: 60, name: "Accessible Green", nameKo: "접근 가능한 녹지", scale: "town", category: "nature", categoryKo: "자연", relevance: 0.7, brief: "모든 집에서 3분 이내에 녹지 접근", designEffect: { nature: 4, openSpace: 3 } },
  { id: 61, name: "Small Public Squares", nameKo: "작은 공공 광장", scale: "town", category: "public-space", categoryKo: "공공 공간", relevance: 0.6, brief: "15~21m 크기의 작은 광장", designEffect: { community: 3 } },
  { id: 62, name: "High Places", nameKo: "높은 장소", scale: "town", category: "public-space", categoryKo: "공공 공간", relevance: 0.4, brief: "도시를 내려다볼 수 있는 높은 곳" },
  { id: 63, name: "Dancing in the Street", nameKo: "거리의 춤", scale: "town", category: "culture", categoryKo: "문화", relevance: 0.2, brief: "자발적 문화활동이 일어나는 거리" },
  { id: 64, name: "Pools and Streams", nameKo: "연못과 시내", scale: "town", category: "nature", categoryKo: "자연", relevance: 0.4, brief: "물을 가까이 경험할 수 있어야 한다", designEffect: { nature: 3 } },
  { id: 65, name: "Birth Places", nameKo: "출생의 장소", scale: "town", category: "health", categoryKo: "건강", relevance: 0.1, brief: "집에서 출산할 수 있는 환경" },
  { id: 66, name: "Holy Ground", nameKo: "신성한 땅", scale: "town", category: "culture", categoryKo: "문화", relevance: 0.2, brief: "동네에 정신적 의미가 있는 장소" },
  { id: 67, name: "Common Land", nameKo: "공유지", scale: "town", category: "public-space", categoryKo: "공공 공간", relevance: 0.7, brief: "이웃이 함께 사용하는 공유 공간", designEffect: { community: 4, openSpace: 3 } },
  { id: 68, name: "Connected Play", nameKo: "연결된 놀이", scale: "town", category: "community", categoryKo: "커뮤니티", relevance: 0.5, brief: "놀이 공간이 생활 동선과 연결", designEffect: { community: 2 } },
  { id: 69, name: "Public Outdoor Room", nameKo: "공공 야외실", scale: "town", category: "public-space", categoryKo: "공공 공간", relevance: 0.6, brief: "벽과 지붕이 있는 야외 공공 공간", designEffect: { community: 3 } },
  { id: 70, name: "Grave Sites", nameKo: "묘지", scale: "town", category: "culture", categoryKo: "문화", relevance: 0.1, brief: "생활 속의 묘지" },
  { id: 71, name: "Still Water", nameKo: "고요한 물", scale: "town", category: "nature", categoryKo: "자연", relevance: 0.4, brief: "연못, 분수 등 고요한 수공간", designEffect: { nature: 3 } },
  { id: 72, name: "Local Sports", nameKo: "동네 운동", scale: "town", category: "health", categoryKo: "건강", relevance: 0.4, brief: "걸어서 갈 수 있는 운동 시설" },
  { id: 73, name: "Adventure Playground", nameKo: "모험 놀이터", scale: "town", category: "community", categoryKo: "커뮤니티", relevance: 0.4, brief: "아이들이 스스로 만드는 놀이 공간" },
  { id: 74, name: "Animals", nameKo: "동물", scale: "town", category: "nature", categoryKo: "자연", relevance: 0.3, brief: "동네에 동물이 있어야 한다" },
  { id: 75, name: "The Family", nameKo: "가족", scale: "town", category: "community", categoryKo: "커뮤니티", relevance: 0.4, brief: "가족 단위 생활을 지원하는 환경" },
  { id: 76, name: "House for a Small Family", nameKo: "소가족의 집", scale: "town", category: "housing", categoryKo: "주거", relevance: 0.6, brief: "소가족에게 맞는 주거 크기" },
  { id: 77, name: "House for a Couple", nameKo: "부부의 집", scale: "town", category: "housing", categoryKo: "주거", relevance: 0.5, brief: "부부를 위한 적절한 공간" },
  { id: 78, name: "House for One Person", nameKo: "1인 가구의 집", scale: "town", category: "housing", categoryKo: "주거", relevance: 0.5, brief: "혼자 사는 사람을 위한 주거" },
  { id: 79, name: "Your Own Home", nameKo: "자기만의 집", scale: "town", category: "housing", categoryKo: "주거", relevance: 0.6, brief: "모든 사람이 자기 소유감을 느끼는 집", designEffect: { privacy: 3 } },
  { id: 80, name: "Self-Governing Workshops", nameKo: "자치 작업장", scale: "town", category: "community", categoryKo: "커뮤니티", relevance: 0.2, brief: "소규모 자치 작업장" },
  { id: 81, name: "Small Services Without Red Tape", nameKo: "관료제 없는 소규모 서비스", scale: "town", category: "governance", categoryKo: "행정", relevance: 0.2, brief: "간소한 행정의 소규모 서비스" },
  { id: 82, name: "Office Connections", nameKo: "사무실 연결", scale: "town", category: "community", categoryKo: "커뮤니티", relevance: 0.3, brief: "사무 공간의 유기적 연결" },
  { id: 83, name: "Master and Apprentices", nameKo: "장인과 도제", scale: "town", category: "education", categoryKo: "교육", relevance: 0.1, brief: "도제 교육 시스템" },
  { id: 84, name: "Teenage Society", nameKo: "청소년 사회", scale: "town", category: "community", categoryKo: "커뮤니티", relevance: 0.3, brief: "청소년 독자적 활동 공간" },
  { id: 85, name: "Shopfront Schools", nameKo: "가게형 학교", scale: "town", category: "education", categoryKo: "교육", relevance: 0.2, brief: "동네에 녹아든 소규모 학교" },
  { id: 86, name: "Children's Home", nameKo: "아이들의 집", scale: "town", category: "community", categoryKo: "커뮤니티", relevance: 0.3, brief: "아이들이 안전하게 독립하는 공간" },
  { id: 87, name: "Individually Owned Shops", nameKo: "개인 상점", scale: "town", category: "commerce", categoryKo: "상업", relevance: 0.6, brief: "체인점이 아닌 개인 소유 상점이 가로를 활성화", designEffect: { community: 3 } },
  { id: 88, name: "Street Cafe", nameKo: "거리 카페", scale: "town", category: "commerce", categoryKo: "상업", relevance: 0.5, brief: "거리에 면한 카페", designEffect: { community: 2 } },
  { id: 89, name: "Corner Grocery", nameKo: "모퉁이 식료품점", scale: "town", category: "commerce", categoryKo: "상업", relevance: 0.4, brief: "동네 모퉁이의 작은 가게" },
  { id: 90, name: "Beer Hall", nameKo: "주점", scale: "town", category: "commerce", categoryKo: "상업", relevance: 0.2, brief: "동네 사교 공간" },
  { id: 91, name: "Travelers' Inn", nameKo: "여행자의 숙소", scale: "town", category: "commerce", categoryKo: "상업", relevance: 0.1, brief: "여행자를 위한 숙소" },
  { id: 92, name: "Bus Stop", nameKo: "버스 정류장", scale: "town", category: "transport", categoryKo: "교통", relevance: 0.3, brief: "편안한 버스 정류장" },
  { id: 93, name: "Food Stands", nameKo: "길거리 음식", scale: "town", category: "commerce", categoryKo: "상업", relevance: 0.3, brief: "길거리 음식 가판대" },
  { id: 94, name: "Sleeping in Public", nameKo: "공공 장소에서의 수면", scale: "town", category: "public-space", categoryKo: "공공 공간", relevance: 0.2, brief: "공공 장소에서 잠깐 쉴 수 있는 곳" },

  // ═══════════════════════════════════════════
  // BUILDINGS (95-204)
  // ═══════════════════════════════════════════
  { id: 95, name: "Building Complex", nameKo: "건물 복합체", scale: "building", category: "massing", categoryKo: "매스", relevance: 0.9, brief: "하나의 큰 건물보다 작은 건물들의 복합체가 더 살아있다", designEffect: { coverage: -3, community: 3 } },
  { id: 96, name: "Number of Stories", nameKo: "층수", scale: "building", category: "massing", categoryKo: "매스", relevance: 1.0, brief: "건물의 층수는 주변 맥락에 맞아야 한다", designEffect: { floors: 0 } },
  { id: 97, name: "Shielded Parking", nameKo: "차폐된 주차", scale: "building", category: "parking", categoryKo: "주차", relevance: 0.8, brief: "주차장이 건물과 보행로 사이에 노출되지 않아야 한다", designEffect: { privacy: 2, efficiency: -1 } },
  { id: 98, name: "Circulation Realms", nameKo: "순환 영역", scale: "building", category: "circulation", categoryKo: "동선", relevance: 0.8, brief: "건물 내 동선이 명확한 영역으로 구분되어야 한다" },
  { id: 99, name: "Main Building", nameKo: "주 건물", scale: "building", category: "massing", categoryKo: "매스", relevance: 0.8, brief: "부지에서 가장 중요한 건물이 명확해야 한다" },
  { id: 100, name: "Pedestrian Street", nameKo: "보행자 거리", scale: "building", category: "circulation", categoryKo: "동선", relevance: 0.7, brief: "차 없는 보행자 전용 거리", designEffect: { community: 3, privacy: -1 } },
  { id: 101, name: "Building Thoroughfare", nameKo: "건물 통로", scale: "building", category: "circulation", categoryKo: "동선", relevance: 0.6, brief: "건물을 관통하는 공공 통로" },
  { id: 102, name: "Family of Entrances", nameKo: "입구의 가족", scale: "building", category: "entrance", categoryKo: "진입", relevance: 0.7, brief: "각 세대/공간이 고유한 입구를 가져야 한다", designEffect: { privacy: 3 } },
  { id: 103, name: "Small Parking Lots", nameKo: "소규모 주차장", scale: "building", category: "parking", categoryKo: "주차", relevance: 0.8, brief: "대규모 주차장 대신 분산된 소규모 주차", designEffect: { efficiency: -2, nature: 2 } },
  { id: 104, name: "Site Repair", nameKo: "부지 보수", scale: "building", category: "site", categoryKo: "대지", relevance: 0.9, brief: "건물을 부지의 가장 나쁜 부분에 짓고 좋은 부분을 보존한다", designEffect: { nature: 4 } },
  { id: 105, name: "South Facing Outdoors", nameKo: "남향 외부공간", scale: "building", category: "orientation", categoryKo: "향", relevance: 1.0, brief: "외부 공간은 반드시 남향이어야 한다", designEffect: { nature: 3, openSpace: 2 } },
  { id: 106, name: "Positive Outdoor Space", nameKo: "긍정적 외부공간", scale: "building", category: "outdoor", categoryKo: "외부공간", relevance: 1.0, brief: "외부 공간이 건물에 둘러싸여 방처럼 느껴져야 한다", designEffect: { openSpace: 4, community: 2 } },
  { id: 107, name: "Wings of Light", nameKo: "빛의 날개", scale: "building", category: "massing", categoryKo: "매스", relevance: 0.9, brief: "건물 폭이 좁아야 (6.5m 이내) 모든 방에 자연광이 들어온다", designEffect: { coverage: -5, nature: 4 } },
  { id: 108, name: "Connected Buildings", nameKo: "연결된 건물", scale: "building", category: "massing", categoryKo: "매스", relevance: 0.7, brief: "건물들이 통로로 연결되어야 한다" },
  { id: 109, name: "Long Thin House", nameKo: "길고 얇은 집", scale: "building", category: "massing", categoryKo: "매스", relevance: 0.8, brief: "남북으로 긴 얇은 건물이 채광에 유리하다", designEffect: { coverage: -3, nature: 3 } },
  { id: 110, name: "Main Entrance", nameKo: "주 출입구", scale: "building", category: "entrance", categoryKo: "진입", relevance: 0.9, brief: "주 출입구가 명확하고 눈에 잘 띄어야 한다" },
  { id: 111, name: "Half-Hidden Garden", nameKo: "반쯤 숨겨진 정원", scale: "building", category: "outdoor", categoryKo: "외부공간", relevance: 0.8, brief: "길에서 살짝 엿보이는 정원", designEffect: { privacy: 3, nature: 3 } },
  { id: 112, name: "Entrance Transition", nameKo: "진입 전이공간", scale: "building", category: "entrance", categoryKo: "진입", relevance: 0.9, brief: "바깥에서 안으로의 점진적 전이 공간이 필요하다", designEffect: { privacy: 4, community: 1 } },
  { id: 113, name: "Car Connection", nameKo: "차량 연결", scale: "building", category: "parking", categoryKo: "주차", relevance: 0.6, brief: "차에서 집까지의 동선이 편안해야 한다" },
  { id: 114, name: "Hierarchy of Open Space", nameKo: "오픈 스페이스의 위계", scale: "building", category: "outdoor", categoryKo: "외부공간", relevance: 0.9, brief: "공적→반공적→반사적→사적 외부공간의 단계", designEffect: { privacy: 4, community: 3, openSpace: 3 } },
  { id: 115, name: "Courtyards Which Live", nameKo: "살아있는 중정", scale: "building", category: "outdoor", categoryKo: "외부공간", relevance: 1.0, brief: "중정은 사방이 완전히 닫히면 안 된다. 한쪽이 열려야 살아있다", designEffect: { community: 4, openSpace: 4, nature: 3 } },
  { id: 116, name: "Cascade of Roofs", nameKo: "지붕의 폭포", scale: "building", category: "roof", categoryKo: "지붕", relevance: 0.7, brief: "큰 지붕에서 작은 지붕으로 자연스럽게 내려가야 한다" },
  { id: 117, name: "Sheltering Roof", nameKo: "보호하는 지붕", scale: "building", category: "roof", categoryKo: "지붕", relevance: 0.7, brief: "깊은 처마가 건물을 감싸야 한다" },
  { id: 118, name: "Roof Garden", nameKo: "옥상 정원", scale: "building", category: "outdoor", categoryKo: "외부공간", relevance: 0.8, brief: "옥상을 정원으로 활용해야 한다", designEffect: { nature: 4, openSpace: 3 } },
  { id: 119, name: "Arcades", nameKo: "아케이드", scale: "building", category: "circulation", categoryKo: "동선", relevance: 0.6, brief: "비를 피할 수 있는 아케이드 통로" },
  { id: 120, name: "Paths and Goals", nameKo: "경로와 목적지", scale: "building", category: "circulation", categoryKo: "동선", relevance: 0.7, brief: "모든 경로는 명확한 목적지로 향해야 한다" },
  { id: 121, name: "Path Shape", nameKo: "경로의 형태", scale: "building", category: "circulation", categoryKo: "동선", relevance: 0.6, brief: "보행로의 폭과 형태가 중요하다" },
  { id: 122, name: "Building Fronts", nameKo: "건물 전면", scale: "building", category: "facade", categoryKo: "입면", relevance: 0.8, brief: "건물 전면이 길에 면해야 한다" },
  { id: 123, name: "Pedestrian Density", nameKo: "보행자 밀도", scale: "building", category: "circulation", categoryKo: "동선", relevance: 0.5, brief: "적절한 보행자 밀도가 거리를 활기차게 만든다" },
  { id: 124, name: "Activity Pockets", nameKo: "활동 포켓", scale: "building", category: "outdoor", categoryKo: "외부공간", relevance: 0.7, brief: "작은 활동 공간이 통로변에 있어야 한다", designEffect: { community: 3 } },
  { id: 125, name: "Stair Seats", nameKo: "계단 좌석", scale: "building", category: "circulation", categoryKo: "동선", relevance: 0.5, brief: "계단이 앉을 수 있는 공간이 되어야 한다" },
  { id: 126, name: "Something Roughly in the Middle", nameKo: "중앙의 무언가", scale: "building", category: "outdoor", categoryKo: "외부공간", relevance: 0.6, brief: "공공 공간 중앙에 사람을 끌어들이는 요소", designEffect: { community: 2 } },
  { id: 127, name: "Intimacy Gradient", nameKo: "친밀도 구배", scale: "building", category: "spatial", categoryKo: "공간 구성", relevance: 1.0, brief: "입구에서 안쪽으로 갈수록 점점 더 사적인 공간이 되어야 한다", designEffect: { privacy: 5 } },
  { id: 128, name: "Indoor Sunlight", nameKo: "실내 햇살", scale: "building", category: "light", categoryKo: "빛", relevance: 0.9, brief: "모든 방에 직사광선이 최소 2시간 들어와야 한다", designEffect: { nature: 3 } },
  { id: 129, name: "Common Areas at the Heart", nameKo: "중심의 공용 공간", scale: "building", category: "spatial", categoryKo: "공간 구성", relevance: 0.9, brief: "가족/커뮤니티의 공용 공간이 건물 중심에 있어야 한다", designEffect: { community: 4 } },
  { id: 130, name: "Entrance Room", nameKo: "현관", scale: "building", category: "entrance", categoryKo: "진입", relevance: 0.8, brief: "현관이 방처럼 넉넉해야 한다" },
  { id: 131, name: "The Flow Through Rooms", nameKo: "방을 통한 흐름", scale: "building", category: "spatial", categoryKo: "공간 구성", relevance: 0.7, brief: "방과 방이 복도가 아닌 서로를 통해 연결" },
  { id: 132, name: "Short Passages", nameKo: "짧은 통로", scale: "building", category: "circulation", categoryKo: "동선", relevance: 0.6, brief: "복도는 짧고 빛이 들어야 한다" },
  { id: 133, name: "Staircase as a Stage", nameKo: "무대로서의 계단", scale: "building", category: "circulation", categoryKo: "동선", relevance: 0.6, brief: "계단이 건물의 사회적 무대가 되어야 한다" },
  { id: 134, name: "Zen View", nameKo: "선(禪)의 조망", scale: "building", category: "view", categoryKo: "조망", relevance: 0.8, brief: "좋은 전망은 한 번에 보이지 않고 점진적으로 드러나야 한다" },
  { id: 135, name: "Tapestry of Light and Dark", nameKo: "빛과 어둠의 태피스트리", scale: "building", category: "light", categoryKo: "빛", relevance: 0.7, brief: "밝은 곳과 어두운 곳이 교차해야 한다" },
  { id: 136, name: "Couple's Realm", nameKo: "부부의 영역", scale: "building", category: "spatial", categoryKo: "공간 구성", relevance: 0.5, brief: "부부만의 사적 공간" },
  { id: 137, name: "Children's Realm", nameKo: "아이들의 영역", scale: "building", category: "spatial", categoryKo: "공간 구성", relevance: 0.5, brief: "아이들만의 놀이/학습 공간" },
  { id: 138, name: "Sleeping to the East", nameKo: "동쪽으로 잠자기", scale: "building", category: "orientation", categoryKo: "향", relevance: 0.7, brief: "침실은 동쪽에 배치하여 아침 햇살을 받아야 한다" },
  { id: 139, name: "Farmhouse Kitchen", nameKo: "농가형 주방", scale: "building", category: "spatial", categoryKo: "공간 구성", relevance: 0.6, brief: "주방이 가족 생활의 중심이 되어야 한다" },
  { id: 140, name: "Private Terrace on the Street", nameKo: "길에 면한 사적 테라스", scale: "building", category: "outdoor", categoryKo: "외부공간", relevance: 0.8, brief: "길에 면하면서도 사적인 테라스", designEffect: { privacy: 2, community: 2 } },
  { id: 141, name: "A Room of One's Own", nameKo: "자기만의 방", scale: "building", category: "spatial", categoryKo: "공간 구성", relevance: 0.7, brief: "모든 사람에게 자기만의 공간이 필요하다", designEffect: { privacy: 4 } },
  { id: 142, name: "Sequence of Sitting Spaces", nameKo: "앉을 공간의 연속", scale: "building", category: "spatial", categoryKo: "공간 구성", relevance: 0.6, brief: "다양한 앉을 공간이 연속적으로 있어야 한다" },
  { id: 143, name: "Bed Cluster", nameKo: "침실 군집", scale: "building", category: "spatial", categoryKo: "공간 구성", relevance: 0.5, brief: "침실이 하나의 군집을 이루어야 한다" },
  { id: 144, name: "Bathing Room", nameKo: "목욕실", scale: "building", category: "spatial", categoryKo: "공간 구성", relevance: 0.4, brief: "넉넉하고 쾌적한 목욕 공간" },
  { id: 145, name: "Bulk Storage", nameKo: "대용량 수납", scale: "building", category: "spatial", categoryKo: "공간 구성", relevance: 0.4, brief: "충분한 수납 공간" },
  { id: 146, name: "Flexible Office Space", nameKo: "유연한 사무 공간", scale: "building", category: "spatial", categoryKo: "공간 구성", relevance: 0.5, brief: "변경 가능한 사무 공간 배치" },
  { id: 147, name: "Communal Eating", nameKo: "공동 식사", scale: "building", category: "spatial", categoryKo: "공간 구성", relevance: 0.6, brief: "함께 식사하는 공간", designEffect: { community: 3 } },
  { id: 148, name: "Small Work Groups", nameKo: "소규모 작업 그룹", scale: "building", category: "spatial", categoryKo: "공간 구성", relevance: 0.4, brief: "5~8명의 소규모 작업 공간" },
  { id: 149, name: "Reception Welcomes You", nameKo: "환영하는 접수처", scale: "building", category: "entrance", categoryKo: "진입", relevance: 0.4, brief: "따뜻하게 맞이하는 입구" },
  { id: 150, name: "A Place to Wait", nameKo: "기다리는 곳", scale: "building", category: "spatial", categoryKo: "공간 구성", relevance: 0.4, brief: "편안하게 기다릴 수 있는 장소" },
  { id: 151, name: "Small Meeting Rooms", nameKo: "소규모 회의실", scale: "building", category: "spatial", categoryKo: "공간 구성", relevance: 0.4, brief: "6~8명 규모의 아늑한 회의 공간" },
  { id: 152, name: "Half-Private Office", nameKo: "반사적 사무실", scale: "building", category: "spatial", categoryKo: "공간 구성", relevance: 0.5, brief: "완전히 닫히지도 열리지도 않은 사무 공간" },
  { id: 153, name: "Rooms to Rent", nameKo: "임대 공간", scale: "building", category: "spatial", categoryKo: "공간 구성", relevance: 0.4, brief: "유연하게 임대 가능한 공간" },
  { id: 154, name: "Teenager's Cottage", nameKo: "청소년 별채", scale: "building", category: "spatial", categoryKo: "공간 구성", relevance: 0.3, brief: "청소년을 위한 반독립 공간" },
  { id: 155, name: "Old Age Cottage", nameKo: "노인 별채", scale: "building", category: "spatial", categoryKo: "공간 구성", relevance: 0.4, brief: "노인을 위한 반독립 공간", designEffect: { community: 2 } },
  { id: 156, name: "Settled Work", nameKo: "정착된 일", scale: "building", category: "spatial", categoryKo: "공간 구성", relevance: 0.3, brief: "집에서 일할 수 있는 공간" },
  { id: 157, name: "Home Workshop", nameKo: "집 작업장", scale: "building", category: "spatial", categoryKo: "공간 구성", relevance: 0.3, brief: "취미와 작업을 위한 공간" },
  { id: 158, name: "Open Stairs", nameKo: "열린 계단", scale: "building", category: "circulation", categoryKo: "동선", relevance: 0.7, brief: "계단이 외부에 노출되어 사회적 공간이 되어야 한다", designEffect: { community: 2 } },
  { id: 159, name: "Light on Two Sides of Every Room", nameKo: "방의 양면 채광", scale: "building", category: "light", categoryKo: "빛", relevance: 0.9, brief: "모든 방에 두 방향 이상의 창이 있어야 한다", designEffect: { coverage: -3, nature: 4 } },
  { id: 160, name: "Building Edge", nameKo: "건물의 가장자리", scale: "building", category: "outdoor", categoryKo: "외부공간", relevance: 0.8, brief: "건물과 외부 사이에 전이 공간이 있어야 한다", designEffect: { community: 2, openSpace: 2 } },
  { id: 161, name: "Sunny Place", nameKo: "햇볕 드는 자리", scale: "building", category: "outdoor", categoryKo: "외부공간", relevance: 0.8, brief: "외부에 반드시 햇볕이 드는 자리가 있어야 한다", designEffect: { nature: 3 } },
  { id: 162, name: "North Face", nameKo: "북측면", scale: "building", category: "orientation", categoryKo: "향", relevance: 0.7, brief: "북쪽 면은 두껍고 닫혀야 한다" },
  { id: 163, name: "Outdoor Room", nameKo: "야외 방", scale: "building", category: "outdoor", categoryKo: "외부공간", relevance: 0.9, brief: "벽이나 격자로 둘러싸인 야외 공간이 방처럼 느껴져야 한다", designEffect: { openSpace: 4, nature: 3 } },
  { id: 164, name: "Street Windows", nameKo: "거리를 향한 창", scale: "building", category: "facade", categoryKo: "입면", relevance: 0.7, brief: "거리를 내려다볼 수 있는 창", designEffect: { community: 2 } },
  { id: 165, name: "Opening to the Street", nameKo: "거리로의 개방", scale: "building", category: "facade", categoryKo: "입면", relevance: 0.7, brief: "건물이 거리에 열려 있어야 한다" },
  { id: 166, name: "Gallery Surround", nameKo: "갤러리 둘레길", scale: "building", category: "circulation", categoryKo: "동선", relevance: 0.6, brief: "2층 이상에서 외부 복도/발코니가 둘러싸야 한다" },
  { id: 167, name: "Six-Foot Balcony", nameKo: "1.8m 발코니", scale: "building", category: "outdoor", categoryKo: "외부공간", relevance: 0.8, brief: "발코니가 최소 1.8m 깊이여야 실제로 사용한다", designEffect: { openSpace: 2 } },
  { id: 168, name: "Connection to the Earth", nameKo: "대지와의 연결", scale: "building", category: "site", categoryKo: "대지", relevance: 0.8, brief: "1층이 대지와 직접 연결되어야 한다", designEffect: { nature: 3 } },
  { id: 169, name: "Terraced Slope", nameKo: "계단식 경사", scale: "building", category: "site", categoryKo: "대지", relevance: 0.8, brief: "경사지에서 건물을 계단식으로 배치", designEffect: { nature: 2 } },
  { id: 170, name: "Fruit Trees", nameKo: "과일나무", scale: "building", category: "nature", categoryKo: "자연", relevance: 0.6, brief: "정원에 과일나무를 심어야 한다", designEffect: { nature: 3 } },
  { id: 171, name: "Tree Places", nameKo: "나무가 있는 곳", scale: "building", category: "nature", categoryKo: "자연", relevance: 0.8, brief: "나무 아래에 앉을 수 있는 공간", designEffect: { nature: 4, community: 2 } },
  { id: 172, name: "Garden Growing Wild", nameKo: "자연스러운 정원", scale: "building", category: "nature", categoryKo: "자연", relevance: 0.7, brief: "정원은 자연스럽게 자라야 한다", designEffect: { nature: 4 } },
  { id: 173, name: "Garden Wall", nameKo: "정원 담장", scale: "building", category: "outdoor", categoryKo: "외부공간", relevance: 0.7, brief: "정원을 둘러싸는 낮은 담장", designEffect: { privacy: 3 } },
  { id: 174, name: "Trellised Walk", nameKo: "격자 보행로", scale: "building", category: "outdoor", categoryKo: "외부공간", relevance: 0.6, brief: "덩굴로 덮인 보행로" },
  { id: 175, name: "Greenhouse", nameKo: "온실", scale: "building", category: "nature", categoryKo: "자연", relevance: 0.5, brief: "작은 온실이 있으면 생활이 풍요로워진다" },
  { id: 176, name: "Garden Seat", nameKo: "정원 좌석", scale: "building", category: "outdoor", categoryKo: "외부공간", relevance: 0.6, brief: "정원에 앉을 곳이 있어야 한다" },
  { id: 177, name: "Vegetable Garden", nameKo: "텃밭", scale: "building", category: "nature", categoryKo: "자연", relevance: 0.6, brief: "채소를 기를 수 있는 텃밭", designEffect: { nature: 3, community: 2 } },
  { id: 178, name: "Compost", nameKo: "퇴비", scale: "building", category: "nature", categoryKo: "자연", relevance: 0.3, brief: "퇴비 공간" },
  { id: 179, name: "Alcoves", nameKo: "알코브", scale: "building", category: "spatial", categoryKo: "공간 구성", relevance: 0.7, brief: "큰 방 안에 작은 오목한 공간이 있어야 한다", designEffect: { privacy: 3 } },
  { id: 180, name: "Window Place", nameKo: "창가 자리", scale: "building", category: "spatial", categoryKo: "공간 구성", relevance: 0.8, brief: "창가에 앉을 수 있는 넓은 자리", designEffect: { nature: 2 } },
  { id: 181, name: "The Fire", nameKo: "불", scale: "building", category: "spatial", categoryKo: "공간 구성", relevance: 0.5, brief: "벽난로 또는 불이 가족을 모은다" },
  { id: 182, name: "Eating Atmosphere", nameKo: "식사 분위기", scale: "building", category: "spatial", categoryKo: "공간 구성", relevance: 0.5, brief: "식사 공간은 아늑하고 편안해야 한다" },
  { id: 183, name: "Workspace Enclosure", nameKo: "작업 공간 둘러싸기", scale: "building", category: "spatial", categoryKo: "공간 구성", relevance: 0.5, brief: "작업 공간이 적절히 둘러싸여야 한다" },
  { id: 184, name: "Cooking Layout", nameKo: "조리대 배치", scale: "building", category: "spatial", categoryKo: "공간 구성", relevance: 0.4, brief: "주방 조리대의 효율적 배치" },
  { id: 185, name: "Sitting Circle", nameKo: "둘러앉기", scale: "building", category: "spatial", categoryKo: "공간 구성", relevance: 0.6, brief: "의자가 원형으로 배치되어야 대화가 일어난다", designEffect: { community: 3 } },
  { id: 186, name: "Communal Sleeping", nameKo: "공동 취침", scale: "building", category: "spatial", categoryKo: "공간 구성", relevance: 0.2, brief: "아이들이 함께 자는 공간" },
  { id: 187, name: "Marriage Bed", nameKo: "부부 침대", scale: "building", category: "spatial", categoryKo: "공간 구성", relevance: 0.3, brief: "부부 침실의 중요성" },
  { id: 188, name: "Bed Alcove", nameKo: "침대 알코브", scale: "building", category: "spatial", categoryKo: "공간 구성", relevance: 0.5, brief: "침대가 오목한 공간에 있어야 한다" },
  { id: 189, name: "Dressing Rooms", nameKo: "탈의실", scale: "building", category: "spatial", categoryKo: "공간 구성", relevance: 0.3, brief: "옷 입는 공간이 별도로 있어야 한다" },
  { id: 190, name: "Ceiling Height Variety", nameKo: "다양한 천장 높이", scale: "building", category: "spatial", categoryKo: "공간 구성", relevance: 0.7, brief: "방마다 천장 높이가 달라야 한다" },
  { id: 191, name: "The Shape of Indoor Space", nameKo: "실내 공간의 형태", scale: "building", category: "spatial", categoryKo: "공간 구성", relevance: 0.6, brief: "방의 형태가 정사각형이 아닌 유기적이어야 한다" },
  { id: 192, name: "Windows Overlooking Life", nameKo: "삶을 내려다보는 창", scale: "building", category: "view", categoryKo: "조망", relevance: 0.8, brief: "창에서 사람들의 활동이 보여야 한다", designEffect: { community: 2 } },
  { id: 193, name: "Half-Open Wall", nameKo: "반쯤 열린 벽", scale: "building", category: "spatial", categoryKo: "공간 구성", relevance: 0.5, brief: "방 사이에 반쯤 열린 벽" },
  { id: 194, name: "Interior Windows", nameKo: "내부 창", scale: "building", category: "spatial", categoryKo: "공간 구성", relevance: 0.5, brief: "실내에도 방과 방 사이에 창이 있어야 한다" },
  { id: 195, name: "Staircase Volume", nameKo: "계단 볼륨", scale: "building", category: "circulation", categoryKo: "동선", relevance: 0.5, brief: "계단이 독립된 공간감을 가져야 한다" },
  { id: 196, name: "Corner Doors", nameKo: "모서리 문", scale: "building", category: "spatial", categoryKo: "공간 구성", relevance: 0.4, brief: "문이 방의 모서리에 있어야 한다" },
  { id: 197, name: "Thick Walls", nameKo: "두꺼운 벽", scale: "building", category: "construction-b", categoryKo: "구조", relevance: 0.6, brief: "벽이 두꺼워 선반·창가석 등을 만들 수 있어야 한다" },
  { id: 198, name: "Closets Between Rooms", nameKo: "방 사이 벽장", scale: "building", category: "spatial", categoryKo: "공간 구성", relevance: 0.4, brief: "방 사이에 수납 공간이 있어야 한다" },
  { id: 199, name: "Sunny Counter", nameKo: "햇볕 드는 조리대", scale: "building", category: "spatial", categoryKo: "공간 구성", relevance: 0.5, brief: "주방 조리대에 햇살이 들어야 한다" },
  { id: 200, name: "Open Shelves", nameKo: "열린 선반", scale: "building", category: "spatial", categoryKo: "공간 구성", relevance: 0.4, brief: "닫힌 수납보다 열린 선반이 생활감을 만든다" },
  { id: 201, name: "Waist-High Shelf", nameKo: "허리 높이 선반", scale: "building", category: "spatial", categoryKo: "공간 구성", relevance: 0.3, brief: "허리 높이의 선반은 방을 구분하면서도 연결한다" },
  { id: 202, name: "Built-in Seats", nameKo: "붙박이 좌석", scale: "building", category: "spatial", categoryKo: "공간 구성", relevance: 0.5, brief: "건물에 내장된 좌석" },
  { id: 203, name: "Child Caves", nameKo: "아이들의 동굴", scale: "building", category: "spatial", categoryKo: "공간 구성", relevance: 0.4, brief: "아이들이 숨을 수 있는 작은 공간" },
  { id: 204, name: "Secret Place", nameKo: "비밀 장소", scale: "building", category: "spatial", categoryKo: "공간 구성", relevance: 0.4, brief: "비밀스러운 자기만의 장소", designEffect: { privacy: 3 } },

  // ═══════════════════════════════════════════
  // CONSTRUCTION (205-253)
  // ═══════════════════════════════════════════
  { id: 205, name: "Structure Follows Social Spaces", nameKo: "구조는 사회적 공간을 따른다", scale: "construction", category: "structure", categoryKo: "구조", relevance: 0.7, brief: "구조 시스템이 사회적 공간 배치를 따라야 한다" },
  { id: 206, name: "Efficient Structure", nameKo: "효율적 구조", scale: "construction", category: "structure", categoryKo: "구조", relevance: 0.6, brief: "구조가 효율적이어야 한다", designEffect: { efficiency: 3 } },
  { id: 207, name: "Good Materials", nameKo: "좋은 재료", scale: "construction", category: "material", categoryKo: "재료", relevance: 0.5, brief: "자연적이고 질 좋은 재료" },
  { id: 208, name: "Gradual Stiffening", nameKo: "점진적 경화", scale: "construction", category: "structure", categoryKo: "구조", relevance: 0.3, brief: "건물이 점차 견고해지는 공법" },
  { id: 209, name: "Roof Layout", nameKo: "지붕 배치", scale: "construction", category: "roof", categoryKo: "지붕", relevance: 0.6, brief: "지붕 형태가 아래 공간을 반영해야 한다" },
  { id: 210, name: "Floor and Ceiling Layout", nameKo: "바닥과 천장 배치", scale: "construction", category: "structure", categoryKo: "구조", relevance: 0.5, brief: "바닥과 천장의 구조가 공간을 반영" },
  { id: 211, name: "Thickening the Outer Walls", nameKo: "외벽 두껍게", scale: "construction", category: "envelope", categoryKo: "외피", relevance: 0.5, brief: "외벽을 두껍게 하여 다양한 기능을 수용" },
  { id: 212, name: "Columns at the Corners", nameKo: "모서리 기둥", scale: "construction", category: "structure", categoryKo: "구조", relevance: 0.4, brief: "기둥이 방의 모서리에 위치" },
  { id: 213, name: "Final Column Distribution", nameKo: "최종 기둥 배치", scale: "construction", category: "structure", categoryKo: "구조", relevance: 0.4, brief: "기둥의 최종 위치 결정" },
  { id: 214, name: "Root Foundations", nameKo: "뿌리 기초", scale: "construction", category: "structure", categoryKo: "구조", relevance: 0.3, brief: "나무 뿌리처럼 유기적인 기초" },
  { id: 215, name: "Ground Floor Slab", nameKo: "1층 슬래브", scale: "construction", category: "structure", categoryKo: "구조", relevance: 0.4, brief: "1층 바닥 구조" },
  { id: 216, name: "Box Columns", nameKo: "상자형 기둥", scale: "construction", category: "structure", categoryKo: "구조", relevance: 0.3, brief: "속이 빈 상자형 기둥" },
  { id: 217, name: "Perimeter Beams", nameKo: "외주부 보", scale: "construction", category: "structure", categoryKo: "구조", relevance: 0.3, brief: "건물 외곽을 따라 돌아가는 보" },
  { id: 218, name: "Wall Membranes", nameKo: "벽 멤브레인", scale: "construction", category: "envelope", categoryKo: "외피", relevance: 0.3, brief: "얇은 벽 구조" },
  { id: 219, name: "Floor-Ceiling Vaults", nameKo: "바닥-천장 볼트", scale: "construction", category: "structure", categoryKo: "구조", relevance: 0.3, brief: "볼트 형태의 바닥/천장" },
  { id: 220, name: "Roof Vaults", nameKo: "지붕 볼트", scale: "construction", category: "roof", categoryKo: "지붕", relevance: 0.3, brief: "볼트 형태의 지붕" },
  { id: 221, name: "Natural Doors and Windows", nameKo: "자연스러운 문과 창", scale: "construction", category: "opening", categoryKo: "개구부", relevance: 0.6, brief: "문과 창의 위치가 자연스러워야 한다" },
  { id: 222, name: "Low Sill", nameKo: "낮은 창턱", scale: "construction", category: "opening", categoryKo: "개구부", relevance: 0.5, brief: "창턱이 낮아야 앉아서도 밖을 볼 수 있다" },
  { id: 223, name: "Deep Reveals", nameKo: "깊은 창틀", scale: "construction", category: "opening", categoryKo: "개구부", relevance: 0.5, brief: "창틀이 깊어야 빛이 부드러워진다" },
  { id: 224, name: "Low Doorway", nameKo: "낮은 출입구", scale: "construction", category: "opening", categoryKo: "개구부", relevance: 0.3, brief: "통과 시 몸을 약간 숙여야 하는 낮은 출입구" },
  { id: 225, name: "Frames as Thickened Edges", nameKo: "두꺼운 테두리로서의 프레임", scale: "construction", category: "opening", categoryKo: "개구부", relevance: 0.4, brief: "문/창 프레임이 두꺼워야 한다" },
  { id: 226, name: "Column Place", nameKo: "기둥 장소", scale: "construction", category: "structure", categoryKo: "구조", relevance: 0.4, brief: "기둥이 공간의 장소감을 만들어야 한다" },
  { id: 227, name: "Column Connection", nameKo: "기둥 접합", scale: "construction", category: "structure", categoryKo: "구조", relevance: 0.3, brief: "기둥과 보의 접합 방식" },
  { id: 228, name: "Stair Vault", nameKo: "계단 볼트", scale: "construction", category: "structure", categoryKo: "구조", relevance: 0.3, brief: "계단의 구조적 형태" },
  { id: 229, name: "Duct Space", nameKo: "덕트 공간", scale: "construction", category: "service", categoryKo: "설비", relevance: 0.3, brief: "설비 덕트를 위한 공간" },
  { id: 230, name: "Radiant Heat", nameKo: "복사 난방", scale: "construction", category: "service", categoryKo: "설비", relevance: 0.4, brief: "복사열이 가장 자연스러운 난방" },
  { id: 231, name: "Dormer Windows", nameKo: "도머 창", scale: "construction", category: "opening", categoryKo: "개구부", relevance: 0.4, brief: "지붕에서 돌출된 작은 창" },
  { id: 232, name: "Roof Caps", nameKo: "지붕 꼭대기", scale: "construction", category: "roof", categoryKo: "지붕", relevance: 0.3, brief: "지붕 꼭대기의 마감" },
  { id: 233, name: "Floor Surface", nameKo: "바닥 마감", scale: "construction", category: "finish", categoryKo: "마감", relevance: 0.4, brief: "부드럽고 따뜻한 바닥" },
  { id: 234, name: "Lapped Outside Walls", nameKo: "겹친 외벽", scale: "construction", category: "envelope", categoryKo: "외피", relevance: 0.3, brief: "외벽의 겹침 마감" },
  { id: 235, name: "Soft Inside Walls", nameKo: "부드러운 내벽", scale: "construction", category: "finish", categoryKo: "마감", relevance: 0.4, brief: "내벽이 부드러워야 한다" },
  { id: 236, name: "Windows Which Open Wide", nameKo: "활짝 열리는 창", scale: "construction", category: "opening", categoryKo: "개구부", relevance: 0.6, brief: "창이 크게 열려야 한다" },
  { id: 237, name: "Solid Doors with Glass", nameKo: "유리가 있는 견고한 문", scale: "construction", category: "opening", categoryKo: "개구부", relevance: 0.4, brief: "문에 유리가 있어 안이 보여야 한다" },
  { id: 238, name: "Filtered Light", nameKo: "걸러진 빛", scale: "construction", category: "light", categoryKo: "빛", relevance: 0.5, brief: "직사광선이 걸러져야 한다" },
  { id: 239, name: "Small Panes", nameKo: "작은 유리판", scale: "construction", category: "opening", categoryKo: "개구부", relevance: 0.4, brief: "큰 유리보다 작은 유리판" },
  { id: 240, name: "Half-Inch Trim", nameKo: "1.3cm 트림", scale: "construction", category: "finish", categoryKo: "마감", relevance: 0.2, brief: "재료 접합부의 얇은 트림" },
  { id: 241, name: "Seat Spots", nameKo: "좌석 지점", scale: "construction", category: "furniture", categoryKo: "가구", relevance: 0.4, brief: "앉고 싶은 자리에 좌석 제공" },
  { id: 242, name: "Front Door Bench", nameKo: "현관 벤치", scale: "construction", category: "furniture", categoryKo: "가구", relevance: 0.5, brief: "현관 앞에 앉을 벤치" },
  { id: 243, name: "Sitting Wall", nameKo: "앉을 수 있는 벽", scale: "construction", category: "furniture", categoryKo: "가구", relevance: 0.5, brief: "정원의 앉을 수 있는 낮은 벽" },
  { id: 244, name: "Canvas Roofs", nameKo: "천 지붕", scale: "construction", category: "outdoor", categoryKo: "외부공간", relevance: 0.4, brief: "가벼운 천 지붕의 야외 공간" },
  { id: 245, name: "Raised Flowers", nameKo: "높인 화단", scale: "construction", category: "nature", categoryKo: "자연", relevance: 0.5, brief: "눈높이에 가까운 높인 화단", designEffect: { nature: 2 } },
  { id: 246, name: "Climbing Plants", nameKo: "덩굴 식물", scale: "construction", category: "nature", categoryKo: "자연", relevance: 0.5, brief: "벽을 타는 덩굴 식물", designEffect: { nature: 3 } },
  { id: 247, name: "Paving With Cracks Between", nameKo: "틈이 있는 포장", scale: "construction", category: "outdoor", categoryKo: "외부공간", relevance: 0.4, brief: "포장 사이에 풀이 자랄 틈", designEffect: { nature: 2 } },
  { id: 248, name: "Soft Tile and Brick", nameKo: "부드러운 타일과 벽돌", scale: "construction", category: "finish", categoryKo: "마감", relevance: 0.3, brief: "부드러운 질감의 재료" },
  { id: 249, name: "Ornament", nameKo: "장식", scale: "construction", category: "finish", categoryKo: "마감", relevance: 0.4, brief: "건물에 의미 있는 장식" },
  { id: 250, name: "Warm Colors", nameKo: "따뜻한 색상", scale: "construction", category: "finish", categoryKo: "마감", relevance: 0.4, brief: "따뜻한 톤의 외관 색상" },
  { id: 251, name: "Different Chairs", nameKo: "다른 의자들", scale: "construction", category: "furniture", categoryKo: "가구", relevance: 0.3, brief: "다양한 종류의 의자" },
  { id: 252, name: "Pools of Light", nameKo: "빛의 웅덩이", scale: "construction", category: "light", categoryKo: "빛", relevance: 0.5, brief: "각 활동 영역에 독립된 조명", designEffect: { privacy: 2 } },
  { id: 253, name: "Things from Your Life", nameKo: "삶의 사물들", scale: "construction", category: "finish", categoryKo: "마감", relevance: 0.3, brief: "개인적 의미가 있는 물건들을 놓을 공간" },
]

// 카테고리별 그룹핑
export const PATTERN_CATEGORIES = {
  town: ['regional', 'community', 'transport', 'education', 'commerce', 'density', 'urban', 'public-space', 'culture', 'nature', 'health', 'governance', 'housing'],
  building: ['massing', 'parking', 'circulation', 'entrance', 'site', 'orientation', 'outdoor', 'roof', 'facade', 'spatial', 'light', 'view', 'nature', 'construction-b'],
  construction: ['structure', 'material', 'envelope', 'opening', 'service', 'finish', 'furniture', 'roof', 'outdoor', 'nature', 'light'],
}

// 건축설계앱에 가장 관련도 높은 핵심 패턴 (relevance >= 0.8)
export const CORE_PATTERNS = ALEXANDER_PATTERNS.filter(p => p.relevance >= 0.8)

// 스케일별 패턴 수
export const PATTERN_COUNTS = {
  town: ALEXANDER_PATTERNS.filter(p => p.scale === 'town').length,      // 94
  building: ALEXANDER_PATTERNS.filter(p => p.scale === 'building').length, // 110
  construction: ALEXANDER_PATTERNS.filter(p => p.scale === 'construction').length, // 49
  total: 253,
  core: CORE_PATTERNS.length,
}

// 가치관 → 패턴 매칭
export function getMatchingPatterns(values: { profitVsQuality: number, privacyVsCommunity: number, efficiencyVsSpace: number }): AlexanderPattern[] {
  return ALEXANDER_PATTERNS.filter(p => {
    if (!p.designEffect) return false
    const e = p.designEffect
    
    // 수익 vs 품질
    if (values.profitVsQuality > 60 && (e.nature && e.nature > 2 || e.openSpace && e.openSpace > 2)) return true
    if (values.profitVsQuality < 40 && (e.efficiency && e.efficiency > 2)) return true
    
    // 프라이버시 vs 커뮤니티
    if (values.privacyVsCommunity > 60 && e.community && e.community > 2) return true
    if (values.privacyVsCommunity < 40 && e.privacy && e.privacy > 2) return true
    
    // 효율 vs 여유
    if (values.efficiencyVsSpace > 60 && (e.openSpace && e.openSpace > 2 || e.nature && e.nature > 2)) return true
    if (values.efficiencyVsSpace < 40 && e.efficiency && e.efficiency > 2) return true
    
    return false
  })
}

// 배치안 유형 → 관련 패턴
export function getPatternsForLayoutType(type: string): AlexanderPattern[] {
  const typePatternMap: Record<string, number[]> = {
    'tower': [21, 96, 107, 128, 159, 192],
    'plate': [38, 105, 106, 109, 122, 159, 160, 167],
    'courtyard': [67, 106, 111, 114, 115, 163, 171],
    'L-shape': [59, 97, 112, 127, 140, 160],
    'mixed': [48, 87, 88, 95, 100, 165],
    'garden': [60, 104, 111, 170, 171, 172, 177],
    'terrace': [39, 118, 140, 167, 169],
  }
  const ids = typePatternMap[type] || typePatternMap['plate'] || []
  return ALEXANDER_PATTERNS.filter(p => ids.includes(p.id))
}
