## Context

Hotbox is live at `https://hotbox.networkbase75.site` (Next.js 16 on Coolify, Prisma on Postgres, Bebas Neue + Inter via `next/font`, Tailwind v4 via `@theme` tokens). End-to-end customer flow works (signup → menu → cart → UPI / COD → admin verify → rider COD modal), verified via Chrome MCP on the live site.

The operator delivered a printed brand in `Hot Box Menu.pdf` (7 pages, 21 MB). The brand on paper:

- Deep matte-black background with a subtle restaurant texture
- "Hot Box" wordmark in saturated yellow inside a cyan ribbon outline, with an orange flame icon between the words and "Cloud Kitchen" subtitle in white
- Category sections use bright-yellow pills with black text (BEVERAGES, SANDWICH, MAGGI, …)
- Item rows: white sans-serif names, white prices right-aligned with `/-` suffix
- Food photography on dark backgrounds, scattered (~12 photos across the 6 menu pages)
- Loud green FSSAI veg dot in the top-right of the cover

The current website looks like a generic warm-off-white minimalist food template — different brand entirely. Customers landing on the site don't recognise it as the same restaurant.

The mobile menu UX is also three clicks deep (home category grid → category page → item detail) before a customer can add to cart. The PDF treats the menu as a single browsable spread, which fits mobile better.

**Stakeholders**: operator (single-restaurant owner, non-developer), customers (mobile-first, mostly Android, India), and the existing rider/admin users (utilitarian flow, should stay dense).

## Goals / Non-Goals

**Goals:**
- Repaint every customer-facing page in the operator's actual brand — dark matte + yellow + cyan + flame.
- Collapse the home + category-page steps into a single scrollable menu with sticky category tabs, while preserving per-item detail pages for special instructions.
- Establish a brand-asset pipeline that combines hand-extracted PDF photos with Canva-generated category illustrations and operator-uploaded per-item photos.
- Keep the admin and rider flows working with minimal disruption (just dark tokens + accent updates).
- WCAG 2.2 AA contrast across all customer surfaces.
- SSR-first menu page that stays under 500 KB HTML for ~130 items.

**Non-Goals:**
- Redesigning the admin dashboard's information architecture. The dense data-grid layouts stay.
- Building a CMS for menu items. The Prisma schema + seed-script flow continues unchanged.
- Animations beyond the bottom-cart slide and tab-active transitions. No micro-interactions on every row.
- Internationalization. English + Indian-locale prices/currency only.
- Server-side image optimization beyond what's already done for payment proofs (sharp + libvips). We reuse that pipeline for dish photos.
- A mobile app for the customer. The web is the customer surface; rider already has an Expo APK.

## Decisions

### D1. Dark everywhere (not hybrid)

**Choice:** Apply the dark shell to every customer-facing route including auth, cart, checkout, and account pages.

**Rejected alternative:** Hybrid (dark hero / light content).

**Why:** The PDF is uncompromising — a hybrid weakens the brand. Indian food-delivery competitors (Zomato night mode, Swiggy dark) have normalized dark food UI. Forms can be made readable on dark with bright placeholder text and high-contrast borders; we already do this on the rider page.

### D2. Single-page menu with sticky tabs

**Choice:** `/` becomes one server-rendered page containing every category + item, with a sticky horizontal tab strip that uses IntersectionObserver to track the visible section.

**Rejected alternatives:**
- *Keep current 3-page flow* — operator explicitly preferred the printed-menu single-spread feel.
- *Pure tab-switcher (no scroll, one section visible at a time)* — kills scannability, requires extra taps to compare categories.

**Why:** Matches the PDF's DNA (the menu IS the page, you scan and tick). Removes two navigations per order. With ~130 thin rows × ~120 bytes each, SSR HTML lands under 30 KB before category headers and quick-add controls — well under the 500 KB budget.

### D3. Hybrid item detail (keep `/item/[slug]`)

**Choice:** Quick-add `[+]` on the row for the default action; tapping the row name opens `/item/[slug]` for special instructions and bulk quantity.

**Rejected alternatives:**
- *Bottom-sheet for everything* — adds modal complexity, breaks deep-linking, harder to share an item URL.
- *Force navigation to detail page* — slow, kills the single-page flow benefit.

**Why:** The 80% case (add 1 of a known item) takes one tap; the 20% case (custom request, big quantity) still has its own URL for shareability and SEO. This is the operator's chosen "best of both worlds."

### D4. Sticky-tab implementation: IntersectionObserver + scrollTo, not scroll-listener math

**Choice:** Each category section gets an invisible 1px sentinel anchored just below the sticky tab strip. An IntersectionObserver fires when a sentinel crosses; the matching tab gains `aria-current="true"` and the strip auto-scrolls the active tab into view. Tab taps call `scrollIntoView({ behavior: 'smooth', block: 'start' })` on the section heading and update `location.hash` (no `pushState` reload — `history.replaceState` to keep navigation clean).

**Rejected alternatives:**
- *Scroll-event listener with manual offset math* — fires 60 fps, janky on low-end Android, gets layout-thrash on resize.
- *CSS scroll-snap on tabs* — doesn't track scroll position, only constrains tab strip scrolling.

