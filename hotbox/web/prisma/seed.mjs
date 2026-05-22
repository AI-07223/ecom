/**
 * Hotbox menu seed.
 *
 * Plain ESM JS so the runtime container can execute it without tsx.
 * Mirrors prisma/seed.ts (which exists for IDE/typecheck during dev).
 *
 * Run:
 *   - Dev:  `npm run seed` (uses tsx -> seed.ts)
 *   - Prod: `node prisma/seed.mjs` (called from Dockerfile CMD)
 */
import { PrismaClient } from "@prisma/client"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const prisma = new PrismaClient()

async function main() {
  const menuPath = join(__dirname, "hotbox-menu.json")
  const menu = JSON.parse(readFileSync(menuPath, "utf-8"))

  console.log(
    `[seed] Loading ${menu.categories.length} categories and ${menu.items.length} items...`,
  )

  // 1. Restaurant
  const restaurant = await prisma.restaurant.upsert({
    where: { slug: menu.restaurant.slug },
    create: {
      slug: menu.restaurant.slug,
      displayName: menu.restaurant.display_name,
      tagline: menu.restaurant.tagline ?? null,
      phone: menu.restaurant.phone,
      address: menu.restaurant.address,
      latitude: menu.restaurant.latitude,
      longitude: menu.restaurant.longitude,
      openTime: menu.restaurant.open_time,
      closeTime: menu.restaurant.close_time,
      timezone: menu.restaurant.timezone,
      deliveryFeePaise: menu.restaurant.delivery_fee_paise,
      packagingFeePaise: menu.restaurant.packaging_fee_paise,
      gstBasisPoints: menu.restaurant.gst_basis_points,
      allowCancelAfterAccept: menu.restaurant.allow_cancel_after_accept,
    },
    update: {
      displayName: menu.restaurant.display_name,
      tagline: menu.restaurant.tagline ?? null,
      phone: menu.restaurant.phone,
      address: menu.restaurant.address,
      latitude: menu.restaurant.latitude,
      longitude: menu.restaurant.longitude,
      openTime: menu.restaurant.open_time,
      closeTime: menu.restaurant.close_time,
    },
  })
  console.log(`[seed] Restaurant: ${restaurant.displayName} (${restaurant.id})`)

  // 2. Categories
  const categoryIdBySlug = new Map()
  for (const c of menu.categories) {
    const row = await prisma.category.upsert({
      where: {
        restaurantId_slug: { restaurantId: restaurant.id, slug: c.slug },
      },
      create: {
        restaurantId: restaurant.id,
        slug: c.slug,
        name: c.name,
        sortOrder: c.sort_order,
      },
      update: { name: c.name, sortOrder: c.sort_order },
    })
    categoryIdBySlug.set(c.slug, row.id)
  }
  console.log(`[seed] Categories: ${menu.categories.length}`)

  // 3. Items + variants
  let itemsCreated = 0
  let itemsUpdated = 0
  for (const [idx, item] of menu.items.entries()) {
    const categoryId = categoryIdBySlug.get(item.category_slug)
    if (!categoryId) {
      console.warn(
        `[seed] Skipping item ${item.slug} — unknown category ${item.category_slug}`,
      )
      continue
    }

    const existing = await prisma.menuItem.findUnique({
      where: { slug: item.slug },
    })

    const row = await prisma.menuItem.upsert({
      where: { slug: item.slug },
      create: {
        categoryId,
        slug: item.slug,
        title: item.title,
        description: item.description ?? null,
        basePricePaise: item.base_price_paise,
        isVeg: item.is_veg,
        prepTimeMinutes: item.prep_time_minutes,
        sortOrder: idx,
      },
      update: {
        categoryId,
        title: item.title,
        description: item.description ?? null,
        basePricePaise: item.base_price_paise,
        isVeg: item.is_veg,
        prepTimeMinutes: item.prep_time_minutes,
      },
    })

    if (existing) itemsUpdated++
    else itemsCreated++

    if (item.variants && item.variants.length > 0) {
      await prisma.itemVariant.deleteMany({ where: { itemId: row.id } })
      await prisma.itemVariant.createMany({
        data: item.variants.map((v, vi) => ({
          itemId: row.id,
          slug: v.slug,
          name: v.name,
          priceDeltaPaise: v.price_delta_paise,
          isDefault: v.is_default,
          sortOrder: vi,
        })),
      })
    } else {
      await prisma.itemVariant.deleteMany({ where: { itemId: row.id } })
    }
  }
  console.log(
    `[seed] Items: ${itemsCreated} created, ${itemsUpdated} updated (${menu.items.length} total)`,
  )

  console.log("[seed] Done.")
}

main()
  .catch((err) => {
    console.error("[seed] Failed:", err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
