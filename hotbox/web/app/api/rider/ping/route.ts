/**
 * Rider GPS ping ingest. Authenticated rider POSTs lat/lng every ~5s
 * while on a delivery.
 *
 * Side effects (single transaction):
 *  - Upserts rider_pings_latest
 *  - Appends to rider_pings (audit log; pruned to 7 days)
 *  - Updates riders.last_ping_at
 *  - Fires pg_notify('order_track_<orderId>', json) so the SSE stream
 *    subscribed to that order can forward to the customer's browser.
 */
import { NextResponse } from "next/server"
import { z } from "zod"
import { db, getPgListenClient } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export const dynamic = "force-dynamic"

const Body = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy_m: z.number().min(0).max(10000).nullish(),
  ts: z.string(),
})

export async function POST(req: Request): Promise<NextResponse> {
  const user = await getCurrentUser()
  if (!user || (user.role !== "rider" && user.role !== "admin")) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 })
  }

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const parsed = Body.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  // Resolve the rider row from the user.
  const rider = await db.rider.findUnique({
    where: { userId: user.id },
    select: { id: true, currentOrderId: true },
  })
  if (!rider) {
    return NextResponse.json(
      { error: "No rider record for this user" },
      { status: 403 },
    )
  }

  const ts = new Date(parsed.data.ts)
  if (isNaN(ts.getTime())) {
    return NextResponse.json({ error: "Invalid ts" }, { status: 400 })
  }

  await db.$transaction(async (tx) => {
    await tx.riderPingLatest.upsert({
      where: { riderId: rider.id },
      create: {
        riderId: rider.id,
        latitude: parsed.data.lat,
        longitude: parsed.data.lng,
        accuracyM: parsed.data.accuracy_m ?? null,
        ts,
      },
      update: {
        latitude: parsed.data.lat,
        longitude: parsed.data.lng,
        accuracyM: parsed.data.accuracy_m ?? null,
        ts,
      },
    })
    await tx.riderPing.create({
      data: {
        riderId: rider.id,
        orderId: rider.currentOrderId,
        latitude: parsed.data.lat,
        longitude: parsed.data.lng,
        accuracyM: parsed.data.accuracy_m ?? null,
        ts,
      },
    })
    await tx.rider.update({
      where: { id: rider.id },
      data: { lastPingAt: ts },
    })
  })

  // Broadcast via pg_notify if this ping is tied to an active order
  if (rider.currentOrderId) {
    const channel = `order_track_${rider.currentOrderId}`
    const payload = JSON.stringify({
      kind: "ping",
      lat: parsed.data.lat,
      lng: parsed.data.lng,
      ts: ts.toISOString(),
    })
    const client = await getPgListenClient()
    try {
      // pg_notify channel name MUST be a literal identifier — we use it
      // via the SQL function with a string arg.
      await client.query("SELECT pg_notify($1, $2)", [channel, payload])
    } finally {
      await client.end()
    }
  }

  return NextResponse.json({ ok: true })
}