**Why:** IntersectionObserver is browser-native, off-main-thread, and exactly the right primitive. Already in baseline Safari/Chrome/Firefox for years.

### D5. Brand asset pipeline (three sources)

```
   Hot Box Menu.pdf
        │
        ├─ scripts/extract-dish-photos.ts (one-time, dev runs locally)
        │   └─ hotbox/web/public/dishes/seed/<slug>.jpg  (committed)
        │
        ├─ scripts/extract-logo.ts (one-time, dev runs locally)
        │   └─ hotbox/web/public/brand/logo.svg + logo-flame.svg (committed)
        │
        └─ feeds brand kit to Canva MCP generate-design
            └─ hotbox/web/public/brand/cat-<slug>.svg  (committed, one per category)

   /admin/menu admin UI (runtime, operator uploads)
        │
        └─ /app/uploads/dishes/<menuItem.id>.jpg (persistent volume)
                served via /api/menu/items/<id>/photo
```

`<DishPhoto>` resolves source per: operator-upload → PDF crop → Canva category illustration (in that order).

**Why three tiers:** ship something today (PDF crops cover ~12 hero items, Canva illustrations cover the long tail), let the operator improve over time (admin upload), no broken-image state ever.

### D6. Logo as hand-traced SVG

**Choice:** Extract the logo region from PDF page 1 as a high-res PNG, then hand-trace it as an SVG so it's vector-perfect at every size. Component: `<Logo variant="full | flame-only" size="sm | md | lg" />`.

**Rejected alternatives:**
- *Use the raster crop directly* — looks fine at 1x but blurry on 3x DPR phones.
- *Auto-trace via potrace* — produces messy SVGs for organic shapes like the flame. Hand-trace is faster than cleaning up auto-trace output for a single 200-byte logo.
- *Wait for original SVG from operator* — blocks the redesign on an unknown response time.

**Why:** SVG is needed for retina sharpness and theming (we may want to flip yellow → white on certain dark backgrounds). 30 minutes of trace work in Figma beats indefinite blocking.

### D7. Sharp reuse for dish photos

**Choice:** Reuse the existing sharp pipeline (already in `lib/payment-proof.ts`) for admin-uploaded dish photos. Same compression knobs (JPEG q=80, max 1280px, mozjpeg, EXIF rotate).

**Why:** Already validated, already in the Docker image (vips + vips-cpp), no new dependency. Operator-uploaded 3 MB phone photo → 60 KB JPEG, indistinguishable on a 320 px-wide thumbnail.

### D8. Admin photo upload — scoped IN

**Choice:** Include the per-item photo uploader in `/admin/menu` as part of this change, NOT a follow-up.

**Rejected alternative:** Punt to a follow-up change.

**Why:** Without operator-upload, the third tier of the photo pipeline is dead and the redesign half-ships. The uploader is a small surface (single Server Action + reuse sharp + Prisma column) and completes the pipeline narrative cleanly.

### D9. Veg signalling — both header badge AND per-item dot

**Choice:** Big "● 100% PURE VEG" badge under the menu header + small `<VegDot />` next to every item name.

