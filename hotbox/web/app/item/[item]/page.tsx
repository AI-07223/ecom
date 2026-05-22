import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { CartBar } from "@/components/CartBar"
import { VegBadge } from "@/components/VegBadge"
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
      <main className="mx-auto max-w-md min-h-screen flex flex-col pb-32">
        <header className="px-5 pt-8 pb-3">
          <Link
            href={`/menu/${menuItem.category.slug}`}
            className="text-sm text-zinc-500 hover:underline underline-offset-4"
          >
            ← {menuItem.category.name}
          </Link>
        </header>

        <div
          className="mx-5 my-3 h-56 rounded-2xl bg-gradient-to-br from-amber-100 via-rose-100 to-orange-100 flex items-center justify-center text-zinc-400"
          style={{ borderRadius: "var(--radius)" }}
        >
          photo coming
        </div>

        <section className="px-5 pt-2">
          <div className="flex items-center gap-2 mb-1">
            <VegBadge size={14} />
            <span className="text-xs text-zinc-500">Pure veg</span>
            {!menuItem.isAvailable && (
              <span className="ml-auto text-xs rounded-full bg-red-50 text-red-700 px-2 py-0.5">
                Out of stock
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {menuItem.title}
          </h1>
          {menuItem.description && (
            <p className="mt-2 text-zinc-600 text-sm leading-relaxed">
              {menuItem.description}
            </p>
          )}
          <p className="mt-2 text-xs text-zinc-500">
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
        <CartBar />
      </Suspense>
    </>
  )
}
