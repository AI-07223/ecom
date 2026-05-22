## Context

This is a greenfield Next.js + Postgres + Expo project. There is no existing food-delivery code to migrate. The closest precedent in the repo is `platform/apps/storefront/` (Next.js 16 storefront for the Medusa platform) — we will not reuse it, but we *will* steal patterns we already validated there: server actions for cart mutations, lazy-Proxy DB clients to keep build-time import safe, the Coolify Dockerfile shape, Traefik label conventions, and the OpenSpec → tasks workflow.

The operator (single solo developer running this as a small-SaaS / consulting practice) is **not a developer first** — they need this to ship as a real product they can demo to local restaurant owners in their city. The Coolify VPS already hosts 11+ other apps. Resource discipline matters; everything in this design favours "one Node process + Postgres + no Redis" over "elegant but service-heavy."

The Hotbox brand is real (vegetarian fast-food, ~150 menu items, takes corporate / party / bulk orders). We have the menu PDF. We do **not** have explicit brand-color or typography tokens extracted from it — those are deferred polish.

## Goals / Non-Goals

**Goals:**

- A working three-actor loop (customer / restaurant / rider) demoable end-to-end on three devices in under 5 minutes.
- The rider can install an APK by scanning a QR code from the admin panel.
- The customer sees the rider's dot move on a map during `OUT_FOR_DELIVERY`.
- The restaurant owner can run the whole shift from one tablet: accept incoming orders, mark them ready, assign a rider, see the order land.
- Hot reload time during dev stays under 5 seconds — no monorepo build orchestration.
- Container RAM target: ≤ 400 MB at idle for the Next.js app.
- First deploy of the change finishes a Coolify build in ≤ 5 minutes (vs the 12–25 min Medusa baseline).

**Non-Goals:**

- Multi-restaurant marketplace, restaurant signup, commission engine.
- iOS app.
- Background GPS reliability beyond Android foreground-service tier.
- Push notifications (FCM/web push).
- Promo codes, gift cards, reviews, ratings, loyalty.
- Real Cashfree production credentials — sandbox is the v1 target.
- Auto-dispatch of riders. All assignment is manual.
- Inventory tracking (only "is available yes/no" per menu item).
- Multi-currency, multi-language (English-only INR-only v1).
- Tenant isolation. Hotbox is *one* restaurant; the multi-tenant work is a separate later change if a second client appears.

## Decisions

### D1 — Stack: Next.js 16 (App Router + Server Actions) + Prisma + Postgres

**Decision:** Single Next.js app, no separate backend service, no NestJS / Express / Fastify. Server Actions own all mutations. API routes used only where the client genuinely needs an endpoint URL (Cashfree webhooks, SSE streams, APK download, rider ping POSTs).

**Alternatives considered:**

- *Medusa v2* — rejected. Already validated as heavy (~1.5 GB RAM, 12–25 min deploys, see `coolify-production-deploy`). Overkill for food-delivery semantics that don't need its primitives.
- *Hono / Express + Next.js* — rejected. Adds a second process to monitor for no concrete win at v1 scale.
- *Drizzle ORM* — considered. Prisma chosen because the schema migration story is more autonomy-friendly: `prisma migrate dev` produces SQL on demand and `prisma migrate deploy` is the single command for production. Drizzle's kit is younger; not worth the bet for v1.

**Rationale:** The "Prime Directive" in `CLAUDE.md` is autonomy — Claude must write, run, observe, debug from terminal. Next.js + Prisma + Postgres meets this perfectly (no GUI required at any step). Server Actions eliminate REST API surface area until you actually need it.

### D2 — Realtime: Server-Sent Events from native Next.js streaming

**Decision:** Use `ReadableStream` + `Response` in a Next.js route handler at `/api/track/[orderId]/stream`. The rider POSTs `lat/lng` to `/api/rider/ping`; the route handler bumps a Postgres `LISTEN` channel via `pg_notify`; the SSE handler holds a `LISTEN` connection and yields events to the customer.

**Alternatives considered:**

