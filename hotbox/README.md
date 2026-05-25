# Hot Box · Cloud Kitchen

A single-restaurant food-delivery demo built on Next.js 16 + Prisma + Postgres + UPI manual payment, with an Expo Android APK for riders.

Two subprojects:

```
   hotbox/
   ├── web/         Next.js app — customer storefront, admin, rider-web (deployed to Coolify)
   └── rider-app/   Expo SDK 53 app — Android APK built via EAS Build
```

Independent `package.json` and `node_modules` for each — no monorepo overhead. Different ship targets (Coolify vs EAS Build).

## Live

- Storefront / admin / rider-web: <https://hotbox.networkbase75.site>
- APK install guide (public): <https://hotbox.networkbase75.site/r/install>
- APK distribution (admin only): <https://hotbox.networkbase75.site/admin/rider-app>

## Visual identity

The customer-facing site uses the operator's actual restaurant brand from `Hot Box Menu.pdf` (deep matte-black background, yellow Hot Box wordmark in a cyan ribbon with an orange flame icon, "100% PURE VEG" badge, real dish photos extracted from the printed menu).

| Token | Value | Used for |
|---|---|---|
| `--color-shell-bg` | `#0a0a0a` | Page background |
| `--color-shell-elev` | `#161616` | Cards, sheets, inputs |
| `--color-shell-fg` | `#f5f5f4` | Body text on dark |
| `--color-charcoal` | `#a1a1aa` | Hints, timestamps, labels |
| `--color-brand-yellow-300` | `#fcd34d` | Primary accent / CTAs / Hot Box wordmark |
| `--color-brand-cyan-300` | `#7fcfff` | Logo ribbon, secondary indicators |
| `--color-brand-flame-500` | `#f97316` | Flame icon, danger/destructive |
| `--color-veg` | `#22c55e` | FSSAI green-dot, success states |

Tokens live in [`web/app/globals.css`](web/app/globals.css). Component primitives live in [`web/components/brand/`](web/components/brand/) (`Logo`, `VegDot`, `CategoryPill`, `SectionHeader`, `DishPhoto`, `ItemRow`, `BottomCartBar`, `StickyCategoryTabs`).

The single-page menu at `/` lists every category and item on one scrollable surface with a sticky horizontal-scroll tab strip that tracks the visible section via IntersectionObserver. Quick-add `[+]` buttons add items without leaving the page; tapping the item name opens `/item/[slug]` for special instructions.

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

| Var | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string |
| `JWT_SECRET` | yes | 64-byte hex (use `openssl rand -hex 64`) |
| `ADMIN_PHONE` | yes | E.164. This number is auto-promoted to `admin` on signup. Auto-self-heal on signIn restores the role if it ever drifts. |
| `PUBLIC_BASE_URL` | yes | Full URL — used in QR codes, share links, transactional emails |
| `LATEST_APK_VERSION` | yes | Bump after each EAS Build + APK upload |
| `CRON_SECRET` | yes | Bearer token Coolify uses to invoke the daily payment-proof purge |
| `RESEND_API_KEY` | optional | When unset, password-reset links log to container stdout with `[reset-fallback]` |
| `RESEND_FROM_EMAIL` | optional | A Resend-verified domain. Defaults to `noreply@hotbox.networkbase75.site` (verify in Resend first) |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | optional | We use Leaflet + CARTO DarkMatter tiles by default; Mapbox is the upgrade |

> Cashfree, MSG91 OTP, and other earlier payment-provider env vars are no longer used — the demo accepts payments via either a manual UPI screenshot (verified by admin) or Cash on Delivery (rider-confirmed). See [`web/lib/payment-proof.ts`](web/lib/payment-proof.ts) for the screenshot pipeline.

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
npm run seed              # upsert Hot Box menu from prisma/hotbox-menu.json
```

## Asset pipeline

### Logo + dish photos (one-time, dev runs locally)

The operator's printed menu PDF is the source of truth for the brand. Two scripts extract assets from it; outputs are committed to git so production builds are hermetic.

```bash
# Logo: hand-traced SVG at web/public/brand/logo.svg
# Flame variant: web/public/brand/logo-flame.svg
# Favicons (16/32/180/192/512): web/public/icons/favicon-*.png
# Run once when the brand changes.
node -e "..."  # (see commit history; favicons regenerated via sharp from the SVG)

