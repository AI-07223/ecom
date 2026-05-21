## 1. Prerequisites and repo layout

- [x] 1.1 Verify Docker Desktop is installed and `docker` + `docker compose` work from PowerShell; if missing, install Docker Desktop via Chocolatey (`choco install docker-desktop`) and confirm it runs
- [x] 1.2 Create the `platform/` directory at repo root and add a top-level `platform/README.md` placeholder so the subtree is visible in source control
- [x] 1.3 Add `platform/` to the repo's path-based tooling (verify ESLint, Prettier, and `tsconfig.json` at repo root do NOT lint files under `platform/`; add `platform/` to ignore lists if they do)
- [x] 1.4 Add `platform/.env`, `platform/**/node_modules`, `platform/**/.next`, `platform/**/dist` to the repo `.gitignore` (or a `platform/.gitignore`)

## 2. Local infra: Postgres, Redis, and compose skeleton

- [x] 2.1 Write `platform/compose.yml` declaring `postgres` (image `postgres:16-alpine`), `redis` (image `redis:7-alpine`), `medusa` (placeholder build context `./backend`), and `storefront` (placeholder build context `./storefront`); include healthchecks for postgres and redis
- [x] 2.2 Write `platform/.env.example` documenting every variable referenced by `compose.yml` and the apps (database URL, redis URL, Medusa secrets, admin email, etc.) with one-line comments and placeholder values
- [x] 2.3 Write `platform/compose.coolify.yml` as a Docker Compose override that adds Traefik labels for hostname routing and rebinds volumes to Coolify-managed paths; do not redefine images or commands
- [x] 2.4 Confirm `docker compose up postgres redis` brings both services up with healthy status and that the named volumes persist data across restarts

## 3. Medusa v2 backend

