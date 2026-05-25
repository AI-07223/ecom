/**
 * Yellow pill heading with black ALL-CAPS text — the exact treatment
 * from the printed Hot Box menu. Two visual modes:
 *
 *   - section (default): large, anchored to the top of a menu section
 *   - tab: compact, used inside the sticky horizontal tab strip
 *
 * The active-tab variant is the same shape but with a thin black ring
 * around it for emphasis.
 */
import type { CSSProperties } from "react"

type Mode = "section" | "tab"

export function CategoryPill({
  children,
  mode = "section",
  active = false,
  className,
  style,
}: {
  children: React.ReactNode
  mode?: Mode
  active?: boolean
  className?: string
  style?: CSSProperties
}): React.ReactElement {
  const isTab = mode === "tab"
  const baseStyle: CSSProperties = {
    background: "var(--color-brand-yellow-300)",
    color: "var(--color-shell-bg)",
    fontFamily: "var(--font-display)",
    letterSpacing: "0.05em",
    fontWeight: 700,
    textTransform: "uppercase",
    borderRadius: 999,
    padding: isTab ? "6px 14px" : "10px 20px",
    fontSize: isTab ? "0.875rem" : "1.25rem",
    lineHeight: 1,
    display: "inline-block",
    whiteSpace: "nowrap",
    boxShadow: active ? "inset 0 0 0 2px var(--color-shell-bg)" : undefined,
    transition: "transform 120ms ease, box-shadow 120ms ease",
    transform: active ? "translateY(-1px)" : undefined,
  }
  return (
    <span className={className} style={{ ...baseStyle, ...style }}>
      {children}
    </span>
  )
}
