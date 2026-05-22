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

# Next.js standalone bundles its own minimal node_modules into .next/standalone.
# We also need Prisma generated client + the schema for `prisma migrate deploy`.
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
# Prisma's `migrate deploy` shells out to npx by default; ship the CLI binary too.
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

EXPOSE 3000

# On each container start: run any pending migrations, then exec the server.
# `prisma migrate deploy` is idempotent (a tracked migrations table guards re-runs).
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && exec node server.js"]
