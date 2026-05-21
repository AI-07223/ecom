import { getTenant } from "@/lib/getTenant"
import { listProducts } from "@/lib/commerce"
import { ProductGrid } from "@/components/ProductGrid"

export default async function HomePage() {
  const tenant = await getTenant()
  const products = await listProducts({ tenant, limit: 24 }).catch((err) => {
    console.error("home: listProducts failed", err)
    return []
  })

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      <header className="mb-10">
        <p
          className="text-sm uppercase tracking-wide"
          style={{ color: "var(--brand-primary)" }}
        >
          {tenant.slug}
        </p>
        <h1
          className="mt-2 text-4xl font-semibold"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {tenant.theme_tokens["--site-title"] ?? `Welcome to ${tenant.slug}`}
        </h1>
      </header>

      <ProductGrid products={products} variant={tenant.layout_variant} />
    </main>
  )
}
