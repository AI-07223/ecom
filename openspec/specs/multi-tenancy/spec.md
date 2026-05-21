# multi-tenancy Specification

## Purpose
TBD - created by archiving change scaffold-multitenant-platform. Update Purpose after archive.
## Requirements
### Requirement: Tenant record as source of truth
The system SHALL store every tenant as a row in a `tenants` table in the platform Postgres database, containing at minimum: a stable id, a unique `slug`, a unique `domain` (lowercased), a `sales_channel_id` referencing a Medusa sales channel, a `publishable_api_key`, a `theme_tokens` JSONB column, a `feature_flags` JSONB column, a `status` value (`active`, `suspended`, or `archived`), and `created_at` / `updated_at` timestamps. Both `domain` and `sales_channel_id` MUST have unique constraints.

#### Scenario: Tenant row uniquely identifies a brand
- **WHEN** the seed script inserts two demo tenants with domains `acme.localhost` and `globex.localhost`
- **THEN** both rows persist with distinct ids, distinct `sales_channel_id` values, distinct `publishable_api_key` values, and the queries `SELECT * FROM tenants WHERE domain = 'acme.localhost'` and `SELECT * FROM tenants WHERE domain = 'globex.localhost'` each return exactly one row

#### Scenario: Duplicate domain insert is rejected
- **WHEN** a second row is inserted with a `domain` value that already exists
- **THEN** the insert MUST fail with a unique-constraint violation and no second row is created

### Requirement: Resolve tenant by hostname on every request
The storefront SHALL extract the `host` header from each incoming HTTP request, strip any trailing port, lowercase the value, and resolve it to exactly one tenant row before any page or API handler runs. Resolution SHALL be performed in Next.js middleware so all routes share the same logic.

#### Scenario: Known hostname resolves to its tenant
- **WHEN** a request arrives with `Host: acme.localhost:3000`
- **THEN** middleware resolves the request to the tenant whose `domain` equals `acme.localhost` and attaches that tenant's id to the request context

#### Scenario: Unknown hostname is rejected
- **WHEN** a request arrives with a `Host` value that matches no row in `tenants`
- **THEN** middleware responds with HTTP 404 and the response body identifies the unknown host; downstream route handlers MUST NOT execute

#### Scenario: Hostname comparison is case- and port-insensitive
- **WHEN** a request arrives with `Host: ACME.localhost:3000` or `Host: acme.localhost`
- **THEN** middleware resolves both to the tenant whose `domain` is `acme.localhost`

### Requirement: Tenant resolution is cached in process
The middleware SHALL cache hostname-to-tenant lookups in an in-process map keyed by the normalized host string with a time-to-live of 60 seconds. Cache misses SHALL fall through to a Postgres query against the `tenants` table.

#### Scenario: Repeat requests within TTL hit the cache
- **WHEN** the same hostname is requested twice within a 60-second window
- **THEN** only the first request issues a Postgres query for the tenant lookup; the second request resolves from the in-process cache

#### Scenario: Cache expires after TTL
- **WHEN** more than 60 seconds elapse between two requests for the same hostname
- **THEN** the second request issues a fresh Postgres query

### Requirement: Tenant context exposed via typed helper
The storefront SHALL expose a typed `getTenant()` helper that returns the resolved tenant for the current request. Application code SHALL access the tenant only through this helper and SHALL NOT re-query the `tenants` table inside route handlers, server components, or server actions.

#### Scenario: Server component reads tenant via helper
- **WHEN** a server component calls `getTenant()` during a request whose host resolved to the Acme tenant
- **THEN** the helper returns a `Tenant` object whose `slug` is `acme` without performing any database query

### Requirement: All Medusa calls are scoped to the resolved tenant
The storefront SHALL pass the resolved tenant's `publishable_api_key` to the Medusa Store SDK on every server-side call to Medusa. No code path SHALL hard-code, inline, or default a publishable key independent of the resolved tenant. The commerce facade (`lib/commerce.ts`) is the single chokepoint enforcing this rule.

#### Scenario: Facade rejects calls with no publishable key
- **WHEN** the storefront's commerce facade is invoked for a tenant whose `publishable_api_key` is NULL (the state for newly-seeded tenants before the follow-up catalog change lands)
- **THEN** the facade throws a descriptive error rather than issuing an unscoped Medusa request

#### Scenario: Publishable key never reaches the client bundle
- **WHEN** the production build is inspected
- **THEN** no tenant `publishable_api_key` value appears in any client-shipped JavaScript bundle

### Requirement: Cross-tenant catalog isolation is enforced and tested
The platform SHALL enforce that products fetched for one tenant never appear in another tenant's storefront response, and SHALL include an automated end-to-end test asserting this isolation.

#### Scenario: E2E test passes catalog isolation check
- **WHEN** the catalog-isolation E2E test runs after `npm run seed`
- **THEN** the test fetches both `acme.localhost` and `globex.localhost`, asserts each shows only its own products (handle prefix matches slug), and asserts zero overlap between the two product sets

#### Scenario: E2E test catches a misconfigured tenant
- **WHEN** the seed script writes the wrong `publishable_api_key` to a tenant (simulated by manual edit during a test variant)
- **THEN** the E2E test fails with a clear diagnostic identifying which tenant has the wrong products

### Requirement: Cart and order state never bleed across tenants
The platform SHALL enforce that cart and order resources are scoped to the tenant resolved from the request's hostname. Cookies, server actions, and confirmation pages MUST all respect this boundary.

#### Scenario: Cross-tenant cart attempt is rejected at the API layer
- **WHEN** a server action runs with the Acme tenant context but is handed a cart_id that belongs to Globex
- **THEN** the Medusa Store API rejects the request because the Acme publishable key does not include Globex's sales channel; the storefront treats the response as "cart not found" and creates a fresh cart for Acme

#### Scenario: E2E test covers add-to-cart isolation
- **WHEN** the E2E test suite runs after this change lands
- **THEN** at least one test issues an add-to-cart against `acme.localhost`, captures the cookie, replays it against `globex.localhost`, and asserts the Globex cart is empty (or a new cart is created)

