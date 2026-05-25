## ADDED Requirements

### Requirement: Production Dockerfiles support `medusa start` / `next start`
The platform's two Dockerfiles (`apps/backend/Dockerfile`, `apps/storefront/Dockerfile`) SHALL produce images that run the production server (`medusa start`, `next start`) at container start, with all dev-mode features (file watching, HMR) absent.

#### Scenario: Production Medusa image runs `medusa start`
- **WHEN** the Medusa container starts in Coolify
- **THEN** the running process is `medusa start` (production), NOT `medusa develop` (dev with file watcher)

#### Scenario: Production storefront image runs `next start`
- **WHEN** the storefront container starts in Coolify
- **THEN** the running process is `next start` (serves the pre-built `.next/` output), NOT `next dev`

### Requirement: Each image is buildable on a Linux Coolify host without errors
The platform's Dockerfiles SHALL build successfully on a Linux Coolify build server using only the contents of the `platform/` subtree. No host-side build steps SHALL be required.

#### Scenario: First-ever Coolify build succeeds
- **WHEN** Coolify pulls the `platform` branch and builds the Medusa application using `apps/backend/Dockerfile` (base directory `/platform`)
- **THEN** the build completes with exit code 0 and a tagged image is published to Coolify's local registry

### Requirement: Per-application healthchecks gate Coolify routing
The Coolify application configuration for both Medusa and the storefront SHALL declare a healthcheck path, port, and start-period appropriate for the application's boot time. Traffic SHALL NOT be routed to a container until its healthcheck passes.

#### Scenario: Slow first boot doesn't trigger restart loop
- **WHEN** the Medusa container takes up to 120 seconds during first boot to complete migrations + admin-user creation
- **THEN** Coolify's healthcheck waits the configured `start_period` before counting failures, and the container is not killed prematurely
