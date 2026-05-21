import Link from "next/link"
import { getCurrentCart } from "@/lib/get-current-cart"
import { removeFromCartAction, updateQuantityAction } from "@/lib/cart"

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

export default async function CartPage() {
  const cart = await getCurrentCart()

  if (!cart || (cart.items?.length ?? 0) === 0) {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-12">
        <h1
          className="text-3xl font-semibold"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Your cart is empty
        </h1>
        <p className="mt-3 opacity-70">
          Add a product from the home page to get started.
        </p>
        <Link
          href="/"
          style={{
            background: "var(--brand-primary)",
            color: "var(--brand-on-primary)",
            borderRadius: "var(--radius)",
          }}
          className="mt-6 inline-flex items-center px-4 py-2 text-sm font-medium hover:opacity-90"
        >
          Continue shopping
        </Link>
      </main>
    )
  }

  const currency = (cart.currency_code ?? "inr").toUpperCase()

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12">
      <h1
        className="text-3xl font-semibold"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Your cart
      </h1>

      <ul className="mt-8 divide-y divide-black/10">
        {(cart.items ?? []).map((item: any) => (
          <li key={item.id} className="flex gap-4 py-6">
            {item.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.thumbnail}
                alt={item.title ?? ""}
                className="h-20 w-20 rounded object-cover"
                style={{ borderRadius: "var(--radius)" }}
              />
            ) : (
              <div
                aria-hidden
                className="h-20 w-20"
                style={{
                  borderRadius: "var(--radius)",
                  background:
                    "linear-gradient(135deg, var(--brand-primary), var(--brand-surface))",
                  opacity: 0.5,
                }}
              />
            )}
            <div className="flex flex-1 flex-col">
              <span className="font-medium">{item.product_title ?? item.title}</span>
              <span className="text-sm opacity-70">
                {fmt(Number(item.unit_price ?? 0), currency)} each
              </span>
              <div className="mt-2 flex items-center gap-4">
                <form action={updateQuantityAction} className="flex items-center gap-2">
                  <input type="hidden" name="line_item_id" value={item.id} />
                  <label className="text-xs opacity-70">Qty</label>
                  <input
                    type="number"
                    min={0}
                    defaultValue={item.quantity}
                    name="quantity"
                    className="w-16 rounded border border-black/15 px-2 py-1 text-sm"
                    style={{ borderRadius: "var(--radius)" }}
                  />
                  <button
                    type="submit"
                    className="text-xs underline opacity-70 hover:opacity-100"
                  >
                    Update
                  </button>
                </form>
                <form action={removeFromCartAction}>
                  <input type="hidden" name="line_item_id" value={item.id} />
                  <button
                    type="submit"
                    className="text-xs underline opacity-70 hover:opacity-100"
                  >
                    Remove
                  </button>
                </form>
              </div>
            </div>
            <div className="text-right font-medium">
              {fmt(Number(item.subtotal ?? item.unit_price ?? 0) * 1, currency)}
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex flex-col items-end gap-1 text-sm">
        <div>
          <span className="opacity-70">Subtotal: </span>
          <span className="font-medium">{fmt(Number(cart.item_subtotal ?? cart.subtotal ?? 0), currency)}</span>
        </div>
        <div className="opacity-70 text-xs">
          Shipping calculated at checkout
        </div>
      </div>

      <div className="mt-8 flex justify-between">
        <Link
          href="/"
          className="text-sm underline opacity-70 hover:opacity-100"
        >
          Continue shopping
        </Link>
        <Link
          href="/checkout/address"
          style={{
            background: "var(--brand-primary)",
            color: "var(--brand-on-primary)",
            borderRadius: "var(--radius)",
          }}
          className="inline-flex items-center px-6 py-3 text-sm font-medium hover:opacity-90"
        >
          Proceed to checkout →
        </Link>
      </div>
    </main>
  )
}
