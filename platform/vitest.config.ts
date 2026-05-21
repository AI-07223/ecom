import { defineConfig } from "vitest/config"

/**
 * Platform-root Vitest config — runs tests under `scripts/`.
 * Workspace packages (e.g. `packages/tenancy`) have their own configs that
 * Vitest picks up when invoked via `npm test --workspace=<name>`.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["scripts/**/*.test.ts"],
  },
})
