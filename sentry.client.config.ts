import * as Sentry from "@sentry/nextjs"

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1, // 10% 성능 추적
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.5, // 에러 발생 시 50% 리플레이
    debug: false,
    beforeSend(event) {
      // 개인정보 필터링
      if (event.request?.cookies) delete event.request.cookies
      return event
    },
  })
}
