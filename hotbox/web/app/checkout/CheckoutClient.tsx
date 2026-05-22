"use client"

import { load as loadCashfree } from "@cashfreepayments/cashfree-js"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { startCheckout } from "@/app/_actions/checkout"
import { formatINR } from "@/lib/pricing"

interface AddressOption {
  id: string
  label: "HOME" | "WORK" | "OTHER"
  fullAddress: string
  building: string | null
  floor: string | null
  landmark: string | null
  isDefault: boolean
}

interface Props {
  addresses: AddressOption[]
  totalPaise: number
  paymentsConfigured: boolean
}

export function CheckoutClient({
  addresses,
  totalPaise,
  paymentsConfigured,
}: Props): React.ReactElement {
  const router = useRouter()
  const initialDefault =
    addresses.find((a) => a.isDefault)?.id ?? addresses[0]!.id

  const [selectedId, setSelectedId] = useState<string>(initialDefault)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePay(): Promise<void> {
    setError(null)
    setSubmitting(true)
    try {
      const result = await startCheckout({ addressId: selectedId })
      if (!result.ok) {
        setError(result.error)
        return
      }

      // Mount Cashfree.js Drop-in
      const cashfree = await loadCashfree({ mode: result.cashfreeEnv })
      await cashfree.checkout({
        paymentSessionId: result.paymentSessionId,
        redirectTarget: "_self",
      })
      // The redirect is handled by Cashfree; nothing left to do here. If
      // the user closes the widget without paying, they stay on this page.
    } catch (err) {
      console.error(err)
      setError(
        "Something went wrong starting the payment. Please try again.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <ul className="space-y-2.5">
        {addresses.map((a) => (
          <li key={a.id}>
            <label
              className={`flex items-start gap-3 rounded-2xl border p-4 cursor-pointer ${
                selectedId === a.id
                  ? "border-brand-500 bg-brand-50"
                  : "border-zinc-200"
              }`}
              style={{ borderRadius: "var(--radius)" }}
            >
              <input
                type="radio"
                name="address"
                value={a.id}
                checked={selectedId === a.id}
                onChange={() => setSelectedId(a.id)}
                className="mt-1 accent-brand-500"
              />
              <span className="flex-1 min-w-0">
                <span
                  className="text-xs font-semibold tracking-wider uppercase"
                  style={{ color: "var(--color-brand-500)" }}
                >
                  {a.label}
                  {a.isDefault && (
                    <span className="ml-2 text-[10px] text-zinc-500">
                      · default
                    </span>
                  )}
                </span>
                <span className="block text-sm text-zinc-900 mt-1">
                  {a.fullAddress}
                </span>
                {(a.building || a.floor) && (
                  <span className="block text-xs text-zinc-600 mt-0.5">
                    {[a.building, a.floor].filter(Boolean).join(" · ")}
                  </span>
                )}
                {a.landmark && (
                  <span className="block text-xs text-zinc-500 mt-0.5">
                    Landmark: {a.landmark}
                  </span>
                )}
              </span>
            </label>
          </li>
        ))}
      </ul>

      <a
        href="/account/addresses/new?next=/checkout"
        className="mt-3 inline-block text-sm underline underline-offset-4 text-zinc-600"
      >
        + Add another address
      </a>

      {error && (
        <div className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {!paymentsConfigured && (
        <div className="mt-4 text-xs text-amber-900 bg-amber-50 rounded-lg px-3 py-2.5">
          Cashfree credentials aren&rsquo;t configured yet. The operator must
          set <code>CASHFREE_APP_ID</code> and <code>CASHFREE_SECRET_KEY</code>{" "}
          in Coolify before payments work.
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-40 pb-safe bg-white border-t border-zinc-200">
        <button
          type="button"
          disabled={submitting || !paymentsConfigured}
          onClick={handlePay}
          className="flex items-center justify-center w-full max-w-md mx-auto m-3 py-4 rounded-xl text-white font-semibold disabled:opacity-50"
          style={{
            background: "var(--color-brand-500)",
            borderRadius: "var(--radius)",
          }}
        >
          {submitting
            ? "Starting payment…"
            : `Pay ${formatINR(totalPaise)}`}
        </button>
      </div>
    </>
  )
}
