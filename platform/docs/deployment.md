# Platform deployment

Reference notes for the production deployment on the Coolify VPS.

## Coolify resources

All four resources live in the **`platform`** project (uuid `lvulqv6j47jte2eeldvarsdr`) under the `production` environment (uuid `olh2nj2peudkmmox0fid0snf`).

| Resource | Type | UUID | Domain / Hostname |
| --- | --- | --- | --- |
| `platform-postgres` | Postgres 16-alpine database | `vz8rn4gh63h3lp2liylglm04` | internal-only |
| `platform-redis` | Redis 7-alpine database | `sv057oqlb8lecjpnh8k4a471` | internal-only |
| `platform-medusa` | Application (Dockerfile) | `ry5r3vqflmuylanko5o1g9gh` | `https://medusa.networkbase75.site` |
| `platform-storefront` | Application (Dockerfile) | `dgfcfbhzjpxlf2dcb7r3zm2p` | `https://acme.networkbase75.site`, `https://globex.networkbase75.site` |

## Source

- **Repo:** `https://github.com/AI-07223/ecom`
- **Branch:** `platform`
- **Base directory:** `/platform`
- **Medusa Dockerfile:** `/apps/backend/Dockerfile`
- **Storefront Dockerfile:** `/apps/storefront/Dockerfile`

`master` keeps the legacy Firebase code. Future platform changes land on `platform` first; Coolify auto-deploys on push to that branch.

## Healthchecks

- Medusa: `GET /health` on port 9000 (start period 120s — accommodates first-boot migrations)
- Storefront: `GET /api/health` on port 3000 (start period 60s)

Both return `200 { "status": "ok" }`.

## On-boot CMD chains

**Medusa container** runs on each start:

```
medusa db:migrate
  → applies Medusa's own schema + platform-tenants-table.ts migration script
medusa user -e $MEDUSA_ADMIN_EMAIL -p $MEDUSA_ADMIN_PASSWORD || true
  → idempotent admin user provisioning
medusa start
  → production server on port 9000
```

**Storefront container** runs `next start -H 0.0.0.0 -p 3000` against the pre-built `.next/` output.

## Required env vars (Coolify dashboard)

**`platform-medusa`:**

| Key | Value |
| --- | --- |
| `DATABASE_URL` | `postgres://platform:***@vz8rn4gh63h3lp2liylglm04:5432/platform` |
| `REDIS_URL` | `redis://default:***@sv057oqlb8lecjpnh8k4a471:6379/0` |
| `JWT_SECRET` | 32-byte hex (rotate with `openssl rand -hex 32`) |
| `COOKIE_SECRET` | 32-byte hex |
| `STORE_CORS` | `https://acme.networkbase75.site,https://globex.networkbase75.site` |
| `ADMIN_CORS` | `https://medusa.networkbase75.site` |
| `AUTH_CORS` | union of the above |
| `MEDUSA_ADMIN_EMAIL` | `admin@platform.networkbase75.site` |
| `MEDUSA_ADMIN_PASSWORD` | 20-byte hex |
| `MEDUSA_DISABLE_TELEMETRY` | `true` |

**`platform-storefront`:**

| Key | Value |
| --- | --- |
| `PLATFORM_DATABASE_URL` | same as Medusa's `DATABASE_URL` |
| `MEDUSA_BACKEND_URL` | `http://ry5r3vqflmuylanko5o1g9gh:9000` (internal Coolify network) |
| `NEXT_PUBLIC_MEDUSA_BACKEND_URL` | `https://medusa.networkbase75.site` |
| `NEXT_TELEMETRY_DISABLED` | `1` |

## Triggering a deploy

From a developer machine with the Coolify MCP loaded:

```
mcp__coolify__deploy { tag_or_uuid: "ry5r3vqflmuylanko5o1g9gh" }
mcp__coolify__deploy { tag_or_uuid: "dgfcfbhzjpxlf2dcb7r3zm2p" }
```

Or via Coolify's UI (push the "Redeploy" button per app).

A `git push` to the `platform` branch does NOT auto-trigger yet (deferred to the `ci-cd-pipeline` change).

## First-time seeding (until `tenant-onboarding-cli` lands)

Postgres is intentionally `is_public: false`. To seed in production:

1. Toggle Postgres public via Coolify MCP:
   ```
   mcp__coolify__database { action: "update", uuid: "vz8rn4gh63h3lp2liylglm04", is_public: true, public_port: 54321 }
   ```
   (use a non-standard port to avoid scanners)
2. On a developer machine, with the platform repo checked out:
   ```bash
   cd platform
   PLATFORM_DATABASE_URL=postgres://platform:***@<vps-ip>:54321/platform \
   MEDUSA_BACKEND_URL=https://medusa.networkbase75.site \
   MEDUSA_ADMIN_EMAIL=admin@platform.networkbase75.site \
   MEDUSA_ADMIN_PASSWORD=*** \
   npm run seed
   ```
3. Toggle Postgres back to private:
   ```
   mcp__coolify__database { action: "update", uuid: "vz8rn4gh63h3lp2liylglm04", is_public: false }
   ```

## Rollback

Coolify keeps the last working image. To roll back a failed deploy:

1. In Coolify's UI for the application, open "Deployments"
2. Click "Rollback" on the most recent green deployment

Or via the API, set `git_commit_sha` on the application to the last green commit and trigger a redeploy.

## Backups

Manual until the `automated-postgres-backups` change lands. To take an ad-hoc backup:

```
mcp__coolify__database_backups { action: "create", uuid: "vz8rn4gh63h3lp2liylglm04" }
```
