## ADDED Requirements

### Requirement: Platform stack runs as Coolify-managed resources
The platform SHALL be deployed on the operator's Coolify VPS as four resources inside a single Coolify project: a Postgres database, a Redis database, a Medusa application, and a Storefront application. Each application SHALL build from the `AI-07223/ecom` Git repository's `platform` branch using its own Dockerfile.

#### Scenario: All four resources reach a healthy state
- **WHEN** the operator triggers a deploy on each application after the databases come up
- **THEN** within 15 minutes both applications report `running:healthy` in Coolify's infrastructure overview

### Requirement: Database services are not publicly exposed
The Postgres and Redis databases SHALL be configured with `is_public: false`. They SHALL only be reachable from the Coolify internal Docker network. The operator MAY toggle `is_public: true` temporarily for maintenance tasks (e.g. initial seeding) and SHALL toggle it back afterward.

#### Scenario: External Postgres connection is refused
- **WHEN** a TCP connection is attempted to the Postgres container's public IP on the default Postgres port
- **THEN** the connection is refused (or filtered) unless `is_public` is currently true

### Requirement: Sensitive env vars live only in Coolify, never in git
Credentials including `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `COOKIE_SECRET`, `MEDUSA_ADMIN_PASSWORD` SHALL be set per-application as Coolify environment variables. They SHALL NOT appear in any file committed to the repository.

#### Scenario: Repo-wide secret search returns no matches
- **WHEN** the operator searches the repository for any occurrence of the production password values
- **THEN** zero matches are found (the only place those values live is the Coolify env-vars dashboard)

### Requirement: Migrations run automatically on container start
The Medusa application's container CMD SHALL run `medusa db:migrate` before starting the production server. The platform's `tenants` table SHALL be created/maintained as a Medusa migration script (under `apps/backend/src/migration-scripts/`) so it runs in lockstep with Medusa's own migrations.

#### Scenario: Fresh deploy creates all tables
- **WHEN** the Medusa application starts for the first time against an empty Postgres
- **THEN** both Medusa's own schema and the platform `tenants` table exist before `medusa start` opens its port

#### Scenario: Re-deploy is a no-op on schema
- **WHEN** the Medusa application restarts against a fully-migrated database
- **THEN** the CMD's migrate step completes in under 10 seconds with no schema changes

### Requirement: Admin user is provisioned automatically on first boot
The Medusa application's container CMD SHALL include an idempotent step that creates the admin user defined by `MEDUSA_ADMIN_EMAIL` and `MEDUSA_ADMIN_PASSWORD` if it does not already exist.

#### Scenario: First boot creates the admin user
- **WHEN** the Medusa container starts for the first time
- **THEN** the configured admin credentials can authenticate against `POST /auth/user/emailpass` and return a JWT

#### Scenario: Subsequent boots tolerate the existing user
- **WHEN** the Medusa container restarts after the admin user has been created
- **THEN** the `medusa user` step in the CMD exits cleanly (its error is swallowed by `|| true`) and the server starts normally
