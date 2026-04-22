// Demo projects for Archi-Scan dashboard
// These are reusable sample projects that showcase different scenarios

import type { SavedProject, ProjectSnapshot } from './project-storage'

// ============================================================================
// Demo Project Snapshots
// ============================================================================

const demoSnapshot1: ProjectSnapshot = {
  // 성수 수익형 타워형
  address: '서울 성동구 성수동2가 314-12',
  siteArea: 412,
  projectType: '도시형 생활주택/근생 복합',
  dateStr: new Date().toLocaleDateString('ko-KR'),
  docNumber: 'DEMO-2024-001',
  
  zoneType: '준공업지역',
  landUsePlan: '도시지역',
  roadAccess: '12m 도로 접면',
  
  regulation: {
    zoneType: '준공업지역',
    coverageRatio: 70,
    floorAreaRatio: 400,
    maxHeight: '제한없음',
    maxFloors: 15,
  },
  
  layouts: [
    {
      id: 1,
      name: '수익형 타워형',
      type: 'tower',
      description: '고층 타워형 배치로 세대수 극대화, 수익성 최적화',
      coverage: 58,
      units: 23,
      floors: 12,
      parking: 23,
      gfa: 1648,
      openSpace: 42,
      features: ['고층 랜드마크', '세대수 극대화', '효율적 코어', '조망 확보'],
      scores: { regulationCompliance: 88, profitability: 92, marketability: 85, feasibility: 90, overall: 86 },
      recommendation: {
        isRecommended: true,
        reasons: ['최대 용적률 활용', '임대수익 극대화', '랜드마크 효과'],
        warnings: ['일조권 검토 필요', '고층 시공비 증가'],
        strategyMatch: 95,
      },
      reasoning: {
        summary: '수익성 극대화 전략에 최적화된 배치안. 23세대 확보로 임대수익 극대화, 준공업지역 용적률 최대 활용.',
        regulationConsiderations: ['준공업지역 용적률 400% 적용', '일조권 확보 검토 필요'],
        profitabilityAdvantages: ['세대수 23세대로 극대화', '임대수익 최대화'],
        designFeatures: ['고층 타워형 배치', '효율적 코어 배치'],
        risksAndChallenges: ['고층 시공비 증가', '일조권 민원 가능성'],
      },
    },
    {
      id: 2,
      name: '중정형',
      type: 'courtyard',
      description: '중앙 정원을 품은 ㄷ자형 배치',
      coverage: 52,
      units: 18,
      floors: 8,
      parking: 18,
      gfa: 1284,
      openSpace: 48,
      features: ['중앙 정원', '커뮤니티 공간', '채광 우수'],
      scores: { regulationCompliance: 85, profitability: 78, marketability: 88, feasibility: 80, overall: 82 },
      recommendation: {
        isRecommended: false,
        reasons: ['중앙 정원 확보', '커뮤니티 공간 우수'],
        warnings: ['세대수 감소', '수익성 저하'],
        strategyMatch: 75,
      },
      reasoning: {
        summary: '중앙 정원을 품은 ㄷ자형 배치로 주거환경 우수.',
        regulationConsiderations: ['건폐율 52% 적용', '중정 조경 면적 확보'],
        profitabilityAdvantages: ['양호한 분양성', '커뮤니티 가치'],
        designFeatures: ['중앙 정원', 'ㄷ자형 배치'],
        risksAndChallenges: ['세대수 18세대로 감소', '수익성 다소 낮음'],
      },
    },
    {
      id: 3,
      name: '저층 분산형',
      type: 'cluster',
      description: '저층 분산 배치로 쾌적한 주거환경 조성',
      coverage: 45,
      units: 14,
      floors: 5,
      parking: 14,
      gfa: 927,
      openSpace: 55,
      features: ['저층 친환경', '넓은 정원', '프라이버시'],
      scores: { regulationCompliance: 90, profitability: 65, marketability: 92, feasibility: 72, overall: 78 },
      recommendation: {
        isRecommended: false,
        reasons: ['쾌적한 주거환경', '프라이버시 우수'],
        warnings: ['낮은 수익성', '세대수 최소화'],
        strategyMatch: 60,
      },
      reasoning: {
        summary: '저층 분산 배치로 쾌적한 주거환경 조성.',
        regulationConsiderations: ['건폐율 45% 적용', '저층 건축으로 일조권 유리'],
        profitabilityAdvantages: ['고급 분양 가능', '친환경 이미지'],
        designFeatures: ['분산 배치', '넓은 정원'],
        risksAndChallenges: ['수익성 낮음', '건축비 효율 저하'],
      },
    },
  ],
  
  selectedLayoutId: 1,
  recommendedLayoutId: 1,
  
  financials: {
    landCost: 1240000000,
    constructionCost: 824000000,
    otherCosts: 123600000,
    totalInvestment: 2187600000,
    projectedRevenue: 3097600000,
    profit: 910000000,
    roi: 4.5,
  },
  
  risks: [
    { title: '시장 리스크', items: ['성수동 임대시장 공급과잉 우려', '금리 상승에 따른 투자수익률 하락'] },
    { title: '인허가 리스크', items: ['일조권 분석 필요', '고층 건축 민원 가능성'] },
  ],
  
  conclusionText: '성수동 준공업지역의 입지와 용적률을 최대한 활용한 수익형 타워 배치안입니다. 23세대 확보로 안정적인 임대수익이 예상되며, ROI 4.5%로 투자 매력도가 높습니다.',
  recommendationType: 'positive',
}

