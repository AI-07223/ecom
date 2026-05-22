## 1. Scaffolding & Infrastructure

- [x] 1.1 Create top-level `hotbox/` directory with `web/` and `rider-app/` subdirectories
- [x] 1.2 Initialize `hotbox/web/` as a Next.js 16 App Router project with TypeScript, Tailwind v4, and ESLint (`npx create-next-app@latest`, strict TS, no `src/` dir to match existing repo conventions)
- [x] 1.3 Install runtime deps in `hotbox/web/`: `prisma`, `@prisma/client`, `pg`, `@cashfreepayments/cashfree-js`, `mapbox-gl`, `react-map-gl`, `zod`, `lucide-react`
- [x] 1.4 Install dev deps in `hotbox/web/`: `vitest`, `@types/pg`, `@types/mapbox-gl`, `tsx`
- [x] 1.5 Create `prisma/schema.prisma` with all tables: restaurants, categories, menu_items, item_variants, item_addons, customers, addresses, carts, cart_items, orders, order_items, order_events, riders, rider_pings_latest, rider_pings, plus Postgres enums for `OrderState` and `PaymentStatus`
- [x] 1.6 Add `npm run db:push`, `npm run db:migrate`, `npm run seed` scripts to package.json
- [ ] 1.7 Write `prisma/seed.ts` that reads `prisma/hotbox-menu.json` and upserts the restaurant, ~20 categories, ~100 menu items (parse from the Hot Box Menu PDF text extract; commit the JSON file alongside)
- [x] 1.8 Set up `hotbox/web/lib/db.ts` lazy-Proxy Prisma client (mirrors the pattern from `src/lib/firebase/admin.ts` to keep build-time imports safe)
- [x] 1.9 Create `app/api/health/route.ts` returning `{ status: "ok", service: "hotbox-web" }` with `export const dynamic = "force-dynamic"`
- [x] 1.10 Write `Dockerfile` (multi-stage, alpine, multi-stage builder→runtime, `prisma generate` in builder, `apk add curl libc6-compat` for Coolify healthcheck)
- [x] 1.11 Add `.dockerignore` to exclude `node_modules`, `.next`, `prisma/migrations` (migrations applied at runtime, not embedded)
- [x] 1.12 Provision dedicated `hotbox-postgres` Coolify instance (revised from "logical DB on platform-postgres" — see design.md D12 addendum)
- [x] 1.13 Provision new Coolify application `hotbox-web` for `hotbox.networkbase75.site` with healthcheck on `/api/health`, port 3000, start_period 120s, retries 15
- [x] 1.14 Add Coolify env vars: `DATABASE_URL`, `CASHFREE_*`, `NEXT_PUBLIC_MAPBOX_TOKEN`, `OTP_PROVIDER`, `MSG91_*`, `ADMIN_PHONE`, `JWT_SECRET`, `PUBLIC_BASE_URL`, `LATEST_APK_VERSION`
- [x] 1.15 Deploy and confirm `https://hotbox.networkbase75.site/api/health` returns 200 — verified live at deploy `dbbfnuurrghj0nqn28849t68`, full catalog browse works end-to-end (home → /menu/burger → /item/cold-coffee all render with seeded data)

## 2. Food Catalog

- [x] 2.1 Implement catalog data access in `lib/catalog.ts` (getRestaurant, getCategoriesWithCounts, getCategoryBySlug, getMenuItemBySlug)
- [x] 2.2 Implement `app/page.tsx` as the customer home — renders category cards, links to category sections
- [x] 2.3 Implement `app/menu/[category]/page.tsx` listing items in that category with `is_available` filter
- [x] 2.4 Implement `app/item/[item]/page.tsx` (item detail) with variant + add-on selection UI
- [x] 2.5 Implement live price recompute (client-side) as customer toggles variants/add-ons via `ItemCustomizer.tsx`
- [x] 2.6 Implement placeholder image strategy (gradient block in v1; stock photos in Section 13 polish)
- [x] 2.7 Implement veg-square indicator component used across all item cards (`components/VegBadge.tsx`)
- [ ] 2.8 Verify scenarios: Browse by category, Out-of-stock item disables Add to Cart, Required add-on enforcement (integration tests pending live DB seed)

