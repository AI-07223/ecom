# Hotbox food delivery

A single-restaurant food-delivery demo built on Next.js 16 + Prisma + Postgres + Cashfree, with an Expo Android APK for riders.

Two subprojects:

```
   hotbox/
   ├── web/         Next.js app — customer, admin, rider-web (deployed to Coolify)
   └── rider-app/   Expo SDK 53 app — Android APK built via EAS Build
```

Independent `package.json` and `node_modules` for each — no monorepo overhead. Different ship targets (Coolify vs EAS Build).

## Live

- Storefront / admin / rider-web: <https://hotbox.networkbase75.site>
- APK install guide (public): <https://hotbox.networkbase75.site/r/install>
- APK distribution (admin only): <https://hotbox.networkbase75.site/admin/rider-app>

## Local development — web

```bash
cd hotbox/web
cp .env.example .env.local
# Fill DATABASE_URL etc. — local Postgres or point at the live db
npm install
npx prisma generate
npm run db:migrate -- --name local
npm run seed
npm run dev   # http://localhost:3000
```

### Env vars

| Var                       | Required | Notes                                                |
|---------------------------|----------|------------------------------------------------------|
| `DATABASE_URL`            | yes      | Postgres connection string                           |
| `CASHFREE_APP_ID`         | for pay  | Cashfree sandbox or prod                             |
| `CASHFREE_SECRET_KEY`     | for pay  | Cashfree sandbox or prod                             |
| `CASHFREE_WEBHOOK_SECRET` | for pay  | Set in Cashfree dashboard, paste here                |
| `CASHFREE_ENV`            | yes      | `sandbox` (default) or `production`                  |
| `NEXT_PUBLIC_MAPBOX_TOKEN`| optional | We currently use Leaflet+OSM; Mapbox is the upgrade  |
| `OTP_PROVIDER`            | yes      | `msg91`, `cashfree`, or blank (= dev-console)        |
| `MSG91_AUTH_KEY`          | if msg91 | From MSG91 dashboard                                 |
| `MSG91_TEMPLATE_ID`       | if msg91 | Approved DLT template id                             |
| `MSG91_SENDER_ID`         | optional | Defaults to `HOTBOX`                                 |
| `ADMIN_PHONE`             | yes      | E.164. This number gets `admin` role on OTP login.   |
| `JWT_SECRET`              | yes      | 64-byte hex (use `openssl rand -hex 64`)             |
| `PUBLIC_BASE_URL`         | yes      | Full URL — used in QR codes, share links, webhooks   |
| `LATEST_APK_VERSION`      | yes      | Bump after each EAS Build + APK upload               |

### Useful npm scripts

```bash
npm run dev               # turbopack dev server
npm run build             # prisma generate + next build (production)
npm run start             # production server (assumes build is done)
npm run typecheck         # tsc --noEmit
npm run test              # vitest run
npm run db:push           # apply schema without a migration (dev only)
npm run db:migrate dev    # create + apply a new migration
npm run db:deploy         # apply pending migrations (prod)
npm run db:studio         # Prisma Studio
npm run seed              # upsert Hotbox menu from prisma/hotbox-menu.json
```

## Deploy (Coolify)

The Dockerfile uses multi-stage Alpine. Builder runs `prisma generate` + `next build`. Runtime copies the full `node_modules` (needed for `prisma migrate deploy`'s transitive deps like `effect`) + `.next/standalone` + Prisma artifacts. On container start:

```
prisma migrate deploy && (node prisma/seed.mjs || true) && exec node server.js
```

Coolify app uuid: `hdxy12d07otzrv7yzgqz50hl`. Postgres uuid: see Coolify dashboard (it changes if recreated to clear a stuck migration).

### Bumping the APK version

1. In `hotbox/rider-app/`, bump `version` in `app.json`.
2. Run `eas build --platform android --profile preview --non-interactive`.
3. Download the resulting `.apk` from EAS.
4. Save as `hotbox/web/public/downloads/rider-v<new-version>.apk`. Commit.
5. In Coolify, update `LATEST_APK_VERSION` env var. Restart the app.
6. Visit `/admin/rider-app` to verify the QR code points at the new version.

## Architecture overview

```
   CUSTOMER (mobile web)        ADMIN (web)          RIDER (web + APK)
        │                          │                       │
        └─── Server Actions ───────┼─── Server Actions ────┤
                                   │                       │
                                   │                       └── /api/rider/ping
                                   │                              │
                                   │                              ▼ pg_notify
                                   │                       /api/track/<id>/stream
                                   │                              │ SSE
                                   ▼                              ▼
                          ┌─────────────────────────────────────────┐
                          │   Next.js 16 (App Router) on Coolify    │
                          │   ──────────────────────────────────    │
                          │   Prisma 6 → Postgres 16                │
                          │   Cashfree.js v3 + webhook              │
                          │   jose JWT (cookie OR bearer header)    │
                          │   LISTEN/NOTIFY for SSE                 │
                          └─────────────────────────────────────────┘
```

## Where things live

```
   hotbox/web/
   ├── app/
   │   ├── (customer routes)       /, /menu/[category], /item/[item], /cart, /checkout, /login, /track/<id>, /account/*
   │   ├── admin/                  /admin and tabs (Inbox, Riders, Menu, Rider App, Settings)
   │   ├── rider/                  /rider — web fallback for the APK
   │   ├── orders/[id]/...         /orders/<id>/confirmation
   │   ├── r/install/              /r/install (public APK install guide)
   │   ├── api/                    /api/health, /api/otp/*, /api/cashfree/webhook,
   │   │                           /api/rider/ping, /api/rider/order/<id>/<action>,
   │   │                           /api/rider/current-order, /api/rider/latest-version,
   │   │                           /api/track/<id>/stream
   │   └── _actions/               Server Actions: cart, checkout, addresses, admin-*, rider
   ├── components/                 VegBadge, CartBar, CategoryArt, MapPinPicker
   ├── lib/                        db, session, otp, phone, catalog, cart, pricing, order-state, cashfree, addresses, orders
   ├── prisma/                     schema.prisma, migrations/, hotbox-menu.json, seed.mjs, seed.ts
   ├── types/                      cashfree.d.ts (ambient typings for the v3 SDK)
   └── public/
       └── downloads/              rider-vX.Y.Z.apk
```

## Demo script

See [`docs/demo-script.md`](../../docs/demo-script.md) for the 5-minute sales walkthrough.
