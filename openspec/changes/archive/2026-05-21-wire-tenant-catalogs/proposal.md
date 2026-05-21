## Why

The `scaffold-multitenant-platform` change left `sales_channel_id` and `publishable_api_key` NULL on every tenant row — the storefront renders an empty-state message instead of products. Without a catalog, the multi-tenant story is invisible to clients and there is nothing to demo. This change closes that gap by wiring per-tenant sales channels, publishable API keys, and a seeded demo catalog into Medusa via its admin API.

## What Changes

- Provision a Medusa admin user on first run (via the `medusa user` CLI inside the backend container) and store the credentials in the platform `.env` so the seed script can authenticate.
- Extend `scripts/seed-tenants.ts` to use Medusa's admin REST API to: (a) create one sales channel per tenant, (b) create one publishable API key per channel, (c) seed 3–6 demo products per channel, and (d) write `sales_channel_id` and `publishable_api_key` back to the matching `tenants` row.
- Make the seed script idempotent — re-running it must not duplicate sales channels, keys, or products. It detects existing resources by tenant slug and updates rather than inserts.
- Add an `admin-api-client.ts` helper module that the seed script and any future provisioning scripts can reuse — handles auth token caching, retry, and tenant-scoped requests.
- Once seeded, the storefront home page renders real products from each tenant's sales channel; the deferred "empty state" message in `ProductGrid.tsx` becomes a fallback for genuine no-products tenants.
- Add an end-to-end smoke test (Playwright or scripted curl) asserting that `acme.localhost` and `globex.localhost` each render a different non-empty product list with no cross-channel bleed.

## Capabilities

### New Capabilities
- `medusa-admin-provisioning`: Provisioning an admin user, authenticating against Medusa's admin API, and managing sales channels + publishable keys + products via API rather than UI.
- `tenant-catalog-seed`: Idempotent per-tenant product seeding tied to the tenant's sales channel.

### Modified Capabilities
- `commerce-backend`: The current "empty-state is acceptable" scenario becomes a "tenants with `publishable_api_key` populated MUST render their own catalog" scenario.
- `multi-tenancy`: Adds a scenario asserting cross-tenant isolation at the catalog level.

## Impact

- **Code**: New `platform/scripts/admin-api-client.ts`, expanded `platform/scripts/seed-tenants.ts`, updated `platform/apps/storefront/components/ProductGrid.tsx` empty-state message.
- **Dependencies**: No new packages — uses `fetch` and existing `pg`.
- **Infra**: First-run requires manually creating the Medusa admin user via `medusa user` inside the container; `npm run seed` then takes over. The CLI step is itself one-shot per environment.
- **Risk**: Admin credentials live in `.env`. Already gitignored; documented in README. For Coolify production these go in the project's environment, never committed.
