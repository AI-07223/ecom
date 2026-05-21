/**
 * Demo tenant seed.
 *
 * For each tenant (acme, globex):
 *   1. Upsert the `tenants` row with theme tokens and layout variant.
 *   2. Find-or-create a Medusa sales channel.
 *   3. Find-or-create a publishable API key, attach it to the channel.
 *   4. Ensure an INR region exists, attach it to both channels.
 *   5. Find-or-create at least 3 products with stable handles (acme-1..3).
 *   6. Write `sales_channel_id` and `publishable_api_key` back to the
 *      tenants row.
 *   7. Verify products are reachable via the Medusa Store API using the
 *      tenant's publishable key.
 *
 * Idempotent — re-running upserts existing rows and skips already-created
 * Medusa resources.
 */

import { config as loadDotenv } from "dotenv"
import { Client } from "pg"
import { AdminApiClient, type AdminProduct } from "./lib/admin-api-client.js"

loadDotenv()

interface SeedTenant {
  slug: string
  display_name: string
  domain: string
  layout_variant: "compact" | "hero"
  theme_tokens: Record<string, string>
  products: Array<{
    title: string
    description: string
    price_inr_minor: number // e.g. 99900 = ₹999.00
  }>
}

const TENANTS: SeedTenant[] = [
  {
    slug: "acme",
    display_name: "Acme",
    domain: "acme.localhost",
    layout_variant: "compact",
    theme_tokens: {
      "--brand-primary": "#0F766E",
      "--brand-on-primary": "#F0FDFA",
      "--brand-surface": "#F8FAFC",
      "--brand-on-surface": "#0F172A",
      "--radius": "0.75rem",
      "--font-display": "'Inter', system-ui, sans-serif",
      "--site-title": "Acme — Things That Work",
    },
    products: [
      {
        title: "Acme Universal Wrench",
        description:
          "Adjusts to any nut, any size, any planet. Backed by Acme's perpetual replacement guarantee.",
        price_inr_minor: 149900,
      },
      {
        title: "Acme Folding Anvil",
        description:
          "All the weight of a traditional anvil; folds flat for travel. Loved by coyotes.",
        price_inr_minor: 599900,
      },
      {
        title: "Acme Rocket-Powered Roller Skates",
        description:
          "Hand-controlled jet propulsion. Helmet not included. Read the warranty.",
        price_inr_minor: 299900,
      },
    ],
  },
  {
    slug: "globex",
    display_name: "Globex",
    domain: "globex.localhost",
    layout_variant: "hero",
    theme_tokens: {
      "--brand-primary": "#EA580C",
      "--brand-on-primary": "#FFF7ED",
      "--brand-surface": "#FFFBEB",
      "--brand-on-surface": "#3F1505",
      "--radius": "0.25rem",
      "--font-display": "'Playfair Display', Georgia, serif",
      "--site-title": "Globex — Modern Goods",
    },
    products: [
      {
        title: "Globex Brass Compass",
        description:
          "Hand-finished brass; magnetic field-corrected for north and west hemispheres.",
        price_inr_minor: 224900,
      },
      {
        title: "Globex Linen Throw",
        description:
          "Heavy-weight linen, stonewashed. Drapes a chair or a small civilization.",
        price_inr_minor: 449900,
      },
      {
        title: "Globex Ceramic Vase, Tall",
        description:
          "Stoneware vase with a matte oxide glaze. Hand-thrown in a workshop nobody can find.",
        price_inr_minor: 339900,
      },
    ],
  },
]

function envOrThrow(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`seed: missing env var ${name}`)
  return v
}

function buildDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  const user = envOrThrow("POSTGRES_USER")
  const password = envOrThrow("POSTGRES_PASSWORD")
  const db = envOrThrow("POSTGRES_DB")
  const port = process.env.POSTGRES_PORT ?? "5432"
  return `postgres://${user}:${password}@localhost:${port}/${db}`
}

function medusaBaseUrl(): string {
  return process.env.MEDUSA_BACKEND_URL_HOST ?? "http://localhost:9000"
}

