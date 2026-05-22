## 1. Phase 1 — Live credentials + existing-loop smoke test

- [ ] 1.1 Operator opens Cashfree merchant dashboard → Developers → API Keys → copies sandbox `app_id` and `secret_key` into chat
- [ ] 1.2 Operator opens Cashfree → Developers → Webhooks → creates a webhook pointing at `https://hotbox.networkbase75.site/api/cashfree/webhook` → copies the generated webhook secret
- [ ] 1.3 Update Coolify env vars via MCP: `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY`, `CASHFREE_WEBHOOK_SECRET`, `CASHFREE_ENV=sandbox`, `ADMIN_PHONE=<operator's real +91 number>`
- [ ] 1.4 Optionally configure MSG91 (`MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID`) — or leave blank to use dev-console OTP (visible via `mcp__coolify__application_logs`)
- [ ] 1.5 Trigger a `hotbox-web` redeploy via MCP — env-var changes don't auto-deploy unless the app is restarted
- [ ] 1.6 Wait for `/api/health` 200 then walk the demo loop on the operator's phone: visit `/` → tap "Burger" → tap "Aloo Tikki Burger" → add to cart → go to cart → continue to checkout → sign in via OTP → save an address with the map picker → pay via Cashfree sandbox card `4111 1111 1111 1111` (any CVV, any future expiry)
- [ ] 1.7 Verify the order confirmation page renders with PAID status (Cashfree webhook should have fired within 2 seconds)
- [ ] 1.8 Operator switches to admin device (or same phone): open `/admin` → see the new order in the inbox → audio chime plays → tap Accept → Start cooking → Mark ready
- [ ] 1.9 Operator adds themselves as a rider in `/admin/riders` (phone + name) → goes back to inbox → assigns the READY order to themselves
- [ ] 1.10 Operator switches to rider device (or same phone): open `/rider` → sign in via OTP → see the assigned order → tap "I've picked up" → grant location permission → tap "Heading out — start tracking"
- [ ] 1.11 Operator opens the customer's `/track/<orderId>` URL on a third device (or the same phone in a private window) → verify the map appears with the rider dot → walk a few meters → verify the dot moves within 5 seconds
- [ ] 1.12 Operator taps "I've delivered the order" on the rider device → verify the order moves to DELIVERED, rider currentOrderId clears in admin view, customer's timeline shows the delivered event
- [ ] 1.13 Document any bug found in `docs/known-issues.md` and fix it before proceeding. Phase 1 only passes when the full happy path works.

## 2. Phase 2 — Polish and brand pass

- [ ] 2.1 Open `Hot Box Menu.pdf` in a viewer; sample dominant red/orange tones (target the brand-primary). If a display typeface is visible on the cover, identify it
- [ ] 2.2 Update `hotbox/web/app/globals.css` `@theme` block with the real brand colors (`--color-brand-500`, `--color-brand-50/100/.../900` derived) and `--font-display` if a brand typeface exists
- [ ] 2.3 If a non-system font is needed, wire it via `next/font` in `app/layout.tsx` (Google Fonts preferred; self-hosted falls back to Inter)
- [ ] 2.4 Curate one Unsplash photo per menu category (~20 photos) — save as `hotbox/web/public/menu/<category-slug>.jpg`, ≤ 200 KB each, 4:3 aspect, focal subject centered
- [ ] 2.5 Pick 10 hero items (most likely to drive demo conversation: Cold Coffee, Veg Burger, Margherita Pizza, Paneer Tikka Masala, Veg Chowmein, Masala Maggi, Aloo Paratha, Veg Biryani, Steam Momos, Vanilla Ice Cream) — give each a dedicated photo at `hotbox/web/public/menu/<item-slug>.jpg`
- [ ] 2.6 Update `hotbox/web/prisma/hotbox-menu.json` so each category's items default to the category photo, and the 10 hero items override with their dedicated photo (`image_url` field)
- [ ] 2.7 Update `hotbox/web/prisma/seed.mjs` if needed so it re-applies `image_url` on the next deploy's seed pass (seed.mjs already upserts, just confirm `image_url` is in the update path)
- [ ] 2.8 Replace the gradient-block placeholder rendering in `menu/[category]/page.tsx` and `item/[item]/page.tsx` with `<Image>` from `next/image` pointing at the seeded URLs; gradient block remains as fallback when `image_url` is null
- [ ] 2.9 Copy pass: read every customer-facing string in `app/page.tsx`, `app/menu/[category]/page.tsx`, `app/item/[item]/page.tsx`, `app/cart/page.tsx`, `app/checkout/page.tsx`, `app/orders/[id]/confirmation/page.tsx`, `app/track/[orderId]/page.tsx`, `app/login/page.tsx` and tighten any awkward phrasing
- [ ] 2.10 Write `docs/demo-script.md` — 5-minute scripted walkthrough for sales calls
- [ ] 2.11 Push, redeploy, eyeball every page on the operator's phone for visual polish

