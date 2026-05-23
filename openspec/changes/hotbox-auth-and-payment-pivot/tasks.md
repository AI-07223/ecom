## 1. Schema migration

- [ ] 1.1 Add `users.email` (string, unique, nullable for backward compat) and `users.passwordHash` (string, nullable for backward compat) to `prisma/schema.prisma`
- [ ] 1.2 Add `users.emailVerifiedAt` (timestamptz nullable)
- [ ] 1.3 Add new `PasswordResetToken` model: `id, userId, tokenHash, expiresAt, consumedAt?, createdAt` with index `(userId, createdAt)`
- [ ] 1.4 Extend `PaymentStatus` enum with `AWAITING_VERIFICATION` and `COD`
- [ ] 1.5 Add new `PaymentMethod` enum: `UPI_MANUAL`, `COD`, `ONLINE`
- [ ] 1.6 Add to `orders`: `paymentMethod PaymentMethod?`, `paymentProofUtr String?`, `paymentProofFilename String?`, `paymentProofSubmittedAt DateTime?`, `paymentVerifiedAt DateTime?`, `paymentVerifiedNote String?`, `paymentNeedsNewProof Boolean @default(false)`
- [ ] 1.7 Generate migration: `npx prisma migrate diff --from-empty --to-schema-datamodel ./prisma/schema.prisma --script > prisma/migrations/0002_auth_and_payment_pivot/migration.sql` and STRIP THE BANNER from the output (we hit this bug last time)
- [ ] 1.8 Verify migration applies on a fresh DB locally

## 2. Auth library and routes

