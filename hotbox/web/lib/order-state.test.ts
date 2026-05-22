/**
 * Pure-logic tests for the state machine helpers. The full
 * `transitionOrderState()` integration tests require Prisma and live in
 * a separate file.
 */
import { describe, expect, it } from "vitest"
import {
  OrderState,
  allowedTransitions,
  isAllowed,
  isStaticallyAllowed,
  TERMINAL_STATES,
} from "./order-state"

describe("order-state — static table", () => {
  it("PLACED can advance to ACCEPTED or CANCELLED", () => {
    expect(isStaticallyAllowed(OrderState.PLACED, OrderState.ACCEPTED)).toBe(
      true,
    )
    expect(isStaticallyAllowed(OrderState.PLACED, OrderState.CANCELLED)).toBe(
      true,
    )
  })

  it("PLACED cannot skip directly to DELIVERED", () => {
    expect(isStaticallyAllowed(OrderState.PLACED, OrderState.DELIVERED)).toBe(
      false,
    )
    expect(isStaticallyAllowed(OrderState.PLACED, OrderState.PICKED_UP)).toBe(
      false,
    )
  })

  it("OUT_FOR_DELIVERY → DELIVERED is allowed", () => {
    expect(
      isStaticallyAllowed(OrderState.OUT_FOR_DELIVERY, OrderState.DELIVERED),
    ).toBe(true)
  })

  it("terminal states allow no further transitions", () => {
    for (const term of TERMINAL_STATES) {
      const targets = Object.values(OrderState).filter((s) => s !== term)
      for (const t of targets) {
        expect(isStaticallyAllowed(term, t as OrderState)).toBe(false)
      }
    }
  })

  it("PREPARING cannot go back to ACCEPTED", () => {
    expect(isStaticallyAllowed(OrderState.PREPARING, OrderState.ACCEPTED)).toBe(
      false,
    )
  })

  it("READY can retract to PREPARING (admin escape hatch)", () => {
    expect(isStaticallyAllowed(OrderState.READY, OrderState.PREPARING)).toBe(
      true,
    )
  })

  it("ASSIGNED can be unassigned back to READY", () => {
    expect(isStaticallyAllowed(OrderState.ASSIGNED, OrderState.READY)).toBe(
      true,
    )
  })
})

describe("order-state — cancel toggle gate", () => {
  it("PLACED → CANCELLED is always allowed regardless of toggle", () => {
    expect(
      isAllowed(OrderState.PLACED, OrderState.CANCELLED, {
        allowCancelAfterAccept: false,
      }),
    ).toBe(true)
    expect(
      isAllowed(OrderState.PLACED, OrderState.CANCELLED, {
        allowCancelAfterAccept: true,
      }),
    ).toBe(true)
  })

  it("ACCEPTED → CANCELLED is blocked when toggle is false (default)", () => {
    expect(
      isAllowed(OrderState.ACCEPTED, OrderState.CANCELLED, {
        allowCancelAfterAccept: false,
      }),
    ).toBe(false)
  })

  it("ACCEPTED → CANCELLED is allowed when toggle is true", () => {
    expect(
      isAllowed(OrderState.ACCEPTED, OrderState.CANCELLED, {
        allowCancelAfterAccept: true,
      }),
    ).toBe(true)
  })

  it("PREPARING → CANCELLED is blocked regardless of toggle", () => {
    expect(
      isAllowed(OrderState.PREPARING, OrderState.CANCELLED, {
        allowCancelAfterAccept: false,
      }),
    ).toBe(false)
    expect(
      isAllowed(OrderState.PREPARING, OrderState.CANCELLED, {
        allowCancelAfterAccept: true,
      }),
    ).toBe(false)
  })

  it("READY → CANCELLED is blocked regardless of toggle", () => {
    expect(
      isAllowed(OrderState.READY, OrderState.CANCELLED, {
        allowCancelAfterAccept: false,
      }),
    ).toBe(false)
    expect(
      isAllowed(OrderState.READY, OrderState.CANCELLED, {
        allowCancelAfterAccept: true,
      }),
    ).toBe(false)
  })

  it("OUT_FOR_DELIVERY → CANCELLED is blocked regardless of toggle", () => {
    expect(
      isAllowed(OrderState.OUT_FOR_DELIVERY, OrderState.CANCELLED, {
        allowCancelAfterAccept: false,
      }),
    ).toBe(false)
    expect(
      isAllowed(OrderState.OUT_FOR_DELIVERY, OrderState.CANCELLED, {
        allowCancelAfterAccept: true,
      }),
    ).toBe(false)
  })
})

describe("order-state — allowedTransitions helper", () => {
  it("returns ACCEPTED + CANCELLED from PLACED regardless of toggle", () => {
    expect(
      allowedTransitions(OrderState.PLACED, {
        allowCancelAfterAccept: false,
      }).sort(),
    ).toEqual([OrderState.ACCEPTED, OrderState.CANCELLED].sort())
    expect(
      allowedTransitions(OrderState.PLACED, {
        allowCancelAfterAccept: true,
      }).sort(),
    ).toEqual([OrderState.ACCEPTED, OrderState.CANCELLED].sort())
  })

  it("hides CANCELLED from ACCEPTED when toggle is false", () => {
    expect(
      allowedTransitions(OrderState.ACCEPTED, {
        allowCancelAfterAccept: false,
      }),
    ).toEqual([OrderState.PREPARING])
  })

  it("reveals CANCELLED from ACCEPTED when toggle is true", () => {
    expect(
      allowedTransitions(OrderState.ACCEPTED, {
        allowCancelAfterAccept: true,
      }).sort(),
    ).toEqual([OrderState.CANCELLED, OrderState.PREPARING].sort())
  })

  it("returns an empty list from terminal states", () => {
    expect(
      allowedTransitions(OrderState.DELIVERED, {
        allowCancelAfterAccept: true,
      }),
    ).toEqual([])
    expect(
      allowedTransitions(OrderState.CANCELLED, {
        allowCancelAfterAccept: false,
      }),
    ).toEqual([])
  })
})
