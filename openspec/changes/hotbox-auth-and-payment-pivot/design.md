## Context

The `hotbox-food-delivery` change shipped phone-OTP auth and Cashfree-gated checkout. Both turn out to be operational headaches: OTP needs MSG91 credits to be usable beyond dev-console fallback, Cashfree needs a real merchant KYC before sandbox creds make sense for a demo. The operator wants a fully self-contained demo that requires only a Resend signup + 3 DNS records for the email auth, and a single UPI VPA configured as an env var for payments — zero payment-gateway integration.

Every Indian SMB restaurant we want to sell this to already pays-and-collects via the exact workflow this change formalizes: static UPI QR posted at the counter / on the website, customer scans, customer sends UTR or screenshot via WhatsApp, owner verifies in their phonepe/gpay app, owner replies "received". We're formalizing that flow into the product instead of fighting it.

This design covers the auth pivot, the payment pivot, and the admin/rider UX adjustments together — they're intertwined (rider needs to know if cash is owed; admin needs to verify UPI proof; both depend on the new `paymentMethod` enum).

## Goals / Non-Goals

**Goals:**

- A user can sign up with email + password + phone in one screen and immediately place an order.
- Login accepts email OR phone (same field, format-sniffed).
- Password reset link arrives via Resend; if Resend isn't configured, the link is logged to the container so the operator can recover for the demo.
- Customer picks at checkout: pre-pay UPI (online verification) OR cash on delivery.
- UPI flow shows a real, scannable QR; collects a UTR; lets the customer optionally upload a screenshot.
- Admin verifies UPI proof in 1-2 clicks per order.
- Rider sees an unambiguous "paid online" vs "collect cash ₹X" badge.
- Rider's "Delivered" tap for COD orders gates marking PAID via a Yes/No prompt.
- Cashfree and OTP code paths are fully removed (not left as dead code), so the runtime image is smaller and there's no confusion about which is "real."

**Non-Goals:**