const UPSERT_TENANT = `
  INSERT INTO tenants (slug, domain, layout_variant, theme_tokens, feature_flags, status)
  VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, 'active')
  ON CONFLICT (slug) DO UPDATE
    SET domain         = EXCLUDED.domain,
        layout_variant = EXCLUDED.layout_variant,
        theme_tokens   = EXCLUDED.theme_tokens,
        feature_flags  = EXCLUDED.feature_flags,
        status         = 'active'
  RETURNING id, slug, domain;
`

const UPDATE_TENANT_CHANNEL_KEY = `
  UPDATE tenants
     SET sales_channel_id = $2,
         publishable_api_key = $3
   WHERE slug = $1
  RETURNING id, sales_channel_id, publishable_api_key;
`

async function ensureInrRegion(admin: AdminApiClient): Promise<string> {
  const existing = await admin.findRegionByCurrency("inr")
  if (existing) {
    console.log(`[skip] region inr (id=${existing.id}) already exists`)
    return existing.id
  }
  const region = await admin.createRegion({
    name: "India",
    currency_code: "inr",
    countries: ["in"],
  })
  console.log(`[ok]   created INR region id=${region.id}`)
  return region.id
}

/**
 * Ensure every active payment provider is attached to every region that
 * doesn't yet have a payment provider linked. Idempotent.
 *
 * Direct SQL because Medusa's admin "update region with provider ids" API
 * REPLACES the set rather than appending, and we want a tolerant ensure-link.
 */
async function ensureRegionPaymentProviders(pg: Client): Promise<void> {
  const { rows: missing } = await pg.query<{
    region_id: string
    payment_provider_id: string
  }>(`
    SELECT r.id AS region_id, pp.id AS payment_provider_id
    FROM region r
    CROSS JOIN payment_provider pp
    WHERE pp.is_enabled = true
      AND pp.deleted_at IS NULL
      AND r.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM region_payment_provider rpp
        WHERE rpp.region_id = r.id
          AND rpp.payment_provider_id = pp.id
          AND rpp.deleted_at IS NULL
      )
  `)
  for (const m of missing) {
    await pg.query(
      `INSERT INTO region_payment_provider (id, region_id, payment_provider_id)
       VALUES ('regpp_' || replace(gen_random_uuid()::text, '-', ''), $1, $2)`,
      [m.region_id, m.payment_provider_id],
    )
    console.log(
      `[ok]   linked region ${m.region_id} -> payment provider ${m.payment_provider_id}`,
    )
  }
  if (missing.length === 0) {
    console.log(`[skip] every region already has all enabled providers linked`)
  }
}

async function ensureSalesChannel(
  admin: AdminApiClient,
  tenant: SeedTenant,
): Promise<string> {
  const existing = await admin.findSalesChannelByName(tenant.display_name)
  if (existing) {
    console.log(
      `[skip] sales channel "${tenant.display_name}" id=${existing.id} exists`,
    )
    return existing.id
  }
  const sc = await admin.createSalesChannel({
    name: tenant.display_name,
    description: `Storefront for ${tenant.slug}.localhost`,
  })
  console.log(`[ok]   created sales channel "${sc.name}" id=${sc.id}`)
  return sc.id
}

async function ensurePublishableApiKey(
  admin: AdminApiClient,
  tenant: SeedTenant,
  salesChannelId: string,
): Promise<{ id: string; token: string }> {
  const title = `${tenant.slug}-storefront`
  const existing = await admin.findPublishableApiKeyByTitle(title)
  let key: { id: string; token: string }
  if (existing) {
    console.log(`[skip] api key "${title}" id=${existing.id} exists`)
    key = { id: existing.id, token: existing.token }
  } else {
    const created = await admin.createPublishableApiKey(title)
    console.log(`[ok]   created api key "${title}" id=${created.id}`)
    key = { id: created.id, token: created.token }
  }

  const linked = await admin.listApiKeySalesChannels(key.id)
  if (!linked.includes(salesChannelId)) {
    await admin.addSalesChannelToKey(key.id, salesChannelId)
    console.log(`[ok]   linked api key ${key.id} -> sales channel ${salesChannelId}`)
  } else {
    console.log(`[skip] api key already linked to sales channel`)
  }
  return key
}

/**
 * Link every tenant sales channel to the existing stock locations so the
 * cart's sales channel can discover shipping options via the
 * sales_channel → stock_location → fulfillment_set → service_zone chain.
 *
 * Idempotent: only inserts missing links.
 */
