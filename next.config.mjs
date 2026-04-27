/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Chunk 파일명에서 '..' 제거 (Samsung Internet 호환)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      const originalFilename = config.output.chunkFilename
      config.output.chunkFilename = (pathData) => {
        const name = typeof originalFilename === 'function'
          ? originalFilename(pathData)
          : originalFilename || '[id].js'
        return name.replace(/\.\./g, '-')
      }
    }
    return config
  },
  env: {
    MOLIT_API_KEY: process.env.MOLIT_API_KEY || '384c065c489b613aa46ae60dbc3284d59c52d1cbb9ec32bfeba5d56d21444098',
    JUSO_API_KEY: process.env.JUSO_API_KEY || 'U01TX0FVVEgyMDI1MDcyMjE2NTcxMjExNTU0MDc=',
  },
}

export default nextConfig
