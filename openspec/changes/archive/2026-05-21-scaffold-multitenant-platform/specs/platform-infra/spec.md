## ADDED Requirements

### Requirement: Local stack is defined as Docker Compose
The platform SHALL define its local development stack as a single `platform/compose.yml` file that declares services for Postgres, Redis, the Medusa API, and the Next.js storefront. The same compose file SHALL be the starting point for the Coolify deployment via an override file.

#### Scenario: One command brings the stack up locally
- **WHEN** the operator runs `docker compose up` from `platform/`
- **THEN** Postgres, Redis, Medusa API, and the storefront all start and reach healthy state without further manual steps

#### Scenario: Stack tears down cleanly
- **WHEN** the operator runs `docker compose down -v` from `platform/`
- **THEN** all four containers and their named volumes are removed and the next `docker compose up` starts from a clean Postgres state

### Requirement: Postgres pinned to a stable major version
The platform SHALL pin its Postgres service to a specific major version line (Postgres 16) using a fixed image tag, not `latest`. The pin SHALL be the same for local dev and Coolify.

#### Scenario: Image tag is explicit
- **WHEN** the compose files are inspected
- **THEN** the Postgres service uses an image tag of the form `postgres:16-*` or `postgres:16.*` and not `postgres:latest` or an unversioned tag

### Requirement: Secrets and environment variables come from a documented .env file
All configuration that varies per environment (database URL, Redis URL, Medusa JWT secrets, Medusa cookie secret, publishable key admin token) SHALL be loaded from environment variables. A `platform/.env.example` file SHALL document every required variable with a one-line description and a safe placeholder value.

#### Scenario: Fresh checkout shows what to fill in
- **WHEN** a developer clones the repo and copies `.env.example` to `.env`
- **THEN** every variable required by `compose.yml` and the application code is listed in the example, with a comment explaining what it is

#### Scenario: No secret values committed
- **WHEN** the `.env.example` file is inspected
- **THEN** no real secret value (production-style API key, real database password, real JWT secret) is present; only placeholders such as `change-me-in-prod`

### Requirement: Coolify overlay isolates production-only concerns
The platform SHALL provide a `platform/compose.coolify.yml` file that, when combined with `compose.yml`, produces the production deployment. The overlay SHALL add Traefik routing labels, bind volumes to Coolify-managed paths, and SHALL NOT redefine any service's image, command, or environment from scratch.

#### Scenario: Local compose is unaffected by the overlay
- **WHEN** `docker compose up` is run without the overlay
- **THEN** the local stack starts identically whether or not `compose.coolify.yml` exists

#### Scenario: Coolify deploys via overlay
- **WHEN** Coolify deploys the platform using `compose.yml` plus `compose.coolify.yml`
- **THEN** Traefik routes the configured hostnames to the storefront container and the Postgres data is persisted to the Coolify-managed volume path

### Requirement: README documents the local boot path
The platform SHALL include a `platform/README.md` that documents, in order: prerequisites (Docker, Node version), how to copy `.env.example`, how to start the stack, how to run the seed script, how to add the two demo hostnames to `hosts` if needed, and how to tear down.

#### Scenario: A new operator can boot the platform from the README alone
- **WHEN** an operator follows the README steps in order on a machine that has Docker installed
- **THEN** the storefront responds successfully to a request for `http://acme.localhost:3000`
