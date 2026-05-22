import Link from "next/link"
import { redirect } from "next/navigation"
import { listOrdersForCurrentUser } from "@/lib/orders"
import { STATE_LABELS } from "@/lib/order-state"
import { formatINR } from "@/lib/pricing"
import { getCurrentUser } from "@/lib/session"
import { ReorderButton } from "./ReorderButton"

export const dynamic = "force-dynamic"

export default async function OrdersHistoryPage(): Promise<React.ReactElement> {
  const user = await getCurrentUser()
  if (!user) redirect("/login?next=/account/orders")

  const orders = await listOrdersForCurrentUser()

  return (
    <main className="mx-auto max-w-md min-h-screen px-5 pt-8 pb-12">
      <Link
        href="/"
        className="text-sm text-zinc-500 hover:underline underline-offset-4"
      >
        ← Menu
      </Link>
      <h1 className="mt-3 text-3xl font-black tracking-tight">My orders</h1>

      {orders.length === 0 ? (
        <div className="mt-8 text-center text-zinc-500">
          <p>No orders yet.</p>
          <Link
            href="/"
            className="mt-4 inline-block underline underline-offset-4"
            style={{ color: "var(--color-brand-500)" }}
          >
            Start ordering
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {orders.map((o) => (
            <li
              key={o.id}
              className="rounded-2xl border border-zinc-200 p-4"
              style={{ borderRadius: "var(--radius)" }}
            >
              <div className="flex items-baseline justify-between">
                <span className="font-semibold text-sm">{o.publicCode}</span>
                <span className="text-xs text-zinc-500">
                  {o.placedAt.toLocaleDateString("en-IN")}
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                {o.items.length} item{o.items.length === 1 ? "" : "s"} ·{" "}
                <span className="font-medium tabular-nums">
                  {formatINR(o.totalPaise)}
                </span>
              </p>
              <p
                className="mt-2 inline-block text-xs font-medium rounded-full px-2.5 py-0.5"
                style={{
                  background: "var(--color-brand-50)",
                  color: "var(--color-brand-700)",
                }}
              >
                {STATE_LABELS[o.state]}
              </p>
              <div className="mt-3 flex items-center gap-4 text-xs">
                <Link
                  href={`/track/${o.id}`}
                  className="underline underline-offset-4"
                  style={{ color: "var(--color-brand-500)" }}
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
  )
}
