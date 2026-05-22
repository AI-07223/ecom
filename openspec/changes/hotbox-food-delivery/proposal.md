## Why

The current `coolify-production-deploy` direction (Medusa v2 + N storefront templates) is too heavy and too generic for the kind of clients we can realistically sell to right now. Indian SMB food businesses (cloud kitchens, single-location restaurants, tiffin services) want one specific thing: their own delivery app with live order tracking and their own rider workflow — not a Shopify-style multi-vertical commerce engine. Medusa stays parked at `medusa.networkbase75.site` for later; this change builds the differentiated product instead: a complete Next.js food-delivery demo branded as **Hotbox** (a real vegetarian fast-food brand whose menu we have on hand) with a phone-OTP customer flow, manual rider operations, live GPS tracking, and a downloadable Android APK for riders.

The point is to land a **working, demoable product** that a real Indian restaurant owner can watch end-to-end on three devices in five minutes — then say "I want this." Polish is deferred; the loop matters first.

## What Changes

- New top-level directory `hotbox/` in this repo, parallel to `platform/` (not nested — keeps it free of the Medusa monorepo overhead).
- New Next.js 16 (App Router + Server Actions) app at `hotbox/web/` serving three audiences from one codebase:
  - Customer (mobile-first PWA at `/`)
  - Restaurant admin (`/admin`)
  - Rider web client (`/rider`) — same APIs the APK will later call
- New Expo (React Native) project at `hotbox/rider-app/` producing an Android APK via EAS Build. APK is hosted by the web app at a versioned download URL; admin panel exposes it as a download link, QR code, and shareable WhatsApp link.
- New Postgres database `hotbox` on the existing Coolify-managed `platform-postgres` server. Prisma schema lives in `hotbox/web/prisma/`.
- New Coolify application for `hotbox.networkbase75.site` (or pick a fresher domain — defer naming).
- Phone-OTP auth for customers (Cashfree's OTP API or MSG91; pick at apply-time based on what's cheapest at signup).
- Cashfree.js v3 Drop-in for checkout. Sandbox in dev/demo; production wiring deferred until a real client.
- Live tracking via native Next.js streaming (Server-Sent Events) — no Redis pub/sub, no WebSocket library. Rider client (web or APK) POSTs lat/lng every 5 seconds; customer's `/track/<order>` page subscribes via SSE.
- Map rendering via Mapbox GL JS (50k free loads/month, beautiful out of the box). Leaflet+OSM is the swap-target if Mapbox costs become a problem.
- Order state machine with explicit transitions and an event log table that drives the customer's timeline:
  `PLACED → ACCEPTED → PREPARING → READY → ASSIGNED → PICKED_UP → OUT_FOR_DELIVERY → DELIVERED` (plus `CANCELLED` from any pre-`PREPARING` state, gated by a per-restaurant `allow_cancel_after_accept` toggle).
