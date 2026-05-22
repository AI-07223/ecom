import Link from "next/link"
import { redirect } from "next/navigation"
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
      <main className="mx-auto max-w-md min-h-screen flex flex-col px-5 pt-10">
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:underline underline-offset-4"
        >
          ← Menu
        </Link>
        <h1 className="mt-4 text-3xl font-black tracking-tight">Cart</h1>
        <div className="mt-12 text-center text-zinc-500">
          <p>Your cart is empty.</p>
          <Link
            href="/"
            className="mt-4 inline-block underline underline-offset-4"
            style={{ color: "var(--color-brand-500)" }}
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
    <main className="mx-auto max-w-md min-h-screen flex flex-col pb-32">
      <header className="px-5 pt-8 pb-2">
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:underline underline-offset-4"
        >
          ← Menu
        </Link>
        <h1 className="mt-3 text-3xl font-black tracking-tight">Cart</h1>
      </header>

      <ul className="px-5 mt-4 divide-y divide-zinc-100">
        {cart.items.map((item) => (
          <CartItemRow key={item.id} item={item} />
        ))}
      </ul>

      <section className="mx-5 mt-6 rounded-2xl bg-zinc-50 p-5 text-sm space-y-2.5">
        <div className="flex justify-between">
          <span className="text-zinc-600">Subtotal</span>
          <span className="tabular-nums">
            {formatINR(totals.subtotalPaise)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-600">Packaging</span>
          <span className="tabular-nums">
            {formatINR(totals.packagingFeePaise)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-600">Delivery</span>
          <span className="tabular-nums">
            {formatINR(totals.deliveryFeePaise)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-600">
            GST ({(restaurant.gstBasisPoints / 100).toFixed(0)}%)
          </span>
          <span className="tabular-nums">{formatINR(totals.gstPaise)}</span>
        </div>
        <div className="flex justify-between pt-2 border-t border-zinc-200 font-semibold">
          <span>Total</span>
          <span className="tabular-nums">{formatINR(totals.totalPaise)}</span>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 pb-safe bg-white border-t border-zinc-200">
        <Link
          href="/checkout"
          className="flex items-center justify-center max-w-md mx-auto m-3 py-4 rounded-xl text-white font-semibold"
          style={{
            background: "var(--color-brand-500)",
            borderRadius: "var(--radius)",
          }}
        >
          Continue to checkout · {formatINR(totals.totalPaise)}
        </Link>
      </div>
    </main>
  )
}