const demoSnapshot2: ProjectSnapshot = {
  // 평창 저층 주거형
  address: '서울 종로구 평창동 180-4',
  siteArea: 698,
  projectType: '저층 공동주택',
  dateStr: new Date().toLocaleDateString('ko-KR'),
  docNumber: 'DEMO-2024-002',
  
  zoneType: '제1종 일반주거지역',
  landUsePlan: '도시지역',
  roadAccess: '6m 도로 접면',
  
  regulation: {
    zoneType: '제1종 일반주거지역',
    coverageRatio: 60,
    floorAreaRatio: 150,
    maxHeight: '4층 이하',
    maxFloors: 4,
  },
  
  layouts: [
    {
      id: 1,
      name: '프라이빗 중정형',
      type: 'private-courtyard',
      description: '프라이버시와 정원을 강조한 고급 저층 배치',
      coverage: 42,
      units: 5,
      floors: 3,
      parking: 6,
      gfa: 629,
      openSpace: 58,
      features: ['프라이버시 극대화', '개인 정원', '고급 마감', '자연 조망'],
      scores: { regulationCompliance: 92, profitability: 35, marketability: 95, feasibility: 60, overall: 70 },
      recommendation: {
        isRecommended: true,
        reasons: ['평창동 입지 특성 반영', '고급 주거 수요 대응', '최상의 주거 쾌적성'],
        warnings: ['낮은 수익성', '높은 토지비 부담', '장기 분양 리스크'],
        strategyMatch: 88,
      },
      reasoning: {
        summary: '고급 저층 주거 전략에 적합하나 수익성 검토 필요. 평창동 입지 특성 반영.',
        regulationConsiderations: ['제1종 일반주거지역 용적률 150% 적용', '4층 이하 높이 제한'],
        profitabilityAdvantages: ['고급 분양가 적용 가능', '희소성 있는 입지'],
        designFeatures: ['프라이버시 극대화', '개인 정원'],
        risksAndChallenges: ['ROI -69.7% 적자 예상', '장기 미분양 가능성'],
      },
    },
    {
      id: 2,
      name: '저층 테라스형',
      type: 'linear',
      description: '단차를 활용한 테라스 배치',
      coverage: 45,
      units: 6,
      floors: 3,
      parking: 7,
      gfa: 706,
      openSpace: 55,
      features: ['테라스 공간', '단차 활용', '조망 확보'],
      scores: { regulationCompliance: 88, profitability: 40, marketability: 90, feasibility: 65, overall: 72 },
      recommendation: {
        isRecommended: false,
        reasons: ['테라스 공간 활용', '조망 확보'],
        warnings: ['낮은 수익성', '단차 시공 비용'],
        strategyMatch: 75,
      },
      reasoning: {
        summary: '단차를 활용한 테라스 배치로 조망 확보.',
        regulationConsiderations: ['건폐율 45% 적용', '단차 처리 검토'],
        profitabilityAdvantages: ['테라스 프리미엄', '조망 프리미엄'],
        designFeatures: ['테라스 공간', '단차 활용'],
        risksAndChallenges: ['시공비 증가', '낮은 수익성'],
      },
    },
    {
      id: 3,
      name: '반상형',
      type: 'courtyard',
      description: '반개방형 중정을 가진 저층 배치',
      coverage: 48,
      units: 7,
      floors: 4,
      parking: 8,
      gfa: 838,
      openSpace: 52,
      features: ['반개방 중정', '세대수 확보', '효율적 배치'],
      scores: { regulationCompliance: 85, profitability: 48, marketability: 85, feasibility: 70, overall: 72 },
      recommendation: {
        isRecommended: false,
        reasons: ['세대수 확보', '효율적 배치'],
        warnings: ['수익성 여전히 낮음', '제한된 개발 밀도'],
        strategyMatch: 70,
      },
      reasoning: {
        summary: '반개방형 중정을 가진 저층 배치로 세대수 확보.',
        regulationConsiderations: ['건폐율 48% 적용', '높이 4층 적용'],
        profitabilityAdvantages: ['세대수 7세대 확보', '효율적 배치'],
        designFeatures: ['반개방 중정', '효율적 코어'],
        risksAndChallenges: ['수익성 낮음', '분양가 제한'],
      },
    },
  ],
  
  selectedLayoutId: 1,
  recommendedLayoutId: 1,
  
  financials: {
    landCost: 1396000000,
    constructionCost: 314500000,
    otherCosts: 78625000,
    totalInvestment: 1789125000,
    projectedRevenue: 1309125000,
    profit: -480000000,
    roi: -69.7,
  },
  
  risks: [
    { title: '수익성 리스크', items: ['높은 토지가격 대비 낮은 개발밀도', '분양가 상한제 적용 시 손실 확대'] },
    { title: '시장 리스크', items: ['고가 주택 수요 불확실성', '장기 미분양 가능성'] },
    { title: '규제 리스크', items: ['제1종 일반주거지역 용적률 제한', '높이 제한 4층'] },
  ],
  
  conclusionText: '평창동의 고급 저층 주거지 특성을 반영한 프라이빗 중정형 배치안입니다. 그러나 높은 토지비와 낮은 용적률로 인해 ROI -69.7%의 적자가 예상됩니다. 자가 거주 목적이 아닌 경우 사업 재검토가 필요합니다.',
  recommendationType: 'cautious',
}

