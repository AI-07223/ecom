import type { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * Platform-level `tenants` table.
 *
 * Lives alongside Medusa's own schema but is owned by the platform
 * (resolves hostname → tenant id, holds theme tokens). Defined here as a
 * Medusa migration script so it runs in lockstep with the rest of the
 * schema during `medusa db:migrate` — no separate runner needed.
 *
 * Idempotent: `CREATE TABLE IF NOT EXISTS` + `ADD COLUMN IF NOT EXISTS` for
 * future additions.
 */
export default async function platform_tenants_table({
  container,
}: {
  container: MedusaContainer
}): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const manager = container.resolve("__pg_connection__")

  logger.info("Ensuring platform `tenants` table...")

  await manager.raw(`
    CREATE TABLE IF NOT EXISTS tenants (
      id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
      slug                text        NOT NULL UNIQUE,
      domain              text        NOT NULL UNIQUE,
      sales_channel_id    text        UNIQUE,
      publishable_api_key text,
      theme_tokens        jsonb       NOT NULL DEFAULT '{}'::jsonb,
      feature_flags       jsonb       NOT NULL DEFAULT '{}'::jsonb,
      layout_variant      text        NOT NULL DEFAULT 'compact',
      status              text        NOT NULL DEFAULT 'active',
      created_at          timestamptz NOT NULL DEFAULT now(),
      updated_at          timestamptz NOT NULL DEFAULT now()
    );
  `)
  await manager.raw(`CREATE INDEX IF NOT EXISTS idx_tenants_domain ON tenants (domain);`)
  await manager.raw(`
    CREATE OR REPLACE FUNCTION platform_set_updated_at() RETURNS trigger AS $$
    BEGIN NEW.updated_at := now(); RETURN NEW; END;
    $$ LANGUAGE plpgsql;
  `)
  await manager.raw(`DROP TRIGGER IF EXISTS tenants_set_updated_at ON tenants;`)
  await manager.raw(`
    CREATE TRIGGER tenants_set_updated_at
      BEFORE UPDATE ON tenants
      FOR EACH ROW EXECUTE FUNCTION platform_set_updated_at();
  `)

  logger.info("Platform tenants table ready.")
}
