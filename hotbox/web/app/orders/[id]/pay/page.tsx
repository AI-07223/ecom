import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import QRCode from "qrcode"
import { getOrderForCurrentUser } from "@/lib/orders"
import { getRestaurant } from "@/lib/catalog"
import { formatINR } from "@/lib/pricing"
import { getCurrentUser } from "@/lib/session"
import { PayClient } from "./PayClient"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PayPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const { id } = await params
  const [order, restaurant] = await Promise.all([
    getOrderForCurrentUser(id),
    getRestaurant(),
  ])
  if (!order) notFound()

  // If somehow this isn't a UPI_MANUAL order, or it's already paid, bounce.
  if (order.paymentMethod !== "UPI_MANUAL" || order.paymentStatus === "PAID") {
    redirect(`/orders/${id}/confirmation`)
  }

  const totalRupees = order.totalPaise / 100
  const upiVpa = restaurant?.upiVpa ?? ""
  const upiName = restaurant?.upiDisplayName ?? "Hotbox"
  const adminQrFilename = restaurant?.upiQrFilename ?? null
  const upiUri = upiVpa
    ? `upi://pay?pa=${encodeURIComponent(upiVpa)}&pn=${encodeURIComponent(upiName)}&am=${totalRupees.toFixed(2)}&tn=${encodeURIComponent(order.publicCode)}&cu=INR`
    : ""

  const dynamicQrSvg = upiUri
    ? await QRCode.toString(upiUri, {
        type: "svg",
        margin: 0,
        width: 256,
        color: { dark: "#1a1a1a", light: "#ffffff" },
      })
    : null

  const wasRejected = order.paymentStatus === "FAILED"
  const needsNewProof = order.paymentNeedsNewProof
  const submitted = !!order.paymentProofUtr && !needsNewProof && !wasRejected
  const lastRejectReason =
    wasRejected || needsNewProof ? order.paymentVerifiedNote : null

  return (
    <main className="mx-auto max-w-md min-h-screen px-5 pt-8 pb-12">
      <Link
        href={`/orders/${order.id}/confirmation`}
        className="text-sm text-zinc-500 hover:underline underline-offset-4"
      >
        ← Order details
      </Link>
      <h1 className="mt-3 font-display text-5xl leading-none" style={{ color: "var(--color-brand-500)" }}>
        PAY ₹{totalRupees.toFixed(0)}
      </h1>
      <p className="mt-2 text-sm text-zinc-600">
        Order {order.publicCode}
      </p>

      <section className="mt-4 rounded-2xl bg-zinc-50 p-4 text-sm space-y-2">
        <div className="flex justify-between">
          <span className="text-zinc-600">Subtotal</span>
          <span className="tabular-nums">{formatINR(order.subtotalPaise)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-600">Packaging</span>
          <span className="tabular-nums">{formatINR(order.packagingFeePaise)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-600">Delivery</span>
          <span className="tabular-nums">{formatINR(order.deliveryFeePaise)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-600">GST</span>
          <span className="tabular-nums">{formatINR(order.gstPaise)}</span>
        </div>
        <div className="flex justify-between pt-2 border-t border-zinc-200 font-bold">
          <span>Total</span>
          <span className="tabular-nums">{formatINR(order.totalPaise)}</span>
        </div>
      </section>

      {!upiVpa ? (
        <div className="mt-6 rounded-2xl bg-amber-50 text-amber-900 p-4">
          <p className="font-semibold">Online payment not configured</p>
          <p className="text-sm mt-1">
            The restaurant hasn&rsquo;t set up UPI yet. Please contact the
            restaurant or cancel and re-order with Cash on Delivery.
          </p>
        </div>
      ) : (
        <>
          <section className="mt-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
              Scan & pay
            </h2>
            <div className="rounded-2xl bg-white border border-zinc-200 p-6 flex flex-col items-center">
              {adminQrFilename ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={`/api/restaurant/upi-qr`}
                  alt="UPI QR code"
                  className="w-64 h-64 object-contain"
                />
              ) : dynamicQrSvg ? (
                <div
                  className="w-64 h-64"
                  dangerouslySetInnerHTML={{ __html: dynamicQrSvg }}
                />
              ) : null}
              <p className="mt-4 text-sm text-zinc-600 text-center">
                Pay <span className="font-bold text-zinc-900 tabular-nums">{formatINR(order.totalPaise)}</span> to
              </p>
              <p className="font-mono text-sm font-semibold mt-0.5">{upiVpa}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{upiName}</p>
              <a
                href={upiUri}
                className="mt-4 text-sm font-semibold underline underline-offset-4"
                style={{ color: "var(--color-brand-500)" }}
              >
                Or tap to open your UPI app →
              </a>
            </div>
          </section>

          {lastRejectReason && (
            <div className="mt-4 rounded-2xl bg-amber-50 text-amber-900 p-4 text-sm">
              <p className="font-semibold">
                {wasRejected ? "Payment couldn't be verified" : "Please send better proof"}
              </p>
              <p className="mt-1">{lastRejectReason}</p>
              <p className="mt-2 text-xs">Re-submit your UTR (and a clearer screenshot if you have one).</p>
            </div>
          )}

          {submitted ? (
            <div className="mt-6 rounded-2xl bg-emerald-50 text-emerald-900 p-5 text-sm">
              <p className="font-semibold">UTR submitted — admin is verifying</p>
              <p className="mt-1 font-mono">{order.paymentProofUtr}</p>
              <p className="mt-2 text-xs">
                Refresh this page in a minute. Status will flip to PAID once verified.
              </p>
              <Link
                href={`/orders/${order.id}/confirmation`}
                className="mt-3 inline-block underline underline-offset-4"
              >
                Track your order →
              </Link>
            </div>
          ) : (
            <PayClient orderId={order.id} />
          )}
        </>
      )}
    </main>
  )
}
