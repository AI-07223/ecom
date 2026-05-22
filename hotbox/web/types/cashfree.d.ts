/**
 * Minimal ambient declaration for @cashfreepayments/cashfree-js (the v3
 * web SDK ships JS-only). We type the surface we actually use; if you
 * need more methods, expand here.
 */
declare module "@cashfreepayments/cashfree-js" {
  export interface CashfreeCheckoutInput {
    paymentSessionId: string
    /** "_self" navigates the same tab; "_blank" opens a new tab. */
    redirectTarget?: "_self" | "_blank" | "_modal"
    returnUrl?: string
  }

  export interface CashfreeInstance {
    checkout(input: CashfreeCheckoutInput): Promise<unknown>
  }

  export interface CashfreeLoadOptions {
    mode: "sandbox" | "production"
  }

  export function load(opts: CashfreeLoadOptions): Promise<CashfreeInstance>
}
