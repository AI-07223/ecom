## Context

This repo currently holds a Next.js 16 + Firebase ecommerce site under `src/`, plus a sibling Flutter app under `flutter_firebase_app/`. The Firebase implementation has hit familiar walls — no joins, no cross-collection transactions at scale, no real admin UI, client-side search, and composite-index fragility. The non-technical operator wants to run multiple branded storefronts for different clients from one VPS rather than maintain one bespoke site.

The previous Claude session settled on Medusa v2 (Node/TS, Postgres, Redis) as the commerce backend with a Next.js 16 storefront, hosted on Coolify on a single VPS. Multi-tenancy was scoped to "single deployment, tenant-by-domain" first, with a "graduate to per-client deployment" path reserved for clients that outgrow the shared model. This change implements the smallest viable slice of that direction: get the platform standing up locally with two demo tenants resolving from hostname and rendering with different themes. Everything else (Stripe Connect, MeiliSearch, MinIO, client-admin, onboarding script, observability, CI/CD) is deferred.

Constraints:
- The user is non-technical. Every choice must be runnable by Claude Code from a terminal — no GUI installers, no admin-console-only setup, no copy-paste-tokens-between-tabs steps.
- The legacy Firebase code must keep working untouched. Nothing in this change should require editing files under `src/` or `flutter_firebase_app/`.
- Local dev and Coolify prod must run the same set of services so behavior matches.

Stakeholders:
- The operator (single-person agency running this stack).
- Future per-tenant clients (some self-service in their admin, some agency-run).

## Goals / Non-Goals

**Goals:**
- A single `docker compose up` command in `platform/` brings up Postgres, Redis, Medusa API, and the storefront locally.
- A `tenants` table in Postgres stores `{ id, slug, domain, sales_channel_id, publishable_api_key, theme_tokens jsonb, feature_flags jsonb, status, timestamps }`.
- A seed script populates two demo tenants (`acme.localhost`, `globex.localhost`) with distinct brand tokens and connects each to a Medusa sales channel.
- Storefront middleware resolves `request.headers.host` → tenant on every request; tenant context is available in all routes via a typed helper, not by re-querying the DB.
- The same shadcn/ui product card renders visibly different (color, font, radius) on each hostname without per-tenant code branches.
- The Coolify topology is captured as `compose.coolify.yml` so the VPS deploy is the same shape as local.

