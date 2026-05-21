import type { ComponentProps } from "react"
import { addToCartAction } from "@/lib/cart"

/**
 * Minimal product type — keeps this component free of the Medusa SDK
 * import (which is single-facade-only via lib/commerce.ts).
 */
export interface ProductCardProduct {
  id: string
  handle?: string | null
  title: string
  description?: string | null
  thumbnail?: string | null
  variants?: Array<{
    id: string
    title?: string | null
    calculated_price?: {
      calculated_amount?: number | null
      currency_code?: string | null
    } | null
  }> | null
}

export interface ProductCardProps extends ComponentProps<"article"> {
  product: ProductCardProduct
  variant: "compact" | "hero"
}

function defaultVariantId(p: ProductCardProduct): string | null {
  return p.variants?.[0]?.id ?? null
}

function formatPrice(p: ProductCardProduct): string | null {
  const v = p.variants?.[0]
  if (!v?.calculated_price?.calculated_amount) return null
  const amount = Number(v.calculated_price.calculated_amount)
  const currency = (v.calculated_price.currency_code ?? "inr").toUpperCase()
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(0)}`
  }
}

export function ProductCard({ product, variant, ...rest }: ProductCardProps) {
  const isHero = variant === "hero"
  const variantId = defaultVariantId(product)
  const price = formatPrice(product)

  return (
    <article
      {...rest}
      data-variant={variant}
      data-product-handle={product.handle ?? undefined}
      style={{
        background: "var(--brand-surface)",
        color: "var(--brand-on-surface)",
        borderRadius: "var(--radius)",
        fontFamily: "var(--font-display)",
      }}
      className={[
        "overflow-hidden border border-black/5 shadow-sm transition-shadow hover:shadow-md flex flex-col",
        isHero ? "p-8" : "p-4",
      ].join(" ")}
    >
      {product.thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.thumbnail}
          alt={product.title}
          className={isHero ? "aspect-[4/3] w-full object-cover" : "aspect-square w-full object-cover"}
          style={{ borderRadius: "var(--radius)" }}
        />
      ) : (
        <div
          aria-hidden
          className={isHero ? "aspect-[4/3] w-full" : "aspect-square w-full"}
          style={{
            borderRadius: "var(--radius)",
            background:
              "linear-gradient(135deg, var(--brand-primary), var(--brand-surface))",
            opacity: 0.6,
          }}
        />
      )}
      <h3
        className={isHero ? "mt-6 text-2xl font-semibold" : "mt-3 text-base font-medium"}
      >
        {product.title}
      </h3>
      {product.description && isHero ? (
        <p className="mt-2 text-sm opacity-80 line-clamp-3">
          {product.description}
        </p>
      ) : null}
      {price ? (
        <p
          className={isHero ? "mt-3 text-lg font-semibold" : "mt-2 text-sm font-medium"}
        >
          {price}
        </p>
      ) : null}
      <form action={addToCartAction} className="mt-auto pt-4">
        {variantId ? <input type="hidden" name="variant_id" value={variantId} /> : null}
        <button
          type="submit"
          disabled={!variantId}
          style={{
            background: "var(--brand-primary)",
            color: "var(--brand-on-primary)",
            borderRadius: "var(--radius)",
          }}
          className={[
            "inline-flex items-center justify-center px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed",
            isHero ? "w-full" : "w-full",
          ].join(" ")}
        >
          Add to cart
        </button>
      </form>
    </article>
  )
}
