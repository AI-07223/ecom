## Why

Two assumptions from the original `hotbox-food-delivery` build no longer match what the operator wants for the demo:

1. **Phone-OTP auth requires either MSG91 paid credits or a fragile dev-console fallback.** It also can't support password reset because there's no password to reset. The operator wants a self-contained, demoable signup/login flow that works without any external SMS gateway.
2. **Cashfree payment-gateway integration requires merchant KYC and a live webhook handshake.** The operator doesn't have a Cashfree merchant account ready, and even with sandbox creds the demo's external dependency surface is one too many. Meanwhile, every Indian SMB restaurant we want to sell to already operates a static-UPI-QR + manual-verification flow with their customers via WhatsApp.

This change pivots the demo to:

- **Email + password auth** with phone collected at signup as the durable identity key. Login accepts email *or* phone. Reset via email link delivered by Resend.
- **Two payment options** at checkout: pre-pay via UPI (static merchant QR + UTR submission + admin verification) OR true cash-on-delivery (rider collects at door, marks paid on the "Delivered" tap). This matches what real restaurants already do.
- **Resend is the email channel for login-related emails ONLY** — password reset, optional welcome verification. NOT for order notifications (the in-app live tracking IS the notification).

The cost of the pivot is one schema migration, one auth-routes rewrite, one checkout-flow rewrite, and the deletion of three Cashfree files. The benefit is zero-external-credential demo + a payment flow that mirrors how the target market actually pays today.

## What Changes

