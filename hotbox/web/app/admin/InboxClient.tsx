"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import {
  acceptOrder,
  assignRider,
  markOutForDelivery,
  markPickedUp,
  markReady,
  markDelivered,
  rejectOrder,
  startCooking,
  unassignRider,
} from "@/app/_actions/admin-order"
import { formatINR } from "@/lib/pricing"

interface OrderRow {
  id: string
  publicCode: string
  state: string
  stateLabel: string
  placedAt: string
  customerName: string | null
  customerPhone: string
  addressFullText: string
  addressLandmark: string | null
  addressBuilding: string | null
  riderName: string | null
  totalPaise: number
  paymentMethod: "UPI_MANUAL" | "COD" | "ONLINE" | null
  paymentStatus: string
  needsVerification: boolean
  items: Array<{
    id: string
    title: string
    variantName: string | null
    quantity: number
    specialInstructions: string | null
  }>
  needsRefund: boolean
}

interface RiderOption {
  id: string
  name: string
  phone: string
}

interface Props {
  orders: OrderRow[]
  availableRiders: RiderOption[]
  allowCancelAfterAccept: boolean
}

/**
 * Order inbox. Polls the server every 8 seconds for fresh data — simpler
 * than wiring SSE for admin in v1. Plays a chime on first sight of a new
 * PLACED order.
 */
