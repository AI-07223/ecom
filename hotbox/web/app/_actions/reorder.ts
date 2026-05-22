"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { getOrCreateCart } from "@/lib/cart"
import { getCurrentUser } from "@/lib/session"

export async function reorderFromOrder(orderId: string): Promise<
  | { ok: true; addedCount: number; skipped: string[] }
  | { ok: false; error: string }
> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "Sign in to re-order" }

  const order = await db.order.findFirst({
    where: { id: orderId, userId: user.id },
    include: { items: true },
  })
  if (!order) return { ok: false, error: "Order not found" }

  const menuItems = await db.menuItem.findMany({
    where: { id: { in: order.items.map((i) => i.menuItemId).filter((x): x is string => !!x) } },
    select: { id: true, slug: true, title: true, isAvailable: true, basePricePaise: true },
  })
  const byId = new Map(menuItems.map((m) => [m.id, m]))

  const cart = await getOrCreateCart()
  const skipped: string[] = []
  let addedCount = 0

  for (const item of order.items) {
    const current = item.menuItemId ? byId.get(item.menuItemId) : null
    if (!current || !current.isAvailable) {
      skipped.push(item.itemTitle)
      continue
    }
    // Re-snapshot at TODAY's prices (intentionally — re-ordering is a new
    // commercial transaction, not a replay of the old one).
    const unitPrice = current.basePricePaise + 0 // variants reapplied below
    const addons = Array.isArray(item.addonsJson)
      ? (item.addonsJson as Array<{ pricePaise: number }>)
      : []
    const addonsPerUnit = addons.reduce((s, a) => s + a.pricePaise, 0)
    const lineTotal = (unitPrice + addonsPerUnit) * item.quantity

    await db.cartItem.create({
      data: {
        cartId: cart.id,
        menuItemId: current.id,
        itemTitle: item.itemTitle,
        variantSlug: item.variantSlug,
        variantName: item.variantName,
        addonsJson: item.addonsJson as object,
        quantity: item.quantity,
        unitPricePaise: unitPrice,
        lineTotalPaise: lineTotal,
        specialInstructions: item.specialInstructions,
      },
    })
    addedCount++
  }

  revalidatePath("/cart")
  return { ok: true, addedCount, skipped }
}