- *WebSocket via `ws`* — rejected for v1. Bidirectional isn't needed; we only push server→client. Custom server config in Next.js adds deployment complexity.
- *Pusher / Ably* — rejected. External dependency for what Postgres + Node can do natively. Saved as escape hatch if `pg_notify` proves flaky at scale.
- *Supabase Realtime* — rejected. Already running supabase on this VPS for another project; pulling it in here couples two unrelated apps. Could swap in later.
- *Polling every 3 sec* — rejected. Visibly stuttery on a moving map, and burns more CPU than SSE at this scale.

**Rationale:** Postgres `LISTEN/NOTIFY` is older than I am, rock-solid, and the cheapest possible "realtime" primitive. Next.js streams SSE natively. Zero new dependencies. Failure mode is graceful: SSE reconnects automatically, and the customer's timeline falls back to "last known state from the DB" between reconnects.

### D3 — Map: Mapbox GL JS

**Decision:** Mapbox vector tiles + `mapbox-gl` JS lib. Public token committed to env. Hard 50k loads/month free tier.

**Alternatives considered:**

- *Leaflet + OpenStreetMap* — kept as a swap-target if Mapbox cost ever becomes an issue. Strictly worse-looking in v1.
- *Google Maps* — rejected for v1. Requires a credit card on file even for the free credit. Distraction.

**Rationale:** Demo polish matters for sales conversations; the map is the moment that sells the product. Mapbox looks like a real product out of the box. The 50k/mo tile cap won't bite at demo scale (~150 demo views/day).

### D4 — Auth: Phone-OTP only

**Decision:** Phone-OTP for both customers AND riders. Same auth flow, different role flag on the user record. Provider picked at apply-time between Cashfree's OTP API (already have account) and MSG91 (Indian-market standard). No email, no passwords, no social.

**Alternatives considered:**

- *NextAuth + email magic links* — rejected. Indians use phone numbers as identity; magic links to email require typing addresses you may not remember.
- *Firebase Auth* — rejected. The legacy app uses Firebase; we're explicitly decoupling.

**Rationale:** Phone-first is the only sane default for Indian SMB consumer apps in 2026. Cashfree OTP is cheaper than MSG91 if their pricing held; we choose at apply-time after a 5-min check.

### D5 — Payments: Cashfree.js v3 Drop-in, sandbox for v1

**Decision:** Use the official Cashfree.js v3 Drop-in JS SDK on the checkout page. Server creates the order with their PG API; client renders the Drop-in iframe; webhook updates order status on `PAYMENT_SUCCESS`. Sandbox creds in env vars for v1; production creds wired after a real client KYC.

**Alternatives considered:**

- *Razorpay* — rejected. The operator's stated stack is Cashfree; we don't switch payment providers in a v1 demo for no reason.
- *Stripe* — rejected. India market = INR domestic flows = Cashfree wins.
- *UPI deep links only* — rejected. Lower conversion, and Cashfree's Drop-in already supports UPI + cards + wallets + netbanking in one widget.

**Rationale:** Cashfree's Drop-in covers UPI / cards / wallets in one widget. The webhook + verification flow is well-documented (the `.claude/skills/cashfree-skills/*` skills already exist in this repo). Sandbox is good enough for demo; production wiring is a 30-min job when a real client signs.

### D6 — Order state machine — explicit transitions in code, not a generic state lib

**Decision:** Define transitions as a TypeScript map (`from → allowed_to_states[]`) checked in a server action helper. Each transition writes an `order_events` row with optional `lat/lng/note`. State stored as a Postgres enum.

**Alternatives considered:**

- *XState* — rejected. Overkill for ~8 states and ~10 transitions. Adds 30KB of bundle, learning curve.
- *DB-only enum with no guard* — rejected. Easy to skip a state by mistake (e.g., `PLACED → DELIVERED` without going through `PICKED_UP`). Explicit transition guard catches this in tests + dev.

**Rationale:** Forces discipline at write time, keeps the customer's timeline rendering simple (just `SELECT * FROM order_events WHERE order_id = ? ORDER BY created_at`), and makes the `allow_cancel_after_accept` toggle a one-line check inside the transition guard.

### D7 — Cancellation: per-restaurant `allow_cancel_after_accept` toggle

