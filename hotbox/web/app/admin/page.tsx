import { db } from "@/lib/db"
import { formatINR } from "@/lib/pricing"
import { STATE_LABELS } from "@/lib/order-state"
import { InboxClient } from "./InboxClient"

export const dynamic = "force-dynamic"

import { OrderState } from "@prisma/client"

const ACTIVE_STATES: OrderState[] = [
  OrderState.PLACED,
  OrderState.ACCEPTED,
  OrderState.PREPARING,
  OrderState.READY,
  OrderState.ASSIGNED,
  OrderState.PICKED_UP,
  OrderState.OUT_FOR_DELIVERY,
]

export default async function AdminInboxPage(): Promise<React.ReactElement> {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [orders, todayStats, riders] = await Promise.all([
    db.order.findMany({
      where: {
        state: { in: ACTIVE_STATES },
        // Show ALL orders in active states (PAID, COD, AWAITING_VERIFICATION).
        // The status badge tells the admin which is which; they can pick to
        // accept-and-cook before verification (trust) or wait.
      },
      orderBy: { placedAt: "asc" },
      include: {
        items: { orderBy: { createdAt: "asc" } },
        address: true,
        rider: true,
        user: { select: { phone: true, name: true } },
      },
    }),
    db.order.aggregate({
      where: {
        state: "DELIVERED",
        deliveredAt: { gte: todayStart },
      },
      _count: { id: true },
      _sum: { totalPaise: true },
    }),
    db.rider.findMany({
      where: { isActive: true, deletedAt: null, currentOrderId: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, phone: true },
    }),
  ])

  const cancellable = await db.restaurant.findFirst({
    where: { slug: "hotbox" },
    select: { allowCancelAfterAccept: true },
  })

  return (
    <>
      <section className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded-2xl bg-white border border-zinc-200 p-4">
          <div className="text-xs uppercase tracking-wider text-zinc-500">
            Today
          </div>
          <div className="mt-1 text-2xl font-black">
            {todayStats._count.id}
          </div>
          <div className="text-xs text-zinc-500">orders delivered</div>
        </div>
        <div className="rounded-2xl bg-white border border-zinc-200 p-4">
          <div className="text-xs uppercase tracking-wider text-zinc-500">
            Revenue
          </div>
          <div className="mt-1 text-2xl font-black tabular-nums">
            {formatINR(todayStats._sum.totalPaise ?? 0)}
          </div>
          <div className="text-xs text-zinc-500">today</div>
        </div>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
          Live orders ({orders.length})
        </h2>
        {orders.length === 0 ? (
          <p className="text-sm text-zinc-500 mt-6 text-center">
            No live orders.
          </p>
        ) : (
          <InboxClient
            orders={orders.map((o) => ({
              id: o.id,
              publicCode: o.publicCode,
              state: o.state,
              stateLabel: STATE_LABELS[o.state],
              placedAt: o.placedAt.toISOString(),
              customerName: o.user.name,
              customerPhone: o.user.phone,
              addressFullText: o.address.fullAddress,
              addressLandmark: o.address.landmark,
              addressBuilding: o.address.building,
              riderName: o.rider?.name ?? null,
              totalPaise: o.totalPaise,
              paymentMethod: o.paymentMethod,
              paymentStatus: o.paymentStatus,
              needsVerification: o.paymentStatus === "AWAITING_VERIFICATION",
              items: o.items.map((i) => ({
                id: i.id,
                title: i.itemTitle,
                variantName: i.variantName,
                quantity: i.quantity,
                specialInstructions: i.specialInstructions,
              })),
              needsRefund:
                o.state === "CANCELLED" && o.paymentStatus === "PAID",
            }))}
            availableRiders={riders}
            allowCancelAfterAccept={
              cancellable?.allowCancelAfterAccept ?? false
            }
          />
        )}
      </section>
    </>
  )
}
