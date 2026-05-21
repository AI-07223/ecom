import { loadEnv, defineConfig } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
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
