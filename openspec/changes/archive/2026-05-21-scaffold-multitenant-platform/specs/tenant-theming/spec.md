## ADDED Requirements

### Requirement: Theme tokens stored per tenant as JSON
The system SHALL store each tenant's brand tokens in the `tenants.theme_tokens` JSONB column. The object SHALL contain at minimum the keys `--brand-primary`, `--brand-on-primary`, `--brand-surface`, `--brand-on-surface`, `--radius`, and `--font-display`, each with a string value valid as a CSS variable value. Tokens SHALL be applied without any per-tenant build step.

#### Scenario: Seed creates distinct token sets for two tenants
- **WHEN** the seed script populates the Acme and Globex tenants
- **THEN** each tenant row has a `theme_tokens` JSON object containing all required keys, and the value of `--brand-primary` differs between the two rows

#### Scenario: Editing a tenant's tokens does not require a rebuild
- **WHEN** the value of `--brand-primary` is changed in the Acme tenant's `theme_tokens` directly in the database
- **THEN** within the cache TTL the Acme storefront renders with the new color without rebuilding or restarting the storefront process

### Requirement: Theme tokens injected as CSS variables at request time
The storefront SHALL emit a `<style>` block in the root layout for each request that contains a `:root { ... }` declaration mapping every key in the resolved tenant's `theme_tokens` to its value. The block SHALL be rendered before any component that consumes brand tokens.

#### Scenario: Acme tenant renders with its own brand variables
- **WHEN** a request for `acme.localhost` produces an HTML response
- **THEN** the response body contains a `<style>` block whose `:root` declaration sets `--brand-primary` to the value stored in Acme's `theme_tokens` row

#### Scenario: Two tenants render visibly different brands
- **WHEN** the same product card component is rendered for both Acme and Globex in succession
- **THEN** the computed style of the card's primary action element on the Acme response differs from the Globex response for the properties bound to `--brand-primary` and `--radius`

### Requirement: Layout variant gated by tenant config, not by per-tenant code
The system SHALL support a `layout_variant` field on each tenant that selects one of a fixed set of product-card layouts (initially `compact` or `hero`). Component code SHALL read this field through the typed tenant helper and SHALL NOT branch on `tenant.slug`.

#### Scenario: Compact variant renders for a compact-configured tenant
- **WHEN** a tenant with `layout_variant = 'compact'` requests the product grid page
- **THEN** the product cards render in the compact layout

#### Scenario: Unknown layout variant falls back safely
- **WHEN** a tenant row is read with a `layout_variant` value that is not in the known set
- **THEN** the storefront renders the compact layout and logs a single warning identifying the tenant slug

### Requirement: shadcn/ui components consume tokens without per-tenant overrides
All shadcn/ui-derived components used in the storefront SHALL read brand colors, radii, and display typography from CSS variables. No component file SHALL contain a literal hex color, branded font name, or radius value used at runtime.

#### Scenario: Grep audit finds no inline brand literals
- **WHEN** the storefront component directory is searched for literal `#`-prefixed hex strings in JSX/TSX files
- **THEN** zero matches are found in components rendered to end users (excluding component-internal placeholders and tests)