async function ensureSalesChannelStockLinks(
  pg: Client,
  salesChannelIds: string[],
): Promise<void> {
  const { rows: locations } = await pg.query<{ id: string }>(
    "SELECT id FROM stock_location WHERE deleted_at IS NULL",
  )
  for (const channelId of salesChannelIds) {
    for (const loc of locations) {
      const { rows } = await pg.query(
        `SELECT 1 FROM sales_channel_stock_location
         WHERE sales_channel_id = $1 AND stock_location_id = $2
           AND deleted_at IS NULL`,
        [channelId, loc.id],
      )
      if (rows.length > 0) {
        continue
      }
      await pg.query(
        `INSERT INTO sales_channel_stock_location
           (id, sales_channel_id, stock_location_id)
         VALUES ('scloc_' || replace(gen_random_uuid()::text, '-', ''), $1, $2)`,
        [channelId, loc.id],
      )
      console.log(
        `[ok]   linked sales channel ${channelId} -> stock location ${loc.id}`,
      )
    }
  }
}

/**
 * Ensure the existing default fulfillment set / service zone (from Medusa's
 * initial-data-seed migration, which is Europe-only by default) also covers
 * India, and that every shipping option in that zone has an INR price.
 *
 * Direct SQL because Medusa's admin API for editing geo_zones + shipping
 * option price sets requires several round trips and we want this to be
 * idempotent and deterministic at platform-setup scale.
 */
async function ensureIndianShipping(pg: Client): Promise<void> {
  // 1. Add an IN geo_zone to every existing service zone that doesn't have one
  const { rows: zonesMissingIn } = await pg.query<{
    service_zone_id: string
  }>(`
    SELECT sz.id AS service_zone_id
    FROM service_zone sz
    WHERE NOT EXISTS (
      SELECT 1 FROM geo_zone gz
      WHERE gz.service_zone_id = sz.id AND gz.country_code = 'in'
    )
  `)
  for (const z of zonesMissingIn) {
    await pg.query(
      `INSERT INTO geo_zone (id, type, country_code, service_zone_id)
       VALUES ('fgz_' || replace(gen_random_uuid()::text, '-', ''), 'country', 'in', $1)`,
      [z.service_zone_id],
    )
    console.log(`[ok]   added IN geo_zone to service_zone ${z.service_zone_id}`)
  }
  if (zonesMissingIn.length === 0) {
    console.log(`[skip] IN geo_zone already present on all service zones`)
  }

  // 2. Add an INR price to every shipping option that lacks one
  const { rows: optsNoInr } = await pg.query<{
    shipping_option_id: string
    price_set_id: string
  }>(`
    SELECT sops.shipping_option_id, sops.price_set_id
    FROM shipping_option_price_set sops
    WHERE NOT EXISTS (
      SELECT 1 FROM price p
      WHERE p.price_set_id = sops.price_set_id AND p.currency_code = 'inr'
    )
  `)
  for (const r of optsNoInr) {
    await pg.query(
      `INSERT INTO price (id, amount, raw_amount, currency_code, price_set_id)
       VALUES ('price_' || replace(gen_random_uuid()::text, '-', ''),
               99,
               $1::jsonb,
               'inr',
               $2)`,
      [JSON.stringify({ value: "99", precision: 20 }), r.price_set_id],
    )
    console.log(
      `[ok]   added INR price to shipping option ${r.shipping_option_id}`,
    )
  }
  if (optsNoInr.length === 0) {
    console.log(`[skip] all shipping options already priced in INR`)
  }
}

async function ensureProducts(
  admin: AdminApiClient,
  tenant: SeedTenant,
  salesChannelId: string,
): Promise<AdminProduct[]> {
  const out: AdminProduct[] = []
  for (let i = 0; i < tenant.products.length; i++) {
    const spec = tenant.products[i]!
    const handle = `${tenant.slug}-${i + 1}`
    const existing = await admin.listProductsByHandle(handle)
    const match = existing.find((p) => p.handle === handle)
    if (match) {
      console.log(`[skip] product ${handle} (id=${match.id}) exists`)
      out.push(match)
      continue
    }
    const product = await admin.createProduct({
      title: spec.title,
      handle,
      description: spec.description,
      status: "published",
      sales_channels: [{ id: salesChannelId }],
      options: [{ title: "Default", values: ["Default"] }],
      variants: [
        {
          title: "Default",
          manage_inventory: false,
          prices: [{ currency_code: "inr", amount: spec.price_inr_minor }],
        },
      ],
    })
    console.log(`[ok]   created product ${handle} id=${product.id}`)
    out.push(product)
  }
  return out
}

