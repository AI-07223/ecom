/**
 * Order state machine.
 *
 * Single source of truth for which `OrderState` transitions are valid and
 * what side effects they trigger. Every order state change MUST go through
 * `transitionOrderState()`; no raw `prisma.order.update({ state: ... })`
 * anywhere else in the codebase.
 *
 * Tested in lib/order-state.test.ts. Spec: openspec/changes/
 * hotbox-food-delivery/specs/order-lifecycle/spec.md
 */
import type { Prisma, PrismaClient } from "@prisma/client"
import { OrderState, PaymentStatus } from "@prisma/client"

/** Generic alias to allow both PrismaClient and a transaction client. */
type DbClient = PrismaClient | Prisma.TransactionClient

// ─── Transition table ──────────────────────────────────────────────────

/**
 * Static transition table. NOTE: ACCEPTED→CANCELLED is in the table but
 * gated at runtime by `restaurant.allowCancelAfterAccept`. Beyond
 * PREPARING, cancellation is never permitted in v1 (refund-only territory
 * deferred to a follow-up change).
 */
const ALLOWED: Record<OrderState, readonly OrderState[]> = {
  [OrderState.PLACED]: [OrderState.ACCEPTED, OrderState.CANCELLED],
  [OrderState.ACCEPTED]: [OrderState.PREPARING, OrderState.CANCELLED],
  [OrderState.PREPARING]: [OrderState.READY],
  // Admin can retract a "ready" marker if they realized something was
  // wrong with the food — useful escape hatch, low-cost to support.
  [OrderState.READY]: [OrderState.ASSIGNED, OrderState.PREPARING],
  // Admin can unassign a rider (e.g., rider unreachable). The order goes
  // back to READY and the rider's currentOrderId is cleared.
  [OrderState.ASSIGNED]: [OrderState.PICKED_UP, OrderState.READY],
  [OrderState.PICKED_UP]: [OrderState.OUT_FOR_DELIVERY],
  [OrderState.OUT_FOR_DELIVERY]: [OrderState.DELIVERED],
  [OrderState.DELIVERED]: [],
  [OrderState.CANCELLED]: [],
}

/** Terminal states that allow no further transitions. */
export const TERMINAL_STATES: readonly OrderState[] = [
  OrderState.DELIVERED,
  OrderState.CANCELLED,
]

// ─── Public errors ─────────────────────────────────────────────────────

export class InvalidStateTransitionError extends Error {
  constructor(
    public readonly orderId: string,
    public readonly from: OrderState,
    public readonly to: OrderState,
    public readonly reason: string = "transition not in allowed set",
  ) {
    super(
      `Order ${orderId}: cannot transition ${from} → ${to} (${reason})`,
    )
    this.name = "InvalidStateTransitionError"
  }
}

export class PaymentRequiredError extends Error {
  constructor(orderId: string) {
    super(
      `Order ${orderId}: cannot transition to PLACED while paymentStatus != PAID`,
    )
    this.name = "PaymentRequiredError"
  }
}

// ─── Pure helpers ──────────────────────────────────────────────────────

/**
 * Pure check: is `from → to` in the static transition table?
 * Does NOT account for the cancel toggle — see `isAllowed` for that.
 */
export function isStaticallyAllowed(from: OrderState, to: OrderState): boolean {
  return ALLOWED[from].includes(to)
}

/**
 * Full transition check including the per-restaurant `allowCancelAfterAccept`
 * toggle. Use this when you want to know "would this transition succeed?"
 * without actually doing it.
 */
export function isAllowed(
  from: OrderState,
  to: OrderState,
  opts: { allowCancelAfterAccept: boolean },
): boolean {
  if (!isStaticallyAllowed(from, to)) return false
  // The only conditional gate in v1: ACCEPTED→CANCELLED requires the toggle.
  if (from === OrderState.ACCEPTED && to === OrderState.CANCELLED) {
    return opts.allowCancelAfterAccept
  }
  return true
}

