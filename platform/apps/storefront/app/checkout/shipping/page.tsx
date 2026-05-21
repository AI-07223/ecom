import Link from "next/link"
import { redirect } from "next/navigation"
import { getTenant } from "@/lib/getTenant"
import { getCartIdCookie } from "@/lib/cart"
import { listShippingOptions } from "@/lib/commerce"
import { setShippingMethodAction } from "@/lib/cart"
import { getCurrentCart } from "@/lib/get-current-cart"

function fmt(amount: number, currency = "INR"): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(0)}`
  }
}

export default async function ShippingPage() {
  const cart = await getCurrentCart()
  if (!cart || (cart.items?.length ?? 0) === 0) redirect("/cart")
  if (!cart.shipping_address) redirect("/checkout/address")

  const tenant = await getTenant()
  const cartId = await getCartIdCookie()
  const options = await listShippingOptions({ tenant, cartId: cartId! })

  if (options.length === 0) {
    return (
      <main className="mx-auto w-full max-w-2xl px-6 py-12">
        <ol className="mb-6 flex gap-2 text-xs uppercase tracking-wide opacity-70">
          <li>Address</li>
          <li>›</li>
          <li className="font-semibold">Shipping</li>
          <li>›</li>
          <li>Review</li>
        </ol>
        <h1
          className="text-3xl font-semibold"
          style={{ fontFamily: "var(--font-display)" }}
        >
          No shipping options
        </h1>
        <p className="mt-3 opacity-70">
          No shipping options are configured for your address. Please contact
          support.
        </p>
        <Link
          href="/checkout/address"
          className="mt-6 inline-block text-sm underline opacity-70 hover:opacity-100"
        >
          ← Back to address
        </Link>
      </main>
    )
  }

  const currentMethod = cart.shipping_methods?.[0]?.shipping_option_id ?? null
  const currency = (cart.currency_code ?? "inr").toUpperCase()

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <ol className="mb-6 flex gap-2 text-xs uppercase tracking-wide opacity-70">
        <li>Address</li>
        <li>›</li>
        <li className="font-semibold">Shipping</li>
        <li>›</li>
        <li>Review</li>
      </ol>
      <h1
        className="text-3xl font-semibold"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Shipping method
      </h1>

      <form action={setShippingMethodAction} className="mt-8 space-y-3">
        {(options as any[]).map((opt: any) => {
          const price = Number(opt.amount ?? opt.calculated_price?.calculated_amount ?? 0)
          return (
            <label
              key={opt.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-black/10 p-4 cursor-pointer hover:bg-black/[0.02]"
              style={{ borderRadius: "var(--radius)" }}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="option_id"
                  value={opt.id}
                  required
                  defaultChecked={
                    currentMethod === opt.id ||
                    (currentMethod === null && options[0]!.id === opt.id)
                  }
                />
                <div>
                  <div className="font-medium">{opt.name}</div>
                  <div className="text-xs opacity-60">
                    {opt.provider_id ?? "manual"}
                  </div>
                </div>
              </div>
              <div className="font-medium">{fmt(price, currency)}</div>
            </label>
          )
        })}

        <div className="mt-8 flex justify-between">
          <Link
            href="/checkout/address"
            className="text-sm underline opacity-70 hover:opacity-100"
          >
            ← Back to address
          </Link>
          <button
            type="submit"
            style={{
              background: "var(--brand-primary)",
              color: "var(--brand-on-primary)",
              borderRadius: "var(--radius)",
            }}
            className="inline-flex items-center px-6 py-3 text-sm font-medium hover:opacity-90"
          >
            Continue to review →
          </button>
        </div>
      </form>
    </main>
  )
}
