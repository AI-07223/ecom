import { db } from "@/lib/db"
import { formatIndianPhone } from "@/lib/phone"
import { RidersClient } from "./RidersClient"

export const dynamic = "force-dynamic"

export default async function AdminRidersPage(): Promise<React.ReactElement> {
  const riders = await db.rider.findMany({
    where: { deletedAt: null },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      phone: true,
      isActive: true,
      currentOrderId: true,
      lastPingAt: true,
    },
  })

  return (
    <>
      <h1 className="text-2xl font-black tracking-tight mb-4">Riders</h1>
      <RidersClient
        riders={riders.map((r) => ({
          id: r.id,
          name: r.name,
          phone: formatIndianPhone(r.phone),
          isActive: r.isActive,
          onDelivery: r.currentOrderId !== null,
          lastPingAt: r.lastPingAt?.toISOString() ?? null,
        }))}
      />
    </>
  )
}
