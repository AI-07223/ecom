"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { db } from "@/lib/db"
import { InvalidPhoneError, normalizeIndianPhone } from "@/lib/phone"
import { requireAdmin } from "@/lib/session"

const AddRiderInput = z.object({
  name: z.string().min(1).max(60),
  phone: z.string().min(7).max(20),
})

export async function addRider(
  input: z.infer<typeof AddRiderInput>,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, error: "Not authorized" }
  }
  const parsed = AddRiderInput.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Invalid input" }

  let phone: string
  try {
    phone = normalizeIndianPhone(parsed.data.phone)
  } catch (err) {
    if (err instanceof InvalidPhoneError)
      return { ok: false, error: "Invalid phone number" }
    throw err
  }

  // Upsert User row + Rider row in a transaction. If a user with this
  // phone already exists, we promote them to rider role.
  const rider = await db.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { phone },
      create: { phone, name: parsed.data.name, role: "rider" },
      update: { role: "rider", name: parsed.data.name },
    })

    const existingRider = await tx.rider.findUnique({
      where: { userId: user.id },
    })
    if (existingRider) {
      if (existingRider.deletedAt) {
        return tx.rider.update({
          where: { id: existingRider.id },
          data: {
            deletedAt: null,
            name: parsed.data.name,
            isActive: true,
          },
        })
      }
      return tx.rider.update({
        where: { id: existingRider.id },
        data: { name: parsed.data.name, isActive: true },
      })
    }

    return tx.rider.create({
      data: {
        userId: user.id,
        name: parsed.data.name,
        phone,
        isActive: true,
      },
    })
  })

  revalidatePath("/admin/riders")
  revalidatePath("/admin")
  return { ok: true, id: rider.id }
}

export async function setRiderActive(
  riderId: string,
  active: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, error: "Not authorized" }
  }
  await db.rider.update({
    where: { id: riderId },
    data: { isActive: active },
  })
  revalidatePath("/admin/riders")
  revalidatePath("/admin")
  return { ok: true }
}

export async function removeRider(
  riderId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, error: "Not authorized" }
  }
  const rider = await db.rider.findUnique({ where: { id: riderId } })
  if (!rider) return { ok: false, error: "Rider not found" }
  if (rider.currentOrderId)
    return { ok: false, error: "Finish the active delivery first" }

  await db.rider.update({
    where: { id: riderId },
    data: {
      deletedAt: new Date(),
      isActive: false,
    },
  })
  revalidatePath("/admin/riders")
  revalidatePath("/admin")
  return { ok: true }
}
