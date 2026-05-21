/**
 * End-to-end catalog isolation test.
 *
 * Hits the running storefront with different Host headers and asserts each
 * tenant sees only its own products. Required by the multi-tenancy spec:
 *
 *   "Cross-tenant catalog isolation is enforced and tested"
 *
 * Preconditions:
 *   - `docker compose up -d` is running (postgres, redis, medusa)
 *   - `npm run admin:create` has provisioned the admin user
 *   - `npm run seed` has populated tenants + catalogs
 *   - Storefront dev server is running on STOREFRONT_BASE_URL (default 3000)
 */

import { describe, expect, it } from "vitest"
import { request } from "undici"

const STOREFRONT_PORT = process.env.STOREFRONT_PORT ?? "3000"

interface FetchResult {
  status: number
  html: string
}

// Connect to 127.0.0.1 (where the dev server listens) but send the tenant
// host in the Host header. Node's high-level `fetch` strips a manual `host`
// header; undici's lower-level `request` honors it.
async function fetchAs(host: string, path = "/"): Promise<FetchResult> {
  const res = await request(`http://127.0.0.1:${STOREFRONT_PORT}${path}`, {
    method: "GET",
    headers: { host: `${host}:${STOREFRONT_PORT}` },
  })
  const html = await res.body.text()
  return { status: res.statusCode, html }
}

function productHandles(html: string): string[] {
  // We embed product handles in alt / href / data attributes. The
  // `acme-N` / `globex-N` patterns come from the seed.
  const matches = html.matchAll(/\b(acme-\d+|globex-\d+)\b/g)
  return [...new Set([...matches].map((m) => m[1] as string))]
}

describe("E2E: catalog isolation", () => {
  it("acme.localhost renders only acme-* products", async () => {
    const { status, html } = await fetchAs("acme.localhost")
    expect(status).toBe(200)
    const handles = productHandles(html)
    expect(handles.length).toBeGreaterThanOrEqual(3)
    expect(handles.every((h) => h.startsWith("acme-"))).toBe(true)
    expect(handles.some((h) => h.startsWith("globex-"))).toBe(false)
    // Brand assertion
    expect(html).toContain('data-tenant="acme"')
    expect(html).toContain("#0F766E") // brand-primary teal
  }, 15_000)

  it("globex.localhost renders only globex-* products", async () => {
    const { status, html } = await fetchAs("globex.localhost")
    expect(status).toBe(200)
    const handles = productHandles(html)
    expect(handles.length).toBeGreaterThanOrEqual(3)
    expect(handles.every((h) => h.startsWith("globex-"))).toBe(true)
    expect(handles.some((h) => h.startsWith("acme-"))).toBe(false)
    expect(html).toContain('data-tenant="globex"')
    expect(html).toContain("#EA580C") // brand-primary orange
  }, 15_000)

  it("unknown host returns 404 with descriptive body", async () => {
    const { status, html } = await fetchAs("nope.localhost")
    expect(status).toBe(404)
    expect(html).toContain("unknown_tenant")
  }, 15_000)

  it("host header is case-insensitive", async () => {
    const { status, html } = await fetchAs("ACME.LOCALHOST")
    expect(status).toBe(200)
    expect(html).toContain('data-tenant="acme"')
  }, 15_000)

  it("layout_variant gates the rendered shape", async () => {
    const acme = await fetchAs("acme.localhost")
    const globex = await fetchAs("globex.localhost")
    // Acme is compact: smaller padding (p-4). Globex is hero: p-8.
    // The variant attribute is the ground truth.
    expect(acme.html).toContain('data-variant="compact"')
    expect(globex.html).toContain('data-variant="hero"')
  }, 15_000)
})
