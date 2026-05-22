"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { OrderState, transitionOrderState } from "@/lib/order-state"
import { requireAdmin } from "@/lib/session"

async function transition(
  orderId: string,
  to: OrderState,
  opts: Parameters<typeof transitionOrderState>[3] = {},
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, error: "Not authorized" }
  }
  try {
    await transitionOrderState(db, orderId, to, opts)
    revalidatePath("/admin")
    revalidatePath(`/track/${orderId}`)
    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed"
    return { ok: false, error: msg }
  }
}

export async function acceptOrder(orderId: string) {
  return transition(orderId, OrderState.ACCEPTED)
}

export async function rejectOrder(orderId: string, reason: string) {
  return transition(orderId, OrderState.CANCELLED, { cancelledReason: reason })
}

export async function startCooking(orderId: string) {
  return transition(orderId, OrderState.PREPARING)
}

export async function markReady(orderId: string) {
  return transition(orderId, OrderState.READY)
}

export async function assignRider(orderId: string, riderId: string) {
  return transition(orderId, OrderState.ASSIGNED, { riderId })
}

export async function unassignRider(orderId: string) {
  return transition(orderId, OrderState.READY)
}

export async function markPickedUp(orderId: string) {
  return transition(orderId, OrderState.PICKED_UP)
}

export async function markOutForDelivery(orderId: string) {
  return transition(orderId, OrderState.OUT_FOR_DELIVERY)
}

export async function markDelivered(orderId: string) {
  return transition(orderId, OrderState.DELIVERED)
}
