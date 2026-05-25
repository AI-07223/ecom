import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Hot Box runs as a single Next.js process on Coolify. Server Actions
  // are the default mutation surface; the few REST routes that exist
  // serve: rider GPS ping, SSE track stream, APK download, menu-item
  // photo, payment-proof image, daily purge cron.
  reactStrictMode: true,
  output: "standalone",
  // Production builds: strip console.* (except .warn/.error) so tactical
  // dev logging doesn't ship to customers' DevTools.
  compiler: {
    removeConsole: process.env.NODE_ENV === "production"
      ? { exclude: ["warn", "error"] }
      : false,
  },
  // sharp ships native bindings that Turbopack can't bundle; treat as
  // external so Next.js leaves the require() in place at runtime.
  serverExternalPackages: ["sharp"],
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
