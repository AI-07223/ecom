/**
 * Platform tenant seed — runs automatically after `medusa db:migrate`.
 *
 * Provisioning steps (all idempotent):
 *   1. Ensure INR region exists
 *   2. For each tenant: ensure sales channel + publishable api key
 *   3. Link API keys to their channels
 *   4. Link sales channels to the default stock location
 *   5. Add India (IN) geo_zone to every service zone (so shipping resolves)
 *   6. Add INR price to every shipping option
 *   7. Link the default payment provider to every region
 *   8. Create 3 demo products per tenant (handles `<slug>-1..3`)
 *   9. Upsert the platform `tenants` row with theme tokens + the resolved
 *      sales_channel_id + publishable_api_key
 */

import type { MedusaContainer } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  ModuleRegistrationName,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows"

interface SeedTenant {
  slug: string
  display_name: string
  domain: string
  layout_variant: "compact" | "hero"
  theme_tokens: Record<string, string>
  products: Array<{
    title: string
    description: string
    price_inr: number
  }>
}

const TENANTS: SeedTenant[] = [
  {
    slug: "acme",
    display_name: "Acme",
    domain: "acme.networkbase75.site",
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
        price_inr: 1499,
      },
      {
        title: "Acme Folding Anvil",
        description:
          "All the weight of a traditional anvil; folds flat for travel. Loved by coyotes.",
        price_inr: 5999,
      },
      {
        title: "Acme Rocket-Powered Roller Skates",
        description:
          "Hand-controlled jet propulsion. Helmet not included. Read the warranty.",
        price_inr: 2999,
      },
    ],
  },
  {
    slug: "globex",
    display_name: "Globex",
    domain: "globex.networkbase75.site",
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
        price_inr: 2249,
      },
      {
        title: "Globex Linen Throw",
        description:
          "Heavy-weight linen, stonewashed. Drapes a chair or a small civilization.",
        price_inr: 4499,
      },
      {
        title: "Globex Ceramic Vase, Tall",
        description:
          "Stoneware vase with a matte oxide glaze. Hand-thrown in a workshop nobody can find.",
        price_inr: 3399,
      },
    ],
  },
]

