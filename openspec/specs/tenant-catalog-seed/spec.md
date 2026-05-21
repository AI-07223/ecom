# tenant-catalog-seed Specification

## Purpose
TBD - created by archiving change wire-tenant-catalogs. Update Purpose after archive.
## Requirements
### Requirement: Seed creates one sales channel per tenant
The seed script SHALL ensure each tenant row corresponds to exactly one Medusa sales channel. If a sales channel with the tenant's expected name does not exist, the script creates one; if one already exists, it reuses the id without modification.

#### Scenario: Fresh seed creates new sales channels
- **WHEN** `npm run seed` runs against a fresh Medusa database
- **THEN** two new sales channels named "Acme" and "Globex" exist, each with a unique id, and those ids are written back to the matching `tenants.sales_channel_id` rows

#### Scenario: Re-seed reuses existing sales channels
- **WHEN** `npm run seed` runs a second time against the already-seeded database
- **THEN** no new sales channels are created; the existing Acme and Globex channel ids are confirmed in the `tenants` rows

### Requirement: Seed creates one publishable API key per sales channel
The seed script SHALL ensure each sales channel has exactly one publishable API key attached, titled `<tenant-slug>-storefront`. The key value SHALL be written to `tenants.publishable_api_key` for the matching tenant.

#### Scenario: Each tenant has a unique key bound to its channel
- **WHEN** the seed completes
- **THEN** `tenants.publishable_api_key` is populated for both tenants with distinct, non-empty key values; each key is associated with exactly the matching tenant's sales channel in Medusa's publishable_api_key_sales_channel join table

#### Scenario: Re-seed does not create duplicate keys
- **WHEN** the seed runs a second time
- **THEN** the `publishable_api_key` table has no new rows; the existing keys are reused

### Requirement: Seed creates at least three demo products per tenant
The seed script SHALL create at least three products per tenant's sales channel using stable handles of the form `<tenant-slug>-1`, `<tenant-slug>-2`, `<tenant-slug>-3`. Each product SHALL have a title, description, and a default variant with an INR price.

#### Scenario: Acme storefront renders three Acme products
- **WHEN** the storefront is loaded at `acme.localhost:3000` after `npm run seed`
- **THEN** the product grid renders at least three products whose handles start with `acme-`

#### Scenario: Globex products do not appear on Acme storefront
- **WHEN** the storefront is loaded at `acme.localhost:3000`
- **THEN** no product with a handle starting with `globex-` is present in the rendered HTML

#### Scenario: Re-seed produces idempotent product set
- **WHEN** `npm run seed` runs twice
- **THEN** each tenant still has exactly three products with handles `<slug>-1`, `<slug>-2`, `<slug>-3` (no duplicates, no extras)

### Requirement: Seed verifies the storefront facade has what it needs
After provisioning, the seed script SHALL run an end-to-end verification step that fetches the products list for each tenant using the same code path the storefront uses (via the commerce facade's `listProducts`) and assert the count is greater than zero.

#### Scenario: Verification step catches provisioning failures
- **WHEN** the publishable key write-back to `tenants` is broken (intentionally simulated)
- **THEN** the seed's verification step detects an empty product list for the affected tenant and exits with a non-zero status code

### Requirement: Default region uses INR currency
The platform SHALL ensure a Medusa region with currency `INR` exists and that every tenant's sales channel is reachable via that region. The seed script SHALL create the INR region if missing and SHALL NOT remove existing regions.

#### Scenario: INR region is present after seed
- **WHEN** the seed completes
- **THEN** a Medusa region with `currency_code = 'inr'` exists, and a fetch of the storefront product list returns products with prices in `inr`