async function verifyTenantCatalog(
  baseUrl: string,
  publishableKey: string,
  tenantSlug: string,
  expectedHandlePrefix: string,
): Promise<void> {
  const res = await fetch(`${baseUrl}/store/products?limit=20`, {
    headers: { "x-publishable-api-key": publishableKey },
  })
  if (!res.ok) {
    throw new Error(
      `verify ${tenantSlug}: store API responded ${res.status}: ${await res.text()}`,
    )
  }
  const { products } = (await res.json()) as { products: { handle: string }[] }
  if (products.length === 0) {
    throw new Error(`verify ${tenantSlug}: store API returned 0 products`)
  }
  const wrongPrefix = products.filter(
    (p) => !p.handle.startsWith(expectedHandlePrefix),
  )
  if (wrongPrefix.length > 0) {
    throw new Error(
      `verify ${tenantSlug}: products with unexpected handle prefix: ${wrongPrefix
        .map((p) => p.handle)
        .join(", ")}`,
    )
  }
  console.log(
    `[ok]   verify ${tenantSlug}: ${products.length} products via store API`,
  )
}

async function main(): Promise<void> {
  const admin = new AdminApiClient({
    baseUrl: medusaBaseUrl(),
    email: envOrThrow("MEDUSA_ADMIN_EMAIL"),
    password: envOrThrow("MEDUSA_ADMIN_PASSWORD"),
  })

  const pg = new Client({ connectionString: buildDatabaseUrl() })
  await pg.connect()

  try {
    console.log("→ Ensuring INR region")
    await ensureInrRegion(admin)

    console.log("\n→ Ensuring India shipping coverage")
    await ensureIndianShipping(pg)

    console.log("\n→ Ensuring region payment providers")
    await ensureRegionPaymentProviders(pg)
    // sales channel links are filled in inside the per-tenant loop below
    // once we know each tenant's sales_channel_id

    const results: Array<{
      slug: string
      sales_channel_id: string
      publishable_api_key: string
    }> = []

    for (const t of TENANTS) {
      console.log(`\n→ Provisioning tenant: ${t.slug}`)

      const { rows } = await pg.query(UPSERT_TENANT, [
        t.slug,
        t.domain,
        t.layout_variant,
        JSON.stringify(t.theme_tokens),
        JSON.stringify({}),
      ])
      console.log(`[ok]   tenant row id=${rows[0].id}`)

      const salesChannelId = await ensureSalesChannel(admin, t)
      const key = await ensurePublishableApiKey(admin, t, salesChannelId)
      await ensureSalesChannelStockLinks(pg, [salesChannelId])
      await ensureProducts(admin, t, salesChannelId)

      const upd = await pg.query(UPDATE_TENANT_CHANNEL_KEY, [
        t.slug,
        salesChannelId,
        key.token,
      ])
      console.log(`[ok]   tenants.sales_channel_id + publishable_api_key written`)

      results.push({
        slug: t.slug,
        sales_channel_id: salesChannelId,
        publishable_api_key: key.token,
      })

      await verifyTenantCatalog(
        medusaBaseUrl(),
        key.token,
        t.slug,
        `${t.slug}-`,
      )
    }

    console.log("\n──────────── Seed complete ────────────")
    for (const r of results) {
      console.log(`  ${r.slug}: sales_channel=${r.sales_channel_id}`)
    }
    console.log("\nOpen:")
    console.log("  http://acme.localhost:3000")
    console.log("  http://globex.localhost:3000")
    console.log("\nIf *.localhost does not resolve on Windows, add to hosts file:")
    console.log("  127.0.0.1 acme.localhost")
    console.log("  127.0.0.1 globex.localhost")
  } finally {
    await pg.end()
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? `${err.message}\n${err.stack}` : err)
  process.exit(1)
})
