/**
 * Lazy-Proxy Prisma client.
 *
 * Same pattern as `src/lib/firebase/admin.ts` in the legacy app: we never
 * instantiate the real client at module-import time, so build-time imports
 * (e.g. during `next build` without `DATABASE_URL` in env) don't crash.
 *
 * In dev, we cache the client on `globalThis` so Next.js HMR doesn't open
 * a new connection pool on every reload.
 */

import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function buildClient(): PrismaClient {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "production"
        ? ["error", "warn"]
        : ["error", "warn"],
  })
}

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = buildClient()
  }
  return globalForPrisma.prisma
}

// Proxy the public PrismaClient surface. Property access (e.g. `db.order`)
// triggers actual client construction; nothing happens at import time.
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getClient() as unknown as Record<string | symbol, unknown>
    const value = client[prop]
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(client) : value
  },
})

/**
 * Acquire a raw `pg` client for `LISTEN`/`NOTIFY`. Prisma doesn't expose a
 * listening connection — this returns a node-pg client connected from the
 * same `DATABASE_URL`. Caller MUST `await client.end()` when done.
 */
export async function getPgListenClient(): Promise<import("pg").Client> {
  const { Client } = await import("pg")
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  return client
}
