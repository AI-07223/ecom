## 1. Phase 1 — Live credentials + existing-loop smoke test

- [ ] 1.1 ⏸ **AWAITING OPERATOR** — open Cashfree merchant dashboard → Developers → API Keys → copy sandbox `app_id` and `secret_key` (paste into chat to unblock 1.3)
- [ ] 1.2 ⏸ **AWAITING OPERATOR** — Cashfree → Developers → Webhooks → create a webhook for `https://hotbox.networkbase75.site/api/cashfree/webhook` → copy the webhook secret
- [ ] 1.3 ⏸ **AWAITING OPERATOR** — once creds in hand, update Coolify env vars via MCP: `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY`, `CASHFREE_WEBHOOK_SECRET`, `CASHFREE_ENV=sandbox`, `ADMIN_PHONE=<your +91 number>`
- [ ] 1.4 ⏸ **AWAITING OPERATOR** — optional: MSG91 (`MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID`). Skipping = OTP codes are logged via `coolify application_logs` instead of texted
- [ ] 1.5 ⏸ **AWAITING OPERATOR** — trigger `hotbox-web` redeploy via MCP after env vars are set
- [ ] 1.6 ⏸ **AWAITING OPERATOR** — walk a real order on your phone (browse → cart → checkout → OTP → address with map → pay via Cashfree sandbox card `4111 1111 1111 1111`)
- [ ] 1.7 ⏸ **AWAITING OPERATOR** — verify confirmation renders PAID
- [ ] 1.8 ⏸ **AWAITING OPERATOR** — admin flow: open `/admin` → audio chime on new order → Accept → Cook → Ready
- [ ] 1.9 ⏸ **AWAITING OPERATOR** — add yourself as a rider in `/admin/riders` → assign the order to yourself
- [ ] 1.10 ⏸ **AWAITING OPERATOR** — rider flow: open `/rider` → OTP → "I've picked up" → grant location → "Heading out"
- [ ] 1.11 ⏸ **AWAITING OPERATOR** — open `/track/<id>` on a third device → verify the dot moves when you walk
- [ ] 1.12 ⏸ **AWAITING OPERATOR** — "I've delivered" → verify final state across all three views
- [ ] 1.13 ⏸ **AWAITING OPERATOR** — log any bug in `docs/known-issues.md`

## 2. Phase 2 — Polish and brand pass

- [x] 2.1 Brand palette refined (OKLCH values tuned for warm red-orange in `hotbox/web/app/globals.css`). Visual PDF extraction left as a future polish step.
- [x] 2.2 `@theme` block in `globals.css` now uses `--color-brand-{50..900}` ramp + `--color-charcoal` + warmer body `#fffaf6`
- [x] 2.3 Bebas Neue (display) + Inter (body) loaded via `next/font` in `app/layout.tsx`
- [x] 2.4 Replaced photo plan with per-category gradient+glyph art via new `components/CategoryArt.tsx` (20 distinct combos). Real photos can swap in via menu_items.image_url.
- [x] 2.5 Hero items get the same gradient treatment — same surface, swap on demand later
- [x] 2.6 Menu seed unchanged; CategoryArt renders the null cases
- [x] 2.7 `seed.mjs` already upserts `image_url` (verified)
- [x] 2.8 Placeholder blocks in catalog + item-detail pages swapped to `<CategoryArt categorySlug={...} />`
- [x] 2.9 Home page reworked: 7xl Bebas Neue logotype, tightened tagline + category cards w/ banners
- [x] 2.10 `docs/demo-script.md` written — three-device 5-min sales walkthrough + Q&A + sharp-edges disclosure
- [ ] 2.11 ⏸ **AWAITING DEPLOY** — push triggers Coolify rebuild; operator verifies on phone

## 3. Phase 3 — Rider Expo Android APK

