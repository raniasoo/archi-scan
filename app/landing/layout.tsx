import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Archi-Scan | AI 건축 사전기획 플랫폼 — 5분 안에 사업성 분석',
  description: '주소 입력만으로 법규 검토, AI 배치안 설계, 사업성 분석까지. 국토부 실데이터 기반 건축 사전기획 플랫폼. 카카오·네이버로 간편 가입.',
  openGraph: {
    title: 'Archi-Scan | 5분 안에 건축 사업성 분석',
    description: '주소 입력만으로 대지 분석부터 사업성 검토까지, AI가 건축 법규 검토·배치안 설계·수익성 분석을 5분 안에 완료합니다.',
    type: 'website',
    locale: 'ko_KR',
    siteName: 'Archi-Scan',
  },
}

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return children
}
