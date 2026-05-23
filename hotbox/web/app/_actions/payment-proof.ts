"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { db } from "@/lib/db"
import {
  compressAndSaveScreenshot,
  ScreenshotError,
} from "@/lib/payment-proof"
import { getCurrentUser } from "@/lib/session"

const SubmitInput = z.object({
  orderId: z.string().min(1),
  // UTR is OPTIONAL now — screenshot is the primary evidence.
  utr: z
    .string()
    .regex(/^[A-Z0-9]{4,30}$/i, "UTR must be 4-30 letters/digits")
    .optional()
    .or(z.literal("")),
})

/**
 * Customer submits an order's payment proof.
 *
 * The screenshot is REQUIRED (admin uses it as primary verification by
 * opening their own UPI app + matching). UTR is OPTIONAL (helps admin
 * find the transaction faster, but isn't required).
 *
 * The screenshot is compressed server-side via sharp (JPEG q=80, max
 * 1280px) and saved with a 30-day TTL. After 30 days a cron job purges
 * the file.
 *
 * Idempotent — if customer re-submits before admin verification, the
 * latest payload replaces the previous one and the rejection flag
 * clears.
 */
export async function submitPaymentProof(formData: FormData): Promise<
  | { ok: true }
  | { ok: false; error: string }
> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "Sign in" }

  const orderId = formData.get("orderId")?.toString() ?? ""
  const utrRaw = formData.get("utr")?.toString().trim().toUpperCase() ?? ""
  const file = formData.get("screenshot")

  const parsed = SubmitInput.safeParse({ orderId, utr: utrRaw })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" }
  }

  const order = await db.order.findFirst({
    where: { id: orderId, userId: user.id },
    select: { id: true, paymentMethod: true, paymentStatus: true },
  })
  if (!order) return { ok: false, error: "Order not found" }
  if (order.paymentMethod !== "UPI_MANUAL")
    return { ok: false, error: "This isn't a UPI order" }
  if (order.paymentStatus === "PAID")
    return { ok: false, error: "Already verified" }

  // Screenshot is REQUIRED now.
  if (
    !file ||
    typeof file !== "object" ||
    !("arrayBuffer" in file) ||
    (file as { size: number }).size === 0
  ) {
    return {
      ok: false,
      error: "Please attach a screenshot of your UPI payment.",
    }
  }
  const blob = file as unknown as {
    name?: string
    size: number
    type: string
    arrayBuffer(): Promise<ArrayBuffer>
  }

  let saved
  try {
    saved = await compressAndSaveScreenshot({
      orderId,
      bytes: await blob.arrayBuffer(),
      declaredMime: blob.type || "image/jpeg",
    })
  } catch (err) {
    if (err instanceof ScreenshotError) {
      return { ok: false, error: err.message }
    }
    console.error("[submitPaymentProof] processing failed:", err)
    return { ok: false, error: "Couldn't save your screenshot. Try again." }
  }

  await db.order.update({
    where: { id: orderId },
    data: {
      paymentProofUtr: utrRaw || null,
      paymentProofFilename: saved.filename,
      paymentProofSubmittedAt: new Date(),
      paymentProofExpiresAt: saved.expiresAt,
      paymentNeedsNewProof: false,
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
