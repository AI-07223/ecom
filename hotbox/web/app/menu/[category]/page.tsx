import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { CartBar } from "@/components/CartBar"
import { VegBadge } from "@/components/VegBadge"
import { getCategoryBySlug } from "@/lib/catalog"
import { formatINR } from "@/lib/pricing"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ category: string }>
}

export default async function CategoryPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { category } = await params
  const cat = await getCategoryBySlug(category)
  if (!cat) notFound()

  return (
    <>
      <main className="mx-auto max-w-md min-h-screen flex flex-col pb-24">
        <header className="px-5 pt-8 pb-5">
          <Link
            href="/"
            className="text-sm text-zinc-500 hover:underline underline-offset-4"
          >
            ← Menu
          </Link>
          <h1 className="mt-3 text-3xl font-black tracking-tight">
            {cat.name}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {cat.items.length} items
          </p>
        </header>

        <section className="px-5">
          <ul className="space-y-3">
            {cat.items.map((item) => {
              const defaultVariant =
                item.variants.find((v) => v.isDefault) ?? item.variants[0]
              const startingPrice =
                item.basePricePaise + (defaultVariant?.priceDeltaPaise ?? 0)
              return (
                <li key={item.id}>
                  <Link
                    href={`/item/${item.slug}`}
                    className="flex items-start gap-3 rounded-2xl border border-zinc-200 bg-white p-4 hover:border-brand-300 transition-colors"
                    style={{ borderRadius: "var(--radius)" }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <VegBadge size={12} />
                        <h3 className="font-semibold text-zinc-900 truncate">
                          {item.title}
                        </h3>
                      </div>
                      {item.description && (
                        <p className="text-xs text-zinc-500 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                      <p className="mt-2 text-sm font-semibold tabular-nums">
                        {formatINR(startingPrice)}
                        {item.variants.length > 0 && (
                          <span className="ml-1 text-zinc-400 font-normal">
                            onwards
                          </span>
                        )}
                      </p>
                    </div>
                    <div
                      className="w-20 h-20 rounded-xl bg-gradient-to-br from-amber-100 to-rose-100 shrink-0 flex items-center justify-center text-xs text-zinc-400"
                      style={{ borderRadius: "var(--radius)" }}
                    >
                      photo
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      </main>
      <Suspense fallback={null}>
        <CartBar />
      </Suspense>
    </>
  )
}
