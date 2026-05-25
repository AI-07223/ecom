/**
 * Floating cart-state bar pinned to the bottom of the viewport on
 * customer-facing pages. Hidden when the cart is empty.
 *
 * Server Component — reads cart state via lib/cart on every render, so
 * navigation between pages picks up the latest count without client
 * subscription gymnastics. Quick-add Server Actions call revalidatePath
 * which causes the next render of this component to show the new total.
 */
import Link from "next/link"
import { formatINR } from "@/lib/pricing"
import { getCartSummary } from "@/lib/cart"

export async function BottomCartBar(): Promise<React.ReactElement | null> {
  const { count, subtotalPaise } = await getCartSummary()
  if (count === 0) return null

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 pb-safe"
      style={{
        background: "var(--color-brand-yellow-300)",
        boxShadow: "0 -8px 24px rgba(0,0,0,0.5), 0 -1px 0 rgba(255,255,255,0.05)",
      }}
    >
      <Link
        href="/cart"
        className="flex items-center justify-between max-w-md mx-auto px-5 py-4"
        style={{ color: "var(--color-shell-bg)" }}
      >
        <span className="flex items-center gap-3">
          <span
            className="rounded-full px-3 py-1 text-sm tabular-nums font-bold"
            style={{
              background: "var(--color-shell-bg)",
              color: "var(--color-brand-yellow-300)",
            }}
          >
            {count}
          </span>
          <span className="font-semibold">
            View cart{count > 1 ? ` · ${count} items` : ""}
          </span>
        </span>
        <span className="flex items-center gap-2 font-bold">
          <span className="tabular-nums">{formatINR(subtotalPaise)}</span>
          <span aria-hidden>→</span>
        </span>
      </Link>
    </div>
  )
}