**Decision:** Single boolean column on the `restaurants` row, default `false`. The state-transition guard reads this; if `false`, `CANCELLED` is only allowed from `PLACED`. If `true`, `CANCELLED` is also allowed from `ACCEPTED`. Beyond `PREPARING` it is never allowed (kitchen has begun cooking — refund-only territory, deferred).

**Alternatives considered:**

- *Always allow until PREPARING* — rejected per operator's brief ("most don't want cancellation after order accepted").
- *Per-order cancel deadline (e.g., 60 sec after accept)* — rejected. Adds time-based complexity for no v1 win.

**Rationale:** Matches what the operator said is real-world demand. Toggle keeps it flexible without committing to either default for all future restaurants.

### D8 — Riders: manual CRUD + manual assignment, auto-flip on `DELIVERED`

**Decision:** Admin creates rider rows by entering phone + name. Riders log in with OTP using the same flow as customers (role flag distinguishes them). Admin assigns a rider to an order via a dropdown of "active riders without a `current_order_id`" on the ready-orders inbox. On `DELIVERED` transition, a trigger inside the state-machine helper sets `riders.current_order_id = NULL`.

**Alternatives considered:**

- *Auto-dispatch by nearest rider* — rejected. Operator explicitly said manual is fine for v1.
- *Rider self-signup* — rejected. Operator wants control.
- *FCM background push to rider apps on assignment* — deferred (push notifications are out of scope for v1; rider sees assignment on next foreground poll / SSE channel).

**Rationale:** Matches the brief exactly. Auto-dispatch is meaningful later when there are 5+ riders and the math matters; v1 has 1–3 riders and the owner knows them personally.

### D9 — Rider APK: Expo + EAS Build

**Decision:** New Expo SDK 53+ project at `hotbox/rider-app/`. Build artifacts go through EAS Build's cloud (no Android SDK on the operator's machine). The APK is downloaded from EAS, uploaded to `hotbox/web/public/downloads/rider-v<version>.apk`, served from `hotbox.networkbase75.site/downloads/rider-v0.1.0.apk`. Admin panel renders a download button + QR code + WhatsApp share link.

**Alternatives considered:**

- *Flutter* — strong second choice. Rejected because adding Dart/Flutter toolchain locally is friction, EAS cloud builds for Flutter aren't as smooth.
- *Capacitor wrapping the Next.js `/rider` page* — rejected. Background location reliability is the entire point of having an APK; Capacitor's background story is weak.
- *Trusted Web Activity (PWA shell)* — rejected. Cannot do background GPS at all.

**Rationale:** Expo + EAS = Claude can scaffold, build, and download APKs with only Node installed locally. Matches the "Prime Directive" autonomy test perfectly. Same TypeScript/React mental model as the Next.js app — minimal context switch.

### D10 — Background GPS reliability target: Tier 2 (foreground service with persistent notification)

**Decision:** When rider taps "Start delivery," app starts a foreground service via `expo-task-manager` + `expo-location` background mode. A persistent Android notification stays in the status bar saying "Hotbox Rider — tracking active." Tracking stops cleanly when rider taps "Delivered" or the service is killed (notification dismissed → service stops).

**Alternatives considered:**

- *Tier 1 (only while foreground + screen-on)* — rejected. Useless for actual deliveries — phone goes in pocket, screen locks.
- *Tier 3 (survives app kill on Xiaomi/Oppo)* — rejected for v1. Requires per-manufacturer battery-whitelist guides and still fails on some devices. Documented as a known limitation; v2 task.

**Rationale:** Tier 2 is what Swiggy/Zomato actually use. Honest demo promise. Known failure mode (force-killed app) is documented in admin's `/r/install` guide.

### D11 — Repository layout: greenfield top-level `hotbox/`, not nested in `platform/`

