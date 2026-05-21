## Why

A working checkout creates an order in the database — but nobody knows about it until the customer's inbox confirms it. Acme's customers must receive an email that comes from Acme (sender name, branded template, "Reply to customer-support@acme.com") and Globex's customers must receive one from Globex. This change wires Resend with per-tenant verified sending domains so order confirmations, shipment notifications, and (eventually) password resets all carry the right brand.

## What Changes

- Add new columns to the `tenants` table: `email_from_address`, `email_from_name`, `email_reply_to`, `resend_domain_id`, `resend_domain_verified` (boolean). Verified domains can send; unverified ones fall back to a platform-default "no-reply@platformdomain.com" with a banner telling the operator to finish DNS verification.
- Add an emailer module (`apps/backend/src/services/emailer.ts`) that takes a tenant + template name + template props and renders + sends via Resend with the tenant's `from` address. Reuses Medusa's notification module hook for order lifecycle events.
- Implement two initial templates as React Email components, themed via the same `theme_tokens` JSON (background color, brand color, logo URL): `order-confirmation` and `order-shipped`. Both render inline CSS for email-client compatibility.
- Add a `scripts/setup-tenant-domain.ts` helper that takes a tenant slug and a domain, calls Resend's API to create the sending domain, returns the DNS records the operator needs to set, and stores the `resend_domain_id`. A second invocation re-checks verification status and updates the boolean.
- Wire Medusa's `order.placed` and `order.shipped` events to enqueue email sends (synchronous send for now; switches to BullMQ once the worker-queue change lands).

## Capabilities

### New Capabilities
- `tenant-email-identity`: Storing per-tenant sender domains and verification status; using them on every outbound email.
- `transactional-email-templates`: Branded order-confirmation and order-shipped templates that pull color, font, and logo from the tenant's existing `theme_tokens`.

### Modified Capabilities
- `multi-tenancy`: Emails MUST be sent with the resolved tenant's identity, never the platform default unless the tenant's domain is unverified.

## Impact

- **Code**: New emailer service, new React Email templates, new `setup-tenant-domain.ts` script, new `tenants` migration.
- **Dependencies**: `resend` (server SDK), `@react-email/components`, `@react-email/render`.
- **DB**: One platform migration adds the new tenant columns.
- **Infra**: `RESEND_API_KEY` env var. Each tenant needs DNS access on their domain to verify SPF/DKIM records; operator workflow documented in the script's output.
- **Risk**: Misconfigured DNS or domain reputation drift can land emails in spam. Mitigated by Resend's domain verification gate (we refuse to send from unverified domains) and a runbook for testing deliverability with Mail Tester before going live.