const demoSnapshot3: ProjectSnapshot = {
  // 장위 보수적 시나리오형
  address: '서울 성북구 장위동 231-7',
  siteArea: 355,
  projectType: '소규모 공동주택',
  dateStr: new Date().toLocaleDateString('ko-KR'),
  docNumber: 'DEMO-2024-003',
  
  zoneType: '제2종 일반주거지역',
  landUsePlan: '도시지역',
  roadAccess: '8m 도로 접면',
  
  regulation: {
    zoneType: '제2종 일반주거지역',
    coverageRatio: 60,
    floorAreaRatio: 200,
    maxHeight: '7층 이하',
    maxFloors: 7,
  },
  
  layouts: [
    {
      id: 1,
      name: '슬림바형',
      type: 'slim-bar',
      description: '좁은 대지에 최적화된 슬림 바 형태 배치',
      coverage: 55,
      units: 11,
      floors: 6,
      parking: 11,
      gfa: 710,
      openSpace: 45,
      features: ['좁은 대지 최적화', '효율적 동선', '남향 배치'],
      scores: { regulationCompliance: 85, profitability: 58, marketability: 72, feasibility: 78, overall: 73 },
      recommendation: {
        isRecommended: false,
        reasons: ['좁은 대지 최적화', '효율적 동선'],
        warnings: ['보수적 수익률', '협소한 공용공간'],
        strategyMatch: 70,
      },
      reasoning: {
        summary: '좁은 대지에 최적화된 슬림 바 형태 배치.',
        regulationConsiderations: ['건폐율 55% 적용', '6층 높이 적용'],
        profitabilityAdvantages: ['11세대 확보', '남향 배치'],
        designFeatures: ['슬림 바 형태', '효율적 동선'],
        risksAndChallenges: ['보수적 ROI 1.1%', '공용공간 협소'],
      },
    },
    {
      id: 2,
      name: '코트형',
      type: 'courtyard',
      description: '소규모 중정을 품은 ㄷ자형 배치',
      coverage: 52,
      units: 10,
      floors: 5,
      parking: 10,
      gfa: 650,
      openSpace: 48,
      features: ['소규모 중정', '채광 확보', '커뮤니티'],
      scores: { regulationCompliance: 88, profitability: 62, marketability: 80, feasibility: 75, overall: 76 },
      recommendation: {
        isRecommended: true,
        reasons: ['균형 잡힌 배치', '중정 커뮤니티 공간', '안정적 수익성'],
        warnings: ['세대수 다소 적음', '보수적 수익률'],
        strategyMatch: 82,
      },
      reasoning: {
        summary: '안정적이고 균형 잡힌 배치안으로 보수적 투자자에게 적합.',
        regulationConsiderations: ['건폐율 52% 적용', '5층 높이 적용'],
        profitabilityAdvantages: ['중정 프리미엄', '커뮤니티 가치'],
        designFeatures: ['소규모 중정', 'ㄷ자형 배치'],
        risksAndChallenges: ['세대수 10세대로 감소', '보수적 수익률'],
      },
    },
    {
      id: 3,
      name: '계단식 저층형',
      type: 'linear',
      description: '단차를 활용한 계단식 저층 배치',
      coverage: 48,
      units: 8,
      floors: 4,
      parking: 8,
      gfa: 546,
      openSpace: 52,
      features: ['계단식 배치', '옥상 테라스', '저층 쾌적성'],
      scores: { regulationCompliance: 90, profitability: 52, marketability: 85, feasibility: 68, overall: 73 },
      recommendation: {
        isRecommended: false,
        reasons: ['계단식 배치 특색', '옥상 테라스'],
        warnings: ['낮은 수익성', '세대수 감소'],
        strategyMatch: 65,
      },
      reasoning: {
        summary: '단차를 활용한 계단식 저층 배치.',
        regulationConsiderations: ['건폐율 48% 적용', '4층 높이 적용'],
        profitabilityAdvantages: ['테라스 프리미엄', '저층 쾌적성'],
        designFeatures: ['계단식 배치', '옥상 테라스'],
        risksAndChallenges: ['세대수 8세대로 최소', '수익성 낮음'],
      },
    },
  ],
  
  selectedLayoutId: 1,
  recommendedLayoutId: 2,
  
  financials: {
    landCost: 710000000,
    constructionCost: 355000000,
    otherCosts: 53250000,
    totalInvestment: 1118250000,
    projectedRevenue: 1238250000,
    profit: 120000000,
    roi: 1.1,
  },
  
  risks: [
    { title: '수익성 리스크', items: ['보수적 ROI 1.1%', '금리 상승 시 수익성 악화'] },
    { title: '시장 리스크', items: ['장위뉴타운 공급물량 영향', '임대수요 불확실성'] },
  ],
  
  conclusionText: '장위동 소규모 대지에 최적화된 슬림바형 배치안입니다. 보수적 시나리오 기준 ROI 1.1%로 수익성이 낮으나, 코트형 배치 전환 시 수익성 개선 가능성이 있습니다. 신중한 검토 후 진행을 권장합니다.',
  recommendationType: 'conditional',
}

