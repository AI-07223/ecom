/**
 * Stylized placeholder block per category. Distinct color + glyph for each
 * so the menu doesn't feel like an endless grid of identical cards. Used
 * when a menu item has no real photo URL (which is the default in v1 —
 * the operator can drop real Unsplash URLs into the seed JSON whenever).
 */
const CATEGORY_THEMES: Record<
  string,
  { fromHex: string; toHex: string; glyph: string }
> = {
  beverages:  { fromHex: "#fef3c7", toHex: "#fdba74", glyph: "☕" },
  sandwich:   { fromHex: "#fef3c7", toHex: "#facc15", glyph: "🥪" },
  maggi:      { fromHex: "#fed7aa", toHex: "#fb923c", glyph: "🍜" },
  chaap:      { fromHex: "#fecaca", toHex: "#ef4444", glyph: "🍢" },
  wraps:      { fromHex: "#fef3c7", toHex: "#f97316", glyph: "🌯" },
  burger:     { fromHex: "#fef3c7", toHex: "#dc2626", glyph: "🍔" },
  pizza:      { fromHex: "#fee2e2", toHex: "#dc2626", glyph: "🍕" },
  momos:      { fromHex: "#fde68a", toHex: "#facc15", glyph: "🥟" },
  pasta:      { fromHex: "#fee2e2", toHex: "#ec4899", glyph: "🍝" },
  snacks:     { fromHex: "#fef3c7", toHex: "#f59e0b", glyph: "🍟" },
  starters:   { fromHex: "#fecaca", toHex: "#dc2626", glyph: "🌶️" },
  noodles:    { fromHex: "#fed7aa", toHex: "#f97316", glyph: "🍝" },
  "fry-tadka":{ fromHex: "#fef9c3", toHex: "#eab308", glyph: "🍲" },
  curry:      { fromHex: "#fee2e2", toHex: "#ea580c", glyph: "🍛" },
  paneer:     { fromHex: "#fff7ed", toHex: "#f97316", glyph: "🧀" },
  vegetable:  { fromHex: "#dcfce7", toHex: "#16a34a", glyph: "🥗" },
  rice:       { fromHex: "#fef3c7", toHex: "#facc15", glyph: "🍚" },
  breads:     { fromHex: "#fef3c7", toHex: "#ca8a04", glyph: "🫓" },
  "add-on":   { fromHex: "#f3f4f6", toHex: "#9ca3af", glyph: "🧂" },
  "ice-cream":{ fromHex: "#fce7f3", toHex: "#ec4899", glyph: "🍦" },
}

const DEFAULT_THEME = { fromHex: "#fed7aa", toHex: "#fb923c", glyph: "🍴" }

export function CategoryArt({
  categorySlug,
  className,
  glyphSize = 32,
}: {
  categorySlug: string
  className?: string
  glyphSize?: number
}): React.ReactElement {
  const theme = CATEGORY_THEMES[categorySlug] ?? DEFAULT_THEME
  return (
    <div
      className={className}
      style={{
        background: `linear-gradient(135deg, ${theme.fromHex}, ${theme.toHex})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: glyphSize,
      }}
      aria-hidden
    >
      {theme.glyph}
    </div>
  )
}
