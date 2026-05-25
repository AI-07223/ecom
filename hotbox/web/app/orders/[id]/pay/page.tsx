import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import QRCode from "qrcode"
import { Logo } from "@/components/brand/Logo"
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
  const upiName = restaurant?.upiDisplayName ?? "Hot Box"
  const adminQrFilename = restaurant?.upiQrFilename ?? null
  const upiUri = upiVpa
    ? `upi://pay?pa=${encodeURIComponent(upiVpa)}&pn=${encodeURIComponent(upiName)}&am=${totalRupees.toFixed(2)}&tn=${encodeURIComponent(order.publicCode)}&cu=INR`
    : ""

  const dynamicQrSvg = upiUri
    ? await QRCode.toString(upiUri, {
        type: "svg",
        margin: 0,
        width: 256,
        color: { dark: "#0a0a0a", light: "#ffffff" },
      })
    : null

  const wasRejected = order.paymentStatus === "FAILED"
  const needsNewProof = order.paymentNeedsNewProof
  const submitted = !!order.paymentProofUtr && !needsNewProof && !wasRejected
  const lastRejectReason =
    wasRejected || needsNewProof ? order.paymentVerifiedNote : null

  return (
    <>
      <header
        className="sticky top-0 z-40 backdrop-blur"
        style={{
          background: "color-mix(in oklab, var(--color-shell-bg) 90%, transparent)",
          borderBottom: "1px solid var(--color-shell-line)",
        }}
      >
        <div className="max-w-md mx-auto px-5 py-3 flex items-center justify-between">
          <Link href="/" aria-label="Hot Box home">
            <Logo variant="full" size="sm" />
          </Link>
          <Link
            href={`/orders/${order.id}/confirmation`}
            className="text-sm font-medium"
            style={{ color: "var(--color-brand-yellow-300)" }}
          >
            ← Order details
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-md px-5 pt-6 pb-12">
        <h1
          className="font-display text-6xl leading-none"
          style={{ color: "var(--color-brand-yellow-300)" }}
        >
          PAY ₹{totalRupees.toFixed(0)}
        </h1>
        <p
          className="mt-2 text-sm"
          style={{ color: "var(--color-charcoal)" }}
        >
          Order {order.publicCode}
        </p>

        <section
          className="mt-4 rounded-2xl p-4 text-sm space-y-2"
          style={{
            background: "var(--color-shell-elev)",
            border: "1px solid var(--color-shell-line)",
          }}
        >
          {[
            ["Subtotal", order.subtotalPaise],
            ["Packaging", order.packagingFeePaise],
            ["Delivery", order.deliveryFeePaise],
            ["GST", order.gstPaise],
          ].map(([label, paise]) => (
            <div key={label as string} className="flex justify-between">
              <span style={{ color: "var(--color-charcoal)" }}>{label}</span>
              <span className="tabular-nums">{formatINR(paise as number)}</span>
            </div>
          ))}
          <div
            className="flex justify-between pt-2 border-t font-bold"
            style={{ borderColor: "var(--color-shell-line)" }}
          >
            <span>Total</span>
            <span
              className="tabular-nums"
              style={{ color: "var(--color-brand-yellow-300)" }}
            >
              {formatINR(order.totalPaise)}
            </span>
          </div>
        </section>

        {!upiVpa ? (
          <div
            className="mt-6 rounded-2xl p-4"
            style={{
              background: "color-mix(in oklab, var(--color-brand-flame-500) 18%, transparent)",
              border: "1px solid var(--color-brand-flame-700)",
              color: "var(--color-brand-flame-300)",
            }}
          >
            <p className="font-semibold">Online payment not configured</p>
            <p
              className="text-sm mt-1"
              style={{ color: "var(--color-shell-fg)" }}
            >
              The restaurant hasn&rsquo;t set up UPI yet. Please contact the
              restaurant or cancel and re-order with Cash on Delivery.
            </p>
          </div>
        ) : (
          <>
            {/* Primary CTA: tap-to-pay on mobile opens the registered UPI
                app with amount + note pre-filled. */}
            <a
              href={upiUri}
              className="mt-6 flex items-center justify-center w-full py-5 font-bold text-lg active:scale-[0.98] transition-transform"
              style={{
                background: "var(--color-brand-yellow-300)",
                color: "var(--color-shell-bg)",
                borderRadius: "var(--radius-lg)",
                boxShadow:
                  "0 10px 30px color-mix(in oklab, var(--color-brand-yellow-300) 30%, transparent)",
              }}
            >
              Pay {formatINR(order.totalPaise)} via UPI →
            </a>
            <p
              className="text-xs text-center mt-2"
              style={{ color: "var(--color-charcoal)" }}
            >
              Opens PhonePe / GPay / Paytm / BHIM with amount pre-filled.
            </p>

            <section className="mt-6">
              <h2
                className="text-xs font-semibold uppercase tracking-wider mb-3 text-center"
                style={{ color: "var(--color-charcoal)" }}
              >
                Or scan with any UPI app
              </h2>
              <div
                className="rounded-2xl p-6 flex flex-col items-center"
                style={{
                  background: "#ffffff",
                  border: "1px solid var(--color-shell-line)",
                }}
              >
                {adminQrFilename ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={`/api/restaurant/upi-qr`}
                    alt="UPI QR code"
                    className="w-56 h-56 object-contain"
                  />
                ) : dynamicQrSvg ? (
                  <div
                    className="w-56 h-56"
                    dangerouslySetInnerHTML={{ __html: dynamicQrSvg }}
                  />
                ) : null}
                <p className="mt-4 text-xs text-zinc-500 text-center">
                  Pay{" "}
                  <span className="font-bold text-zinc-900 tabular-nums">
                    {formatINR(order.totalPaise)}
                  </span>{" "}
                  to
                </p>
                <p className="font-mono text-sm font-semibold mt-0.5 text-zinc-900">
                  {upiVpa}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">{upiName}</p>
              </div>
            </section>

            {lastRejectReason && (
              <div
                className="mt-4 rounded-2xl p-4 text-sm"
                style={{
                  background: "color-mix(in oklab, var(--color-brand-flame-500) 18%, transparent)",
                  border: "1px solid var(--color-brand-flame-700)",
                  color: "var(--color-brand-flame-300)",
                }}
              >
                <p className="font-semibold">
                  {wasRejected
                    ? "Payment couldn't be verified"
                    : "Please send better proof"}
                </p>
                <p
                  className="mt-1"
                  style={{ color: "var(--color-shell-fg)" }}
                >
                  {lastRejectReason}
                </p>
                <p
                  className="mt-2 text-xs"
                  style={{ color: "var(--color-charcoal)" }}
                >
                  Re-submit your UTR (and a clearer screenshot if you have one).
                </p>
              </div>
            )}

            {submitted ? (
              <div
                className="mt-6 rounded-2xl p-5 text-sm"
                style={{
                  background: "color-mix(in oklab, var(--color-veg) 14%, transparent)",
                  border: "1px solid var(--color-veg)",
                  color: "var(--color-veg)",
                }}
              >
                <p className="font-semibold">
                  UTR submitted — admin is verifying
                </p>
                <p
                  className="mt-1 font-mono"
                  style={{ color: "var(--color-shell-fg)" }}
                >
                  {order.paymentProofUtr}
                </p>
                <p
                  className="mt-2 text-xs"
                  style={{ color: "var(--color-charcoal-strong)" }}
                >
                  Refresh this page in a minute. Status will flip to PAID once
                  verified.
                </p>
                <Link
                  href={`/orders/${order.id}/confirmation`}
                  className="mt-3 inline-block underline underline-offset-4"
                  style={{ color: "var(--color-brand-yellow-300)" }}
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
    </>
  )
}
