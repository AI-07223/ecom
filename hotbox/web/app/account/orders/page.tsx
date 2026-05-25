import Link from "next/link"
import { redirect } from "next/navigation"
import { Logo } from "@/components/brand/Logo"
import { listOrdersForCurrentUser } from "@/lib/orders"
import { STATE_LABELS } from "@/lib/order-state"
import { formatINR } from "@/lib/pricing"
import { getCurrentUser } from "@/lib/session"
import { ReorderButton } from "./ReorderButton"

export const dynamic = "force-dynamic"

const cardStyle: React.CSSProperties = {
  background: "var(--color-shell-elev)",
  border: "1px solid var(--color-shell-line)",
  borderRadius: "var(--radius)",
}

export default async function OrdersHistoryPage(): Promise<React.ReactElement> {
  const user = await getCurrentUser()
  if (!user) redirect("/login?next=/account/orders")

  const orders = await listOrdersForCurrentUser()

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
            href="/"
            className="text-sm font-medium"
            style={{ color: "var(--color-brand-yellow-300)" }}
          >
            ← Menu
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-md px-5 pt-6 pb-12">
        <h1 className="font-display text-5xl">My orders</h1>

        {orders.length === 0 ? (
          <div
            className="mt-12 text-center"
            style={{ color: "var(--color-charcoal)" }}
          >
            <p>No orders yet.</p>
            <Link
              href="/"
              className="mt-4 inline-block underline underline-offset-4 font-semibold"
              style={{ color: "var(--color-brand-yellow-300)" }}
            >
              Start ordering
            </Link>
          </div>
        ) : (
          <ul className="mt-6 space-y-3">
            {orders.map((o) => (
              <li key={o.id} className="p-4" style={cardStyle}>
                <div className="flex items-baseline justify-between">
                  <span className="font-semibold text-sm font-mono">
                    {o.publicCode}
                  </span>
                  <span
                    className="text-xs"
                    style={{ color: "var(--color-charcoal)" }}
                  >
                    {o.placedAt.toLocaleDateString("en-IN")}
                  </span>
                </div>
                <p
                  className="mt-1 text-xs"
                  style={{ color: "var(--color-charcoal-strong)" }}
                >
                  {o.items.length} item{o.items.length === 1 ? "" : "s"} ·{" "}
                  <span
                    className="font-bold tabular-nums"
                    style={{ color: "var(--color-brand-yellow-300)" }}
                  >
                    {formatINR(o.totalPaise)}
                  </span>
                </p>
                <p
                  className="mt-2 inline-block text-xs font-medium rounded-full px-2.5 py-0.5"
                  style={{
                    background:
                      "color-mix(in oklab, var(--color-brand-yellow-300) 18%, transparent)",
                    color: "var(--color-brand-yellow-300)",
                  }}
                >
                  {STATE_LABELS[o.state]}
                </p>
                <div className="mt-3 flex items-center gap-4 text-xs">
                  <Link
                    href={`/track/${o.id}`}
                    className="underline underline-offset-4"
                    style={{ color: "var(--color-brand-yellow-300)" }}
                  >
                    Track
                  </Link>
                  <ReorderButton orderId={o.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  )
}
