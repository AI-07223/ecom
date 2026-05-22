"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { requireAdmin } from "@/lib/session"

export async function setMenuItemAvailable(
  itemId: string,
  available: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, error: "Not authorized" }
  }
  await db.menuItem.update({
    where: { id: itemId },
    data: { isAvailable: available },
  })
  revalidatePath("/admin/menu")
  revalidatePath("/")
  revalidatePath(`/item/${itemId}`)
  return { ok: true }
}
