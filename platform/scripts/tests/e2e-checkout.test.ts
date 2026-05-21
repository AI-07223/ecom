/**
 * End-to-end checkout test.
 *
 * Drives the full Medusa Store API flow for one tenant:
 *   create cart → add item → set address → set shipping → init payment → complete → fetch order
 *
 * Verifies the data plane the storefront uses; the UI render is verified
 * separately by e2e-catalog-isolation.
 */

import { describe, expect, it, beforeAll } from "vitest"
import { Client } from "pg"
import { request as undiciRequest } from "undici"
import { config as loadDotenv } from "dotenv"

loadDotenv()

const MEDUSA = process.env.MEDUSA_BACKEND_URL ?? "http://localhost:9000"
const STOREFRONT_PORT = process.env.STOREFRONT_PORT ?? "3000"

interface TenantCreds {
  slug: string
  publishable_api_key: string
  sales_channel_id: string
}

let tenants: Record<string, TenantCreds> = {}

beforeAll(async () => {
  const url =
    process.env.PLATFORM_DATABASE_URL ??
    `postgres://${process.env.POSTGRES_USER ?? "platform"}:${
      process.env.POSTGRES_PASSWORD ?? "change-me-in-prod"
    }@localhost:${process.env.POSTGRES_PORT ?? "54320"}/${
      process.env.POSTGRES_DB ?? "platform"
    }`
  const pg = new Client({ connectionString: url })
  await pg.connect()
  try {
    const { rows } = await pg.query<TenantCreds>(
      "SELECT slug, publishable_api_key, sales_channel_id FROM tenants",
    )
    for (const r of rows) {
      if (r.publishable_api_key && r.sales_channel_id) tenants[r.slug] = r
    }
  } finally {
    await pg.end()
  }
})

