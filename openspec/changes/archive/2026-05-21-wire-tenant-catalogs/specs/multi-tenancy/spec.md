## ADDED Requirements

### Requirement: Cross-tenant catalog isolation is enforced and tested
The platform SHALL enforce that products fetched for one tenant never appear in another tenant's storefront response, and SHALL include an automated end-to-end test asserting this isolation.

#### Scenario: E2E test passes catalog isolation check
- **WHEN** the catalog-isolation E2E test runs after `npm run seed`
- **THEN** the test fetches both `acme.localhost` and `globex.localhost`, asserts each shows only its own products (handle prefix matches slug), and asserts zero overlap between the two product sets

#### Scenario: E2E test catches a misconfigured tenant
- **WHEN** the seed script writes the wrong `publishable_api_key` to a tenant (simulated by manual edit during a test variant)
- **THEN** the E2E test fails with a clear diagnostic identifying which tenant has the wrong products
