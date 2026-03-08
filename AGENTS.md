# Royal Trading Company — E-Commerce Platform

## Quick Reference

| Item | Value |
|------|-------|
| **Framework** | Next.js 16.1.4 (App Router, Turbopack) |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS v4 |
| **Backend** | Firebase (Auth, Firestore, Storage) |
| **Email** | Resend SDK |
| **Node** | ≥18 |

## Commands

```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # Production build
npm run lint         # ESLint
```

## Project Structure

```
src/
├── app/                    # Next.js pages (App Router)
│   ├── layout.tsx          # Root layout: fonts, providers, viewport
│   ├── page.tsx            # Homepage
│   ├── globals.css         # Global styles + mobile-first CSS
│   ├── actions/            # Server Actions
│   │   └── order.ts        # createOrder (+ email confirmation)
│   ├── about/              # /about
│   ├── cart/               # /cart
│   ├── categories/         # /categories, /categories/[slug]
│   ├── checkout/           # /checkout
│   ├── contact/            # /contact
│   ├── item-request/       # /item-request (wholeseller)
│   ├── login/              # /login
│   ├── signup/             # /signup
│   ├── reset-password/     # /reset-password
│   ├── products/           # /products, /products/[slug]
│   ├── profile/            # User profile pages
│   │   ├── page.tsx        # /profile
│   │   ├── settings/       # /profile/settings
│   │   ├── orders/         # /profile/orders, /profile/orders/[id]
│   │   ├── item-requests/  # /profile/item-requests
│   │   ├── requests/       # /profile/requests
│   │   └── admin/          # Admin dashboard
│   │       ├── page.tsx        # /profile/admin (dashboard)
│   │       ├── products/       # CRUD products
│   │       ├── categories/     # CRUD categories
│   │       ├── orders/         # Manage orders, /orders/[id]
│   │       ├── coupons/        # Manage coupons
│   │       ├── users/          # Manage users
│   │       ├── settings/       # Site settings
│   │       └── item-requests/  # Wholeseller requests
│   ├── returns/            # /returns
│   ├── shipping/           # /shipping
│   ├── seed/               # /seed (dev data seeder)
│   └── wishlist/           # /wishlist
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx          # Desktop + mobile navbar w/ instant search
│   │   ├── SearchOverlay.tsx   # Full-screen mobile search
│   │   ├── MobileBottomNav.tsx # Bottom tab bar (mobile)
│   │   ├── AdminBottomNav.tsx  # Admin bottom nav
│   │   ├── Footer.tsx          # Site footer
│   │   └── NetworkStatus.tsx   # Offline indicator
│   ├── products/               # ProductCard, ProductGrid
│   ├── orders/                 # OrderStatusBadge
│   ├── admin/                  # AdminSidebar, AdminHeader
│   ├── ui/                     # shadcn/ui components (27 files)
│   └── ErrorBoundary.tsx       # React error boundary
├── providers/
│   ├── AuthProvider.tsx         # Firebase Auth context
│   ├── CartProvider.tsx         # Cart state (Firestore-synced)
│   ├── WishlistProvider.tsx     # Wishlist state (Firestore-synced)
│   └── SiteSettingsProvider.tsx # Site-wide settings
├── hooks/
│   ├── useDebounce.ts           # Debounce hook
│   ├── useInfiniteScroll.ts     # Infinite scroll pagination
│   ├── useLongPress.ts          # Long press gesture
│   └── useSwipeGesture.ts       # Swipe gesture
├── lib/
│   ├── firebase/
│   │   ├── config.ts            # Client Firebase init
│   │   ├── admin.ts             # Server Firebase Admin init
│   │   └── utils.ts             # Firestore helpers
│   ├── email.ts                 # Resend email utility
│   ├── utils.ts                 # cn() utility
│   ├── colors.ts                # Brand color definitions
│   ├── status-colors.ts         # Order status → color mapping
│   ├── ui-constants.ts          # Shared UI constants
│   └── validations/
│       └── checkout.ts          # Zod checkout schema
└── types/
    └── database.types.ts        # All Firestore interfaces
```

## Route Map

| Route | Auth | Purpose |
|-------|------|---------|
| `/` | No | Homepage with hero, categories, featured products |
| `/products` | No | Product listing with search, filter, sort |
| `/products/[slug]` | No | Product detail page |
| `/categories` | No | Category grid |
| `/categories/[slug]` | No | Products in a category |
| `/cart` | No | Shopping cart |
| `/checkout` | Yes | Checkout with address + coupon |
| `/wishlist` | Yes | Saved items |
| `/login` | No | Firebase Auth login |
| `/signup` | No | Firebase Auth signup |
| `/reset-password` | No | Password reset |
| `/profile` | Yes | User profile overview |
| `/profile/settings` | Yes | Edit profile |
| `/profile/orders` | Yes | Order history |
| `/profile/orders/[id]` | Yes | Order detail |
| `/profile/item-requests` | Yes | Wholeseller's own requests |
| `/item-request` | Yes | Submit item request (wholeseller) |
| `/profile/admin` | Admin | Dashboard overview |
| `/profile/admin/products` | Admin | CRUD products |
| `/profile/admin/categories` | Admin | CRUD categories |
| `/profile/admin/orders` | Admin | Manage all orders |
| `/profile/admin/orders/[id]` | Admin | Order detail |
| `/profile/admin/coupons` | Admin | Manage coupons |
| `/profile/admin/users` | Admin | Manage users + roles |
| `/profile/admin/settings` | Admin | Site settings |
| `/profile/admin/item-requests` | Admin | Review wholeseller requests |
| `/about` | No | About page |
| `/contact` | No | Contact page |
| `/shipping` | No | Shipping info |
| `/returns` | No | Return policy |
| `/seed` | No | Dev data seeder |

