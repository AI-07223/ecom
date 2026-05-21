## Why

The existing Next.js + Firebase ecommerce code has hit the Firestore wall (no joins, weak admin tooling, client-side search, manual order/inventory/discount logic). Rather than patching it further, we are rebuilding on a self-hostable headless commerce stack so the same codebase can serve multiple branded client storefronts from one VPS. This first change establishes the foundation — repo layout, services, and the multi-tenant primitives — so every subsequent change has a working platform to extend.

## What Changes

- Add a new `platform/` subdirectory (sibling to the legacy Next.js app) containing the Medusa v2 backend and a fresh Next.js 16 storefront. The legacy Firebase code stays in place untouched and is not removed by this change.
- Introduce a `tenants` table in Postgres as the source of truth for which brand is served on which hostname, with `theme_tokens` and `feature_flags` JSONB columns.
- Add storefront middleware that resolves `request.host` to a tenant on every request and injects the tenant context, theme tokens (as CSS variables), and feature flags into the page render.
- Wire one Medusa "sales channel" per tenant and use the tenant's publishable API key on all storefront → Medusa calls so a tenant only ever sees its own products, orders, and customers.
- Add a local-dev seed script that creates two demo tenants on `acme.localhost` and `globex.localhost` so the multi-tenant behavior is visible end-to-end on day one.
- Define the Coolify service topology (postgres, redis, medusa-api, storefront) as docker-compose so the same set of services boots locally and on the VPS. Other services (MeiliSearch, MinIO, client-admin, worker) are deferred to later changes.
- **BREAKING** for any future code in `platform/`: it does not share auth, schema, or routes with the legacy app. They run side-by-side, not integrated.

Explicitly out of scope (deferred to later changes): Stripe Connect, MeiliSearch, MinIO/S3 storage, the agency-only Medusa admin hardening, the thin per-tenant client-admin UI, the BullMQ worker, the `npm run tenant:create` onboarding script, observability (Sentry/Plausible), backups, and CI/CD wiring. **Also deferred: per-tenant sales channel + publishable API key provisioning, and per-tenant product seeding** — those require the Medusa admin API surface and warrant their own focused change. The current scaffolding leaves `sales_channel_id` and `publishable_api_key` NULL on each tenant row; the storefront empty-state renders gracefully until the catalog change lands. This change is intentionally the smallest thing that proves the architecture works.

## Capabilities

### New Capabilities
- `multi-tenancy`: Resolving an inbound HTTP request to a tenant by hostname, scoping all Medusa calls to that tenant's sales channel, and exposing tenant context (theme tokens, feature flags) to the rendering layer.
- `tenant-theming`: Storing per-tenant brand tokens as JSON, generating CSS variables from those tokens at request time, and applying them to shadcn/ui components without per-tenant code branches.
- `commerce-backend`: Running Medusa v2 as the headless commerce engine of record (catalog, customers, orders) and exposing its Store API to the storefront.
- `platform-infra`: The local + Coolify service topology (Postgres, Redis, Medusa API, storefront) defined as docker-compose so dev and prod are the same set of services.

### Modified Capabilities
None. There are no existing OpenSpec specs to modify — this is the first change in the repo. The legacy Firebase code is not represented as a spec and is not changed by this proposal.

## Impact

- **Code**: New `platform/` subtree. No edits to the existing Next.js + Firebase code under `src/`.
- **Dependencies**: Adds Medusa v2 (`@medusajs/medusa` and friends), a separate `package.json` inside `platform/storefront`, and Docker (for local Postgres/Redis via compose).
- **Infra**: Requires Docker locally; on the VPS, requires Coolify projects for Postgres, Redis, the Medusa API, and the storefront. No production traffic is moved by this change — it stands up the new platform alongside the live site.
- **Operational**: The two stacks coexist. The legacy site keeps serving its current domain; the new platform serves the seeded demo hostnames only until a real tenant is migrated (separate, later change).
- **Risk**: Adds a second long-lived stack to the repo. Mitigated by keeping `platform/` self-contained and by deferring all migration-of-real-data work to its own proposal.
