import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { getOrderForCurrentUser } from "@/lib/orders"
import { STATE_LABELS } from "@/lib/order-state"
import { getCurrentUser } from "@/lib/session"
import { TrackClient } from "./TrackClient"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ orderId: string }>
}

export default async function TrackPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const { orderId } = await params
  const order = await getOrderForCurrentUser(orderId)
  if (!order) notFound()

  return (
    <main className="mx-auto max-w-md min-h-screen px-5 pt-8 pb-12">
      <Link
        href="/account/orders"
        className="text-sm text-zinc-500 hover:underline underline-offset-4"
      >
        ← My orders
      </Link>
      <h1 className="mt-3 text-2xl font-black tracking-tight">
        Order {order.publicCode}
      </h1>
      <p className="text-sm text-zinc-500 mt-1">
        Current status: {STATE_LABELS[order.state]}
      </p>

      <TrackClient
        orderId={order.id}
        initialState={order.state}
        customerLat={order.address.latitude}
        customerLng={order.address.longitude}
        riderName={order.rider?.name ?? null}
        initialEvents={order.events.map((e) => ({
          event: e.event,
          createdAt: e.createdAt.toISOString(),
          note: e.note,
        }))}
      />
    </main>
  )
}
