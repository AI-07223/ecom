## Why

The platform's Postgres holds everything that isn't in Cashfree or Resend — tenants, products, orders, customers, payment metadata. Losing that DB is losing the business. Coolify can take snapshots, but those live on the same VPS as the DB; a disk failure or accidental `docker volume rm` takes both. This change adds nightly off-VPS encrypted backups to Backblaze B2 (or any S3-compatible target), tests the restore path, and documents the recovery runbook.

## What Changes

- Add a Coolify scheduled task that runs `pg_dump --format=custom --compress=9` against the platform Postgres nightly at 02:00 UTC, encrypts the output with `age` using a public key (private key held by the operator, not on the VPS), and uploads to a B2 bucket with a date-stamped object key.
- Retention policy: keep all dailies for 14 days, weeklies for 8 weeks, monthlies for 12 months. Implemented as a lifecycle rule on the B2 bucket — simpler than rolling our own cleanup.
- Add `platform/scripts/restore-from-backup.ts` that takes a backup object key, downloads, decrypts, and restores into a target database (defaults to a fresh `platform_restore` DB to avoid clobbering production by accident).
- Add a monthly restore drill: a GitHub Action (added in `ci-cd-pipeline`) downloads the latest backup, restores into a throwaway container, runs a sanity query (`SELECT count(*) FROM tenants` returns >0), and posts the result to the operator's chosen alert channel.
- Document an actual recovery runbook in `platform/docs/disaster-recovery.md` — "Postgres is gone, walk me through getting back online" — including RTO (target: 1 hour) and RPO (target: 24 hours) numbers.

## Capabilities

### New Capabilities
- `encrypted-offsite-backups`: Nightly `pg_dump` → age-encrypted → B2 with lifecycle-managed retention.
- `restore-runbook`: Documented and rehearsed recovery procedure with stated RTO / RPO.
- `restore-verification`: Automated monthly drill that proves the most recent backup is restorable.

## Impact

- **Code**: One shell script for the Coolify scheduled task, one Node script for the restore helper, one Markdown runbook.
- **Dependencies**: `age` binary (small, single-static-binary install), B2 CLI or `rclone`.
- **Infra**: A B2 (or S3-compatible) bucket. Cost: cents per month at this scale. The operator must hold the `age` private key off the VPS — that's the entire point.
- **Risk**: Mis-encrypted backups are useless. Mitigated by: the monthly drill catches it within 30 days; the first deploy of this change verifies a restore before declaring success.
