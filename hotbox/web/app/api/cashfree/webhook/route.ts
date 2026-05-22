/**
 * Cashfree webhook receiver.
 *
 * Cashfree posts to this URL for every payment-related event. We verify
 * the signature, parse the payload, and mark our order paid (or failed)
 * idempotently.
 *
 * Idempotency: Cashfree may retry. We check the order's current
 * paymentStatus and skip duplicate writes.
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyWebhookSignature } from "@/lib/cashfree"
import { markOrderPaid } from "@/lib/order-state"

export const dynamic = "force-dynamic"

interface WebhookPayload {
  type?: string
  data?: {
    order?: {
      order_id?: string
      order_status?: string
    }
    payment?: {
      payment_status?: string
      payment_method?: { upi?: unknown; card?: unknown; netbanking?: unknown; wallet?: unknown } | string
      cf_payment_id?: number | string
      payment_amount?: number
    }
  }
}

function paymentMethodName(pm: unknown): string | null {
  if (!pm) return null
  if (typeof pm === "string") return pm
  if (typeof pm === "object") {
    if ("upi" in pm) return "upi"
    if ("card" in pm) return "card"
    if ("netbanking" in pm) return "netbanking"
    if ("wallet" in pm) return "wallet"
  }
  return null
}

export async function POST(req: Request): Promise<NextResponse> {
  const rawBody = await req.text()
  const ts = req.headers.get("x-webhook-timestamp")
  const sig = req.headers.get("x-webhook-signature")

  if (!ts || !sig) {
    return NextResponse.json(
      { error: "Missing signature headers" },
      { status: 401 },
    )
  }

  const valid = verifyWebhookSignature({
    rawBody,
    timestamp: ts,
    signature: sig,
  })
  if (!valid) {
    console.warn("[cashfree-webhook] signature mismatch", { ts })
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  let payload: WebhookPayload
  try {
    payload = JSON.parse(rawBody) as WebhookPayload
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const ourOrderId = payload.data?.order?.order_id
  if (!ourOrderId) {
    return NextResponse.json({ ok: true, ignored: "no order_id" })
  }

  const order = await db.order.findUnique({ where: { id: ourOrderId } })
  if (!order) {
    // We don't know this order — could be a webhook for a previous test order.
    return NextResponse.json({ ok: true, ignored: "unknown order" })
  }

  const paymentStatus = payload.data?.payment?.payment_status
  const eventType = payload.type ?? ""

  // Success path
  const isPaymentSuccess =
    eventType.startsWith("PAYMENT_SUCCESS") ||
    paymentStatus === "SUCCESS" ||
    payload.data?.order?.order_status === "PAID"

  if (isPaymentSuccess) {
    if (order.paymentStatus === "PAID") {
      // Idempotent: already paid, just ack.
      return NextResponse.json({ ok: true, idempotent: true })
    }
    await markOrderPaid(db, order.id, {
      cashfreeOrderId: ourOrderId,
      paymentMethod: paymentMethodName(payload.data?.payment?.payment_method) ?? undefined,
      paymentReference: payload.data?.payment?.cf_payment_id != null
        ? String(payload.data.payment.cf_payment_id)
        : undefined,
    })
    return NextResponse.json({ ok: true, marked: "paid" })
  }

  // Failure path
  const isPaymentFailure =
    eventType.startsWith("PAYMENT_FAILED") ||
    eventType.startsWith("PAYMENT_USER_DROPPED") ||
    paymentStatus === "FAILED" ||
    paymentStatus === "CANCELLED"

  if (isPaymentFailure) {
    if (order.paymentStatus === "FAILED") {
      return NextResponse.json({ ok: true, idempotent: true })
    }
    // Mark payment failed but DON'T cancel the order — customer can retry.
    await db.order.update({
      where: { id: order.id },
      data: { paymentStatus: "FAILED" },
    })
    return NextResponse.json({ ok: true, marked: "failed" })
  }

  // Unknown event type — just acknowledge so Cashfree doesn't retry.
  return NextResponse.json({ ok: true, ignored: eventType || "unknown" })
}
