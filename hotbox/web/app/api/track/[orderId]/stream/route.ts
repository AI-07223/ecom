/**
 * Server-Sent Events stream for live order tracking.
 *
 * Holds a dedicated `LISTEN order_track_<orderId>` connection on Postgres
 * and forwards every notification to the client. The first event is a
 * snapshot of the order's current state + the rider's latest ping
 * (if any) so reconnects don't show a stale UI.
 *
 * The stream closes itself when the order reaches DELIVERED or CANCELLED.
 */
import { NextResponse } from "next/server"
import type { Client } from "pg"
import { db, getPgListenClient } from "@/lib/db"

export const dynamic = "force-dynamic"
// Long-running connection — opt out of Next.js's default per-request budget.
export const maxDuration = 3600

interface PingEvent {
  kind: "ping"
  lat: number
  lng: number
  ts: string
}

interface SnapshotEvent {
  kind: "snapshot"
  state: string
  rider?: {
    name: string
    lat: number | null
    lng: number | null
    ts: string | null
  } | null
  customerLat: number | null
  customerLng: number | null
  events: Array<{ event: string; createdAt: string; note: string | null }>
}

interface PageProps {
  params: Promise<{ orderId: string }>
}

export async function GET(_req: Request, { params }: PageProps): Promise<Response> {
  const { orderId } = await params

  // Initial snapshot
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      events: { orderBy: { createdAt: "asc" } },
      address: true,
      rider: {
        include: { latestPing: true },
      },
    },
  })
  if (!order) {
    return new Response("Order not found", { status: 404 })
  }

  const encoder = new TextEncoder()
  const channel = `order_track_${orderId}`
  let pg: Client | null = null

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      function send(payload: SnapshotEvent | PingEvent | { kind: "state"; state: string; createdAt: string; note: string | null }): void {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
        )
      }

      // First event: full snapshot
      send({
        kind: "snapshot",
        state: order.state,
        rider: order.rider
          ? {
              name: order.rider.name,
              lat: order.rider.latestPing?.latitude ?? null,
              lng: order.rider.latestPing?.longitude ?? null,
              ts: order.rider.latestPing?.ts.toISOString() ?? null,
            }
          : null,
        customerLat: order.address.latitude ?? null,
        customerLng: order.address.longitude ?? null,
        events: order.events.map((e) => ({
          event: e.event,
          createdAt: e.createdAt.toISOString(),
          note: e.note,
        })),
      })

      // If already terminal, close after snapshot.
      if (order.state === "DELIVERED" || order.state === "CANCELLED") {
        controller.close()
        return
      }

      try {
        pg = await getPgListenClient()
        await pg.query(`LISTEN "${channel}"`)
        pg.on("notification", (msg) => {
          if (msg.channel !== channel || !msg.payload) return
          try {
            const parsed = JSON.parse(msg.payload) as PingEvent | { kind: "state"; state: string; createdAt: string; note: string | null }
            send(parsed)
            if (parsed.kind === "state" && (parsed.state === "DELIVERED" || parsed.state === "CANCELLED")) {
              controller.close()
            }
          } catch {
            /* ignore */
          }
        })
        // Heartbeat every 25s so proxies don't close the idle connection.
        const hb = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`: hb\n\n`))
          } catch {
            clearInterval(hb)
          }
        }, 25000)
      } catch (err) {
        console.error("[track-stream] LISTEN failed", err)
        controller.close()
      }
    },
    async cancel() {
      try {
        if (pg) {
          await pg.query(`UNLISTEN "${channel}"`)
          await pg.end()
        }
      } catch {
        /* ignore */
      }
    },
  })

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