const demoSnapshot4: ProjectSnapshot = {
  // 답십리 협업 검토형
  address: '서울 동대문구 답십리동 497-22',
  siteArea: 524,
  projectType: '공동주택 신축사업',
  dateStr: new Date().toLocaleDateString('ko-KR'),
  docNumber: 'DEMO-2024-004',
  
  zoneType: '제3종 일반주거지역',
  landUsePlan: '도시지역',
  roadAccess: '10m 도로 접면',
  
  regulation: {
    zoneType: '제3종 일반주거지역',
    coverageRatio: 50,
    floorAreaRatio: 250,
    maxHeight: '제한없음',
    maxFloors: 12,
  },
  
  layouts: [
    {
      id: 1,
      name: '반상형',
      type: 'half-courtyard',
      description: '반개방 중정으로 채광과 통풍 확보',
      coverage: 48,
      units: 18,
      floors: 9,
      parking: 18,
      gfa: 1180,
      openSpace: 52,
      features: ['반개방 중정', '남동향 배치', '효율적 코어', '커뮤니티 공간'],
      scores: { regulationCompliance: 88, profitability: 78, marketability: 82, feasibility: 80, overall: 82 },
      recommendation: {
        isRecommended: true,
        reasons: ['균형 잡힌 수익성', '쾌적한 주거환경', '효율적 동선'],
        warnings: ['중정 관리 비용', '일부 세대 조망 제한'],
        strategyMatch: 88,
      },
      reasoning: {
        summary: '수익성과 주거 쾌적성의 균형을 갖춘 추천 배치안.',
        regulationConsiderations: ['제3종 일반주거지역 용적률 250% 적용', '건폐율 48% 적용'],
        profitabilityAdvantages: ['18세대 확보', 'ROI 3.2%'],
        designFeatures: ['반개방 중정', '남동향 배치'],
        risksAndChallenges: ['중정 관리 비용', '일부 조망 제한'],
      },
    },
    {
      id: 2,
      name: '수익형 타워형',
      type: 'tower',
      description: '세대수 극대화를 위한 타워형 배치',
      coverage: 45,
      units: 22,
      floors: 11,
      parking: 22,
      gfa: 1430,
      openSpace: 55,
      features: ['세대수 극대화', '고층 조망', '효율적 코어'],
      scores: { regulationCompliance: 82, profitability: 88, marketability: 72, feasibility: 85, overall: 82 },
      recommendation: {
        isRecommended: false,
        reasons: ['세대수 22세대 극대화', '수익성 최대화'],
        warnings: ['주거 쾌적성 저하', '일조권 검토'],
        strategyMatch: 80,
      },
      reasoning: {
        summary: '세대수 극대화를 위한 타워형 배치.',
        regulationConsiderations: ['용적률 최대 활용', '높이 제한 검토'],
        profitabilityAdvantages: ['세대수 극대화', '임대수익 최대'],
        designFeatures: ['타워형 배치', '고층 조망'],
        risksAndChallenges: ['일조권 민원', '주거 쾌적성 저하'],
      },
    },
    {
      id: 3,
      name: '중정형',
      type: 'courtyard',
      description: '완전한 중정을 품은 ㅁ자형 배치',
      coverage: 42,
      units: 15,
      floors: 7,
      parking: 15,
      gfa: 980,
      openSpace: 58,
      features: ['완전 중정', '커뮤니티 중심', '채광 우수'],
      scores: { regulationCompliance: 90, profitability: 68, marketability: 90, feasibility: 75, overall: 80 },
      recommendation: {
        isRecommended: false,
        reasons: ['완전 중정 확보', '커뮤니티 중심'],
        warnings: ['세대수 감소', '수익성 저하'],
        strategyMatch: 75,
      },
      reasoning: {
        summary: '완전한 중정을 품은 ㅁ자형 배치.',
        regulationConsiderations: ['건폐율 42% 적용', '중정 조경 확보'],
        profitabilityAdvantages: ['분양 프리미엄', '커뮤니티 가치'],
        designFeatures: ['완전 중정', '채광 우수'],
        risksAndChallenges: ['세대수 15세대로 감소', '수익성 저하'],
      },
    },
  ],
  
  selectedLayoutId: 1,
  recommendedLayoutId: 1,
  
  financials: {
    landCost: 1048000000,
    constructionCost: 590000000,
    otherCosts: 88500000,
    totalInvestment: 1726500000,
    projectedRevenue: 2266500000,
    profit: 540000000,
    roi: 3.2,
  },
  
  risks: [
    { title: '시장 리스크', items: ['답십리 재개발 지역 공급물량', '분양가 경쟁'] },
    { title: '인허가 리스크', items: ['주민 민원 가능성', '교통영향평가 검토'] },
  ],
  
  conclusionText: '답십리 제3종 일반주거지역의 용적률을 활용한 반상형 배치안입니다. 18세대 확보로 ROI 3.2%의 안정적 수익이 예상되며, 팀 협업을 통한 상세 검토가 진행 중입니다.',
  recommendationType: 'positive',
}

