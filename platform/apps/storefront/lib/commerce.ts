import "server-only"

import Medusa from "@medusajs/js-sdk"
import { Pool } from "pg"
import type { Tenant } from "@platform/tenancy"

let ownershipPool: Pool | null = null
function getOwnershipPool(): Pool {
  if (ownershipPool) return ownershipPool
  const connectionString =
    process.env.PLATFORM_DATABASE_URL ?? process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error(
      "commerce: PLATFORM_DATABASE_URL is not set; required for order ownership checks",
    )
  }
  ownershipPool = new Pool({ connectionString, max: 3 })
  return ownershipPool
}

/**
 * Look up which Medusa sales channel owns a given order.
 * Returns null if the order doesn't exist.
 *
 * The Medusa Store API omits `sales_channel_id` from order responses, so we
 * query the underlying Postgres directly to enforce cross-tenant isolation.
 */
async function orderSalesChannelId(orderId: string): Promise<string | null> {
  const pool = getOwnershipPool()
  const { rows } = await pool.query<{ sales_channel_id: string | null }>(
    'SELECT sales_channel_id FROM "order" WHERE id = $1 AND deleted_at IS NULL LIMIT 1',
    [orderId],
  )
  return rows[0]?.sales_channel_id ?? null
}

/**
 * Single facade for every Medusa Store API call from the storefront.
 *
 * Rule: no module outside this file may import `@medusajs/js-sdk`. The
 * facade enforces that every outbound call carries the tenant's publishable
 * key so that cross-tenant data leakage is impossible by construction.
 */

function backendUrl(): string {
  const url = process.env.MEDUSA_BACKEND_URL
  if (!url) {
    throw new Error(
      "commerce: MEDUSA_BACKEND_URL is not set on the server environment",
    )
  }
  return url
}

function clientFor(tenant: Tenant): Medusa {
  if (!tenant.publishable_api_key) {
    throw new Error(
      `commerce: tenant "${tenant.slug}" has no publishable_api_key`,
    )
  }
  return new Medusa({
    baseUrl: backendUrl(),
    publishableKey: tenant.publishable_api_key,
  })
}

// ─── Products ──────────────────────────────────────────────────────────

export async function listProducts({
  tenant,
  limit = 24,
}: {
  tenant: Tenant
  limit?: number
}) {
  const client = clientFor(tenant)
  const region_id = await getInrRegionId(tenant)
  const { products } = await client.store.product.list({
    limit,
    region_id,
    fields: "*variants.calculated_price",
  })
  return products
}

export async function getProductByHandle({
  tenant,
  handle,
}: {
  tenant: Tenant
  handle: string
}) {
  const client = clientFor(tenant)
  const { products } = await client.store.product.list({ handle, limit: 1 })
  return products[0] ?? null
}

// ─── Regions ───────────────────────────────────────────────────────────

async function getInrRegionId(tenant: Tenant): Promise<string> {
  const client = clientFor(tenant)
  const { regions } = await client.store.region.list({ limit: 50 })
  const inr = regions.find((r) => r.currency_code === "inr")
  if (!inr) {
    throw new Error("commerce: no INR region found — run npm run seed")
  }
  return inr.id
}

// ─── Carts ─────────────────────────────────────────────────────────────

export async function createCart({
  tenant,
}: {
  tenant: Tenant
}): Promise<string> {
  const client = clientFor(tenant)
  const region_id = await getInrRegionId(tenant)
  const { cart } = await client.store.cart.create({ region_id })
  return cart.id
}

export async function getCart({
  tenant,
  cartId,
}: {
  tenant: Tenant
  cartId: string
}) {
  if (!cartId) return null
  try {
    const client = clientFor(tenant)
    const { cart } = await client.store.cart.retrieve(cartId)
    return cart
  } catch (err) {
    // Medusa returns 404 if the cart doesn't exist or isn't visible to this
    // sales channel. Callers treat null as "no cart" and create one.
    return null
  }
}

export async function getOrCreateCart({
  tenant,
  cartId,
}: {
  tenant: Tenant
  cartId: string | null | undefined
}): Promise<{ cart: NonNullable<Awaited<ReturnType<typeof getCart>>>; created: boolean }> {
  if (cartId) {
    const cart = await getCart({ tenant, cartId })
    if (cart) return { cart, created: false }
  }
  const newId = await createCart({ tenant })
  const cart = await getCart({ tenant, cartId: newId })
  if (!cart) throw new Error("commerce: failed to retrieve newly-created cart")
  return { cart, created: true }
}

