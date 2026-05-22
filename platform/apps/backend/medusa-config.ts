import { loadEnv, defineConfig } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

module.exports = defineConfig({
  // The bundled admin SPA isn't needed for the multi-tenant platform — the
  // operator manages tenants via direct DB / future SSO. Disabling here
  // means `medusa build` skips the Vite/admin step (much faster, lower
  // memory) and `medusa start` doesn't try to serve admin assets.
  admin: {
    disable: true,
  },
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    // Constrain per-module pools so 25+ Medusa modules don't exhaust PG's
    // 100-connection ceiling during migrations. Env var DATABASE_POOL can
    // override at deploy time.
    databaseDriverOptions: {
      pool: {
        min: 0,
        max: 5,
        idleTimeoutMillis: 5000,
        acquireTimeoutMillis: 120000,
        createTimeoutMillis: 20000,
      },
      idle_in_transaction_session_timeout: 60000,
    },
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
  },
  // NOTE: Redis-backed cache/event-bus/workflow-engine modules can be added
  // here once we need them. For the scaffolding milestone we let Medusa fall
  // back to its built-in in-memory modules so first boot stays fast and the
  // Redis service is present-but-unused (the storefront uses it later for
  // tenant caching across instances).
})
