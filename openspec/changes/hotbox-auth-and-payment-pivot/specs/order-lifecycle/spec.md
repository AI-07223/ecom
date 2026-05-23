## MODIFIED Requirements

### Requirement: Payment status independent of order state

The system SHALL track `paymentStatus` separately from order state, with values `PENDING`, `AWAITING_VERIFICATION`, `COD`, `PAID`, `FAILED`, `REFUNDED`. The system SHALL also track `paymentMethod` with values `UPI_MANUAL`, `COD`, `ONLINE` (reserved). An order MAY be PLACED with `paymentStatus` in any of `AWAITING_VERIFICATION`, `COD`, or `PAID` (the previous rule that required PAID for PLACED is relaxed). The transition to PAID happens via admin verification (UPI_MANUAL) or rider's cash-collection confirmation (COD).

#### Scenario: UPI order placed without payment
- **WHEN** a customer places an order with paymentMethod = UPI_MANUAL
- **THEN** the order is `state = PLACED, paymentStatus = AWAITING_VERIFICATION`
- **AND** an order_events row is written for PLACED

#### Scenario: COD order placed without payment
- **WHEN** a customer places an order with paymentMethod = COD
- **THEN** the order is `state = PLACED, paymentStatus = COD`

#### Scenario: UPI order verified
- **WHEN** an admin clicks "Verified" on an AWAITING_VERIFICATION order
- **THEN** paymentStatus flips to PAID
- **AND** an order_events row is written with note "Payment verified — UTR <utr>"

#### Scenario: COD order, rider collects cash
- **WHEN** a rider taps Delivered on a COD order and chooses "Yes ₹X received"
- **THEN** in the same transaction the order moves to `state = DELIVERED, paymentStatus = PAID`
- **AND** TWO order_events rows are written: one for DELIVERED and one with note "Cash collected on delivery"

#### Scenario: Cancelled paid order
- **WHEN** an admin cancels an order with paymentStatus = PAID
- **THEN** the order's state becomes CANCELLED, paymentStatus remains PAID
- **AND** the admin sees a "Needs refund" badge

## ADDED Requirements

### Requirement: paymentMethod immutable after order placement

Once an order is placed with a given `paymentMethod`, the value SHALL NOT change. Admin force-marking PAID does not change the method; it only changes the status. Re-submission of a new UTR (after a rejected proof) does not change the method.

#### Scenario: Admin force-marks COD order PAID
- **WHEN** an admin clicks "Force mark PAID" on a COD order
- **THEN** paymentStatus = PAID, paymentMethod = COD (unchanged)

#### Scenario: UTR re-submission preserves method
- **WHEN** a customer re-submits a UTR after a FAILED payment
- **THEN** paymentMethod stays UPI_MANUAL
- **AND** paymentStatus moves from FAILED back to AWAITING_VERIFICATION

### Requirement: Payment-proof fields on the order

The `orders` table SHALL gain three nullable columns:
- `paymentProofUtr` (string, 12-character UTR submitted by customer)
- `paymentProofFilename` (string, filename of the optional uploaded screenshot)
- `paymentProofSubmittedAt` (timestamptz, when the customer hit Submit)
And one nullable column for admin verification:
- `paymentVerifiedAt` (timestamptz, when an admin clicked Verified or rider confirmed cash)
- `paymentVerifiedNote` (string, admin's rejection reason or "Cash collected on delivery")

#### Scenario: Submitting UTR populates the fields
- **WHEN** a customer submits UTR `4231 8765 9012`
- **THEN** `paymentProofUtr = '423187659012'` (digits only)
- **AND** `paymentProofSubmittedAt = now()`

#### Scenario: Admin verification timestamps
- **WHEN** an admin clicks Verified
- **THEN** `paymentVerifiedAt = now()` and `paymentVerifiedNote` records who/why if relevant
