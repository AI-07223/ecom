# menu-item-imagery Specification

## Purpose
TBD - created by archiving change hotbox-brand-redesign. Update Purpose after archive.
## Requirements
### Requirement: Three-tier photo source

Each menu item SHALL render a photo using the first available source from this precedence list:

1. **Operator upload** — a JPEG at `/public/dishes/<menuItem.id>.jpg` referenced by `menuItems.photoFilename` in the database. Highest priority.
2. **PDF crop** — a JPEG at `/public/dishes/seed/<slug>.jpg` shipped with the repo, extracted from the operator's Hot Box Menu PDF for the dishes shown there (roughly 12–15 items).
3. **Category illustration** — an SVG at `/public/brand/cat-<categorySlug>.svg` generated via Canva MCP. One per category, rendered when neither operator upload nor PDF crop exists.

The `<DishPhoto />` React component MUST resolve the source per the precedence above and emit a `<img>` with `loading="lazy"`, explicit `width` and `height`, and meaningful `alt` text.

#### Scenario: Operator upload wins

- **WHEN** `menuItems.photoFilename` is set to "abc123.jpg" for item "Paneer Tikka Pizza"
- **THEN** `<DishPhoto item={...} />` MUST render `<img src="/api/menu/items/<id>/photo" alt="Paneer Tikka Pizza">`

#### Scenario: PDF crop fallback

- **WHEN** `menuItems.photoFilename` is null AND `/public/dishes/seed/paneer-tikka-pizza.jpg` exists in the build
- **THEN** `<DishPhoto />` MUST render `<img src="/dishes/seed/paneer-tikka-pizza.jpg" alt="Paneer Tikka Pizza">`

#### Scenario: Category illustration final fallback

- **WHEN** neither the operator upload nor the PDF crop exists for item "Some Obscure Dish" in category "wraps"
- **THEN** `<DishPhoto />` MUST render `<img src="/brand/cat-wraps.svg" alt="Wraps category">`

### Requirement: Admin photo uploader

The admin menu page `/admin/menu` SHALL display a thumbnail of the current photo for each menu item alongside an "Upload photo" affordance that accepts JPEG/PNG/WebP up to 5 MB.

On upload the server MUST:
- Authenticate the caller as admin
- Compress the image via sharp (max 1280px on longest edge, JPEG quality 80, mozjpeg) — same pipeline used for payment-proof screenshots
- Save to `/app/uploads/dishes/<menuItem.id>.jpg` (persistent volume)
- Update `menuItems.photoFilename` to the new filename
- Revalidate `/` and `/item/[slug]`

#### Scenario: Successful upload

- **WHEN** an admin uploads a 3 MB JPEG for item "Margherita Pizza"
- **THEN** the server MUST compress it to ≤ 60 KB
- **AND** `/api/menu/items/<id>/photo` MUST then serve that compressed JPEG
- **AND** the next render of `/` and `/item/margherita-pizza` MUST show the new photo

#### Scenario: Unauthorized upload rejected

- **WHEN** a non-admin (customer, rider, or unauthenticated) calls the upload Server Action
- **THEN** the action MUST return `{ ok: false, error: "Not authorized" }`
- **AND** no file MUST be written to disk

#### Scenario: Oversized file rejected

- **WHEN** an admin tries to upload a 12 MB JPEG
- **THEN** the action MUST return `{ ok: false, error: "Image too large (max 5 MB)" }` before any compression
- **AND** no file MUST be written

### Requirement: Photo serving route

`GET /api/menu/items/[id]/photo` SHALL serve the operator-uploaded photo for the given item from the `/app/uploads/dishes/` directory with `Cache-Control: public, max-age=300, s-maxage=86400`.

If no operator upload exists (no row in DB with that id, or the file is missing from disk), the route SHALL return 404 so the `<DishPhoto />` component falls through to the next tier.

#### Scenario: Photo served

- **WHEN** a request comes in for `/api/menu/items/cmpig4d1i0006la0168ou6kjn/photo` and the file exists
- **THEN** the response MUST be the compressed JPEG with `Content-Type: image/jpeg` and cache headers as above

#### Scenario: 404 on missing file

- **WHEN** `menuItems.photoFilename` is null OR the file is missing from disk
- **THEN** the route MUST return HTTP 404

### Requirement: PDF dish extraction (build-time)

A one-time extraction script at `scripts/extract-dish-photos.ts` SHALL crop the dish photographs from `Hot Box Menu.pdf` (pages 2–7) and save them as JPEGs at `hotbox/web/public/dishes/seed/<slug>.jpg`. The mapping of crop region to item slug SHALL be hand-curated and committed to the script.

The script is run by a developer locally, NOT at deploy time. Its outputs are committed to git so the build is hermetic.

#### Scenario: Script run

- **WHEN** a developer runs `npx tsx scripts/extract-dish-photos.ts ~/Downloads/'Hot Box Menu.pdf'`
- **THEN** the script MUST emit one JPEG per mapped crop into `hotbox/web/public/dishes/seed/`
- **AND** each JPEG MUST be ≤ 60 KB (sharp-compressed)

### Requirement: Category illustrations (Canva MCP)

For each category in the menu, a brand-on illustration SVG SHALL be generated via Canva MCP and saved to `hotbox/web/public/brand/cat-<categorySlug>.svg`. Illustrations MUST use the Hotbox palette (dark bg, yellow + cyan + flame accents) and a consistent line-art style across the set.

This is a one-time generation, committed to the repo. Operator can replace any of them later by overwriting the file or by uploading per-item photos (which take precedence).

#### Scenario: Illustration set complete

- **WHEN** the redesign ships
- **THEN** `hotbox/web/public/brand/cat-<slug>.svg` MUST exist for every category currently in the seed data
- **AND** each file MUST be < 30 KB (vector SVG, gzip-friendly)

