# syntax=docker/dockerfile:1.7
#
# Next.js 16 storefront image — production-ready.
#
# Build context is the platform/ workspace root (set in compose.yml) so this
# Dockerfile can see the root package.json + lockfile + the storefront
# workspace + the @platform/tenancy package together.
#
# For local development, run `npm run storefront:dev` on the host instead
# of using this image.
#
FROM node:24-alpine

RUN apk add --no-cache libc6-compat

WORKDIR /app

# --- Install dependencies -----------------------------------------------------
COPY package.json package-lock.json* turbo.json .npmrc ./
COPY apps/storefront/package.json ./apps/storefront/
COPY packages/tenancy/package.json ./packages/tenancy/

RUN npm install --workspace=@platform/storefront --include-workspace-root --no-audit --no-fund

# --- Build tenancy + storefront ----------------------------------------------
COPY packages/tenancy/ ./packages/tenancy/
RUN npm run build --workspace=@platform/tenancy

COPY apps/storefront/ ./apps/storefront/
# Some env defaults so `next build` doesn't complain about missing public
# env. Real values are set at runtime by Coolify.
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace=@platform/storefront

WORKDIR /app/apps/storefront

EXPOSE 3000

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Next.js production server. Listens on 0.0.0.0 so Coolify's proxy can
# reach it inside the Docker network.
CMD ["npx", "next", "start", "-H", "0.0.0.0", "-p", "3000"]
