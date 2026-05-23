## ADDED Requirements

### Requirement: Payment-status badge on pickup screen

The rider's assigned-order screen (both web `/rider` and APK home) SHALL show a payment badge near the top of the order card:

- `paymentStatus = PAID` → small green badge: "✓ Already paid (online)"
- `paymentStatus = COD` → large amber-on-yellow badge: "⚠ COLLECT CASH ₹X" with the amount in large numerals
- `paymentStatus = AWAITING_VERIFICATION` → small blue badge: "Payment pending — confirm with customer if asked"

#### Scenario: COD order — badge is loudest element
- **GIVEN** order assigned with `paymentMethod = COD, paymentStatus = COD`
- **WHEN** rider opens the app
- **THEN** the COLLECT CASH ₹X badge is the visually loudest element on the screen (larger font + amber background)

#### Scenario: PAID UPI order — small green badge
- **GIVEN** order with `paymentStatus = PAID`
- **WHEN** rider opens the app
- **THEN** a small green "Already paid" badge is shown unobtrusively

### Requirement: COD cash-collection prompt on Delivered tap

When the rider taps "I've delivered the order" on an order with `paymentMethod = COD`, the client SHALL show a confirmation modal: "Did the customer pay cash? [Yes ₹X received] [No — flag admin]". The Delivered action SHALL NOT complete until the rider picks one.

- **Yes** → POST /api/rider/order/[id]/delivered with `{ cashCollected: true }`. Server marks both `state = DELIVERED` and `paymentStatus = PAID` in one transaction.
- **No** → POST with `{ cashCollected: false }`. Server marks `state = DELIVERED`, leaves `paymentStatus = COD`. Order shows up in admin's "needs followup" list.

For non-COD orders, the modal SHALL be skipped entirely.

#### Scenario: COD delivery with cash collected
- **GIVEN** order with `paymentMethod = COD`
- **WHEN** rider taps Delivered → modal → "Yes ₹X received"
- **THEN** order = DELIVERED + PAID in one Prisma transaction
- **AND** rider's currentOrderId is cleared

#### Scenario: COD delivery without cash
- **WHEN** rider taps Delivered → modal → "No — flag admin"
- **THEN** order = DELIVERED but paymentStatus = COD (unchanged)
- **AND** admin sees the order in /admin/orders?paymentStatus=COD&state=DELIVERED

#### Scenario: UPI-paid delivery — no modal
- **GIVEN** order with `paymentStatus = PAID`
- **WHEN** rider taps Delivered
- **THEN** no modal is shown; order = DELIVERED immediately

### Requirement: Rider login uses email-or-phone + password

The rider APK and `/rider` web client SHALL use the same email-or-phone + password login as customers (no separate OTP flow). The Bearer token returned by `/api/auth/login` is stored in `expo-secure-store` for the APK or as an HttpOnly cookie for web. Riders without a password set (admin-provisioned with a temporary password) SHALL be prompted to set a new password on first login.

#### Scenario: Admin-provisioned rider's first login
- **GIVEN** the admin created a rider with phone +919876543210 and a temporary password
- **WHEN** the rider opens the APK, enters their phone + temporary password
- **THEN** authentication succeeds
- **AND** the next screen prompts them to set a new password (skippable for v1)

#### Scenario: Returning rider login
- **WHEN** a rider re-opens the APK
- **THEN** the stored token authenticates them silently
- **AND** they land directly on the assigned-order home

#### Scenario: OTP screens removed from APK
- **WHEN** the new APK build is installed
- **THEN** there is no OTP input flow; only email-or-phone + password
