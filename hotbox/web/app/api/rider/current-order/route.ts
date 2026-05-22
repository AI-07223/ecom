/**
 * Returns the rider's current assigned order in a flat shape suitable for
 * the Expo APK. Returns `null` (HTTP 200) when no delivery is assigned.
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export const dynamic = "force-dynamic"

export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser()
  if (!user || (user.role !== "rider" && user.role !== "admin")) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 })
  }

  const rider = await db.rider.findUnique({
    where: { userId: user.id },
    select: { currentOrderId: true },
  })
  if (!rider || !rider.currentOrderId) {
    return NextResponse.json(null)
  }

  const order = await db.order.findUnique({
    where: { id: rider.currentOrderId },
    include: {
      items: { orderBy: { createdAt: "asc" } },
      address: true,
      restaurant: true,
    },
  })
  if (!order) return NextResponse.json(null)

  return NextResponse.json({
    id: order.id,
    publicCode: order.publicCode,
    state: order.state,
    pickup: {
      name: order.restaurant.displayName,
      address: order.restaurant.address,
      lat: order.restaurant.latitude,
      lng: order.restaurant.longitude,
    },
    drop: {
      address: order.address.fullAddress,
      building: order.address.building,
      floor: order.address.floor,
      landmark: order.address.landmark,
      lat: order.address.latitude,
      lng: order.address.longitude,
    },
    items: order.items.map((i) => ({
      id: i.id,
      title: i.itemTitle,
      variantName: i.variantName,
      quantity: i.quantity,
    })),
    totalRupees: order.totalPaise / 100,
  })
}