**Non-Goals:**
- Stripe / Stripe Connect wiring (separate change).
- Server-side search via MeiliSearch (separate change).
- MinIO / S3 file storage (separate change — local dev uses Medusa's default file driver).
- Email sending via Resend (separate change).
- The agency-only Medusa admin hardening / IP allowlist (separate change).
- The thin per-tenant client-admin UI (separate change).
- The BullMQ worker process (separate change — no async jobs yet).
- A `npm run tenant:create` onboarding CLI (separate change — this proposal uses a seed script for two hard-coded demo tenants).
- Migrating any data from the legacy Firestore database.
- CI/CD, Sentry, analytics, backups.

## Decisions

### D1. Repo layout: `platform/` subtree, not a separate repo

The new stack lives under `platform/` in this repo with its own `package.json`(s) and its own `docker-compose.yml`. The legacy Next.js app stays at the repo root and is not touched. Rationale: one repo means one place to track decisions and one CI pipeline later; a subtree keeps the two stacks visibly separate. Alternative considered: split into a fresh repo. Rejected because the operator already works out of this directory and a fresh repo adds setup friction with no offsetting benefit for a single-person agency.

Internal layout (matches Medusa's current Turborepo template):
```
platform/
  apps/
    backend/         # Medusa v2 app (@platform/backend)
    storefront/      # Next.js 16 storefront (@platform/storefront, scaffolded in group 5)
  packages/
    tenancy/         # shared TS module: tenant types, resolver, theme helpers (@platform/tenancy)
  scripts/
    seed-tenants.ts  # creates the two demo tenants + sales channels
  compose.yml        # local dev compose (postgres, redis, medusa, storefront)
  compose.coolify.yml# Coolify-targeted variant (volumes, networks, traefik labels)
  package.json       # workspace root: turbo, workspaces, npm scripts
  turbo.json
  .env.example
  README.md
```

The `apps/` and `packages/` layers come from Medusa's `create-medusa-app` scaffold; we
keep them rather than fight the template. Operationally this is identical to the
"backend/storefront/packages" layout the proposal described — just one extra `apps/`
directory level.

### D2. Medusa v2 over Saleor, Shopify/Hydrogen, or fully custom

Medusa v2 is the headless commerce backend. Rationale: Node/TS keeps the team on one language with the storefront; v2's module system + plugin model is the right shape for the per-tenant features the operator wants to add later; self-hostable on Coolify with a normal Postgres. Alternatives considered:
- **Saleor (Python/GraphQL)**: mature but two languages, heavier ops, GraphQL-only adds friction for a small team.
- **Shopify / Hydrogen**: per-store fees plus no self-host kills the multi-client unit economics.
- **Fully custom**: rejected outright — building order, inventory, discount, refund, and admin logic was the source of the original project's pain.

### D3. Tenant resolution: hostname → Postgres lookup, cached in-process

On each incoming request, Next.js middleware reads `request.headers.host`, strips any port, lowercases, and looks up the tenant by exact `domain` match. The lookup is cached in-process with a 60-second TTL keyed by host string; cache misses fall through to a Postgres query against the `tenants` table. The resolved tenant is attached to a request context object that is read by server components via a typed helper (`getTenant()`). The tenant's `publishable_api_key` is the only thing passed to the Medusa SDK on the server side — never sent to the client. Rationale: hostname is the simplest correct unit; subdomains and custom apex domains both fit; in-process cache avoids hammering Postgres at request rate without the complexity of Redis-fronted caching this early. Alternative considered: path-based tenancy (`/t/<slug>/...`). Rejected because real clients will want custom apex domains and switching tenancy keys mid-project is painful.

### D4. Theming via CSS variables generated from `theme_tokens` JSON, not a theme engine

`tenants.theme_tokens` stores a small flat JSON object: `{ "--brand-primary": "#...", "--brand-on-primary": "#...", "--radius": "0.5rem", "--font-display": "..." }` plus a `layout_variant` enum (`"compact" | "hero"`) for the product card. The storefront renders a `<style>` tag in the root layout that emits `:root { ... }` with those variables. shadcn/ui components already read from CSS variables, so no per-tenant component code is needed. Rationale: zero runtime cost, no recompile per tenant, designers can tweak a tenant's brand by editing one JSON row. Alternative considered: per-tenant Tailwind configs compiled at build time. Rejected because it requires a build step per tenant, which breaks fast onboarding.

### D5. Sales channel per tenant, publishable API key as the scoping mechanism

Each tenant maps to one Medusa sales channel and one publishable API key. The storefront always calls Medusa with that key, which Medusa uses to filter the product catalog (and downstream order routing) to only that tenant's data. Rationale: this is the supported Medusa path for "many storefronts, one backend" and avoids inventing a parallel access-control system. Risk: a bug that swaps the publishable key between tenants would cross data. Mitigated by D7 (typed helper, never inline key strings) and by an E2E smoke test that asserts each tenant only sees its own product set (deferred to a later test-focused change but documented now).

### D6. Same `compose.yml` for local and Coolify, with a `coolify.yml` overlay for volumes and Traefik labels

Local dev uses `compose.yml` with named volumes for Postgres data. The Coolify deploy uses `compose.coolify.yml` (a Docker Compose override file) that adds Traefik labels for hostname routing and points volumes at Coolify-managed paths. Rationale: keeps "what runs" identical between environments; Coolify-specific concerns are isolated to one overlay file. Alternative considered: separate `Dockerfile` and Coolify "Resource" definitions in the Coolify UI. Rejected because UI-defined infra is invisible to git and to Claude Code, violating the autonomy directive.

### D7. Shared TS module `packages/tenancy` for the tenant type, resolver, and theme helper

Tenant resolution logic, the `Tenant` type, the CSS-variable generator, and the typed `getTenant()` helper live in one shared TS module that both the storefront and the seed script import. Rationale: prevents drift between "what the DB stores" and "what code expects"; gives one place to evolve the schema. The backend (Medusa) does not import this module — it owns sales channels via its own models, and the `tenants` table is metadata on top of that.

## Risks / Trade-offs

- **Data-leak blast radius across tenants** → Mitigated by D5 (sales-channel scoping), D7 (typed key access, no inline strings), and a documented expectation that an E2E test in a later change asserts cross-tenant isolation. For this change, the risk is acceptable because only seeded demo data exists.
- **Adding a second long-lived stack to the repo before any client is on it** → Mitigated by keeping `platform/` self-contained; the legacy stack ships and serves traffic unaffected. If the Medusa direction proves wrong, deleting `platform/` reverts the experiment cleanly.
- **Docker required for local dev** → The operator's machine doesn't list Docker as confirmed installed. Mitigated by checking for Docker at the start of implementation and, if missing, installing Docker Desktop for Windows (one-time UAC prompt acceptable per the operator's autonomy directive — system tool, not a workflow tool).
- **In-process tenant cache TTL means a brand-tokens edit takes up to 60s to propagate** → Acceptable at this stage; a later change can add a "bust cache for tenant X" admin action when the client-admin UI lands.
- **Hostname collisions on `*.localhost`** → On modern OSes `*.localhost` resolves to `127.0.0.1` by default; on Windows this depends on the resolver. Mitigated by documenting a `hosts` file entry fallback in the README and printing it from the seed script's final output.
- **Locking in Medusa v2's pre-1.0 API shape** → Real risk; v2 is still iterating. Mitigated by keeping all Medusa-specific code behind a thin `platform/storefront/lib/commerce.ts` facade, so a future major-version migration is one file to rewrite.

## Migration Plan

This change deploys alongside the existing site, not on top of it.

1. Implementation runs in a local-first loop until `docker compose up` produces a working Medusa + storefront on `acme.localhost:3000` and `globex.localhost:3000` with visibly different themes.
2. Once local works, the operator stands up the Coolify projects on the VPS (separate Coolify project per service — postgres, redis, medusa-api, storefront) using `compose.coolify.yml`. Wildcard cert on `*.<platform-domain>` so demo tenants resolve over HTTPS without further DNS work.
3. No production traffic is moved. The legacy site keeps its DNS and continues serving its current domain.
4. Rollback: if the platform direction is abandoned, the rollback is `rm -rf platform/` plus tearing down the Coolify projects. The legacy site is untouched throughout, so rollback is essentially a no-op for live users.

## Open Questions

- Which Postgres major version should we pin? Default to **Postgres 16** unless the operator has a reason to differ — matches the global default and is supported by Medusa v2.
- Should the local seed script support more than two tenants out of the box? Default to **two**, hard-coded, for this change; a configurable seed is part of the future `tenant:create` script.
- Where does the VPS already host things? The operator has Coolify on a VPS; we will need its address/credentials before the Coolify portion of the migration plan can execute, but those are not needed for the local-first implementation that this change centers on.
