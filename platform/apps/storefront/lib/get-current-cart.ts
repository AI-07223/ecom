import "server-only"

import { getTenant } from "./getTenant"
import { getCart } from "./commerce"
import { getCartIdCookie } from "./cart"

/**
 * Read the customer's current cart (server component helper).
 * Returns null when no cart exists or the cookie points at a missing cart.
 */
export async function getCurrentCart() {
  const tenant = await getTenant()
  const cartId = await getCartIdCookie()
  if (!cartId) return null
  return getCart({ tenant, cartId })
}
