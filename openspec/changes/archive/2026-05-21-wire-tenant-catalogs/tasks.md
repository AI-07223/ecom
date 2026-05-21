## 1. Admin user + admin API client

- [x] 1.1 Verify Medusa scaffold's `initial-data-seed.ts` migration created a default region with INR currency. If not, add an INR region creation step — verified EUR (default), so an INR region creation step was added to the seed
- [x] 1.2 Add `MEDUSA_ADMIN_EMAIL` and `MEDUSA_ADMIN_PASSWORD` defaults to `platform/.env.example` (placeholders) and `platform/.env` (real values for local dev) — already present from scaffold change
- [x] 1.3 Create an admin user via `medusa user -e ... -p ...` inside the running backend container; verify a user row exists in Postgres
- [x] 1.4 Wrap the admin-user creation as `npm run admin:create` so it's documented and re-runnable; idempotent (detects existing user, exits 0)
- [x] 1.5 Implement `platform/scripts/lib/admin-api-client.ts` exporting an `AdminApiClient` class with: `loginAdmin()`, token cache + auto-refresh, and typed methods for `listSalesChannels`, `createSalesChannel`, `findSalesChannelByName`, `createPublishableApiKey`, `listPublishableApiKeys`, `addSalesChannelToKey`, `listApiKeySalesChannels`, `listProductsByHandle`, `createProduct`, `listRegions`, `findRegionByCurrency`, `createRegion`
- [x] 1.6 Add a Vitest test asserting cache hits within TTL, re-auth on expiry, retry on 401, and error surfacing — 5/5 passing

## 2. Update seed-tenants.ts to use the admin API

- [x] 2.1 Refactor `platform/scripts/seed-tenants.ts` to use the new `AdminApiClient`; the existing tenant-table upsert stays
- [x] 2.2 For each tenant, find-or-create a sales channel named after the tenant's display name; persist `sales_channel_id` to the `tenants` row
- [x] 2.3 For each tenant, find-or-create a publishable API key titled `<slug>-storefront`, attach it to the tenant's sales channel; persist key value to `tenants.publishable_api_key`
- [x] 2.4 Ensure an INR region exists; created via `ensureInrRegion` helper
- [x] 2.5 For each tenant, find-or-create at least 3 products with handles `<slug>-1`, `<slug>-2`, `<slug>-3`; each with a default variant priced in INR
- [x] 2.6 Add a verification step at end of seed that calls the Medusa Store API for each tenant with the tenant's publishable key and asserts the count > 0 and handle prefix matches
- [x] 2.7 Update the final console output to print live storefront URLs after products are confirmed

## 3. Storefront empty-state messaging update

- [x] 3.1 Updated `ProductGrid.tsx` empty-state copy from "Run npm run seed..." to "Add products from the admin to see them here."

## 4. E2E catalog isolation test

- [x] 4.1 Add `platform/scripts/tests/e2e-catalog-isolation.test.ts` using Vitest's runner
- [x] 4.2 Test issues an undici.request with `Host: acme.localhost:3000` (Node fetch strips host header; undici.request honors it), parses returned HTML, asserts ≥3 products with `acme-*` handles (added `data-product-handle` attribute to `ProductCard` for testability)
- [x] 4.3 Same for `Host: globex.localhost:3000` with `globex-*` handles
- [x] 4.4 Negative test: zero `globex-*` handles in Acme response, zero `acme-*` handles in Globex response
- [x] 4.5 Edge case: unknown host `nope.localhost:3000` returns 404 with `unknown_tenant` JSON body
- [x] 4.6 Edge case: case-insensitive host (`ACME.LOCALHOST`) resolves to acme tenant
- [x] 4.7 Edge case: `layout_variant` attribute differs between Acme (compact) and Globex (hero)
- [x] 4.8 Wired `npm run test:e2e` in platform root package.json — all 5 tests pass against the live local stack

## 5. Documentation

- [x] 5.1 Updated `platform/README.md`: added `npm run admin:create` to the quick-start flow before `npm run seed`
- [x] 5.2 Updated the npm scripts table in README to include `admin:create`, `test:scripts`, `test:e2e` and updated the `seed` description to reflect the new provisioning behavior
- [x] 5.3 Run `openspec validate wire-tenant-catalogs --strict`
