## ADDED Requirements

### Requirement: Checkout collects a shipping address
The storefront SHALL expose `/checkout/address` where the customer enters first name, last name, email, phone, address line 1, city, state, postal code, and country (defaulting to India). Submitting the form posts to a server action that stores the address on the cart.

#### Scenario: Valid submission advances to shipping step
- **WHEN** the customer submits a complete, valid address form
- **THEN** the server action updates the cart's shipping_address, billing_address (set to the same value by default), and email; the customer is redirected to `/checkout/shipping`

#### Scenario: Missing required fields re-render the form with errors
- **WHEN** the customer submits a form missing required fields
- **THEN** the page re-renders with field-level error messages and the customer's previous input retained

### Requirement: Checkout lets the customer pick a shipping option
The storefront SHALL expose `/checkout/shipping` listing the available shipping options for the cart's region, with at least one default option ("Standard, ₹99"). Selecting an option attaches it to the cart.

#### Scenario: Shipping option attaches to cart and advances
- **WHEN** the customer selects "Standard" and submits
- **THEN** the cart's shipping_methods is set, the total is recalculated, and the customer is redirected to `/checkout/review`

#### Scenario: No shipping options available blocks the flow
- **WHEN** the cart's region has no shipping options configured
- **THEN** the page shows a "no shipping available, contact support" message and does NOT allow advancement

### Requirement: Checkout shows a review step before order creation
The storefront SHALL expose `/checkout/review` summarizing line items, addresses, shipping option, subtotals, tax, and total. The page SHALL render a "Place Order" button that, when clicked, creates the order in Medusa.

#### Scenario: Place Order creates an order with status pending
- **WHEN** the customer clicks "Place Order"
- **THEN** the cart is converted to an order via Medusa's complete-cart endpoint; the order is created with `payment_status = not_paid` (payment provider integration follows in the next change); the customer is redirected to `/orders/<id>/confirmation`

#### Scenario: Order creation failure surfaces a recoverable error
- **WHEN** Medusa returns an error completing the cart (e.g. an out-of-stock variant)
- **THEN** the customer remains on `/checkout/review` with a clear error message and the cart is still usable

### Requirement: Confirmation page acknowledges the order
The storefront SHALL expose `/orders/<id>/confirmation` showing the order id, items purchased, total paid (or "payment pending"), and shipping address. Accessible by the customer who created the order; un-related order ids return 404.

#### Scenario: Confirmation page renders the order
- **WHEN** the customer lands on the confirmation page after Place Order
- **THEN** the page displays the order id, line items, totals, and "Thank you, <first name>" with the tenant's brand styling

#### Scenario: Confirmation page for an unknown order returns 404
- **WHEN** a request lands on `/orders/<some-other-tenants-id>/confirmation` for an order belonging to a different tenant's sales channel
- **THEN** the storefront returns HTTP 404; no order data is leaked across tenants
