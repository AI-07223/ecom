import { notFound } from "next/navigation"
import Link from "next/link"
import { getTenant } from "@/lib/getTenant"
import { getOrder } from "@/lib/commerce"

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

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ConfirmationPage({ params }: PageProps) {
  const { id } = await params
  const tenant = await getTenant()
  const order = await getOrder({ tenant, orderId: id })

  // The Medusa Store API only returns orders belonging to the publishable
  // key's sales channel; cross-tenant fetches return null → 404 here.
  if (!order) notFound()

  const sa = order.shipping_address
  const currency = (order.currency_code ?? "inr").toUpperCase()

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <p
        className="text-sm uppercase tracking-wide"
        style={{ color: "var(--brand-primary)" }}
      >
        Order confirmed
      </p>
      <h1
        className="mt-2 text-3xl font-semibold"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Thank you{sa?.first_name ? `, ${sa.first_name}` : ""}!
      </h1>
      <p className="mt-2 opacity-70">
        Order ID: <code className="text-xs">{order.id}</code>
      </p>

      <section className="mt-8">
        <h2 className="text-xs font-semibold uppercase tracking-wide opacity-70">Items</h2>
        <ul className="mt-2 divide-y divide-black/10">
          {order.items?.map((item) => (
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

      {sa ? (
        <section className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide opacity-70">
            Shipping to
          </h2>
          <address className="not-italic mt-2 text-sm leading-6">
            {sa.first_name} {sa.last_name}
            <br />
            {sa.address_1}
            <br />
            {sa.city}{sa.province ? `, ${sa.province}` : ""} {sa.postal_code}
            <br />
            {sa.country_code?.toUpperCase()}
          </address>
        </section>
      ) : null}

      <section className="mt-8 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="opacity-70">Subtotal</span>
          <span>{fmt(Number(order.item_subtotal ?? order.subtotal ?? 0), currency)}</span>
        </div>
        <div className="flex justify-between">
          <span className="opacity-70">Shipping</span>
          <span>{fmt(Number(order.shipping_subtotal ?? 0), currency)}</span>
        </div>
        <div className="flex justify-between">
          <span className="opacity-70">Tax</span>
          <span>{fmt(Number(order.tax_total ?? 0), currency)}</span>
        </div>
        <div className="mt-2 flex justify-between text-lg font-semibold">
          <span>Total</span>
          <span>{fmt(Number(order.total ?? 0), currency)}</span>
        </div>
        <div className="mt-2 text-xs opacity-60">
          Payment status: {order.payment_status ?? "not_paid"}
        </div>
      </section>

      <div className="mt-10">
        <Link
          href="/"
          className="text-sm underline opacity-70 hover:opacity-100"
        >
          ← Continue shopping
        </Link>
      </div>
    </main>
  )
}
