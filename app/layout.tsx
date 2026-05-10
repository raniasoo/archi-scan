import type { Metadata } from 'next'
import { Noto_Sans_KR } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { GoogleAnalytics } from '@/components/google-analytics'
import { Toaster } from '@/components/ui/sonner'
import { SubscriptionProvider } from '@/components/subscription-provider'

import './globals.css'

const notoSansKr = Noto_Sans_KR({ 
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://www.archiscan.kr'),
  title: 'Archi-Scan | AI 건축 사전기획 플랫폼',
  description: '주소 입력만으로 대지 분석부터 사업성 검토까지, AI가 건축 법규 검토·배치안 설계·수익성 분석을 5분 안에 완료합니다.',
  generator: 'v0.app',
  manifest: '/manifest.json',
  themeColor: '#0d9488',
  keywords: ['건축설계', '사전기획', '배치안', '사업성검토', 'AI건축', '개발사업', '법규검토', 'ROI분석', '건축물대장', '국토부', '용적률', '건폐율'],
  alternates: {
    canonical: 'https://www.archiscan.kr',
  },
  openGraph: {
    title: 'Archi-Scan | AI 건축 사전기획 플랫폼',
    description: '주소 입력만으로 대지 분석, 건축 기획, 법규 검토, 사업성 분석까지. 디벨로퍼·건축사·시행사를 위한 AI 건축 사전기획 플랫폼.',
    type: 'website',
    locale: 'ko_KR',
    siteName: 'Archi-Scan',
    images: [{
      url: '/api/og?v=3',
      width: 1200,
      height: 630,
      alt: 'Archi-Scan - AI 건축 사전기획 플랫폼',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Archi-Scan | AI 건축 사전기획 플랫폼',
    description: '주소 입력만으로 대지 분석, 건축 기획, 법규 검토, 사업성 분석까지.',
    images: ['/api/og?v=3'],
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" className="dark bg-background">
      <head>
        <meta name="google-site-verification" content="kuPQKhHg9zi-xuTMlLEsLeqY9tZTwJZZGfIZt2Fd1ZY" />
        <meta name="naver-site-verification" content="da2df9f0e5d6e03adec6a19391a9743896e40d7a" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'Archi-Scan',
              applicationCategory: 'BusinessApplication',
              operatingSystem: 'Web',
              url: 'https://www.archiscan.kr',
              description: '주소 입력만으로 대지 분석부터 사업성 검토까지, AI가 건축 법규 검토·배치안 설계·수익성 분석을 5분 안에 완료합니다.',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'KRW',
                description: '무료 체험 가능',
              },
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '4.8',
                ratingCount: '150',
              },
              featureList: '건축 법규 자동 검토, AI 배치안 생성, 사업성 분석, PDF 보고서, 국토부 연동',
            }),
          }}
        />
      </head>
      <body className={`${notoSansKr.className} antialiased bg-background`}>
        
          <SubscriptionProvider>
            {children}
            <Toaster position="bottom-center" richColors closeButton offset={80} />
            <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(()=>{})}` }} />
          </SubscriptionProvider>
        
        {process.env.NODE_ENV === 'production' && <Analytics />}
        <GoogleAnalytics />
      </body>
    </html>
  )
}
