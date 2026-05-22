import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Hotbox runs as a single Next.js process on Coolify. Server Actions are
  // the default mutation surface; only a handful of routes need real API
  // endpoints (Cashfree webhook, rider ping, SSE stream, APK download).
  reactStrictMode: true,
  output: "standalone",
  experimental: {
    // Server Actions need to allow our production host header through.
    serverActions: {
      allowedOrigins: ["hotbox.networkbase75.site", "localhost:3000"],
    },
  },
  // The persistent foreground notification on the rider APK plus the SSE
  // streams mean we keep these headers permissive for /api/track/*.
  async headers() {
    return [
      {
        source: "/api/track/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, no-transform" },
          { key: "X-Accel-Buffering", value: "no" },
        ],
      },
    ]
  },
}

export default nextConfig
