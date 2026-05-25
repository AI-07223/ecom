import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { BottomCartBar } from "@/components/brand/BottomCartBar"
import { DishPhoto } from "@/components/brand/DishPhoto"
import { Logo } from "@/components/brand/Logo"
import { VegDot } from "@/components/brand/VegDot"
import { getMenuItemBySlug } from "@/lib/catalog"
import { ItemCustomizer } from "./ItemCustomizer"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ item: string }>
}

export default async function ItemPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { item } = await params
  const menuItem = await getMenuItemBySlug(item)
  if (!menuItem) notFound()

  return (
    <>
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
            href={`/#${menuItem.category.slug}`}
            className="text-sm font-medium"
            style={{ color: "var(--color-brand-yellow-300)" }}
          >
            ← {menuItem.category.name}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-md min-h-dvh flex flex-col pb-32">
        <div className="mx-5 mt-4 mb-3">
          <DishPhoto
            itemSlug={menuItem.slug}
            itemTitle={menuItem.title}
            imageUrl={menuItem.imageUrl}
            categorySlug={menuItem.category.slug}
            width={520}
            height={300}
            className="w-full"
          />
        </div>

        <section className="px-5 pt-2">
          <div className="flex items-center gap-2 mb-1">
            {menuItem.isVeg && <VegDot size="md" />}
            <span
              className="text-xs font-semibold tracking-wider uppercase"
              style={{ color: "var(--color-veg)" }}
            >
              Pure veg
            </span>
            {!menuItem.isAvailable && (
              <span
                className="ml-auto text-xs rounded-full px-2 py-0.5 font-semibold"
                style={{
                  background: "color-mix(in oklab, var(--color-brand-flame-500) 18%, transparent)",
                  color: "var(--color-brand-flame-300)",
                }}
              >
                Out of stock
              </span>
            )}
          </div>
          <h1
            className="font-display text-4xl leading-tight"
            style={{ color: "var(--color-shell-fg)" }}
          >
            {menuItem.title}
          </h1>
          {menuItem.description && (
            <p
              className="mt-2 text-sm leading-relaxed"
              style={{ color: "var(--color-charcoal-strong)" }}
            >
              {menuItem.description}
            </p>
          )}
          <p
            className="mt-2 text-xs"
            style={{ color: "var(--color-charcoal)" }}
          >
            Prep time: about {menuItem.prepTimeMinutes} min
          </p>
        </section>

        <ItemCustomizer
          slug={menuItem.slug}
          basePricePaise={menuItem.basePricePaise}
          isAvailable={menuItem.isAvailable}
          variants={menuItem.variants.map((v) => ({
            slug: v.slug,
            name: v.name,
            priceDeltaPaise: v.priceDeltaPaise,
            isDefault: v.isDefault,
          }))}
          addons={menuItem.addons.map((a) => ({
            slug: a.slug,
            name: a.name,
            pricePaise: a.pricePaise,
            isRequired: a.isRequired,
          }))}
        />
      </main>
      <Suspense fallback={null}>
        <BottomCartBar />
      </Suspense>
    </>
  )
}
