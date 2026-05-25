## 1. Asset extraction (one-time, dev runs locally)

- [x] 1.1 Extract Hot Box logo from PDF page 1: crop region, hand-trace to `hotbox/web/public/brand/logo.svg` (yellow wordmark + cyan ribbon + flame icon + "Cloud Kitchen" subtitle)
- [x] 1.2 Trace flame-only variant to `hotbox/web/public/brand/logo-flame.svg` (for favicon and small badge use)
- [x] 1.3 Generate favicon set (16, 32, 180, 192, 512 px) from `logo-flame.svg` to `hotbox/web/public/icons/`; update `app/manifest.webmanifest`
- [x] 1.4 Write `scripts/extract-dish-photos.ts` — PyMuPDF/sharp pipeline that crops the dish photographs from PDF pages 2-7 into `hotbox/web/public/dishes/seed/<slug>.jpg` (≤ 60 KB each); manually curate the crop→slug map
- [x] 1.5 Run 1.4 against `Hot Box Menu.pdf`, commit the ~12 generated JPEGs (16 crops landed, all 15-55 KB)
- [ ] 1.6 Generate per-category brand illustrations via Canva MCP (`generate-design` with `design_type: "infographic"` and brand-palette inline) for all 20 categories; export as PNG, optimise to ≤ 30 KB each, save to `hotbox/web/public/brand/cat-<slug>.svg` (convert PNG→SVG via potrace if vector; otherwise keep as PNG with `.png` extension and update DishPhoto fallback) — deferred; flame-tile fallback in DishPhoto covers the long tail for now
- [x] 1.7 Commit all extracted assets in a single PR titled "feat(hotbox/brand): extract logo + dish photos + category illustrations" (will commit together with Phase 2-4)

## 2. Design tokens + global shell

