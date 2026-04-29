/**
 * 지역별 분양가·공사비 자동 적용 모듈
 * 
 * 데이터 출처: 국토부 실거래가 공개시스템, 한국부동산원 통계 기반 추정치
 * 시군구코드(5자리) 기반 매칭
 * 
 * 참고: 실제 사업 시에는 해당 지역 최근 3개월 실거래가를 반드시 확인해야 합니다.
 */

export interface RegionalPricing {
  salesPricePerM2: number      // 분양가 (원/㎡)
  constructionCostPerM2: number // 공사비 (원/㎡)
  regionName: string           // 지역명
  tier: 'premium' | 'high' | 'mid' | 'standard' | 'economy'
  confidence: 'high' | 'medium' | 'low'
  note: string                 // 참고 사항
}

// 서울 시군구별 상세 데이터
const SEOUL_PRICING: Record<string, Omit<RegionalPricing, 'confidence'>> = {
  // === 프리미엄 (분양가 13M+/㎡) ===
  '11680': { salesPricePerM2: 16000000, constructionCostPerM2: 3200000, regionName: '강남구', tier: 'premium', note: '국내 최고가 지역, 재건축 프리미엄 포함' },
  '11650': { salesPricePerM2: 15000000, constructionCostPerM2: 3200000, regionName: '서초구', tier: 'premium', note: '강남권 핵심, 반포·잠원 중심' },
  '11710': { salesPricePerM2: 14000000, constructionCostPerM2: 3000000, regionName: '송파구', tier: 'premium', note: '잠실·문정 재건축 활발' },
  '11170': { salesPricePerM2: 14000000, constructionCostPerM2: 3000000, regionName: '용산구', tier: 'premium', note: '한남·이태원, 개발 호재 지역' },

  // === 고가 (분양가 10~13M/㎡) ===
  '11440': { salesPricePerM2: 12000000, constructionCostPerM2: 2900000, regionName: '마포구', tier: 'high', note: '마포·용산 개발축, 상암·공덕' },
  '11200': { salesPricePerM2: 11500000, constructionCostPerM2: 2900000, regionName: '성동구', tier: 'high', note: '성수·왕십리 재개발' },
  '11500': { salesPricePerM2: 11000000, constructionCostPerM2: 2800000, regionName: '광진구', tier: 'high', note: '건대·아차산 인근' },
  '11560': { salesPricePerM2: 11000000, constructionCostPerM2: 2800000, regionName: '영등포구', tier: 'high', note: '여의도·문래 중심' },
  '11110': { salesPricePerM2: 11500000, constructionCostPerM2: 2900000, regionName: '종로구', tier: 'high', note: '도심 역세권, 상업·주거 혼합' },
  '11140': { salesPricePerM2: 11000000, constructionCostPerM2: 2900000, regionName: '중구', tier: 'high', note: '도심 핵심, 상업지구' },
  '11590': { salesPricePerM2: 10500000, constructionCostPerM2: 2800000, regionName: '동작구', tier: 'high', note: '흑석·상도 재개발' },

  // === 중상 (분양가 8~10M/㎡) ===
  '11410': { salesPricePerM2: 9500000, constructionCostPerM2: 2700000, regionName: '서대문구', tier: 'mid', note: '연세대·신촌 인근' },
  '11620': { salesPricePerM2: 9500000, constructionCostPerM2: 2700000, regionName: '관악구', tier: 'mid', note: '서울대·신림 정비사업' },
  '11470': { salesPricePerM2: 9000000, constructionCostPerM2: 2700000, regionName: '양천구', tier: 'mid', note: '목동 학군, 신정 재개발' },
  '11530': { salesPricePerM2: 9000000, constructionCostPerM2: 2700000, regionName: '구로구', tier: 'mid', note: 'G밸리·오류동' },
  '11380': { salesPricePerM2: 9000000, constructionCostPerM2: 2700000, regionName: '은평구', tier: 'mid', note: '은평뉴타운, 수색역세권' },
  '11230': { salesPricePerM2: 9000000, constructionCostPerM2: 2700000, regionName: '동대문구', tier: 'mid', note: '이문·휘경 재개발' },
  '11260': { salesPricePerM2: 8500000, constructionCostPerM2: 2700000, regionName: '중랑구', tier: 'mid', note: '망우·면목 정비사업' },
  '11350': { salesPricePerM2: 8500000, constructionCostPerM2: 2700000, regionName: '노원구', tier: 'mid', note: '대규모 아파트 밀집' },
  '11290': { salesPricePerM2: 8500000, constructionCostPerM2: 2600000, regionName: '성북구', tier: 'mid', note: '길음·장위 재개발' },
  '11305': { salesPricePerM2: 8500000, constructionCostPerM2: 2600000, regionName: '강북구', tier: 'mid', note: '미아·번동 정비사업' },
  '11320': { salesPricePerM2: 8500000, constructionCostPerM2: 2600000, regionName: '도봉구', tier: 'mid', note: '창동·상계 역세권' },

  // === 표준 (분양가 7~8.5M/㎡) ===
  '11740': { salesPricePerM2: 9500000, constructionCostPerM2: 2700000, regionName: '강동구', tier: 'mid', note: '둔촌주공·고덕 재건축' },
  '11545': { salesPricePerM2: 8000000, constructionCostPerM2: 2600000, regionName: '금천구', tier: 'standard', note: 'G밸리 산업단지 인근' },
}

