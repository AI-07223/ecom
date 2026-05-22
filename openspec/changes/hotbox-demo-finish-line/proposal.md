## Why

The `hotbox-food-delivery` change has landed the customer ordering loop, restaurant admin operations, rider web client, and SSE-driven live tracking — ~62% of its 120 original tasks. What remains is a mix of (a) production credentials and live integration verifications that gate the demo being usable by anyone other than the developer, (b) the rider Android APK (the differentiated sales asset that converts demo conversations into client signings), (c) polish on brand/photos/copy, and (d) docs.

Trying to attack these in parallel risks confusing context: APK work happens in a separate Expo project but depends on the same APIs the live web demo uses; polish work touches strings already in flight; smoke tests block APK builds because the APK calls the same /api/otp + /api/rider/ping endpoints. The operator has asked for the remaining work to be sequenced — done in a single deterministic order with no parallel branches — so each phase finishes before the next starts.

This change is that sequencing. It bundles all remaining work from `hotbox-food-delivery` (Sections 10–14 plus the live-deploy verification gaps in Sections 2/3/4/5/6/7/8/9) into one tightly-ordered finish-line sprint. Once it lands, both this change and `hotbox-food-delivery` archive together.

## What Changes

- **Phase 1 — Live credentials + smoke test the existing loop** (Day 1, ~2 hours)
  Set Cashfree sandbox `CASHFREE_APP_ID`/`CASHFREE_SECRET_KEY`/`CASHFREE_WEBHOOK_SECRET`, MSG91 `MSG91_AUTH_KEY`/`MSG91_TEMPLATE_ID`, and a real `ADMIN_PHONE` in Coolify. Register the Cashfree webhook URL in their dashboard. Walk a real order end-to-end across three devices: customer browses → cart → checkout → Cashfree pays → admin accepts → cook → ready → rider assigned → rider picks up → out for delivery → customer sees the moving dot → delivered → confirmation. Catch bugs while the code is fresh.
- **Phase 2 — Polish and brand pass** (Day 1–2, ~3 hours)
  Extract the real Hotbox brand palette and display typography from the menu PDF and update Tailwind v4 `@theme` tokens. Swap placeholder image blocks for curated Unsplash stock food photos on the top ~30 menu items (one image per category as a minimum). Tighten copy across the storefront and admin. Add a 5-minute demo script at `docs/demo-script.md`.
- **Phase 3 — Rider Expo Android APK** (Day 2–4, ~4–6 hours of focused work)
  Sign up for Expo + EAS (operator one-time, 5 min). Scaffold `hotbox/rider-app/` as an Expo SDK 53+ TypeScript project. Implement phone-OTP login screens hitting the existing `/api/otp/*` endpoints. Build the assigned-order screen mirroring the rider web UI (pickup + delivery + items + action button). Add a foreground location service (`expo-task-manager` + `expo-location` background-mode) that POSTs `/api/rider/ping` every 5 seconds with a persistent Android notification. Build the APK via EAS cloud (`eas build --platform android --profile preview`). Add an in-app update banner that polls `/api/rider/latest-version`. First-launch setup screen with per-manufacturer battery-saver instructions (Xiaomi/Oppo/Vivo/Realme).
- **Phase 4 — APK distribution UI** (Day 4, ~1 hour)
  Add `/admin/rider-app` to the existing admin panel — current version display, Download button, Copy install link, WhatsApp share, server-rendered QR code (using `qrcode` npm package already in deps). Add the public `/r/install` page with the illustrated 3-step install guide and per-manufacturer battery whitelist accordion. Wire `/api/rider/latest-version` to read from the env var `LATEST_APK_VERSION`. Host the APK at `hotbox/web/public/downloads/rider-v<semver>.apk`.
- **Phase 5 — End-to-end smoke test, real-devices** (Day 5, ~2 hours)
  Repeat Phase 1's three-device walkthrough but with the APK installed on the rider device. Test screen-lock with foreground notification active. Test `allow_cancel_after_accept=true` path. Test rejection from PLACED. Test out-of-stock during checkout. Test the "Re-order" history action. Document any sharp edges discovered.
- **Phase 6 — Docs + archive** (Day 5, ~1 hour)
  Write `hotbox/README.md` (local dev, env vars, deploy, seed). Write `hotbox/rider-app/README.md` (Expo dev, EAS Build, APK distribution flow). Update root `CLAUDE.md` with a `hotbox/` section parallel to the existing `platform/` section. Mark all checkboxes in `hotbox-food-delivery/tasks.md`. Archive both changes via `/opsx:archive`.
- **Explicitly NOT in this change** (deferred to future changes):
  - Multi-restaurant support
  - iOS app (Android APK only in v1)
  - Background-GPS reliability beyond Tier 2 (foreground service)
  - Push notifications (FCM/web push)
  - Promo codes, gift cards, reviews, ratings, loyalty
  - Real Cashfree production credentials (sandbox is the v1 target)
  - Auto-dispatch of riders (manual stays)
  - Multi-language (English/INR only)
  - The polish PDF brand extraction beyond palette + display font (icon redesigns etc. deferred)

## Capabilities

### New Capabilities

- `rider-mobile-app`: this change FINISHES the same-named capability that was scaffolded but not implemented in `hotbox-food-delivery`. Its spec file is unchanged (defined under `hotbox-food-delivery/specs/rider-mobile-app/spec.md`); this change owns its implementation across Phases 3 and 4.

### Modified Capabilities

None. This change does not add or alter any spec requirements — every requirement is already documented under `hotbox-food-delivery/specs/`. This change is purely an implementation-and-verification finish-line.

## Impact

- **Code**: New top-level `hotbox/rider-app/` Expo project. New admin page `hotbox/web/app/admin/rider-app/` + public `hotbox/web/app/r/install/`. New `hotbox/web/app/api/rider/latest-version/route.ts`. APK binary at `hotbox/web/public/downloads/rider-v<semver>.apk`. Tailwind theme tokens updated in `hotbox/web/app/globals.css`. Curated image assets in `hotbox/web/public/menu/`. New docs: `hotbox/README.md`, `hotbox/rider-app/README.md`, `docs/demo-script.md`.
- **Dependencies**: New Expo SDK 53+ deps in `hotbox/rider-app/`: `expo`, `expo-router`, `expo-location`, `expo-task-manager`, `expo-secure-store`, `expo-device`, `expo-notifications`. No new web-side runtime deps (`qrcode` already in package.json).
- **External services**: Expo (new free account for EAS Build; ~30 builds/mo on free tier covers iteration), Cashfree (existing sandbox account — credentials need entering in Coolify), MSG91 (new free signup OR keep dev-console OTP behavior).
- **DB**: No schema changes.
- **Coolify**: No new applications. Env vars updated on the existing `hotbox-web` app (Cashfree creds, MSG91 creds, ADMIN_PHONE, LATEST_APK_VERSION).
- **Risk**: APK install friction on non-technical riders (Xiaomi/Oppo battery savers can kill the foreground service even with whitelist tips). Documented as a known limitation. EAS Build's free tier could be exhausted by many iterations — operator should batch APK builds. Cashfree webhook signature verification has subtle timestamp validation that needs testing against their sandbox payload format.
- **Sequencing**: Strict linear. No phase starts before the previous phase's go/no-go check passes. Phase 1 going green is the gate for Phase 2; the smoke test in Phase 5 is the gate for Phase 6's archive.
- **Archive plan**: When all six phases land, both `hotbox-food-delivery` and `hotbox-demo-finish-line` are archived together via `/opsx:archive`. The repo enters a "Hotbox MVP shipped" state.