export async function addLineItem({
  tenant,
  cartId,
  variantId,
  quantity = 1,
}: {
  tenant: Tenant
  cartId: string
  variantId: string
  quantity?: number
}) {
  const client = clientFor(tenant)
  const { cart } = await client.store.cart.createLineItem(cartId, {
    variant_id: variantId,
    quantity,
  })
  return cart
}

export async function updateLineItem({
  tenant,
  cartId,
  lineItemId,
  quantity,
}: {
  tenant: Tenant
  cartId: string
  lineItemId: string
  quantity: number
}) {
  const client = clientFor(tenant)
  const { cart } = await client.store.cart.updateLineItem(
    cartId,
    lineItemId,
    { quantity },
  )
  return cart
}

export async function deleteLineItem({
  tenant,
  cartId,
  lineItemId,
}: {
  tenant: Tenant
  cartId: string
  lineItemId: string
}) {
  const client = clientFor(tenant)
  const { parent } = await client.store.cart.deleteLineItem(cartId, lineItemId)
  return parent
}

interface AddressInput {
  first_name: string
  last_name: string
  phone?: string
  address_1: string
  address_2?: string
  city: string
  province?: string
  postal_code: string
  country_code: string
}

export async function updateCartShippingAddress({
  tenant,
  cartId,
  email,
  address,
}: {
  tenant: Tenant
  cartId: string
  email: string
  address: AddressInput
}) {
  const client = clientFor(tenant)
  const { cart } = await client.store.cart.update(cartId, {
    email,
    shipping_address: address,
    billing_address: address,
  })
  return cart
}

// ─── Shipping options ──────────────────────────────────────────────────

export async function listShippingOptions({
  tenant,
  cartId,
}: {
  tenant: Tenant
  cartId: string
}) {
  const client = clientFor(tenant)
  const { shipping_options } = await client.store.fulfillment.listCartOptions({
    cart_id: cartId,
  })
  return shipping_options
}

export async function setShippingMethod({
  tenant,
  cartId,
  optionId,
}: {
  tenant: Tenant
  cartId: string
  optionId: string
}) {
  const client = clientFor(tenant)
  const { cart } = await client.store.cart.addShippingMethod(cartId, {
    option_id: optionId,
  })
  return cart
}

// ─── Payment collection + cart completion ─────────────────────────────

/**
 * Ensure the cart has a payment collection with a payment session so
 * `cart.complete` can proceed. For now we use Medusa's `pp_system_default`
 * provider (no real charge); the Cashfree provider replaces this in the
 * next change.
 */
export async function ensurePaymentSession({
  tenant,
  cartId,
}: {
  tenant: Tenant
  cartId: string
}): Promise<void> {
  const client = clientFor(tenant)
  const cart = await client.store.cart.retrieve(cartId)
  const collectionId = cart.cart?.payment_collection?.id
  let pcId: string
  if (collectionId) {
    pcId = collectionId
  } else {
    const created = await client.store.payment.initiatePaymentSession(cart.cart, {
      provider_id: "pp_system_default",
    })
    // SDK shape: { payment_collection: {...} }
    const c = created as { payment_collection?: { id: string } }
    if (!c.payment_collection?.id) {
      throw new Error("commerce: failed to initiate payment session")
    }
    return
  }
  // If collection exists but has no session for our provider, initiate one
  await client.store.payment.initiatePaymentSession(cart.cart, {
    provider_id: "pp_system_default",
  })
  void pcId
}

export async function completeCart({
  tenant,
  cartId,
}: {
  tenant: Tenant
  cartId: string
}): Promise<{ orderId: string | null; cart: unknown }> {
  const client = clientFor(tenant)
  const result = await client.store.cart.complete(cartId)
  // Medusa returns either { type: "order", order: {...} } or { type: "cart", cart: {...}, error: ... }
  // The v2 SDK shape:
  const r = result as { type?: string; order?: { id: string }; cart?: unknown }
  if (r.type === "order" && r.order) return { orderId: r.order.id, cart: null }
  return { orderId: null, cart: r.cart ?? null }
}

export async function getOrder({
  tenant,
  orderId,
}: {
  tenant: Tenant
  orderId: string
}) {
  if (!orderId) return null
  // Cross-tenant isolation: refuse to fetch an order that doesn't belong to
  // the resolved tenant's sales channel. Medusa's Store API doesn't enforce
  // this (it returns any order id with any publishable key), so we check
  // ownership in the platform DB first.
  if (tenant.sales_channel_id) {
    const ownerSc = await orderSalesChannelId(orderId)
    if (!ownerSc || ownerSc !== tenant.sales_channel_id) return null
  }
  try {
    const client = clientFor(tenant)
    const { order } = await client.store.order.retrieve(orderId)
    return order
  } catch {
    return null
  }
}
