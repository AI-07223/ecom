/**
 * Hotbox menu seed.
 *
 * Reads prisma/hotbox-menu.json and upserts the restaurant + categories +
 * items + variants. Idempotent: re-running upserts by slug. Designed to be
 * run both locally (`npm run seed`) and inside the container after a
 * migration if desired (out of scope for v1 — admin can run manually).
 *
 * Run: npm run seed
 */
import { PrismaClient } from "@prisma/client"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const prisma = new PrismaClient()

interface MenuJson {
  restaurant: {
    slug: string
    display_name: string
    tagline?: string
    phone: string
    address: string
    latitude: number
    longitude: number
    open_time: string
    close_time: string
    timezone: string
    delivery_fee_paise: number
    packaging_fee_paise: number
    gst_basis_points: number
    allow_cancel_after_accept: boolean
  }
  categories: Array<{
    slug: string
    name: string
    sort_order: number
  }>
  items: Array<{
    slug: string
    category_slug: string
    title: string
    description?: string
    base_price_paise: number
    is_veg: boolean
    prep_time_minutes: number
    variants?: Array<{
      slug: string
      name: string
      price_delta_paise: number
      is_default: boolean
    }>
  }>
}

async function main(): Promise<void> {
  const menuPath = join(__dirname, "hotbox-menu.json")
  const menu = JSON.parse(readFileSync(menuPath, "utf-8")) as MenuJson

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
      // Do NOT touch isPaused, allowCancelAfterAccept on re-seed — admin
      // may have toggled them after initial seed.
    },
  })
  console.log(`[seed] Restaurant: ${restaurant.displayName} (${restaurant.id})`)

  // 2. Categories
  const categoryIdBySlug = new Map<string, string>()
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
      update: {
        name: c.name,
        sortOrder: c.sort_order,
      },
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
        // Do NOT touch isAvailable on re-seed — admin may have toggled.
      },
    })

    if (existing) itemsUpdated++
    else itemsCreated++

    // Variants
    if (item.variants && item.variants.length > 0) {
      // Wipe variants first to keep the seed file authoritative for variants.
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
      // No variants in the JSON → make sure DB matches.
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
