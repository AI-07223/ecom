"use client"

import dynamic from "next/dynamic"
import { useEffect, useMemo, useRef, useState } from "react"
import { STATE_LABELS } from "@/lib/order-state"

const TrackMap = dynamic(() => import("./TrackMap").then((m) => m.TrackMap), {
  ssr: false,
  loading: () => (
    <div
      className="rounded-2xl animate-pulse"
      style={{
        height: 280,
        background: "var(--color-shell-elev)",
        border: "1px solid var(--color-shell-line)",
      }}
    />
  ),
})

interface EventRow {
  event: string
  createdAt: string
  note: string | null
}

interface Props {
  orderId: string
  initialState: string
  customerLat: number | null
  customerLng: number | null
  riderName: string | null
  initialEvents: EventRow[]
}

// Straight-line distance (Haversine) in km
function distanceKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6371
  const dLat = ((bLat - aLat) * Math.PI) / 180
  const dLng = ((bLng - aLng) * Math.PI) / 180
  const lat1 = (aLat * Math.PI) / 180
  const lat2 = (bLat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function TrackClient({
  orderId,
  initialState,
  customerLat,
  customerLng,
  riderName: initialRiderName,
  initialEvents,
}: Props): React.ReactElement {
  const [state, setState] = useState<string>(initialState)
  const [events, setEvents] = useState<EventRow[]>(initialEvents)
  const [riderName, setRiderName] = useState<string | null>(initialRiderName)
  const [riderPos, setRiderPos] = useState<{
    lat: number
    lng: number
    ts: string
  } | null>(null)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const es = new EventSource(`/api/track/${orderId}/stream`)
    esRef.current = es

    es.onmessage = (m) => {
      try {
        const data = JSON.parse(m.data) as
          | {
              kind: "snapshot"
              state: string
              rider: { name: string; lat: number | null; lng: number | null; ts: string | null } | null
              customerLat: number | null
              customerLng: number | null
              events: EventRow[]
            }
          | { kind: "ping"; lat: number; lng: number; ts: string }
          | { kind: "state"; state: string; createdAt: string; note: string | null }

        if (data.kind === "snapshot") {
          setState(data.state)
          setEvents(data.events)
          if (data.rider) {
            setRiderName(data.rider.name)
            if (data.rider.lat != null && data.rider.lng != null)
              setRiderPos({
                lat: data.rider.lat,
                lng: data.rider.lng,
                ts: data.rider.ts ?? new Date().toISOString(),
              })
          }
        } else if (data.kind === "ping") {
          setRiderPos({ lat: data.lat, lng: data.lng, ts: data.ts })
        } else if (data.kind === "state") {
          setState(data.state)
          setEvents((evs) => [
            ...evs,
            { event: data.state, createdAt: data.createdAt, note: data.note },
          ])
        }
      } catch {
        /* ignore malformed */
      }
    }

    es.onerror = () => {
      // EventSource auto-reconnects; nothing to do here.
    }

    return () => {
      es.close()
      esRef.current = null
    }
  }, [orderId])

  const showMap =
    (state === "PICKED_UP" || state === "OUT_FOR_DELIVERY") &&
    riderPos !== null

  const eta = useMemo(() => {
    if (!showMap || !customerLat || !customerLng || !riderPos) return null
    const km = distanceKm(riderPos.lat, riderPos.lng, customerLat, customerLng)
    // Assumed 20 km/h average urban speed
    const minutes = Math.max(1, Math.round((km / 20) * 60))
    return { km, minutes }
  }, [showMap, customerLat, customerLng, riderPos])

  return (
    <>
      <section className="mt-6">
        <h2
          className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: "var(--color-charcoal)" }}
        >
          Timeline
        </h2>
        <ol className="space-y-3">
          {events.map((e, idx) => (
            <li key={`${e.event}-${e.createdAt}-${idx}`} className="flex gap-3">
              <span
                className="mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ background: "var(--color-brand-yellow-300)" }}
              />
              <div className="flex-1">
                <p
                  className="text-sm font-medium"
                  style={{ color: "var(--color-shell-fg)" }}
                >
                  {STATE_LABELS[e.event as keyof typeof STATE_LABELS] ?? e.event}
                </p>
                <p
                  className="text-xs"
                  style={{ color: "var(--color-charcoal)" }}
                >
                  {new Date(e.createdAt).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {e.note ? ` · ${e.note}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {showMap ? (
        <section className="mt-6">
          <h2
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: "var(--color-charcoal)" }}
          >
            Live location
            {riderName && (
              <span
                className="ml-2 font-normal normal-case"
                style={{ color: "var(--color-charcoal-strong)" }}
              >
                · {riderName} on the way
              </span>
            )}
          </h2>
          <TrackMap
            riderLat={riderPos.lat}
            riderLng={riderPos.lng}
            customerLat={customerLat}
            customerLng={customerLng}
            riderName={riderName ?? "Rider"}
          />
          {eta && (
            <p
              className="mt-2 text-sm"
              style={{ color: "var(--color-shell-fg)" }}
            >
              <span
                className="font-bold"
                style={{ color: "var(--color-brand-yellow-300)" }}
              >
                ~{eta.minutes} min{" "}
              </span>
              <span style={{ color: "var(--color-charcoal)" }}>
                ({eta.km.toFixed(1)} km away · approximate ETA)
              </span>
            </p>
          )}
        </section>
      ) : (
        state !== "DELIVERED" &&
        state !== "CANCELLED" && (
          <p
            className="mt-6 text-sm text-center"
            style={{ color: "var(--color-charcoal)" }}
          >
            We&rsquo;ll show the map once the rider is on the way.
          </p>
        )
      )}
    </>
  )
}
