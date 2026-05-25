"use client"

import { useRef, useState, useTransition } from "react"
import { DishPhoto } from "@/components/brand/DishPhoto"
import {
  clearMenuItemPhoto,
  setMenuItemAvailable,
  uploadMenuItemPhoto,
} from "@/app/_actions/admin-menu"

interface Item {
  id: string
  slug: string
  title: string
  startingPaise: number
  startingPriceText: string
  isAvailable: boolean
  photoFilename: string | null
}

interface Category {
  id: string
  name: string
  items: Item[]
}

const cardStyle: React.CSSProperties = {
  background: "var(--color-shell-elev)",
  border: "1px solid var(--color-shell-line)",
  borderRadius: "var(--radius)",
}

const labelStyle: React.CSSProperties = {
  color: "var(--color-charcoal)",
}

function PhotoControls({ item }: { item: Item }): React.ReactElement {
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [uploaded, setUploaded] = useState(false)

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    startTransition(async () => {
      const fd = new FormData()
      fd.append("photo", file)
      const r = await uploadMenuItemPhoto(item.id, fd)
      if (!r.ok) setError(r.error)
      else {
        setUploaded(true)
        setTimeout(() => window.location.reload(), 600)
      }
    })
    if (fileRef.current) fileRef.current.value = ""
  }

  const onClear = () => {
    if (!confirm("Remove the uploaded photo? The PDF/fallback will show again.")) return
    setError(null)
    startTransition(async () => {
      const r = await clearMenuItemPhoto(item.id)
      if (!r.ok) setError(r.error)
      else window.location.reload()
    })
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        onChange={onFile}
        className="hidden"
      />
      <button
        type="button"
        disabled={pending}
        onClick={() => fileRef.current?.click()}
        className="px-3 py-1.5 font-medium disabled:opacity-50"
        style={{
          background: "var(--color-shell-bg)",
          border: "1px solid var(--color-shell-line)",
          color: "var(--color-brand-yellow-300)",
          borderRadius: "var(--radius)",
        }}
      >
        {pending
          ? "Uploading…"
          : uploaded
            ? "✓ Saved"
            : item.photoFilename
              ? "Replace photo"
              : "Upload photo"}
      </button>
      {item.photoFilename && (
        <button
          type="button"
          disabled={pending}
          onClick={onClear}
          className="px-3 py-1.5 font-medium disabled:opacity-50"
          style={{
            background:
              "color-mix(in oklab, var(--color-brand-flame-500) 18%, transparent)",
            border: "1px solid var(--color-brand-flame-700)",
            color: "var(--color-brand-flame-300)",
            borderRadius: "var(--radius)",
          }}
        >
          Clear
        </button>
      )}
      {error && (
        <span style={{ color: "var(--color-brand-flame-300)" }}>{error}</span>
      )}
    </div>
  )
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
          <h2
            className="text-xs font-semibold uppercase tracking-wider mb-2"
            style={labelStyle}
          >
            {c.name}
          </h2>
          <ul className="overflow-hidden" style={cardStyle}>
            {c.items.map((i, idx) => (
              <li
                key={i.id}
                className={`flex items-start gap-3 px-4 py-3 ${idx > 0 ? "border-t" : ""}`}
                style={{ borderColor: "var(--color-shell-line)" }}
              >
                <DishPhoto
                  itemId={i.id}
                  itemSlug={i.slug}
                  itemTitle={i.title}
                  photoFilename={i.photoFilename}
                  categorySlug={c.id}
                  width={56}
                  height={56}
                  className="flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p
                    className="font-medium text-sm"
                    style={{ color: "var(--color-shell-fg)" }}
                  >
                    {i.title}
                  </p>
                  <p
                    className="text-xs tabular-nums"
                    style={{ color: "var(--color-brand-yellow-300)" }}
                  >
                    {i.startingPriceText}
                  </p>
                  <div className="mt-2">
                    <PhotoControls item={i} />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs select-none cursor-pointer ml-2">
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
                    className="w-5 h-5"
                    style={{ accentColor: "var(--color-brand-yellow-300)" }}
                  />
                  <span style={{ color: "var(--color-shell-fg)" }}>
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