/** Convenience: return the list of states reachable from `from`. */
export function allowedTransitions(
  from: OrderState,
  opts: { allowCancelAfterAccept: boolean },
): OrderState[] {
  return (ALLOWED[from] as OrderState[]).filter((to) =>
    isAllowed(from, to, opts),
  )
}

// ─── Side-effect options ───────────────────────────────────────────────

export interface TransitionOptions {
  /** Required when transitioning READY → ASSIGNED. */
  riderId?: string
  /** Free-text note attached to the order_events row. */
  note?: string
  /** Optional rider lat/lng to fold into the event (typically for pings). */
  latitude?: number
  longitude?: number
  /** Required when transitioning to CANCELLED. */
  cancelledReason?: string
  /** True on rider's DELIVERED tap for COD orders when cash WAS collected.
   *  Server then marks paymentStatus=PAID atomically with DELIVERED. */
  cashCollected?: boolean
}

// ─── The transition primitive ──────────────────────────────────────────

/**
 * Atomically:
 *   1. Validate the transition is allowed (static table + cancel toggle).
 *   2. Validate any required options for the target state.
 *   3. Update the order row (state + timestamp + side-effect columns).
 *   4. Write an `order_events` row for the transition.
 *   5. Apply rider-side effects (assign / unassign / auto-flip on DELIVERED).
 *
 * Throws InvalidStateTransitionError on disallowed transitions.
 * Throws PaymentRequiredError if attempting PLACED without PAID.
 *
 * @param db   Either a top-level PrismaClient or an in-transaction client.
 *             If a top-level client is passed, this helper opens its own
 *             transaction. If an in-transaction client is passed (e.g.,
 *             from prisma.$transaction), callers are responsible for
 *             ensuring atomicity at their boundary.
 */
export async function transitionOrderState(
  db: PrismaClient,
  orderId: string,
  to: OrderState,
  options: TransitionOptions = {},
): Promise<void> {
  await db.$transaction(async (tx) => {
    await transitionInTx(tx, orderId, to, options)
  })
}

/**
 * Same as transitionOrderState but assumes you're already inside a Prisma
 * transaction. Useful when stitching multiple writes together (e.g.,
 * Cashfree webhook updates payment AND places the order in one tx).
 */
