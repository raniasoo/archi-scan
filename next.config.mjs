/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Turbopack 비활성화 - 모바일 브라우저 호환 파일명 생성
  experimental: {},
  // API keys for MOLIT and JUSO services
  env: {
    MOLIT_API_KEY: process.env.MOLIT_API_KEY || '384c065c489b613aa46ae60dbc3284d59c52d1cbb9ec32bfeba5d56d21444098',
    JUSO_API_KEY: process.env.JUSO_API_KEY || 'U01TX0FVVEgyMDI1MDcyMjE2NTcxMjExNTU0MDc=',
  },
}

export default nextConfig
