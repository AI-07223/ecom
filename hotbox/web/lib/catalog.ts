/**
 * Catalog data access. All reads of the public menu live here so we can
 * cache + tune in one place later.
 */
import { db } from "./db"

export async function getRestaurant() {
  return db.restaurant.findFirst({ where: { slug: "hotbox" } })
}

export async function getCategoriesWithCounts() {
  const cats = await db.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { items: { where: { isAvailable: true } } } },
    },
  })
  return cats.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    sortOrder: c.sortOrder,
    itemCount: c._count.items,
  }))
}

export async function getCategoryBySlug(slug: string) {
  return db.category.findFirst({
    where: { slug, isActive: true },
    include: {
      items: {
        where: { isAvailable: true },
        orderBy: { sortOrder: "asc" },
        include: {
          variants: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  })
}

export async function getMenuItemBySlug(slug: string) {
  return db.menuItem.findUnique({
    where: { slug },
    include: {
      category: true,
      variants: { orderBy: { sortOrder: "asc" } },
      addons: { orderBy: { sortOrder: "asc" } },
    },
  })
}

/**
 * Single-page-menu fetch: all active categories with their active items
 * and variants in one round-trip. Sorted by category sortOrder, then
 * item sortOrder. Used by app/page.tsx.
 */
export async function getMenuTree() {
  const cats = await db.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      items: {
        where: { isAvailable: true },
        orderBy: { sortOrder: "asc" },
        include: {
          variants: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  })
  // Drop empty categories — spec'd: storefront-menu-browse "Empty category hidden".
  return cats.filter((c) => c.items.length > 0)
}