export async function transitionInTx(
  tx: Prisma.TransactionClient,
  orderId: string,
  to: OrderState,
  options: TransitionOptions = {},
): Promise<void> {
  const order = await tx.order.findUniqueOrThrow({
    where: { id: orderId },
    select: {
      id: true,
      state: true,
      paymentStatus: true,
      riderId: true,
      restaurant: { select: { allowCancelAfterAccept: true } },
    },
  })

  const from = order.state

  // 1. Statically-validated transition?
  if (
    !isAllowed(from, to, {
      allowCancelAfterAccept: order.restaurant.allowCancelAfterAccept,
    })
  ) {
    throw new InvalidStateTransitionError(orderId, from, to)
  }

  // 2. Per-target requirements
  if (to === OrderState.PLACED && order.paymentStatus !== PaymentStatus.PAID) {
    // (PLACED isn't actually a target in our table — orders start in PLACED.
    // This guard exists so a future "draft → placed" flow can't bypass it.)
    throw new PaymentRequiredError(orderId)
  }
  if (to === OrderState.ASSIGNED && !options.riderId) {
    throw new InvalidStateTransitionError(
      orderId,
      from,
      to,
      "riderId is required to ASSIGN",
    )
  }
  if (to === OrderState.CANCELLED && !options.cancelledReason) {
    // Reason is encouraged but not required. Keeping this commented as a
    // place to enforce later if product wants it.
    // throw new InvalidStateTransitionError(orderId, from, to, "cancelledReason is required to CANCEL")
  }

  // 3. Build the update payload — touch the right timestamp column and any
  // side-effect columns this transition implies.
  const updateData: Prisma.OrderUpdateInput = { state: to }
  const now = new Date()

  switch (to) {
    case OrderState.ACCEPTED:
      updateData.acceptedAt = now
      break
    case OrderState.PREPARING:
      updateData.preparingAt = now
      break
    case OrderState.READY:
      updateData.readyAt = now
      // If we're retracting from ASSIGNED → READY, also unassign the rider.
      if (from === OrderState.ASSIGNED && order.riderId) {
        await tx.rider.update({
          where: { id: order.riderId },
          data: { currentOrderId: null },
        })
        updateData.rider = { disconnect: true }
        updateData.assignedAt = null
      }
      break
    case OrderState.ASSIGNED:
      // Verified above
      updateData.assignedAt = now
      updateData.rider = { connect: { id: options.riderId! } }
      // Set rider.currentOrderId in the same tx (rare race: if rider
      // already has a current order, throw — UI should filter them out).
      await tx.rider.update({
        where: { id: options.riderId! },
        data: { currentOrderId: orderId },
      })
      break
    case OrderState.PICKED_UP:
      updateData.pickedUpAt = now
      break
    case OrderState.OUT_FOR_DELIVERY:
      updateData.outForDeliveryAt = now
      break
    case OrderState.DELIVERED:
      updateData.deliveredAt = now
      // If the caller passed cashCollected=true (rider's COD "yes" path),
      // mark payment PAID atomically with the DELIVERED transition.
      if (options.cashCollected === true) {
        updateData.paymentStatus = PaymentStatus.PAID
        updateData.paidAt = now
        updateData.paymentVerifiedAt = now
        updateData.paymentVerifiedNote = "Cash collected on delivery"
      }
      // Auto-flip rider to available.
      if (order.riderId) {
        await tx.rider.update({
          where: { id: order.riderId },
          data: { currentOrderId: null },
        })
      }
      break
    case OrderState.CANCELLED:
      updateData.cancelledAt = now
      if (options.cancelledReason)
        updateData.cancelledReason = options.cancelledReason
      // If rider was assigned, free them up.
      if (order.riderId) {
        await tx.rider.update({
          where: { id: order.riderId },
          data: { currentOrderId: null },
        })
      }
      break
    case OrderState.PLACED:
      // Should never reach here via this helper; orders start in PLACED.
      break
  }

  await tx.order.update({ where: { id: orderId }, data: updateData })

  await tx.orderEvent.create({
    data: {
      orderId,
      event: to,
      note: options.note ?? null,
      latitude: options.latitude ?? null,
      longitude: options.longitude ?? null,
    },
  })
}

// ─── For admin payment verification (UPI manual flow) ────────────────

/**
 * Marks an order PAID outside the state-machine flow (state stays where
 * it was — typically PLACED). Used by admin verify-payment + force-mark
 * actions in app/_actions/admin-payment.ts. Writes an order_events row
 * for the timeline.
 */
export async function markOrderPaid(
  db: PrismaClient,
  orderId: string,
  opts: { note?: string } = {},
): Promise<void> {
  await db.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: PaymentStatus.PAID,
        paidAt: new Date(),
        paymentVerifiedAt: new Date(),
        paymentVerifiedNote: opts.note ?? "Payment verified",
      },
    })
    await tx.orderEvent.create({
      data: {
        orderId,
        event: OrderState.PLACED,
        note: opts.note ?? "Payment confirmed",
      },
    })
  })
}

// ─── Bare-bones export for tests + UI dropdowns ────────────────────────

export const STATE_LABELS: Record<OrderState, string> = {
  PLACED: "Placed",
  ACCEPTED: "Accepted",
  PREPARING: "Preparing",
  READY: "Ready",
  ASSIGNED: "Rider assigned",
  PICKED_UP: "Picked up",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
}

export { OrderState, PaymentStatus }
