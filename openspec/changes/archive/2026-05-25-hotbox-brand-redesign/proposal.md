## Why

The current Hotbox site looks like a generic minimalist food template — warm off-white background, red-orange "HOTBOX" wordmark, emoji icons — but the operator's actual printed brand (the menu PDF) is the opposite: deep matte-black restaurant atmosphere, yellow + cyan + flame accents, "Hot Box Cloud Kitchen" wordmark with a flame-in-banner logo, and real dish photography. Customers landing on the website don't recognise it as the same restaurant they ordered from in-store, and the brand expression is markedly weaker than the offline material.

In parallel, the mobile menu UX is **three clicks deep** (home → category page → item detail) before a customer can add to cart. The PDF treats the menu as a single browsable spread; the website should match that pattern on mobile, where the bulk of orders happen.

## What Changes

- **BREAKING (visual)**: Repaint the entire customer-facing storefront in the operator's actual brand — dark matte-black background, yellow category pills, cyan ribbon accents, flame icon, white sans-serif menu items.
- **NEW**: Single-page menu at `/` that lists every category and item on one scrollable surface, with sticky horizontal-scroll category tabs that highlight the current section as the user scrolls. Replaces the current home → `/menu/[category]` two-step.
- **NEW**: Per-item detail pages (`/item/[slug]`) are kept, reachable by tapping the row name. Quick-add `[+]` buttons on each row let customers fill the cart without leaving the menu.
- **NEW**: Sticky bottom-bar showing live cart total, slides up when cart > 0 across all customer pages.
- **NEW**: Brand asset pipeline — extract logo + dish photos from the menu PDF, generate per-category illustrations via Canva MCP, ship them under `/public/brand/` and `/public/dishes/`.
- **NEW**: Admin UI for uploading menu-item photos so the operator can swap defaults over time.
- **NEW**: Hot Box flame-banner logo as a reusable `<Logo />` component (SVG) replacing the current Bebas Neue "HOTBOX" wordmark.
- **MODIFIED**: `app/globals.css` design tokens — swap red-orange brand scale and off-white shell for the dark + yellow + cyan + flame palette extracted from the PDF.
- **MODIFIED**: Cart, checkout, confirmation, pay, track, login, signup, reset, account-orders, and account-addresses pages — restyle on the new tokens (logic unchanged).
- **MINIMAL TOUCH**: `/admin/*` and `/rider` get the dark-token swap and yellow accents but keep their dense utilitarian layouts. `/r/install` and `/track/[id]` get a light brand touch-up (logo + colours) but no rebuild.
- **REMOVED**: The current home category-tile grid and the standalone `/menu/[category]` listing pages collapse into the single-page menu. (Routes remain for deep-links but redirect to `/#<category-slug>`.)

## Capabilities

### New Capabilities
- `storefront-brand-identity`: Design tokens, typography, logo asset, dark shell, and the rules governing how every customer-facing surface presents the Hotbox brand. Owned source-of-truth for colours and fonts.
- `storefront-menu-browse`: How customers see and add menu items on mobile — single-page scrolling layout, sticky category tabs, quick-add controls, per-item detail page, bottom-cart bar.
- `menu-item-imagery`: How dish photos are sourced (PDF crops, Canva-generated category illustrations, operator uploads), stored, served, and rendered with sensible fallbacks.

### Modified Capabilities
- None. (No existing specs cover the storefront's visual identity or menu browse behaviour — both are net-new capability descriptions.)

## Impact

**Affected code**
- `hotbox/web/app/globals.css` — token system overhaul
- `hotbox/web/app/layout.tsx` — root shell + font loading + dark `<html>` class
- `hotbox/web/app/page.tsx` + `hotbox/web/app/menu/[category]/page.tsx` — collapse into single-page menu (the category route becomes a redirect)
- `hotbox/web/app/item/[item]/page.tsx`, `/cart`, `/checkout`, `/orders/*`, `/track/*`, `/account/*`, `/login`, `/signup`, `/reset-request`, `/reset/[token]` — restyle on new tokens
- New shared components under `hotbox/web/components/brand/` — `<Logo />`, `<CategoryPill />`, `<ItemRow />`, `<StickyCategoryTabs />`, `<BottomCartBar />`, `<VegDot />`, `<DishPhoto />`
- Admin: new photo-uploader UI inside `/admin/menu`
- `hotbox/web/public/brand/` — logo SVG, favicon set
- `hotbox/web/public/dishes/` — dish photos and category illustrations
- Prisma schema: add `menuItems.photoFilename` column for operator-uploaded photos
- New `/api/menu/items/[id]/photo` route (GET) and admin Server Action (POST) for photo upload

**Asset pipeline (one-time, but tooling-supported)**
- Source PDF: `C:/Users/mniag/Downloads/Hot Box Menu.pdf` (already in operator's possession)
- PDF page extraction: PyMuPDF (already installed)
- Logo trace: hand SVG from the PDF crop (or auto-trace via potrace if installed)
- Canva MCP: category icon set generation

**No impact on**
- Database schema (other than the new `photoFilename` column)
- Payment flow / state machine
- Rider mobile app
- Cron jobs
- Authentication / session management

**Performance budget**
- Single-page menu HTML must stay under 500 KB SSR'd for ~130 items (item rows are thin).
- Initial paint < 2s on a mid-range Android over 4G.
- Dish photos lazy-loaded, served as compressed JPEGs (≤ 60 KB each via sharp).

**Accessibility**
- Dark-mode contrast must hit WCAG 2.2 AA (yellow on black = excellent; cyan on black = check).
- Focus rings visible on all interactive elements (sticky tabs, quick-add buttons, cart bar).
- Screen-reader landmarks: header, main, footer, navigation (category tabs as `<nav aria-label="Menu sections">`).

**Open decisions deferred to design.md / first task**
1. Whether category tabs scroll horizontally on tap or jump to the section (or both).
2. Whether to ship lottie/SVG micro-animations for the bottom-cart slide-up.
3. Whether to use Anton as a third display face for category pills, or stick with Bebas Neue Bold.
