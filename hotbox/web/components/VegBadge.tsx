/**
 * Veg-square indicator. Used on every menu item card to comply with
 * Indian food labelling conventions.
 */
export function VegBadge({ size = 14 }: { size?: number }): React.ReactElement {
  return (
    <span
      aria-label="vegetarian"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        border: "1.5px solid var(--color-veg)",
        borderRadius: 2,
      }}
    >
      <span
        style={{
          width: size * 0.55,
          height: size * 0.55,
          background: "var(--color-veg)",
          borderRadius: "50%",
        }}
      />
    </span>
  )
}
