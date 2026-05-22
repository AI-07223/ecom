/**
 * REST endpoints the Expo APK calls (native clients can't invoke Server
 * Actions directly). Mirrors the Server Actions in app/_actions/rider.ts.
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { OrderState, transitionOrderState } from "@/lib/order-state"
import { getCurrentUser } from "@/lib/session"

export const dynamic = "force-dynamic"

const ACTION_TO_STATE: Record<string, OrderState> = {
  "picked-up": OrderState.PICKED_UP,
  "out-for-delivery": OrderState.OUT_FOR_DELIVERY,
  delivered: OrderState.DELIVERED,
}

interface RouteParams {
  params: Promise<{ orderId: string; action: string }>
}

export async function POST(
  _req: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { orderId, action } = await params
  const targetState = ACTION_TO_STATE[action]
  if (!targetState) {
    return NextResponse.json({ error: "Unknown action" }, { status: 404 })
  }

  const user = await getCurrentUser()
  if (!user || (user.role !== "rider" && user.role !== "admin")) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 })
  }

  // For role=rider, verify they're the assigned rider for this order.
  if (user.role === "rider") {
    const rider = await db.rider.findUnique({ where: { userId: user.id } })
    if (!rider) {
      return NextResponse.json({ error: "No rider record" }, { status: 403 })
    }
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: { riderId: true },
    })
    if (!order || order.riderId !== rider.id) {
      return NextResponse.json({ error: "Not your delivery" }, { status: 403 })
    }
  }

  try {
    await transitionOrderState(db, orderId, targetState)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Transition failed" },
      { status: 400 },
    )
  }

  return NextResponse.json({ ok: true })
}
