/**
 * Cart server helpers. Resolves the current cart for the request via
 * either an authenticated user or an HttpOnly `hb_cart` session cookie
 * containing a UUID.
 */
import { cookies } from "next/headers"
import { randomUUID } from "node:crypto"
import { db } from "./db"
import { getCurrentUser } from "./session"

export const CART_COOKIE = "hb_cart"
const CART_COOKIE_TTL_S = 60 * 60 * 24 * 30 // 30 days

/**
 * Return the current cart (creating one if needed). Authenticated users
 * get an upserted cart by userId; anonymous users by sessionId from the
 * hb_cart cookie. If the cookie is absent for an anonymous visit, sets one.
 */
export async function getOrCreateCart(): Promise<{
  id: string
  userId: string | null
  sessionId: string | null
}> {
  const user = await getCurrentUser()
  const jar = await cookies()

  if (user) {
    // Authenticated — prefer the user's existing cart; if they had an
    // anonymous one in cookie, fold it under the userId on first call.
    const sessionId = jar.get(CART_COOKIE)?.value ?? null

    let cart =
      (await db.cart.findFirst({
        where: { userId: user.id },
      })) ??
      (sessionId
        ? await db.cart.findFirst({ where: { sessionId } })
        : null)

    if (cart) {
      if (cart.userId !== user.id) {
        cart = await db.cart.update({
          where: { id: cart.id },
          data: { userId: user.id },
        })
      }
      return { id: cart.id, userId: cart.userId, sessionId: cart.sessionId }
    }

    const created = await db.cart.create({
      data: { userId: user.id, sessionId: sessionId ?? randomUUID() },
    })
    return { id: created.id, userId: created.userId, sessionId: created.sessionId }
  }

  // Anonymous flow
  let sessionId = jar.get(CART_COOKIE)?.value
  if (!sessionId) {
    sessionId = randomUUID()
    // Next.js 16 only allows cookie writes from Server Actions / Route
    // Handlers; if a Server Component renders this we silently skip the
    // seed (the cookie gets set the first time the user mutates the cart
    // via a Server Action). The error doesn't break the render — we just
    // don't want it spamming the logs.
    try {
      jar.set(CART_COOKIE, sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: CART_COOKIE_TTL_S,
      })
    } catch {
      // Render-time call — cookie write will happen on first mutation.
    }
  }

  const existing = await db.cart.findUnique({ where: { sessionId } })
  if (existing) return { id: existing.id, userId: existing.userId, sessionId }

  const created = await db.cart.create({
    data: { sessionId },
  })
  return { id: created.id, userId: created.userId, sessionId }
}

/**
 * Cart summary for UI rendering — includes items with snapshot data.
 */
export async function getCartWithItems() {
  const cart = await getOrCreateCart()
  const full = await db.cart.findUnique({
    where: { id: cart.id },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
        include: { menuItem: true },
      },
    },
  })
  return full
}

/**
 * Returns just the count + total in paise (for the sticky bottom bar).
 */
export async function getCartSummary(): Promise<{
  count: number
  subtotalPaise: number
}> {
  const cart = await getOrCreateCart()
  const items = await db.cartItem.findMany({ where: { cartId: cart.id } })
  return {
    count: items.reduce((sum, i) => sum + i.quantity, 0),
    subtotalPaise: items.reduce((sum, i) => sum + i.lineTotalPaise, 0),
  }
}
