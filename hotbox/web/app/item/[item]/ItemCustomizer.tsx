"use client"

import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { addToCart } from "@/app/_actions/cart"
import { formatINR } from "@/lib/pricing"

interface Variant {
  slug: string
  name: string
  priceDeltaPaise: number
  isDefault: boolean
}

interface Addon {
  slug: string
  name: string
  pricePaise: number
  isRequired: boolean
}

interface Props {
  slug: string
  basePricePaise: number
  isAvailable: boolean
  variants: Variant[]
  addons: Addon[]
}

export function ItemCustomizer({
  slug,
  basePricePaise,
  isAvailable,
  variants,
  addons,
}: Props): React.ReactElement {
  const router = useRouter()
  const [variantSlug, setVariantSlug] = useState<string | null>(
    variants.find((v) => v.isDefault)?.slug ?? variants[0]?.slug ?? null,
  )
  const [addonSlugs, setAddonSlugs] = useState<Set<string>>(
    new Set(addons.filter((a) => a.isRequired).map((a) => a.slug)),
  )
  const [quantity, setQuantity] = useState(1)
  const [special, setSpecial] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const linePrice = useMemo(() => {
    const variant = variants.find((v) => v.slug === variantSlug)
    const variantDelta = variant?.priceDeltaPaise ?? 0
    const addonSum = addons
      .filter((a) => addonSlugs.has(a.slug))
      .reduce((s, a) => s + a.pricePaise, 0)
    return (basePricePaise + variantDelta + addonSum) * quantity
  }, [variants, variantSlug, addons, addonSlugs, quantity, basePricePaise])

  function toggleAddon(slug: string): void {
    setAddonSlugs((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }

  async function handleAdd(): Promise<void> {
    setSubmitting(true)
    setError(null)
    try {
      const r = await addToCart({
        itemSlug: slug,
        variantSlug,
        addonSlugs: Array.from(addonSlugs),
        quantity,
        specialInstructions: special.trim() ? special.trim() : null,
      })
      if (!r.ok) {
        setError(r.error)
        return
      }
      router.push("/cart")
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="px-5 pt-4">
      {variants.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
            Pick a size
          </h3>
          <div className="space-y-2">
            {variants.map((v) => (
              <label
                key={v.slug}
                className={`flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer transition-colors ${
                  variantSlug === v.slug
                    ? "border-brand-500 bg-brand-50"
                    : "border-zinc-200"
                }`}
                style={{ borderRadius: "var(--radius)" }}
              >
                <span className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="variant"
                    value={v.slug}
                    checked={variantSlug === v.slug}
                    onChange={() => setVariantSlug(v.slug)}
                    className="accent-brand-500"
                  />
                  <span className="font-medium">{v.name}</span>
                </span>
                <span className="text-sm tabular-nums text-zinc-600">
                  {v.priceDeltaPaise > 0
                    ? `+${formatINR(v.priceDeltaPaise)}`
                    : v.priceDeltaPaise < 0
                      ? formatINR(v.priceDeltaPaise)
                      : "—"}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {addons.length > 0 && (
        <div className="mt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
            Add-ons
          </h3>
          <div className="space-y-2">
            {addons.map((a) => {
              const checked = addonSlugs.has(a.slug)
              return (
                <label
                  key={a.slug}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer ${
                    checked ? "border-brand-500 bg-brand-50" : "border-zinc-200"
                  }`}
                  style={{ borderRadius: "var(--radius)" }}
                >
                  <span className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={a.isRequired}
                      onChange={() => toggleAddon(a.slug)}
                      className="accent-brand-500"
                    />
                    <span className="font-medium">{a.name}</span>
                    {a.isRequired && (
                      <span className="text-[10px] uppercase tracking-wider text-red-700 bg-red-50 rounded px-1.5 py-0.5">
                        required
                      </span>
                    )}
                  </span>
                  <span className="text-sm tabular-nums text-zinc-600">
                    +{formatINR(a.pricePaise)}
                  </span>
                </label>
              )
            })}
          </div>
        </div>
      )}

      <div className="mt-6">
        <label
          htmlFor="special"
          className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2"
        >
          Special instructions
          <span className="ml-1 normal-case font-normal text-zinc-400">
            (optional)
          </span>
        </label>
        <textarea
          id="special"
          value={special}
          onChange={(e) => setSpecial(e.target.value.slice(0, 200))}
          maxLength={200}
          rows={2}
          placeholder="e.g. less spicy, no onion"
          className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500 text-sm"
          style={{ borderRadius: "var(--radius)" }}
        />
      </div>

      <div className="mt-6 flex items-center gap-4">
        <div className="flex items-center border border-zinc-200 rounded-full">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="px-4 py-2 text-lg"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="px-3 tabular-nums font-semibold min-w-[2ch] text-center">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(20, q + 1))}
            className="px-4 py-2 text-lg"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
        <span className="text-sm tabular-nums text-zinc-600 ml-auto">
          {formatINR(linePrice)}
        </span>
      </div>

      {error && (
        <div className="mt-4 text-sm text-red-700 bg-red-50 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleAdd}
        disabled={submitting || !isAvailable}
        className="mt-6 w-full py-4 rounded-xl font-semibold text-white disabled:opacity-50"
        style={{
          background: "var(--color-brand-500)",
          borderRadius: "var(--radius)",
        }}
      >
        {!isAvailable
          ? "Out of stock"
          : submitting
            ? "Adding…"
            : `Add to cart · ${formatINR(linePrice)}`}
      </button>
    </section>
  )
}
