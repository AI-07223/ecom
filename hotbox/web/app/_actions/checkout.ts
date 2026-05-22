"use server"

import { z } from "zod"
import { db } from "@/lib/db"
import { getOrCreateCart } from "@/lib/cart"
import { getRestaurant } from "@/lib/catalog"
import {
  createCashfreeOrder,
  isCashfreeConfigured,
} from "@/lib/cashfree"
import { mintPublicCode } from "@/lib/orders"
import { computeTotals } from "@/lib/pricing"
import { getCurrentUser } from "@/lib/session"

const StartCheckoutInput = z.object({
  addressId: z.string().min(1),
  notes: z.string().max(500).nullish(),
})

export async function startCheckout(
  input: z.infer<typeof StartCheckoutInput>,
): Promise<
  | {
      ok: true
      orderId: string
      publicCode: string
      paymentSessionId: string
      cfOrderId: string
      cashfreeEnv: "sandbox" | "production"
    }
  | { ok: false; error: string }
> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "Sign in to place an order" }

  const parsed = StartCheckoutInput.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "Invalid checkout input" }
  }

  if (!isCashfreeConfigured()) {
    return {
      ok: false,
      error:
        "Payment is not configured yet. Operator: set CASHFREE_APP_ID and CASHFREE_SECRET_KEY in Coolify.",
    }
  }

  const restaurant = await getRestaurant()
  if (!restaurant) {
    return { ok: false, error: "Restaurant data missing" }
  }
  if (restaurant.isPaused) {
    return {
      ok: false,
      error: "Sorry, we're not taking orders right now. Try again later.",
    }
  }

  // Validate operating hours (timezone-agnostic — uses the server's clock,
  // which the Dockerfile sets to UTC. Restaurant timezone is stored but
  // we keep this check intentionally simple for v1; finer-grained TZ
  // handling can land later.)
  const now = new Date()
  const hh = now.getHours().toString().padStart(2, "0")
  const mm = now.getMinutes().toString().padStart(2, "0")
  const hhmm = `${hh}:${mm}`
  if (hhmm < restaurant.openTime || hhmm > restaurant.closeTime) {
    return {
      ok: false,
      error: `We're open ${restaurant.openTime}-${restaurant.closeTime}. Try then.`,
    }
  }

  // Verify address belongs to user
  const address = await db.address.findFirst({
    where: {
      id: parsed.data.addressId,
      userId: user.id,
      deletedAt: null,
    },
  })
  if (!address) {
    return { ok: false, error: "Pick a valid delivery address" }
  }

  // Resolve cart
  const cartHandle = await getOrCreateCart()
  const cart = await db.cart.findUnique({
    where: { id: cartHandle.id },
    include: { items: true },
  })
  if (!cart || cart.items.length === 0) {
    return { ok: false, error: "Your cart is empty" }
  }

  // Verify each line item's menu item is still available; if not, we
  // refuse checkout (per spec: customer must remove unavailable items).
  const menuItems = await db.menuItem.findMany({
    where: { id: { in: cart.items.map((i) => i.menuItemId) } },
    select: { id: true, isAvailable: true, title: true },
  })
  const unavailable = cart.items
    .map((i) => menuItems.find((m) => m.id === i.menuItemId))
    .filter((m): m is { id: string; isAvailable: boolean; title: string } => !!m)
    .filter((m) => !m.isAvailable)
  if (unavailable.length > 0) {
    return {
      ok: false,
      error: `${unavailable[0]!.title} is no longer available. Remove it from your cart.`,
    }
  }

  // Compute totals snapshot
  const lines = cart.items.map((i) => ({
    unitPricePaise: i.unitPricePaise,
    addonsPricePerUnitPaise: Math.max(
      0,
      i.lineTotalPaise / i.quantity - i.unitPricePaise,
    ),
    quantity: i.quantity,
  }))
  const totals = computeTotals(lines, {
    deliveryFeePaise: restaurant.deliveryFeePaise,
    packagingFeePaise: restaurant.packagingFeePaise,
    gstBasisPoints: restaurant.gstBasisPoints,
  })

  // Create the order row + snapshot order_items in a transaction, then
  // create the Cashfree session (network call) AFTER the DB commit so
  // we can recover if Cashfree fails (we'd still have an unpaid order row
  // we can retry or cancel from admin).
  const publicCode = mintPublicCode()
  const order = await db.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        publicCode,
        restaurantId: restaurant.id,
        userId: user.id,
        addressId: address.id,
        state: "PLACED",
        paymentStatus: "PENDING",
        subtotalPaise: totals.subtotalPaise,
        packagingFeePaise: totals.packagingFeePaise,
        deliveryFeePaise: totals.deliveryFeePaise,
        gstPaise: totals.gstPaise,
        totalPaise: totals.totalPaise,
        notes: parsed.data.notes ?? null,
      },
    })

    await tx.orderItem.createMany({
      data: cart.items.map((i) => ({
        orderId: created.id,
        menuItemId: i.menuItemId,
        itemTitle: i.itemTitle,
        variantSlug: i.variantSlug,
        variantName: i.variantName,
        addonsJson: i.addonsJson as object,
        quantity: i.quantity,
        unitPricePaise: i.unitPricePaise,
        lineTotalPaise: i.lineTotalPaise,
        specialInstructions: i.specialInstructions,
      })),
    })

    // Customer-facing timeline starts with placed-but-pending-payment
    // event. We DON'T write the "PLACED" event until Cashfree confirms
    // payment — the webhook does that.

    return created
  })

  // Create the Cashfree payment session
  const baseUrl = process.env.PUBLIC_BASE_URL ?? "https://hotbox.networkbase75.site"
  const customerPhoneDigits = user.phone.replace(/[^0-9]/g, "").slice(-10)
  let cashfreeSession
  try {
    cashfreeSession = await createCashfreeOrder({
      orderId: order.id,
      amountRupees: totals.totalPaise / 100,
      customer: {
        id: user.id,
        phone: customerPhoneDigits.length >= 10 ? customerPhoneDigits : "9999999999",
        name: user.name ?? undefined,
      },
      returnUrl: `${baseUrl}/orders/${order.id}/confirmation?cf_order_id={order_id}`,
      notifyUrl: `${baseUrl}/api/cashfree/webhook`,
      noteToMerchant: `Hotbox order ${publicCode}`,
    })
  } catch (err) {
    console.error("[checkout] Cashfree session failed:", err)
    // Don't leave the order in PENDING limbo if Cashfree itself rejected us.
    await db.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "FAILED",
        state: "CANCELLED",
        cancelledAt: new Date(),
        cancelledReason: "Payment provider rejected the order",
      },
    })
    await db.orderEvent.create({
      data: {
        orderId: order.id,
        event: "CANCELLED",
        note: "Cashfree session creation failed",
      },
    })
    return {
      ok: false,
      error:
        "We couldn't reach the payment gateway. Please try again in a moment.",
    }
  }

  await db.order.update({
    where: { id: order.id },
    data: {
      cashfreeOrderId: cashfreeSession.cfOrderId,
      cashfreePaymentSessionId: cashfreeSession.paymentSessionId,
    },
  })

  // Empty the cart now — the order owns the snapshot.
  await db.cartItem.deleteMany({ where: { cartId: cart.id } })

  return {
    ok: true,
    orderId: order.id,
    publicCode,
    paymentSessionId: cashfreeSession.paymentSessionId,
    cfOrderId: cashfreeSession.cfOrderId,
    cashfreeEnv: (process.env.CASHFREE_ENV === "production"
      ? "production"
      : "sandbox") as "sandbox" | "production",
  }
}