## Key Data Flow

```
AuthProvider → checks Firebase Auth session
    └── CartProvider → syncs cart to Firestore (authenticated) / localStorage (guest)
        └── WishlistProvider → syncs wishlist to Firestore
            └── SiteSettingsProvider → fetches site_settings/main doc
                └── Navbar / MobileBottomNav / Footer / Pages
```

## Firestore Collections

| Collection | Key Fields | Notes |
|------------|-----------|-------|
| `profiles` | `user_id`, `full_name`, `email`, `phone`, `role`, `addresses[]` | Roles: `customer`, `wholeseller`, `admin` |
| `products` | `name`, `slug`, `price`, `compare_at_price`, `quantity`, `category_id`, `is_active`, `is_featured`, `images[]`, `thumbnail`, `tags[]` | Server-side filter by category/featured |
| `orders` | `user_id`, `order_number`, `status`, `items[]`, `shipping_address`, `total`, `discount`, `coupon_code` | Statuses: pending → processing → shipped → delivered/cancelled |
| `categories` | `name`, `slug`, `image_url`, `is_active`, `sort_order` | Hierarchical via `parent_id` |
| `coupons` | `code`, `discount_type`, `discount_value`, `usage_limit`, `used_count`, `min_order_amount`, `expires_at` | Types: `percentage`, `fixed` |
| `site_settings` | `main` doc with `business_name`, `tagline`, `announcement`, etc. | Single doc collection |
| `item_requests` | `user_id`, `item_name`, `description`, `quantity`, `status` | Wholeseller feature |

## Environment Variables

| Variable | Where | Required |
|----------|-------|----------|
| `NEXT_PUBLIC_FIREBASE_*` | Client | Yes |
| `NEXT_PUBLIC_ADMIN_SECRET_KEY` | Client | Yes (first admin setup) |
| `FIREBASE_PROJECT_ID` | Server | Yes |
| `FIREBASE_CLIENT_EMAIL` | Server | Yes |
| `FIREBASE_PRIVATE_KEY` | Server | Yes |
| `RESEND_API_KEY` | Server | No (emails skip if empty) |
| `RESEND_FROM_EMAIL` | Server | No (defaults to onboarding@resend.dev) |

## Search Implementation

- **Desktop**: Type in Navbar search → instant dropdown with top 5 matching products (debounced 300ms) → click to navigate or Enter for full results page
- **Mobile**: Tap search bar → opens `SearchOverlay.tsx` (full-screen) → recent searches, trending suggestions, live results as you type
- **Products Page**: Full filter UI with categories, price range, sale toggle, sort options, infinite scroll

## Email Confirmation

- Uses **Resend** SDK (`src/lib/email.ts`)
- Triggered non-blocking after order creation in `src/app/actions/order.ts`
- Branded HTML template with order details, item table, shipping address
- Gracefully skips if `RESEND_API_KEY` is not set

## Mobile-First Design

- `globals.css` has extensive mobile-specific CSS under `@media (max-width: 768px)`
- Safe area insets for notch/bottom bar devices
- `MobileBottomNav` with haptic feedback, floating active indicators
- Bottom sheet profile panel with quick action grid
- Touch-optimized: `tap-active` class, `touch-action: manipulation`
- Custom scrollbar hiding, overscroll behavior control
- `overflow-x: hidden` on html/body to prevent horizontal scroll

## How to Add a New Feature (AI Agents)

### New Page
1. Create `src/app/[route]/page.tsx`
2. Add route to this AGENTS.md route table
3. If auth required, use `useAuth()` and redirect if `!user`

### New Firestore Collection
1. Add interface to `src/types/database.types.ts`
2. Use `adminDb` (server) or `db` (client) from `src/lib/firebase/`
3. Add Firestore rules in `firestore.rules`
4. Add to collection table above

### New Component
1. For UI primitives, use shadcn/ui (`src/components/ui/`)
2. For layout, add to `src/components/layout/`
3. For feature-specific, add to `src/components/[feature]/`

### After Making Changes
1. Run `npm run build` to verify no type/build errors
2. Test visually in browser at `http://localhost:3000`
3. Update this file's route map / collection table if routes or schema changed

## Known Issues / Tech Debt

- Firestore composite indexes may be missing — fallback logic in products page fetches client-side
- No automated test suite yet (user requested visual browser testing only)
- `RESEND_API_KEY` needs to be configured for email to work
- Search is client-side filtering; for large catalogs, consider Algolia or Firestore full-text search
