/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export', // Enable static export for GitHub Pages
  images: {
    unoptimized: true, // GitHub Pages doesn't support Next.js Image Optimization
    domains: ['faceliftnaturally.me', 'new-facelift-service-b8cta5hpgcgqf8c7.eastus-01.azurewebsites.net'],
  },
  basePath: process.env.NODE_ENV === 'production' ? '/Rejuvena_old_app' : '', // GitHub repo name
  assetPrefix: process.env.NODE_ENV === 'production' ? '/Rejuvena_old_app' : '',
  env: {
    API_URL: process.env.API_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
}

module.exports = nextConfig
