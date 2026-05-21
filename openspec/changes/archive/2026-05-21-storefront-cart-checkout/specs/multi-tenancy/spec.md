## ADDED Requirements

### Requirement: Cart and order state never bleed across tenants
The platform SHALL enforce that cart and order resources are scoped to the tenant resolved from the request's hostname. Cookies, server actions, and confirmation pages MUST all respect this boundary.

#### Scenario: Cross-tenant cart attempt is rejected at the API layer
- **WHEN** a server action runs with the Acme tenant context but is handed a cart_id that belongs to Globex
- **THEN** the Medusa Store API rejects the request because the Acme publishable key does not include Globex's sales channel; the storefront treats the response as "cart not found" and creates a fresh cart for Acme

#### Scenario: E2E test covers add-to-cart isolation
- **WHEN** the E2E test suite runs after this change lands
- **THEN** at least one test issues an add-to-cart against `acme.localhost`, captures the cookie, replays it against `globex.localhost`, and asserts the Globex cart is empty (or a new cart is created)
