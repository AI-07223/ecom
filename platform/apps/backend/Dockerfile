# syntax=docker/dockerfile:1.7
#
# Medusa v2 backend image.
#
# Build context is the platform/ workspace root (set in compose.yml) so this
# Dockerfile can see the root package.json + lockfile and the apps/backend
# workspace package together. That's what npm needs to resolve workspaces.
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

WORKDIR /app/apps/backend

EXPOSE 9000

# Disable Medusa's telemetry (we don't need it and it forks a subprocess
# that occasionally interferes with startup logging on slow filesystems).
ENV MEDUSA_DISABLE_TELEMETRY=true

# Call the Medusa binary directly via node — `npx` defers to npm package
# resolution which has been observed to stall under Docker Desktop on
# Windows. Direct invocation avoids that entirely.
CMD ["node", "/app/node_modules/.bin/medusa", "develop"]
