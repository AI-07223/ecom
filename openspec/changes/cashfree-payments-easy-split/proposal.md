## Why

A cart that never accepts payment isn't a store. This change integrates Cashfree as the payment rail so customers can complete a purchase end to end, and money lands in the right client's bank account. We start with Cashfree's **Easy Split** model — the platform is the merchant of record, payments come into the platform's Cashfree account, and Easy Split routes each payment to the destination client's bank in a single transaction. This lets you onboard a new client in minutes (no per-client Cashfree KYC) and graduate clients to their own sub-merchant accounts later if they want their own name on bank statements.

## What Changes

- Add a custom Medusa payment provider module (`apps/backend/src/modules/payment-cashfree/`) implementing Medusa v2's payment provider interface and registering with the existing `payment` module.
- The provider creates a Cashfree Order on `initiatePayment`, returns the payment session token to the storefront, and verifies + captures via Cashfree webhooks on `authorizePayment` / `capturePayment`.
- Add a "Payment" step at the end of the checkout flow (extends the previous change) that loads Cashfree's Drop-In SDK with the session token. UPI, cards, netbanking, and wallets are all enabled.
- Wire **Easy Split** vendor routing: the `tenants` table gets a new column `cashfree_vendor_id`; if non-null, payment splits route that share to the tenant's vendor bank account; remaining balance settles to the platform's account as the agency fee.
- Add a `cashfree_vendors` provisioning step in `scripts/seed-tenants.ts` (or its successor): for each tenant, create a Cashfree vendor record via the Easy Split API and store the returned vendor id.
- Add a webhook handler at `/api/cashfree/webhook` that verifies the Cashfree signature, finds the matching payment session, and tells Medusa to mark the payment captured or failed.
- Add an admin-side configuration: per-tenant `agency_fee_bps` (basis points) controlling how much of each transaction routes back to the platform vs the client. Default: 500 (5%).

## Capabilities

### New Capabilities
- `cashfree-payment-provider`: A Medusa v2 payment provider that talks to Cashfree's PG API for create-order, payment-session, capture, and refund.
- `easy-split-routing`: Per-tenant vendor IDs and an agency-fee policy that splits each captured payment between the tenant's bank and the platform's bank in one Cashfree transaction.
- `cashfree-webhooks`: Signed webhook handling for payment status updates (captured, failed, refunded) and the corresponding Medusa state updates.

### Modified Capabilities
- `checkout-flow`: Adds a final "Payment" step that defaults to Cashfree.

## Impact

- **Code**: New Medusa payment provider module, new webhook route handler, new "Payment" step UI in the storefront, new vendor-provisioning step in the seed script.
- **Dependencies**: `@cashfreepayments/cashfree-pg` (server SDK) and the Drop-In JS loaded from Cashfree's CDN (no npm dep for browser side).
- **DB**: Adds `tenants.cashfree_vendor_id` and `tenants.agency_fee_bps` columns via a new platform migration.
- **Infra**: New env vars: `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY`, `CASHFREE_WEBHOOK_SECRET`, `CASHFREE_ENV` (`sandbox` | `production`). The platform's Cashfree merchant must already be KYC-complete; client bank accounts are added as Easy Split vendors via API (no per-client KYC for Easy Split below the regulatory threshold; clients above must do their own KYC).
- **Risk**: This handles real money. Sandbox-first with full webhook + refund coverage; tasks.md will require a runbook for refund handling and a test that intentionally fails a payment and verifies the order is left in `payment_failed` state.
- **Graduation path**: When a tenant outgrows Easy Split (e.g. brand on bank statements matters), this change's data model already supports a `cashfree_merchant_id` column on `tenants` that flips the provider to "use the tenant's own Cashfree merchant credentials." That migration is a later change, not this one.
