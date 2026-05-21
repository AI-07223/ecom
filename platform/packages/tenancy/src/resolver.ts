/**
 * Hostname → tenant resolver, backed by Postgres.
 *
 * `resolveTenantByHost` does a single SELECT against the `tenants` table.
 * Callers are expected to wrap this in `tenantCache` so we don't issue a
 * query on every HTTP request.
 */

import { Pool, type PoolClient } from "pg"
import type {
  FeatureFlags,
  LayoutVariant,
  Tenant,
  TenantStatus,
  ThemeTokens,
} from "./types.js"

let sharedPool: Pool | null = null

/**
 * Lazily build a single shared connection pool. Tests can override by
 * calling `setPool` before any query.
 */
function getPool(): Pool {
  if (sharedPool) return sharedPool
  const connectionString =
    process.env.PLATFORM_DATABASE_URL ?? process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error(
      "tenancy: PLATFORM_DATABASE_URL (or DATABASE_URL) is not set",
    )
  }
  sharedPool = new Pool({ connectionString, max: 5 })
  return sharedPool
}

/** Test-only: inject a pool (or pool-like) for unit tests. */
export function setPool(pool: Pool | null): void {
  sharedPool = pool
}

/** Lowercase + strip port. Idempotent. */
export function normalizeHost(host: string | null | undefined): string {
  if (!host) return ""
  const lower = host.toLowerCase().trim()
  const colonIdx = lower.indexOf(":")
  return colonIdx === -1 ? lower : lower.slice(0, colonIdx)
}

const SELECT_BY_DOMAIN = `
  SELECT
    id,
    slug,
    domain,
    sales_channel_id,
    publishable_api_key,
    theme_tokens,
    feature_flags,
    layout_variant,
    status,
    created_at,
    updated_at
  FROM tenants
  WHERE domain = $1
  LIMIT 1
`

interface TenantRow {
  id: string
  slug: string
  domain: string
  sales_channel_id: string | null
  publishable_api_key: string | null
  theme_tokens: ThemeTokens
  feature_flags: FeatureFlags
  layout_variant: string
  status: string
  created_at: Date
  updated_at: Date
}

function rowToTenant(row: TenantRow): Tenant {
  return {
    id: row.id,
    slug: row.slug,
    domain: row.domain,
    sales_channel_id: row.sales_channel_id,
    publishable_api_key: row.publishable_api_key,
    theme_tokens: row.theme_tokens ?? ({} as ThemeTokens),
    feature_flags: row.feature_flags ?? {},
    layout_variant: row.layout_variant as LayoutVariant,
    status: row.status as TenantStatus,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

/**
 * Look up a single tenant by host. Returns `null` when no row matches.
 * The caller is responsible for caching repeated lookups (see
 * {@link tenantCache}).
 */
export async function resolveTenantByHost(
  host: string,
  client?: PoolClient,
): Promise<Tenant | null> {
  const domain = normalizeHost(host)
  if (!domain) return null

  const queryRunner = client ?? getPool()
  const { rows } = await queryRunner.query<TenantRow>(SELECT_BY_DOMAIN, [
    domain,
  ])
  if (rows.length === 0) return null
  return rowToTenant(rows[0]!)
}
