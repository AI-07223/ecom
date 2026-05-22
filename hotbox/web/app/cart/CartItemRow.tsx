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
          <p className="font-semibold text-zinc-900">{item.itemTitle}</p>
          {item.variantName && (
            <p className="text-xs text-zinc-500">{item.variantName}</p>
          )}
          {addons.length > 0 && (
            <p className="text-xs text-zinc-500">
              + {addons.map((a) => a.name).join(", ")}
            </p>
          )}
          {item.specialInstructions && (
            <p className="mt-1 text-xs text-zinc-500 italic">
              &ldquo;{item.specialInstructions}&rdquo;
            </p>
          )}
        </div>
        <p className="tabular-nums text-sm font-semibold whitespace-nowrap">
          {formatINR(item.lineTotalPaise)}
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center border border-zinc-200 rounded-full">
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
          className="text-xs text-zinc-500 hover:text-red-600 underline underline-offset-4"
        >
          Remove
        </button>
      </div>
    </li>
  )
}
