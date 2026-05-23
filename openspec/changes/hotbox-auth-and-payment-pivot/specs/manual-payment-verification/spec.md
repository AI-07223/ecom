## ADDED Requirements

### Requirement: Two payment methods at checkout

The checkout page SHALL present exactly two payment options as radio cards: "Pay now via UPI" (default) and "Pay on delivery (cash)". Selecting either sets `orders.paymentMethod` accordingly; clicking "Place order" creates the order in one transaction.

#### Scenario: UPI selected
- **WHEN** the customer picks "Pay now via UPI" and clicks Place order
- **THEN** the order is created with `paymentMethod = 'UPI_MANUAL'` and `paymentStatus = 'AWAITING_VERIFICATION'`
- **AND** the customer is redirected to `/orders/[id]/pay`

#### Scenario: COD selected
- **WHEN** the customer picks "Pay on delivery (cash)" and clicks Place order
- **THEN** the order is created with `paymentMethod = 'COD'` and `paymentStatus = 'COD'`
- **AND** the customer is redirected to `/orders/[id]/confirmation`

### Requirement: UPI QR + UTR submission flow

The `/orders/[id]/pay` page SHALL display:
- The order total prominently
- A breakdown (subtotal, packaging, delivery, GST)
- A scannable QR code encoding a `upi://pay?pa=<UPI_MERCHANT_VPA>&pn=<UPI_MERCHANT_NAME>&am=<rupees>&tn=<orderPublicCode>&cu=INR` URI
- The merchant VPA as fallback text (so the customer can copy-paste into their UPI app)
- A form with a UTR field (12-digit alphanumeric, required) and an optional screenshot file input (image/jpeg, image/png, image/webp; max 2 MB)
- A "Submit for verification" button

On submit, the server SHALL store the UTR (and screenshot if uploaded) on the order and leave `paymentStatus = 'AWAITING_VERIFICATION'`.

#### Scenario: Customer submits UTR only
- **WHEN** the customer enters a valid 12-digit UTR and clicks Submit
- **THEN** `orders.paymentProofUtr` is set
- **AND** `orders.paymentProofFilename` is null
- **AND** the page transitions to a "waiting for verification" view

#### Scenario: Customer submits UTR + screenshot
- **WHEN** the customer enters UTR + uploads a 1.2 MB JPEG
- **THEN** the file is saved at `/app/uploads/<orderId>-payment.jpg`
- **AND** `orders.paymentProofFilename = '<orderId>-payment.jpg'`
- **AND** the screenshot is fetchable via `GET /api/orders/<id>/payment-proof` by the customer or any admin

#### Scenario: Screenshot too large
- **WHEN** the customer attempts to upload a 5 MB file
- **THEN** the response is HTTP 413 with message "Screenshot must be 2 MB or smaller"

#### Scenario: Unsupported file type
- **WHEN** the customer attempts to upload a .pdf
- **THEN** the response is HTTP 415 with message "Use a PNG, JPEG, or WebP screenshot"

#### Scenario: UTR format validation
- **WHEN** the customer submits a UTR that isn't 12 alphanumeric characters
- **THEN** client-side validation rejects before submit; server-side validates as final guard

### Requirement: Admin payment verification

The admin order inbox SHALL show a "Needs verification" badge on orders with `paymentStatus = 'AWAITING_VERIFICATION'`. Tapping the badge opens `/admin/orders/[id]/verify-payment` which displays:
- Order public code + amount
- Submitted UTR (large, monospace, copy-able)
- Submitted screenshot (if present) inline at 300px max width
- Three buttons: "Verified ✓", "Reject — wrong amount or fake", "Ask for new proof"

#### Scenario: Admin verifies a UPI order
- **WHEN** the admin checks the UTR in their own UPI app, finds the matching transaction with the matching amount, and clicks "Verified ✓"
- **THEN** `paymentStatus` flips to `'PAID'`
- **AND** an `order_events` row is appended with note `Payment verified — UTR <utr>`
- **AND** the customer's `/orders/[id]/confirmation` view immediately reflects PAID
- **AND** the kitchen inbox can now safely "Accept" without payment risk

#### Scenario: Admin rejects with reason
- **WHEN** the admin clicks "Reject — wrong amount or fake" and enters a reason
- **THEN** `paymentStatus` flips to `'FAILED'`
- **AND** the customer's pay page surfaces the rejection + offers to submit a new UTR
- **AND** an order_events row is appended with the rejection reason

#### Scenario: Admin asks for new proof
- **WHEN** the admin clicks "Ask for new proof"
- **THEN** an `orders.paymentNeedsNewProof = true` flag is set (or equivalent in a `payment_review_actions` log)
- **AND** the customer's pay page surfaces a "we couldn't read your proof — please send a clearer one" banner with a new submit form

#### Scenario: Admin force-marks PAID without UTR
- **WHEN** the admin uses the "Force mark PAID" action on an order (with a required note)
- **THEN** `paymentStatus` flips to `'PAID'` with `paymentMethod = 'UPI_MANUAL'` unchanged
- **AND** an order_events row records the admin override + note

