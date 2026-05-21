import { describe, expect, it, vi } from "vitest"
import { TenantCache } from "./cache.js"
import type { Tenant } from "./types.js"

function fakeTenant(slug: string, domain: string): Tenant {
  return {
    id: `id-${slug}`,
    slug,
    domain,
    sales_channel_id: `sc_${slug}`,
    publishable_api_key: `pk_${slug}`,
    theme_tokens: {
      "--brand-primary": "#000",
      "--brand-on-primary": "#fff",
      "--brand-surface": "#fff",
      "--brand-on-surface": "#000",
      "--radius": "0.5rem",
      "--font-display": "Inter",
    },
    feature_flags: {},
    layout_variant: "compact",
    status: "active",
    created_at: new Date(0),
    updated_at: new Date(0),
  }
}

describe("TenantCache", () => {
  it("returns the loader result on first call and serves from cache within TTL", async () => {
    let now = 1_000_000
    const loader = vi.fn(async (host: string) =>
      host === "acme.localhost" ? fakeTenant("acme", host) : null,
    )
    const cache = new TenantCache({ loader, ttlMs: 60_000, now: () => now })

    const a = await cache.resolve("acme.localhost")
    expect(a?.slug).toBe("acme")
    expect(loader).toHaveBeenCalledTimes(1)

    // Within TTL — should be a cache hit, no extra loader call.
    now += 30_000
    const b = await cache.resolve("acme.localhost")
    expect(b?.slug).toBe("acme")
    expect(loader).toHaveBeenCalledTimes(1)
    expect(cache.hits).toBe(1)
    expect(cache.misses).toBe(1)
  })

  it("refetches after TTL expiry", async () => {
    let now = 0
    const loader = vi.fn(async (host: string) => fakeTenant("acme", host))
    const cache = new TenantCache({ loader, ttlMs: 60_000, now: () => now })

    await cache.resolve("acme.localhost")
    expect(loader).toHaveBeenCalledTimes(1)

    // 61 seconds later — TTL has expired.
    now = 61_000
    await cache.resolve("acme.localhost")
    expect(loader).toHaveBeenCalledTimes(2)
    expect(cache.misses).toBe(2)
    expect(cache.hits).toBe(0)
  })

  it("normalizes host (case + port) before keying", async () => {
    const loader = vi.fn(async (_h: string) => fakeTenant("acme", "acme.localhost"))
    const cache = new TenantCache({ loader })

    await cache.resolve("ACME.localhost:3000")
    await cache.resolve("acme.localhost")
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it("caches negative lookups too", async () => {
    const loader = vi.fn(async (_h: string) => null)
    const cache = new TenantCache({ loader, ttlMs: 60_000 })

    const a = await cache.resolve("unknown.host")
    const b = await cache.resolve("unknown.host")
    expect(a).toBeNull()
    expect(b).toBeNull()
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it("returns null for empty/blank hosts without calling the loader", async () => {
    const loader = vi.fn(async (_h: string) => fakeTenant("acme", "acme.localhost"))
    const cache = new TenantCache({ loader })

    expect(await cache.resolve("")).toBeNull()
    expect(await cache.resolve(null)).toBeNull()
    expect(await cache.resolve(undefined)).toBeNull()
    expect(loader).toHaveBeenCalledTimes(0)
  })

  it("invalidate() forces a re-fetch on next call", async () => {
    const loader = vi.fn(async (_h: string) =>
      fakeTenant("acme", "acme.localhost"),
    )
    const cache = new TenantCache({ loader })

    await cache.resolve("acme.localhost")
    cache.invalidate("acme.localhost")
    await cache.resolve("acme.localhost")
    expect(loader).toHaveBeenCalledTimes(2)
  })
})
