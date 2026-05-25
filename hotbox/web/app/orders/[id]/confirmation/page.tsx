import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { Logo } from "@/components/brand/Logo"
import { getOrderForCurrentUser } from "@/lib/orders"
import { formatINR } from "@/lib/pricing"
import { STATE_LABELS } from "@/lib/order-state"
import { getCurrentUser } from "@/lib/session"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
}

const cardStyle: React.CSSProperties = {
  background: "var(--color-shell-elev)",
  border: "1px solid var(--color-shell-line)",
  borderRadius: "var(--radius)",
}

const labelStyle: React.CSSProperties = {
  color: "var(--color-charcoal)",
}

export default async function ConfirmationPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const { id } = await params
  const order = await getOrderForCurrentUser(id)
  if (!order) notFound()

  const isPaid = order.paymentStatus === "PAID"
  const isPaymentPending = order.paymentStatus === "PENDING"
  const isFailed = order.paymentStatus === "FAILED"

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
            href="/account/orders"
            className="text-sm font-medium"
            style={{ color: "var(--color-brand-yellow-300)" }}
          >
            My orders
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-md px-5 pt-6 pb-12">
        <div className="mt-2">
          {isPaid && (
            <div
              className="rounded-2xl p-5"
              style={{
                background: "var(--color-brand-yellow-300)",
                color: "var(--color-shell-bg)",
                borderRadius: "var(--radius)",
              }}
            >
              <h1 className="font-display text-4xl">Order confirmed</h1>
              <p className="text-sm mt-1 font-mono">{order.publicCode}</p>
            </div>
          )}
          {isPaymentPending && (
            <div
              className="rounded-2xl p-5"
              style={{
                background:
                  "color-mix(in oklab, var(--color-brand-yellow-300) 14%, transparent)",
                border: "1px solid var(--color-brand-yellow-300)",
                color: "var(--color-brand-yellow-300)",
              }}
            >
              <h1 className="text-xl font-bold">Waiting for payment</h1>
              <p
                className="text-sm mt-1"
                style={{ color: "var(--color-shell-fg)" }}
              >
                Refresh this page after a moment. If your payment was
                successful, this will switch to confirmed.
              </p>
            </div>
          )}
          {isFailed && (
            <div
              className="rounded-2xl p-5"
              style={{
                background:
                  "color-mix(in oklab, var(--color-brand-flame-500) 18%, transparent)",
                border: "1px solid var(--color-brand-flame-700)",
                color: "var(--color-brand-flame-300)",
              }}
            >
              <h1 className="text-xl font-bold">Payment failed</h1>
              <p
                className="text-sm mt-1"
                style={{ color: "var(--color-shell-fg)" }}
              >
                No charge was made. You can{" "}
                <Link
                  href="/cart"
                  className="underline underline-offset-4 font-semibold"
                  style={{ color: "var(--color-brand-yellow-300)" }}
                >
                  go back to your cart
                </Link>{" "}
                and try a different method.
              </p>
            </div>
          )}
        </div>

        <section className="mt-6 p-5 space-y-2.5" style={cardStyle}>
          <h2
            className="text-xs font-semibold uppercase tracking-wider"
            style={labelStyle}
          >
            Status
          </h2>
          <p className="font-medium">{STATE_LABELS[order.state]}</p>
          {order.deliveredAt && (
            <p className="text-xs" style={labelStyle}>
              Delivered {order.deliveredAt.toLocaleString("en-IN")}
            </p>
          )}
        </section>

        <section className="mt-4 p-5" style={cardStyle}>
          <h2
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={labelStyle}
          >
            Items
          </h2>
          <ul
            className="divide-y"
            style={{ borderColor: "var(--color-shell-line)" }}
          >
            {order.items.map((i) => (
              <li key={i.id} className="flex justify-between py-2.5 text-sm">
                <span className="flex-1 min-w-0">
                  <span className="font-medium">{i.itemTitle}</span>
                  {i.variantName && (
                    <span style={{ color: "var(--color-charcoal)" }}>
                      {" "}
                      · {i.variantName}
                    </span>
                  )}
                  <span style={{ color: "var(--color-charcoal)" }}>
                    {" "}
                    × {i.quantity}
                  </span>
                </span>
                <span className="tabular-nums whitespace-nowrap">
                  {formatINR(i.lineTotalPaise)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section
          className="mt-4 p-5 text-sm space-y-2"
          style={cardStyle}
        >
          {[
            ["Subtotal", order.subtotalPaise],
            ["Packaging", order.packagingFeePaise],
            ["Delivery", order.deliveryFeePaise],
            ["GST", order.gstPaise],
          ].map(([label, paise]) => (
            <div key={label as string} className="flex justify-between">
              <span style={labelStyle}>{label}</span>
              <span className="tabular-nums">{formatINR(paise as number)}</span>
            </div>
          ))}
          <div
            className="flex justify-between pt-2 border-t font-bold"
            style={{ borderColor: "var(--color-shell-line)" }}
          >
            <span>Total paid</span>
            <span
              className="tabular-nums"
              style={{ color: "var(--color-brand-yellow-300)" }}
            >
              {formatINR(order.totalPaise)}
            </span>
          </div>
        </section>

        <section className="mt-4 p-5" style={cardStyle}>
          <h2
            className="text-xs font-semibold uppercase tracking-wider mb-2"
            style={labelStyle}
          >
            Delivering to
          </h2>
          <p className="text-sm">
            <span className="font-medium">{order.address.label}</span> ·{" "}
            {order.address.fullAddress}
          </p>
        </section>

        <div className="mt-6 flex flex-col gap-3">
          <Link
            href={`/track/${order.id}`}
            className="text-center py-3.5 font-bold"
            style={{
              background: "var(--color-brand-yellow-300)",
              color: "var(--color-shell-bg)",
              borderRadius: "var(--radius)",
            }}
          >
            Track order
          </Link>
          <Link
            href="/account/orders"
            className="text-center py-3.5 font-medium"
            style={{
              border: "1px solid var(--color-shell-line)",
              color: "var(--color-shell-fg)",
              borderRadius: "var(--radius)",
            }}
          >
            My orders
          </Link>
        </div>
      </main>
    </>
  )
}
