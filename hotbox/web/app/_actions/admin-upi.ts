"use server"

import { mkdir, unlink, writeFile } from "node:fs/promises"
import path from "node:path"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireAdmin } from "@/lib/session"

const UPLOAD_DIR = path.join(process.cwd(), "uploads")
const MAX_QR_BYTES = 1 * 1024 * 1024 // 1 MB
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const

const SaveInput = z.object({
  upiVpa: z.string().max(100).nullish(),
  upiDisplayName: z.string().max(100).nullish(),
})

export async function saveUpiConfig(
  input: z.infer<typeof SaveInput>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, error: "Not authorized" }
  }
  const parsed = SaveInput.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Invalid input" }

  const vpa = parsed.data.upiVpa?.trim() || null
  const name = parsed.data.upiDisplayName?.trim() || null

  if (vpa && !/^[a-z0-9.\-_]+@[a-z0-9]+$/i.test(vpa)) {
    return {
      ok: false,
      error: "VPA must look like name@bank (lowercase, no spaces)",
    }
  }

  await db.restaurant.updateMany({
    where: { slug: "hotbox" },
    data: { upiVpa: vpa, upiDisplayName: name },
  })

  revalidatePath("/admin/settings")
  revalidatePath("/checkout")
  return { ok: true }
}

export async function uploadUpiQr(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, error: "Not authorized" }
  }
  const file = formData.get("qr")
  if (!file || typeof file !== "object" || !("arrayBuffer" in file)) {
    return { ok: false, error: "No file uploaded" }
  }
  const blob = file as unknown as { name?: string; size: number; type: string; arrayBuffer(): Promise<ArrayBuffer> }
  if (blob.size === 0) return { ok: false, error: "Empty file" }
  if (blob.size > MAX_QR_BYTES) return { ok: false, error: "QR image must be 1 MB or smaller" }
  if (!ALLOWED_MIME.includes(blob.type as (typeof ALLOWED_MIME)[number])) {
    return { ok: false, error: "Use a PNG, JPEG, or WebP image" }
  }

  const ext =
    blob.type === "image/png"
      ? "png"
      : blob.type === "image/webp"
        ? "webp"
        : "jpg"
  const filename = `restaurant-upi-qr.${ext}`

  await mkdir(UPLOAD_DIR, { recursive: true })
  const buf = Buffer.from(await blob.arrayBuffer())
  await writeFile(path.join(UPLOAD_DIR, filename), buf)

  await db.restaurant.updateMany({
    where: { slug: "hotbox" },
    data: { upiQrFilename: filename },
  })

  revalidatePath("/admin/settings")
  return { ok: true }
}

export async function clearUpiQr(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, error: "Not authorized" }
  }
  const r = await db.restaurant.findFirst({
    where: { slug: "hotbox" },
    select: { upiQrFilename: true },
  })
  if (r?.upiQrFilename) {
    try {
      await unlink(path.join(UPLOAD_DIR, r.upiQrFilename))
    } catch {
      /* file gone is fine */
    }
  }
  await db.restaurant.updateMany({
    where: { slug: "hotbox" },
    data: { upiQrFilename: null },
  })
  revalidatePath("/admin/settings")
  return { ok: true }
}
