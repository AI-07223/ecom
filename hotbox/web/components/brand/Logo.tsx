/**
 * Hot Box Cloud Kitchen logo. Two variants:
 *   - "full" — yellow wordmark in cyan ribbon + flame + Cloud Kitchen tagline
 *   - "flame-only" — just the orange flame icon
 *
 * Renders via <img> (cacheable, ships as a single asset) — for inline
 * recolour we can fall back to inline SVG later. Sizes are intentionally
 * coarse (sm/md/lg) so usage stays consistent across the app.
 */
import type { CSSProperties } from "react"

type Variant = "full" | "flame-only"
type Size = "sm" | "md" | "lg"

const FULL_DIMS: Record<Size, { w: number; h: number }> = {
  sm: { w: 120, h: 55 },
  md: { w: 180, h: 82 },
  lg: { w: 280, h: 128 },
}

const FLAME_DIMS: Record<Size, { w: number; h: number }> = {
  sm: { w: 28, h: 28 },
  md: { w: 40, h: 40 },
  lg: { w: 64, h: 64 },
}

export function Logo({
  variant = "full",
  size = "md",
  className,
  style,
}: {
  variant?: Variant
  size?: Size
  className?: string
  style?: CSSProperties
}): React.ReactElement {
  const src = variant === "full" ? "/brand/logo.svg" : "/brand/logo-flame.svg"
  const dims = variant === "full" ? FULL_DIMS[size] : FLAME_DIMS[size]
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt="Hot Box Cloud Kitchen"
      width={dims.w}
      height={dims.h}
      className={className}
      style={style}
      decoding="async"
    />
  )
}
