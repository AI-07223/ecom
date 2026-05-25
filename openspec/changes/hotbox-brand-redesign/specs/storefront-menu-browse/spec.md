## ADDED Requirements

### Requirement: Single-page menu at root

The root path `/` SHALL render the entire menu — every active category and every active menu item — on a single scrollable page. The legacy multi-step flow (home category grid → `/menu/[category]` listing → `/item/[slug]` detail) collapses into one scrollable surface with quick-add controls.

The page MUST be server-rendered for SEO and initial-paint performance. Total SSR HTML payload for ~130 items MUST stay under 500 KB gzipped.

#### Scenario: All categories visible

- **WHEN** the user lands on `/`
- **THEN** every active category from the database MUST be present as a section heading
- **AND** every active menu item assigned to a category MUST appear as a row inside its section
- **AND** sections MUST be ordered by the category's `displayOrder` field

#### Scenario: Empty category hidden

- **WHEN** a category exists but has no active items
- **THEN** the section MUST NOT render

#### Scenario: SSR payload budget

- **WHEN** the home page is fetched with `curl -s https://hotbox.networkbase75.site/ | wc -c`
- **THEN** the response body MUST be under 500 000 bytes uncompressed
- **AND** under 120 000 bytes after gzip compression

### Requirement: Sticky category tabs

A horizontally-scrollable tab strip listing every category SHALL stick to the top of the viewport (just below the sticky header) as the user scrolls the menu. The tab matching the section currently in view MUST be visually highlighted.

Tapping a tab MUST smooth-scroll the corresponding section heading to just below the tab strip.

#### Scenario: Tab highlight follows scroll

- **WHEN** the user scrolls and the "SANDWICH" section heading crosses the top sentinel
- **THEN** the "SANDWICH" tab MUST gain the active styling
- **AND** the previously active tab MUST lose it
- **AND** the active tab MUST scroll into view inside the horizontal tab strip if it was off-screen

#### Scenario: Tap-to-jump

- **WHEN** the user taps the "PIZZA" tab
- **THEN** the page MUST smooth-scroll until the "PIZZA" section heading is positioned just below the tab strip
- **AND** the "PIZZA" tab MUST gain the active styling
- **AND** the URL hash MUST update to `#pizza` (so deep-links work and back-button restores scroll position)

#### Scenario: Deep-link via hash

- **WHEN** the user visits `/#wraps` directly
- **THEN** the page MUST scroll the "WRAPS" section to just below the tab strip after initial paint
- **AND** the "WRAPS" tab MUST be active

### Requirement: Item row quick-add

Each item row SHALL include a `[+]` quick-add button that adds exactly one unit of that item (default variant if multiple exist) to the cart without leaving the menu page. The button MUST give immediate visual feedback (count chip, micro-animation) and update the bottom-cart bar.

If the item has multiple price variants (e.g. Small / Large for shakes), the row MUST render one quick-add button per variant.

Tapping the item NAME (not the `[+]`) SHALL navigate to the per-item detail page `/item/[slug]` for special instructions and bulk quantity input.

#### Scenario: Single-variant quick-add

- **WHEN** the user taps `[+]` on a single-variant item
- **THEN** exactly one unit of that item MUST be added to the cart via Server Action
- **AND** the bottom-cart bar count and total MUST update optimistically before the server roundtrip completes
- **AND** the `[+]` button MUST briefly show a check mark before reverting

#### Scenario: Multi-variant rows

- **WHEN** the item "Cold Coffee" has Small (₹80) and Large (₹100) variants
- **THEN** the row MUST display two stacked controls: "Small ₹80 [+]" and "Large ₹100 [+]"
- **AND** each `[+]` MUST add exactly one of its own variant

#### Scenario: Tap row name to open detail

- **WHEN** the user taps the item name (not the `[+]` button)
- **THEN** the navigator MUST push `/item/[slug]` so the user can add special instructions, change quantity, or read the description

### Requirement: Bottom cart bar

A floating bar pinned to the bottom of the viewport SHALL display the current cart count and total whenever the cart contains at least one item. Tapping it SHALL navigate to `/cart`.

The bar MUST appear on every customer-facing page (menu, item detail, cart, checkout, confirmation, pay, track, account pages) and slide out of view when the cart is empty.

The bar MUST respect iOS safe-area insets via `padding-bottom: max(env(safe-area-inset-bottom), 0.75rem)`.

#### Scenario: Bar appears on first add

- **WHEN** the cart was empty and the user adds the first item
- **THEN** the bottom-cart bar MUST slide up from below the viewport
- **AND** it MUST show "View cart · 1 item · ₹50  →" (or the actual item count and total)

#### Scenario: Bar persists across navigation

- **WHEN** the cart has items and the user navigates from the menu to the item detail page
- **THEN** the bottom-cart bar MUST remain visible without re-animating

#### Scenario: Bar hides on empty cart

- **WHEN** the user removes the last item from the cart
- **THEN** the bottom-cart bar MUST slide down out of the viewport on the next render

### Requirement: Legacy menu routes redirect

The current routes `/menu/[category]` and `/item/[slug]` MUST remain reachable for deep-link compatibility and SEO. The category route SHALL HTTP-redirect (302) to `/#<category-slug>` so external links keep working. The item route SHALL continue to render the per-item detail page.

#### Scenario: Category route redirect

- **WHEN** the user visits `/menu/sandwich`
- **THEN** the server MUST respond with a 302 redirect to `/#sandwich`

#### Scenario: Item route preserved

- **WHEN** the user visits `/item/raw-sandwich`
- **THEN** the per-item detail page MUST render as before (with the dark theme applied)
