## ADDED Requirements

### Requirement: Admin authentication

The system SHALL gate `/admin/**` routes behind an admin role. v1 ships with a single admin account whose phone number is hardcoded in env (`ADMIN_PHONE`). On OTP login from that phone number, the user record gets `role = 'admin'`. Other phone numbers cannot become admins via any UI flow in v1.

#### Scenario: Admin logs in from configured phone
- **WHEN** the user `+91XXXXXXXXXX` (matching `ADMIN_PHONE`) completes OTP login
- **THEN** their session carries `role = 'admin'`
- **AND** they can visit `/admin`

#### Scenario: Customer attempts to visit admin route
- **WHEN** a user without `role = 'admin'` requests `/admin/orders`
- **THEN** the system returns HTTP 404 (not 403 — we don't leak that the route exists)

### Requirement: Order inbox with audio bell

The admin's primary screen at `/admin` SHALL be the live order inbox, showing all orders in state `PLACED` or `ACCEPTED` or `PREPARING` or `READY` as cards sorted by `created_at` ascending. When a new `PLACED` order appears, the page SHALL play a short audio chime once (via the Web Audio API; user gesture may be required on first page load to enable audio playback).

#### Scenario: New order arrives while admin is viewing the inbox
- **GIVEN** the admin's browser tab on `/admin` is open
- **WHEN** a customer places a new order
- **THEN** within 3 seconds the order card appears at the top of the inbox
- **AND** the audio chime plays once

#### Scenario: Admin needs to enable audio
- **WHEN** the admin first loads `/admin` and audio playback hasn't been granted
- **THEN** a small banner says "Click to enable order sound" with a button
- **AND** clicking the button plays a test chime and unlocks future chimes

### Requirement: Accept / reject / ready / assign flow

The admin SHALL be able to transition any inbox order through `ACCEPTED → PREPARING → READY → ASSIGNED` by tapping buttons on its card. The card SHALL show the customer's name + phone, address (clickable to expand), items list, and total. From `PLACED`, "Reject" SHALL transition the order to `CANCELLED` (always allowed). From `READY`, a "Assign rider" dropdown SHALL list all riders whose `current_order_id IS NULL` AND `is_active = true`; selecting one transitions the order to `ASSIGNED` and sets `riders.current_order_id`.

#### Scenario: Happy path
- **WHEN** admin taps "Accept" on a PLACED order
- **THEN** the order transitions to `ACCEPTED`
- **AND** the card shows "Start cooking" button
- **WHEN** admin taps "Start cooking"
- **THEN** the order transitions to `PREPARING`
- **AND** the card shows a "Mark ready" button
- **WHEN** admin taps "Mark ready"
- **THEN** the order transitions to `READY`
- **AND** the card shows the "Assign rider" dropdown

#### Scenario: Rejecting a fresh order
- **WHEN** admin taps "Reject" on a PLACED order (e.g., out of an ingredient)
- **THEN** the order transitions to `CANCELLED`
- **AND** the customer's live tracking page reflects the cancellation
- **AND** if `payment_status = PAID`, the admin's panel shows a "Needs refund" badge

#### Scenario: No available rider
- **WHEN** an order is in state `READY` and no rider has `current_order_id IS NULL AND is_active = true`
- **THEN** the "Assign rider" dropdown is disabled
- **AND** a "No riders available" tooltip is shown

### Requirement: Manual rider CRUD

The admin SHALL be able to add, edit, deactivate, and delete riders via `/admin/riders`. A rider row has `id`, `phone`, `name`, `is_active`, `current_order_id` (nullable), `last_ping_at` (nullable timestamp). Adding a rider only requires `phone` and `name`; the rider then logs in via OTP using their phone, just like customers.

#### Scenario: Admin adds a new rider
- **WHEN** admin enters `+91XXXXXXXXXX` and `Suresh K.` and clicks "Add"
- **THEN** the rider row is created with `is_active = true`, `current_order_id = NULL`
- **AND** the rider is listed in the riders table
- **AND** the rider appears in the "Assign rider" dropdown on ready orders

#### Scenario: Admin deactivates a rider
- **WHEN** admin toggles `is_active = false` on a rider
- **THEN** the rider no longer appears in any "Assign rider" dropdown
- **AND** ongoing orders the rider is on continue normally (deactivation does not unassign)

#### Scenario: Cannot delete a rider with an active order
- **WHEN** admin tries to delete a rider whose `current_order_id IS NOT NULL`
- **THEN** the delete fails with a "Finish the active delivery first" message

### Requirement: Menu availability toggles

The admin SHALL be able to toggle `menu_items.is_available` from `/admin/menu` without leaving the inbox. The toggle SHALL take effect on the customer storefront within 5 seconds (no full re-deploy).

#### Scenario: Item runs out mid-shift
- **WHEN** admin flips `Paneer Tikka` to unavailable
- **THEN** within 5 seconds, a customer refreshing the menu sees the item marked "Out of stock"
- **AND** customers with the item already in cart see a "remove unavailable item" prompt at checkout

### Requirement: Restaurant settings dashboard

The admin SHALL be able to set the restaurant's `open_time`, `close_time`, `is_paused`, `allow_cancel_after_accept`, `delivery_fee_paise`, `packaging_fee_paise` from `/admin/settings`.

#### Scenario: Owner flips the cancel toggle
- **WHEN** admin toggles `allow_cancel_after_accept` from `false` to `true`
- **THEN** the change persists immediately
- **AND** subsequent `ACCEPTED → CANCELLED` transition attempts succeed

### Requirement: Today's revenue and order count tile

The admin home SHALL show a tile with today's total order count and total revenue (in INR) for orders in state `DELIVERED` with a `delivered_at` in the current day (per restaurant timezone).

#### Scenario: Stats update as the day progresses
- **WHEN** a `DELIVERED` transition is committed at 14:32 IST
- **THEN** the next page render of `/admin` shows the order count incremented by 1
- **AND** the revenue figure incremented by the order's `total_paise / 100`