- Riders are created and assigned **manually** by admin — no rider self-signup, no auto-dispatch. After a rider marks `DELIVERED`, their `current_order_id` automatically flips to null so admin sees them as available again.
- Menu seeded from the actual Hotbox menu PDF (~150 items across ~20 categories: Beverages, Sandwich, Maggi, Chaap, Wraps, Burger, Pizza, Momos, Pasta, Snacks, Starters, Noodles, Fry & Tadka, Curry, Paneer, Vegetable, Rice, Breads, Add-On, Ice Cream).
- Brand theme uses Hotbox-style fast-food defaults for v1 (warm reds/oranges, bold display typography). Exact palette + fonts pulled from the brand PDF in a follow-up polish task — visual brand fidelity is not a v1 gate.
- **DEFERRED to follow-up changes** (call out explicitly to prevent scope creep):
  - Multi-restaurant marketplace logic (commissions, restaurant signup, search by cuisine).
  - Native iOS app (Android APK only for v1).
  - Background GPS reliability beyond foreground-service tier (Android 11+ "while in use" with persistent notification — same as Swiggy/Zomato).
  - ETA from a routing engine (v1 shows straight-line distance estimate, or just "Arriving soon").
  - Reviews, ratings, referrals, promo codes, gift cards, loyalty.
  - Push notifications (web push or FCM) — v1 is in-app polling/SSE only.
  - Multi-warehouse, multi-currency, returns workflow (all explicit no's — those are Demo A territory).
- **BREAKING** is not applicable — this is a greenfield product, not a modification of an existing capability.

## Capabilities

### New Capabilities

- `food-catalog`: Menu data model (categories, items, variants, add-ons), availability toggles, restaurant operating hours/paused state, menu seed loader for the Hotbox PDF data.
- `customer-ordering`: Phone-OTP auth, mobile-first PWA, menu browse with veg-only filter, item customization (variant + add-ons), cart with snapshot pricing, address book with map pin, Cashfree.js v3 checkout, order confirmation, "order again" from history.
- `order-lifecycle`: Full state machine with explicit transitions, per-restaurant `allow_cancel_after_accept` toggle, event log table that customer timeline subscribes to, GST + delivery fee + packaging fee calculation snapshotted at order creation.
- `restaurant-operations`: Admin web panel for the restaurant owner — incoming order inbox with audio bell, accept/reject/ready flows, mark item out-of-stock, set restaurant hours, pause/unpause orders, manual rider CRUD, manual rider-to-order assignment, today's revenue tile.
- `live-tracking`: Rider GPS ping ingest endpoint, SSE stream per order id, customer-facing live timeline + map view, rider state auto-flips to available after `DELIVERED`.
- `rider-mobile-app`: Expo + EAS Build pipeline producing signed Android APK, foreground location service with persistent notification, phone-OTP login (same as customer), assigned-order view, "Picked up" / "Delivered" buttons, admin distribution UI (download link, QR code, WhatsApp share button), versioned `/api/rider/latest-version` check.

### Modified Capabilities

None. This change does not modify any spec in `openspec/specs/` — all existing specs belong to the parallel Medusa/multi-tenant platform direction, which stays untouched at `medusa.networkbase75.site`.

## Impact

- **Code**: Two new app subdirectories (`hotbox/web/`, `hotbox/rider-app/`), one new Prisma schema, no changes to existing `platform/` code or `src/` (legacy Firebase app).
- **Dependencies**: New runtime deps in `hotbox/web/` — Next.js 16, Prisma, `@cashfreepayments/cashfree-js`, `mapbox-gl`, lightweight server-side SSE helper. New build deps in `hotbox/rider-app/` — Expo SDK, `expo-location`, `expo-task-manager`, `expo-notifications`. No shared dependency churn.
- **DB**: New Postgres database `hotbox` on the existing `platform-postgres` Coolify instance. Migrations managed by Prisma (`prisma migrate dev` for local, `prisma migrate deploy` in CMD on container start).
- **Coolify**: One new application (Next.js dockerfile, healthcheck on `/api/health`, ~200–350 MB RAM). EAS Build runs in Expo's cloud — no extra burden on the VPS for the APK pipeline.
- **External services**: Cashfree (existing account, sandbox), Mapbox (new free-tier signup), OTP provider (Cashfree OTP API or MSG91 — decide at apply-time), Expo (new free account for EAS Build).
- **Risk**: APK install friction (Android "unknown sources" warning), per-manufacturer battery-saver behavior (Xiaomi/Oppo can kill the rider app). Mitigated by an illustrated install guide page (`/r/install`) and the demo using a stable demo phone.
- **Sequencing**: Built incrementally — customer flow first (catalog → cart → checkout → order confirmation), then restaurant admin (inbox → accept → ready), then rider web (manual assign → GPS streaming), then customer live tracking, then rider APK as a swap-in client. Rider APK is the LAST phase so the web equivalent is always a fallback if EAS Build pipeline hits friction.
- **Out of scope**: All Medusa/platform work pauses but is not deleted. The `coolify-production-deploy` change stays open at 14/26 tasks; we can decide whether to finish or formally pause it after this change ships. The other six "no-tasks" OpenSpec changes (ci-cd-pipeline, observability-baseline, etc.) are independent of this direction and remain in the backlog.