// 경기도 시군별
const GYEONGGI_PRICING: Record<string, Omit<RegionalPricing, 'confidence'>> = {
  '41135': { salesPricePerM2: 10000000, constructionCostPerM2: 2700000, regionName: '성남시 분당구', tier: 'high', note: '판교·정자 테크노밸리' },
  '41131': { salesPricePerM2: 8500000, constructionCostPerM2: 2600000, regionName: '성남시 수정구', tier: 'mid', note: '위례신도시 인접' },
  '41133': { salesPricePerM2: 8000000, constructionCostPerM2: 2600000, regionName: '성남시 중원구', tier: 'mid', note: '산성역·태평역 역세권' },
  '41111': { salesPricePerM2: 8500000, constructionCostPerM2: 2600000, regionName: '수원시 장안구', tier: 'mid', note: '수원역세권' },
  '41117': { salesPricePerM2: 9000000, constructionCostPerM2: 2600000, regionName: '수원시 영통구', tier: 'mid', note: '광교·영통 신도시' },
  '41390': { salesPricePerM2: 9000000, constructionCostPerM2: 2600000, regionName: '과천시', tier: 'high', note: '과천지식정보타운' },
  '41271': { salesPricePerM2: 8000000, constructionCostPerM2: 2500000, regionName: '안양시 만안구', tier: 'mid', note: '안양역 재개발' },
  '41173': { salesPricePerM2: 7500000, constructionCostPerM2: 2500000, regionName: '용인시 수지구', tier: 'mid', note: '수지·죽전 학군' },
  '41461': { salesPricePerM2: 8000000, constructionCostPerM2: 2500000, regionName: '고양시 덕양구', tier: 'mid', note: '삼송·향동 택지' },
  '41463': { salesPricePerM2: 8500000, constructionCostPerM2: 2600000, regionName: '고양시 일산동구', tier: 'mid', note: '일산 신도시' },
  '41465': { salesPricePerM2: 8000000, constructionCostPerM2: 2500000, regionName: '고양시 일산서구', tier: 'mid', note: '킨텍스·일산호수' },
  '41570': { salesPricePerM2: 7000000, constructionCostPerM2: 2400000, regionName: '의정부시', tier: 'standard', note: 'GTX-C 개발 호재' },
  '41360': { salesPricePerM2: 7500000, constructionCostPerM2: 2500000, regionName: '남양주시', tier: 'standard', note: '다산·왕숙 신도시' },
  '41250': { salesPricePerM2: 7000000, constructionCostPerM2: 2400000, regionName: '군포시', tier: 'standard', note: '산본 신도시' },
  '41150': { salesPricePerM2: 7500000, constructionCostPerM2: 2500000, regionName: '부천시', tier: 'standard', note: '중동·상동 재개발' },
  '41195': { salesPricePerM2: 7500000, constructionCostPerM2: 2500000, regionName: '하남시', tier: 'mid', note: '미사·감일 신도시' },
  '41550': { salesPricePerM2: 7000000, constructionCostPerM2: 2400000, regionName: '김포시', tier: 'standard', note: '한강신도시' },
  '41590': { salesPricePerM2: 8500000, constructionCostPerM2: 2600000, regionName: '화성시', tier: 'mid', note: '동탄 신도시 1·2' },
}

