# syntax=docker/dockerfile:1.7
#
# Next.js 16 storefront image.
#
# Build context is the platform/ workspace root (set in compose.yml) so this
# Dockerfile can see the root package.json + lockfile + the storefront
# workspace + the @platform/tenancy package together.
#
FROM node:24-alpine

RUN apk add --no-cache libc6-compat

WORKDIR /app

# --- Install dependencies -----------------------------------------------------
COPY package.json package-lock.json* turbo.json .npmrc ./
COPY apps/storefront/package.json ./apps/storefront/
COPY packages/tenancy/package.json ./packages/tenancy/

# Install storefront workspace + its workspace-link dependency.
RUN npm install --workspace=@platform/storefront --include-workspace-root --no-audit --no-fund

# --- Copy workspace sources ---------------------------------------------------
# Tenancy first so we can build it (storefront imports its compiled dist).
COPY packages/tenancy/ ./packages/tenancy/
RUN npm run build --workspace=@platform/tenancy

COPY apps/storefront/ ./apps/storefront/

WORKDIR /app/apps/storefront

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0", "-p", "3000"]
