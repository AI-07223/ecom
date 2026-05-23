"use server"

import { z } from "zod"
import { PaymentMethod, PaymentStatus } from "@prisma/client"
import { db } from "@/lib/db"
import { getOrCreateCart } from "@/lib/cart"
import { getRestaurant } from "@/lib/catalog"
import { mintPublicCode } from "@/lib/orders"
import { computeTotals } from "@/lib/pricing"
import { getCurrentUser } from "@/lib/session"

const StartCheckoutInput = z.object({
  addressId: z.string().min(1),
  paymentMethod: z.enum(["UPI_MANUAL", "COD"]),
  notes: z.string().max(500).nullish(),
})

export async function startCheckout(
  input: z.infer<typeof StartCheckoutInput>,
): Promise<
  | {
      ok: true
      orderId: string
      publicCode: string
      paymentMethod: "UPI_MANUAL" | "COD"
    }
  | { ok: false; error: string }
> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "Sign in to place an order" }

  const parsed = StartCheckoutInput.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "Invalid checkout input" }
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

  // Operating hours (server clock — UTC. Restaurant timezone stored, simple
  // check is good enough for v1.)
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

  // For UPI_MANUAL we need the merchant to have configured a VPA.
  if (parsed.data.paymentMethod === "UPI_MANUAL" && !restaurant.upiVpa) {
    return {
      ok: false,
      error:
        "Online payment isn't set up by the restaurant yet. Pick Cash on Delivery, or try later.",
    }
  }

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

  const cartHandle = await getOrCreateCart()
  const cart = await db.cart.findUnique({
    where: { id: cartHandle.id },
    include: { items: true },
  })
  if (!cart || cart.items.length === 0) {
    return { ok: false, error: "Your cart is empty" }
  }

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

  const publicCode = mintPublicCode()
  const method =
    parsed.data.paymentMethod === "COD"
      ? PaymentMethod.COD
      : PaymentMethod.UPI_MANUAL
  const status =
    parsed.data.paymentMethod === "COD"
      ? PaymentStatus.COD
      : PaymentStatus.AWAITING_VERIFICATION

  const order = await db.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        publicCode,
        restaurantId: restaurant.id,
        userId: user.id,
        addressId: address.id,
        state: "PLACED",
        paymentStatus: status,
        paymentMethod: method,
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

    await tx.orderEvent.create({
      data: { orderId: created.id, event: "PLACED" },
    })

    return created
  })

  await db.cartItem.deleteMany({ where: { cartId: cart.id } })

  return {
    ok: true,
    orderId: order.id,
    publicCode,
    paymentMethod: parsed.data.paymentMethod,
  }
}
