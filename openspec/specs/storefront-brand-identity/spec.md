# storefront-brand-identity Specification

## Purpose
TBD - created by archiving change hotbox-brand-redesign. Update Purpose after archive.
## Requirements
### Requirement: Brand colour palette

The system SHALL expose the Hotbox brand palette as a single source of truth in `app/globals.css` via CSS custom properties under `@theme`. All customer-facing components MUST consume colours via these tokens (never hard-coded hex values).

The palette MUST include:
- `--color-shell-bg` — deep matte black, the default page background
- `--color-shell-fg` — primary text on dark surfaces (off-white)
- `--color-brand-yellow` (50–900 scale) — primary brand accent used for category pills, primary CTAs, and the "Hot Box" wordmark
- `--color-brand-cyan` (50–900 scale) — secondary accent used for the logo ribbon and small indicators
- `--color-brand-flame` (50–900 scale) — fire/flame icon and danger states
- `--color-veg` — FSSAI green dot
- `--color-charcoal` — muted text on dark surfaces (timestamps, hints, secondary copy)

#### Scenario: Token consumption

- **WHEN** a component author writes a yellow accent
- **THEN** they MUST use `var(--color-brand-yellow-500)` (or a Tailwind class that resolves to it via `@theme`) — not a raw hex
- **AND** running `grep -r "#fc[d-f]" hotbox/web/components hotbox/web/app --include="*.tsx"` after the redesign lands MUST return no matches (excluding the globals.css token file itself)

#### Scenario: Contrast compliance

- **WHEN** any token pair is composited for foreground/background
- **THEN** the contrast ratio MUST meet WCAG 2.2 AA (4.5:1 for normal text, 3:1 for large text and UI components)
- **AND** the design.md MUST list the verified ratios per token pair used in primary UI

### Requirement: Typography system

The system SHALL load Bebas Neue (display) and Inter (body) via `next/font` and expose them as CSS variables `--font-display` and `--font-sans`. Category pills MAY use a third heavier face (Anton or Bebas Neue Bold) if the design.md decides one is needed.

All numeric values (prices, quantities, totals) MUST use `font-variant-numeric: tabular-nums` for vertical alignment in lists.

#### Scenario: Font loading

- **WHEN** the root `<html>` renders
- **THEN** `<html className="font-sans ${displayVar} ${sansVar}">` MUST apply the loaded font variables
- **AND** the FOUT/FOIT MUST be eliminated via `next/font`'s default behaviour (no flash of unstyled text)

#### Scenario: Tabular numerals

- **WHEN** a price like "₹92.50" or a quantity badge renders inside a list or column
- **THEN** the digits MUST occupy equal horizontal space across rows so prices align visually

### Requirement: Logo asset

The system SHALL ship the Hot Box logo as an SVG asset at `public/brand/logo.svg` and a flame-icon-only variant at `public/brand/logo-flame.svg`. Both MUST be reachable via a `<Logo />` React component that accepts a `size` prop (`sm | md | lg`) and a `variant` prop (`full | flame-only`).

The logo SHALL replace every current use of the "HOTBOX" Bebas Neue wordmark in customer-facing layout, including the site header, login/signup/reset pages, transactional email templates, and the order confirmation page.

#### Scenario: Logo in header

- **WHEN** any customer-facing page renders
- **THEN** the header MUST include `<Logo variant="full" size="sm" />` linking to `/`
- **AND** the logo MUST remain crisp at 32 px height on a 3x DPR display

#### Scenario: Favicon set

- **WHEN** the site is bookmarked or added to home screen on iOS/Android
- **THEN** the favicon MUST display the flame icon on a yellow background, derived from the same source SVG
- **AND** the `manifest.webmanifest` MUST point at the new icon set

### Requirement: Dark page shell

Every customer-facing page (excluding admin and rider routes) SHALL render with `--color-shell-bg` as the document background, `--color-shell-fg` as default text colour, and a sticky header containing the logo and the cart-state pill.

The `<body>` and `<html>` MUST set `color-scheme: dark` so native form controls (date pickers, selects, checkboxes) match the dark theme on browsers that respect the hint.

#### Scenario: Shell coverage

- **WHEN** the user visits any of: `/`, `/item/*`, `/cart`, `/checkout`, `/orders/*/confirmation`, `/orders/*/pay`, `/track/*`, `/account/*`, `/login`, `/signup`, `/reset-request`, `/reset/*`
- **THEN** the page MUST render against the dark shell
- **AND** the sticky header with the logo MUST be visible (logo links to `/`, cart pill links to `/cart`)

#### Scenario: Admin shell exempt

- **WHEN** the user visits any `/admin/*` or `/rider` route
- **THEN** the page MAY use the dark tokens but is NOT required to render with the customer-facing sticky header
- **AND** admin pages keep their dense data-grid layouts

### Requirement: Pure-veg signalling

The system SHALL signal that Hot Box is 100% vegetarian in two complementary ways:
1. A header badge ("● 100% PURE VEG", green dot on dark) visible on the home / single-page menu.
2. A small `<VegDot />` indicator (the FSSAI green dot inside a white square) next to every item name in lists and on the item detail page.

#### Scenario: Header badge

- **WHEN** the single-page menu renders
- **THEN** a prominent "● 100% PURE VEG" badge MUST appear immediately under the header
- **AND** the badge MUST use `--color-veg` for the dot

#### Scenario: Per-item dot

- **WHEN** an item row renders in the menu or on the item detail page
- **THEN** the `<VegDot />` component MUST appear to the left of the item name
- **AND** the dot MUST have an `aria-label="Vegetarian"` for screen readers