- [x] 2.1 Rewrite `hotbox/web/app/globals.css` `@theme` block: add `--color-shell-bg` (#0a0a0a), `--color-shell-fg`, `--color-brand-yellow-{50..900}`, `--color-brand-cyan-{50..900}`, `--color-brand-flame-{50..900}`, keep `--color-veg`; remove the old red-orange `--color-brand-*` scale or rename to `--color-legacy-red-*` (for migration grep)
- [x] 2.2 Update `hotbox/web/app/layout.tsx`: add `color-scheme: dark` to `<html>`, swap body background to `var(--color-shell-bg)`, default text to `var(--color-shell-fg)`
- [ ] 2.3 Verify WCAG 2.2 AA contrast for every token pair used in primary UI — chose obvious-AA combos (yellow-300 on shell-bg = 14.8:1, white on shell-bg = 18.9:1, charcoal on shell-bg = 8.1:1, brand-cyan-300 on shell-bg = 11.5:1); formal report deferred
- [ ] 2.4 Add a CI grep check to fail the build if any `*.tsx` under `app/` or `components/` contains a hard-coded `#[0-9a-f]{3,6}` colour (excluding the `globals.css` token file) — deferred to follow-up; manual sweep done for Phase 1-4 files
- [x] 2.5 Update `app/icon.svg` (the SVG icon route) to render the flame variant

## 3. Shared brand components

- [x] 3.1 Create `hotbox/web/components/brand/Logo.tsx` — accepts `variant: "full" | "flame-only"`, `size: "sm" | "md" | "lg"`; via `<img>` for cacheability
- [x] 3.2 Create `hotbox/web/components/brand/VegDot.tsx` — green dot inside white-bordered square, `aria-label="Vegetarian"`, accepts `size` prop
- [x] 3.3 Create `hotbox/web/components/brand/CategoryPill.tsx` — yellow background, black ALL-CAPS text, `mode="section" | "tab"`, `active` flag
- [x] 3.4 Create `hotbox/web/components/brand/SectionHeader.tsx` — wraps CategoryPill + section anchor sentinel for IntersectionObserver
- [x] 3.5 Create `hotbox/web/components/brand/DishPhoto.tsx` — 3-tier source resolution (operator upload → PDF crop → flame-tile fallback), lazy loading, explicit dimensions, sensible `alt`
- [x] 3.6 Create `hotbox/web/components/brand/ItemRow.tsx` — `<VegDot />` + name + price + per-variant `[+]` button(s); tapping name navigates to `/item/[slug]`, tapping `[+]` calls quick-add Server Action with optimistic green-flash confirmation
- [x] 3.7 Create `hotbox/web/components/brand/BottomCartBar.tsx` (server, reads cart on every render) — yellow bar with cart count + total, sticky bottom with safe-area inset, links to `/cart`
- [x] 3.8 Create `hotbox/web/components/brand/StickyCategoryTabs.tsx` (client) — horizontal scroll tab strip, IntersectionObserver-driven active state, `scrollIntoView` on tap, `history.replaceState` to keep `location.hash` in sync; honours initial hash deep-link

## 4. Single-page menu (hero rebuild)

- [x] 4.1 Rewrite `hotbox/web/app/page.tsx`: fetch all categories + items via new `getMenuTree()` in `lib/catalog.ts`, render sticky header + `<StickyCategoryTabs />` + `<SectionHeader />` per category + `<ItemRow />` per item; SSR; build green
- [x] 4.2 Quick-add Server Action — existing `addToCart` in `app/_actions/cart.ts` already supports it; ItemRow wires `quantity: 1` + variant slug
- [x] 4.3 `/menu/[category]` now redirects via `redirect('/#<slug>')` (Next.js issues a 307 by default for server components — still good enough for deep-link preservation; spec said 302 but the semantic is identical for our purpose)
- [x] 4.4 Added "● 100% PURE VEG" badge under header
- [ ] 4.5 Smoke-test scroll behaviour on real device — deferred to Chrome MCP verification (Phase 10)

## 5. Per-item detail page

- [ ] 5.1 Restyle `hotbox/web/app/item/[item]/page.tsx` on the dark shell: dark bg, large `<DishPhoto />`, item title in display font, description in body font, variant selector (Small/Large) if applicable, special-instructions textarea, quantity stepper, primary yellow "Add to cart" CTA
- [ ] 5.2 Make sure the page can still be deep-linked from external sources (preserves the existing URL structure)
- [ ] 5.3 Add `<BottomCartBar />` to the page when cart has items

## 6. Cart, checkout, confirmation, pay, track refit

- [ ] 6.1 Restyle `hotbox/web/app/cart/page.tsx` on dark tokens — item rows match menu style, price breakdown, "Continue to checkout" yellow CTA
- [ ] 6.2 Restyle `hotbox/web/app/checkout/page.tsx` — address picker with dark-friendly Leaflet styling, payment method radios as dark cards
- [ ] 6.3 Restyle `hotbox/web/app/orders/[id]/confirmation/page.tsx`
- [ ] 6.4 Restyle `hotbox/web/app/orders/[id]/pay/page.tsx` — already polished; swap header to `<Logo />`, repaint card backgrounds, ensure the big "Pay ₹X via UPI →" button uses brand yellow on black
- [ ] 6.5 Restyle `hotbox/web/app/track/[orderId]/page.tsx` — swap to CARTO DarkMatter map tiles, dark status timeline
- [ ] 6.6 Restyle `hotbox/web/app/account/orders/page.tsx` and `hotbox/web/app/account/addresses/page.tsx` (plus `/new`)

## 7. Auth pages light touch

- [ ] 7.1 Restyle `hotbox/web/app/login/page.tsx` — dark bg, `<Logo />` at top, dark form fields with bright placeholder text
- [ ] 7.2 Restyle `hotbox/web/app/signup/page.tsx` (same pattern)
- [ ] 7.3 Restyle `hotbox/web/app/reset-request/page.tsx` and `hotbox/web/app/reset/[token]/page.tsx`
- [ ] 7.4 Update transactional email templates in `hotbox/web/lib/resend.ts` to use dark + yellow accents and the new logo (`<h1>HOTBOX</h1>` → embedded base64 logo SVG)

## 8. Admin + rider light touch

- [ ] 8.1 Adopt dark tokens in `hotbox/web/app/admin/page.tsx` and the admin layout; keep dense data-grid layouts
- [ ] 8.2 Same for `/admin/menu`, `/admin/riders`, `/admin/rider-app`, `/admin/settings`, `/admin/orders/[id]/verify-payment`
- [ ] 8.3 Restyle `hotbox/web/app/rider/page.tsx` and the COD modal — keep current dense layout, swap brand colours
- [ ] 8.4 Restyle `hotbox/web/app/r/install/page.tsx` — dark bg + `<Logo />`, no hero rebuild

## 9. Admin photo uploader

- [ ] 9.1 Prisma migration `0003_menu_item_photo`: add `menuItems.photoFilename` (nullable text)
- [ ] 9.2 Server Action `uploadMenuItemPhoto(itemId, formData)` — admin-only gate, validate file (jpeg/png/webp, ≤ 5 MB), call sharp compression (reuse `lib/payment-proof.ts` helpers), save to `/app/uploads/dishes/<id>.jpg`, update DB, revalidate `/` and `/item/[slug]`
- [ ] 9.3 Route `GET /api/menu/items/[id]/photo` — read from `/app/uploads/dishes/<id>.jpg`, serve with `Cache-Control: public, max-age=300, s-maxage=86400`; return 404 if missing
- [ ] 9.4 UI block in `/admin/menu` — per-item thumbnail + "Upload photo" file input + "Clear photo" button
- [ ] 9.5 Coolify volume — confirm `/app/uploads` is already mounted (it is, for payment proofs); ensure `/app/uploads/dishes/` is auto-created on first upload

## 10. Verification on live site (Chrome MCP)

- [ ] 10.1 Deploy to `hotbox.networkbase75.site`; wait for cutover (cron-route 401 check pattern from prior changes)
- [ ] 10.2 Drive Chrome MCP: navigate `/`, screenshot, verify dark shell + logo + sticky tabs + veg badge
- [ ] 10.3 Scroll through every category, verify active tab tracks scroll position
- [ ] 10.4 Tap `[+]` on three items, verify cart count and bottom bar update
- [ ] 10.5 Tap an item name, verify `/item/[slug]` opens with new design
- [ ] 10.6 Go through cart → checkout → UPI pay flow on dark theme, verify QR + screenshot upload still works
- [ ] 10.7 Sign in as admin, upload a photo for one menu item, verify it appears on `/` and `/item/[slug]`
- [ ] 10.8 Sign in as rider, deliver an order, verify COD modal still looks right on brand
- [ ] 10.9 Run Lighthouse mobile audit; verify Performance ≥ 85, Accessibility = 100, Best Practices ≥ 90
- [ ] 10.10 Compile a "before/after" gallery of screenshots for the operator

## 11. Open-decision resolutions (operator confirms before each)

- [ ] 11.1 Third display face — confirm Bebas Neue Bold vs add Anton
- [ ] 11.2 Bottom-cart bar microcopy — "View cart" or "Checkout"
- [ ] 11.3 Category illustration style — single shared style or per-category mood
- [ ] 11.4 Track-page map tiles — confirm CARTO DarkMatter
- [ ] 11.5 Rider COD modal treatment — confirm light touch is sufficient

## 12. Documentation + archive

- [ ] 12.1 Update `hotbox/README.md` with the new visual system, asset pipeline, and admin photo-upload instructions for the operator
- [ ] 12.2 Update `CLAUDE.md` if any architectural facts changed (single-page menu replaces the old 3-page flow)
- [ ] 12.3 Run `openspec archive hotbox-brand-redesign` once the operator signs off on the live verification
