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

const cardBase: React.CSSProperties = {
  background: "var(--color-shell-elev)",
  border: "1px solid var(--color-shell-line)",
  borderRadius: "var(--radius)",
}

const cardActive: React.CSSProperties = {
  background:
    "color-mix(in oklab, var(--color-brand-yellow-300) 14%, var(--color-shell-elev))",
  border: "1px solid var(--color-brand-yellow-300)",
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
        {addresses.map((a) => {
          const isActive = selectedAddressId === a.id
          return (
            <li key={a.id}>
              <label
                className="flex items-start gap-3 p-4 cursor-pointer"
                style={isActive ? { ...cardBase, ...cardActive } : cardBase}
              >
                <input
                  type="radio"
                  name="address"
                  value={a.id}
                  checked={isActive}
                  onChange={() => setSelectedAddressId(a.id)}
                  className="mt-1"
                  style={{ accentColor: "var(--color-brand-yellow-300)" }}
                />
                <span className="flex-1 min-w-0">
                  <span
                    className="text-xs font-semibold tracking-wider uppercase"
                    style={{ color: "var(--color-brand-yellow-300)" }}
                  >
                    {a.label}
                    {a.isDefault && (
                      <span
                        className="ml-2 text-[10px]"
                        style={{ color: "var(--color-charcoal)" }}
                      >
                        · default
                      </span>
                    )}
                  </span>
                  <span
                    className="block text-sm mt-1"
                    style={{ color: "var(--color-shell-fg)" }}
                  >
                    {a.fullAddress}
                  </span>
                  {(a.building || a.floor) && (
                    <span
                      className="block text-xs mt-0.5"
                      style={{ color: "var(--color-charcoal-strong)" }}
                    >
                      {[a.building, a.floor].filter(Boolean).join(" · ")}
                    </span>
                  )}
                  {a.landmark && (
                    <span
                      className="block text-xs mt-0.5"
                      style={{ color: "var(--color-charcoal)" }}
                    >
                      Landmark: {a.landmark}
                    </span>
                  )}
                </span>
              </label>
            </li>
          )
        })}
      </ul>

      <a
        href="/account/addresses/new?next=/checkout"
        className="mt-3 inline-block text-sm underline underline-offset-4"
        style={{ color: "var(--color-brand-yellow-300)" }}
      >
        + Add another address
      </a>

      <section className="mt-8">
        <h2
          className="text-xs font-semibold uppercase tracking-wider mb-2"
          style={{ color: "var(--color-charcoal)" }}
        >
          Payment method
        </h2>
        <ul className="space-y-2.5">
          <li>
            <label
              className="flex items-start gap-3 p-4"
              style={
                method === "UPI_MANUAL" && upiConfigured
                  ? { ...cardBase, ...cardActive, cursor: "pointer" }
                  : !upiConfigured
                    ? { ...cardBase, opacity: 0.5, cursor: "not-allowed" }
                    : { ...cardBase, cursor: "pointer" }
              }
            >
              <input
                type="radio"
                name="paymentMethod"
                value="UPI_MANUAL"
                checked={method === "UPI_MANUAL"}
                disabled={!upiConfigured}
                onChange={() => upiConfigured && setMethod("UPI_MANUAL")}
                className="mt-1"
                style={{ accentColor: "var(--color-brand-yellow-300)" }}
              />
              <span className="flex-1">
                <span
                  className="block font-semibold"
                  style={{ color: "var(--color-shell-fg)" }}
                >
                  Pay now via UPI
                </span>
                <span
                  className="block text-xs mt-0.5"
                  style={{ color: "var(--color-charcoal-strong)" }}
                >
                  {upiConfigured
                    ? "Scan QR, pay, share the UPI reference. Order ships sooner."
                    : "Not configured by the restaurant yet."}
                </span>
              </span>
            </label>
          </li>
          <li>
            <label
              className="flex items-start gap-3 p-4 cursor-pointer"
              style={method === "COD" ? { ...cardBase, ...cardActive } : cardBase}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="COD"
                checked={method === "COD"}
                onChange={() => setMethod("COD")}
                className="mt-1"
                style={{ accentColor: "var(--color-brand-yellow-300)" }}
              />
              <span className="flex-1">
                <span
                  className="block font-semibold"
                  style={{ color: "var(--color-shell-fg)" }}
                >
                  Pay on delivery (cash)
                </span>
                <span
                  className="block text-xs mt-0.5"
                  style={{ color: "var(--color-charcoal-strong)" }}
                >
                  Rider collects cash at your door.
                </span>
              </span>
            </label>
          </li>
        </ul>
      </section>

      {error && (
        <div
          className="mt-4 text-sm rounded-lg px-4 py-3"
          style={{
            background:
              "color-mix(in oklab, var(--color-brand-flame-500) 18%, transparent)",
            color: "var(--color-brand-flame-300)",
            border: "1px solid var(--color-brand-flame-700)",
          }}
        >
          {error}
        </div>
      )}

      <div
        className="fixed inset-x-0 bottom-0 z-40 pb-safe"
        style={{
          background: "var(--color-shell-bg)",
          borderTop: "1px solid var(--color-shell-line)",
        }}
      >
        <button
          type="button"
          disabled={submitting}
          onClick={handleSubmit}
          className="flex items-center justify-center w-full max-w-md mx-auto m-3 py-4 font-bold disabled:opacity-50"
          style={{
            background: "var(--color-brand-yellow-300)",
            color: "var(--color-shell-bg)",
            borderRadius: "var(--radius)",
          }}
        >
          {submitting ? "Placing order…" : `Place order · ${formatINR(totalPaise)}`}
        </button>
      </div>
    </>
  )
}
