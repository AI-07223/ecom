import Link from "next/link"
import { Suspense } from "react"
import { Logo } from "@/components/brand/Logo"
import { VegDot } from "@/components/brand/VegDot"
import { ItemRow } from "@/components/brand/ItemRow"
import { SectionHeader } from "@/components/brand/SectionHeader"
import { StickyCategoryTabs } from "@/components/brand/StickyCategoryTabs"
import { BottomCartBar } from "@/components/brand/BottomCartBar"
import { getMenuTree, getRestaurant } from "@/lib/catalog"

export const dynamic = "force-dynamic"

export default async function HomePage(): Promise<React.ReactElement> {
  const [restaurant, menu] = await Promise.all([
    getRestaurant(),
    getMenuTree(),
  ])

  if (!restaurant) {
    return (
      <main className="px-6 pt-12 mx-auto max-w-md">
        <Logo variant="full" size="md" />
        <p className="mt-6" style={{ color: "var(--color-charcoal)" }}>
          Menu loading. If you&rsquo;re seeing this for more than a minute, the
          seed hasn&rsquo;t been run yet.
        </p>
      </main>
    )
  }

  const tabs = menu.map((c) => ({ slug: c.slug, name: c.name }))
  const isPaused = restaurant.isPaused

  return (
    <>
      {/* Sticky header — logo + Orders link. Sits ABOVE the sticky tab
          strip; the StickyCategoryTabs component below offsets itself by
          this header's height (set via the topOffsetPx prop). */}
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
            Orders
          </Link>
        </div>
      </header>

      <StickyCategoryTabs tabs={tabs} topOffsetPx={64} />

      <main className="mx-auto max-w-md pb-32">
        {/* Pure-veg badge under header */}
        <div className="px-5 pt-4 pb-2">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold tracking-wider"
            style={{
              border: `1px solid var(--color-veg)`,
              color: "var(--color-veg)",
              background: "color-mix(in oklab, var(--color-veg) 8%, transparent)",
            }}
          >
            <VegDot size="xs" /> 100% PURE VEG
          </div>
        </div>

        {isPaused && (
          <div
            className="mx-5 mt-2 rounded-lg px-3 py-2 text-sm"
            style={{
              background: "color-mix(in oklab, var(--color-brand-flame-500) 14%, transparent)",
              color: "var(--color-brand-flame-300)",
              border: "1px solid var(--color-brand-flame-700)",
            }}
          >
            We&rsquo;ve paused orders for the moment. Menu is still browseable.
          </div>
        )}

        {/* The menu — one section per category, item rows stacked. */}
        <div className="px-5">
          {menu.map((cat) => (
            <section key={cat.slug}>
              <SectionHeader slug={cat.slug} name={cat.name} />
              <div>
                {cat.items.map((item) => (
                  <ItemRow
                    key={item.id}
                    itemSlug={item.slug}
                    itemTitle={item.title}
                    itemDescription={item.description}
                    basePricePaise={item.basePricePaise}
                    isVeg={item.isVeg}
                    imageUrl={item.imageUrl}
                    categorySlug={cat.slug}
                    variants={item.variants.map((v) => ({
                      slug: v.slug,
                      name: v.name,
                      priceDeltaPaise: v.priceDeltaPaise,
                      isDefault: v.isDefault,
                    }))}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        <footer
          className="mt-12 px-5 pb-6 text-center text-xs"
          style={{ color: "var(--color-charcoal)" }}
        >
          <p>
            <Logo variant="flame-only" size="sm" className="inline-block mr-2 align-middle" />
            Hot Box · Cloud Kitchen
          </p>
          <p className="mt-1">
            <a href={`tel:${restaurant.phone}`} className="underline underline-offset-2">
              {restaurant.phone}
            </a>{" "}
            · {restaurant.openTime}–{restaurant.closeTime}
          </p>
        </footer>
      </main>

      <Suspense fallback={null}>
        <BottomCartBar />
      </Suspense>
    </>
  )
}
