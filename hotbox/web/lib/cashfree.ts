/**
 * Cashfree Payment Gateway v3 server-side client.
 *
 * Two endpoints we use:
 *   1. POST /pg/orders         — create a payment session for an order
 *   2. GET  /pg/orders/:id     — poll order status (fallback for webhook misses)
 *
 * Sandbox vs production is selected via `CASHFREE_ENV=sandbox|production`.
 *
 * Webhook verification:
 *   HMAC-SHA256 over `timestamp + raw_request_body` with the webhook
 *   secret, base64-encoded, compared to the `x-webhook-signature` header.
 */
import crypto from "node:crypto"

const API_VERSION = "2023-08-01"

function baseUrl(): string {
  return process.env.CASHFREE_ENV === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg"
}

function authHeaders(): Record<string, string> {
  const appId = process.env.CASHFREE_APP_ID
  const secret = process.env.CASHFREE_SECRET_KEY
  if (!appId || !secret) {
    throw new Error(
      "Cashfree credentials missing — set CASHFREE_APP_ID and CASHFREE_SECRET_KEY",
    )
  }
  return {
    "x-client-id": appId,
    "x-client-secret": secret,
    "x-api-version": API_VERSION,
    "Content-Type": "application/json",
  }
}

export interface CreateOrderInput {
  /** Our internal order id used as cf_order_id (must be 1-50 chars, unique). */
  orderId: string
  /** Total in rupees (Cashfree wants ₹ not paise). */
  amountRupees: number
  customer: {
    /** Cashfree-required customer_id (we pass our user id). */
    id: string
    /** E.164. */
    phone: string
    name?: string
    email?: string
  }
  /** Where Cashfree's hosted page redirects after payment. */
  returnUrl: string
  /** Where Cashfree posts webhook events to. */
  notifyUrl: string
  /** Free-form metadata stored on the Cashfree order. */
  noteToMerchant?: string
}

export interface CreateOrderResult {
  cfOrderId: string
  paymentSessionId: string
  orderStatus: string
}

export async function createCashfreeOrder(
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  const res = await fetch(`${baseUrl()}/orders`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      order_id: input.orderId,
      order_amount: Number(input.amountRupees.toFixed(2)),
      order_currency: "INR",
      customer_details: {
        customer_id: input.customer.id,
        customer_phone: input.customer.phone,
        customer_name: input.customer.name ?? undefined,
        customer_email: input.customer.email ?? undefined,
      },
      order_meta: {
        return_url: input.returnUrl,
        notify_url: input.notifyUrl,
      },
      order_note: input.noteToMerchant ?? undefined,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Cashfree create order failed: ${res.status} ${body}`)
  }

  const json = (await res.json()) as {
    order_id: string
    payment_session_id: string
    order_status: string
  }
  return {
    cfOrderId: json.order_id,
    paymentSessionId: json.payment_session_id,
    orderStatus: json.order_status,
  }
}

export interface CashfreeOrderStatus {
  orderStatus: "ACTIVE" | "PAID" | "EXPIRED" | "TERMINATED" | string
  orderAmount: number
}

export async function fetchCashfreeOrderStatus(
  orderId: string,
): Promise<CashfreeOrderStatus> {
  const res = await fetch(`${baseUrl()}/orders/${orderId}`, {
    method: "GET",
    headers: authHeaders(),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Cashfree fetch status failed: ${res.status} ${body}`)
  }

  const json = (await res.json()) as {
    order_status: string
    order_amount: number
  }
  return {
    orderStatus: json.order_status as CashfreeOrderStatus["orderStatus"],
    orderAmount: json.order_amount,
  }
}

/**
 * Verify a Cashfree webhook payload's signature.
 *
 * Cashfree sends `x-webhook-timestamp` and `x-webhook-signature` headers.
 * The signature is `base64(hmacSha256(timestamp + raw_body, secret))`.
 *
 * Returns `true` iff valid. Constant-time comparison.
 */
export function verifyWebhookSignature(opts: {
  rawBody: string
  timestamp: string
  signature: string
}): boolean {
  const secret = process.env.CASHFREE_WEBHOOK_SECRET || process.env.CASHFREE_SECRET_KEY
  if (!secret) return false

  const computed = crypto
    .createHmac("sha256", secret)
    .update(opts.timestamp + opts.rawBody)
    .digest("base64")

  // Constant-time compare to defeat timing attacks.
  const a = Buffer.from(computed)
  const b = Buffer.from(opts.signature)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

export function isCashfreeConfigured(): boolean {
  return Boolean(
    process.env.CASHFREE_APP_ID && process.env.CASHFREE_SECRET_KEY,
  )
}
