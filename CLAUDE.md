# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Three stacks live here side by side.**
>
> - **Legacy stack** (this CLAUDE.md from "Commands" onward): the Next.js
>   16 + Firebase ecommerce site under [src/](src/). It serves the current
>   production domain and is unchanged. Maintenance mode only.
> - **Medusa multi-tenant platform** (parked): a self-hostable Medusa v2 +
>   Next.js 16 + Postgres + Redis platform under [platform/](platform/),
>   designed to host multiple branded client storefronts. Backend stays
>   alive at `medusa.networkbase75.site` for potential future use; the
>   storefront work was paused mid-deploy when the operator pivoted.
> - **Hot Box Cloud Kitchen demo** (active): a single-restaurant
>   food-delivery demo built on Next.js 16 + Prisma + Postgres with
>   email-password auth, manual UPI payment + COD, and a brand-grade
>   dark restaurant theme matching the operator's printed menu. Under
>   [hotbox/](hotbox/), plus an Expo Android APK for riders under
>   [hotbox/rider-app/](hotbox/rider-app/). Live at
>   `hotbox.networkbase75.site`. See [hotbox/README.md](hotbox/README.md).
>
> The Hotbox stack is where current feature work lives. The Medusa stack
> can resume if a "boutique" template is needed later. The legacy Firebase
> stack receives only bug fixes.

## The Hotbox food-delivery stack (active)

```
   hotbox/
   ├── web/         Next.js 16 — customer storefront, restaurant admin,
   │                rider web fallback. Deploys to Coolify (uuid
   │                hdxy12d07otzrv7yzgqz50hl). Schema in Prisma; auth via
   │                bcrypt + jose JWT cookies; payments via manual UPI
   │                screenshot (admin-verified) or COD (rider-collected);
   │                live tracking via Postgres LISTEN/NOTIFY + SSE; map
   │                via Leaflet + CARTO DarkMatter tiles; emails via
   │                Resend; sharp + libvips for screenshot/photo
   │                compression. Single-page menu at `/` with sticky
   │                IntersectionObserver-driven category tabs.
   └── rider-app/   Expo SDK 53 — Android-only APK for delivery riders.
                    Foreground location service via expo-task-manager.
                    Built via EAS Build (cloud, free tier).
```

OpenSpec history (archived after each lands):

- `hotbox-food-delivery` — proposed the architecture + landed the customer
  loop + admin + rider-web + live-tracking foundations.
- `hotbox-demo-finish-line` — finishing sprint: credentials/smoke test,
  brand polish, Expo APK, distribution UI, docs.
- `hotbox-auth-and-payment-pivot` — dropped Cashfree/OTP, added
  email-password auth + manual UPI screenshot verification + COD with
  rider cash-collection modal.
- `hotbox-brand-redesign` — repainted every customer-facing surface in
  the operator's actual restaurant brand (dark matte + yellow + cyan +
  flame) extracted from `Hot Box Menu.pdf`; collapsed the home + category
  pages into a single scrollable menu with sticky tabs; added an admin
  photo-uploader UI for menu items. See
  [openspec/changes/hotbox-brand-redesign/](openspec/changes/hotbox-brand-redesign/)
  for the proposal/design/specs/tasks.

The customer flow `/` (single-page menu) → `/item/[slug]` (detail) →
`/cart` → `/checkout` → `/orders/[id]/{pay,confirmation}` → `/track/[id]`
is fully dark-themed and brand-on. Admin (`/admin/*`) and rider
(`/rider`, `/r/install`) keep dense utilitarian layouts on dark tokens.

---

## Below: the legacy Firebase stack (maintenance only)

## Commands

```bash
npm run dev           # Dev server with Turbopack (http://localhost:3000)
npm run build         # Production build (use to verify no type/build errors)
npm run lint          # ESLint
npm run test:run      # Run all unit tests (Vitest)
npm run test:coverage # Run tests with coverage report
npm run test:rules    # Run Firestore rules tests (requires emulator: firebase emulators:start --only firestore)
npm run ci            # lint + test:run + build (used in CI)
npx vitest run src/app/actions/order.test.ts  # Run a single test file
```

## Architecture

**Stack**: Next.js 16.1.7 (App Router) + TypeScript + Tailwind CSS v4 + Firebase (Auth, Firestore, Storage) + Resend for email.

### Provider Hierarchy (src/app/layout.tsx)

SiteSettingsProvider → AuthProvider → CartProvider → WishlistProvider → all pages. Every page has access to site settings, auth state, cart, and wishlist via React Context.

### Client vs Server Split

- **Client components** (`"use client"`): All UI, forms, context providers. Firebase client SDK (`src/lib/firebase/config.ts`) for reads.
- **Server actions** (`"use server"` in `src/app/actions/`): Sensitive operations. Uses Firebase Admin SDK (`src/lib/firebase/admin.ts`) with service account credentials.
- The Admin SDK uses a lazy Proxy pattern (`makeLazyProxy`) so that module import never throws at build time when env vars aren't available. The `force-dynamic` export on `/api/auth/session` prevents Next.js from pre-rendering it.

