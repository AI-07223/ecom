## ADDED Requirements

### Requirement: Phone-OTP customer authentication

The system SHALL authenticate customers via a 6-digit OTP sent over SMS to an Indian (+91) phone number. The session SHALL persist via an HttpOnly cookie containing a signed JWT (or DB-backed session row). No email, password, or social login is offered in v1.

#### Scenario: First-time customer signs up at checkout
- **WHEN** an anonymous visitor enters their +91 phone number at checkout
- **THEN** the system sends a 6-digit OTP to that number
- **AND** the customer receives the OTP within 30 seconds
- **AND** entering the correct OTP creates a `customers` row and sets the session cookie
- **AND** the anonymous cart is bound to the newly-created `customer_id`

#### Scenario: Returning customer logs in
- **WHEN** a known customer enters their +91 phone number
- **THEN** the system sends an OTP
- **AND** entering the correct OTP restores their session
- **AND** their address book is available immediately

#### Scenario: OTP rate limiting
- **WHEN** the same phone number requests 5 OTPs in under 10 minutes
- **THEN** the 6th request is rejected with a "Too many attempts, try again in X minutes" message

#### Scenario: Wrong OTP attempts
- **WHEN** a phone number enters 5 incorrect OTPs in a row
- **THEN** the system invalidates the active OTP and forces a new send

### Requirement: Mobile-first storefront

The system SHALL render a mobile-first PWA for customers at `/`. The layout SHALL be optimised for one-handed phone use: bottom nav, large tap targets (≥ 44 px), no horizontal scroll, and a sticky cart bar at the bottom showing item count + total.

#### Scenario: Page loads on a 375-px-wide viewport
- **WHEN** the customer visits `/` on a phone-sized viewport
- **THEN** the bottom navigation is visible without scrolling
- **AND** the cart bar at the bottom is sticky and shows the live total

#### Scenario: Veg-only filter is a no-op in v1
- **WHEN** the customer sees the menu
- **THEN** all items are visibly marked with a green-square veg icon
- **AND** there is no non-veg filter chip (Hotbox is fully veg)

### Requirement: Cart with snapshot pricing

The system SHALL keep the customer's cart as a Postgres `carts` row keyed by an HttpOnly cookie UUID (or the authenticated `customer_id`). `cart_items` SHALL snapshot the item title, variant label, add-on labels and prices at cart-write time. Recomputing the cart total SHALL NOT re-read live menu prices — the snapshot is authoritative for the duration of the cart session, up to checkout.

#### Scenario: Cart survives page refresh
- **WHEN** the customer adds items, refreshes the page
- **THEN** the cart is intact, with the same items, quantities, and computed total

#### Scenario: Cart survives login mid-session
- **WHEN** an anonymous customer with 3 items in the cart completes OTP auth
- **THEN** the cart's `customer_id` is set in the same transaction as the OTP verify
- **AND** the cart is preserved (no items lost)

#### Scenario: Item becomes unavailable during checkout
- **WHEN** an item in the customer's cart is set to `is_available = false` after they added it but before they pay
- **THEN** on the address or checkout step the system displays "X is no longer available — please remove it from cart"
- **AND** payment is blocked until the cart is updated

### Requirement: Address book with map-pin pickup

The system SHALL allow a logged-in customer to save up to 5 addresses with `label` (Home/Work/Other), `full_address` (free text), `building`, `floor`, `landmark`, `latitude`, `longitude`. The address creation flow SHALL let the customer drop a pin on a map (using the configured map provider) OR fall back to typing.

#### Scenario: Customer adds first address with map pin
- **WHEN** a logged-in customer opens the "Add address" flow
- **THEN** the page shows a Mapbox map centered on the restaurant's location
- **AND** the customer can drag the pin
- **AND** saving creates an `addresses` row with the dropped lat/lng

#### Scenario: Customer adds address without GPS permission
- **WHEN** the customer denies browser geolocation permission
- **THEN** the map still loads (centered on a sensible default — restaurant location)
- **AND** the customer can still drag the pin OR type address text and save without coordinates

#### Scenario: Address selection at checkout
- **WHEN** the customer has 2+ saved addresses
- **THEN** the checkout step shows them as radio cards
- **AND** the default selection is the most recently used

### Requirement: Cashfree.js v3 Drop-in checkout

The system SHALL render Cashfree's Drop-in JS widget on the checkout page after the customer confirms cart + address. The server SHALL create the Cashfree payment session, return the session ID to the client, and let the Drop-in widget handle UPI / cards / wallets / netbanking. On success, the Cashfree webhook updates the order to `PAID`, transitions the order state to `PLACED`, and the customer is redirected to the order confirmation page.

#### Scenario: Successful UPI payment
- **WHEN** the customer pays via UPI inside the Cashfree Drop-in widget
- **AND** Cashfree posts a `PAYMENT_SUCCESS` webhook to `/api/cashfree/webhook`
- **THEN** the order's `payment_status` becomes `PAID`
- **AND** the order's state becomes `PLACED` (and an `order_events` row is written)
- **AND** the customer is redirected to `/orders/<id>/confirmation`

#### Scenario: Payment failure
- **WHEN** the customer's payment attempt fails (e.g., insufficient balance)
- **THEN** the Drop-in widget displays the error
- **AND** the cart is NOT cleared
- **AND** the customer can re-attempt payment without re-entering address

#### Scenario: Webhook signature verification
- **WHEN** any request hits `/api/cashfree/webhook`
- **THEN** the system verifies the `x-webhook-signature` header per Cashfree's documented algorithm
- **AND** rejects unsigned or wrongly-signed requests with HTTP 401

### Requirement: Order confirmation and re-order

The system SHALL show an order confirmation page after successful payment with order ID, ETA estimate, item list, total, payment method, and a "Track order" CTA leading to the live tracking page. A logged-in customer's order history page SHALL show their past orders with a "Re-order" button that copies the order's items into a fresh cart.

#### Scenario: Customer hits "Re-order"
- **WHEN** the customer taps "Re-order" on a past order
- **THEN** the items (with their original variant + add-ons) are copied into a new cart
- **AND** items no longer `is_available` are skipped with a toast notification listing them
- **AND** the customer is redirected to the cart page

### Requirement: Mandatory veg-friendly branding

The system SHALL display the green-square veg indicator on every menu item card and on the order confirmation summary. The brand identity established in v1 SHALL communicate "vegetarian Indian fast food" (warm reds/oranges, bold display typography defaults). Exact palette and typography may be refined in a follow-up polish task.

#### Scenario: Item card includes veg indicator
- **WHEN** any menu item card renders on the customer storefront
- **THEN** the green-square veg indicator is visible adjacent to the title
