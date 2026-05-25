import Link from "next/link"
import { redirect } from "next/navigation"
import { Logo } from "@/components/brand/Logo"
import { getCartWithItems } from "@/lib/cart"
import { getRestaurant } from "@/lib/catalog"
import { computeTotals, formatINR } from "@/lib/pricing"
import { CartItemRow } from "./CartItemRow"

export const dynamic = "force-dynamic"

export default async function CartPage(): Promise<React.ReactElement> {
  const [cart, restaurant] = await Promise.all([
    getCartWithItems(),
    getRestaurant(),
  ])

  if (!cart || cart.items.length === 0) {
    return (
      <main className="mx-auto max-w-md min-h-dvh flex flex-col px-5 pt-10">
        <Link href="/" aria-label="Hot Box home" className="self-start">
          <Logo variant="full" size="sm" />
        </Link>
        <h1 className="mt-6 font-display text-5xl">Cart</h1>
        <div
          className="mt-12 text-center"
          style={{ color: "var(--color-charcoal)" }}
        >
          <p>Your cart is empty.</p>
          <Link
            href="/"
            className="mt-4 inline-block underline underline-offset-4 font-semibold"
            style={{ color: "var(--color-brand-yellow-300)" }}
          >
            Start ordering
          </Link>
        </div>
      </main>
    )
  }

  if (!restaurant) redirect("/")

  const lines = cart.items.map((i) => ({
    unitPricePaise: i.unitPricePaise,
    addonsPricePerUnitPaise: Math.max(
      0,
      i.lineTotalPaise / i.quantity - i.unitPricePaise,
    ),
    quantity: i.quantity,
  }))
  const totals = computeTotals(lines, {
    deliveryFeePaise: restaurant.deliveryFeePaise,
    packagingFeePaise: restaurant.packagingFeePaise,
    gstBasisPoints: restaurant.gstBasisPoints,
  })

  return (
    <main className="mx-auto max-w-md min-h-dvh flex flex-col pb-32">
      <header className="px-5 pt-6 pb-2">
        <div className="flex items-center justify-between">
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
        <h1 className="mt-4 font-display text-5xl">Cart</h1>
      </header>

      <ul
        className="px-5 mt-4 divide-y"
        style={{ borderColor: "var(--color-shell-line)" }}
      >
        {cart.items.map((item) => (
          <CartItemRow key={item.id} item={item} />
        ))}
      </ul>

      <section
        className="mx-5 mt-6 rounded-2xl p-5 text-sm space-y-2.5"
        style={{
          background: "var(--color-shell-elev)",
          border: "1px solid var(--color-shell-line)",
        }}
      >
        <div className="flex justify-between">
          <span style={{ color: "var(--color-charcoal)" }}>Subtotal</span>
          <span className="tabular-nums">
            {formatINR(totals.subtotalPaise)}
          </span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: "var(--color-charcoal)" }}>Packaging</span>
          <span className="tabular-nums">
            {formatINR(totals.packagingFeePaise)}
          </span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: "var(--color-charcoal)" }}>Delivery</span>
          <span className="tabular-nums">
            {formatINR(totals.deliveryFeePaise)}
          </span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: "var(--color-charcoal)" }}>
            GST ({(restaurant.gstBasisPoints / 100).toFixed(0)}%)
          </span>
          <span className="tabular-nums">{formatINR(totals.gstPaise)}</span>
        </div>
        <div
          className="flex justify-between pt-3 font-bold border-t"
          style={{ borderColor: "var(--color-shell-line)" }}
        >
          <span>Total</span>
          <span
            className="tabular-nums"
            style={{ color: "var(--color-brand-yellow-300)" }}
          >
            {formatINR(totals.totalPaise)}
          </span>
        </div>
      </section>

      <div
        className="fixed inset-x-0 bottom-0 z-40 pb-safe"
        style={{
          background: "var(--color-shell-bg)",
          borderTop: "1px solid var(--color-shell-line)",
        }}
      >
        <Link
          href="/checkout"
          className="flex items-center justify-center max-w-md mx-auto m-3 py-4 font-bold"
          style={{
            background: "var(--color-brand-yellow-300)",
            color: "var(--color-shell-bg)",
            borderRadius: "var(--radius)",
          }}
        >
          Continue to checkout · {formatINR(totals.totalPaise)}
        </Link>
      </div>
    </main>
  )
}
