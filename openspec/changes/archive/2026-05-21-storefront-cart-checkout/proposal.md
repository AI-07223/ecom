## Why

Once each tenant has a catalog, customers need a way to actually buy something — add to cart, enter shipping/billing details, review the order, place it. Medusa's Store API gives us cart and order primitives for free, but the storefront has no UI built against them. This change adds the customer-facing cart and checkout flow, end to end, stopping just short of the payment step (which becomes the next change).

## What Changes

- Add a per-customer cart that persists across page loads via a `cart_id` cookie scoped to the tenant. Server actions create/fetch carts through the Medusa Store API; no third-party cart store needed.
- Add `/cart` and `/checkout` routes under `apps/storefront/app/` with tenant-aware rendering (same brand tokens as the rest of the storefront).
- Add an "Add to cart" button to `ProductCard.tsx` that posts to a server action via React's `useTransition`.
- Add an address-and-shipping step that calls Medusa's shipping option endpoints; uses the regions Medusa created during initial migration.
- Add an order-review step that summarizes line items + shipping + tax + total, then a "Place Order" button that calls the cart-completion endpoint. The order is recorded but not yet paid — the payment step comes next change.
- Add `/orders/:id` and `/orders/:id/confirmation` routes for the post-order experience.
- Define a `CartContext` server-component pattern so any page can `await getCart()` without re-querying Medusa repeatedly within a single render.

## Capabilities

### New Capabilities
- `cart-management`: Maintaining a per-customer cart across requests, scoped to the tenant, with add/remove/update item operations.
- `checkout-flow`: A multi-step UI flow that captures shipping address, picks a shipping option, reviews the order, and creates an order record.

### Modified Capabilities
- `multi-tenancy`: Cart state and orders MUST be scoped to the tenant; a customer's cart on Acme MUST NOT leak into Globex.

## Impact

- **Code**: New routes (`/cart`, `/checkout`, `/orders/:id`), new server actions in `apps/storefront/lib/cart.ts`, new `CartIndicator` and cart drawer components, plus minimal address form components.
- **Dependencies**: No new packages — Medusa's Store SDK already exposes cart + order endpoints. Address validation can use HTML5 inputs initially.
- **DB**: Medusa creates and maintains its own cart / order / payment_collection tables; the platform's `tenants` table is unchanged.
- **Risk**: Cart IDs in cookies are visible to the browser. Cookies are HttpOnly and tenant-scoped via the same proxy that resolves the brand; no PII is stored client-side.
