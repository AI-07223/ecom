import Link from "next/link"
import { redirect } from "next/navigation"
import { Logo } from "@/components/brand/Logo"
import { getCartWithItems } from "@/lib/cart"
import { getRestaurant } from "@/lib/catalog"
import { listAddressesForCurrentUser } from "@/lib/addresses"
import { computeTotals, formatINR } from "@/lib/pricing"
import { getCurrentUser } from "@/lib/session"
import { CheckoutClient } from "./CheckoutClient"

export const dynamic = "force-dynamic"

const cardStyle: React.CSSProperties = {
  background: "var(--color-shell-elev)",
  border: "1px solid var(--color-shell-line)",
  borderRadius: "var(--radius)",
}

const labelStyle: React.CSSProperties = {
  color: "var(--color-charcoal)",
}

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
            href="/cart"
            className="text-sm font-medium"
            style={{ color: "var(--color-brand-yellow-300)" }}
          >
            ← Cart
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-md px-5 pt-6 pb-32">
        <h1 className="font-display text-5xl">Checkout</h1>

        <section className="mt-6">
          <h2
            className="text-xs font-semibold uppercase tracking-wider mb-2"
            style={labelStyle}
          >
            Delivery to
          </h2>
          {addresses.length === 0 ? (
            <Link
              href="/account/addresses/new?next=/checkout"
              className="block px-5 py-6 text-center text-sm"
              style={{
                background: "var(--color-shell-elev)",
                border: "1px dashed var(--color-brand-yellow-300)",
                color: "var(--color-brand-yellow-300)",
                borderRadius: "var(--radius)",
              }}
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
          <h2
            className="text-xs font-semibold uppercase tracking-wider mb-2"
            style={labelStyle}
          >
            Order summary
          </h2>
          <ul
            className="divide-y px-4"
            style={{ ...cardStyle, borderRadius: "var(--radius)" }}
          >
            {cart.items.map((i, idx) => (
              <li
                key={i.id}
                className={`flex justify-between py-3 text-sm ${idx > 0 ? "border-t" : ""}`}
                style={{ borderColor: "var(--color-shell-line)" }}
              >
                <span className="flex-1 min-w-0">
                  <span className="font-medium">{i.itemTitle}</span>
                  {i.variantName && (
                    <span style={labelStyle}> · {i.variantName}</span>
                  )}
                  <span style={labelStyle}> × {i.quantity}</span>
                </span>
                <span className="tabular-nums whitespace-nowrap">
                  {formatINR(i.lineTotalPaise)}
                </span>
              </li>
            ))}
          </ul>

          <div
            className="mt-3 p-4 text-sm space-y-2"
            style={cardStyle}
          >
            {[
              ["Subtotal", totals.subtotalPaise],
              ["Packaging", totals.packagingFeePaise],
              ["Delivery", totals.deliveryFeePaise],
              [
                `GST (${(restaurant.gstBasisPoints / 100).toFixed(0)}%)`,
                totals.gstPaise,
              ],
            ].map(([label, paise]) => (
              <div key={label as string} className="flex justify-between">
                <span style={labelStyle}>{label}</span>
                <span className="tabular-nums">
                  {formatINR(paise as number)}
                </span>
              </div>
            ))}
            <div
              className="flex justify-between pt-2 border-t font-bold"
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
          </div>
        </section>
      </main>
    </>
  )
}
