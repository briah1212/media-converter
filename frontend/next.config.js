/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove 'standalone' for Vercel - it handles optimization automatically
  // Keep standalone for Docker deployments by uncommenting below:
  output: 'standalone',
  
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },
  
  // Optimize images for Vercel Edge
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [], // Add if loading images from external sources
  },
  
  // Enable experimental features for better performance
  experimental: {
    // Optimize package imports
    optimizePackageImports: ['lucide-react'],
  },
  
  // Headers for security (optional, vercel.json also has these)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
