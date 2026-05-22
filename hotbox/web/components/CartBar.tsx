import Link from "next/link"
import { formatINR } from "@/lib/pricing"
import { getCartSummary } from "@/lib/cart"

/**
 * Sticky bottom cart bar visible on customer-facing pages (menu, category,
 * item detail). Hidden when the cart is empty.
 */
export async function CartBar(): Promise<React.ReactElement | null> {
  const { count, subtotalPaise } = await getCartSummary()
  if (count === 0) return null

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 pb-safe shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
      style={{ background: "var(--color-brand-500)" }}
    >
      <Link
        href="/cart"
        className="flex items-center justify-between max-w-md mx-auto px-5 py-3.5 text-white font-semibold"
      >
        <span className="flex items-center gap-3">
          <span className="bg-white/20 rounded-full px-2.5 py-0.5 text-sm tabular-nums">
            {count}
          </span>
          <span>View cart</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="tabular-nums">{formatINR(subtotalPaise)}</span>
          <span aria-hidden>›</span>
        </span>
      </Link>
    </div>
  )
}
