# Platform — multi-tenant headless commerce stack

> **Status:** scaffolding complete (OpenSpec change `scaffold-multitenant-platform`).
> Per-tenant catalog (sales channels, publishable keys, products) is deferred to a
> follow-up change — the home page renders an empty-state until that lands.

A Medusa v2 backend + Next.js 16 storefront serving multiple branded
storefronts from a single deployment. Tenant resolution is by HTTP `Host`
header → Postgres `tenants` table → per-tenant Medusa sales channel.

This subtree is independent of the legacy Firebase app in [../src](../src).
The two stacks run side by side and share neither auth, schema, nor build.

## Prerequisites

- **Docker Desktop** (the daemon must be running)
- **Node.js 20+** and **npm 11+** (for host-side scripts: tenants migration, seed)
- **Hosts file entries** for the demo tenants on Windows. macOS and most
  Linux resolvers handle `*.localhost → 127.0.0.1` natively. On Windows,
  append to `C:\Windows\System32\drivers\etc\hosts` (admin shell):

  ```
  127.0.0.1 acme.localhost
  127.0.0.1 globex.localhost
  ```

## Quick start

```bash
# 1. Copy env defaults
cp .env.example .env
# (review .env — POSTGRES_PORT defaults to 5432 and may collide with a
#  Windows-native PostgreSQL service; bump to 54320 if you see auth errors)

# 2. Boot Postgres, Redis, Medusa, and the storefront
docker compose up -d

# 3. Apply migrations (host-side; see "Why host-side" below)
npm install
npm run migrate

# 4. Create the Medusa admin user (idempotent — skips if exists)
npm run admin:create

# 5. Seed the demo tenants (creates sales channels, API keys, products)
npm run seed

# 5. Open the storefronts in your browser
#    http://acme.localhost:3000   (teal brand, compact layout)
#    http://globex.localhost:3000 (orange brand, hero layout)
#
# Unknown hosts return HTTP 404 with a clear JSON message.
```

To tear down: `docker compose down -v` (the `-v` drops the postgres + redis
volumes so the next run starts clean).

## Why host-side migrations?

`medusa db:migrate` hangs reproducibly under Docker Desktop on Windows
during the per-module migration phase. The exact same command finishes in
~30s when run on the host pointing at the container's exposed Postgres
port. Run `npm run migrate` once on the host before `docker compose up`.

On Linux hosts (including the Coolify VPS this is destined for) the
container-side migration works normally. The Coolify follow-up change will
add a one-shot `medusa-migrate` service in `compose.coolify.yml` that runs
migrations once and exits before the long-lived `medusa` service starts.

## Layout

```
platform/
  apps/
    backend/             Medusa v2 application (@platform/backend)
    storefront/          Next.js 16 storefront (@platform/storefront)
  packages/
    tenancy/             Shared TS module: types, resolver, cache, theme helper
  scripts/
    migrate-platform.ts  Runs platform-level SQL migrations (tenants table)
    seed-tenants.ts      Upserts the two demo tenants
    migrations/
      0001_create_tenants.sql
  compose.yml            Local dev compose (postgres, redis, medusa, storefront)
  compose.coolify.yml    Production overlay (no host port bindings, Traefik-ready)
  package.json           Workspace root (turbo, workspaces, npm scripts)
  .env.example
  .env                   (gitignored)
```

## NPM scripts

| Script | What it does |
| --- | --- |
| `npm run migrate` | Run platform + Medusa migrations on the host |
| `npm run migrate:platform` | Apply `scripts/migrations/*.sql` to Postgres |
| `npm run migrate:medusa` | Run Medusa's own `medusa db:migrate` |
| `npm run admin:create` | Create the Medusa admin user (idempotent) |
| `npm run seed` | Provision the two demo tenants: sales channels, API keys, products, theme tokens |
| `npm run test:scripts` | Run script-level tests (admin API client) |
| `npm run test:e2e` | End-to-end catalog isolation tests against the running storefront |
| `npm run backend:dev` | `medusa develop` (host-side, hot reload) |
| `npm run storefront:dev` | `next dev` (host-side, hot reload) |
| `npm test` | Run all workspace tests (tenancy + scripts) |

## Architecture in one screen

1. Browser hits `acme.localhost:3000`.
2. Next.js `proxy.ts` reads the `Host` header, looks up the tenant in the
   in-process cache (60-second TTL); cache miss → Postgres `tenants` table.
3. Proxy forwards the request with `x-tenant-host: acme.localhost`. Unknown
   host → HTTP 404.
4. `app/layout.tsx` server component calls `getTenant()` (warm cache hit),
   emits the tenant's `theme_tokens` as a `:root { ... }` `<style>` block.
5. `app/page.tsx` reads `getTenant()`, calls `listProducts({ tenant })`
   from `lib/commerce.ts` (the single facade for the Medusa SDK), and
   renders `ProductGrid` using the tenant's `layout_variant`
   (`compact` | `hero`).
6. All Medusa Store-API calls carry the tenant's `publishable_api_key`,
   scoping the catalog to that tenant's sales channel.

The tenancy package (`@platform/tenancy`) is the single source of truth for
the `Tenant` type, hostname normalization, the cache, and theme-token →
CSS conversion. Storefront and seed script both import from it.

## Maintenance

- **Single Medusa SDK chokepoint.** Only `apps/storefront/lib/commerce.ts`
  imports `@medusajs/js-sdk`. To prove this in a one-liner, run this from
  the platform root before opening a PR:

  ```bash
  ! grep -rn "from \"@medusajs/js-sdk\"\|require(\"@medusajs/js-sdk\")" \
      apps/storefront --include="*.ts" --include="*.tsx" \
      | grep -v "apps/storefront/lib/commerce.ts"
  ```

  The command exits 0 (success) when the only match is the facade, and
  exits 1 (failure) the moment another file imports the SDK directly. CI
  can wrap this in a check later.

- **Tenant cache TTL.** The in-process cache holds tenant rows for 60s
  (`packages/tenancy/src/cache.ts`). After editing `theme_tokens` in the
  DB, allow up to one TTL window before the new tokens appear (or restart
  the storefront process for an instant refresh).

- **Adding a new tenant.** Append a row to `TENANTS` in
  `scripts/seed-tenants.ts` and re-run `npm run seed`. The script is
  idempotent. Add a host file entry for the new domain, or wire DNS in
  production.

## See also

- [openspec/changes/scaffold-multitenant-platform](../openspec/changes/scaffold-multitenant-platform) — full proposal, design, specs, tasks
- [`compose.yml`](compose.yml) — local-dev compose stack
- [`compose.coolify.yml`](compose.coolify.yml) — production overlay for the VPS
