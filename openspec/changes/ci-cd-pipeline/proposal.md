## Why

Right now a deploy means SSHing to the VPS (or clicking through Coolify) and running commands by hand. That works for one operator and one stack, but introduces drift the moment two changes go in close together or the operator is on a phone. This change wires GitHub Actions as the CI side and Coolify's deploy webhook as the CD side: a merge to `main` runs lint + typecheck + tests + a build, and on green, triggers Coolify to redeploy each app that changed.

## What Changes

- Add `.github/workflows/ci.yml` that, on every PR and push to `main`, runs in parallel: ESLint, `tsc --noEmit` per workspace, `npm test`, and `next build` for the storefront. Caches `~/.npm` and `.next/cache` for speed.
- Add `.github/workflows/deploy.yml` triggered by pushes to `main` after `ci.yml` passes. Detects which workspaces changed via `git diff --name-only HEAD~1` and hits Coolify's per-service deploy webhook only for the ones that need it.
- Add preview deploys: every PR that touches `apps/storefront` triggers a preview build deployed to `pr-<number>.preview.<platform-domain>`, with its own throwaway Postgres seeded from `npm run seed`. Preview environments tear down when the PR is closed.
- Add a "deploy blocked" Discord notification if `deploy.yml` fails so the operator doesn't assume a green CI = a live deploy.
- Add the monthly restore-drill action from `automated-postgres-backups`: scheduled cron, downloads latest backup, restores to a throwaway container, asserts `SELECT count(*) FROM tenants > 0`, reports pass/fail.
- Document branch-protection rules in `platform/docs/release-process.md`: `main` requires green CI + 1 review (or self-merge after self-review for the solo case); `--no-verify` is banned in CI by checking the last commit's verification flag.

## Capabilities

### New Capabilities
- `automated-ci`: PR and main-branch checks run lint, typecheck, tests, and build with cached dependencies.
- `automated-cd`: Coolify deploys triggered by CI passes; selective by changed workspace.
- `pr-preview-environments`: Per-PR ephemeral storefront with its own DB, accessible via a stable subdomain.
- `release-process-doc`: A written release process the operator follows from a phone in a pinch.

## Impact

- **Code**: New `.github/workflows/` directory and the release-process doc.
- **Dependencies**: GitHub Actions runners (free for public repos; metered for private). No new npm deps.
- **Infra**: Coolify deploy webhooks per service must be enabled and the webhook secrets stored as GitHub repo secrets. Preview environments use a parameterized Coolify "review app" pattern; needs the wildcard DNS from `coolify-production-deploy`.
- **Risk**: A bug in `deploy.yml` could deploy a broken commit. Mitigated by: required CI green before deploy, deploy.yml respecting Coolify's healthcheck and rolling back on failure, and an explicit approval step (`environment: production` with required reviewer) on the first month before relaxing.