const demoSnapshot5: ProjectSnapshot = {
  // 길음 현장 시각자료형
  address: '서울 성북구 길음동 542-19',
  siteArea: 481,
  projectType: '공동주택 및 근생 복합',
  dateStr: new Date().toLocaleDateString('ko-KR'),
  docNumber: 'DEMO-2024-005',
  
  zoneType: '준주거지역',
  landUsePlan: '도시지역',
  roadAccess: '15m 도로 접면',
  
  regulation: {
    zoneType: '준주거지역',
    coverageRatio: 60,
    floorAreaRatio: 400,
    maxHeight: '제한없음',
    maxFloors: 15,
  },
  
  layouts: [
    {
      id: 1,
      name: '스트리트형',
      type: 'street',
      description: '상가와 주거가 조화된 스트리트형 배치',
      coverage: 55,
      units: 14,
      floors: 8,
      parking: 15,
      gfa: 1058,
      openSpace: 45,
      features: ['저층 근생', '스트리트 활성화', '주거 분리', '보행 친화'],
      scores: { regulationCompliance: 85, profitability: 75, marketability: 78, feasibility: 80, overall: 79 },
      recommendation: {
        isRecommended: false,
        reasons: ['스트리트 활성화', '보행 친화적 설계'],
        warnings: ['세대수 제한', '상가 공실 리스크'],
        strategyMatch: 75,
      },
      reasoning: {
        summary: '상가와 주거가 조화된 스트리트형 배치.',
        regulationConsiderations: ['준주거지역 용적률 400% 적용', '저층 근생 용도'],
        profitabilityAdvantages: ['스트리트 상가 임대수익', '주거 분리'],
        designFeatures: ['저층 근생', '스트리트 활성화'],
        risksAndChallenges: ['상가 공실 리스크', '세대수 14세대 제한'],
      },
    },
    {
      id: 2,
      name: '타워형',
      type: 'tower',
      description: '고층 타워형 주거 + 저층 근생 복합',
      coverage: 50,
      units: 20,
      floors: 12,
      parking: 21,
      gfa: 1540,
      openSpace: 50,
      features: ['세대수 극대화', '고층 조망', '근생 분리'],
      scores: { regulationCompliance: 82, profitability: 88, marketability: 72, feasibility: 85, overall: 82 },
      recommendation: {
        isRecommended: true,
        reasons: ['최대 용적률 활용', '임대수익 극대화', '랜드마크 효과'],
        warnings: ['일조권 검토 필요', '고층 시공비'],
        strategyMatch: 90,
      },
      reasoning: {
        summary: '수익성 극대화를 위한 최적 배치안.',
        regulationConsiderations: ['용적률 최대 활용', '높이 제한 없음'],
        profitabilityAdvantages: ['세대수 20세대 극대화', '임대수익 최대'],
        designFeatures: ['타워형 배치', '고층 조망'],
        risksAndChallenges: ['일조권 민원', '고층 시공비'],
      },
    },
    {
      id: 3,
      name: '코트형',
      type: 'courtyard',
      description: '중정 중심의 복합 배치',
      coverage: 48,
      units: 12,
      floors: 6,
      parking: 13,
      gfa: 866,
      openSpace: 52,
      features: ['중정 공간', '커뮤니티', '저층 근생'],
      scores: { regulationCompliance: 88, profitability: 68, marketability: 85, feasibility: 75, overall: 79 },
      recommendation: {
        isRecommended: false,
        reasons: ['중정 공간 확보', '커뮤니티 가치'],
        warnings: ['세대수 감소', '수익성 저하'],
        strategyMatch: 70,
      },
      reasoning: {
        summary: '중정 중심의 복합 배치.',
        regulationConsiderations: ['건폐율 48% 적용', '중정 조경 확보'],
        profitabilityAdvantages: ['분양 프리미엄', '커뮤니티 가치'],
        designFeatures: ['중정 공간', '저층 근생'],
        risksAndChallenges: ['세대수 12세대로 감소', '수익성 저하'],
      },
    },
  ],
  
  selectedLayoutId: 1,
  recommendedLayoutId: 2,
  
  financials: {
    landCost: 962000000,
    constructionCost: 529000000,
    otherCosts: 79350000,
    totalInvestment: 1570350000,
    projectedRevenue: 1950350000,
    profit: 380000000,
    roi: 2.4,
  },
  
  risks: [
    { title: '시장 리스크', items: ['길음역 인근 공급물량 증가', '상가 공실 리스크'] },
    { title: '인허가 리스크', items: ['근생 용도 규제', '주차장 확보'] },
  ],
  
  conclusionText: '길음동 준주거지역의 스트리트형 배치안입니다. 저층 근생과 상층 주거의 복합 개발로 ROI 2.4%가 예상됩니다. 현장 사진과 지도를 포함한 상세 분석 자료입니다.',
  recommendationType: 'conditional',
}