## 3. Customer Auth & Cart

- [x] 3.1 Decide OTP provider: MSG91 default + DevConsole fallback when credentials absent (locked). Cashfree-OTP also wired as second provider option.
- [x] 3.2 Implement `app/api/otp/send/route.ts` — generates 6-digit OTP, writes to `otp_codes` table with 10-min expiry, calls provider, returns success
- [x] 3.3 Implement `app/api/otp/verify/route.ts` — verifies OTP, upserts `users` row (admin role for ADMIN_PHONE), sets JWT session cookie, claims anonymous cart in same flow
- [x] 3.4 Implement rate-limit in `lib/otp.ts` (5 sends/10min per phone, 5 wrong attempts → invalidate active OTP)
- [x] 3.5 Implement `lib/session.ts` — jose-signed HS256 JWT in HttpOnly cookie, getCurrentUser() re-fetches role on every call, requireAdmin/requireRider helpers
- [x] 3.6 Implement `app/login/page.tsx` — phone entry → OTP entry flow, mobile-first, Suspense-wrapped useSearchParams
- [x] 3.7 Implement Server Action `addToCart(itemSlug, variantSlug?, addonSlugs[], qty, notes?)` — creates cart if needed, writes snapshot pricing into cart_items
- [x] 3.8 Implement Server Actions `updateCartItemQuantity` and `removeCartItem` and `clearCart`
- [x] 3.9 Implement `app/cart/page.tsx` — line items with variant/addon labels, quantity steppers, snapshot totals via `lib/pricing.computeTotals`
- [x] 3.10 Implement sticky bottom cart bar (`components/CartBar.tsx`) visible on customer-facing pages showing item count + total
- [x] 3.11 Implement cart-claim on login (anonymous cart's `userId` is set in same flow as OTP verify)
- [ ] 3.12 Verify scenarios: First-time customer sign-up at checkout, Returning customer login, OTP rate limiting, Cart survives page refresh, Cart survives login (integration test on live deploy)

## 4. Address Book & Map Picker

- [x] 4.1 Map provider locked: switched from Mapbox to Leaflet + OpenStreetMap for v1 (zero signup, free, instant — Mapbox can swap in later via NEXT_PUBLIC_MAPBOX_TOKEN). No external account needed for the demo.
- [x] 4.2 Created `components/MapPinPicker.tsx` — Leaflet `MapContainer` with draggable + tappable marker, "Use my location" geolocation button, inline SVG pin (no broken default icons), `onChange` callback emits `{ latitude, longitude }`. Mobile-first 320px height default.
- [x] 4.3 Implemented `app/account/addresses/page.tsx` listing saved addresses with default-tag, label tags (HOME/WORK/OTHER), MAX_ADDRESSES guard, Add-new CTA.
- [x] 4.4 Implemented `app/account/addresses/new/page.tsx` with the MapPinPicker (dynamically loaded SSR-disabled) + text fields for full address, building, floor, landmark, and a "set as default" toggle.
- [x] 4.5 Implemented Server Actions `addAddress`, `setDefaultAddress`, `removeAddress` in `app/_actions/addresses.ts`. Default-flag is mutually exclusive across an account in one transaction. `removeAddress` is a soft delete (`deletedAt` set) so historical orders keep their address reference.
- [ ] 4.6 Verify scenarios: Customer adds first address with map pin, Customer adds address without GPS permission, Address selection at checkout (integration test on live deploy)

## 5. Order State Machine & Pricing

- [x] 5.1 Implement `lib/order-state.ts` — transition map (TypeScript `Record<OrderState, OrderState[]>`), `transitionOrderState(orderId, to, options)` helper that validates + writes state + writes `order_events` + handles side effects (rider current_order_id flip, timestamps) in a single Prisma transaction
- [x] 5.2 Implement `lib/pricing.ts` — `computeCartTotals(cart, restaurant)` returning `{ subtotal, packaging, delivery, gst, total }` in paise
- [x] 5.3 Add unit tests with Vitest for every valid + invalid state transition (17 cases pass)
- [x] 5.4 Add unit tests for cancel-toggle gating (4 scenarios from order-lifecycle spec, all pass)
- [x] 5.5 Add unit tests for pricing math (11 cases pass)
- [ ] 5.6 Verify scenarios: Valid transition, Invalid transition rejected, Transitions atomic with side effects, Menu price changes after order placement, Cart total computation, Conditional cancellation matrix (integration tests with live DB — runs in Section 12 smoke test)

## 6. Checkout & Cashfree Integration

- [x] 6.1 Cashfree skills weren't bundled in the repo — used the standard PG v3 API (https://api.cashfree.com/pg/orders) per the documented Drop-in flow.
- [x] 6.2 Server-side Cashfree client `lib/cashfree.ts` (createCashfreeOrder, fetchCashfreeOrderStatus, verifyWebhookSignature with constant-time HMAC-SHA256 over `ts+rawBody`).
- [x] 6.3 Replaced isolated route with a Server Action `startCheckout()` in `app/_actions/checkout.ts` — validates cart, address, restaurant open hours, item availability; snapshots totals via lib/pricing; creates Order row in a transaction; then calls Cashfree to get payment_session_id; on Cashfree failure rolls the order to CANCELLED so admin sees the failure.
- [x] 6.4 `app/checkout/page.tsx` + `CheckoutClient.tsx` — cart summary, address radio cards, mobile sticky pay button mounting Cashfree.js v3 Drop-in via `redirectTarget: "_self"`. Shows operator-friendly banner if credentials aren't configured yet.
- [x] 6.5 `app/api/cashfree/webhook/route.ts` — verifies signature, idempotently marks order PAID (skips if already paid), writes a `PLACED` order_events row via `markOrderPaid`. Handles failure events too (`PAYMENT_FAILED`, `USER_DROPPED`) — sets `paymentStatus = FAILED` but keeps the order alive so customer can retry.
- [x] 6.6 `app/orders/[id]/confirmation/page.tsx` — branded order-confirmed card when PAID, amber pending banner when PENDING, red failed-payment card with retry link. Full order summary + Track CTA.
- [x] 6.7 `app/account/orders/page.tsx` — listing with state pill, total, Track + Re-order actions.
- [x] 6.8 `app/_actions/reorder.ts` — copies items into a fresh cart, re-snapshots at TODAY's prices, skips items that have become unavailable (returns the list of skipped titles).
- [ ] 6.9 Verify scenarios: Successful UPI payment, Payment failure, Webhook signature verification, Customer hits Re-order (live integration test — needs CASHFREE_APP_ID/SECRET_KEY set in Coolify)

## 7. Restaurant Admin Operations

- [x] 7.1 Admin role check enforced at three layers: `requireAdmin()` helper in lib/session.ts (server actions), `admin/layout.tsx` returning notFound() for non-admins (doesn't leak route existence per spec), and ADMIN_PHONE env var auto-promotes the matching phone on OTP login.
- [x] 7.2 `app/admin/layout.tsx` with sticky header + tabbed nav (Inbox / Riders / Menu / Settings) via `AdminNav.tsx`.
- [x] 7.3 `app/admin/page.tsx` order inbox — fetches all orders in active states with PAID payment, sorted ascending by placedAt. Includes today's revenue + delivered count tiles.
- [x] 7.4 Audio chime via Web Audio API on new PLACED orders + "Click to enable order sounds" first-visit banner.
- [x] 7.5 Order-card actions wired via `app/_actions/admin-order.ts`: acceptOrder, startCooking, markReady, assignRider, unassignRider, markPickedUp, markOutForDelivery, markDelivered, rejectOrder (with reason prompt).
- [x] 7.6 "Assign rider" dropdown on READY orders — only lists riders where `currentOrderId IS NULL AND isActive = true`.
- [x] 7.7 `app/admin/riders/page.tsx` + RidersClient — add (with phone normalization), activate/deactivate, soft-delete with guard against riders on an active delivery.
- [x] 7.8 `app/admin/menu/page.tsx` — per-item availability toggle, grouped by category, fast iteration.
- [x] 7.9 `app/admin/settings/page.tsx` — open/close times, pause toggle, allow_cancel_after_accept toggle, delivery + packaging fees.
- [x] 7.10 Today's revenue + order count tile on `/admin` home (computed via DB aggregate).
- [x] 7.11 Customer checkout blocked when restaurant is_paused OR current time outside open/close window (in `startCheckout` Server Action).
- [ ] 7.12 Verify scenarios: live-deploy integration test pending

## 8. Rider Web Client (Pre-APK)

- [x] 8.1 `app/rider/page.tsx` — reuses the same OTP login (no separate sign-in), checks UserRole === "rider" or "admin".
- [x] 8.2 Assigned-order screen showing pickup (restaurant address) + delivery (customer address) + items + total.
- [x] 8.3 "I've picked up" button → PICKED_UP transition via `riderMarkPickedUp` Server Action.
- [x] 8.4 "I've delivered" button → DELIVERED transition via `riderMarkDelivered` — server-side flips `riders.currentOrderId = NULL` atomically (handled inside transitionOrderState).
- [x] 8.5 Browser GPS tracking via `navigator.geolocation.watchPosition` while order is PICKED_UP / OUT_FOR_DELIVERY. Throttled to ~5s, POSTs to `/api/rider/ping`. Stops cleanly on state exit.
- [ ] 8.6 Verify scenarios: live-deploy integration test pending

## 9. Live Tracking (SSE + Map)

- [x] 9.1 `app/api/rider/ping/route.ts` — auth-gated, validates payload, upserts `rider_pings_latest`, appends to `rider_pings`, updates `riders.last_ping_at`, fires `pg_notify('order_track_<id>', json)` only when rider has a currentOrderId.
- [x] 9.2 `app/api/track/[orderId]/stream/route.ts` — SSE handler holding a dedicated PG LISTEN connection. Emits initial snapshot (state + events + rider name/position + customer pin) then forwards every pg_notify. Heartbeat every 25s to defeat idle-connection close. Closes on DELIVERED/CANCELLED.
- [x] 9.3 `app/track/[orderId]/page.tsx` + `TrackClient.tsx` — server-rendered page hands off to a client component that connects EventSource and renders timeline + map.
- [x] 9.4 `TrackMap.tsx` — Leaflet map with rider 🏍 marker + customer drop pin + dashed polyline. Auto-fit on first render then locked so user can pan.
- [x] 9.5 Straight-line ETA helper (Haversine / 20 km/h assumed) with "approximate" disclaimer.
- [x] 9.6 SSE reconnect handled natively by `EventSource` — server sends a fresh snapshot on every new connection.
- [ ] 9.7 Pruning job for rider_pings — deferred to a separate one-shot at first; will add node-cron daily at 03:00 once we see real traffic.
- [ ] 9.8 Verify scenarios: live-deploy integration test pending

## 7. Restaurant Admin Operations

- [ ] 7.1 Implement admin role check middleware — match `ADMIN_PHONE` on OTP verify and set `users.role = 'admin'`
- [ ] 7.2 Implement `app/admin/layout.tsx` with admin nav (Inbox, Riders, Menu, Settings)
- [ ] 7.3 Implement `app/admin/page.tsx` — order inbox showing PLACED/ACCEPTED/PREPARING/READY orders, polling or SSE-driven refresh
- [ ] 7.4 Implement audio chime via Web Audio API on new PLACED orders + "Click to enable order sound" first-visit banner
- [ ] 7.5 Implement order-card actions: Accept, Start cooking, Mark ready, Reject (state transitions via Server Actions)
- [ ] 7.6 Implement "Assign rider" dropdown on READY orders showing available riders
- [ ] 7.7 Implement `app/admin/riders/page.tsx` — list, add, edit, deactivate, delete riders (with active-order guard on delete)
- [ ] 7.8 Implement `app/admin/menu/page.tsx` — toggle `is_available` per item, search/filter by category
- [ ] 7.9 Implement `app/admin/settings/page.tsx` — restaurant open/close times, is_paused, allow_cancel_after_accept, delivery_fee_paise, packaging_fee_paise
- [ ] 7.10 Implement today's revenue + order count tile on `/admin` home
- [ ] 7.11 Block customer checkout when restaurant `is_paused` or outside operating hours
- [ ] 7.12 Verify scenarios: Order inbox happy path, Rejecting a fresh order, No available rider, Admin adds new rider, Admin deactivates rider, Cannot delete rider with active order, Item runs out mid-shift, Owner flips cancel toggle

## 8. Rider Web Client (Pre-APK)

- [ ] 8.1 Implement `app/rider/page.tsx` — rider OTP login (same flow as customer, distinct landing)
- [ ] 8.2 Implement assigned-order screen showing pickup + delivery addresses + items
- [ ] 8.3 Implement "I've picked up" button → transitions to PICKED_UP
- [ ] 8.4 Implement "I've delivered" button → transitions to DELIVERED (server-side flips `riders.current_order_id = NULL` atomically)
- [ ] 8.5 Implement browser-based location tracking: `navigator.geolocation.watchPosition` while page is foregrounded and order is in PICKED_UP/OUT_FOR_DELIVERY, POSTs to `/api/rider/ping` every 5 sec
- [ ] 8.6 Verify scenarios: Order ASSIGNED → picked up → delivered transitions; rider auto-flips to available

## 9. Live Tracking (SSE + Map)

- [ ] 9.1 Implement `app/api/rider/ping/route.ts` — auth check, upsert `rider_pings_latest`, append to `rider_pings`, update `riders.last_ping_at`, fire `pg_notify('order_track_<id>', json)` when rider has `current_order_id`
- [ ] 9.2 Implement `app/api/track/[orderId]/stream/route.ts` — SSE handler holding a dedicated PG `LISTEN` connection, emits initial snapshot + subsequent events
- [ ] 9.3 Implement `app/track/[orderId]/page.tsx` — timeline panel + (conditional) map panel, connects to SSE via `EventSource`
- [ ] 9.4 Implement Mapbox map component for tracking page — rider marker + delivery-address marker, animated transitions on new pings
- [ ] 9.5 Implement straight-line ETA helper (Haversine distance / 20 km/h assumed speed) with "Approximate ETA" disclaimer
- [ ] 9.6 Implement SSE reconnection handling (initial event on reconnect is a fresh snapshot)
- [ ] 9.7 Set up `rider_pings` pruning — choose between cron daily job or pg_cron extension (Q decide at apply-time); job deletes rows older than 7 days
- [ ] 9.8 Verify scenarios: Pre-pickup view, Out-for-delivery view, ETA shown with disclaimer, Stream survives reconnect, Stream closes on DELIVERED, Old pings pruned

## 10. Rider Expo App

- [ ] 10.1 Sign up for Expo + EAS, configure CLI locally (`npx eas-cli login`)
- [ ] 10.2 Initialize Expo project at `hotbox/rider-app/` with TypeScript template
- [ ] 10.3 Configure `app.json`/`app.config.ts` — Android permissions (ACCESS_FINE_LOCATION, ACCESS_BACKGROUND_LOCATION, FOREGROUND_SERVICE, POST_NOTIFICATIONS), bundle ID, app name "Hotbox Rider"
- [ ] 10.4 Create `eas.json` with `preview` (APK output, signed with EAS-managed key) and `production` profiles
- [ ] 10.5 Install deps: `expo-router`, `expo-location`, `expo-task-manager`, `expo-secure-store`, `expo-device`, `expo-notifications`
- [ ] 10.6 Implement OTP login screens (phone entry, OTP entry) hitting the same `/api/otp/*` endpoints as the web
- [ ] 10.7 Implement session storage via `expo-secure-store`; attach bearer token to all API calls via a tiny `lib/api.ts` fetch wrapper
- [ ] 10.8 Implement home screen — fetches the rider's current assigned order, shows pickup + delivery info + items, single action button
- [ ] 10.9 Implement foreground location service using `expo-task-manager` and `Location.startLocationUpdatesAsync` with `foregroundService` config, posts every 5 sec to `/api/rider/ping`
- [ ] 10.10 Implement "Start tracking" on PICKED_UP transition and "Stop tracking" on DELIVERED transition
- [ ] 10.11 Implement first-launch setup screen with manufacturer detection (via `expo-device`) and battery-saver tips for Xiaomi / Oppo / Vivo / Realme
- [ ] 10.12 Implement `/api/rider/latest-version` check on app start with non-blocking update banner
- [ ] 10.13 Build first APK: `eas build --platform android --profile preview --non-interactive`
- [ ] 10.14 Download the APK, copy into `hotbox/web/public/downloads/rider-v0.1.0.apk`, commit
- [ ] 10.15 Verify scenarios: First launch, Session restore, Tapping picked up, Tapping delivered, Foreground service starts on pickup, Service survives screen lock, Service stops on delivery, Update banner

## 11. APK Distribution UI

- [ ] 11.1 Implement `app/admin/rider-app/page.tsx` — current version display + Download button + Copy link button + WhatsApp share button + QR code
- [ ] 11.2 Implement server-side QR code generation as inline SVG (`qrcode` npm package or pure-JS implementation)
- [ ] 11.3 Implement `app/r/install/page.tsx` (public) — mobile-first download page with illustrated 3-step guide
- [ ] 11.4 Implement collapsible accordion of per-manufacturer battery-saver tips on the install page
- [ ] 11.5 Implement `app/api/rider/latest-version/route.ts` returning current APK metadata from a config table or env-var driven source
- [ ] 11.6 Verify scenarios: Admin copies install link, QR encodes correct URL, Rider visits install link on phone browser

## 12. End-to-End Smoke Test

- [ ] 12.1 Run on three real devices: laptop (admin), phone A (customer browser), phone B (rider with APK installed)
- [ ] 12.2 Place an order from phone A through Cashfree sandbox; observe admin laptop bell ring; accept → preparing → ready
- [ ] 12.3 Assign phone-B rider; observe phone B receive the order in the APK
- [ ] 12.4 Phone B taps "Picked up"; observe foreground notification appear; observe rider dot start moving on phone A's track page
- [ ] 12.5 Phone B taps "Delivered"; observe foreground notification dismiss; admin laptop sees rider become available; customer phone A sees timeline complete
- [ ] 12.6 Repeat with `allow_cancel_after_accept = true` to test cancel-after-accept path
- [ ] 12.7 Test out-of-coverage / no-rider case
- [ ] 12.8 Document any sharp edges discovered in `docs/known-issues.md`

## 13. Polish & Sales-Ready Prep

- [ ] 13.1 Extract actual Hotbox brand colors and typography from the menu PDF (visual inspection); update Tailwind config
- [ ] 13.2 Replace placeholder images with reasonable stock photos for the top ~30 most common items
- [ ] 13.3 Write 5-minute demo script in `docs/demo-script.md`: which routes to open on which devices, in what order
- [ ] 13.4 Configure DNS for chosen production domain
- [ ] 13.5 Smoke test demo script with a fresh user once
- [ ] 13.6 Park the `coolify-production-deploy` change — either finish remaining 12 tasks or formally pause it in its `tasks.md`

## 14. Documentation

- [ ] 14.1 Write `hotbox/README.md` covering local dev, env vars, seeding, deploy
- [ ] 14.2 Write `hotbox/rider-app/README.md` covering Expo dev, EAS Build, APK distribution flow
- [ ] 14.3 Update root `CLAUDE.md` to add a `hotbox/` section similar to the existing `platform/` section
