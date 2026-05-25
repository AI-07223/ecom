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
          slug: true,
          title: true,
          basePricePaise: true,
          isAvailable: true,
          photoFilename: true,
        },
      },
    },
  })

  return (
    <>
      <h1 className="font-display text-3xl mb-1">Menu</h1>
      <p
        className="text-sm mb-6"
        style={{ color: "var(--color-charcoal)" }}
      >
        Toggle items off when you run out. Upload a photo to replace the
        default for any item.
      </p>
      <MenuAvailabilityToggles
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          items: c.items.map((i) => ({
            id: i.id,
            slug: i.slug,
            title: i.title,
            startingPaise: i.basePricePaise,
            isAvailable: i.isAvailable,
            startingPriceText: formatINR(i.basePricePaise),
            photoFilename: i.photoFilename,
          })),
        }))}
      />
    </>
  )
}
