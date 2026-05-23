"use client"

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
  upiConfigured: boolean
}

export function CheckoutClient({
  addresses,
  totalPaise,
  upiConfigured,
}: Props): React.ReactElement {
  const router = useRouter()
  const initialDefault =
    addresses.find((a) => a.isDefault)?.id ?? addresses[0]!.id

  const [selectedAddressId, setSelectedAddressId] = useState<string>(initialDefault)
  const [method, setMethod] = useState<"UPI_MANUAL" | "COD">(
    upiConfigured ? "UPI_MANUAL" : "COD",
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(): Promise<void> {
    setError(null)
    setSubmitting(true)
    try {
      const result = await startCheckout({
        addressId: selectedAddressId,
        paymentMethod: method,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      if (result.paymentMethod === "UPI_MANUAL") {
        router.push(`/orders/${result.orderId}/pay`)
      } else {
        router.push(`/orders/${result.orderId}/confirmation`)
      }
      router.refresh()
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
                selectedAddressId === a.id
                  ? "border-brand-500 bg-brand-50"
                  : "border-zinc-200"
              }`}
              style={{ borderRadius: "var(--radius)" }}
            >
              <input
                type="radio"
                name="address"
                value={a.id}
                checked={selectedAddressId === a.id}
                onChange={() => setSelectedAddressId(a.id)}
                className="mt-1 accent-brand-500"
              />
              <span className="flex-1 min-w-0">
                <span
                  className="text-xs font-semibold tracking-wider uppercase"
                  style={{ color: "var(--color-brand-500)" }}
                >
                  {a.label}
                  {a.isDefault && (
                    <span className="ml-2 text-[10px] text-zinc-500">· default</span>
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

      <section className="mt-8">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
          Payment method
        </h2>
        <ul className="space-y-2.5">
          <li>
            <label
              className={`flex items-start gap-3 rounded-2xl border p-4 cursor-pointer ${
                method === "UPI_MANUAL" && upiConfigured
                  ? "border-brand-500 bg-brand-50"
                  : !upiConfigured
                    ? "border-zinc-100 bg-zinc-50 opacity-60 cursor-not-allowed"
                    : "border-zinc-200"
              }`}
              style={{ borderRadius: "var(--radius)" }}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="UPI_MANUAL"
                checked={method === "UPI_MANUAL"}
                disabled={!upiConfigured}
                onChange={() => upiConfigured && setMethod("UPI_MANUAL")}
                className="mt-1 accent-brand-500"
              />
              <span className="flex-1">
                <span className="block font-semibold text-zinc-900">
                  Pay now via UPI
                </span>
                <span className="block text-xs text-zinc-600 mt-0.5">
                  {upiConfigured
                    ? "Scan QR, pay, share the UPI reference. Order ships sooner."
                    : "Not configured by the restaurant yet."}
                </span>
              </span>
            </label>
          </li>
          <li>
            <label
              className={`flex items-start gap-3 rounded-2xl border p-4 cursor-pointer ${
                method === "COD"
                  ? "border-brand-500 bg-brand-50"
                  : "border-zinc-200"
              }`}
              style={{ borderRadius: "var(--radius)" }}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="COD"
                checked={method === "COD"}
                onChange={() => setMethod("COD")}
                className="mt-1 accent-brand-500"
              />
              <span className="flex-1">
                <span className="block font-semibold text-zinc-900">
                  Pay on delivery (cash)
                </span>
                <span className="block text-xs text-zinc-600 mt-0.5">
                  Rider collects cash at your door.
                </span>
              </span>
            </label>
          </li>
        </ul>
      </section>

      {error && (
        <div className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-40 pb-safe bg-white border-t border-zinc-200">
        <button
          type="button"
          disabled={submitting}
          onClick={handleSubmit}
          className="flex items-center justify-center w-full max-w-md mx-auto m-3 py-4 rounded-xl text-white font-semibold disabled:opacity-50"
          style={{
            background: "var(--color-brand-500)",
            borderRadius: "var(--radius)",
          }}
        >
          {submitting ? "Placing order…" : `Place order · ${formatINR(totalPaise)}`}
        </button>
      </div>
    </>
  )
}
