## ADDED Requirements

### Requirement: Restaurant settings

The system SHALL store a single `restaurants` row representing Hotbox, with operating-hours fields, a `is_paused` boolean, a `latitude` / `longitude` pair pinning its physical location, an `allow_cancel_after_accept` boolean defaulting to `false`, and human-readable `display_name`, `phone`, `address` strings.

#### Scenario: Default operating hours
- **WHEN** the restaurant row is first seeded
- **THEN** `open_time` is `09:00` and `close_time` is `23:00` in the configured timezone, and `is_paused` is `false`

#### Scenario: Owner pauses orders mid-shift
- **WHEN** the restaurant admin sets `is_paused = true` via the admin panel
- **THEN** the customer storefront refuses new checkout attempts with a "We're not taking orders right now" message
- **AND** the menu remains browseable

#### Scenario: Operating-hours enforcement
- **WHEN** the current time is outside the `open_time`–`close_time` window
- **THEN** the customer storefront refuses new checkout attempts with a "We open at X" message
- **AND** the menu remains browseable

### Requirement: Hierarchical menu structure

The system SHALL model the menu as `categories` (Beverages, Sandwich, Maggi, Chaap, Wraps, Burger, Pizza, Momos, Pasta, Snacks, Starters, Noodles, Fry & Tadka, Curry, Paneer, Vegetable, Rice, Breads, Add-On, Ice Cream) containing `menu_items`. Each menu item SHALL have `title`, `description?`, `image_url?`, `base_price_paise`, `is_veg` (always `true` for Hotbox in v1), `is_available` (toggleable), and `prep_time_minutes`.

#### Scenario: Browse by category
- **WHEN** a customer visits the home page
- **THEN** the system renders categories in `sort_order`
- **AND** each category card links to a section listing its items in `sort_order`

#### Scenario: Owner marks an item out-of-stock
- **WHEN** the admin sets `is_available = false` on a menu item
- **THEN** the customer storefront shows the item as visually disabled with an "Out of stock" tag
- **AND** the item cannot be added to a cart

### Requirement: Item variants and add-ons

The system SHALL support `item_variants` (e.g., Small/Medium/Large with a `price_delta_paise`) and `item_addons` (e.g., Extra Cheese ₹40, Raita ₹30, with `price_paise` and `is_required`) for any menu item.

#### Scenario: Customer customizes a Pizza
- **WHEN** the customer opens a menu item that has at least one variant
- **THEN** the system presents radio-style variant selection (required)
- **AND** checkbox-style add-on selection (optional unless `is_required = true`)
- **AND** the line price recomputes live as the customer toggles options

#### Scenario: Required add-on enforcement
- **WHEN** an item has an `is_required = true` add-on group (e.g., spice level)
- **THEN** the "Add to Cart" button is disabled until the customer picks one option

### Requirement: Menu seed from Hotbox PDF

The system SHALL ship with a seed script (`prisma/seed.ts` or `seed/hotbox.ts`) that populates the `restaurants`, `categories`, `menu_items` (and a sensible subset of variants/add-ons) from a JSON file derived from the Hotbox menu PDF text extract.

#### Scenario: Fresh database seed
- **WHEN** a developer runs `npm run seed` against an empty `hotbox` database
- **THEN** the restaurant row exists with display name "Hotbox"
- **AND** at least 15 categories are populated
- **AND** at least 100 menu items are populated, all with `is_veg = true`
- **AND** the seed is idempotent (re-running does not duplicate rows; it upserts by stable handle)

### Requirement: Image asset strategy

The system SHALL render a placeholder image for any menu item without an `image_url`. The placeholder MAY be a CSS-only block coloured by category, a stock food photo from Unsplash, or a static SVG — choice deferred to apply-time. The customer storefront SHALL NOT crash or layout-shift when images are missing.

#### Scenario: Item with no image
- **WHEN** a customer views a category and one item lacks `image_url`
- **THEN** the item card renders with the placeholder
- **AND** the layout of neighbouring item cards is identical to cards with images
