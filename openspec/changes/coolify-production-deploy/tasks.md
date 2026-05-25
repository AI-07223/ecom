## 1. Git branch + Dockerfile prep

- [x] 1.1 Create `platform` branch on `AI-07223/ecom`; stage only platform-relevant files (platform/, openspec/, root config changes); commit; push
- [x] 1.2 Refactor `apps/backend/Dockerfile` to a production-ready image: `medusa build` during image build, CMD `medusa db:migrate && (medusa user || true) && medusa start`
- [x] 1.3 Refactor `apps/storefront/Dockerfile` to a production-ready image: `npm run build` for tenancy and storefront, CMD `next start`
- [x] 1.4 Add `apps/backend/src/api/health/route.ts` returning 200 JSON
- [x] 1.5 Add `apps/storefront/app/api/health/route.ts` returning 200 JSON
- [x] 1.6 Add `apps/storefront/proxy.ts` matcher exclusion so `/api/health` bypasses tenant resolution
- [x] 1.7 Add `apps/backend/src/migration-scripts/platform-tenants-table.ts` so the `tenants` table is created during `medusa db:migrate`

## 2. Coolify resources

- [x] 2.1 Create project `platform` in Coolify
- [x] 2.2 Create Postgres database (`platform-postgres`, `postgres:16-alpine`, is_public: false, internal hostname via UUID)
- [x] 2.3 Create Redis database (`platform-redis`, `redis:7-alpine`, is_public: false)
- [x] 2.4 Create Medusa application: Dockerfile build from `AI-07223/ecom` branch `platform`, base directory `/platform`, dockerfile `/apps/backend/Dockerfile`, exposes port 9000, FQDN `https://medusa.networkbase75.site`, health_check_path `/health`, start period 120s
- [x] 2.5 Set Medusa env vars: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `COOKIE_SECRET`, `STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS`, `MEDUSA_ADMIN_EMAIL`, `MEDUSA_ADMIN_PASSWORD`, `MEDUSA_DISABLE_TELEMETRY=true`
- [x] 2.6 Create Storefront application: Dockerfile build from `AI-07223/ecom` branch `platform`, base directory `/platform`, dockerfile `/apps/storefront/Dockerfile`, exposes port 3000, FQDNs `https://acme.networkbase75.site,https://globex.networkbase75.site`, health_check_path `/api/health`, start period 60s
- [x] 2.7 Set Storefront env vars: `PLATFORM_DATABASE_URL`, `MEDUSA_BACKEND_URL` (internal `http://<medusa-uuid>:9000`), `NEXT_PUBLIC_MEDUSA_BACKEND_URL` (public HTTPS), `NEXT_TELEMETRY_DISABLED=1`

## 3. First deploy

- [ ] 3.1 Trigger deploy on Medusa application; wait for `running:healthy` status
- [ ] 3.2 Trigger deploy on Storefront application; wait for `running:healthy` status
- [ ] 3.3 Verify `GET https://medusa.networkbase75.site/health` returns 200 with `{ "status": "ok", "service": "medusa" }`
- [ ] 3.4 Verify `GET https://acme.networkbase75.site/api/health` returns 200 with `{ "status": "ok", "service": "storefront" }`
- [ ] 3.5 Confirm a valid TLS certificate is issued for each of `medusa.`, `acme.`, `globex.networkbase75.site`

## 4. Production seed

- [ ] 4.1 Toggle Postgres `is_public: true` temporarily
- [ ] 4.2 From a developer machine, run `npm run seed` with `PLATFORM_DATABASE_URL` pointed at the public Postgres + `MEDUSA_BACKEND_URL=https://medusa.networkbase75.site` + `MEDUSA_ADMIN_EMAIL` and `MEDUSA_ADMIN_PASSWORD` matching what Coolify set
- [ ] 4.3 Toggle Postgres `is_public: false` again
- [ ] 4.4 Visit `https://acme.networkbase75.site` and `https://globex.networkbase75.site` — confirm tenant-branded storefronts render with their products

## 5. Documentation + validation

- [ ] 5.1 Update `platform/README.md` with a "Deployment" section explaining the Coolify topology, the env vars Coolify needs, and the manual seed step until `tenant-onboarding-cli` lands
- [ ] 5.2 Document the Coolify UUIDs (project, apps, databases) in `platform/docs/deployment.md` for the operator's reference
- [ ] 5.3 Run `openspec validate coolify-production-deploy --strict`; fix any reported issues