- [ ] 2.1 Rewrite `lib/session.ts` — keep bcrypt-or-cookie JWT pattern; remove OTP-specific paths if any leaked in
- [ ] 2.2 Write `lib/auth.ts` — `signUp(email, phone, name, password)`, `signIn(identifier, password)`, `requestPasswordReset(email)`, `confirmPasswordReset(token, newPassword)`, `logout()` (cookie clear)
- [ ] 2.3 Write `lib/resend.ts` — thin wrapper around the `resend` npm package; exports `sendPasswordResetEmail({to, resetUrl})` and `sendWelcomeEmail({to, name})`. If `RESEND_API_KEY` is unset, log to console and return success (don't throw).
- [ ] 2.4 Write `app/api/auth/signup/route.ts` — POST handler, returns user shape + optional token
- [ ] 2.5 Write `app/api/auth/login/route.ts` — POST handler, accepts `{identifier, password, requestToken?}`, sniffs email vs phone
- [ ] 2.6 Write `app/api/auth/logout/route.ts` — POST handler, clears cookie
- [ ] 2.7 Write `app/api/auth/reset/request/route.ts` — POST handler, neutral response
- [ ] 2.8 Write `app/api/auth/reset/confirm/route.ts` — POST handler, sets new password + new session

## 3. Auth UI

- [ ] 3.1 Rewrite `app/login/page.tsx` — single "Email or phone" field + password + "Forgot password?" link
- [ ] 3.2 Write `app/signup/page.tsx` — email + phone (+91 prefix UI) + name + password + confirm-password
- [ ] 3.3 Write `app/reset-request/page.tsx` — email field → neutral success banner
- [ ] 3.4 Write `app/reset/[token]/page.tsx` — new password + confirm; server-side token lookup before render to fail fast if expired/consumed
- [ ] 3.5 Update `app/admin/AdminNav.tsx` "Logout" entry → POST to /api/auth/logout

## 4. Remove Cashfree + OTP

- [ ] 4.1 Delete `lib/cashfree.ts`, `app/api/cashfree/webhook/route.ts`, `types/cashfree.d.ts`
- [ ] 4.2 Delete `lib/otp.ts`, `app/api/otp/send/route.ts`, `app/api/otp/verify/route.ts`
- [ ] 4.3 Remove `@cashfreepayments/cashfree-js` from package.json + run `npm install` to update lockfile
- [ ] 4.4 Remove from `hotbox/web/CheckoutClient.tsx` the `import { load } from "@cashfreepayments/cashfree-js"` and the Drop-in code path

## 5. Payment-method selection + UPI flow

- [ ] 5.1 Rewrite `app/_actions/checkout.ts` `startCheckout(input)` to accept `paymentMethod: "UPI_MANUAL" | "COD"` and skip Cashfree entirely; create order with appropriate status; return `{ orderId, paymentMethod }` so client can route correctly
- [ ] 5.2 Update `app/checkout/CheckoutClient.tsx` — add radio cards for the two payment methods, default to UPI_MANUAL; on submit, navigate to `/orders/[id]/pay` (UPI) or `/orders/[id]/confirmation` (COD)
- [ ] 5.3 Implement `app/orders/[id]/pay/page.tsx` server component — fetch order, build UPI URI, render QR via `qrcode` npm package as inline SVG, render breakdown + UPI VPA text + the UTR submission form (client component)
- [ ] 5.4 Implement `app/orders/[id]/pay/PayClient.tsx` — UTR field (12 chars, required), screenshot file input (optional, 2MB cap, image types), submit handler that POSTs to a Server Action `submitPaymentProof`
- [ ] 5.5 Implement Server Action `submitPaymentProof(orderId, utr, screenshotFile?)` — validates, saves screenshot to `/app/uploads/<orderId>-payment.<ext>`, sets `paymentProofUtr/Filename/SubmittedAt` on the order, returns success
- [ ] 5.6 Implement `app/api/orders/[id]/payment-proof/route.ts` — auth-gated file serving (order's customer + admins; 404 otherwise)
- [ ] 5.7 Implement `app/orders/[id]/pay/awaiting/page.tsx` — view shown after UTR submission; polls order status every 5s; transitions to confirmation page when PAID; shows "rejected" view with re-submit if FAILED

## 6. Admin payment verification UI

- [ ] 6.1 Write `app/admin/orders/[id]/verify-payment/page.tsx` — fetches order, renders UTR + screenshot (if present) + the three buttons
- [ ] 6.2 Write Server Actions in `app/_actions/admin-payment.ts`: `verifyPayment(orderId)`, `rejectPayment(orderId, reason)`, `askForNewProof(orderId)`, `forceMarkPaid(orderId, note)`
- [ ] 6.3 Update `app/admin/page.tsx` (inbox) to show "Needs verification" badge on AWAITING_VERIFICATION orders; tab label shows count
- [ ] 6.4 Update `app/admin/page.tsx` to include the "Needs followup" view for `paymentStatus = COD AND state = DELIVERED`

## 7. Rider UX updates

- [ ] 7.1 Update `app/rider/RiderClient.tsx` — payment badge above the pickup card, varying by paymentStatus
- [ ] 7.2 Update `app/rider/RiderClient.tsx` — on Delivered tap for COD, show confirmation modal; on Yes/No call the new endpoint with `cashCollected` flag
- [ ] 7.3 Update `app/api/rider/order/[orderId]/delivered/route.ts` (already exists) — accept optional `{cashCollected: boolean}` body; if true AND paymentMethod=COD, mark PAID in same tx as DELIVERED
- [ ] 7.4 Update `lib/order-state.ts` `transitionOrderState` (or pull cash-handling into a tiny helper called by the rider delivered route) to atomically set DELIVERED + PAID when cashCollected
- [ ] 7.5 Update Expo APK `app/index.tsx` payment badge + Delivered modal mirroring the web; uses the same /api/rider/order/[id]/delivered endpoint

## 8. Coolify + env vars

- [ ] 8.1 ⏸ **AWAITING OPERATOR** — operator pastes UPI VPA + display name (e.g. `hotbox@upi`, `Hotbox Foods`) into chat
- [ ] 8.2 ⏸ **AWAITING OPERATOR** — operator signs up at resend.com (free 100/day) and adds 3 DNS records to Cloudflare for `hotbox.networkbase75.site`, pastes the API key into chat
- [ ] 8.3 Update Coolify env vars via MCP: ADD `UPI_MERCHANT_VPA`, `UPI_MERCHANT_NAME`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL=noreply@hotbox.networkbase75.site`. REMOVE `CASHFREE_*`, `MSG91_*`, `OTP_PROVIDER`.
- [ ] 8.4 Configure Coolify volume mount at `/app/uploads` (persistent storage for payment screenshots)
- [ ] 8.5 Drop + recreate `hotbox-postgres` (no real users yet, clean start; we've done this before)
- [ ] 8.6 Trigger redeploy after schema migration commits

## 9. Smoke test on the live deploy

- [ ] 9.1 ⏸ **AWAITING OPERATOR** — sign up at https://hotbox.networkbase75.site/signup with operator's real email + phone
- [ ] 9.2 ⏸ **AWAITING OPERATOR** — verify ADMIN_PHONE-matched signup gets role = admin
- [ ] 9.3 ⏸ **AWAITING OPERATOR** — place a UPI_MANUAL order, see the QR + breakdown, scan with any UPI app, "pay" (or fake-pay), submit a fake 12-digit UTR
- [ ] 9.4 ⏸ **AWAITING OPERATOR** — verify the order in /admin → click "Verified" → see customer's view flip to PAID
- [ ] 9.5 ⏸ **AWAITING OPERATOR** — place a COD order, accept it as admin, assign a rider
- [ ] 9.6 ⏸ **AWAITING OPERATOR** — as rider, tap Delivered → see the modal → tap "Yes ₹X received" → verify status flips to PAID+DELIVERED
- [ ] 9.7 ⏸ **AWAITING OPERATOR** — try a "No" path: place another COD, deliver with "No — flag admin" → verify admin sees the "Needs followup" row
- [ ] 9.8 ⏸ **AWAITING OPERATOR** — test password reset: log out, click forgot, enter email, check inbox (Resend) for the link, set new password, log back in
- [ ] 9.9 ⏸ **AWAITING OPERATOR** — file any sharp edges as known issues; loop me back to fix them

## 10. Tasks.md update + cross-change cleanup

- [ ] 10.1 Mark hotbox-demo-finish-line's Phase 1 tasks reflecting the new credentials list (Cashfree out, UPI VPA + Resend in)
- [ ] 10.2 Update `hotbox/README.md` env-vars table — remove Cashfree/MSG91, add UPI_MERCHANT_VPA, UPI_MERCHANT_NAME, RESEND_API_KEY, RESEND_FROM_EMAIL
- [ ] 10.3 Update `docs/demo-script.md` — the 5-min walkthrough now includes "pick payment method" step and "verify payment" step
- [ ] 10.4 Update root `CLAUDE.md` Hotbox section to reflect the new auth + payment flows
