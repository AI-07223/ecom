## ADDED Requirements

### Requirement: Payment verification screen

The admin SHALL have a `/admin/orders/[id]/verify-payment` page that displays an order's payment proof (submitted UTR + optional screenshot) and offers three actions:
- **Verified ✓** — flips `paymentStatus` to `PAID`, sets `paymentVerifiedAt`, writes an order_events row.
- **Reject — wrong amount or fake** — flips `paymentStatus` to `FAILED`, sets `paymentVerifiedNote` to the admin's reason, writes an order_events row, surfaces a re-submit form on the customer's pay page.
- **Ask for new proof** — leaves status at `AWAITING_VERIFICATION` but sets a `paymentNeedsNewProof = true` flag (or equivalent), surfaces a "please send a clearer proof" banner on the customer's pay page.

#### Scenario: Admin verifies a UPI order with both UTR and screenshot
- **GIVEN** order #HB-A8F2K with paymentStatus = AWAITING_VERIFICATION, UTR submitted, screenshot uploaded
- **WHEN** the admin opens /admin/orders/HB-A8F2K/verify-payment
- **THEN** the page shows the UTR (large, monospace), the screenshot inline at 300px max width, and the three action buttons

#### Scenario: Admin marks Verified
- **WHEN** the admin clicks Verified
- **THEN** paymentStatus flips to PAID
- **AND** the page returns to /admin
- **AND** the customer's /orders/<id>/confirmation reflects PAID on next render

#### Scenario: Admin rejects with reason
- **WHEN** the admin clicks Reject and types "wrong amount, only paid ₹400"
- **THEN** paymentStatus flips to FAILED
- **AND** paymentVerifiedNote = "wrong amount, only paid ₹400"
- **AND** order_events records the rejection with note

### Requirement: Force-mark-paid admin override

The admin order detail page SHALL include a "Force mark PAID" action under a "More" menu, requiring a free-text note (min 5 chars). When used, the order's `paymentStatus` flips to `PAID` regardless of current status, `paymentMethod` is unchanged, `paymentVerifiedAt` and `paymentVerifiedNote` are set, an `order_events` row records the override.

#### Scenario: Admin force-marks a COD order paid (customer paid via direct cash to owner)
- **WHEN** an admin clicks "Force mark PAID" on a COD order and enters "customer paid cash to owner in person"
- **THEN** paymentStatus = PAID, paymentMethod = COD (unchanged)
- **AND** the order_events row preserves the audit trail

### Requirement: Needs-verification badge on inbox

The admin order inbox at `/admin` SHALL show a visually distinct "Needs verification" badge on every order with `paymentStatus = AWAITING_VERIFICATION`. The badge SHALL be tappable and link directly to the verify-payment page.

#### Scenario: Badge appears on new UPI submissions
- **WHEN** any order is in AWAITING_VERIFICATION
- **THEN** its inbox card shows the badge
- **AND** the badge counts on the Inbox tab label (e.g., "Inbox (3)" if 3 orders need verification)

### Requirement: Needs-followup list for unpaid-COD-deliveries

When a rider marks a COD order DELIVERED but reports cash was NOT collected, the order SHALL appear in an admin "Needs followup" view at `/admin/orders?paymentStatus=COD&state=DELIVERED`. The view shows the customer's phone for the admin to call.

#### Scenario: Rider reports no cash
- **GIVEN** a COD order is DELIVERED with paymentStatus still = COD
- **WHEN** the admin visits /admin/orders/?paymentStatus=COD&state=DELIVERED
- **THEN** the order is listed with a "Needs followup" badge
- **AND** the customer's phone is clickable as `tel:` link
