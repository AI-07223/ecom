"use server"

import "server-only"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getTenant } from "./getTenant"
import {
  addLineItem,
  completeCart,
  deleteLineItem,
  ensurePaymentSession,
  getOrCreateCart,
  setShippingMethod,
  updateCartShippingAddress,
  updateLineItem,
} from "./commerce"

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  // 30-day soft cap; Medusa carts expire well before this
  maxAge: 60 * 60 * 24 * 30,
}

function cookieName(slug: string): string {
  return `cart_${slug}`
}

/** Read the current cart id cookie for this tenant. */
export async function getCartIdCookie(): Promise<string | null> {
  const tenant = await getTenant()
  const jar = await cookies()
  return jar.get(cookieName(tenant.slug))?.value ?? null
}

async function setCartIdCookie(slug: string, cartId: string): Promise<void> {
  const jar = await cookies()
  jar.set(cookieName(slug), cartId, COOKIE_OPTIONS)
}

async function clearCartIdCookie(slug: string): Promise<void> {
  const jar = await cookies()
  jar.delete(cookieName(slug))
}

// ─── Server Actions ────────────────────────────────────────────────────

export async function addToCartAction(formData: FormData): Promise<void> {
  const tenant = await getTenant()
  const variantId = String(formData.get("variant_id") ?? "")
  if (!variantId) throw new Error("addToCart: variant_id required")

  const existingCartId = await getCartIdCookie()
  const { cart: existingOrNew, created } = await getOrCreateCart({
    tenant,
    cartId: existingCartId,
  })
  if (created) await setCartIdCookie(tenant.slug, existingOrNew.id)

  await addLineItem({
    tenant,
    cartId: existingOrNew.id,
    variantId,
    quantity: 1,
  })

  revalidatePath("/")
  revalidatePath("/cart")
}

export async function updateQuantityAction(formData: FormData): Promise<void> {
  const tenant = await getTenant()
  const lineItemId = String(formData.get("line_item_id") ?? "")
  const quantity = Number(formData.get("quantity") ?? 0)
  if (!lineItemId || !Number.isFinite(quantity)) return

  const cartId = await getCartIdCookie()
  if (!cartId) return

  if (quantity <= 0) {
    await deleteLineItem({ tenant, cartId, lineItemId })
  } else {
    await updateLineItem({ tenant, cartId, lineItemId, quantity })
  }
  revalidatePath("/cart")
}

export async function removeFromCartAction(formData: FormData): Promise<void> {
  const tenant = await getTenant()
  const lineItemId = String(formData.get("line_item_id") ?? "")
  if (!lineItemId) return
  const cartId = await getCartIdCookie()
  if (!cartId) return
  await deleteLineItem({ tenant, cartId, lineItemId })
  revalidatePath("/cart")
}

export async function submitAddressAction(formData: FormData): Promise<void> {
  const tenant = await getTenant()
  const cartId = await getCartIdCookie()
  if (!cartId) redirect("/cart")

  const email = String(formData.get("email") ?? "").trim()
  const first_name = String(formData.get("first_name") ?? "").trim()
  const last_name = String(formData.get("last_name") ?? "").trim()
  const phone = String(formData.get("phone") ?? "").trim() || undefined
  const address_1 = String(formData.get("address_1") ?? "").trim()
  const city = String(formData.get("city") ?? "").trim()
  const province = String(formData.get("province") ?? "").trim() || undefined
  const postal_code = String(formData.get("postal_code") ?? "").trim()
  const country_code =
    String(formData.get("country_code") ?? "in").trim().toLowerCase() || "in"

  await updateCartShippingAddress({
    tenant,
    cartId: cartId!,
    email,
    address: {
      first_name,
      last_name,
      phone,
      address_1,
      city,
      province,
      postal_code,
      country_code,
    },
  })

  redirect("/checkout/shipping")
}

export async function setShippingMethodAction(
  formData: FormData,
): Promise<void> {
  const tenant = await getTenant()
  const cartId = await getCartIdCookie()
  if (!cartId) redirect("/cart")
  const optionId = String(formData.get("option_id") ?? "")
  if (!optionId) return

  await setShippingMethod({ tenant, cartId: cartId!, optionId })
  redirect("/checkout/review")
}

export async function placeOrderAction(): Promise<void> {
  const tenant = await getTenant()
  const cartId = await getCartIdCookie()
  if (!cartId) redirect("/cart")

  // Cashfree integration ships in the next change. For now we initiate a
  // payment session against Medusa's built-in `pp_system_default` provider
  // so cart.complete() succeeds; the resulting order's payment_status is
  // `not_paid` until the real provider is wired.
  await ensurePaymentSession({ tenant, cartId: cartId! })

  const { orderId } = await completeCart({ tenant, cartId: cartId! })
  if (!orderId) {
    revalidatePath("/checkout/review")
    return
  }
  await clearCartIdCookie(tenant.slug)
  redirect(`/orders/${orderId}/confirmation`)
}
