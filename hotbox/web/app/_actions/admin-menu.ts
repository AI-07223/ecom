"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import {
  compressAndSaveMenuPhoto,
  deleteMenuPhoto,
  MenuPhotoError,
} from "@/lib/menu-photos"
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

/**
 * Operator uploads a photo for a menu item. Compresses via sharp, saves
 * to /app/uploads/dishes/<itemId>.jpg, updates the row. Idempotent — call
 * again with a new photo to replace.
 */
export async function uploadMenuItemPhoto(
  itemId: string,
  formData: FormData,
): Promise<{ ok: true; sizeBytes: number } | { ok: false; error: string }> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, error: "Not authorized" }
  }

  const item = await db.menuItem.findUnique({ where: { id: itemId } })
  if (!item) return { ok: false, error: "Menu item not found" }

  const file = formData.get("photo")
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Pick an image to upload" }
  }
  const bytes = Buffer.from(await file.arrayBuffer())

  try {
    const result = await compressAndSaveMenuPhoto({
      itemId,
      bytes,
      declaredMime: file.type,
    })
    await db.menuItem.update({
      where: { id: itemId },
      data: { photoFilename: result.filename },
    })
    revalidatePath("/")
    revalidatePath(`/item/${item.slug}`)
    revalidatePath("/admin/menu")
    return { ok: true, sizeBytes: result.sizeBytes }
  } catch (err) {
    if (err instanceof MenuPhotoError) {
      return { ok: false, error: err.message }
    }
    console.error("[uploadMenuItemPhoto] failed:", err)
    return { ok: false, error: "Upload failed — try again" }
  }
}

/**
 * Clear a previously uploaded operator photo. Falls back to PDF seed
 * crops or flame tile per the DishPhoto resolution order.
 */
export async function clearMenuItemPhoto(
  itemId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, error: "Not authorized" }
  }
  const item = await db.menuItem.findUnique({ where: { id: itemId } })
  if (!item) return { ok: false, error: "Menu item not found" }
  if (item.photoFilename) {
    await deleteMenuPhoto(item.photoFilename).catch(() => {
      /* file may already be gone — DB clear still happens */
    })
  }
  await db.menuItem.update({
    where: { id: itemId },
    data: { photoFilename: null },
  })
  revalidatePath("/")
  revalidatePath(`/item/${item.slug}`)
  revalidatePath("/admin/menu")
  return { ok: true }
}