**Decision:** New folder `D:\projects\ecom\hotbox\` with two subdirectories: `web/` (Next.js + Prisma) and `rider-app/` (Expo). No monorepo workspace configuration — each subdirectory has its own independent `package.json` and `node_modules`. No Turborepo, no npm workspaces, no Lerna.

**Alternatives considered:**

- *Add to existing `platform/` monorepo* — rejected. Drags in Medusa transitive deps and Turbo build orchestration for no benefit.
- *Brand-new git repo* — rejected. Sharing the existing `.git`, GitHub Actions, Coolify project, and CLAUDE.md context is more valuable than the cleanliness of a separate repo.

**Rationale:** Less overhead, faster builds (no workspace resolution at install time), easier mental model. The two subdirectories ship to different platforms anyway (one Coolify, one EAS Build).

### D12 — Database: dedicated `hotbox-postgres` Coolify instance ※ revised during apply

**Decision:** Provision a brand-new Postgres 16 Coolify instance named `hotbox-postgres`. Reasons for revising from the original "reuse platform-postgres" plan:

1. **Matches the established VPS convention.** Every other project on the VPS already has its own postgres (`victor-postgres`, `ghyanganga-postgres`, etc.). One-postgres-per-project is the operator's existing pattern; reusing platform-postgres would be the odd one out.
2. **Credential simplicity.** Reusing platform-postgres requires running a `CREATE DATABASE hotbox; CREATE ROLE hotbox WITH PASSWORD …;` against it, which means fetching the postgres admin password — extra friction and a leakage risk.
3. **Tear-down isolation.** If Hotbox is abandoned, drop one instance. No risk of touching Medusa data.
4. **Backup story is independent** (when we add that capability later).

**Cost:** ~150 MB extra RAM. Acceptable on this VPS (free RAM headroom confirmed by the operator).

**Alternatives considered:**

- *Reuse `platform-postgres` with a logical `hotbox` database* — the original D12 decision. Saved RAM but added credential and operational complexity that wasn't worth it. Reversed during apply.
- *Same database, schema separation (`hotbox.*` schema)* — rejected. Schema-level isolation in Postgres is leaky and tooling support varies. Logical databases are cleaner.

**Rationale:** Same physical PG, different logical DB = strong-enough isolation (own connection string, own migrations, own user) with no resource doubling.

### D13 — Cart storage: Postgres row + session cookie

**Decision:** Cart lives as a Postgres `carts` row plus `cart_items` children. Anonymous visitors get a `cart_id` UUID written to an HttpOnly cookie. When they log in (OTP) at checkout, the cart's `customer_id` is set in the same transaction as the OTP verify; cart persists across sessions for known customers.

**Alternatives considered:**

- *Redis-only cart* — rejected. Redis is already running for the Medusa project but coupling Hotbox to it complicates the deploy. PG handles cart load fine.
- *localStorage-only* — rejected. Loses cart on device switch and breaks the "order again" flow.

**Rationale:** Simplest possible model that survives both anonymous and authenticated states. No new infra.

### D14 — Map provider account & token storage

**Decision:** Single Mapbox public token in `NEXT_PUBLIC_MAPBOX_TOKEN`. The Mapbox dashboard locks the token to `hotbox.networkbase75.site` (referrer restriction) so a leaked token can't burn the budget.

**Alternatives considered:**

- *Per-tenant tokens* — rejected. There's one tenant (Hotbox).
- *Server-side proxy of map tiles* — rejected. Burns VPS bandwidth for no security benefit when Mapbox referrer locking is the standard pattern.

### D15 — Deployment shape: one Coolify app, dockerfile multi-stage

**Decision:** Build & runtime in one Dockerfile, two stages. Builder stage runs `prisma generate` + `next build`. Runtime stage runs `prisma migrate deploy && exec node server.js`. Healthcheck on `/api/health`. Coolify start_period 60s, retries 10, interval 10s.

**Rationale:** Matches the pattern that worked for the Medusa storefront once we cleaned it up. Next.js builds in ~3 min, so the full build → live cycle is targeted at ≤ 5 min (vs Medusa's 12-25 min).

## Risks / Trade-offs

- **[Risk] Mapbox cost overrun at scale.** → 50k loads/mo is plenty for demo (≈ 1600 loads/day). Above 50k, swap to Leaflet+OSM in ~1 day. Build the map view behind a thin interface so swap is easy.

- **[Risk] Postgres `LISTEN/NOTIFY` doesn't scale past ~1000 concurrent connections.** → At demo scale (1 restaurant, ≤ 10 concurrent orders being tracked), this is comfortable. Documented as the scaling cliff. Swap-target: Supabase Realtime or Redis pub/sub.

- **[Risk] APK install friction loses non-technical riders.** → Mitigated by illustrated `/r/install` guide page + WhatsApp share with QR code + admin able to help in person. Documented as known.

- **[Risk] Xiaomi/Oppo battery savers kill the foreground service.** → Documented in install guide; admin can see "rider went offline" in real time and call them. Acceptable v1 behavior, not silently broken.

- **[Risk] Cashfree sandbox webhook signatures don't perfectly mirror production.** → Verify signature implementation against both in a single Vitest test using their published sandbox + prod sample payloads. The cashfree-skills already exist in this repo to help.

- **[Risk] Bigger scope creep from "just one more feature."** → Proposal explicitly enumerates 12+ deferred items. Any addition during apply requires updating `proposal.md` first, not silently expanding `tasks.md`.

- **[Trade-off] Phone-OTP costs ~₹0.15–₹0.25 per SMS.** → At demo scale (a few hundred OTPs/month), negligible. At 10k customers/month it becomes ~₹2000/mo — totally bearable for an SMB product.

- **[Trade-off] No push notifications in v1 means customer must keep the track page open to see updates.** → Acceptable because demo path keeps that page open; in production a follow-up change adds web-push (free) or FCM.

- **[Trade-off] Manual rider assignment puts work on the owner.** → Operator explicitly wants this. v2 could add a "suggest nearest available rider" button without changing the schema.

- **[Trade-off] Single-restaurant scope means the "Demo B" story is narrower than the original "template library" idea.** → Acceptable. If multi-restaurant becomes a real need, we extract `restaurant_id` into the schema in a follow-up change; the v1 data model already includes a `restaurant_id` FK on every relevant table to make that future migration trivial.

## Migration Plan

This is a greenfield change — nothing to migrate.

**Deployment order:**

1. Land `hotbox/web/` skeleton + Prisma schema + Coolify app provisioned + `/api/health` returns 200. (Day 1)
2. Seed Hotbox menu via a seed script that reads from a JSON file generated from the PDF text extract. (Day 2)
3. Customer browse + cart + customization. (Day 3-4)
4. OTP auth + address book + checkout + Cashfree sandbox. (Day 5-7)
5. Order state machine + restaurant admin inbox + accept/ready. (Day 8-9)
6. Manual rider CRUD + manual assignment + rider web client. (Day 10-11)
7. Live tracking SSE + customer map view. (Day 12-13)
8. Rider Expo app + EAS Build pipeline + APK distribution UI. (Day 14-17)
9. End-to-end smoke test on 3 real devices. (Day 18)
10. Buffer / polish / demo script. (Day 19-20)

**Rollback strategy:** Each phase is independently disable-able by reverting the corresponding Git commit. No database migrations remove data (only add). If the entire change is abandoned, the `hotbox/` directory is deleted, the Coolify app is decommissioned, and the `hotbox` PG database is dropped. No other app is affected.

## Open Questions

- **Q1 — Domain.** `hotbox.networkbase75.site` or a fresh one? Decide at the start of apply — DNS edit is 30 seconds in Cloudflare.
- **Q2 — OTP provider.** Cashfree OTP API vs MSG91. Decide at the apply-time auth task after a 5-minute price+API check.
- **Q3 — Demo restaurant location pin.** Where on the map does "Hotbox" sit? Should be near the operator's actual location so end-to-end GPS testing is real.
- **Q4 — Delivery radius for v1.** 5 km flat? Or no radius check at all (deliver anywhere within the city) for demo simplicity? Lean toward "no radius check" — fewer moving parts.
- **Q5 — Delivery fee logic for v1.** Flat ₹30? Or "free above ₹500"? Lean toward flat ₹30 — simplest demo math.
- **Q6 — How real should menu photos be?** Stock photos are fine for v1; commissioned photos are a v2 polish task.
- **Q7 — Should the Medusa storefront work resume after this lands, or be formally archived?** Defer until after Hotbox ships and we see whether prospects actually ask for the "boutique" template.
