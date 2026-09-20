/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Real deployments should point this at a licensed image CDN / S3-compatible
    // bucket (see IMAGE_CDN_BASE_URL in .env.example) plus any approved
    // stock/tourism-board image hosts. No hosts are scraped or hot-linked here.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.cloudfront.net"
      },
      {
        protocol: "https",
        hostname: "**.amazonaws.com"
      }
    ],
    formats: ["image/avif", "image/webp"]
  },
  experimental: {
    typedRoutes: false
  }
};

export default nextConfig;
