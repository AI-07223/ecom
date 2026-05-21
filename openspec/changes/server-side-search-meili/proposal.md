## Why

The original Firebase app's search was client-side filtering — fast to ship, broken under any real catalog size, and useless across thousands of products. Once a tenant grows past a few dozen SKUs, customers need a "search this store" experience that's fast, typo-tolerant, and tenant-scoped. This change adds MeiliSearch as a self-hosted search service on Coolify, indexes each tenant's products under a separate index, and exposes a `/search` page in the storefront.

## What Changes

- Add a `meilisearch` service to `compose.yml` and `compose.coolify.yml`, pinned to MeiliSearch 1.x, with a persistent volume.
- Add a Medusa subscriber that listens to `product.created`, `product.updated`, and `product.deleted` events and pushes the document to MeiliSearch's `tenant_<slug>_products` index (one index per tenant — Meili's recommended scaling pattern for multi-tenant).
- Add `apps/storefront/lib/search.ts` — a server-side helper that talks to Meili with the tenant's `tenant_<slug>_search_api_key` (a scoped key Meili generates per index).
- Add `apps/storefront/app/search/page.tsx` and `apps/storefront/components/SearchBar.tsx`. SearchBar renders in the storefront header (added in this change), debounces input client-side, and routes to `/search?q=...`. The search page server-renders results.
- Add a one-time `npm run search:reindex` command that walks every tenant's product list via Medusa's admin API and rebuilds the corresponding Meili index. Useful after restores or schema changes.
- Store `meili_search_api_key` and `meili_admin_api_key` per tenant in the `tenants` table (admin key only used server-side; search key is safe to expose to the browser for autocomplete UIs added later).

## Capabilities

### New Capabilities
- `tenant-scoped-search`: One Meili index per tenant, with scoped API keys so a client-side autocomplete can only query its own index.
- `product-index-sync`: Real-time sync from Medusa product events to Meili indexes via a Medusa subscriber.

### Modified Capabilities
- `multi-tenancy`: New scenario asserting cross-tenant search isolation — a query to Acme's search index MUST NOT return Globex products.

## Impact

- **Code**: New Medusa subscriber, new search facade module, new `/search` route, new search bar component, new `reindex` script, new `tenants` migration adding the two key columns.
- **Dependencies**: `meilisearch` (Node SDK), `instantsearch.js` (deferred to a later "rich autocomplete" change — this one just does basic search).
- **Infra**: New Coolify service for MeiliSearch; persistent volume backed by the same backup policy as Postgres (lower priority — indexes can be rebuilt from Medusa if lost, so daily snapshot is enough).
- **Risk**: Eventual-consistency between Medusa and Meili if the subscriber drops a message. Mitigated by the `reindex` command as a recovery path and a nightly reconciliation job that the BullMQ worker change will add.
