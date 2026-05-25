/**
 * Single menu-item row. Tapping the name navigates to /item/[slug] for
 * special instructions and bulk quantity. Tapping the [+] button adds
 * one of the variant (or the default if a single-variant item) directly
 * via the addToCart Server Action — no navigation, optimistic UI.
 */
"use client"

import Link from "next/link"
import { useTransition, useState } from "react"
import { addToCart } from "@/app/_actions/cart"
import { formatINR } from "@/lib/pricing"
import { useRouter } from "next/navigation"
import { DishPhoto } from "./DishPhoto"
import { VegDot } from "./VegDot"

interface VariantLite {
  slug: string
  name: string
  priceDeltaPaise: number
  isDefault: boolean
}

interface Props {
  itemSlug: string
  itemTitle: string
  itemDescription: string | null
  basePricePaise: number
  isVeg: boolean
  imageUrl: string | null
  categorySlug: string
  variants: VariantLite[]
}

function priceFor(base: number, deltaPaise: number): number {
  return base + deltaPaise
}

export function ItemRow(props: Props): React.ReactElement {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [flash, setFlash] = useState<string | null>(null)

  const hasMultipleVariants = props.variants.length > 1
  const defaultVariant =
    props.variants.find((v) => v.isDefault) ?? props.variants[0] ?? null

  const quickAdd = (variantSlug: string | null): void => {
    start(async () => {
      const r = await addToCart({
        itemSlug: props.itemSlug,
        variantSlug,
        quantity: 1,
        addonSlugs: [],
      })
      if (r.ok) {
        setFlash(variantSlug ?? "default")
        setTimeout(() => setFlash(null), 800)
        router.refresh() // triggers BottomCartBar update
      }
    })
  }

  return (
    <article
      className="flex gap-3 py-3 border-b last:border-b-0"
      style={{ borderColor: "var(--color-shell-line)" }}
    >
      <DishPhoto
        itemSlug={props.itemSlug}
        itemTitle={props.itemTitle}
        imageUrl={props.imageUrl}
        categorySlug={props.categorySlug}
        width={72}
        height={72}
        className="flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <Link
          href={`/item/${props.itemSlug}`}
          className="block"
          aria-label={`Open ${props.itemTitle} details`}
        >
          <h3
            className="font-semibold text-base leading-tight flex items-center gap-1.5"
            style={{ color: "var(--color-shell-fg)" }}
          >
            {props.isVeg && <VegDot size="sm" />}
            <span className="truncate">{props.itemTitle}</span>
          </h3>
          {props.itemDescription && (
            <p
              className="text-xs mt-1 line-clamp-2"
              style={{ color: "var(--color-charcoal)" }}
            >
              {props.itemDescription}
            </p>
          )}
        </Link>

        {/* Variants row(s) */}
        {hasMultipleVariants ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {props.variants.map((v) => {
              const price = priceFor(props.basePricePaise, v.priceDeltaPaise)
              const isFlashing = flash === v.slug
              return (
                <button
                  key={v.slug}
                  type="button"
                  onClick={() => quickAdd(v.slug)}
                  disabled={pending}
                  className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold disabled:opacity-60 transition"
                  style={{
                    background: isFlashing
                      ? "var(--color-veg)"
                      : "var(--color-shell-elev)",
                    color: isFlashing
                      ? "var(--color-shell-bg)"
                      : "var(--color-shell-fg)",
                    border: `1px solid var(--color-shell-line)`,
                  }}
                >
                  <span>{v.name}</span>
                  <span className="tabular-nums">{formatINR(price)}</span>
                  <span aria-hidden style={{ color: "var(--color-brand-yellow-300)" }}>
                    {isFlashing ? "✓" : "+"}
                  </span>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="mt-2 flex items-center justify-between">
            <span
              className="text-base font-semibold tabular-nums"
              style={{ color: "var(--color-brand-yellow-300)" }}
            >
              {formatINR(
                priceFor(props.basePricePaise, defaultVariant?.priceDeltaPaise ?? 0),
              )}
            </span>
            <button
              type="button"
              onClick={() => quickAdd(defaultVariant?.slug ?? null)}
              disabled={pending}
              aria-label={`Add ${props.itemTitle} to cart`}
              className="rounded-full w-9 h-9 flex items-center justify-center text-lg font-bold disabled:opacity-60 transition"
              style={{
                background:
                  flash === "default"
                    ? "var(--color-veg)"
                    : "var(--color-brand-yellow-300)",
                color: "var(--color-shell-bg)",
              }}
            >
              {flash === "default" ? "✓" : "+"}
            </button>
          </div>
        )}
      </div>
    </article>
  )
}
