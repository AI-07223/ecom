## MODIFIED Requirements

### Requirement: Phone-OTP customer authentication

The system SHALL authenticate customers via email + password (login by email OR phone). Phone is collected at signup, normalized to E.164, stored as the unique identity key on `users.phone`. Phone is NOT used as an auth credential (no OTP). Sessions persist via an HttpOnly cookie containing a signed HS256 JWT, OR a Bearer header (for native clients). See `email-password-auth` capability for the full requirements.

#### Scenario: First-time customer signs up at checkout
- **WHEN** an anonymous visitor reaches checkout without a session
- **THEN** they are redirected to `/signup?next=/checkout`
- **AND** after submitting email + phone + name + password, their cart is bound to the new user atomically
- **AND** they are redirected back to /checkout to continue placing the order

#### Scenario: Returning customer logs in
- **WHEN** a known customer enters their email OR phone + correct password
- **THEN** the JWT session cookie is set
- **AND** their address book is available immediately

#### Scenario: Reset password flow
- **WHEN** a customer clicks "Forgot password" on /login
- **THEN** they reach /reset-request
- **AND** submitting their email sends a Resend email (or console-logs the URL if Resend isn't configured)

#### Scenario: OTP flow removed
- **WHEN** any client POSTs to /api/otp/send or /api/otp/verify
- **THEN** the response is HTTP 404 (route removed)

## ADDED Requirements

### Requirement: Payment-method selection at checkout

The checkout page SHALL present the customer with a radio-card payment selector between two options: "Pay now via UPI" (default) and "Pay on delivery (cash)". The selected option SHALL be sent to the server as part of the "Place order" Server Action call. See `manual-payment-verification` capability for the rest of the payment flow.

#### Scenario: Payment method defaults to UPI
- **WHEN** the checkout page renders for the first time
- **THEN** "Pay now via UPI" is pre-selected

#### Scenario: Customer changes to COD
- **WHEN** the customer taps "Pay on delivery (cash)" before placing the order
- **THEN** clicking Place order creates an order with `paymentMethod = COD` and `paymentStatus = COD`

### Requirement: Post-checkout pay page for UPI orders

For orders placed with `paymentMethod = UPI_MANUAL`, the customer SHALL be redirected to `/orders/[id]/pay` instead of the confirmation page. The pay page shows the QR + UTR submission form per the `manual-payment-verification` capability. Once UTR is submitted, the page transitions to a "waiting for verification" view that polls the order status.

#### Scenario: UPI order redirects to pay page
- **WHEN** a customer places an order with paymentMethod = UPI_MANUAL
- **THEN** they land on /orders/<id>/pay (not /orders/<id>/confirmation)

#### Scenario: Customer can navigate back to pay page from order history
- **WHEN** a customer's UPI order is in AWAITING_VERIFICATION
- **AND** they visit /account/orders and tap that order
- **THEN** the link goes to /orders/<id>/pay (re-submission allowed if rejected)