export default async function platform_tenants_seed({
  container,
}: {
  container: MedusaContainer
}): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const pg = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const stockLocationModule = container.resolve(
    ModuleRegistrationName.STOCK_LOCATION,
  )

  logger.info("[platform-seed] Starting tenant provisioning...")

  // ── 1. Ensure INR region ────────────────────────────────────────────────
  const { data: existingRegions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code"],
  })
  let inrRegionId =
    (existingRegions as { id: string; currency_code: string }[]).find(
      (r) => r.currency_code === "inr",
    )?.id ?? null

  if (!inrRegionId) {
    const {
      result: [region],
    } = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: "India",
            currency_code: "inr",
            countries: ["in"],
            payment_providers: ["pp_system_default"],
          },
        ],
      },
    })
    inrRegionId = region.id
    logger.info(`[platform-seed] Created INR region ${inrRegionId}`)
  } else {
    logger.info(`[platform-seed] INR region exists (${inrRegionId})`)
  }

  // ── 2-4. Per-tenant sales channel + API key + stock location linking ───
  const { data: existingChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
  })
  const channelsByName = new Map<string, string>()
  for (const c of existingChannels as { id: string; name: string }[]) {
    channelsByName.set(c.name, c.id)
  }

  const { data: existingKeys } = await query.graph({
    entity: "api_key",
    fields: ["id", "title", "token", "type"],
  })
  const keysByTitle = new Map<string, { id: string; token: string }>()
  for (const k of existingKeys as {
    id: string
    title: string
    token: string
    type: string
  }[]) {
    if (k.type === "publishable") keysByTitle.set(k.title, { id: k.id, token: k.token })
  }

  const stockLocations = await stockLocationModule.listStockLocations({})
  const defaultLocationId = stockLocations[0]?.id

  const provisioned: Array<{
    slug: string
    sales_channel_id: string
    publishable_api_key: string
  }> = []

  for (const t of TENANTS) {
    let salesChannelId = channelsByName.get(t.display_name)
    if (!salesChannelId) {
      const {
        result: [sc],
      } = await createSalesChannelsWorkflow(container).run({
        input: {
          salesChannelsData: [
            { name: t.display_name, description: `${t.slug} storefront` },
          ],
        },
      })
      salesChannelId = sc.id
      logger.info(
        `[platform-seed] Created sales channel ${t.display_name} (${salesChannelId})`,
      )
    } else {
      logger.info(
        `[platform-seed] Sales channel ${t.display_name} exists (${salesChannelId})`,
      )
    }

    const keyTitle = `${t.slug}-storefront`
    let keyEntry = keysByTitle.get(keyTitle)
    if (!keyEntry) {
      const {
        result: [apk],
      } = await createApiKeysWorkflow(container).run({
        input: {
          api_keys: [
            { title: keyTitle, type: "publishable", created_by: "platform-seed" },
          ],
        },
      })
      keyEntry = { id: apk.id, token: apk.token }
      logger.info(`[platform-seed] Created publishable key ${keyTitle}`)
    } else {
      logger.info(`[platform-seed] Publishable key ${keyTitle} exists`)
    }

    // Always (re-)link the API key to the channel; the workflow handles dups
    await linkSalesChannelsToApiKeyWorkflow(container).run({
      input: { id: keyEntry.id, add: [salesChannelId] },
    })

    if (defaultLocationId) {
      await linkSalesChannelsToStockLocationWorkflow(container).run({
        input: {
          id: defaultLocationId,
          add: [salesChannelId],
        },
      })
    }

    provisioned.push({
      slug: t.slug,
      sales_channel_id: salesChannelId,
      publishable_api_key: keyEntry.token,
    })
  }

  // ── 5. Add IN geo_zone to every service zone (so shipping resolves) ────
  await pg.raw(`
    INSERT INTO geo_zone (id, type, country_code, service_zone_id)
    SELECT 'fgz_' || replace(gen_random_uuid()::text, '-', ''), 'country', 'in', sz.id
    FROM service_zone sz
    WHERE NOT EXISTS (
      SELECT 1 FROM geo_zone gz
      WHERE gz.service_zone_id = sz.id AND gz.country_code = 'in'
        AND gz.deleted_at IS NULL
    )
      AND sz.deleted_at IS NULL
  `)

  // ── 6. Add INR price to every shipping option that lacks one ───────────
  await pg.raw(`
    INSERT INTO price (id, amount, raw_amount, currency_code, price_set_id)
    SELECT 'price_' || replace(gen_random_uuid()::text, '-', ''),
           99,
           '{"value": "99", "precision": 20}'::jsonb,
           'inr',
           sops.price_set_id
    FROM shipping_option_price_set sops
    WHERE NOT EXISTS (
      SELECT 1 FROM price p
      WHERE p.price_set_id = sops.price_set_id
        AND p.currency_code = 'inr'
        AND p.deleted_at IS NULL
    )
  `)

  // ── 7. Link every enabled payment provider to every region ─────────────
  await pg.raw(`
    INSERT INTO region_payment_provider (id, region_id, payment_provider_id)
    SELECT 'regpp_' || replace(gen_random_uuid()::text, '-', ''),
           r.id,
           pp.id
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

  // ── 8. Per-tenant products ─────────────────────────────────────────────
  const { data: existingProducts } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
  })
  const productsByHandle = new Set(
    (existingProducts as { handle: string }[]).map((p) => p.handle),
  )

  for (const t of TENANTS) {
    const channelId = provisioned.find((p) => p.slug === t.slug)!.sales_channel_id
    for (let i = 0; i < t.products.length; i++) {
      const spec = t.products[i]!
      const handle = `${t.slug}-${i + 1}`
      if (productsByHandle.has(handle)) {
        logger.info(`[platform-seed] Product ${handle} exists`)
        continue
      }
      await createProductsWorkflow(container).run({
        input: {
          products: [
            {
              title: spec.title,
              handle,
              description: spec.description,
              status: ProductStatus.PUBLISHED,
              sales_channels: [{ id: channelId }],
              options: [{ title: "Default", values: ["Default"] }],
              variants: [
                {
                  title: "Default",
                  manage_inventory: false,
                  prices: [{ currency_code: "inr", amount: spec.price_inr }],
                  options: { Default: "Default" },
                },
              ],
            },
          ],
        },
      })
      logger.info(`[platform-seed] Created product ${handle}`)
    }
  }

  // ── 9. Upsert tenant rows in the platform `tenants` table ──────────────
  for (const t of TENANTS) {
    const p = provisioned.find((x) => x.slug === t.slug)!
    await pg.raw(
      // Knex's .raw() uses ? placeholders, NOT pg-native $N. The pg
      // connection comes from Medusa's container which is a Knex instance.
      `
      INSERT INTO tenants
        (slug, domain, layout_variant, theme_tokens, feature_flags, status,
         sales_channel_id, publishable_api_key)
      VALUES (?, ?, ?, ?::jsonb, '{}'::jsonb, 'active', ?, ?)
      ON CONFLICT (slug) DO UPDATE SET
        domain              = EXCLUDED.domain,
        layout_variant      = EXCLUDED.layout_variant,
        theme_tokens        = EXCLUDED.theme_tokens,
        feature_flags       = '{}'::jsonb,
        status              = 'active',
        sales_channel_id    = EXCLUDED.sales_channel_id,
        publishable_api_key = EXCLUDED.publishable_api_key
    `,
      [
        t.slug,
        t.domain,
        t.layout_variant,
        JSON.stringify(t.theme_tokens),
        p.sales_channel_id,
        p.publishable_api_key,
      ],
    )
    logger.info(`[platform-seed] Tenant row upserted: ${t.slug} → ${t.domain}`)
  }

  logger.info("[platform-seed] Done.")
}
