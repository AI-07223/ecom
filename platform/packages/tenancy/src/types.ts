/**
 * Public types for the tenancy package.
 *
 * Mirror of the `tenants` table created by
 * `platform/scripts/migrations/0001_create_tenants.sql`.
 */

/**
 * Recognized CSS variables emitted into the storefront's `:root` block.
 * Every key here is rendered as a CSS custom property; consuming components
 * read them via `var(--key)`. Keep the list short on purpose — every key
 * added here becomes part of the tenant theming contract.
 */
export interface ThemeTokens {
  "--brand-primary": string
  "--brand-on-primary": string
  "--brand-surface": string
  "--brand-on-surface": string
  "--radius": string
  "--font-display": string
  /** Extra tokens are allowed but not part of the contract. */
  [key: `--${string}`]: string | undefined
}

/**
 * Feature flags that gate per-tenant code paths. Names follow the
 * `snake_case` convention used in the JSON column.
 */
export interface FeatureFlags {
  /** Reserved — flags will be added by later changes. */
  [name: string]: boolean | undefined
}

/** Supported product-card / page layout variants. */
export type LayoutVariant = "compact" | "hero"

/** Tenant lifecycle status. */
export type TenantStatus = "active" | "suspended" | "archived"

/**
 * One row of the `tenants` table, hydrated from Postgres.
 *
 * The `publishable_api_key` is sensitive and SHOULD NOT be sent to the
 * browser; the storefront keeps it server-side and forwards it to Medusa.
 */
export interface Tenant {
  id: string
  slug: string
  domain: string
  sales_channel_id: string | null
  publishable_api_key: string | null
  theme_tokens: ThemeTokens
  feature_flags: FeatureFlags
  layout_variant: LayoutVariant
  status: TenantStatus
  created_at: Date
  updated_at: Date
}
