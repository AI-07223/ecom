"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { db } from "@/lib/db"
import { getOrCreateCart } from "@/lib/cart"

const AddInput = z.object({
  itemSlug: z.string().min(1),
  variantSlug: z.string().nullish(),
  addonSlugs: z.array(z.string()).default([]),
  quantity: z.number().int().min(1).max(20).default(1),
  specialInstructions: z.string().max(200).nullish(),
})

export async function addToCart(input: z.infer<typeof AddInput>): Promise<
  | { ok: true; cartItemId: string }
  | { ok: false; error: string }
> {
  const parsed = AddInput.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "Invalid cart input" }
  }

  const item = await db.menuItem.findUnique({
    where: { slug: parsed.data.itemSlug },
    include: {
      variants: true,
      addons: true,
    },
  })

  if (!item || !item.isAvailable) {
    return { ok: false, error: "This item is no longer available" }
  }

  // Resolve variant snapshot
  let variantSnapshot: { slug: string; name: string; priceDelta: number } | null = null
  if (item.variants.length > 0) {
    const pickedSlug =
      parsed.data.variantSlug ??
      item.variants.find((v) => v.isDefault)?.slug ??
      item.variants[0]?.slug ??
      null
    const variant = item.variants.find((v) => v.slug === pickedSlug)
    if (!variant) {
      return { ok: false, error: "Pick a size" }
    }
    variantSnapshot = {
      slug: variant.slug,
      name: variant.name,
      priceDelta: variant.priceDeltaPaise,
    }
  }

  // Resolve addons snapshot
  const requiredAddons = item.addons.filter((a) => a.isRequired)
  if (
    requiredAddons.length > 0 &&
    !requiredAddons.every((a) => parsed.data.addonSlugs.includes(a.slug))
  ) {
    return { ok: false, error: "A required option is missing" }
  }
  const pickedAddons = item.addons.filter((a) =>
    parsed.data.addonSlugs.includes(a.slug),
  )
  const addonsSnapshot = pickedAddons.map((a) => ({
    slug: a.slug,
    name: a.name,
    pricePaise: a.pricePaise,
  }))
  const addonsPerUnit = addonsSnapshot.reduce((s, a) => s + a.pricePaise, 0)

  const unitPrice = item.basePricePaise + (variantSnapshot?.priceDelta ?? 0)
  const lineTotal = (unitPrice + addonsPerUnit) * parsed.data.quantity

  const cart = await getOrCreateCart()

  const cartItem = await db.cartItem.create({
    data: {
      cartId: cart.id,
      menuItemId: item.id,
      itemTitle: item.title,
      variantSlug: variantSnapshot?.slug ?? null,
      variantName: variantSnapshot?.name ?? null,
      addonsJson: addonsSnapshot,
      quantity: parsed.data.quantity,
      unitPricePaise: unitPrice,
      lineTotalPaise: lineTotal,
      specialInstructions: parsed.data.specialInstructions ?? null,
    },
  })

  revalidatePath("/cart")
  revalidatePath("/")
  return { ok: true, cartItemId: cartItem.id }
}

export async function updateCartItemQuantity(
  cartItemId: string,
  quantity: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (quantity < 0 || quantity > 20)
    return { ok: false, error: "Invalid quantity" }

  const cart = await getOrCreateCart()
  const item = await db.cartItem.findUnique({ where: { id: cartItemId } })
  if (!item || item.cartId !== cart.id)
    return { ok: false, error: "Not your cart item" }

  if (quantity === 0) {
    await db.cartItem.delete({ where: { id: cartItemId } })
  } else {
    const perUnit = item.lineTotalPaise / item.quantity
    await db.cartItem.update({
      where: { id: cartItemId },
      data: {
        quantity,
        lineTotalPaise: Math.round(perUnit * quantity),
      },
    })
  }
  revalidatePath("/cart")
  return { ok: true }
}

export async function removeCartItem(
  cartItemId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const cart = await getOrCreateCart()
  const item = await db.cartItem.findUnique({ where: { id: cartItemId } })
  if (!item || item.cartId !== cart.id)
    return { ok: false, error: "Not your cart item" }

  await db.cartItem.delete({ where: { id: cartItemId } })
  revalidatePath("/cart")
  return { ok: true }
}

export async function clearCart(): Promise<{ ok: true }> {
  const cart = await getOrCreateCart()
  await db.cartItem.deleteMany({ where: { cartId: cart.id } })
  revalidatePath("/cart")
  return { ok: true }
}
