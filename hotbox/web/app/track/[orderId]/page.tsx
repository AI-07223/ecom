import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { Logo } from "@/components/brand/Logo"
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
    <>
      <header
        className="sticky top-0 z-40 backdrop-blur"
        style={{
          background: "color-mix(in oklab, var(--color-shell-bg) 90%, transparent)",
          borderBottom: "1px solid var(--color-shell-line)",
        }}
      >
        <div className="max-w-md mx-auto px-5 py-3 flex items-center justify-between">
          <Link href="/" aria-label="Hot Box home">
            <Logo variant="full" size="sm" />
          </Link>
          <Link
            href="/account/orders"
            className="text-sm font-medium"
            style={{ color: "var(--color-brand-yellow-300)" }}
          >
            ← My orders
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-md px-5 pt-6 pb-12">
        <h1 className="font-display text-4xl">
          Order{" "}
          <span
            className="font-mono"
            style={{ color: "var(--color-brand-yellow-300)" }}
          >
            {order.publicCode}
          </span>
        </h1>
        <p
          className="text-sm mt-1"
          style={{ color: "var(--color-charcoal)" }}
        >
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
    </>
  )
}
