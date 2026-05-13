import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Archi-Scan 사용 가이드 | AI 건축 사전기획 플랫폼 사용법',
  description: 'Archi-Scan 사용 가이드: 주소 입력부터 AI 렌더링, 법규 검토, 사업성 분석, PDF 보고서 다운로드까지. 빠른 분석과 상세 분석의 단계별 사용법을 안내합니다.',
  alternates: {
    canonical: 'https://www.archiscan.kr/guide',
  },
  openGraph: {
    title: 'Archi-Scan 사용 가이드',
    description: '건축 사전기획 AI 플랫폼 사용법 — 주소 입력부터 보고서까지 5분 완성 가이드',
  },
}

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  return children
}
