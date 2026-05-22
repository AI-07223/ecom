# syntax=docker/dockerfile:1.7
#
# Hotbox web — Next.js 16 production image.
#
# Multi-stage build:
#   Stage 1 (builder): install all deps, generate Prisma client, build Next.
#   Stage 2 (runtime): copy only the standalone server + static assets.
#
# Coolify build context is the hotbox/web/ directory (set in Coolify app config).

# ─── Builder ───────────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

# Native build deps for Prisma engines and node-pg
RUN apk add --no-cache python3 make g++ libc6-compat openssl

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

COPY . .

# Generate Prisma client (writes into node_modules/.prisma/client per schema.prisma)
RUN npx prisma generate

# Build the Next.js standalone output. Cap V8 heap so build doesn't OOM on
# a shared VPS.
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=1024"
RUN npm run build

# ─── Runtime ───────────────────────────────────────────────────────────────
FROM node:24-alpine AS runtime

# curl is required by Coolify's healthcheck. libc6-compat + openssl are
# required by Prisma's engine at runtime.
RUN apk add --no-cache curl libc6-compat openssl

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=1024"
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Next.js standalone output, plus full node_modules (the prisma CLI has
# many transitive deps — `effect`, etc. — that a minimal copy breaks).
# The runtime image is ~200MB larger this way but never breaks on a
# missing transitive dependency.
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

# Runtime bootstrap (idempotent):
#   1. `prisma migrate deploy` applies any pending migrations from
#      prisma/migrations/. Tracked in _prisma_migrations table, so reruns
#      are safe.
#   2. `node prisma/seed.mjs` upserts menu data (idempotent via slug).
#      `|| echo` so a seed glitch doesn't gate /api/health.
#   3. `exec node server.js` starts Next.js.
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && (node prisma/seed.mjs || echo '[seed] skipped/failed — continuing') && exec node server.js"]
