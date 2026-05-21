import Link from "next/link"
import { getCurrentCart } from "@/lib/get-current-cart"

export async function CartIndicator() {
  const cart = await getCurrentCart()
  const count =
    cart?.items?.reduce((sum, item) => sum + (item.quantity ?? 0), 0) ?? 0

  return (
    <Link
      href="/cart"
      aria-label={`Cart (${count} item${count === 1 ? "" : "s"})`}
      style={{
        background: "var(--brand-surface)",
        color: "var(--brand-on-surface)",
        borderRadius: "var(--radius)",
        border: "1px solid color-mix(in srgb, var(--brand-on-surface) 12%, transparent)",
      }}
      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium hover:opacity-90"
    >
      <span aria-hidden>🛒</span>
      <span>
        Cart
        {count > 0 ? (
          <span
            style={{
              background: "var(--brand-primary)",
              color: "var(--brand-on-primary)",
              borderRadius: "999px",
            }}
            className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold"
          >
            {count}
          </span>
        ) : null}
      </span>
    </Link>
  )
}
