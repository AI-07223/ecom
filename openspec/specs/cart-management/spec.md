# cart-management Specification

## Purpose
TBD - created by archiving change storefront-cart-checkout. Update Purpose after archive.
## Requirements
### Requirement: Customer can add a product to a cart
The storefront SHALL expose an "Add to cart" action on every product card that, when invoked, ensures a cart exists for the current tenant and customer and adds the selected product variant to that cart.

#### Scenario: First add creates a new cart
- **WHEN** a customer with no existing `cart_<slug>` cookie clicks "Add to cart"
- **THEN** the storefront creates a new Medusa cart scoped to the tenant's sales channel + INR region, sets the `cart_<slug>` HttpOnly cookie with the new cart id, and adds the product's default variant as a line item

#### Scenario: Second add for the same product increments quantity
- **WHEN** the customer clicks "Add to cart" twice on the same product
- **THEN** the cart has one line item for that variant with `quantity = 2`

#### Scenario: Cart cookie pointing at a non-existent cart is healed
- **WHEN** the customer's cookie references a cart that no longer exists in Medusa (deleted or expired) and they click "Add to cart"
- **THEN** a new cart is created and the cookie is rewritten; no error is surfaced to the user

### Requirement: Cart is tenant-scoped
The cart resource SHALL be scoped to the resolved tenant's sales channel. A customer's cart on one tenant SHALL NOT be retrievable or modifiable on another tenant.

#### Scenario: Cookies are tenant-prefixed
- **WHEN** a customer adds items on `acme.localhost` and then visits `globex.localhost`
- **THEN** the Globex storefront shows an empty cart (no items from Acme); the Acme cart cookie (`cart_acme`) is unaffected

#### Scenario: Direct cart-id manipulation across tenants is rejected
- **WHEN** a customer manually sets `cart_globex` to the cart id from `cart_acme` (forged via dev tools) and reloads Globex
- **THEN** Medusa returns no cart (or rejects access) because the publishable key for Globex does not include the Acme sales channel; the storefront treats the cookie as stale and starts a fresh Globex cart

### Requirement: Cart page renders the current cart
The storefront SHALL expose `/cart` showing the current cart's line items, with controls to update quantity or remove items. Re-renders on every mutation.

#### Scenario: Empty cart shows an empty state with a continue-shopping link
- **WHEN** a customer with no items navigates to `/cart`
- **THEN** the page renders an empty-state message and a link back to the home page

#### Scenario: Cart shows totals
- **WHEN** the cart has items
- **THEN** the page shows the subtotal, shipping (or "calculated at checkout"), tax, and total in INR

### Requirement: Add-to-cart works without client-side JavaScript
The storefront's "Add to cart" SHALL be implemented as a `<form>` posting to a Server Action so the flow degrades gracefully without JS. Client-side enhancements (loading spinners) MAY be layered on top.

#### Scenario: Form submission still works with JS disabled
- **WHEN** a customer with JavaScript disabled submits the add-to-cart form
- **THEN** the server action runs, updates the cart, and the page reloads to reflect the change