**Rejected alternatives:**
- *Header only* — loses per-item reassurance, looks weird in mixed-veg restaurants (Hotbox isn't one but the component should still support per-item).
- *Per-item only* — misses the brand statement the PDF makes loudly.

**Why:** The PDF does both. Header sells the brand promise once; the per-item dot reassures on every scroll-stop.

### D10. APK install page — light touch

**Choice:** `/r/install` gets logo + dark-token swap, no hero rebuild.

**Why:** It's an internal page rider candidates hit once. Brand consistency yes, design investment no.

### D11. Component organization

```
hotbox/web/components/brand/
  Logo.tsx              # <Logo variant="full|flame-only" size="sm|md|lg" />
  VegDot.tsx            # FSSAI green dot in white square
  CategoryPill.tsx      # Yellow pill with black ALL-CAPS text
  ItemRow.tsx           # Name + price + quick-add buttons + optional variants
  StickyCategoryTabs.tsx # Horizontal scroll tabs + IntersectionObserver
  BottomCartBar.tsx     # Floating cart-state bar, slides on count > 0
  DishPhoto.tsx         # 3-tier source resolution + lazy loading
  SectionHeader.tsx     # Yellow pill heading anchored to category section
```

All `brand/` components are Server Components by default; `StickyCategoryTabs` and `BottomCartBar` need `"use client"` for IntersectionObserver and cart-state subscription.

### D12. Migration: feature-flagged behind nothing

**Choice:** Ship the redesign as a single replacement. No A/B flag, no /v2 path.

**Why:** Single-restaurant demo, no production user base whose behavior we're protecting. The current site is the demo — replacing it IS the launch.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Single-page menu HTML grows beyond 500 KB if seed data balloons | Add a build-time check in CI that fails if `next build` output for `/` exceeds 500 KB. Lazy-render below-the-fold sections as a follow-up if needed. |
| IntersectionObserver sentinel-misalignment when the sticky tab strip changes height (e.g. wraps to two lines on small phones) | Use a single CSS `position: sticky; top: 0` for both header + tab strip wrapper so they move as a unit; the sentinel `top` offset becomes a CSS custom property tied to the wrapper height. |
| Dark forms feel unfriendly to first-time visitors | Bright (#fcd34d-tinted) placeholders, high-contrast borders (#3f3f46 → #71717a on focus), and visible focus rings. Test on Android device in daylight. |
| Operator's DNS may not be Cloudflare-managed, so Resend domain-verify can stall | Already pre-registered `hotbox.networkbase75.site` in Resend; DNS records ready to copy-paste. Until verified, emails fly from `noreply@victor.networkbase75.site` (already working). Not in this change's critical path. |
| Canva MCP rate limits or quality regressions when generating 20+ category illustrations | Generate iteratively (1-2 at a time), commit results immediately, regenerate failures. If Canva quality is inadequate, fall back to simple text-and-icon CSS-rendered category cards (no asset shipping) for the long-tail categories. |
| Photo upload could be abused to fill disk | 5 MB hard limit pre-compression; admin-only Server Action gate; sharp compression to ≤ 60 KB at rest. Disk impact for 131 items × 60 KB = 8 MB max even fully populated. |
| Hand-traced logo SVG diverges from the operator's "official" logo | Show the operator a side-by-side before commit. If they have an original AI/SVG file, swap it in (the `<Logo />` component abstracts the asset path). |
| Bottom-cart bar may collide with platform UI (iOS home indicator, Android nav bar) | `padding-bottom: max(env(safe-area-inset-bottom), 0.75rem)` already established for the current `.pb-safe` utility. |

## Migration Plan

The redesign ships as a single replacement on the `platform` branch.

**Phased deploy** (one PR per phase, each independently shippable):

1. **Asset extraction & commit** (no UI changes)
   - Run `extract-logo.ts` and `extract-dish-photos.ts` locally; commit assets to `hotbox/web/public/brand/` and `hotbox/web/public/dishes/seed/`.
   - Generate Canva category illustrations; commit.
   - **Risk:** zero. Just adds files.

2. **Design tokens + shared shell** (visual change but logic identical)
   - Update `globals.css` tokens; switch `<html>` to dark shell + `color-scheme: dark`.
   - Add `<Logo />`, `<VegDot />`, `<CategoryPill />`, `<DishPhoto />`, `<BottomCartBar />` components.
   - Restyle the existing pages on the new tokens without changing routes (everything still works, just looks different).
   - **Risk:** medium. Visual regression possible if a hard-coded colour was missed.
   - **Rollback:** git revert; tokens are CSS-only, no schema or route changes.

3. **Single-page menu + sticky tabs**
   - Build the new `/` (single-page menu) and the new `<ItemRow />` + `<StickyCategoryTabs />`.
   - Add a 302 redirect from `/menu/[category]` → `/#<category-slug>`.
   - **Risk:** medium. Mobile scroll-tracking edge cases.
   - **Rollback:** revert page.tsx + remove redirect; legacy category routes still in repo as the fallback path.

4. **Admin photo uploader + Prisma column**
   - Prisma migration `0003_menu_item_photo` adds `menuItems.photoFilename`.
   - Server Action + admin UI block in `/admin/menu`.
   - **Risk:** low. Additive DB change.
   - **Rollback:** if the migration ships but UI doesn't, no data is at risk (column stays nullable).

5. **Live verification via Chrome MCP** (Section 5 of every prior Hotbox change)
   - Drive signup → menu → quick-add → cart → checkout → admin verify on the new dark UI.
   - Screenshot every page as evidence.
   - Walk the operator through `/admin/menu` photo upload.

## Open Questions

These are decisions the operator can override before `/opsx:apply` starts; the team will use the defaults listed if no override comes.

1. **Third display face for category pills** — keep Bebas Neue Bold (lighter footprint, already loaded) or add Anton (more weight, matches PDF's chunky pill text more closely)?
   **Default:** Bebas Neue Bold. Add Anton only if the operator explicitly wants the heavier look in QA.

2. **Bottom-cart bar microcopy** — `View cart · 3 items · ₹290 →` vs `Checkout · 3 items · ₹290 →` (the latter jumps past `/cart` straight to `/checkout` when tapped)?
   **Default:** "View cart" + navigates to `/cart` (matches existing flow; less aggressive).

3. **Category illustrations** — generate a single shared style across all 20 categories (consistent look, less personality), or per-category mood (more personality, harder to keep coherent)?
   **Default:** Single shared style — outlined yellow-on-dark line art, ~30 KB each.

4. **Should the `/track/[orderId]` map (Leaflet + OSM) get a dark map tile?** Currently uses standard OSM (light). Dark tiles available via CARTO DarkMatter free tier.
   **Default:** Yes — use CARTO DarkMatter tiles for visual consistency with the dark shell.

5. **Where does the rider COD modal sit in the new visual system?** It's on `/rider` which is a "minimal touch" route, but the modal is a heavy moment.
   **Default:** Modal adopts the brand-yellow primary CTA but keeps its current dense layout. No hero rebuild.
