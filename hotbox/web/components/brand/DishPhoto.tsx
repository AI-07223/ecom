/**
 * Three-tier photo source resolution for menu items.
 *
 *   1. operator upload (Phase 9, future): /api/menu/items/<id>/photo
 *      gated by the presence of a per-item `photoFilename` column.
 *      We don't have that column yet in Phase 4, so this tier is wired
 *      conditionally based on an `imageUrl` field that already exists.
 *
 *   2. PDF crop (this phase): /dishes/seed/<slug>.jpg if shipped in
 *      the repo. We resolve at render-time via a static manifest below.
 *
 *   3. Category illustration (Phase 1.6, future): /brand/cat-<slug>.svg
 *      for the long tail. Until generated, a coloured tile with the
 *      flame logo serves as the visual fallback so nothing renders
 *      broken.
 */
import { Logo } from "./Logo"

// Hand-curated list of slugs that have a /dishes/seed/<slug>.jpg
// shipped from the PDF extraction. Keep in sync with
// scripts/extract-dish-photos.ts.
const SEED_PHOTOS = new Set<string>([
  "cold-coffee",
  "raw-sandwich",
  "masala-maggi",
  "veg-burger",
  "margherita-pizza",
  "steam-momos",
  "french-fries",
  "honey-chilli-potato",
  "dal-fry",
  "veg-chowmein",
  "paneer-butter-masala",
  "shahi-paneer",
  "jeera-rice",
  "veg-biryani",
  "lachha-paratha",
  "vanilla-ice-cream",
])

export function resolvePhotoSrc({
  itemSlug,
  imageUrl,
}: {
  itemSlug: string
  imageUrl?: string | null
}): string | null {
  // Tier 1: explicit operator-provided URL (absolute) on the menu item
  if (imageUrl && /^https?:\/\//.test(imageUrl)) return imageUrl
  // Tier 2: bundled PDF crop
  if (SEED_PHOTOS.has(itemSlug)) return `/dishes/seed/${itemSlug}.jpg`
  // Tier 3: none — caller falls back to placeholder
  return null
}

export function DishPhoto({
  itemSlug,
  itemTitle,
  imageUrl,
  categorySlug,
  className,
  width = 96,
  height = 96,
}: {
  itemSlug: string
  itemTitle: string
  imageUrl?: string | null
  categorySlug?: string
  className?: string
  width?: number
  height?: number
}): React.ReactElement {
  const src = resolvePhotoSrc({ itemSlug, imageUrl })
  if (src) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={src}
        alt={itemTitle}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        className={className}
        style={{
          objectFit: "cover",
          background: "var(--color-shell-elev)",
          borderRadius: "var(--radius)",
        }}
      />
    )
  }
  // Fallback: flame-on-dark tile. Category-specific illustrations land in
  // Phase 1.6 — until then this stays consistent across the long tail.
  return (
    <div
      aria-label={categorySlug ? `${categorySlug} category` : itemTitle}
      className={className}
      style={{
        width,
        height,
        background: "var(--color-shell-elev)",
        borderRadius: "var(--radius)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Logo variant="flame-only" size="sm" />
    </div>
  )
}
