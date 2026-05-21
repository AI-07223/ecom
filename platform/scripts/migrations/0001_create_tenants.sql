-- Platform-level tenancy table. Sits alongside Medusa's own tables but is
-- not managed by Medusa migrations. Storefront resolves an inbound HTTP
-- request to one row in this table by hostname.

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

-- Lookups are by hostname on every request; an index on `domain` is the
-- single hot path we care about.
CREATE INDEX IF NOT EXISTS idx_tenants_domain ON tenants (domain);

-- Maintain updated_at automatically.
CREATE OR REPLACE FUNCTION platform_set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tenants_set_updated_at ON tenants;
CREATE TRIGGER tenants_set_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION platform_set_updated_at();
