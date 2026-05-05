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
  title: 'Archi-Scan | AI 건축 사전기획 플랫폼',
  description: '주소 입력만으로 대지 분석부터 사업성 검토까지, AI 건축 사전기획 플랫폼',
  generator: 'v0.app',
  manifest: '/manifest.json',
  themeColor: '#0d9488',
  keywords: ['건축설계', '사전기획', '배치안', '사업성검토', 'AI건축', '개발사업', '법규검토', 'ROI분석'],
  openGraph: {
    title: 'Archi-Scan | AI 건축 사전기획 플랫폼',
    description: '주소 입력만으로 대지 분석, 건축 기획, 법규 검토, 사업성 분석까지. AI 건축 사전기획 플랫폼.',
    type: 'website',
    locale: 'ko_KR',
    siteName: 'Archi-Scan',
    images: [{
      url: '/api/og?v=2',
      width: 1200,
      height: 630,
      alt: 'Archi-Scan - AI 건축 사전기획 플랫폼',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Archi-Scan | AI 건축 사전기획 플랫폼',
    description: '주소 입력만으로 대지 분석, 건축 기획, 법규 검토, 사업성 분석까지.',
    images: ['/api/og?v=2'],
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
    <html lang="ko" className="bg-background">
      <body className={`${notoSansKr.className} antialiased bg-background`}>
        <SubscriptionProvider>
          {children}
          <Toaster position="top-center" richColors closeButton />
          <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(()=>{})}` }} />
        </SubscriptionProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
        <GoogleAnalytics />
      </body>
    </html>
  )
}
