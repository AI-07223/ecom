## MODIFIED Requirements

### Requirement: Demo seed produces a non-empty catalog per tenant
The seed script SHALL create at least three demo products per tenant attached to that tenant's sales channel, write the resulting `sales_channel_id` and `publishable_api_key` back to the matching `tenants` row, and verify the storefront facade renders the products for each tenant. Re-running the seed SHALL be idempotent — no duplicate sales channels, keys, or products.

#### Scenario: Tenants table populated by seed
- **WHEN** `npm run seed` is run against a freshly migrated database
- **THEN** the `tenants` table contains rows for `slug = 'acme'` and `slug = 'globex'`, each with `sales_channel_id` and `publishable_api_key` non-null

#### Scenario: Acme storefront renders a product grid
- **WHEN** the storefront is loaded at `acme.localhost`
- **THEN** the product grid renders at least three products that were seeded for the Acme tenant

#### Scenario: Tenant catalogs do not bleed across
- **WHEN** the storefront is loaded at `globex.localhost`
- **THEN** no product belonging only to Acme's sales channel appears in the rendered catalog

## MODIFIED Requirements

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
