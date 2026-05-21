## Context

After `scaffold-multitenant-platform` landed, the platform has a working hostname → tenant → theme pipeline, but `tenants.sales_channel_id` and `tenants.publishable_api_key` are NULL for every row. The storefront's commerce facade refuses to call Medusa when those keys are missing (by design — that's how we prevent cross-tenant data leakage), so every storefront renders the empty-state message. This change fills those keys in by talking to Medusa's admin API.

Medusa v2 exposes a REST admin API at `/admin/*` (separate from the publishable-key-scoped `/store/*` API used by the storefront). To call it we need an authenticated admin user — Medusa doesn't auto-provision one. The `medusa user` CLI inside the backend container creates a user; from then on we authenticate via `POST /auth/user/emailpass` to get a JWT and `POST /auth/session` to get a session cookie.

Constraints:
- The seed script must be idempotent. Re-running it must NOT duplicate sales channels, keys, or products.
- Admin credentials must never be committed. They live in `platform/.env` (gitignored) and Coolify env vars.
- The storefront facade already enforces `publishable_api_key` non-null — we just need to populate it. No code changes to the facade.

## Goals / Non-Goals

**Goals:**
- One command (`npm run seed`) brings the seed-after-migrations state to: 2 tenant rows + 2 sales channels + 2 publishable keys + 3+ products per channel + `tenants.sales_channel_id` and `tenants.publishable_api_key` populated.
- Re-running `npm run seed` is a no-op (idempotent at every step).
- A reusable `AdminApiClient` module covers token caching, automatic refresh, and tenant-scoped helpers — usable by future provisioning scripts.
- An E2E smoke test asserts that `acme.localhost` and `globex.localhost` each render exactly their own catalog with zero overlap.

**Non-Goals:**
- A UI for creating tenants (deferred to `tenant-onboarding-cli`).
- Bulk product import (deferred — three demo products per tenant is the baseline).
- Image uploads (deferred to `tenant-file-storage`; demo products use the placeholder gradient).
- Stock/inventory adjustment (Medusa's default inventory is fine).

## Decisions

### D1. Admin user provisioning: one-time CLI step, documented in README

We use the existing Medusa `medusa user -e <email> -p <password>` CLI to create the admin user, run once when standing up a fresh environment. The credentials go into `platform/.env` as `MEDUSA_ADMIN_EMAIL` and `MEDUSA_ADMIN_PASSWORD`.

**Alternative considered**: A migration script that creates the user via direct SQL insert into `medusa_user` table. Rejected because Medusa hashes passwords with a specific Argon2 config that's not stable across versions; CLI does it right.

### D2. Admin API client lives in `platform/scripts/lib/admin-api-client.ts`

A shared TypeScript module the seed script imports. Responsibilities:
- Auth flow: `loginAdmin(email, password)` → caches JWT in-memory for 14 minutes (Medusa default token TTL is 15m; we refresh slightly early).
- Typed wrappers for the endpoints we need: `listSalesChannels`, `createSalesChannel`, `findSalesChannelBySlug`, `createPublishableApiKey`, `addSalesChannelToKey`, `listProducts`, `createProduct`, `createInventoryLevel`.
- All requests carry the `x-publishable-api-key` header NOT (admin endpoints use Bearer JWT) — careful naming so no one accidentally mixes the two surfaces.

**Alternative considered**: Use the `@medusajs/js-sdk` admin client. Rejected because it's tied to the storefront facade's import-only-from-commerce.ts rule, and the seed script is server-only Node code. A thin custom client is 200 lines and avoids the SDK's runtime assumptions about session cookies.

### D3. Idempotency via slug/handle as a stable key

For each tenant slug (acme/globex), the seed script:
1. Lists existing sales channels, looks for one with `name = "Acme"` (slug not stored on Medusa's sales-channel model).
2. If found, reuses its id; if not, creates with `is_disabled = false`.
3. Same for publishable keys (matched by `title = "<slug>-storefront"`).
4. Same for products (matched by `handle = "<slug>-<n>"` like `acme-1`, `acme-2`, `acme-3`).

**Alternative considered**: A `_seed_state` table tracking what was created. Rejected because the natural keys (channel name, key title, product handle) ARE the state — no need to duplicate.

### D4. Products are sales-channel-scoped, not tenant-scoped

Medusa's "products belong to sales channels" model is what we lean on. Each product is added to exactly one tenant's sales channel. The storefront's commerce facade already passes the publishable key, which Medusa uses to filter the product list to that key's sales channels.

**No `tenant_id` on products** — the existing Medusa model is sufficient. If a product needs to appear in multiple tenants' catalogs later (rare), we'd add it to multiple sales channels.

### D5. Default region and inventory: Medusa's initial-data-seed migration already created them

The `apps/backend/src/migration-scripts/initial-data-seed.ts` that ran during the scaffold migration created:
- A default region with currency `INR` (good, since clients are Indian — verify and possibly adjust)
- A default stock location
- Tax regions and rates
- A default sales channel (we'll rename it to platform-default and create new tenant-specific ones alongside)

This change does NOT modify those rows; it ADDS per-tenant resources on top.

Actually — verify the seed creates INR; if it created USD, we'll add an INR-creation step. Medusa's default starter often defaults to EUR.

### D6. E2E smoke test pattern: scripted Playwright or curl + assertions

A new test file `platform/scripts/e2e-catalog-isolation.test.ts` (or under `platform/tests/`) that:
1. Boots the local stack.
2. Runs `npm run seed`.
3. Issues curl requests with `Host: acme.localhost` and `Host: globex.localhost`, parses the rendered HTML.
4. Asserts: each response contains products with handles prefixed by the right slug (`acme-*` vs `globex-*`), and no overlap.
5. Negative test: confirms `Host: acme.localhost` does NOT contain any `globex-*` product handle.

Run via `npm run test:e2e` from the platform root.

**Alternative**: full browser-based Playwright. Heavier. For a single isolation check, curl + DOM regex is enough.

## Risks / Trade-offs

- **Admin password in .env** → Mitigated by gitignore + the documented expectation that `.env` is never committed. Production uses Coolify env vars instead.
- **Medusa region currency may default to EUR**, breaking Cashfree downstream (Cashfree is INR-only). → Verify during implementation; add a "set or create INR region" step in the seed if needed.
- **Sales channel name collisions** if the operator creates a sales channel named "Acme" outside the seed script → Acceptable; seed script logs which channel id it picked and the operator can rename in Medusa admin if confusion arises.
- **Admin JWT in memory only** → If the seed script runs longer than 14 minutes, refresh kicks in. Tested via a delay assertion in the AdminApiClient test.

## Migration Plan

1. Implement and test locally; confirm `acme.localhost` shows 3 Acme products, `globex.localhost` shows 3 Globex products, no overlap.
2. The E2E test becomes the canary for cross-tenant catalog isolation across all future changes.
3. No production data to migrate yet (Coolify deploy comes in a separate change).

## Open Questions

- **Default currency in initial-data-seed.ts**: USD, EUR, or INR? Answer determines whether we add a region-creation step. Will check during implementation. Default plan: if non-INR, create an INR region in seed and attach the sales channels to it.
- **Product images**: skip entirely (placeholder gradient) for now; the next file-storage change handles images. Confirmed in non-goals.
