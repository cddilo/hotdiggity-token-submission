import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Vaccination record uploads (photos/PDFs) come through server actions.
  experimental: {
    serverActions: { bodySizeLimit: '10mb' },
  },
}

export default nextConfig
