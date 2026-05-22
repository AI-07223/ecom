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
  items: Array<{
    id: string
    title: string
    variantName: string | null
    quantity: number
  }>
}

/**
 * Rider workflow on the web (no APK yet). When the order is in
 * PICKED_UP/OUT_FOR_DELIVERY we use the browser's `geolocation.watchPosition`
 * to push pings to the server every 5 seconds. This only works while the
 * tab is foregrounded — the APK (later) handles backgrounding.
 */
export function RiderClient({
  orderId,
  state,
  publicCode,
  pickupName,
  pickupAddress,
  dropAddress,
  dropBuilding,
  dropLandmark,
  totalText,
  items,
}: Props): React.ReactElement {
  const [, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const watchId = useRef<number | null>(null)
  const lastSendAt = useRef<number>(0)

  const shouldTrack = state === "PICKED_UP" || state === "OUT_FOR_DELIVERY"

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
        if (now - lastSendAt.current < 4500) return // throttle to ~5s
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
      className="w-full py-4 rounded-xl font-semibold text-white"
      style={{
        background: "var(--color-brand-500)",
        borderRadius: "var(--radius)",
      }}
    >
      {children}
    </button>
  )

  return (
    <>
      <div
        className="rounded-2xl border border-zinc-200 bg-white p-5 mb-4"
        style={{ borderRadius: "var(--radius)" }}
      >
        <p className="text-xs uppercase tracking-wider text-zinc-500">
          Order {publicCode}
        </p>
        <p className="mt-1 font-semibold">{totalText}</p>

        <h3 className="text-xs uppercase tracking-wider text-zinc-500 mt-5">
          Pickup
        </h3>
        <p className="mt-1 font-medium">{pickupName}</p>
        <p className="text-sm text-zinc-600">{pickupAddress}</p>

        <h3 className="text-xs uppercase tracking-wider text-zinc-500 mt-5">
          Deliver to
        </h3>
        <p className="mt-1 text-sm">{dropAddress}</p>
        {dropBuilding && (
          <p className="text-xs text-zinc-500">{dropBuilding}</p>
        )}
        {dropLandmark && (
          <p className="text-xs text-zinc-500">Near {dropLandmark}</p>
        )}

        <h3 className="text-xs uppercase tracking-wider text-zinc-500 mt-5">
          Items
        </h3>
        <ul className="text-sm mt-1 space-y-0.5">
          {items.map((i) => (
            <li key={i.id}>
              {i.quantity} × {i.title}
              {i.variantName && (
                <span className="text-zinc-500"> ({i.variantName})</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {error && (
        <div className="text-sm text-amber-900 bg-amber-50 rounded-lg px-3 py-2 mb-3">
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
        <Btn
          onClick={() =>
            startTransition(async () => {
              await riderMarkDelivered(orderId)
              window.location.reload()
            })
          }
        >
          I&rsquo;ve delivered the order
        </Btn>
      )}

      {shouldTrack && (
        <p className="text-center text-xs text-zinc-500 mt-3">
          📍 Sending your location every 5 seconds. Keep this tab open.
        </p>
      )}
    </>
  )
}
