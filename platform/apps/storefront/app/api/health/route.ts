import { NextResponse } from "next/server"

/**
 * Liveness endpoint — returns 200 if the server is serving requests at all.
 * The proxy.ts matcher excludes `_next/` but not `/api/*`, so this route
 * sits behind tenant resolution. Coolify's healthcheck can hit this on any
 * known tenant hostname, or via the wildcard (Coolify usually probes the
 * container directly via its internal IP, in which case the proxy sees a
 * missing Host header — see edge case below).
 */
export const dynamic = "force-dynamic"

export function GET() {
  return NextResponse.json({ status: "ok", service: "storefront" })
}
