## Why

Onboarding a new client today is a multi-step manual process: insert a row in `tenants`, create the sales channel, create the publishable key, attach products, provision the Cashfree vendor, create the Resend domain, configure DNS, restart services. That sequence is the operational bottleneck of an agency model. This change collapses it into a single CLI command — `npm run tenant:create <slug>` — that walks the operator through inputs once and provisions everything across Medusa, Cashfree, Resend, and the storefront.

## What Changes

- Add `platform/scripts/tenant-create.ts` exposing an `npm run tenant:create` script. Accepts either CLI arguments (`--slug acme --domain acme.example.com --brand-primary "#0F766E" ...`) or interactive prompts (one at a time) when arguments are missing.
- Orchestrates all dependent operations in order, each idempotent and skippable: (1) insert tenant row, (2) create Medusa sales channel, (3) create publishable API key, (4) seed N starter products, (5) create Cashfree Easy Split vendor, (6) create Resend domain + return DNS records the operator must set, (7) print a summary and the URL.
- Stores progress in a `_tenant_provisioning` table so a failed run can be resumed without re-provisioning what already succeeded. Each step writes a row with `tenant_slug`, `step_name`, `status`, `details JSONB`.
- Adds a sibling `npm run tenant:check <slug>` that re-runs verification on every step (re-checks Resend domain verification, validates Cashfree vendor exists, verifies sales channel is active) and prints a green/red checklist.
- Adds `npm run tenant:archive <slug>` that flips `status = 'archived'` (the storefront will then 404 the tenant) without deleting any data; useful when ending a client engagement.

## Capabilities

### New Capabilities
- `tenant-lifecycle-cli`: One-command provisioning, verification, and archival of tenants spanning Postgres, Medusa, Cashfree, and Resend.
- `provisioning-resumability`: A persisted ledger of provisioning steps so retries are safe and partial failures don't strand half-configured tenants.

### Modified Capabilities
- `tenant-catalog-seed` (from `wire-tenant-catalogs`): The two-tenant demo seed becomes a special case of `tenant:create` — same code path, different inputs.

## Impact

- **Code**: New `scripts/tenant-create.ts`, `scripts/tenant-check.ts`, `scripts/tenant-archive.ts`, and a shared `scripts/lib/provisioning.ts` library.
- **Dependencies**: `@inquirer/prompts` (interactive prompts), `commander` (CLI args). Both small.
- **DB**: One migration adds `_tenant_provisioning` table.
- **Infra**: No new services; this only orchestrates existing ones.
- **Risk**: A bug in the CLI could mis-configure a real client. Mitigated by: dry-run flag (`--dry-run` previews every call without executing), explicit confirmation before any destructive step, and a "checkpoint" command that prints the would-be DB writes before commit.
