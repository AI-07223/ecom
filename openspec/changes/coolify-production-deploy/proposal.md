## Why

The platform runs locally; it has to run somewhere the public can reach. This change takes the working local stack and ships it to your Coolify VPS, behind a real hostname, with TLS, persistent volumes, and the one-shot migration pattern that fixes the Windows-Docker workaround documented in the scaffolding change. After this lands, you can point a real client's domain at the platform.

## What Changes

- Stand up a Coolify project per long-lived service (`postgres`, `redis`, `medusa-api`, `storefront`) using the existing `compose.yml` + `compose.coolify.yml` overlay, with environment variables set in the Coolify UI (NOT committed).
- Add a `migrate` service to `compose.coolify.yml` that runs `medusa db:migrate && tsx scripts/migrate-platform.ts`, exits cleanly, and is depended on by both `medusa-api` and `storefront`. This is the Linux-side equivalent of the host-side `npm run migrate` workaround used locally.
- Issue a wildcard ACME certificate for `*.<platform-domain>` so seeded demo tenants get TLS automatically; Coolify's built-in Traefik handles this when a wildcard domain is configured.
- Wire a custom-domain workflow: documented in `platform/docs/custom-domains.md` — add a CNAME, add the domain to the tenant's `domain` column, restart the storefront service.
- Move `compose.yml`'s host port bindings off the production overlay (already done in scaffolding, but verify the actual Coolify deploy doesn't expose Postgres / Redis publicly).
- Bake in a healthcheck endpoint in the storefront (`/api/health`) and the Medusa API's existing `/health` route, both wired to Coolify's container healthcheck so a failed start triggers an alert and a rollback.
- Write a deploy runbook: first-deploy steps, secrets list, how to roll back via Coolify, how to inspect logs, how to recover from a stuck migration.

## Capabilities

### New Capabilities
- `coolify-topology`: The set of Coolify projects, their inter-dependencies, healthchecks, and the one-shot migrate pattern.
- `production-domains`: Configuring the platform domain, wildcard TLS, and per-tenant custom-domain attachment.

### Modified Capabilities
- `platform-infra`: Adds production-deploy-specific scenarios for the migrate-once pattern and wildcard certs.

## Impact

- **Code**: Updates to `compose.coolify.yml` (add `migrate` service and `depends_on`), new `/api/health` route in storefront, new `platform/docs/custom-domains.md` runbook.
- **Dependencies**: None new.
- **Infra**: Requires Coolify to be installed and reachable. Wildcard DNS pointed at the VPS. Cashfree webhook URL updated to the new public URL.
- **Risk**: First production deploy. Mitigated by: deploying to a staging subdomain first, rehearsing the rollback, and using Coolify's automatic backups before the first migration runs.