- Bank webhook auto-verification (matching UTRs against an actual bank statement).
- Two-factor authentication.
- Magic-link login (email-based passwordless).
- Email-verification gate before ordering (it's optional in v1).
- Order-status notification emails (live tracking is the notification mechanism).
- Multi-currency, multi-VPA, marketplace splits.
- A "save card / saved UPI VPA" customer feature.

## Decisions

### D1 — Phone-as-identity, email-as-credential

**Decision:** `users.phone` stays the unique identity key. `users.email` is added as a unique nullable column for login + reset. `users.passwordHash` is bcrypt cost 10. Phone CANNOT be changed via the app in v1 (admin can update it via SQL if needed); email CAN be updated (out of v1 UI but the column allows it).

**Rationale:** Orders, addresses, carts, and rider records all FK to `users.id` which is derived from phone-at-signup. Treating phone as identity preserves order history through any future email changes. It also matches the operator's "bind data to mobile no" requirement literally.

**Alternatives considered:**

- *Email-as-identity, phone optional* — rejected. Order history needs a stable identifier the operator can search by; phone is what the operator already uses for WhatsApp communications.
- *Both fields immutable after signup* — rejected. Email mutability is a future quality-of-life feature; locking it now creates a support headache later.

### D2 — Login by email OR phone (single field)

**Decision:** The `/login` page has one "Email or phone" field plus a password field. The server sniffs the format: if the input contains `@` it's email; if it looks like an Indian phone (`+91XXXXXXXXXX`, `91XXXXXXXXXX`, or `XXXXXXXXXX` with leading 6-9) it's phone; otherwise rejected.

**Rationale:** Customers don't read field labels carefully. One field reduces friction. Indian app users frequently sign in with whichever credential they remember at the moment.

**Alternatives considered:**

- *Two separate tabs (Email / Phone)* — rejected. Adds a click + cognitive load.
- *Auto-detect via JS as you type and swap the icon* — rejected. Server-side sniffing is enough; client-side complexity is wasted.

### D3 — Password reset via Resend; console fallback

**Decision:** When the customer submits the "forgot password" form, the server generates a 32-byte random token (stored as bcrypt hash in `password_reset_tokens` with 1-hour expiry, single-use), constructs a reset URL `${PUBLIC_BASE_URL}/reset/<token>`, then:

- If `RESEND_API_KEY` is set → sends a transactional email via Resend with the link.
- If not → logs the link to `console.log` so the operator can pull it from `coolify application_logs`.

In both cases the API response to the form is the same neutral message: "If that email exists, we sent a link." (Resists account-enumeration.)

**Rationale:** Demo works zero-setup; production-quality flow with a 15-minute Resend signup.

**Alternatives considered:**

- *SMS reset via MSG91* — rejected. MSG91 was just removed; not bringing it back.
- *Security questions* — rejected. 1990s UX.
- *Admin-only reset (operator manually resets via DB)* — rejected. Doesn't scale beyond the operator.

### D4 — Two payment methods only: UPI_MANUAL and COD

**Decision:** Checkout offers exactly two radio options:

```
   ⦿ Pay now via UPI
   ◯ Pay on delivery (cash)
```

`paymentMethod` enum has those two values plus a `ONLINE` value reserved for a future Cashfree/Razorpay swap-back (not surfaced in v1 UI).

**Rationale:** Matches Indian SMB norms. Adds enough optionality without paralyzing the customer.

**Alternatives considered:**

- *Only UPI_MANUAL (no COD)* — rejected. Loses ~30% of Indian food-delivery customers who prefer cash.
- *Three options (UPI + COD + "I'll send you a screenshot via WhatsApp")* — rejected. The third option doesn't add value over UPI_MANUAL.

### D5 — UTR is the required input; screenshot is optional

**Decision:** UTR (12-digit alphanumeric UPI reference number) is the primary input for UPI_MANUAL verification. Screenshot is an optional supplementary upload (PNG/JPEG/WebP, ≤ 2 MB). Admin verification UI shows both side-by-side but flows around the UTR.

**Rationale:** UTRs are independently verifiable (admin searches their UPI app's transaction history). Screenshots are not — they can be photoshopped or reused. Treating UTR as primary forces admins to verify against reality, not against an image.

**Alternatives considered:**

- *Screenshot required, UTR optional* — rejected. Lowers verification quality.
- *Auto-extract UTR from screenshot via OCR* — rejected. Tesseract-quality OCR is unreliable; an actual UPI-receipt-OCR service costs money.

### D6 — UPI QR built from `upi://pay` URI

**Decision:** The QR encodes a UPI deep-link URI:

```
   upi://pay?pa=<UPI_MERCHANT_VPA>&pn=<UPI_MERCHANT_NAME>&am=<rupees>&tn=<orderId>&cu=INR
```

Rendered as inline SVG via the existing `qrcode` npm package (already in deps for the rider APK install QR). The `tn` (transaction note) embeds the order id so the admin can match.

**Rationale:** This is the universal UPI standard. Any UPI app (PhonePe, GPay, Paytm, BHIM, etc.) recognizes it. The order-id in the note gives the admin a tiebreaker when amounts overlap.

**Alternatives considered:**

- *Image upload of a static QR provided by the merchant* — rejected. Doesn't carry amount/note. Customer might pay wrong amount.
- *Dynamic QR via a payment processor* — rejected. That's literally what Cashfree provides and we're moving away from that.

### D7 — Static merchant VPA in env var, not per-restaurant column

**Decision:** Single VPA stored in `UPI_MERCHANT_VPA` env var. The restaurant-level data model is unchanged (no new column).

**Rationale:** Hotbox is one restaurant. Per-restaurant VPAs are a multi-tenant feature; multi-tenancy is deferred.

**Alternatives considered:**

- *`restaurants.upi_vpa` column* — rejected. Adds schema complexity for a single-restaurant demo.

### D8 — Rider confirms COD payment at "Delivered" via Yes/No prompt

**Decision:** When a rider taps "Delivered" on a COD order:

- The native APK / web client shows a modal: "Did the customer pay cash? [Yes ₹X received] [No — flag admin]"
- "Yes" calls `/api/rider/order/[id]/delivered` with `cashCollected: true`; server marks both `state = DELIVERED` and `paymentStatus = PAID` in one transaction.
- "No" calls the same endpoint with `cashCollected: false`; server marks `state = DELIVERED` but leaves `paymentStatus = COD`. The order shows up in admin as "needs followup" (special list).

For UPI_MANUAL orders that are already PAID (verified before delivery), the prompt is skipped — straight to DELIVERED.

**Rationale:** The rider IS the only person who knows if cash was handed over. Putting the decision in their hands is faster than asking admin to chase. The "No" path doesn't block delivery completion — order is delivered, just flagged.

**Alternatives considered:**

- *Admin marks all COD orders paid post-facto* — rejected. Slow, error-prone.
- *Rider must have payment confirmed before tapping Delivered* — rejected. Blocks delivery flow if customer is unreachable for a moment.

### D9 — Payment proof storage in a Coolify volume mount

**Decision:** Add a Coolify volume at `/app/uploads` (persists across deploys). Screenshots saved as `/app/uploads/<orderId>-payment.<ext>` (extension derived from MIME type). Served via `GET /api/orders/[id]/payment-proof` with auth gate (only the order's customer + admins). File size cap 2 MB; allowed types: image/jpeg, image/png, image/webp.

**Rationale:** Simplest persistent storage that survives container restarts. No S3/R2 setup, no DB bloat. Single-server demo doesn't need horizontal scaling.

**Alternatives considered:**

- *Postgres BYTEA column* — rejected. Bloats DB backups.
- *Cloudflare R2* — rejected. Yet-another-credential. Defer to v2 if real scale demands it.

### D10 — Resend used ONLY for login-related emails

**Decision:** Resend sends:

- Password reset link
- (Optional, env-toggled) Welcome email with optional verification link

Resend does NOT send:

- Order confirmation
- Order accepted / cooking / out for delivery / delivered
- Payment received
- Cancellation notice

In-app live tracking IS the customer notification.

**Rationale:** Operator explicit ask. Reduces email volume (stays well within Resend's 100/day free tier). Matches the demo's "live in-app" feel — customers don't expect email from food delivery in 2026.

**Alternatives considered:**

- *Email all status changes* — rejected per operator.
- *No emails at all* — rejected. Password reset without email is hard to deliver.

### D11 — paymentStatus values: PENDING / AWAITING_VERIFICATION / COD / PAID / FAILED / REFUNDED

**Decision:** Expand the enum from 4 to 6 values. Semantics:

| Value                  | Meaning                                                                                |
|------------------------|----------------------------------------------------------------------------------------|
| `PENDING`              | Order created, customer hasn't picked a method yet (edge case / default)              |
| `AWAITING_VERIFICATION`| Customer chose UPI, submitted UTR, admin hasn't verified                              |
| `COD`                  | Customer chose cash on delivery; will be PAID when rider confirms cash collection      |
| `PAID`                 | Verified (UPI admin-verified, OR rider confirmed cash collected)                       |
| `FAILED`               | Admin rejected UPI proof; customer can re-submit                                       |
| `REFUNDED`             | Cancelled paid order (manual; not a v1 UI flow)                                        |

`paymentMethod` enum (separate from status):

| Value         | Meaning                                                |
|---------------|--------------------------------------------------------|
| `UPI_MANUAL`  | Static QR + UTR flow                                   |
| `COD`         | Cash on delivery                                       |
| `ONLINE`      | Reserved for future Cashfree/Razorpay (not in v1 UI)   |

**Rationale:** Cleanly separates "how is the customer paying" (method) from "where in the payment lifecycle are we" (status). Tooling everywhere reads `paymentStatus` for UI badges and `paymentMethod` for behavior branches.

### D12 — Order can be PLACED without PAID

**Decision:** Relax `order-state` transition guards: an order is PLACED when checkout completes, regardless of `paymentStatus`. The state machine no longer requires PAID to enter PLACED.

**Rationale:** UPI_MANUAL orders are placed BEFORE payment verification (so the kitchen can start prep optimistically or wait, restaurant's choice). COD orders are placed without any prior payment by definition.

**Risk mitigation:** Admin sees the `paymentStatus` badge on every inbox card. They can choose to accept-and-cook on AWAITING_VERIFICATION (trust-but-verify) or wait for PAID. UI nudges toward the trust-and-cook path with the "needs verification" badge giving them an at-a-glance signal.

### D13 — Drop, don't deprecate, the OTP code

**Decision:** Delete the OTP files outright (not behind a feature flag). Keep the `otp_codes` table in the schema temporarily (Prisma migration to drop it is a follow-up).

**Rationale:** Dead code rots. A clean delete reduces grep noise and bundle size. The table stays only because dropping a table in Prisma requires a migration we'd rather batch.

### D14 — bcryptjs cost 10, 30-day JWT, password min 8 chars

**Decision:**

- `bcrypt.hash(password, 10)` — 10 is the right balance of security and speed (~75ms on the VPS hardware).
- JWT TTL 30 days — long enough to feel "stay signed in," short enough to limit damage from a stolen token.
- Password requirements: minimum 8 characters, no other rules (no special-char requirement, no zxcvbn meter).

**Rationale:** All are well-trodden defaults. Heavier requirements add friction without much real security benefit at demo scale.

### D15 — Resend domain is `hotbox.networkbase75.site`

**Decision:** Send password reset / welcome emails from `noreply@hotbox.networkbase75.site`. Add the 3 DNS records (DKIM, SPF, return-path) to the existing Cloudflare zone.

**Rationale:** No new domain to buy. Subdomain-from-existing-zone is the lowest-friction path.

## Risks / Trade-offs

- **[Risk] Fake screenshots fooling the admin.** → Mitigated by UTR being primary evidence (independently verifiable in admin's UPI app history). Documented in admin help text: "always cross-check UTR in your UPI app."

- **[Risk] Customer submits wrong UTR (typo or pasting a different transaction's UTR).** → Admin marks "Reject — ask for new proof"; customer's pay page surfaces the rejection with a "submit new UTR" form. State stays in `AWAITING_VERIFICATION` (or briefly `FAILED` for messaging).

- **[Risk] Resend free tier (100/day) exhausted on a busy day.** → At demo scale impossible (we send 1-2 emails per signup). At real scale we'd watch the dashboard; upgrade is $20/mo.

- **[Risk] Coolify volume mount data loss on misconfiguration.** → Document the volume creation step in the Coolify app config; verify via `ls /app/uploads` from a scheduled task during smoke test.

- **[Risk] Rider says "customer didn't pay cash" by mistake.** → Order is still marked DELIVERED. Admin gets a "needs followup" badge and can call the customer. The risk window is bounded; no money is lost.

- **[Trade-off] Manual UTR verification puts work on the admin.** → Yes, that's the design. Demo-scale (1-50 orders/day) it's 1-2 minutes total. At higher scale, this is the upgrade path to a real payment gateway.

- **[Trade-off] Two-radio checkout adds one click vs OTP days.** → Acceptable. The radio is the value: customer picks how they want to pay, which is a real signal.

- **[Trade-off] Email auth means customer must know an email they have access to.** → Indian SMB customers in 2026 universally have email (Gmail/Yahoo). Phone-as-fallback-login mitigates if they forget which email they used.

## Migration Plan

This change runs **before** Phase 1 of `hotbox-demo-finish-line`. Apply order:

1. Land this change's schema migration (`prisma migrate dev --name auth_and_payment_pivot`).
2. Drop the existing `hotbox-postgres` instance and recreate (no real users exist yet; the empty migration record problem we hit before is avoided by starting fresh).
3. Update Coolify env vars: ADD `UPI_MERCHANT_VPA`, `UPI_MERCHANT_NAME`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`. REMOVE `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY`, `CASHFREE_WEBHOOK_SECRET`, `CASHFREE_ENV`, `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID`, `MSG91_SENDER_ID`, `OTP_PROVIDER`.
4. Add Coolify volume mount at `/app/uploads`.
5. Trigger redeploy.
6. Smoke test signup → login → reset → UPI checkout → COD checkout → admin verify → rider COD prompt — all from the operator's phone.

After this change lands, `hotbox-demo-finish-line` Phase 1 picks up with the new credentials list and the same end-to-end smoke test, just using the new payment flows.

**Rollback:** Each commit is git-revertable. The schema migration is additive (no column drops), so reverting to the prior code on the same DB is safe — orders default to `paymentMethod = COD` if the column exists but isn't read.

## Open Questions

- **Q1 — Operator's UPI VPA + display name.** To set during apply.
- **Q2 — Resend account.** Operator signs up at resend.com, adds the 3 DNS records to the Cloudflare zone, copies the API key into chat.
- **Q3 — Should we ship an "admin override" button to mark any order PAID without UPI verification (in case the customer paid via a channel we don't track, like physical cash to the owner directly)?** Recommendation: yes, behind a "Force mark PAID" action with a required note field. Add to admin order detail.
- **Q4 — What happens if rider taps "Delivered" on a UPI_MANUAL order that's still AWAITING_VERIFICATION?** Recommendation: allow the transition (delivery is physical fact); admin still needs to verify the payment afterwards. The order shows "delivered, payment pending" — rare edge case but possible if admin was slow.
- **Q5 — Email verification — gated or optional?** Recommendation: optional in v1. Send the welcome email with verification link; don't gate anything on the click.
