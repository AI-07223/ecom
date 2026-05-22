import Link from "next/link"
import { redirect } from "next/navigation"
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
      <main className="mx-auto max-w-md min-h-screen px-5 pt-10">
        <h1 className="text-2xl font-black">Not a rider</h1>
        <p className="mt-2 text-sm text-zinc-500">
          This page is for delivery riders. If you&rsquo;re trying to order,
          go to{" "}
          <Link href="/" className="underline" style={{ color: "var(--color-brand-500)" }}>
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
      <main className="mx-auto max-w-md min-h-screen px-5 pt-10">
        <h1 className="text-2xl font-black">Not registered as a rider</h1>
        <p className="mt-2 text-sm text-zinc-500">
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
    <main className="mx-auto max-w-md min-h-screen px-5 pt-8 pb-12">
      <header className="mb-6">
        <p className="text-xs text-zinc-500">Logged in as</p>
        <h1 className="text-2xl font-black tracking-tight">{rider.name}</h1>
      </header>

      {order ? (
        <RiderClient
          orderId={order.id}
          state={order.state}
          publicCode={order.publicCode}
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
          items={order.items.map((i) => ({
            id: i.id,
            title: i.itemTitle,
            variantName: i.variantName,
            quantity: i.quantity,
          }))}
        />
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center">
          <p className="text-sm text-zinc-500">No active delivery.</p>
          <p className="text-xs text-zinc-400 mt-1">
            Waiting for the next assignment.
          </p>
        </div>
      )}
    </main>
  )
}
