"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireAdmin } from "@/lib/session"

const SaveInput = z.object({
  openTime: z.string().regex(/^\d{2}:\d{2}$/),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/),
  isPaused: z.boolean(),
  allowCancelAfterAccept: z.boolean(),
  deliveryFeePaise: z.number().int().min(0).max(100_000),
  packagingFeePaise: z.number().int().min(0).max(100_000),
})

export async function saveSettings(
  input: z.infer<typeof SaveInput>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, error: "Not authorized" }
  }
  const parsed = SaveInput.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Invalid input" }

  await db.restaurant.updateMany({
    where: { slug: "hotbox" },
    data: {
      openTime: parsed.data.openTime,
      closeTime: parsed.data.closeTime,
      isPaused: parsed.data.isPaused,
      allowCancelAfterAccept: parsed.data.allowCancelAfterAccept,
      deliveryFeePaise: parsed.data.deliveryFeePaise,
      packagingFeePaise: parsed.data.packagingFeePaise,
    },
  })
  revalidatePath("/admin/settings")
  revalidatePath("/")
  revalidatePath("/cart")
  revalidatePath("/checkout")
  return { ok: true }
}
