"use server"

import { unlink } from "node:fs/promises"
import path from "node:path"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireAdmin } from "@/lib/session"

const UPLOAD_DIR = path.join(process.cwd(), "uploads")

async function ensureAdmin(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  try {
    await requireAdmin()
    return { ok: true }
  } catch {
    return { ok: false, error: "Not authorized" }
  }
}

export async function verifyPayment(orderId: string): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const auth = await ensureAdmin()
  if (!auth.ok) return auth

  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { paymentMethod: true, paymentStatus: true, paymentProofUtr: true },
  })
  if (!order) return { ok: false, error: "Order not found" }
  if (order.paymentStatus === "PAID") return { ok: false, error: "Already paid" }

  await db.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: "PAID",
        paidAt: new Date(),
        paymentVerifiedAt: new Date(),
        paymentVerifiedNote: order.paymentProofUtr
          ? `Verified UTR ${order.paymentProofUtr}`
          : "Verified",
        paymentNeedsNewProof: false,
      },
    })
    await tx.orderEvent.create({
      data: {
        orderId,
        event: "PLACED", // We use PLACED as a status-event marker since
                         // PAID isn't part of OrderState (it's PaymentStatus).
                         // The note field carries the meaning.
        note: order.paymentProofUtr
          ? `Payment verified (UTR ${order.paymentProofUtr})`
          : "Payment verified",
      },
    })
  })

  revalidatePath("/admin")
  revalidatePath(`/admin/orders/${orderId}/verify-payment`)
  revalidatePath(`/orders/${orderId}/pay`)
  revalidatePath(`/orders/${orderId}/confirmation`)
  return { ok: true }
}

const RejectInput = z.object({
  orderId: z.string().min(1),
  reason: z.string().min(3).max(500),
})

export async function rejectPayment(
  input: z.infer<typeof RejectInput>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await ensureAdmin()
  if (!auth.ok) return auth
  const parsed = RejectInput.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Reason is required" }

  await db.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: parsed.data.orderId },
      data: {
        paymentStatus: "FAILED",
        paymentVerifiedAt: new Date(),
        paymentVerifiedNote: parsed.data.reason,
      },
    })
    await tx.orderEvent.create({
      data: {
        orderId: parsed.data.orderId,
        event: "PLACED",
        note: `Payment rejected: ${parsed.data.reason}`,
      },
    })
  })
  revalidatePath("/admin")
  revalidatePath(`/admin/orders/${parsed.data.orderId}/verify-payment`)
  revalidatePath(`/orders/${parsed.data.orderId}/pay`)
  return { ok: true }
}

export async function askForNewProof(orderId: string): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const auth = await ensureAdmin()
  if (!auth.ok) return auth

  await db.order.update({
    where: { id: orderId },
    data: { paymentNeedsNewProof: true },
  })
  revalidatePath("/admin")
  revalidatePath(`/admin/orders/${orderId}/verify-payment`)
  revalidatePath(`/orders/${orderId}/pay`)
  return { ok: true }
}

const ForcePaidInput = z.object({
  orderId: z.string().min(1),
  note: z.string().min(5).max(500),
})

export async function forceMarkPaid(
  input: z.infer<typeof ForcePaidInput>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await ensureAdmin()
  if (!auth.ok) return auth
  const parsed = ForcePaidInput.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Note (min 5 chars) required" }

  await db.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: parsed.data.orderId },
      data: {
        paymentStatus: "PAID",
        paidAt: new Date(),
        paymentVerifiedAt: new Date(),
        paymentVerifiedNote: `Admin override: ${parsed.data.note}`,
      },
    })
    await tx.orderEvent.create({
      data: {
        orderId: parsed.data.orderId,
        event: "PLACED",
        note: `Admin force-marked PAID: ${parsed.data.note}`,
      },
    })
  })
  revalidatePath("/admin")
  revalidatePath(`/admin/orders/${parsed.data.orderId}/verify-payment`)
  return { ok: true }
}

/**
 * Delete the screenshot file if any (used when admin "forgets" or wants
 * to free space — not exposed in v1 UI, but here for completeness).
 */
export async function _deletePaymentProofFile(filename: string): Promise<void> {
  try {
    await unlink(path.join(UPLOAD_DIR, filename))
  } catch {
    /* file gone is fine */
  }
}
