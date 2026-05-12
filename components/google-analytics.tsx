"use client"

import Script from "next/script"

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

export function GoogleAnalytics() {
  if (!GA_MEASUREMENT_ID) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', {
            page_title: document.title,
            page_location: window.location.href,
          });
        `}
      </Script>
    </>
  )
}

// ── 이벤트 추적 유틸리티 ──
export function trackEvent(eventName: string, params?: Record<string, string | number | boolean>) {
  if (typeof window !== 'undefined' && 'gtag' in window) {
    (window as any).gtag('event', eventName, params)
  }
}

// ── 전환 퍼널 이벤트 ──

// 인증
export const trackLogin = (method: string) => trackEvent('login', { method })
export const trackSignUp = (method: string) => trackEvent('sign_up', { method })

// 분석
export const trackQuickAnalysisStart = () => trackEvent('quick_analysis_start')
export const trackQuickAnalysisComplete = (roi: number) => trackEvent('quick_analysis_complete', { roi })
export const trackDetailedAnalysisStart = (strategy: string) => trackEvent('detailed_analysis_start', { strategy })
export const trackStepChange = (step: string) => trackEvent('step_change', { step })

// AI 렌더링
export const trackAiRenderStart = (viewType: string) => trackEvent('ai_render_start', { view_type: viewType })
export const trackAiRenderComplete = (viewType: string) => trackEvent('ai_render_complete', { view_type: viewType })

// 보고서
export const trackPdfDownload = () => trackEvent('pdf_download')

// 결제
export const trackUpgradeModalOpen = (source: string) => trackEvent('upgrade_modal_open', { source })
export const trackPaymentStart = () => trackEvent('payment_start', { value: 29000, currency: 'KRW' })
export const trackPaymentSuccess = () => trackEvent('purchase', { value: 29000, currency: 'KRW' })
export const trackPaymentFail = (reason: string) => trackEvent('payment_fail', { reason })

// 기타
export const trackGuideView = (section: string) => trackEvent('guide_view', { section })
export const trackContactSubmit = (category: string) => trackEvent('contact_submit', { category })
export const trackShareLink = () => trackEvent('share_link')
