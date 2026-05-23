"use server"

import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

const UPLOAD_DIR = path.join(process.cwd(), "uploads")
const MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2 MB
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const

const SubmitInput = z.object({
  orderId: z.string().min(1),
  utr: z.string().regex(/^[A-Z0-9]{8,20}$/i, "UTR must be 8-20 letters/digits"),
})

/**
 * Customer submits UTR (required) + optional screenshot for a UPI_MANUAL
 * order. Returns { ok: true } or { ok: false, error }. Idempotent — if
 * the customer re-submits before admin verification, the latest UTR
 * replaces the old one and a fresh paymentNeedsNewProof flag is cleared.
 */
export async function submitPaymentProof(formData: FormData): Promise<
  | { ok: true }
  | { ok: false; error: string }
> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "Sign in" }

  const orderId = formData.get("orderId")?.toString() ?? ""
  const utr = formData.get("utr")?.toString().trim().toUpperCase() ?? ""
  const file = formData.get("screenshot")

  const parsed = SubmitInput.safeParse({ orderId, utr })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" }
  }

  const order = await db.order.findFirst({
    where: { id: orderId, userId: user.id },
    select: {
      id: true,
      paymentMethod: true,
      paymentStatus: true,
    },
  })
  if (!order) return { ok: false, error: "Order not found" }
  if (order.paymentMethod !== "UPI_MANUAL") {
    return { ok: false, error: "This isn't a UPI order" }
  }
  if (order.paymentStatus === "PAID") {
    return { ok: false, error: "Already verified" }
  }

  // File handling (optional)
  let savedFilename: string | null = null
  if (file && typeof file === "object" && "arrayBuffer" in file) {
    const blob = file as unknown as { name?: string; size: number; type: string; arrayBuffer(): Promise<ArrayBuffer> }
    if (blob.size > 0) {
      if (blob.size > MAX_SIZE_BYTES) {
        return { ok: false, error: "Screenshot must be 2 MB or smaller" }
      }
      if (!ALLOWED_MIME.includes(blob.type as (typeof ALLOWED_MIME)[number])) {
        return { ok: false, error: "Use a PNG, JPEG, or WebP screenshot" }
      }
      const ext =
        blob.type === "image/png"
          ? "png"
          : blob.type === "image/webp"
            ? "webp"
            : "jpg"
      savedFilename = `${orderId}-payment.${ext}`
      await mkdir(UPLOAD_DIR, { recursive: true })
      const buf = Buffer.from(await blob.arrayBuffer())
      await writeFile(path.join(UPLOAD_DIR, savedFilename), buf)
    }
  }

  await db.order.update({
    where: { id: orderId },
    data: {
      paymentProofUtr: utr,
      ...(savedFilename ? { paymentProofFilename: savedFilename } : {}),
      paymentProofSubmittedAt: new Date(),
      paymentNeedsNewProof: false,
      // If previously rejected, move back to AWAITING_VERIFICATION
      paymentStatus:
        order.paymentStatus === "FAILED"
          ? "AWAITING_VERIFICATION"
          : order.paymentStatus,
    },
  })

  revalidatePath(`/orders/${orderId}/pay`)
  revalidatePath(`/admin/orders/${orderId}/verify-payment`)
  revalidatePath(`/admin`)

  return { ok: true }
}
