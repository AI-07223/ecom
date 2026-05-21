// Next.js 16 renamed the `middleware` convention to `proxy`.
// This file resolves a tenant by Host on every request, attaches the
// normalized hostname to `x-tenant-host`, and 404s unknown hostnames before
// any route renders.

import { NextResponse, type NextRequest } from "next/server"
import { normalizeHost, tenantCache } from "@platform/tenancy"

export const config = {
  // Skip Next.js internals, static assets, and favicons. Everything else
  // (including data routes) is tenant-scoped.
  matcher: [
    "/((?!_next/static|_next/image|_next/data|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const rawHost = request.headers.get("host")
  const host = normalizeHost(rawHost)

  const tenant = await tenantCache.resolve(host)

  if (!tenant) {
    return new NextResponse(
      JSON.stringify({
        error: "unknown_tenant",
        message: `No tenant is configured for host "${rawHost ?? ""}".`,
      }),
      {
        status: 404,
        headers: { "content-type": "application/json" },
      },
    )
  }

  if (tenant.status !== "active") {
    return new NextResponse(
      JSON.stringify({
        error: "tenant_inactive",
        message: `Tenant "${tenant.slug}" is not active (status: ${tenant.status}).`,
      }),
      {
        status: 503,
        headers: { "content-type": "application/json" },
      },
    )
  }

  // Forward the resolved host to the rendering layer. `getTenant()` reads
  // this header and re-resolves the same row from the in-process cache (no
  // extra DB hit on a warm cache).
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-tenant-host", tenant.domain)

  return NextResponse.next({
    request: { headers: requestHeaders },
  })
}
