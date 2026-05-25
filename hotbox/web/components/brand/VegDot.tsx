/**
 * FSSAI vegetarian indicator — green dot inside a white-bordered square.
 * Indian regulators require the marker on packaged food; for a 100% veg
 * cloud kitchen we still use it as a brand-trust signal next to every
 * item name.
 */

const SIZES = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 18,
} as const

export function VegDot({
  size = "md",
  className,
}: {
  size?: keyof typeof SIZES
  className?: string
}): React.ReactElement {
  const px = SIZES[size]
  return (
    <span
      role="img"
      aria-label="Vegetarian"
      className={className}
      style={{
        display: "inline-block",
        width: px,
        height: px,
        border: "1.5px solid var(--color-veg-ring)",
        borderRadius: 2,
        boxSizing: "border-box",
        padding: Math.max(1, Math.round(px * 0.18)),
        verticalAlign: "middle",
      }}
    >
      <span
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          background: "var(--color-veg)",
        }}
      />
    </span>
  )
}
