import Link from "next/link"
import { redirect } from "next/navigation"
import { getCartWithItems } from "@/lib/cart"
import { getRestaurant } from "@/lib/catalog"
import { listAddressesForCurrentUser } from "@/lib/addresses"
import { computeTotals, formatINR } from "@/lib/pricing"
import { getCurrentUser } from "@/lib/session"
import { CheckoutClient } from "./CheckoutClient"

export const dynamic = "force-dynamic"

export default async function CheckoutPage(): Promise<React.ReactElement> {
  const user = await getCurrentUser()
  if (!user) redirect("/login?next=/checkout")

  const [cart, restaurant, addresses] = await Promise.all([
    getCartWithItems(),
    getRestaurant(),
    listAddressesForCurrentUser(),
  ])

  if (!restaurant) redirect("/")
  if (!cart || cart.items.length === 0) redirect("/cart")

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

  const upiConfigured = Boolean(restaurant.upiVpa)

  return (
    <main className="mx-auto max-w-md min-h-screen px-5 pt-8 pb-32">
      <Link
        href="/cart"
        className="text-sm text-zinc-500 hover:underline underline-offset-4"
      >
        ← Cart
      </Link>
      <h1 className="mt-3 text-3xl font-black tracking-tight">Checkout</h1>

      <section className="mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
          Delivery to
        </h2>
        {addresses.length === 0 ? (
          <Link
            href="/account/addresses/new?next=/checkout"
            className="block rounded-2xl border border-dashed border-zinc-300 px-5 py-6 text-center text-sm text-zinc-600 hover:border-brand-300"
            style={{ borderRadius: "var(--radius)" }}
          >
            + Add an address
          </Link>
        ) : (
          <CheckoutClient
            addresses={addresses.map((a) => ({
              id: a.id,
              label: a.label,
              fullAddress: a.fullAddress,
              building: a.building,
              floor: a.floor,
              landmark: a.landmark,
              isDefault: a.isDefault,
            }))}
            totalPaise={totals.totalPaise}
            upiConfigured={upiConfigured}
          />
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
          Order summary
        </h2>
        <ul className="rounded-2xl border border-zinc-200 divide-y divide-zinc-100 px-4">
          {cart.items.map((i) => (
            <li key={i.id} className="flex justify-between py-3 text-sm">
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

        <div className="mt-3 rounded-2xl bg-zinc-50 p-4 text-sm space-y-2">
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
        </div>
      </section>
    </main>
  )
}
