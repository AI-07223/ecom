import { describe, expect, it } from "vitest"
import { computeTotals, formatINR, paiseToRupees } from "./pricing"

const CFG = {
  deliveryFeePaise: 3000, // ₹30
  packagingFeePaise: 1000, // ₹10
  gstBasisPoints: 500, // 5%
}

describe("pricing — computeTotals", () => {
  it("empty cart still adds packaging + delivery + zero GST", () => {
    const out = computeTotals([], CFG)
    expect(out.subtotalPaise).toBe(0)
    expect(out.packagingFeePaise).toBe(1000)
    expect(out.deliveryFeePaise).toBe(3000)
    expect(out.gstPaise).toBe(0)
    expect(out.totalPaise).toBe(4000)
  })

  it("single item, no add-ons, qty 1", () => {
    const out = computeTotals(
      [
        {
          unitPricePaise: 15000, // ₹150 Margherita pizza
          addonsPricePerUnitPaise: 0,
          quantity: 1,
        },
      ],
      CFG,
    )
    expect(out.subtotalPaise).toBe(15000)
    expect(out.gstPaise).toBe(750) // 5% of 150 = ₹7.50
    expect(out.totalPaise).toBe(15000 + 1000 + 3000 + 750)
  })

  it("matches the spec scenario — subtotal ₹500", () => {
    // Scenario: "GIVEN a cart of items totalling ₹500"
    // Expected breakdown per spec: subtotal 500, packaging 10,
    // delivery 30, GST 25, total 565.
    const out = computeTotals(
      [
        {
          unitPricePaise: 50000,
          addonsPricePerUnitPaise: 0,
          quantity: 1,
        },
      ],
      CFG,
    )
    expect(out.subtotalPaise).toBe(50000)
    expect(out.packagingFeePaise).toBe(1000)
    expect(out.deliveryFeePaise).toBe(3000)
    expect(out.gstPaise).toBe(2500) // 5% of 500
    expect(out.totalPaise).toBe(56500)
  })

  it("multiple items + add-ons + quantities", () => {
    const out = computeTotals(
      [
        // Burger ₹110 + extra cheese ₹40, qty 2 → (150) * 2 = 300
        {
          unitPricePaise: 11000,
          addonsPricePerUnitPaise: 4000,
          quantity: 2,
        },
        // Cold coffee large ₹100, no addons, qty 1 → 100
        {
          unitPricePaise: 10000,
          addonsPricePerUnitPaise: 0,
          quantity: 1,
        },
      ],
      CFG,
    )
    expect(out.subtotalPaise).toBe(40000) // 30000 + 10000
    expect(out.gstPaise).toBe(2000) // 5% of 400
    expect(out.totalPaise).toBe(40000 + 1000 + 3000 + 2000) // 46000
  })

  it("rounds GST to nearest paise (banker's: Math.round)", () => {
    // Subtotal that produces fractional paise when multiplied by 5%
    // e.g. 12345 * 500 / 10000 = 617.25 → rounds to 617
    const out = computeTotals(
      [
        {
          unitPricePaise: 12345,
          addonsPricePerUnitPaise: 0,
          quantity: 1,
        },
      ],
      CFG,
    )
    expect(out.subtotalPaise).toBe(12345)
    expect(out.gstPaise).toBe(617)
  })

  it("18% GST rate works (non-AC restaurant in future)", () => {
    const out = computeTotals(
      [
        {
          unitPricePaise: 10000,
          addonsPricePerUnitPaise: 0,
          quantity: 1,
        },
      ],
      { ...CFG, gstBasisPoints: 1800 },
    )
    expect(out.gstPaise).toBe(1800) // 18% of 100
  })

  it("free-delivery threshold is NOT applied (deferred feature)", () => {
    // Even with a ₹1000 cart, delivery fee is still ₹30.
    const out = computeTotals(
      [
        {
          unitPricePaise: 100000,
          addonsPricePerUnitPaise: 0,
          quantity: 1,
        },
      ],
      CFG,
    )
    expect(out.deliveryFeePaise).toBe(3000)
  })
})

describe("pricing — formatters", () => {
  it("paiseToRupees converts correctly", () => {
    expect(paiseToRupees(0)).toBe(0)
    expect(paiseToRupees(100)).toBe(1)
    expect(paiseToRupees(15050)).toBe(150.5)
  })

  it("formatINR formats integer rupees without decimals", () => {
    expect(formatINR(15000)).toContain("150")
    expect(formatINR(15000)).not.toContain(".")
  })

  it("formatINR formats fractional rupees with decimals", () => {
    expect(formatINR(12345)).toContain("123.45")
  })

  it("formatINR uses INR currency", () => {
    expect(formatINR(50000)).toMatch(/₹|INR/)
  })
})