### Server Actions

| Action | File | Purpose |
|--------|------|---------|
| `createOrder` | `order.ts` | JWT-verified order creation with atomic Firestore transaction (stock decrement + order write + coupon usage). Re-fetches prices server-side. |
| `cancelOrder` | `cancel-order.ts` | Customer cancellation of pending orders with atomic stock restoration. |
| `updateOrderStatus` | `admin-order.ts` | Admin status update + customer email notification via Resend. |
| `updatePaymentStatus` | `admin-order.ts` | Admin payment status update. |
| `updateOrderItems` | `admin-order.ts` | Admin order item edit with server-side total recalculation. |
| `bootstrapAdmin` | `admin.ts` | Promotes the configured admin email to admin role (server-side only). |
| `sendContactEmail` | `contact.ts` | Contact form email via Resend. |

### Cart Persistence

Guest users: localStorage (`guest_cart` key stores `{product_id, quantity}[]`). Authenticated users: Firestore subcollection `users/{userId}/cart`. CartProvider merges guest cart into Firestore on login and clears localStorage.

### Roles and Auth

Three roles in `profiles.role`: `customer`, `wholeseller`, `admin`. Admin routes live under `/profile/admin/`.

- **Admin bootstrapping**: The designated admin email is checked server-side only via `src/app/actions/admin.ts` (uses `ADMIN_EMAIL` or `NEXT_PUBLIC_ADMIN_EMAIL` env var). AuthProvider calls this server action to promote the first admin - the email is never exposed in the client bundle.
- **Admin route protection**: `src/middleware.ts` intercepts `/profile/admin/*` requests and checks the `__session` HttpOnly cookie (set by `/api/auth/session`). Non-admins are redirected.
- Firebase Auth supports email/password, Google OAuth, and phone OTP.

### Firestore Rules

`firestore.rules` and `storage.rules` at repo root. Rules enforce user ownership for profiles/cart/wishlist, public read for products/categories/coupons, admin-only writes for products/categories/settings. Customers can cancel their own pending orders (status → "cancelled" only). Storage limits files to 5MB with image content-type validation.

### Key Types

All Firestore document interfaces are in `src/types/database.types.ts`. Use these when reading/writing Firestore data.

### UI Components

shadcn/ui primitives in `src/components/ui/`. Layout components (Navbar, Footer, MobileBottomNav) in `src/components/layout/`. Feature components in `src/components/[feature]/` (e.g., `checkout/`, `products/`, `admin/`, `orders/`). Icons from `lucide-react`.

### Mobile-First

Extensive mobile CSS in `src/app/globals.css` with safe area insets, bottom nav, search overlay, gesture hooks (`src/hooks/`), and `overflow-x: hidden` on html/body.

### Email (src/lib/email.ts)

Uses Resend. Three email functions: `sendOrderConfirmationEmail`, `sendOrderStatusUpdateEmail`, `sendContactEmail` (in contact.ts action). All gracefully skip if `RESEND_API_KEY` is not set. Status emails use branded HTML templates with status-specific messaging and colors.

### Logging (src/lib/logger.ts)

Structured logger: JSON output in production, human-readable in development. Use `logger.info/warn/error` in server actions instead of `console.log`.

## Adding Features

- **New page**: Create `src/app/[route]/page.tsx`. If auth required, check `useAuth()` and redirect.
- **New Firestore collection**: Add interface to `src/types/database.types.ts`, add security rules to `firestore.rules`, use `adminDb` (server) or `db` (client) from `src/lib/firebase/`.
- **New server action**: Follow pattern in `order.ts` — verify JWT with `adminAuth.verifyIdToken()`, validate inputs, use `adminDb` for writes, log with `logger`.
- **New UI component**: Use shadcn/ui primitives from `src/components/ui/`. Feature-specific components go in `src/components/[feature]/`.
- **After changes**: Run `npm run build` to verify.

## Known Constraints

- Firestore composite indexes may be missing; products page has client-side fallback logic for queries that fail (`useProductQuery.ts` has a 3-tier fallback strategy).
- Search is client-side filtering only; no external search service.
- React Compiler is enabled in `next.config.ts`.
- `middleware.ts` uses the deprecated `middleware` convention; Next.js warns about migrating to `proxy`.
- Admin dashboard uses `getCountFromServer()` for totals — requires Firestore indexes for filtered counts.

## Monorepo

`flutter_firebase_app/` contains a Flutter mobile app sharing the same Firebase backend. It has its own build configuration separate from the Next.js app.

## Environment Variables

Client-side: `NEXT_PUBLIC_FIREBASE_*` (API key, auth domain, project ID, storage bucket, messaging sender ID, app ID, measurement ID), `NEXT_PUBLIC_ADMIN_EMAIL`.

Server-side: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `ADMIN_EMAIL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`.

See `.env.example` for the full list with descriptions.
