/**
 * Hot Box brand tokens for the rider app. Mirrors the web app's
 * @theme block in hotbox/web/app/globals.css so the visual language
 * stays consistent across the two surfaces.
 *
 * React Native StyleSheet doesn't honour CSS variables, so we re-export
 * them as plain hex literals. Keep this in sync with globals.css.
 */
export const brand = {
  // Dark shell
  shellBg: "#0a0a0a",
  shellElev: "#161616",
  shellLine: "#2a2a2a",
  shellFg: "#f5f5f4",

  charcoal: "#a1a1aa",
  charcoalStrong: "#d4d4d8",

  // Yellow (primary accent)
  yellow: "#fcd34d",
  yellowBright: "#facc15",
  yellowDeep: "#eab308",

  // Cyan (secondary, ribbon)
  cyan: "#7fcfff",

  // Flame (orange — danger / flame icon)
  flame: "#f97316",
  flameDeep: "#c2410c",
  flameDark: "#7c2d12",
  flameText: "#fdba74",

  // FSSAI veg green
  veg: "#22c55e",
} as const

export type BrandColor = (typeof brand)[keyof typeof brand]
