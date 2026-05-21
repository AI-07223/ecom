## Why

Once the platform is in production and serving real client traffic, "did something break?" can't depend on the operator opening Coolify logs every morning. This change adds the minimum observability needed to know when something is wrong without watching the dashboard: Sentry for errors and slow transactions, Plausible (self-hosted on the same Coolify) for traffic analytics per tenant, and a Discord (or Slack) webhook for high-priority alerts.

## What Changes

- Add Sentry to both `apps/storefront`, `apps/client-admin`, `apps/backend` (Medusa), and `apps/worker` via `@sentry/nextjs` / `@sentry/node`. Configure source maps upload during build for unminified stack traces in production.
- Every Sentry event is tagged with the resolved tenant slug (read from `x-tenant-host` or the worker job's tenant metadata), so the operator can filter "show me errors only from Acme" in the Sentry UI.
- Add a self-hosted Plausible (or Umami) instance as a new Coolify service. Each tenant gets its own Plausible site; the storefront emits page-view events with the tenant's site identifier. Plausible's "shared link" feature lets the agency give a client read-only dashboard access.
- Add a Discord webhook (single channel, agency-only) wired to Sentry's alert rules for: any new issue, any spike in error rate >5x baseline, and any failed payment in production. Configurable threshold per rule.
- Add a `/api/health` endpoint that returns `{ status: "ok" | "degraded" | "down", db: bool, redis: bool, medusa: bool }` so external uptime monitoring (UptimeRobot, BetterStack) can poll a single URL and page the operator if the platform falls over.
- Add a runbook describing how to triage a Sentry alert: identifying tenant, severity, rollback decision tree.

## Capabilities

### New Capabilities
- `error-monitoring`: Sentry instrumentation across all apps with tenant-tagged events.
- `tenant-analytics`: Per-tenant Plausible site with shareable client-facing dashboards.
- `alerting`: Discord/Slack webhook on configurable error and payment-failure conditions.
- `external-healthcheck`: Public health endpoint suitable for external uptime monitors.

## Impact

- **Code**: Sentry init in each app, page-view tracking in the storefront layout, new `/api/health` route.
- **Dependencies**: `@sentry/nextjs`, `@sentry/node`. Plausible installed via Coolify's one-click templates (no npm dep).
- **Infra**: New Coolify service for Plausible; ~100MB image. Sentry can use the free tier initially; self-host later if quota is hit.
- **Risk**: Sentry can capture PII if not configured carefully (request bodies, error contexts). Mitigated by enabling Sentry's "Data Scrubbing" rules out of the box and adding a code-review note to never capture customer email/address directly.