async function api(
  pubKey: string,
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; data: any }> {
  const res = await fetch(`${MEDUSA}${path}`, {
    ...init,
    headers: {
      "x-publishable-api-key": pubKey,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  })
  const data = res.status === 204 ? null : await res.json().catch(() => null)
  return { status: res.status, data }
}

async function findInrRegionId(pubKey: string): Promise<string> {
  const { data } = await api(pubKey, "/store/regions?limit=50")
  const inr = data.regions.find((r: any) => r.currency_code === "inr")
  if (!inr) throw new Error("no INR region")
  return inr.id
}

describe("E2E: checkout flow", () => {
  it("acme tenant: create cart → place order → fetch order", async () => {
    const acme = tenants.acme
    expect(acme).toBeDefined()
    const pk = acme.publishable_api_key
    const region_id = await findInrRegionId(pk)

    // 1. Create cart
    const cartRes = await api(pk, "/store/carts", {
      method: "POST",
      body: JSON.stringify({ region_id }),
    })
    expect(cartRes.status).toBe(200)
    const cartId = cartRes.data.cart.id

    // 2. List products, pick first variant
    const prodRes = await api(pk, `/store/products?limit=5&region_id=${region_id}&fields=*variants.calculated_price`)
    const product = prodRes.data.products[0]
    const variantId = product.variants[0].id

    // 3. Add line item
    const addRes = await api(pk, `/store/carts/${cartId}/line-items`, {
      method: "POST",
      body: JSON.stringify({ variant_id: variantId, quantity: 1 }),
    })
    expect(addRes.status).toBe(200)
    expect(addRes.data.cart.items).toHaveLength(1)

    // 4. Set shipping address + email
    const addrRes = await api(pk, `/store/carts/${cartId}`, {
      method: "POST",
      body: JSON.stringify({
        email: "e2e@acme.local",
        shipping_address: {
          first_name: "E2E",
          last_name: "Test",
          address_1: "1 Test Lane",
          city: "Mumbai",
          province: "MH",
          postal_code: "400001",
          country_code: "in",
        },
        billing_address: {
          first_name: "E2E",
          last_name: "Test",
          address_1: "1 Test Lane",
          city: "Mumbai",
          province: "MH",
          postal_code: "400001",
          country_code: "in",
        },
      }),
    })
    expect(addrRes.status).toBe(200)

    // 5. List shipping options + pick first
    const shipRes = await api(pk, `/store/shipping-options?cart_id=${cartId}`)
    expect(shipRes.status).toBe(200)
    expect(shipRes.data.shipping_options.length).toBeGreaterThan(0)
    const optionId = shipRes.data.shipping_options[0].id

    const setRes = await api(pk, `/store/carts/${cartId}/shipping-methods`, {
      method: "POST",
      body: JSON.stringify({ option_id: optionId }),
    })
    expect(setRes.status).toBe(200)

    // 6. Initialize payment session with the default system provider
    const paymentRes = await api(pk, `/store/payment-collections`, {
      method: "POST",
      body: JSON.stringify({ cart_id: cartId }),
    })
    expect([200, 201]).toContain(paymentRes.status)
    const pcId = paymentRes.data.payment_collection.id

    const sessRes = await api(
      pk,
      `/store/payment-collections/${pcId}/payment-sessions`,
      {
        method: "POST",
        body: JSON.stringify({ provider_id: "pp_system_default" }),
      },
    )
    expect([200, 201]).toContain(sessRes.status)

    // 7. Complete cart
    const completeRes = await api(pk, `/store/carts/${cartId}/complete`, {
      method: "POST",
    })
    expect(completeRes.status).toBe(200)
    expect(completeRes.data.type).toBe("order")
    const orderId = completeRes.data.order.id
    expect(orderId).toMatch(/^order_/)

    // 8. Fetch order back via Store API
    const orderRes = await api(pk, `/store/orders/${orderId}`)
    expect(orderRes.status).toBe(200)
    expect(orderRes.data.order.id).toBe(orderId)
    expect(orderRes.data.order.email).toBe("e2e@acme.local")
    expect(orderRes.data.order.payment_status).toMatch(/not_paid|awaiting|authorized/)
  }, 30_000)

  it("cross-tenant order fetch returns 404 (catalog isolation)", async () => {
    // Re-run the steps above to get an acme order
    const acme = tenants.acme
    const globex = tenants.globex
    expect(globex).toBeDefined()

    const region_id = await findInrRegionId(acme.publishable_api_key)
    const cartRes = await api(acme.publishable_api_key, "/store/carts", {
      method: "POST",
      body: JSON.stringify({ region_id }),
    })
    const cartId = cartRes.data.cart.id
    const prodRes = await api(
      acme.publishable_api_key,
      `/store/products?limit=1&region_id=${region_id}&fields=*variants.calculated_price`,
    )
    const variantId = prodRes.data.products[0].variants[0].id
    await api(acme.publishable_api_key, `/store/carts/${cartId}/line-items`, {
      method: "POST",
      body: JSON.stringify({ variant_id: variantId, quantity: 1 }),
    })
    await api(acme.publishable_api_key, `/store/carts/${cartId}`, {
      method: "POST",
      body: JSON.stringify({
        email: "isolation@acme.local",
        shipping_address: {
          first_name: "I",
          last_name: "T",
          address_1: "x",
          city: "x",
          postal_code: "400001",
          country_code: "in",
        },
        billing_address: {
          first_name: "I",
          last_name: "T",
          address_1: "x",
          city: "x",
          postal_code: "400001",
          country_code: "in",
        },
      }),
    })
    const shipOpts = await api(
      acme.publishable_api_key,
      `/store/shipping-options?cart_id=${cartId}`,
    )
    await api(
      acme.publishable_api_key,
      `/store/carts/${cartId}/shipping-methods`,
      {
        method: "POST",
        body: JSON.stringify({ option_id: shipOpts.data.shipping_options[0].id }),
      },
    )
    const pc = await api(acme.publishable_api_key, `/store/payment-collections`, {
      method: "POST",
      body: JSON.stringify({ cart_id: cartId }),
    })
    await api(
      acme.publishable_api_key,
      `/store/payment-collections/${pc.data.payment_collection.id}/payment-sessions`,
      {
        method: "POST",
        body: JSON.stringify({ provider_id: "pp_system_default" }),
      },
    )
    const complete = await api(acme.publishable_api_key, `/store/carts/${cartId}/complete`, {
      method: "POST",
    })
    const acmeOrderId = complete.data.order.id

    // Confirm Medusa itself does NOT enforce sales-channel scoping on
    // /store/orders/:id — this is the gap our storefront facade closes.
    const medusaCrossRes = await api(
      globex.publishable_api_key,
      `/store/orders/${acmeOrderId}`,
    )
    expect(medusaCrossRes.status).toBe(200)

    // The storefront's confirmation route uses getOrder() which checks the
    // order's sales_channel_id against the resolved tenant. Visiting an
    // Acme order under the Globex hostname must return 404.
    const crossUiRes = await undiciRequest(
      `http://127.0.0.1:${STOREFRONT_PORT}/orders/${acmeOrderId}/confirmation`,
      {
        method: "GET",
        headers: { host: `globex.localhost:${STOREFRONT_PORT}` },
      },
    )
    expect(crossUiRes.statusCode).toBe(404)

    // The same order on its own tenant returns 200
    const sameTenantRes = await undiciRequest(
      `http://127.0.0.1:${STOREFRONT_PORT}/orders/${acmeOrderId}/confirmation`,
      {
        method: "GET",
        headers: { host: `acme.localhost:${STOREFRONT_PORT}` },
      },
    )
    expect(sameTenantRes.statusCode).toBe(200)
  }, 30_000)
})
