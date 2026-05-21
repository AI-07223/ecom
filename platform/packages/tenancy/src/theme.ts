/**
 * Theme-token helpers. The storefront uses `themeTokensToCss(tokens)` to
 * render a `<style>` block in the root layout for the current tenant.
 */

import type { ThemeTokens } from "./types.js"

const SAFE_VALUE_RE = /^[^<>{}\\;]+$/

/**
 * Convert a tenant's theme tokens to a CSS `:root { ... }` block.
 *
 * - Skips keys that don't start with `--` (defensive; should never happen
 *   if the row came from the typed schema).
 * - Skips empty / unsafe values rather than letting them break the document.
 */
export function themeTokensToCss(tokens: ThemeTokens): string {
  const lines: string[] = []
  for (const [key, raw] of Object.entries(tokens)) {
    if (!key.startsWith("--")) continue
    if (raw === undefined || raw === null) continue
    const value = String(raw).trim()
    if (!value) continue
    if (!SAFE_VALUE_RE.test(value)) continue
    lines.push(`  ${key}: ${value};`)
  }
  if (lines.length === 0) return ":root { }"
  return `:root {\n${lines.join("\n")}\n}`
}