// ============================================================================
// Demo Projects Array
// ============================================================================

export const DEMO_PROJECTS: SavedProject[] = [
  {
    id: 'demo_seongsu_tower_001',
    name: '성수 수익형 타워형',
    address: '서울 성동구 성수동2가 314-12',
    siteArea: 412,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    data: demoSnapshot1,
  },
  {
    id: 'demo_pyeongchang_lowrise_002',
    name: '평창 저층 주거형',
    address: '서울 종로구 평창동 180-4',
    siteArea: 698,
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    data: demoSnapshot2,
  },
  {
    id: 'demo_jangwi_conservative_003',
    name: '장위 보수적 시나리오형',
    address: '서울 성북구 장위동 231-7',
    siteArea: 355,
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    data: demoSnapshot3,
  },
  {
    id: 'demo_dapsimni_collab_004',
    name: '답십리 협업 검토형',
    address: '서울 동대문구 답십리동 497-22',
    siteArea: 524,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    data: demoSnapshot4,
  },
  {
    id: 'demo_gileum_visual_005',
    name: '길음 현장 시각자료형',
    address: '서울 성북구 길음동 542-19',
    siteArea: 481,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    data: demoSnapshot5,
  },
]

// ============================================================================
// Demo Approval Data (for collaboration demo)
// ============================================================================

