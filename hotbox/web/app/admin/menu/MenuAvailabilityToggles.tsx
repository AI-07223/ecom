"use client"

import { useTransition } from "react"
import { setMenuItemAvailable } from "@/app/_actions/admin-menu"

interface Item {
  id: string
  title: string
  startingPaise: number
  startingPriceText: string
  isAvailable: boolean
}

interface Category {
  id: string
  name: string
  items: Item[]
}

export function MenuAvailabilityToggles({
  categories,
}: {
  categories: Category[]
}): React.ReactElement {
  const [pending, startTransition] = useTransition()

  return (
    <div className="space-y-6">
      {categories.map((c) => (
        <section key={c.id}>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
            {c.name}
          </h2>
          <ul className="bg-white border border-zinc-200 rounded-2xl overflow-hidden divide-y divide-zinc-100">
            {c.items.map((i) => (
              <li
                key={i.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex-1 min-w-0 pr-3">
                  <p className="font-medium text-sm">{i.title}</p>
                  <p className="text-xs text-zinc-500 tabular-nums">
                    {i.startingPriceText}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-xs select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={i.isAvailable}
                    disabled={pending}
                    onChange={(e) =>
                      startTransition(async () => {
                        await setMenuItemAvailable(i.id, e.target.checked)
                        window.location.reload()
                      })
                    }
                    className="accent-brand-500 w-5 h-5"
                  />
                  <span className="text-zinc-700">
                    {i.isAvailable ? "On" : "Off"}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
