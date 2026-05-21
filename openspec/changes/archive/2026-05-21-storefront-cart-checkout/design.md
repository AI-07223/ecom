## Context

`wire-tenant-catalogs` is live. Each tenant's storefront renders products with prices in INR. Customers can look but can't buy — no cart, no checkout. This change adds the customer-facing purchase flow, stopping just short of taking money (the payment provider is the next change).

Medusa v2's Store API gives us cart + order primitives. We do NOT need our own cart table — Medusa's `cart` resource scoped by the tenant's `publishable_api_key` is already tenant-isolated. We just need server actions that call Medusa and a small set of routes that render the steps.

Constraints:
- All Medusa SDK calls go through `apps/storefront/lib/commerce.ts` (existing rule from scaffold).
- Cart persistence is via an HttpOnly `cart_id` cookie scoped to the host — Next.js cookies API auto-scopes by host.
- Cart and order must be invisible to other tenants. Verified by extending the existing E2E test pattern.

## Goals / Non-Goals

**Goals:**
- A customer can: add a product to cart from the home page → view cart → proceed to checkout → enter shipping address → pick a shipping option → review → "Place Order" → land on a confirmation page with order id.
- Cart persists across page reloads in the same tenant.
- Cart on Acme is invisible from Globex (different cart_id cookies for different hostnames, plus Medusa's sales-channel scoping).
- Order creation is recorded in Medusa; payment_collection is created but stays at `not_paid` (payment provider integration is the next change).
- E2E test extends to cover the cart flow.

**Non-Goals:**
- Authenticated customer accounts (guests only for now; customer auth is a separate later change).
- Payment capture (next change: `cashfree-payments-easy-split`).
- Promo codes, gift cards, taxes beyond Medusa's defaults.
- Saved addresses, address autocomplete, GST capture (Indian B2B common but out of scope).
- Email confirmation send (handled by `per-tenant-transactional-emails` change).
- Order management UI (Medusa admin handles for now).

## Decisions

### D1. Cart state lives in Medusa, not in our DB
Medusa's `cart` is server-side state we fetch on each request. The only client-side state is the `cart_id` cookie. No Redux, no local storage. Server actions read the cookie, call Medusa, return updated state via React's `useTransition` revalidate.

**Alternative considered**: client-side cart in localStorage. Rejected because: (a) breaks SSR brand/price rendering, (b) doesn't survive device switches, (c) Medusa's cart already handles totals/tax/shipping calculation we'd otherwise duplicate.

### D2. Server actions, not API routes
Cart mutations (`add`, `remove`, `update_quantity`) are React Server Actions in `apps/storefront/lib/cart.ts`. They run inside Next.js server, call the commerce facade, set cookies via Next's cookies API, and trigger a route revalidation.

**Alternative considered**: a `/api/cart/*` REST surface. Rejected because: server actions integrate natively with React's transition + form patterns and Next.js 16 has no rough edges with them.

### D3. Cookie naming: tenant-prefixed
Cookie name is `cart_<tenant-slug>` (e.g. `cart_acme`) — not just `cart_id`. Reason: a customer who visits Acme then Globex on the same browser should get a fresh cart on Globex, not the Acme cart. Hostname alone isolates them (browsers segregate cookies by domain), but the prefix is belt-and-suspenders for shared infrastructure.

### D4. Checkout is multi-step but server-routed
`/checkout/address`, `/checkout/shipping`, `/checkout/review` — each a server route. Form submission posts to a server action that updates the cart and `redirect`s to the next step. No client-side router state, no SPA wizard.

**Alternative considered**: single-page wizard with client state. Rejected because: progressive enhancement (works without JS), simpler to reason about, easier to test.

### D5. Region resolution
The tenant's sales channel is attached to the INR region (created by `wire-tenant-catalogs`). The cart's `region_id` is set to that INR region when the cart is created. Medusa's shipping options + tax calculation flow from the region.

### D6. Edge cases enumerated
- Add to empty cart → cart created on the fly, customer sees `/cart` with one line item.
- Add same product twice → quantity incremented (Medusa default behavior).
- Cart in cookie no longer exists in Medusa (admin deleted it, or 7-day expiry) → re-create on next add; surface no-error UX.
- Checkout submit without an address → step page validates server-side and re-renders the form with errors.
- Shipping option fetch returns empty → display "no shipping available, contact support" and block "Place Order".
- Race: two tabs add to cart simultaneously → Medusa is the source of truth; second add reflects in next render.

## Risks / Trade-offs

- **Multiple revalidations on every cart action** — Each add triggers a re-fetch of the cart from Medusa. Acceptable at this scale; if it becomes hot, add an in-process cache keyed by cart_id.
- **No optimistic UI** — Add-to-cart shows a spinner until Medusa responds. Acceptable for v1; React's `useOptimistic` is a future polish.
- **Guest carts pile up in Medusa over time** — They expire per Medusa defaults. The agency admin can purge if storage grows.

## Migration Plan

This change adds new routes and components — no schema changes, no data migration. Existing storefront pages keep working.

## Open Questions

- **Tax inclusivity** — Indian customers expect prices to display as inclusive of GST. Medusa supports both; default plan: configure the INR region as `includes_tax = true` and display `inr` totals as final. Revisit if a client demands B2B-style (tax-exclusive) display.
- **Shipping zones** — For now, single shipping option ("Standard", flat ₹99) per tenant. Per-tenant shipping rules can come later.
