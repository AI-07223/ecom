import Link from "next/link"
import { redirect } from "next/navigation"
import { Logo } from "@/components/brand/Logo"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { formatINR } from "@/lib/pricing"
import { RiderClient } from "./RiderClient"

export const dynamic = "force-dynamic"

export default async function RiderHomePage(): Promise<React.ReactElement> {
  const user = await getCurrentUser()
  if (!user) redirect("/login?next=/rider")

  if (user.role !== "rider" && user.role !== "admin") {
    return (
      <main className="mx-auto max-w-md min-h-dvh px-5 pt-10">
        <Logo variant="full" size="sm" />
        <h1 className="mt-6 font-display text-4xl">Not a rider</h1>
        <p
          className="mt-2 text-sm"
          style={{ color: "var(--color-charcoal-strong)" }}
        >
          This page is for delivery riders. If you&rsquo;re trying to order, go
          to{" "}
          <Link
            href="/"
            className="underline"
            style={{ color: "var(--color-brand-yellow-300)" }}
          >
            the menu
          </Link>
          .
        </p>
      </main>
    )
  }

  const rider = await db.rider.findFirst({
    where: { userId: user.id, deletedAt: null },
  })
  if (!rider) {
    return (
      <main className="mx-auto max-w-md min-h-dvh px-5 pt-10">
        <Logo variant="full" size="sm" />
        <h1 className="mt-6 font-display text-4xl">Not registered as a rider</h1>
        <p
          className="mt-2 text-sm"
          style={{ color: "var(--color-charcoal-strong)" }}
        >
          Ask the admin to add you to the rider roster.
        </p>
      </main>
    )
  }

  const order = rider.currentOrderId
    ? await db.order.findUnique({
        where: { id: rider.currentOrderId },
        include: {
          items: { orderBy: { createdAt: "asc" } },
          address: true,
          restaurant: true,
        },
      })
    : null

  return (
    <main className="mx-auto max-w-md min-h-dvh px-5 pt-6 pb-12">
      <header className="mb-6 flex items-center justify-between">
        <Logo variant="full" size="sm" />
        <div className="text-right">
          <p
            className="text-xs"
            style={{ color: "var(--color-charcoal)" }}
          >
            Logged in as
          </p>
          <h1
            className="text-base font-bold"
            style={{ color: "var(--color-shell-fg)" }}
          >
            {rider.name}
          </h1>
        </div>
      </header>

      {order ? (
        <RiderClient
          orderId={order.id}
          state={order.state}
          publicCode={order.publicCode}
          paymentMethod={order.paymentMethod}
          paymentStatus={order.paymentStatus}
          pickupName={order.restaurant.displayName}
          pickupAddress={order.restaurant.address}
          pickupLat={order.restaurant.latitude}
          pickupLng={order.restaurant.longitude}
          dropAddress={order.address.fullAddress}
          dropBuilding={order.address.building}
          dropLandmark={order.address.landmark}
          dropLat={order.address.latitude}
          dropLng={order.address.longitude}
          totalText={formatINR(order.totalPaise)}
          totalRupees={order.totalPaise / 100}
          items={order.items.map((i) => ({
            id: i.id,
            title: i.itemTitle,
            variantName: i.variantName,
            quantity: i.quantity,
          }))}
        />
      ) : (
        <div
          className="rounded-2xl p-6 text-center"
          style={{
            background: "var(--color-shell-elev)",
            border: "1px solid var(--color-shell-line)",
          }}
        >
          <p
            className="text-sm"
            style={{ color: "var(--color-shell-fg)" }}
          >
            No active delivery.
          </p>
          <p
            className="text-xs mt-1"
            style={{ color: "var(--color-charcoal)" }}
          >
            Waiting for the next assignment.
          </p>
        </div>
      )}
    </main>
  )
}
