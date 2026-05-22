## ADDED Requirements

### Requirement: Explicit order state machine

The system SHALL maintain an `orders` row's state as a Postgres enum with values `PLACED`, `ACCEPTED`, `PREPARING`, `READY`, `ASSIGNED`, `PICKED_UP`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`. A TypeScript transition map SHALL be the single source of truth for which `from → to` transitions are valid. Every transition SHALL go through a `transitionOrderState(orderId, to, options?)` server-side helper that validates the transition, writes the new state, and writes a corresponding row into `order_events`.

#### Scenario: Valid transition
- **WHEN** the system attempts to transition an order from `READY` to `ASSIGNED` with a `rider_id`
- **THEN** the order's state becomes `ASSIGNED`
- **AND** an `order_events` row is written with `event = 'ASSIGNED'`, `rider_id`, and `created_at`
- **AND** the rider's `current_order_id` is set in the same transaction

#### Scenario: Invalid transition rejected
- **WHEN** the system attempts to transition an order from `PLACED` directly to `DELIVERED`
- **THEN** the helper throws `InvalidStateTransitionError`
- **AND** no DB change is made

#### Scenario: Transitions are atomic with side effects
- **WHEN** a `DELIVERED` transition is committed
- **THEN** in the same DB transaction, the rider's `current_order_id` is set to `NULL`
- **AND** the order's `delivered_at` timestamp is set
- **AND** an `order_events` row is written

### Requirement: Pricing snapshot at order creation

The system SHALL snapshot all relevant prices (item base price, variant deltas, add-on prices, delivery fee, packaging fee, GST) into the `orders` and `order_items` rows at the moment the order transitions from cart to `PLACED`. The customer-facing total displayed at any later time SHALL match this snapshot exactly, even if menu prices change in the interim.

#### Scenario: Menu price changes after order placement
- **WHEN** order #1042 was placed when Pizza Margherita cost ₹150
- **AND** the admin later changes the menu price to ₹180
- **THEN** order #1042's stored `subtotal_paise` and its `order_items.line_total_paise` still reflect ₹150
- **AND** the customer's order detail page shows ₹150

### Requirement: Delivery fee and GST calculation

The system SHALL compute the order total as `subtotal + packaging_fee + delivery_fee + gst`, where `delivery_fee` is a flat ₹30 (configurable via a single `restaurants.delivery_fee_paise` column), `packaging_fee` defaults to ₹10 (configurable), and `gst` is 5% of `subtotal` (hardcoded for food per Indian GST rules, with the rate stored on the restaurant row as `gst_basis_points` for transparency).

#### Scenario: Cart total computation
- **GIVEN** a cart of items totalling ₹500
- **WHEN** the customer reaches the checkout summary
- **THEN** the displayed breakdown is: Subtotal ₹500 · Packaging ₹10 · Delivery ₹30 · GST ₹25 · Total ₹565

#### Scenario: Free-delivery threshold (deferred)
- **WHEN** the cart subtotal exceeds a "free above" threshold
- **THEN** v1 makes no special offer; delivery fee remains flat
- **AND** the "free above X" feature is explicitly out of scope

### Requirement: Conditional cancellation via `allow_cancel_after_accept` toggle

The system SHALL gate `CANCELLED` transitions by the `restaurants.allow_cancel_after_accept` boolean. When `false` (default), only `PLACED → CANCELLED` is permitted. When `true`, `ACCEPTED → CANCELLED` is also permitted. `PREPARING` and later states SHALL NEVER transition to `CANCELLED` in v1 (a refund-only flow is deferred to a follow-up change).

#### Scenario: Customer cancels just-placed order, toggle off
- **GIVEN** `allow_cancel_after_accept = false`
- **AND** order #1042 is in state `PLACED`
- **WHEN** the customer taps "Cancel" on the confirmation page
- **THEN** the order transitions to `CANCELLED`

#### Scenario: Customer tries to cancel after restaurant accepted, toggle off
- **GIVEN** `allow_cancel_after_accept = false`
- **AND** order #1042 is in state `ACCEPTED`
- **WHEN** the customer taps "Cancel"
- **THEN** the transition is rejected with a "Order can't be cancelled now" message
- **AND** the order remains in `ACCEPTED`

#### Scenario: Customer cancels after accept, toggle on
- **GIVEN** `allow_cancel_after_accept = true`
- **AND** order #1042 is in state `ACCEPTED`
- **WHEN** the customer taps "Cancel"
- **THEN** the order transitions to `CANCELLED`

#### Scenario: Cancellation blocked beyond PREPARING regardless of toggle
- **GIVEN** any value of `allow_cancel_after_accept`
- **AND** order #1042 is in state `PREPARING`
- **WHEN** the customer attempts to cancel
- **THEN** the transition is rejected

### Requirement: Event log drives customer timeline

The system SHALL store an append-only `order_events` row for every state transition with columns `id`, `order_id`, `event` (the new state), `note` (optional), `lat` (optional, for rider-pings folded into the timeline), `lng` (optional), `created_at`. The customer's live tracking page SHALL render its timeline by reading this table in chronological order.

#### Scenario: Timeline renders in real time
- **WHEN** the rider's status transitions from `PICKED_UP` to `OUT_FOR_DELIVERY`
- **AND** a new `order_events` row is written
- **AND** the customer's `/track/<orderId>` page is open
- **THEN** within 2 seconds the timeline shows "Out for delivery" with the timestamp
- **AND** the map view appears (was hidden during earlier states)

### Requirement: Payment status independent of order state

The system SHALL track `payment_status` separately from order state, with values `PENDING`, `PAID`, `FAILED`, `REFUNDED`. An order MAY be in state `PLACED` only when `payment_status = PAID`. A `CANCELLED` order with `payment_status = PAID` is flagged for manual refund (deferred); the order is still cancelled.

#### Scenario: Order can't be PLACED without payment
- **WHEN** the system attempts to transition an order to `PLACED` with `payment_status = PENDING`
- **THEN** the transition is rejected

#### Scenario: Cancelled but paid order
- **WHEN** a paid order in state `PLACED` is cancelled
- **THEN** the order's state is `CANCELLED` and `payment_status` remains `PAID`
- **AND** the admin sees a "Needs refund" badge on the order in their panel
