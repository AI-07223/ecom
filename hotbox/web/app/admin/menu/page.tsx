import { db } from "@/lib/db"
import { formatINR } from "@/lib/pricing"
import { MenuAvailabilityToggles } from "./MenuAvailabilityToggles"

export const dynamic = "force-dynamic"

export default async function AdminMenuPage(): Promise<React.ReactElement> {
  const categories = await db.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          title: true,
          basePricePaise: true,
          isAvailable: true,
        },
      },
    },
  })

  return (
    <>
      <h1 className="text-2xl font-black tracking-tight mb-1">Menu</h1>
      <p className="text-sm text-zinc-500 mb-6">
        Toggle items off when you run out. Customers see them as out of
        stock within a few seconds.
      </p>
      <MenuAvailabilityToggles
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          items: c.items.map((i) => ({
            id: i.id,
            title: i.title,
            startingPaise: i.basePricePaise,
            isAvailable: i.isAvailable,
            startingPriceText: formatINR(i.basePricePaise),
          })),
        }))}
      />
    </>
  )
}
