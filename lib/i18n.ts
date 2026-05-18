/**
 * 다국어 지원 (i18n)
 * 한국어 + 영어 기본 구조
 */

export type Locale = 'ko' | 'en'

export const translations: Record<Locale, Record<string, string>> = {
  ko: {
    // 공통
    'app.name': 'Archi-Scan',
    'app.tagline': 'AI 건축 사전기획 플랫폼',
    'app.description': '주소 하나로 5분 안에 사업성 분석',
    
    // 네비게이션
    'nav.features': '기능',
    'nav.cases': '사례',
    'nav.pricing': '요금제',
    'nav.login': '로그인',
    'nav.signup': '무료 시작',
    
    // 입력
    'input.address': '대상지 주소',
    'input.address.placeholder': '도로명 또는 지번 주소를 입력하세요',
    'input.siteArea': '대지면적 (㎡)',
    'input.analyze': '분석 시작',
    'input.autoLookup': '국토부 자동조회',
    
    // 탭
    'tab.floorplan': '기본 평면',
    'tab.structural': '구조그리드',
    'tab.3d': '3D 도면',
    'tab.sunlight': '일조분석',
    'tab.site': '배치도',
    'tab.section': '단면도',
    'tab.elevation': '입면도',
    
    // 사업성
    'feasibility.totalCost': '총사업비',
    'feasibility.revenue': '예상매출',
    'feasibility.profit': '예상수익',
    'feasibility.roi': '투자수익률',
    'feasibility.breakeven': '손익분기',
    'feasibility.npv': '순현재가치',
    'feasibility.irr': '내부수익률',
    
    // 보고서
    'report.download': '보고서 다운로드',
    'report.preview': '미리보기',
    'report.title': '개발사업 사전검토 보고서',
  },
  
  en: {
    'app.name': 'Archi-Scan',
    'app.tagline': 'AI Architecture Pre-Planning Platform',
    'app.description': 'Feasibility analysis in 5 minutes with just an address',
    
    'nav.features': 'Features',
    'nav.cases': 'Cases',
    'nav.pricing': 'Pricing',
    'nav.login': 'Login',
    'nav.signup': 'Get Started Free',
    
    'input.address': 'Site Address',
    'input.address.placeholder': 'Enter road name or lot address',
    'input.siteArea': 'Site Area (㎡)',
    'input.analyze': 'Start Analysis',
    'input.autoLookup': 'Auto Lookup',
    
    'tab.floorplan': 'Floor Plan',
    'tab.structural': 'Structural Grid',
    'tab.3d': '3D Drawing',
    'tab.sunlight': 'Sunlight',
    'tab.site': 'Site Plan',
    'tab.section': 'Section',
    'tab.elevation': 'Elevation',
    
    'feasibility.totalCost': 'Total Investment',
    'feasibility.revenue': 'Expected Revenue',
    'feasibility.profit': 'Expected Profit',
    'feasibility.roi': 'ROI',
    'feasibility.breakeven': 'Break-even',
    'feasibility.npv': 'NPV',
    'feasibility.irr': 'IRR',
    
    'report.download': 'Download Report',
    'report.preview': 'Preview',
    'report.title': 'Development Feasibility Report',
  },
}

export function t(key: string, locale: Locale = 'ko'): string {
  return translations[locale][key] || translations.ko[key] || key
}

export function getLocale(): Locale {
  if (typeof window === 'undefined') return 'ko'
  const stored = localStorage.getItem('archi-scan-locale')
  if (stored === 'en') return 'en'
  return 'ko'
}

export function setLocale(locale: Locale): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('archi-scan-locale', locale)
  }
}
