## Context

Two changes are live locally (`wire-tenant-catalogs`, `storefront-cart-checkout`). The third — getting the platform onto the public internet — needs the existing Coolify VPS at `host.docker.internal` (Coolify's own server reference) serving `*.networkbase75.site`. The user has 9 other apps deployed there already, so the proxy + DNS + ACME infrastructure is proven; we just slot in our 4 services.

Constraints:
- Coolify can't reach the platform code from the host; it must pull from a Git repo. The repo is `AI-07223/ecom`; we push our work to a `platform` branch so we don't disturb master.
- DNS for `networkbase75.site` already resolves via Cloudflare to the VPS — wildcard configured for other apps. New subdomains (`medusa.`, `acme.`, `globex.`) inherit the wildcard.
- The Windows-Docker `medusa db:migrate` hang documented in the scaffolding change does NOT happen on Linux. The Dockerfile's CMD can safely run migrations on start.
- Production credentials (DB passwords, JWT secret, admin password) live in Coolify env vars; they're never committed to the repo.

## Goals / Non-Goals

**Goals:**
- One Coolify project (`platform`) with: Postgres 16, Redis 7, Medusa app, Storefront app — all in the `production` environment.
- Medusa accessible at `https://medusa.networkbase75.site/app` (admin UI) and `/store/*` (Store API).
- Storefront accessible at `https://acme.networkbase75.site` and `https://globex.networkbase75.site` with TLS via Let's Encrypt (handled by Coolify's Traefik).
- First-deploy admin user provisioning is automatic (CMD's `medusa user` step is idempotent).
- Platform `tenants` table is created automatically (Medusa migration script).
- Each git push to the `platform` branch triggers a redeploy (deferred to ci-cd-pipeline change; for now manual via Coolify MCP).
- `https://medusa.networkbase75.site/health` and `https://acme.networkbase75.site/api/health` both return 200.

**Non-Goals:**
- Cashfree integration (next change).
- Per-tenant catalog seeding in production (run once manually after deploy by temporarily exposing Postgres + calling the seed script from a developer machine).
- DNS provisioning (handled by Cloudflare's existing wildcard).
- CI/CD trigger automation (next change).
- Monitoring / alerts (observability change).
- Custom client domains (`acme.com` etc.); we use the platform-domain subdomain pattern for the initial deploy.

## Decisions

### D1. One Coolify project, four resources
Project `platform` (uuid `lvulqv6j47jte2eeldvarsdr`) holds:
- Postgres 16-alpine database (`vz8rn4gh63h3lp2liylglm04`) — `is_public: false`
- Redis 7-alpine database (`sv057oqlb8lecjpnh8k4a471`) — `is_public: false`
- Medusa application (`ry5r3vqflmuylanko5o1g9gh`) — Dockerfile build, FQDN `medusa.networkbase75.site`
- Storefront application (`dgfcfbhzjpxlf2dcb7r3zm2p`) — Dockerfile build, multi-FQDN (`acme.networkbase75.site, globex.networkbase75.site`)

**Alternative considered**: docker-compose deployment using `compose.coolify.yml`. Rejected because Coolify's per-resource model gives finer control over healthchecks, env vars, and individual restarts.

### D2. Git deployment from the `platform` branch
A fresh branch `platform` is created on `AI-07223/ecom` to hold the platform code. `master` keeps the legacy Firebase app plus the operator's unrelated WIP. Coolify pulls from `https://github.com/AI-07223/ecom` branch `platform`, with `base_directory: /platform` and Dockerfile path `/apps/backend/Dockerfile` (or `/apps/storefront/Dockerfile`).

**Alternative considered**: deploy from `master` after merging the platform branch. Rejected for this change because the operator has uncommitted WIP on master we shouldn't bundle.

### D3. Same Dockerfile, different CMD between local dev and production
Local dev runs `medusa develop` and `next dev` natively on the host (not in Docker) — Windows-Docker hang ruled out Docker for local Medusa. The production Dockerfile runs `medusa build` at image-build time and `medusa start` at container-run time. The split is documented in each Dockerfile's header comment.

### D4. Migration + admin-user + start chained in CMD
The Medusa container CMD is `medusa db:migrate && (medusa user -e $EMAIL -p $PASS || true) && exec medusa start`. The `|| true` tolerates "user already exists" on subsequent boots. Migrations include our `platform-tenants-table.ts` Medusa migration script (in `apps/backend/src/migration-scripts/`) so the `tenants` table is created as part of the same `db:migrate` pass — no separate runner needed in production.

### D5. Healthchecks: custom `/health` route on Medusa, `/api/health` on storefront
Medusa's own routing system doesn't expose a built-in health endpoint, so `apps/backend/src/api/health/route.ts` is a 10-line custom route that returns 200. The storefront's `/api/health` lives at `apps/storefront/app/api/health/route.ts`; the proxy.ts matcher is updated to bypass tenant resolution for that path (Coolify probes without a tenant Host header).

### D6. Storefront talks to Medusa over the Coolify internal network
The storefront's `MEDUSA_BACKEND_URL` is set to `http://ry5r3vqflmuylanko5o1g9gh:9000` (the Medusa container's UUID-as-hostname inside the `coolify` Docker network). The browser-facing `NEXT_PUBLIC_MEDUSA_BACKEND_URL` is `https://medusa.networkbase75.site` for any client-side Medusa calls (none today; reserved for future hosted-checkout redirects).

### D7. Seeding deferred to a manual step
The local seed script (`scripts/seed-tenants.ts`) needs both Postgres and Medusa admin API access. In production, Postgres is private to the Coolify network. For first-time seeding the operator briefly toggles Postgres to public via Coolify MCP, runs the seed from a developer machine (pointed at the production URLs), then toggles back. Future changes (`tenant-onboarding-cli`) will replace this with an authenticated HTTP endpoint that runs server-side.

## Risks / Trade-offs

- **First deploy is slow** (~10 min for `medusa build` + image push + healthcheck timeout window). Mitigated by `health_check_start_period: 120` so Coolify doesn't mark the container unhealthy during initial migrations.
- **`master` branch divergence** — `platform` branch sits alongside `master`. If the operator updates master with platform-relevant changes (e.g. to .gitignore), they need to be cherry-picked to `platform`. Mitigated by limiting cross-branch edits and by treating `platform` as a release branch.
- **Manual seeding step** — Postgres is private; the operator has to temporarily expose it to seed. Documented in the README. Replaced cleanly by `tenant-onboarding-cli`.
- **Coolify's auto-generated Traefik labels conflict with custom labels in our compose** — we sidestep this entirely by deploying each service as a Coolify "Application" (not a docker-compose stack), so Coolify generates labels and we don't.

## Migration Plan

1. Push `platform` branch to `AI-07223/ecom` ✓
2. Coolify project + Postgres + Redis created via Coolify MCP ✓
3. Medusa + Storefront applications created via Coolify MCP ✓
4. Env vars set on both apps ✓
5. Deploys triggered; monitor until both healthy
6. Verify `https://medusa.networkbase75.site/health` → 200
7. Verify `https://acme.networkbase75.site/api/health` → 200
8. Temporarily set Postgres to `is_public: true`; run `npm run seed` from a developer machine with `PLATFORM_DATABASE_URL=postgres://...@<vps-ip>:<public-port>/platform` and `MEDUSA_BACKEND_URL=https://medusa.networkbase75.site`
9. Toggle Postgres back to `is_public: false`
10. Visit `https://acme.networkbase75.site` and `https://globex.networkbase75.site` — confirm tenant-branded storefronts render

## Open Questions

- **Cloudflare proxy mode** — the user's DNS proxies through Cloudflare. Let's Encrypt HTTP-01 challenges go through Cloudflare; this works with their existing apps so it should work here. If certs fail to issue, switch the subdomain DNS to "DNS-only" (gray cloud) and retry.
- **Wildcard cert vs per-subdomain** — Coolify issues per-domain certs by default. For 2-3 tenant subdomains this is fine; if we scale to dozens, a single wildcard cert via DNS-01 challenge would be cleaner. Deferred.
- **Container restart behavior on Medusa migrate failure** — the CMD chain stops on db:migrate error, so the container exits and Coolify retries. Acceptable; failure surfaces in logs.