# Dish photos: crop regions hand-curated in the script
cd hotbox/web
npx tsx scripts/extract-dish-photos.ts ~/Downloads/'Hot Box Menu.pdf'
# Outputs ~16 JPEGs to web/public/dishes/seed/<slug>.jpg, each ≤ 60 KB
```

### Operator photo uploads (runtime, via admin UI)

The operator can replace any item's default photo from `/admin/menu`:

1. Click "Upload photo" next to the item.
2. Pick a JPEG/PNG/WebP/HEIC up to 5 MB.
3. Server compresses via sharp (q80 mozjpeg, max 1280px edge), saves to `/app/uploads/dishes/<itemId>.jpg`, and updates the `photo_filename` column.
4. The home + item-detail pages re-render with the new photo within seconds.

Photo resolution order in [`<DishPhoto>`](web/components/brand/DishPhoto.tsx):

1. Operator upload (`/api/menu/items/<id>/photo`)
2. PDF seed crop (`/dishes/seed/<slug>.jpg`)
3. Flame-tile fallback (brand-on)

## Deploy (Coolify)

The Dockerfile uses multi-stage Alpine. Builder runs `prisma generate` + `next build`. Runtime copies the full `node_modules` (needed for `prisma migrate deploy`'s transitive deps) + `.next/standalone` + Prisma artifacts. On container start:

```
prisma migrate deploy && (node prisma/seed.mjs || true) && exec node server.js
```

Coolify app uuid: `hdxy12d07otzrv7yzgqz50hl`. Volumes:

- `/app/uploads/` — payment-proof screenshots (30-day TTL via daily cron) and operator-uploaded dish photos under `dishes/`

Scheduled tasks:

- `purge-expired-payment-proofs` at `0 3 * * *` — calls `POST /api/admin/cron/purge-payment-proofs` with `CRON_SECRET` bearer

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
                          │   Email-password auth, JWT cookies      │
                          │   Manual UPI verify or COD              │
                          │   sharp compression for screenshots     │
                          │   Resend for transactional email        │
                          │   LISTEN/NOTIFY for SSE                 │
                          └─────────────────────────────────────────┘
```

## Where things live

```
   hotbox/web/
   ├── app/
   │   ├── (customer)              /, /item/[item], /cart, /checkout, /track/<id>, /account/*
   │   ├── (auth)                  /login, /signup, /reset-request, /reset/[token]
   │   ├── admin/                  /admin and tabs (Inbox, Riders, Menu, Rider App, Settings)
   │   ├── rider/                  /rider — web fallback for the APK
   │   ├── orders/[id]/...         /orders/<id>/confirmation, /orders/<id>/pay (UPI manual)
   │   ├── r/install/              /r/install (public APK install guide)
   │   ├── api/                    /api/health, /api/auth/*, /api/menu/items/<id>/photo,
   │   │                           /api/orders/<id>/payment-proof, /api/restaurant/upi-qr,
   │   │                           /api/admin/cron/purge-payment-proofs,
   │   │                           /api/rider/ping, /api/rider/order/<id>/<action>,
   │   │                           /api/rider/current-order, /api/rider/latest-version,
   │   │                           /api/track/<id>/stream
   │   └── _actions/               cart, checkout, addresses, admin-menu, admin-order,
   │                               admin-payment, admin-riders, admin-settings, admin-upi,
   │                               payment-proof, reorder, rider
   ├── components/brand/           Logo, VegDot, CategoryPill, SectionHeader, DishPhoto,
   │                               ItemRow, BottomCartBar, StickyCategoryTabs
   ├── components/                 MapPinPicker (Leaflet wrapper for address picker)
   ├── lib/                        auth, session, db, phone, catalog, cart, pricing,
   │                               order-state, addresses, orders, payment-proof,
   │                               menu-photos, resend
   ├── prisma/                     schema.prisma, migrations/, hotbox-menu.json, seed.mjs
   ├── scripts/                    extract-dish-photos.ts (PDF → JPEG seed photos)
   └── public/
       ├── brand/                  logo.svg, logo-flame.svg
       ├── icons/                  favicon-{16,32,180,192,512}.png
       ├── dishes/seed/            16 dish JPEGs cropped from the operator's PDF
       └── downloads/              rider-vX.Y.Z.apk
```

## Demo script

See [`docs/demo-script.md`](../docs/demo-script.md) for the 5-minute sales walkthrough.