## 3. Phase 3 — Rider Expo Android APK

- [ ] 3.1 Operator signs up for Expo (https://expo.dev/signup) — one-time, ~3 minutes
- [ ] 3.2 Install EAS CLI locally if not present: `npm install -g eas-cli` (or use `npx`)
- [ ] 3.3 Initialize the Expo project at `hotbox/rider-app/` — `npx create-expo-app@latest hotbox/rider-app --template blank-typescript`
- [ ] 3.4 Install Expo deps: `npx expo install expo-router expo-location expo-task-manager expo-secure-store expo-device expo-notifications expo-constants`
- [ ] 3.5 Configure `app.json`: app name "Hotbox Rider", bundle id `site.networkbase75.hotbox.rider`, Android permissions (ACCESS_FINE_LOCATION, ACCESS_BACKGROUND_LOCATION, FOREGROUND_SERVICE, FOREGROUND_SERVICE_LOCATION, POST_NOTIFICATIONS), `expo-location` background-mode plugin config, icon + splash from the same brand palette as the web
- [ ] 3.6 Create `eas.json` with `preview` profile (apk output, EAS-managed signing key) and `production` profile
- [ ] 3.7 Run `eas init` to link the project to the Expo account, then `eas login`
- [ ] 3.8 Create `lib/api.ts` — fetch wrapper that reads the bearer token from `expo-secure-store` and prepends `https://hotbox.networkbase75.site` to every request
- [ ] 3.9 Build OTP login screens: phone-entry → 6-digit-OTP-entry → role check (must be rider or admin, else show "ask admin to add you as a rider")
- [ ] 3.10 Build the assigned-order screen: fetch `/api/rider/current-order` (new endpoint needed — see 3.13), render pickup + delivery + items + single action button matching state
- [ ] 3.11 Implement the foreground location service via `expo-task-manager`'s `defineTask` + `Location.startLocationUpdatesAsync` with `foregroundService: { notificationTitle: "Hotbox Rider — tracking", notificationBody: "Your delivery is being tracked", notificationColor: "<brand>" }`. Posts to `/api/rider/ping` every 5 seconds while running
- [ ] 3.12 Wire the action buttons (Picked up / Heading out / Delivered) to call the existing Server Actions via fetch wrappers — since Server Actions aren't directly callable from a native client, create thin REST endpoints at `/api/rider/order/[id]/{picked-up,out-for-delivery,delivered}` that internally call the same helpers; add them to the web
- [ ] 3.13 Add `/api/rider/current-order` route to the web that returns the rider's `current_order_id` + full order details (the APK polls this on launch)
- [ ] 3.14 Implement first-launch setup screen — detect `Device.manufacturer` and render per-brand battery-saver instructions; add a "Skip" button
- [ ] 3.15 Implement `/api/rider/latest-version` polling on app start — show a yellow "Update available" banner if a newer version exists; tapping opens the system browser to the APK URL
- [ ] 3.16 Local smoke test via Expo Go (`npx expo start`) on the operator's Android — verify OTP login, order display, action buttons (foreground GPS won't work in Expo Go — that's APK-only)
- [ ] 3.17 Build the first APK: `eas build --platform android --profile preview --non-interactive` — takes ~8-12 minutes on EAS cloud
- [ ] 3.18 Download the APK from the EAS dashboard URL → save as `hotbox/web/public/downloads/rider-v0.1.0.apk` → commit to repo
- [ ] 3.19 Update `LATEST_APK_VERSION=0.1.0` in Coolify env vars
- [ ] 3.20 Install the APK on the operator's Android device (one-time: enable "Install unknown apps" for the browser) → verify OTP login → verify foreground notification appears on "Heading out" → verify GPS pings show in customer's `/track/<id>` view

## 4. Phase 4 — APK distribution UI

- [ ] 4.1 Implement `app/admin/rider-app/page.tsx` — version display, Download button, Copy link button, WhatsApp share button (`https://wa.me/?text=<urlencoded-install-link>`), QR code rendered via the `qrcode` package as inline SVG
- [ ] 4.2 Implement `app/r/install/page.tsx` (public, no auth) — branded mobile-first install page with a 3-step illustrated guide and the "Download APK" CTA
- [ ] 4.3 Add a collapsible accordion to `/r/install` with per-manufacturer battery-saver tips (Xiaomi, Oppo, Vivo, Realme, Samsung, OnePlus)
- [ ] 4.4 Implement `app/api/rider/latest-version/route.ts` — returns `{ version, apk_url, changelog? }` from `LATEST_APK_VERSION` env var
- [ ] 4.5 Add a tab "Rider App" to `app/admin/AdminNav.tsx` linking to `/admin/rider-app`
- [ ] 4.6 Push, redeploy, verify on operator's phone — scan the QR with the phone camera to confirm it links to the install page

## 5. Phase 5 — End-to-end real-device smoke test

- [ ] 5.1 Operator gets a second Android device (their own + a friend's, or two of their own)
- [ ] 5.2 Install the Hotbox Rider APK on Device B via the QR code from `/admin/rider-app`
- [ ] 5.3 Walk the full happy path with two devices: Device A (customer + admin) places order → accepts → cooks → ready → assigns Device B (rider). Device B picks up → goes outside walking → Device A's `/track/<id>` shows the dot moving in real time
- [ ] 5.4 Verify the foreground notification persists through Device B's screen-lock for at least 3 minutes
- [ ] 5.5 Test the `allow_cancel_after_accept = true` path: place a fresh order → accept → as customer, try to cancel → should succeed
- [ ] 5.6 Test PLACED → CANCELLED (admin rejects a fresh order with a reason)
- [ ] 5.7 Test out-of-stock during checkout: admin marks an item unavailable while it's in customer's cart → customer reaches checkout → sees blocking error
- [ ] 5.8 Test "Re-order" from `/account/orders` after a successful delivery
- [ ] 5.9 Document any sharp edges or bugs discovered in `docs/known-issues.md` — fix before Phase 6 archive

## 6. Phase 6 — Documentation + archive

- [ ] 6.1 Write `hotbox/README.md` — overview, local dev quickstart (`npm install`, `npm run db:migrate dev --name local`, `npm run seed`, `npm run dev`), env vars table referencing `.env.example`, deploy notes pointing to the Coolify project
- [ ] 6.2 Write `hotbox/rider-app/README.md` — Expo dev workflow (`npx expo start`), EAS Build cheatsheet (`eas build --platform android --profile preview`), how to bump APK version, distribution flow
- [ ] 6.3 Update root `CLAUDE.md` — add a `hotbox/` section parallel to the existing `platform/` section, explaining the food-delivery demo, its branches/domains, and that hotbox-food-delivery + hotbox-demo-finish-line are now archived
- [ ] 6.4 Mark all checkboxes in `hotbox-food-delivery/tasks.md` (sections 10/11/12/13/14 land in this finish-line)
- [ ] 6.5 Run `/opsx:archive hotbox-food-delivery`
- [ ] 6.6 Run `/opsx:archive hotbox-demo-finish-line`