export const DEMO_APPROVALS: Record<string, {
  approvalState: {
    currentStatus: string
    history: Array<{
      action: string
      timestamp: string
      userId: string
      userName: string
      note: string
    }>
    lastUpdated: string
    submittedBy?: string
  }
  ownerId: string
  ownerName: string
}> = {
  'demo_dapsimni_collab_004': {
    approvalState: {
      currentStatus: 'under_review',
      history: [
        {
          action: 'submitted',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          userId: 'user_001',
          userName: '김대리',
          note: '초기 검토 요청드립니다.',
        },
        {
          action: 'review_started',
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          userId: 'user_002',
          userName: '박과장',
          note: '검토 시작합니다.',
        },
      ],
      lastUpdated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      submittedBy: '박과장',
    },
    ownerId: 'user_001',
    ownerName: '김대리',
  },
}

// ============================================================================
// Demo Collaboration Data (comments and review requests)
// ============================================================================

export const DEMO_COLLABORATIONS: Record<string, {
  projectId: string
  ownerId: string
  ownerName: string
  shareLinks: Array<unknown>
  comments: Array<{
    id: string
    projectId: string
    authorId: string
    authorName: string
    content: string
    status: 'open' | 'resolved'
    createdAt: string
    updatedAt: string
    parentId?: string
    replies?: Array<unknown>
  }>
  reviewRequests: Array<{
    id: string
    projectId: string
    requesterId: string
    requesterName: string
    reviewerId: string
    reviewerName: string
    status: 'pending' | 'in_progress' | 'completed' | 'declined'
    createdAt: string
    message?: string
  }>
  collaborators: Array<unknown>
  lastActivityAt: string
}> = {
  'demo_dapsimni_collab_004': {
    projectId: 'demo_dapsimni_collab_004',
    ownerId: 'user_001',
    ownerName: '김대리',
    shareLinks: [],
    comments: [
      {
        id: 'comment_001',
        projectId: 'demo_dapsimni_collab_004',
        authorId: 'user_002',
        authorName: '박과장',
        content: '주차대수 산정 기준 확인 부탁드립니다. 18대가 법정 기준 충족하는지요?',
        status: 'open',
        createdAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'comment_002',
        projectId: 'demo_dapsimni_collab_004',
        authorId: 'user_003',
        authorName: '이차장',
        content: '토지비 산정 근거 자료 첨부 부탁드립니다.',
        status: 'open',
        createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
      },
    ],
    reviewRequests: [
      {
        id: 'review_001',
        projectId: 'demo_dapsimni_collab_004',
        requesterId: 'user_001',
        requesterName: '김대리',
        reviewerId: 'user_002',
        reviewerName: '박과장',
        status: 'in_progress',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        message: '검토 부탁드립니다.',
      },
    ],
    collaborators: [],
    lastActivityAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
}

// ============================================================================
// Initialize Demo Data Function
// ============================================================================

export function initializeDemoProjects(): void {
  if (typeof window === 'undefined') return
  
  const STORAGE_KEY = 'archiscan_saved_projects'
  const APPROVAL_KEY = 'archi-scan-project-approvals'
  const COLLABORATION_KEY = 'archi-scan-collaboration'
  
  // Check if demo data already exists
  const existingData = localStorage.getItem(STORAGE_KEY)
  const existingProjects: SavedProject[] = existingData ? JSON.parse(existingData) : []
  
  // Check if demo projects are already present
  const hasDemoProjects = existingProjects.some(p => p.id.startsWith('demo_'))
  
  if (!hasDemoProjects) {
    // Add demo projects to the beginning
    const updatedProjects = [...DEMO_PROJECTS, ...existingProjects]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProjects))
    
    // Add demo approvals
    const existingApprovals = localStorage.getItem(APPROVAL_KEY)
    const approvals = existingApprovals ? JSON.parse(existingApprovals) : {}
    const updatedApprovals = { ...approvals, ...DEMO_APPROVALS }
    localStorage.setItem(APPROVAL_KEY, JSON.stringify(updatedApprovals))
    
    // Add demo collaborations (comments and review requests)
    const existingCollabs = localStorage.getItem(COLLABORATION_KEY)
    const collabs = existingCollabs ? JSON.parse(existingCollabs) : {}
    const updatedCollabs = { ...collabs, ...DEMO_COLLABORATIONS }
    localStorage.setItem(COLLABORATION_KEY, JSON.stringify(updatedCollabs))
    
    console.log('[Archi-Scan] Demo projects initialized')
  }
}

