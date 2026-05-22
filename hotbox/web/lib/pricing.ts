/**
 * Pricing math for carts and orders.
 *
 * All monetary values are integers representing paise (₹1 = 100 paise).
 * No floats — they're forbidden in money math because rounding drift
 * adds up.
 *
 * Tested in lib/pricing.test.ts. Spec: openspec/changes/
 * hotbox-food-delivery/specs/order-lifecycle/spec.md
 */

export interface PricingConfig {
  deliveryFeePaise: number
  packagingFeePaise: number
  /** GST rate as basis points. 500 = 5%, 1800 = 18%. */
  gstBasisPoints: number
}

export interface PricingLine {
  /** Snapshot unit price (item base + variant delta), excluding add-ons. */
  unitPricePaise: number
  /** Sum of paid add-on prices applied to this line, per unit. */
  addonsPricePerUnitPaise: number
  quantity: number
}

export interface PricingResult {
  subtotalPaise: number
  packagingFeePaise: number
  deliveryFeePaise: number
  gstPaise: number
  totalPaise: number
}

/**
 * Compute the total paise that an order would charge for a cart with the
 * given lines under the given pricing config. Snapshot semantics: the
 * caller is expected to have already resolved each cart_item's
 * snapshot unitPricePaise and addons.
 */
export function computeTotals(
  lines: readonly PricingLine[],
  cfg: PricingConfig,
): PricingResult {
  const subtotal = lines.reduce((sum, line) => {
    const perUnit = line.unitPricePaise + line.addonsPricePerUnitPaise
    return sum + perUnit * line.quantity
  }, 0)

  // GST applies to the food subtotal only. Packaging and delivery are
  // listed separately to match the v1 UX (transparent breakdown). If you
  // ever need GST on delivery/packaging, do the math intentionally — don't
  // change this silently.
  const gst = Math.round((subtotal * cfg.gstBasisPoints) / 10_000)

  const total = subtotal + cfg.packagingFeePaise + cfg.deliveryFeePaise + gst

  return {
    subtotalPaise: subtotal,
    packagingFeePaise: cfg.packagingFeePaise,
    deliveryFeePaise: cfg.deliveryFeePaise,
    gstPaise: gst,
    totalPaise: total,
  }
}

/**
 * Helpers for rendering paise as human-readable rupees in templates.
 * Use the appropriate Intl locale when displaying — these are bare
 * arithmetic helpers, not formatters.
 */
export function paiseToRupees(paise: number): number {
  return paise / 100
}

export function formatINR(paise: number): string {
  const rupees = paise / 100
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: rupees % 1 === 0 ? 0 : 2,
  }).format(rupees)
}
