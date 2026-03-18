# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Dev server with Turbopack (http://localhost:3000)
npm run build    # Production build (use to verify no type/build errors)
npm run lint     # ESLint
npm run ci       # lint + build (used in CI)
```

No test suite is configured. Verification is done via `npm run build` and visual browser testing.

## Architecture

**Stack**: Next.js 16.1.4 (App Router) + TypeScript + Tailwind CSS v4 + Firebase (Auth, Firestore, Storage) + Resend for email.

### Provider Hierarchy (src/app/layout.tsx)

AuthProvider → CartProvider → WishlistProvider → SiteSettingsProvider → all pages. Every page has access to auth state, cart, wishlist, and site settings via React Context.

### Client vs Server Split

- **Client components** (`"use client"`): All UI, forms, context providers. Firebase client SDK (`src/lib/firebase/config.ts`) for reads.
- **Server actions** (`"use server"` in `src/app/actions/`): Sensitive operations like order creation. Uses Firebase Admin SDK (`src/lib/firebase/admin.ts`) with service account credentials.
- Order creation (`src/app/actions/order.ts`) verifies JWT, re-fetches product prices server-side to prevent tampering, runs atomic Firestore transactions for stock decrement + order write, then sends email via Resend (non-blocking).

### Cart Persistence

Guest users: localStorage. Authenticated users: Firestore subcollection `users/{userId}/cart`. CartProvider handles sync between the two on login/logout.

### Roles and Auth

Three roles in `profiles.role`: `customer`, `wholeseller`, `admin`. Admin routes live under `/profile/admin/`.

- **Admin bootstrapping**: The designated admin email is checked server-side only via `src/app/actions/admin.ts` (uses `ADMIN_EMAIL` or `NEXT_PUBLIC_ADMIN_EMAIL` env var). AuthProvider calls this server action to promote the first admin - the email is never exposed in the client bundle.
- **Admin route protection**: `src/middleware.ts` intercepts `/profile/admin/*` requests and checks the `__session` HttpOnly cookie (set by `/api/auth/session`). Non-admins are redirected.
- Firebase Auth supports email/password, Google OAuth, and phone OTP.

### Firestore Rules

`firestore.rules` and `storage.rules` at repo root. Rules enforce user ownership for profiles/cart/wishlist, public read for products/categories/coupons, admin-only writes for products/categories/settings. Storage limits files to 5MB with image content-type validation.

### Key Types

All Firestore document interfaces are in `src/types/database.types.ts`. Use these when reading/writing Firestore data.

### UI Components

shadcn/ui primitives in `src/components/ui/`. Layout components (Navbar, Footer, MobileBottomNav) in `src/components/layout/`. Icons from `lucide-react`.

### Mobile-First

Extensive mobile CSS in `src/app/globals.css` with safe area insets, bottom nav, search overlay, gesture hooks (`src/hooks/`), and `overflow-x: hidden` on html/body.

## Adding Features

- **New page**: Create `src/app/[route]/page.tsx`. If auth required, check `useAuth()` and redirect.
- **New Firestore collection**: Add interface to `src/types/database.types.ts`, add security rules to `firestore.rules`, use `adminDb` (server) or `db` (client) from `src/lib/firebase/`.
- **New UI component**: Use shadcn/ui primitives from `src/components/ui/`. Feature-specific components go in `src/components/[feature]/`.
- **After changes**: Run `npm run build` to verify.

## Known Constraints

- Firestore composite indexes may be missing; products page has client-side fallback logic for queries that fail.
- Search is client-side filtering only; no external search service.
- `RESEND_API_KEY` must be set for order confirmation emails to send; gracefully skips if missing.
- React Compiler is enabled in `next.config.ts`.

## Monorepo

`flutter_firebase_app/` contains a Flutter mobile app sharing the same Firebase backend. It has its own build configuration separate from the Next.js app.

## Environment Variables

Client-side: `NEXT_PUBLIC_FIREBASE_*` (API key, auth domain, project ID, storage bucket, messaging sender ID, app ID, measurement ID), `NEXT_PUBLIC_ADMIN_EMAIL`.

Server-side: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `ADMIN_EMAIL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`.

See `.env.example` for the full list with descriptions.
