# syntax=docker/dockerfile:1.7
#
# Medusa v2 backend image — production-ready.
#
# Builds the Medusa app at image-build time, then on container start runs
# pending migrations and boots `medusa start` (the production server).
#
# For local development, run `npm run backend:dev` on the host instead of
# using this image — that uses `medusa develop` with file-watch + hot reload
# against the Postgres/Redis from `docker compose up postgres redis`.
#

FROM node:24-alpine

RUN apk add --no-cache python3 make g++ libc6-compat

WORKDIR /app

# --- Install dependencies -----------------------------------------------------
# Copy workspace manifests first so the install layer caches well across
# source-only changes.
COPY package.json package-lock.json* turbo.json .npmrc ./
COPY apps/backend/package.json ./apps/backend/

RUN npm install --workspace=@platform/backend --include-workspace-root --no-audit --no-fund

# --- Copy backend source ------------------------------------------------------
COPY apps/backend/ ./apps/backend/

# --- Build (compile TS + admin bundle) ---------------------------------------
WORKDIR /app/apps/backend
RUN node /app/node_modules/.bin/medusa build

EXPOSE 9000

ENV NODE_ENV=production
ENV MEDUSA_DISABLE_TELEMETRY=true

# On each container start:
#   1. Run pending Medusa migrations (idempotent — tracked in mikro_orm_migrations)
#   2. Create the platform admin user if missing (idempotent — `medusa user`
#      errors on an existing email, we tolerate via `|| true`)
#   3. Exec into the production server
#
# On Linux hosts the migrate phase completes in ~30s; the unhealthy-window
# during first boot is expected.
CMD ["sh", "-c", "node /app/node_modules/.bin/medusa db:migrate && (node /app/node_modules/.bin/medusa user -e \"$MEDUSA_ADMIN_EMAIL\" -p \"$MEDUSA_ADMIN_PASSWORD\" || true) && exec node /app/node_modules/.bin/medusa start"]
