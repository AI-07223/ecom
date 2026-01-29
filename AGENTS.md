# Royal Store - E-Commerce Platform

## Project Overview

Royal Store is a full-featured e-commerce web application built with Next.js, React, and Firebase. It provides a complete shopping experience with user authentication, product catalog, shopping cart, wishlist, checkout flow, and an admin panel for store management.

The application is designed as a mobile-first, app-like experience with smooth animations, responsive design, and offline-capable features through Firebase.

## Technology Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16.1.4 (App Router) |
| UI Library | React 19.2.3 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui (New York style) |
| Backend | Firebase (Firestore, Auth, Storage) |
| Forms | React Hook Form + Zod |
| Icons | Lucide React |
| Notifications | Sonner |

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── actions/            # Server Actions (order creation)
│   ├── auth/callback/      # OAuth callback handler
│   ├── cart/               # Shopping cart page
│   ├── categories/         # Category listing and detail pages
│   ├── checkout/           # Checkout flow
│   ├── login/              # Authentication pages
│   ├── signup/
│   ├── products/           # Product listing and detail pages
│   ├── profile/            # User profile and admin panel
│   │   ├── admin/          # Admin dashboard and management
│   │   ├── orders/         # Order history
│   │   └── settings/       # User settings
│   ├── seed/               # Database seeding page
│   ├── wishlist/           # User wishlist
│   ├── globals.css         # Global styles and Tailwind config
│   ├── layout.tsx          # Root layout with providers
│   └── page.tsx            # Homepage
├── components/
│   ├── admin/              # Admin-specific components
│   ├── layout/             # Layout components (Navbar, Footer, etc.)
│   ├── products/           # Product-related components
│   └── ui/                 # shadcn/ui components
├── lib/
│   ├── firebase/
│   │   └── config.ts       # Firebase initialization
│   ├── validations/        # Zod validation schemas
│   └── utils.ts            # Utility functions (cn helper)
├── providers/              # React Context providers
│   ├── AuthProvider.tsx    # Authentication state
│   ├── CartProvider.tsx    # Shopping cart state
│   ├── SiteSettingsProvider.tsx  # Site configuration
│   └── WishlistProvider.tsx # Wishlist state
└── types/
    └── database.types.ts   # TypeScript type definitions
```

## Build and Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linting
npm run lint

# Run CI (lint + build)
npm run ci
```

The development server runs on `http://localhost:3000`.

## Code Style Guidelines

### TypeScript
- Use strict TypeScript with explicit types
- All components are functional with proper type annotations
- Type definitions are centralized in `src/types/database.types.ts`

### Component Structure
- Use `'use client'` directive for client components
- Server Actions use `'use server'` directive
- Components use PascalCase naming (e.g., `Navbar.tsx`)
- Use the `cn()` utility from `@/lib/utils` for conditional class merging

### Styling Conventions
- Tailwind CSS v4 with CSS-based configuration in `globals.css`
- Use shadcn/ui component patterns with `class-variance-authority` (CVA)
- Mobile-first responsive design with `md:` breakpoints
- Theme colors are accessed via CSS variables
- Custom site colors come from `SiteSettingsProvider` (primary_color, accent_color, etc.)

### Import Ordering
1. React/Next.js imports
2. Third-party library imports
3. Local component imports (`@/components`)
4. Provider imports (`@/providers`)
5. Utility imports (`@/lib`)
6. Type imports (`@/types`)

### File Organization
- One component per file (except small related components)
- Co-locate related components in feature folders
- Use barrel exports for clean imports

## Testing Instructions

Currently, the project does not have automated tests configured. The test script returns a placeholder message:

```bash
npm test  # Outputs: "No tests configured yet"
```

Manual testing should be done through:
1. Development server (`npm run dev`)
2. Build verification (`npm run build`)
3. Lint checking (`npm run lint`)

## Security Considerations

### Firebase Security Rules

**Firestore Rules** (`firestore.rules`):
- Authentication required for all write operations
- Users can only access their own profile, cart, and wishlist
- Admins (checked via `profiles/{uid}.is_admin`) can manage products, categories, coupons, and orders
- Orders are readable only by the owner or admins

**Storage Rules** (`storage.rules`):
- Public read access for all files
- Write access requires authentication
- Image uploads limited to 5MB
- Separate folders for products, categories, and site assets

### Environment Variables
Required environment variables (defined in `.env.local`):
```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

All Firebase config variables are public (client-side) and start with `NEXT_PUBLIC_`.

### Data Validation
- All forms use Zod schemas for validation
- Server Actions validate input before database operations
- Phone numbers validated with Indian format regex (`/^[6-9]\d{9}$/`)
- Postal codes validated with 6-digit regex (`/^\d{6}$/`)
- GST numbers validated with standard format

## Database Schema

### Collections

| Collection | Description | Access |
|------------|-------------|--------|
| `profiles` | User profiles with admin flag | User: own, Admin: all |
| `products` | Product catalog | Public read, Admin write |
| `categories` | Product categories | Public read, Admin write |
| `users/{uid}/cart` | User cart items | User only |
| `users/{uid}/wishlist` | User wishlist items | User only |
| `orders` | Order records | User: own, Admin: all |
| `coupons` | Discount coupons | Public read, Admin write |
| `site_settings` | Site configuration | Public read, Admin write |

### Key Types
See `src/types/database.types.ts` for complete TypeScript definitions of all database entities.

## Deployment

### CI/CD Pipeline
GitHub Actions workflow (`.github/workflows/ci.yml`) runs on pushes/PRs to `main` or `master`:
1. Checkout code
2. Setup Node.js 20
3. Install dependencies (`npm ci`)
4. Run linting
5. Build application

### Deployment Platform
The application is designed for deployment on Vercel:
- Next.js optimization enabled
- Static export not configured (uses SSR)
- React Compiler enabled in `next.config.ts`

### Image Domains
Configured remote image domains in `next.config.ts`:
- `images.unsplash.com` - For sample/product images
- `firebasestorage.googleapis.com` - Firebase Storage
- `*.firebasestorage.app` - Firebase Storage (new format)

## Mobile App-Like Features

The application includes mobile-specific optimizations:
- Bottom navigation bar for mobile (`MobileBottomNav`)
- Admin bottom navigation (`AdminBottomNav`)
- Safe area padding for notched devices
- Touch-optimized button sizes
- Pull-to-refresh prevention
- Tap highlight color removal
- Overscroll behavior control
- Custom mobile animations (fade-in, slide-up, bounce-in)

## Admin Features

Admin users (determined by `profile.is_admin`) have access to:
- Dashboard with analytics overview
- Product management (CRUD operations)
- Category management
- Order management and status updates
- Coupon management
- User management
- Site settings configuration

Admin panel is accessible at `/profile/admin`.

## External Dependencies Notes

### shadcn/ui Components
Components are installed via shadcn CLI and located in `src/components/ui/`. They use:
- Radix UI primitives for accessibility
- Tailwind CSS for styling
- CVA for variant management
- Lucide icons

### Firebase
The app uses Firebase JavaScript SDK v12:
- Modular API (v9+ style imports)
- Firestore for database
- Authentication for user management
- Storage for image uploads

### Next.js Configuration
- React Compiler enabled for performance
- TypeScript strict mode
- Path alias `@/*` maps to `src/*`
- Static optimization for images disabled (using Firebase Storage)