// 광역시 기본값
const METRO_PRICING: Record<string, Omit<RegionalPricing, 'confidence'>> = {
  '26': { salesPricePerM2: 7500000, constructionCostPerM2: 2400000, regionName: '부산광역시', tier: 'standard', note: '해운대·수영 프리미엄' },
  '27': { salesPricePerM2: 6500000, constructionCostPerM2: 2300000, regionName: '대구광역시', tier: 'standard', note: '수성구 중심' },
  '28': { salesPricePerM2: 7000000, constructionCostPerM2: 2400000, regionName: '인천광역시', tier: 'standard', note: '송도·청라 중심' },
  '29': { salesPricePerM2: 5500000, constructionCostPerM2: 2200000, regionName: '광주광역시', tier: 'economy', note: '첨단지구 중심' },
  '30': { salesPricePerM2: 6000000, constructionCostPerM2: 2300000, regionName: '대전광역시', tier: 'standard', note: '유성·세종 인접' },
  '31': { salesPricePerM2: 5500000, constructionCostPerM2: 2200000, regionName: '울산광역시', tier: 'economy', note: '산업도시' },
  '36': { salesPricePerM2: 6500000, constructionCostPerM2: 2300000, regionName: '세종특별자치시', tier: 'standard', note: '행정수도 프리미엄' },
}

// 도 기본값
const PROVINCE_PRICING: Record<string, Omit<RegionalPricing, 'confidence'>> = {
  '43': { salesPricePerM2: 5000000, constructionCostPerM2: 2100000, regionName: '충청북도', tier: 'economy', note: '청주 중심' },
  '44': { salesPricePerM2: 5000000, constructionCostPerM2: 2100000, regionName: '충청남도', tier: 'economy', note: '천안·아산 중심' },
  '45': { salesPricePerM2: 4500000, constructionCostPerM2: 2000000, regionName: '전북특별자치도', tier: 'economy', note: '전주 중심' },
  '46': { salesPricePerM2: 4500000, constructionCostPerM2: 2000000, regionName: '전라남도', tier: 'economy', note: '여수·순천 중심' },
  '47': { salesPricePerM2: 5000000, constructionCostPerM2: 2100000, regionName: '경상북도', tier: 'economy', note: '포항·경주 중심' },
  '48': { salesPricePerM2: 5500000, constructionCostPerM2: 2200000, regionName: '경상남도', tier: 'economy', note: '창원·김해 중심' },
  '50': { salesPricePerM2: 5000000, constructionCostPerM2: 2200000, regionName: '제주특별자치도', tier: 'economy', note: '관광지 프리미엄 변동 큼' },
  '51': { salesPricePerM2: 4500000, constructionCostPerM2: 2100000, regionName: '강원특별자치도', tier: 'economy', note: '춘천·원주 중심' },
}

/**
 * 시군구코드로 지역별 분양가·공사비 조회
 * @param sigunguCd 5자리 시군구코드 (예: 11680 = 강남구)
 * @param address 주소 문자열 (fallback용)
 */
