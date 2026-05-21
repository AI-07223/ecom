# medusa-admin-provisioning Specification

## Purpose
TBD - created by archiving change wire-tenant-catalogs. Update Purpose after archive.
## Requirements
### Requirement: Admin user provisioning is scriptable and idempotent
The platform SHALL provide a documented way to provision the Medusa admin user from a clean state without requiring UI interaction. The credentials SHALL be read from environment variables (`MEDUSA_ADMIN_EMAIL`, `MEDUSA_ADMIN_PASSWORD`).

#### Scenario: First-run admin user creation
- **WHEN** the operator runs `npm run admin:create` on a freshly migrated database with `MEDUSA_ADMIN_EMAIL` and `MEDUSA_ADMIN_PASSWORD` set
- **THEN** a Medusa admin user is created and a confirmation is printed; subsequent admin API calls authenticate with those credentials

#### Scenario: Re-running on an existing user is safe
- **WHEN** `npm run admin:create` runs and a user with the configured email already exists
- **THEN** the command reports "already exists" and exits 0 without modifying the user

### Requirement: Admin API client provides token caching and tenant-scoped helpers
The platform SHALL expose an `AdminApiClient` TypeScript class that handles JWT authentication, in-memory token caching with refresh, and typed wrappers for the admin endpoints used by provisioning scripts (sales channels, publishable keys, products, inventory).

#### Scenario: Token cache reuses across calls within TTL
- **WHEN** two consecutive admin API calls happen within the cached token's TTL window
- **THEN** the second call MUST NOT issue a fresh `/auth` POST; both requests share the cached Bearer token

#### Scenario: Expired token triggers automatic re-auth
- **WHEN** an admin API call is made after the cached token's TTL has expired
- **THEN** the client transparently re-authenticates and retries the call once before surfacing any error

### Requirement: Admin credentials never reach the browser
The admin email and password SHALL only exist in server-side code paths (Node scripts, Medusa backend). They SHALL NOT appear in any client-shipped JavaScript bundle, in `NEXT_PUBLIC_*` env vars, or in any HTML response from the storefront.

#### Scenario: Production build contains no admin credentials
- **WHEN** the storefront's production build is inspected
- **THEN** the string of the configured `MEDUSA_ADMIN_PASSWORD` MUST NOT appear in any `.js` or `.html` file under `apps/storefront/.next/`

