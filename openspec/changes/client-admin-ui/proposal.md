## Why

Clients need to manage their own store — list products, mark orders fulfilled, adjust prices, edit copy — without needing to ping the agency. Giving them Medusa's full admin UI is the wrong move: it shows everyone's data and lets them touch settings that affect other tenants. This change adds a thin, tenant-scoped admin UI at `admin.<tenant-domain>` (or `<tenant>.admin.platform.example.com`) that proxies to Medusa with the tenant's sales-channel filter baked in.

## What Changes

- Add a new Next.js app at `apps/client-admin/` (sibling of `apps/storefront`), authenticated and tenant-scoped on every request.
- Reuse the same hostname-resolution pattern as the storefront: the proxy resolves `Host` to a tenant; subsequent admin pages refuse to render data outside that sales channel.
- Authentication uses Medusa's user system but restricts each user's `metadata.tenant_slug` to one tenant. New helper `requireTenantUser()` verifies the logged-in user belongs to the resolved tenant or returns 403.
- Surfaces a curated subset of Medusa admin operations: list/create/edit products (in this tenant's sales channel), list orders, mark orders fulfilled, view customers, edit price lists, edit shipping options. Hides: regions, sales channels, payment providers, API keys, store settings — those stay agency-only in the main Medusa admin.
- Adds a "Brand" page that lets a tenant operator edit a small subset of their `theme_tokens` (`--brand-primary`, `--brand-on-primary`, `--site-title`) via form, persisting to the `tenants` table. Other tokens (radius, font) stay agency-controlled to keep visual quality up.
- Coolify topology: new service `client-admin`, routed by `admin.*` host pattern.

## Capabilities

### New Capabilities
- `tenant-scoped-admin`: A Next.js admin app that resolves the tenant from `Host`, authenticates a user tied to that tenant, and refuses operations that would read or write outside the tenant's sales channel.
- `self-service-theming`: A UI control for a tenant operator to edit a curated subset of their brand tokens with immediate effect (subject to the 60s cache TTL on the storefront).

### Modified Capabilities
- `multi-tenancy`: New scenario asserting admin operations refuse cross-tenant requests even when an attacker forges a tenant-scope check.

## Impact

- **Code**: New `apps/client-admin/` Next.js app reusing `@platform/tenancy` and a new `@platform/admin-api` workspace package wrapping Medusa's admin REST API with tenant-scoped helpers.
- **Dependencies**: `@medusajs/admin-sdk` (already installed for the backend); React Hook Form, Zod (or use Conform).
- **DB**: A migration adds `users.metadata.tenant_slug` (or a join table `tenant_users`) to bind users to a tenant.
- **Risk**: This is a privilege boundary. Mitigated by: server-side enforcement on every endpoint (not client checks), automated tests that attempt cross-tenant access with a forged session and assert 403, and a runbook for "what to do if a client reports they can see another client's data" (incident process).
