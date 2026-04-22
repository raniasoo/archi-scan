/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // API keys for MOLIT and JUSO services
  // These are server-side only env vars (no NEXT_PUBLIC_ prefix)
  env: {
    MOLIT_API_KEY: process.env.MOLIT_API_KEY || '384c065c489b613aa46ae60dbc3284d59c52d1cbb9ec32bfeba5d56d21444098',
    JUSO_API_KEY: process.env.JUSO_API_KEY || 'U01TX0FVVEgyMDI1MDcyMjE2NTcxMjExNTU0MDc=',
  },
}

export default nextConfig
