import { ProductCard, type ProductCardProduct } from "./ProductCard"

type LayoutVariant = "compact" | "hero"

interface ProductGridProps {
  products: ProductCardProduct[]
  variant: LayoutVariant | string
}

const KNOWN_VARIANTS = new Set<LayoutVariant>(["compact", "hero"])

export function ProductGrid({ products, variant }: ProductGridProps) {
  let resolved: LayoutVariant
  if (KNOWN_VARIANTS.has(variant as LayoutVariant)) {
    resolved = variant as LayoutVariant
  } else {
    console.warn(
      `ProductGrid: unknown layout_variant "${variant}" — falling back to "compact"`,
    )
    resolved = "compact"
  }

  if (products.length === 0) {
    return (
      <div
        className="rounded-lg border border-black/10 px-6 py-12 text-center"
        style={{ borderRadius: "var(--radius)" }}
      >
        <p className="opacity-70">No products yet for this storefront.</p>
        <p className="mt-2 text-sm opacity-50">
          Add products from the admin to see them here.
        </p>
      </div>
    )
  }

  const cols =
    resolved === "hero"
      ? "grid-cols-1 md:grid-cols-2"
      : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"

  return (
    <div className={`grid gap-6 ${cols}`}>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} variant={resolved} />
      ))}
    </div>
  )
}
