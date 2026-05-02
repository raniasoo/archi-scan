import { withSentryConfig } from "@sentry/nextjs"

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  env: {
    MOLIT_API_KEY: process.env.MOLIT_API_KEY || '384c065c489b613aa46ae60dbc3284d59c52d1cbb9ec32bfeba5d56d21444098',
    JUSO_API_KEY: process.env.JUSO_API_KEY || 'U01TX0FVVEgyMDI1MDcyMjE2NTcxMjExNTU0MDc=',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kxgjeghsttawmnbzkmko.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4Z2plZ2hzdHRhd21uYnprbWtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1MjgxNjMsImV4cCI6MjA5MzEwNDE2M30.aKpVjfDJ6Ypgn4cIATp4QwYh6BzeeHq20eMbJKDzWrg',
  },
}

// Sentry가 설정된 경우에만 래핑
const sentryConfig = process.env.NEXT_PUBLIC_SENTRY_DSN ? withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  disableLogger: true,
  hideSourceMaps: true,
  automaticVercelMonitors: true,
}) : nextConfig

export default sentryConfig
