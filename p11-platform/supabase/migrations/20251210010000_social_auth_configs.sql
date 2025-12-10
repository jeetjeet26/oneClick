-- =============================================
-- SOCIAL AUTH CONFIGS - Per-Property OAuth Credentials
-- =============================================
-- Allows users to configure their own OAuth app credentials
-- for social media integrations (Meta/Instagram, etc.)

CREATE TABLE IF NOT EXISTS social_auth_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  platform text NOT NULL, -- 'meta' (covers Instagram/Facebook), 'linkedin', 'twitter'
  app_id text NOT NULL,
  app_secret_encrypted text NOT NULL, -- Should be encrypted at application level
  redirect_uri text, -- Optional custom redirect URI
  additional_config jsonb DEFAULT '{}', -- Platform-specific extra config
  is_configured boolean DEFAULT true,
  last_verified_at timestamptz, -- When credentials were last verified working
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Each property can only have one config per platform
  UNIQUE(property_id, platform)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_social_auth_configs_property_platform 
  ON social_auth_configs(property_id, platform);

-- Enable RLS
ALTER TABLE social_auth_configs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view configs for properties in their organization
CREATE POLICY "Users can view social auth configs for their properties"
  ON social_auth_configs FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles prof
      JOIN properties p ON p.org_id = prof.org_id
      WHERE p.id = social_auth_configs.property_id
      AND prof.id = auth.uid()
    )
  );

-- Policy: Users can manage configs for properties in their organization
CREATE POLICY "Users can manage social auth configs for their properties"
  ON social_auth_configs FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles prof
      JOIN properties p ON p.org_id = prof.org_id
      WHERE p.id = social_auth_configs.property_id
      AND prof.id = auth.uid()
    )
  );

-- Service role has full access
CREATE POLICY "Service role full access to social_auth_configs" 
  ON social_auth_configs FOR ALL 
  USING (auth.role() = 'service_role');

-- Add comment for documentation
COMMENT ON TABLE social_auth_configs IS 'Stores OAuth app credentials per property for social media integrations. App secrets should be encrypted at application level before storage.';
COMMENT ON COLUMN social_auth_configs.platform IS 'Platform identifier: meta (Instagram/Facebook), linkedin, twitter';
COMMENT ON COLUMN social_auth_configs.app_secret_encrypted IS 'Encrypted app secret - use application-level encryption';

