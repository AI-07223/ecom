import "server-only"

import { headers } from "next/headers"
import { tenantCache, type Tenant } from "@platform/tenancy"

/**
 * Read the tenant resolved by `proxy.ts` for the current request.
 *
 * - The proxy sets `x-tenant-host` after looking the row up; this helper
 *   re-resolves the same row from the shared in-process cache (warm hit, no
 *   DB query).
 * - Throws if called outside a request scope, or if the header was somehow
 *   stripped (which indicates a misconfigured matcher in `proxy.ts`).
 *
 * Server components, layouts, and server actions should call this rather
 * than re-querying the `tenants` table directly.
 */
export async function getTenant(): Promise<Tenant> {
  const h = await headers()
  const host = h.get("x-tenant-host")
  if (!host) {
    throw new Error(
      "getTenant(): x-tenant-host header missing. proxy.ts may not be running for this route.",
    )
  }
  const tenant = await tenantCache.resolve(host)
  if (!tenant) {
    throw new Error(
      `getTenant(): tenant for host "${host}" disappeared between proxy and render.`,
    )
  }
  return tenant
}
