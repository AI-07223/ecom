## Why

The current architecture has one storefront app with `layout_variant` toggles for "compact" vs "hero" — a weak version of what's actually needed. To serve real Indian SMB clients, each vertical (fashion, electronics, grocery, food, beauty, B2B) needs a meaningfully different storefront — different IA, different features, different visual identity — not just CSS variables on the same components. We're pivoting to a **template library**: one shared backend, one shared tenancy + commerce facade + UI primitives package, and N independent Next.js apps, each its own designed vertical template. A client's tenant row picks which template to attach their domain to.

This foundation change makes that architecture possible without committing to every cross-template decision up front. We extract the minimum (packages we know we need), rename the existing storefront to `storefront-classic` as our first template, and add the `template` column to the tenants table. Per the operator's "build one properly first" direction, decisions about migration between templates, a shared checkout package, and other inter-template concerns are explicitly deferred until we build the **second** template — those decisions should be informed by lived experience, not speculation.

## What Changes

- Rename `apps/storefront/` → `apps/storefront-classic/`. Its package name becomes `@platform/storefront-classic`. Every other detail (proxy.ts, commerce facade, pages, layout) is unchanged — it's our first template, already designed and tested.
- Extract `packages/ui/` from the storefront-classic codebase, containing the brand-token-aware primitives that any template should reuse: `<ProductCard>`, `<CartIndicator>`, `<ProductGrid>`, and a few small atoms (`<Money>`, `<Button>`). The classic template depends on this package; future templates do too.
- Extract `packages/commerce/` containing the single Medusa SDK facade (`createCommerceClient`, `listProducts`, `getCart`, `completeCart`, etc.). All templates import from here; the "single facade" enforcement extends across templates.
- Add a `template text NOT NULL DEFAULT 'classic'` column to the `tenants` table via a new Medusa migration script. Existing tenants get `'classic'` automatically. The `proxy.ts` in each template app refuses to serve tenants whose `template` doesn't match (returns 404 with a clear message).
- Update `scripts/seed-tenants.ts` (and the in-container `platform-tenants-seed.ts` migration script) to set `template` on the seeded tenants (both set to `'classic'` for now).
- Coolify-side: rename the `platform-storefront` application to `platform-storefront-classic`. No new apps yet — they come with each vertical template's own change.
- **BREAKING** for any future docs referencing the old `apps/storefront/` path. No runtime breaking changes — the storefront-classic app serves the same URLs with the same behavior.

**Explicitly deferred to follow-up changes** (until we build the second template):

- A shared `packages/checkout/` package (cart/address/shipping/review/confirmation flow). For now, classic owns its own checkout. We'll extract when we have a second template asking for it.
- A CLI command to migrate a tenant from one template to another. Manual workaround for now: edit `tenants.template` + re-attach the domain in Coolify.
- Per-template design system tokens beyond what's already in `theme_tokens`. The classic template uses today's tokens; new templates may add their own conventions.

## Capabilities

### New Capabilities

- `template-library`: The repository convention that supports N independent storefront Next.js apps, each named `storefront-<vertical>`, each consuming the shared `@platform/tenancy`, `@platform/ui`, and `@platform/commerce` packages, each deployed independently to Coolify, each serving only tenants whose `tenants.template` matches the app's vertical.
- `shared-ui-primitives`: A `packages/ui/` workspace providing brand-token-aware components used across templates. Includes the existing ProductCard, CartIndicator, ProductGrid, plus small atoms.
- `shared-commerce-facade`: A `packages/commerce/` workspace owning the single Medusa SDK chokepoint. Replaces the per-storefront `lib/commerce.ts`. All templates import from here.

### Modified Capabilities

- `multi-tenancy`: The `tenants` table gains a `template` column; the storefront proxy gains a per-app template guard.
- `commerce-backend`: The seed sets `template` on each tenant row.

## Impact

- **Code**: One rename (`apps/storefront` → `apps/storefront-classic`), two new packages (`packages/ui`, `packages/commerce`), one new column + migration on `tenants`. No behavioral change at runtime for existing classic tenants.
- **Dependencies**: No new npm packages. Existing deps reshuffled between workspaces.
- **DB**: One additive migration (`ALTER TABLE tenants ADD COLUMN template text NOT NULL DEFAULT 'classic'`).
- **Coolify**: One app rename (no functional change; the FQDN list stays the same).
- **Risk**: Renames are risky if any other tooling references the old path. Mitigated by a single search-and-replace pass across `compose.yml`, `compose.coolify.yml`, `package.json` workspaces, README, and any docs.
- **Out of scope**: Designing or building any new template. Each vertical template (`storefront-fashion`, `storefront-electronics`, etc.) is its own follow-up change with its own design, build, and Coolify app provisioning.