export function getRegionalPricing(sigunguCd?: string, address?: string): RegionalPricing {
  const defaultPricing: RegionalPricing = {
    salesPricePerM2: 8000000,
    constructionCostPerM2: 2500000,
    regionName: '전국 평균',
    tier: 'standard',
    confidence: 'low',
    note: '시군구 정보 없음 — 전국 평균 단가 적용',
  }

  if (!sigunguCd && !address) return defaultPricing

  // 1. 시군구코드로 직접 매칭 (가장 정확)
  if (sigunguCd) {
    const code5 = sigunguCd.slice(0, 5)
    
    // 서울 (11xxx)
    if (code5.startsWith('11')) {
      const match = SEOUL_PRICING[code5]
      if (match) return { ...match, confidence: 'high' }
      // 서울이지만 세부 매칭 실패 → 서울 평균
      return { salesPricePerM2: 10000000, constructionCostPerM2: 2800000, regionName: '서울특별시', tier: 'mid', confidence: 'medium', note: '서울 평균 단가 적용' }
    }
    
    // 경기 (41xxx)
    if (code5.startsWith('41')) {
      const match = GYEONGGI_PRICING[code5]
      if (match) return { ...match, confidence: 'high' }
      return { salesPricePerM2: 7500000, constructionCostPerM2: 2500000, regionName: '경기도', tier: 'standard', confidence: 'medium', note: '경기도 평균 단가 적용' }
    }
    
    // 광역시 (2자리 매칭)
    const code2 = code5.slice(0, 2)
    const metro = METRO_PRICING[code2]
    if (metro) return { ...metro, confidence: 'medium' }
    
    // 도 (2자리 매칭)
    const province = PROVINCE_PRICING[code2]
    if (province) return { ...province, confidence: 'medium' }
  }

  // 2. 주소 문자열로 fallback 매칭
  if (address) {
    if (address.includes('강남구')) return { ...SEOUL_PRICING['11680']!, confidence: 'medium' }
    if (address.includes('서초구')) return { ...SEOUL_PRICING['11650']!, confidence: 'medium' }
    if (address.includes('송파구')) return { ...SEOUL_PRICING['11710']!, confidence: 'medium' }
    if (address.includes('용산구')) return { ...SEOUL_PRICING['11170']!, confidence: 'medium' }
    if (address.includes('마포구')) return { ...SEOUL_PRICING['11440']!, confidence: 'medium' }
    if (address.includes('성동구')) return { ...SEOUL_PRICING['11200']!, confidence: 'medium' }
    if (address.includes('영등포구')) return { ...SEOUL_PRICING['11560']!, confidence: 'medium' }
    
    if (address.includes('서울')) return { salesPricePerM2: 10000000, constructionCostPerM2: 2800000, regionName: '서울특별시', tier: 'mid', confidence: 'low', note: '서울 평균 단가 적용' }
    if (address.includes('분당') || address.includes('판교')) return { ...GYEONGGI_PRICING['41135']!, confidence: 'low' }
    if (address.includes('경기')) return { salesPricePerM2: 7500000, constructionCostPerM2: 2500000, regionName: '경기도', tier: 'standard', confidence: 'low', note: '경기도 평균 단가 적용' }
    if (address.includes('부산')) return { ...METRO_PRICING['26']!, confidence: 'low' }
    if (address.includes('대구')) return { ...METRO_PRICING['27']!, confidence: 'low' }
    if (address.includes('인천')) return { ...METRO_PRICING['28']!, confidence: 'low' }
    if (address.includes('세종')) return { ...METRO_PRICING['36']!, confidence: 'low' }
  }

  return defaultPricing
}

/**
 * 용도지역에 따른 분양가 보정 계수
 */
export function getZoneMultiplier(zoneType: string): number {
  switch (zoneType) {
    case 'commercial-central': return 1.3    // 중심상업: +30%
    case 'commercial-general': return 1.15   // 일반상업: +15%
    case 'commercial-neighborhood': return 1.05 // 근린상업: +5%
    case 'semi-residential': return 1.1      // 준주거: +10%
    case 'residential-3': return 1.0         // 제3종 일반주거
    case 'residential-2': return 0.95        // 제2종 일반주거
    case 'residential-1': return 0.9         // 제1종 일반주거
    case 'residential-exclusive-2': return 0.85 // 제2종 전용주거
    case 'residential-exclusive-1': return 0.8  // 제1종 전용주거
    default: return 1.0
  }
}

/**
 * 티어별 색상/뱃지
 */
export function getTierInfo(tier: RegionalPricing['tier']): { label: string; color: string; bgColor: string } {
  switch (tier) {
    case 'premium': return { label: '프리미엄', color: 'text-amber-400', bgColor: 'bg-amber-500/20' }
    case 'high': return { label: '고가', color: 'text-blue-400', bgColor: 'bg-blue-500/20' }
    case 'mid': return { label: '중상', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' }
    case 'standard': return { label: '표준', color: 'text-slate-400', bgColor: 'bg-slate-500/20' }
    case 'economy': return { label: '보통', color: 'text-gray-400', bgColor: 'bg-gray-500/20' }
  }
}
