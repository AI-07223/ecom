## Why

Product images, banner images, downloadable digital goods — none of that fits in Postgres. Medusa's default file driver writes to the local filesystem of whatever container handles the upload, which means images vanish on container restart and aren't sharable across multiple Medusa or storefront instances. This change adds MinIO as an S3-compatible object store on the same VPS (or upgrades to Cloudflare R2 if the operator prefers managed), wires Medusa's file module to use it, and adds a per-tenant prefix so files are organized by tenant.

## What Changes

- Add a `minio` service to `compose.yml` and `compose.coolify.yml` with a persistent volume and root credentials in `.env`.
- Configure Medusa's `file` module to use the `@medusajs/file-s3` provider pointing at MinIO; one bucket `platform-files`, files keyed as `tenants/<slug>/products/<product_id>/<filename>`.
- Add a helper `apps/backend/src/services/tenant-file-prefix.ts` that the Medusa admin endpoints call before uploading, injecting the tenant slug derived from the authenticated user's `tenant_slug` metadata (set up by the `client-admin-ui` change).
- Add a CDN-cacheable public bucket policy on MinIO so the storefront can serve `https://files.<platform-domain>/tenants/acme/products/...` without going through Medusa for each image read.
- Add a graduation path: a documented `compose.cloudflare-r2.yml` override that swaps MinIO for R2 by changing env vars only. The Medusa-side code is identical because both are S3-compatible.
- Update `ProductCard.tsx` to use Next.js Image optimization (via `next/image`) for the now-real product images instead of the placeholder gradient.

## Capabilities

### New Capabilities
- `tenant-file-storage`: S3-compatible object storage with per-tenant key prefixes and optional CDN-friendly public reads.
- `s3-provider-portability`: The same Medusa file-module configuration works against MinIO or Cloudflare R2 by changing only env vars; no code changes.

### Modified Capabilities
- `tenant-scoped-admin`: Adds a scenario asserting that an admin user can only upload to their tenant's prefix; a forged upload path to another tenant's directory MUST be rejected server-side.

## Impact

- **Code**: New tenant-file-prefix helper, Medusa config update, ProductCard image update.
- **Dependencies**: `@medusajs/file-s3` (already in the Medusa module ecosystem).
- **Infra**: One new Coolify service for MinIO. ~1 GB initial volume; grows with image count. Backups: snapshot the MinIO volume monthly (lower priority than DB — images can be re-uploaded if lost).
- **Risk**: Public bucket policy. We open only the `tenants/*/products/` prefix to anonymous GET; everything else stays behind authenticated Medusa endpoints. Verified by a test that requests an internal-only path anonymously and asserts 403.
