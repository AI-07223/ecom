import Link from "next/link"
import { Suspense } from "react"
import { CartBar } from "@/components/CartBar"
import { CategoryArt } from "@/components/CategoryArt"
import { VegBadge } from "@/components/VegBadge"
import { getCategoriesWithCounts, getRestaurant } from "@/lib/catalog"

export const dynamic = "force-dynamic"

export default async function HomePage(): Promise<React.ReactElement> {
  const [restaurant, categories] = await Promise.all([
    getRestaurant(),
    getCategoriesWithCounts(),
  ])

  if (!restaurant) {
    return (
      <main className="px-6 pt-12">
        <h1 className="text-3xl font-black" style={{ color: "var(--color-brand-500)" }}>
          Hotbox
        </h1>
        <p className="mt-4 text-zinc-600">
          Menu loading. If you&rsquo;re seeing this for more than a minute, the seed
          hasn&rsquo;t been run yet.
        </p>
      </main>
    )
  }

  const isPaused = restaurant.isPaused

  return (
    <>
      <main className="mx-auto max-w-md min-h-screen flex flex-col pb-24">
        <header className="px-5 pt-10 pb-5">
          <div className="flex items-baseline justify-between">
            <h1
              className="font-display text-7xl leading-none"
              style={{
                color: "var(--color-brand-500)",
              }}
            >
              HOTBOX
            </h1>
            <Link
              href="/account/orders"
              className="text-sm text-zinc-500 underline-offset-4 hover:underline"
            >
              Orders
            </Link>
          </div>
          <p className="mt-3 text-zinc-700 text-sm flex items-center gap-1.5">
            <VegBadge size={14} /> Pure veg &middot; hot & fresh
          </p>
          {isPaused && (
            <div className="mt-3 rounded-lg bg-amber-50 text-amber-900 px-3 py-2 text-sm">
              We&rsquo;ve paused orders for the moment. Menu is still browseable.
            </div>
          )}
        </header>

        <section className="px-5 pb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
            Menu
          </h2>
          <ul className="grid grid-cols-2 gap-3">
            {categories.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/menu/${c.slug}`}
                  className="block rounded-2xl bg-white overflow-hidden hover:shadow-md transition-shadow border border-zinc-200"
                  style={{ borderRadius: "var(--radius)" }}
                >
                  <CategoryArt
                    categorySlug={c.slug}
                    glyphSize={40}
                    className="w-full h-24"
                  />
                  <div className="p-3">
                    <div className="font-semibold text-zinc-900 leading-tight">
                      {c.name}
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {c.itemCount} items
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <Suspense fallback={null}>
        <CartBar />
      </Suspense>
    </>
  )
}