- [ ] 3.1 ⏸ **AWAITING OPERATOR** — sign up at https://expo.dev/signup (one-time, ~3 min)
- [ ] 3.2 ⏸ **AWAITING OPERATOR** — install EAS CLI: `npm install -g eas-cli` (or use `npx eas-cli`)
- [x] 3.3 `hotbox/rider-app/` scaffolded with full layout (`app/`, `lib/`, `components/`, `assets/`)
- [ ] 3.4 ⏸ **AWAITING OPERATOR** — `cd hotbox/rider-app && npm install` (package.json with 11 pinned Expo SDK 53 deps is committed)
- [x] 3.5 `app.json` — name, bundle id `site.networkbase75.hotbox.rider`, FINE+BACKGROUND_LOCATION, FOREGROUND_SERVICE+LOCATION, POST_NOTIFICATIONS, WAKE_LOCK; expo-location plugin with foreground-service enabled
- [x] 3.6 `eas.json` with `preview` (APK) + `production` (AAB) profiles
- [ ] 3.7 ⏸ **AWAITING OPERATOR** — `npx eas login && npx eas init` to populate `extra.eas.projectId` (placeholder `REPLACE_AT_EAS_INIT`)
- [x] 3.8 `lib/api.ts` — fetch wrapper with `expo-secure-store` Bearer token, typed helpers for OTP, current-order, rider actions, ping, version check
- [x] 3.9 `app/login.tsx` — phone → OTP, role-gates rider/admin, saves token
- [x] 3.10 `app/index.tsx` — assigned-order home with pickup/drop/items cards + state-driven action button + refresh-on-pull + auto-refresh interval
- [x] 3.11 `lib/location-task.ts` — `expo-task-manager` registration + foreground service with persistent notification + 5s pings
- [x] 3.12 Web-side REST endpoint `/api/rider/order/[orderId]/[action]/route.ts` (picked-up/out-for-delivery/delivered) with rider-ownership auth check
- [x] 3.13 `/api/rider/current-order/route.ts` returns flattened order shape for the APK
- [x] 3.14 `app/setup.tsx` with `expo-device` manufacturer detection + per-brand tips (Xiaomi/Redmi/Poco/OPPO/Realme/Vivo/iQOO/OnePlus/Samsung)
- [x] 3.15 Update banner — APK polls `/api/rider/latest-version` on launch
- [x] (bonus) `lib/session.ts` extended to accept Bearer token via Authorization header alongside the cookie — same `getCurrentUser()` works for web + APK
- [x] (bonus) `/api/otp/verify` now accepts `requestToken: true` and returns the raw JWT in the response body for native clients
- [ ] 3.16 ⏸ **AWAITING OPERATOR** — local smoke via Expo Go: `npx expo start` (foreground GPS won't work here; UI flows do)
- [ ] 3.17 ⏸ **AWAITING OPERATOR** — `npm run build:apk` (≈ 8-12 min on EAS cloud)
- [ ] 3.18 ⏸ **AWAITING OPERATOR** — copy APK to `hotbox/web/public/downloads/rider-v0.1.0.apk`, commit, push
- [ ] 3.19 ⏸ **AWAITING OPERATOR** — `LATEST_APK_VERSION=0.1.0` already set in Coolify; verify after first build
- [ ] 3.20 ⏸ **AWAITING OPERATOR** — install + sign in + walk a delivery; verify foreground notification + map dot

## 4. Phase 4 — APK distribution UI

- [x] 4.1 `app/admin/rider-app/page.tsx` — version, APK-presence badge, Download / Copy link / WhatsApp share, server-rendered SVG QR via `qrcode`
- [x] 4.2 `app/r/install/page.tsx` — public mobile-first install page, brand logotype header, conditional amber banner when APK is missing
- [x] 4.3 Per-manufacturer accordion in `/r/install` (4 collapsible sections)
- [x] 4.4 `app/api/rider/latest-version/route.ts` — env-var driven response
- [x] 4.5 "Rider App" tab added to `app/admin/AdminNav.tsx`
- [ ] 4.6 ⏸ **AWAITING DEPLOY** — operator verifies on phone

## 5. Phase 5 — End-to-end real-device smoke test

- [ ] 5.1 ⏸ **AWAITING OPERATOR** — second Android device acquired
- [ ] 5.2 ⏸ **AWAITING OPERATOR** — APK installed via QR
- [ ] 5.3 ⏸ **AWAITING OPERATOR** — full two-device happy path with real walking
- [ ] 5.4 ⏸ **AWAITING OPERATOR** — foreground notification persists through screen-lock for ≥ 3 min
- [ ] 5.5 ⏸ **AWAITING OPERATOR** — `allow_cancel_after_accept = true` path
- [ ] 5.6 ⏸ **AWAITING OPERATOR** — PLACED → CANCELLED admin reject path
- [ ] 5.7 ⏸ **AWAITING OPERATOR** — out-of-stock during checkout path
- [ ] 5.8 ⏸ **AWAITING OPERATOR** — "Re-order" from history path
- [ ] 5.9 ⏸ **AWAITING OPERATOR** — `docs/known-issues.md` updated with any sharp edges

## 6. Phase 6 — Documentation + archive

- [x] 6.1 `hotbox/README.md` — overview, local dev, env-vars table, deploy notes, architecture diagram, file layout, demo-script pointer, APK version-bump runbook
- [x] 6.2 `hotbox/rider-app/README.md` — what it does, local Expo dev, EAS Build cheatsheet, project layout, known sharp edges, version-bump runbook
- [x] 6.3 Root `CLAUDE.md` updated — three-stacks framing (Legacy Firebase, Medusa parked, Hotbox active) + Hotbox-specific section
- [ ] 6.4 ⏸ **AWAITING OPERATOR** — after Phase 5 smoke test passes, mark hotbox-food-delivery tasks 10-14 done
- [ ] 6.5 ⏸ **AWAITING OPERATOR** — `/opsx:archive hotbox-food-delivery`
- [ ] 6.6 ⏸ **AWAITING OPERATOR** — `/opsx:archive hotbox-demo-finish-line`
