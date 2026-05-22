import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { getOrderForCurrentUser } from "@/lib/orders"
import { formatINR } from "@/lib/pricing"
import { STATE_LABELS } from "@/lib/order-state"
import { getCurrentUser } from "@/lib/session"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
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
    <main className="mx-auto max-w-md min-h-screen px-5 pt-8 pb-12">
      <div className="mt-2">
        {isPaid && (
          <div
            className="rounded-2xl p-5 text-white"
            style={{
              background: "var(--color-brand-500)",
              borderRadius: "var(--radius)",
            }}
          >
            <h1 className="text-2xl font-black">Order confirmed</h1>
            <p className="text-sm opacity-90 mt-1">{order.publicCode}</p>
          </div>
        )}
        {isPaymentPending && (
          <div className="rounded-2xl bg-amber-50 text-amber-900 p-5">
            <h1 className="text-xl font-bold">Waiting for payment</h1>
            <p className="text-sm mt-1">
              Refresh this page after a moment. If your payment was
              successful, this will switch to confirmed.
            </p>
          </div>
        )}
        {isFailed && (
          <div className="rounded-2xl bg-red-50 text-red-900 p-5">
            <h1 className="text-xl font-bold">Payment failed</h1>
            <p className="text-sm mt-1">
              No charge was made. You can{" "}
              <Link
                href="/cart"
                className="underline underline-offset-4 font-semibold"
              >
                go back to your cart
              </Link>{" "}
              and try a different method.
            </p>
          </div>
        )}
      </div>

      <section className="mt-6 rounded-2xl border border-zinc-200 p-5 space-y-2.5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Status
        </h2>
        <p className="font-medium">{STATE_LABELS[order.state]}</p>
        {order.deliveredAt && (
          <p className="text-xs text-zinc-500">
            Delivered {order.deliveredAt.toLocaleString("en-IN")}
          </p>
        )}
      </section>

      <section className="mt-4 rounded-2xl border border-zinc-200 p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
          Items
        </h2>
        <ul className="divide-y divide-zinc-100">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between py-2.5 text-sm">
              <span className="flex-1 min-w-0">
                <span className="font-medium">{i.itemTitle}</span>
                {i.variantName && (
                  <span className="text-zinc-500"> · {i.variantName}</span>
                )}
                <span className="text-zinc-500"> × {i.quantity}</span>
              </span>
              <span className="tabular-nums whitespace-nowrap">
                {formatINR(i.lineTotalPaise)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-4 rounded-2xl bg-zinc-50 p-5 text-sm space-y-2">
        <div className="flex justify-between">
          <span className="text-zinc-600">Subtotal</span>
          <span className="tabular-nums">
            {formatINR(order.subtotalPaise)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-600">Packaging</span>
          <span className="tabular-nums">
            {formatINR(order.packagingFeePaise)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-600">Delivery</span>
          <span className="tabular-nums">
            {formatINR(order.deliveryFeePaise)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-600">GST</span>
          <span className="tabular-nums">{formatINR(order.gstPaise)}</span>
        </div>
        <div className="flex justify-between pt-2 border-t border-zinc-200 font-semibold">
          <span>Total paid</span>
          <span className="tabular-nums">{formatINR(order.totalPaise)}</span>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-zinc-200 p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
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
          className="text-center py-3.5 rounded-xl font-semibold text-white"
          style={{
            background: "var(--color-brand-500)",
            borderRadius: "var(--radius)",
          }}
        >
          Track order
        </Link>
        <Link
          href="/account/orders"
          className="text-center py-3.5 rounded-xl border border-zinc-300 font-medium"
          style={{ borderRadius: "var(--radius)" }}
        >
          My orders
        </Link>
      </div>
    </main>
  )
}
