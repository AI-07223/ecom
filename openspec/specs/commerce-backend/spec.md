# commerce-backend Specification

## Purpose
TBD - created by archiving change scaffold-multitenant-platform. Update Purpose after archive.
## Requirements
### Requirement: Medusa v2 is the commerce backend of record
The platform SHALL run a Medusa v2 application as the single source of truth for catalog (products, variants, prices), customers, carts, and orders. The Medusa application SHALL be a service inside `platform/backend/` with its own `package.json`, started by the platform's docker compose definition.

#### Scenario: Medusa boots cleanly against the platform Postgres
- **WHEN** `docker compose up` is run in the `platform/` directory from a clean state
- **THEN** the Medusa API container reaches a healthy state, having run all pending migrations against the platform Postgres instance

#### Scenario: Medusa version is pinned
- **WHEN** the platform is reinstalled on another machine
- **THEN** the installed Medusa packages match the versions pinned in `platform/backend/package.json` exactly, with no `^` or `~` ranges on Medusa packages

### Requirement: One sales channel per tenant
Every active tenant SHALL correspond to exactly one Medusa sales channel and one Medusa publishable API key. The `tenants.sales_channel_id` and `tenants.publishable_api_key` columns SHALL reference the Medusa records created for that tenant.

#### Scenario: Seed script provisions sales channels per tenant
- **WHEN** the seed script runs against a freshly migrated Medusa instance
- **THEN** the script creates one sales channel and one publishable API key per seeded tenant and persists their identifiers onto the corresponding `tenants` row

#### Scenario: Removing a tenant unbinds its sales channel
- **WHEN** a tenant row's `status` is set to `archived`
- **THEN** the storefront no longer resolves any inbound hostname to that tenant, and the associated Medusa sales channel and publishable key remain in Medusa for audit but receive no traffic from the storefront

### Requirement: Storefront uses the Medusa Store API through a single facade
The storefront SHALL access Medusa exclusively through a single TypeScript facade module (`platform/apps/storefront/lib/commerce.ts`). Application code SHALL NOT import the Medusa SDK directly outside this facade. The facade SHALL fetch products scoped to the tenant's `publishable_api_key`, and on a populated catalog SHALL return non-empty results.

#### Scenario: Product fetch goes through the facade
- **WHEN** a server component needs the product list
- **THEN** it calls a function exported from the commerce facade, which in turn issues the Medusa Store API call using the resolved tenant's publishable key

#### Scenario: Direct Medusa SDK imports are caught
- **WHEN** the storefront source is searched for imports of the Medusa SDK
- **THEN** all such imports occur inside the commerce facade module

#### Scenario: Populated catalog returns products
- **WHEN** the facade's `listProducts({ tenant })` is invoked for a tenant whose `publishable_api_key` has been populated by the seed script
- **THEN** the call returns the seeded products for that tenant's sales channel

### Requirement: Tenant rows are present with theme tokens
The seed script SHALL upsert the demo tenants (`acme.localhost`, `globex.localhost`) with distinct `theme_tokens` and `layout_variant` values into the `tenants` table so the storefront has tenants to resolve on first render.

#### Scenario: Tenants table populated by seed
- **WHEN** `npm run seed` is run
- **THEN** the `tenants` table contains rows with `slug = 'acme'` and `slug = 'globex'`, each with distinct `theme_tokens` JSON and `layout_variant` values

#### Scenario: Empty state is graceful when catalog is not yet wired
- **WHEN** a tenant's `publishable_api_key` is NULL (the case immediately after `npm run seed` until the follow-up catalog change lands)
- **THEN** the storefront home page renders an empty-state message rather than throwing, and the brand tokens still render visibly

> **Deferred to a follow-up change**: per-tenant sales-channel provisioning, publishable API key creation, and per-tenant product catalogs require the Medusa admin API (which has its own auth surface). The current scaffolding change leaves `sales_channel_id` and `publishable_api_key` NULL on each tenant row; the storefront proxy, resolver, theming, layout variants, and commerce facade are all wired and ready to consume those values once the follow-up lands.

