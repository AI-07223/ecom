"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { OrderState, transitionOrderState } from "@/lib/order-state"
import { getCurrentUser, requireRider } from "@/lib/session"

/** Common: confirm the caller is the rider assigned to this order. */
async function assertCallerIsAssignedRider(orderId: string): Promise<
  | { ok: true; riderId: string }
  | { ok: false; error: string }
> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "Not signed in" }
  // Admin can also drive rider transitions (operator override).
  if (user.role !== "rider" && user.role !== "admin") {
    return { ok: false, error: "Not authorized" }
  }

  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { riderId: true },
  })
  if (!order) return { ok: false, error: "Order not found" }

  if (user.role === "rider") {
    const rider = await db.rider.findUnique({
      where: { userId: user.id },
    })
    if (!rider || order.riderId !== rider.id)
      return { ok: false, error: "Not your delivery" }
    return { ok: true, riderId: rider.id }
  }
  return { ok: true, riderId: order.riderId ?? "" }
}

export async function riderMarkPickedUp(
  orderId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await assertCallerIsAssignedRider(orderId)
  if (!auth.ok) return auth
  try {
    await transitionOrderState(db, orderId, OrderState.PICKED_UP)
    revalidatePath("/rider")
    revalidatePath(`/track/${orderId}`)
    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed",
    }
  }
}

export async function riderMarkOutForDelivery(
  orderId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await assertCallerIsAssignedRider(orderId)
  if (!auth.ok) return auth
  try {
    await transitionOrderState(db, orderId, OrderState.OUT_FOR_DELIVERY)
    revalidatePath("/rider")
    revalidatePath(`/track/${orderId}`)
    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed",
    }
  }
}

export async function riderMarkDelivered(
  orderId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await assertCallerIsAssignedRider(orderId)
  if (!auth.ok) return auth
  try {
    await transitionOrderState(db, orderId, OrderState.DELIVERED)
    revalidatePath("/rider")
    revalidatePath(`/track/${orderId}`)
    revalidatePath("/admin")
    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed",
    }
  }
}

// Re-export for the admin layer too if needed
export { requireRider }
