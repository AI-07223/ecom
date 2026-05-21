/**
 * In-process tenant cache.
 *
 * Storefront middleware calls `tenantCache.resolve(host)` on every request.
 * The cache holds resolved tenants (and explicit "not-found" entries) for
 * `DEFAULT_TTL_MS` so a steady-state hostname doesn't issue a Postgres query
 * per request.
 */

import { normalizeHost, resolveTenantByHost } from "./resolver.js"
import type { Tenant } from "./types.js"

export const DEFAULT_TTL_MS = 60_000 // 60s — matches the spec

interface CacheEntry {
  tenant: Tenant | null
  expiresAt: number
}

export type Loader = (host: string) => Promise<Tenant | null>

export interface TenantCacheOptions {
  /** Override how the cache fetches on a miss. Default: DB lookup. */
  loader?: Loader
  /** TTL in ms. Default: 60_000. */
  ttlMs?: number
  /** Pluggable clock for tests. Default: `Date.now`. */
  now?: () => number
}

export class TenantCache {
  private readonly entries = new Map<string, CacheEntry>()
  private readonly loader: Loader
  private readonly ttlMs: number
  private readonly now: () => number

  /** Counters exposed for tests / observability. */
  public hits = 0
  public misses = 0

  constructor(options: TenantCacheOptions = {}) {
    this.loader = options.loader ?? resolveTenantByHost
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS
    this.now = options.now ?? Date.now
  }

  /** Look up a tenant, hitting the cache when fresh. */
  async resolve(host: string | null | undefined): Promise<Tenant | null> {
    const key = normalizeHost(host)
    if (!key) return null

    const entry = this.entries.get(key)
    const now = this.now()
    if (entry && entry.expiresAt > now) {
      this.hits++
      return entry.tenant
    }

    this.misses++
    const tenant = await this.loader(key)
    this.entries.set(key, { tenant, expiresAt: now + this.ttlMs })
    return tenant
  }

  /** Drop the cached entry for one hostname. */
  invalidate(host: string | null | undefined): void {
    const key = normalizeHost(host)
    if (key) this.entries.delete(key)
  }

  /** Drop all cached entries. */
  clear(): void {
    this.entries.clear()
  }

  /** Current cache size (live + expired-but-not-pruned). */
  size(): number {
    return this.entries.size
  }
}

/** Shared singleton — both middleware and getTenant import this. */
export const tenantCache = new TenantCache()
