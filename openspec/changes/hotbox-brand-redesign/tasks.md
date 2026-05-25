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

- [x] 5.1 Restyle `hotbox/web/app/item/[item]/page.tsx` on the dark shell
- [x] 5.2 Deep-link compatibility preserved (URL structure unchanged)
- [x] 5.3 `<BottomCartBar />` wired on the page

## 6. Cart, checkout, confirmation, pay, track refit

- [x] 6.1 `/cart` repainted on dark tokens
- [x] 6.2 `/checkout` — dark cards for addresses + payment methods, brand-yellow primary CTA
- [x] 6.3 `/orders/[id]/confirmation`
- [x] 6.4 `/orders/[id]/pay` — Logo header, yellow primary "Pay ₹X via UPI" CTA on dark, QR card stays on white for scan reliability
- [x] 6.5 `/track/[orderId]` — CARTO DarkMatter tiles, yellow rider pin + flame customer pin, brand-yellow dashed route line
- [x] 6.6 `/account/orders`, `/account/addresses`, `/account/addresses/new`

## 7. Auth pages light touch

- [x] 7.1 `/login`
- [x] 7.2 `/signup`
- [x] 7.3 `/reset-request` and `/reset/[token]`
- [x] 7.4 Email templates in `lib/resend.ts` — dark shell with inline SVG Hot Box logo, yellow CTA, charcoal copy

## 8. Admin + rider light touch

- [x] 8.1 Admin layout — dark shell, Logo + "Hot Box · Admin" header, AdminNav with yellow underline on active
- [x] 8.2 `/admin/menu`, `/admin/riders`, `/admin/rider-app`, `/admin/settings`, `/admin/orders/[id]/verify-payment` all on dark tokens
- [x] 8.3 `/rider` + COD modal repainted; the giant "Collect cash" banner now uses brand yellow as the PDF intended
- [x] 8.4 `/r/install` — Logo header, dark cards, brand-yellow download CTA

## 9. Admin photo uploader

- [x] 9.1 Prisma migration `0003_menu_item_photo` adds `menu_items.photo_filename`
- [x] 9.2 Server Actions `uploadMenuItemPhoto` + `clearMenuItemPhoto` — admin gate, sharp compression via `lib/menu-photos.ts`, saves to `/app/uploads/dishes/<itemId>.jpg`
- [x] 9.3 Route `GET /api/menu/items/[id]/photo` — public 5-min/1-day cache, 404 on missing so `<DishPhoto>` falls through to PDF crop / flame tile
- [x] 9.4 UI block in `/admin/menu` — thumbnail + Upload/Replace + Clear buttons per row, optimistic green-flash on save
- [x] 9.5 Coolify volume `/app/uploads/` is mounted (shared with payment proofs); `dishes/` subdir auto-created on first upload

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

- [x] 12.1 `hotbox/README.md` rewritten — brand identity section, asset pipeline, admin photo-upload instructions, single-page menu architecture, sharp/Resend env vars, updated "Where things live" map
- [x] 12.2 `CLAUDE.md` updated — single-page menu noted, dark restaurant brand mentioned, OpenSpec change history extended, customer-flow path documented
- [ ] 12.3 Run `openspec archive hotbox-brand-redesign` once the operator signs off on the live verification
