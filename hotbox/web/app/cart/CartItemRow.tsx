"use client"

import { useTransition } from "react"
import { removeCartItem, updateCartItemQuantity } from "@/app/_actions/cart"
import { formatINR } from "@/lib/pricing"

interface AddonSnapshot {
  slug: string
  name: string
  pricePaise: number
}

interface Props {
  item: {
    id: string
    itemTitle: string
    variantName: string | null
    addonsJson: unknown // JSONB column — narrowed below
    quantity: number
    lineTotalPaise: number
    specialInstructions: string | null
  }
}

function parseAddons(json: unknown): AddonSnapshot[] {
  if (!Array.isArray(json)) return []
  return json
    .filter(
      (x): x is { slug: unknown; name: unknown; pricePaise: unknown } =>
        x !== null && typeof x === "object",
    )
    .map((x) => ({
      slug: String(x.slug ?? ""),
      name: String(x.name ?? ""),
      pricePaise: Number(x.pricePaise ?? 0),
    }))
}

export function CartItemRow({ item }: Props): React.ReactElement {
  const [pending, startTransition] = useTransition()
  const addons = parseAddons(item.addonsJson)

  return (
    <li className="py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p
            className="font-semibold"
            style={{ color: "var(--color-shell-fg)" }}
          >
            {item.itemTitle}
          </p>
          {item.variantName && (
            <p className="text-xs" style={{ color: "var(--color-charcoal)" }}>
              {item.variantName}
            </p>
          )}
          {addons.length > 0 && (
            <p className="text-xs" style={{ color: "var(--color-charcoal)" }}>
              + {addons.map((a) => a.name).join(", ")}
            </p>
          )}
          {item.specialInstructions && (
            <p
              className="mt-1 text-xs italic"
              style={{ color: "var(--color-charcoal)" }}
            >
              &ldquo;{item.specialInstructions}&rdquo;
            </p>
          )}
        </div>
        <p
          className="tabular-nums text-sm font-semibold whitespace-nowrap"
          style={{ color: "var(--color-brand-yellow-300)" }}
        >
          {formatINR(item.lineTotalPaise)}
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div
          className="flex items-center rounded-full"
          style={{
            background: "var(--color-shell-elev)",
            border: "1px solid var(--color-shell-line)",
          }}
        >
          <button
            type="button"
            onClick={() =>
              startTransition(async () => {
                if (item.quantity <= 1) {
                  await removeCartItem(item.id)
                } else {
                  await updateCartItemQuantity(item.id, item.quantity - 1)
                }
              })
            }
            disabled={pending}
            className="px-3 py-1.5 text-base"
            style={{ color: "var(--color-shell-fg)" }}
            aria-label="Decrease"
          >
            −
          </button>
          <span className="px-2 tabular-nums font-medium min-w-[2ch] text-center text-sm">
            {item.quantity}
          </span>
          <button
            type="button"
            onClick={() =>
              startTransition(async () => {
                await updateCartItemQuantity(item.id, item.quantity + 1)
              })
            }
            disabled={pending}
            className="px-3 py-1.5 text-base"
            style={{ color: "var(--color-shell-fg)" }}
            aria-label="Increase"
          >
            +
          </button>
        </div>
        <button
          type="button"
          onClick={() =>
            startTransition(async () => {
              await removeCartItem(item.id)
            })
          }
          disabled={pending}
          className="text-xs underline underline-offset-4"
          style={{ color: "var(--color-brand-flame-400)" }}
        >
          Remove
        </button>
      </div>
    </li>
  )
}
