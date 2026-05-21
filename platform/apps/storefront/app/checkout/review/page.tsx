import Link from "next/link"
import { redirect } from "next/navigation"
import { getCurrentCart } from "@/lib/get-current-cart"
import { placeOrderAction } from "@/lib/cart"

function fmt(amount: number | null | undefined, currency = "INR"): string {
  if (amount == null) return ""
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(Number(amount))
  } catch {
    return `${currency} ${Number(amount).toFixed(0)}`
  }
}

export default async function ReviewPage() {
  const cart = await getCurrentCart()
  if (!cart || (cart.items?.length ?? 0) === 0) redirect("/cart")
  if (!cart.shipping_address) redirect("/checkout/address")
  if (!cart.shipping_methods?.length) redirect("/checkout/shipping")

  const sa = cart.shipping_address
  const sm = cart.shipping_methods[0]!
  const currency = (cart.currency_code ?? "inr").toUpperCase()

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <ol className="mb-6 flex gap-2 text-xs uppercase tracking-wide opacity-70">
        <li>Address</li>
        <li>›</li>
        <li>Shipping</li>
        <li>›</li>
        <li className="font-semibold">Review</li>
      </ol>
      <h1
        className="text-3xl font-semibold"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Review your order
      </h1>

      <section className="mt-8 space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide opacity-70">Items</h2>
        <ul className="divide-y divide-black/10">
          {(cart.items ?? []).map((item: any) => (
            <li key={item.id} className="flex justify-between py-3 text-sm">
              <span>
                {item.product_title ?? item.title} × {item.quantity}
              </span>
              <span className="font-medium">
                {fmt(Number(item.subtotal ?? 0), currency)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide opacity-70">Ship to</h2>
        <address className="not-italic mt-2 text-sm leading-6">
          {sa.first_name} {sa.last_name}
          <br />
          {sa.address_1}
          <br />
          {sa.city}{sa.province ? `, ${sa.province}` : ""} {sa.postal_code}
          <br />
          {sa.country_code?.toUpperCase()}
          <br />
          {cart.email}
        </address>
      </section>

      <section className="mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide opacity-70">Shipping</h2>
        <p className="mt-2 text-sm">
          {sm.name} — {fmt(Number(sm.amount ?? 0), currency)}
        </p>
      </section>

      <section className="mt-8 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="opacity-70">Subtotal</span>
          <span>{fmt(Number(cart.item_subtotal ?? cart.subtotal ?? 0), currency)}</span>
        </div>
        <div className="flex justify-between">
          <span className="opacity-70">Shipping</span>
          <span>{fmt(Number(cart.shipping_subtotal ?? sm.amount ?? 0), currency)}</span>
        </div>
        <div className="flex justify-between">
          <span className="opacity-70">Tax</span>
          <span>{fmt(Number(cart.tax_total ?? 0), currency)}</span>
        </div>
        <div className="mt-2 flex justify-between text-lg font-semibold">
          <span>Total</span>
          <span>{fmt(Number(cart.total ?? 0), currency)}</span>
        </div>
      </section>

      <form action={placeOrderAction} className="mt-10 flex justify-between">
        <Link
          href="/checkout/shipping"
          className="text-sm underline opacity-70 hover:opacity-100"
        >
          ← Back to shipping
        </Link>
        <button
          type="submit"
          style={{
            background: "var(--brand-primary)",
            color: "var(--brand-on-primary)",
            borderRadius: "var(--radius)",
          }}
          className="inline-flex items-center px-6 py-3 text-sm font-semibold hover:opacity-90"
        >
          Place order
        </button>
      </form>

      <p className="mt-4 text-xs opacity-60">
        Note: payment integration ships in the next change (cashfree-payments-easy-split).
        For now, placing an order creates it in Medusa with payment_status =
        not_paid.
      </p>
    </main>
  )
}