export function InboxClient({
  orders,
  availableRiders,
}: Props): React.ReactElement {
  const knownIds = useRef<Set<string>>(new Set(orders.map((o) => o.id)))
  const [audioEnabled, setAudioEnabled] = useState(false)
  const [, startTransition] = useTransition()

  // Poll: Next.js Server Actions revalidate cache so we just call router.refresh
  // on an interval. We don't track new-order detection here; ringing is
  // handled by the new-order banner on the next render after refresh.
  useEffect(() => {
    const id = setInterval(() => {
      // Soft refresh via fetch to /admin (server-rendered) so we get
      // fresh data without a hard reload. We piggyback on Next router.refresh
      // via a tiny trick: dispatch a refresh event.
      window.location.reload()
    }, 30000) // 30s — gentle on the operator
    return () => clearInterval(id)
  }, [])

  // Audio chime on new PLACED order
  function chime(): void {
    if (!audioEnabled) return
    try {
      const ctx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)()
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.connect(g)
      g.connect(ctx.destination)
      o.frequency.value = 880
      g.gain.setValueAtTime(0.0001, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4)
      o.start()
      o.stop(ctx.currentTime + 0.45)
    } catch {
      /* audio not available */
    }
  }

  // Detect new orders on mount + each prop refresh
  useEffect(() => {
    const fresh = orders.filter(
      (o) => !knownIds.current.has(o.id) && o.state === "PLACED",
    )
    if (fresh.length > 0) chime()
    knownIds.current = new Set(orders.map((o) => o.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders.map((o) => o.id).join(",")])

  return (
    <>
      {!audioEnabled && (
        <button
          type="button"
          onClick={() => {
            setAudioEnabled(true)
            chime()
          }}
          className="w-full mb-4 px-4 py-2.5 text-sm font-medium"
          style={{
            background: "var(--color-shell-elev)",
            border: "1px solid var(--color-shell-line)",
            color: "var(--color-shell-fg)",
            borderRadius: "var(--radius)",
          }}
        >
          🔔 Click to enable order sounds
        </button>
      )}

      <ul className="space-y-3">
        {orders.map((o) => (
          <li
            key={o.id}
            className="p-4"
            style={{
              background: "var(--color-shell-elev)",
              border: "1px solid var(--color-shell-line)",
              borderRadius: "var(--radius)",
            }}
          >
            <div className="flex items-baseline justify-between mb-2 gap-2">
              <span
                className="font-bold font-mono"
                style={{ color: "var(--color-shell-fg)" }}
              >
                {o.publicCode}
              </span>
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                {o.needsVerification && (
                  <a
                    href={`/admin/orders/${o.id}/verify-payment`}
                    className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                    style={{
                      background:
                        "color-mix(in oklab, var(--color-brand-yellow-300) 22%, transparent)",
                      color: "var(--color-brand-yellow-300)",
                      border: "1px solid var(--color-brand-yellow-300)",
                    }}
                  >
                    💸 Verify payment
                  </a>
                )}
                {o.paymentMethod === "COD" && o.paymentStatus !== "PAID" && (
                  <span
                    className="text-xs font-medium px-2.5 py-0.5 rounded-full"
                    style={{
                      background: "var(--color-shell-bg)",
                      color: "var(--color-charcoal-strong)",
                      border: "1px solid var(--color-shell-line)",
                    }}
                  >
                    COD ₹{(o.totalPaise / 100).toFixed(0)}
                  </span>
                )}
                {o.paymentStatus === "PAID" && (
                  <span
                    className="text-xs font-medium px-2.5 py-0.5 rounded-full"
                    style={{
                      background:
                        "color-mix(in oklab, var(--color-veg) 14%, transparent)",
                      color: "var(--color-veg)",
                    }}
                  >
                    ✓ Paid
                  </span>
                )}
                <span
                  className="text-xs font-medium px-2.5 py-0.5 rounded-full"
                  style={{
                    background:
                      "color-mix(in oklab, var(--color-brand-cyan-300) 14%, transparent)",
                    color: "var(--color-brand-cyan-300)",
                  }}
                >
                  {o.stateLabel}
                </span>
              </div>
            </div>

            <div
              className="text-xs mb-2"
              style={{ color: "var(--color-charcoal)" }}
            >
              {new Date(o.placedAt).toLocaleString("en-IN")} ·{" "}
              {o.customerName || "Customer"} · {o.customerPhone}
            </div>

            <ul className="text-sm space-y-0.5 mb-2">
              {o.items.map((i) => (
                <li
                  key={i.id}
                  style={{ color: "var(--color-shell-fg)" }}
                >
                  {i.quantity} × {i.title}
                  {i.variantName && (
                    <span style={{ color: "var(--color-charcoal)" }}>
                      {" "}
                      ({i.variantName})
                    </span>
                  )}
                  {i.specialInstructions && (
                    <div
                      className="text-xs italic ml-3"
                      style={{ color: "var(--color-charcoal)" }}
                    >
                      “{i.specialInstructions}”
                    </div>
                  )}
                </li>
              ))}
            </ul>

            <details className="text-xs mb-3">
              <summary
                className="cursor-pointer"
                style={{ color: "var(--color-charcoal)" }}
              >
                Delivery address
              </summary>
              <p
                className="mt-1"
                style={{ color: "var(--color-shell-fg)" }}
              >
                {o.addressFullText}
              </p>
              {o.addressBuilding && (
                <p style={{ color: "var(--color-charcoal)" }}>
                  {o.addressBuilding}
                </p>
              )}
              {o.addressLandmark && (
                <p style={{ color: "var(--color-charcoal)" }}>
                  Near {o.addressLandmark}
                </p>
              )}
            </details>

            <div className="flex items-center justify-between gap-3 mb-2">
              <span
                className="text-sm font-bold tabular-nums"
                style={{ color: "var(--color-brand-yellow-300)" }}
              >
                {formatINR(o.totalPaise)}
              </span>
              {o.needsRefund && (
                <span
                  className="text-xs rounded-full px-2 py-0.5"
                  style={{
                    background:
                      "color-mix(in oklab, var(--color-brand-flame-500) 18%, transparent)",
                    color: "var(--color-brand-flame-300)",
                  }}
                >
                  Needs refund
                </span>
              )}
            </div>

            <OrderActions
              order={o}
              riders={availableRiders}
              onAction={(fn) =>
                startTransition(async () => {
                  await fn()
                  window.location.reload()
                })
              }
            />
          </li>
        ))}
      </ul>
    </>
  )
}

function OrderActions({
  order,
  riders,
  onAction,
}: {
  order: OrderRow
  riders: RiderOption[]
  onAction: (fn: () => Promise<unknown>) => void
}): React.ReactElement {
  const [pickedRiderId, setPickedRiderId] = useState<string>(riders[0]?.id ?? "")

  const Btn = ({
    children,
    onClick,
    variant = "primary",
  }: {
    children: React.ReactNode
    onClick: () => void
    variant?: "primary" | "secondary" | "danger"
  }) => {
    const style: React.CSSProperties =
      variant === "primary"
        ? {
            background: "var(--color-brand-yellow-300)",
            color: "var(--color-shell-bg)",
            borderRadius: "var(--radius)",
          }
        : variant === "danger"
          ? {
              background:
                "color-mix(in oklab, var(--color-brand-flame-500) 18%, transparent)",
              border: "1px solid var(--color-brand-flame-700)",
              color: "var(--color-brand-flame-300)",
              borderRadius: "var(--radius)",
            }
          : {
              background: "var(--color-shell-bg)",
              border: "1px solid var(--color-shell-line)",
              color: "var(--color-charcoal-strong)",
              borderRadius: "var(--radius)",
            }
    return (
      <button
        type="button"
        onClick={onClick}
        className="px-4 py-2 text-sm font-bold"
        style={style}
      >
        {children}
      </button>
    )
  }

  if (order.state === "PLACED") {
    return (
      <div className="flex gap-2 flex-wrap">
        <Btn onClick={() => onAction(() => acceptOrder(order.id))}>Accept</Btn>
        <Btn
          variant="danger"
          onClick={() => {
            const reason = prompt("Reject reason (optional):") ?? ""
            onAction(() => rejectOrder(order.id, reason))
          }}
        >
          Reject
        </Btn>
      </div>
    )
  }

  if (order.state === "ACCEPTED") {
    return (
      <Btn onClick={() => onAction(() => startCooking(order.id))}>
        Start cooking
      </Btn>
    )
  }

  if (order.state === "PREPARING") {
    return (
      <Btn onClick={() => onAction(() => markReady(order.id))}>Mark ready</Btn>
    )
  }

  if (order.state === "READY") {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {riders.length === 0 ? (
          <span
            className="text-xs"
            style={{ color: "var(--color-charcoal)" }}
          >
            No riders available
          </span>
        ) : (
          <>
            <select
              value={pickedRiderId}
              onChange={(e) => setPickedRiderId(e.target.value)}
              className="px-3 py-2 text-sm"
              style={{
                background: "var(--color-shell-bg)",
                border: "1px solid var(--color-shell-line)",
                color: "var(--color-shell-fg)",
                borderRadius: "var(--radius)",
              }}
            >
              {riders.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <Btn
              onClick={() =>
                onAction(() => assignRider(order.id, pickedRiderId))
              }
            >
              Assign
            </Btn>
          </>
        )}
      </div>
    )
  }

  if (order.state === "ASSIGNED") {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="text-xs"
          style={{ color: "var(--color-charcoal)" }}
        >
          With {order.riderName ?? "rider"}
        </span>
        <Btn variant="secondary" onClick={() => onAction(() => unassignRider(order.id))}>
          Unassign
        </Btn>
        <Btn onClick={() => onAction(() => markPickedUp(order.id))}>
          Mark picked up
        </Btn>
      </div>
    )
  }

  if (order.state === "PICKED_UP") {
    return (
      <Btn onClick={() => onAction(() => markOutForDelivery(order.id))}>
        Heading out
      </Btn>
    )
  }

  if (order.state === "OUT_FOR_DELIVERY") {
    return (
      <div className="flex items-center gap-2">
        <span
          className="text-xs"
          style={{ color: "var(--color-charcoal)" }}
        >
          {order.riderName ?? "Rider"} is on the way
        </span>
        <Btn
          variant="secondary"
          onClick={() => onAction(() => markDelivered(order.id))}
        >
          Mark delivered
        </Btn>
      </div>
    )
  }

  return <></>
}
