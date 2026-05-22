"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

const MAX_ADDRESSES = 5

const AddressInput = z.object({
  label: z.enum(["HOME", "WORK", "OTHER"]).default("HOME"),
  fullAddress: z.string().min(8).max(500),
  building: z.string().max(120).nullish(),
  floor: z.string().max(40).nullish(),
  landmark: z.string().max(120).nullish(),
  latitude: z.number().min(-90).max(90).nullish(),
  longitude: z.number().min(-180).max(180).nullish(),
  isDefault: z.boolean().optional(),
})

export async function addAddress(input: z.infer<typeof AddressInput>): Promise<
  | { ok: true; id: string }
  | { ok: false; error: string }
> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "Sign in to save an address" }

  const parsed = AddressInput.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid address",
    }
  }

  const existingCount = await db.address.count({
    where: { userId: user.id, deletedAt: null },
  })
  if (existingCount >= MAX_ADDRESSES) {
    return {
      ok: false,
      error: `You can save up to ${MAX_ADDRESSES} addresses. Remove one first.`,
    }
  }

  // Default-flag semantics: if marked default, demote all others.
  const result = await db.$transaction(async (tx) => {
    if (parsed.data.isDefault || existingCount === 0) {
      await tx.address.updateMany({
        where: { userId: user.id, deletedAt: null, isDefault: true },
        data: { isDefault: false },
      })
    }
    return tx.address.create({
      data: {
        userId: user.id,
        label: parsed.data.label,
        fullAddress: parsed.data.fullAddress,
        building: parsed.data.building ?? null,
        floor: parsed.data.floor ?? null,
        landmark: parsed.data.landmark ?? null,
        latitude: parsed.data.latitude ?? null,
        longitude: parsed.data.longitude ?? null,
        isDefault: parsed.data.isDefault ?? existingCount === 0,
      },
    })
  })

  revalidatePath("/account/addresses")
  revalidatePath("/checkout")
  return { ok: true, id: result.id }
}

export async function setDefaultAddress(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "Sign in" }

  await db.$transaction(async (tx) => {
    const row = await tx.address.findFirst({
      where: { id, userId: user.id, deletedAt: null },
    })
    if (!row) return
    await tx.address.updateMany({
      where: { userId: user.id, deletedAt: null, isDefault: true },
      data: { isDefault: false },
    })
    await tx.address.update({
      where: { id: row.id },
      data: { isDefault: true },
    })
  })
  revalidatePath("/account/addresses")
  revalidatePath("/checkout")
  return { ok: true }
}

export async function removeAddress(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "Sign in" }

  const row = await db.address.findFirst({
    where: { id, userId: user.id, deletedAt: null },
  })
  if (!row) return { ok: false, error: "Address not found" }

  // Soft delete so historical orders keep their address reference.
  await db.address.update({
    where: { id: row.id },
    data: { deletedAt: new Date(), isDefault: false },
  })
  revalidatePath("/account/addresses")
  revalidatePath("/checkout")
  return { ok: true }
}
