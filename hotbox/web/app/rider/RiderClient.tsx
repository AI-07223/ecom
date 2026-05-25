"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import {
  riderMarkDelivered,
  riderMarkOutForDelivery,
  riderMarkPickedUp,
} from "@/app/_actions/rider"

interface Props {
  orderId: string
  state: string
  publicCode: string
  paymentMethod: "UPI_MANUAL" | "COD" | "ONLINE" | null
  paymentStatus: string
  pickupName: string
  pickupAddress: string
  pickupLat: number
  pickupLng: number
  dropAddress: string
  dropBuilding: string | null
  dropLandmark: string | null
  dropLat: number | null
  dropLng: number | null
  totalText: string
  totalRupees: number
  items: Array<{
    id: string
    title: string
    variantName: string | null
    quantity: number
  }>
}

export function RiderClient({
  orderId,
  state,
  publicCode,
  paymentMethod,
  paymentStatus,
  pickupName,
  pickupAddress,
  dropAddress,
  dropBuilding,
  dropLandmark,
  totalText,
  totalRupees,
  items,
}: Props): React.ReactElement {
  const [, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showCodModal, setShowCodModal] = useState(false)
  const watchId = useRef<number | null>(null)
  const lastSendAt = useRef<number>(0)

  const shouldTrack = state === "PICKED_UP" || state === "OUT_FOR_DELIVERY"
  const isCOD = paymentMethod === "COD" && paymentStatus !== "PAID"

  useEffect(() => {
    if (!shouldTrack) {
      if (watchId.current !== null && "geolocation" in navigator) {
        navigator.geolocation.clearWatch(watchId.current)
        watchId.current = null
      }
      return
    }
    if (!("geolocation" in navigator)) {
      setError("Your browser doesn't support GPS. Use the rider app instead.")
      return
    }
    watchId.current = navigator.geolocation.watchPosition(
      (g) => {
        const now = Date.now()
        if (now - lastSendAt.current < 4500) return
        lastSendAt.current = now
        void fetch("/api/rider/ping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lat: g.coords.latitude,
            lng: g.coords.longitude,
            accuracy_m: g.coords.accuracy,
            ts: new Date().toISOString(),
          }),
        })
      },
      (err) => {
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied. Allow location to ping the customer."
            : "GPS error — keep this tab open and try again.",
        )
      },
      { enableHighAccuracy: true, maximumAge: 4000, timeout: 8000 },
    )
    return () => {
      if (watchId.current !== null && "geolocation" in navigator) {
        navigator.geolocation.clearWatch(watchId.current)
      }
    }
  }, [shouldTrack])

  function handleDeliveredTap(): void {
    if (isCOD) {
      setShowCodModal(true)
    } else {
      startTransition(async () => {
        await riderMarkDelivered(orderId, { cashCollected: false })
        window.location.reload()
      })
    }
  }

  function confirmCash(yes: boolean): void {
    setShowCodModal(false)
    startTransition(async () => {
      await riderMarkDelivered(orderId, { cashCollected: yes })
      window.location.reload()
    })
  }

  const Btn = ({
    onClick,
    children,
  }: {
    onClick: () => void
    children: React.ReactNode
  }) => (
    <button
      type="button"
      onClick={onClick}
      className="w-full py-4 font-bold"
      style={{
        background: "var(--color-brand-yellow-300)",
        color: "var(--color-shell-bg)",
        borderRadius: "var(--radius)",
      }}
    >
      {children}
    </button>
  )

  return (
    <>
      {/* Payment badge — most prominent for COD */}
      {paymentStatus === "PAID" ? (
        <div
          className="mb-3 rounded-xl px-4 py-2.5 text-sm font-semibold"
          style={{
            background: "color-mix(in oklab, var(--color-veg) 14%, transparent)",
            border: "1px solid var(--color-veg)",
            color: "var(--color-veg)",
          }}
        >
          ✓ Already paid (online)
        </div>
      ) : isCOD ? (
        <div
          className="mb-3 rounded-2xl px-5 py-4"
          style={{
            background:
              "linear-gradient(135deg, var(--color-brand-yellow-300), var(--color-brand-yellow-400))",
            color: "var(--color-shell-bg)",
            borderRadius: "var(--radius)",
          }}
        >
          <p className="text-xs font-bold uppercase tracking-wider">
            ⚠ Collect cash
          </p>
          <p className="font-display text-5xl leading-none mt-1">
            ₹{totalRupees.toFixed(0)}
          </p>
        </div>
      ) : paymentStatus === "AWAITING_VERIFICATION" ? (
        <div
          className="mb-3 rounded-xl px-4 py-2.5 text-sm"
          style={{
            background: "color-mix(in oklab, var(--color-brand-cyan-300) 12%, transparent)",
            border: "1px solid var(--color-brand-cyan-300)",
            color: "var(--color-brand-cyan-300)",
          }}
        >
          Payment pending verification — confirm with customer if asked
        </div>
      ) : null}

      <div
        className="rounded-2xl p-5 mb-4"
        style={{
          background: "var(--color-shell-elev)",
          border: "1px solid var(--color-shell-line)",
          borderRadius: "var(--radius)",
        }}
      >
        <p
          className="text-xs uppercase tracking-wider"
          style={{ color: "var(--color-charcoal)" }}
        >
          Order {publicCode}
        </p>
        <p
          className="mt-1 font-bold"
          style={{ color: "var(--color-brand-yellow-300)" }}
        >
          {totalText}
        </p>

        <h3
          className="text-xs uppercase tracking-wider mt-5"
          style={{ color: "var(--color-charcoal)" }}
        >
          Pickup
        </h3>
        <p className="mt-1 font-medium">{pickupName}</p>
        <p
          className="text-sm"
          style={{ color: "var(--color-charcoal-strong)" }}
        >
          {pickupAddress}
        </p>

        <h3
          className="text-xs uppercase tracking-wider mt-5"
          style={{ color: "var(--color-charcoal)" }}
        >
          Deliver to
        </h3>
        <p className="mt-1 text-sm">{dropAddress}</p>
        {dropBuilding && (
          <p
            className="text-xs"
            style={{ color: "var(--color-charcoal)" }}
          >
            {dropBuilding}
          </p>
        )}
        {dropLandmark && (
          <p
            className="text-xs"
            style={{ color: "var(--color-charcoal)" }}
          >
            Near {dropLandmark}
          </p>
        )}

        <h3
          className="text-xs uppercase tracking-wider mt-5"
          style={{ color: "var(--color-charcoal)" }}
        >
          Items
        </h3>
        <ul className="text-sm mt-1 space-y-0.5">
          {items.map((i) => (
            <li key={i.id}>
              {i.quantity} × {i.title}
              {i.variantName && (
                <span style={{ color: "var(--color-charcoal)" }}>
                  {" "}
                  ({i.variantName})
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {error && (
        <div
          className="text-sm rounded-lg px-3 py-2 mb-3"
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

      {state === "ASSIGNED" && (
        <Btn
          onClick={() =>
            startTransition(async () => {
              await riderMarkPickedUp(orderId)
              window.location.reload()
            })
          }
        >
          I&rsquo;ve picked up the order
        </Btn>
      )}

      {state === "PICKED_UP" && (
        <Btn
          onClick={() =>
            startTransition(async () => {
              await riderMarkOutForDelivery(orderId)
              window.location.reload()
            })
          }
        >
          Heading out — start tracking
        </Btn>
      )}

      {state === "OUT_FOR_DELIVERY" && (
        <Btn onClick={handleDeliveredTap}>
          I&rsquo;ve delivered the order
        </Btn>
      )}

      {shouldTrack && (
        <p
          className="text-center text-xs mt-3"
          style={{ color: "var(--color-charcoal)" }}
        >
          📍 Sending your location every 5 seconds. Keep this tab open.
        </p>
      )}

      {/* COD cash-collection modal */}
      {showCodModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pb-safe"
          style={{ background: "color-mix(in oklab, var(--color-shell-bg) 70%, transparent)" }}
          onClick={() => setShowCodModal(false)}
        >
          <div
            className="rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6"
            style={{
              background: "var(--color-shell-elev)",
              border: "1px solid var(--color-shell-line)",
              color: "var(--color-shell-fg)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-1">
              Did the customer pay cash?
            </h3>
            <p
              className="text-sm mb-5"
              style={{ color: "var(--color-charcoal-strong)" }}
            >
              Order {publicCode} · ₹{totalRupees.toFixed(0)}
            </p>
            <button
              type="button"
              onClick={() => confirmCash(true)}
              className="w-full py-4 font-bold mb-2"
              style={{
                background: "var(--color-brand-yellow-300)",
                color: "var(--color-shell-bg)",
                borderRadius: "var(--radius)",
              }}
            >
              ✓ Yes — ₹{totalRupees.toFixed(0)} received
            </button>
            <button
              type="button"
              onClick={() => confirmCash(false)}
              className="w-full py-3 font-medium"
              style={{
                background:
                  "color-mix(in oklab, var(--color-brand-flame-500) 14%, transparent)",
                border: "1px solid var(--color-brand-flame-700)",
                color: "var(--color-brand-flame-300)",
                borderRadius: "var(--radius)",
              }}
            >
              No — flag for admin follow-up
            </button>
            <button
              type="button"
              onClick={() => setShowCodModal(false)}
              className="w-full py-2 mt-2 text-sm"
              style={{ color: "var(--color-charcoal)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  )
}