/**
 * Reset demo projects (force re-initialize)
 */
export function resetDemoProjects(): void {
  if (typeof window === 'undefined') return
  
  const STORAGE_KEY = 'archiscan_saved_projects'
  const APPROVAL_KEY = 'archi-scan-project-approvals'
  const COLLABORATION_KEY = 'archi-scan-collaboration'
  
  // Remove existing demo projects
  const existingData = localStorage.getItem(STORAGE_KEY)
  const existingProjects: SavedProject[] = existingData ? JSON.parse(existingData) : []
  const filteredProjects = existingProjects.filter(p => !p.id.startsWith('demo_'))
  
  // Add fresh demo projects
  const updatedProjects = [...DEMO_PROJECTS, ...filteredProjects]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProjects))
  
  // Reset demo approvals
  const existingApprovals = localStorage.getItem(APPROVAL_KEY)
  const approvals = existingApprovals ? JSON.parse(existingApprovals) : {}
  Object.keys(approvals).forEach(key => {
    if (key.startsWith('demo_')) delete approvals[key]
  })
  const updatedApprovals = { ...approvals, ...DEMO_APPROVALS }
  localStorage.setItem(APPROVAL_KEY, JSON.stringify(updatedApprovals))
  
  // Reset demo collaborations
  const existingCollabs = localStorage.getItem(COLLABORATION_KEY)
  const collabs = existingCollabs ? JSON.parse(existingCollabs) : {}
  Object.keys(collabs).forEach(key => {
    if (key.startsWith('demo_')) delete collabs[key]
  })
  const updatedCollabs = { ...collabs, ...DEMO_COLLABORATIONS }
  localStorage.setItem(COLLABORATION_KEY, JSON.stringify(updatedCollabs))
  
  console.log('[Archi-Scan] Demo projects reset')
}