- **Drop Cashfree integration entirely.** Delete `lib/cashfree.ts`, `app/api/cashfree/webhook/route.ts`, `types/cashfree.d.ts`, `@cashfreepayments/cashfree-js` dependency, and the `CASHFREE_*` env vars. The architecture stays compatible — a future client wanting Cashfree can wire a new payment provider behind the same `paymentMethod` enum.
- **Drop phone-OTP auth.** Delete `app/api/otp/send/route.ts`, `app/api/otp/verify/route.ts`, `lib/otp.ts`, the OTP rate-limit logic, `MSG91_*` env vars. The `otp_codes` table stays in the schema for now (dropping it is a follow-up migration); no code references it after this change.
- **Add email + password auth.** New `lib/auth.ts` with bcrypt password hashing + reset token helpers. New routes: `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout`, `POST /api/auth/reset/request`, `POST /api/auth/reset/confirm`. New pages: `/signup`, rewritten `/login` (accepts email OR phone + password), `/reset-request`, `/reset/[token]`. Schema gains `users.email` (unique), `users.passwordHash`, `users.emailVerifiedAt` (nullable), and a new `password_reset_tokens` table.
- **Phone stays as the identity key.** Unique constraint on `users.phone` unchanged. Login by phone OR email; the response is the same `User` row. All FK relationships (orders, carts, addresses, riders) continue to reference `users.id` which is derived from phone-identity. A user CAN change their email later (out of v1 scope, but the schema allows it); they CANNOT change their phone without losing order history (that's the intended behavior).
- **Add manual-UPI payment method.** At checkout, the customer picks one of two options via radio: (a) Pay now via UPI, (b) Pay on delivery (cash). For (a): order is placed with `paymentStatus = AWAITING_VERIFICATION` and `paymentMethod = UPI_MANUAL`; customer lands on `/orders/[id]/pay` showing a UPI QR generated from the merchant VPA + order total + order id as the transaction note. Customer scans, pays via any UPI app, returns to the page, enters the 12-digit UTR (UPI reference number; required) and optionally uploads a payment screenshot. The submission moves the page to a "waiting for verification" state.
- **Add cash-on-delivery (COD) payment method.** For (b): order is placed with `paymentStatus = COD` and `paymentMethod = COD`. The order skips the pay screen and goes straight to the confirmation page. Rider sees a prominent "COLLECT ₹X CASH" badge; on tapping "Delivered", a follow-up prompt asks "Did the customer pay cash? Yes / No" — Yes flips `paymentStatus = PAID` in the same transaction as `state = DELIVERED`; No flags the order for admin follow-up.
- **Add admin payment verification UI.** New `/admin/orders/[id]/verify-payment` page showing the submitted UTR, the optional screenshot, and three buttons: "Verified ✓" (flips `paymentStatus = PAID`), "Reject — wrong amount / fake" (flips to `FAILED` + asks customer to re-submit), "Ask for new proof" (sets a flag the customer's pay page reads to show "admin asked for a new screenshot"). The admin inbox `/admin` gets a "needs verification" badge on orders with `paymentStatus = AWAITING_VERIFICATION`.
- **Expanded `paymentStatus` enum.** New values: `AWAITING_VERIFICATION`, `COD`. Existing `PENDING` becomes "order created but customer hasn't picked a method yet" (an edge case, useful as default). `PAID`, `FAILED`, `REFUNDED` unchanged.
- **New `paymentMethod` enum.** Values: `UPI_MANUAL`, `COD`, and a placeholder `ONLINE` reserved for a future Cashfree/Razorpay swap-back. Stored on the order at checkout.
- **New env vars.** `UPI_MERCHANT_VPA` (e.g., `hotbox@upi`), `UPI_MERCHANT_NAME` (e.g., `Hotbox Foods`), `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (defaults to `noreply@hotbox.networkbase75.site`).
- **Update the rider APK + rider web client.** Pickup screen shows "✓ Already paid (online)" or "⚠ COLLECT CASH ₹X" depending on `paymentMethod`. After tapping "Delivered" for a COD order, the prompt "Did the customer pay cash?" appears. Yes → marks PAID + DELIVERED atomically. No → marks DELIVERED with paymentStatus unchanged and notifies admin.
- **Payment proof storage.** Screenshot files saved at `/uploads/<orderId>-payment.<ext>` via a Coolify volume mount; served from `/api/orders/[id]/payment-proof` with auth gate (only the order's customer + admins can fetch).
- **Resend integration scoped to login emails only.** Used for password-reset link delivery and (optional, env-toggled) welcome verification. **NOT** used for order-status emails — the in-app live tracking IS the customer notification. If `RESEND_API_KEY` is unset, password reset falls back to console logging (visible via `coolify application_logs`).
- **Existing `customer-ordering`, `order-lifecycle`, `restaurant-operations`, `rider-mobile-app` capabilities** all get small modifications captured as delta specs in this change.

## Capabilities

### New Capabilities

- `email-password-auth`: Email + password signup, login (by email OR phone), logout, and password reset via Resend-delivered link. Phone is collected at signup, normalized to E.164, stored as the unique identity key. Passwords are bcrypt-hashed (cost 10), session is a 30-day HS256 JWT in an HttpOnly cookie (or Bearer header for native clients). Reset tokens are 32-byte random, hashed at rest, 1-hour expiry, single-use.
- `manual-payment-verification`: Static-UPI-QR + UTR submission + admin verification workflow. A merchant VPA configured in env. At checkout customer picks "Pay now via UPI" or "Cash on delivery". For UPI the customer pays externally, returns to the order page, submits the UTR (required) + optional screenshot, lands in AWAITING_VERIFICATION. Admin verifies in the order inbox; verified moves to PAID, rejected moves to FAILED with reason, "ask for new proof" returns control to the customer.

### Modified Capabilities

- `customer-ordering`: replaces phone-OTP login with email+password (login by email or phone). Adds the payment-method selection step at checkout and the post-checkout pay page for UPI orders.
- `order-lifecycle`: expands `paymentStatus` enum (adds `AWAITING_VERIFICATION`, `COD`); adds `paymentMethod` enum; relaxes the "order can only be PLACED when PAID" rule — orders can now be PLACED while `AWAITING_VERIFICATION` or `COD`. The transition to PAID happens via admin verification (UPI) or rider's "did customer pay cash" confirmation (COD).
- `restaurant-operations`: adds the payment verification screen (`/admin/orders/[id]/verify-payment`) and the "needs verification" badge on the inbox.
- `rider-mobile-app`: adds the "Already paid" vs "COLLECT CASH ₹X" badge on the pickup screen, and the "did the customer pay cash?" prompt after "Delivered" tap for COD orders.

## Impact

- **Code**: ~12 new files (auth lib, auth routes, signup/login/reset pages, pay page, admin verify page, payment proof upload route), ~6 deleted files (Cashfree). ~4 modified files (state machine helper, checkout action, rider home, admin inbox). One Prisma migration adding 2 columns to `users`, 1 new table, 2 enum changes, 2 nullable columns on `orders`. New env vars wired in Coolify.
- **Dependencies**: Add `bcryptjs` (already present), `resend`, `qrcode` (already present). Remove `@cashfreepayments/cashfree-js`.
- **DB**: One additive migration (no data loss). The `otp_codes` table is left in place but unused; can be dropped later.
- **External services**: NEW account at resend.com (free 100 emails/day) + 3 DNS records on `hotbox.networkbase75.site`. REMOVED Cashfree dependency. REMOVED MSG91 dependency. Net: -1 external service overall.
- **Coolify**: Add env vars `UPI_MERCHANT_VPA`, `UPI_MERCHANT_NAME`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`. Remove `CASHFREE_*`, `MSG91_*`. Add a volume mount at `/app/uploads` for payment-proof files (10 MB cap is generous; each file is ≤ 2 MB).
- **Risk**: Admin throughput on payment verification — if the restaurant gets 20+ orders/min, manual UTR matching becomes a bottleneck. Acceptable for v1 demo; flagged for future automation (bank webhook auto-match). Fake screenshots remain possible — UTR-based primary verification mitigates this (admin can search the UTR in their UPI app); screenshot is secondary evidence only.
- **Sequencing**: This change supersedes parts of `hotbox-demo-finish-line` Phase 1 (the credential setup is now Resend + UPI VPA, not Cashfree + MSG91). Apply order: this change first, then Phase 1 of the finish-line picks up with the new credentials, then Phases 2-6 land unchanged.
- **Migration**: Drop+recreate the demo DB (no real users yet). The Prisma migration is generated locally + committed; the existing `prisma migrate deploy` Dockerfile flow applies it on next container start.
- **Out of scope (deferred to future changes)**: Bank-statement-based auto-verification (parsing transaction CSVs / webhook from a UPI BBPS provider). Email verification gating at signup (currently optional and unwired). SMS-based password reset. Two-factor authentication. Admin-side bulk UTR verification by CSV upload.