### Requirement: Rider COD cash-collection prompt

When a rider taps "I've delivered the order" on an order with `paymentMethod = 'COD'`, the client (web or APK) SHALL show a modal: "Did the customer pay cash? [Yes ₹X received] [No — flag admin]".

- **Yes** → the rider's mark-delivered request includes `cashCollected: true`; server transitions the order to `state = 'DELIVERED'` AND `paymentStatus = 'PAID'` in the same Prisma transaction, and writes an order_events row with note `Cash collected on delivery`.
- **No** → server transitions only `state = 'DELIVERED'`, leaves `paymentStatus = 'COD'`, and surfaces the order in admin's "needs followup" list with a banner.

For non-COD orders (already PAID via UPI verification), the prompt SHALL be skipped — Delivered tap goes straight through.

#### Scenario: COD delivery, rider collects cash
- **GIVEN** order #HB-X42 has `paymentMethod = 'COD'`, `paymentStatus = 'COD'`, `state = 'OUT_FOR_DELIVERY'`
- **WHEN** rider taps Delivered → modal → "Yes ₹X received"
- **THEN** order moves to DELIVERED + PAID in one tx
- **AND** rider's `currentOrderId` is cleared

#### Scenario: COD delivery, customer didn't have cash
- **WHEN** rider taps Delivered → modal → "No — flag admin"
- **THEN** order is DELIVERED with `paymentStatus = 'COD'` (still)
- **AND** admin sees the order in `/admin/orders?paymentStatus=COD&state=DELIVERED` with a "needs followup" badge

#### Scenario: UPI-paid delivery
- **GIVEN** order has `paymentStatus = 'PAID'` (already verified)
- **WHEN** rider taps Delivered
- **THEN** no modal appears; order goes straight to DELIVERED

### Requirement: Pickup-screen payment badge

The rider's assigned-order screen (both web `/rider` and APK home) SHALL show a payment badge near the top:

- `paymentStatus = 'PAID'` → green "✓ Already paid (online)"
- `paymentStatus = 'COD'` → amber "⚠ COLLECT CASH ₹X" with prominent amount
- `paymentStatus = 'AWAITING_VERIFICATION'` → blue "Payment pending verification — confirm with customer if asked"

#### Scenario: COD pickup
- **GIVEN** order assigned with `paymentMethod = COD`
- **WHEN** rider opens the app
- **THEN** the "COLLECT CASH ₹X" badge is the visually loudest element on the screen

### Requirement: UPI payment URI format

The QR code generated for `/orders/[id]/pay` SHALL encode a `upi://pay` URI with the following query parameters:
- `pa` = merchant VPA from `UPI_MERCHANT_VPA` env
- `pn` = merchant name from `UPI_MERCHANT_NAME` env (URL-encoded)
- `am` = order total in rupees as a string with up to 2 decimal places
- `tn` = order's public code (e.g. `HB-A8F2K`) — used by admin to match the UPI transaction in their app
- `cu` = `INR`

#### Scenario: URI is well-formed
- **WHEN** a customer's pay page is rendered for order with publicCode `HB-A8F2K`, total ₹565
- **THEN** the QR encodes `upi://pay?pa=<vpa>&pn=<name>&am=565&tn=HB-A8F2K&cu=INR`

### Requirement: Payment proof file storage and access control

Screenshots SHALL be stored at `/app/uploads/<orderId>-payment.<jpg|png|webp>` on a Coolify-managed volume mount. The file SHALL be served via `GET /api/orders/[id]/payment-proof` with the following access rules:
- The order's customer (matched by JWT) can fetch their own proof
- Any user with `role = 'admin'` can fetch any proof
- All other callers receive HTTP 404 (not 403 — we don't leak that the order exists)

#### Scenario: Customer views own proof
- **WHEN** the order's customer GETs /api/orders/<id>/payment-proof
- **THEN** the response is the image bytes with correct Content-Type

#### Scenario: Stranger tries to view someone else's proof
- **WHEN** an authenticated user who isn't the customer (and not an admin) requests the proof
- **THEN** the response is HTTP 404

#### Scenario: Admin views any proof
- **WHEN** an admin requests the proof
- **THEN** the response is the image bytes

### Requirement: No order-status emails

The system SHALL NOT send transactional emails for any order-state transition (placed, accepted, preparing, ready, picked-up, out-for-delivery, delivered, cancelled). Customer notifications happen exclusively via the in-app live tracking view at `/track/[orderId]` and the SSE stream that drives it.

#### Scenario: Order delivered, no email sent
- **WHEN** an order transitions to DELIVERED
- **THEN** no email is dispatched via Resend or any other channel

#### Scenario: Payment verified, no email sent
- **WHEN** an admin marks an order PAID
- **THEN** no email is dispatched; the customer's `/orders/[id]/confirmation` page reflects the change on next render
