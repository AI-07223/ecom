# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Two stacks live here side by side.**
>
> - **Legacy stack** (this CLAUDE.md from "Commands" onward): the Next.js
>   16 + Firebase ecommerce site under [src/](src/). It serves the current
>   production domain and is unchanged.
> - **New stack** (the active direction): a self-hostable Medusa v2 +
>   Next.js 16 + Postgres + Redis platform under [platform/](platform/),
>   designed to host multiple branded client storefronts from one Coolify
>   VPS. See [platform/README.md](platform/README.md) and the OpenSpec
>   change at
>   [openspec/changes/scaffold-multitenant-platform](openspec/changes/scaffold-multitenant-platform).
>
> Treat the new stack as where future ecommerce features land. The legacy
> stack is in maintenance mode — bug fixes and small changes only — until
> a separate migration change moves real traffic to the new platform.

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
