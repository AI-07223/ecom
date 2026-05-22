# syntax=docker/dockerfile:1.7
#
# Medusa v2 backend image — multi-stage production build.
#
# Stage 1 (builder): installs all deps + builds Medusa.
# Stage 2 (runtime): copies only the built app + production node_modules,
#   keeping the final image as slim as practical for Medusa (still ~700MB
#   because of the admin bundle, but down from ~2GB single-stage).
#
# For local development, run `npm run backend:dev` on the host.
#

# ─── Builder ───────────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

RUN apk add --no-cache python3 make g++ libc6-compat

WORKDIR /app

COPY package.json package-lock.json* turbo.json .npmrc ./
COPY apps/backend/package.json ./apps/backend/

RUN npm install --workspace=@platform/backend --include-workspace-root --no-audit --no-fund

COPY apps/backend/ ./apps/backend/

WORKDIR /app/apps/backend
# Cap V8 heap so the admin-bundle (Vite) build doesn't get OOM-killed on
# a shared VPS. medusa build doesn't support --backend-only, so we build
# the full thing under the heap cap.
ENV NODE_OPTIONS="--max-old-space-size=1024"
RUN node /app/node_modules/.bin/medusa build

# ─── Runtime ───────────────────────────────────────────────────────────────
FROM node:24-alpine AS runtime

# curl is required by Coolify's healthcheck command. libc6-compat is
# needed by some of Medusa's native deps.
RUN apk add --no-cache curl libc6-compat

WORKDIR /app

# Copy hoisted workspace node_modules + minimal workspace bookkeeping
COPY --from=builder /app/package.json /app/package-lock.json* /app/turbo.json /app/.npmrc ./
COPY --from=builder /app/node_modules ./node_modules
# Copy the built backend + its node_modules (workspace-resolved)
COPY --from=builder /app/apps/backend ./apps/backend

WORKDIR /app/apps/backend

EXPOSE 9000

ENV NODE_ENV=production
ENV MEDUSA_DISABLE_TELEMETRY=true
ENV NODE_OPTIONS="--max-old-space-size=1024"

# On each container start:
#   1. Ensure admin user (idempotent — `|| true` tolerates already-exists)
#   2. Exec into the production server (binds port 9000 fast → healthcheck OK)
#
# DB migrations are NOT in CMD: `medusa db:migrate` takes 30-45 min just
# walking the ~25 modules, even when every one is up-to-date — and Coolify's
# deploy job has a 60-min timeout. Migrations run once via a one-shot
# (`docker exec <container> node /app/node_modules/.bin/medusa db:migrate`)
# whenever the schema changes.
CMD ["sh", "-c", "(node /app/node_modules/.bin/medusa user -e \"$MEDUSA_ADMIN_EMAIL\" -p \"$MEDUSA_ADMIN_PASSWORD\" || true) && exec node /app/node_modules/.bin/medusa start"]