- [x] 3.1 In `platform/apps/backend/`, scaffold a fresh Medusa v2 application using the official CLI; pin every Medusa package to an exact version in `package.json` (no `^` or `~`). Resulting layout is Medusa's Turborepo template — `platform/` becomes the workspace root with `apps/backend` as the Medusa app.
- [x] 3.2 Configure Medusa's `medusa-config.ts` to read Postgres URL and Redis URL from environment variables matching `.env.example`
- [x] 3.3 Add a `Dockerfile` for the Medusa app that boots the API server; wire the `medusa` service in `compose.yml` to build from this Dockerfile. (Note: container-side `medusa db:migrate` hangs reproducibly under Docker Desktop on Windows; migrations are run via the host-side `npm run migrate:medusa` script instead. On Linux Coolify hosts the in-container migrate runs fine — we'll add a one-shot migrate service in the Coolify-deploy follow-up change.)
- [x] 3.4 Bring the stack up and confirm the Medusa API container reaches healthy state and the Medusa admin endpoint responds locally — `medusa develop` reports "Server is ready on port: 9000" and exposes `/app` (admin) after host-side migrations are applied
- [x] 3.5 Add a `tenants` table migration via a dedicated migration tool (`scripts/migrate-platform.ts` runner with `scripts/migrations/0001_create_tenants.sql`) creating columns: `id (uuid pk)`, `slug (text unique)`, `domain (text unique)`, `sales_channel_id (text unique)`, `publishable_api_key (text)`, `theme_tokens (jsonb)`, `feature_flags (jsonb default '{}')`, `layout_variant (text default 'compact')`, `status (text default 'active')`, `created_at`, `updated_at`. Includes an index on `domain` and an `updated_at` trigger.

## 4. Shared tenancy package

- [x] 4.1 Create `platform/packages/tenancy/` with its own `package.json` and `tsconfig.json` configured to compile to ESM
- [x] 4.2 Define and export the `Tenant` TypeScript type matching the `tenants` table columns, including a typed `ThemeTokens` and `FeatureFlags` shape
- [x] 4.3 Implement and export `resolveTenantByHost(host: string)` that normalizes (lowercase, strip port) and queries Postgres for the matching tenant row
- [x] 4.4 Implement and export `tenantCache` — an in-process Map with a 60-second TTL keyed by normalized host string, wrapping `resolveTenantByHost`
- [x] 4.5 Implement and export `themeTokensToCss(tokens: ThemeTokens): string` that emits a `:root { ... }` declaration
- [x] 4.6 Add a Vitest test asserting cache hits within TTL and cache misses after TTL expiry

## 5. Next.js 16 storefront

- [x] 5.1 In `platform/apps/storefront/`, scaffold a fresh Next.js 16 App Router project with TypeScript, Tailwind v4 (shadcn/ui-style CSS variables; the formal shadcn/ui registry init is deferred until a component-heavy change actually needs more primitives)
- [x] 5.2 Add the storefront's `Dockerfile` and wire it to the `storefront` service in `compose.yml`; expose port 3000
- [x] 5.3 Add `@platform/tenancy` as a workspace dependency of the storefront (root `platform/package.json` declares `apps/*` + `packages/*` workspaces)
- [x] 5.4 Implement `apps/storefront/proxy.ts` (Next.js 16 renamed `middleware` → `proxy`) that calls `tenantCache.resolve(request.headers.host)`, attaches the resolved tenant host to a request header (`x-tenant-host`), and returns HTTP 404 with a clear message for unknown hosts
- [x] 5.5 Implement `apps/storefront/lib/getTenant.ts` exporting a server-only `getTenant()` helper that reads the request context (via Next.js `headers()`), pulls the tenant from the same in-process cache, and returns the typed `Tenant`
- [x] 5.6 In `apps/storefront/app/layout.tsx`, call `getTenant()` and emit a `<style>` block with `themeTokensToCss(tenant.theme_tokens)` in the document head before any tokenized component renders
- [x] 5.7 Implement `apps/storefront/lib/commerce.ts` as the single facade for Medusa Store SDK access; expose at minimum `listProducts({ tenant })` and `getProductByHandle({ tenant, handle })`, each passing the tenant's `publishable_api_key`
- [x] 5.8 Add a CI-style grep step in the README's "Maintenance" section banning direct imports of the Medusa SDK outside `lib/commerce.ts` — a custom ESLint plugin is overkill while there's only one file to police

## 6. Demo content and seed script

- [x] 6.1 Write `platform/scripts/seed-tenants.ts` that, when run against a fresh stack, idempotently upserts the `acme` and `globex` tenant rows with distinct `theme_tokens` (different `--brand-primary`, `--radius`, `--font-display`, `--site-title`) and `layout_variant` values. **Deferred to a follow-up change**: creating Medusa sales channels, publishable keys, and per-tenant products. Those require Medusa admin-API plumbing; updated specs and proposal reflect this.
- [x] 6.2 Wire `npm run seed` (in the platform root `package.json`) to invoke the seed script
- [x] 6.3 Print at the end of seeding the two demo URLs (`http://acme.localhost:3000`, `http://globex.localhost:3000`) and a Windows-friendly note describing the `hosts` file entries to add if `*.localhost` resolution doesn't work out of the box

## 7. Pages and tenant-aware rendering

- [x] 7.1 Implement `app/page.tsx` as a tenant-aware home page that uses `getTenant()`, calls `commerce.listProducts({ tenant })`, and renders a product grid using a shadcn/ui-styled `ProductCard` component (renders the deferred-catalog empty state when `publishable_api_key` is NULL — see proposal/spec deferral notes)
- [x] 7.2 Implement `ProductCard` to read its primary color, radius, and display font from CSS variables (no inline hex colors, no inline font names, no inline radii)
- [x] 7.3 Implement a `layout_variant` switch in the product grid (`ProductGrid.tsx`) that renders the `compact` layout by default and the `hero` layout when `tenant.layout_variant === 'hero'`; warn-log and fall back to `compact` for unknown values
- [x] 7.4 Verified end-to-end via curl (since the catalog is intentionally empty until the follow-up change): `Host: acme.localhost:3000` returned `data-tenant="acme"` with `<title>Acme — Things That Work</title>`, `--brand-primary:#0F766E` and `--radius:0.75rem`; `Host: globex.localhost:3000` returned `data-tenant="globex"` with `<title>Globex — Modern Goods</title>`, `--brand-primary:#EA580C` and `--radius:0.25rem`; `Host: unknown.example.com` returned HTTP 404 with `{"error":"unknown_tenant",...}`. Screenshots are skipped on this iteration because the empty-state page would not be more informative than the curl evidence; will be added in the catalog follow-up change once products render.

## 8. Documentation and handoff

- [x] 8.1 Fill in `platform/README.md`: prerequisites, `cp .env.example .env`, `docker compose up`, `npm run migrate`, `npm run seed`, demo URLs, hosts file note, teardown, single-Medusa-SDK-import grep, and the deferred-catalog note
- [x] 8.2 Add a one-section note to the root `CLAUDE.md` pointing at `platform/` as the new direction and explaining that `src/` is the legacy Firebase app retained alongside
- [x] 8.3 Run `openspec validate scaffold-multitenant-platform --strict` and resolve any reported issues before considering the change ready to archive
